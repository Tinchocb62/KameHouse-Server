package scanner

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"kamehouse/internal/api/anilist"
	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/api/tmdb"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/events"
	"kamehouse/internal/hook"
	"kamehouse/internal/library/anime"
	"kamehouse/internal/library/filesystem"
	librarymetadata "kamehouse/internal/library/metadata"
	"kamehouse/internal/library/summary"
	"kamehouse/internal/platforms/platform"
	"kamehouse/internal/util"
	"kamehouse/internal/util/limiter"
	"os"
	"path/filepath"
	"runtime"
	"runtime/debug"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/rs/zerolog"
	"github.com/samber/lo"
)

var ErrNoLocalFiles = errors.New("[matcher] no local files")

type Scanner struct {
	DirPath                    string
	OtherDirPaths              []string
	Enhanced                   bool
	EnhanceWithOfflineDatabase bool
	PlatformRef                *util.Ref[platform.Platform]
	Logger                     *zerolog.Logger
	WSEventManager             events.WSEventManagerInterface
	ExistingLocalFiles         []*dto.LocalFile
	SkipLockedFiles            bool
	SkipIgnoredFiles           bool
	ScanSummaryLogger          *summary.ScanSummaryLogger
	ScanLogger                 *ScanLogger
	Database                   *db.Database // Used to save LibraryMedia found via NFO
	MetadataProviderRef        *util.Ref[metadata_provider.Provider]
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
	AnimeCollection *anilist.AnimeCollection
	// TMDB mode: use folder structure + TMDB instead of AniList
	UseTMDB bool
}

// Scan will scan the directory and return a list of dto.LocalFile.
func (scn *Scanner) Scan(ctx context.Context) (lfs []*dto.LocalFile, err error) {
	defer util.HandlePanicWithError(&err)

	go anime.EpisodeCollectionFromLocalFilesCache.Clear()

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

	telemetry.Send(events.EventScanProgress, 0)
	telemetry.Send(events.EventScanStatus, "Retrieving local files...")

	completeAnimeCache := anilist.NewCompleteAnimeCache()

	// Create a new Anilist rate limiter
	anilistRateLimiter := limiter.NewAnilistLimiter()

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
			Msg("Scanning started")

		defer func() {
			now := time.Now()
			scn.ScanLogger.logger.Info().
				Time("endTime", time.Now()).
				Str("duration", now.Sub(startTime).String()).
				Int("localFilesCount", len(lfs)).
				Msg("Ended")
		}()
	}

	// Invoke ScanStarted hook
	event := &ScanStartedEvent{
		LibraryPath:       scn.DirPath,
		OtherLibraryPaths: scn.OtherDirPaths,
		Enhanced:          scn.Enhanced,
		SkipLocked:        scn.SkipLockedFiles,
		SkipIgnored:       scn.SkipIgnoredFiles,
		LocalFiles:        scn.ExistingLocalFiles,
	}
	_ = hook.GlobalHookManager.OnScanStarted().Trigger(event)
	scn.DirPath = event.LibraryPath
	scn.OtherDirPaths = event.OtherLibraryPaths
	scn.Enhanced = event.Enhanced
	scn.SkipLockedFiles = event.SkipLocked
	scn.SkipIgnoredFiles = event.SkipIgnored

	// Default prevented, return the local files
	if event.DefaultPrevented {
		// Invoke ScanCompleted hook
		completedEvent := &ScanCompletedEvent{
			LocalFiles: event.LocalFiles,
			Duration:   int(time.Since(startTime).Milliseconds()),
		}
		_ = hook.GlobalHookManager.OnScanCompleted().Trigger(completedEvent)

		return completedEvent.LocalFiles, nil
	}

	// +---------------------+
	// |     File paths      |
	// +---------------------+

	libraryPaths := append([]string{scn.DirPath}, scn.OtherDirPaths...)
	// Sort library paths by length, so that longer paths are checked first
	sortedLibraryPaths := make([]string, len(libraryPaths))
	copy(sortedLibraryPaths, libraryPaths)
	sort.Slice(sortedLibraryPaths, func(i, j int) bool {
		return len(sortedLibraryPaths[i]) > len(sortedLibraryPaths[j])
	})

	// Create a map of local file paths used to avoid duplicates
	retrievedPathMap := make(map[string]struct{})

	paths := make([]string, 0)
	mu := sync.Mutex{}
	logMu := sync.Mutex{}

	// Bounded WorkerPool for directory-level file collection.
	// 1 goroutine-per-directory was unbounded on large setups; cap at NumCPU.
	dirPool := NewWorkerPool(ctx, len(libraryPaths))
	for i, dirPath := range libraryPaths {
		i, dirPath := i, dirPath // capture
		dirPool.Submit(func(_ context.Context) {
			retrievedPaths, err := filesystem.GetMediaFilePathsFromDirS(dirPath)
			if err != nil {
				scn.Logger.Error().Msgf("scanner: An error occurred while retrieving local files from directory: %s", err)
				return
			}

			if scn.ScanLogger != nil {
				logMu.Lock()
				if i == 0 {
					scn.ScanLogger.logger.Info().
						Any("count", len(retrievedPaths)).
						Msgf("Retrieved file paths from main directory: %s", dirPath)
				} else {
					scn.ScanLogger.logger.Info().
						Any("count", len(retrievedPaths)).
						Msgf("Retrieved file paths from other directory: %s", dirPath)
				}
				logMu.Unlock()
			}

			for _, path := range retrievedPaths {
				normPath := util.NormalizePath(path)
				mu.Lock()
				if _, ok := retrievedPathMap[normPath]; !ok {
					retrievedPathMap[normPath] = struct{}{}
					paths = append(paths, path)
				}
				mu.Unlock()
			}
		})
	}
	dirPool.Wait()

	if scn.ScanLogger != nil {
		scn.ScanLogger.logger.Info().
			Any("count", len(paths)).
			Msg("Retrieved file paths from all directories")
	}

	// Invoke ScanFilePathsRetrieved hook
	fpEvent := &ScanFilePathsRetrievedEvent{
		FilePaths: paths,
	}
	_ = hook.GlobalHookManager.OnScanFilePathsRetrieved().Trigger(fpEvent)
	paths = fpEvent.FilePaths

	// +---------------------+
	// |    Local files      |
	// +---------------------+

	localFiles := make([]*dto.LocalFile, 0)

	// Get skipped files depending on options
	skippedLfs := make(map[string]*dto.LocalFile)
	if (scn.SkipLockedFiles || scn.SkipIgnoredFiles) && scn.ExistingLocalFiles != nil {
		// Retrieve skipped files from existing local files
		for _, lf := range scn.ExistingLocalFiles {
			if scn.SkipLockedFiles && lf.IsLocked() {
				skippedLfs[lf.GetNormalizedPath()] = lf
			} else if scn.SkipIgnoredFiles && lf.IsIgnored() {
				skippedLfs[lf.GetNormalizedPath()] = lf
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

	// ── Bounded worker pool for LocalFile creation ────────────────────────────
	maxWorkers := runtime.NumCPU() * 2
	if maxWorkers < 4 {
		maxWorkers = 4
	}

	jobs := make(chan string, len(paths))
	results := make(chan *dto.LocalFile, len(paths))
	var skipped atomic.Int64

	var workerWg sync.WaitGroup
	for i := 0; i < maxWorkers; i++ {
		workerWg.Add(1)
		go func() {
			defer workerWg.Done()
			for path := range jobs {
				select {
				case <-ctx.Done():
					results <- nil
					continue
				default:
				}
				normPath := util.NormalizePath(path)
				if _, ok := skippedLfs[normPath]; ok {
					skipped.Add(1)
					results <- nil
					continue
				}
				lf := dto.NewLocalFileS(path, libraryPaths)
				results <- lf
			}
		}()
	}

	for _, p := range paths {
		jobs <- p
	}
	close(jobs)

	go func() {
		workerWg.Wait()
		close(results)
	}()

	localFiles = make([]*dto.LocalFile, 0, len(paths))
	for lf := range results {
		if lf != nil {
			localFiles = append(localFiles, lf)
		}
	}

	// Invoke ScanLocalFilesParsed hook
	parsedEvent := &ScanLocalFilesParsedEvent{
		LocalFiles: localFiles,
	}
	_ = hook.GlobalHookManager.OnScanLocalFilesParsed().Trigger(parsedEvent)
	localFiles = parsedEvent.LocalFiles

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

	// DEVNOTE: Removed library path checking because it causes some issues with symlinks

	// +---------------------+
	// |  No files to scan   |
	// +---------------------+

	// If there are no local files to scan (all files are skipped, or a file was deleted)
	if len(localFiles) == 0 {
		scn.WSEventManager.SendEvent(events.EventScanProgress, 90)
		scn.WSEventManager.SendEvent(events.EventScanStatus, "Verifying file integrity...")

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
		scn.WSEventManager.SendEvent(events.EventScanProgress, 100)
		scn.WSEventManager.SendEvent(events.EventScanStatus, "Scan completed")

		// Invoke ScanCompleted hook
		completedEvent := &ScanCompletedEvent{
			LocalFiles: localFiles,
			Duration:   int(time.Since(startTime).Milliseconds()),
		}
		hook.GlobalHookManager.OnScanCompleted().Trigger(completedEvent)
		localFiles = completedEvent.LocalFiles

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

	scn.Logger.Debug().Msg("scanner: Looking for local NFO metadata files")
	if scn.Enhanced && scn.EnhanceWithOfflineDatabase {
		// Track NFO folders already processed to avoid creating duplicate LibraryMedia
		nfoFolderMap := make(map[string]uint) // folder path -> LibraryMedia ID

		for _, lf := range localFiles {
			if lf.LibraryMediaId != 0 || lf.MediaId != 0 {
				continue // Already assigned
			}

			lfDir := filepath.Dir(lf.Path)

			// Check if we already processed an NFO in this folder
			if libMediaId, exists := nfoFolderMap[lfDir]; exists {
				lf.LibraryMediaId = libMediaId
				continue
			}

			// Typical Jellyfin/Kodi NFO paths
			nfoPaths := []string{
				filepath.Join(lfDir, "tvshow.nfo"),
				filepath.Join(lfDir, "anime.nfo"),
				filepath.Join(lfDir, "movie.nfo"),
			}

			for _, nfoPath := range nfoPaths {
				if filesystem.FileExists(nfoPath) {
					nfo, err := ParseNfoFile(nfoPath)
					if err == nil && nfo != nil {
						// Found NFO. We create a local LibraryMedia based on it.

						// Determine format roughly based on XMLName or file
						format := "TV"
						if nfo.XMLName.Local == "movie" {
							format = "MOVIE"
						}

						newMedia := &models.LibraryMedia{
							Type:          "ANIME",
							Format:        format,
							TitleOriginal: nfo.OriginalTitle,
							TitleRomaji:   nfo.Title, // Fallback
							TitleEnglish:  nfo.Title,
							Description:   nfo.Plot,
							Rating:        nfo.Rating,
							Year:          nfo.Year,
						}

						if saved, err := db.InsertLibraryMedia(scn.Database, newMedia); err == nil && saved != nil {
							lf.LibraryMediaId = saved.ID
							nfoFolderMap[lfDir] = saved.ID

							// Map external IDs if provided (note: this may be a TMDB ID, not necessarily AniList)
							if nfo.ID > 0 {
								lf.MediaId = nfo.ID
							}

							scn.Logger.Info().
								Str("filename", lf.Name).
								Uint("libraryMediaId", saved.ID).
								Msg("scanner: Created LibraryMedia via local NFO")
							break
						}
					}
				}
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

	// Determine TMDB token and language
	tmdbToken := ""
	tmdbLanguage := ""
	if scn.Database != nil {
		if settings, err := scn.Database.GetSettings(); err == nil && settings.Library != nil {
			tmdbToken = settings.Library.TmdbApiKey
			tmdbLanguage = settings.Library.TmdbLanguage
		}
	}
	if tmdbToken == "" {
		tmdbToken = os.Getenv("KAMEHOUSE_TMDB_TOKEN")
	}

	if tmdbToken != "" {
		tmdbClient = tmdb.NewClient(tmdbToken, tmdbLanguage)
		tmdbProvider = librarymetadata.NewTMDBProviderWithClient(tmdbClient)
		scn.Logger.Debug().Msg("scanner: TMDb client initialized")
		if scn.ScanLogger != nil {
			scn.ScanLogger.logger.Info().Msg("TMDb client initialized")
		}
	}

	if useTMDB {
		if tmdbProvider != nil {
			scn.Logger.Info().Msg("scanner: TMDB mode enabled")
		} else {
			scn.Logger.Warn().Msg("scanner: TMDB mode requested but TMDB token not set, falling back to AniList")
			useTMDB = false
		}
	}

	mf, err := NewMediaFetcher(ctx, &MediaFetcherOptions{
		Enhanced:                   scn.Enhanced,
		EnhanceWithOfflineDatabase: scn.EnhanceWithOfflineDatabase,
		PlatformRef:                scn.PlatformRef,
		MetadataProviderRef:        scn.MetadataProviderRef,
		MetadataProviders:          scn.MetadataProviders,
		LocalFiles:                 localFiles,
		CompleteAnimeCache:         completeAnimeCache,
		Logger:                     scn.Logger,
		AnilistRateLimiter:         anilistRateLimiter,
		DisableAnimeCollection:     false,
		ScanLogger:                 scn.ScanLogger,
		OptionalAnimeCollection:    scn.AnimeCollection,
		UseTMDB:                    useTMDB,
		TMDBProvider:               tmdbProvider,
		LibraryPaths:               libraryPaths,
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

	// Create a new matcher
	matcher := &Matcher{
		LocalFiles:     localFiles,
		MediaContainer: mc,
		Logger:         scn.Logger,
		Database:       scn.Database,
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

	telemetry.Send(events.EventScanProgress, 70)
	telemetry.Send(events.EventScanStatus, "Hydrating metadata...")
	telemetry.Send(events.EventScanProgressDetailed, map[string]interface{}{
		"stage":      "matching-complete",
		"matched":    len(lo.Filter(localFiles, func(lf *dto.LocalFile, _ int) bool { return lf.MediaId != 0 })),
		"unmatched":  len(lo.Filter(localFiles, func(lf *dto.LocalFile, _ int) bool { return lf.MediaId == 0 })),
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
		CompleteAnimeCache:  completeAnimeCache,
		AnilistRateLimiter:  anilistRateLimiter,
		Logger:              scn.Logger,
		ScanLogger:          scn.ScanLogger,
		ScanSummaryLogger:   scn.ScanSummaryLogger,
		Config:              scn.Config,
	}
	hydrator.HydrateMetadata()

	telemetry.Send(events.EventScanProgress, 80)

	// +---------------------+
	// |  Add missing media  |
	// +---------------------+

	// Add non-added media entries to AniList collection
	// Max of 4 to avoid rate limit issues
	// Skip this step in TMDB-only mode (no AniList platform)
	if len(mf.UnknownMediaIds) < 5 && scn.PlatformRef != nil && !scn.PlatformRef.IsAbsent() {
		scn.WSEventManager.SendEvent(events.EventScanStatus, "Adding missing media to AniList...")

		if err = scn.PlatformRef.Get().AddMediaToCollection(ctx, mf.UnknownMediaIds); err != nil {
			scn.Logger.Warn().Msg("scanner: An error occurred while adding media to planning list: " + err.Error())
		}
	}

	// In TMDB mode, create LibraryMedia DB records and add media to collection.
	// LibraryMedia DB creation is separate from platform ref check since it only needs the DB.
	if scn.UseTMDB {
		// Collect all unique media IDs from matched local files
		allMatchedIds := make(map[int]struct{})
		for _, lf := range localFiles {
			if lf.MediaId != 0 {
				allMatchedIds[lf.MediaId] = struct{}{}
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
			if lf.MediaId != 0 {
				if _, exists := fileTitleMap[lf.MediaId]; !exists {
					info := ParseFolderStructure(lf.Path, libraryPaths)
					if info.SeriesName != "" {
						fileTitleMap[lf.MediaId] = info.SeriesName
					}
					if info.IsMovie {
						movieIds[lf.MediaId] = true
					}
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
			normalizedMap := make(map[int]*dto.NormalizedMedia)
			for _, nm := range mc.NormalizedMedia {
				normalizedMap[nm.ID] = nm
			}

			// Map from TMDB media ID → LibraryMedia DB ID
			libraryMediaIdMap := make(map[int]uint)

			var mediaBatch []*models.LibraryMedia

			// Build the slice of items to insert
			for id := range allMatchedIds {
				if id == 0 {
					continue
				}

				// Determine the correct format
				format := "TV"
				if movieIds[id] {
					format = "MOVIE"
				}

				// Build the LibraryMedia from NormalizedMedia if available
				newMedia := &models.LibraryMedia{
					Type:   "ANIME",
					Format: format,
					TmdbId: -id, // id is negative (-tmdbId from NormalizedMedia.ID), so -id gives us the positive TMDB ID
				}

				if nm, ok := normalizedMap[id]; ok {
					if nm.Title != nil {
						if nm.Title.Romaji != nil {
							newMedia.TitleRomaji = *nm.Title.Romaji
						}
						if nm.Title.English != nil {
							newMedia.TitleEnglish = *nm.Title.English
						}
						if nm.Title.Native != nil {
							newMedia.TitleOriginal = *nm.Title.Native
						}
					}
					if nm.Format != nil {
						newMedia.Format = string(*nm.Format)
					}
					if nm.Year != nil {
						newMedia.Year = *nm.Year
					}
					if nm.Episodes != nil {
						newMedia.TotalEpisodes = *nm.Episodes
					}
					if nm.CoverImage != nil && nm.CoverImage.Large != nil {
						newMedia.PosterImage = *nm.CoverImage.Large
					}
					if nm.BannerImage != nil {
						newMedia.BannerImage = *nm.BannerImage
					}
					if nm.Description != nil {
						newMedia.Description = *nm.Description
					}
					if nm.MetadataStatus != nil {
						newMedia.MetadataStatus = *nm.MetadataStatus
					}
				}

				// Fallback title: use file-derived title instead of generic "TMDB Media XXXXX"
				if newMedia.TitleRomaji == "" && newMedia.TitleEnglish == "" {
					if fileTitle, ok := fileTitleMap[id]; ok && fileTitle != "" {
						newMedia.TitleEnglish = fileTitle
					} else {
						newMedia.TitleEnglish = fmt.Sprintf("TMDB Media %d", -id)
					}
				}

				mediaBatch = append(mediaBatch, newMedia)
			}

			// Atomic Bulk Upsert to evade WAL contention and N+1 inserts
			if len(mediaBatch) > 0 {
				err = db.UpsertLibraryMediaBatch(scn.Database, mediaBatch, 100)
				if err != nil {
					scn.Logger.Warn().Err(err).Msg("scanner: Failed to bulk upsert LibraryMedia batch")
				}
			}

			// In Bulk Upserts, we don't naturally get the generated sequence IDs back cleanly for associations
			// depending on the engine. We need to fetch the newly created items to retrieve their generated Primary Keys
			// to map to the `libraryMediaIdMap` map so local files know which LibraryMedia they belong to.
			var insertedMedia []*models.LibraryMedia
			if scn.Database != nil {
				scn.Database.Gorm().Where("tmdb_id IN ?", lo.Map(mediaBatch, func(m *models.LibraryMedia, _ int) int { return m.TmdbId })).Find(&insertedMedia)
				for _, m := range insertedMedia {
					libraryMediaIdMap[-m.TmdbId] = m.ID
				}
			}

			// Set LibraryMediaId on all local files
			for _, lf := range localFiles {
				if lf.MediaId != 0 {
					if libId, ok := libraryMediaIdMap[lf.MediaId]; ok {
						lf.LibraryMediaId = libId
					}
				}
			}

			scn.Logger.Info().
				Int("totalMatched", len(allMatchedIds)).
				Int("libraryMediaCreated", len(libraryMediaIdMap)).
				Msg("scanner: TMDB LibraryMedia persistence completed")

			// Fetch season & episode metadata from TMDB for TV series
			if tmdbProvider != nil {
				tmdbSeasonFetched := make(map[int]bool)
				for tmdbMediaId, libMediaId := range libraryMediaIdMap {
					if movieIds[-tmdbMediaId] {
						continue // Skip movies
					}
					positiveTmdbId := -tmdbMediaId // IDs are stored as negative in NormalizedMedia
					if positiveTmdbId <= 0 {
						continue
					}
					if tmdbSeasonFetched[positiveTmdbId] {
						continue
					}
					tmdbSeasonFetched[positiveTmdbId] = true

					for seasonNum := 0; seasonNum <= 50; seasonNum++ {
						seasonDetails, err := tmdbProvider.GetTVSeason(positiveTmdbId, seasonNum)
						if err != nil {
							if strings.Contains(err.Error(), "404") && seasonNum > 0 {
								break
							}
							continue
						}

						seasonImage := ""
						if seasonDetails.PosterPath != "" {
							seasonImage = "https://image.tmdb.org/t/p/w500" + seasonDetails.PosterPath
						}
						libSeason := &models.LibrarySeason{
							LibraryMediaID: libMediaId,
							SeasonNumber:   seasonDetails.SeasonNumber,
							Title:          seasonDetails.Name,
							Description:    seasonDetails.Overview,
							Image:          seasonImage,
						}
						_ = db.UpsertLibrarySeason(scn.Database, libSeason)

						for _, ep := range seasonDetails.Episodes {
							epImage := ""
							if ep.StillPath != "" {
								epImage = "https://image.tmdb.org/t/p/w500" + ep.StillPath
							}
							libEp := &models.LibraryEpisode{
								LibraryMediaID: libMediaId,
								EpisodeNumber:  ep.EpisodeNumber,
								SeasonNumber:   ep.SeasonNumber,
								Type:           "REGULAR",
								Title:          ep.Name,
								Description:    ep.Overview,
								Image:          epImage,
								RuntimeMinutes: ep.Runtime,
							}
							if seasonNum == 0 {
								libEp.Type = "SPECIAL"
							}
							if ep.AirDate != "" {
								if parsedDate, parseErr := time.Parse(time.DateOnly, ep.AirDate); parseErr == nil {
									libEp.AirDate = parsedDate
								}
							}
							_ = db.UpsertLibraryEpisode(scn.Database, libEp)
						}
					}
				}
			}
		}

		// Add media to platform collection (requires platform ref)
		if scn.PlatformRef != nil && !scn.PlatformRef.IsAbsent() {
			allIds := make([]int, 0, len(allMatchedIds))
			for id := range allMatchedIds {
				allIds = append(allIds, id)
			}
			if len(allIds) > 0 {
				scn.Logger.Debug().Int("count", len(allIds)).Msg("scanner: Adding all matched media to platform collection")
				if err = scn.PlatformRef.Get().AddMediaToCollection(ctx, allIds); err != nil {
					scn.Logger.Warn().Msg("scanner: An error occurred while adding TMDB media to collection: " + err.Error())
				}
			}
		}
	}

	scn.WSEventManager.SendEvent(events.EventScanProgress, 90)
	scn.WSEventManager.SendEvent(events.EventScanStatus, "Verifying file integrity...")
	scn.WSEventManager.SendEvent(events.EventScanProgressDetailed, map[string]interface{}{
		"stage":   "integrity-check",
		"message": "Verifying file integrity and merging results...",
	})

	// Hydrate the summary logger before merging files
	scn.ScanSummaryLogger.HydrateData(localFiles, mc.NormalizedMedia, mf.AnimeCollectionWithRelations)

	// +---------------------+
	// |    Merge files      |
	// +---------------------+

	scn.Logger.Debug().Int("skippedLfs", len(skippedLfs)).Msgf("scanner: Adding skipped local files")

	// Merge skipped files with scanned files
	// Only files that exist (this removes deleted/moved files)
	if len(skippedLfs) > 0 {
		wg := sync.WaitGroup{}
		mu := sync.Mutex{}
		wg.Add(len(skippedLfs))
		for _, skippedLf := range skippedLfs {
			go func(skippedLf *dto.LocalFile) {
				defer wg.Done()
				if filesystem.FileExists(skippedLf.Path) {
					mu.Lock()
					localFiles = append(localFiles, skippedLf)
					mu.Unlock()
				} else if scn.WithShelving && skippedLf.IsLocked() { // If the file is locked and shelving is enabled, shelve it
					mu.Lock()
					scn.shelvedLocalFiles = append(scn.shelvedLocalFiles, skippedLf)
					mu.Unlock()
				}
			}(skippedLf)
		}
		wg.Wait()
	}

	// Add remaining shelved files
	scn.addRemainingShelvedFiles(skippedLfs, sortedLibraryPaths)

	scn.Logger.Info().Msg("scanner: Scan completed")
	scn.WSEventManager.SendEvent(events.EventScanProgress, 100)
	scn.WSEventManager.SendEvent(events.EventScanStatus, "Scan completed")

	if scn.ScanLogger != nil {
		scn.ScanLogger.logger.Info().
			Int("count", len(localFiles)).
			Int("unknownMediaCount", len(mf.UnknownMediaIds)).
			Msg("Scan completed")
	}

	// Invoke ScanCompleted hook
	completedEvent := &ScanCompletedEvent{
		LocalFiles: localFiles,
		Duration:   int(time.Since(startTime).Milliseconds()),
	}
	hook.GlobalHookManager.OnScanCompleted().Trigger(completedEvent)
	localFiles = completedEvent.LocalFiles

	runtime.GC()
	debug.FreeOSMemory()

	return localFiles, nil
}

// InLibrariesOnly removes files that are not under the library paths.
// It modifies the slice in place to only keep files whose paths are under one of the configured library directories.
func (scn *Scanner) InLibrariesOnly(lfs []*dto.LocalFile) {
	libraryPaths := append([]string{scn.DirPath}, scn.OtherDirPaths...)
	n := 0
	for _, lf := range lfs {
		normPath := util.NormalizePath(lf.Path)
		for _, libPath := range libraryPaths {
			if strings.HasPrefix(normPath, util.NormalizePath(libPath)) {
				lfs[n] = lf
				n++
				break
			}
		}
	}
	// Zero out remaining elements to allow GC
	for i := n; i < len(lfs); i++ {
		lfs[i] = nil
	}
}

func (scn *Scanner) GetShelvedLocalFiles() []*dto.LocalFile {
	return scn.shelvedLocalFiles
}

func (scn *Scanner) addRemainingShelvedFiles(skippedLfs map[string]*dto.LocalFile, sortedLibraryPaths []string) {
	// If a shelved file was not unshelved, it should either:
	// be kept shelved or
	// removed (if its library path exists)

	libraryPathExistsCache := make(map[string]bool)

	for _, shelvedLf := range scn.ExistingShelvedFiles {
		// If not in skippedLfs (meaning it wasn't unshelved), keep it shelved or remove it
		if _, ok := skippedLfs[shelvedLf.GetNormalizedPath()]; !ok {

			// Check if we should really keep it shelved
			keepShelved := false

			// Find which library path this file belongs to
			var matchedLibPath string
			for _, libPath := range sortedLibraryPaths {
				if strings.HasPrefix(shelvedLf.GetNormalizedPath(), util.NormalizePath(libPath)) {
					matchedLibPath = libPath
					break
				}
			}

			if matchedLibPath != "" {
				exists, checked := libraryPathExistsCache[matchedLibPath]
				if !checked {
					_, err := os.Stat(matchedLibPath)
					exists = err == nil || !os.IsNotExist(err)
					libraryPathExistsCache[matchedLibPath] = exists
				}

				if !exists {
					// Library path doesn't exist (e.g. drive disconnected), so keep shelved
					keepShelved = true
				} else {
					// Library path exists, but file was not found, we assume it was deleted
					keepShelved = false
				}
			} else {
				// File doesn't belong to any known library path.
				// Meaning the library path was explicitly removed from the settings
				// default to removing it, doesn't hurt to scan again
				keepShelved = false
			}

			if keepShelved {
				scn.shelvedLocalFiles = append(scn.shelvedLocalFiles, shelvedLf)
			}
		}
	}
}

func ToConfig(c string) (*Config, error) {
	var ret Config
	err := json.Unmarshal([]byte(c), &ret)
	if err != nil {
		return nil, err
	}

	return &ret, nil
}
