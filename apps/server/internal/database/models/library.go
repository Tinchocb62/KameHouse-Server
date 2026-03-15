package models

import "time"

// LibraryMedia represents a local TV show, Anime, or Movie.
// It is decoupled from AniList and uses its own primary key.
type LibraryMedia struct {
	BaseModel
	Type   string `gorm:"column:type" json:"type"`     // e.g., "ANIME", "SHOW", "MOVIE"
	Format         string `gorm:"column:format" json:"format"` // e.g., "TV", "TV_SHORT", "MOVIE", "OVA", "SPECIAL"
	Status         string `gorm:"column:status" json:"status"`
	MetadataStatus string `gorm:"column:metadata_status;default:'COMPLETE'" json:"metadataStatus"` // "COMPLETE", "MISSING", "LOCAL"

	// Titles
	TitleOriginal string `gorm:"column:title_original" json:"titleOriginal"`
	TitleRomaji   string `gorm:"column:title_romaji" json:"titleRomaji"`
	TitleEnglish  string `gorm:"column:title_english" json:"titleEnglish"`
	Synonyms      []byte `gorm:"column:synonyms;type:text" json:"synonyms"` // JSON array of strings

	Description string `gorm:"column:description;type:text" json:"description"`
	PosterImage string `gorm:"column:poster_image" json:"posterImage"` // Path or URL
	BannerImage string `gorm:"column:banner_image" json:"bannerImage"` // Path or URL

	TmdbId         int    `gorm:"column:tmdb_id" json:"tmdbId"`

	SeasonNumber int       `gorm:"column:season_number" json:"seasonNumber"`
	StartDate    time.Time `gorm:"column:start_date" json:"startDate"`
	EndDate      time.Time `gorm:"column:end_date" json:"endDate"`
	Year         int       `gorm:"column:year" json:"year"`

	Score  float64 `gorm:"column:score" json:"score"`
	Rating float64 `gorm:"column:rating" json:"rating"`
	IsNsfw bool    `gorm:"column:is_nsfw" json:"isNsfw"`

	Genres        []byte `gorm:"column:genres;type:text" json:"genres"` // JSON array of strings
	Tags          []byte `gorm:"column:tags;type:text" json:"tags"`     // JSON array of objects
	TotalEpisodes int    `gorm:"column:total_episodes" json:"totalEpisodes"`
}

// IsMovieOrSingleEpisode returns true if the media is a movie or a single episode special
func (m *LibraryMedia) IsMovieOrSingleEpisode() bool {
	if m == nil {
		return false
	}
	return m.Format == "MOVIE" || m.Format == "SPECIAL" || m.Format == "MUSIC" || m.Format == "MANGA" || m.Format == "NOVEL" || m.Format == "ONE_SHOT"
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

	Provider   string `gorm:"column:provider;index" json:"provider"` // "tmdb", "anilist", "tvdb"
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
