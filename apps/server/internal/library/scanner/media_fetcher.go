package scanner

import (
	"context"
	"errors"
	"fmt"
	"hash/crc32"
	"kamehouse/internal/api/anidb"
	"kamehouse/internal/api/anilist"
	"kamehouse/internal/api/animeofflinedb"
	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/customsource"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/hook"
	"kamehouse/internal/library/anime"
	librarymetadata "kamehouse/internal/library/metadata"
	"kamehouse/internal/platforms/platform"
	"kamehouse/internal/util"
	"kamehouse/internal/util/limiter"
	"path/filepath"
	"strings"
	"time"

	"github.com/davecgh/go-spew/spew"
	"github.com/rs/zerolog"
	"github.com/samber/lo"
	lop "github.com/samber/lo/parallel"
)

// MediaFetcher holds all anilist.BaseAnime that will be used for the comparison process
type MediaFetcher struct {
	AllMedia                     []*dto.NormalizedMedia
	CollectionMediaIds           []int
	UnknownMediaIds              []int // Media IDs that are not in the user's collection
	AnimeCollectionWithRelations *anilist.AnimeCollectionWithRelations
	ScanLogger                   *ScanLogger
}

type MediaFetcherOptions struct {
	Enhanced                   bool
	EnhanceWithOfflineDatabase bool
	PlatformRef                *util.Ref[platform.Platform]
	MetadataProviderRef        *util.Ref[metadata_provider.Provider]
	MetadataProviders          []librarymetadata.Provider
	LocalFiles                 []*dto.LocalFile
	CompleteAnimeCache         *anilist.CompleteAnimeCache
	Logger                     *zerolog.Logger
	AnilistRateLimiter         *limiter.Limiter
	DisableAnimeCollection     bool
	ScanLogger                 *ScanLogger
	AniDBClient                *anidb.Client
	// used for adding custom sources
	OptionalAnimeCollection *anilist.AnimeCollection
	// TMDB mode
	UseTMDB      bool
	TMDBProvider *librarymetadata.TMDBProvider
	LibraryPaths []string // used for folder structure parsing in TMDB mode
}

// NewMediaFetcher
// Calling this method will kickstart the fetch process
// When enhancing is false, MediaFetcher.AllMedia will be all anilist.BaseAnime from the user's AniList collection.
// When enhancing is true, MediaFetcher.AllMedia will be anilist.BaseAnime for each unique, parsed anime title and their relations.
func NewMediaFetcher(ctx context.Context, opts *MediaFetcherOptions) (ret *MediaFetcher, retErr error) {
	defer util.HandlePanicInModuleWithError("library/scanner/NewMediaFetcher", &retErr)

	if opts.LocalFiles == nil ||
		opts.Logger == nil {
		return nil, errors.New("missing options")
	}

	// TMDB Mode: use folder structure + TMDB API instead of AniList
	if opts.UseTMDB && opts.TMDBProvider != nil {
		return newMediaFetcherTMDB(ctx, opts)
	}

	// Legacy/AniList mode: require AniList-specific dependencies
	if opts.PlatformRef == nil || opts.PlatformRef.IsAbsent() ||
		opts.CompleteAnimeCache == nil ||
		opts.MetadataProviderRef == nil || opts.MetadataProviderRef.IsAbsent() ||
		opts.AnilistRateLimiter == nil {
		return nil, errors.New("missing options for AniList mode")
	}

	mf := new(MediaFetcher)
	mf.ScanLogger = opts.ScanLogger

	opts.Logger.Debug().
		Any("enhanced", opts.Enhanced).
		Msg("media fetcher: Creating media fetcher")

	if mf.ScanLogger != nil {
		mf.ScanLogger.LogMediaFetcher(zerolog.InfoLevel).
			Msg("Creating media fetcher")
	}

	// Invoke ScanMediaFetcherStarted hook
	event := &ScanMediaFetcherStartedEvent{
		Enhanced:                   opts.Enhanced,
		EnhanceWithOfflineDatabase: opts.EnhanceWithOfflineDatabase,
		DisableAnimeCollection:     opts.DisableAnimeCollection,
	}
	_ = hook.GlobalHookManager.OnScanMediaFetcherStarted().Trigger(event)
	opts.Enhanced = event.Enhanced

	// +---------------------+
	// |     All media       |
	// +---------------------+

	// Fetch latest user's AniList collection
	animeCollectionWithRelations, err := opts.PlatformRef.Get().GetAnimeCollectionWithRelations(ctx)
	if err != nil {
		return nil, err
	}

	mf.AnimeCollectionWithRelations = animeCollectionWithRelations

	// Temporary slice to hold CompleteAnime before conversion
	allCompleteAnime := make([]*anilist.CompleteAnime, 0)

	if !opts.DisableAnimeCollection {
		// For each collection entry, append the media to AllMedia
		for _, list := range animeCollectionWithRelations.GetMediaListCollection().GetLists() {
			for _, entry := range list.GetEntries() {
				allCompleteAnime = append(allCompleteAnime, entry.GetMedia())

				// +---------------------+
				// |        Cache        |
				// +---------------------+
				// We assume the CompleteAnimeCache is empty. Add media to cache.
				opts.CompleteAnimeCache.Set(entry.GetMedia().ID, entry.GetMedia())
			}
		}
		// Handle custom sources
		// Devnote: For now we just get them from opts.AnimeCollection but in the future we could introduce a new method for custom sources to return many CompleteAnime at once
		// right now custom source media wont have any relations data
		if opts.OptionalAnimeCollection != nil {
			for _, list := range opts.OptionalAnimeCollection.GetMediaListCollection().GetLists() {
				if list == nil {
					continue
				}
				for _, entry := range list.GetEntries() {
					if entry == nil || entry.GetMedia() == nil || !customsource.IsExtensionId(entry.GetMedia().GetID()) {
						continue
					}
					allCompleteAnime = append(allCompleteAnime, entry.GetMedia().ToCompleteAnime())
				}
			}
		}
	}

	if mf.ScanLogger != nil {
		mf.ScanLogger.LogMediaFetcher(zerolog.DebugLevel).
			Int("count", len(allCompleteAnime)).
			Msg("Fetched media from AniList collection")
	}

	//--------------------------------------------

	// Get the media IDs from the collection
	mf.CollectionMediaIds = lop.Map(allCompleteAnime, func(m *anilist.CompleteAnime, index int) int {
		return m.ID
	})

	//--------------------------------------------

	// +---------------------+
	// |  Enhanced (Legacy)  |
	// +---------------------+

	// If enhancing (legacy) is on, scan media from local files and get their relations
	if opts.Enhanced && !opts.EnhanceWithOfflineDatabase {

		newMedia, ok := FetchMediaFromLocalFiles(
			ctx,
			opts.MetadataProviders,
			opts.LocalFiles,
			mf.ScanLogger,
			opts.AnilistRateLimiter,
		)
		if ok {
			mf.AllMedia = append(mf.AllMedia, newMedia...)

			// Append locally fetched media IDs to CollectionMediaIds
			// This prevents them from being marked as "UnknownMediaIds"
			// and incorrectly flagged as "Hidden Media" in the UI.
			for _, m := range newMedia {
				mf.CollectionMediaIds = append(mf.CollectionMediaIds, m.ID)
			}
		}
	}

	mf.AllMedia = append(mf.AllMedia, NormalizedMediaFromAnilistComplete(allCompleteAnime)...)

	// +-------------------------+
	// |  Enhanced (Offline DB)  |
	// +-------------------------+
	// When enhanced mode is on, fetch anime-offline-database to provide more matching candidates

	if opts.Enhanced && opts.EnhanceWithOfflineDatabase {
		if mf.ScanLogger != nil {
			mf.ScanLogger.LogMediaFetcher(zerolog.DebugLevel).
				Msg("Fetching anime-offline-database for enhanced matching")
		}

		// build existing media IDs map for filtering
		existingMediaIDs := make(map[int]bool, len(mf.AllMedia))
		for _, m := range mf.AllMedia {
			existingMediaIDs[m.ID] = true
		}

		offlineMedia, err := animeofflinedb.FetchAndConvertDatabase(existingMediaIDs)
		if err != nil {
			if mf.ScanLogger != nil {
				mf.ScanLogger.LogMediaFetcher(zerolog.WarnLevel).
					Err(err).
					Msg("Failed to fetch anime-offline-database, continuing without it")
			}
		} else {
			if mf.ScanLogger != nil {
				mf.ScanLogger.LogMediaFetcher(zerolog.DebugLevel).
					Int("offlineMediaCount", len(offlineMedia)).
					Msg("Added media from anime-offline-database")
			}

			// Append offline media to AllMedia
			mf.AllMedia = append(mf.AllMedia, offlineMedia...)
		}
	}

	// +---------------------+
	// |   Unknown media     |
	// +---------------------+
	// Media that are not in the user's collection

	// Get the media that are not in the user's collection
	unknownMedia := lo.Filter(mf.AllMedia, func(m *dto.NormalizedMedia, _ int) bool {
		return !lo.Contains(mf.CollectionMediaIds, m.ID)
	})
	// Get the media IDs that are not in the user's collection
	mf.UnknownMediaIds = lop.Map(unknownMedia, func(m *dto.NormalizedMedia, _ int) int {
		return m.ID
	})

	if mf.ScanLogger != nil {
		mf.ScanLogger.LogMediaFetcher(zerolog.DebugLevel).
			Int("unknownMediaCount", len(mf.UnknownMediaIds)).
			Int("allMediaCount", len(mf.AllMedia)).
			Msg("Finished creating media fetcher")
	}

	// Invoke ScanMediaFetcherCompleted hook
	completedEvent := &ScanMediaFetcherCompletedEvent{
		AllMedia:        mf.AllMedia,
		UnknownMediaIds: mf.UnknownMediaIds,
	}
	_ = hook.GlobalHookManager.OnScanMediaFetcherCompleted().Trigger(completedEvent)
	mf.AllMedia = completedEvent.AllMedia
	mf.UnknownMediaIds = completedEvent.UnknownMediaIds

	return mf, nil
}

func NormalizedMediaFromAnilistComplete(c []*anilist.CompleteAnime) []*dto.NormalizedMedia {
	normalizedMediaMap := make(map[int]*dto.NormalizedMedia)

	// Convert CompleteAnime to NormalizedMedia and flatten relations
	for _, m := range c {
		if _, found := normalizedMediaMap[m.ID]; !found {
			normalizedMediaMap[m.ID] = anime.NewNormalizedMedia(m.ToBaseAnime())
		}

		// Process relations
		if m.Relations != nil && m.Relations.Edges != nil && len(m.Relations.Edges) > 0 {
			for _, edgeM := range m.Relations.Edges {
				if edgeM.Node == nil || edgeM.Node.Format == nil || edgeM.RelationType == nil {
					continue
				}
				if *edgeM.Node.Format != anilist.MediaFormatMovie &&
					*edgeM.Node.Format != anilist.MediaFormatOva &&
					*edgeM.Node.Format != anilist.MediaFormatSpecial &&
					*edgeM.Node.Format != anilist.MediaFormatTv {
					continue
				}
				if *edgeM.RelationType != anilist.MediaRelationPrequel &&
					*edgeM.RelationType != anilist.MediaRelationSequel &&
					*edgeM.RelationType != anilist.MediaRelationSpinOff &&
					*edgeM.RelationType != anilist.MediaRelationAlternative &&
					*edgeM.RelationType != anilist.MediaRelationParent &&
					*edgeM.RelationType != anilist.MediaRelationSideStory &&
					*edgeM.RelationType != anilist.MediaRelationSummary {
					continue
				}
				// Make sure we don't overwrite the original media in the map
				if _, found := normalizedMediaMap[edgeM.Node.ID]; !found {
					normalizedMediaMap[edgeM.Node.ID] = anime.NewNormalizedMedia(edgeM.Node)
				}
			}
		}
	}

	ret := make([]*dto.NormalizedMedia, 0, len(normalizedMediaMap))

	for _, m := range normalizedMediaMap {
		ret = append(ret, m)
	}

	return ret
}

//----------------------------------------------------------------------------------------------------------------------

// FetchMediaFromLocalFiles gets media and their relations from local file titles.
// It retrieves unique titles from local files,
// fetches mal.SearchResultAnime from MAL,
// uses these search results to get AniList IDs using metadata.AnimeMetadata mappings,
// queries AniList to retrieve all anilist.BaseAnime using anilist.GetBaseAnimeById and their relations using anilist.FetchMediaTree.
// It does not return an error if one of the steps fails.
// It returns the scanned media and a boolean indicating whether the process was successful.
func FetchMediaFromLocalFiles(
	ctx context.Context,
	providers []librarymetadata.Provider,
	localFiles []*dto.LocalFile,
	scanLogger *ScanLogger,
	limiter *limiter.Limiter,
) (ret []*dto.NormalizedMedia, ok bool) {
	defer util.HandlePanicInModuleThen("library/scanner/FetchMediaFromLocalFiles", func() {
		ok = false
	})

	if scanLogger != nil {
		scanLogger.LogMediaFetcher(zerolog.DebugLevel).
			Str("module", "Enhanced").
			Msg("Fetching media from local files using dynamic providers")
	}

	// Get titles
	titles := anime.GetUniqueAnimeTitlesFromLocalFiles(localFiles)

	if scanLogger != nil {
		scanLogger.LogMediaFetcher(zerolog.DebugLevel).
			Str("module", "Enhanced").
			Str("context", spew.Sprint(titles)).
			Msg("Parsed titles from local files")
	}

	var results []*dto.NormalizedMedia

	// Per-scan metadata cache: collapses duplicate API calls for the same title
	// (singleflight) and memoises resolved results (sync.Map) across the loop.
	// Cleared on return so memory is released as soon as the scan completes.
	cache := newMetadataFetchCache()
	defer cache.Clear()

	// For each unique title, delegate to the cache which handles deduplication,
	// singleflight grouping, and 429 exponential back-off internally.
	for _, title := range titles {
		matchedMedia, fetchErr := cache.FetchOnce(ctx, title, providers, limiter)
		if fetchErr != nil {
			if scanLogger != nil {
				scanLogger.LogMediaFetcher(zerolog.WarnLevel).
					Str("module", "Enhanced").
					Str("title", title).
					Err(fetchErr).
					Msg("Provider fetch failed (non-retryable)")
			}
			continue
		}

		if matchedMedia != nil {
			if scanLogger != nil {
				scanLogger.LogMediaFetcher(zerolog.DebugLevel).
					Str("module", "Enhanced").
					Str("title", dto.GetTitleSafe(matchedMedia)).
					Msg("Resolved media (cache/provider)")
			}
			results = append(results, matchedMedia)
		} else {
			if scanLogger != nil {
				scanLogger.LogMediaFetcher(zerolog.WarnLevel).
					Str("module", "Enhanced").
					Str("title", title).
					Msg("Metadata fetch failed for " + title + ", falling back...")
			}
			results = append(results, GenerateLocalMetadata(title))
		}
	}

	return results, true
}

// errRateLimited is a sentinel returned by retryWithBackoff when all attempts
// were exhausted due to upstream rate-limiting (HTTP 429).
var errRateLimited = errors.New("upstream rate-limited (HTTP 429)")

// retryWithBackoff calls fn up to maxAttempts times.
// If fn returns an error whose message contains "429" it treats it as a
// rate-limit signal and waits an exponentially growing delay before retrying.
// Other errors are returned immediately without retrying.
func retryWithBackoff(ctx context.Context, maxAttempts int, fn func() error) error {
	delay := time.Second
	for attempt := 0; attempt < maxAttempts; attempt++ {
		err := fn()
		if err == nil {
			return nil
		}
		// Only retry on rate-limit signals; propagate other errors immediately.
		if !strings.Contains(err.Error(), "429") {
			return err
		}
		if attempt == maxAttempts-1 {
			return errRateLimited
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
			delay *= 2 // exponential: 1s → 2s → 4s
		}
	}
	return errRateLimited
}

// newMediaFetcherTMDB creates a MediaFetcher using TMDB + folder structure
// instead of AniList as the source of media candidates.
func newMediaFetcherTMDB(ctx context.Context, opts *MediaFetcherOptions) (*MediaFetcher, error) {
	mf := new(MediaFetcher)
	mf.ScanLogger = opts.ScanLogger

	opts.Logger.Info().Msg("media fetcher: Using TMDB mode with folder structure parsing")

	if mf.ScanLogger != nil {
		mf.ScanLogger.LogMediaFetcher(zerolog.InfoLevel).
			Msg("Creating media fetcher in TMDB mode")
	}

	// Group local files by their parent folder to get unique series.
	// For movie files directly in a category folder, each file gets its own entry.
	seriesMap := make(map[string]*FolderInfo) // folderPath (or filePath for movies) -> FolderInfo
	fileToFolder := make(map[string]string)   // filePath -> folderPath

	for _, lf := range opts.LocalFiles {
		info := ParseFolderStructure(lf.Path, opts.LibraryPaths)
		if info.SeriesName == "" {
			continue
		}

		if info.IsMovie {
			// Each movie file gets its own key so it's searched individually
			seriesMap[lf.Path] = info
			fileToFolder[lf.Path] = lf.Path
		} else {
			dir := filepath.Dir(lf.Path)
			if _, exists := seriesMap[dir]; !exists {
				seriesMap[dir] = info
			}
			fileToFolder[lf.Path] = dir
		}
	}

	// Deduplicate series names to avoid searching the same series multiple times
	uniqueSeries := make(map[string]*FolderInfo)
	for _, info := range seriesMap {
		key := info.SeriesName
		if info.ExplicitProvider != "" {
			key = fmt.Sprintf("%s [%s-%s]", key, info.ExplicitProvider, info.ExplicitID)
		} else if info.Year > 0 {
			key = fmt.Sprintf("%s (%d)", key, info.Year)
		}
		if _, exists := uniqueSeries[key]; !exists {
			uniqueSeries[key] = info
		}
	}

	if mf.ScanLogger != nil {
		mf.ScanLogger.LogMediaFetcher(zerolog.DebugLevel).
			Int("uniqueSeriesCount", len(uniqueSeries)).
			Msg("Parsed unique series from folder structure")
	}

	// Search TMDB for each unique series
	seenIds := make(map[int]bool)

	// Build provider map for strategy routing
	providerMap := make(map[string]librarymetadata.Provider)
	for _, p := range opts.MetadataProviders {
		providerMap[strings.ToLower(p.GetProviderID())] = p
	}

	for _, info := range uniqueSeries {
		query := info.SeriesName

		var results []*dto.NormalizedMedia
		var err error

		// 1. Explicit Routing
		if info.ExplicitProvider != "" {
			providerToUse, exists := providerMap[info.ExplicitProvider]
			// Fallback to TMDB for IMDB ids if IMDB has no separate provider
			if !exists && info.ExplicitProvider == "imdb" {
				providerToUse, exists = providerMap["tmdb"]
			}

			if exists {
				idStr := info.ExplicitID
				if info.ExplicitProvider == "imdb" && !strings.HasPrefix(idStr, "tt") {
					idStr = "tt" + idStr
				}
				var media *dto.NormalizedMedia
				media, err = providerToUse.GetMediaDetails(ctx, idStr)
				if err == nil && media != nil {
					media.ExplicitProvider = info.ExplicitProvider
					media.ExplicitID = info.ExplicitID
					results = []*dto.NormalizedMedia{media}
				}
			} else {
				err = fmt.Errorf("explicit provider not found: %s", info.ExplicitProvider)
			}
		}

		// 2. Default Behavior (TMDB First)
		if len(results) == 0 && err == nil {
			results, err = opts.TMDBProvider.SearchMedia(ctx, query)

			if err != nil || len(results) == 0 {
				// Fallback: for movies with compound titles like "Dragon Ball Z - La batalla",
				// try searching with just the series prefix (before " - ")
				if info.IsMovie {
					if idx := strings.Index(query, " - "); idx > 0 {
						prefix := strings.TrimSpace(query[:idx])
						opts.Logger.Debug().Str("originalQuery", query).Str("fallbackQuery", prefix).Msg("media fetcher: Retrying movie search with prefix")
						results, err = opts.TMDBProvider.SearchMedia(ctx, prefix)
					}
				}

				// 3. Fallback Mechanism (AniList)
				if len(results) == 0 {
					opts.Logger.Debug().Str("query", query).Msg("media fetcher: TMDB returned zero results, falling back to AniList provider")
					if alProvider, exists := providerMap["anilist"]; exists {
						results, err = alProvider.SearchMedia(ctx, query)
					}
				}
			}
		} else if err != nil {
			opts.Logger.Warn().Str("query", query).Str("explicitProvider", info.ExplicitProvider).Str("explicitId", info.ExplicitID).Err(err).Msg("media fetcher: Explicit provider search failed")
			// We continue so the fallback logic can trigger if results is still empty
		}

		if len(results) == 0 {
			opts.Logger.Warn().Str("query", query).Msg("media fetcher: Metadata fetch failed for " + query + ", falling back...")
			results = []*dto.NormalizedMedia{GenerateLocalMetadata(query)}
		}

		for _, media := range results {
			if seenIds[media.ID] {
				continue
			}

			// For movies with a known year, strongly prefer year-matched results
			if info.IsMovie && info.Year > 0 && media.Year != nil {
				if *media.Year != info.Year {
					continue // Skip year-mismatched movies
				}
			}

			mf.AllMedia = append(mf.AllMedia, media)
			seenIds[media.ID] = true
		}

		if mf.ScanLogger != nil {
			mf.ScanLogger.LogMediaFetcher(zerolog.DebugLevel).
				Str("series", info.SeriesName).
				Int("resultsCount", len(results)).
				Bool("isMovie", info.IsMovie).
				Msg("TMDB search completed for series")
		}
	}

	// In TMDB mode, ALL fetched media are considered part of the user's collection.
	// This prevents them from being flagged as "Unknown" / "Hidden Media".
	mf.CollectionMediaIds = make([]int, 0, len(mf.AllMedia))
	for _, media := range mf.AllMedia {
		mf.CollectionMediaIds = append(mf.CollectionMediaIds, media.ID)
	}

	if mf.ScanLogger != nil {
		mf.ScanLogger.LogMediaFetcher(zerolog.InfoLevel).
			Int("totalMediaCount", len(mf.AllMedia)).
			Msg("Finished TMDB media fetcher")
	}

	opts.Logger.Info().
		Int("totalMedia", len(mf.AllMedia)).
		Int("uniqueSeries", len(uniqueSeries)).
		Msg("media fetcher: TMDB mode completed")

	return mf, nil
}

// GenerateLocalMetadata creates a synthetic OrganizedMedia object when external
// providers fail to identify the series. This ensures the media still appears
// in the UI, allowing the user to match it manually later.
func GenerateLocalMetadata(title string) *dto.NormalizedMedia {
	// We generate a deterministic pseudo-ID to avoid collisions
	// We use the negative CRC32 of the title text so TMDB DB maps nicely.
	h := crc32.NewIEEE()
	h.Write([]byte(title))
	hash := int(h.Sum32())
	if hash > 0 {
		hash = -hash
	}

	posterURL := "/no-cover.png"
	metadataStatus := "MISSING_METADATA"
	synopsis := "Metadatos no encontrados. Nombre original: " + title

	return &dto.NormalizedMedia{
		ID:     hash,
		TmdbId: &hash, // Assign to tmdbId to allow TMDB pipeline to map it properly
		Title: &dto.NormalizedMediaTitle{
			English: &title,
			Romaji:  &title,
			Native:  &title,
		},
		Synonyms: nil,
		Format:   lo.ToPtr(dto.MediaFormatTV), // Assume TV mostly
		CoverImage: &dto.NormalizedMediaCoverImage{
			Large:      &posterURL,
			ExtraLarge: &posterURL,
			Medium:     &posterURL,
		},
		Status:         lo.ToPtr(dto.MediaStatusFinished),
		MetadataStatus: &metadataStatus,
		Episodes:       lo.ToPtr(1000), // Arbitrary high count
		Description:    &synopsis,      // Inject synthetic synopsis here
	}
}
