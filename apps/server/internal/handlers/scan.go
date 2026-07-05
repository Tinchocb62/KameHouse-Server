package handlers

import (
	"context"
	"errors"
	"sync/atomic"
	"time"

	"kamehouse/internal/database/db"
	"kamehouse/internal/library/anime"
	"kamehouse/internal/library/scanner"
	"kamehouse/internal/library/summary"

	"github.com/labstack/echo/v4"
)

var globalScanActive atomic.Bool

// HandleScanLocalFiles ...
//
//	@summary scans the user's library.
//	@desc This will scan the user's library.
//	@desc The response is ignored, the client should re-fetch the library after this.
//	@route /api/v1/library/scan [POST]
//	@returns []dto.LocalFile
func (h *Handler) HandleScanLocalFiles(c echo.Context) error {

	type body struct {
		Mode             string `json:"mode"` // "metadata", "fast", "deep"
		SkipLockedFiles  bool   `json:"skipLockedFiles"`
		SkipIgnoredFiles bool   `json:"skipIgnoredFiles"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}
	
	// Default to fast mode if not provided
	if b.Mode == "" {
		b.Mode = "fast"
	}

	if h.App.Settings == nil {
		return h.RespondWithError(c, errors.New("ajustes no encontrados, por favor configura la biblioteca primero"))
	}

	// Retrieve the user's library path
	libraryPaths := h.App.Settings.GetLibrary().GetAllPaths()
	if len(libraryPaths) == 0 {
		return h.RespondWithError(c, errors.New("no hay carpetas de origen configuradas"))
	}
	libraryPath := libraryPaths[0]
	var additionalLibraryPaths []string
	if len(libraryPaths) > 1 {
		additionalLibraryPaths = libraryPaths[1:]
	}

	// Get the latest local files
	existingLfs, _, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// For deep scans: clear lastScanAt so the walker traverses all directories
	if b.Mode == "deep" && h.App.Database != nil {
		if s, err := h.App.Database.GetSettings(); err == nil && s != nil {
			s.Library.LastScanAt = time.Time{}
			// CRITICAL: Reset all media IDs in local_files to force the matcher to re-run
			if err := h.App.Database.ResetLocalFilesMediaIds(); err != nil {
				h.App.Logger.Warn().Err(err).Msg("scan: failed to reset media IDs (best-effort, continuing)")
			}
			if _, err := h.App.Database.UpsertSettings(s); err != nil {
				h.App.Logger.Warn().Err(err).Msg("scan: failed to upsert settings (best-effort, continuing)")
			}
		}
	}

	// Get the latest shelved local files
	existingShelvedLfs, err := db.GetShelvedLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	mSettings, ok := h.App.Database.GetMediastreamSettings()
	ffprobePath := "ffprobe"
	if ok && mSettings.FfprobePath != "" {
		ffprobePath = mSettings.FfprobePath
	}

	// +---------------------+
	// |   Concurrent Lock   |
	// +---------------------+
	
	if !globalScanActive.CompareAndSwap(false, true) {
		return h.RespondWithError(c, errors.New("ya hay un escaneo de biblioteca en curso, por favor espera"))
	}

	// +---------------------+
	// |       Scanner       |
	// +---------------------+

	// Create scan summary logger
	scanSummaryLogger := summary.NewScanSummaryLogger()

	// Create a new scan logger
	scanLogger, err := scanner.NewScanLogger(h.App.Config.Logs.Dir)
	if err != nil {
		globalScanActive.Store(false)
		return h.RespondWithError(c, err)
	}

	ac, _ := h.App.GetAnimeCollection(false)

	// Create a new scanner
	sc := scanner.NewScanner(&scanner.ScannerOptions{
		DirPath:                    libraryPath,
		OtherDirPaths:              additionalLibraryPaths,
		SeriesPaths:                h.App.Settings.GetLibrary().SeriesPaths,
		MoviePaths:                 h.App.Settings.GetLibrary().MoviePaths,
		Enhanced:                   true,
		EnhanceWithOfflineDatabase: true,
		ScanMode:                   b.Mode, // Pass the mode
		PlatformRef:                h.App.Metadata.Platform,
		Logger:                     h.App.Logger,
		WSEventManager:             h.App.WSEventManager,
		EventDispatcher:            h.App.WSEventManager.Dispatcher(),
		ExistingLocalFiles:         existingLfs,
		SkipLockedFiles:            b.SkipLockedFiles,
		SkipIgnoredFiles:           b.SkipIgnoredFiles,
		ScanSummaryLogger:          scanSummaryLogger,
		ScanLogger:                 scanLogger,
		Database:                   h.App.Database,
		MetadataProviderRef:        h.App.Metadata.Provider,
		MatchingAlgorithm:          h.App.Settings.GetLibrary().ScannerMatchingAlgorithm,
		MatchingThreshold:          h.App.Settings.GetLibrary().ScannerMatchingThreshold,
		UseLegacyMatching:          h.App.Settings.GetLibrary().ScannerUseLegacyMatching,
		StrictStructure:            h.App.Settings.GetLibrary().ScannerStrictStructure,
		WithShelving:               true,
		ExistingShelvedFiles:       existingShelvedLfs,
		ConfigAsString:             h.App.Settings.GetLibrary().ScannerConfig,
		AnimeCollection:            ac,
		UseTMDB:                    h.App.Settings.GetLibrary().ScannerProvider == "tmdb",
		TMDBClient:                 h.App.Metadata.TMDBClient,
		FanArtEnricher:             h.App.Metadata.FanArt,
		OMDbEnricher:               h.App.Metadata.OMDb,
		FFprobePath:                ffprobePath,
		BackgroundQueue:            h.App.BackgroundQueue,
	})

	// EXECUTE ASYNCHRONOUSLY to prevent HTTP Timeout & 504 errors on massive scans
	go func() {
		defer globalScanActive.Store(false)
		defer scanLogger.Done()

		// Timeout safety: if any external API or DB call hangs indefinitely,
		// globalScanActive would never be reset without this.
		scanCtx, scanCancel := context.WithTimeout(context.Background(), 2*time.Hour)
		defer scanCancel()

		allLfs, err := sc.Scan(scanCtx)
		if err != nil {
			if !errors.Is(err, scanner.ErrNoLocalFiles) {
				h.App.Logger.Error().Err(err).Msg("Failed background library scan")
				// Notify the frontend so it can display an error to the user
				h.App.WSEventManager.SendEvent("SCAN_ERROR", map[string]string{
					"message": err.Error(),
				})
			}
			return
		}

		// Insert the local files
		_, err = db.InsertLocalFiles(h.App.Database, allLfs)
		if err != nil {
			h.App.Logger.Error().Err(err).Msg("Failed to insert local files after scan")
			return
		}

		// Save the shelved local files
		err = db.SaveShelvedLocalFiles(h.App.Database, sc.GetShelvedLocalFiles())
		if err != nil {
			h.App.Logger.Error().Err(err).Msg("Failed to save shelved files after scan")
			return
		}

		// Warm the media-info (ffprobe) cache in the background so the first play of
		// any freshly scanned file skips the cold-start probe. Best-effort.
		if h.App.MediastreamRepository != nil {
			paths := make([]string, 0, len(allLfs))
			for _, lf := range allLfs {
				if lf != nil && lf.Path != "" {
					paths = append(paths, lf.Path)
				}
			}
			go h.App.MediastreamRepository.WarmMediaInfo(paths)
		}

		// Save the scan summary
		_ = db.InsertScanSummary(h.App.Database, scanSummaryLogger.GenerateSummary())

		// Force WAL checkpoint to consolidate WAL changes to main DB
		h.App.Database.Gorm().Exec("PRAGMA wal_checkpoint(PASSIVE);")

		// Background maintenance tasks
		go func() {
			ClearLibraryCollectionCache()
			anime.InvalidateCuratedHomeCache()
			_, _ = h.App.Metadata.Platform.RefreshAnimeCollection(context.Background())
		}()
	}()

	// Respond immediately (202 Accepted logic). 
	// Sending an empty array `[]` avoids React TypeScript schema mismatches on the Frontend.
	return h.RespondWithData(c, make([]interface{}, 0))

}

// HandleGetScanStatus ...
//
//	@summary returns the latest scan summary.
//	@desc Returns metadata about the most recent library scan:
//	@desc  - timestamp, duration, matched/unmatched file counts, errors.
//	@desc Clients can poll this endpoint instead of relying solely on WebSocket events.
//	@route /api/v1/library/scan/status [GET]
//	@returns dto.ScanSummaryItem
func (h *Handler) HandleGetScanStatus(c echo.Context) error {
	summaries, err := db.GetScanSummaries(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	if len(summaries) == 0 {
		return h.RespondWithData(c, map[string]any{
			"status":  "idle",
			"message": "No scan has been performed yet",
		})
	}

	// Return the most recent summary (GetScanSummaries returns them in insertion order).
	latest := summaries[len(summaries)-1]
	return h.RespondWithData(c, map[string]any{
		"status":      "done",
		"lastScanAt":  latest.CreatedAt,
		"summary":     latest.ScanSummary,
		"engine":      "Antigravity-v2",
	})
}
// HandleGetUnlinkedFiles ...
//
//	@summary returns all files the scanner failed to identify.
//	@desc These are files stored as GhostAssociations in the database.
//	@route /api/v1/library/unlinked [GET]
//	@returns []models.GhostAssociatedMedia
func (h *Handler) HandleGetUnlinkedFiles(c echo.Context) error {
	associations, err := h.App.Database.GetAllGhostAssociations()
	if err != nil {
		return h.RespondWithError(c, err)
	}
	return h.RespondWithData(c, associations)
}

// HandleResolveUnlinkedFile ...
//
//	@summary manually links an unrecognized file to a media ID.
//	@desc Persists the user's choice as a Ghost Association so the next scan picks it up.
//	@route /api/v1/library/unlinked/resolve [POST]
func (h *Handler) HandleResolveUnlinkedFile(c echo.Context) error {
	type body struct {
		Path          string `json:"path"`
		TargetMediaID int    `json:"targetMediaId"`
	}
	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}
	if b.Path == "" || b.TargetMediaID == 0 {
		return h.RespondWithError(c, errors.New("path and targetMediaId are required"))
	}
	if err := h.App.Database.ResolveGhostAssociation(b.Path, b.TargetMediaID); err != nil {
		return h.RespondWithError(c, err)
	}
	return h.RespondWithData(c, map[string]any{"ok": true})
}
