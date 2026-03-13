package handlers

import (
	"errors"
	"kamehouse/internal/library/anime"

	"github.com/labstack/echo/v4"
)

// HandleGetHomeCurated returns the intelligent swimlanes for the home page.
func (h *Handler) HandleGetHomeCurated(c echo.Context) error {
	ctx := c.Request().Context()

	if h.App.Database == nil {
		return c.JSON(500, NewErrorResponse(errors.New("database not initialized")))
	}

	resp, err := anime.GetCuratedHome(ctx, h.App.Database)
	if err != nil {
		return c.JSON(500, NewErrorResponse(err))
	}

	return c.JSON(200, NewDataResponse(resp))
}

// HandleGetContinueWatching returns the "Continue Watching" items for the user.
func (h *Handler) HandleGetContinueWatching(c echo.Context) error {
	ctx := c.Request().Context()

	if h.App.Database == nil {
		return h.JSON(c, 500, NewErrorResponse(errors.New("database not initialized")))
	}

	// Try to get userID from context (set by auth middleware)
	// Default to 1 for backward compatibility or guest access if appropriate
	userID := uint(1)
	if val := c.Get("user_id"); val != nil {
		if id, ok := val.(uint); ok {
			userID = id
		}
	}

	svc := anime.NewIntelligenceService(h.App.Database, nil, h.App.Logger)
	resp, err := svc.GetContinueWatching(ctx, userID)
	if err != nil {
		return h.JSON(c, 500, NewErrorResponse(err))
	}

	return h.JSON(c, 200, NewDataResponse(resp))
}
