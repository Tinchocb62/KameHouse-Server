package handlers

import (
	"kamehouse/internal/api/tmdb"
	"net/http"

	"github.com/labstack/echo/v4"
)

// HandleTMDBSearch
//
//	@summary search TMDB for anime/TV show metadata.
//	@desc Searches TMDB for TV shows matching the query. Requires TMDB bearer token in the request body.
//	@returns []tmdb.SearchResult
//	@route /api/v1/tmdb/search [POST]
func (h *Handler) HandleTMDBSearch(c echo.Context) error {
	type body struct {
		Query       string `json:"query"`
		BearerToken string `json:"bearerToken"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	if b.Query == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "query is required"})
	}
	if b.BearerToken == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "TMDB bearer token is required"})
	}

	client := tmdb.NewClient(b.BearerToken) // uses default es-ES language
	results, err := client.SearchTV(c.Request().Context(), b.Query)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, results)
}

// HandleTMDBGetDetails
//
//	@summary get TMDB TV show details and alternative titles.
//	@desc Returns detailed metadata and alternative titles for a TMDB TV show.
//	@returns map[string]interface{}
//	@route /api/v1/tmdb/details [POST]
func (h *Handler) HandleTMDBGetDetails(c echo.Context) error {
	type body struct {
		TVID        int    `json:"tvId"`
		BearerToken string `json:"bearerToken"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	if b.TVID == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "tvId is required"})
	}
	if b.BearerToken == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "TMDB bearer token is required"})
	}

	client := tmdb.NewClient(b.BearerToken) // uses default es-ES language

	// Get alternative titles
	altTitles, _ := client.GetTVAlternativeTitles(c.Request().Context(), b.TVID)

	return h.RespondWithData(c, map[string]interface{}{
		"tvId":              b.TVID,
		"alternativeTitles": altTitles,
	})
}
