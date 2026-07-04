package handlers

import (
	"kamehouse/internal/database/models"

	"github.com/labstack/echo/v4"
)

// HandleGetTheme returns the theme settings.
//
//	@summary returns the theme settings.
//	@route /api/v1/theme [GET]
//	@returns models.Theme
func (h *Handler) HandleGetTheme(c echo.Context) error {
	theme, err := h.App.Database.GetTheme()
	if err != nil {
		return h.RespondWithError(c, err)
	}
	return h.RespondWithData(c, theme)
}

// HandleUpdateTheme updates the color-related theme settings (used by the
// quick theme-preset picker). It only touches the color fields it receives
// and preserves every other theme setting already saved — it does NOT
// overwrite the whole theme row, to avoid wiping unrelated appearance
// settings configured elsewhere (Settings → Apariencia).
//
//	@summary updates the theme settings.
//	@desc The server status should be re-fetched after this on the client.
//	@route /api/v1/theme [PATCH]
//	@returns models.Theme
func (h *Handler) HandleUpdateTheme(c echo.Context) error {
	type body struct {
		Theme models.Theme `json:"theme"`
	}

	var b body

	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	currentTheme, err := h.App.Database.GetTheme()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Merge: only the color fields are updated by this endpoint, everything
	// else (carousel/banner/CSS/etc settings) is preserved as-is.
	merged := *currentTheme
	merged.ID = 1
	merged.EnableColorSettings = b.Theme.EnableColorSettings
	merged.BackgroundColor = b.Theme.BackgroundColor
	merged.AccentColor = b.Theme.AccentColor
	merged.SidebarBackgroundColor = b.Theme.SidebarBackgroundColor
	merged.ThemeEra = b.Theme.ThemeEra

	// Update the theme settings
	if _, err := h.App.Database.UpsertTheme(&merged); err != nil {
		return h.RespondWithError(c, err)
	}

	// Send the new theme to the client
	return h.RespondWithData(c, merged)
}
