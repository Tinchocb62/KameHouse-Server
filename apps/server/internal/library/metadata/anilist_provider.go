package metadata

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"kamehouse/internal/api/anilist"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/util/limiter"

	"github.com/rs/zerolog"
)

// AniListProvider implements the Provider interface using AniList GraphQL as metadata source.
type AniListProvider struct {
	client      *anilist.Client
	db          *db.Database
	logger      *zerolog.Logger
	rateLimiter *limiter.Limiter
}

// NewAniListProvider creates a new AniList metadata provider.
func NewAniListProvider(database *db.Database, logger *zerolog.Logger) *AniListProvider {
	return &AniListProvider{
		client:      anilist.NewClient(logger),
		db:          database,
		logger:      logger,
		rateLimiter: limiter.NewPlatformLimiter(),
	}
}

func (p *AniListProvider) GetProviderID() string {
	return "anilist"
}

func (p *AniListProvider) GetName() string {
	return "AniList"
}

// SearchMedia searches AniList for anime matching the query and converts them to NormalizedMedia.
func (p *AniListProvider) SearchMedia(ctx context.Context, query string) ([]*dto.NormalizedMedia, error) {
	if p.rateLimiter != nil {
		if err := p.rateLimiter.Wait(ctx); err != nil {
			return nil, err
		}
	}

	mediaList, err := p.client.SearchAnime(ctx, query, 1, 20)
	if err != nil {
		return nil, err
	}
	if len(mediaList) == 0 {
		return nil, ErrNotFound
	}

	var results []*dto.NormalizedMedia
	for _, item := range mediaList {
		id := item.ID
		malID := item.IDMal

		romajiTitle := item.Title.Romaji
		engTitle := item.Title.English
		nativeTitle := item.Title.Native

		title := &dto.NormalizedMediaTitle{
			Romaji:  &romajiTitle,
			English: &engTitle,
			Native:  &nativeTitle,
		}
		if engTitle == "" {
			title.English = &romajiTitle
		}

		var coverImage *dto.NormalizedMediaCoverImage
		if item.CoverImage.ExtraLarge != "" || item.CoverImage.Large != "" {
			largeUrl := item.CoverImage.Large
			if largeUrl == "" {
				largeUrl = item.CoverImage.ExtraLarge
			}
			xlUrl := item.CoverImage.ExtraLarge
			if xlUrl == "" {
				xlUrl = largeUrl
			}
			coverImage = &dto.NormalizedMediaCoverImage{
				Large:      &largeUrl,
				ExtraLarge: &xlUrl,
			}
		}

		var bannerImage *string
		if item.BannerImage != "" {
			bannerImage = &item.BannerImage
		}

		var description *string
		if item.Description != "" {
			description = &item.Description
		}

		var totalEpisodes *int
		if item.Episodes > 0 {
			ep := item.Episodes
			totalEpisodes = &ep
		}

		var score *float64
		if item.AverageScore > 0 {
			s := float64(item.AverageScore)
			score = &s
		}

		format := dto.MediaFormatTV
		if item.Format == "MOVIE" {
			format = dto.MediaFormatMovie
		} else if item.Format == "OVA" {
			format = dto.MediaFormatOVA
		} else if item.Format == "SPECIAL" {
			format = dto.MediaFormatSpecial
		}

		var myanimelistId *int
		if malID > 0 {
			myanimelistId = &malID
		}

		nm := &dto.NormalizedMedia{
			ID:               id,
			MyanimelistId:    myanimelistId,
			ExplicitProvider: "anilist",
			ExplicitID:       strconv.Itoa(id),
			Title:            title,
			CoverImage:       coverImage,
			BannerImage:      bannerImage,
			Description:      description,
			Episodes:         totalEpisodes,
			Score:            score,
			Format:           &format,
		}

		results = append(results, nm)
	}

	return results, nil
}

// GetMediaDetails fetches full details for a specific AniList ID and returns NormalizedMedia.
func (p *AniListProvider) GetMediaDetails(ctx context.Context, id string) (*dto.NormalizedMedia, error) {
	aniID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("invalid AniList ID %s: %w", id, err)
	}

	// Persistent cache lookup
	cacheKey := strconv.Itoa(aniID)
	if p.db != nil {
		var cached dto.NormalizedMedia
		found, err := db.GetMetadataCache(p.db, "anilist-media-details", cacheKey, &cached)
		if err == nil && found {
			return &cached, nil
		}
	}

	if p.rateLimiter != nil {
		if err := p.rateLimiter.Wait(ctx); err != nil {
			return nil, err
		}
	}

	data, err := p.client.GetMediaByID(ctx, aniID)
	if err != nil {
		return nil, err
	}
	if data == nil || data.ID == 0 {
		return nil, ErrNotFound
	}

	romajiTitle := data.Title.Romaji
	engTitle := data.Title.English
	nativeTitle := data.Title.Native

	title := &dto.NormalizedMediaTitle{
		Romaji:  &romajiTitle,
		English: &engTitle,
		Native:  &nativeTitle,
	}
	if engTitle == "" {
		title.English = &romajiTitle
	}

	var coverImage *dto.NormalizedMediaCoverImage
	if data.CoverImage.ExtraLarge != "" || data.CoverImage.Large != "" {
		largeUrl := data.CoverImage.Large
		if largeUrl == "" {
			largeUrl = data.CoverImage.ExtraLarge
		}
		xlUrl := data.CoverImage.ExtraLarge
		if xlUrl == "" {
			xlUrl = largeUrl
		}
		coverImage = &dto.NormalizedMediaCoverImage{
			Large:      &largeUrl,
			ExtraLarge: &xlUrl,
		}
	}

	var bannerImage *string
	if data.BannerImage != "" {
		bannerImage = &data.BannerImage
	}

	var description *string
	if data.Description != "" {
		description = &data.Description
	}

	var score *float64
	if data.AverageScore > 0 {
		s := float64(data.AverageScore)
		score = &s
	}

	var totalEpisodes *int
	if data.Episodes > 0 {
		ep := data.Episodes
		totalEpisodes = &ep
	}

	var genres []*string
	for _, g := range data.Genres {
		name := g
		genres = append(genres, &name)
	}

	format := dto.MediaFormatTV
	if data.Format == "MOVIE" {
		format = dto.MediaFormatMovie
	} else if data.Format == "OVA" {
		format = dto.MediaFormatOVA
	} else if data.Format == "SPECIAL" {
		format = dto.MediaFormatSpecial
	}

	var mediaStatus *dto.MediaStatus
	switch strings.ToUpper(data.Status) {
	case "FINISHED":
		st := dto.MediaStatusFinished
		mediaStatus = &st
	case "RELEASING":
		st := dto.MediaStatusReleasing
		mediaStatus = &st
	case "NOT_YET_RELEASED":
		st := dto.MediaStatusNotYetReleased
		mediaStatus = &st
	case "CANCELLED":
		st := dto.MediaStatusCancelled
		mediaStatus = &st
	}

	var myanimelistId *int
	if data.IDMal > 0 {
		malID := data.IDMal
		myanimelistId = &malID
	}

	var year *int
	if data.SeasonYear > 0 {
		y := data.SeasonYear
		year = &y
	}

	result := &dto.NormalizedMedia{
		ID:               data.ID,
		MyanimelistId:    myanimelistId,
		ExplicitProvider: "anilist",
		ExplicitID:       strconv.Itoa(data.ID),
		Title:            title,
		Format:           &format,
		CoverImage:       coverImage,
		BannerImage:      bannerImage,
		Description:      description,
		Score:            score,
		Episodes:         totalEpisodes,
		Genres:           genres,
		Status:           mediaStatus,
		Year:             year,
	}

	// Persistent cache store
	if p.db != nil {
		ttl := 7 * 24 * time.Hour
		if mediaStatus != nil && *mediaStatus == dto.MediaStatusFinished {
			ttl = 365 * 24 * time.Hour
		}
		_ = db.UpsertMetadataCache(p.db, "anilist-media-details", cacheKey, result, ttl)
	}

	return result, nil
}
