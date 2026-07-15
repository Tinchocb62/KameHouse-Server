package cassette

import "testing"

// TestIsGenuineHwAccelFailure locks in the classification that decides whether an
// ffmpeg exit should disable hardware acceleration and fall back to CPU.
//
// Key invariants:
//  - Only a hardware-specific keyword in stderr (cuda, nvenc, vaapi, …) combined
//    with a failure indicator ("failed" / "error") disables the GPU.
//  - A generic ffmpeg crash that has nothing to do with the GPU must NOT disable
//    hardware acceleration: the cause is file-level (corrupt input, unsupported
//    codec path, etc.) and the GPU is still healthy.
//  - Intentional kills (seek head-switch, teardown, ctx cancel) are never failures.
func TestIsGenuineHwAccelFailure(t *testing.T) {
	tests := []struct {
		name            string
		stderr          string
		ffmpegErrored   bool
		intentionalKill bool
		want            bool
	}{
		{
			name:          "clean exit, no error",
			ffmpegErrored: false,
			want:          false,
		},
		{
			name:            "intentional kill on seek/head switch is NOT a hwaccel failure",
			ffmpegErrored:   true,
			intentionalKill: true,
			want:            false,
		},
		{
			name:            "intentional teardown with benign stderr is NOT a hwaccel failure",
			stderr:          "Exiting normally, received signal 15.",
			ffmpegErrored:   true,
			intentionalKill: true,
			want:            false,
		},
		{
			name:          "genuine hwaccel error signature in stderr IS a failure",
			stderr:        "[h264_nvenc @ 0000] OpenEncodeSessionEx failed: out of memory (10): (no capable devices found)",
			ffmpegErrored: true,
			want:          true,
		},
		{
			// An intentional kill (seek/teardown/ctx cancel) is NEVER treated as a
			// hwaccel failure, even when the dying CUDA/NVENC ffmpeg flushes error-like
			// noise to stderr. This is the false-positive that spuriously disabled a
			// healthy GPU on the first seek.
			name:            "intentional kill wins over hwaccel error signature",
			stderr:          "Failed to create CUDA device: device creation failed",
			ffmpegErrored:   true,
			intentionalKill: true,
			want:            false,
		},
		{
			// A generic crash (corrupt file, unsupported codec, OOM unrelated to GPU)
			// must NOT disable hardware acceleration. The GPU is still healthy; the
			// error is at the file/codec level and will surface properly to the client.
			name:          "generic ffmpeg crash without hwaccel stderr is NOT a hwaccel failure",
			stderr:        "some unexpected ffmpeg crash",
			ffmpegErrored: true,
			want:          false,
		},
		{
			name:          "stderr with 'error' but no hwaccel keyword is NOT a hwaccel failure",
			stderr:        "Error reading input: Invalid data found when processing input",
			ffmpegErrored: true,
			want:          false,
		},
		{
			name:          "stderr mentioning cuda without error/failed is NOT a hwaccel failure",
			stderr:        "Using CUDA device 0: NVIDIA GeForce RTX 4090",
			ffmpegErrored: false,
			want:          false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Mirror the decision made in reapProcess: an intentional kill is never a
			// hwaccel failure; otherwise a hardware error signature in stderr is.
			got := !tt.intentionalKill && DetectHwAccelFailure(tt.stderr)
			if got != tt.want {
				t.Errorf("hwaccel-failure decision(%q, errored=%v, intentional=%v) = %v, want %v",
					tt.stderr, tt.ffmpegErrored, tt.intentionalKill, got, tt.want)
			}
		})
	}
}
