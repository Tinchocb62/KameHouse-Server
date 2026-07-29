package cassette

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"kamehouse/internal/notifier"
	"kamehouse/internal/util"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog"
)

// PipelineKind distinguishes video from audio pipelines
type PipelineKind int

const (
	VideoKind PipelineKind = iota
	AudioKind
)

func (k PipelineKind) String() string {
	if k == VideoKind {
		return "video"
	}
	return "audio"
}

// head represents an ffmpeg process encoding segments
type head struct {
	segment     int32              // Current segment (updated as ffmpeg writes segments).
	end         int32              // First segment NOT included in this head's work.
	cmd         *exec.Cmd          // The ffmpeg process.
	stdin       io.WriteCloser     // Used to gracefully quit ffmpeg via "q".
	cancel      context.CancelFunc // Cancels the head's soft-close goroutine.
	release     func()             // Governor slot release function.
	released    *sync.Once         // Ensures release is called at most once (early kill or natural exit).
}

var deletedHead = head{segment: -1, end: -1}

// ErrSegmentOutOfRange is returned when a requested segment index lies beyond the
// pipeline's current segment table. Callers should map it to HTTP 404 (not 500):
// clients legitimately probe segments near/past EOF.
var ErrSegmentOutOfRange = errors.New("cassette: segment index out of range")

// Pipeline manages a single encode stream
type Pipeline struct {
	kind     PipelineKind
	label    string // e.g. "video (720p)" or "audio 0"
	session  *Session
	segments *SegmentTable
	velocity *VelocityEstimator

	// heads tracks all in-flight encoder processes.
	headsMu       sync.RWMutex
	heads         []head
	activeHeadsWg sync.WaitGroup

	// killCh is recreated each time a segment is requested. Closing it
	// aborts any WaitFor in progress.
	killCh chan struct{}

	settings *Settings
	governor *Governor
	logger   *zerolog.Logger

	ctx    context.Context
	cancel context.CancelFunc

	// buildArgs is the strategy function that produces the quality-specific
	// part of the ffmpeg command line.
	buildArgs func(segmentTimes string, hw *HwAccelProfile) []string

	// outPathFmt returns the output path pattern for a given encoder ID.
	outPathFmt func(encoderID int) string
}

// PipelineConfig configures a new pipeline
type PipelineConfig struct {
	Kind       PipelineKind
	Label      string
	Session    *Session
	Settings   *Settings
	Governor   *Governor
	Logger     *zerolog.Logger
	BuildArgs  func(segmentTimes string, hw *HwAccelProfile) []string
	OutPathFmt func(encoderID int) string
}

// NewPipeline creates a pipeline and initializes its segment table
func NewPipeline(cfg PipelineConfig) *Pipeline {
	ctx, cancel := context.WithCancel(context.Background())

	length, isDone := cfg.Session.Keyframes.Length()
	segments := NewSegmentTable(length)

	p := &Pipeline{
		kind:       cfg.Kind,
		label:      cfg.Label,
		session:    cfg.Session,
		segments:   segments,
		velocity:   NewVelocityEstimator(30 * time.Second),
		heads:      make([]head, 0, 4),
		killCh:     make(chan struct{}),
		settings:   cfg.Settings,
		governor:   cfg.Governor,
		logger:     cfg.Logger,
		ctx:        ctx,
		cancel:     cancel,
		buildArgs:  cfg.BuildArgs,
		outPathFmt: cfg.OutPathFmt,
	}

	if !isDone {
		cfg.Session.Keyframes.AddListener(func(keyframes []float64) {
			segments.Grow(len(keyframes))
		})
	}

	// Scan for existing segments on disk (segment reuse).
	go p.reclaimExistingSegments()

	return p
}

// reclaimExistingSegments scans for matches on disk
func (p *Pipeline) reclaimExistingSegments() {
	dir := filepath.Dir(p.outPathFmt(0))
	entries, err := os.ReadDir(dir)
	if err != nil {
		return // Not an error — dir may not exist yet.
	}

	pattern := filepath.Base(p.outPathFmt(0))
	reclaimed := 0

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		var seg int32
		if _, err := fmt.Sscanf(entry.Name(), pattern, &seg); err != nil {
			continue
		}
		if seg < 0 || seg >= int32(p.segments.Len()) {
			continue
		}
		// File exists on disk — mark as ready with encoder ID 0.
		if !p.segments.IsReady(seg) {
			p.segments.MarkReady(seg, 0)
			reclaimed++
		}
	}

	if reclaimed > 0 {
		p.logger.Debug().
			Int("count", reclaimed).
			Str("pipeline", p.label).
			Msg("cassette: reclaimed existing segments from disk")
	}
}

// GetIndex generates an hls variant playlist for this pipeline's segments
func (p *Pipeline) GetIndex(token string) (string, error) {
	return GenerateVariantPlaylist(
		p.session.Keyframes,
		float64(p.session.Info.Duration),
		token,
	), nil
}

// GetSegment blocks until the requested segment is ready and returns the path
// to the .ts file on disk
func (p *Pipeline) GetSegment(ctx context.Context, seg int32) (string, error) {
	if seg < 0 || seg >= int32(p.segments.Len()) {
		return "", fmt.Errorf("%w: index %d (len=%d)", ErrSegmentOutOfRange, seg, p.segments.Len())
	}

	// Record for velocity tracking
	p.velocity.Record(seg)

	// If a seek is detected, kill all heads across ALL pipelines in this session
	// to free governor slots and ensure both video and audio restart fresh from
	// the seek target. Without this, the sibling pipeline's heads may still hold
	// governor slots and block the new heads from starting, causing the player
	// to hang on "loading" while waiting for segments.
	// killAllHeads releases governor slots immediately (via sync.Once on each head),
	// so the subsequent governor.Acquire() in runHead does not block waiting for
	// cmd.Wait() to return (which can take 100-500ms on Windows after Process.Kill).
	if p.velocity.DetectSeek(5) {
		p.session.KillAllPipelineHeads()
		p.velocity.Reset()
		p.velocity.Record(seg)
	}

	// A kill-triggered abort is not an encode failure, so it must not consume one
	// of the three attempts: a burst of seeks (each one calling
	// KillAllPipelineHeads) can otherwise tear down this pipeline's heads three
	// times in microseconds and fail the request. Aborts get their own, looser
	// budget; the request context still bounds the total wait.
	const maxAborts = 10
	aborts := 0

	for attempt := 0; attempt < 3; {
		p.headsMu.Lock()
		select {
		case <-p.killCh:
			p.killCh = make(chan struct{})
		default:
		}
		killCh := p.killCh
		p.headsMu.Unlock()

		if p.segments.IsReady(seg) {
			p.prefetch(seg)
			return p.segmentPath(seg), nil
		}

		// decide whether to spawn a new encoder
		p.headsMu.RLock()
		distance := p.minHeadDistance(seg)
		scheduled := p.isScheduled(seg)
		p.headsMu.RUnlock()

		// Umbral de distancia dinámico basado en la velocidad de consumo (segmentos por segundo)
		// Al reproducir a velocidad 1x, v es aproximadamente 0.25 segs/s.
		// Si la velocidad aumenta, reducimos el umbral para ser más proactivos (mínimo de 15 segundos).
		threshold := 60.0
		if v := p.velocity.SegmentsPerSecond(); v > 0.25 {
			threshold = 60.0 / (v / 0.25)
			if threshold < 15.0 {
				threshold = 15.0
			}
		}

		if distance > threshold || !scheduled {
			if err := p.runHead(seg, false); err != nil {
				return "", err
			}
		}

		// Wait for the segment, allowing the client's request ctx to
		// abort the wait early if they disconnect
		waitCtx, waitCancel := context.WithTimeout(ctx, 30*time.Second)
		err := p.segments.WaitFor(waitCtx, seg, killCh)
		waitCancel()

		if err == nil {
			p.prefetch(seg)
			return p.segmentPath(seg), nil
		}

		if ctx.Err() != nil {
			// Client disconnected — kill all active heads to immediately free
			// governor slots instead of letting them idle until the tracker
			// cleans up (which can take up to 60s).
			p.killAllHeads()
			return "", fmt.Errorf("cassette: %s segment %d not ready: %w", p.label, seg, err)
		}

		// Our heads were killed out from under us — by a seek in this pipeline or
		// in a sibling one. Respawn without burning an attempt, and without
		// killing the heads that the concurrent seek may have just started.
		if errors.Is(err, ErrWaitAborted) {
			aborts++
			if aborts > maxAborts {
				return "", fmt.Errorf("cassette: %s segment %d aborted %d times", p.label, seg, aborts)
			}
			continue
		}

		attempt++
		p.logger.Warn().Int("attempt", attempt).Int32("seg", seg).Err(err).
			Msg("cassette: segment wait failed, killing all active heads and retrying...")

		// Kill all active heads on retry to clear any stuck or slow processes
		p.killAllHeads()
	}

	return "", fmt.Errorf("cassette: %s segment %d not ready after retries", p.label, seg)
}

// segmentPath returns the path for a ready segment
func (p *Pipeline) segmentPath(seg int32) string {
	return fmt.Sprintf(filepath.ToSlash(p.outPathFmt(p.segments.EncoderID(seg))), seg)
}

// Kill signals all ffmpeg heads to stop and closes the pipeline context, waiting
// for all processes to fully exit to ensure no files are locked
func (p *Pipeline) Kill() {
	p.cancel() // Cancel the global pipeline context
	p.headsMu.Lock()
	for i := range p.heads {
		p.killHeadLocked(i)
	}
	p.headsMu.Unlock()

	// block until all reaper goroutines have finished, ensuring no ffmpeg
	// process is still lingering and locking files
	p.activeHeadsWg.Wait()
}

// killHeadLocked terminates an encoder head
func (p *Pipeline) killHeadLocked(id int) {
	defer func() { recover() }() // Guard against double-close of killCh.
	select {
	case <-p.killCh:
	default:
		close(p.killCh)
	}
	h := p.heads[id]
	if h.cancel != nil {
		h.cancel()
	}
	// Release the governor slot immediately — before waiting for the process to exit.
	// This lets the next runHead acquire a slot without blocking on cmd.Wait(),
	// which significantly reduces seek latency (especially on Windows).
	if h.released != nil && h.release != nil {
		h.released.Do(h.release)
	}
	if h.segment == -1 || h.cmd == nil {
		return
	}
	// Use util.KillCmd to guarantee tree termination across platforms (including Windows HW sub-processes)
	_ = util.KillCmd(h.cmd)
	p.heads[id].cmd = nil
}

// killAllHeads kills all active heads in the pipeline
func (p *Pipeline) killAllHeads() {
	p.headsMu.Lock()
	defer p.headsMu.Unlock()
	for i, h := range p.heads {
		if h.segment == -1 {
			continue
		}
		p.logger.Trace().Int("eid", i).Int32("at", h.segment).
			Msg("cassette: killing active head to free resources")
		p.killHeadLocked(i)
	}
}

// encoder head management

// isScheduled reports if any head covers seg
func (p *Pipeline) isScheduled(seg int32) bool {
	for _, h := range p.heads {
		if h.segment >= 0 && h.segment <= seg && seg < h.end {
			return true
		}
	}
	return false
}

// minHeadDistance returns distance to nearest head
func (p *Pipeline) minHeadDistance(seg int32) float64 {
	t := p.session.Keyframes.Get(seg)
	best := math.Inf(1)
	for _, h := range p.heads {
		if h.segment < 0 || seg >= h.end {
			continue
		}
		ht := p.session.Keyframes.Get(h.segment)
		if ht > t {
			continue
		}
		if d := t - ht; d < best {
			best = d
		}
	}
	return best
}

// prefetch speculatively spawns an encoder by using VelocityEstimator
func (p *Pipeline) prefetch(current int32) {
	// Audio is cheap to encode on demand, skip prefetch
	if p.kind == AudioKind {
		return
	}

	lookAhead := p.velocity.LookAhead(5) // base 5 segments, scales up
	length := int32(p.segments.Len())

	p.headsMu.RLock()
	defer p.headsMu.RUnlock()

	for i := current + 1; i <= min(current+lookAhead, length-1); i++ {
		if p.segments.IsReady(i) {
			continue
		}
		if d := p.minHeadDistance(i); d < 60+5*float64(i-current) {
			continue
		}
		go func(s int32) { _ = p.runHead(s, true) }(i)
		return // only one speculative head per request
	}
}

// boolToReserve converts a bool to a reserve count for NVENC arbiter
func boolToReserve(speculative bool) int {
	if speculative {
		return 1
	}
	return 0
}

// runHead launches an ffmpeg process from [start, end).
// it acquires a slot from the governor.
func (p *Pipeline) runHead(start int32, speculative bool) error {
	length, isDone := p.session.Keyframes.Length()
	end := min(start+100, length)
	// keep a 2-segment padding when keyframes are still arriving so we
	// never reference a keyframe that hasn't been extracted yet.
	if !isDone {
		end -= 2
	}

	// shrink range to stop at the first already-ready segment.
	for i := start; i < end; i++ {
		if p.segments.IsReady(i) {
			end = i
			break
		}
	}
	if start >= end {
		return nil
	}

	// acquire a slot from the governor
	release, err := p.governor.Acquire(p.ctx)
	if err != nil {
		return fmt.Errorf("cassette: governor denied slot: %w", err)
	}
	// guard against the select race: when both the semaphore and ctx.Done()
	// are immediately ready, Go picks randomly. If the semaphore won but the
	// context was already cancelled (e.g. pipeline was Kill()ed), bail now.
	if p.ctx.Err() != nil {
		release()
		return fmt.Errorf("cassette: pipeline cancelled")
	}

	headCtx, headCancel := context.WithCancel(p.ctx)
	success := false
	encoderID := -1
	defer func() {
		if success {
			return
		}
		headCancel()
		// Free the reserved encoder slot on any failure path so it does not
		// linger as a phantom scheduled head (which would make isScheduled /
		// minHeadDistance treat this range as covered forever). The governor
		// slot itself is released by the explicit combinedRelease() calls on
		// those paths.
		if encoderID >= 0 {
			p.headsMu.Lock()
			if encoderID < len(p.heads) && p.heads[encoderID].cmd == nil {
				p.heads[encoderID] = deletedHead
			}
			p.headsMu.Unlock()
		}
	}()
	
	headProfile := p.settings.GetHwAccel()
	var nvencRelease func()
	if headProfile.Name == "nvidia" {
		var ok bool
		nvencRelease, ok = p.governor.TryAcquireNVENC(boolToReserve(speculative))
		if !ok {
			// fallback just this head to CPU
			p.logger.Debug().Int32("start", start).Msg("cassette/pipeline: NVENC saturated, head falling back to CPU")
			headProfile = FallbackToCPU(p.settings.Preset)
		}
	}

	combinedRelease := func() { 
		if nvencRelease != nil {
			nvencRelease()
		}
		release()
	}
	// Create a sync.Once so the governor slot is released exactly once
	// by either killHeadLocked or reapProcess.
	once := &sync.Once{}

	// Claim the encoder slot with a non-free marker while holding the lock, so a
	// concurrent runHead (e.g. a speculative prefetch racing a real request) cannot
	// pick the same encoderID and spawn a second ffmpeg writing to the same output
	// path. cmd/stdin/release are filled in after cmd.Start(); cancel is set now so
	// a seek that kills this head during startup aborts headCtx and fails cmd.Start()
	// fast. release/released are intentionally left nil until the process exists, so
	// killHeadLocked does not release a governor slot the head hasn't taken ownership
	// of yet (the pre-Start failure paths release it via combinedRelease()).
	reserved := head{segment: start, end: end, cancel: headCancel}
	p.headsMu.Lock()
	for i, h := range p.heads {
		if h.segment == -1 && h.end == -1 {
			encoderID = i
			break
		}
	}
	if encoderID == -1 {
		encoderID = len(p.heads)
		p.heads = append(p.heads, reserved)
	} else {
		p.heads[encoderID] = reserved
	}
	p.headsMu.Unlock()

	// build ffmpeg arguments
	startSeg := start
	startRef := float64(0)
	if start != 0 {
		startSeg = start - 1
		if p.kind == AudioKind {
			// El audio requiere posicionarse exactamente en la marca del keyframe anterior
			// para mantener la continuidad en la tubería y timestamps correctos.
			startRef = p.session.Keyframes.Get(startSeg)
		} else {
			// El video requiere un margen extra de 10ms para evitar que -noaccurate_seek
			// retroceda por error al keyframe anterior por problemas de redondeo float.
			startRef = p.session.Keyframes.Get(startSeg) + 0.01
		}
	}

	endPad := int32(1)
	if end == length {
		endPad = 0
	}

	// We must include the "start" keyframe as a boundary so ffmpeg spits out
	// the pre-segment (which we discard) as a separate file
	firstBoundary := start + 1
	if start != 0 {
		firstBoundary = start
	}

	segmentTimes := p.session.Keyframes.Slice(firstBoundary, end+endPad)
	if len(segmentTimes) == 0 {
		segmentTimes = []float64{9_999_999}
	}

	outPath := p.outPathFmt(encoderID)
	if err := os.MkdirAll(filepath.Dir(outPath), 0755); err != nil {
		combinedRelease()
		return err
	}

	args := []string{"-nostats", "-hide_banner", "-loglevel", "warning",
		// Limit input analysis so FFmpeg starts writing the first segment faster.
		// Default values (5 000 000 µs / 5 MB) force reading deep into large MKV
		// files before the muxer is ready. 10 MB is enough to detect all streams.
		"-analyzeduration", "10000000", "-probesize", "10000000",
	}
	isCopy := false
	if p.buildArgs != nil {
		for _, arg := range p.buildArgs("", &headProfile) {
			if arg == "copy" {
				isCopy = true
				break
			}
		}
	}
	// Only video pipelines benefit from hardware-accelerated decoding. Audio pipelines
	// re-encode audio only (-map 0:a with -sn -dn) and must NOT receive the video decode
	// flags (e.g. -hwaccel cuda -hwaccel_output_format cuda): they are useless for audio
	// and make the audio ffmpeg needlessly open a GPU decode context, competing for scarce
	// NVDEC/NVENC sessions with the concurrent video transcode.
	if !isCopy && p.kind == VideoKind {
		args = append(args, headProfile.DecodeFlags...)
	}

	if startRef != 0 {
		if p.kind == VideoKind && !isCopy {
			args = append(args, "-noaccurate_seek")
		}
		args = append(args, "-ss", fmt.Sprintf("%.6f", startRef))
	}

	if end+1 < length {
		endRef := p.session.Keyframes.Get(end + 1)
		// compensate for the offset between the requested -ss and the actual
		// keyframe that ffmpeg landed on
		endRef += startRef - p.session.Keyframes.Get(startSeg)
		args = append(args, "-to", fmt.Sprintf("%.6f", endRef))
	}

	args = append(args,
		"-sn", "-dn",
		"-i", p.session.Path,
		"-map_metadata", "-1", // ?
		"-map_chapters", "-1", // ?
		"-copyts",
		"-muxdelay", "0",
	)



	// -force_key_frames (encode path, inside buildArgs) is evaluated against the
	// output timeline, which -copyts keeps absolute, so it receives the absolute
	// keyframe times.
	segStr := toSegmentStr(segmentTimes)
	args = append(args, p.buildArgs(segStr, &headProfile)...)

	// The segment muxer's -segment_times, in contrast, are interpreted RELATIVE to
	// the -ss seek point when input seeking is combined with -copyts (observed on
	// ffmpeg 8.x). Passing absolute times makes the muxer never reach a split
	// boundary, so it emits the whole range as a single file and the requested
	// segment is never produced ("segment N not ready after retries") — which
	// freezes playback on every seek, audio-track switch, or resume-from-progress
	// into a non-initial position. Shift the split points by the seek reference so
	// they are relative; -copyts still keeps the segment *content* PTS absolute,
	// which is what the HLS playlist and hls.js expect.
	segmentTimesForMuxer := segmentTimes
	if startRef != 0 {
		segmentTimesForMuxer = make([]float64, len(segmentTimes))
		for i, t := range segmentTimes {
			segmentTimesForMuxer[i] = t - startRef
		}
	}
	segMuxStr := toSegmentStr(segmentTimesForMuxer)

	args = append(args,
		"-f", "segment",
		"-segment_time_delta", "0.05",
		"-segment_format", "mpegts",
		"-segment_times", segMuxStr,
		"-segment_list_type", "flat",
		"-segment_list", "pipe:1",
		"-segment_start_number", fmt.Sprint(startSeg),
		outPath,
	)

	p.logger.Trace().Str("pipeline", p.label).Int("eid", encoderID).
		Int32("start", start).Int32("end", end).
		Msgf("cassette: spawning ffmpeg")

	cmd := util.NewCmdCtx(headCtx, p.settings.FfmpegPath, args...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		combinedRelease()
		return err
	}
	stdin, err := cmd.StdinPipe()
	if err != nil {
		combinedRelease()
		return err
	}
	var stderr strings.Builder
	cmd.Stderr = &stderr

	if err := cmd.Start(); err != nil {
		combinedRelease()
		return err
	}

	p.headsMu.Lock()
	p.heads[encoderID] = head{
		segment: start, end: end, cancel: headCancel,
		release: combinedRelease, released: once,
		cmd: cmd, stdin: stdin,
	}
	p.headsMu.Unlock()

	p.activeHeadsWg.Add(1)

	// read segment list from stdout
	go p.readSegments(encoderID, start, end, stdout, stdin)

	// cancel listener, propagates context cancellation to ffmpeg
	go func(ctx context.Context) {
		<-ctx.Done()
		_, _ = stdin.Write([]byte("q"))
		_ = stdin.Close()
	}(headCtx)

	// Goroutine: reap process and release governor slot.
	// reapProcess uses once.Do(combinedRelease) so the slot is freed exactly once,
	// even if killHeadLocked already released it early.
	go p.reapProcess(headCtx, encoderID, cmd, &stderr, once, combinedRelease, headCancel, headProfile)

	success = true
	return nil
}

// readSegments processes the segment list from stdout.
// As each segment is ready, it marks it as ready in the segments map.
func (p *Pipeline) readSegments(
	encoderID int,
	start, end int32,
	stdout io.ReadCloser,
	stdin io.WriteCloser,
) {
	scanner := bufio.NewScanner(stdout)
	format := filepath.Base(p.outPathFmt(encoderID))

	for scanner.Scan() {
		var seg int32
		if _, err := fmt.Sscanf(scanner.Text(), format, &seg); err != nil {
			continue
		}
		if seg < start {
			continue // pre-segment produced by -ss padding, discard
		}

		p.headsMu.Lock()
		p.heads[encoderID].segment = seg
		p.headsMu.Unlock()

		if p.segments.IsReady(seg) {
			// another encoder beat us, quit to avoid duplicate work.
			// write q in a goroutine so readSegments never blocks on a full pipe.
			go func() {
				_, _ = stdin.Write([]byte("q"))
				_ = stdin.Close()
			}()
			return
		}

		p.segments.MarkReady(seg, encoderID)

		if seg == end-1 {
			return // range complete, ffmpeg will finish naturally
		}
		if p.segments.IsReady(seg + 1) {
			// next segment already done by another head, no point continuing.
			// write q in a goroutine so readSegments never blocks on a full pipe.
			go func() {
				_, _ = stdin.Write([]byte("q"))
				_ = stdin.Close()
			}()
			return
		}
	}

	if err := scanner.Err(); err != nil {
		p.logger.Error().Err(err).Msg("cassette: scanner error during segment read")
	}
}

// reapProcess waits for the ffmpeg process to exit, marks its head as deleted,
// and releases the governor slot. If a hardware acceleration failure is
// detected, it logs actionable guidance.
func (p *Pipeline) reapProcess(ctx context.Context, encoderID int, cmd *exec.Cmd, stderr *strings.Builder, once *sync.Once, combinedRelease func(), headCancel context.CancelFunc, headProfile HwAccelProfile) {
	defer p.activeHeadsWg.Done() // Signal that this head has completely exited
	defer once.Do(combinedRelease) // Always release the governor slot exactly once
	defer headCancel()           // Cancel the head context to free the soft-close goroutine

	err := cmd.Wait()

	// Classify the exit up front. Intentional terminations (head switches on seek,
	// session teardown, context cancellation) are a normal part of streaming — ffmpeg
	// reports them as exit code 255, a "killed" error, or via a cancelled context.
	// They must NOT be mistaken for a hardware-acceleration failure.
	var exitErr *exec.ExitError
	intentionalKill := (errors.As(err, &exitErr) && exitErr.ExitCode() == 255) ||
		ctx.Err() != nil || p.ctx.Err() != nil ||
		(err != nil && strings.Contains(err.Error(), "killed"))

	// We use the profile that this SPECIFIC head used, not the global one.
	hwProfile := headProfile
	isHwAccelEnabled := hwProfile.Name != "disabled"

	// Only fall back to CPU on a GENUINE hardware-acceleration failure. Two guards
	// prevent spuriously disabling a perfectly working GPU:
	//  1. intentionalKill — seek head-switches, session teardown and context
	//     cancellation kill the ffmpeg process mid-stream; a dying CUDA/NVENC ffmpeg
	//     can flush "cuda ... failed" style noise to stderr that must NOT be read as
	//     a real failure. (Previously the intentionalKill classification was computed
	//     but never applied here.)
	//  2. re-probe — a single transient failure (temporary session exhaustion, a
	//     one-off decode hiccup) must not permanently disable the encoder for the
	//     whole session. Before committing to CPU we re-run the minimal encoder probe;
	//     if the GPU still encodes, we keep the profile and let GetSegment retry on
	//     GPU (the `case err != nil` branch below closes killCh to trigger that).
	if isHwAccelEnabled && !intentionalKill && DetectHwAccelFailure(stderr.String()) {
		encoder := encoderName(hwProfile)
		if encoder != "" && testEncoder(p.settings.FfmpegPath, encoder) {
			p.logger.Warn().Int("eid", encoderID).
				Str("hwaccel", FormatHwAccelSummary(hwProfile)).
				Str("ffmpeg_error", stderr.String()).
				Msg("cassette: transient hardware-accel error, GPU still probes OK; retrying on GPU")
		} else {
			p.logger.Warn().Int("eid", encoderID).
				Str("hwaccel", FormatHwAccelSummary(hwProfile)).
				Str("ffmpeg_error", stderr.String()).
				Msg("cassette: hardware acceleration failed, falling back to CPU...")
			p.settings.SetHwAccel(FallbackToCPU("superfast"))
			notifier.Global().Notify(notifier.TypeMediastream, "Aceleración por hardware desactivada",
				fmt.Sprintf("FFmpeg falló usando %s; la transcodificación continúa por CPU.", hwProfile.Name))
		}
	}

	switch {
	case errors.As(err, &exitErr) && exitErr.ExitCode() == 255:
		p.logger.Trace().Int("eid", encoderID).Msg("cassette: ffmpeg process terminated")
	case ctx.Err() != nil || p.ctx.Err() != nil:
		p.logger.Trace().Int("eid", encoderID).Msg("cassette: ffmpeg process killed intentionally")
	case err != nil && strings.Contains(err.Error(), "killed"):
		p.logger.Trace().Int("eid", encoderID).Msg("cassette: ffmpeg process killed intentionally")
	case err != nil:
		p.logger.Error().Int("eid", encoderID).
			Err(fmt.Errorf("%s: %s", err, stderr.String())).
			Msg("cassette: ffmpeg process failed")

		// If it's a real failure (not killed intentionally), notify GetSegment to retry immediately
		p.headsMu.Lock()
		select {
		case <-p.killCh:
		default:
			close(p.killCh)
		}
		p.headsMu.Unlock()
	default:
		p.logger.Trace().Int("eid", encoderID).Str("pipeline", p.label).
			Msg("cassette: ffmpeg process exited cleanly")
	}

	p.headsMu.Lock()
	defer p.headsMu.Unlock()
	p.heads[encoderID] = deletedHead
}

// helpers

func toSegmentStr(times []float64) string {
	parts := make([]string, len(times))
	for i, t := range times {
		parts[i] = fmt.Sprintf("%.6f", t)
	}
	return strings.Join(parts, ",")
}
