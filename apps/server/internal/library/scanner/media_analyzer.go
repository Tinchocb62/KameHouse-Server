package scanner

import (
	"regexp"
)

// MediaFeatures represents the technical and audio characteristics of a media file.
type MediaFeatures struct {
	AudioDubs      []string `json:"audioDubs"`      // e.g. ["Latino", "Castellano", "Japones", "Dual Audio"]
	Resolution     string   `json:"resolution"`     // e.g. "4K UHD", "1080p FHD", "720p HD", "480p SD"
	VideoCodec     string   `json:"videoCodec"`     // e.g. "HEVC/x265", "AVC/x264", "AV1"
	ColorDepthHDR  string   `json:"colorDepthHdr"`  // e.g. "HDR10", "Dolby Vision", "10-bit"
	Source         string   `json:"source"`         // e.g. "Remux", "BluRay", "WEB-DL", "HDTV"
	SmartBadges    []string `json:"smartBadges"`    // Formatted list for UI display
	AudioPreferred string   `json:"audioPreferred"` // Primary detected audio for user sorting
}

var (
	latinoRegex     = regexp.MustCompile(`(?i)\b(?:latino|lat|es[-_]?la|audio\s*latino|esp[-_]?lat|latam)\b`)
	castellanoRegex = regexp.MustCompile(`(?i)\b(?:castellano|cast|esp|es[-_]?es|spa|spain|audio\s*castellano)\b`)
	japRegex        = regexp.MustCompile(`(?i)\b(?:jap|jpn|japanese|japones|audio\s*japones|raw)\b`)
	englishRegex    = regexp.MustCompile(`(?i)\b(?:eng|english|ingles|audio\s*ingles)\b`)
	dualRegex       = regexp.MustCompile(`(?i)\b(?:dual|dual[-_]?audio|multi|multi[-_]?audio|tri[-_]?audio)\b`)

	uhdRegex  = regexp.MustCompile(`(?i)\b(?:4k|2160p|uhd|ultra\s*hd)\b`)
	fhdRegex  = regexp.MustCompile(`(?i)\b(?:1080p|1080i|fhd|full\s*hd)\b`)
	hdRegex   = regexp.MustCompile(`(?i)\b(?:720p|hd)\b`)
	sdRegex   = regexp.MustCompile(`(?i)\b(?:480p|576p|dvd|sd)\b`)

	hevcRegex = regexp.MustCompile(`(?i)\b(?:hevc|x265|h265|h\.265)\b`)
	avcRegex  = regexp.MustCompile(`(?i)\b(?:avc|x264|h264|h\.264)\b`)
	av1Regex  = regexp.MustCompile(`(?i)\b(?:av1)\b`)

	hdrRegex    = regexp.MustCompile(`(?i)\b(?:hdr|hdr10|hdr10\+|dv|dolby\s*vision)\b`)
	bit10Regex  = regexp.MustCompile(`(?i)\b(?:10bit|10-bit|hi10p)\b`)

	remuxRegex  = regexp.MustCompile(`(?i)\b(?:remux)\b`)
	blurayRegex = regexp.MustCompile(`(?i)\b(?:bluray|bdrip|brrip|bd)\b`)
	webdlRegex  = regexp.MustCompile(`(?i)\b(?:web-dl|webdl|webrip|web)\b`)
)

// AnalyzeMediaFeatures parses a file's name and full path to deduce its audio, video,
// and quality attributes without needing expensive codec decodes upfront.
func AnalyzeMediaFeatures(filename, fullPath string) *MediaFeatures {
	text := filename + " " + fullPath

	features := &MediaFeatures{
		AudioDubs:   make([]string, 0),
		SmartBadges: make([]string, 0),
	}

	// 1. Audio Dubs
	isLatino := latinoRegex.MatchString(text)
	isCastellano := castellanoRegex.MatchString(text)
	isJap := japRegex.MatchString(text)
	isEng := englishRegex.MatchString(text)
	isDual := dualRegex.MatchString(text)

	// Count how many audios are present
	audioCount := 0
	if isLatino {
		audioCount++
		features.AudioDubs = append(features.AudioDubs, "Latino")
	}
	if isCastellano {
		audioCount++
		features.AudioDubs = append(features.AudioDubs, "Castellano")
	}
	if isJap {
		audioCount++
		features.AudioDubs = append(features.AudioDubs, "Japonés")
	}
	if isEng {
		audioCount++
		features.AudioDubs = append(features.AudioDubs, "Inglés")
	}

	if isDual || audioCount >= 2 {
		features.AudioDubs = append(features.AudioDubs, "Dual Audio")
		features.SmartBadges = append(features.SmartBadges, "DUAL AUDIO")
	}

	if isLatino {
		features.SmartBadges = append(features.SmartBadges, "LATINO")
		features.AudioPreferred = "Latino"
	} else if isCastellano {
		features.SmartBadges = append(features.SmartBadges, "CASTELLANO")
		features.AudioPreferred = "Castellano"
	} else if isJap {
		features.SmartBadges = append(features.SmartBadges, "JAPONÉS")
		features.AudioPreferred = "Japones"
	}

	// 2. Resolution
	switch {
	case uhdRegex.MatchString(text):
		features.Resolution = "4K UHD"
		features.SmartBadges = append(features.SmartBadges, "4K UHD")
	case fhdRegex.MatchString(text):
		features.Resolution = "1080p FHD"
		features.SmartBadges = append(features.SmartBadges, "1080p FHD")
	case hdRegex.MatchString(text):
		features.Resolution = "720p HD"
		features.SmartBadges = append(features.SmartBadges, "720p HD")
	case sdRegex.MatchString(text):
		features.Resolution = "480p SD"
	}

	// 3. HDR & Color
	if hdrRegex.MatchString(text) {
		features.ColorDepthHDR = "HDR10"
		features.SmartBadges = append(features.SmartBadges, "HDR")
	} else if bit10Regex.MatchString(text) {
		features.ColorDepthHDR = "10-bit"
		features.SmartBadges = append(features.SmartBadges, "10-BIT")
	}

	// 4. Codec
	switch {
	case av1Regex.MatchString(text):
		features.VideoCodec = "AV1"
		features.SmartBadges = append(features.SmartBadges, "AV1")
	case hevcRegex.MatchString(text):
		features.VideoCodec = "HEVC/x265"
		features.SmartBadges = append(features.SmartBadges, "x265")
	case avcRegex.MatchString(text):
		features.VideoCodec = "AVC/x264"
	}

	// 5. Source
	switch {
	case remuxRegex.MatchString(text):
		features.Source = "Remux"
	case blurayRegex.MatchString(text):
		features.Source = "BluRay"
	case webdlRegex.MatchString(text):
		features.Source = "WEB-DL"
	}

	return features
}
