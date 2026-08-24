package handlers

import (
	"errors"
	"kamehouse/internal/database/models"
	"kamehouse/internal/util"
	"os"
	"path/filepath"
	"time"

	"github.com/labstack/echo/v4"
)

// HandleGetSettings returns the app settings.
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
	settings.Theme, _ = h.App.Database.GetTheme()

	return h.RespondWithData(c, settings)
}

// HandleGettingStarted implements the initial setup, saving base settings on first run.
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
		EnableTranscode        bool                        `json:"enableTranscode"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	if b.Library.SeriesPaths == nil {
		b.Library.SeriesPaths = []string{}
	}
	if b.Library.MoviePaths == nil {
		b.Library.MoviePaths = []string{}
	}

	settings, err := h.App.Database.UpsertSettings(&models.Settings{
		BaseModel:     models.BaseModel{ID: 1, UpdatedAt: time.Now()},
		Library:       b.Library,
		MediaPlayer:   b.MediaPlayer,
	})
	if err != nil {
		return h.RespondWithError(c, err)
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

	h.invalidateSettingsCache()
	h.App.WSEventManager.SendEvent("settings", settings)
	h.App.InitOrRefreshModules()

	return h.RespondWithData(c, h.NewStatus(c))
}

// HandleSaveSettings updates the app settings.
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
		Library       *models.LibrarySettings       `json:"library"`
		MediaPlayer   *models.MediaPlayerSettings   `json:"mediaPlayer"`
		Mediastream   *models.MediastreamSettings   `json:"mediastream"`
		Theme         *models.Theme                 `json:"theme"`
		Notifications *models.NotificationSettings `json:"notifications"`
		Platform      *models.PlatformSettings     `json:"Platform"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	// ── 1. Sanitize library paths (if provided) ───────────────────────────────
	if b.Library != nil {
		if b.Library.SeriesPaths == nil {
			b.Library.SeriesPaths = []string{}
		}
		if b.Library.MoviePaths == nil {
			b.Library.MoviePaths = []string{}
		}

		cleanSeries := make([]string, 0, len(b.Library.SeriesPaths))
		for _, p := range b.Library.SeriesPaths {
			clean := filepath.ToSlash(filepath.Clean(p))
			if clean == "" {
				continue
			}
			// Relaxed validation: check if it exists, but don't drop if it doesn't
			info, err := os.Stat(filepath.FromSlash(clean))
			if err != nil {
				h.App.Logger.Warn().Err(err).Str("path", clean).Msg("settings: library path not accessible")
			} else if !info.IsDir() {
				h.App.Logger.Warn().Str("path", clean).Msg("settings: library path is not a directory")
			}
			cleanSeries = append(cleanSeries, clean)
		}
		b.Library.SeriesPaths = cleanSeries

		cleanMovies := make([]string, 0, len(b.Library.MoviePaths))
		for _, p := range b.Library.MoviePaths {
			clean := filepath.ToSlash(filepath.Clean(p))
			if clean == "" {
				continue
			}
			info, err := os.Stat(filepath.FromSlash(clean))
			if err != nil {
				h.App.Logger.Warn().Err(err).Str("path", clean).Msg("settings: library path not accessible")
			} else if !info.IsDir() {
				h.App.Logger.Warn().Str("path", clean).Msg("settings: library path is not a directory")
			}
			cleanMovies = append(cleanMovies, clean)
		}
		b.Library.MoviePaths = cleanMovies

		allPaths := b.Library.GetAllPaths()
		for i, p1 := range allPaths {
			for j, p2 := range allPaths {
				if i != j && util.IsSubdirectory(p1, p2) {
					return h.RespondWithError(c, errors.New("library paths cannot be subdirectories of each other"))
				}
			}
		}
	}

	// ── 2. Single fetch – free if cache is warm ───────────────────────────────
	prev, err := h.App.Database.GetSettings()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	merged := prev
	merged.ID = 1
	merged.UpdatedAt = time.Now()

	if b.Library != nil {
		lastScan := merged.Library.LastScanAt
		merged.Library = *b.Library
		merged.Library.LastScanAt = lastScan

		// If a TMDB API key is provided and the primary provider is empty, set it to "tmdb"
		if merged.Library.TmdbApiKey != "" && merged.Library.PrimaryMetadataProvider == "" {
			merged.Library.PrimaryMetadataProvider = "tmdb"
		}
	}

	// Media Player Settings
	if b.MediaPlayer != nil {
		merged.MediaPlayer = *b.MediaPlayer
	}


	if b.Notifications != nil {
		merged.Notifications = *b.Notifications
	}

	if b.Platform != nil {
		merged.Platform = *b.Platform
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

	if b.Theme != nil {
		b.Theme.ID = 1
		_, _ = h.App.Database.UpsertTheme(b.Theme)
	}

	// ── 7. Invalidate settings cache ──────────────────────────────────────────
	h.invalidateSettingsCache()

	// ── 8. Broadcast & refresh ────────────────────────────────────────────────
	h.App.WSEventManager.SendEvent("settings", saved)
	h.App.InitOrRefreshModules()

	return h.RespondWithData(c, h.NewStatus(c))
}



// HandleSaveMediaPlayerSettings updates the media player settings.
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

	if b.MediaPlayer == nil {
		return h.RespondWithError(c, errors.New("mediaPlayer is required"))
	}

	currSettings.MediaPlayer = *b.MediaPlayer
	currSettings.BaseModel = models.BaseModel{
		ID:        1,
		UpdatedAt: time.Now(),
	}

	_, err = h.App.Database.UpsertSettings(currSettings)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	h.invalidateSettingsCache()
	h.App.InitOrRefreshModules()

	return h.RespondWithData(c, true)
}

