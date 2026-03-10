package core

import (
	"context"
	"kamehouse/internal/api/anilist"
	"kamehouse/internal/continuity"
	"kamehouse/internal/database/db"

	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	debrid_client "kamehouse/internal/debrid/client"
	"kamehouse/internal/directstream"
	discordrpc_presence "kamehouse/internal/discordrpc/presence"
	"kamehouse/internal/events"
	"kamehouse/internal/hook"
	"kamehouse/internal/hook_resolver"
	"kamehouse/internal/jellyfin"
	"kamehouse/internal/library/autodownloader"
	"kamehouse/internal/library/autoscanner"
	"kamehouse/internal/library/fillermanager"
	"kamehouse/internal/library_explorer"
	"kamehouse/internal/manga"
	"kamehouse/internal/mediastream"
	"kamehouse/internal/nakama"
	"kamehouse/internal/notifier"
	"kamehouse/internal/platforms/shared_platform"
	"kamehouse/internal/playlist"
	"kamehouse/internal/torrent_clients/qbittorrent"
	"kamehouse/internal/torrent_clients/torrent_client"
	"kamehouse/internal/torrent_clients/transmission"
	"kamehouse/internal/torrents/torrent"
	"kamehouse/internal/torrentstream"
	"kamehouse/internal/user"

	"github.com/cli/browser"
	"github.com/rs/zerolog"
)

// initModulesOnce will initialize modules that need to persist.
// This function is called once after the App instance is created.
// The settings of these modules will be set/refreshed in InitOrRefreshModules.
func (a *App) initModulesOnce() {

	a.LocalManager.SetRefreshAnilistCollectionsFunc(func() {
		_, _ = a.RefreshAnimeCollection()
		_, _ = a.RefreshMangaCollection()
	})

	// +---------------------+
	// |     Discord RPC     |
	// +---------------------+

	a.DiscordPresence = discordrpc_presence.New(nil, a.Logger)
	a.AddCleanupFunction(func() {
		a.DiscordPresence.Close()
	})

	// +---------------------+
	// |       Filler        |
	// +---------------------+

	a.FillerManager = fillermanager.New(&fillermanager.NewFillerManagerOptions{
		DB:     a.Database,
		Logger: a.Logger,
	})

	// +---------------------+
	// |     Continuity      |
	// +---------------------+

	a.ContinuityManager = continuity.NewManager(&continuity.NewManagerOptions{
		FileCacher: a.FileCacher,
		Logger:     a.Logger,
		Database:   a.Database,
	})

	// +---------------------+
	// | Torrent Repository  |
	// +---------------------+

	a.TorrentRepository = torrent.NewRepository(&torrent.NewRepositoryOptions{
		Logger:              a.Logger,
		MetadataProviderRef: a.Metadata.ProviderRef,
		ExtensionBankRef:    a.ExtensionBankRef,
	})

	// +---------------------+
	// |  Manga Downloader   |
	// +---------------------+

	a.MangaDownloader = manga.NewDownloader(&manga.NewDownloaderOptions{
		Database:       a.Database,
		Logger:         a.Logger,
		WSEventManager: a.WSEventManager,
		DownloadDir:    a.Config.Manga.DownloadDir,
		Repository:     a.MangaRepository,
		IsOfflineRef:   a.IsOfflineRef(),
	})

	a.MangaDownloader.Start()

	// +---------------------+
	// |    Media Stream     |
	// +---------------------+

	a.MediastreamRepository = mediastream.NewRepository(&mediastream.NewRepositoryOptions{
		Logger:         a.Logger,
		WSEventManager: a.WSEventManager,
		FileCacher:     a.FileCacher,
	})

	a.AddCleanupFunction(func() {
		a.MediastreamRepository.OnCleanup()
	})

	// NativePlayer and VideoCore have been removed

	// +---------------------+
	// |   Direct Stream     |
	// +---------------------+

	a.DirectStreamManager = directstream.NewManager(directstream.NewManagerOptions{
		Logger:              a.Logger,
		WSEventManager:      a.WSEventManager,
		ContinuityManager:   a.ContinuityManager,
		MetadataProviderRef: a.Metadata.ProviderRef,
		DiscordPresence:     a.DiscordPresence,
		PlatformRef:         a.Metadata.AnilistPlatformRef,
		RefreshAnimeCollectionFunc: func() {
			_, _ = a.RefreshAnimeCollection()
		},
		IsOfflineRef: a.IsOfflineRef(),
		NativePlayer: nil,
		VideoCore:    nil,
	})

	// +---------------------+
	// |   Torrent Stream    |
	// +---------------------+

	a.TorrentstreamRepository = torrentstream.NewRepository(&torrentstream.NewRepositoryOptions{
		Logger:              a.Logger,
		BaseAnimeCache:      anilist.NewBaseAnimeCache(),
		CompleteAnimeCache:  anilist.NewCompleteAnimeCache(),
		MetadataProviderRef: a.Metadata.ProviderRef,
		TorrentRepository:   a.TorrentRepository,
		PlatformRef:         a.Metadata.AnilistPlatformRef,
		WSEventManager:      a.WSEventManager,
		Database:            a.Database,
		DirectStreamManager: a.DirectStreamManager,
		NativePlayer:        nil,
	})

	// +---------------------+
	// | Debrid Client Repo  |
	// +---------------------+

	a.DebridClientRepository = debrid_client.NewRepository(&debrid_client.NewRepositoryOptions{
		Logger:              a.Logger,
		WSEventManager:      a.WSEventManager,
		Database:            a.Database,
		MetadataProviderRef: a.Metadata.ProviderRef,
		PlatformRef:         a.Metadata.AnilistPlatformRef,
		TorrentRepository:   a.TorrentRepository,
		DirectStreamManager: a.DirectStreamManager,
	})

	// +---------------------+
	// |   Auto Downloader   |
	// +---------------------+

	a.AutoDownloader = autodownloader.New(&autodownloader.NewAutoDownloaderOptions{
		Logger:                  a.Logger,
		TorrentClientRepository: a.TorrentClientRepository,
		TorrentRepository:       a.TorrentRepository,
		Database:                a.Database,
		WSEventManager:          a.WSEventManager,
		MetadataProviderRef:     a.Metadata.ProviderRef,
		DebridClientRepository:  a.DebridClientRepository,
		IsOfflineRef:            a.IsOfflineRef(),
	})

	// This is run in a goroutine
	a.AutoDownloader.Start()

	// +---------------------+
	// |   Predictive Cache  |
	// +---------------------+

	hook.GlobalHookManager.OnPredictiveCacheEpisodeRequested().BindFunc(func(resolver hook_resolver.Resolver) error {
		event := resolver.(*continuity.PredictiveCacheEpisodeRequestedEvent)
		a.Logger.Info().Int("mediaId", event.MediaId).Int("episode", event.EpisodeNumber).Msg("app: Received predictive cache request")
		go func() {
			// Find rules that match this media ID
			rules, err := db.GetAutoDownloaderRules(a.Database)
			if err != nil {
				return
			}
			var ruleIDs []uint
			for _, r := range rules {
				// Fire a check for rules that match this Media Id
				if r.MediaId == event.MediaId && r.Enabled {
					ruleIDs = append(ruleIDs, r.DbID)
				}
			}
			if len(ruleIDs) > 0 {
				a.AutoDownloader.RunCheck(context.Background(), false, ruleIDs...)
			}
		}()
		return event.Next()
	})

	// +---------------------+
	// |    Auto Scanner     |
	// +---------------------+

	a.AutoScanner = autoscanner.New(&autoscanner.NewAutoScannerOptions{
		Database:            a.Database,
		PlatformRef:         a.Metadata.AnilistPlatformRef,
		Logger:              a.Logger,
		WSEventManager:      a.WSEventManager,
		Enabled:             false, // Will be set in InitOrRefreshModules
		AutoDownloader:      a.AutoDownloader,
		MetadataProviderRef: a.Metadata.ProviderRef,
		LogsDir:             a.Config.Logs.Dir,
		OnRefreshCollection: func() {
			go func() {
				_, _ = a.RefreshAnimeCollection()
			}()
		},
	})

	// This is run in a goroutine
	a.AutoScanner.Start()

	// +---------------------+
	// |       Nakama        |
	// +---------------------+

	a.NakamaManager = nakama.NewManager(&nakama.NewManagerOptions{
		Logger:                  a.Logger,
		WSEventManager:          a.WSEventManager,
		TorrentstreamRepository: a.TorrentstreamRepository,
		DebridClientRepository:  a.DebridClientRepository,
		PlatformRef:             a.Metadata.AnilistPlatformRef,
		ServerHost:              a.Config.Server.Host,
		ServerPort:              a.Config.Server.Port,
		NativePlayer:            nil,
		VideoCore:               nil,
		DirectStreamManager:     a.DirectStreamManager,
		IsOfflineRef:            a.IsOfflineRef(),
	})

	// +---------------------+
	// |      Playlist       |
	// +---------------------+

	a.PlaylistManager = playlist.NewManager(&playlist.NewManagerOptions{
		TorrentstreamRepository: a.TorrentstreamRepository,
		DebridClientRepository:  a.DebridClientRepository,
		DirectStreamManager:     a.DirectStreamManager,
		PlatformRef:             a.Metadata.AnilistPlatformRef,
		WSEventManager:          a.WSEventManager,
		NakamaManager:           a.NakamaManager,
		NativePlayer:            nil,
		Database:                a.Database,
		Logger:                  a.Logger,
	})

	// +---------------------+
	// |   Anime Library     |
	// +---------------------+
	a.LibraryExplorer = library_explorer.NewLibraryExplorer(library_explorer.NewLibraryExplorerOptions{
		PlatformRef: a.Metadata.AnilistPlatformRef,
		Logger:      a.Logger,
		Database:    a.Database,
	})

}

// HandleNewDatabaseEntries initializes essential database collections.
// It creates an empty local files collection if one does not already exist.
func HandleNewDatabaseEntries(database *db.Database, logger *zerolog.Logger) {

	// Create initial empty local files collection if none exists
	if _, _, err := db.GetLocalFiles(database); err != nil {
		_, err := db.InsertLocalFiles(database, make([]*dto.LocalFile, 0))
		if err != nil {
			logger.Fatal().Err(err).Msgf("app: Failed to initialize local files in the database")
		}
	}

}

// InitOrRefreshModules will initialize or refresh modules that depend on settings.
// This function is called:
//   - After the App instance is created
//   - After settings are updated.
//
// DEVNOTE: Make sure there's no blocking code in this function.
func (a *App) InitOrRefreshModules() {
	a.moduleMu.Lock()
	defer a.moduleMu.Unlock()

	a.Logger.Debug().Msgf("app: Refreshing modules")

	// Stop watching if already watching
	if a.Watcher != nil {
		a.Watcher.StopWatching()
	}

	// If Discord presence is already initialized, close it
	if a.DiscordPresence != nil {
		a.DiscordPresence.Close()
	}

	// Get settings from database
	settings, err := a.Database.GetSettings()
	if err != nil || settings == nil {
		a.Logger.Warn().Msg("app: Did not initialize modules, no settings found")
		return
	}

	a.Settings = settings // Store settings instance in app
	if settings.Library != nil {
		a.LibraryDir = settings.GetLibrary().LibraryPath

		// Update feature toggles from settings
		a.FeatureManager.UpdateFromSettings(settings.Library)

		if a.Metadata.ProviderRef.IsPresent() {
			a.Metadata.ProviderRef.Get().SetUseFallbackProvider(settings.GetLibrary().UseFallbackMetadataProvider)
		}
	}

	if settings.Anilist != nil {
		shared_platform.ShouldCache.Store(!settings.Anilist.DisableCacheLayer)
	}

	// +---------------------+
	// |   Module settings   |
	// +---------------------+
	// Refresh settings of modules that were initialized in initModulesOnce

	notifier.GlobalNotifier.SetSettings(a.Config.Data.AppDataDir, a.Settings.GetNotifications(), a.Logger)

	// Refresh updater settings
	if settings.Library != nil {
		// Refreshed plugin context removed

		if a.Updater != nil {
			a.Updater.SetEnabled(true)
		}

		// Refresh auto scanner settings (thread safe)
		if a.AutoScanner != nil {
			go a.AutoScanner.SetSettings(*settings.Library)
		}

		// Update the torrent manager settings (thread safe)
		go a.TorrentRepository.SetSettings(&torrent.RepositorySettings{
			DefaultAnimeProvider: settings.Library.TorrentProvider,
			AutoSelectProvider:   settings.Library.AutoSelectTorrentProvider,
		})

		if a.LibraryExplorer != nil {
			// Update the library paths for the library explorer (thread safe)
			go a.LibraryExplorer.SetLibraryPaths(settings.GetLibrary().GetLibraryPaths())
		}

		// Initialize Jellyfin client if enabled
		if settings.Jellyfin != nil && settings.Jellyfin.Enabled && settings.Jellyfin.ServerURL != "" && settings.Jellyfin.ApiKey != "" {
			a.JellyfinClient = jellyfin.NewClient(settings.Jellyfin.ServerURL, settings.Jellyfin.ApiKey, settings.Jellyfin.Username, a.Logger)
		} else {
			a.JellyfinClient = nil
		}
	}

	// +---------------------+
	// |       Torrents      |
	// +---------------------+

	if settings.Torrent != nil {
		// Init qBittorrent
		qbit := qbittorrent.NewClient(&qbittorrent.NewClientOptions{
			Logger:   a.Logger,
			Username: settings.Torrent.QBittorrentUsername,
			Password: settings.Torrent.QBittorrentPassword,
			Port:     settings.Torrent.QBittorrentPort,
			Host:     settings.Torrent.QBittorrentHost,
			Path:     settings.Torrent.QBittorrentPath,
			Tags:     settings.Torrent.QBittorrentTags,
			Category: settings.Torrent.QBittorrentCategory,
		})
		// Login to qBittorrent
		go func() {
			if settings.Torrent.Default == "qbittorrent" {
				if settings.Torrent.QBittorrentHost != "" {
					err = qbit.Login()
					if err != nil {
						a.Logger.Error().Err(err).Msg("app: Failed to login to qBittorrent")
					} else {
						a.Logger.Info().Msg("app: Logged in to qBittorrent")
					}
				} else {
					a.Logger.Warn().Msg("app: qBittorrent host is empty, skipping login")
				}
			}
		}()
		// Init Transmission
		trans, err := transmission.New(&transmission.NewTransmissionOptions{
			Logger:   a.Logger,
			Username: settings.Torrent.TransmissionUsername,
			Password: settings.Torrent.TransmissionPassword,
			Port:     settings.Torrent.TransmissionPort,
			Host:     settings.Torrent.TransmissionHost,
			Path:     settings.Torrent.TransmissionPath,
		})
		if err != nil && settings.Torrent.TransmissionUsername != "" && settings.Torrent.TransmissionPassword != "" { // Only log error if username and password are set
			a.Logger.Error().Err(err).Msg("app: Failed to initialize transmission client")
		}

		// Shutdown torrent client first
		if a.TorrentClientRepository != nil {
			a.TorrentClientRepository.Shutdown()
		}

		// Torrent Client Repository
		a.TorrentClientRepository = torrent_client.NewRepository(&torrent_client.NewRepositoryOptions{
			Logger:              a.Logger,
			QbittorrentClient:   qbit,
			Transmission:        trans,
			TorrentRepository:   a.TorrentRepository,
			Provider:            settings.Torrent.Default,
			MetadataProviderRef: a.Metadata.ProviderRef,
		})

		a.TorrentClientRepository.InitActiveTorrentCount(settings.Torrent.ShowActiveTorrentCount, a.WSEventManager)

		// Set AutoDownloader qBittorrent client
		a.AutoDownloader.SetTorrentClientRepository(a.TorrentClientRepository)

		// Refreshed plugin context removed
	} else {
		a.Logger.Warn().Msg("app: Did not initialize torrent client module, no settings found")
	}

	// +---------------------+
	// |   AutoDownloader    |
	// +---------------------+

	// Update Auto Downloader
	if settings.AutoDownloader != nil {
		go a.AutoDownloader.SetSettings(settings.AutoDownloader)
	}

	// +---------------------+
	// |   Library Watcher   |
	// +---------------------+

	// Initialize library watcher
	if settings.Library != nil && len(settings.Library.LibraryPath) > 0 {
		go a.initLibraryWatcher(settings.Library.GetLibraryPaths())
	}

	// +---------------------+
	// |       Discord       |
	// +---------------------+

	if settings.Discord != nil && a.DiscordPresence != nil {
		go a.DiscordPresence.SetSettings(settings.Discord)
	}

	// +---------------------+
	// |     Continuity      |
	// +---------------------+

	if settings.Library != nil {
		go a.ContinuityManager.SetSettings(&continuity.Settings{
			WatchContinuityEnabled: settings.Library.EnableWatchContinuity,
		})
	}

	if settings.Manga != nil {
		go a.MangaRepository.SetSettings(settings)
	}

	// +---------------------+
	// |       Nakama        |
	// +---------------------+

	if settings.Nakama != nil {
		go a.NakamaManager.SetSettings(settings.Nakama)
	}

	a.Logger.Info().Msg("app: Refreshed modules")

}

// InitOrRefreshMediastreamSettings will initialize or refresh the mediastream settings.
// It is called after the App instance is created and after settings are updated.
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
			TranscodeHwAccel:    "cpu",
			TranscodePreset:     "fast",
			PreTranscodeEnabled: false,
		})
		if err != nil {
			a.Logger.Error().Err(err).Msg("app: Failed to initialize mediastream module")
			return
		}
	}

	a.MediastreamRepository.InitializeModules(settings, a.Config.Cache.Dir, a.Config.Cache.TranscodeDir)

	// Cleanup cache
	go func() {
		if settings.TranscodeEnabled {
			// If transcoding is enabled, trim files
			_ = a.FileCacher.TrimMediastreamVideoFiles()
		} else {
			// If transcoding is disabled, clear all files
			_ = a.FileCacher.ClearMediastreamVideoFiles()
		}
	}()

	a.SecondarySettings.Mediastream = settings
}

// InitOrRefreshTorrentstreamSettings will initialize or refresh the mediastream settings.
// It is called after the App instance is created and after settings are updated.
func (a *App) InitOrRefreshTorrentstreamSettings() {

	var settings *models.TorrentstreamSettings
	var found bool
	settings, found = a.Database.GetTorrentstreamSettings()
	if !found {

		var err error
		settings, err = a.Database.UpsertTorrentstreamSettings(&models.TorrentstreamSettings{
			BaseModel: models.BaseModel{
				ID: 1,
			},
			Enabled:             false,
			AutoSelect:          true,
			PreferredResolution: "",
			DisableIPV6:         false,
			DownloadDir:         "",
			AddToLibrary:        false,
			TorrentClientHost:   "",
			TorrentClientPort:   43213,
			StreamingServerHost: "0.0.0.0",
			StreamingServerPort: 43214,
			IncludeInLibrary:    false,
			StreamUrlAddress:    "",
			SlowSeeding:         false,
			PreloadNextStream:   false,
		})
		if err != nil {
			a.Logger.Error().Err(err).Msg("app: Failed to initialize mediastream module")
			return
		}
	}

	err := a.TorrentstreamRepository.InitModules(settings, a.Config.Server.Host, a.Config.Server.Port)
	if err != nil && settings.Enabled {
		a.Logger.Error().Err(err).Msg("app: Failed to initialize Torrent streaming module")
		//_, _ = a.Database.UpsertTorrentstreamSettings(&models.TorrentstreamSettings{
		//	BaseModel: models.BaseModel{
		//		ID: 1,
		//	},
		//	Enabled: false,
		//})
	}

	a.Cleanups = append(a.Cleanups, func() {
		a.TorrentstreamRepository.Shutdown()
	})

	// Set torrent streaming settings in secondary settings
	// so the client can use them
	a.SecondarySettings.Torrentstream = settings
}

func (a *App) InitOrRefreshDebridSettings() {

	settings, found := a.Database.GetDebridSettings()
	if !found {

		var err error
		settings, err = a.Database.UpsertDebridSettings(&models.DebridSettings{
			BaseModel: models.BaseModel{
				ID: 1,
			},
			Enabled:                      false,
			Provider:                     "",
			ApiKey:                       "",
			IncludeDebridStreamInLibrary: false,
			StreamAutoSelect:             false,
			StreamPreferredResolution:    "",
		})
		if err != nil {
			a.Logger.Error().Err(err).Msg("app: Failed to initialize debrid module")
			return
		}
	}

	a.SecondarySettings.Debrid = settings

	err := a.DebridClientRepository.InitializeProvider(settings)
	if err != nil {
		a.Logger.Error().Err(err).Msg("app: Failed to initialize debrid provider")
		return
	}
}

// InitOrRefreshAnilistData will initialize the Anilist anime collection and the account.
// This function should be called after App.Database is initialized and after settings are updated.
func (a *App) InitOrRefreshAnilistData() {
	a.Logger.Debug().Msg("app: Fetching Anilist data")

	var currUser *user.User
	acc, err := a.Database.GetAccount()
	if err != nil || acc.Username == "" {
		a.ServerReady = true
		currUser = user.NewSimulatedUser() // Create a simulated user if no account is found
	} else {
		currUser, err = user.NewUser(acc)
		if err != nil {
			a.Logger.Error().Err(err).Msg("app: Failed to create user from account")
			return
		}
	}

	a.user = currUser

	// Set username to Anilist platform
	a.Metadata.AnilistPlatformRef.Get().SetUsername(currUser.Viewer.Name)

	a.Logger.Info().Msg("app: Authenticated to AniList")

	go func() {
		_, err = a.RefreshAnimeCollection()
		if err != nil {
			a.Logger.Error().Err(err).Msg("app: Failed to fetch Anilist anime collection")
		}

		a.ServerReady = true
		a.WSEventManager.SendEvent(events.ServerReady, nil)

		_, err = a.RefreshMangaCollection()
		if err != nil {
			a.Logger.Error().Err(err).Msg("app: Failed to fetch Anilist manga collection")
		}
	}()

	go func(username string) {
		a.DiscordPresence.SetUsername(username)
	}(currUser.Viewer.Name)

	a.Logger.Info().Msg("app: Fetched Anilist data")
}

func (a *App) performActionsOnce() {

	go func() {
		if a.Settings == nil || a.Settings.Library == nil {
			return
		}

		if a.Settings.GetLibrary().OpenWebURLOnStart {
			// Open the web URL
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
				a.AutoScanner.RunNow()
				a.Logger.Info().Msg("app: Refreshed library")
			}()
		}

		if a.Settings.GetLibrary().OpenTorrentClientOnStart && a.TorrentClientRepository != nil {
			// Start the torrent client
			ok := a.TorrentClientRepository.Start()
			if !ok {
				a.Logger.Warn().Msg("app: Failed to open torrent client")
			} else {
				a.Logger.Info().Msg("app: Started torrent client")
			}

		}
	}()

}
