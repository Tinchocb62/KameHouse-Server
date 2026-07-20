package core

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"time"

	"kamehouse/internal/api/animethemes"
	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/api/tmdb"
	"kamehouse/internal/continuity"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/library/anime"
	"kamehouse/internal/library/autoscanner"
	"kamehouse/internal/library/fillermanager"
	"kamehouse/internal/library/scanner"
	"kamehouse/internal/library_explorer"
	"kamehouse/internal/mediastream"
	"kamehouse/internal/platforms/jikan_platform"
	"kamehouse/internal/skipdetect"
	"kamehouse/internal/util"

	"github.com/cli/browser"
	"github.com/rs/zerolog"
)

// initModulesOnce will initialize modules that need to persist.
func (a *App) initModulesOnce() {

	// +---------------------+
	// |  Background Queue   |
	// +---------------------+
	mSettings, ok := a.Database.GetMediastreamSettings()
	ffprobePath := "ffprobe"
	if ok && mSettings.FfprobePath != "" {
		ffprobePath = mSettings.FfprobePath
	}
	a.BackgroundQueue = scanner.NewBackgroundQueue(a.Database, a.WSEventManager, a.Logger, ffprobePath)
	a.BackgroundQueue.Start(4)

	a.AddCleanupFunction(func() {
		a.BackgroundQueue.Stop()
	})

	// +---------------------+
	// |       Filler        |
	// +---------------------+

	a.FillerManager = fillermanager.New(&fillermanager.NewFillerManagerOptions{
		DB:     a.Database,
		Logger: a.Logger,
	})

	// +---------------------+
	// |    Media Stream     |
	// +---------------------+

	a.MediastreamRepository = mediastream.NewRepository(&mediastream.NewRepositoryOptions{
		Logger:         a.Logger,
		WSEventManager: a.WSEventManager,
		FileCacher:     a.FileCacher,
		Database:       a.Database,
	})

	a.AddCleanupFunction(func() {
		a.MediastreamRepository.OnCleanup()
	})

	// +---------------------+
	// |   Skip Detector     |
	// +---------------------+
	// Detección automática de intros/outros (AnimeThemes → cross-episodio → ASS).
	// El cliente de AnimeThemes se inyecta en Fase 3 (nil → arranca en Método B).
	ffmpegPath := "ffmpeg"
	if ok && mSettings.FfmpegPath != "" {
		ffmpegPath = mSettings.FfmpegPath
	}
	athClient := animethemes.NewClient(a.Logger, a.Database)
	a.SkipDetector = skipdetect.New(a.Database, a.Logger, a.WSEventManager, a.Config.Cache.Dir, ffmpegPath, ffprobePath, athClient, a.FileCacher)

	// +---------------------+
	// | Transcode Cleanup   |
	// +---------------------+
	// Clean up old transcode directories periodically
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				cleanupTranscodeDirs(a.Logger, a.Config.Cache.TranscodeDir)
			case <-a.shutdownCtx.Done():
				return
			}
		}
	}()

	// +---------------------+
	// |    Auto Scanner     |
	// +---------------------+

	a.AutoScanner = autoscanner.New(&autoscanner.NewAutoScannerOptions{
		Database:         a.Database,
		Logger:           a.Logger,
		WSEventManager:   a.WSEventManager,
		Enabled:          true,
		MetadataProvider: a.Metadata.Provider,
		Platform:         a.Metadata.Platform,
		LogsDir:          a.Config.Logs.Dir,
		OnRefreshCollection: func() {
			go func() {
				a.Logger.Info().Msg("app: Refreshing anime collection after auto-scan")
				_, _ = a.GetAnimeCollection(true)
				anime.InvalidateCuratedHomeCache()
				_, _ = a.Metadata.Platform.RefreshAnimeCollection(context.Background())
			}()
		},
		EventDispatcher: a.WSEventManager.Dispatcher(),
		BackgroundQueue: a.BackgroundQueue,
		ShutdownCtx:     a.shutdownCtx,
	})

	// +---------------------+
	// |   Anime Library     |
	// +---------------------+
	a.LibraryExplorer = library_explorer.NewLibraryExplorer(library_explorer.NewLibraryExplorerOptions{
		Logger:   a.Logger,
		Database: a.Database,
	})

	// +---------------------+
	// |    Intelligence     |
	// +---------------------+
	a.IntelligenceService = anime.NewIntelligenceService(a.Database, a.FillerManager, a.Logger)

	// +---------------------+
	// |    Maintenance      |
	// +---------------------+
	a.startMaintenanceScheduler()
}

// HandleNewDatabaseEntries initializes essential database collections.
func HandleNewDatabaseEntries(database *db.Database, logger *zerolog.Logger) {
	if _, _, err := db.GetLocalFiles(database); err != nil {
		_, err := db.InsertLocalFiles(database, make([]*dto.LocalFile, 0))
		if err != nil {
			logger.Fatal().Err(err).Msgf("app: Failed to initialize local files in the database")
		}
	}
}

// InitOrRefreshModules will initialize or refresh modules that depend on settings.
func (a *App) InitOrRefreshModules() {
	a.moduleMu.Lock()
	defer a.moduleMu.Unlock()

	a.Logger.Debug().Msgf("app: Refreshing modules")

	if a.Watcher != nil {
		a.Watcher.StopWatching()
	}

	settings, err := a.Database.GetSettings()
	if err != nil || settings == nil {
		a.Logger.Warn().Msg("app: Did not initialize modules, no settings found")
		return
	}

	a.Settings = settings

	if envSeries := os.Getenv("KAMEHOUSE_SERIES_PATHS"); envSeries != "" {
		settings.Library.SeriesPaths = strings.Split(envSeries, ",")
	}
	if envMovies := os.Getenv("KAMEHOUSE_MOVIE_PATHS"); envMovies != "" {
		settings.Library.MoviePaths = strings.Split(envMovies, ",")
	}
	if envTmdb := os.Getenv("KAMEHOUSE_TMDB_TOKEN"); envTmdb != "" {
		settings.Library.TmdbApiKey = envTmdb
	}
	if envTmdbLang := os.Getenv("KAMEHOUSE_TMDB_LANGUAGE"); envTmdbLang != "" {
		settings.Library.TmdbLanguage = envTmdbLang
	}

	allPaths := settings.GetLibrary().GetAllPaths()
	if len(allPaths) > 0 {
		a.LibraryDir = allPaths[0]
		a.FeatureManager.UpdateFromSettings(&settings.Library)
	}

	if a.LibraryExplorer != nil {
		go util.HandlePanicInModuleThen("core/modules/SetLibraryPaths", func() {
			a.LibraryExplorer.SetLibraryPaths(settings.GetLibrary().GetAllPaths())
		})
	}

	if a.AutoScanner != nil {
		a.AutoScanner.SetEnabled(settings.Library.AutoScan && !settings.Library.DisableLocalScanning)
	}

	if len(settings.GetLibrary().GetAllPaths()) > 0 && settings.Library.AutoScan && !settings.Library.DisableLocalScanning {
		go util.HandlePanicInModuleThen("core/modules/InitWatcher", func() {
			a.initLibraryWatcher(settings.GetLibrary().GetAllPaths())
		})
	}

	a.ContinuityManager.SetSettings(&continuity.Settings{
		WatchContinuityEnabled: settings.Library.EnableWatchContinuity,
	})

	if !a.IsOffline() {
		a.Logger.Info().Msg("app: Using Jikan platform")
		a.Metadata.Platform.SetPlatform(jikan_platform.NewPlatform(a.Logger))

		tmdbAPIKey := settings.Library.TmdbApiKey
		if tmdbAPIKey == "" {
			tmdbAPIKey = a.Config.Metadata.TMDBApiKey
		}
		tmdbLanguage := settings.Library.TmdbLanguage
		if tmdbLanguage == "" {
			tmdbLanguage = "es-MX"
		}
		if tmdbAPIKey == "" {
			a.Logger.Warn().Msg("app: No TMDB API key configured â€” platform features will be limited")
		}
		tmdbClient := tmdb.NewClient(tmdbAPIKey, tmdbLanguage)
		if a.Database != nil {
			tmdbClient.SetPersistentCache(&TMDbCacheAdapter{db: a.Database})
		}
		a.Metadata.TMDBClient = tmdbClient
		a.Metadata.Provider.SetProvider(metadata_provider.NewProvider(&metadata_provider.NewProviderImplOptions{
			Logger:     a.Logger,
			FileCacher: a.FileCacher,
			Database:   a.Database,
			TMDBClient: a.Metadata.TMDBClient,
		}))
	}

	a.Logger.Info().Msg("app: Refreshed modules")
}

func (a *App) InitOrRefreshMediastreamSettings() {
	var settings *models.MediastreamSettings
	var found bool
	settings, found = a.Database.GetMediastreamSettings()
	if !found {
		var err error
		settings, err = a.Database.UpsertMediastreamSettings(&models.MediastreamSettings{
			BaseModel: models.BaseModel{
				ID: 1,
			},
			TranscodeEnabled:    false,
			TranscodeHwAccel:    "auto",
			TranscodePreset:     "fast",
			PreTranscodeEnabled: false,
		})
		if err != nil {
			a.Logger.Error().Err(err).Msg("app: Failed to initialize mediastream module")
			return
		}
	}

	if settings.TranscodeHwAccel == "disabled" || settings.TranscodeHwAccel == "" {
		settings.TranscodeHwAccel = "auto"
		updatedSettings, err := a.Database.UpsertMediastreamSettings(settings)
		if err != nil {
			a.Logger.Error().Err(err).Msg("app: Failed to update mediastream hardware acceleration settings")
		} else {
			settings = updatedSettings
		}
	}

	a.MediastreamRepository.InitializeModules(settings, a.Config.Cache.Dir, a.Config.Cache.TranscodeDir)

	go func() {
		if settings.TranscodeEnabled {
			_ = a.FileCacher.TrimMediastreamVideoFiles()
		} else {
			_ = a.FileCacher.ClearMediastreamVideoFiles()
		}
	}()

	a.SecondarySettings.Mediastream = settings
}

func (a *App) performActionsOnce() {
	go func() {
		if a.Settings == nil {
			return
		}

		if a.Settings.GetLibrary().OpenWebURLOnStart {
			err := browser.OpenURL(a.Config.GetServerURI("127.0.0.1"))
			if err != nil {
				a.Logger.Warn().Err(err).Msg("app: Failed to open web URL, please open it manually in your browser")
			} else {
				a.Logger.Info().Msg("app: Opened web URL")
			}
		}

		if a.Settings.GetLibrary().RefreshLibraryOnStart {
			go func() {
				a.Logger.Debug().Msg("app: Refreshing library")
				a.AutoScanner.TriggerScan(nil)
			}()
		}
	}()
}

// cleanupTranscodeDirs removes transcode directories older than 1 hour.
func cleanupTranscodeDirs(logger *zerolog.Logger, transcodeBaseDir string) {
	if transcodeBaseDir == "" {
		transcodeBaseDir = filepath.Join(os.TempDir(), "kamehouse", "transcodes")
	}

	entries, err := os.ReadDir(transcodeBaseDir)
	if err != nil {
		if !os.IsNotExist(err) {
			logger.Warn().Err(err).Msg("app: failed to read transcode directory")
		}
		return
	}

	cutoff := time.Now().Add(-1 * time.Hour)
	removed := 0

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		if info.ModTime().Before(cutoff) {
			fullPath := filepath.Join(transcodeBaseDir, entry.Name())
			if err := os.RemoveAll(fullPath); err != nil {
				logger.Warn().Err(err).Str("path", fullPath).Msg("app: failed to remove old transcode directory")
			} else {
				removed++
			}
		}
	}

	if removed > 0 {
		logger.Info().Int("count", removed).Msg("app: cleaned up old transcode directories")
	}
}

type TMDbCacheAdapter struct {
	db *db.Database
}

func (t *TMDbCacheAdapter) Get(key string, out interface{}) (bool, error) {
	return db.GetMetadataCache(t.db, "tmdb-api", key, out)
}

func (t *TMDbCacheAdapter) Set(key string, value interface{}, ttl time.Duration) error {
	return db.UpsertMetadataCache(t.db, "tmdb-api", key, value, ttl)
}
