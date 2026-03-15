package handlers

import (
	"errors"
	"kamehouse/internal/database/models"
	"kamehouse/internal/torrents/torrent"
	"kamehouse/internal/util"
	"os"
	"path/filepath"
	"time"

	"github.com/labstack/echo/v4"
)

// HandleGetSettings
//
//	@summary returns the app settings.
//	@route /api/v1/settings [GET]
//	@returns models.Settings
func (h *Handler) HandleGetSettings(c echo.Context) error {

	settings, err := h.App.Database.GetSettings()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Attach separate-table sub-settings for the full settings view
	settings.Mediastream, _ = h.App.Database.GetMediastreamSettings()
	settings.Torrentstream, _ = h.App.Database.GetTorrentstreamSettings()
	settings.Debrid, _ = h.App.Database.GetDebridSettings()
	settings.Theme, _ = h.App.Database.GetTheme()

	return h.RespondWithData(c, settings)
}

// HandleGettingStarted
//
//	@summary initial setup – save base settings on first run.
//	@desc This will update the app settings.
//	@desc The client should re-fetch the server status after this.
//	@route /api/v1/start [POST]
//	@returns handlers.Status
func (h *Handler) HandleGettingStarted(c echo.Context) error {

	type body struct {
		Library                models.LibrarySettings      `json:"library"`
		MediaPlayer            models.MediaPlayerSettings  `json:"mediaPlayer"`
		Torrent                models.TorrentSettings      `json:"torrent"`
		Anilist                models.AnilistSettings      `json:"anilist"`
		Discord                models.DiscordSettings      `json:"discord"`
		Manga                  models.MangaSettings        `json:"manga"`
		Notifications          models.NotificationSettings `json:"notifications"`
		Nakama                 models.NakamaSettings       `json:"nakama"`
		EnableTranscode        bool                        `json:"enableTranscode"`
		EnableTorrentStreaming bool                        `json:"enableTorrentStreaming"`
		DebridProvider         string                      `json:"debridProvider"`
		DebridApiKey           string                      `json:"debridApiKey"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	if b.Library.LibraryPaths == nil {
		b.Library.LibraryPaths = []string{}
	}
	b.Library.LibraryPath = filepath.ToSlash(b.Library.LibraryPath)
	b.Library.IncludeOnlineStreamingInLibrary = b.Library.EnableOnlinestream

	settings, err := h.App.Database.UpsertSettings(&models.Settings{
		BaseModel:     models.BaseModel{ID: 1, UpdatedAt: time.Now()},
		Library:       &b.Library,
		MediaPlayer:   &b.MediaPlayer,
		Torrent:       &b.Torrent,
		Anilist:       &b.Anilist,
		Discord:       &b.Discord,
		Manga:         &b.Manga,
		Notifications: &b.Notifications,
		Nakama:        &b.Nakama,
		AutoDownloader: &models.AutoDownloaderSettings{
			Provider:              b.Library.TorrentProvider,
			Interval:              20,
			Enabled:               false,
			DownloadAutomatically: true,
			EnableEnhancedQueries: true,
		},
	})
	if err != nil {
		return h.RespondWithError(c, err)
	}

	if b.EnableTorrentStreaming {
		go func() {
			defer util.HandlePanicThen(func() {})
			if prev, found := h.App.Database.GetTorrentstreamSettings(); found {
				prev.Enabled = true
				prev.IncludeInLibrary = true
				_, _ = h.App.Database.UpsertTorrentstreamSettings(prev)
			}
		}()
	}
	if b.EnableTranscode {
		go func() {
			defer util.HandlePanicThen(func() {})
			if prev, found := h.App.Database.GetMediastreamSettings(); found {
				prev.TranscodeEnabled = true
				_, _ = h.App.Database.UpsertMediastreamSettings(prev)
			}
		}()
	}
	if b.DebridProvider != "" && b.DebridProvider != "none" {
		go func() {
			defer util.HandlePanicThen(func() {})
			if prev, found := h.App.Database.GetDebridSettings(); found {
				prev.Enabled = true
				prev.Provider = b.DebridProvider
				prev.ApiKey = b.DebridApiKey
				prev.IncludeDebridStreamInLibrary = true
				_, _ = h.App.Database.UpsertDebridSettings(prev)
			}
		}()
	}

	h.App.WSEventManager.SendEvent("settings", settings)
	h.App.InitOrRefreshModules()

	return h.RespondWithData(c, h.NewStatus(c))
}

// HandleSaveSettings
//
//	@summary updates the app settings.
//	@desc Applies a PATCH-style merge: the incoming payload's non-nil sub-objects
//	@desc replace the stored ones; AutoDownloader is always merged from the DB to
//	@desc preserve scheduler state. Separate-table settings (Mediastream,
//	@desc Torrentstream, Debrid, Theme) are upserted only when present in payload.
//	@route /api/v1/settings [PATCH]
//	@returns handlers.Status
func (h *Handler) HandleSaveSettings(c echo.Context) error {

	type body struct {
		Library       models.LibrarySettings        `json:"library"`
		MediaPlayer   models.MediaPlayerSettings    `json:"mediaPlayer"`
		Torrent       models.TorrentSettings        `json:"torrent"`
		Anilist       models.AnilistSettings        `json:"anilist"`
		Discord       models.DiscordSettings        `json:"discord"`
		Manga         models.MangaSettings          `json:"manga"`
		Notifications models.NotificationSettings   `json:"notifications"`
		Nakama        models.NakamaSettings         `json:"nakama"`
		Mediastream   *models.MediastreamSettings   `json:"mediastream"`
		Torrentstream *models.TorrentstreamSettings `json:"torrentstream"`
		Debrid        *models.DebridSettings        `json:"debrid"`
		Theme         *models.Theme                 `json:"theme"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	// ── 1. Sanitize library paths ─────────────────────────────────────────────
	if b.Library.LibraryPath != "" {
		b.Library.LibraryPath = filepath.ToSlash(filepath.Clean(b.Library.LibraryPath))
	}

	if b.Library.LibraryPaths == nil {
		b.Library.LibraryPaths = []string{}
	}

	cleanPaths := b.Library.LibraryPaths[:0]
	for _, p := range b.Library.LibraryPaths {
		clean := filepath.ToSlash(filepath.Clean(p))
		if clean == "" || util.IsSameDir(clean, b.Library.LibraryPath) {
			continue
		}
		info, err := os.Stat(filepath.FromSlash(clean))
		if err != nil || !info.IsDir() {
			continue
		}
		cleanPaths = append(cleanPaths, clean)
	}
	b.Library.LibraryPaths = cleanPaths

	for i, p1 := range b.Library.LibraryPaths {
		if util.IsSubdirectory(b.Library.LibraryPath, p1) || util.IsSubdirectory(p1, b.Library.LibraryPath) {
			return h.RespondWithError(c, errors.New("library paths cannot be subdirectories of each other"))
		}
		for j, p2 := range b.Library.LibraryPaths {
			if i != j && util.IsSubdirectory(p1, p2) {
				return h.RespondWithError(c, errors.New("library paths cannot be subdirectories of each other"))
			}
		}
	}

	// ── 2. Single fetch – free if cache is warm ───────────────────────────────
	prev, err := h.App.Database.GetSettings()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// ── 3. Preserve AutoDownloader: always carry the stored state forward ─────
	autoDownloader := models.AutoDownloaderSettings{}
	if prev.AutoDownloader != nil {
		autoDownloader = *prev.AutoDownloader
	}
	// If the provider is being cleared, disable the scheduler proactively
	if b.Library.TorrentProvider == torrent.ProviderNone && autoDownloader.Enabled {
		h.App.Logger.Debug().Msg("settings: disabling auto-downloader – torrent provider set to none")
		autoDownloader.Enabled = false
	}

	// ── 4. Build merged Settings – incoming payload wins for every sub-object ──
	merged := &models.Settings{
		BaseModel: models.BaseModel{
			ID:        1,
			UpdatedAt: time.Now(),
		},
		Library:        &b.Library,
		MediaPlayer:    &b.MediaPlayer,
		Torrent:        &b.Torrent,
		Anilist:        &b.Anilist,
		Discord:        &b.Discord,
		Manga:          &b.Manga,
		Notifications:  &b.Notifications,
		Nakama:         &b.Nakama,
		AutoDownloader: &autoDownloader,
		// ListSync is not sent by the client — carry forward from DB
		ListSync: prev.ListSync,
	}

	// ── 5. Single upsert for the main embedded settings ───────────────────────
	saved, err := h.App.Database.UpsertSettings(merged)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// ── 6. Conditional upserts for separate-table settings ────────────────────
	if b.Mediastream != nil {
		b.Mediastream.ID = 1
		b.Mediastream.UpdatedAt = time.Now()
		_, _ = h.App.Database.UpsertMediastreamSettings(b.Mediastream)
	}
	if b.Torrentstream != nil {
		b.Torrentstream.ID = 1
		b.Torrentstream.UpdatedAt = time.Now()
		_, _ = h.App.Database.UpsertTorrentstreamSettings(b.Torrentstream)
	}
	if b.Debrid != nil {
		b.Debrid.ID = 1
		b.Debrid.UpdatedAt = time.Now()
		_, _ = h.App.Database.UpsertDebridSettings(b.Debrid)
	}
	if b.Theme != nil {
		b.Theme.ID = 1
		// Preserve HomeItems – they are managed by a separate flow
		if currentTheme, err := h.App.Database.GetTheme(); err == nil && currentTheme != nil {
			b.Theme.HomeItems = currentTheme.HomeItems
		}
		_, _ = h.App.Database.UpsertTheme(b.Theme)
	}

	// ── 7. Broadcast & refresh ────────────────────────────────────────────────
	h.App.WSEventManager.SendEvent("settings", saved)
	h.App.InitOrRefreshModules()

	return h.RespondWithData(c, h.NewStatus(c))
}

// HandleSaveAutoDownloaderSettings
//
//	@summary updates the auto-downloader settings.
//	@route /api/v1/settings/auto-downloader [PATCH]
//	@returns bool
func (h *Handler) HandleSaveAutoDownloaderSettings(c echo.Context) error {

	type body struct {
		Provider              string `json:"provider"`
		Interval              int    `json:"interval"`
		Enabled               bool   `json:"enabled"`
		DownloadAutomatically bool   `json:"downloadAutomatically"`
		EnableEnhancedQueries bool   `json:"enableEnhancedQueries"`
		EnableSeasonCheck     bool   `json:"enableSeasonCheck"`
		UseDebrid             bool   `json:"useDebrid"`
	}

	var b body

	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	currSettings, err := h.App.Database.GetSettings()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Validation
	if b.Interval < 15 {
		return h.RespondWithError(c, errors.New("interval must be at least 15 minutes"))
	}

	autoDownloaderSettings := &models.AutoDownloaderSettings{
		Provider:              b.Provider,
		Interval:              b.Interval,
		Enabled:               b.Enabled,
		DownloadAutomatically: b.DownloadAutomatically,
		EnableEnhancedQueries: b.EnableEnhancedQueries,
		EnableSeasonCheck:     b.EnableSeasonCheck,
		UseDebrid:             b.UseDebrid,
	}

	currSettings.AutoDownloader = autoDownloaderSettings
	currSettings.BaseModel = models.BaseModel{
		ID:        1,
		UpdatedAt: time.Now(),
	}

	_, err = h.App.Database.UpsertSettings(currSettings)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Update Auto Downloader settings
	h.App.AutoDownloader.SetSettings(*autoDownloaderSettings)

	return h.RespondWithData(c, true)
}

// HandleSaveMediaPlayerSettings
//
//	@summary updates the media player settings.
//	@route /api/v1/settings/media-player [PATCH]
//	@returns bool
func (h *Handler) HandleSaveMediaPlayerSettings(c echo.Context) error {

	type body struct {
		MediaPlayer *models.MediaPlayerSettings `json:"mediaPlayer"`
	}

	var b body

	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	currSettings, err := h.App.Database.GetSettings()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	currSettings.MediaPlayer = b.MediaPlayer
	currSettings.BaseModel = models.BaseModel{
		ID:        1,
		UpdatedAt: time.Now(),
	}

	_, err = h.App.Database.UpsertSettings(currSettings)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	h.App.InitOrRefreshModules()

	return h.RespondWithData(c, true)
}
