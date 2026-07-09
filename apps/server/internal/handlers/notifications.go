package handlers

import (
	"kamehouse/internal/database/models"

	"github.com/labstack/echo/v4"
)

// NotificationList is the payload returned by the notifications endpoint.
type NotificationList struct {
	Notifications []*models.Notification `json:"notifications"`
	UnreadCount   int64                  `json:"unreadCount"`
}

// HandleGetNotifications returns the most recent notifications with the unread count.
//
//	@summary returns recent notifications.
//	@desc Returns the latest in-app notifications (newest first) and the unread count.
//	@route /api/v1/notifications [GET]
//	@returns handlers.NotificationList
func (h *Handler) HandleGetNotifications(c echo.Context) error {
	notifications, err := h.App.Database.GetNotifications(50)
	if err != nil {
		return h.RespondWithError(c, err)
	}
	unread, err := h.App.Database.CountUnreadNotifications()
	if err != nil {
		return h.RespondWithError(c, err)
	}
	return h.RespondWithData(c, NotificationList{
		Notifications: notifications,
		UnreadCount:   unread,
	})
}

// HandleMarkNotificationsRead marks one notification (id > 0) or all (id omitted/0) as read.
//
//	@summary marks notifications as read.
//	@route /api/v1/notifications/read [POST]
//	@returns bool
func (h *Handler) HandleMarkNotificationsRead(c echo.Context) error {
	type body struct {
		ID uint `json:"id"` // 0 = mark all as read
	}
	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}
	if err := h.App.Database.MarkNotificationsRead(b.ID); err != nil {
		return h.RespondWithError(c, err)
	}
	return h.RespondWithData(c, true)
}

// HandleClearNotifications deletes all stored notifications.
//
//	@summary clears all notifications.
//	@route /api/v1/notifications [DELETE]
//	@returns bool
func (h *Handler) HandleClearNotifications(c echo.Context) error {
	if err := h.App.Database.DeleteAllNotifications(); err != nil {
		return h.RespondWithError(c, err)
	}
	return h.RespondWithData(c, true)
}
