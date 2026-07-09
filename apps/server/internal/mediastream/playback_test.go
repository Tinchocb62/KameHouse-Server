package mediastream

import (
	"testing"

	"kamehouse/internal/mediastream/videofile"
)

func mkInfo(ext string, video *videofile.Video, audioCodecs ...string) *videofile.MediaInfo {
	info := &videofile.MediaInfo{Extension: ext, Video: video}
	for _, c := range audioCodecs {
		info.Audios = append(info.Audios, videofile.Audio{Codec: c})
	}
	return info
}

func TestIsDirectPlayableByClient(t *testing.T) {
	chromium := &ClientCapabilities{Matroska: true, Vp9: true, Av1: true}
	firefox := &ClientCapabilities{Matroska: false, Vp9: true, Av1: true}
	hevcCapable := &ClientCapabilities{Matroska: true, Hevc: true, Hevc10Bit: true, Vp9: true}

	cases := []struct {
		name string
		info *videofile.MediaInfo
		caps *ClientCapabilities
		want bool
	}{
		// Legacy clients (nil caps) keep the previous Chromium assumptions.
		{"legacy mkv h264+aac", mkInfo("mkv", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "aac"), nil, true},
		{"legacy mkv ac3 only", mkInfo("mkv", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "ac3"), nil, false},
		{"legacy avi", mkInfo("avi", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "aac"), nil, false},
		// Hi10P H.264 is not decodable by any browser, even legacy clients.
		{"legacy mkv h264 hi10p", mkInfo("mkv", &videofile.Video{Codec: "h264", PixFmt: "yuv420p10le"}, "aac"), nil, false},

		// Matroska support is client-dependent.
		{"firefox mkv h264+aac", mkInfo("mkv", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "aac"), firefox, false},
		{"chromium mkv h264+aac", mkInfo("mkv", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "aac"), chromium, true},

		// HEVC requires the client to have probed support.
		{"chromium no hevc", mkInfo("mkv", &videofile.Video{Codec: "hevc", PixFmt: "yuv420p"}, "aac"), chromium, false},
		{"hevc capable 8bit", mkInfo("mkv", &videofile.Video{Codec: "hevc", PixFmt: "yuv420p"}, "aac"), hevcCapable, true},
		{"hevc capable main10", mkInfo("mkv", &videofile.Video{Codec: "hevc", PixFmt: "yuv420p10le"}, "aac"), hevcCapable, true},
		{"hevc main10 without 10bit cap", mkInfo("mkv", &videofile.Video{Codec: "hevc", PixFmt: "yuv420p10le"}, "aac"), &ClientCapabilities{Matroska: true, Hevc: true}, false},

		// Audio: at least one decodable track is enough; AC3/EAC3/DTS gated by caps.
		{"ac3 with cap", mkInfo("mp4", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "ac3"), &ClientCapabilities{Ac3: true}, true},
		{"ac3 without cap", mkInfo("mp4", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "ac3"), chromium, false},
		{"ac3 plus aac fallback track", mkInfo("mp4", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "ac3", "aac"), chromium, true},
		{"dts with cap", mkInfo("mp4", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "dts"), &ClientCapabilities{Dts: true}, true},

		// Audio-only files are playable if the container/codecs pass.
		{"audio only mp4", mkInfo("mp4", nil, "aac"), chromium, true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isDirectPlayableByClient(tc.info, tc.caps); got != tc.want {
				t.Errorf("isDirectPlayableByClient() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestClientCapabilitiesFingerprint(t *testing.T) {
	var nilCaps *ClientCapabilities
	if nilCaps.fingerprint() != "legacy" {
		t.Errorf("nil caps fingerprint = %q, want legacy", nilCaps.fingerprint())
	}
	a := &ClientCapabilities{Hevc: true}
	b := &ClientCapabilities{Ac3: true}
	if a.fingerprint() == b.fingerprint() {
		t.Error("different capabilities must produce different fingerprints")
	}
}
