package simulated_platform

import (
	"context"
	"kamehouse/internal/api/anilist"
	"kamehouse/internal/database/db"
	"kamehouse/internal/platforms/platform"

	"github.com/rs/zerolog"
)

type SimulatedPlatform struct {
	logger *zerolog.Logger
	db     *db.Database
}

func NewSimulatedPlatform(logger *zerolog.Logger, db *db.Database) *SimulatedPlatform {
	return &SimulatedPlatform{
		logger: logger,
		db:     db,
	}
}

func (p *SimulatedPlatform) GetID() string   { return "simulated" }
func (p *SimulatedPlatform) GetName() string { return "Simulated" }

func (p *SimulatedPlatform) GetAnimeCollection(ctx context.Context, bypassCache bool) (*anilist.AnimeCollection, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetRawAnimeCollection(ctx context.Context, bypassCache bool) (*anilist.AnimeCollection, error) {
	return nil, nil
}
func (p *SimulatedPlatform) RefreshAnimeCollection(ctx context.Context) (*anilist.AnimeCollection, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetAnimeCollectionWithRelations(ctx context.Context) (*anilist.AnimeCollectionWithRelations, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetMangaCollection(ctx context.Context, bypassCache bool) (*anilist.MangaCollection, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetRawMangaCollection(ctx context.Context, bypassCache bool) (*anilist.MangaCollection, error) {
	return nil, nil
}
func (p *SimulatedPlatform) RefreshMangaCollection(ctx context.Context) (*anilist.MangaCollection, error) {
	return nil, nil
}
func (p *SimulatedPlatform) AddMediaToCollection(ctx context.Context, mIds []int) error {
	return nil
}
func (p *SimulatedPlatform) UpdateEntry(ctx context.Context, mediaID int, status *anilist.MediaListStatus, scoreRaw *int, progress *int, startedAt *anilist.FuzzyDateInput, completedAt *anilist.FuzzyDateInput) error {
	return nil
}
func (p *SimulatedPlatform) UpdateEntryProgress(ctx context.Context, mediaID int, progress int, totalEpisodes *int) error {
	return nil
}
func (p *SimulatedPlatform) UpdateEntryRepeat(ctx context.Context, mediaID int, repeat int) error {
	return nil
}
func (p *SimulatedPlatform) DeleteEntry(ctx context.Context, mediaId, entryId int) error {
	return nil
}
func (p *SimulatedPlatform) GetAnime(ctx context.Context, mediaID int) (*anilist.BaseAnime, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetAnimeByMalID(ctx context.Context, malID int) (*anilist.BaseAnime, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetAnimeDetails(ctx context.Context, mediaID int) (*anilist.AnimeDetailsById_Media, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetAnimeWithRelations(ctx context.Context, mediaID int) (*anilist.CompleteAnime, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetManga(ctx context.Context, mediaID int) (*anilist.BaseManga, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetMangaDetails(ctx context.Context, mediaID int) (*anilist.MangaDetailsById_Media, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetStudioDetails(ctx context.Context, studioID int) (*anilist.StudioDetails, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetViewerStats(ctx context.Context) (*anilist.ViewerStats, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetAnimeAiringSchedule(ctx context.Context) (*anilist.AnimeAiringSchedule, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetAnilistClient() anilist.AnilistClient {
	return nil
}
func (p *SimulatedPlatform) SetUsername(username string) {}
func (p *SimulatedPlatform) Close()                       {}
func (p *SimulatedPlatform) ClearCache()                  {}

var _ platform.Platform = (*SimulatedPlatform)(nil)
