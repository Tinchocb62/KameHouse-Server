package scanner

import (
	"context"
	"errors"
	"fmt"
	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/api/tmdb"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/events"
	"kamehouse/internal/library/anime"
	"kamehouse/internal/library/filesystem"
	librarymetadata "kamehouse/internal/library/metadata"
	"kamehouse/internal/library/summary"
	"kamehouse/internal/platforms/platform"
	"kamehouse/internal/util"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog"
	"github.com/samber/lo"
)

var ErrNoLocalFiles = errors.New("[matcher] no local files")

type Scanner struct {
	DirPath                    string
	OtherDirPaths              []string
	SeriesPaths                []string
	MoviePaths                 []string
	Enhanced                   bool
	EnhanceWithOfflineDatabase bool
	PlatformRef                platform.Platform
	Logger                     *zerolog.Logger
	WSEventManager             events.WSEventManagerInterface
	ExistingLocalFiles         []*dto.LocalFile
	SkipLockedFiles            bool
	SkipIgnoredFiles           bool
	ScanSummaryLogger          *summary.ScanSummaryLogger
	ScanLogger                 *ScanLogger
	Database                   *db.Database // Used to save LibraryMedia found via NFO
	MetadataProviderRef        metadata_provider.Provider
	MetadataProviders          []librarymetadata.Provider
	UseLegacyMatching          bool
	MatchingThreshold          float64 // only used by legacy

	MatchingAlgorithm string // only used by legacy
	StrictStructure   bool   // new matching mode

	// If true, locked files whose library path doesn't exist will be put aside
	WithShelving         bool
	ExistingShelvedFiles []*dto.LocalFile
	shelvedLocalFiles    []*dto.LocalFile
	Config               *Config
	ConfigAsString       string
	// Optional, used to add custom sources
	AnimeCollection *platform.UnifiedCollection
	// TMDB mode: use folder structure + TMDB instead of other metadata providers
	UseTMDB bool

	EventDispatcher events.Dispatcher
	TMDBClient      *tmdb.Client

	// Optional enrichers
	FanArtEnricher  *librarymetadata.FanArtEnricher
	OMDbEnricher    *librarymetadata.OMDbEnricher
	ScanMode        string
	TargetPaths     []string
	FFprobePath     string
	BackgroundQueue *BackgroundQueue
}

// ScannerOptions mirrors all public fields of Scanner and is the canonical
// way to initialise a Scanner via NewScanner. Adding a new option here
// forces every call-site to be updated (no silent zero-value surprises).
type ScannerOptions struct {
	DirPath                    string
	OtherDirPaths              []string
	SeriesPaths                []string
	MoviePaths                 []string
	Enhanced                   bool
	EnhanceWithOfflineDatabase bool
	PlatformRef                platform.Platform
	Logger                     *zerolog.Logger
	WSEventManager             events.WSEventManagerInterface
	ExistingLocalFiles         []*dto.LocalFile
	SkipLockedFiles            bool
	SkipIgnoredFiles           bool
	ScanSummaryLogger          *summary.ScanSummaryLogger
	ScanLogger                 *ScanLogger
	Database                   *db.Database
	MetadataProviderRef        metadata_provider.Provider
	MetadataProviders          []librarymetadata.Provider
	UseLegacyMatching          bool
	MatchingThreshold          float64
	MatchingAlgorithm          string
	StrictStructure            bool
	WithShelving               bool
	ExistingShelvedFiles       []*dto.LocalFile
	Config                     *Config
	ConfigAsString             string
	AnimeCollection            *platform.UnifiedCollection
	UseTMDB                    bool
	EventDispatcher            events.Dispatcher
	TMDBClient                 *tmdb.Client
	FanArtEnricher             *librarymetadata.FanArtEnricher
	OMDbEnricher               *librarymetadata.OMDbEnricher
	ScanMode                   string
	TargetPaths                []string
	FFprobePath                string
	BackgroundQueue            *BackgroundQueue
}

// NewScanner constructs a Scanner from the given options.
// Internal state fields (e.g. shelvedLocalFiles) are always zero-initialised.
func NewScanner(opts *ScannerOptions) *Scanner {
	return &Scanner{
		DirPath:                    opts.DirPath,
		OtherDirPaths:              opts.OtherDirPaths,
		SeriesPaths:                opts.SeriesPaths,
		MoviePaths:                 opts.MoviePaths,
		Enhanced:                   opts.Enhanced,
		EnhanceWithOfflineDatabase: opts.EnhanceWithOfflineDatabase,
		PlatformRef:                opts.PlatformRef,
		Logger:                     opts.Logger,
		WSEventManager:             opts.WSEventManager,
		ExistingLocalFiles:         opts.ExistingLocalFiles,
		SkipLockedFiles:            opts.SkipLockedFiles,
		SkipIgnoredFiles:           opts.SkipIgnoredFiles,
		ScanSummaryLogger:          opts.ScanSummaryLogger,
		ScanLogger:                 opts.ScanLogger,
		Database:                   opts.Database,
		MetadataProviderRef:        opts.MetadataProviderRef,
		MetadataProviders:          opts.MetadataProviders,
		UseLegacyMatching:          opts.UseLegacyMatching,
		MatchingThreshold:          opts.MatchingThreshold,
		MatchingAlgorithm:          opts.MatchingAlgorithm,
		StrictStructure:            opts.StrictStructure,
		WithShelving:               opts.WithShelving,
		ExistingShelvedFiles:       opts.ExistingShelvedFiles,
		Config:                     opts.Config,
		ConfigAsString:             opts.ConfigAsString,
		AnimeCollection:            opts.AnimeCollection,
		UseTMDB:                    opts.UseTMDB,
		EventDispatcher:            opts.EventDispatcher,
		TMDBClient:                 opts.TMDBClient,
		FanArtEnricher:             opts.FanArtEnricher,
		OMDbEnricher:               opts.OMDbEnricher,
		ScanMode:                   opts.ScanMode,
		TargetPaths:                opts.TargetPaths,
		FFprobePath:                opts.FFprobePath,
		BackgroundQueue:            opts.BackgroundQueue,
	}
}

// Scan will scan the directory and return a list of dto.LocalFile.
func (scn *Scanner) Scan(ctx context.Context) (lfs []*dto.LocalFile, err error) {
	defer util.HandlePanicWithError(&err)

	go func() {
		defer func() {
			if r := recover(); r != nil {
				scn.Logger.Error().Interface("panic", r).Msg("scanner: panic clearing episode collection cache")
			}
		}()
		anime.EpisodeCollectionFromLocalFilesCache.Clear()
	}()

	// ── Non-blocking telemetry ────────────────────────────────────────────────
	// All WSEventManager calls are routed through a buffered channel so workers
	// never block waiting for a slow WebSocket client to drain.
	telemetry := newScanTelemetry(scn.WSEventManager, 256)
	telCtx, cancelTelemetry := context.WithCancel(ctx)
	go telemetry.Run(telCtx)
	defer func() {
		cancelTelemetry()
		telemetry.Close()
	}()

	if scn.EventDispatcher != nil {
		scn.EventDispatcher.Publish(events.Event{
			Topic: "library.scan",
			Payload: map[string]any{
				"status":    "START",
				"timestamp": time.Now(),
			},
		})
	}

	telemetry.Send(events.EventScanProgress, 0)
	telemetry.Send(events.EventScanStatus, "Retrieving local files...")

	if scn.ScanSummaryLogger == nil {
		scn.ScanSummaryLogger = summary.NewScanSummaryLogger()
	}

	if scn.ConfigAsString != "" && scn.Config == nil {
		scn.Config, _ = ToConfig(scn.ConfigAsString)
	}
	if scn.Config == nil {
		scn.Config = &Config{}
	}
	scn.Config.Matching.StrictStructure = scn.StrictStructure

	scn.Logger.Debug().Msg("scanner: Starting scan")
	telemetry.Send(events.EventScanProgress, 10)
	telemetry.Send(events.EventScanStatus, "Retrieving local files...")

	startTime := time.Now()

	if scn.ScanLogger != nil {
		scn.ScanLogger.logger.Info().
			Time("startTime", startTime).
			Str("scanMode", scn.ScanMode).
			Msg("Scanning started")

		defer func() {
			now := time.Now()
			scn.ScanLogger.logger.Info().
				Time("endTime", time.Now()).
				Str("duration", now.Sub(startTime).String()).
				Int("localFilesCount", len(lfs)).
				Msg("Ended")

			// Update last scan time
			if scn.Database != nil {
				if s, err := scn.Database.GetSettings(); err == nil && s != nil {
					s.Library.LastScanAt = startTime
					_, _ = scn.Database.UpsertSettings(s)
				}
			}
		}()
	}

	var localFiles []*dto.LocalFile
	skippedLfs := make(map[string]*dto.LocalFile)
	var libraryPaths []string
	var sortedLibraryPaths []string

	if scn.ScanMode == "metadata" {
		scn.Logger.Info().Msg("scanner: Running in metadata improvement mode. Skipping file matching and probing.")
		telemetry.Send(events.EventScanStatus, "Loading existing library files...")
		localFiles = append([]*dto.LocalFile(nil), scn.ExistingLocalFiles...)
		libraryPaths = append([]string{scn.DirPath}, scn.OtherDirPaths...)
	} else {
		// +---------------------+
		// |     File paths      |
		// +---------------------+

		var paths []string
		paths, libraryPaths, sortedLibraryPaths = scn.discoverFilePaths(ctx, time.Time{})

		if scn.ScanLogger != nil {
			scn.ScanLogger.logger.Info().
				Any("count", len(paths)).
				Msg("Retrieved file paths from all directories")
		}

		// +---------------------+
		// |    Local files      |
		// +---------------------+

		// Get skipped files depending on options
		if scn.ExistingLocalFiles != nil {
			libraryPathExistsCache := make(map[string]bool)

			// Retrieve skipped files from existing local files
			for _, lf := range scn.ExistingLocalFiles {
				if lf == nil {
					continue
				}

				// Check if the file exists physically
				stat, err := os.Stat(lf.Path)
				exists := err == nil

				if !exists && scn.WithShelving {
					// The file does not exist. Check if the containing library path is offline!
					var matchedLibPath string
					for _, libPath := range sortedLibraryPaths {
						if strings.HasPrefix(lf.GetNormalizedPath(), util.NormalizePath(libPath)) {
							matchedLibPath = libPath
							break
						}
					}

					if matchedLibPath != "" {
						existsLib, checked := libraryPathExistsCache[matchedLibPath]
						if !checked {
							_, errLib := os.Stat(matchedLibPath)
							existsLib = errLib == nil || !os.IsNotExist(errLib)
							libraryPathExistsCache[matchedLibPath] = existsLib
							if !existsLib {
								scn.Logger.Warn().Str("libraryPath", matchedLibPath).Msg("scanner: containing library folder is offline/disconnected. Shelving files from deletion.")
							}
						}

						if !existsLib {
							// Library path is offline! We must SHELVE this file to protect it from deletion!
							scn.Logger.Debug().Str("path", lf.Path).Msg("scanner: shelving file because its library is offline")
							scn.shelvedLocalFiles = append(scn.shelvedLocalFiles, lf)
							// Also add to skippedLfs so we don't process it further in this scan
							skippedLfs[lf.GetNormalizedPath()] = lf
							continue
						}
					}
				}

				// 1. Explicit skip (locked/ignored)
				if (scn.SkipLockedFiles && lf.IsLocked()) || (scn.SkipIgnoredFiles && lf.IsIgnored()) {
					skippedLfs[lf.GetNormalizedPath()] = lf
					continue
				}

				// 2. File Map optimization (Fast Scan)
				if scn.ScanMode != "deep" {
					if exists {
						if stat.Size() == lf.FileSize && stat.ModTime().Unix() == lf.FileModTime {
							skippedLfs[lf.GetNormalizedPath()] = lf
							continue
						}
					}
				}
			}
		}

		telemetry.Send(events.EventScanProgress, 20)
		telemetry.Send(events.EventScanStatus, "Verifying shelved files...")

		// +---------------------+
		// |    Shelved files    |
		// +---------------------+

		scn.Logger.Debug().Int("count", len(scn.ExistingShelvedFiles)).Msg("scanner: Verifying shelved files")

		// Unshelve shelved files \/
		// Check for shelved files that are now present
		// If a shelved file is found, it is added to the skipped files list (so it's not rescanned)
		for _, shelvedLf := range scn.ExistingShelvedFiles {
			if filesystem.FileExists(shelvedLf.Path) {
				skippedLfs[shelvedLf.GetNormalizedPath()] = shelvedLf
			}
		}

		telemetry.Send(events.EventScanProgress, 30)
		telemetry.Send(events.EventScanStatus, "Scanning local files...")
		telemetry.Send(events.EventScanProgressDetailed, map[string]interface{}{
			"stage":     "file-retrieval",
			"fileCount": len(paths),
			"skipped":   len(skippedLfs),
			"message":   fmt.Sprintf("Found %d files (%d skipped)", len(paths), len(skippedLfs)),
		})

		localFiles = scn.createLocalFiles(ctx, paths, libraryPaths, skippedLfs)

		if scn.ScanLogger != nil {
			scn.ScanLogger.logger.Debug().
				Any("count", len(localFiles)).
				Msg("Local files to be scanned")
			scn.ScanLogger.logger.Debug().
				Any("count", len(skippedLfs)).
				Msg("Skipped files")

			scn.ScanLogger.logger.Debug().
				Msg("===========================================================================================================")
		}

		for _, lf := range localFiles {
			if scn.ScanLogger != nil {
				scn.ScanLogger.logger.Trace().
					Str("path", lf.Path).
					Str("filename", lf.Name).
					Interface("parsedData", lf.ParsedData).
					Interface("parsedFolderData", lf.ParsedFolderData).
					Msg("Parsed local file")
			}
		}

		if scn.ScanLogger != nil {
			scn.ScanLogger.logger.Debug().
				Msg("===========================================================================================================")
		}
	}

	// DEVNOTE: Removed library path checking because it causes some issues with symlinks

	// +---------------------+
	// |  No files to scan   |
	// +---------------------+

	// If there are no local files to scan (all files are skipped, or a file was deleted)
	if len(localFiles) == 0 {
		if scn.WSEventManager != nil {
			scn.WSEventManager.SendEvent(events.EventScanProgress, 90)
			scn.WSEventManager.SendEvent(events.EventScanStatus, "Verifying file integrity...")
		}

		scn.Logger.Debug().Int("skippedLfs", len(skippedLfs)).Msgf("scanner: Adding skipped local files")
		// Add skipped files
		if len(skippedLfs) > 0 {
			for _, sf := range skippedLfs {
				if filesystem.FileExists(sf.Path) { // Verify that the file still exists
					localFiles = append(localFiles, sf)
				} else if scn.WithShelving && sf.IsLocked() { // If the file is locked and shelving is enabled, shelve it
					scn.shelvedLocalFiles = append(scn.shelvedLocalFiles, sf)
				}
			}
		}

		// Add remaining shelved files
		scn.addRemainingShelvedFiles(skippedLfs, sortedLibraryPaths)

		scn.Logger.Debug().Msg("scanner: Scan completed")
		if scn.WSEventManager != nil {
			scn.WSEventManager.SendEvent(events.EventScanProgress, 100)
			scn.WSEventManager.SendEvent(events.EventScanStatus, "Scan completed")
		}

		if scn.EventDispatcher != nil {
			scn.EventDispatcher.Publish(events.Event{
				Topic: "library.scan",
				Payload: map[string]any{
					"status":          "FINISH",
					"total_processed": len(localFiles),
				},
			})
		}

		return localFiles, nil
	}

	telemetry.Send(events.EventScanProgress, 40)
	if scn.Enhanced {
		telemetry.Send(events.EventScanStatus, "Fetching additional matching data...")
	} else {
		telemetry.Send(events.EventScanStatus, "Fetching media...")
	}

	// +---------------------+
	// |    NFO Support      |
	// +---------------------+

	if scn.ScanMode != "metadata" {
		scn.Logger.Debug().Msg("scanner: Looking for local NFO metadata files")

		// nfoFolderMap stores the LibraryMedia ID for each folder that has been
		// successfully processed. It is populated in the post-processing phase and
		// used in step 3 to propagate IDs to sibling files in the same folder.
		var nfoFolderMap sync.Map // folder path → LibraryMedia ID (uint)

		// nfoEntry holds all parsed data for one NFO match. Workers produce these;
		// the post-processing phase below is the sole consumer that writes to the DB.
		type nfoEntry struct {
			lf         *dto.LocalFile
			media      *models.LibraryMedia
			folderPath string
			isPerFile  bool
			tmdbID     int // 0 when the NFO contains no TMDB ID
		}

		// Bounded worker pool for NFO resolution
		maxWorkers := runtime.NumCPU()
		if maxWorkers < 4 {
			maxWorkers = 4
		}
		if maxWorkers > 16 {
			maxWorkers = 16
		}

		// nfoFolderClaimed prevents two workers from producing duplicate entries
		// for the same folder-level NFO. LoadOrStore acts as a non-blocking mutex.
		var nfoFolderClaimed sync.Map // folder path → true

		var nfoEntriesMu sync.Mutex
		var nfoEntries []*nfoEntry

		nfoJobs := make(chan *dto.LocalFile, 100)
		go func() {
			for _, lf := range localFiles {
				select {
				case <-ctx.Done():
					return
				case nfoJobs <- lf:
				}
			}
			close(nfoJobs)
		}()

		// ── Worker pool: pure CPU/IO — no DB calls ────────────────────────────
		var nfoWg sync.WaitGroup
		for i := 0; i < maxWorkers; i++ {
			nfoWg.Add(1)
			go func() {
				defer nfoWg.Done()
				for lf := range nfoJobs {
					// Stop immediately if the scan context was cancelled
					select {
					case <-ctx.Done():
						return
					default:
					}

					if lf == nil || lf.LibraryMediaId != 0 || lf.MediaID != 0 {
						continue
					}

					lfDir := filepath.Dir(lf.Path)

					// 2. Typical Kodi NFO paths
					nfoPaths := []string{
						util.ReplaceExtension(lf.Path, ".nfo"), // [filename].nfo (Per-file NFO takes priority)
						filepath.Join(lfDir, "tvshow.nfo"),
						filepath.Join(lfDir, "anime.nfo"),
						filepath.Join(lfDir, "movie.nfo"),
					}

					for _, nfoPath := range nfoPaths {
						if !filesystem.FileExists(nfoPath) {
							continue
						}
						nfo, err := ParseNfoFile(nfoPath)
						if err != nil || nfo == nil {
							continue
						}

						isPerFileNfo := strings.HasSuffix(strings.ToLower(nfoPath), ".nfo") &&
							!strings.HasSuffix(strings.ToLower(nfoPath), "tvshow.nfo") &&
							!strings.HasSuffix(strings.ToLower(nfoPath), "anime.nfo") &&
							!strings.HasSuffix(strings.ToLower(nfoPath), "movie.nfo")

						// For folder-level NFOs, use LoadOrStore to claim the folder atomically.
						// Only the worker that wins the race produces an entry; others skip.
						if !isPerFileNfo {
							if _, alreadyClaimed := nfoFolderClaimed.LoadOrStore(lfDir, true); alreadyClaimed {
								break // another worker already claimed this folder
							}
						}

						format := "TV"
						if nfo.XMLName.Local == "movie" {
							format = "MOVIE"
						}

						entry := &nfoEntry{
							lf: lf,
							media: &models.LibraryMedia{
								Type:          "ANIME",
								Format:        format,
								TitleOriginal: nfo.OriginalTitle,
								TitleRomaji:   nfo.Title,
								TitleEnglish:  nfo.Title,
								Description:   nfo.Plot,
								Rating:        nfo.Rating,
								Year:          nfo.Year,
							},
							folderPath: lfDir,
							isPerFile:  isPerFileNfo,
							tmdbID:     nfo.GetTmdbID(),
						}

						nfoEntriesMu.Lock()
						nfoEntries = append(nfoEntries, entry)
						nfoEntriesMu.Unlock()
						break
					}
				}
			}()
		}
		nfoWg.Wait()

		// ── Post-processing: single DB write phase ────────────────────────────
		// All workers have finished parsing. We now write to the DB in one shot:
		// records with a TMDB ID go through UpsertLibraryMediaBatch; local-only
		// records (tmdb_id = 0) are inserted individually to preserve uniqueness.
		if scn.Database != nil && len(nfoEntries) > 0 {
			withTmdb := make([]*nfoEntry, 0, len(nfoEntries))
			withoutTmdb := make([]*nfoEntry, 0, len(nfoEntries))
			for _, e := range nfoEntries {
				if e.tmdbID > 0 {
					e.media.TmdbID = e.tmdbID
					withTmdb = append(withTmdb, e)
				} else {
					withoutTmdb = append(withoutTmdb, e)
				}
			}

			// 1. Batch upsert for entries that have a TMDB ID.
			if len(withTmdb) > 0 {
				mediaBatch := make([]*models.LibraryMedia, len(withTmdb))
				for i, e := range withTmdb {
					mediaBatch[i] = e.media
				}
				if batchErr := db.UpsertLibraryMediaBatch(scn.Database, mediaBatch, 20); batchErr != nil {
					scn.Logger.Error().Err(batchErr).Msg("scanner: NFO batch upsert failed, skipping ID mapping for this batch")
				} else {
					// Query back the persisted records to retrieve their auto-generated IDs.
					// Fetch in chunks of 500 to avoid SQLite variable limits (too many SQL variables error)
					var persisted []*models.LibraryMedia
					tmdbIDs := make([]int, len(withTmdb))
					for i, e := range withTmdb {
						tmdbIDs[i] = e.tmdbID
					}
					const chunkSize = 500
					for i := 0; i < len(tmdbIDs); i += chunkSize {
						end := i + chunkSize
						if end > len(tmdbIDs) {
							end = len(tmdbIDs)
						}
						var chunkPersisted []*models.LibraryMedia
						err := scn.Database.Gorm().Where("tmdb_id IN ? AND type = ?", tmdbIDs[i:end], "ANIME").Find(&chunkPersisted).Error
						if err == nil {
							persisted = append(persisted, chunkPersisted...)
						} else {
							scn.Logger.Error().Err(err).Msg("scanner: Failed to retrieve persisted media chunk")
						}
					}

					type tmdbTypeKey struct {
						tmdbID    int
						mediaType string
					}
					idMap := make(map[tmdbTypeKey]uint, len(persisted))
					for _, m := range persisted {
						idMap[tmdbTypeKey{m.TmdbID, m.Type}] = m.ID
					}

					for _, e := range withTmdb {
						key := tmdbTypeKey{e.tmdbID, e.media.Type}
						if id, ok := idMap[key]; ok {
							e.lf.LibraryMediaId = id
							e.lf.MediaID = e.tmdbID
							if !e.isPerFile {
								nfoFolderMap.Store(e.folderPath, id)
							}
							scn.Logger.Info().
								Str("filename", e.lf.Name).
								Uint("libraryMediaId", id).
								Msg("scanner: Created LibraryMedia via local NFO (batch)")
						}
					}
				} // end else (upsert succeeded)
			}

			// 2. Individual inserts for local-only NFO records (no TMDB ID).
			// These can't be safely batched since they share tmdb_id = 0.
			for _, e := range withoutTmdb {
				saved, err := db.InsertLibraryMedia(scn.Database, e.media)
				if err == nil && saved != nil {
					e.lf.LibraryMediaId = saved.ID
					if !e.isPerFile {
						nfoFolderMap.Store(e.folderPath, saved.ID)
					}
					scn.Logger.Info().
						Str("filename", e.lf.Name).
						Uint("libraryMediaId", saved.ID).
						Msg("scanner: Created LibraryMedia via local NFO (local-only)")
				}
			} // 3. Propagate folder-level IDs to all local files in the same folder.
			// Workers only tagged the "owning" file per folder; siblings need the same ID.
			for _, lf := range localFiles {
				if lf == nil || lf.LibraryMediaId != 0 {
					continue
				}
				lfDir := filepath.Dir(lf.Path)
				if id, exists := nfoFolderMap.Load(lfDir); exists {
					lf.LibraryMediaId = id.(uint)
				}
			}
			if scn.Database != nil {
				scn.Database.Checkpoint()
			}
		}
	}
	// +---------------------+
	// |    MediaFetcher     |
	// +---------------------+

	// Fetch media needed for matching
	// Build TMDB client and provider
	var tmdbClient *tmdb.Client
	var tmdbProvider *librarymetadata.TMDBProvider
	useTMDB := scn.UseTMDB

	if scn.TMDBClient != nil {
		tmdbClient = scn.TMDBClient
		tmdbProvider = librarymetadata.NewTMDBProviderWithClient(tmdbClient, scn.Database)
		scn.Logger.Debug().Msg("scanner: Using provided TMDb client")
	} else {
		// Fallback for cases where it's not provided (e.g. background runs)
		tmdbToken := ""
		tmdbLanguage := ""
		if scn.Database != nil {
			if settings, err := scn.Database.GetSettings(); err == nil && settings != nil {
				tmdbToken = settings.Library.TmdbApiKey
				tmdbLanguage = settings.Library.TmdbLanguage
			}
		}
		if tmdbToken == "" {
			tmdbToken = os.Getenv("KAMEHOUSE_TMDB_TOKEN")
		}

		if tmdbToken != "" {
			tmdbClient = tmdb.NewClient(tmdbToken, tmdbLanguage)
			tmdbProvider = librarymetadata.NewTMDBProviderWithClient(tmdbClient, scn.Database)
			scn.Logger.Debug().Msg("scanner: TMDb client initialized from settings/env")
		}
	}

	if useTMDB {
		if tmdbProvider != nil {
			scn.Logger.Info().Msg("scanner: TMDB mode enabled")
		} else {
			scn.Logger.Warn().Msg("scanner: TMDB mode requested but TMDB token not set, falling back to default provider")
			useTMDB = false
		}
	}

	providers := scn.MetadataProviders
	if len(providers) == 0 {
		if tmdbProvider != nil {
			providers = append(providers, tmdbProvider)
		}
		providers = append(providers, librarymetadata.NewAniDBProvider("", scn.Logger))
	}

	// +---------------------+
	// |  Episode Metadata   |
	// | Provider (TMDB)     |
	// +---------------------+
	// If MetadataProviderRef is unset (or uses the empty stub), replace it with the
	// TMDB-backed implementation so episodes get real titles/thumbnails/overviews.
	if tmdbClient != nil && scn.MetadataProviderRef == nil {
		realProvider := metadata_provider.NewProvider(&metadata_provider.NewProviderImplOptions{
			Database:   scn.Database,
			Logger:     scn.Logger,
			TMDBClient: tmdbClient,
		})
		scn.MetadataProviderRef = realProvider
		scn.Logger.Info().Msg("scanner: TMDB episode metadata provider initialized")
	}

	mf, err := NewMediaFetcher(ctx, &MediaFetcherOptions{
		PlatformRef:             scn.PlatformRef,
		MetadataProviderRef:     scn.MetadataProviderRef,
		MetadataProviders:       providers,
		LocalFiles:              localFiles,
		Logger:                  scn.Logger,
		DisableAnimeCollection:  false,
		ScanLogger:              scn.ScanLogger,
		OptionalAnimeCollection: scn.AnimeCollection,
		TMDBProvider:            tmdbProvider,
		SeriesPaths:             scn.SeriesPaths,
		MoviePaths:              scn.MoviePaths,
		Database:                scn.Database,
	})
	if err != nil {
		return nil, err
	}

	telemetry.Send(events.EventScanProgress, 50)
	telemetry.Send(events.EventScanStatus, "Matching local files...")

	// +---------------------+
	// |   MediaContainer    |
	// +---------------------+

	// TMDb client has already been initialized above

	// Create a new container for media
	mc := NewMediaContainer(&MediaContainerOptions{
		AllMedia:   mf.AllMedia,
		ScanLogger: scn.ScanLogger,
		TmdbClient: tmdbClient,
	})

	scn.Logger.Debug().
		Any("count", len(mc.NormalizedMedia)).
		Msg("media container: Media container created")

	// +---------------------+
	// |      Matcher        |
	// +---------------------+

	if scn.ScanMode != "metadata" {
		// Create a new matcher
		matcher := &Matcher{
			LocalFiles:        localFiles,
			MediaContainer:    mc,
			Logger:            scn.Logger,
			Database:          scn.Database,
			Threshold:         scn.MatchingThreshold,
			MatchingAlgorithm: scn.MatchingAlgorithm,
			StrictStructure:   scn.StrictStructure,
		}

		telemetry.Send(events.EventScanProgress, 60)

		err = matcher.MatchLocalFilesWithMedia()
		if err != nil {
			if errors.Is(err, ErrNoLocalFiles) {
				scn.Logger.Debug().Msg("scanner: Scan completed")
				telemetry.Send(events.EventScanProgress, 100)
				telemetry.Send(events.EventScanStatus, "Scan completed")
			}
			return nil, err
		}
	}

	telemetry.Send(events.EventScanProgress, 70)
	telemetry.Send(events.EventScanStatus, "Hydrating metadata...")
	telemetry.Send(events.EventScanProgressDetailed, map[string]interface{}{
		"stage":      "matching-complete",
		"matched":    len(lo.Filter(localFiles, func(lf *dto.LocalFile, _ int) bool { return lf.MediaID != 0 })),
		"unmatched":  len(lo.Filter(localFiles, func(lf *dto.LocalFile, _ int) bool { return lf.MediaID == 0 })),
		"totalFiles": len(localFiles),
		"message":    "Matching complete, hydrating metadata...",
	})

	// +---------------------+
	// |    FileHydrator     |
	// +---------------------+

	// Create a new hydrator
	hydrator := &FileHydrator{
		AllMedia:            mc.NormalizedMedia,
		LocalFiles:          localFiles,
		MetadataProviderRef: scn.MetadataProviderRef,
		PlatformRef:         scn.PlatformRef,
		Logger:              scn.Logger,
		ScanLogger:          scn.ScanLogger,
		ScanSummaryLogger:   scn.ScanSummaryLogger,
		Config:              scn.Config,
	}
	hydrator.HydrateMetadata(ctx)

	// +---------------------+
	// |  Metadata Enrichers |
	// +---------------------+

	scn.scanEnrichmentPhase(ctx, localFiles, mc, tmdbProvider)

	telemetry.Send(events.EventScanProgress, 80)

	// +---------------------+
	// |  Add missing media  |
	// +---------------------+

	// Add non-added media entries to platform collection
	if len(mf.UnknownMediaIds) < 5 && scn.PlatformRef != nil {
		if scn.WSEventManager != nil {
			scn.WSEventManager.SendEvent(events.EventScanStatus, "Adding missing media to platform...")
		}

		if err = scn.PlatformRef.AddMediaToCollection(ctx, mf.UnknownMediaIds); err != nil {
			scn.Logger.Warn().Msg("scanner: An error occurred while adding media to collection: " + err.Error())
		}
	}

	// +---------------------+
	// |    Merge files      |
	// +---------------------+

	// Merge skipped files with scanned files before persistence so they are all accounted for
	// and their LibraryMediaId associations are verified/restored.
	if len(skippedLfs) > 0 {
		scn.Logger.Debug().Int("skippedLfs", len(skippedLfs)).Msg("scanner: Merging skipped local files before persistence")
		for _, sf := range skippedLfs {
			if filesystem.FileExists(sf.Path) {
				localFiles = append(localFiles, sf)
			} else if scn.WithShelving && sf.IsLocked() {
				scn.shelvedLocalFiles = append(scn.shelvedLocalFiles, sf)
			}
		}
	}

	// Collect all unique media IDs from matched local files
	allMatchedIds := make(map[int]struct{})
	for _, lf := range localFiles {
		if lf.MediaID != 0 {
			allMatchedIds[lf.MediaID] = struct{}{}
		}
	}
	// Also include CollectionMediaIds from the fetcher
	for _, id := range mf.CollectionMediaIds {
		allMatchedIds[id] = struct{}{}
	}

	// Build a map from media ID → file-derived title for fallback
	// and detect which media IDs are movies based on folder structure
	fileTitleMap := make(map[int]string)
	movieIds := make(map[int]bool)
	for _, lf := range localFiles {
		if lf.MediaID != 0 {
			if _, exists := fileTitleMap[lf.MediaID]; !exists {
				info := ParseFolderStructure(lf.Path, libraryPaths)
				if info.SeriesName != "" {
					fileTitleMap[lf.MediaID] = info.SeriesName
				}
				if info.IsMovie {
					movieIds[lf.MediaID] = true
				}
			}
			// IDs with offset >= 1,000,000 are always movies (DragonBallResolver convention)
			if lf.MediaID >= 1_000_000 {
				movieIds[lf.MediaID] = true
			}
		}
	}

	// Create LibraryMedia DB records for each unique matched media
	// This is necessary so the collection can look them up and show entries in the UI
	scn.Logger.Info().
		Int("allMatchedIds", len(allMatchedIds)).
		Bool("dbIsNil", scn.Database == nil).
		Msg("scanner: Starting TMDB LibraryMedia persistence")
	if scn.Database != nil {

		// Persist LibraryMedia records and map IDs back to local files
		libraryMediaIdMap := scn.persistMatchedMedia(allMatchedIds, movieIds, mc.NormalizedMedia, localFiles)

		scn.Logger.Info().
			Int("totalMatched", len(allMatchedIds)).
			Int("libraryMediaCreated", len(libraryMediaIdMap)).
			Msg("scanner: TMDB LibraryMedia persistence completed")

		// Fetch enriched metadata (seasons, episodes, etc.)
		err = scn.enrichMediaMetadata(ctx, libraryMediaIdMap, movieIds, localFiles)
		if err != nil {
			return nil, err
		}
	}

	// Add media to platform collection (requires platform ref)
	if scn.PlatformRef != nil {
		allIds := make([]int, 0, len(allMatchedIds))
		for id := range allMatchedIds {
			allIds = append(allIds, id)
		}
		if len(allIds) > 0 {
			scn.Logger.Debug().Int("count", len(allIds)).Msg("scanner: Adding all matched media to platform collection")
			if err = scn.PlatformRef.AddMediaToCollection(ctx, allIds); err != nil {
				scn.Logger.Warn().Msg("scanner: An error occurred while adding TMDB media to collection: " + err.Error())
			}
		}
	}

	localFiles = scn.scanFinalizePhase(localFiles, skippedLfs, sortedLibraryPaths, mc, mf)

	if scn.BackgroundQueue != nil {
		for _, lf := range localFiles {
			scn.BackgroundQueue.Enqueue(lf)
		}
	}

	return localFiles, nil
}
