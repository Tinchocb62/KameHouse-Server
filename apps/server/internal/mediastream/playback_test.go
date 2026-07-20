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

// mkInfoDefault is like mkInfo but marks the audio track at defaultIdx as the default,
// so tests can verify the default-track codec check honors the flag over track order.
func mkInfoDefault(ext string, video *videofile.Video, defaultIdx int, audioCodecs ...string) *videofile.MediaInfo {
	info := &videofile.MediaInfo{Extension: ext, Video: video}
	for i, c := range audioCodecs {
		info.Audios = append(info.Audios, videofile.Audio{Codec: c, IsDefault: i == defaultIdx})
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

		// Audio: the DEFAULT track (first when none is flagged) must be decodable, since
		// direct play cannot switch away from it. AC3/EAC3/DTS are gated by caps.
		{"ac3 with cap", mkInfo("mp4", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "ac3"), &ClientCapabilities{Ac3: true}, true},
		{"ac3 without cap", mkInfo("mp4", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "ac3"), chromium, false},
		// Undecodable default (ac3 first) even with a decodable secondary (aac) must fall
		// back to transcode: the browser plays the default and cannot switch to the aac.
		{"ac3 default plus aac secondary", mkInfo("mp4", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "ac3", "aac"), chromium, false},
		// Decodable default (aac first) with an undecodable secondary (ac3) is fine.
		{"aac default plus ac3 secondary", mkInfo("mp4", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "aac", "ac3"), chromium, true},
		// Explicit default flag wins over track order: aac first but ac3 flagged default → transcode.
		{"ac3 flagged default over aac first", mkInfoDefault("mp4", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, 1, "aac", "ac3"), chromium, false},
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

func TestResolveStreamType(t *testing.T) {
	chromium := &ClientCapabilities{Matroska: true, Vp9: true, Av1: true}

	// Playable by chromium; needs a transcode for a client without Matroska/HEVC.
	playable := mkInfo("mkv", &videofile.Video{Codec: "h264", PixFmt: "yuv420p"}, "aac")
	unplayable := mkInfo("mkv", &videofile.Video{Codec: "hevc", PixFmt: "yuv420p"}, "aac")

	cases := []struct {
		name      string
		requested StreamType
		info      *videofile.MediaInfo
		caps      *ClientCapabilities
		policy    playbackPolicy
		want      StreamType
	}{
		// Direct → Transcode fallback when the client can't decode the file.
		{"direct playable stays direct", StreamTypeDirect, playable, chromium, playbackPolicy{}, StreamTypeDirect},
		{"direct unplayable falls back", StreamTypeDirect, unplayable, chromium, playbackPolicy{}, StreamTypeTranscode},
		// DirectPlayOnly accepts a hard failure over a transcode.
		{"directPlayOnly suppresses fallback", StreamTypeDirect, unplayable, chromium, playbackPolicy{directPlayOnly: true}, StreamTypeDirect},

		// Transcode → Direct upgrade when the client decodes natively.
		{"transcode playable upgrades", StreamTypeTranscode, playable, chromium, playbackPolicy{}, StreamTypeDirect},
		{"transcode unplayable stays", StreamTypeTranscode, unplayable, chromium, playbackPolicy{}, StreamTypeTranscode},
		// The setting under test: keep transcoding even though direct play would work.
		{"disableAutoSwitch suppresses upgrade", StreamTypeTranscode, playable, chromium, playbackPolicy{disableAutoSwitchToDirect: true}, StreamTypeTranscode},
		// nil caps must never trigger the upgrade — this is what keeps an audio-track
		// switch (which deliberately withholds caps) on HLS.
		{"nil caps never upgrades", StreamTypeTranscode, playable, nil, playbackPolicy{}, StreamTypeTranscode},

		// Optimized is resolved elsewhere and must pass through untouched.
		{"optimized untouched", StreamTypeOptimized, playable, chromium, playbackPolicy{}, StreamTypeOptimized},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, _ := resolveStreamType(tc.requested, tc.info, tc.caps, tc.policy)
			if got != tc.want {
				t.Errorf("resolveStreamType(%v) = %v, want %v", tc.requested, got, tc.want)
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
