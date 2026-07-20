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

// UpsertBatch performs a true atomic batch UPSERT using the unique index
// idx_media_episode (account_id, media_id, episode_number).
// On conflict, only CurrentTime and Duration are updated — preserving other fields.
func (r *WatchHistoryRepository) UpsertBatch(items []models.WatchHistory) error {
	if len(items) == 0 {
		return nil
	}

	return r.DB.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "account_id"},
			{Name: "media_id"},
			{Name: "episode_number"},
		},
		DoUpdates: clause.AssignmentColumns([]string{"current_time", "duration"}),
	}).CreateInBatches(items, 50).Error
}
