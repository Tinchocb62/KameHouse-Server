package ffmpegutil

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// ResolveFFmpegPath resolves the absolute or system path for ffmpeg.
// Priority:
// 1. Valid custom path from settings.
// 2. System PATH (exec.LookPath).
// 3. Application cache directory: {cacheDir}/bin/ffmpeg[.exe].
// 4. Default fallback: "ffmpeg".
func ResolveFFmpegPath(cacheDir, customPath string) string {
	if customPath != "" && customPath != "ffmpeg" {
		if fi, err := os.Stat(customPath); err == nil && !fi.IsDir() {
			return customPath
		}
	}

	if p, err := exec.LookPath("ffmpeg"); err == nil {
		return p
	}

	if cacheDir != "" {
		ext := ""
		if runtime.GOOS == "windows" {
			ext = ".exe"
		}
		cached := filepath.Join(cacheDir, "bin", "ffmpeg"+ext)
		if fi, err := os.Stat(cached); err == nil && !fi.IsDir() {
			return cached
		}
	}

	return "ffmpeg"
}

// ResolveFFprobePath resolves the absolute or system path for ffprobe.
// Priority:
// 1. Valid custom path from settings.
// 2. System PATH (exec.LookPath).
// 3. Application cache directory: {cacheDir}/bin/ffprobe[.exe].
// 4. Default fallback: "ffprobe".
func ResolveFFprobePath(cacheDir, customPath string) string {
	if customPath != "" && customPath != "ffprobe" {
		if fi, err := os.Stat(customPath); err == nil && !fi.IsDir() {
			return customPath
		}
	}

	if p, err := exec.LookPath("ffprobe"); err == nil {
		return p
	}

	if cacheDir != "" {
		ext := ""
		if runtime.GOOS == "windows" {
			ext = ".exe"
		}
		cached := filepath.Join(cacheDir, "bin", "ffprobe"+ext)
		if fi, err := os.Stat(cached); err == nil && !fi.IsDir() {
			return cached
		}
	}

	return "ffprobe"
}

// IsBinaryExecutable checks if the binary exists and can execute `-version`.
func IsBinaryExecutable(binPath string) bool {
	if binPath == "" {
		return false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, binPath, "-version")
	err := cmd.Run()
	return err == nil
}

// GetBinaryVersion returns the first line of `<bin> -version` or empty string if not executable.
func GetBinaryVersion(binPath string) string {
	if binPath == "" {
		return ""
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	out, err := exec.CommandContext(ctx, binPath, "-version").Output()
	if err != nil {
		return ""
	}

	lines := strings.Split(string(out), "\n")
	if len(lines) > 0 {
		return strings.TrimSpace(lines[0])
	}
	return ""
}

// GetStatus returns the current status and resolved paths for FFmpeg and FFprobe.
func GetStatus(cacheDir, customFfmpeg, customFfprobe string) FFmpegStatus {
	resolvedFfmpeg := ResolveFFmpegPath(cacheDir, customFfmpeg)
	resolvedFfprobe := ResolveFFprobePath(cacheDir, customFfprobe)

	ffmpegVer := GetBinaryVersion(resolvedFfmpeg)
	ffprobeVer := GetBinaryVersion(resolvedFfprobe)

	return FFmpegStatus{
		FFmpegAvailable:  ffmpegVer != "",
		FFprobeAvailable: ffprobeVer != "",
		FFmpegPath:       resolvedFfmpeg,
		FFprobePath:      resolvedFfprobe,
		FFmpegVersion:    ffmpegVer,
		FFprobeVersion:   ffprobeVer,
	}
}
