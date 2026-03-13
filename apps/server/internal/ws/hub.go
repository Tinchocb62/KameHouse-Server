package ws

import (
	"context"
	"net/http"
	"sync"
	"time"

	"kamehouse/internal/events"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

const (
	// writeWait is the time allowed to send a message to the client.
	writeWait = 10 * time.Second
	// pongWait is the time allowed to read the next pong message from the client.
	pongWait = 60 * time.Second
	// pingPeriod is the period to send pings to the client (must be less than pongWait).
	pingPeriod = (pongWait * 9) / 10
	// maxMessageSize is the maximum message size allowed from the client.
	maxMessageSize = 512
	// sendBufSize is the per-client outbound channel buffer size.
	sendBufSize = 256
)

// WSEvent represents the payload sent to clients.
type WSEvent struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

// Client represents a single connected WebSocket peer.
// All writes are serialized through the send channel and a dedicated writePump goroutine,
// which avoids concurrent WriteMessage calls on the same connection (gorilla/websocket is not concurrent-safe).
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte // buffered channel of outgoing JSON frames
}

// Hub maintains the set of active clients and broadcasts messages to them.
// The broadcast case is a non-blocking channel push; slow or dead clients are
// dropped instead of stalling the whole broadcast loop.
type Hub struct {
	mu      sync.RWMutex
	clients map[*Client]bool

	register   chan *Client
	unregister chan *Client

	eventDispatcher events.Dispatcher
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for local dev
	},
}

// NewHub creates a new WebSocket Hub with an optional event dispatcher and starts its run loop.
// ctx controls the lifetime of the internal event bridge goroutine.
func NewHub(ctx context.Context, dispatcher events.Dispatcher) *Hub {
	h := &Hub{
		clients:         make(map[*Client]bool),
		register:        make(chan *Client, 8),
		unregister:      make(chan *Client, 8),
		eventDispatcher: dispatcher,
	}
	go h.run(ctx)
	return h
}

// EventDispatcher returns the internal bus used by the Hub.
func (h *Hub) EventDispatcher() events.Dispatcher {
	return h.eventDispatcher
}

// run is the single goroutine that mutates the clients map, eliminating lock contention.
// It also bridges the internal EventDispatcher to the WebSocket Broadcast path.
func (h *Hub) run(ctx context.Context) {
	// Subscribe to the global topic so any module can reach all WS clients
	// by publishing an Event with Topic == "global".
	var eventCh chan events.Event
	if h.eventDispatcher != nil {
		eventCh = h.eventDispatcher.Subscribe("global")
		defer h.eventDispatcher.Unsubscribe("global", eventCh)
	}

	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = true
			h.mu.Unlock()

		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send) // signals writePump to exit
			}
			h.mu.Unlock()

		case e, ok := <-eventCh:
			if !ok {
				// dispatcher closed the channel — stop listening
				eventCh = nil
				continue
			}
			// Forward internal event to all connected WS clients.
			// Broadcast is already non-blocking (evicts laggy clients).
			h.Broadcast(e.Topic, e.Payload)

		case <-ctx.Done():
			return
		}
	}
}

// Broadcast serializes msg and enqueues it into each client's send channel.
// Non-blocking: if a client's buffer is full the client is evicted (it is lagging too far behind).
func (h *Hub) Broadcast(eventType string, payload any) {
	data, err := marshalEvent(WSEvent{Type: eventType, Payload: payload})
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for c := range h.clients {
		select {
		case c.send <- data:
		default:
			// Client is too slow — evict asynchronously to avoid holding the lock.
			go func(client *Client) { h.unregister <- client }(c)
		}
	}
}

// ServeWS handles WebSocket upgrade requests from Echo.
func (h *Hub) ServeWS(c echo.Context) error {
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, sendBufSize),
	}
	h.register <- client

	// One goroutine per direction: readPump owns read, writePump owns write.
	// writePump exits when client.send is closed, which triggers conn.Close().
	go client.writePump()
	client.readPump() // blocks until connection closes

	return nil
}

// readPump pumps messages from the WebSocket to /dev/null (we are push-only).
// It keeps the read loop alive so the library can process control frames (ping/pong/close).
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			break
		}
	}
}

// writePump pumps messages from the send channel to the WebSocket connection.
// It is the ONLY goroutine that writes to c.conn, ensuring safe concurrent use.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel → send a close frame.
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
