package streaming

import (
	"strings"

	"kamehouse/internal/mediastream/videofile"
)

// ClientProfile declares what a given client can natively play.
type ClientProfile struct {
	Name            string
	SupportedVideo  []string
	SupportedAudio  []string
	SupportedFormat []string
	// BurnSubtitles, when true, instructs the transcoder to bake subtitle tracks
	// into the video stream instead of passing them as a separate text stream.
	BurnSubtitles bool
}

type PlaybackMethod string

const (
	// DirectPlay — file is served as-is. No FFmpeg involved.
	DirectPlay PlaybackMethod = "DIRECT_PLAY"
	// DirectStream — container remux only (no re-encode).
	DirectStream PlaybackMethod = "DIRECT_STREAM"
	// Transcode — full re-encode to HLS via FFmpeg.
	Transcode PlaybackMethod = "TRANSCODE"
)

// Decision is a pure data struct — decoupled from transport/HTTP layer.
type Decision struct {
	Method            PlaybackMethod
	Reason            string
	// NeedsSubtitleBurn is true when the decision engine detected external subtitle
	// tracks that should be burned in (e.g. ASS/SSA embedded in MKV).
	NeedsSubtitleBurn bool
}

// directStreamContainers are containers that browsers cannot natively play
// but whose streams (H.264+AAC) can be efficiently remuxed to MP4.
var directStreamContainers = map[string]bool{
	"matroska": true,
	"avi":      true,
	"flv":      true,
	"wmv":      true,
}

// transcodeOnlyCodecs require full re-encode — no client natively supports them
// without explicit declaration.
var transcodeOnlyCodecs = map[string]bool{
	"hevc":  true,
	"h265":  true,
	"av1":   true,
	"vp9":   true,
	"mpeg2": true,
}

// remuxFriendlyCodecs can be copied into an MP4 container without re-encoding.
var remuxFriendlyCodecs = map[string]bool{
	"h264":  true,
	"avc":   true,
	"avc1":  true,
	"vp8":   true,
	"av1":   false, // not supported in MP4 widely enough yet
}

// AnalyzePlayback evaluates container and codecs against client capabilities in O(1).
// Technical substitution: Extracts pure Jellyfin domain logic independent of FFmpeg commands.
func AnalyzePlayback(container, videoCodec, audioCodec string, burnSubs bool, profile *ClientProfile) PlaybackMethod {
	if profile == nil {
		return Transcode
	}

	vidOk := videoCodec == "" || len(profile.SupportedVideo) == 0 || hasSupport(profile.SupportedVideo, videoCodec)
	audOk := audioCodec == "" || len(profile.SupportedAudio) == 0 || hasSupport(profile.SupportedAudio, audioCodec)

	if !vidOk || !audOk || burnSubs {
		return Transcode
	}

	if !hasSupport(profile.SupportedFormat, container) {
		return DirectStream
	}

	return DirectPlay
}

// EvaluatePlayback wraps AnalyzePlayback to maintain compatibility with existing tests and Orchestrator.
func EvaluatePlayback(mediaInfo *videofile.MediaInfo, client ClientProfile) Decision {
	if mediaInfo == nil {
		return Decision{Method: Transcode, Reason: "media info unavailable — Transcode fallback"}
	}

	container := ""
	if mediaInfo.Container != nil {
		// Use the first declared format for evaluation (e.g. "matroska" from "matroska,webm")
		formats := strings.Split(*mediaInfo.Container, ",")
		if len(formats) > 0 {
			container = strings.TrimSpace(formats[0])
		}
	}

	videoCodec := ""
	if len(mediaInfo.Videos) > 0 {
		videoCodec = mediaInfo.Videos[0].Codec
	}

	audioCodec := ""
	if len(mediaInfo.Audios) > 0 {
		audioCodec = mediaInfo.Audios[0].Codec
	}

	needsBurnSubs := hasImageSubtitles(mediaInfo)
	method := AnalyzePlayback(container, videoCodec, audioCodec, needsBurnSubs || client.BurnSubtitles, &client)

	reason := "Direct Play eligible"
	if method == Transcode {
		reason = "codec unsupported or burn-in required — Transcode"
	} else if method == DirectStream {
		reason = "container incompatible; codec is remux-safe — DirectStream (remux)"
	}

	return Decision{
		Method:            method,
		Reason:            reason,
		NeedsSubtitleBurn: needsBurnSubs || client.BurnSubtitles,
	}
}

// hasImageSubtitles returns true if any subtitle track uses an image-based
// format (dvd_subtitle, hdmv_pgs_subtitle) that cannot be passed as text.
func hasImageSubtitles(info *videofile.MediaInfo) bool {
	for _, s := range info.Subtitles {
		codec := strings.ToLower(s.Codec)
		if codec == "dvd_subtitle" || codec == "hdmv_pgs_subtitle" || codec == "pgssub" {
			return true
		}
	}
	return false
}

func hasFormat(supported []string, format string) bool {
	for _, s := range supported {
		s = strings.ToLower(s)
		if s == format || (s == "mkv" && format == "matroska") {
			return true
		}
	}
	return false
}

func hasCodec(supported []string, codec string) bool {
	for _, s := range supported {
		s = strings.ToLower(s)
		if s == codec ||
			(s == "h265" && codec == "hevc") ||
			(s == "hevc" && codec == "h265") ||
			(s == "h264" && codec == "avc") ||
			(s == "avc" && codec == "h264") {
			return true
		}
	}
	return false
}

// Evaluate is a backward-compatible alias used by existing tests and handlers.
func Evaluate(mediaInfo *videofile.MediaInfo, client *ClientProfile) Decision {
	if client == nil {
		return Decision{Method: Transcode, Reason: "missing client profile"}
	}
	return EvaluatePlayback(mediaInfo, *client)
}

func hasSupport(supported []string, target string) bool {
	target = strings.ToLower(target)
	for _, s := range supported {
		s = strings.ToLower(s)
		if s == target || 
		   (s == "h265" && target == "hevc") || 
		   (s == "hevc" && target == "h265") || 
		   (s == "mkv" && target == "matroska") ||
		   (s == "h264" && target == "avc") ||
		   (s == "avc" && target == "h264") {
			return true
		}
	}
	return false
}
