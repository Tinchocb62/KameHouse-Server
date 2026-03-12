package handlers

import (
	"kamehouse/internal/events"
	"net/http"
	"strconv"

	"github.com/goccy/go-json"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

// webSocketEventHandler creates a new websocket handler for real-time event communication.
// The route is registered BEFORE the auth middleware group so the HTTP→WS upgrade
// is never blocked by a missing Authorization header (browsers can't send one during WS connect).
// Clients that need auth send their token via ?token=<value> as a query parameter instead.
func (h *Handler) webSocketEventHandler(c echo.Context) error {
	ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	defer ws.Close()

	// Client identity — passed as query parameters since WS browsers can't set custom headers.
	id := c.QueryParam("id")
	if id == "" {
		id = "0"
	}

	// Optional bearer token via ?token=<value>  (browser WS API cannot set Authorization headers).
	// Currently stored for tracing; apply additional auth checks here if/when required.
	token := c.QueryParam("token")
	logCtx := h.App.Logger.Debug().Str("id", id)
	if token != "" {
		logCtx = logCtx.Str("tokenLen", strconv.Itoa(len(token)))
	}
	logCtx.Msg("ws: Client connected")

	// Add connection to manager
	h.App.WSEventManager.AddConn(id, ws)

	for {
		_, msg, err := ws.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
				h.App.Logger.Debug().Str("id", id).Msg("ws: Client disconnected")
			} else {
				h.App.Logger.Debug().Str("id", id).Msg("ws: Client disconnection")
			}
			h.App.WSEventManager.RemoveConn(id)
			break
		}

		event, err := UnmarshalWebsocketClientEvent(msg)
		if err != nil {
			h.App.Logger.Error().Err(err).Msg("ws: Failed to unmarshal message sent from webview")
			continue
		}

		// Handle ping messages
		if event.Type == "ping" {
			timestamp := int64(0)
			if payload, ok := event.Payload.(map[string]interface{}); ok {
				if ts, ok := payload["timestamp"]; ok {
					if tsFloat, ok := ts.(float64); ok {
						timestamp = int64(tsFloat)
					} else if tsInt, ok := ts.(int64); ok {
						timestamp = tsInt
					}
				}
			}

			// Send pong response back to the same client
			h.App.WSEventManager.SendEventTo(event.ClientID, "pong", map[string]int64{"timestamp": timestamp})
			continue // Skip further processing for ping messages
		}

		// Handle main-tab-claim messages by broadcasting to all clients
		if event.Type == "main-tab-claim" {
			h.App.WSEventManager.SendEvent("main-tab-claim", event.Payload)
			continue
		}

		h.HandleClientEvents(event)

		// h.App.Logger.Debug().Msgf("ws: message received: %+v", msg)

		// // Echo the message back
		// if err = ws.WriteMessage(messageType, msg); err != nil {
		// 	h.App.Logger.Err(err).Msg("ws: Failed to send message")
		// 	break
		// }
	}

	return nil
}

func UnmarshalWebsocketClientEvent(msg []byte) (*events.WebsocketClientEvent, error) {
	var event events.WebsocketClientEvent
	if err := json.Unmarshal(msg, &event); err != nil {
		return nil, err
	}
	return &event, nil
}
