package pretranscode

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/rs/zerolog"
)

// makeSampleVideo renders a short clip with ffmpeg so the integration test drives
// a real encode instead of a fixture. Skips the test when ffmpeg is unavailable.
func makeSampleVideo(t *testing.T, dir string) string {
	t.Helper()

	path := filepath.Join(dir, "sample.mkv")
	cmd := exec.Command("ffmpeg",
		"-y", "-hide_banner", "-loglevel", "error",
		"-f", "lavfi", "-i", "testsrc2=size=320x180:rate=24:duration=8",
		"-f", "lavfi", "-i", "sine=frequency=440:duration=8",
		"-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
		path,
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Skipf("could not render a sample video with ffmpeg: %v: %s", err, out)
	}
	return path
}

// TestPreTranscodeEndToEnd runs the real queue against a real ffmpeg and asserts
// the output is a playable VOD HLS. This is the check the unit tests can't make:
// that the arguments we build actually produce a stream the player can open.
func TestPreTranscodeEndToEnd(t *testing.T) {
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		t.Skip("ffmpeg not installed")
	}

	work := t.TempDir()
	src := makeSampleVideo(t, work)
	outBase := filepath.Join(work, "out")

	logger := zerolog.Nop()
	m := New(Options{
		Logger:      &logger,
		OutputDir:   outBase,
		FfmpegPath:  "ffmpeg",
		FfprobePath: "ffprobe",
	})
	m.Start()
	defer m.Stop()

	job, err := m.Enqueue(src)
	if err != nil {
		t.Fatalf("Enqueue: %v", err)
	}

	final := waitForTerminal(t, m, job.Hash, 90*time.Second)
	if final.Status != StatusCompleted {
		t.Fatalf("job did not complete: status=%q error=%q", final.Status, final.Error)
	}

	// The playback path gates on exactly this.
	if !m.IsAvailable(job.Hash) {
		t.Fatal("IsAvailable is false after a completed job — playback would never use the pre-transcode")
	}

	outDir := m.OutputDirFor(job.Hash)

	// The temp dir must be gone: a leftover .tmp means the rename didn't happen.
	if _, err := os.Stat(outDir + ".tmp"); !os.IsNotExist(err) {
		t.Error("temp dir survived a successful run")
	}

	playlist, err := os.ReadFile(filepath.Join(outDir, "master.m3u8"))
	if err != nil {
		t.Fatalf("reading playlist: %v", err)
	}
	if !containsAll(string(playlist), "#EXTM3U", "#EXT-X-PLAYLIST-TYPE:VOD", "#EXT-X-ENDLIST") {
		t.Errorf("playlist is not a finished VOD playlist:\n%s", playlist)
	}

	segments, err := filepath.Glob(filepath.Join(outDir, "seg*.ts"))
	if err != nil || len(segments) == 0 {
		t.Fatalf("no segments written to %s", outDir)
	}

	// ffprobe each segment: a playlist pointing at unreadable segments is exactly
	// the failure that a file-existence check would miss.
	for _, seg := range segments {
		probe := exec.Command("ffprobe", "-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", seg)
		out, err := probe.CombinedOutput()
		if err != nil {
			t.Fatalf("segment %s is not decodable: %v: %s", filepath.Base(seg), err, out)
		}
		if !containsAll(string(out), "video") {
			t.Errorf("segment %s has no video stream: %s", filepath.Base(seg), out)
		}
	}

	t.Logf("pre-transcoded into %d segments", len(segments))
}

// TestPreTranscodeReportsFailure asserts a bad input fails loudly and leaves no
// half-written playlist behind for the player to trip over.
func TestPreTranscodeReportsFailure(t *testing.T) {
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		t.Skip("ffmpeg not installed")
	}

	work := t.TempDir()
	bogus := filepath.Join(work, "broken.mkv")
	if err := os.WriteFile(bogus, []byte("this is not a video"), 0644); err != nil {
		t.Fatal(err)
	}

	logger := zerolog.Nop()
	m := New(Options{Logger: &logger, OutputDir: filepath.Join(work, "out"), FfmpegPath: "ffmpeg"})
	m.Start()
	defer m.Stop()

	job, err := m.Enqueue(bogus)
	if err != nil {
		t.Fatalf("Enqueue: %v", err)
	}

	final := waitForTerminal(t, m, job.Hash, 30*time.Second)
	if final.Status != StatusFailed {
		t.Fatalf("a non-video input must fail, got status=%q", final.Status)
	}
	if final.Error == "" {
		t.Error("a failed job must carry ffmpeg's reason")
	}
	if m.IsAvailable(job.Hash) {
		t.Error("a failed job must not leave a playlist behind — playback would serve a broken stream")
	}
}

// TestProbeDurationFallback covers the path that made progress silently report
// 0%: with no shared extractor wired in, duration must still come from ffprobe.
func TestProbeDurationFallback(t *testing.T) {
	if _, err := exec.LookPath("ffprobe"); err != nil {
		t.Skip("ffprobe not installed")
	}

	work := t.TempDir()
	src := makeSampleVideo(t, work) // 8 seconds

	logger := zerolog.Nop()
	m := New(Options{
		Logger:      &logger,
		OutputDir:   filepath.Join(work, "out"),
		FfmpegPath:  "ffmpeg",
		FfprobePath: "ffprobe",
		// Extractor deliberately omitted.
	})

	got := m.probeDuration(src)
	if got < 7 || got > 9 {
		t.Errorf("probeDuration() = %v, want ~8s — progress would be stuck at 0%%", got)
	}
}

func waitForTerminal(t *testing.T, m *Manager, hash string, timeout time.Duration) *PreTranscodeJob {
	t.Helper()

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		job, ok := m.Get(hash)
		if ok && (job.Status == StatusCompleted || job.Status == StatusFailed) {
			return job
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatalf("job %s did not finish within %s", hash, timeout)
	return nil
}

func containsAll(s string, subs ...string) bool {
	for _, sub := range subs {
		if !contains(s, sub) {
			return false
		}
	}
	return true
}

func contains(s, sub string) bool {
	return len(sub) == 0 || (len(s) >= len(sub) && indexOfStr(s, sub) >= 0)
}

func indexOfStr(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
