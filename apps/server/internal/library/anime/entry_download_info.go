package anime

import (
	"errors"
	"kamehouse/internal/api/metadata"
	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/database/models"
	"strconv"
	"time"
	"github.com/samber/lo"
	"github.com/sourcegraph/conc/pool"
)

type (
	// EntryDownloadInfo is instantiated by the Entry
	EntryDownloadInfo struct {
		EpisodesToDownload    []*EntryDownloadEpisode `json:"episodesToDownload"`
		CanBatch              bool                    `json:"canBatch"`
		BatchAll              bool                    `json:"batchAll"`
		HasInaccurateSchedule bool                    `json:"hasInaccurateSchedule"`
		Rewatch               bool                    `json:"rewatch"`
		AbsoluteOffset        int                     `json:"absoluteOffset"`
	}

	EntryDownloadEpisode struct {
		EpisodeNumber int      `json:"episodeNumber"`
		AniDBEpisode  string   `json:"aniDBEpisode"`
		Episode       *Episode `json:"episode"`
	}
)

type (
	NewEntryDownloadInfoOptions struct {
		// Media's local files
		LocalFiles          []*LocalFile
		AnimeMetadata       *metadata.AnimeMetadata
		Media               *models.LibraryMedia
		Progress            int
		Status              string
		MetadataProviderRef metadata_provider.Provider
	}
)

// NewEntryDownloadInfo returns a list of episodes to download or episodes for the torrent/debrid streaming views
// based on the options provided.
func NewEntryDownloadInfo(opts *NewEntryDownloadInfoOptions) (*EntryDownloadInfo, error) {



	if opts.Media.Status == "NOT_YET_RELEASED" {
		return &EntryDownloadInfo{}, nil
	}
	if opts.AnimeMetadata == nil {
		return nil, errors.New("could not get anime metadata")
	}
	currentEpisodeCount := 0
	if currentEpisodeCount == 0 && opts.AnimeMetadata != nil {
		currentEpisodeCount = opts.AnimeMetadata.GetCurrentEpisodeCount()
	}
	if currentEpisodeCount == -1 {
		return nil, errors.New("could not get current media episode count")
	}

	// +---------------------+
	// |     Discrepancy     |
	// +---------------------+

	// Whether the platform includes episode 0 as part of main episodes, but AniDB does not, however AniDB has "S1"
	discrepancy := FindDiscrepancy(opts.Media, opts.AnimeMetadata)

	// Platform is the source of truth for episode numbers
	epSlice := newEpisodeSlice(currentEpisodeCount)

	// Handle discrepancies
	if discrepancy != DiscrepancyNone {

		// If platform includes episode 0 as part of main episodes, but AniDB does not, however AniDB has "S1"
		if discrepancy == DiscrepancyPlatformCountsEpisodeZero {
			// Add "S1" to the beginning of the episode slice
			epSlice.trimEnd(1)
			epSlice.prepend(0, "S1")
		}

		// If platform includes specials, but AniDB does not
		if discrepancy == DiscrepancyPlatformCountsSpecials {
			diff := currentEpisodeCount - opts.AnimeMetadata.GetMainEpisodeCount()
			epSlice.trimEnd(diff)
			for i := 0; i < diff; i++ {
				epSlice.add(currentEpisodeCount-i, "S"+strconv.Itoa(i+1))
			}
		}

		// If AniDB has more episodes than the platform
		if discrepancy == DiscrepancyAniDBHasMore {
			// Do nothing
		}

	}

	// Filter out episodes not aired
	if opts.AnimeMetadata != nil {
		epSlice.filter(func(item *episodeSliceItem, index int) bool {
			epMeta, found := opts.AnimeMetadata.FindEpisode(item.aniDBEpisode)
			if !found {
				return true
			}
			if epMeta.AirDate == "" {
				return true
			}
			airDate, err := time.Parse("2006-01-02", epMeta.AirDate)
			if err != nil {
				return true
			}
			return airDate.Before(time.Now()) || airDate.Equal(time.Now())
		})
	}

	// Get progress, if the media isn't in the user's list, progress is 0
	// If the media is completed, set progress is 0
	progress := opts.Progress
	if opts.Status == "COMPLETED" {
		progress = 0
	}

	hasInaccurateSchedule := false
	if opts.Media.Status == "RELEASING" {
		hasInaccurateSchedule = true
	}

	// Filter out episodes already watched (index+1 is the progress number)
	toDownloadSlice := epSlice.filterNew(func(item *episodeSliceItem, index int) bool {
		return index+1 > progress
	})

	// This slice contains episode numbers that are not downloaded
	// The source of truth is AniDB, but we will handle discrepancies
	lfsEpSlice := newEpisodeSlice(0)
	if opts.LocalFiles != nil {
		// Get all episode numbers of main local files
		for _, lf := range opts.LocalFiles {
			if lf.Metadata.Type == LocalFileTypeMain {
				lfsEpSlice.add(lf.Metadata.Episode, lf.Metadata.AniDBEpisode)
			}
		}
	}

	// Filter out downloaded episodes
	toDownloadSlice.filter(func(item *episodeSliceItem, index int) bool {
		isDownloaded := false
		for _, lf := range opts.LocalFiles {
			if lf.Metadata.Type != LocalFileTypeMain {
				continue
			}
			// If the file episode number matches that of the episode slice item
			if lf.Metadata.Episode == item.episodeNumber {
				isDownloaded = true
			}
			// If the slice episode number is 0 and the file is a main S1
			if discrepancy == DiscrepancyPlatformCountsEpisodeZero && item.episodeNumber == 0 && lf.Metadata.AniDBEpisode == "S1" {
				isDownloaded = true
			}
		}

		return !isDownloaded
	})

	// +---------------------+
	// |   EntryEpisode      |
	// +---------------------+

	// Generate `episodesToDownload` based on `toDownloadSlice`

	// DEVNOTE: The EntryEpisode generated has inaccurate progress numbers since not local files are passed in

	mediaWrapper := opts.MetadataProviderRef.GetAnimeMetadataWrapper(nil, opts.AnimeMetadata)

	progressOffset := 0
	if discrepancy == DiscrepancyPlatformCountsEpisodeZero {
		progressOffset = 1
	}

	p := pool.NewWithResults[*EntryDownloadEpisode]()
	for _, ep := range toDownloadSlice.getSlice() {
		p.Go(func() *EntryDownloadEpisode {
			str := new(EntryDownloadEpisode)
			str.EpisodeNumber = ep.episodeNumber
			str.AniDBEpisode = ep.aniDBEpisode
			// Create a new episode with a placeholder local file
			// We pass that placeholder local file so that all episodes are hydrated as main episodes for consistency
			str.Episode = NewEpisode(&NewEpisodeOptions{
				MetadataWrapper: mediaWrapper,
				LocalFile: &LocalFile{
					ParsedData:       &LocalFileParsedData{},
					ParsedFolderData: []*LocalFileParsedData{},
					Metadata: &LocalFileMetadata{
						Episode:      ep.episodeNumber,
						Type:         LocalFileTypeMain,
						AniDBEpisode: ep.aniDBEpisode,
					},
				},
				OptionalAniDBEpisode: str.AniDBEpisode,
				AnimeMetadata:        opts.AnimeMetadata,
				Media:                opts.Media,
				ProgressOffset:       progressOffset,
				IsDownloaded:         false,
			})
			str.Episode.AniDBEpisode = ep.aniDBEpisode
			// Reset the local file to nil, since it's a placeholder
			str.Episode.LocalFile = nil
			return str
		})
	}
	episodesToDownload := p.Wait()

	//--------------

	canBatch := false
	if opts.Media.Status == "FINISHED" {
		canBatch = true
	}
	batchAll := false
	if canBatch && lfsEpSlice.len() == 0 && progress == 0 {
		batchAll = true
	}
	rewatch := false
	if opts.Status == "COMPLETED" {
		rewatch = true
	}

	downloadInfo := &EntryDownloadInfo{
		EpisodesToDownload:    episodesToDownload,
		CanBatch:              canBatch,
		BatchAll:              batchAll,
		Rewatch:               rewatch,
		HasInaccurateSchedule: hasInaccurateSchedule,
		AbsoluteOffset:        opts.AnimeMetadata.GetOffset(),
	}

	return downloadInfo, nil
}

type episodeSliceItem struct {
	episodeNumber int
	aniDBEpisode  string
}

type episodeSlice []*episodeSliceItem

func newEpisodeSlice(episodeCount int) *episodeSlice {
	s := make([]*episodeSliceItem, 0)
	for i := 0; i < episodeCount; i++ {
		s = append(s, &episodeSliceItem{episodeNumber: i + 1, aniDBEpisode: strconv.Itoa(i + 1)})
	}
	ret := &episodeSlice{}
	ret.set(s)
	return ret
}

func (s *episodeSlice) set(eps []*episodeSliceItem) {
	*s = eps
}

func (s *episodeSlice) add(episodeNumber int, aniDBEpisode string) {
	*s = append(*s, &episodeSliceItem{episodeNumber: episodeNumber, aniDBEpisode: aniDBEpisode})
}

func (s *episodeSlice) prepend(episodeNumber int, aniDBEpisode string) {
	*s = append([]*episodeSliceItem{{episodeNumber: episodeNumber, aniDBEpisode: aniDBEpisode}}, *s...)
}

func (s *episodeSlice) trimEnd(n int) {
	*s = (*s)[:len(*s)-n]
}

func (s *episodeSlice) len() int {
	return len(*s)
}

func (s *episodeSlice) filter(filter func(*episodeSliceItem, int) bool) {
	*s = lo.Filter(*s, filter)
}

func (s *episodeSlice) filterNew(filter func(*episodeSliceItem, int) bool) *episodeSlice {
	s2 := make(episodeSlice, 0)
	for i, item := range *s {
		if filter(item, i) {
			s2 = append(s2, item)
		}
	}
	return &s2
}

func (s *episodeSlice) getSlice() []*episodeSliceItem {
	return *s
}


