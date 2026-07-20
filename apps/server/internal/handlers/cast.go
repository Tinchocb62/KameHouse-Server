package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

// CastDeviceIDPrefix es el prefijo con el que los clientes de TV se identifican
// al conectarse al WebSocket de eventos (/api/v1/events?id=kamehouse-tv-xxxx).
const CastDeviceIDPrefix = "kamehouse-tv-"

// CastEventPlay es el evento WebSocket que dispara la reproducción en la TV.
const CastEventPlay = "cast:play"

type CastDevice struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type CastDevicesResponse struct {
	Devices []CastDevice `json:"devices"`
}

type CastPlayRequest struct {
	// DeviceID opcional: si está vacío se envía a todas las TVs conectadas.
	DeviceID string `json:"deviceId"`
	MediaID  int    `json:"mediaId"`
	// EpisodeNumber es el número de episodio (absoluto si aplica); la TV lo
	// mapea a su propio episodeId consultando la entrada de la biblioteca.
	EpisodeNumber int `json:"episodeNumber"`
	// EpisodeID opcional: id exacto del episodio si el emisor lo conoce.
	EpisodeID    string `json:"episodeId"`
	Title        string `json:"title"`
	EpisodeLabel string `json:"episodeLabel"`
}

type CastPlayResponse struct {
	SentTo []string `json:"sentTo"`
}

// castPlayPayload es el payload que recibe la TV por WebSocket.
type castPlayPayload struct {
	MediaID       int    `json:"mediaId"`
	EpisodeNumber int    `json:"episodeNumber"`
	EpisodeID     string `json:"episodeId"`
	Title         string `json:"title"`
	EpisodeLabel  string `json:"episodeLabel"`
}

// connectedCastDevices devuelve los IDs de conexión WS que pertenecen a TVs.
func (h *Handler) connectedCastDevices() []CastDevice {
	devices := make([]CastDevice, 0)
	if h.App.WSEventManager == nil {
		return devices
	}
	for _, id := range h.App.WSEventManager.GetConnIDs() {
		if !strings.HasPrefix(id, CastDeviceIDPrefix) {
			continue
		}
		// Nombre legible: el sufijo del ID (ej. "kamehouse-tv-a1b2c3" → "TV a1b2c3")
		suffix := strings.TrimPrefix(id, CastDeviceIDPrefix)
		devices = append(devices, CastDevice{
			ID:   id,
			Name: "TV " + suffix,
		})
	}
	return devices
}

// HandleGetCastDevices
//
//	@summary lista las TVs (KameHouseTV) conectadas por WebSocket disponibles para cast.
//	@route /api/v1/cast/devices [GET]
//	@returns handlers.CastDevicesResponse
func (h *Handler) HandleGetCastDevices(c echo.Context) error {
	return JSONSuccess(c, CastDevicesResponse{Devices: h.connectedCastDevices()})
}

// HandleCastPlay
//
//	@summary envía un comando de reproducción a una TV conectada (o a todas si no se indica deviceId).
//	@route /api/v1/cast/play [POST]
//	@returns handlers.CastPlayResponse
func (h *Handler) HandleCastPlay(c echo.Context) error {
	var req CastPlayRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	if req.MediaID == 0 || (req.EpisodeNumber <= 0 && req.EpisodeID == "") {
		return echo.NewHTTPError(http.StatusBadRequest, "mediaId and episodeNumber (or episodeId) are required")
	}

	devices := h.connectedCastDevices()
	if len(devices) == 0 {
		return JSONError(c, errors.New("no hay ninguna TV conectada"), http.StatusNotFound)
	}

	payload := castPlayPayload{
		MediaID:       req.MediaID,
		EpisodeNumber: req.EpisodeNumber,
		EpisodeID:     req.EpisodeID,
		Title:         req.Title,
		EpisodeLabel:  req.EpisodeLabel,
	}

	sentTo := make([]string, 0, len(devices))
	for _, device := range devices {
		if req.DeviceID != "" && device.ID != req.DeviceID {
			continue
		}
		h.App.WSEventManager.SendEventTo(device.ID, CastEventPlay, payload)
		sentTo = append(sentTo, device.ID)
	}

	if len(sentTo) == 0 {
		return JSONError(c, errors.New("la TV indicada ya no está conectada"), http.StatusNotFound)
	}

	h.App.Logger.Info().Strs("devices", sentTo).Int("mediaId", req.MediaID).Int("episodeNumber", req.EpisodeNumber).Msg("cast: play command sent")

	return JSONSuccess(c, CastPlayResponse{SentTo: sentTo})
}
