package handlers

// Package-level note: PlaybackManager handlers (this file)
//
// STATUS: NOT IMPLEMENTED — all handlers return HTTP 501.
//
// The PlaybackManager was removed from the backend during the Completing Refactoring Tasks
// session (2025). The frontend (playback_manager.hooks.ts) and the generated contract
// (endpoints.ts, events/endpoints.go) still reference these routes.
//
// TODO (P2): Either re-implement the PlaybackManager as a proper service in core.App
// (integrating with the system's media player / external player mechanism),
// or formally deprecate these endpoints and remove them from the codegen source
// and the frontend hooks.
//
// Until then, these stubs prevent 404s and give the frontend a clear 501 to handle.

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// respondNotImplemented is a convenience helper for Playback Manager stubs.
// All routes here return 501 until the PlaybackManager is re-integrated server-side.
func respondNotImplemented(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, SeaResponse[any]{
		Error: "Playback Manager is not available in this build",
	})
}

// HandlePlaybackPlayVideo
//
//	@summary plays the video with the given path using the default media player.
//	@route /api/v1/playback-manager/play [POST]
//	@returns bool
func (h *Handler) HandlePlaybackPlayVideo(c echo.Context) error {
	return respondNotImplemented(c)
}

// HandlePlaybackPlayRandomVideo
//
//	@summary plays a random, unwatched video using the default media player.
//	@route /api/v1/playback-manager/play-random [POST]
//	@returns bool
func (h *Handler) HandlePlaybackPlayRandomVideo(c echo.Context) error {
	return respondNotImplemented(c)
}

// HandlePlaybackSyncCurrentProgress
//
//	@summary updates the AniList progress of the currently playing media.
//	@route /api/v1/playback-manager/sync-current-progress [POST]
//	@returns int
func (h *Handler) HandlePlaybackSyncCurrentProgress(c echo.Context) error {
	return respondNotImplemented(c)
}

// HandlePlaybackPlayNextEpisode
//
//	@summary plays the next episode of the currently playing media.
//	@route /api/v1/playback-manager/next-episode [POST]
//	@returns bool
func (h *Handler) HandlePlaybackPlayNextEpisode(c echo.Context) error {
	return respondNotImplemented(c)
}

// HandlePlaybackGetNextEpisode
//
//	@summary gets the next episode of the currently playing media.
//	@route /api/v1/playback-manager/next-episode [GET]
//	@returns Anime_LocalFile
func (h *Handler) HandlePlaybackGetNextEpisode(c echo.Context) error {
	return respondNotImplemented(c)
}

// HandlePlaybackAutoPlayNextEpisode
//
//	@summary plays the next episode automatically.
//	@route /api/v1/playback-manager/autoplay-next-episode [POST]
//	@returns bool
func (h *Handler) HandlePlaybackAutoPlayNextEpisode(c echo.Context) error {
	return respondNotImplemented(c)
}


// HandlePlaybackStartManualTracking
//
//	@summary starts manual tracking of a media.
//	@route /api/v1/playback-manager/manual-tracking/start [POST]
//	@returns bool
func (h *Handler) HandlePlaybackStartManualTracking(c echo.Context) error {
	return respondNotImplemented(c)
}

// HandlePlaybackCancelManualTracking
//
//	@summary cancels manual tracking of a media.
//	@route /api/v1/playback-manager/manual-tracking/cancel [POST]
//	@returns bool
func (h *Handler) HandlePlaybackCancelManualTracking(c echo.Context) error {
	return respondNotImplemented(c)
}
