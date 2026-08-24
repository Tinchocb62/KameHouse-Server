package handlers

import (
	"errors"
	"kamehouse/internal/intelligence"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
)

// HandleGetBestSource retorna el mejor archivo para un título/episodio.
//
//	@summary get best source for playback.
//	@desc Evaluates all available sources (local + Jellyfin) and returns the winner.
//	@returns intelligence.SelectionResult
//	@route /api/v1/intelligence/best-source [GET]
func (h *Handler) HandleGetBestSource(c echo.Context) error {
	tmdbIDStr := c.QueryParam("tmdbId")
	episodeStr := c.QueryParam("episode")
	langStr := c.QueryParam("preferredLangs")

	tmdbID, _ := strconv.Atoi(tmdbIDStr)
	episode, _ := strconv.Atoi(episodeStr)

	if tmdbID == 0 {
		return h.RespondWithCodeError(c, 400, errors.New("tmdbId is required"))
	}

	if episode == 0 {
		episode = 1
	}

	preferredLangs := []string{"spa", "eng"}
	if langStr != "" {
		preferredLangs = splitLangs(langStr)
	}

	result, err := h.IntelligenceSelector.SelectBestSource(c.Request().Context(), tmdbID, episode, preferredLangs)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, result)
}

// HandleGetIntelligenceStats retorna estadísticas del motor de selección.
//
//	@summary get intelligence engine stats.
//	@desc Returns cache stats and scoring configuration.
//	@returns map
//	@route /api/v1/intelligence/stats [GET]
func (h *Handler) HandleGetIntelligenceStats(c echo.Context) error {
	stats := map[string]interface{}{
		"weights": h.IntelligenceSelector.GetWeights(),
		"cache":   h.IntelligenceSelector.GetCacheStats(),
	}
	return h.RespondWithData(c, stats)
}

// HandleGetChronologyTimeline returns the Dragon Ball in-universe canonical timeline with user progress.
//
//	@summary get Dragon Ball canon timeline.
//	@desc Returns full historical timeline order with user progress.
//	@returns intelligence.ChronologyResponse
//	@route /api/v1/intelligence/chronology [GET]
func (h *Handler) HandleGetChronologyTimeline(c echo.Context) error {
	timeline := intelligence.BuildChronologyResponse(h.App.Database)
	return h.RespondWithData(c, timeline)
}

// HandleSemanticSearch returns lore entities and smart recommendations for a query.
//
//	@summary search lore entities and sagas.
//	@desc Searches characters, transformations, sagas and milestones.
//	@returns []intelligence.SemanticSearchResult
//	@route /api/v1/intelligence/search [GET]
func (h *Handler) HandleSemanticSearch(c echo.Context) error {
	query := c.QueryParam("q")
	results := intelligence.SearchSemanticEntities(query)
	return h.RespondWithData(c, results)
}

func splitLangs(s string) []string {
	var langs []string
	for _, part := range strings.Split(s, ",") {
		if t := strings.TrimSpace(part); t != "" {
			langs = append(langs, t)
		}
	}
	if len(langs) == 0 {
		return []string{"spa", "eng"}
	}
	return langs
}
