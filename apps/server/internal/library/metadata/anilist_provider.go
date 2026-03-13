package metadata

import (
	"context"
	"strconv"

	"kamehouse/internal/api/anilist"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/library/anime"
	"kamehouse/internal/util/result"
)

type AniListProvider struct {
	client anilist.AnilistClient
	cache  *result.Cache[string, any]
}

func NewAniListProvider(client anilist.AnilistClient) *AniListProvider {
	return &AniListProvider{
		client: client,
		cache:  result.NewCache[string, any](),
	}
}

func (p *AniListProvider) GetProviderID() string {
	return "anilist"
}

func (p *AniListProvider) GetName() string {
	return "AniList"
}

func (p *AniListProvider) SearchMedia(ctx context.Context, query string) ([]*dto.NormalizedMedia, error) {
	cacheKey := "search_" + query
	if cached, ok := p.cache.Get(cacheKey); ok {
		return cached.([]*dto.NormalizedMedia), nil
	}

	res, err := p.client.ListAnime(
		ctx,
		nil,    // page
		&query, // search
		nil,    // perPage
		nil,    // sort
		nil,    // status
		nil,    // genres
		nil,    // averageScoreGreater
		nil,    // season
		nil,    // seasonYear
		nil,    // format
		nil,    // isAdult
	)
	if err != nil {
		return nil, err
	}

	var results []*dto.NormalizedMedia
	if res != nil && res.Page != nil && res.Page.Media != nil {
		for _, m := range res.Page.Media {
			results = append(results, anime.NewNormalizedMedia(m))
		}
	}

	if len(results) == 0 {
		return nil, ErrNotFound
	}

	p.cache.Set(cacheKey, results)
	return results, nil
}

func (p *AniListProvider) GetMediaDetails(ctx context.Context, id string) (*dto.NormalizedMedia, error) {
	cacheKey := "details_" + id
	if cached, ok := p.cache.Get(cacheKey); ok {
		return cached.(*dto.NormalizedMedia), nil
	}

	idInt, err := strconv.Atoi(id)
	if err != nil {
		return nil, err
	}

	res, err := p.client.BaseAnimeByID(ctx, &idInt)
	if err != nil {
		return nil, err
	}

	if res == nil || res.Media == nil {
		return nil, ErrNotFound
	}

	normalized := anime.NewNormalizedMedia(res.Media)
	p.cache.Set(cacheKey, normalized)
	return normalized, nil
}
