package dto

// SourceType is a typed string that identifies the origin of a playable media source.
// Using a named type (rather than plain string) prevents silent failures from magic-string
// mismatches when the frontend parses the JSON badge field.
type SourceType string

const (
	// SourceTypeLocal indicates a file served from the local filesystem.
	SourceTypeLocal SourceType = "local"
	// SourceTypeTorrentio indicates a stream resolved via the Torrentio/Stremio provider.
	SourceTypeTorrentio SourceType = "torrentio"
)

// EpisodeSource is the canonical, transport-agnostic descriptor for a single
// playable source. It is the immutable JSON contract between the backend
// decision engine and frontend player components.
type EpisodeSource struct {
	Type     SourceType `json:"type"`               // "local" | "torrentio"
	URL      string     `json:"url,omitempty"`      // Remote URL or direct-play HTTP path
	Path     string     `json:"path,omitempty"`     // Absolute filesystem path (local sources only)
	Quality  string     `json:"quality"`            // e.g. "1080p", "4K", "unknown"
	Priority int        `json:"priority"`           // PriorityLocal < PriorityDebrid < PriorityTorrent
	Title    string     `json:"title,omitempty"`    // Human-readable label shown in the UI badge
}

// EpisodeSourcesResponse is the top-level DTO returned by the episode sources endpoint.
// PlaySource indicates which source type the player should auto-select.
type EpisodeSourcesResponse struct {
	EpisodeNumber int             `json:"episodeNumber"`
	Title         string          `json:"title,omitempty"`
	Sources       []EpisodeSource `json:"sources"`
	PlaySource    SourceType      `json:"playSource"`
}
