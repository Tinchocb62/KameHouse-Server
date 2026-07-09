package db

import (
	"kamehouse/internal/database/models"
)

// InsertNotification persists a new notification and returns it with its ID set.
func (db *Database) InsertNotification(n *models.Notification) (*models.Notification, error) {
	if err := db.gormdb.Create(n).Error; err != nil {
		return nil, err
	}
	return n, nil
}

// GetNotifications returns the most recent notifications, newest first.
func (db *Database) GetNotifications(limit int) ([]*models.Notification, error) {
	if limit <= 0 {
		limit = 50
	}
	var notifications []*models.Notification
	err := db.gormdb.Order("id DESC").Limit(limit).Find(&notifications).Error
	return notifications, err
}

// CountUnreadNotifications returns the number of unread notifications.
func (db *Database) CountUnreadNotifications() (int64, error) {
	var count int64
	err := db.gormdb.Model(&models.Notification{}).Where("read = ?", false).Count(&count).Error
	return count, err
}

// MarkNotificationsRead marks a single notification (id > 0) or all of them
// (id == 0) as read.
func (db *Database) MarkNotificationsRead(id uint) error {
	q := db.gormdb.Model(&models.Notification{})
	if id > 0 {
		q = q.Where("id = ?", id)
	}
	return q.Where("read = ?", false).Update("read", true).Error
}

// DeleteAllNotifications removes every stored notification.
func (db *Database) DeleteAllNotifications() error {
	return db.gormdb.Where("1 = 1").Delete(&models.Notification{}).Error
}
