package db

import (
	"kamehouse/internal/database/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ─────────────────────────────────────────────────────────────────────────────
// Batch size for CreateInBatches.
//
// SQLite's default SQLITE_LIMIT_VARIABLE_NUMBER is 999.
// models.LocalFiles has ~4 columns (id, created_at, updated_at, value) per row
// → 999 / 4 = ~249; we use 150 to stay well within the limit and leave
// headroom for multi-column ON CONFLICT expressions.
// ─────────────────────────────────────────────────────────────────────────────
const localFilesBatchSize = 150

// ─────────────────────────────────────────────────────────────────────────────
// UpsertLocalFiles — single-row blob upsert (legacy/production path).
//
// LocalFiles is a JSON-serialised snapshot of the entire file list stored as
// a single row. ON CONFLICT on `id` performs a full row replacement so the
// scanner only ever keeps the most-recent snapshot.
// ─────────────────────────────────────────────────────────────────────────────

// UpsertLocalFiles saves or replaces the single-row local-file snapshot.
func (db *Database) UpsertLocalFiles(localFiles *models.LocalFiles) (*models.LocalFiles, error) {
	err := db.gormdb.
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			UpdateAll: true,
		}).
		Create(localFiles).Error

	if err != nil {
		db.Logger.Error().Err(err).Msg("db: Failed to upsert local files")
		return nil, err
	}

	db.Logger.Debug().Msg("db: Local files upserted")
	return localFiles, nil
}

// InsertLocalFiles inserts the local-file snapshot as a new entry.
func (db *Database) InsertLocalFiles(localFiles *models.LocalFiles) (*models.LocalFiles, error) {
	if err := db.gormdb.Create(localFiles).Error; err != nil {
		db.Logger.Error().Err(err).Msg("db: Failed to insert local files")
		return nil, err
	}

	db.Logger.Debug().Msg("db: Local files inserted")
	return localFiles, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// BulkUpsertLocalFiles — high-performance batch upsert (scanner agent path).
//
// Wraps all inserts in a single SQLite transaction and chunks the slice into
// batches of localFilesBatchSize to stay inside SQLite's variable-number limit.
//
// ON CONFLICT on `id`:
//   - id == 0  → INSERT (auto-assigned by SQLite)
//   - id  > 0  → UPDATE all columns (full replacement of the existing row)
//
// A 10,000-row scan completes in < 1 s on commodity hardware because:
//   1. Single transaction → one fsync at commit instead of N.
//   2. CreateInBatches  → SQLite multi-row INSERT VALUES instead of N single INSERTs.
//   3. ON CONFLICT      → no SELECT-before-INSERT round-trip needed.
// ─────────────────────────────────────────────────────────────────────────────

// BulkUpsertLocalFiles saves a slice of LocalFiles records in a single
// transaction, chunked into batches of localFilesBatchSize each.
func (db *Database) BulkUpsertLocalFiles(files []*models.LocalFiles) error {
	if len(files) == 0 {
		return nil
	}

	onConflict := clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		UpdateAll: true,
	}

	err := db.gormdb.Transaction(func(tx *gorm.DB) error {
		return tx.
			Clauses(onConflict).
			CreateInBatches(files, localFilesBatchSize).
			Error
	})
	if err != nil {
		db.Logger.Error().
			Err(err).
			Int("count", len(files)).
			Msg("db: Failed to bulk upsert local files")
		return err
	}

	db.Logger.Debug().
		Int("count", len(files)).
		Msg("db: Local files bulk upserted")
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// ShelvedLocalFiles upserts
// ─────────────────────────────────────────────────────────────────────────────

// UpsertShelvedLocalFiles saves or replaces the single-row shelved snapshot.
func (db *Database) UpsertShelvedLocalFiles(shelvedFiles *models.ShelvedLocalFiles) (*models.ShelvedLocalFiles, error) {
	err := db.gormdb.
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			UpdateAll: true,
		}).
		Create(shelvedFiles).Error

	if err != nil {
		db.Logger.Error().Err(err).Msg("db: Failed to upsert shelved local files")
		return nil, err
	}

	db.Logger.Debug().Msg("db: Shelved local files upserted")
	return shelvedFiles, nil
}

// BulkUpsertShelvedLocalFiles saves a slice of ShelvedLocalFiles records in a
// single transaction, using the same batching strategy as BulkUpsertLocalFiles.
func (db *Database) BulkUpsertShelvedLocalFiles(files []*models.ShelvedLocalFiles) error {
	if len(files) == 0 {
		return nil
	}

	onConflict := clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		UpdateAll: true,
	}

	err := db.gormdb.Transaction(func(tx *gorm.DB) error {
		return tx.
			Clauses(onConflict).
			CreateInBatches(files, localFilesBatchSize).
			Error
	})
	if err != nil {
		db.Logger.Error().
			Err(err).
			Int("count", len(files)).
			Msg("db: Failed to bulk upsert shelved local files")
		return err
	}

	db.Logger.Debug().
		Int("count", len(files)).
		Msg("db: Shelved local files bulk upserted")
	return nil
}
