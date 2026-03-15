package core

import (
	"context"
	"kamehouse/internal/api/anilist"
	"kamehouse/internal/api/mal"
	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/constants"
	"kamehouse/internal/continuity"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	debrid_client "kamehouse/internal/debrid/client"
	"kamehouse/internal/directstream"
	"kamehouse/internal/events"
	"kamehouse/internal/hook"
	"kamehouse/internal/library/autodownloader"
	"kamehouse/internal/library/autoscanner"
	"kamehouse/internal/library/fillermanager"
	"kamehouse/internal/library/scanner"
	"kamehouse/internal/library_explorer"
	"kamehouse/internal/local"
	"kamehouse/internal/mediastream"
	"kamehouse/internal/platforms/anilist_platform"
	"kamehouse/internal/platforms/offline_platform"
	"kamehouse/internal/platforms/platform"
	"kamehouse/internal/platforms/simulated_platform"
	"kamehouse/internal/report"
	"kamehouse/internal/streaming"
	"kamehouse/internal/torrent_clients/torrent_client"
	itorrent "kamehouse/internal/torrents/torrent"
	"kamehouse/internal/torrentstream"
	"kamehouse/internal/user"
	"kamehouse/internal/util"
	"kamehouse/internal/util/cache"
	"kamehouse/internal/util/filecache"
	"kamehouse/internal/util/result"
	"kamehouse/internal/videocore"
	"kamehouse/internal/ws"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/rs/zerolog"
)

type (
	MetadataProviders struct {
		AnilistClientRef   *util.Ref[anilist.AnilistClient]
		AnilistPlatformRef *util.Ref[platform.Platform]
		OfflinePlatformRef *util.Ref[platform.Platform]
		ProviderRef        *util.Ref[metadata_provider.Provider]
		MalScrobbler       *mal.MalScrobblerWorker
	}

	KameHouse struct {
		// Core
		Config   *Config
		Database *db.Database
		Logger   *zerolog.Logger

		// Torrent and debrid services
		TorrentClientRepository *torrent_client.Repository
		TorrentRepository       *itorrent.Repository
		DebridClientRepository  *debrid_client.Repository

		// File system monitoring
		Watcher *scanner.Watcher

		// Metadata Providers (Decoupled Foundation)
		Metadata MetadataProviders

		// Library
		FillerManager  *fillermanager.FillerManager
		AutoDownloader *autodownloader.AutoDownloader
		AutoScanner    *autoscanner.AutoScanner

		// Real-time communication
		WSEventManager *events.WSEventManager
		WSHub          *ws.Hub

		ExtensionRepository interface {
			ListExtensionData() []interface{}
		}
		ExtensionBankRef interface{}

		HookManager             hook.Manager
		TorrentstreamRepository *torrentstream.Repository

		// Streaming
		StreamOrchestrator    *streaming.StreamOrchestrator
		DirectStreamManager   *directstream.Manager
		MediastreamRepository *mediastream.Repository
		// Phase 2: Base Providers
		VideoCore *videocore.VideoCore

		// Offline and local account
		LocalManager local.Manager

		// Utilities
		FileCacher       *filecache.Cacher
		ReportRepository *report.Repository
		ThumbnailCache   *cache.ThumbnailCache

		// Continuity and sync
		ContinuityManager *continuity.Manager
		TelemetryManager  *continuity.TelemetryManager

		// Lifecycle management
		Cleanups                        []func()
		OnRefreshAnilistCollectionFuncs *result.Map[string, func()]
		OnFlushLogs                     func()

		// Configuration and feature flags
		FeatureFlags      FeatureFlags
		FeatureManager    *FeatureManager
		Settings          *models.Settings
		SecondarySettings struct {
			Mediastream   *models.MediastreamSettings
			Torrentstream *models.TorrentstreamSettings
			Debrid        *models.DebridSettings
		}

		// Metadata
		Version          string
		TotalLibrarySize uint64
		LibraryDir       string
		AnilistCacheDir  string
		IsDesktopSidecar bool
		Flags            KameHouseFlags

		// Internal state
		user               *user.User
		previousVersion    string
		moduleMu           sync.Mutex
		ServerReady        bool
		isOfflineRef       *util.Ref[bool]
		ServerPasswordHash string

		LibraryExplorer *library_explorer.LibraryExplorer

		// Show this version's tour on the frontend
		// Hydrated by migrations.go when there's a version change
		ShowTour string
	}

	App = KameHouse
)

type AppOption func(*KameHouse)

func WithConfig(cfg *Config) AppOption            { return func(a *KameHouse) { a.Config = cfg } }
func WithLogger(logger *zerolog.Logger) AppOption { return func(a *KameHouse) { a.Logger = logger } }
func WithDatabase(db *db.Database) AppOption      { return func(a *KameHouse) { a.Database = db } }
func WithWSEventManager(ws *events.WSEventManager) AppOption {
	return func(a *KameHouse) { a.WSEventManager = ws }
}

// NewApp creates a new server instance
func NewKameHouse(configOpts *ConfigOptions) *App {

	// Initialize logger with predefined format
	logger := util.NewLogger()

	// Log application version, OS, architecture and system info
	logger.Info().Msgf("app: KameHouse %s-%s", constants.Version, constants.VersionName)
	logger.Info().Msgf("app: OS: %s", runtime.GOOS)
	logger.Info().Msgf("app: Arch: %s", runtime.GOARCH)
	logger.Info().Msgf("app: Processor count: %d", runtime.NumCPU())

	// Initialize hook manager for plugin event system
	hookManager := hook.NewHookManager(hook.NewHookManagerOptions{Logger: logger})
	hook.SetGlobalHookManager(hookManager)

	// Store current version to detect version changes
	previousVersion := constants.Version

	// Add callback to track version changes
	configOpts.OnVersionChange = append(configOpts.OnVersionChange, func(oldVersion string, newVersion string) {
		logger.Info().Str("prev", oldVersion).Str("current", newVersion).Msg("app: Version change detected")
		previousVersion = oldVersion
	})

	// Initialize configuration with provided options
	// Creates config directory if it doesn't exist
	cfg, err := NewConfig(configOpts, logger)
	if err != nil {
		log.Fatalf("app: Failed to initialize config: %v", err)
	}

	// Compute SHA-256 hash of the server password
	serverPasswordHash := ""
	if cfg.Server.Password != "" {
		serverPasswordHash = util.HashSHA256Hex(cfg.Server.Password)
	}

	// Create logs directory if it doesn't exist
	_ = os.MkdirAll(cfg.Logs.Dir, 0755)

	// Start background process to trim log files
	go TrimLogEntries(cfg.Logs.Dir, logger)

	logger.Info().Msgf("app: Data directory: %s", cfg.Data.AppDataDir)
	logger.Info().Msgf("app: Working directory: %s", cfg.Data.WorkingDir)

	// Log if running in desktop sidecar mode
	if configOpts.Flags.IsDesktopSidecar {
		logger.Info().Msg("app: Desktop sidecar mode enabled")
	}

	// Initialize database connection
	database, err := db.NewDatabase(context.Background(), cfg.Data.AppDataDir, cfg.Database.Name, logger)
	if err != nil {
		log.Fatalf("app: Failed to initialize database: %v", err)
	}

	HandleNewDatabaseEntries(database, logger)

	// Clean up old database entries using the cleanup manager to prevent concurrent access issues
	database.RunDatabaseCleanup() // Remove old entries from all tables sequentially

	// Get anime library paths for context
	_, _ = database.GetAllLibraryPathsFromSettings()

	// Get Anilist token from database if available
	anilistToken := database.GetAnilistToken()

	anilistCacheDir := filepath.Join(cfg.Cache.Dir, "anilist")

	// Initialize Anilist API client with the token
	// If the token is empty, the client will not be authenticated
	anilistCW := anilist.NewAnilistClient(anilistToken, anilistCacheDir)
	anilistCWRef := util.NewRef[anilist.AnilistClient](anilistCW)

	// Initialize WebSocket event manager for real-time communication
	wsEventManager := events.NewWSEventManager(logger)

	// Exit if no WebSocket connections in desktop sidecar mode
	if configOpts.Flags.IsDesktopSidecar {
		wsEventManager.ExitIfNoConnsAsDesktopSidecar()
	}

	// Initialize file cache system for media and metadata
	fileCacher, err := filecache.NewCacher(cfg.Cache.Dir)
	// torrentio.Resolve ...
	if err != nil {
		logger.Fatal().Err(err).Msgf("app: Failed to initialize file cacher")
	}

	// Initialize metadata provider for media information
	metadataProvider := metadata_provider.NewProvider(&metadata_provider.NewProviderImplOptions{
		Logger:     logger,
		FileCacher: fileCacher,
		Database:   database,
	})

	// Set initial metadata provider (will change if offline mode is enabled)
	activeMetadataProvider := metadataProvider

	// Initialize Anilist platform
	anilistPlatform := anilist_platform.NewAnilistPlatform(anilistCWRef, nil, logger, database)

	activePlatformRef := util.NewRef[platform.Platform](anilistPlatform)
	metadataProviderRef := util.NewRef[metadata_provider.Provider](activeMetadataProvider)

	// Initialize sync manager for offline/online synchronization
	localManager, err := local.NewManager(&local.NewManagerOptions{
		LocalDir:            cfg.Offline.Dir,
		AssetDir:            cfg.Offline.AssetDir,
		Logger:              logger,
		MetadataProviderRef: metadataProviderRef,
		Database:            database,
		WSEventManager:      wsEventManager,
		IsOffline:           cfg.Server.Offline,
		AnilistPlatformRef:  activePlatformRef,
	})
	if err != nil {
		logger.Fatal().Err(err).Msgf("app: Failed to initialize sync manager")
	}

	// Use local metadata provider if in offline mode
	if cfg.Server.Offline {
		activeMetadataProvider = localManager.GetOfflineMetadataProvider()
	}

	// Initialize local platform for offline operations
	offlinePlatform, err := offline_platform.NewOfflinePlatform(localManager, anilistCWRef, logger)
	if err != nil {
		logger.Fatal().Err(err).Msgf("app: Failed to initialize local platform")
	}

	// Initialize simulated platform for unauthenticated operations
	simulatedPlatform := simulated_platform.NewSimulatedPlatform(logger, database)
	if simulatedPlatform == nil {
		logger.Fatal().Err(err).Msgf("app: Failed to initialize simulated platform")
	}

	// Change active platform if offline mode is enabled
	if cfg.Server.Offline {
		logger.Warn().Msg("app: Offline mode is active, using offline platform")
		activePlatformRef.Set(offlinePlatform)
	} else if !anilistCWRef.Get().IsAuthenticated() {
		logger.Warn().Msg("app: Anilist client is not authenticated, using simulated platform")
		activePlatformRef.Set(simulatedPlatform)
	}

	isOfflineRef := util.NewRef(cfg.Server.Offline)
	offlinePlatformRef := util.NewRef[platform.Platform](offlinePlatform)

	// +---------------------+
	// | Phase 2: Base       |
	// +---------------------+

	continuityManager := continuity.NewManager(&continuity.NewManagerOptions{
		FileCacher: fileCacher,
		Logger:     logger,
		Database:   database,
	})

	telemetryManager := continuity.NewTelemetryManager(continuityManager, logger, 5*time.Second)

	var provisionalApp *KameHouse

	videoCore := videocore.New(videocore.NewVideoCoreOptions{
		WsEventManager:      wsEventManager,
		Logger:              logger,
		MetadataProviderRef: metadataProviderRef,
		ContinuityManager:   continuityManager,
		PlatformRef:         activePlatformRef,
		RefreshAnimeCollectionFunc: func() {
			if provisionalApp != nil {
				_, _ = provisionalApp.RefreshAnimeCollection()
			}
		},
		IsOfflineRef: isOfflineRef,
	})


	// Initialize extension playground for testing extensions
	// extensionPlaygroundRepository := extension_playground.NewPlaygroundRepository(logger, activePlatformRef, metadataProviderRef)

	// Initialize Thumbnail Cache (LRU bounded to 1000 items to prevent OOM)
	thumbnailCache, err := cache.NewThumbnailCache(1000)
	if err != nil {
		logger.Fatal().Err(err).Msg("app: Failed to initialize thumbnail cache")
	}

	// Create the main app instance with initialized components
	app := &KameHouse{
		Config:         cfg,
		Flags:          configOpts.Flags,
		FeatureManager: NewFeatureManager(logger, configOpts.Flags),
		Database:       database,
		Metadata: MetadataProviders{
			AnilistClientRef:   anilistCWRef,
			AnilistPlatformRef: activePlatformRef,
			OfflinePlatformRef: offlinePlatformRef,
			ProviderRef:        metadataProviderRef,
		},
		LocalManager:                  localManager,
		WSEventManager:                wsEventManager,
		WSHub:                         ws.NewHub(context.Background(), events.NewDispatcher()),
		AnilistCacheDir:               anilistCacheDir,
		Logger:                        logger,
		Version:            constants.Version,
		FileCacher:         fileCacher,
		ReportRepository:   report.NewRepository(logger),
		ThumbnailCache:     thumbnailCache,
		VideoCore:          videoCore,
		ContinuityManager:  continuityManager,
		TelemetryManager:   telemetryManager,
		TorrentRepository:             nil, // Initialized in App.initModulesOnce
		FillerManager:                 nil, // Initialized in App.initModulesOnce
		AutoDownloader:                nil, // Initialized in App.initModulesOnce
		AutoScanner:                   nil, // Initialized in App.initModulesOnce
		StreamOrchestrator:            nil, // Initialized in App.initModulesOnce
		MediastreamRepository:         nil, // Initialized in App.initModulesOnce
		DebridClientRepository:        nil, // Initialized in App.initModulesOnce
		DirectStreamManager:           nil, // Initialized in App.initModulesOnce
		LibraryExplorer:               nil, // Initialized in App.initModulesOnce
		TorrentClientRepository:       nil, // Initialized in App.InitOrRefreshModules
		previousVersion:               previousVersion,
		FeatureFlags:                  NewFeatureFlags(cfg, logger),
		IsDesktopSidecar:              configOpts.Flags.IsDesktopSidecar,
		SecondarySettings: struct {
			Mediastream   *models.MediastreamSettings
			Torrentstream *models.TorrentstreamSettings
			Debrid        *models.DebridSettings
		}{Mediastream: nil, Torrentstream: nil},
		moduleMu:                        sync.Mutex{},
		OnRefreshAnilistCollectionFuncs: result.NewMap[string, func()](),
		HookManager:                     hookManager,
		isOfflineRef:                    isOfflineRef,
		ServerPasswordHash:              serverPasswordHash,
	}

	provisionalApp = app

	// Initialize MAL Scrobbler DLQ Queue
	app.Metadata.MalScrobbler = mal.NewMalScrobblerWorker(database, logger)

	// Initialize modules that only need to be initialized once
	app.initModulesOnce()

	// Initialize all modules that depend on settings
	app.InitOrRefreshModules()

	// Initialize Anilist data if not in offline mode
	if !app.IsOffline() {
		app.InitOrRefreshAnilistData()
	} else {
		app.ServerReady = true
	}

	// Initialize mediastream settings (for streaming media)
	app.InitOrRefreshMediastreamSettings()

	// Initialize torrentstream settings (for torrent streaming)
	app.InitOrRefreshTorrentstreamSettings()

	// Initialize debrid settings (for debrid services)
	app.InitOrRefreshDebridSettings()

	// Run one-time initialization actions
	app.performActionsOnce()

	return app
}

func (a *KameHouse) IsOffline() bool {
	return a.isOfflineRef.Get()
}

func (a *KameHouse) IsOfflineRef() *util.Ref[bool] {
	return a.isOfflineRef
}

func (a *KameHouse) AddCleanupFunction(f func()) {
	a.Cleanups = append(a.Cleanups, f)
}
func (a *KameHouse) AddOnRefreshAnilistCollectionFunc(key string, f func()) {
	if key == "" {
		return
	}
	a.OnRefreshAnilistCollectionFuncs.Set(key, f)
}

func (a *KameHouse) Cleanup(ctx context.Context) {
	done := make(chan struct{})
	go func() {
		defer close(done)

		a.Logger.Info().Msg("app: Running cleanup functions...")
		for _, f := range a.Cleanups {
			f()
		}

		a.Logger.Info().Msg("app: Flushing buffered writer...")
		a.Database.Shutdown()

		a.Logger.Info().Msg("app: Closing database connection...")
		if err := a.Database.Close(); err != nil {
			a.Logger.Error().Err(err).Msg("app: Failed to close database connection")
		}
	}()

	select {
	case <-done:
		a.Logger.Info().Msg("app: Graceful shutdown completed cleanly")
	case <-ctx.Done():
		a.Logger.Warn().Msg("app: Shutdown timed out — forcing exit")
	}
}
