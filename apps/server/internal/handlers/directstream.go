package handlers

import (
	"fmt"
	"net/http"

	"kamehouse/internal/database/db"
	"kamehouse/internal/directstream"

	"github.com/labstack/echo/v4"
)

// HandleDirectstreamPlayLocalFile
//
//	@summary request local file stream.
//	@desc This requests a local file stream and returns the media container to start the playback.
//	@returns mediastream.MediaContainer
//	@route /api/v1/directstream/play/localfile [POST]
func (h *Handler) HandleDirectstreamPlayLocalFile(c echo.Context) error {
	type body struct {
		Path     string `json:"path"`     // The path of the file.
		ClientId string `json:"clientId"` // The session id
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	lfs, _, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.App.DirectStreamManager.PlayLocalFile(c.Request().Context(), directstream.PlayLocalFileOptions{
		ClientId:   b.ClientId,
		Path:       b.Path,
		LocalFiles: lfs,
	})
}

// HandleDirectstreamConvertSubs
//
//	@summary converts subtitles from one format to another.
//	@returns string
//	@route /api/v1/directstream/subs/convert-subs [POST]
func (h *Handler) HandleDirectstreamConvertSubs(c echo.Context) error {
	type body struct {
		Url     string `json:"url"`
		Content string `json:"content"`
		To      string `json:"to"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	// VideoCore removed — subtitle conversion not yet re-implemented
	return h.RespondWithError(c, fmt.Errorf("subtitle conversion is not currently available"))
}

func (h *Handler) HandleDirectstreamGetStream() http.Handler {
	return h.App.DirectStreamManager.ServeEchoStream()
}

// HandleDirectstreamGetLocalFileByID
//
//	@summary Stream a local file identified by its stable ID.
//	@desc Resolves the local file whose GetStableID() matches the `id` query param,
//	      then initiates playback through the DirectStreamManager.
//	@route /api/v1/directstream/local [GET]
func (h *Handler) HandleDirectstreamGetLocalFileByID(c echo.Context) error {
	id := c.QueryParam("id")
	if id == "" {
		return h.RespondWithError(c, fmt.Errorf("missing required query param: id"))
	}

	clientId, ok := c.Get("KameHouse-Client-Id").(string)
	if !ok || clientId == "" {
		clientId = "anonymous"
	}

	lfs, _, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	var matched *string
	for _, lf := range lfs {
		if lf == nil {
			continue
		}
		if lf.GetStableID() == id {
			p := lf.Path
			matched = &p
			break
		}
	}

	if matched == nil {
		return c.JSON(404, map[string]string{"error": "local file not found for id: " + id})
	}

	if err := h.App.DirectStreamManager.PlayLocalFile(c.Request().Context(), directstream.PlayLocalFileOptions{
		ClientId:   clientId,
		Path:       *matched,
		LocalFiles: lfs,
	}); err != nil {
		return h.RespondWithError(c, err)
	}

	return c.JSON(200, map[string]string{"status": "ok", "path": *matched})
}

func (h *Handler) HandleDirectstreamGetAttachments(c echo.Context) error {
	return h.App.DirectStreamManager.ServeEchoAttachments(c)
}
