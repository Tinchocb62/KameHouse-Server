package handlers

import (
	"net/http"
	"strconv"

	"kamehouse/internal/core"

	"github.com/labstack/echo/v4"
)

// HandleResolveStreams resolves all available playback sources for a given
// episode using the UnifiedResolver priority chain:
//   1. Local file (instant)
//   2. Torrentio streams (concurrent, ≤3s)
//
// @summary  Resolve all playback sources for an episode
// @desc     Returns a prioritised list of ResolvedSource objects. Local files
//
//	are always listed first. Torrentio results (if kitsuId is provided)
//	follow, sorted by quality (best first).
//
// @returns  []core.ResolvedSource
// @route    /api/v1/resolver/streams [GET]
//
// Query parameters:
//   - mediaId  (required) — AniList media ID (positive) or TMDB ID (negative)
//   - episode  (required) — 1-based episode number
//   - kitsuId  (optional) — Kitsu anime ID; if absent, Torrentio is skipped
func (h *Handler) HandleResolveStreams(c echo.Context) error {
	// ── Parse required params ─────────────────────────────────────────────────

	mediaIDStr := c.QueryParam("mediaId")
	if mediaIDStr == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "query parameter 'mediaId' is required",
		})
	}
	if _, err := strconv.Atoi(mediaIDStr); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "'mediaId' must be a valid integer",
		})
	}

	episodeStr := c.QueryParam("episode")
	if episodeStr == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "query parameter 'episode' is required",
		})
	}
	episode, err := strconv.Atoi(episodeStr)
	if err != nil || episode <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "'episode' must be a positive integer",
		})
	}

	// ── Parse optional param ──────────────────────────────────────────────────

	mediaType := c.QueryParam("mediaType")
	if mediaType == "" {
		mediaType = "anime" // default
	}

	// ── Resolve ───────────────────────────────────────────────────────────────

	resolver := core.NewUnifiedResolver(h.App.Database, h.App.Logger)

	unifiedResponse, err := resolver.ResolveUnifiedMedia(c.Request().Context(), mediaIDStr, episode, mediaType)
	if err != nil {
		h.App.Logger.Error().Err(err).
			Str("mediaId", mediaIDStr).
			Int("episode", episode).
			Msg("resolver: handler error")
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, unifiedResponse)
}
