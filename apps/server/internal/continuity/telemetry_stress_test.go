package continuity

import (
	"context"
	"kamehouse/internal/database/db"
	"kamehouse/internal/test_utils"
	"kamehouse/internal/util"
	"kamehouse/internal/util/filecache"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestTelemetryManager_Stress(t *testing.T) {
	test_utils.SetTwoLevelDeep()
	test_utils.InitTestProvider(t)

	logger := util.NewLogger()
	tempDir := t.TempDir()

	database, err := db.NewDatabase(context.Background(), test_utils.ConfigData.Path.DataDir, test_utils.ConfigData.Database.Name, logger)
	require.NoError(t, err)

	cacher, err := filecache.NewCacher(filepath.Join(tempDir, "cache"))
	require.NoError(t, err)

	manager := NewManager(&NewManagerOptions{
		FileCacher: cacher,
		Logger:     logger,
		Database:   database,
	})
	require.NotNil(t, manager)

	// Simulate 500 concurrent incoming HTTP requests pushing events into the Queue.
	var wg sync.WaitGroup
	workers := 500
	wg.Add(workers)

	for i := 0; i < workers; i++ {
		go func(workerID int) {
			defer wg.Done()
			
			// Each worker pushes 10 fast progress updates (simulating a few seconds of watching)
			for j := 0; j < 10; j++ {
				manager.TelemetryManager.Queue(TelemetryEvent{
					MediaId:       1,
					EpisodeNumber: 1,
					CurrentTime:   float64(workerID*10 + j),
					Duration:      1000.0,
					Kind:          MediastreamKind,
				})
				time.Sleep(2 * time.Millisecond)
			}
		}(i)
	}

	// Wait for all HTTP handlers to finish queuing
	wg.Wait()

	// Give the TelemetryManager a moment to flush cleanly.
	// Since flush interval is 5s, we can either wait 5s or call Stop() which triggers a final flush.
	time.Sleep(100 * time.Millisecond) // Let all queue events reach memoryBatch
	manager.TelemetryManager.Stop()    // Force the context done and flush memory
	time.Sleep(500 * time.Millisecond) // Give time for the real DB to commit

	// Verify that the entry exists in the DB/Cache
	items, err := filecache.GetAll[WatchHistoryItem](cacher, *manager.watchHistoryFileCacheBucket)
	require.NoError(t, err)
	
	// Because of deduplication across 500 concurrent goroutines updating mediaId 1,
	// only the absolute last processed tick should survive. We expect 1 item.
	require.Len(t, items, 1)
	require.Contains(t, items, "1")
}
