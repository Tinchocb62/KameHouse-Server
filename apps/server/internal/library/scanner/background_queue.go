package scanner

import (
	"context"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/events"
	"sync"

	"github.com/rs/zerolog"
)

type BackgroundQueue struct {
	database       *db.Database
	wsEventManager events.WSEventManagerInterface
	logger         *zerolog.Logger
	ffprobePath    string
	jobChan        chan *dto.LocalFile
	activeJobs     map[string]struct{}
	activeJobsMu   sync.Mutex
	wg             sync.WaitGroup
	ctx            context.Context
	cancel         context.CancelFunc
}

func NewBackgroundQueue(database *db.Database, ws events.WSEventManagerInterface, logger *zerolog.Logger, ffprobePath string) *BackgroundQueue {
	ctx, cancel := context.WithCancel(context.Background())
	bq := &BackgroundQueue{
		database:       database,
		wsEventManager: ws,
		logger:         logger,
		ffprobePath:    ffprobePath,
		jobChan:        make(chan *dto.LocalFile, 10000),
		activeJobs:     make(map[string]struct{}),
		ctx:            ctx,
		cancel:         cancel,
	}
	return bq
}

func (bq *BackgroundQueue) Start(numWorkers int) {
	bq.logger.Info().Int("workers", numWorkers).Msg("scanner: Starting background media queue")
	for i := 0; i < numWorkers; i++ {
		bq.wg.Add(1)
		go bq.worker()
	}
}

func (bq *BackgroundQueue) Stop() {
	bq.cancel()
	close(bq.jobChan)
	bq.wg.Wait()
	bq.logger.Info().Msg("scanner: Background media queue stopped")
}

func (bq *BackgroundQueue) Enqueue(lf *dto.LocalFile) {
	if lf == nil {
		return
	}
	bq.activeJobsMu.Lock()
	defer bq.activeJobsMu.Unlock()

	if _, active := bq.activeJobs[lf.Path]; active {
		return
	}

	select {
	case <-bq.ctx.Done():
		return
	default:
	}

	bq.activeJobs[lf.Path] = struct{}{}
	select {
	case bq.jobChan <- lf:
	default:
		// Queue full, drop active job lock
		delete(bq.activeJobs, lf.Path)
		bq.logger.Warn().Str("path", lf.Path).Msg("scanner: background queue full, skipping job")
	}
}

func (bq *BackgroundQueue) worker() {
	defer bq.wg.Done()

	prober := NewFileProber(bq.ffprobePath, bq.logger)

	for lf := range bq.jobChan {
		select {
		case <-bq.ctx.Done():
			return
		default:
		}

		bq.processFile(prober, lf)

		bq.activeJobsMu.Lock()
		delete(bq.activeJobs, lf.Path)
		bq.activeJobsMu.Unlock()
	}
}

func (bq *BackgroundQueue) processFile(prober *FileProber, lf *dto.LocalFile) {
	changed := false

	// File hash calculation removed (OpenSubtitles removed)

	// 2. Perform probe if needed
	if shouldFallbackToFFprobe(lf) && bq.ffprobePath != "" {
		// Use a local slice of 1 file to reuse the prober logic
		prober.ProbeFiles(bq.ctx, []*dto.LocalFile{lf})
		changed = true
	}

	if changed {
		// 3. Save to database
		err := db.UpsertLocalFileRelationalBatch(bq.database, []*dto.LocalFile{lf})
		if err != nil {
			bq.logger.Error().Err(err).Str("path", lf.Path).Msg("scanner: failed to save background technical specs to DB")
			return
		}

		// 4. Notify frontend
		if bq.wsEventManager != nil {
			bq.wsEventManager.SendEvent("file-technical-specs-ready", map[string]any{
				"path":          lf.Path,
				"fileHash":      lf.FileHash,
				"technicalInfo": lf.TechnicalInfo,
			})
			// Invalidate client queries to refresh metadata views
			bq.wsEventManager.SendEvent("invalidate-queries", nil)
		}
	}
}
