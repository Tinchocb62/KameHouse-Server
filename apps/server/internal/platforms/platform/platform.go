package platform

import (
	"context"
)

type Platform interface {
	SetUsername(username string)
	// UpdateEntry updates the entry for the given media ID
	UpdateEntry(context context.Context, mediaID int, status interface{}, scoreRaw *int, progress *int, startedAt interface{}, completedAt interface{}) error
	// UpdateEntryProgress updates the entry progress for the given media ID
	UpdateEntryProgress(context context.Context, mediaID int, progress int, totalEpisodes *int) error
	// UpdateEntryRepeat updates the entry repeat number for the given media ID
	UpdateEntryRepeat(context context.Context, mediaID int, repeat int) error
	// DeleteEntry deletes the entry for the given media ID
	DeleteEntry(context context.Context, mediaID int, entryID int) error
	// GetAnime gets the anime for the given media ID
	GetAnime(context context.Context, mediaID int) (interface{}, error)
	GetAnimeWithRelations(context context.Context, mediaID int) (interface{}, error)
	// GetAnimeDetails gets the anime details for the given media ID
	GetAnimeDetails(context context.Context, mediaID int) (interface{}, error)

	// GetMovie fetches a single movie by TMDB ID
	GetMovie(context context.Context, mediaID int) (interface{}, error)
	// SearchMedia performs a unified search across TV shows and movies
	SearchMedia(context context.Context, query string, page *int) (*UnifiedMediaList, error)

	// GetAnimeCollection gets the anime collection without custom lists
	GetAnimeCollection(context context.Context, bypassCache bool) (interface{}, error)
	// GetRawAnimeCollection gets the anime collection with custom lists
	GetRawAnimeCollection(context context.Context, bypassCache bool) (interface{}, error)

	// GetAnimeCollectionWithRelations gets the anime collection with relations
	GetAnimeCollectionWithRelations(context context.Context) (interface{}, error)

	// AddMediaToCollection adds the media to the collection
	AddMediaToCollection(context context.Context, mIds []int) error
	// GetStudioDetails gets the studio details for the given studio ID
	GetStudioDetails(context context.Context, studioID int) (interface{}, error)
	// RefreshAnimeCollection refreshes the anime collection
	RefreshAnimeCollection(context context.Context) (interface{}, error)

	// GetViewerStats gets the viewer stats
	GetViewerStats(context context.Context) (interface{}, error)
	// GetAnimeAiringSchedule gets the schedule for airing anime in the collection
	GetAnimeAiringSchedule(context context.Context) (interface{}, error)
	// ListAnime lists anime based on search parameters
	ListAnime(ctx context.Context, page *int, search *string, perPage *int, sort []MediaSort, status []MediaStatus, genres []string, averageScoreGreater *int, season *MediaSeason, seasonYear *int, format *MediaFormat, isAdult *bool) (interface{}, error)
	// ListRecentAnime lists recently aired anime
	ListRecentAnime(ctx context.Context, page *int, perPage *int, airingAtGreater *int, airingAtLesser *int, notYetAired *bool) (interface{}, error)
	ClearCache()
	Close()
}
