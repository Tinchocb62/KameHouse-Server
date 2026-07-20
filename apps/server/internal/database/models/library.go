package models

import (
	"encoding/json"
	"kamehouse/internal/platforms/platform"
	"time"

	"gorm.io/gorm"
)

// LibraryMedia represents a local TV show, Anime, or Movie.
// It is decoupled from third-party platforms and uses its own primary key.
type LibraryMedia struct {
	BaseModel
	Type           string `gorm:"column:type;uniqueIndex:idx_tmdb_id_type" json:"type"` // e.g., "ANIME", "SHOW", "MOVIE"
	Format         string `gorm:"column:format" json:"format"`                          // e.g., "TV", "TV_SHORT", "MOVIE", "OVA", "SPECIAL"
	Status         string `gorm:"column:status" json:"status"`
	MetadataStatus string `gorm:"column:metadata_status;default:'COMPLETE'" json:"metadataStatus"` // "COMPLETE", "MISSING", "LOCAL"

	// Titles
	TitleOriginal string          `gorm:"column:title_original" json:"titleOriginal"`
	TitleRomaji   string          `gorm:"column:title_romaji" json:"titleRomaji"`
	TitleEnglish  string          `gorm:"column:title_english" json:"titleEnglish"`
	TitleSpanish  string          `gorm:"column:title_spanish" json:"titleSpanish"`
	Synonyms      json.RawMessage `gorm:"column:synonyms;type:text" json:"synonyms"` // JSON array of strings

	Description string `gorm:"column:description;type:text" json:"description"`
	PosterImage string `gorm:"column:poster_image" json:"posterImage"` // Path or URL
	BannerImage string `gorm:"column:banner_image" json:"bannerImage"` // Path or URL

	TmdbID        int `gorm:"column:tmdb_id;uniqueIndex:idx_tmdb_id_type" json:"tmdbId"`
	AnidbId       int `gorm:"column:anidb_id" json:"anidbId"`
	MyanimelistId int `gorm:"column:myanimelist_id" json:"myanimelistId"`

	SeasonNumber int       `gorm:"column:season_number" json:"seasonNumber"`
	StartDate    time.Time `gorm:"column:start_date" json:"startDate"`
	EndDate      time.Time `gorm:"column:end_date" json:"endDate"`
	Year         int       `gorm:"column:year" json:"year"`

	Score  float64 `gorm:"column:score" json:"score"`
	Rating float64 `gorm:"column:rating" json:"rating"`
	IsNsfw bool    `gorm:"column:is_nsfw" json:"isNsfw"`

	Genres            json.RawMessage `gorm:"column:genres;type:text" json:"genres"` // JSON array of strings
	Tags              json.RawMessage `gorm:"column:tags;type:text" json:"tags"`     // JSON array of strings or objects
	DominantVibe      string          `gorm:"column:dominant_vibe" json:"dominantVibe"`
	SuggestedSwimlane string          `gorm:"column:suggested_swimlane;index" json:"suggestedSwimlane"`
	TotalEpisodes     int             `gorm:"column:total_episodes" json:"totalEpisodes"`
	Runtime           int             `gorm:"column:runtime" json:"runtime"`

	AudioTracks    json.RawMessage `gorm:"column:audio_tracks;type:text" json:"audioTracks"`       // JSON array of strings
	SubtitleTracks json.RawMessage `gorm:"column:subtitle_tracks;type:text" json:"subtitleTracks"` // JSON array of strings

	// FanArt.tv enrichment
	LogoImage     string `gorm:"column:logo_image" json:"logoImage"`
	ThumbImage    string `gorm:"column:thumb_image" json:"thumbImage"`
	ClearArtImage string `gorm:"column:clear_art_image" json:"clearArtImage"`

	// Frontend compatibility fields (ignored by GORM)
	IDMal      int                              `gorm:"-" json:"idMal,omitempty"`
	Relations  []*platform.UnifiedMediaRelation `gorm:"-" json:"relations,omitempty"`
	Characters *LibraryMediaCharacterConnection `gorm:"-" json:"characters,omitempty"`
	Watched    bool                             `gorm:"-" json:"watched,omitempty"`
}

type LibraryMediaCharacterConnection struct {
	Edges []*LibraryMediaCharacterEdge `json:"edges"`
}
type LibraryMediaCharacterEdge struct {
	Role string                 `json:"role"`
	Node *LibraryMediaCharacter `json:"node"`
}
type LibraryMediaCharacter struct {
	Name  *LibraryMediaCharacterName  `json:"name"`
	Image *LibraryMediaCharacterImage `json:"image"`
}
type LibraryMediaCharacterName struct {
	Full string `json:"full"`
}
type LibraryMediaCharacterImage struct {
	Large string `json:"large"`
}

// AfterFind GORM hook to populate compatibility fields automatically
func (m *LibraryMedia) AfterFind(tx *gorm.DB) (err error) {
	m.IDMal = m.MyanimelistId
	return nil
}

// IsMovieOrSingleEpisode returns true if the media is a movie or a single episode special
func (m *LibraryMedia) IsMovieOrSingleEpisode() bool {
	if m == nil {
		return false
	}
	return m.Format == "MOVIE" || m.Format == "SPECIAL" || m.Format == "MUSIC"
}

func (m *LibraryMedia) GetID() int {
	if m == nil {
		return 0
	}
	return int(m.ID)
}

func (m *LibraryMedia) GetPreferredTitle() string {
	if m == nil {
		return ""
	}
	if m.TitleEnglish != "" {
		return m.TitleEnglish
	}
	if m.TitleRomaji != "" {
		return m.TitleRomaji
	}
	return m.TitleOriginal
}

func (m *LibraryMedia) GetCoverImageSafe() string {
	if m == nil {
		return ""
	}
	return m.PosterImage
}

func (m *LibraryMedia) IsMovie() bool {
	if m == nil {
		return false
	}
	return m.Format == "MOVIE"
}

func (m *LibraryMedia) GetCurrentEpisodeCountOrNil() *int {
	if m == nil || m.TotalEpisodes == 0 {
		return nil
	}
	return &m.TotalEpisodes
}

func (m *LibraryMedia) GetCurrentEpisodeCount() int {
	if m == nil {
		return 0
	}
	return m.TotalEpisodes
}

func (m *LibraryMedia) GetTotalEpisodeCount() int {
	if m == nil {
		return 0
	}
	return m.TotalEpisodes
}

func (m *LibraryMedia) Episodes() *int {
	if m == nil || m.TotalEpisodes == 0 {
		return nil
	}
	return &m.TotalEpisodes
}

// LibraryEpisode represents a single episode of a LibraryMedia.
type LibraryEpisode struct {
	BaseModel
	LibraryMediaID uint          `gorm:"column:library_media_id;uniqueIndex:idx_media_season_episode" json:"libraryMediaId"`
	LibraryMedia   *LibraryMedia `gorm:"foreignKey:LibraryMediaID" json:"-"`

	EpisodeNumber  int `gorm:"column:episode_number;uniqueIndex:idx_media_season_episode" json:"episodeNumber"`
	AbsoluteNumber int `gorm:"column:absolute_number" json:"absoluteNumber"`
	SeasonNumber   int `gorm:"column:season_number;uniqueIndex:idx_media_season_episode" json:"seasonNumber"`

	Type        string `gorm:"column:type" json:"type"` // "REGULAR", "SPECIAL"
	Title       string `gorm:"column:title" json:"title"`
	Description string `gorm:"column:description;type:text" json:"description"`
	Image       string `gorm:"column:image" json:"image"` // Thumbnail path/URL

	AirDate        time.Time `gorm:"column:air_date" json:"airDate"`
	RuntimeMinutes int       `gorm:"column:runtime_minutes" json:"runtimeMinutes"`

	// Saga/Story Arc association
	SagaName string `gorm:"column:saga_name" json:"sagaName"`
	SagaId   string `gorm:"column:saga_id" json:"sagaId"`

	Tags              json.RawMessage `gorm:"column:tags;type:text" json:"tags"`
	DominantVibe      string          `gorm:"column:dominant_vibe" json:"dominantVibe"`
	SuggestedSwimlane string          `gorm:"column:suggested_swimlane;index" json:"suggestedSwimlane"`

	AudioTracks    json.RawMessage `gorm:"column:audio_tracks;type:text" json:"audioTracks"`       // JSON array of strings
	SubtitleTracks json.RawMessage `gorm:"column:subtitle_tracks;type:text" json:"subtitleTracks"` // JSON array of strings
}

// LibrarySeason represents a season (or saga) of a LibraryMedia.
type LibrarySeason struct {
	BaseModel
	LibraryMediaID uint          `gorm:"column:library_media_id;uniqueIndex:idx_media_season" json:"libraryMediaId"`
	LibraryMedia   *LibraryMedia `gorm:"foreignKey:LibraryMediaID" json:"-"`

	SeasonNumber int    `gorm:"column:season_number;uniqueIndex:idx_media_season" json:"seasonNumber"`
	Title        string `gorm:"column:title" json:"title"`
	Description  string `gorm:"column:description;type:text" json:"description"`
	Image        string `gorm:"column:image" json:"image"` // Thumbnail path/URL
}

// ProviderMapping associates a LibraryMedia with external database IDs.
type ProviderMapping struct {
	BaseModel
	LibraryMediaID uint          `gorm:"column:library_media_id;index" json:"libraryMediaId"`
	LibraryMedia   *LibraryMedia `gorm:"foreignKey:LibraryMediaID" json:"-"`

	Provider   string `gorm:"column:provider;index" json:"provider"` // "tmdb", "platform", "tvdb"
	ExternalID string `gorm:"column:external_id;index" json:"externalId"`
}

// MediaEntryListData stores the user's progress and watch status for a specific LibraryMedia
type MediaEntryListData struct {
	BaseModel
	LibraryMediaID uint          `gorm:"column:library_media_id;uniqueIndex" json:"libraryMediaId"`
	LibraryMedia   *LibraryMedia `gorm:"foreignKey:LibraryMediaID" json:"-"`

	Status      string  `gorm:"column:status" json:"status"` // "CURRENT", "COMPLETED", "PAUSED", "DROPPED", "PLANNING", "REPEATING"
	Progress    int     `gorm:"column:progress" json:"progress"`
	Score       float64 `gorm:"column:score" json:"score"`
	Repeat      int     `gorm:"column:repeat" json:"repeat"`
	StartedAt   string  `gorm:"column:started_at" json:"startedAt"`     // ISO date or similar
	CompletedAt string  `gorm:"column:completed_at" json:"completedAt"` // ISO date or similar
}
