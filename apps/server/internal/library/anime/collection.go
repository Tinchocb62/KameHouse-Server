package anime

import (
	"cmp"
	"context"
	"encoding/json"
	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/platforms/platform"
	"kamehouse/internal/util"
	"path/filepath"
	"slices"
	"sort"
	"strings"

	"github.com/samber/lo"
	lop "github.com/samber/lo/parallel"
	"github.com/sourcegraph/conc/pool"
)

type (
	// LibraryCollection holds the main data for the library collection.
	// It consists of:
	//  - ContinueWatchingList: a list of Episode for the "continue watching" feature.
	//  - Lists: a list of LibraryCollectionList (one for each status).
	//  - UnmatchedLocalFiles: a list of unmatched local files (Media id == 0). "Resolve unmatched" feature.
	//  - UnmatchedGroups: a list of UnmatchedGroup instances. Like UnmatchedLocalFiles, but grouped by directory. "Resolve unmatched" feature.
	//  - IgnoredLocalFiles: a list of ignored local files. (DEVNOTE: Unused for now)
	//  - UnknownGroups: a list of UnknownGroup instances. Group of files whose media is not in the user's platform collection. "Resolve unknown media" feature.
	LibraryCollection struct {
		ContinueWatchingList []*Episode               `json:"continueWatchingList"`
		Lists                []*LibraryCollectionList `json:"lists"`
		UnmatchedLocalFiles  []*LocalFile             `json:"unmatchedLocalFiles"`
		UnmatchedGroups      []*UnmatchedGroup        `json:"unmatchedGroups"`
		IgnoredLocalFiles    []*LocalFile             `json:"ignoredLocalFiles"`
		UnknownGroups        []*UnknownGroup          `json:"unknownGroups"`
		Stats                *LibraryCollectionStats  `json:"stats"`
		Stream               *StreamCollection        `json:"stream,omitempty"` // Hydrated by the route handler
	}

	StreamCollection struct {
		ContinueWatchingList []*Episode             `json:"continueWatchingList"`
		Anime                []*models.LibraryMedia `json:"anime"`
		ListData             map[int]*EntryListData `json:"listData"`
	}

	LibraryCollectionListType string

	LibraryCollectionStats struct {
		TotalEntries  int    `json:"totalEntries"`
		TotalFiles    int    `json:"totalFiles"`
		TotalShows    int    `json:"totalShows"`
		TotalMovies   int    `json:"totalMovies"`
		TotalSpecials int    `json:"totalSpecials"`
		TotalSize     string `json:"totalSize"`
	}

	LibraryCollectionList struct {
		Type    string                    `json:"type"`
		Status  string                    `json:"status"`
		Entries []*LibraryCollectionEntry `json:"entries"`
	}

	// LibraryCollectionEntry holds the data for a single entry in a LibraryCollectionList.
	// It is a slimmed down version of Entry. It holds the media, media id, library data, and list data.
	LibraryCollectionEntry struct {
		Media                  *models.LibraryMedia    `json:"media"`
		MediaID                int                     `json:"mediaId"`
		Episode                *models.LibraryEpisode  `json:"episode,omitempty"` // For episode-specific swimlanes
		AvailabilityType       string                  `json:"availabilityType"`            // FULL_LOCAL, HYBRID, ONLY_ONLINE
		EntryLibraryData       *EntryLibraryData       `json:"libraryData"`  // Library data
		EntryListData          *EntryListData          `json:"listData"`     // Local list data
		Vibes                  []string                `json:"vibes"`        // Emotional or thematic tags
		Tags                   []string                `json:"tags"`         // AI-derived intelligence tags
		DominantVibe           string                  `json:"dominantVibe"` // Primary AI-derived vibe
	}

	// UnmatchedGroup holds the data for a group of unmatched local files.
	UnmatchedGroup struct {
		Dir         string                 `json:"dir"`
		LocalFiles  []*LocalFile           `json:"localFiles"`
		Suggestions []*models.LibraryMedia `json:"suggestions"`
	}
	// UnknownGroup holds the data for a group of local files whose media is not in the user's platform collection.
	// The client will use this data to suggest media to the user, so they can add it to their platform collection.
	UnknownGroup struct {
		MediaID    int          `json:"mediaId"`
		LocalFiles []*LocalFile `json:"localFiles"`
	}
)

type (
	// NewLibraryCollectionOptions is a struct that holds the data needed for creating a new LibraryCollection.
	NewLibraryCollectionOptions struct {
		Database            *db.Database
		LocalFiles          []*LocalFile
		PlatformRef         platform.Platform
		MetadataProviderRef metadata_provider.Provider
	}
)

// NewLibraryCollection creates a new LibraryCollection.
func NewLibraryCollection(ctx context.Context, opts *NewLibraryCollectionOptions) (lc *LibraryCollection, err error) {
	defer util.HandlePanicInModuleWithError("entities/collection/NewLibraryCollection", &err)
	lc = new(LibraryCollection)


	// Create lists using local SQLite DB
	lc.hydrateCollectionLists(opts)

	lc.hydrateStats(opts.LocalFiles)

	// Add Continue Watching list
	lc.hydrateContinueWatchingList(
		ctx,
		opts.LocalFiles,
		opts.Database,
		opts.PlatformRef,
		opts.MetadataProviderRef,
	)

	lc.UnmatchedLocalFiles = lo.Filter(opts.LocalFiles, func(lf *LocalFile, index int) bool {
		return lf.MediaID == 0 && !lf.Ignored
	})

	lc.IgnoredLocalFiles = lo.Filter(opts.LocalFiles, func(lf *LocalFile, index int) bool {
		return lf.Ignored
	})

	slices.SortStableFunc(lc.IgnoredLocalFiles, func(i, j *LocalFile) int {
		return cmp.Compare(i.GetPath(), j.GetPath())
	})

	lc.hydrateUnmatchedGroups()


	return
}

//----------------------------------------------------------------------------------------------------------------------

func (lc *LibraryCollection) hydrateCollectionLists(
	opts *NewLibraryCollectionOptions,
) {
	localFiles := opts.LocalFiles
	dbInfo := opts.Database

	// DEBUG: Log local files count
	if len(localFiles) == 0 {
		opts.Database.Logger.Warn().Msg("anime/collection: No local files found in database!")
	}

	// Group local files by media id
	groupedLfs := GroupLocalFilesByMediaID(localFiles)
	// Get slice of media ids from local files
	mIds := GetMediaIdsFromLocalFiles(localFiles)

	// DEBUG: Log media IDs count
	if len(mIds) == 0 {
		opts.Database.Logger.Warn().Msg("anime/collection: No media IDs found from local files!")
	}

	// Build a mapping from MediaID â†’ LibraryMediaId using local files.
	// This is needed because for TMDB media, the DB primary key
	// (LibraryMediaId) might differ from the external MediaID.
	mediaIdToLibraryMediaId := make(map[int]uint)
	for _, lf := range localFiles {
		if lf.MediaID != 0 && lf.LibraryMediaId != 0 {
			if _, exists := mediaIdToLibraryMediaId[lf.MediaID]; !exists {
				mediaIdToLibraryMediaId[lf.MediaID] = lf.LibraryMediaId
			}
		}
	}

	mediaMap := make(map[int]*models.LibraryMedia)
	listDataMap := make(map[int]*models.MediaEntryListData)

	for _, id := range mIds {
		if id == 0 {
			continue
		}

		var media *models.LibraryMedia
		var listData *models.MediaEntryListData
		var lookupId uint

		// 1. First, try looking up by MediaID directly.
		// If id >= 1_000_000, it's a TMDB movie ID with offset.
		// We should look it up by the tmdb_id column.
		if id >= 1_000_000 {
			m, err := db.GetLibraryMediaByTmdbIdAndType(dbInfo, id-1_000_000, "MOVIE")
			if err == nil && m != nil {
				media = m
				lookupId = m.ID
			} else {
				m, err = db.GetLibraryMediaByTmdbIdAndType(dbInfo, id-1_000_000, "SHOW")
				if err == nil && m != nil {
					media = m
					lookupId = m.ID
				}
			}
		} else if id > 0 {
			// Try as a direct primary key (common for AniList or existing entries)
			m, err := db.GetLibraryMediaByID(dbInfo, uint(id))
			if err == nil && m != nil {
				media = m
				lookupId = uint(id)
			}
		}

		// 2. If not found by direct lookup, try using the LibraryMediaId association 
		// from local files (the "explicit" link created by the scanner)
		if media == nil {
			if libMediaId, ok := mediaIdToLibraryMediaId[id]; ok && libMediaId > 0 {
				m, err := db.GetLibraryMediaByID(dbInfo, libMediaId)
				if err == nil && m != nil {
					media = m
					lookupId = libMediaId
				}
			}
		}

		// 3. Fallback: If it's a positive ID but not >= 1M, it might STILL be a TMDB ID
		// stored in the tmdb_id column instead of being the primary key.
		if media == nil && id > 0 && id < 1_000_000 {
			m, err := db.GetLibraryMediaByTmdbIdAndType(dbInfo, id, "SHOW")
			if err == nil && m != nil {
				media = m
				lookupId = m.ID
			} else {
				m, err = db.GetLibraryMediaByTmdbIdAndType(dbInfo, id, "MOVIE")
				if err == nil && m != nil {
					media = m
					lookupId = m.ID
				}
			}
		}

		if media != nil {
			mediaMap[id] = media
		} else {
			opts.Database.Logger.Debug().Int("mediaID", id).Msg("anime/collection: Failed to hydrate media entry")
		}

		// Look up list data using the same ID that successfully found the media
		if lookupId > 0 {
			ld, err := db.GetMediaEntryListData(dbInfo, lookupId)
			if err == nil && ld != nil {
				listData = ld
			}
		}

		if listData != nil {
			listDataMap[id] = listData
		} else {
			// fallback
			listDataMap[id] = &models.MediaEntryListData{
				Status: "PLANNING",
			}
		}
	}

	statusGroups := make(map[string][]*LibraryCollectionEntry)

	// DEBUG: Log found media count
	if len(mediaMap) == 0 {
		opts.Database.Logger.Warn().Int("mIdsCount", len(mIds)).Msg("anime/collection: No media found in database for media IDs!")
	} else {
		opts.Database.Logger.Debug().Int("mediaCount", len(mediaMap)).Int("mIdsCount", len(mIds)).Msg("anime/collection: Found media in database")
	}

	for _, id := range mIds {
		if id == 0 {
			continue
		}
		media, ok := mediaMap[id]
		if !ok {
			continue
		}

		entryLfs := groupedLfs[id]
		listData := listDataMap[id]
		status := listData.Status
		if status == "" || status == "REPEATING" {
			status = "CURRENT" // map REPEATING or empty to CURRENT
		}

		libraryData, _ := NewEntryLibraryData(&NewEntryLibraryDataOptions{
			EntryLocalFiles: entryLfs,
			MediaID:         id,
			CurrentProgress: listData.Progress,
		})

		availabilityType := "ONLY_ONLINE"
		if libraryData != nil && libraryData.MainFileCount > 0 {
			if media.TotalEpisodes > 0 && libraryData.MainFileCount >= media.TotalEpisodes {
				availabilityType = "FULL_LOCAL"
			} else {
				availabilityType = "HYBRID"
			}
		}

		lce := &LibraryCollectionEntry{
			MediaID:          id,
			Media:            media,
			AvailabilityType: availabilityType,
			EntryLibraryData: libraryData,
			EntryListData: &EntryListData{
				Progress:    listData.Progress,
				Score:       listData.Score,
				Status:      status,
				Repeat:      listData.Repeat,
				StartedAt:   listData.StartedAt,
				CompletedAt: listData.CompletedAt,
			},
			DominantVibe: media.DominantVibe,
		}

		if media.Tags != nil {
			_ = json.Unmarshal(media.Tags, &lce.Tags)
		}

		lce.DeriveVibes()

		statusGroups[status] = append(statusGroups[status], lce)
	}

	lists := make([]*LibraryCollectionList, 0)
	for status, entries := range statusGroups {
		sort.Slice(entries, func(i, j int) bool {
			return entries[i].Media.TitleRomaji < entries[j].Media.TitleRomaji
		})

		lists = append(lists, &LibraryCollectionList{
			Type:    status,
			Status:  status,
			Entries: entries,
		})
	}

	lc.Lists = lists

	if lc.Lists == nil {
		lc.Lists = make([]*LibraryCollectionList, 0)
	}

	// +---------------------+
	// |  Unknown media ids  |
	// +---------------------+

	unknownIds := make([]int, 0)
	for _, id := range mIds {
		if id != 0 && mediaMap[id] == nil {
			unknownIds = append(unknownIds, id)
		}
	}

	lc.UnknownGroups = make([]*UnknownGroup, 0)
	for _, id := range unknownIds {
		lc.UnknownGroups = append(lc.UnknownGroups, &UnknownGroup{
			MediaID:    id,
			LocalFiles: groupedLfs[id],
		})
	}
}

//----------------------------------------------------------------------------------------------------------------------

func (lc *LibraryCollection) hydrateStats(lfs []*LocalFile) {
	stats := &LibraryCollectionStats{
		TotalFiles:    len(lfs),
		TotalEntries:  0,
		TotalShows:    0,
		TotalMovies:   0,
		TotalSpecials: 0,
		TotalSize:     "", // Will be set by the route handler
	}

	for _, list := range lc.Lists {
		for _, entry := range list.Entries {
			stats.TotalEntries++
			if entry.Media.Format != "" {
				switch entry.Media.Format {
				case "MOVIE":
					stats.TotalMovies++
				case "SPECIAL", "OVA":
					stats.TotalSpecials++
				default:
					stats.TotalShows++
				}
			}
		}
	}

	lc.Stats = stats
}

//----------------------------------------------------------------------------------------------------------------------

// hydrateContinueWatchingList creates a list of Episode for the "continue watching" feature.
// This should be called after the LibraryCollectionList's have been created.
func (lc *LibraryCollection) hydrateContinueWatchingList(
	ctx context.Context,
	localFiles []*LocalFile,
	database *db.Database,
	platformRef platform.Platform,
	metadataProviderRef metadata_provider.Provider,
) {

	// Get currently watching list
	current, found := lo.Find(lc.Lists, func(item *LibraryCollectionList) bool {
		return item.Status == "CURRENT"
	})

	// If no currently watching list is found, return an empty slice
	if !found {
		lc.ContinueWatchingList = make([]*Episode, 0) // Set empty slice
		return
	}

	// Get media ids from current list
	mIds := make([]int, len(current.Entries))
	for i, entry := range current.Entries {
		mIds[i] = entry.MediaID
	}

	// Create a new Entry for each media id
	mEntryPool := pool.NewWithResults[*Entry]()
	for _, mID := range mIds {
		mEntryPool.Go(func() *Entry {
			me, _ := NewEntry(ctx, &NewEntryOptions{
				MediaID:             mID,
				LocalFiles:          localFiles,
				Database:            database,
				PlatformRef:         platformRef,
				MetadataProviderRef: metadataProviderRef,
			})
			return me
		})
	}
	mEntries := mEntryPool.Wait()
	mEntries = lo.Filter(mEntries, func(item *Entry, index int) bool {
		return item != nil
	}) // Filter out nil entries

	// If there are no entries, return an empty slice
	if len(mEntries) == 0 {
		lc.ContinueWatchingList = make([]*Episode, 0) // Return empty slice
		return
	}

	// Sort by progress
	sort.Slice(mEntries, func(i, j int) bool {
		return mEntries[i].EntryListData.Progress > mEntries[j].EntryListData.Progress
	})

	// Remove entries the user has watched all episodes of
	mEntries = lop.Map(mEntries, func(mEntry *Entry, index int) *Entry {
		if !mEntry.HasWatchedAll() {
			return mEntry
		}
		return nil
	})
	mEntries = lo.Filter(mEntries, func(item *Entry, index int) bool {
		return item != nil
	})

	// Get the next episode for each media entry
	mEpisodes := lop.Map(mEntries, func(mEntry *Entry, index int) *Episode {
		ep, ok := mEntry.FindNextEpisode()
		if ok {
			return ep
		}
		return nil
	})
	mEpisodes = lo.Filter(mEpisodes, func(item *Episode, index int) bool {
		return item != nil
	})

	lc.ContinueWatchingList = mEpisodes
}

//----------------------------------------------------------------------------------------------------------------------

// hydrateUnmatchedGroups is a method of the LibraryCollection struct.
// It is responsible for grouping unmatched local files by their directory and creating UnmatchedGroup instances for each group.
func (lc *LibraryCollection) hydrateUnmatchedGroups() {

	groups := make([]*UnmatchedGroup, 0)

	// Group by directory
	groupedLfs := lop.GroupBy(lc.UnmatchedLocalFiles, func(lf *LocalFile) string {
		return filepath.Dir(lf.GetPath())
	})

	for key, value := range groupedLfs {
		groups = append(groups, &UnmatchedGroup{
			Dir:         key,
			LocalFiles:  value,
			Suggestions: make([]*models.LibraryMedia, 0),
		})
	}

	slices.SortStableFunc(groups, func(i, j *UnmatchedGroup) int {
		return cmp.Compare(i.Dir, j.Dir)
	})

	// Assign the created groups
	lc.UnmatchedGroups = groups
}

func (e *LibraryCollectionEntry) DeriveVibes() {
	vibes := make([]string, 0)
	if e.Media == nil {
		return
	}

	// 1. AI-derived dominant vibe (highest priority)
	if e.Media.DominantVibe != "" {
		vibes = append(vibes, strings.ToUpper(e.Media.DominantVibe))
	}

	// 2. Epic vibe based on score
	if e.Media.Score >= 8.5 || e.Media.Score >= 85 {
		if !slices.Contains(vibes, "EPIC") {
			vibes = append(vibes, "EPIC")
		}
	}

	var genres []string
	_ = json.Unmarshal(e.Media.Genres, &genres)

	// 3. Chill vibe
	isChill := false
	for _, g := range genres {
		gl := strings.ToLower(g)
		if gl == "slice of life" || gl == "music" || gl == "healing" || gl == "comedy" {
			isChill = true
			break
		}
	}
	if isChill {
		if !slices.Contains(vibes, "CHILL") {
			vibes = append(vibes, "CHILL")
		}
	}

	// 4. Emotional vibe
	isEmotional := false
	for _, g := range genres {
		gl := strings.ToLower(g)
		if gl == "drama" || gl == "romance" || gl == "tearjerker" {
			isEmotional = true
			break
		}
	}
	if isEmotional {
		if !slices.Contains(vibes, "EMOTIONAL") {
			vibes = append(vibes, "EMOTIONAL")
		}
	}

	// 5. Hyped vibe
	isHyped := false
	for _, g := range genres {
		gl := strings.ToLower(g)
		if gl == "action" || gl == "sports" || gl == "shounen" || gl == "adventure" {
			isHyped = true
			break
		}
	}
	if isHyped {
		if !slices.Contains(vibes, "HYPED") {
			vibes = append(vibes, "HYPED")
		}
	}

	// 6. Intense vibe
	isIntense := false
	for _, g := range genres {
		gl := strings.ToLower(g)
		if gl == "horror" || gl == "psychological" || gl == "thriller" || gl == "dark fantasy" {
			isIntense = true
			break
		}
	}
	if isIntense {
		if !slices.Contains(vibes, "INTENSE") {
			vibes = append(vibes, "INTENSE")
		}
	}

	// 7. Map custom AI vibes to standard ones if needed
	// Example: "TensiÃ³n Absoluta" -> "INTENSE"
	for i, v := range vibes {
		switch v {
		case "TENSIÃ“N ABSOLUTA":
			vibes[i] = "INTENSE"
		case "EMOCIÃ“N PURA":
			vibes[i] = "EMOTIONAL"
		case "RELAJADO":
			vibes[i] = "CHILL"
		case "AVENTURA":
			vibes[i] = "HYPED"
		}
	}

	// Remove duplicates and empty strings
	vibes = lo.Uniq(vibes)
	vibes = lo.Filter(vibes, func(v string, _ int) bool { return v != "" })

	e.Vibes = vibes
}

