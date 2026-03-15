package handlers

import (
	"kamehouse/internal/core"
	util "kamehouse/internal/util/proxies"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/rs/zerolog"
	"github.com/ziflex/lecho/v3"
)

type Handler struct {
	App *core.App
}

func InitRoutes(app *core.App, e *echo.Echo) {
	allowedOriginsStr := os.Getenv("KAMEHOUSE_CORS_ALLOWED_ORIGINS")
	var allowedOrigins []string
	if allowedOriginsStr != "" {
		for _, o := range strings.Split(allowedOriginsStr, ",") {
			allowedOrigins = append(allowedOrigins, strings.TrimSpace(o))
		}
	} else if os.Getenv("DEV_MODE") == "true" {
		allowedOrigins = []string{"*"}
	} else {
		allowedOrigins = []string{"http://localhost", "http://127.0.0.1"}
	}

	// CORS — includes byte-range headers required by the web video player
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: allowedOrigins,
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions, http.MethodHead},
		AllowHeaders: []string{
			"Origin", "Content-Type", "Accept", "Cookie", "Authorization",
			// Byte-range streaming — without these the browser cannot seek in video
			"Range", "Accept-Ranges", "Content-Range", "If-Range",
			// App-specific auth headers
			"X-KameHouse-Token", "X-KameHouse-Nakama-Token", "X-KameHouse-Nakama-Username",
			"X-KameHouse-Nakama-Server-Version", "X-KameHouse-Nakama-Peer-Id",
		},
		// ExposeHeaders lets the browser READ these headers from streaming responses
		ExposeHeaders: []string{
			"Accept-Ranges", "Content-Range", "Content-Length", "Content-Disposition",
		},
		AllowCredentials: true,
	}))

	// Delegate to the canonical error handler defined in response.go.
	e.HTTPErrorHandler = CustomHTTPErrorHandler

	lechoLogger := lecho.From(*app.Logger)

	urisToSkip := []string{
		"/internal/metrics",
		"/_next",
		"/icons",
		"/events",
		"/api/v1/image-proxy",
		"/api/v1/mediastream/transcode/",
		"/api/v1/torrent-client/list",
		"/api/v1/proxy",
		"/api/v1/directstream/stream",
	}

	// Logging middleware
	e.Use(lecho.Middleware(lecho.Config{
		Logger: lechoLogger,
		Skipper: func(c echo.Context) bool {
			path := c.Request().URL.RequestURI()
			if filepath.Ext(c.Request().URL.Path) == ".txt" ||
				filepath.Ext(c.Request().URL.Path) == ".png" ||
				filepath.Ext(c.Request().URL.Path) == ".ico" {
				return true
			}
			for _, uri := range urisToSkip {
				if uri == path || strings.HasPrefix(path, uri) {
					return true
				}
			}
			return false
		},
		Enricher: func(c echo.Context, logger zerolog.Context) zerolog.Context {
			// Add which file the request came from
			return logger.Str("file", c.Path())
		},
	}))

	// Recovery middleware
	e.Use(middleware.Recover())

	// Client ID middleware
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Check if the client has a UUID cookie
			cookie, err := c.Cookie("KameHouse-Client-Id")

			if err != nil || cookie.Value == "" {
				// Generate a new UUID for the client
				u := uuid.New().String()

				// Create a cookie with the UUID
				newCookie := new(http.Cookie)
				newCookie.Name = "KameHouse-Client-Id"
				newCookie.Value = u
				newCookie.HttpOnly = false // Make the cookie accessible via JS
				newCookie.Expires = time.Now().Add(24 * time.Hour)
				newCookie.Path = "/"
				newCookie.Domain = ""
				newCookie.SameSite = http.SameSiteDefaultMode
				newCookie.Secure = false

				// Set the cookie
				c.SetCookie(newCookie)

				// Store the UUID in the context for use in the request
				c.Set("KameHouse-Client-Id", u)
			} else {
				// Store the existing UUID in the context for use in the request
				c.Set("KameHouse-Client-Id", cookie.Value)
			}

			return next(c)
		}
	})

	e.Use(headMethodMiddleware)

	h := &Handler{
		App: app,
	}

	v1 := e.Group("/api/v1")
	v1.GET("/events", h.webSocketEventHandler)
	v1.GET("/ws", h.webSocketEventHandler) // alias consumed by the web/native clients

	//
	// Auth middleware
	//
	v1.Use(h.OptionalAuthMiddleware)
	v1.Use(h.FeaturesMiddleware)

	imageProxy := &util.ImageProxy{}
	v1.GET("/image-proxy", imageProxy.ProxyImage)

	v1.GET("/internal/docs", h.HandleGetDocs)

	v1.GET("/proxy", h.VideoProxy)
	v1.HEAD("/proxy", h.VideoProxy)

	v1.GET("/status", h.HandleGetStatus)
	v1.GET("/status/home-items", h.HandleGetHomeItems)
	v1.POST("/status/home-items", h.HandleUpdateHomeItems)

	// Curated home swimlanes driven by backend intelligence
	v1.GET("/home/curated", h.HandleGetHomeCurated)
	v1.GET("/home/continue-watching", h.HandleGetContinueWatching)

	// Unified stream resolver (Local → Torrentio priority chain)
	v1.GET("/resolver/streams", h.HandleResolveStreams)

	v1.GET("/log/*", h.HandleGetLogContent)
	v1.GET("/logs/filenames", h.HandleGetLogFilenames)
	v1.DELETE("/logs", h.HandleDeleteLogs)
	v1.GET("/logs/latest", h.HandleGetLatestLogContent)

	v1.GET("/memory/stats", h.HandleGetMemoryStats)
	v1.GET("/memory/profile", h.HandleGetMemoryProfile)
	v1.GET("/memory/goroutine", h.HandleGetGoRoutineProfile)
	v1.GET("/memory/cpu", h.HandleGetCPUProfile)
	v1.POST("/memory/gc", h.HandleForceGC)

	v1.POST("/announcements", h.HandleGetAnnouncements)

	// Auth
	v1.POST("/auth/login", h.HandleLogin)
	v1.POST("/auth/logout", h.HandleLogout)

	// Settings
	v1.GET("/settings", h.HandleGetSettings)
	v1.PATCH("/settings", h.HandleSaveSettings)
	v1.POST("/start", h.HandleGettingStarted)
	v1.PATCH("/settings/auto-downloader", h.HandleSaveAutoDownloaderSettings)
	v1.PATCH("/settings/media-player", h.HandleSaveMediaPlayerSettings)

	// Auto Downloader
	v1.POST("/auto-downloader/run", h.HandleRunAutoDownloader)
	v1.POST("/auto-downloader/run/simulation", h.HandleRunAutoDownloaderSimulation)
	v1.GET("/auto-downloader/rule/:id", h.HandleGetAutoDownloaderRule)
	v1.GET("/auto-downloader/rule/anime/:id", h.HandleGetAutoDownloaderRulesByAnime)
	v1.GET("/auto-downloader/rules", h.HandleGetAutoDownloaderRules)
	v1.POST("/auto-downloader/rule", h.HandleCreateAutoDownloaderRule)
	v1.PATCH("/auto-downloader/rule", h.HandleUpdateAutoDownloaderRule)
	v1.DELETE("/auto-downloader/rule/:id", h.HandleDeleteAutoDownloaderRule)

	v1.GET("/auto-downloader/items", h.HandleGetAutoDownloaderItems)
	v1.DELETE("/auto-downloader/item", h.HandleDeleteAutoDownloaderItem)

	v1.GET("/auto-downloader/profiles", h.HandleGetAutoDownloaderProfiles)
	v1.GET("/auto-downloader/profile/:id", h.HandleGetAutoDownloaderProfile)
	v1.POST("/auto-downloader/profile", h.HandleCreateAutoDownloaderProfile)
	v1.PATCH("/auto-downloader/profile", h.HandleUpdateAutoDownloaderProfile)
	v1.DELETE("/auto-downloader/profile/:id", h.HandleDeleteAutoDownloaderProfile)

	// Other
	v1.POST("/test-dump", h.HandleTestDump)

	v1.POST("/directory-selector", h.HandleDirectorySelector)

	v1.POST("/open-in-explorer", h.HandleOpenInExplorer)

	//
	// AniList
	//

	v1Anilist := v1.Group("/anilist")

	v1Anilist.GET("/collection", h.HandleGetAnimeCollection)
	v1Anilist.POST("/collection", h.HandleGetAnimeCollection)

	v1Anilist.GET("/collection/raw", h.HandleGetRawAnimeCollection)
	v1Anilist.POST("/collection/raw", h.HandleGetRawAnimeCollection)

	v1Anilist.GET("/media-details/:id", h.HandleGetAnilistAnimeDetails)

	v1Anilist.GET("/studio-details/:id", h.HandleGetAnilistStudioDetails)

	v1Anilist.POST("/list-entry", h.HandleEditAnilistListEntry)

	v1Anilist.DELETE("/list-entry", h.HandleDeleteAnilistListEntry)

	v1Anilist.POST("/list-anime", h.HandleAnilistListAnime)

	v1Anilist.POST("/list-recent-anime", h.HandleAnilistListRecentAiringAnime)

	v1Anilist.GET("/list-missed-sequels", h.HandleAnilistListMissedSequels)

	v1Anilist.GET("/stats", h.HandleGetAniListStats)

	v1Anilist.GET("/cache-layer/status", h.HandleGetAnilistCacheLayerStatus)

	v1Anilist.POST("/cache-layer/status", h.HandleToggleAnilistCacheLayerStatus)

	//
	// MAL
	//

	v1.POST("/mal/auth", h.HandleMALAuth)
	v1.POST("/mal/list-entry/progress", h.HandleEditMALListEntryProgress)
	v1.POST("/mal/logout", h.HandleMALLogout)

	//
	// Local
	//

	v1Local := v1.Group("/local")

	v1Local.POST("/offline", h.HandleSetOfflineMode)

	v1Local.GET("/track", h.HandleLocalGetTrackedMediaItems)
	v1Local.POST("/track", h.HandleLocalAddTrackedMedia)
	v1Local.DELETE("/track", h.HandleLocalRemoveTrackedMedia)
	v1Local.GET("/track/:id/:type", h.HandleLocalGetIsMediaTracked)

	v1Local.POST("/local", h.HandleLocalSyncData)
	v1Local.GET("/queue", h.HandleLocalGetSyncQueueState)
	v1Local.POST("/anilist", h.HandleLocalSyncAnilistData)
	v1Local.POST("/updated", h.HandleLocalSetHasLocalChanges)
	v1Local.GET("/updated", h.HandleLocalGetHasLocalChanges)
	v1Local.GET("/storage/size", h.HandleLocalGetLocalStorageSize)
	v1Local.POST("/sync-simulated-to-anilist", h.HandleLocalSyncSimulatedDataToAnilist)

	//
	// Library
	//

	v1Library := v1.Group("/library")

	v1Library.POST("/scan", h.HandleScanLocalFiles)

	v1Library.DELETE("/empty-directories", h.HandleRemoveEmptyDirectories)

	v1Library.GET("/local-files", h.HandleGetLocalFiles)
	v1Library.POST("/local-files", h.HandleLocalFileBulkAction)
	v1Library.PATCH("/local-files", h.HandleUpdateLocalFiles)
	v1Library.DELETE("/local-files", h.HandleDeleteLocalFiles)
	v1Library.GET("/local-files/dump", h.HandleDumpLocalFilesToFile)
	v1Library.POST("/local-files/import", h.HandleImportLocalFiles)
	v1Library.PATCH("/local-file", h.HandleUpdateLocalFileData)
	v1Library.PATCH("/local-files/super-update", h.HandleSuperUpdateLocalFiles)

	v1Library.GET("/collection", h.HandleGetLibraryCollection)
	v1Library.GET("/schedule", h.HandleGetAnimeCollectionSchedule)

	v1Library.GET("/scan-summaries", h.HandleGetScanSummaries)

	v1Library.GET("/missing-episodes", h.HandleGetMissingEpisodes)
	v1Library.GET("/upcoming-episodes", h.HandleGetUpcomingEpisodes)

	v1Library.GET("/anime-entry/:id", h.HandleGetAnimeEntry)
	v1Library.POST("/anime-entry/suggestions", h.HandleFetchAnimeEntrySuggestions)
	v1Library.POST("/anime-entry/manual-match", h.HandleAnimeEntryManualMatch)
	v1Library.PATCH("/anime-entry/bulk-action", h.HandleAnimeEntryBulkAction)
	v1Library.POST("/anime-entry/open-in-explorer", h.HandleOpenAnimeEntryInExplorer)
	v1Library.POST("/anime-entry/update-progress", h.HandleUpdateAnimeEntryProgress)
	v1Library.POST("/anime-entry/update-repeat", h.HandleUpdateAnimeEntryRepeat)
	v1Library.GET("/anime-entry/silence/:id", h.HandleGetAnimeEntrySilenceStatus)
	v1Library.POST("/anime-entry/silence", h.HandleToggleAnimeEntrySilenceStatus)

	v1Library.POST("/unknown-media", h.HandleAddUnknownMedia)

	//
	// Library Explorer
	//
	v1LibraryExplorer := v1Library.Group("/explorer")

	v1LibraryExplorer.GET("/file-tree", h.HandleGetLibraryExplorerFileTree)
	v1LibraryExplorer.POST("/file-tree/refresh", h.HandleRefreshLibraryExplorerFileTree)
	v1LibraryExplorer.POST("/directory-children", h.HandleLoadLibraryExplorerDirectoryChildren)

	//
	// Anime
	//
	v1.GET("/anime/episode-collection/:id", h.HandleGetAnimeEpisodeCollection)

	//
	// Torrent / Torrent Client
	//

	v1.POST("/torrent/search", h.HandleSearchTorrent)
	v1.POST("/torrent-client/download", h.HandleTorrentClientDownload)
	v1.GET("/torrent-client/list", h.HandleGetActiveTorrentList)
	v1.POST("/torrent-client/action", h.HandleTorrentClientAction)
	v1.POST("/torrent-client/get-files", h.HandleTorrentClientGetFiles)
	v1.POST("/torrent-client/rule-magnet", h.HandleTorrentClientAddMagnetFromRule)

	//
	// Auto Select
	//

	v1.GET("/auto-select/profile", h.HandleGetAutoSelectProfile)
	v1.POST("/auto-select/profile", h.HandleSaveAutoSelectProfile)
	v1.DELETE("/auto-select/profile", h.HandleDeleteAutoSelectProfile)

	//
	// Download
	//

	v1.POST("/download-torrent-file", h.HandleDownloadTorrentFile)

	//
	// Updates
	//

	v1.GET("/latest-update", h.HandleGetLatestUpdate)
	v1.GET("/changelog", h.HandleGetChangelog)
	v1.POST("/install-update", h.HandleInstallLatestUpdate)
	v1.POST("/download-release", h.HandleDownloadRelease)
	v1.POST("/download-mac-denshi-update", h.HandleDownloadMacDenshiUpdate)

	//
	// Theme
	//

	v1.GET("/theme", h.HandleGetTheme)
	v1.PATCH("/theme", h.HandleUpdateTheme)

	//
	// Playback Manager
	//

	v1.GET("/stream/:id/master.m3u8", h.HandleMasterPlaylist)
	v1.GET("/stream/:id/:file", h.HandleHlsSegment)
	v1.DELETE("/stream/:id", h.StopStreamSession)
	v1.GET("/streaming/:mediaId/episode/:epNum/sources", h.HandleGetEpisodeSources)
	//
	// Playback Manager
	//
	v1PlaybackManager := v1.Group("/playback-manager")
	v1PlaybackManager.POST("/play", h.HandlePlaybackPlayVideo)
	v1PlaybackManager.POST("/play-random", h.HandlePlaybackPlayRandomVideo)
	v1PlaybackManager.POST("/sync-current-progress", h.HandlePlaybackSyncCurrentProgress)
	v1PlaybackManager.POST("/next-episode", h.HandlePlaybackPlayNextEpisode)
	v1PlaybackManager.GET("/next-episode", h.HandlePlaybackGetNextEpisode)
	v1PlaybackManager.POST("/autoplay-next-episode", h.HandlePlaybackAutoPlayNextEpisode)
	v1PlaybackManager.POST("/manual-tracking/start", h.HandlePlaybackStartManualTracking)
	v1PlaybackManager.POST("/manual-tracking/cancel", h.HandlePlaybackCancelManualTracking)

	//
	// Online Streaming (disabled)
	//

	//
	// Metadata Provider
	//

	v1.POST("/metadata-provider/filler", h.HandlePopulateFillerData)
	v1.DELETE("/metadata-provider/filler", h.HandleRemoveFillerData)
	v1.GET("/metadata/parent/:id", h.HandleGetMediaMetadataParent)
	v1.POST("/metadata/parent", h.HandleSaveMediaMetadataParent)
	v1.DELETE("/metadata/parent", h.HandleDeleteMediaMetadataParent)

	//
	// Manga
	//



	//
	// File Cache
	//

	v1FileCache := v1.Group("/filecache")
	v1FileCache.GET("/total-size", h.HandleGetFileCacheTotalSize)
	v1FileCache.DELETE("/bucket", h.HandleRemoveFileCacheBucket)
	v1FileCache.GET("/mediastream/videofiles/total-size", h.HandleGetFileCacheMediastreamVideoFilesTotalSize)
	v1FileCache.DELETE("/mediastream/videofiles", h.HandleClearFileCacheMediastreamVideoFiles)

	//
	// Discord
	//

	//
	// Media Stream
	//
	v1Mediastream := v1.Group("/mediastream")
	v1Mediastream.GET("/settings", h.HandleGetMediastreamSettings)
	v1Mediastream.PATCH("/settings", h.HandleSaveMediastreamSettings)
	v1Mediastream.POST("/request", h.HandleRequestMediastreamMediaContainer)
	v1Mediastream.POST("/preload", h.HandlePreloadMediastreamMediaContainer)
	v1Mediastream.POST("/shutdown-transcode", h.HandleMediastreamShutdownTranscodeStream)
	v1Mediastream.GET("/direct/play", h.HandleMediastreamDirectPlay)
	v1Mediastream.GET("/transcode/stream", h.HandleMediastreamTranscode)
	v1Mediastream.GET("/subs", h.HandleMediastreamGetSubtitles)
	v1Mediastream.GET("/att", h.HandleMediastreamGetAttachments)
	v1Mediastream.GET("/file", h.HandleMediastreamFile)

	// Video Thumbnail
	v1.GET("/video-thumbnail", h.HandleGetVideoThumbnail)

	//
	// Direct Stream
	//
	v1DirectStream := v1.Group("/directstream")
	v1DirectStream.POST("/play/localfile", h.HandleDirectstreamPlayLocalFile)
	v1DirectStream.POST("/subs/convert-subs", h.HandleDirectstreamConvertSubs)
	v1DirectStream.GET("/stream/*", echo.WrapHandler(h.HandleDirectstreamGetStream()))
	v1DirectStream.HEAD("/stream/*", echo.WrapHandler(h.HandleDirectstreamGetStream()))
	v1DirectStream.GET("/att/:filename", h.HandleDirectstreamGetAttachments)
	// Resolve a local file by its stable SHA-256-derived ID (emitted by SourcePriorityEngine)
	v1DirectStream.GET("/local", h.HandleDirectstreamGetLocalFileByID)

	//
	// VideoCore
	//
	v1.GET("/videocore/insight/character/:malId", h.HandleVideoCoreInSightGetCharacterDetails)
	v1.GET("/videocore/insights/:episodeId", h.HandleGetVideoInsights)

	//
	// Torrent stream
	//
	v1.GET("/torrentstream/settings", h.HandleGetTorrentstreamSettings)
	v1.PATCH("/torrentstream/settings", h.HandleSaveTorrentstreamSettings)
	v1.POST("/torrentstream/start", h.HandleTorrentstreamStartStream)
	v1.POST("/torrentstream/stop", h.HandleTorrentstreamStopStream)
	v1.POST("/torrentstream/drop", h.HandleTorrentstreamDropTorrent)
	v1.POST("/torrentstream/torrent-file-previews", h.HandleGetTorrentstreamTorrentFilePreviews)
	v1.POST("/torrentstream/batch-history", h.HandleTorrentstreamGetBatchHistory)
	v1.GET("/torrentstream/stream/*", h.HandleTorrentstreamServeStream)

	//
	// Torrentio (Stremio-compatible addon bridge)
	//
	v1.GET("/torrentio/streams", h.HandleGetTorrentioStreams)

	//
	// Extensions
	//


	//
	// Addon Subtitles
	//
	v1.GET("/addons/subtitles/:type/:id", h.HandleGetAddonSubtitles)

	//
	// Playback Telemetry
	//
	v1.POST("/playback/sync", h.HandlePlaybackSync)

	//
	// Continuity
	//
	v1Continuity := v1.Group("/continuity")
	v1Continuity.PATCH("/item", h.HandleUpdateContinuityWatchHistoryItem)
	v1Continuity.GET("/item/:id", h.HandleGetContinuityWatchHistoryItem)
	v1Continuity.GET("/history", h.HandleGetContinuityWatchHistory)

	//
	// Sync / Offline (disabled)
	//

	//
	// Debrid
	//

	v1.GET("/debrid/settings", h.HandleGetDebridSettings)
	v1.PATCH("/debrid/settings", h.HandleSaveDebridSettings)
	v1.POST("/debrid/torrents", h.HandleDebridAddTorrents)
	v1.POST("/debrid/torrents/download", h.HandleDebridDownloadTorrent)
	v1.POST("/debrid/torrents/cancel", h.HandleDebridCancelDownload)
	v1.DELETE("/debrid/torrent", h.HandleDebridDeleteTorrent)
	v1.GET("/debrid/torrents", h.HandleDebridGetTorrents)
	v1.POST("/debrid/torrents/info", h.HandleDebridGetTorrentInfo)
	v1.POST("/debrid/torrents/file-previews", h.HandleDebridGetTorrentFilePreviews)
	v1.POST("/debrid/stream/start", h.HandleDebridStartStream)
	v1.POST("/debrid/stream/cancel", h.HandleDebridCancelStream)

	//
	// Report
	//

	v1.POST("/report/issue", h.HandleSaveIssueReport)
	v1.GET("/report/issue/download", h.HandleDownloadIssueReport)
	v1.POST("/report/issue/decompress", h.HandleDecompressIssueReport)

	//
	// Custom Sources (disabled)
	//

	//
	// TMDB
	//
	v1TMDB := v1.Group("/tmdb")
	v1TMDB.POST("/search", h.HandleTMDBSearch)
	v1TMDB.POST("/details", h.HandleTMDBGetDetails)

}

func (h *Handler) JSON(c echo.Context, code int, i interface{}) error {
	return c.JSON(code, i)
}

func (h *Handler) RespondWithData(c echo.Context, data interface{}) error {
	return c.JSON(200, NewDataResponse(data))
}

func (h *Handler) RespondWithError(c echo.Context, err error) error {
	return c.JSON(500, NewErrorResponse(err))
}

func headMethodMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// Skip stream routes
		if strings.Contains(c.Request().URL.Path, "/directstream/stream") {
			return next(c)
		}

		if c.Request().Method == http.MethodHead {
			// Set the method to GET temporarily to reuse the handler
			c.Request().Method = http.MethodGet

			defer func() {
				c.Request().Method = http.MethodHead
			}() // Restore method after

			// Call the next handler and then clear the response body
			if err := next(c); err != nil {
				if err.Error() == echo.ErrMethodNotAllowed.Error() {
					return c.NoContent(http.StatusOK)
				}

				return err
			}
		}

		return next(c)
	}
}
