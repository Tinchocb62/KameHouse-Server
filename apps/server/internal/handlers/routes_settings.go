package handlers

import "github.com/labstack/echo/v4"

// RegisterSettingsRoutes registers settings, auth, auto-downloader, updates, and system routes.
func (h *Handler) RegisterSettingsRoutes(v1 *echo.Group) {
	// Auth
	v1.POST("/auth/login", h.HandleLogin)
	v1.POST("/auth/logout", h.HandleLogout)

	// Settings
	v1.GET("/settings", h.HandleGetSettings)
	v1.PATCH("/settings", h.HandleSaveSettings)
	v1.POST("/start", h.HandleGettingStarted)
	v1.PATCH("/settings/media-player", h.HandleSaveMediaPlayerSettings)

	// Progress
	v1.GET("/progress", h.HandleGetProgress)
	v1.POST("/progress", h.HandleSaveProgress)

	// Theme
	v1.GET("/theme", h.HandleGetTheme)
	v1.PATCH("/theme", h.HandleUpdateTheme)

	// Metadata
	v1.POST("/metadata-provider/filler", h.HandlePopulateFillerData)
	v1.DELETE("/metadata-provider/filler", h.HandleRemoveFillerData)
	v1.GET("/metadata/parent/:id", h.HandleGetMediaMetadataParent)
	v1.POST("/metadata/parent", h.HandleSaveMediaMetadataParent)
	v1.DELETE("/metadata/parent", h.HandleDeleteMediaMetadataParent)

	// TMDB
	v1TMDB := v1.Group("/tmdb")
	v1TMDB.POST("/search", h.HandleTMDBSearch)
	v1TMDB.POST("/details", h.HandleTMDBGetDetails)

	// File Cache
	v1FileCache := v1.Group("/filecache")
	v1FileCache.GET("/total-size", h.HandleGetFileCacheTotalSize)
	v1FileCache.DELETE("/bucket", h.HandleRemoveFileCacheBucket)
	v1FileCache.GET("/mediastream/videofiles/total-size", h.HandleGetFileCacheMediastreamVideoFilesTotalSize)
	v1FileCache.DELETE("/mediastream/videofiles", h.HandleClearFileCacheMediastreamVideoFiles)
	// System
	v1System := v1.Group("/db")
	v1System.POST("/backup", h.HandleBackupDatabase)
	v1.GET("/report", h.HandleGetDiagnosticsReport)
}
