package autoscanner

import (
	"context"
	"fmt"
	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/database/db"
	"os"
	"path/filepath"
	"strings"

	"kamehouse/internal/database/models"
	"kamehouse/internal/events"
	"kamehouse/internal/library/scanner"
	"kamehouse/internal/library/summary"
	"kamehouse/internal/notifier"

	"kamehouse/internal/platforms/platform"
	"kamehouse/internal/util"
	"sync"
	"sync/atomic"
	"time"

	"github.com/rs/zerolog"
)

type (
	AutoScanner struct {
		fileActionCh        chan struct{}
		waiting             bool
		missedAction        bool
		mu                  sync.Mutex
		scannedCh           chan struct{}
		waitTime            time.Duration
		enabled             bool
		settings            models.LibrarySettings
		platform            platform.Platform
		logger              *zerolog.Logger
		wsEventManager      events.WSEventManagerInterface
		db                  *db.Database
		metadataProvider    metadata_provider.Provider
		logsDir             string
		scanning            atomic.Bool
		onRefreshCollection func()
		animeCollection     *platform.UnifiedCollection
		eventDispatcher     events.Dispatcher
		pendingPaths        []string
		backgroundQueue     *scanner.BackgroundQueue
		// shutdownCtx is the application-level context. When it is cancelled
		// (e.g. on SIGTERM), in-progress scans will respect the cancellation
		// rather than running to completion.
		shutdownCtx context.Context
	}
	NewAutoScannerOptions struct {
		Database            *db.Database
		Platform            platform.Platform
		Logger              *zerolog.Logger
		WSEventManager      events.WSEventManagerInterface
		Enabled             bool
		WaitTime            time.Duration
		MetadataProvider    metadata_provider.Provider
		LogsDir             string
		OnRefreshCollection func()
		EventDispatcher     events.Dispatcher
		BackgroundQueue     *scanner.BackgroundQueue
		// ShutdownCtx is propagated to every scan triggered by this AutoScanner.
		// If nil, context.Background() is used as a fallback.
		ShutdownCtx context.Context
	}
)

func New(opts *NewAutoScannerOptions) *AutoScanner {
	wt := time.Second * 15 // Default wait time is 15 seconds.
	if opts.WaitTime > 0 {
		wt = opts.WaitTime
	}

	shutdownCtx := opts.ShutdownCtx
	if shutdownCtx == nil {
		shutdownCtx = context.Background()
	}

	return &AutoScanner{
		fileActionCh:        make(chan struct{}, 1),
		waiting:             false,
		missedAction:        false,
		mu:                  sync.Mutex{},
		scannedCh:           make(chan struct{}, 1),
		waitTime:            wt,
		enabled:             opts.Enabled,
		platform:            opts.Platform,
		logger:              opts.Logger,
		wsEventManager:      opts.WSEventManager,
		db:                  opts.Database,
		metadataProvider:    opts.MetadataProvider,
		logsDir:             opts.LogsDir,
		onRefreshCollection: opts.OnRefreshCollection,
		eventDispatcher:     opts.EventDispatcher,
		backgroundQueue:     opts.BackgroundQueue,
		shutdownCtx:         shutdownCtx,
	}
}

func (as *AutoScanner) SetAnimeCollection(ac *platform.UnifiedCollection) {
	as.animeCollection = ac
}

// Notify is used to notify the AutoScanner that a file action has occurred.
func (as *AutoScanner) Notify(path string) {
	if as == nil {
		return
	}

	defer util.HandlePanicInModuleThen("scanner/autoscanner/Notify", func() {
		as.logger.Error().Msg("autoscanner: recovered from panic")
	})

	as.mu.Lock()
	defer as.mu.Unlock()

	// Add path to pending (only if it's a directory, or a valid media file)
	if path != "" {
		stat, err := os.Stat(path)
		isDir := err == nil && stat.IsDir()

		if !isDir {
			ext := strings.ToLower(filepath.Ext(path))
			if !util.IsValidVideoExtension(ext) {
				// Ignore non-video files (temporary files, nfos, txt, etc.)
				return
			}
		}

		dir := path
		if !isDir {
			dir = filepath.Dir(path)
		}
		as.pendingPaths = append(as.pendingPaths, dir)
	}

	// If we are already waiting for a scan, just notify the channel to reset the timer.
	if as.waiting {
		select {
		case as.fileActionCh <- struct{}{}:
		default:
		}
		return
	}

	// If we are currently scanning, we need to indicate that a file action was missed.
	if as.scanning.Load() {
		as.missedAction = true
		return
	}

	as.waiting = true
	go func() {
		timer := time.NewTimer(as.waitTime)
		defer timer.Stop()

		for {
			select {
			case <-timer.C:
				as.mu.Lock()
				as.waiting = false
				targets := as.pendingPaths
				as.pendingPaths = nil
				as.mu.Unlock()
				as.TriggerScan(targets)
				return
			case <-as.fileActionCh:
				if !timer.Stop() {
					<-timer.C
				}
				timer.Reset(as.waitTime)
			}
		}
	}()
}

func (as *AutoScanner) TriggerScan(targets []string) {
	if as == nil || !as.enabled {
		return
	}

	if as.scanning.Load() {
		return
	}

	as.scanning.Store(true)
	defer as.scanning.Store(false)

	as.logger.Info().Msg("autoscanner: Triggering library scan")

	// Get latest library settings
	settings, err := as.db.GetSettings()
	if err != nil {
		as.logger.Error().Err(err).Msg("autoscanner: Failed to get library settings")
		return
	}
	as.settings = settings.Library

	mSettings, ok := as.db.GetMediastreamSettings()
	ffprobePath := "ffprobe"
	if ok && mSettings.FfprobePath != "" {
		ffprobePath = mSettings.FfprobePath
	}

	libraryPaths := as.settings.GetAllPaths()
	var libraryPath string
	var additionalPaths []string
	if len(libraryPaths) > 0 {
		libraryPath = libraryPaths[0]
		if len(libraryPaths) > 1 {
			additionalPaths = libraryPaths[1:]
		}
	}

	// Scan the library
	scn := scanner.NewScanner(&scanner.ScannerOptions{
		DirPath:             libraryPath,
		OtherDirPaths:       additionalPaths,
		SeriesPaths:         as.settings.SeriesPaths,
		MoviePaths:          as.settings.MoviePaths,
		Logger:              as.logger,
		PlatformRef:         as.platform,
		Database:            as.db,
		MetadataProviderRef: as.metadataProvider,
		UseTMDB:             as.settings.ScannerProvider == "tmdb",
		EventDispatcher:     as.eventDispatcher,
		MatchingThreshold:   as.settings.ScannerMatchingThreshold,
		UseLegacyMatching:   as.settings.ScannerUseLegacyMatching,
		StrictStructure:     as.settings.ScannerStrictStructure,
		ScanSummaryLogger:   summary.NewScanSummaryLogger(),
		WithShelving:        true,
		TargetPaths:         targets,
		FFprobePath:         ffprobePath,
		BackgroundQueue:     as.backgroundQueue,
	})

	allLfs, err := scn.Scan(as.shutdownCtx)
	if err != nil {
		as.logger.Error().Err(err).Msg("autoscanner: Failed to scan library")
		notifier.Global().Notify(notifier.TypeScanner, "Error al escanear", fmt.Sprintf("El escaneo automático falló: %v", err))
		return
	}

	// Insert the local files
	if len(targets) > 0 {
		_, err = db.InsertPartialLocalFiles(as.db, allLfs, targets)
	} else {
		_, err = db.InsertLocalFiles(as.db, allLfs)
	}

	if err != nil {
		as.logger.Error().Err(err).Msg("autoscanner: Failed to insert local files")
		return
	}

	// Consolidate WAL changes
	as.db.Gorm().Exec("PRAGMA wal_checkpoint(PASSIVE);")

	as.logger.Info().Msg("autoscanner: Library scan completed")

	if len(targets) > 0 {
		noun := "archivos nuevos"
		if len(targets) == 1 {
			noun = "archivo nuevo"
		}
		notifier.Global().Notify(notifier.TypeScanner, "Escaneo completado", fmt.Sprintf("Se agregaron %d %s a la biblioteca.", len(targets), noun))
	} else {
		notifier.Global().Notify(notifier.TypeScanner, "Escaneo completado", fmt.Sprintf("Biblioteca actualizada (%d archivos).", len(allLfs)))
	}

	// Refresh the collection
	if as.onRefreshCollection != nil {
		as.onRefreshCollection()
	}

	as.mu.Lock()
	if as.missedAction {
		as.missedAction = false
		as.mu.Unlock()
		as.Notify("")
	} else {
		as.mu.Unlock()
	}

	// Notify that the scan is completed
	select {
	case as.scannedCh <- struct{}{}:
	default:
	}
}

func (as *AutoScanner) SetEnabled(enabled bool) {
	as.enabled = enabled
}

func (as *AutoScanner) GetScannedCh() chan struct{} {
	return as.scannedCh
}
