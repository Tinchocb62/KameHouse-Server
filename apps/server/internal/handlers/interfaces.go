package handlers

import (
	"context"

	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/events"
	"kamehouse/internal/library/anime"
	"kamehouse/internal/library_explorer"
	"kamehouse/internal/platforms/platform"
)

// Database define las operaciones de base de datos que los handlers necesitan.
type Database interface {
	GetSettings() (*models.Settings, error)
	UpsertSettings(settings *models.Settings) (*models.Settings, error)
	GetMediastreamSettings() (*models.MediastreamSettings, bool)
	UpsertMediastreamSettings(settings *models.MediastreamSettings) (*models.MediastreamSettings, error)
	GetTheme() (*models.Theme, error)
	GetThemeCopy() (*models.Theme, error)
	UpsertTheme(theme *models.Theme) (*models.Theme, error)
	GetAccount() (*models.Account, error)
	GetAllLibraryPathsFromSettings() ([]string, error)
	GetAllGhostAssociations() ([]*models.GhostAssociatedMedia, error)
	ResolveGhostAssociation(associationID uint) error
	ResetLocalFilesMediaIds() error
	InsertSilencedMediaEntry(entry *models.SilencedMediaEntry) error
	GetSilencedMediaEntryIds() ([]int, error)
	InsertMediaMetadataParent(parent *models.MediaMetadataParent) error
	GetMediaMetadataParent(mediaID int) (*models.MediaMetadataParent, error)
	DeleteMediaMetadataParent(mediaID int) error
	Gorm() interface{}
	EnqueueWrite(op db.DbWriteOperation)
	Shutdown()
	Close() error
	RunDatabaseCleanup()
}

// WSEventManager define las operaciones del gestor de eventos WebSocket.
type WSEventManager interface {
	AddConn(conn *events.WSConn)
	RemoveConn(id string)
	SendEvent(eventType string, payload interface{}, noLog ...bool)
	SendEventTo(clientID string, eventType string, payload interface{}, noLog ...bool)
	Dispatcher() *events.Dispatcher
	OnClientEvent(handler func(clientID string, eventType string, data []byte))
	ShutdownSignal() <-chan struct{}
	ExitIfNoConnsAsDesktopSidecar()
	SubscribeToClientVideoCoreEvents(subscriberID string) *events.ClientEventSubscriber
}

// Provider interfaces para desacoplar los handlers de core.App

type PlatformProvider interface {
	GetAnime(ctx context.Context, mediaID int) (interface{}, error)
	GetAnimeCollection(ctx context.Context, bypassCache bool) (interface{}, error)
	GetAnimeAiringSchedule(ctx context.Context) (interface{}, error)
	AddMediaToCollection(ctx context.Context, mIds []int) error
	UpdateEntryProgress(ctx context.Context, mediaID int, progress int, totalEpisodes *int) error
	UpdateEntryRepeat(ctx context.Context, mediaID int, repeat int) error
	DeleteEntry(ctx context.Context, mediaID int, entryID int) error
	RefreshAnimeCollection(ctx context.Context) (interface{}, error)
	SearchMedia(ctx context.Context, query string, page *int) (*platform.UnifiedMediaList, error)
	ListAnime(ctx context.Context, page *int, search *string, perPage *int, sort []string, status []string, genres []string, averageScoreGreater *int, season *string, seasonYear *int, format *string, isAdult *bool) (interface{}, error)
	ListRecentAnime(ctx context.Context, page *int, perPage *int, airingAtGreater *int, airingAtLesser *int, notYetAired *bool) (interface{}, error)
	GetViewerStats(ctx context.Context) (interface{}, error)
}

type MetadataProvider interface {
	GetAnimeMetadata(id int) (interface{}, error)
	ClearCache()
}

type TMDBClient interface {
	GetTVExternalIDs(tmdbID int) (interface{}, error)
}

type FanArtEnricher interface {
	EnrichMovie(movieID int, language string) (interface{}, error)
	EnrichTV(tvID int, language string) (interface{}, error)
}

type OMDbEnricher interface{}

type AnimeCollectionProvider interface {
	GetAnimeCollection(bypassCache bool) (*platform.UnifiedCollection, error)
}

type FillerManagerProvider interface {
	HydrateEpisodeFillerData(mediaID int, episodes []*anime.Episode)
	HydrateFillerData(media *models.LibraryMedia, episodes []*anime.Episode) []*anime.Episode
	FetchAndStoreFillerData(mediaID int) error
	RemoveFillerData(mediaID int) error
}

type LibraryExplorerProvider interface {
	SetLibraryPaths(paths []string)
	GetFileTree() *library_explorer.FileTree
	Refresh()
	LoadDirectoryChildren(path string) error
	SuperUpdateFiles(lfs []*dto.LocalFile) error
}

type AutoScannerProvider interface {
	TriggerScan(paths []string)
}

type ThumbnailCacheProvider interface {
	Get(key string) ([]byte, bool)
	Set(key string, data []byte)
}

type FileCacherProvider interface {
	GetTotalSize() (int64, error)
	RemoveAllBy(predicate func(key string) bool) error
	GetMediastreamVideoFilesTotalSize() (int64, error)
	ClearMediastreamVideoFiles() error
	TrimMediastreamVideoFiles() error
}
