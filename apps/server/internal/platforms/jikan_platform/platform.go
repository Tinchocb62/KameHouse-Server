package jikan_platform

import (
	"context"

	"kamehouse/internal/api/jikan"
	"kamehouse/internal/platforms/platform"

	"github.com/rs/zerolog"
)

type Platform struct {
	jikanClient *jikan.Client
	username    string
	logger      *zerolog.Logger
}

func NewPlatform(logger *zerolog.Logger) *Platform {
	return &Platform{
		jikanClient: jikan.NewClient(logger),
		logger:      logger,
	}
}

func (p *Platform) SetUsername(username string) {
	p.username = username
}

func (p *Platform) SearchMedia(ctx context.Context, query string, page *int) (*platform.UnifiedMediaList, error) {
	pageNum := 1
	if page != nil {
		pageNum = *page
	}
	res, err := p.jikanClient.SearchAnimeAdvanced(ctx, query, pageNum, 20)
	if err != nil {
		return nil, err
	}

	out := &platform.UnifiedMediaList{
		Media: make([]*platform.UnifiedMedia, 0, len(res.Data)),
	}

	for _, malAnime := range res.Data {
		title := malAnime.TitleEng
		if title == "" {
			title = malAnime.Title
		}
		native := malAnime.TitleJpn
		poster := malAnime.Images.Jpg.LargeImageUrl
		synopsis := malAnime.Synopsis

		m := &platform.UnifiedMedia{
			ID:     malAnime.MalID,
			Type:   platform.MediaType("ANIME"),
			Format: platform.MediaFormatTv, // defaulting to TV
			Kind:   platform.MediaKindAnime,
			Title: &platform.MediaTitle{
				Romaji: &title,
				Native: &native,
			},
			CoverImage: &platform.MediaCoverImage{
				ExtraLarge: &poster,
				Large:      &poster,
			},
			Overview: &synopsis,
		}
		out.Media = append(out.Media, m)
	}

	return out, nil
}

func (p *Platform) GetAnime(ctx context.Context, mediaID int) (interface{}, error) {
	res, err := p.jikanClient.GetAnimeFull(ctx, mediaID)
	if err != nil {
		return nil, err
	}

	title := res.Data.TitleEng
	if title == "" {
		title = res.Data.Title
	}
	native := res.Data.TitleJpn
	poster := res.Data.Images.Jpg.LargeImageUrl
	synopsis := res.Data.Synopsis

	m := &platform.UnifiedMedia{
		ID:     res.Data.MalID,
		Type:   platform.MediaType("ANIME"),
		Format: platform.MediaFormatTv,
		Kind:   platform.MediaKindAnime,
		Title: &platform.MediaTitle{
			Romaji: &title,
			Native: &native,
		},
		CoverImage: &platform.MediaCoverImage{
			ExtraLarge: &poster,
			Large:      &poster,
		},
		Overview: &synopsis,
	}

	return m, nil
}

func (p *Platform) GetAnimeWithRelations(ctx context.Context, mediaID int) (interface{}, error) {
	return p.GetAnime(ctx, mediaID)
}
func (p *Platform) GetAnimeDetails(ctx context.Context, mediaID int) (interface{}, error) {
	return p.GetAnime(ctx, mediaID)
}
func (p *Platform) GetMovie(ctx context.Context, mediaID int) (interface{}, error) {
	return p.GetAnime(ctx, mediaID)
}

// NOT IMPLEMENTED METHODS
func (p *Platform) UpdateEntry(ctx context.Context, mediaID int, status interface{}, scoreRaw *int, progress *int, startedAt interface{}, completedAt interface{}) error {
	return nil
}
func (p *Platform) UpdateEntryProgress(ctx context.Context, mediaID int, progress int, totalEpisodes *int) error {
	return nil
}
func (p *Platform) UpdateEntryRepeat(ctx context.Context, mediaID int, repeat int) error { return nil }
func (p *Platform) DeleteEntry(ctx context.Context, mediaID int, entryID int) error      { return nil }
func (p *Platform) GetAnimeCollection(ctx context.Context, bypassCache bool) (interface{}, error) {
	return &platform.UnifiedCollection{}, nil
}
func (p *Platform) GetRawAnimeCollection(ctx context.Context, bypassCache bool) (interface{}, error) {
	return &platform.UnifiedCollection{}, nil
}
func (p *Platform) GetAnimeCollectionWithRelations(ctx context.Context) (interface{}, error) {
	return &platform.UnifiedCollection{}, nil
}
func (p *Platform) AddMediaToCollection(ctx context.Context, mIds []int) error { return nil }
func (p *Platform) GetStudioDetails(ctx context.Context, studioID int) (interface{}, error) {
	return nil, nil
}
func (p *Platform) RefreshAnimeCollection(ctx context.Context) (interface{}, error) { return nil, nil }
func (p *Platform) GetViewerStats(ctx context.Context) (interface{}, error)         { return nil, nil }
func (p *Platform) GetAnimeAiringSchedule(ctx context.Context) (interface{}, error) { return nil, nil }
func (p *Platform) ListAnime(ctx context.Context, page *int, search *string, perPage *int, sort []platform.MediaSort, status []platform.MediaStatus, genres []string, averageScoreGreater *int, season *platform.MediaSeason, seasonYear *int, format *platform.MediaFormat, isAdult *bool) (interface{}, error) {
	// Fallback to basic search if search is present, else return empty
	if search != nil {
		return p.SearchMedia(ctx, *search, page)
	}
	return &platform.UnifiedMediaList{}, nil
}
func (p *Platform) ListRecentAnime(ctx context.Context, page *int, perPage *int, airingAtGreater *int, airingAtLesser *int, notYetAired *bool) (interface{}, error) {
	return &platform.UnifiedMediaList{}, nil
}
func (p *Platform) ClearCache() {}
func (p *Platform) Close()      {}

var _ platform.Platform = (*Platform)(nil)
