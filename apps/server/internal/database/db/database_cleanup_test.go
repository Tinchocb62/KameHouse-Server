package db

import (
	"context"
	"fmt"
	"kamehouse/internal/database/models"
	"kamehouse/internal/util"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/dustin/go-humanize"
)

func TestDatabaseCleanupManager(t *testing.T) {
	tempDir := t.TempDir()
	logger := util.NewLogger()

	database, err := NewDatabase(context.Background(), tempDir, "cleanup_test", logger)
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	defer database.Close()

	t.Log("Populating database with test data...")
	populateCleanupTestData(t, database)

	checkTableCounts(t, database, "before cleanup")

	dbPath := filepath.Join(tempDir, "cleanup_test.db")
	if stat, err := os.Stat(dbPath); err != nil {
		t.Errorf("Database file does not exist: %v", err)
	} else {
		t.Logf("Database file size: %s bytes", humanize.Bytes(uint64(stat.Size())))
	}

	t.Log("Running database cleanup...")
	database.RunDatabaseCleanup()

	t.Log("Launching many write operations...")
	time.Sleep(100 * time.Millisecond)
	for i := 0; i < 1000; i++ {
		go database.Gorm().Create(&models.ScanSummary{Value: []byte(fmt.Sprintf("scan summary data %d - %s", i, generateCleanupTestData(5)))})
	}

	time.Sleep(1 * time.Second)

	checkTableCounts(t, database, "after cleanup")

	if stat, err := os.Stat(dbPath); err != nil {
		t.Errorf("Database file does not exist: %v", err)
	} else {
		t.Logf("Database file size: %s bytes", humanize.Bytes(uint64(stat.Size())))
	}

	t.Log("Cleanup manager test completed successfully")
}

func populateCleanupTestData(t *testing.T, database *Database) {
	if err := database.Gorm().AutoMigrate(&models.LocalFiles{}); err != nil {
		t.Fatalf("Failed to auto migrate legacy tables: %v", err)
	}

	tx := database.Gorm().Begin()
	defer tx.Rollback()

	for i := 0; i < 10000; i++ {
		scanSummary := &models.ScanSummary{
			Value: []byte(fmt.Sprintf("scan summary data %d - %s", i, generateCleanupTestData(5))),
		}
		err := tx.Create(scanSummary).Error
		if err != nil {
			t.Fatalf("Failed to create scan summary: %v", err)
		}
	}

	for i := 0; i < 10000; i++ {
		localFiles := &models.LocalFiles{
			Value: []byte(fmt.Sprintf("local files data %d - %s", i, generateCleanupTestData(5))),
		}
		err := tx.Create(localFiles).Error
		if err != nil {
			t.Fatalf("Failed to create local files: %v", err)
		}
	}

	if err := tx.Commit().Error; err != nil {
		t.Fatalf("Failed to commit transaction: %v", err)
	}
}

func checkTableCounts(t *testing.T, database *Database, phase string) {
	var scanCount, localCount int64

	err := database.Gorm().Model(&models.ScanSummary{}).Count(&scanCount).Error
	if err != nil {
		t.Errorf("Failed to count scan summaries: %v", err)
	}

	err = database.Gorm().Model(&models.LocalFiles{}).Count(&localCount).Error
	if err != nil {
		t.Errorf("Failed to count local files: %v", err)
	}

	t.Logf("Record counts %s: ScanSummary=%d, LocalFiles=%d",
		phase, scanCount, localCount)

	if phase == "after cleanup" {
		if localCount > 10 {
			t.Errorf("Expected local files to be trimmed to ≤10, got %d", localCount)
		}

		var minLocalFiles models.LocalFiles
		if err := database.Gorm().Order("id asc").First(&minLocalFiles).Error; err != nil {
			t.Errorf("Failed to get min local files: %v", err)
		} else if minLocalFiles.ID != 9996 {
			t.Errorf("Expected min local files ID to be 9996, got %d", minLocalFiles.ID)
		}
	}
}

func generateCleanupTestData(length int) string {
	data := make([]byte, length)
	for i := range data {
		data[i] = byte('A' + (i % 26))
	}
	return string(data)
}
