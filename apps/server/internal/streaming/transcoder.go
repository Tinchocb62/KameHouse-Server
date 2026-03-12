package streaming

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"kamehouse/internal/mediastream/transcoder"

	"github.com/rs/zerolog"
)


// Semaphore is a channel-based counting semaphore.
type Semaphore chan struct{}

func NewSemaphore(n int) Semaphore {
	sem := make(Semaphore, n)
	for i := 0; i < n; i++ {
		sem <- struct{}{}
	}
	return sem
}

func (s Semaphore) Acquire(ctx context.Context) bool {
	select {
	case <-s:
		return true
	case <-ctx.Done():
		return false
	}
}

func (s Semaphore) Release() { s <- struct{}{} }

// FfmpegTranscoder manages HLS transcode and DirectStream remux sessions,
// enforcing MaxTranscodeSessions via a shared semaphore.
type FfmpegTranscoder struct {
	FfmpegPath string
	OutDir     string
	sem        Semaphore
	hwAccel    *transcoder.HwAccelCapability // nil = CPU fallback (libx264)
	logger     *zerolog.Logger
}

// NewTranscoder creates an FfmpegTranscoder.
// hwAccel may be nil (CPU-only). sem may be nil (uses MaxTranscodeSessions default).
func NewTranscoder(ffmpegPath string, sem Semaphore, logger *zerolog.Logger) *FfmpegTranscoder {
	if ffmpegPath == "" {
		ffmpegPath = "ffmpeg"
	}
	if sem == nil {
		sem = NewSemaphore(MaxTranscodeSessions)
	}
	outDir := filepath.Join(os.TempDir(), "kamehouse_transcodes")
	_ = os.MkdirAll(outDir, 0755)

	return &FfmpegTranscoder{
		FfmpegPath: ffmpegPath,
		OutDir:     outDir,
		sem:        sem,
		logger:     logger,
	}
}

// WithHwAccel attaches a hardware accelerator profile to the transcoder.
func (t *FfmpegTranscoder) WithHwAccel(hw *transcoder.HwAccelCapability) *FfmpegTranscoder {
	t.hwAccel = hw
	return t
}

// ─── FFmpeg argument builders ─────────────────────────────────────────────────

// buildTranscodeArgs constructs FFmpeg args for a full HLS transcode.
// Selects HW encoder when available; falls back to libx264.
func (t *FfmpegTranscoder) buildTranscodeArgs(inputFile, sessionDir, masterPlaylist string, needsBurnSubs bool) []string {
	args := []string{"-y", "-i", inputFile}

	// HW decode hint (reduces CPU load during decode)
	if t.hwAccel != nil && t.hwAccel.Decoder != "" {
		args = append(args, "-c:v", t.hwAccel.Decoder) // decode with HW
	}

	// Re-open input to allow HW frame pipeline (required for some accel modes)
	videoEncoder := "libx264"
	preset := "veryfast"
	if t.hwAccel != nil && t.hwAccel.Encoder != "" {
		videoEncoder = t.hwAccel.Encoder
		// HW encoders don't support the same -preset flags as libx264
		preset = ""
		// Add HW-specific acceleration flags
		switch t.hwAccel.Name {
		case "nvidia":
			args = append(args, "-hwaccel", "cuda", "-hwaccel_output_format", "cuda")
		case "vaapi":
			args = append(args, "-hwaccel", "vaapi", "-hwaccel_output_format", "vaapi",
				"-vaapi_device", "/dev/dri/renderD128")
		case "qsv":
			args = append(args, "-hwaccel", "qsv", "-hwaccel_output_format", "qsv")
		case "videotoolbox":
			args = append(args, "-hwaccel", "videotoolbox")
		case "amf":
			args = append(args, "-hwaccel", "d3d11va")
		}
	}

	args = append(args, "-c:v", videoEncoder)
	if preset != "" {
		args = append(args, "-preset", preset)
	}

	// Subtitle handling
	if needsBurnSubs {
		// Burn image-based subtitles (PGS/DVD) into the video frame
		inputEscaped := strings.ReplaceAll(inputFile, "\\", "/")
		inputEscaped = strings.ReplaceAll(inputEscaped, ":", "\\:")
		args = append(args, "-vf", "subtitles="+inputEscaped)
		args = append(args, "-c:s", "none") // no subtitle stream in output
	} else {
		args = append(args, "-c:s", "mov_text") // text subtitle passthrough (MP4-compatible)
	}

	args = append(args,
		"-c:a", "aac", "-b:a", "192k",
		"-f", "hls",
		"-hls_time", "3",
		"-hls_list_size", "0",
		"-hls_flags", "independent_segments",
		"-hls_segment_type", "mpegts",
		"-hls_segment_filename", filepath.Join(sessionDir, "segment_%03d.ts"),
		masterPlaylist,
	)
	return args
}

// buildRemuxArgs constructs FFmpeg args for a DirectStream remux to MP4/HLS.
// All streams are copied (no re-encode) — fastest possible output.
func (t *FfmpegTranscoder) buildRemuxArgs(inputFile, sessionDir, masterPlaylist string, needsBurnSubs bool) []string {
	args := []string{"-y", "-i", inputFile}

	if needsBurnSubs {
		inputEscaped := strings.ReplaceAll(inputFile, "\\", "/")
		inputEscaped = strings.ReplaceAll(inputEscaped, ":", "\\:")
		args = append(args,
			"-vf", "subtitles="+inputEscaped,
			"-c:v", "libx264", "-preset", "ultrafast", // forced re-encode for burn-in
		)
	} else {
		args = append(args, "-c:v", "copy")
	}

	args = append(args,
		"-c:a", "copy",
		"-c:s", "none", // drop subtitle streams (MP4 text subs have poor browser support)
		"-f", "hls",
		"-hls_time", "3",
		"-hls_list_size", "0",
		"-hls_flags", "independent_segments",
		"-hls_segment_type", "mpegts",
		"-hls_segment_filename", filepath.Join(sessionDir, "segment_%03d.ts"),
		masterPlaylist,
	)
	return args
}

// ─── Session launchers ───────────────────────────────────────────────────────

// StartSession starts a full HLS transcode session.
func (t *FfmpegTranscoder) StartSession(ctx context.Context, mediaId, inputFile string) (string, error) {
	return t.startFFmpegSession(ctx, mediaId, inputFile, false, false)
}

// StartDirectStreamSession starts a DirectStream (remux) HLS session.
func (t *FfmpegTranscoder) StartDirectStreamSession(ctx context.Context, mediaId, inputFile string, burnSubs bool) (string, error) {
	return t.startFFmpegSession(ctx, mediaId, inputFile, true, burnSubs)
}

func (t *FfmpegTranscoder) startFFmpegSession(ctx context.Context, mediaId, inputFile string, isRemux, burnSubs bool) (string, error) {
	sessionDir := filepath.Join(t.OutDir, mediaId)
	_ = os.MkdirAll(sessionDir, 0755)

	masterPlaylist := filepath.Join(sessionDir, "master.m3u8")

	if _, err := os.Stat(masterPlaylist); err == nil {
		t.logger.Info().Str("mediaId", mediaId).Msg("streaming: Session already exists, reusing")
		return masterPlaylist, nil
	}

	if !t.sem.Acquire(ctx) {
		return "", fmt.Errorf("transcode semaphore: context cancelled while waiting (mediaId=%s)", mediaId)
	}

	var args []string
	if isRemux {
		args = t.buildRemuxArgs(inputFile, sessionDir, masterPlaylist, burnSubs)
		t.logger.Info().Str("mediaId", mediaId).Msg("streaming: Starting DirectStream (remux) session")
	} else {
		args = t.buildTranscodeArgs(inputFile, sessionDir, masterPlaylist, burnSubs)
		encoder := "libx264"
		if t.hwAccel != nil {
			encoder = t.hwAccel.Encoder
		}
		t.logger.Info().Str("mediaId", mediaId).Str("encoder", encoder).Msg("streaming: Starting Transcode session")
	}

	cmd := exec.CommandContext(ctx, t.FfmpegPath, args...)
	if err := cmd.Start(); err != nil {
		t.sem.Release()
		t.logger.Error().Err(err).Str("mediaId", mediaId).Msg("streaming: Failed to start ffmpeg")
		return "", fmt.Errorf("ffmpeg start failed: %w", err)
	}

	t.logger.Info().Str("mediaId", mediaId).Int("pid", cmd.Process.Pid).Msg("streaming: FFmpeg process started")

	go func() {
		defer t.sem.Release()
		if err := cmd.Wait(); err != nil && ctx.Err() == nil {
			t.logger.Warn().Err(err).Str("mediaId", mediaId).Msg("streaming: FFmpeg exited with error")
		} else {
			t.logger.Info().Str("mediaId", mediaId).Msg("streaming: FFmpeg session completed")
		}
	}()

	// Poll until the playlist file appears (max 5s) instead of sleeping.
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if _, err := os.Stat(masterPlaylist); err == nil {
			return masterPlaylist, nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	// Return the path even if not yet ready — HLS clients handle retries.
	return masterPlaylist, nil
}
