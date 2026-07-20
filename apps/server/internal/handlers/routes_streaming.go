package handlers

import (
	"github.com/labstack/echo/v4"
)

// RegisterStreamingRoutes registers all media streaming, direct stream, and mediastream routes.
func (h *Handler) RegisterStreamingRoutes(v1 *echo.Group) {
	// Old Playback Manager / HLS (removed)

	// Media Stream
	v1Mediastream := v1.Group("/mediastream")
	v1Mediastream.GET("/settings", h.HandleGetMediastreamSettings)
	v1Mediastream.PATCH("/settings", h.HandleSaveMediastreamSettings)
	v1Mediastream.POST("/request", h.HandleRequestMediastreamMediaContainer)
	v1Mediastream.POST("/preload", h.HandlePreloadMediastreamMediaContainer)
	v1Mediastream.POST("/shutdown-transcode", h.HandleMediastreamShutdownTranscodeStream)
	v1Mediastream.POST("/pretranscode", h.HandleEnqueuePreTranscode)
	v1Mediastream.GET("/pretranscode", h.HandleGetPreTranscodeJobs)
	v1Mediastream.DELETE("/pretranscode/:hash", h.HandleCancelPreTranscode)
	v1Mediastream.GET("/direct/play", h.HandleMediastreamDirectPlay)
	v1Mediastream.GET("/transcode/*", h.HandleMediastreamTranscode)
	v1Mediastream.GET("/hls/*", h.HandleMediastreamServeOptimizedStatic)
	v1Mediastream.GET("/subs", h.HandleMediastreamGetSubtitles)
	v1Mediastream.GET("/subs/pgs", h.HandleMediastreamGetPGSEvents)
	v1Mediastream.GET("/subtitles", h.HandleMediastreamGetSubtitles) // alias matching frontend requests
	v1Mediastream.GET("/att/*", h.HandleMediastreamGetAttachments)
	v1Mediastream.GET("/file", h.HandleMediastreamFile)
	v1Mediastream.GET("/skip-times", h.HandleGetEpisodeSkipTimes)
	v1Mediastream.POST("/skip-times", h.HandleSaveEpisodeSkipTimes)
	v1Mediastream.GET("/skip-times/resolve-mal", h.HandleResolveMAL)
	v1Mediastream.POST("/skip-times/scan", h.HandleScanEpisodeSkipTimes)

	// Video Thumbnail
	v1.GET("/video-thumbnail", h.HandleGetVideoThumbnail)


	// VideoCore insights
	v1.GET("/videocore/insights/:episodeId", h.HandleGetVideoInsights)

	// Playback telemetry
	v1.POST("/playback/sync", h.HandlePlaybackSync)
}

