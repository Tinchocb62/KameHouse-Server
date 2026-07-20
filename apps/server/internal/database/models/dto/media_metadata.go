package dto

// CharacterRole defines the role of a character within a saga.
type CharacterRole string

const (
	RoleProtagonist CharacterRole = "Protagonist"
	RoleAntagonist  CharacterRole = "Antagonist"
	RoleSupporting  CharacterRole = "Supporting"
	RoleBackground  CharacterRole = "Background"
)

// EpisodeType defines the classification of an episode.
type EpisodeType string

const (
	EpisodeTypeCanon  EpisodeType = "Canon"
	EpisodeTypeFiller EpisodeType = "Filler"
	EpisodeTypeHyped  EpisodeType = "Hyped" // Premium/Climax episodes
)

// CharacterDTO represents a key character within a specific saga.
type CharacterDTO struct {
	Name      string        `json:"name"`
	RoleTag   CharacterRole `json:"roleTag"` // e.g., "Antagonist", "Defensor"
	AvatarURL string        `json:"avatarUrl"`
}

// SubSagaDTO represents a sub-saga or story beat within a saga.
type SubSagaDTO struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	EpisodeRange string `json:"episodeRange"` // e.g., "1-6"
	StartEp      int    `json:"startEp"`
	EndEp        int    `json:"endEp"`
}

// SagaDTO represents a story arc or saga within a series.
type SagaDTO struct {
	ID            string         `json:"id"`
	Name          string         `json:"name"`
	EpisodeRange  string         `json:"episodeRange"` // e.g., "1-39"
	StartEp       int            `json:"startEp"`
	EndEp         int            `json:"endEp"`
	Description   string         `json:"description"`
	IsFiller      bool           `json:"isFiller"` // True if the entire saga is filler (e.g., Garlic Jr.)
	CanonStatus   string         `json:"canonStatus"`
	Antagonists   []string       `json:"antagonists"`
	KeyEvents     []string       `json:"keyEvents"`
	NewCharacters []string       `json:"newCharacters"`
	KeyCharacters []CharacterDTO `json:"keyCharacters"`
	SubSagas      []SubSagaDTO   `json:"subSagas,omitempty"`
}

// AdvancedMediaMetadata holds extended information for premium display.
type AdvancedMediaMetadata struct {
	AudioTracks   []string `json:"audioTracks"`   // e.g. ["Latino Clásico (AC3)", "Japonés (AAC)"]
	Subtitles     []string `json:"subtitles"`     // e.g. ["Español (ASS)", "Inglés (SRT)"]
	ResolutionTag string   `json:"resolutionTag"` // e.g. "1440x1080 (4:3)"
	VideoCodec    string   `json:"videoCodec"`    // e.g. "HEVC x265"
}

// SeriesDetailsDTO acts as an aggregate for the new immersive series view.
// It wraps around the existing NormalizedMedia and adds the advanced metadata.
type SeriesDetailsDTO struct {
	Media           *NormalizedMedia      `json:"media"`
	AdvancedDetails AdvancedMediaMetadata `json:"advancedDetails"`
	Sagas           []SagaDTO             `json:"sagas"`
}

// MovieChronology defines where a movie fits within the timeline.
type MovieChronology struct {
	StartEpisodeContext int    `json:"startEpisodeContext"`
	EndEpisodeContext   int    `json:"endEpisodeContext"`
	ChronologyNotes     string `json:"chronologyNotes"`
}

// MovieAdvancedMetadata holds technical and collection info for a movie.
type MovieAdvancedMetadata struct {
	FileSize      string   `json:"fileSize"`      // e.g. "4.82 GB"
	ResolutionTag string   `json:"resolutionTag"` // e.g. "1920x1080 (16:9)"
	VideoCodec    string   `json:"videoCodec"`    // e.g. "HEVC x265 10-bit"
	Bitrate       string   `json:"bitrate"`       // e.g. "9.4 Mb/s"
	AudioTracks   []string `json:"audioTracks"`   // e.g. ["Español Latino", "Japonés"]
	Subtitles     []string `json:"subtitles"`     // e.g. ["Español Latino", "Inglés"]
	CollectionID  string   `json:"collectionId"`
}

// MovieDetailsDTO wraps the media with technical and chronological data for the immersive movie view.
type MovieDetailsDTO struct {
	Media      *NormalizedMedia      `json:"media"`
	Technical  MovieAdvancedMetadata `json:"technical"`
	Chronology MovieChronology       `json:"chronology"`
}
