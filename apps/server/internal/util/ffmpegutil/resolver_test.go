package ffmpegutil

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestResolveFFmpegPath(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "ffmpegutil-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	binDir := filepath.Join(tempDir, "bin")
	_ = os.MkdirAll(binDir, 0755)

	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}

	fakeFfmpeg := filepath.Join(binDir, "ffmpeg"+ext)
	_ = os.WriteFile(fakeFfmpeg, []byte("fake binary"), 0755)

	resolved := ResolveFFmpegPath(tempDir, "")
	if resolved != fakeFfmpeg {
		t.Errorf("expected cached path %s, got %s", fakeFfmpeg, resolved)
	}

	// Custom path override
	customPath := filepath.Join(tempDir, "custom_ffmpeg"+ext)
	_ = os.WriteFile(customPath, []byte("custom fake binary"), 0755)

	resolvedCustom := ResolveFFmpegPath(tempDir, customPath)
	if resolvedCustom != customPath {
		t.Errorf("expected custom path %s, got %s", customPath, resolvedCustom)
	}
}

func TestResolveFFprobePath(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "ffprobeutil-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	binDir := filepath.Join(tempDir, "bin")
	_ = os.MkdirAll(binDir, 0755)

	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}

	fakeFfprobe := filepath.Join(binDir, "ffprobe"+ext)
	_ = os.WriteFile(fakeFfprobe, []byte("fake binary"), 0755)

	resolved := ResolveFFprobePath(tempDir, "")
	if resolved != fakeFfprobe {
		t.Errorf("expected cached path %s, got %s", fakeFfprobe, resolved)
	}
}
