package streaming

import (
	"testing"

	"kamehouse/internal/mediastream/videofile"
)

// browserProfile is a typical Chrome/Firefox client.
var browserProfile = &ClientProfile{
	Name:            "Chrome Web",
	SupportedVideo:  []string{"h264", "vp8", "vp9"},
	SupportedAudio:  []string{"aac", "mp3", "opus"},
	SupportedFormat: []string{"mp4", "webm", "mov"},
}

// mobileProfile represents an older Android WebView with limited codec support.
var mobileProfile = &ClientProfile{
	Name:            "Old Android",
	SupportedVideo:  []string{"h264"},
	SupportedAudio:  []string{"aac"},
	SupportedFormat: []string{"mp4"},
}

// ─── Table-driven decision tests ─────────────────────────────────────────────

func mkStr(s string) *string { return &s }

func TestEvaluatePlayback(t *testing.T) {
	tests := []struct {
		name     string
		info     *videofile.MediaInfo
		client   *ClientProfile
		wantMethod PlaybackMethod
	}{
		{
			name:       "nil media info → Transcode fallback",
			info:       nil,
			client:     browserProfile,
			wantMethod: Transcode,
		},
		{
			name: "nil client profile → Transcode fallback",
			info: &videofile.MediaInfo{
				Container: mkStr("mp4"),
				Videos:    []videofile.Video{{Codec: "h264"}},
			},
			client:     nil,
			wantMethod: Transcode,
		},
		{
			// DirectPlay: H.264/AAC in MP4 → Chrome
			name: "MP4/H264 → browser → DirectPlay",
			info: &videofile.MediaInfo{
				Container: mkStr("mov,mp4,m4a,3gp,3g2,mj2"),
				Videos:    []videofile.Video{{Codec: "h264"}},
			},
			client:     browserProfile,
			wantMethod: DirectPlay,
		},
		{
			// DirectStream: H.264/AAC wrapped in MKV → Chrome can't play MKV
			name: "MKV/H264 → browser → DirectStream (remux)",
			info: &videofile.MediaInfo{
				Container: mkStr("matroska,webm"),
				Videos:    []videofile.Video{{Codec: "h264"}},
			},
			client:     browserProfile,
			wantMethod: DirectStream,
		},
		{
			// Transcode: HEVC in MKV → old Android (no HEVC support)
			name: "MKV/HEVC → old Android → Transcode",
			info: &videofile.MediaInfo{
				Container: mkStr("matroska,webm"),
				Videos:    []videofile.Video{{Codec: "hevc"}},
			},
			client:     mobileProfile,
			wantMethod: Transcode,
		},
		{
			// Transcode: HEVC in MKV → Chrome (explicit no-HEVC profile)
			name: "MKV/HEVC → browser → Transcode",
			info: &videofile.MediaInfo{
				Container: mkStr("matroska,webm"),
				Videos:    []videofile.Video{{Codec: "hevc"}},
			},
			client: &ClientProfile{
				Name:            "Chrome Web",
				SupportedVideo:  []string{"h264"},
				SupportedAudio:  []string{"aac"},
				SupportedFormat: []string{"mp4", "webm"},
			},
			wantMethod: Transcode,
		},
		{
			// Transcode: AV1 → old Android (cannot play AV1)
			name: "MP4/AV1 → old Android → Transcode",
			info: &videofile.MediaInfo{
				Container: mkStr("mp4"),
				Videos:    []videofile.Video{{Codec: "av1"}},
			},
			client:     mobileProfile,
			wantMethod: Transcode,
		},
		{
			// DirectPlay: H.264 in AVI → client supports AVI
			name: "AVI/H264 → AVI-capable client → DirectPlay",
			info: &videofile.MediaInfo{
				Container: mkStr("avi"),
				Videos:    []videofile.Video{{Codec: "h264"}},
			},
			client: &ClientProfile{
				Name:            "Desktop App",
				SupportedVideo:  []string{"h264", "hevc"},
				SupportedAudio:  []string{"aac", "mp3", "ac3"},
				SupportedFormat: []string{"mp4", "mkv", "avi"},
			},
			wantMethod: DirectPlay,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Evaluate(tt.info, tt.client)
			if got.Method != tt.wantMethod {
				t.Errorf("EvaluatePlayback() = %s, want %s (reason: %s)", got.Method, tt.wantMethod, got.Reason)
			} else {
				t.Logf("✓ %s → %s (reason: %s)", tt.name, got.Method, got.Reason)
			}
		})
	}
}
