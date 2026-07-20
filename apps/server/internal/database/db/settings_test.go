package db

import (
	"context"
	"kamehouse/internal/database/models"
	"kamehouse/internal/util"
	"testing"
	"time"
)

func TestSettingsPersistence(t *testing.T) {
	tempDir := t.TempDir()
	logger := util.NewLogger()

	// Initialize test database
	database, err := NewDatabase(context.Background(), tempDir, "settings_test", logger)
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	defer database.Close()
	defer database.Shutdown()

	// 1. Prepare sample settings with old and new configurations
	testSettings := &models.Settings{
		BaseModel: models.BaseModel{
			ID:        1,
			UpdatedAt: time.Now(),
		},
		Library: models.LibrarySettings{
			SeriesPaths:              []string{"/path/to/series1", "/path/to/series2"},
			MoviePaths:               []string{"/path/to/movies"},
			ScannerProvider:          "tmdb",
			PrimaryMetadataProvider:  "tmdb",
			TmdbApiKey:               "test_tmdb_api_key",
			ScannerUseLegacyMatching: true,
		},
		MediaPlayer: models.MediaPlayerSettings{},
		Notifications: models.NotificationSettings{
			DisableNotifications:            true,
			DisableAutoScannerNotifications: false,
		},
		Platform: models.PlatformSettings{
			HideAudienceScore: true,
		},
	}

	// Reset global state cache to ensure we fetch from GORM
	CurrSettings = nil

	// 2. Perform the Upsert operation
	savedSettings, err := database.UpsertSettings(testSettings)
	if err != nil {
		t.Fatalf("Failed to save settings: %v", err)
	}

	// Validate returned settings
	if savedSettings.Library.TmdbApiKey != "test_tmdb_api_key" {
		t.Errorf("Expected TMDB Api Key to be 'test_tmdb_api_key', got '%s'", savedSettings.Library.TmdbApiKey)
	}
	if savedSettings.Platform.HideAudienceScore != true {
		t.Errorf("Expected HideAudienceScore to be true, got %t", savedSettings.Platform.HideAudienceScore)
	}

	// 3. Clear cache and retrieve settings from the database again
	CurrSettings = nil
	retrievedSettings, err := database.GetSettings()
	if err != nil {
		t.Fatalf("Failed to retrieve settings: %v", err)
	}

	// 4. Run thorough assertions to verify everything was persisted and mapped correctly
	// A. Library Settings assertions
	if len(retrievedSettings.Library.SeriesPaths) != 2 || retrievedSettings.Library.SeriesPaths[0] != "/path/to/series1" {
		t.Errorf("Series paths not retrieved correctly: %v", retrievedSettings.Library.SeriesPaths)
	}

	if retrievedSettings.Library.ScannerUseLegacyMatching != true {
		t.Errorf("ScannerUseLegacyMatching was not persisted as true")
	}

	// C. Notification Settings assertions
	if retrievedSettings.Notifications.DisableNotifications != true {
		t.Errorf("Expected DisableNotifications to be true, got %t", retrievedSettings.Notifications.DisableNotifications)
	}

	// D. Platform Settings assertions
	if retrievedSettings.Platform.HideAudienceScore != true {
		t.Errorf("Expected HideAudienceScore to be true, got %t", retrievedSettings.Platform.HideAudienceScore)
	}

	t.Log("Settings persistence and integration test succeeded perfectly!")
}
