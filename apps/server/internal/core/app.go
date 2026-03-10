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
	discordrpc_presence "kamehouse/internal/discordrpc/presence"
	"kamehouse/internal/doh"
	"kamehouse/internal/events"
	"kamehouse/internal/extension"
	"kamehouse/internal/extension_playground"
	"kamehouse/internal/extension_repo"
	"kamehouse/internal/hook"
	"kamehouse/internal/jellyfin"
	"kamehouse/internal/library/autodownloader"
	"kamehouse/internal/library/autoscanner"
	"kamehouse/internal/library/fillermanager"
	"kamehouse/internal/library/scanner"
	"kamehouse/internal/library_explorer"
	"kamehouse/internal/local"
	"kamehouse/internal/manga"
	"kamehouse/internal/mediastream"
	"kamehouse/internal/nakama"
	"kamehouse/internal/onlinestream"
	"kamehouse/internal/platforms/anilist_platform"
	"kamehouse/internal/platforms/offline_platform"
	"kamehouse/internal/platforms/platform"
	"kamehouse/internal/platforms/simulated_platform"
	"kamehouse/internal/playlist"
	"kamehouse/internal/report"
	"kamehouse/internal/torrent_clients/torrent_client"
	"kamehouse/internal/torrents/torrent"
	"kamehouse/internal/torrentstream"
	"kamehouse/internal/updater"
	"kamehouse/internal/user"
	"kamehouse/internal/util"
	"kamehouse/internal/util/filecache"
	"kamehouse/internal/util/result"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"sync"

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

	Antigravity struct {
		// Core
		Config   *Config
		Database *db.Database
		Logger   *zerolog.Logger

		// Torrent and debrid services
		TorrentClientRepository *torrent_client.Repository
		TorrentRepository       *torrent.Repository
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

		// Extensions
		ExtensionRepository           *extension_repo.Repository
		ExtensionBankRef              *util.Ref[*extension.UnifiedBank]
		ExtensionPlaygroundRepository *extension_playground.PlaygroundRepository

		// Streaming
		DirectStreamManager     *directstream.Manager
		OnlinestreamRepository  *onlinestream.Repository
		MediastreamRepository   *mediastream.Repository
		TorrentstreamRepository *torrentstream.Repository

		// Manga services
		MangaRepository *manga.Repository
		MangaDownloader *manga.Downloader

		// Offline and local account
		LocalManager local.Manager

		// Utilities
		FileCacher       *filecache.Cacher
		Updater          *updater.Updater
		SelfUpdater      *updater.SelfUpdater
		ReportRepository *report.Repository

		// Integrations
		DiscordPresence *discordrpc_presence.Presence

		// Continuity and sync
		ContinuityManager *continuity.Manager

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

		// Plugin system
		HookManager hook.Manager

		// Features
		PlaylistManager *playlist.Manager
		LibraryExplorer *library_explorer.LibraryExplorer
		NakamaManager   *nakama.Manager

		// Show this version's tour on the frontend
		// Hydrated by migrations.go when there's a version change
		ShowTour string

		// Jellyfin integration
		JellyfinClient *jellyfin.Client
	}

	App = Antigravity
)

type AppOption func(*Antigravity)

func WithConfig(cfg *Config) AppOption            { return func(a *Antigravity) { a.Config = cfg } }
func WithLogger(logger *zerolog.Logger) AppOption { return func(a *Antigravity) { a.Logger = logger } }
func WithDatabase(db *db.Database) AppOption      { return func(a *Antigravity) { a.Database = db } }
func WithWSEventManager(ws *events.WSEventManager) AppOption {
	return func(a *Antigravity) { a.WSEventManager = ws }
}
func WithFlags(flags KameHouseFlags) AppOption { return func(a *Antigravity) { a.Flags = flags } }
func WithSelfUpdater(u *updater.SelfUpdater) AppOption {
	return func(a *Antigravity) { a.SelfUpdater = u }
}
func WithHookManager(hm hook.Manager) AppOption { return func(a *Antigravity) { a.HookManager = hm } }
func WithFileCacher(fc *filecache.Cacher) AppOption {
	return func(a *Antigravity) { a.FileCacher = fc }
}

func (a *Antigravity) GetJellyfinClient() *jellyfin.Client {
	return a.JellyfinClient
}

// NewApp creates a new server instance
func NewAntigravity(configOpts *ConfigOptions, selfupdater *updater.SelfUpdater) *App {

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

	// Initialize DNS-over-HTTPS service in background
	go doh.HandleDoH(cfg.Server.DoHUrl, logger)

	// Initialize file cache system for media and metadata
	fileCacher, err := filecache.NewCacher(cfg.Cache.Dir)
	if err != nil {
		logger.Fatal().Err(err).Msgf("app: Failed to initialize file cacher")
	}

	// Initialize the extension bank that will be shared across modules
	extensionBankRef := util.NewRef(extension.NewUnifiedBank())

	// Initialize extension repository
	extensionRepository := extension_repo.NewRepository(&extension_repo.NewRepositoryOptions{
		Logger:           logger,
		ExtensionDir:     cfg.Extensions.Dir,
		WSEventManager:   wsEventManager,
		FileCacher:       fileCacher,
		HookManager:      hookManager,
		ExtensionBankRef: extensionBankRef,
	})

	// Initialize metadata provider for media information
	metadataProvider := metadata_provider.NewProvider(&metadata_provider.NewProviderImplOptions{
		Logger:           logger,
		FileCacher:       fileCacher,
		Database:         database,
		ExtensionBankRef: extensionBankRef,
	})

	// Set initial metadata provider (will change if offline mode is enabled)
	activeMetadataProvider := metadataProvider

	// Initialize manga repository
	mangaRepository := manga.NewRepository(&manga.NewRepositoryOptions{
		Logger:           logger,
		FileCacher:       fileCacher,
		CacheDir:         cfg.Cache.Dir,
		ServerURI:        cfg.GetServerURI(),
		WsEventManager:   wsEventManager,
		DownloadDir:      cfg.Manga.DownloadDir,
		Database:         database,
		ExtensionBankRef: extensionBankRef,
	})

	// Initialize Anilist platform
	anilistPlatform := anilist_platform.NewAnilistPlatform(anilistCWRef, extensionBankRef, logger, database)

	activePlatformRef := util.NewRef[platform.Platform](anilistPlatform)
	metadataProviderRef := util.NewRef[metadata_provider.Provider](activeMetadataProvider)

	// Initialize sync manager for offline/online synchronization
	localManager, err := local.NewManager(&local.NewManagerOptions{
		LocalDir:            cfg.Offline.Dir,
		AssetDir:            cfg.Offline.AssetDir,
		Logger:              logger,
		MetadataProviderRef: metadataProviderRef,
		MangaRepository:     mangaRepository,
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
	simulatedPlatform, err := simulated_platform.NewSimulatedPlatform(localManager, anilistCWRef, extensionBankRef, logger, database)
	if err != nil {
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

	// Initialize online streaming repository

	// Create a provisional ref for Continuity Manager that will be hydrated in initModulesOnce
	continuityManagerRef := util.NewRef[any](nil)

	onlinestreamRepository := onlinestream.NewRepository(&onlinestream.NewRepositoryOptions{
		Logger:              logger,
		FileCacher:          fileCacher,
		MetadataProviderRef: metadataProviderRef,
		PlatformRef:         activePlatformRef,
		ContinuityManager:   continuityManagerRef,
		Database:            database,
		ExtensionBankRef:    extensionBankRef,
	})

	// Initialize extension playground for testing extensions
	extensionPlaygroundRepository := extension_playground.NewPlaygroundRepository(logger, activePlatformRef, metadataProviderRef)

	// Create the main app instance with initialized components
	app := &Antigravity{
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
		AnilistCacheDir:               anilistCacheDir,
		Logger:                        logger,
		Version:                       constants.Version,
		Updater:                       updater.New(constants.Version, logger, wsEventManager),
		FileCacher:                    fileCacher,
		OnlinestreamRepository:        onlinestreamRepository,
		MangaRepository:               mangaRepository,
		ExtensionRepository:           extensionRepository,
		ExtensionBankRef:              extensionBankRef,
		ExtensionPlaygroundRepository: extensionPlaygroundRepository,
		ReportRepository:              report.NewRepository(logger),
		TorrentRepository:             nil, // Initialized in App.initModulesOnce
		FillerManager:                 nil, // Initialized in App.initModulesOnce
		MangaDownloader:               nil, // Initialized in App.initModulesOnce
		AutoDownloader:                nil, // Initialized in App.initModulesOnce
		AutoScanner:                   nil, // Initialized in App.initModulesOnce
		MediastreamRepository:         nil, // Initialized in App.initModulesOnce
		TorrentstreamRepository:       nil, // Initialized in App.initModulesOnce
		ContinuityManager:             nil, // Initialized in App.initModulesOnce
		DebridClientRepository:        nil, // Initialized in App.initModulesOnce
		DirectStreamManager:           nil, // Initialized in App.initModulesOnce
		NakamaManager:                 nil, // Initialized in App.initModulesOnce
		LibraryExplorer:               nil, // Initialized in App.initModulesOnce
		TorrentClientRepository:       nil, // Initialized in App.InitOrRefreshModules
		DiscordPresence:               nil, // Initialized in App.InitOrRefreshModules
		previousVersion:               previousVersion,
		FeatureFlags:                  NewFeatureFlags(cfg, logger),
		IsDesktopSidecar:              configOpts.Flags.IsDesktopSidecar,
		SecondarySettings: struct {
			Mediastream   *models.MediastreamSettings
			Torrentstream *models.TorrentstreamSettings
			Debrid        *models.DebridSettings
		}{Mediastream: nil, Torrentstream: nil},
		SelfUpdater:                     selfupdater,
		moduleMu:                        sync.Mutex{},
		OnRefreshAnilistCollectionFuncs: result.NewMap[string, func()](),
		HookManager:                     hookManager,
		isOfflineRef:                    isOfflineRef,
		ServerPasswordHash:              serverPasswordHash,
	}

	// Set the Manager into the ref for OnlineStreamRepository
	continuityManagerRef.Set(app.ContinuityManager)

	// Initialize MAL Scrobbler DLQ Queue
	app.Metadata.MalScrobbler = mal.NewMalScrobblerWorker(database, logger)

	// Run database migrations if version has changed
	app.runMigrations()

	// Initialize modules that only need to be initialized once
	app.initModulesOnce()

	if !app.IsOffline() {
		go app.Updater.FetchAnnouncements()
	}

	// Initialize all modules that depend on settings
	app.InitOrRefreshModules()

	// Load custom source extensions before fetching AniList data
	LoadCustomSourceExtensions(extensionRepository)

	// Initialize Anilist data if not in offline mode
	if !app.IsOffline() {
		app.InitOrRefreshAnilistData()
	} else {
		app.ServerReady = true
	}

	// Load the other extensions asynchronously
	go LoadExtensions(extensionRepository, logger, cfg)

	// Initialize mediastream settings (for streaming media)
	app.InitOrRefreshMediastreamSettings()

	// Initialize torrentstream settings (for torrent streaming)
	app.InitOrRefreshTorrentstreamSettings()

	// Initialize debrid settings (for debrid services)
	app.InitOrRefreshDebridSettings()

	// Register Nakama manager cleanup
	app.AddCleanupFunction(app.NakamaManager.Cleanup)

	// Run one-time initialization actions
	app.performActionsOnce()

	return app
}

func (a *Antigravity) IsOffline() bool {
	return a.isOfflineRef.Get()
}

func (a *Antigravity) IsOfflineRef() *util.Ref[bool] {
	return a.isOfflineRef
}

func (a *Antigravity) AddCleanupFunction(f func()) {
	a.Cleanups = append(a.Cleanups, f)
}
func (a *Antigravity) AddOnRefreshAnilistCollectionFunc(key string, f func()) {
	if key == "" {
		return
	}
	a.OnRefreshAnilistCollectionFuncs.Set(key, f)
}

func (a *Antigravity) Cleanup() {
	for _, f := range a.Cleanups {
		f()
	}
}
