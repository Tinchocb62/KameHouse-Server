package continuity

import (
	"fmt"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"sync"
	"time"

	"github.com/rs/zerolog"
)

// TelemetryEvent represents a highly-frequent, transient playback progress tick
type TelemetryEvent struct {
	MediaId       int
	EpisodeNumber int
	CurrentTime   float64
	Duration      float64
	Kind          Kind
	Filepath      string
	IsFinal       bool
}

// TelemetryManager orchestrates high-speed, thread-safe playback progress buffering.
type TelemetryManager struct {
	mu         sync.RWMutex
	buffer     map[string]int
	repository *db.WatchHistoryRepository
	ticker     *time.Ticker
	quit       chan struct{}
	logger     *zerolog.Logger
}

// NewTelemetryManager initializes the TelemetryManager
func NewTelemetryManager(manager *Manager, logger *zerolog.Logger, flushInterval time.Duration) *TelemetryManager {
	tm := &TelemetryManager{
		buffer:     make(map[string]int),
		repository: db.NewWatchHistoryRepository(manager.db.Gorm()),
		quit:       make(chan struct{}),
		logger:     logger,
	}
	tm.Start(flushInterval)
	tm.logger.Info().Dur("flushInterval", flushInterval).Msg("telemetry: Initialized High-Speed Buffered Telemetry Manager")
	return tm
}

// UpdateProgress safely and instantly updates the memory buffer.
func (tm *TelemetryManager) UpdateProgress(mediaID string, seconds int) {
	tm.mu.Lock()
	tm.buffer[mediaID] = seconds
	tm.mu.Unlock()
}

// Start launches the Flush Engine Background Worker.
func (tm *TelemetryManager) Start(flushInterval time.Duration) {
	tm.ticker = time.NewTicker(flushInterval)
	go func() {
		for {
			select {
			case <-tm.ticker.C:
				tm.flush()
			case <-tm.quit:
				tm.flush() // Ensure no progress is lost on server shutdown
				return
			}
		}
	}()
}

// flush safely duplicates the map and calls the DB repository outside the lock
func (tm *TelemetryManager) flush() {
	tm.mu.Lock()
	if len(tm.buffer) == 0 {
		tm.mu.Unlock()
		return
	}

	// Copy and reinitialize
	localBatch := make(map[string]int, len(tm.buffer))
	for k, v := range tm.buffer {
		localBatch[k] = v
	}
	tm.buffer = make(map[string]int)
	tm.mu.Unlock()

	// Parse keys back and run bulk DB Upsert outside the mutex payload
	var records []models.WatchHistory
	for key, seconds := range localBatch {
		// Expects key format: "userId:mediaId:episodeNumber:duration"
		var userID uint
		var mediaId, epNum int
		var duration float64
		fmt.Sscanf(key, "%d:%d:%d:%f", &userID, &mediaId, &epNum, &duration)

		if mediaId > 0 {
			records = append(records, models.WatchHistory{
				AccountID:     userID,
				MediaID:       mediaId,
				EpisodeNumber: epNum,
				CurrentTime:   float64(seconds),
				Duration:      duration,
			})
		}
	}

	if len(records) > 0 {
		if err := tm.repository.UpsertBatch(records); err != nil {
			tm.logger.Error().Err(err).Int("batchSize", len(records)).Msg("telemetry: Async DB Flush failed")
		} else {
			tm.logger.Trace().Int("batchSize", len(records)).Msg("telemetry: Flushed bulk tick to disk successfully")
		}
	}
}

// Stop initiates a graceful shutdown and blocks until the final synchronous flush is performed.
func (tm *TelemetryManager) Stop() {
	if tm.ticker != nil {
		tm.ticker.Stop()
	}
	// Send signal to close the background worker
	tm.quit <- struct{}{}
}
