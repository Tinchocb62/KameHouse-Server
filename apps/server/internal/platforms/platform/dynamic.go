package platform

import (
	"context"
	"sync/atomic"
)

type platformWrapper struct {
	Platform Platform
}

// DynamicPlatform implementa Platform y redirige atómicamente entre una
// plataforma online y una offline. Reemplaza el uso de *util.Ref[Platform].
type DynamicPlatform struct {
	current atomic.Value // platformWrapper
}

// NewDynamicPlatform crea un DynamicPlatform con la plataforma inicial dada.
func NewDynamicPlatform(initial Platform) *DynamicPlatform {
	p := &DynamicPlatform{}
	p.current.Store(platformWrapper{Platform: initial})
	return p
}

// SetPlatform intercambia atómicamente la plataforma activa.
func (p *DynamicPlatform) SetPlatform(plat Platform) {
	p.current.Store(platformWrapper{Platform: plat})
}

// GetPlatform devuelve la plataforma activa.
func (p *DynamicPlatform) GetPlatform() Platform {
	val := p.current.Load()
	if val == nil {
		return nil
	}
	return val.(platformWrapper).Platform
}

func (p *DynamicPlatform) SetUsername(username string) {
	p.GetPlatform().SetUsername(username)
}

func (p *DynamicPlatform) UpdateEntry(ctx context.Context, mediaID int, status interface{}, scoreRaw *int, progress *int, startedAt interface{}, completedAt interface{}) error {
	return p.GetPlatform().UpdateEntry(ctx, mediaID, status, scoreRaw, progress, startedAt, completedAt)
}

func (p *DynamicPlatform) UpdateEntryProgress(ctx context.Context, mediaID int, progress int, totalEpisodes *int) error {
	return p.GetPlatform().UpdateEntryProgress(ctx, mediaID, progress, totalEpisodes)
}

func (p *DynamicPlatform) UpdateEntryRepeat(ctx context.Context, mediaID int, repeat int) error {
	return p.GetPlatform().UpdateEntryRepeat(ctx, mediaID, repeat)
}

func (p *DynamicPlatform) DeleteEntry(ctx context.Context, mediaID int, entryID int) error {
	return p.GetPlatform().DeleteEntry(ctx, mediaID, entryID)
}

func (p *DynamicPlatform) GetAnime(ctx context.Context, mediaID int) (interface{}, error) {
	return p.GetPlatform().GetAnime(ctx, mediaID)
}

func (p *DynamicPlatform) GetAnimeWithRelations(ctx context.Context, mediaID int) (interface{}, error) {
	return p.GetPlatform().GetAnimeWithRelations(ctx, mediaID)
}

func (p *DynamicPlatform) GetAnimeDetails(ctx context.Context, mediaID int) (interface{}, error) {
	return p.GetPlatform().GetAnimeDetails(ctx, mediaID)
}

func (p *DynamicPlatform) GetMovie(ctx context.Context, mediaID int) (interface{}, error) {
	return p.GetPlatform().GetMovie(ctx, mediaID)
}

func (p *DynamicPlatform) SearchMedia(ctx context.Context, query string, page *int) (*UnifiedMediaList, error) {
	return p.GetPlatform().SearchMedia(ctx, query, page)
}

func (p *DynamicPlatform) GetAnimeCollection(ctx context.Context, bypassCache bool) (interface{}, error) {
	return p.GetPlatform().GetAnimeCollection(ctx, bypassCache)
}

func (p *DynamicPlatform) GetRawAnimeCollection(ctx context.Context, bypassCache bool) (interface{}, error) {
	return p.GetPlatform().GetRawAnimeCollection(ctx, bypassCache)
}

func (p *DynamicPlatform) GetAnimeCollectionWithRelations(ctx context.Context) (interface{}, error) {
	return p.GetPlatform().GetAnimeCollectionWithRelations(ctx)
}

func (p *DynamicPlatform) AddMediaToCollection(ctx context.Context, mIds []int) error {
	return p.GetPlatform().AddMediaToCollection(ctx, mIds)
}

func (p *DynamicPlatform) GetStudioDetails(ctx context.Context, studioID int) (interface{}, error) {
	return p.GetPlatform().GetStudioDetails(ctx, studioID)
}

func (p *DynamicPlatform) RefreshAnimeCollection(ctx context.Context) (interface{}, error) {
	return p.GetPlatform().RefreshAnimeCollection(ctx)
}

func (p *DynamicPlatform) GetViewerStats(ctx context.Context) (interface{}, error) {
	return p.GetPlatform().GetViewerStats(ctx)
}

func (p *DynamicPlatform) GetAnimeAiringSchedule(ctx context.Context) (interface{}, error) {
	return p.GetPlatform().GetAnimeAiringSchedule(ctx)
}

func (p *DynamicPlatform) ListAnime(ctx context.Context, page *int, search *string, perPage *int, sort []MediaSort, status []MediaStatus, genres []string, averageScoreGreater *int, season *MediaSeason, seasonYear *int, format *MediaFormat, isAdult *bool) (interface{}, error) {
	return p.GetPlatform().ListAnime(ctx, page, search, perPage, sort, status, genres, averageScoreGreater, season, seasonYear, format, isAdult)
}

func (p *DynamicPlatform) ListRecentAnime(ctx context.Context, page *int, perPage *int, airingAtGreater *int, airingAtLesser *int, notYetAired *bool) (interface{}, error) {
	return p.GetPlatform().ListRecentAnime(ctx, page, perPage, airingAtGreater, airingAtLesser, notYetAired)
}

func (p *DynamicPlatform) ClearCache() {
	p.GetPlatform().ClearCache()
}

func (p *DynamicPlatform) Close() {
	p.GetPlatform().Close()
}
