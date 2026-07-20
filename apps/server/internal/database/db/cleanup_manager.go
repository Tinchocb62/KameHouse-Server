package db

import (
	"kamehouse/internal/database/models"

	"github.com/rs/zerolog"
	"gorm.io/gorm"
)

// CleanupManager manages database cleanup operations to prevent concurrent access issues
type CleanupManager struct {
	gormdb *gorm.DB
	logger *zerolog.Logger
}

func NewCleanupManager(gormdb *gorm.DB, logger *zerolog.Logger) *CleanupManager {
	return &CleanupManager{
		gormdb: gormdb,
		logger: logger,
	}
}

func (cm *CleanupManager) RunAllCleanupOperations() {
	cm.logger.Debug().Msg("database: Starting cleanup operations")

	cm.trimScanSummaryEntries()
	cm.trimLocalFileEntries()
	cm.removeOrphanedAndCollidedMedia()

	cm.logger.Debug().Msg("database: Cleanup operations completed")
}

// trimScanSummaryEntries trims scan summary entries
func (cm *CleanupManager) trimScanSummaryEntries() {
	var count int64
	err := cm.gormdb.Model(&models.ScanSummary{}).Count(&count).Error
	if err != nil {
		cm.logger.Error().Err(err).Msg("database: Failed to count scan summary entries")
		return
	}
	if count > 10 {
		var idsToDelete []uint
		err = cm.gormdb.Model(&models.ScanSummary{}).
			Select("id").
			Order("id ASC").
			Limit(int(count-5)).
			Pluck("id", &idsToDelete).Error
		if err != nil {
			cm.logger.Error().Err(err).Msg("database: Failed to get scan summary IDs to delete")
			return
		}

		if len(idsToDelete) > 0 {
			batchSize := 900
			for i := 0; i < len(idsToDelete); i += batchSize {
				end := i + batchSize
				if end > len(idsToDelete) {
					end = len(idsToDelete)
				}
				batch := idsToDelete[i:end]
				err = cm.gormdb.Delete(&models.ScanSummary{}, batch).Error
				if err != nil {
					cm.logger.Error().Err(err).Msg("database: Failed to delete old scan summary entries")
					return // Exit on first error
				}
			}
			cm.logger.Debug().Int("deleted", len(idsToDelete)).Msg("database: Deleted old scan summary entries")
		}
	}
}

// trimLocalFileEntries trims local file entries in the legacy blob table.
// The legacy `local_files` blob table is dropped during schema migration once
// its data has been ported to the relational `local_file` model, so on any
// migrated database it simply won't exist. Skip silently in that case instead
// of logging a spurious error on every startup.
func (cm *CleanupManager) trimLocalFileEntries() {
	if !cm.gormdb.Migrator().HasTable("local_files") {
		return
	}

	var count int64
	// Explicitly use the legacy table name to avoid any ambiguity
	err := cm.gormdb.Table("local_files").Count(&count).Error
	if err != nil {
		cm.logger.Error().Err(err).Msg("database: Failed to count legacy local file entries")
		return
	}
	if count > 10 {
		var idsToDelete []uint
		err = cm.gormdb.Table("local_files").
			Select("id").
			Order("id ASC").
			Limit(int(count-5)).
			Pluck("id", &idsToDelete).Error
		if err != nil {
			cm.logger.Error().Err(err).Msg("database: Failed to get legacy local file IDs to delete")
			return
		}

		if len(idsToDelete) > 0 {
			err = cm.gormdb.Delete(&models.LocalFiles{}, idsToDelete).Error
			if err != nil {
				cm.logger.Error().Err(err).Msg("database: Failed to delete old legacy local file entries")
				return
			}
			cm.logger.Debug().Int("deleted", len(idsToDelete)).Msg("database: Deleted old legacy local file entries (blob storage)")
		}
	}
}

// removeOrphanedAndCollidedMedia removes TV shows/anime that share a TMDB ID
// with a movie AND have no local files associated — they are phantom entries.
// Uses a single SQL JOIN instead of loading all media into Go memory.
func (cm *CleanupManager) removeOrphanedAndCollidedMedia() {
	type collidedRow struct {
		ID           uint
		TmdbID       int
		TitleEnglish string
	}
	var collided []collidedRow

	// Find shows/anime whose tmdb_id collides with a movie AND have no local files.
	// The LEFT JOIN + lf.id IS NULL efficiently performs the "no files" check in SQL.
	err := cm.gormdb.Raw(`
		SELECT s.id, s.tmdb_id, s.title_english
		FROM library_media s
		INNER JOIN library_media m
			ON m.tmdb_id = s.tmdb_id AND m.type = 'MOVIE'
		LEFT JOIN local_file lf
			ON lf.library_media_id = s.id
		WHERE s.type IN ('SHOW', 'ANIME')
		  AND lf.id IS NULL
	`).Scan(&collided).Error

	if err != nil {
		cm.logger.Error().Err(err).Msg("database cleanup: Failed to find collided media")
		return
	}
	if len(collided) == 0 {
		return
	}

	for _, row := range collided {
		cm.logger.Warn().
			Uint("id", row.ID).
			Int("tmdbID", row.TmdbID).
			Str("title", row.TitleEnglish).
			Msg("database cleanup: Deleting collided show with no local files")

		_ = cm.gormdb.Transaction(func(tx *gorm.DB) error {
			_ = tx.Where("library_media_id = ?", row.ID).Delete(&models.LibraryEpisode{})
			_ = tx.Where("library_media_id = ?", row.ID).Delete(&models.LibrarySeason{})
			_ = tx.Where("library_media_id = ?", row.ID).Delete(&models.MediaEntryListData{})
			_ = tx.Delete(&models.LibraryMedia{}, row.ID)
			return nil
		})
	}
}
