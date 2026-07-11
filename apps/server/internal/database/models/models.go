package models

import (
	"database/sql/driver"
	"errors"
	"strconv"
	"strings"
	"time"
)

type BaseModel struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Token struct {
	BaseModel
	Value string `json:"value"`
}

type Account struct {
	BaseModel
	Username string `gorm:"column:username" json:"username"`
	Token    string `gorm:"column:token" json:"token"`
	Viewer   []byte `gorm:"column:viewer" json:"viewer"`
}

type WatchHistory struct {
	BaseModel
	AccountID     uint    `gorm:"column:account_id;uniqueIndex:idx_media_episode" json:"accountId"`
	MediaID       int     `gorm:"column:media_id;uniqueIndex:idx_media_episode" json:"mediaId"`
	EpisodeNumber int     `gorm:"column:episode_number;uniqueIndex:idx_media_episode" json:"episodeNumber"`
	CurrentTime   float64 `gorm:"column:current_time" json:"currentTime"`
	Duration      float64 `gorm:"column:duration" json:"duration"`
}

type LocalFiles struct {
	BaseModel
	Value []byte `gorm:"column:value" json:"value"`
}

type ShelvedLocalFiles struct {
	BaseModel
	Value []byte `gorm:"column:value" json:"value"`
}

type Settings struct {
	BaseModel
	Library       LibrarySettings      `json:"library" gorm:"embedded;embeddedPrefix:library_"`
	MediaPlayer   MediaPlayerSettings  `json:"mediaPlayer" gorm:"embedded;embeddedPrefix:media_player_"`
	Notifications NotificationSettings `json:"notifications" gorm:"embedded;embeddedPrefix:notifications_"`
	Platform      PlatformSettings     `json:"Platform" gorm:"embedded;embeddedPrefix:platform_"`
	// Separate tables
	Mediastream *MediastreamSettings `json:"mediastream" gorm:"-"`
	Theme       *Theme               `json:"theme" gorm:"-"`
	Updated     bool                 `gorm:"-" json:"updated"`
}

type UserAnime struct {
	ID      int
	MediaID int
	Status  string
}

type LibrarySettings struct {
	SeriesPaths                     LibraryPaths `gorm:"column:series_paths;type:text" json:"seriesPaths"`
	MoviePaths                      LibraryPaths `gorm:"column:movie_paths;type:text" json:"moviePaths"`
	DisableAnimeCardTrailers        bool         `gorm:"column:disable_anime_card_trailers" json:"disableAnimeCardTrailers"`
	OpenWebURLOnStart               bool         `gorm:"column:open_web_url_on_start" json:"openWebURLOnStart"`
	RefreshLibraryOnStart           bool         `gorm:"column:refresh_library_on_start" json:"refreshLibraryOnStart"`
	AutoPlayNextEpisode             bool         `gorm:"column:auto_play_next_episode" json:"autoPlayNextEpisode"`
	EnableWatchContinuity           bool         `gorm:"column:enable_watch_continuity" json:"enableWatchContinuity"`
	ScannerMatchingThreshold        float64      `gorm:"column:scanner_matching_threshold" json:"scannerMatchingThreshold"`
	ScannerMatchingAlgorithm        string       `gorm:"column:scanner_matching_algorithm" json:"scannerMatchingAlgorithm"`
	UseFallbackMetadataProvider     bool         `gorm:"column:use_fallback_metadata_provider" json:"useFallbackMetadataProvider"`
	PrimaryMetadataProvider         string       `gorm:"column:primary_metadata_provider" json:"primaryMetadataProvider"`
	TmdbApiKey                      string       `gorm:"column:tmdb_api_key" json:"tmdbApiKey"`
	TmdbLanguage                    string       `gorm:"column:tmdb_language" json:"tmdbLanguage"`
	ScannerStrictStructure          bool         `gorm:"column:scanner_strict_structure" json:"scannerStrictStructure"`
	ScannerConfig                   string       `gorm:"column:scanner_config" json:"scannerConfig"`
	ScannerProvider                 string       `gorm:"column:scanner_provider" json:"scannerProvider"`
	DisableLocalScanning            bool         `gorm:"column:disable_local_scanning" json:"disableLocalScanning"`
	ScannerUseLegacyMatching        bool         `gorm:"column:scanner_use_legacy_matching" json:"scannerUseLegacyMatching"`
	FanartApiKey                    string       `gorm:"column:fanart_api_key" json:"fanartApiKey"`
	OmdbApiKey                      string       `gorm:"column:omdb_api_key" json:"omdbApiKey"`
	LastScanAt                      time.Time    `gorm:"column:last_scan_at" json:"lastScanAt"`
	AutoScan                        bool         `gorm:"-" json:"autoScan"`
}

func (s *LibrarySettings) GetAllPaths() []string {
	var paths []string
	for _, p := range s.SeriesPaths {
		if p != "" {
			paths = append(paths, p)
		}
	}
	for _, p := range s.MoviePaths {
		if p != "" {
			paths = append(paths, p)
		}
	}
	return paths
}

type LibraryPaths []string

func (o *LibraryPaths) Scan(src interface{}) error {
	if src == nil {
		*o = []string{}
		return nil
	}

	str, ok := src.(string)
	if !ok {
		b, ok := src.([]byte)
		if !ok {
			return errors.New("src value cannot cast to string")
		}
		str = string(b)
	}

	if str == "" {
		*o = []string{}
		return nil
	}

	*o = strings.Split(str, ",")
	return nil
}

func (o LibraryPaths) Value() (driver.Value, error) {
	if len(o) == 0 {
		return nil, nil
	}
	return strings.Join(o, ","), nil
}

type StringSlice []string

func (o *StringSlice) Scan(src interface{}) error {
	if src == nil {
		*o = []string{}
		return nil
	}
	str, ok := src.(string)
	if !ok {
		b, ok := src.([]byte)
		if !ok {
			return errors.New("src value cannot cast to string")
		}
		str = string(b)
	}
	if str == "" {
		*o = []string{}
		return nil
	}
	*o = strings.Split(str, ",")
	return nil
}

func (o StringSlice) Value() (driver.Value, error) {
	if len(o) == 0 {
		return nil, nil
	}
	return strings.Join(o, ","), nil
}

type IntSlice []int

func (o *IntSlice) Scan(src interface{}) error {
	str, ok := src.(string)
	if !ok {
		return errors.New("src value cannot cast to string")
	}
	ids := strings.Split(str, ",")
	*o = make(IntSlice, len(ids))
	for i, id := range ids {
		(*o)[i], _ = strconv.Atoi(id)
	}
	return nil
}

func (o IntSlice) Value() (driver.Value, error) {
	if len(o) == 0 {
		return nil, nil
	}
	strs := make([]string, len(o))
	for i, id := range o {
		strs[i] = strconv.Itoa(id)
	}
	return strings.Join(strs, ","), nil
}

type MediaPlayerSettings struct {
}

type ListSyncSettings struct {
	Automatic bool   `gorm:"column:automatic_sync" json:"automatic"`
	Origin    string `gorm:"column:sync_origin" json:"origin"`
}

type NotificationSettings struct {
	DisableNotifications               bool `gorm:"column:disable_notifications" json:"disableNotifications"`
	DisableAutoScannerNotifications    bool `gorm:"column:disable_auto_scanner_notifications" json:"disableAutoScannerNotifications"`
	DisableAutoDownloaderNotifications bool `gorm:"column:disable_auto_downloader_notifications" json:"disableAutoDownloaderNotifications"`
}

// Notification is a persisted in-app notification (scan completed, transcode
// fallback, system events). Created by the notifier module and surfaced in the
// web client's notification center.
type Notification struct {
	BaseModel
	Type    string `gorm:"column:type" json:"type"` // "scanner" | "mediastream" | "system"
	Title   string `gorm:"column:title" json:"title"`
	Message string `gorm:"column:message" json:"message"`
	Read    bool   `gorm:"column:read" json:"read"`
}

type PlatformSettings struct {
	HideAudienceScore bool `gorm:"column:hide_audience_score" json:"hideAudienceScore"`
	DisableCacheLayer bool `gorm:"column:disable_cache_layer" json:"disableCacheLayer"`
}

type ScanSummary struct {
	BaseModel
	Value []byte `gorm:"column:value" json:"value"`
}

type Theme struct {
	BaseModel
	EnableColorSettings    bool   `gorm:"column:enable_color_settings" json:"enableColorSettings"`
	BackgroundColor        string `gorm:"column:background_color" json:"backgroundColor"`
	AccentColor            string `gorm:"column:accent_color" json:"accentColor"`
	SidebarBackgroundColor string `gorm:"column:sidebar_background_color" json:"sidebarBackgroundColor"`
	ThemeEra               string `gorm:"column:theme_era" json:"themeEra"`
	ThemeMode              string `gorm:"column:theme_mode" json:"themeMode"` // "classic" | "advanced" | "era" | "" (legacy, derivado en el cliente)
	EnableLiquidGlass      bool   `gorm:"column:enable_liquid_glass" json:"themeEnableLiquidGlass"`
	HomeItems              []byte `gorm:"column:home_items" json:"homeItems"`

	// ── Diseño y Comportamiento ──────────────────────────────────────────
	AnimeEntryScreenLayout     string `gorm:"column:anime_entry_screen_layout" json:"themeAnimeEntryScreenLayout"`
	SmallerEpisodeCarouselSize bool   `gorm:"column:smaller_episode_carousel_size" json:"themeSmallerEpisodeCarouselSize"`
	ExpandSidebarOnHover       bool   `gorm:"column:expand_sidebar_on_hover" json:"themeExpandSidebarOnHover"`
	DisableSidebarTransparency bool   `gorm:"column:disable_sidebar_transparency" json:"themeDisableSidebarTransparency"`
	EnableBlurringEffects      bool   `gorm:"column:enable_blurring_effects" json:"themeEnableBlurringEffects"`
	EnableSidebarGradient      bool   `gorm:"column:enable_sidebar_gradient" json:"themeEnableSidebarGradient"`
	DisableCarouselAutoScroll  bool   `gorm:"column:disable_carousel_auto_scroll" json:"themeDisableCarouselAutoScroll"`
	UseLegacyEpisodeCard       bool   `gorm:"column:use_legacy_episode_card" json:"themeUseLegacyEpisodeCard"`

	// ── Pantalla de Biblioteca ───────────────────────────────────────────
	LibraryScreenBannerType              string `gorm:"column:library_screen_banner_type;default:dynamic" json:"themeLibraryScreenBannerType"`
	LibraryScreenCustomBannerImage       string `gorm:"column:library_screen_custom_banner_image" json:"themeLibraryScreenCustomBannerImage"`
	LibraryScreenCustomBannerPosition    string `gorm:"column:library_screen_custom_banner_position;default:50% 50%" json:"themeLibraryScreenCustomBannerPosition"`
	LibraryScreenCustomBannerOpacity     int    `gorm:"column:library_screen_custom_banner_opacity;default:10" json:"themeLibraryScreenCustomBannerOpacity"`
	LibraryScreenCustomBackgroundImage   string `gorm:"column:library_screen_custom_background_image" json:"themeLibraryScreenCustomBackgroundImage"`
	LibraryScreenCustomBackgroundOpacity int    `gorm:"column:library_screen_custom_background_opacity;default:10" json:"themeLibraryScreenCustomBackgroundOpacity"`
	LibraryScreenCustomBackgroundBlur    string `gorm:"column:library_screen_custom_background_blur;default:none" json:"themeLibraryScreenCustomBackgroundBlur"`
	DisableLibraryScreenGenreSelector    bool   `gorm:"column:disable_library_screen_genre_selector" json:"themeDisableLibraryScreenGenreSelector"`

	// ── Página de Detalle ────────────────────────────────────────────────
	MediaPageBannerType               string `gorm:"column:media_page_banner_type;default:default" json:"themeMediaPageBannerType"`
	MediaPageBannerSize               string `gorm:"column:media_page_banner_size;default:default" json:"themeMediaPageBannerSize"`
	MediaPageBannerInfoBoxSize        string `gorm:"column:media_page_banner_info_box_size;default:default" json:"themeMediaPageBannerInfoBoxSize"`
	EnableMediaPageBlurredBackground  bool   `gorm:"column:enable_media_page_blurred_background;default:false" json:"themeEnableMediaPageBlurredBackground"`
	ShowEpisodeCardAnimeInfo          bool   `gorm:"column:show_episode_card_anime_info;default:true" json:"themeShowEpisodeCardAnimeInfo"`
	ShowAnimeUnwatchedCount           bool   `gorm:"column:show_anime_unwatched_count;default:true" json:"themeShowAnimeUnwatchedCount"`
	HideEpisodeCardDescription        bool   `gorm:"column:hide_episode_card_description" json:"themeHideEpisodeCardDescription"`
	HideDownloadedEpisodeCardFilename bool   `gorm:"column:hide_downloaded_episode_card_filename" json:"themeHideDownloadedEpisodeCardFilename"`

	// ── Ordenación y Listas ──────────────────────────────────────────────
	ContinueWatchingDefaultSorting       string `gorm:"column:continue_watching_default_sorting;default:LAST_WATCHED_DESC" json:"themeContinueWatchingDefaultSorting"`
	AnimeLibraryCollectionDefaultSorting string `gorm:"column:anime_library_collection_default_sorting;default:TITLE_ASC" json:"themeAnimeLibraryCollectionDefaultSorting"`

	// ── Avanzado ──────────────────────────────────────────────────────────
	CustomCSS         string      `gorm:"column:custom_css" json:"themeCustomCSS"`
	MobileCustomCSS   string      `gorm:"column:mobile_custom_css" json:"themeMobileCustomCSS"`
	UnpinnedMenuItems StringSlice `gorm:"column:unpinned_menu_items;type:text" json:"themeUnpinnedMenuItems"`
}

type HomeItem struct {
	ID   string `json:"id"`
	Type string `json:"type"`
}

type MediastreamSettings struct {
	BaseModel
	TranscodeEnabled               bool   `gorm:"column:transcode_enabled" json:"transcodeEnabled"`
	FfmpegPath                     string `gorm:"column:ffmpeg_path" json:"ffmpegPath"`
	FfprobePath                    string `gorm:"column:ffprobe_path" json:"ffprobePath"`
	PreTranscodeLibraryDir         string `gorm:"column:pre_transcode_library_dir" json:"preTranscodeLibraryDir"`
	TranscodeHwAccel               string `gorm:"column:transcode_hw_accel" json:"transcodeHwAccel"`
	TranscodePreset                string `gorm:"column:transcode_preset" json:"transcodePreset"`
	TranscodeHwAccelCustomSettings string `gorm:"column:transcode_hw_accel_custom_settings" json:"transcodeHwAccelCustomSettings"`
	PreTranscodeEnabled            bool   `gorm:"column:pre_transcode_enabled" json:"preTranscodeEnabled"`
	TranscodeThreads               int    `gorm:"column:transcode_threads" json:"transcodeThreads"`
	DirectPlayOnly                 bool   `gorm:"column:direct_play_only" json:"directPlayOnly"`
}

type GhostAssociatedMedia struct {
	BaseModel
	Path            string  `gorm:"column:path;index" json:"path"`
	TargetMediaID   int     `json:"targetMediaId"`
	GhostMatchCount int     `json:"ghostMatchCount"`
	AlgorithmScore  float64 `json:"algorithmScore"`
	UserResolved    bool    `json:"userResolved"`
	OriginalTitle   string  `json:"originalTitle"`
	Confidence      float64 `json:"confidence"`
}

type MediaMetadataParent struct {
	BaseModel
	MediaID       int `gorm:"column:media_id;uniqueIndex" json:"mediaId"`
	ParentID      int `json:"parentId"`
	SpecialOffset int `json:"specialOffset"`
}

type OnlinestreamMapping struct {
	BaseModel
	MediaID  int    `gorm:"column:media_id;uniqueIndex:idx_provider_media" json:"mediaId"`
	AnimeID  string `json:"animeId"`
	Provider string `gorm:"column:provider;uniqueIndex:idx_provider_media" json:"provider"`
}

type SilencedMediaEntry struct {
	BaseModel
}

type MediaFiller struct {
	BaseModel
	Data          []byte    `json:"data"`
	MediaID       int       `json:"mediaId"`
	Provider      string    `json:"provider"`
	Slug          string    `json:"slug"`
	LastFetchedAt time.Time `json:"lastFetchedAt"`
}

type UserMediaProgress struct {
	BaseModel
	AnonUserId string  `gorm:"column:anon_user_id;uniqueIndex:idx_anon_media" json:"anonUserId"`
	MediaID    int     `gorm:"column:media_id;uniqueIndex:idx_anon_media" json:"mediaId"`
	Status     string  `gorm:"column:status" json:"status"`
	Progress   int     `gorm:"column:progress" json:"progress"`
	Score      float64 `gorm:"column:score" json:"score"`
}

// MediaCollection groups movies or shows that belong to the same TMDB franchise/saga.
// It is populated automatically when a scanned movie has a non-nil BelongsToCollection
// field in its TMDB metadata.
type MediaCollection struct {
	BaseModel
	// TMDBCollectionID is the TMDB /collection/{id} identifier — the canonical key.
	TMDBCollectionID int    `gorm:"column:tmdb_collection_id;uniqueIndex" json:"tmdbCollectionId"`
	Name             string `gorm:"column:name" json:"name"`
	Overview         string `gorm:"column:overview" json:"overview"`
	PosterPath       string `gorm:"column:poster_path" json:"posterPath"`
	BackdropPath     string `gorm:"column:backdrop_path" json:"backdropPath"`
	// MemberIDs is a comma-separated list of TMDB media IDs belonging to this collection.
	// Stored as plain text for SQLite compatibility; use IntSlice scanner.
	MemberIDs IntSlice `gorm:"column:member_ids;type:text" json:"memberIds"`
}

// MetadataCache stores raw JSON responses from metadata providers (TMDB, AniList, etc.)
// to avoid redundant API calls across different scan sessions.
type MetadataCache struct {
	BaseModel
	Provider  string    `gorm:"column:provider;uniqueIndex:idx_provider_key" json:"provider"`
	Key       string    `gorm:"column:key;uniqueIndex:idx_provider_key" json:"key"`
	Value     []byte    `gorm:"column:value" json:"value"`
	ExpiresAt time.Time `gorm:"column:expires_at" json:"expiresAt"`
}

type EpisodeSkipTime struct {
	BaseModel
	MediaID       int     `gorm:"column:media_id;uniqueIndex:idx_media_skip" json:"mediaId"`
	EpisodeNumber int     `gorm:"column:episode_number;uniqueIndex:idx_media_skip" json:"episodeNumber"`
	OpStart       float64 `gorm:"column:op_start" json:"opStart"`
	OpEnd         float64 `gorm:"column:op_end" json:"opEnd"`
	// EdOffset es el tiempo absoluto (en segundos) de inicio del outro.
	EdOffset      float64 `gorm:"column:ed_offset" json:"edOffset"`
	// EdEnd es el tiempo absoluto (en segundos) de fin del outro. 0 significa hasta el final.
	EdEnd         float64 `gorm:"column:ed_end" json:"edEnd"`
	Source        string  `gorm:"column:source;default:legacy" json:"source"`
	Confidence    float64 `gorm:"column:confidence;default:0" json:"confidence"`
}

// MediaIDMapping centraliza el mapeo de IDs entre plataformas (TMDB, MAL, Jellyfin).
// Permite al frontend comunicarse exclusivamente con TMDB IDs mientras el backend
// traduce internamente a los IDs específicos de Jellyfin u otras fuentes.
type MediaIDMapping struct {
	BaseModel
	InternalID int       `gorm:"column:internal_id;uniqueIndex" json:"internalId"`
	TMDBID     int       `gorm:"column:tmdb_id;index" json:"tmdbId,omitempty"`
	MALID      int       `gorm:"column:mal_id;index" json:"malId,omitempty"`
	JellyfinID string    `gorm:"column:jellyfin_id;index" json:"jellyfinId,omitempty"`
	MediaType  string    `gorm:"column:media_type" json:"mediaType"` // "movie" | "tv"
	Title      string    `gorm:"column:title" json:"title"`
	LastSyncAt time.Time `gorm:"column:last_sync_at" json:"lastSyncAt"`
}
