// Package notifier centralizes in-app and OS notifications (modeled on
// Seanime's notifier). It persists notifications, broadcasts them to web
// clients over WebSocket, and shows a best-effort OS toast on the server
// machine. Access is through a global singleton so deeply nested modules
// (scanner, transcoder) can emit notifications without constructor threading.
package notifier

import (
	"sync"

	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/events"

	"github.com/gen2brain/beeep"
	"github.com/rs/zerolog"
)

type NotificationType string

const (
	TypeScanner     NotificationType = "scanner"
	TypeMediastream NotificationType = "mediastream"
	TypeSystem      NotificationType = "system"
)

type Notifier struct {
	mu       sync.RWMutex
	database *db.Database
	ws       events.WSEventManagerInterface
	logger   *zerolog.Logger
	appName  string
}

var global = &Notifier{}

// Global returns the process-wide notifier. Safe to call before Init: Notify
// becomes a no-op until initialized.
func Global() *Notifier { return global }

func (n *Notifier) Init(database *db.Database, ws events.WSEventManagerInterface, logger *zerolog.Logger) {
	n.mu.Lock()
	defer n.mu.Unlock()
	n.database = database
	n.ws = ws
	n.logger = logger
	n.appName = "KameHouse"
}

// Notify persists a notification, pushes it to connected clients and shows an
// OS toast. Gated by the user's NotificationSettings; never blocks the caller.
func (n *Notifier) Notify(ntype NotificationType, title string, message string) {
	n.mu.RLock()
	database, ws, logger := n.database, n.ws, n.logger
	appName := n.appName
	n.mu.RUnlock()

	if database == nil {
		return // not initialized (e.g. tests)
	}

	if !n.enabledFor(ntype) {
		return
	}

	notification := &models.Notification{
		Type:    string(ntype),
		Title:   title,
		Message: message,
	}

	if _, err := database.InsertNotification(notification); err != nil {
		if logger != nil {
			logger.Error().Err(err).Msg("notifier: Failed to persist notification")
		}
		return
	}

	if logger != nil {
		logger.Debug().Str("type", string(ntype)).Str("title", title).Msg("notifier: Notification created")
	}

	if ws != nil {
		ws.SendEvent(events.NotificationReceived, notification)
	}

	// OS toast (server machine) — best effort, off the caller's goroutine.
	go func() {
		_ = beeep.Notify(appName+" — "+title, message, "")
	}()
}

// enabledFor checks the user's notification settings for the given type.
func (n *Notifier) enabledFor(ntype NotificationType) bool {
	n.mu.RLock()
	database := n.database
	n.mu.RUnlock()

	settings, err := database.GetSettings()
	if err != nil || settings == nil {
		return true // fail open: settings unavailable should not silence errors
	}
	if settings.Notifications.DisableNotifications {
		return false
	}
	if ntype == TypeScanner && settings.Notifications.DisableAutoScannerNotifications {
		return false
	}
	return true
}
