package events

import (
	"encoding/json"
	"fmt"
	"kamehouse/internal/util"
	"kamehouse/internal/util/result"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
)

type WSEventManagerInterface interface {
	SendEvent(t string, payload interface{})
	SendEventTo(clientID string, t string, payload interface{}, noLog ...bool)
	SubscribeToClientEvents(id string) *ClientEventSubscriber
	SubscribeToClientNativePlayerEvents(id string) *ClientEventSubscriber
	SubscribeToClientVideoCoreEvents(id string) *ClientEventSubscriber

	UnsubscribeFromClientEvents(id string)
}

type GlobalWSEventManagerWrapper struct {
	WSEventManager WSEventManagerInterface
}

var (
	GlobalWSEventManager *GlobalWSEventManagerWrapper
	globalWSManagerOnce  sync.Once
)

func (w *GlobalWSEventManagerWrapper) SendEvent(t string, payload interface{}) {
	if w.WSEventManager == nil {
		return
	}
	w.WSEventManager.SendEvent(t, payload)
}

func (w *GlobalWSEventManagerWrapper) SendEventTo(clientID string, t string, payload interface{}, noLog ...bool) {
	if w.WSEventManager == nil {
		return
	}
	w.WSEventManager.SendEventTo(clientID, t, payload, noLog...)
}

type (
	// WSEventManager holds the websocket connection instance.
	// It is attached to the App instance, so it is available to other handlers.
	WSEventManager struct {
		Conns  []*WSConn
		Logger *zerolog.Logger

		// ShutdownSignal is sent when the desktop sidecar monitor detects
		// a prolonged loss of WebSocket connections. The main goroutine should
		// listen on this channel and initiate graceful shutdown.
		ShutdownSignal chan struct{}

		// hasHadConnection tracks if at least one WS connection was ever established.
		// Protected by connsMu.
		hasHadConnection bool

		// connsMu protects Conns and hasHadConnection.
		// Use RLock for reads, Lock for writes.
		connsMu sync.RWMutex

		// eventMu protects the subscriber maps.
		eventMu sync.RWMutex

		clientEventSubscribers             *result.Map[string, *ClientEventSubscriber]
		clientNativePlayerEventSubscribers *result.Map[string, *ClientEventSubscriber]
		clientVideoCoreEventSubscribers    *result.Map[string, *ClientEventSubscriber]

		dispatcher                  Dispatcher
	}

	ClientEventSubscriber struct {
		Channel chan *WebsocketClientEvent
		mu      sync.RWMutex
		closed  bool
	}

	WSConn struct {
		ID      string
		Conn    *websocket.Conn
		writeMu sync.Mutex
	}

	WSEventEnvelope struct {
		EventID   string `json:"event_id,omitempty"`
		Type      string `json:"type"`
		Payload   any    `json:"payload"`
		Timestamp int64  `json:"timestamp"`
	}
)

var wsEventPool = sync.Pool{
	New: func() any {
		return &WSEventEnvelope{}
	},
}

// NewWSEventManager creates a new WSEventManager instance for App.
func NewWSEventManager(logger *zerolog.Logger, dispatcher Dispatcher) *WSEventManager {
	ret := &WSEventManager{
		Logger:                             logger,
		Conns:                              make([]*WSConn, 0),
		ShutdownSignal:                     make(chan struct{}, 1),
		clientEventSubscribers:             result.NewMap[string, *ClientEventSubscriber](),
		clientNativePlayerEventSubscribers: result.NewMap[string, *ClientEventSubscriber](),
		clientVideoCoreEventSubscribers:    result.NewMap[string, *ClientEventSubscriber](),
		dispatcher:                         dispatcher,
	}

	// Start bridging internal events to WebSockets
	if dispatcher != nil {
		go func() {
			defer util.HandlePanicInModuleThen("events/WSEventManager/Bridge", func() {})
			ch := dispatcher.Subscribe("*")
			defer dispatcher.Unsubscribe("*", ch)
			for e := range ch {
				// Avoid loops: don't bridge events that might have originated from WS if they use the same topics
				// For now, we bridge everything to the frontend.
				ret.SendEvent(e.Topic, e.Payload)
			}
		}()
	}

	globalWSManagerOnce.Do(func() {
		GlobalWSEventManager = &GlobalWSEventManagerWrapper{
			WSEventManager: ret,
		}
	})
	return ret
}

// Dispatcher returns the event dispatcher.
func (m *WSEventManager) Dispatcher() Dispatcher {
	return m.dispatcher
}

// ExitIfNoConnsAsDesktopSidecar monitors the websocket connection as a desktop sidecar.
// It checks for a connection every 5 seconds. If a connection is lost, it starts a countdown and waits for 15 seconds.
// If a connection is not established within 15 seconds, it will exit the app.
func (m *WSEventManager) ExitIfNoConnsAsDesktopSidecar() {
	go func() {
		defer util.HandlePanicInModuleThen("events/ExitIfNoConnsAsDesktopSidecar", func() {})

		m.Logger.Info().Msg("ws: Monitoring connection as desktop sidecar")
		// Create a ticker to check connection every 5 seconds
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		// Track connection loss time
		var connectionLostTime time.Time
		exitTimeout := 60 * time.Second

		for range ticker.C {
			// Check WebSocket connection status (protected read)
			m.connsMu.RLock()
			connsEmpty := len(m.Conns) == 0
			hadConn := m.hasHadConnection
			m.connsMu.RUnlock()

			if connsEmpty && hadConn {
				// If not connected and first detection of connection loss
				if connectionLostTime.IsZero() {
					m.Logger.Warn().Msg("ws: No connection detected. Starting countdown...")
					connectionLostTime = time.Now()
				}

				// Check if connection has been lost for more than exitTimeout
				if time.Since(connectionLostTime) > exitTimeout {
					m.Logger.Warn().Msg("ws: No connection detected for 10 seconds. Requesting shutdown...")
					// Signal shutdown instead of os.Exit to allow graceful cleanup
					select {
					case m.ShutdownSignal <- struct{}{}:
					default:
					}
					return
				}
			} else {
				// Connection is active, reset connection lost time
				connectionLostTime = time.Time{}
			}
		}
	}()
}

// AddConn registers a new websocket connection.
func (m *WSEventManager) AddConn(id string, conn *websocket.Conn) {
	m.connsMu.Lock()
	defer m.connsMu.Unlock()
	m.hasHadConnection = true
	m.Conns = append(m.Conns, &WSConn{
		ID:   id,
		Conn: conn,
	})
}

// GetConnIDs returns a snapshot of the IDs of all currently connected clients.
func (m *WSEventManager) GetConnIDs() []string {
	m.connsMu.RLock()
	defer m.connsMu.RUnlock()
	ids := make([]string, 0, len(m.Conns))
	for _, conn := range m.Conns {
		ids = append(ids, conn.ID)
	}
	return ids
}

// RemoveConn removes a websocket connection by ID and cleans up its subscribers.
func (m *WSEventManager) RemoveConn(id string) {
	m.connsMu.Lock()
	var connToClose *WSConn
	for i, conn := range m.Conns {
		if conn.ID == id {
			connToClose = conn
			m.Conns = append(m.Conns[:i], m.Conns[i+1:]...)
			break
		}
	}
	m.connsMu.Unlock()

	if connToClose != nil {
		_ = connToClose.Conn.Close()
	}

	// Cleanup subscribers after releasing connsMu to avoid lock ordering issues
	m.UnsubscribeFromClientEvents(id)
}

// SendEvent sends a websocket event to all connected clients.
func (m *WSEventManager) SendEvent(t string, payload interface{}) {
	m.connsMu.RLock()
	if len(m.Conns) == 0 {
		m.connsMu.RUnlock()
		return
	}

	if t != PlaybackManagerProgressPlaybackState && payload == nil {
		m.Logger.Trace().Str("type", t).Msg("ws: Sending message")
	}

	// Snapshot the connection list to avoid holding the lock during I/O
	conns := make([]*WSConn, len(m.Conns))
	copy(conns, m.Conns)
	m.connsMu.RUnlock()

	env := wsEventPool.Get().(*WSEventEnvelope)
	env.EventID = ""
	env.Type = t
	env.Payload = payload
	env.Timestamp = time.Now().UnixMilli()

	defer func() {
		env.Payload = nil // Reset for GC
		wsEventPool.Put(env)
	}()

	data, err := json.Marshal(env)
	if err != nil {
		return
	}

	for _, conn := range conns {
		func() {
			conn.writeMu.Lock()
			defer conn.writeMu.Unlock()
			defer func() {
				if r := recover(); r != nil {
					m.Logger.Error().Interface("panic", r).Msg("ws: Recovered from panic in SendEvent write (possibly closed websocket)")
				}
			}()
			_ = conn.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			_ = conn.Conn.WriteMessage(websocket.TextMessage, data)
		}()
	}
}

// SendEventTo sends a websocket event to the specified client.
func (m *WSEventManager) SendEventTo(clientID string, t string, payload interface{}, noLog ...bool) {
	m.connsMu.RLock()
	var targetConn *WSConn
	for _, conn := range m.Conns {
		if conn.ID == clientID {
			targetConn = conn
			break
		}
	}
	m.connsMu.RUnlock()

	if targetConn == nil {
		return
	}

	if t != "pong" {
		if len(noLog) == 0 || !noLog[0] {
			truncated := fmt.Sprintf("%v", payload)
			if len(truncated) > 500 {
				truncated = truncated[:500] + "..."
			}
			m.Logger.Trace().Str("to", clientID).Str("type", t).Str("payload", truncated).Msg("ws: Sending message")
		}
	}

	env := wsEventPool.Get().(*WSEventEnvelope)
	env.EventID = ""
	env.Type = t
	env.Payload = payload
	env.Timestamp = time.Now().UnixMilli()

	targetConn.writeMu.Lock()
	defer targetConn.writeMu.Unlock()

	defer func() {
		if r := recover(); r != nil {
			m.Logger.Error().Interface("panic", r).Msg("ws: Recovered from panic in SendEventTo (possibly closed websocket)")
		}
		env.Payload = nil // Reset for GC
		wsEventPool.Put(env)
	}()

	_ = targetConn.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	_ = targetConn.Conn.WriteJSON(env)
}

func (m *WSEventManager) SendStringTo(clientID string, s string) {
	m.connsMu.RLock()
	defer m.connsMu.RUnlock()

	for _, conn := range m.Conns {
		if conn.ID == clientID {
			conn.writeMu.Lock()
			_ = conn.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			_ = conn.Conn.WriteMessage(websocket.TextMessage, []byte(s))
			conn.writeMu.Unlock()
		}
	}
}

func (m *WSEventManager) OnClientEvent(event *WebsocketClientEvent) {
	m.eventMu.RLock()
	defer m.eventMu.RUnlock()

	onEvent := func(key string, subscriber *ClientEventSubscriber) bool {
		go func() {
			defer util.HandlePanicInModuleThen("events/OnClientEvent/clientNativePlayerEventSubscribers", func() {})
			subscriber.mu.RLock()
			defer subscriber.mu.RUnlock()
			if !subscriber.closed {
				select {
				case subscriber.Channel <- event:
				default:
					// Channel is blocked, skip sending
					m.Logger.Warn().Msgf("ws: Client event channel is blocked, event dropped, %v", subscriber)
				}
			}
		}()
		return true
	}

	switch event.Type {
	case NativePlayerEventType:
		m.clientNativePlayerEventSubscribers.Range(onEvent)
	case VideoCoreEventType:
		m.clientVideoCoreEventSubscribers.Range(onEvent)
	default:
		m.clientEventSubscribers.Range(onEvent)
	}
}

func (m *WSEventManager) SubscribeToClientEvents(id string) *ClientEventSubscriber {
	subscriber := &ClientEventSubscriber{
		Channel: make(chan *WebsocketClientEvent, 100), // Reduced from 900 → 100
	}
	m.clientEventSubscribers.Set(id, subscriber)
	return subscriber
}

func (m *WSEventManager) SubscribeToClientNativePlayerEvents(id string) *ClientEventSubscriber {
	subscriber := &ClientEventSubscriber{
		Channel: make(chan *WebsocketClientEvent, 100),
	}
	m.clientNativePlayerEventSubscribers.Set(id, subscriber)
	return subscriber
}

func (m *WSEventManager) SubscribeToClientVideoCoreEvents(id string) *ClientEventSubscriber {
	subscriber := &ClientEventSubscriber{
		Channel: make(chan *WebsocketClientEvent, 100),
	}
	m.clientVideoCoreEventSubscribers.Set(id, subscriber)
	return subscriber
}


func (m *WSEventManager) UnsubscribeFromClientEvents(id string) {
	m.eventMu.Lock()
	defer m.eventMu.Unlock()
	defer func() {
		if r := recover(); r != nil {
			m.Logger.Warn().Msg("ws: Failed to unsubscribe from client events")
		}
	}()

	// Check ALL maps independently — a client may appear in more than one due to
	// partial re-registration. Using else-if would leak closed channels.
	var toClose []*ClientEventSubscriber

	if s, found := m.clientEventSubscribers.Get(id); found {
		m.clientEventSubscribers.Delete(id)
		toClose = append(toClose, s)
	}
	if s, found := m.clientNativePlayerEventSubscribers.Get(id); found {
		m.clientNativePlayerEventSubscribers.Delete(id)
		toClose = append(toClose, s)
	}
	if s, found := m.clientVideoCoreEventSubscribers.Get(id); found {
		m.clientVideoCoreEventSubscribers.Delete(id)
		toClose = append(toClose, s)
	}


	for _, subscriber := range toClose {
		subscriber.mu.Lock()
		if !subscriber.closed {
			subscriber.closed = true
			close(subscriber.Channel)
		}
		subscriber.mu.Unlock()
	}
}