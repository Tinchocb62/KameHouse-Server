package scanner

import (
	"context"
	"errors"

	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/library/anime"
	librarymetadata "kamehouse/internal/library/metadata"
	"kamehouse/internal/platforms/platform"
	"kamehouse/internal/util"
	"kamehouse/internal/util/limiter"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"

	"github.com/rs/zerolog"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

// MediaFetcher holds all media that will be used for the comparison process
type MediaFetcher struct {
	AllMedia           []*dto.NormalizedMedia
	CollectionMediaIds []int
	UnknownMediaIds    []int // Media IDs that are not in the user's collection
	ScanLogger         *ScanLogger
}

type MediaFetcherOptions struct {
	PlatformRef            platform.Platform
	MetadataProviderRef    metadata_provider.Provider
	MetadataProviders      []librarymetadata.Provider
	LocalFiles             []*dto.LocalFile
	Logger                 *zerolog.Logger
	DisableAnimeCollection bool
	ScanLogger             *ScanLogger
	// used for adding custom sources
	OptionalAnimeCollection interface{}
	// TMDB mode
	TMDBProvider *librarymetadata.TMDBProvider
	SeriesPaths  []string
	MoviePaths   []string
	Database     *db.Database
}

// NewMediaFetcher creates a MediaFetcher using TMDB + folder structure
func NewMediaFetcher(ctx context.Context, opts *MediaFetcherOptions) (ret *MediaFetcher, retErr error) {
	defer util.HandlePanicInModuleWithError("library/scanner/NewMediaFetcher", &retErr)

	if opts.LocalFiles == nil || opts.Logger == nil {
		return nil, errors.New("missing options")
	}

	return newMediaFetcherTMDB(ctx, opts)
}

//----------------------------------------------------------------------------------------------------------------------

// newMediaFetcherTMDB creates a MediaFetcher using TMDB + folder structure
func newMediaFetcherTMDB(ctx context.Context, opts *MediaFetcherOptions) (*MediaFetcher, error) {
	mf := new(MediaFetcher)
	mf.ScanLogger = opts.ScanLogger

	if mf.ScanLogger != nil {
		mf.ScanLogger.LogMediaFetcher(zerolog.InfoLevel).
			Msg("Creating media fetcher (TMDB mode)")
	}

	// 1. Fetch user's collection if available
	if !opts.DisableAnimeCollection && opts.PlatformRef != nil {
		collection, err := opts.PlatformRef.GetAnimeCollection(ctx, false)
		if err == nil && collection != nil {
			if c, ok := collection.(*platform.UnifiedCollection); ok {
				for _, list := range c.Lists {
					for _, entry := range list.Entries {
						if entry.Media != nil {
							norm := anime.NewNormalizedMedia(entry.Media)
							mf.AllMedia = append(mf.AllMedia, norm)
							mf.CollectionMediaIds = append(mf.CollectionMediaIds, norm.ID)
						}
					}
				}
			}
		}
	}

	// 2. Parse titles from local files using pure robust name parser
	// This prevents the bug where generic root library folders like "Series" or "Peliculas" break TMDB
	libPaths := append([]string{}, opts.SeriesPaths...)
	libPaths = append(libPaths, opts.MoviePaths...)

	groups := lo.GroupBy(opts.LocalFiles, func(lf *dto.LocalFile) string {
		pm := parsedMediaFromLocalFile(lf)
		if pm.Title != "" && !isGenericOrNumericTitle(pm.Title) {
			return pm.Title
		}

		if seriesTitle := lf.GetSeriesFolderTitle(); seriesTitle != "" {
			return seriesTitle
		}

		info := ParseFolderStructure(lf.Path, libPaths)
		if isMeaningfulFolderTitle(info.SeriesName) {
			return info.SeriesName
		}

		// Folder context is only a last resort and must be semantically useful.
		folderTitle := meaningfulImmediateFolderTitle(lf.Path)
		if !isGenericOrNumericTitle(folderTitle) {
			return folderTitle
		}
		return ""
	})

	var mu sync.Mutex
	eg, egCtx := errgroup.WithContext(ctx)
	eg.SetLimit(runtime.NumCPU() * 2)
	tmdbLimiter := limiter.NewTmdbLimiter()

	// 3. Initialize Metadata Cache (Persistent)
	metaCache := newMetadataFetchCache(opts.Database)

	// Pre-inject all Dragon Ball IDs from the resolver
	priorityIds := make(map[int]bool)
	for _, lf := range opts.LocalFiles {
		folderInfo := ParseFolderStructure(lf.Path, libPaths)
		parentDir := filepath.Base(filepath.Dir(lf.Path))
		seriesFolder := lf.GetSeriesFolderTitle()
		if seriesFolder == "" && folderInfo.SeriesName != "" {
			seriesFolder = folderInfo.SeriesName
		}
		pm := parsedMediaFromLocalFile(lf)

		var candidates []string
		if seriesFolder != "" && pm.EpisodeTitle != "" {
			candidates = append(candidates, seriesFolder+" "+pm.EpisodeTitle)
		}
		if pm.Title != "" && pm.EpisodeTitle != "" {
			candidates = append(candidates, pm.Title+" "+pm.EpisodeTitle)
		}
		if seriesFolder != "" && lf.Name != "" {
			candidates = append(candidates, seriesFolder+" "+lf.Name)
		}
		if parentDir != "" && lf.Name != "" {
			candidates = append(candidates, parentDir+" "+lf.Name)
		}
		if folderInfo.SeriesName != "" && lf.Name != "" {
			candidates = append(candidates, folderInfo.SeriesName+" "+lf.Name)
		}
		if pm.EpisodeTitle != "" {
			candidates = append(candidates, pm.EpisodeTitle)
		}
		if lf.Name != "" {
			candidates = append(candidates, lf.Name)
		}
		if pm.Title != "" {
			candidates = append(candidates, pm.Title)
		}
		if seriesFolder != "" {
			candidates = append(candidates, seriesFolder)
		}
		if folderInfo.SeriesName != "" {
			candidates = append(candidates, folderInfo.SeriesName)
		}

		for _, cand := range candidates {
			if cand == "" {
				continue
			}
			if dbId, isMovie, isDb := ResolveDragonBallID(cand); isDb {
				if isMovie {
					priorityIds[dbId+1000000] = true
				} else {
					priorityIds[dbId] = true
				}
				break
			}
		}
	}

	if len(priorityIds) > 0 {
		for dbId := range priorityIds {
			id := dbId
			eg.Go(func() error {
				mu.Lock()
				exists := lo.SomeBy(mf.AllMedia, func(m *dto.NormalizedMedia) bool { return m.ID == id })
				mu.Unlock()
				if exists {
					return nil
				}

				var result *dto.NormalizedMedia
				var err error

				// 1. Query TMDB Provider API if active
				if opts.TMDBProvider != nil {
					_ = tmdbLimiter.Wait(egCtx)
					result, err = opts.TMDBProvider.GetMediaDetails(egCtx, strconv.Itoa(id))
				}

				// 2. Query AniList / Jikan / Anime metadata provider API if TMDB was not used or failed
				if (err != nil || result == nil) && len(opts.MetadataProviders) > 0 {
					for _, p := range opts.MetadataProviders {
						if p == nil {
							continue
						}
						if p.GetProviderID() == "anilist" {
							aniMap := map[int]int{
								12609:  223,    // Dragon Ball
								12971:  813,    // Dragon Ball Z
								12697:  225,    // Dragon Ball GT
								61709:  6033,   // Dragon Ball Kai
								42705:  6033,   // Dragon Ball Kai
								62715:  21175,  // Dragon Ball Super
								236994: 169623, // Dragon Ball Daima
								// Classic DB Movies
								39144: 522, 1039144: 522, // Curse of the Blood Rubies
								39145: 523, 1039145: 523, // Sleeping Princess
								116776: 524, 1116776: 524, // Mystical Adventure
								39148: 525, 1039148: 525, // Path to Power
								// DBZ Movies & Specials
								28609: 894, 1028609: 894, // Dead Zone
								39100: 895, 1039100: 895, // World's Strongest
								39101: 896, 1039101: 896, // Tree of Might
								39102: 897, 1039102: 897, // Lord Slug
								24752: 898, 1024752: 898, // Cooler's Revenge
								39103: 899, 1039103: 899, // Return of Cooler
								39104: 900, 1039104: 900, // Super Android 13
								34433: 901, 1034433: 901, // Broly The Legendary Super Saiyan
								39105: 902, 1039105: 902, // Bojack Unbound
								44251: 903, 1044251: 903, // Broly Second Coming
								39106: 904, 1039106: 904, // Bio-Broly
								39107: 905, 1039107: 905, // Fusion Reborn
								39108: 906, 1039108: 906, // Wrath of the Dragon
								126963: 14913, 1126963: 14913, // Battle of Gods
								303857: 20792, 1303857: 20792, // Resurrection 'F'
								503314: 101302, 1503314: 101302, // DBS: Broly
								610150: 134448, 1610150: 134448, // DBS: Super Hero
								39323: 984, 1039323: 984, // Bardock Father of Goku
								39324: 985, 1039324: 985, // History of Trunks
								18095: 986, 1018095: 986, // GT Hero's Legacy
								38594: 5383, 1038594: 5383, // Yo! Son Goku
								120475: 12231, 1120475: 12231, // Episode of Bardock
								55127: 987, 1055127: 987, // Plan to Eradicate
							}
							if aniId, ok := aniMap[id]; ok {
								if r, aErr := p.GetMediaDetails(egCtx, strconv.Itoa(aniId)); aErr == nil && r != nil {
									r.ID = id
									tmdbIdVal := id
									if id >= 1_000_000 {
										tmdbIdVal = id - 1_000_000
									}
									r.TmdbID = &tmdbIdVal
									result = r
									err = nil
									break
								}
							}
						} else if p.GetProviderID() == "jikan" {
							malMap := map[int]int{
								12609:  223,   // Dragon Ball
								12971:  813,   // Dragon Ball Z
								12697:  225,   // Dragon Ball GT
								61709:  6033,  // Dragon Ball Kai
								42705:  6033,  // Dragon Ball Kai
								62715:  30694, // Dragon Ball Super
								236994: 56884, // Dragon Ball Daima
								// Classic DB Movies
								39144: 522, 1039144: 522,
								39145: 523, 1039145: 523,
								116776: 524, 1116776: 524,
								39148: 525, 1039148: 525,
								// DBZ Movies
								28609: 894, 1028609: 894,
								39100: 895, 1039100: 895,
								39101: 896, 1039101: 896,
								39102: 897, 1039102: 897,
								24752: 898, 1024752: 898,
								39103: 899, 1039103: 899,
								39104: 900, 1039104: 900,
								34433: 901, 1034433: 901,
								39105: 902, 1039105: 902,
								44251: 903, 1044251: 903,
								39106: 904, 1039106: 904,
								39107: 905, 1039107: 905,
								39108: 906, 1039108: 906,
								126963: 14913, 1126963: 14913,
								303857: 20792, 1303857: 20792,
								503314: 36946, 1503314: 36946,
								610150: 48903, 1610150: 48903,
								39323: 984, 1039323: 984,
								39324: 985, 1039324: 985,
								18095: 986, 1018095: 986,
								38594: 5383, 1038594: 5383,
								120475: 12231, 1120475: 12231,
								55127: 987, 1055127: 987,
							}
							if malId, ok := malMap[id]; ok {
								if r, jErr := p.GetMediaDetails(egCtx, strconv.Itoa(malId)); jErr == nil && r != nil {
									r.ID = id
									tmdbIdVal := id
									if id >= 1_000_000 {
										tmdbIdVal = id - 1_000_000
									}
									r.TmdbID = &tmdbIdVal
									result = r
									err = nil
									break
								}
							}
						} else {
							if r, pErr := p.GetMediaDetails(egCtx, strconv.Itoa(id)); pErr == nil && r != nil {
								result = r
								err = nil
								break
							}
						}
					}
				}

				// 3. Fallback to prehydration only when offline or APIs are completely unreachable
				if err != nil || result == nil {
					result = CreatePrehydratedDragonBallMedia(id)
				}

				mu.Lock()
				defer mu.Unlock()
				if result != nil {
					mf.AllMedia = append(mf.AllMedia, result)
				}
				return nil
			})
		}
	}

	for title, files := range groups {
		titleGroup := title
		groupFiles := files
		eg.Go(func() error {
			if titleGroup == "" {
				return nil
			}
			lowerGroup := strings.ToLower(titleGroup)
			if lowerGroup == "series" || lowerGroup == "peliculas" || lowerGroup == "películas" || lowerGroup == "movies" || lowerGroup == "anime" || lowerGroup == "tv" || lowerGroup == "tv shows" || lowerGroup == "films" {
				return nil
			}

			// Determine type hint based on file paths
			var hint string
			if len(groupFiles) > 0 {
				nfp := filepath.ToSlash(filepath.Clean(groupFiles[0].Path))
				for _, rp := range opts.SeriesPaths {
					if rp == "" {
						continue
					}
					nrp := filepath.ToSlash(filepath.Clean(rp))
					if !strings.HasSuffix(nrp, "/") {
						nrp += "/"
					}
					if strings.HasPrefix(nfp, nrp) {
						hint = "series"
						break
					}
				}
				if hint == "" {
					for _, rp := range opts.MoviePaths {
						if rp == "" {
							continue
						}
						nrp := filepath.ToSlash(filepath.Clean(rp))
						if !strings.HasSuffix(nrp, "/") {
							nrp += "/"
						}
						if strings.HasPrefix(nfp, nrp) {
							hint = "movie"
							break
						}
					}
				}
				if hint == "" {
					info := ParseFolderStructure(groupFiles[0].Path, libPaths)
					if info.IsMovie {
						hint = "movie"
					}
				}
			}

			// ── Persistent Cache + Provider Fetch ────────────────────────────────
			result, err := metaCache.FetchOnce(egCtx, titleGroup, opts.MetadataProviders, tmdbLimiter, hint)
			if err != nil {
				if mf.ScanLogger != nil {
					mf.ScanLogger.LogMediaFetcher(zerolog.WarnLevel).
						Str("title", titleGroup).
						Err(err).
						Msg("Failed to fetch metadata for title group")
				}
				return nil
			}

			if result != nil {
				mu.Lock()
				mf.AllMedia = append(mf.AllMedia, result)
				mf.UnknownMediaIds = append(mf.UnknownMediaIds, result.ID)
				mu.Unlock()
			}

			return nil
		})
	}

	_ = eg.Wait()

	return mf, nil
}

func (mf *MediaFetcher) GetCollectionMediaIds() []int {
	return mf.CollectionMediaIds
}
