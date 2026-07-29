package simulated_platform

import (
	"context"
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

func (p *SimulatedPlatform) GetAnimeCollection(ctx context.Context, bypassCache bool) (interface{}, error) {
	return &platform.UnifiedCollection{}, nil
}
func (p *SimulatedPlatform) GetRawAnimeCollection(ctx context.Context, bypassCache bool) (interface{}, error) {
	return &platform.UnifiedCollection{}, nil
}
func (p *SimulatedPlatform) RefreshAnimeCollection(ctx context.Context) (interface{}, error) {
	return &platform.UnifiedCollection{}, nil
}
func (p *SimulatedPlatform) GetAnimeCollectionWithRelations(ctx context.Context) (interface{}, error) {
	return &platform.UnifiedCollection{}, nil
}
func (p *SimulatedPlatform) AddMediaToCollection(ctx context.Context, mIds []int) error {
	return nil
}
func (p *SimulatedPlatform) UpdateEntry(ctx context.Context, mediaID int, status interface{}, scoreRaw *int, progress *int, startedAt interface{}, completedAt interface{}) error {
	return nil
}
func (p *SimulatedPlatform) UpdateEntryProgress(ctx context.Context, mediaID int, progress int, totalEpisodes *int) error {
	return nil
}
func (p *SimulatedPlatform) UpdateEntryRepeat(ctx context.Context, mediaID int, repeat int) error {
	return nil
}
func (p *SimulatedPlatform) DeleteEntry(ctx context.Context, mediaID, entryId int) error {
	return nil
}
func (p *SimulatedPlatform) GetAnime(ctx context.Context, mediaID int) (interface{}, error) {
	return nil, nil
}

func (p *SimulatedPlatform) GetAnimeDetails(ctx context.Context, mediaID int) (interface{}, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetAnimeWithRelations(ctx context.Context, mediaID int) (interface{}, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetMovie(ctx context.Context, mediaID int) (interface{}, error) {
	return nil, nil
}
func (p *SimulatedPlatform) SearchMedia(ctx context.Context, query string, page *int) (*platform.UnifiedMediaList, error) {
	return &platform.UnifiedMediaList{}, nil
}
func (p *SimulatedPlatform) GetStudioDetails(ctx context.Context, studioID int) (interface{}, error) {
	return nil, nil
}
func (p *SimulatedPlatform) GetViewerStats(ctx context.Context) (interface{}, error) {
	return &platform.UnifiedViewerStats{}, nil
}
func (p *SimulatedPlatform) GetAnimeAiringSchedule(ctx context.Context) (interface{}, error) {
	return &platform.UnifiedAiringSchedule{}, nil
}

func (p *SimulatedPlatform) ListAnime(ctx context.Context, page *int, search *string, perPage *int, sort []platform.MediaSort, status []platform.MediaStatus, genres []string, averageScoreGreater *int, season *platform.MediaSeason, seasonYear *int, format *platform.MediaFormat, isAdult *bool) (interface{}, error) {
	return &platform.UnifiedMediaList{}, nil
}

func (p *SimulatedPlatform) ListRecentAnime(ctx context.Context, page *int, perPage *int, airingAtGreater *int, airingAtLesser *int, notYetAired *bool) (interface{}, error) {
	return &platform.UnifiedMediaList{}, nil
}

func (p *SimulatedPlatform) SetUsername(username string) {}
func (p *SimulatedPlatform) Close()                       {}
func (p *SimulatedPlatform) ClearCache()                  {}

var _ platform.Platform = (*SimulatedPlatform)(nil)
