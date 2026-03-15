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
	Library        *LibrarySettings        `gorm:"embedded" json:"library"`
	MediaPlayer    *MediaPlayerSettings    `gorm:"embedded" json:"mediaPlayer"`
	Torrent        *TorrentSettings        `gorm:"embedded" json:"torrent"`
	Manga          *MangaSettings          `gorm:"embedded" json:"manga"`
	Anilist        *AnilistSettings        `gorm:"embedded" json:"anilist"`
	ListSync       *ListSyncSettings       `gorm:"embedded" json:"listSync"`
	AutoDownloader *AutoDownloaderSettings `gorm:"embedded" json:"autoDownloader"`
	Discord        *DiscordSettings        `gorm:"embedded" json:"discord"`
	Notifications  *NotificationSettings   `gorm:"embedded" json:"notifications"`
	Nakama         *NakamaSettings         `gorm:"embedded;embeddedPrefix:nakama_" json:"nakama"`
	Mediastream    *MediastreamSettings    `gorm:"-" json:"mediastream"`
	Torrentstream  *TorrentstreamSettings  `gorm:"-" json:"torrentstream"`
	Debrid         *DebridSettings         `gorm:"-" json:"debrid"`
	Theme          *Theme                  `gorm:"-" json:"theme"`
	Updated        bool                    `gorm:"-" json:"updated"`
}

type UserAnime struct {
	ID      int
	MediaID int
	Status  string
}

type TorrentstreamSettings struct {
	BaseModel
	Enabled             bool   `gorm:"column:enabled" json:"enabled"`
	AutoSelect          bool   `gorm:"auto_select" json:"autoSelect"`
	PreferredResolution string `gorm:"preferred_resolution" json:"preferredResolution"`
	DisableIPV6         bool   `gorm:"disable_ipv6" json:"disableIPV6"`
	DownloadDir         string `gorm:"download_dir" json:"downloadDir"`
	AddToLibrary        bool   `gorm:"add_to_library" json:"addToLibrary"`
	TorrentClientHost   string `gorm:"torrent_client_host" json:"torrentClientHost"`
	TorrentClientPort   int    `gorm:"torrent_client_port" json:"torrentClientPort"`
	StreamingServerHost string `gorm:"streaming_server_host" json:"streamingServerHost"`
	StreamingServerPort int    `gorm:"streaming_server_port" json:"streamingServerPort"`
	IncludeInLibrary    bool   `gorm:"include_in_library" json:"includeInLibrary"`
	StreamUrlAddress    string `gorm:"stream_url_address" json:"streamUrlAddress"`
	SlowSeeding         bool   `gorm:"slow_seeding" json:"slowSeeding"`
	PreloadNextStream   bool   `gorm:"preload_next_stream" json:"preloadNextStream"`
}

type AnilistSettings struct {
	HideAudienceScore bool `gorm:"column:hide_audience_score" json:"hideAudienceScore"`
	DisableCacheLayer bool `gorm:"column:disable_cache_layer" json:"disableCacheLayer"`
}

type LibrarySettings struct {
	LibraryPath                     string       `gorm:"column:library_path" json:"libraryPath"`
	AutoUpdateProgress              bool         `gorm:"column:auto_update_progress" json:"autoUpdateProgress"`
	TorrentProvider                 string       `gorm:"column:torrent_provider" json:"torrentProvider"`
	AutoSelectTorrentProvider       string       `gorm:"column:auto_select_torrent_provider" json:"autoSelectTorrentProvider"`
	AutoScan                        bool         `gorm:"column:auto_scan" json:"autoScan"`
	EnableOnlinestream              bool         `gorm:"column:enable_onlinestream" json:"enableOnlinestream"`
	IncludeOnlineStreamingInLibrary bool         `gorm:"column:include_online_streaming_in_library" json:"includeOnlineStreamingInLibrary"`
	DisableAnimeCardTrailers        bool         `gorm:"column:disable_anime_card_trailers" json:"disableAnimeCardTrailers"`
	EnableManga                     bool         `gorm:"column:enable_manga" json:"enableManga"`
	DOHProvider                     string       `gorm:"column:doh_provider" json:"dohProvider"`
	OpenTorrentClientOnStart        bool         `gorm:"column:open_torrent_client_on_start" json:"openTorrentClientOnStart"`
	OpenWebURLOnStart               bool         `gorm:"column:open_web_url_on_start" json:"openWebURLOnStart"`
	RefreshLibraryOnStart           bool         `gorm:"column:refresh_library_on_start" json:"refreshLibraryOnStart"`
	AutoPlayNextEpisode             bool         `gorm:"column:auto_play_next_episode" json:"autoPlayNextEpisode"`
	EnableWatchContinuity           bool         `gorm:"column:enable_watch_continuity" json:"enableWatchContinuity"`
	LibraryPaths                    LibraryPaths `gorm:"column:library_paths;type:text" json:"libraryPaths"`
	AutoSyncOfflineLocalData        bool         `gorm:"column:auto_sync_offline_local_data" json:"autoSyncOfflineLocalData"`
	ScannerMatchingThreshold        float64      `gorm:"column:scanner_matching_threshold" json:"scannerMatchingThreshold"`
	ScannerMatchingAlgorithm        string       `gorm:"column:scanner_matching_algorithm" json:"scannerMatchingAlgorithm"`
	AutoSyncToLocalAccount          bool         `gorm:"column:auto_sync_to_local_account" json:"autoSyncToLocalAccount"`
	AutoSaveCurrentMediaOffline     bool         `gorm:"column:auto_save_current_media_offline" json:"autoSaveCurrentMediaOffline"`
	UseFallbackMetadataProvider     bool         `gorm:"column:use_fallback_metadata_provider" json:"useFallbackMetadataProvider"`
	PrimaryMetadataProvider         string       `gorm:"column:primary_metadata_provider" json:"primaryMetadataProvider"`
	TmdbApiKey                      string       `gorm:"column:tmdb_api_key" json:"tmdbApiKey"`
	TmdbLanguage                    string       `gorm:"column:tmdb_language" json:"tmdbLanguage"`
	ScannerStrictStructure          bool         `gorm:"column:scanner_strict_structure" json:"scannerStrictStructure"`
	ScannerConfig                   string       `gorm:"column:scanner_config" json:"scannerConfig"`
	ScannerProvider                 string       `gorm:"column:scanner_provider" json:"scannerProvider"`
	DisableLocalScanning            bool         `gorm:"column:disable_local_scanning" json:"disableLocalScanning"`
	DisableTorrentStreaming         bool         `gorm:"column:disable_torrent_streaming" json:"disableTorrentStreaming"`
	DisableDebridService            bool         `gorm:"column:disable_debrid_service" json:"disableDebridService"`
	DisableTorrentProvider          bool         `gorm:"column:disable_torrent_provider" json:"disableTorrentProvider"`
	ScannerUseLegacyMatching        bool         `gorm:"column:scanner_use_legacy_matching" json:"scannerUseLegacyMatching"`
}

func (s *LibrarySettings) GetLibraryPaths() []string {
	return s.LibraryPaths
}

type LibraryPaths []string

func (o *LibraryPaths) Scan(src interface{}) error {
	str, ok := src.(string)
	if !ok {
		return errors.New("src value cannot cast to string")
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

type NakamaSettings struct {
	Enabled                    bool     `gorm:"column:enabled" json:"enabled"`
	Username                   string   `gorm:"column:username" json:"username"`
	IsHost                     bool     `gorm:"column:is_host" json:"isHost"`
	HostPassword               string   `gorm:"column:host_password" json:"hostPassword"`
	RemoteServerURL            string   `gorm:"column:remote_server_url" json:"remoteServerURL"`
	RemoteServerPassword       string   `gorm:"column:remote_server_password" json:"remoteServerPassword"`
	IncludeNakamaAnimeLibrary  bool     `gorm:"column:include_nakama_anime_library" json:"includeNakamaAnimeLibrary"`
	HostShareLocalAnimeLibrary bool     `gorm:"column:host_share_local_anime_library" json:"hostShareLocalAnimeLibrary"`
	HostUnsharedAnimeIds       IntSlice `gorm:"column:host_unshared_anime_ids;type:text" json:"hostUnsharedAnimeIds"`
	HostEnablePortForwarding   bool     `gorm:"column:host_enable_port_forwarding" json:"hostEnablePortForwarding"`
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

type MangaSettings struct {
	DefaultProvider      string `gorm:"column:default_manga_provider" json:"defaultMangaProvider"`
	AutoUpdateProgress   bool   `gorm:"column:manga_auto_update_progress" json:"mangaAutoUpdateProgress"`
	LocalSourceDirectory string `gorm:"column:manga_local_source_directory" json:"mangaLocalSourceDirectory"`
}

type MediaPlayerSettings struct {
	Default                       string `gorm:"column:default_player" json:"defaultPlayer"`
	Host                          string `gorm:"column:player_host" json:"host"`
	VlcUsername                   string `gorm:"column:vlc_username" json:"vlcUsername"`
	VlcPassword                   string `gorm:"column:vlc_password" json:"vlcPassword"`
	VlcPort                       int    `gorm:"column:vlc_port" json:"vlcPort"`
	VlcPath                       string `gorm:"column:vlc_path" json:"vlcPath"`
	MpcPort                       int    `gorm:"column:mpc_port" json:"mpcPort"`
	MpcPath                       string `gorm:"column:mpc_path" json:"mpcPath"`
	MpvSocket                     string `gorm:"column:mpv_socket" json:"mpvSocket"`
	MpvPath                     string `gorm:"column:mpv_path" json:"mpvPath"`
	MpvArgs                       string `gorm:"column:mpv_args" json:"mpvArgs"`
	IinaSocket                    string `gorm:"column:iina_socket" json:"iinaSocket"`
	IinaPath                      string `gorm:"column:iina_path" json:"iinaPath"`
	IinaArgs                      string `gorm:"column:iina_args" json:"iinaArgs"`
	VcTranslate                   bool `gorm:"column:vc_translate" json:"vcTranslate"`
	VcTranslateProvider           string `gorm:"column:vc_translate_provider" json:"vcTranslateProvider"`
	VcTranslateApiKey              string `gorm:"column:vc_translate_api_key" json:"vcTranslateApiKey"`
	VcTranslateTargetLanguage     string `gorm:"column:vc_translate_target_language" json:"vcTranslateTargetLanguage"`
}

type TorrentSettings struct {
	Default              string `gorm:"column:default_torrent_client" json:"defaultTorrentClient"`
	QBittorrentPath      string `gorm:"column:qbittorrent_path" json:"qbittorrentPath"`
	QBittorrentHost      string `gorm:"column:qbittorrent_host" json:"qbittorrentHost"`
	QBittorrentPort      int    `gorm:"column:qbittorrent_port" json:"qbittorrentPort"`
	QBittorrentUsername  string `gorm:"column:qbittorrent_username" json:"qbittorrentUsername"`
	QBittorrentPassword  string `gorm:"column:qbittorrent_password" json:"qbittorrentPassword"`
	TransmissionPath     string `gorm:"column:transmission_path" json:"transmissionPath"`
	TransmissionHost     string `gorm:"column:transmission_host" json:"transmissionHost"`
	TransmissionPort     int    `gorm:"column:transmission_port" json:"transmissionPort"`
	TransmissionUsername string `gorm:"column:transmission_username" json:"transmissionUsername"`
	TransmissionPassword string `gorm:"column:transmission_password" json:"transmissionPassword"`
	QBittorrentTags      string `gorm:"column:qbittorrent_tags" json:"qbittorrentTags"`
	QBittorrentCategory  string `gorm:"column:qbittorrent_category" json:"qbittorrentCategory"`
	ShowActiveTorrentCount bool   `gorm:"column:show_active_torrent_count" json:"showActiveTorrentCount"`
}

type ListSyncSettings struct {
	Automatic bool   `gorm:"column:automatic_sync" json:"automatic"`
	Origin    string `gorm:"column:sync_origin" json:"origin"`
}

type DiscordSettings struct {
	EnableRichPresence      bool `gorm:"column:enable_rich_presence" json:"enableRichPresence"`
	EnableAnimeRichPresence bool `gorm:"column:enable_anime_rich_presence" json:"enableAnimeRichPresence"`
	EnableMangaRichPresence bool `gorm:"column:enable_manga_rich_presence" json:"enableMangaRichPresence"`
}

type NotificationSettings struct {
	DisableNotifications bool `gorm:"column:disable_notifications" json:"disableNotifications"`
}

type Mal struct {
	BaseModel
	Username       string    `gorm:"column:username" json:"username"`
	AccessToken    string    `gorm:"column:access_token" json:"accessToken"`
	RefreshToken   string    `gorm:"column:refresh_token" json:"refreshToken"`
	TokenExpiresAt time.Time `gorm:"column:token_expires_at" json:"tokenExpiresAt"`
}

type ScanSummary struct {
	BaseModel
	Value []byte `gorm:"column:value" json:"value"`
}

type AutoDownloaderRule struct {
	BaseModel
	Value []byte `gorm:"column:value" json:"value"`
}

type AutoDownloaderProfile struct {
	BaseModel
	Value []byte `gorm:"column:value" json:"value"`
}

type AutoSelectProfile struct {
	BaseModel
	Value []byte `gorm:"column:value" json:"value"`
}

type AutoDownloaderItem struct {
	BaseModel
	MediaID     int       `gorm:"column:media_id" json:"mediaId"`
	Episode     int       `gorm:"column:episode" json:"episode"`
	Hash        string    `gorm:"column:hash" json:"hash"`
	TorrentName string    `gorm:"column:torrent_name" json:"torrentName"`
	Downloaded  bool      `gorm:"column:downloaded" json:"downloaded"`
	RuleID      uint      `gorm:"column:rule_id" json:"ruleId"`
	Score       int       `gorm:"column:score" json:"score"`
	IsDelayed   bool      `gorm:"column:is_delayed" json:"isDelayed"`
	DelayUntil  time.Time `gorm:"column:delay_until" json:"delayUntil"`
	TorrentData []byte    `gorm:"column:torrent_data" json:"torrentData"`
}

type AutoDownloaderSettings struct {
	Provider              string `gorm:"column:auto_downloader_provider" json:"provider"`
	Interval              int    `gorm:"column:auto_downloader_interval" json:"interval"`
	Enabled               bool   `gorm:"column:auto_downloader_enabled" json:"enabled"`
	DownloadAutomatically bool   `gorm:"column:auto_downloader_download_automatically" json:"downloadAutomatically"`
	EnableEnhancedQueries bool   `gorm:"column:enable_enhanced_queries" json:"enableEnhancedQueries"`
	EnableSeasonCheck     bool   `gorm:"column:enable_season_check" json:"enableSeasonCheck"`
	UseDebrid             bool   `gorm:"column:use_debrid" json:"useDebrid"`
}

type Theme struct {
	BaseModel
	EnableColorSettings    bool   `gorm:"column:enable_color_settings" json:"enableColorSettings"`
	BackgroundColor        string `gorm:"column:background_color" json:"backgroundColor"`
	AccentColor            string `gorm:"column:accent_color" json:"accentColor"`
	SidebarBackgroundColor string `gorm:"column:sidebar_background_color" json:"sidebarBackgroundColor"`
	HomeItems              []byte `gorm:"column:home_items" json:"homeItems"`
}

type HomeItem struct {
	ID   string `json:"id"`
	Type string `json:"type"`
}

type MediastreamSettings struct {
	BaseModel
	TranscodeEnabled               bool   `gorm:"column:transcode_enabled" json:"transcodeEnabled"`
	FfmpegPath                      string `gorm:"column:ffmpeg_path" json:"ffmpegPath"`
	FfprobePath                     string `gorm:"column:ffprobe_path" json:"ffprobePath"`
	PreTranscodeLibraryDir         string `gorm:"column:pre_transcode_library_dir" json:"preTranscodeLibraryDir"`
	TranscodeHwAccel               string `gorm:"column:transcode_hw_accel" json:"transcodeHwAccel"`
	TranscodePreset                string `gorm:"column:transcode_preset" json:"transcodePreset"`
	TranscodeHwAccelCustomSettings string `gorm:"column:transcode_hw_accel_custom_settings" json:"transcodeHwAccelCustomSettings"`
	PreTranscodeEnabled            bool   `gorm:"column:pre_transcode_enabled" json:"preTranscodeEnabled"`
	TranscodeThreads               int    `gorm:"column:transcode_threads" json:"transcodeThreads"`
	DirectPlayOnly                 bool   `gorm:"column:direct_play_only" json:"directPlayOnly"`
}

type DebridSettings struct {
	BaseModel
	Enabled  bool   `gorm:"column:enabled" json:"enabled"`
	Provider string `gorm:"column:provider" json:"provider"`
	ApiKey   string `gorm:"column:api_key" json:"apiKey"`
	IncludeDebridStreamInLibrary bool `gorm:"column:include_debrid_stream_in_library" json:"includeDebridStreamInLibrary"`
	StreamAutoSelect             bool `gorm:"column:stream_auto_select" json:"streamAutoSelect"`
	StreamPreferredResolution    string `gorm:"column:stream_preferred_resolution" json:"streamPreferredResolution"`
}

type ChapterDownloadQueueItem struct {
	BaseModel
	MediaID       int    `json:"mediaId"`
	Provider      string `json:"provider"`
	ChapterID     string `json:"chapterId"`
	ChapterNumber string `json:"chapterNumber"`
}

type DebridTorrentItem struct {
	BaseModel
	MediaId       int    `json:"mediaId"`
	TorrentItemID string `json:"torrentItemId"`
	Destination   string `json:"destination"`
	Provider      string `json:"provider"`
}

type GhostAssociatedMedia struct {
	BaseModel
	Path            string  `json:"path"`
	TargetMediaId   int     `json:"targetMediaId"`
	GhostMatchCount int     `json:"ghostMatchCount"`
	AlgorithmScore  float64 `json:"algorithmScore"`
	UserResolved    bool    `json:"userResolved"`
	OriginalTitle   string  `json:"originalTitle"`
	Confidence      float64 `json:"confidence"`
}

type MediaMetadataParent struct {
	BaseModel
	MediaId       int `json:"mediaId"`
	ParentId      int `json:"parentId"`
	SpecialOffset int `json:"specialOffset"`
}

type OnlinestreamMapping struct {
	BaseModel
	MediaID  int    `json:"mediaId"`
	AnimeID  string `json:"animeId"`
	Provider string `json:"provider"`
}

type SilencedMediaEntry struct {
	BaseModel
}

type TorrentstreamHistory struct {
	BaseModel
	MediaId            int    `json:"mediaId"`
	Torrent            []byte `json:"torrent"`
	BatchEpisodeFiles []byte `json:"batchEpisodeFiles"`
}

type MediaFiller struct {
	BaseModel
	Data          []byte    `json:"data"`
	MediaID       int       `json:"mediaId"`
	Provider      string    `json:"provider"`
	Slug          string    `json:"slug"`
	LastFetchedAt time.Time `json:"lastFetchedAt"`
}

type MangaMapping struct {
	BaseModel
}

type PluginData struct {
	BaseModel
}

type CustomSourceCollection struct {
	BaseModel
}

type CustomSourceIdentifier struct {
	BaseModel
}
