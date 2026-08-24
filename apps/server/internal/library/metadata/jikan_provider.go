package metadata

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"kamehouse/internal/api/jikan"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/util/limiter"

	"github.com/rs/zerolog"
)

// JikanProvider implements the Provider interface using Jikan (MyAnimeList) as metadata source.
type JikanProvider struct {
	client      *jikan.Client
	db          *db.Database
	logger      *zerolog.Logger
	rateLimiter *limiter.Limiter
}

// NewJikanProvider creates a new Jikan metadata provider.
func NewJikanProvider(database *db.Database, logger *zerolog.Logger) *JikanProvider {
	return &JikanProvider{
		client:      jikan.NewClient(logger),
		db:          database,
		logger:      logger,
		rateLimiter: limiter.NewPlatformLimiter(),
	}
}

func (p *JikanProvider) GetProviderID() string {
	return "jikan"
}

func (p *JikanProvider) GetName() string {
	return "Jikan (MyAnimeList)"
}

// SearchMedia searches Jikan for anime matching the query and converts them to NormalizedMedia.
func (p *JikanProvider) SearchMedia(ctx context.Context, query string) ([]*dto.NormalizedMedia, error) {
	if p.rateLimiter != nil {
		if err := p.rateLimiter.Wait(ctx); err != nil {
			return nil, err
		}
	}

	searchRes, err := p.client.SearchAnimeAdvanced(ctx, query, 1, 20)
	if err != nil {
		return nil, err
	}
	if searchRes == nil || len(searchRes.Data) == 0 {
		return nil, ErrNotFound
	}

	var results []*dto.NormalizedMedia
	for _, item := range searchRes.Data {
		malID := item.MalID

		romajiTitle := item.Title
		engTitle := item.TitleEng
		jpnTitle := item.TitleJpn

		title := &dto.NormalizedMediaTitle{
			Romaji:  &romajiTitle,
			English: &engTitle,
			Native:  &jpnTitle,
		}
		if engTitle == "" {
			title.English = &romajiTitle
		}

		var coverImage *dto.NormalizedMediaCoverImage
		if item.Images.Jpg.LargeImageUrl != "" {
			url := item.Images.Jpg.LargeImageUrl
			coverImage = &dto.NormalizedMediaCoverImage{
				Large:      &url,
				ExtraLarge: &url,
			}
		}

		var description *string
		if item.Synopsis != "" {
			description = &item.Synopsis
		}

		var totalEpisodes *int
		if item.Episodes > 0 {
			ep := item.Episodes
			totalEpisodes = &ep
		}

		nm := &dto.NormalizedMedia{
			ID:               malID,
			MyanimelistId:    &malID,
			ExplicitProvider: "jikan",
			ExplicitID:       strconv.Itoa(malID),
			Title:            title,
			CoverImage:       coverImage,
			Description:      description,
			Episodes:         totalEpisodes,
		}

		results = append(results, nm)
	}

	return results, nil
}

// GetMediaDetails fetches full details for a specific MAL ID and returns NormalizedMedia.
func (p *JikanProvider) GetMediaDetails(ctx context.Context, id string) (*dto.NormalizedMedia, error) {
	malID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("invalid Jikan ID %s: %w", id, err)
	}

	// Persistent cache lookup
	cacheKey := strconv.Itoa(malID)
	if p.db != nil {
		var cached dto.NormalizedMedia
		found, err := db.GetMetadataCache(p.db, "jikan-media-details", cacheKey, &cached)
		if err == nil && found {
			return &cached, nil
		}
	}

	if p.rateLimiter != nil {
		if err := p.rateLimiter.Wait(ctx); err != nil {
			return nil, err
		}
	}

	fullRes, err := p.client.GetAnimeFull(ctx, malID)
	if err != nil {
		return nil, err
	}
	if fullRes == nil || fullRes.Data.MalID == 0 {
		return nil, ErrNotFound
	}

	data := fullRes.Data
	romajiTitle := data.Title
	engTitle := data.TitleEng
	jpnTitle := data.TitleJpn

	title := &dto.NormalizedMediaTitle{
		Romaji:  &romajiTitle,
		English: &engTitle,
		Native:  &jpnTitle,
	}
	if engTitle == "" {
		title.English = &romajiTitle
	}

	var coverImage *dto.NormalizedMediaCoverImage
	if data.Images.Jpg.LargeImageUrl != "" {
		url := data.Images.Jpg.LargeImageUrl
		coverImage = &dto.NormalizedMediaCoverImage{
			Large:      &url,
			ExtraLarge: &url,
		}
	}

	var description *string
	if data.Synopsis != "" {
		description = &data.Synopsis
	}

	var score *float64
	if data.Score > 0 {
		s := data.Score * 10
		score = &s
	}

	var totalEpisodes *int
	if data.Episodes > 0 {
		ep := data.Episodes
		totalEpisodes = &ep
	}

	var genres []*string
	for _, g := range data.Genres {
		name := g.Name
		genres = append(genres, &name)
	}

	format := dto.MediaFormatTV
	if strings.Contains(strings.ToLower(data.Duration), "movie") {
		format = dto.MediaFormatMovie
	}

	var mediaStatus *dto.MediaStatus
	switch strings.ToLower(data.Status) {
	case "finished airing":
		st := dto.MediaStatusFinished
		mediaStatus = &st
	case "currently airing":
		st := dto.MediaStatusReleasing
		mediaStatus = &st
	case "not yet aired":
		st := dto.MediaStatusNotYetReleased
		mediaStatus = &st
	case "cancelled":
		st := dto.MediaStatusCancelled
		mediaStatus = &st
	}

	result := &dto.NormalizedMedia{
		ID:               malID,
		MyanimelistId:    &malID,
		ExplicitProvider: "jikan",
		ExplicitID:       strconv.Itoa(malID),
		Title:            title,
		Format:           &format,
		CoverImage:       coverImage,
		Description:      description,
		Score:            score,
		Episodes:         totalEpisodes,
		Genres:           genres,
		Status:           mediaStatus,
	}

	// Persistent cache store
	if p.db != nil {
		ttl := 7 * 24 * time.Hour
		if mediaStatus != nil && *mediaStatus == dto.MediaStatusFinished {
			ttl = 365 * 24 * time.Hour
		}
		_ = db.UpsertMetadataCache(p.db, "jikan-media-details", cacheKey, result, ttl)
	}

	return result, nil
}
