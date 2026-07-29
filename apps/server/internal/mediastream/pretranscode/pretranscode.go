// Package pretranscode converts library files to a static HLS ladder ahead of
// playback, so opening an episode that would otherwise need a live transcode
// starts instantly and costs no CPU/GPU at watch time.
//
// It complements the live transcoder (package cassette) rather than replacing
// it: the output lands in the same layout the "optimized" stream type already
// serves (<outputDir>/<hash>/master.m3u8), so a pre-transcoded file is picked up
// by the existing playback path with no extra plumbing.
package pretranscode

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"kamehouse/internal/mediastream/cassette"
	"kamehouse/internal/mediastream/videofile"

	"github.com/rs/zerolog"
)

type JobStatus string

const (
	StatusQueued    JobStatus = "queued"
	StatusRunning   JobStatus = "running"
	StatusCompleted JobStatus = "completed"
	StatusFailed    JobStatus = "failed"
)

// segmentDuration is the target HLS segment length. 6s is the usual VOD
// tradeoff: long enough to keep the playlist small, short enough to seek well.
const segmentDuration = 6

// PreTranscodeJob is one file's pre-transcode, tracked from queue to completion.
type PreTranscodeJob struct {
	Hash     string     `json:"hash"`
	FilePath string     `json:"filePath"`
	Status   JobStatus  `json:"status"`
	Progress float64    `json:"progress"` // 0-100
	Error    string     `json:"error,omitempty"`
	QueuedAt time.Time  `json:"queuedAt"`
	EndedAt  *time.Time `json:"endedAt,omitempty"`
}

// Options configures a Manager. All fields are required except Concurrency.
type Options struct {
	Logger    *zerolog.Logger
	OutputDir string
	// FfmpegPath/FfprobePath come from the user's mediastream settings.
	FfmpegPath  string
	FfprobePath string
	// HwAccel mirrors Settings → Streaming so pre-transcodes use the same
	// encoder the live transcoder would.
	HwAccel cassette.HwAccelOptions
	// Concurrency caps simultaneous ffmpeg processes. <= 0 means 1: pre-transcode
	// is background work and must not starve a live playback transcode.
	Concurrency int
	// Extractor probes duration for progress reporting.
	Extractor *videofile.MediaInfoExtractor
}

// Manager owns the pre-transcode queue and its workers.
type Manager struct {
	opts   Options
	logger *zerolog.Logger

	mu   sync.RWMutex
	jobs map[string]*PreTranscodeJob // by hash

	queue chan *PreTranscodeJob

	cancelMu sync.Mutex
	cancels  map[string]context.CancelFunc // running jobs, by hash

	startOnce sync.Once
	stopCh    chan struct{}
}

func New(opts Options) *Manager {
	if opts.Concurrency <= 0 {
		opts.Concurrency = 1
	}
	return &Manager{
		opts:    opts,
		logger:  opts.Logger,
		jobs:    make(map[string]*PreTranscodeJob),
		queue:   make(chan *PreTranscodeJob, 256),
		cancels: make(map[string]context.CancelFunc),
		stopCh:  make(chan struct{}),
	}
}

// QueueLength returns the number of jobs currently in the queue.
func (m *Manager) QueueLength() int {
	return len(m.queue)
}

// Start launches the workers. Safe to call more than once.
func (m *Manager) Start() {
	m.startOnce.Do(func() {
		for i := 0; i < m.opts.Concurrency; i++ {
			go m.worker()
		}
		m.logger.Info().Int("workers", m.opts.Concurrency).Str("outputDir", m.opts.OutputDir).Msg("pretranscode: Started")
	})
}

// Stop signals the workers to exit and kills any ffmpeg still running.
func (m *Manager) Stop() {
	select {
	case <-m.stopCh:
		return // already stopped
	default:
		close(m.stopCh)
	}

	m.cancelMu.Lock()
	for _, cancel := range m.cancels {
		cancel()
	}
	m.cancelMu.Unlock()
}

// OutputDirFor returns the directory holding a file's pre-transcoded HLS.
func (m *Manager) OutputDirFor(hash string) string {
	return filepath.Join(m.opts.OutputDir, hash)
}

// IsAvailable reports whether a finished pre-transcode exists on disk for the
// given file. This is the check the playback path uses to prefer the optimized
// stream over a live transcode.
func (m *Manager) IsAvailable(hash string) bool {
	_, err := os.Stat(filepath.Join(m.OutputDirFor(hash), "master.m3u8"))
	return err == nil
}

// Enqueue schedules a file for pre-transcoding. It is idempotent: an already
// pre-transcoded file, or one already queued/running, returns its existing job
// without starting duplicate work.
func (m *Manager) Enqueue(filePath string) (*PreTranscodeJob, error) {
	if m.opts.FfmpegPath == "" {
		return nil, errors.New("ffmpeg path is not configured")
	}

	hash, err := videofile.GetHashFromPath(filePath)
	if err != nil {
		return nil, fmt.Errorf("could not hash %q: %w", filePath, err)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if existing, ok := m.jobs[hash]; ok {
		switch existing.Status {
		case StatusQueued, StatusRunning, StatusCompleted:
			return existing, nil
		}
		// A failed job is retried below.
	}

	// Already on disk from a previous run: record it as done rather than redoing it.
	if m.IsAvailable(hash) {
		job := &PreTranscodeJob{Hash: hash, FilePath: filePath, Status: StatusCompleted, Progress: 100, QueuedAt: time.Now()}
		m.jobs[hash] = job
		return job, nil
	}

	job := &PreTranscodeJob{Hash: hash, FilePath: filePath, Status: StatusQueued, QueuedAt: time.Now()}
	m.jobs[hash] = job

	select {
	case m.queue <- job:
	default:
		delete(m.jobs, hash)
		return nil, errors.New("pre-transcode queue is full")
	}

	m.logger.Debug().Str("filepath", filePath).Str("hash", hash).Msg("pretranscode: Job queued")
	return job, nil
}

// Cancel stops a queued or running job and discards its partial output.
func (m *Manager) Cancel(hash string) bool {
	m.cancelMu.Lock()
	cancel, running := m.cancels[hash]
	m.cancelMu.Unlock()

	if running {
		cancel()
		return true
	}

	// Not running: if it is still queued, mark it failed so the worker skips it.
	m.mu.Lock()
	defer m.mu.Unlock()
	if job, ok := m.jobs[hash]; ok && job.Status == StatusQueued {
		job.Status = StatusFailed
		job.Error = "cancelled"
		return true
	}
	return false
}

// Jobs returns a snapshot of every tracked job.
func (m *Manager) Jobs() []*PreTranscodeJob {
	m.mu.RLock()
	defer m.mu.RUnlock()

	out := make([]*PreTranscodeJob, 0, len(m.jobs))
	for _, j := range m.jobs {
		clone := *j
		out = append(out, &clone)
	}
	return out
}

// Get returns a snapshot of one job.
func (m *Manager) Get(hash string) (*PreTranscodeJob, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	job, ok := m.jobs[hash]
	if !ok {
		return nil, false
	}
	clone := *job
	return &clone, true
}

// Delete removes a file's pre-transcoded output and forgets its job.
func (m *Manager) Delete(hash string) error {
	m.Cancel(hash)

	m.mu.Lock()
	delete(m.jobs, hash)
	m.mu.Unlock()

	return os.RemoveAll(m.OutputDirFor(hash))
}

func (m *Manager) worker() {
	for {
		select {
		case <-m.stopCh:
			return
		case job := <-m.queue:
			// Cancel() may have marked it failed while it sat in the queue.
			m.mu.RLock()
			skip := job.Status != StatusQueued
			m.mu.RUnlock()
			if skip {
				continue
			}
			m.run(job)
		}
	}
}

func (m *Manager) run(job *PreTranscodeJob) {
	ctx, cancel := context.WithCancel(context.Background())

	m.cancelMu.Lock()
	m.cancels[job.Hash] = cancel
	m.cancelMu.Unlock()

	defer func() {
		cancel()
		m.cancelMu.Lock()
		delete(m.cancels, job.Hash)
		m.cancelMu.Unlock()
	}()

	m.setStatus(job.Hash, StatusRunning, 0, "")
	m.logger.Info().Str("filepath", job.FilePath).Msg("pretranscode: Started")

	err := m.transcode(ctx, job)

	now := time.Now()
	if err != nil {
		// A cancel is a user action, not a failure to report loudly.
		if ctx.Err() != nil {
			m.logger.Info().Str("filepath", job.FilePath).Msg("pretranscode: Cancelled")
			_ = os.RemoveAll(m.OutputDirFor(job.Hash))
			m.finish(job.Hash, StatusFailed, "cancelled", &now)
			return
		}
		m.logger.Error().Err(err).Str("filepath", job.FilePath).Msg("pretranscode: Failed")
		// Never leave a half-written playlist behind: the playback path treats the
		// presence of master.m3u8 as "ready" and would serve a truncated stream.
		_ = os.RemoveAll(m.OutputDirFor(job.Hash))
		m.finish(job.Hash, StatusFailed, err.Error(), &now)
		return
	}

	m.logger.Info().Str("filepath", job.FilePath).Msg("pretranscode: Completed")
	m.finish(job.Hash, StatusCompleted, "", &now)
}

func (m *Manager) transcode(ctx context.Context, job *PreTranscodeJob) error {
	outDir := m.OutputDirFor(job.Hash)

	// Build into a temp dir and rename on success, so IsAvailable never sees a
	// master.m3u8 whose segments aren't all written yet.
	tmpDir := outDir + ".tmp"
	if err := os.RemoveAll(tmpDir); err != nil {
		return fmt.Errorf("could not clear temp dir: %w", err)
	}
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		return fmt.Errorf("could not create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	totalDuration := m.probeDuration(job.FilePath)

	hw := cassette.BuildHwAccelProfile(cassette.HwAccelOptions{
		Kind:           m.opts.HwAccel.Kind,
		Preset:         m.opts.HwAccel.Preset,
		CustomSettings: m.opts.HwAccel.CustomSettings,
	}, m.opts.FfmpegPath, m.logger)

	args := buildFfmpegArgs(hw, job.FilePath, tmpDir)

	cmd := exec.CommandContext(ctx, m.opts.FfmpegPath, args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("could not open ffmpeg stdout: %w", err)
	}
	var stderr strings.Builder
	cmd.Stderr = &stderr

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("could not start ffmpeg: %w", err)
	}

	// -progress pipe:1 emits key=value lines; out_time_ms against the probed
	// duration is the only reliable progress signal ffmpeg gives us.
	go m.trackProgress(stdout, job.Hash, totalDuration)

	if err := cmd.Wait(); err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		msg := strings.TrimSpace(stderr.String())
		if cassette.DetectHwAccelFailure(msg) {
			return fmt.Errorf("hardware encoder rejected this file (check Settings → Streaming): %s", lastLine(msg))
		}
		return fmt.Errorf("ffmpeg failed: %s", lastLine(msg))
	}

	if err := os.RemoveAll(outDir); err != nil {
		return fmt.Errorf("could not clear output dir: %w", err)
	}
	if err := os.Rename(tmpDir, outDir); err != nil {
		return fmt.Errorf("could not publish output dir: %w", err)
	}

	m.setStatus(job.Hash, StatusRunning, 100, "")
	return nil
}

// buildFfmpegArgs assembles a VOD HLS encode. Decode flags must precede -i and
// encode flags follow it — that ordering is what makes hwaccel actually engage.
func buildFfmpegArgs(hw cassette.HwAccelProfile, inputPath string, outDir string) []string {
	args := []string{"-y", "-hide_banner", "-loglevel", "error", "-progress", "pipe:1", "-nostats"}
	args = append(args, hw.DecodeFlags...)
	args = append(args, "-i", inputPath)

	// Only the first video and the default audio track: a pre-transcode is the
	// "just play it" path, and extra tracks multiply encode time for little gain.
	args = append(args, "-map", "0:v:0", "-map", "0:a:0?")
	args = append(args, hw.EncodeFlags...)

	if hw.ForcedIDR {
		// Segment boundaries must land on IDR frames or players stall at the cut.
		args = append(args, "-force_key_frames", fmt.Sprintf("expr:gte(t,n_forced*%d)", segmentDuration))
	}

	args = append(args,
		"-c:a", "aac",
		"-ac", "2",
		"-b:a", "192k",
		"-f", "hls",
		"-hls_time", strconv.Itoa(segmentDuration),
		"-hls_playlist_type", "vod",
		"-hls_flags", "independent_segments",
		"-hls_segment_filename", filepath.Join(outDir, "seg%05d.ts"),
		filepath.Join(outDir, "master.m3u8"),
	)

	return args
}

// probeDuration returns the file's duration in seconds, or 0 when unknown —
// progress then stays at 0 until completion rather than reporting nonsense.
//
// The shared extractor is tried first because playback has usually probed the
// file already and its result is cached, but it is not required: falling back to
// a direct ffprobe keeps the progress bar working instead of silently pinning it
// at 0%.
func (m *Manager) probeDuration(filePath string) float64 {
	if m.opts.Extractor != nil && m.opts.FfprobePath != "" {
		if info, err := m.opts.Extractor.GetInfo(m.opts.FfprobePath, filePath); err == nil && info != nil && info.Duration > 0 {
			return float64(info.Duration)
		}
	}

	d, err := probeDurationWithFfprobe(m.opts.FfprobePath, filePath)
	if err != nil {
		m.logger.Debug().Err(err).Str("filepath", filePath).Msg("pretranscode: Could not probe duration, progress will stay at 0 until the job finishes")
		return 0
	}
	return d
}

// probeDurationWithFfprobe asks ffprobe for the container duration directly.
func probeDurationWithFfprobe(ffprobePath string, filePath string) (float64, error) {
	if ffprobePath == "" {
		ffprobePath = "ffprobe"
	}

	out, err := exec.Command(ffprobePath,
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		filePath,
	).Output()
	if err != nil {
		return 0, err
	}

	d, err := strconv.ParseFloat(strings.TrimSpace(string(out)), 64)
	if err != nil {
		return 0, fmt.Errorf("unparseable duration %q: %w", strings.TrimSpace(string(out)), err)
	}
	return d, nil
}

func (m *Manager) trackProgress(stdout interface{ Read([]byte) (int, error) }, hash string, totalDuration float64) {
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		key, value, found := strings.Cut(strings.TrimSpace(scanner.Text()), "=")
		if !found || key != "out_time_ms" || totalDuration <= 0 {
			continue
		}
		us, err := strconv.ParseFloat(value, 64)
		if err != nil {
			continue
		}
		// out_time_ms is microseconds despite the name.
		pct := (us / 1_000_000) / totalDuration * 100
		if pct < 0 {
			pct = 0
		}
		if pct > 100 {
			pct = 100
		}
		m.setStatus(hash, StatusRunning, pct, "")
	}
}

func (m *Manager) setStatus(hash string, status JobStatus, progress float64, errMsg string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	job, ok := m.jobs[hash]
	if !ok {
		return
	}
	job.Status = status
	job.Progress = progress
	job.Error = errMsg
}

func (m *Manager) finish(hash string, status JobStatus, errMsg string, endedAt *time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()

	job, ok := m.jobs[hash]
	if !ok {
		return
	}
	job.Status = status
	job.Error = errMsg
	job.EndedAt = endedAt
	if status == StatusCompleted {
		job.Progress = 100
	}
}

// lastLine trims ffmpeg's stderr to its final line — the one that names the
// actual error — so it fits in a job's Error field and a toast.
func lastLine(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return "unknown error"
	}
	if idx := strings.LastIndex(s, "\n"); idx != -1 {
		return strings.TrimSpace(s[idx+1:])
	}
	return s
}
