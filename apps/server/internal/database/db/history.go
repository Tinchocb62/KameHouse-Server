package db

import (
	"kamehouse/internal/database/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type WatchHistoryRepository struct {
	*gorm.DB
}

func NewWatchHistoryRepository(db *gorm.DB) *WatchHistoryRepository {
	return &WatchHistoryRepository{
		DB: db,
	}
}

func (r *WatchHistoryRepository) UpsertBatch(items []models.WatchHistory) error {
	if len(items) == 0 {
		return nil
	}

	return r.DB.Transaction(func(tx *gorm.DB) error {
		return tx.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "account_id"}, {Name: "media_id"}, {Name: "episode_number"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"current_time",
				"duration",
				"updated_at",
			}),
		}).Create(&items).Error
	})
}
