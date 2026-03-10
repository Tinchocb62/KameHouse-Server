package handlers

import (
	"kamehouse/internal/continuity"
	"strconv"

	"github.com/labstack/echo/v4"
)

// HandleUpdateContinuityWatchHistoryItem
//
//	@summary Updates watch history item.
//	@desc This endpoint is used to update a watch history item.
//	@desc Since this is low priority, we ignore any errors.
//	@route /api/v1/continuity/item [PATCH]
//	@returns bool
func (h *Handler) HandleUpdateContinuityWatchHistoryItem(c echo.Context) error {
	type body struct {
		Options continuity.UpdateWatchHistoryItemOptions `json:"options"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	// Zero-Latency Telemetry Dispatch
	if h.App.ContinuityManager.TelemetryManager != nil {
		h.App.ContinuityManager.TelemetryManager.Queue(continuity.TelemetryEvent{
			MediaId:       b.Options.MediaId,
			EpisodeNumber: b.Options.EpisodeNumber,
			CurrentTime:   b.Options.CurrentTime,
			Duration:      b.Options.Duration,
			Kind:          b.Options.Kind,
			Filepath:      b.Options.Filepath,
			IsFinal:       false, // For typical interval beacons
		})
	}

	return h.RespondWithData(c, true)
}

// HandleGetContinuityWatchHistoryItem
//
//	@summary Returns a watch history item.
//	@desc This endpoint is used to retrieve a watch history item.
//	@route /api/v1/continuity/item/{id} [GET]
//	@param id - int - true - "AniList anime media ID"
//	@returns continuity.WatchHistoryItemResponse
func (h *Handler) HandleGetContinuityWatchHistoryItem(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return h.RespondWithError(c, err)
	}

	if !h.App.ContinuityManager.GetSettings().WatchContinuityEnabled {
		return h.RespondWithData(c, &continuity.WatchHistoryItemResponse{
			Item:  nil,
			Found: false,
		})
	}

	resp := h.App.ContinuityManager.GetWatchHistoryItem(id)
	return h.RespondWithData(c, resp)
}

// HandleGetContinuityWatchHistory
//
//	@summary Returns the continuity watch history
//	@desc This endpoint is used to retrieve all watch history items.
//	@route /api/v1/continuity/history [GET]
//	@returns continuity.WatchHistory
func (h *Handler) HandleGetContinuityWatchHistory(c echo.Context) error {
	if !h.App.ContinuityManager.GetSettings().WatchContinuityEnabled {
		ret := make(map[int]*continuity.WatchHistoryItem)
		return h.RespondWithData(c, ret)
	}

	resp := h.App.ContinuityManager.GetWatchHistory()
	return h.RespondWithData(c, resp)
}
