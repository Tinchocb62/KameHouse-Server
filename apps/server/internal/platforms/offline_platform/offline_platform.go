package offline_platform

import (
	"context"
	"errors"
	"kamehouse/internal/local"
	"kamehouse/internal/platforms/platform"

	"github.com/rs/zerolog"
)

var (
	ErrNoLocalAnimeCollection   = errors.New("no local anime collection")
	// ErrMediaNotFound means the media wasn't found in the local collection
	ErrMediaNotFound = errors.New("media not found")
	// ErrActionNotSupported means the action isn't valid on the local platform
	ErrActionNotSupported = errors.New("action not supported")
)

// OfflinePlatform used when offline.
type OfflinePlatform struct {
	logger       *zerolog.Logger
	localManager local.Manager
}

func NewOfflinePlatform(localManager local.Manager, logger *zerolog.Logger) (platform.Platform, error) {
	ap := &OfflinePlatform{
		logger:       logger,
		localManager: localManager,
	}

	return ap, nil
}

func (lp *OfflinePlatform) SetUsername(username string) {
	// no-op
}

func (lp *OfflinePlatform) Close() {
	// no-op
}

func (lp *OfflinePlatform) ClearCache() {
	// no-op
}

func (lp *OfflinePlatform) UpdateEntry(ctx context.Context, mediaID int, status interface{}, scoreRaw *int, progress *int, startedAt interface{}, completedAt interface{}) error {
	return ErrActionNotSupported
}

func (lp *OfflinePlatform) UpdateEntryProgress(ctx context.Context, mediaID int, progress int, totalEpisodes *int) error {
	return ErrActionNotSupported
}

func (lp *OfflinePlatform) UpdateEntryRepeat(ctx context.Context, mediaID int, repeat int) error {
	return ErrActionNotSupported
}

func (lp *OfflinePlatform) DeleteEntry(ctx context.Context, mediaID, entryId int) error {
	return ErrActionNotSupported
}

func (lp *OfflinePlatform) GetAnime(ctx context.Context, mediaID int) (interface{}, error) {
	return nil, ErrMediaNotFound
}



func (lp *OfflinePlatform) GetAnimeDetails(ctx context.Context, mediaID int) (interface{}, error) {
	return nil, nil
}

func (lp *OfflinePlatform) GetAnimeWithRelations(ctx context.Context, mediaID int) (interface{}, error) {
	return nil, ErrActionNotSupported
}

func (lp *OfflinePlatform) GetAnimeCollection(ctx context.Context, bypassCache bool) (interface{}, error) {
	return nil, ErrNoLocalAnimeCollection
}

func (lp *OfflinePlatform) GetRawAnimeCollection(ctx context.Context, bypassCache bool) (interface{}, error) {
	return nil, ErrNoLocalAnimeCollection
}

func (lp *OfflinePlatform) RefreshAnimeCollection(ctx context.Context) (interface{}, error) {
	return nil, ErrNoLocalAnimeCollection
}

func (lp *OfflinePlatform) GetAnimeCollectionWithRelations(ctx context.Context) (interface{}, error) {
	return nil, ErrActionNotSupported
}

func (lp *OfflinePlatform) AddMediaToCollection(ctx context.Context, mIds []int) error {
	return ErrActionNotSupported
}

func (lp *OfflinePlatform) GetStudioDetails(ctx context.Context, studioID int) (interface{}, error) {
	return nil, nil
}

func (lp *OfflinePlatform) GetViewerStats(ctx context.Context) (interface{}, error) {
	return nil, ErrActionNotSupported
}

func (lp *OfflinePlatform) GetAnimeAiringSchedule(ctx context.Context) (interface{}, error) {
	return nil, ErrActionNotSupported
}

func (lp *OfflinePlatform) ListAnime(ctx context.Context, page *int, search *string, perPage *int, sort []platform.MediaSort, status []platform.MediaStatus, genres []string, averageScoreGreater *int, season *platform.MediaSeason, seasonYear *int, format *platform.MediaFormat, isAdult *bool) (interface{}, error) {
	return nil, ErrActionNotSupported
}

func (lp *OfflinePlatform) ListRecentAnime(ctx context.Context, page *int, perPage *int, airingAtGreater *int, airingAtLesser *int, notYetAired *bool) (interface{}, error) {
	return nil, ErrActionNotSupported
}

func (lp *OfflinePlatform) GetMovie(ctx context.Context, mediaID int) (interface{}, error) {
	return nil, ErrActionNotSupported
}

func (lp *OfflinePlatform) SearchMedia(ctx context.Context, query string, page *int) (*platform.UnifiedMediaList, error) {
	return nil, ErrActionNotSupported
}

var _ platform.Platform = (*OfflinePlatform)(nil)
