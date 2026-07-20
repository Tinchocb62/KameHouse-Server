package pretranscode

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"kamehouse/internal/mediastream/cassette"

	"github.com/rs/zerolog"
)

func testManager(t *testing.T, outDir string) *Manager {
	t.Helper()
	logger := zerolog.Nop()
	return New(Options{
		Logger:     &logger,
		OutputDir:  outDir,
		FfmpegPath: "ffmpeg",
	})
}

func TestBuildFfmpegArgs(t *testing.T) {
	outDir := filepath.Join("cache", "abc123")

	t.Run("decode flags precede -i and encode flags follow it", func(t *testing.T) {
		hw := cassette.HwAccelProfile{
			Name:        "nvenc",
			DecodeFlags: []string{"-hwaccel", "cuda"},
			EncodeFlags: []string{"-c:v", "h264_nvenc"},
		}
		args := buildFfmpegArgs(hw, "in.mkv", outDir)

		iIdx := indexOf(args, "-i")
		if iIdx == -1 {
			t.Fatal("no -i in args")
		}
		if decIdx := indexOf(args, "-hwaccel"); decIdx == -1 || decIdx > iIdx {
			t.Errorf("decode flags must precede -i: -hwaccel at %d, -i at %d", decIdx, iIdx)
		}
		if encIdx := indexOf(args, "h264_nvenc"); encIdx == -1 || encIdx < iIdx {
			t.Errorf("encode flags must follow -i: encoder at %d, -i at %d", encIdx, iIdx)
		}
		if args[iIdx+1] != "in.mkv" {
			t.Errorf("input path must follow -i, got %q", args[iIdx+1])
		}
	})

	t.Run("produces a VOD playlist in the output dir", func(t *testing.T) {
		args := buildFfmpegArgs(cassette.HwAccelProfile{}, "in.mkv", outDir)

		if got := args[len(args)-1]; got != filepath.Join(outDir, "master.m3u8") {
			t.Errorf("last arg must be the playlist path, got %q", got)
		}
		if idx := indexOf(args, "-hls_playlist_type"); idx == -1 || args[idx+1] != "vod" {
			t.Error("a pre-transcode must be a VOD playlist, not a live one")
		}
		if idx := indexOf(args, "-hls_segment_filename"); idx == -1 || !strings.HasPrefix(args[idx+1], outDir) {
			t.Error("segments must be written inside the output dir")
		}
	})

	t.Run("forces keyframes only when the profile needs it", func(t *testing.T) {
		withIDR := buildFfmpegArgs(cassette.HwAccelProfile{ForcedIDR: true}, "in.mkv", outDir)
		if indexOf(withIDR, "-force_key_frames") == -1 {
			t.Error("ForcedIDR profile must force keyframes at segment boundaries")
		}

		withoutIDR := buildFfmpegArgs(cassette.HwAccelProfile{ForcedIDR: false}, "in.mkv", outDir)
		if indexOf(withoutIDR, "-force_key_frames") != -1 {
			t.Error("non-ForcedIDR profile must not force keyframes")
		}
	})
}

func TestIsAvailable(t *testing.T) {
	dir := t.TempDir()
	m := testManager(t, dir)

	if m.IsAvailable("nope") {
		t.Error("a hash with no output dir must not report available")
	}

	// A directory without a playlist is a partial/failed run, not a usable stream.
	if err := os.MkdirAll(m.OutputDirFor("partial"), 0755); err != nil {
		t.Fatal(err)
	}
	if m.IsAvailable("partial") {
		t.Error("an output dir without master.m3u8 must not report available")
	}

	writePlaylist(t, m, "done")
	if !m.IsAvailable("done") {
		t.Error("an output dir with master.m3u8 must report available")
	}
}

func TestEnqueueRequiresFfmpeg(t *testing.T) {
	logger := zerolog.Nop()
	m := New(Options{Logger: &logger, OutputDir: t.TempDir()})

	if _, err := m.Enqueue("whatever.mkv"); err == nil {
		t.Error("enqueueing without a configured ffmpeg must fail rather than queue work that can't run")
	}
}

func TestEnqueueExistingOutputSkipsWork(t *testing.T) {
	dir := t.TempDir()
	m := testManager(t, dir)

	// A real file is needed: Enqueue hashes it via os.Stat.
	src := filepath.Join(dir, "movie.mkv")
	if err := os.WriteFile(src, []byte("x"), 0644); err != nil {
		t.Fatal(err)
	}

	hash := hashOf(t, m, src)
	writePlaylist(t, m, hash)

	job, err := m.Enqueue(src)
	if err != nil {
		t.Fatalf("Enqueue: %v", err)
	}
	if job.Status != StatusCompleted {
		t.Errorf("an already pre-transcoded file must be recorded completed, got %q", job.Status)
	}
	// The queue must stay empty: no worker should redo finished work.
	if len(m.queue) != 0 {
		t.Errorf("expected no queued work, got %d", len(m.queue))
	}
}

func TestEnqueueIsIdempotent(t *testing.T) {
	dir := t.TempDir()
	m := testManager(t, dir)

	src := filepath.Join(dir, "movie.mkv")
	if err := os.WriteFile(src, []byte("x"), 0644); err != nil {
		t.Fatal(err)
	}

	// No workers started, so the job stays queued and we can observe dedupe.
	first, err := m.Enqueue(src)
	if err != nil {
		t.Fatalf("first Enqueue: %v", err)
	}
	second, err := m.Enqueue(src)
	if err != nil {
		t.Fatalf("second Enqueue: %v", err)
	}

	if first.Hash != second.Hash {
		t.Error("the same file must map to the same job")
	}
	if len(m.queue) != 1 {
		t.Errorf("queueing the same file twice must enqueue one job, got %d", len(m.queue))
	}
}

func TestCancelQueuedJob(t *testing.T) {
	dir := t.TempDir()
	m := testManager(t, dir)

	src := filepath.Join(dir, "movie.mkv")
	if err := os.WriteFile(src, []byte("x"), 0644); err != nil {
		t.Fatal(err)
	}

	job, err := m.Enqueue(src)
	if err != nil {
		t.Fatal(err)
	}

	if !m.Cancel(job.Hash) {
		t.Fatal("cancelling a queued job must report success")
	}

	// The worker must skip it rather than start an encode the user cancelled.
	got, ok := m.Get(job.Hash)
	if !ok {
		t.Fatal("job disappeared after cancel")
	}
	if got.Status != StatusFailed || got.Error != "cancelled" {
		t.Errorf("cancelled job = %q/%q, want failed/cancelled", got.Status, got.Error)
	}
}

// TestTrackProgress covers the percentage math against ffmpeg's real -progress
// output shape. Progress silently pinned at 0% is a failure the e2e test is too
// short to catch reliably, so it is asserted deterministically here.
func TestTrackProgress(t *testing.T) {
	// out_time_ms is microseconds despite its name — the bug this guards against.
	const feed = "frame=24\nfps=24\nout_time_ms=30000000\nprogress=continue\n" + // 30s
		"frame=48\nout_time_ms=60000000\nprogress=continue\n" + // 60s
		"out_time_ms=120000000\nprogress=end\n" // 120s

	t.Run("reports percentage of the known duration", func(t *testing.T) {
		m := testManager(t, t.TempDir())
		m.jobs["h"] = &PreTranscodeJob{Hash: "h", Status: StatusRunning}

		m.trackProgress(strings.NewReader(feed), "h", 120)

		if got := m.jobs["h"].Progress; got != 100 {
			t.Errorf("final progress = %v, want 100 (last sample was the full duration)", got)
		}
	})

	t.Run("clamps overshoot to 100", func(t *testing.T) {
		m := testManager(t, t.TempDir())
		m.jobs["h"] = &PreTranscodeJob{Hash: "h", Status: StatusRunning}

		// A duration shorter than the encoded output must not report >100%.
		m.trackProgress(strings.NewReader(feed), "h", 60)

		if got := m.jobs["h"].Progress; got != 100 {
			t.Errorf("progress = %v, want it clamped to 100", got)
		}
	})

	t.Run("stays at zero when the duration is unknown", func(t *testing.T) {
		m := testManager(t, t.TempDir())
		m.jobs["h"] = &PreTranscodeJob{Hash: "h", Status: StatusRunning}

		m.trackProgress(strings.NewReader(feed), "h", 0)

		if got := m.jobs["h"].Progress; got != 0 {
			t.Errorf("progress = %v, want 0 rather than a nonsense number", got)
		}
	})
}

func indexOf(args []string, want string) int {
	for i, a := range args {
		if a == want {
			return i
		}
	}
	return -1
}

func hashOf(t *testing.T, m *Manager, path string) string {
	t.Helper()
	job, err := m.Enqueue(path)
	if err != nil {
		t.Fatal(err)
	}
	hash := job.Hash
	// Reset so the caller starts from a clean slate.
	m.mu.Lock()
	delete(m.jobs, hash)
	m.mu.Unlock()
	<-m.queue
	return hash
}

func writePlaylist(t *testing.T, m *Manager, hash string) {
	t.Helper()
	dir := m.OutputDirFor(hash)
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "master.m3u8"), []byte("#EXTM3U"), 0644); err != nil {
		t.Fatal(err)
	}
}
