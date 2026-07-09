package db

import (
	"context"
	"testing"
	"time"

	"github.com/rs/zerolog"
)

func TestDeleteExpiredMetadataCache(t *testing.T) {
	ctx := context.Background()
	logger := zerolog.Nop()
	tempDir := t.TempDir()

	db, err := NewDatabase(ctx, tempDir, "testdb", &logger)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// 1. Insert entry with 1ms TTL (will expire immediately)
	err = UpsertMetadataCache(db, "test", "key1", "val1", 1*time.Millisecond)
	if err != nil {
		t.Fatalf("Failed to upsert: %v", err)
	}

	// 2. Insert entry with 1h TTL (will not expire)
	err = UpsertMetadataCache(db, "test", "key2", "val2", 1*time.Hour)
	if err != nil {
		t.Fatalf("Failed to upsert: %v", err)
	}

	// 3. Insert entry with no TTL (0, will not expire)
	err = UpsertMetadataCache(db, "test", "key3", "val3", 0)
	if err != nil {
		t.Fatalf("Failed to upsert: %v", err)
	}

	time.Sleep(10 * time.Millisecond) // ensure key1 expires

	deleted, err := DeleteExpiredMetadataCache(db)
	if err != nil {
		t.Fatalf("Failed to delete expired cache: %v", err)
	}
	if deleted != 1 {
		t.Errorf("Expected 1 row to be deleted, got %d", deleted)
	}

	// Verify what's left
	var val string
	ok, _ := GetMetadataCache(db, "test", "key1", &val)
	if ok {
		t.Errorf("key1 should have been deleted")
	}

	ok, _ = GetMetadataCache(db, "test", "key2", &val)
	if !ok {
		t.Errorf("key2 should still exist")
	}

	ok, _ = GetMetadataCache(db, "test", "key3", &val)
	if !ok {
		t.Errorf("key3 should still exist")
	}
}
