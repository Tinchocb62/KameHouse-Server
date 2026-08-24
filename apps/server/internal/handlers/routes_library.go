package handlers

import "github.com/labstack/echo/v4"

// RegisterLibraryRoutes registers all library, local-files, and explorer routes.
func (h *Handler) RegisterLibraryRoutes(v1 *echo.Group) {
	v1Library := v1.Group("/library")

	v1Library.POST("/scan", h.HandleScanLocalFiles)
	v1Library.GET("/scan/status", h.HandleGetScanStatus)
	v1Library.GET("/unlinked", h.HandleGetUnlinkedFiles)
	v1Library.POST("/unlinked/resolve", h.HandleResolveUnlinkedFile)

	v1Library.DELETE("/empty-directories", h.HandleRemoveEmptyDirectories)

	v1Library.GET("/local-files", h.HandleGetLocalFiles)
	v1Library.POST("/local-files", h.HandleLocalFileBulkAction)
	v1Library.PATCH("/local-files", h.HandleUpdateLocalFiles)
	v1Library.DELETE("/local-files", h.HandleDeleteLocalFiles)
	v1Library.GET("/local-files/dump", h.HandleDumpLocalFilesToFile)
	v1Library.POST("/local-files/import", h.HandleImportLocalFiles)
	v1Library.POST("/local-files/tmdb-assign", h.HandleTMDBAssign)
	v1Library.PATCH("/local-file", h.HandleUpdateLocalFileData)
	v1Library.PATCH("/local-files/super-update", h.HandleSuperUpdateLocalFiles)

	v1Library.GET("/collection", h.HandleGetLibraryCollection)
	v1Library.GET("/schedule", h.HandleGetAnimeCollectionSchedule)
	v1Library.GET("/scan-summaries", h.HandleGetScanSummaries)
	v1Library.GET("/missing-episodes", h.HandleGetMissingEpisodes)
	v1Library.GET("/upcoming-episodes", h.HandleGetUpcomingEpisodes)

	v1Library.GET("/anime-entry/:id", h.HandleGetAnimeEntry)
	v1Library.GET("/anime-entry/:id/sagas", h.HandleGetSeriesSagas)
	v1Library.GET("/anime-entry/:id/local-files", h.HandleGetAnimeEntryLocalFiles)
	v1Library.POST("/anime-entry/suggestions", h.HandleGetAnimeEntrySuggestions)
	v1Library.POST("/anime-entry/manual-match", h.HandleAnimeEntryManualMatch)
	v1Library.POST("/anime-entry/unmatch", h.HandleAnimeEntryUnmatch)
	v1Library.PATCH("/anime-entry/bulk-action", h.HandleAnimeEntryBulkAction)
	v1Library.POST("/anime-entry/open-in-explorer", h.HandleOpenAnimeEntryInExplorer)
	v1Library.POST("/anime-entry/update-progress", h.HandleUpdateAnimeEntryProgress)
	v1Library.POST("/anime-entry/progress", h.HandleUpdateAnimeEntryProgress)
	v1Library.POST("/anime-entry/update-repeat", h.HandleUpdateAnimeEntryRepeat)
	v1Library.POST("/anime-entry/repeat", h.HandleUpdateAnimeEntryRepeat)
	v1Library.GET("/anime-entry/silence/:id", h.HandleGetAnimeEntrySilenceStatus)
	v1Library.POST("/anime-entry/silence", h.HandleToggleAnimeEntrySilenceStatus)

	v1Library.POST("/unknown-media", h.HandleAddUnknownMedia)

	// Library Explorer
	v1LibraryExplorer := v1Library.Group("/explorer")
	v1LibraryExplorer.GET("/file-tree", h.HandleGetLibraryExplorerFileTree)
	v1LibraryExplorer.POST("/file-tree/refresh", h.HandleRefreshLibraryExplorerFileTree)
	v1LibraryExplorer.POST("/directory-children", h.HandleLoadLibraryExplorerDirectoryChildren)

	// Platform
	v1Platform := v1.Group("/platform")
	v1Platform.GET("/collection", h.HandleGetLibraryCollection)
	v1Platform.POST("/list-anime", h.HandlePlatformListAnime)
	v1Platform.POST("/list-recent-anime", h.HandlePlatformListRecentAiringAnime)
	v1Platform.GET("/stats", h.HandleGetPlatformStats)

	// Anime
	v1.GET("/anime/episode-collection/:id", h.HandleGetAnimeEpisodeCollection)
}
