package cron

import (
	"kamehouse/internal/api/anilist"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/platforms/shared_platform"
	"time"

	"github.com/goccy/go-json"
)

// RefreshAnilistCatalogCacheJob pre-fetches the most commonly requested
// AniList catalog pages (trending, popular, top-rated) and stores them in
// SQLite so that subsequent user requests can be served from the database
// instead of hitting the AniList API.
func RefreshAnilistCatalogCacheJob(c *JobCtx) {
	defer func() {
		if r := recover(); r != nil {
		}
	}()

	if c.App.Settings == nil || c.App.Settings.Library == nil {
		return
	}

	logger := c.App.Logger
	logger.Info().Msg("cron: Starting AniList catalog cache refresh")

	// Define the catalog queries to pre-cache
	type catalogQuery struct {
		sort    []*anilist.MediaSort
		label   string
		page    int
		perPage int
	}

	trendingDesc := anilist.MediaSortTrendingDesc
	popularityDesc := anilist.MediaSortPopularityDesc
	scoreDesc := anilist.MediaSortScoreDesc

	queries := []catalogQuery{
		{sort: []*anilist.MediaSort{&trendingDesc}, label: "trending", page: 1, perPage: 20},
		{sort: []*anilist.MediaSort{&popularityDesc}, label: "popular", page: 1, perPage: 20},
		{sort: []*anilist.MediaSort{&scoreDesc}, label: "top-rated", page: 1, perPage: 20},
	}

	isAdult := false
	cacheTTL := 24 * time.Hour

	for _, q := range queries {
		cacheKey := anilist.ListAnimeCacheKey(
			&q.page,
			nil, // no search
			&q.perPage,
			q.sort,
			nil, // no status filter
			nil, // no genres
			nil, // no score filter
			nil, // no season
			nil, // no year
			nil, // no format
			&isAdult,
			nil, // no country
		)

		// Fetch from AniList
		ret, err := anilist.ListAnimeM(
			shared_platform.NewCacheLayer(c.App.Metadata.AnilistClientRef),
			&q.page,
			nil,
			&q.perPage,
			q.sort,
			nil,
			nil,
			nil,
			nil,
			nil,
			nil,
			&isAdult,
			nil,
			c.App.Logger,
			c.App.GetUserAnilistToken(),
		)
		if err != nil {
			logger.Error().Err(err).Str("query", q.label).Msg("cron: Failed to fetch AniList catalog for cache")
			continue
		}

		if ret == nil {
			continue
		}

		// Serialize to JSON
		data, err := json.Marshal(ret)
		if err != nil {
			logger.Error().Err(err).Str("query", q.label).Msg("cron: Failed to marshal AniList response for cache")
			continue
		}

		// Upsert into SQLite
		entry := &models.AnilistCacheEntry{
			CacheKey:  cacheKey,
			Data:      data,
			ExpiresAt: time.Now().Add(cacheTTL),
		}

		if err := db.UpsertAnilistCache(c.App.Database, entry); err != nil {
			logger.Error().Err(err).Str("query", q.label).Msg("cron: Failed to upsert AniList cache entry")
			continue
		}

		logger.Debug().Str("query", q.label).Str("cacheKey", cacheKey).Msg("cron: Cached AniList catalog page")
	}

	// Purge expired entries while we're at it
	if err := db.PurgeExpiredAnilistCache(c.App.Database); err != nil {
		logger.Error().Err(err).Msg("cron: Failed to purge expired AniList cache entries")
	}

	logger.Info().Msg("cron: AniList catalog cache refresh completed")
}
