package handlers

import (
	"github.com/labstack/echo/v4"
)

func (h *Handler) HandleDebridGetTorrentFilePreviews(c echo.Context) error {
	return h.RespondWithData(c, []string{})
}
