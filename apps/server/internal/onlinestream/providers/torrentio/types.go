package torrentio

// ─────────────────────────────────────────────────────────────────────────────
// Raw DTOs — mirror the Torrentio JSON response exactly
// ─────────────────────────────────────────────────────────────────────────────

// torrentioStreamHints holds optional metadata that Torrentio attaches to each
// stream entry inside the "behaviorHints" object.
type torrentioStreamHints struct {
	// BingeGroup groups multi-episode packs together (e.g. "SubsPlease|1080p")
	BingeGroup string `json:"bingeGroup"`
	// Filename is the exact filename inside the torrent archive
	Filename string `json:"filename"`
}

// torrentioStream is a single stream object as returned by Torrentio.
// The JSON shape documented at https://torrentio.strem.fun/stream/anime/<id>:<ep>.json
//
// Example Name:  "Torrentio\n1080p"
// Example Title: "SubsPlease - Bleach TYBW Part 3 - 25 (1080p) [AEDD0B07]\n👥 42 ⬇️ 17  💾 1.4 GB"
type torrentioStream struct {
	// Name contains provider label + quality badge separated by a newline
	Name string `json:"name"`
	// Title is a multi-line human-readable description with seeders, size, etc.
	Title string `json:"title"`
	// InfoHash is the SHA-1 hex hash of the torrent info dictionary
	InfoHash string `json:"infoHash"`
	// FileIdx is the zero-based index of the target file inside the torrent
	FileIdx int `json:"fileIdx"`
	// BehaviorHints holds additional client hints from the Stremio addon spec
	BehaviorHints torrentioStreamHints `json:"behaviorHints"`
}

// torrentioResponse is the top-level envelope returned by the Torrentio API.
type torrentioResponse struct {
	Streams []torrentioStream `json:"streams"`
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical output DTO — returned to the frontend
// ─────────────────────────────────────────────────────────────────────────────

// StreamResult is the normalised, frontend-ready representation of a single
// Torrentio stream entry.  Raw Torrentio fields are preserved alongside parsed
// convenience fields so the UI can group/sort without reimplementing parsing.
type StreamResult struct {
	// Name is the raw "name" field from Torrentio (e.g. "Torrentio\n1080p")
	Name string `json:"name"`
	// Title is the full human-readable description from Torrentio
	Title string `json:"title"`
	// InfoHash is the SHA-1 torrent info hash — used to build a magnet URI
	InfoHash string `json:"infoHash"`
	// FileIdx is the file index within the torrent batch (pass to the torrent client)
	FileIdx int `json:"fileIdx"`
	// Quality is the parsed quality label extracted from Name ("1080p", "720p", "480p", "4K", "unknown")
	Quality string `json:"quality"`
	// ReleaseGroup is the release group extracted from the first line of Title
	// (e.g. "SubsPlease", "Erai-raws", "ToonsHub")
	ReleaseGroup string `json:"releaseGroup"`
	// Filename is the exact filename of the target file inside the torrent
	Filename string `json:"filename"`
	// BingeGroup groups streams across episodes for binge-watching continuity.
	BingeGroup string `json:"bingeGroup,omitempty"`
	// MagnetURI is a ready-to-use magnet link constructed from InfoHash and
	// common public trackers
	MagnetURI string `json:"magnetUri"`
	// IsDebrid is true when the stream is served through a debrid provider
	// (Real-Debrid, AllDebrid, Premiumize, etc.) rather than a raw P2P magnet.
	// Detected by scanning the Name/Title for service-specific badge strings.
	IsDebrid bool `json:"isDebrid"`
}
