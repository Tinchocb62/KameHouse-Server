package db

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"
)

type BackupResult struct {
	Path      string
	SizeBytes int64
	CreatedAt time.Time
}

// Backup creates a vacuumed copy of the database.
func (db *Database) Backup(backupDir string, keep int) (*BackupResult, error) {
	if db.sqlitePath == ":memory:" || db.sqlitePath == "" {
		return nil, errors.New("cannot backup in-memory database")
	}

	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create backup dir: %w", err)
	}

	timestamp := time.Now().Format("2006-01-02_15-04-05")
	backupFileName := fmt.Sprintf("kamehouse-backup-%s.db", timestamp)
	backupPath := filepath.Join(backupDir, backupFileName)

	// Ensure all writes are flushed to DB file
	if err := db.gormdb.Exec("PRAGMA wal_checkpoint(TRUNCATE);").Error; err != nil {
		db.Logger.Error().Err(err).Msg("db: WAL checkpoint failed before backup")
	}

	// Escape path for SQL just in case
	query := fmt.Sprintf("VACUUM INTO '%s'", backupPath)
	if err := db.gormdb.Exec(query).Error; err != nil {
		return nil, fmt.Errorf("VACUUM INTO failed: %w", err)
	}

	info, err := os.Stat(backupPath)
	if err != nil {
		return nil, fmt.Errorf("failed to stat backup file: %w", err)
	}

	res := &BackupResult{
		Path:      backupPath,
		SizeBytes: info.Size(),
		CreatedAt: time.Now(),
	}

	if keep > 0 {
		_ = rotateBackups(backupDir, keep)
	}

	return res, nil
}

func rotateBackups(backupDir string, keep int) error {
	entries, err := os.ReadDir(backupDir)
	if err != nil {
		return err
	}

	var backups []string
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".db" {
			backups = append(backups, entry.Name())
		}
	}

	if len(backups) <= keep {
		return nil
	}

	// Sort descending by name (which has timestamp)
	sort.Slice(backups, func(i, j int) bool {
		return backups[i] > backups[j]
	})

	for i := keep; i < len(backups); i++ {
		_ = os.Remove(filepath.Join(backupDir, backups[i]))
	}

	return nil
}
