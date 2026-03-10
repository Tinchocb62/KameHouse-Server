package continuity

import (
	"context"
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

// TelemetryManager orchestrates asynchronous, non-blocking playback progress aggregation.
type TelemetryManager struct {
	manager       *Manager
	logger        *zerolog.Logger
	eventQueue    chan TelemetryEvent
	memoryBatch   map[int]TelemetryEvent
	batchMutex    sync.Mutex
	flushInterval time.Duration
	ctx           context.Context
	cancel        context.CancelFunc
}

func NewTelemetryManager(manager *Manager, logger *zerolog.Logger, flushInterval time.Duration) *TelemetryManager {
	ctx, cancel := context.WithCancel(context.Background())

	tm := &TelemetryManager{
		manager:       manager,
		logger:        logger,
		eventQueue:    make(chan TelemetryEvent, 1000), // Buffer handles sudden traffic spikes
		memoryBatch:   make(map[int]TelemetryEvent),
		flushInterval: flushInterval,
		ctx:           ctx,
		cancel:        cancel,
	}

	go tm.StartWorker()

	tm.logger.Info().Dur("flushInterval", flushInterval).Msg("telemetry: Initialized High-Speed Telemetry Manager")
	return tm
}

// Queue instantly queues the event (Sub-1ms guarantee) and returns control to the HTTP handler
func (tm *TelemetryManager) Queue(event TelemetryEvent) {
	select {
	case tm.eventQueue <- event:
		// Sent successfully without blocking
	default:
		tm.logger.Warn().Int("MediaId", event.MediaId).Msg("telemetry: Queue saturated, dropped frequent tick")
	}
}

// StartWorker is the core Event Loop.
func (tm *TelemetryManager) StartWorker() {
	ticker := time.NewTicker(tm.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case <-tm.ctx.Done():
			tm.logger.Info().Msg("telemetry: Shutting down Telemetry Manager")
			tm.FlushToDatabase()
			return

		case event := <-tm.eventQueue:
			tm.batchMutex.Lock()
			tm.memoryBatch[event.MediaId] = event
			tm.batchMutex.Unlock()

			if event.IsFinal {
				tm.handleFinalEvent(&event)
			}

		case <-ticker.C:
			tm.FlushToDatabase()
		}
	}
}

func (tm *TelemetryManager) FlushToDatabase() {
	tm.batchMutex.Lock()

	if len(tm.memoryBatch) == 0 {
		tm.batchMutex.Unlock()
		return
	}

	clonedBatch := make(map[int]TelemetryEvent, len(tm.memoryBatch))
	for k, v := range tm.memoryBatch {
		clonedBatch[k] = v
	}
	tm.memoryBatch = make(map[int]TelemetryEvent)
	tm.batchMutex.Unlock()

	for _, event := range clonedBatch {
		opts := &UpdateWatchHistoryItemOptions{
			MediaId:       event.MediaId,
			EpisodeNumber: event.EpisodeNumber,
			CurrentTime:   event.CurrentTime,
			Duration:      event.Duration,
			Kind:          event.Kind,
			Filepath:      event.Filepath,
		}

		err := tm.manager.UpdateWatchHistoryItem(opts)
		if err != nil {
			tm.logger.Error().Err(err).Int("MediaID", event.MediaId).Msg("telemetry: Async DB Flush failed")
		} else {
			tm.logger.Trace().Int("MediaID", event.MediaId).Msg("telemetry: Flushed bulk tick to disk successfully")
		}
	}
}

func (tm *TelemetryManager) handleFinalEvent(event *TelemetryEvent) {
	if event.Duration > 0 {
		completionRatio := event.CurrentTime / event.Duration
		if completionRatio >= IgnoreRatioThreshold {
			tm.logger.Info().Int("MediaId", event.MediaId).Int("Episode", event.EpisodeNumber).Msg("telemetry: User completed episode, signaling Scrobbler hooks")
		}
	}
}

func (tm *TelemetryManager) Stop() {
	tm.cancel()
}
