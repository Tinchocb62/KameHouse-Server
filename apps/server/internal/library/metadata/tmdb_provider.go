package metadata

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"kamehouse/internal/api/tmdb"
	"kamehouse/internal/constants"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models/dto"
	"time"
)

// TMDBProvider implements the Provider interface using TMDB as the metadata source.
type TMDBProvider struct {
	client *tmdb.Client
	db     *db.Database
}

// NewTMDBProvider creates a new TMDB metadata provider.
// language is a BCP 47 language tag (e.g. "es-MX", "en-US"). If empty, defaults to "es-MX".
func NewTMDBProvider(bearerToken string, database *db.Database, language ...string) *TMDBProvider {
	lang := ""
	if len(language) > 0 {
		lang = language[0]
	}
	return &TMDBProvider{
		client: tmdb.NewClient(bearerToken, lang),
		db:     database,
	}
}

// NewTMDBProviderWithClient creates a TMDB metadata provider using an existing tmdb.Client.
func NewTMDBProviderWithClient(client *tmdb.Client, database *db.Database) *TMDBProvider {
	return &TMDBProvider{
		client: client,
		db:     database,
	}
}

// GetTVSeason fetches the details of a specific TV season, including its episodes.
func (p *TMDBProvider) GetTVSeason(ctx context.Context, tvID int, seasonNumber int) (tmdb.TVSeasonDetails, error) {
	cacheKey := fmt.Sprintf("%d-%d", tvID, seasonNumber)
	if p.db != nil {
		var cached tmdb.TVSeasonDetails
		found, err := db.GetMetadataCache(p.db, "tmdb-season-details", cacheKey, &cached)
		if err == nil && found {
			return cached, nil
		}
	}

	details, err := p.client.GetTVSeason(ctx, tvID, seasonNumber)
	if err == nil && p.db != nil {
		_ = db.UpsertMetadataCache(p.db, "tmdb-season-details", cacheKey, details, 7*24*time.Hour)
	}
	return details, err
}

func (p *TMDBProvider) GetProviderID() string {
	return "tmdb"
}

func (p *TMDBProvider) GetName() string {
	return "TMDB"
}

// SearchMedia searches TMDB for anime matching the query.
// It searches both TV and Movies and returns NormalizedMedia results.
func (p *TMDBProvider) SearchMedia(ctx context.Context, query string) ([]*dto.NormalizedMedia, error) {
	var results []*dto.NormalizedMedia

	// Search TV shows first (most anime are TV series)
	tvResults, tvErr := p.client.SearchTV(ctx, query)
	if tvErr == nil {
		for _, r := range tvResults {
			nm := TmdbTVResultToNormalizedMedia(r)
			results = append(results, nm)
		}
	}

	// Also search movies
	movieResults, movieErr := p.client.SearchMovie(ctx, query)
	if movieErr == nil {
		for _, r := range movieResults {
			nm := TmdbMovieResultToNormalizedMedia(r)
			results = append(results, nm)
		}
	}

	if len(results) == 0 {
		// Report the most relevant error
		if tvErr != nil && !errors.Is(tvErr, ErrNotFound) {
			return nil, fmt.Errorf("no results found for query %q: TV search: %w", query, tvErr)
		}
		if movieErr != nil && !errors.Is(movieErr, ErrNotFound) {
			return nil, fmt.Errorf("no results found for query %q: Movie search: %w", query, movieErr)
		}
		return nil, ErrNotFound
	}

	return results, nil
}

func (p *TMDBProvider) SearchTV(ctx context.Context, query string) ([]*dto.NormalizedMedia, error) {
	var results []*dto.NormalizedMedia
	tvResults, err := p.client.SearchTV(ctx, query)
	if err == nil {
		for _, r := range tvResults {
			nm := TmdbTVResultToNormalizedMedia(r)
			results = append(results, nm)
		}
		if len(results) == 0 {
			return nil, ErrNotFound
		}
		return results, nil
	}
	return nil, err
}

func (p *TMDBProvider) SearchMovie(ctx context.Context, query string) ([]*dto.NormalizedMedia, error) {
	var results []*dto.NormalizedMedia
	movieResults, err := p.client.SearchMovie(ctx, query)
	if err == nil {
		for _, r := range movieResults {
			nm := TmdbMovieResultToNormalizedMedia(r)
			results = append(results, nm)
		}
		if len(results) == 0 {
			return nil, ErrNotFound
		}
		return results, nil
	}
	return nil, err
}

// GetMediaDetails fetches full details for a specific TMDB media.
func (p *TMDBProvider) GetMediaDetails(ctx context.Context, id string) (*dto.NormalizedMedia, error) {
	// 1. Check persistent cache
	if p.db != nil {
		var cached dto.NormalizedMedia
		found, err := db.GetMetadataCache(p.db, "tmdb-media-details", id, &cached)
		if err == nil && found {
			return &cached, nil
		}
	}

	// If it's a number, try to determine if it's TV or Movie based on offset
	if numID, err := strconv.Atoi(id); err == nil {
		if numID >= constants.MovieIDOffset {
			// Movie
			realID := numID - constants.MovieIDOffset
			movieRes, err := p.client.GetMovieDetails(ctx, strconv.Itoa(realID))
			if err == nil {
				res := TmdbMovieDetailsToNormalizedMedia(movieRes)
				if p.db != nil {
					_ = db.UpsertMetadataCache(p.db, "tmdb-media-details", id, res, 7*24*time.Hour)
				}
				return res, nil
			}
		} else if numID > 0 {
			// TV
			tvRes, err := p.client.GetTVDetails(ctx, id)
			if err == nil {
				res := TmdbTVDetailsToNormalizedMedia(tvRes)
				if p.db != nil {
					_ = db.UpsertMetadataCache(p.db, "tmdb-media-details", id, res, 7*24*time.Hour)
				}
				return res, nil
			}
		}
		// If it's negative, it might be an old cached ID. Try to handle it by stripping the sign.
		if numID < 0 {
			posID := -numID
			if posID >= 1000000 {
				realID := posID - 1000000
				movieRes, err := p.client.GetMovieDetails(ctx, strconv.Itoa(realID))
				if err == nil {
					return TmdbMovieDetailsToNormalizedMedia(movieRes), nil
				}
			} else {
				tvRes, err := p.client.GetTVDetails(ctx, strconv.Itoa(posID))
				if err == nil {
					return TmdbTVDetailsToNormalizedMedia(tvRes), nil
				}
			}
		}
	}

	// Try TV first
	tvRes, tvErr := p.client.GetTVDetails(ctx, id)
	if tvErr == nil {
		nm := TmdbTVDetailsToNormalizedMedia(tvRes)
		return nm, nil
	}

	// Try Movie next
	movieRes, movieErr := p.client.GetMovieDetails(ctx, id)
	if movieErr == nil {
		nm := TmdbMovieDetailsToNormalizedMedia(movieRes)
		return nm, nil
	}

	// If neither worked, determine if it was an actual API error (like 401) or just 404
	if strings.Contains(tvErr.Error(), "status code: 404") && strings.Contains(movieErr.Error(), "status code: 404") {
		return nil, ErrNotFound
	}

	// Return the actual error to avoid swallowing 401 Unauthorized or network errors
	return nil, fmt.Errorf("TMDB fetch failed. TV err: %v, Movie err: %v", tvErr, movieErr)
}

// GetClient returns the underlying TMDB client for direct API access.
func (p *TMDBProvider) GetClient() *tmdb.Client {
	return p.client
}

// TmdbTVResultToNormalizedMedia converts a TMDB TV SearchResult to NormalizedMedia.
func TmdbTVResultToNormalizedMedia(r tmdb.SearchResult) *dto.NormalizedMedia {
	tmdbID := r.ID
	title := &dto.NormalizedMediaTitle{}
	if r.Name != "" {
		title.English = &r.Name
		title.Spanish = &r.Name
		title.UserPreferred = &r.Name
	}
	if r.OriginalName != "" && r.OriginalName != r.Name {
		title.Romaji = &r.OriginalName
		if r.OriginalLanguage == "ja" {
			title.Native = &r.OriginalName
		}
	}

	var year *int
	if r.FirstAirDate != "" && len(r.FirstAirDate) >= 4 {
		y := 0
		fmt.Sscanf(r.FirstAirDate[:4], "%d", &y)
		if y > 0 { year = &y }
	}

	var startDate *dto.NormalizedMediaDate
	if r.FirstAirDate != "" { startDate = parseTMDBDate(r.FirstAirDate) }

	tvFormat := dto.MediaFormatTV
	format := &tvFormat

	var coverImage *dto.NormalizedMediaCoverImage
	if r.PosterPath != "" {
		url := "https://image.tmdb.org/t/p/w780" + r.PosterPath
		coverImage = &dto.NormalizedMediaCoverImage{Large: &url, ExtraLarge: &url}
	}

	var bannerImage *string
	if r.BackdropPath != "" {
		url := "https://image.tmdb.org/t/p/original" + r.BackdropPath
		bannerImage = &url
	}

	var description *string
	if r.Overview != "" { description = &r.Overview }

	var episodes *int
	if r.NumberOfEpisodes > 0 { episodes = &r.NumberOfEpisodes }

	var score *float64
	if r.VoteAverage > 0 {
		s := r.VoteAverage * 10
		score = &s
	}

	return &dto.NormalizedMedia{
		ID:               tmdbID,
		TmdbID:           &tmdbID,
		ExplicitProvider: "tmdb",
		ExplicitID:       strconv.Itoa(tmdbID),
		Title:            title,
		Format:           format,
		Year:             year,
		StartDate:        startDate,
		Episodes:         episodes,
		CoverImage:       coverImage,
		BannerImage:      bannerImage,
		Description:      description,
		Score:            score,
	}
}

// TmdbTVDetailsToNormalizedMedia converts full TMDB TVDetails to NormalizedMedia.
func TmdbTVDetailsToNormalizedMedia(r *tmdb.TVDetails) *dto.NormalizedMedia {
	tmdbID := r.ID
	title := &dto.NormalizedMediaTitle{}
	if r.Name != "" {
		title.English = &r.Name
		title.Spanish = &r.Name
		title.UserPreferred = &r.Name
	}
	if r.OriginalName != "" && r.OriginalName != r.Name {
		title.Romaji = &r.OriginalName
		if r.OriginalLanguage == "ja" {
			title.Native = &r.OriginalName
		}
	}

	var year *int
	if r.FirstAirDate != "" && len(r.FirstAirDate) >= 4 {
		y := 0
		fmt.Sscanf(r.FirstAirDate[:4], "%d", &y)
		if y > 0 { year = &y }
	}

	var startDate *dto.NormalizedMediaDate
	if r.FirstAirDate != "" { startDate = parseTMDBDate(r.FirstAirDate) }

	tvFormat := dto.MediaFormatTV
	format := &tvFormat

	var coverImage *dto.NormalizedMediaCoverImage
	if r.PosterPath != "" {
		url := "https://image.tmdb.org/t/p/w780" + r.PosterPath
		coverImage = &dto.NormalizedMediaCoverImage{Large: &url, ExtraLarge: &url}
	}

	var bannerImage *string
	if r.BackdropPath != "" {
		url := "https://image.tmdb.org/t/p/original" + r.BackdropPath
		bannerImage = &url
	}

	var description *string
	if r.Overview != "" { description = &r.Overview }

	var episodes *int
	if r.NumberOfEpisodes > 0 { episodes = &r.NumberOfEpisodes }

	var score *float64
	if r.VoteAverage > 0 {
		s := r.VoteAverage * 10
		score = &s
	}

	var genres []*string
	for _, g := range r.Genres {
		name := g.Name
		genres = append(genres, &name)
	}

	return &dto.NormalizedMedia{
		ID:               tmdbID,
		TmdbID:           &tmdbID,
		ExplicitProvider: "tmdb",
		ExplicitID:       strconv.Itoa(tmdbID),
		Title:            title,
		Format:           format,
		Year:             year,
		StartDate:        startDate,
		Episodes:         episodes,
		CoverImage:       coverImage,
		BannerImage:      bannerImage,
		Description:      description,
		Score:            score,
		Genres:           genres,
		Runtime: func() *int {
			if len(r.EpisodeRunTime) > 0 {
				return &r.EpisodeRunTime[0]
			}
			return nil
		}(),
	}
}

// TmdbMovieResultToNormalizedMedia converts a TMDB Movie SearchResult to NormalizedMedia.
func TmdbMovieResultToNormalizedMedia(r tmdb.SearchResult) *dto.NormalizedMedia {
	tmdbID := r.ID
	title := &dto.NormalizedMediaTitle{}
	if r.Title != "" {
		title.English = &r.Title
		title.Spanish = &r.Title
		title.UserPreferred = &r.Title
	}
	if r.OriginalTitle != "" && r.OriginalTitle != r.Title {
		title.Romaji = &r.OriginalTitle
		if r.OriginalLanguage == "ja" {
			title.Native = &r.OriginalTitle
		}
	}

	var year *int
	if r.ReleaseDate != "" && len(r.ReleaseDate) >= 4 {
		y := 0
		fmt.Sscanf(r.ReleaseDate[:4], "%d", &y)
		if y > 0 { year = &y }
	}

	var startDate *dto.NormalizedMediaDate
	if r.ReleaseDate != "" { startDate = parseTMDBDate(r.ReleaseDate) }

	movieFormat := dto.MediaFormatMovie
	format := &movieFormat

	var coverImage *dto.NormalizedMediaCoverImage
	if r.PosterPath != "" {
		url := "https://image.tmdb.org/t/p/w780" + r.PosterPath
		coverImage = &dto.NormalizedMediaCoverImage{Large: &url, ExtraLarge: &url}
	}

	var bannerImage *string
	if r.BackdropPath != "" {
		url := "https://image.tmdb.org/t/p/original" + r.BackdropPath
		bannerImage = &url
	}

	var description *string
	if r.Overview != "" { description = &r.Overview }

	var score *float64
	if r.VoteAverage > 0 {
		s := r.VoteAverage * 10
		score = &s
	}

	return &dto.NormalizedMedia{
		ID:               tmdbID + 1000000,
		TmdbID:           &tmdbID,
		ExplicitProvider: "tmdb",
		ExplicitID:       strconv.Itoa(tmdbID),
		Title:            title,
		Format:           format,
		Year:             year,
		StartDate:        startDate,
		CoverImage:       coverImage,
		BannerImage:      bannerImage,
		Description:      description,
		Score:            score,
	}
}

// TmdbMovieDetailsToNormalizedMedia converts full TMDB MovieDetails to NormalizedMedia.
func TmdbMovieDetailsToNormalizedMedia(r *tmdb.MovieDetails) *dto.NormalizedMedia {
	tmdbID := r.ID
	title := &dto.NormalizedMediaTitle{}
	if r.Title != "" {
		title.English = &r.Title
		title.Spanish = &r.Title
		title.UserPreferred = &r.Title
	}
	if r.OriginalTitle != "" && r.OriginalTitle != r.Title {
		title.Romaji = &r.OriginalTitle
		if r.OriginalLanguage == "ja" {
			title.Native = &r.OriginalTitle
		}
	}

	var year *int
	if r.ReleaseDate != "" && len(r.ReleaseDate) >= 4 {
		y := 0
		fmt.Sscanf(r.ReleaseDate[:4], "%d", &y)
		if y > 0 { year = &y }
	}

	var startDate *dto.NormalizedMediaDate
	if r.ReleaseDate != "" { startDate = parseTMDBDate(r.ReleaseDate) }

	movieFormat := dto.MediaFormatMovie
	format := &movieFormat

	var coverImage *dto.NormalizedMediaCoverImage
	if r.PosterPath != "" {
		url := "https://image.tmdb.org/t/p/w780" + r.PosterPath
		coverImage = &dto.NormalizedMediaCoverImage{Large: &url, ExtraLarge: &url}
	}

	var bannerImage *string
	if r.BackdropPath != "" {
		url := "https://image.tmdb.org/t/p/original" + r.BackdropPath
		bannerImage = &url
	}

	var description *string
	if r.Overview != "" { description = &r.Overview }

	var score *float64
	if r.VoteAverage > 0 {
		s := r.VoteAverage * 10
		score = &s
	}

	var genres []*string
	for _, g := range r.Genres {
		name := g.Name
		genres = append(genres, &name)
	}

	return &dto.NormalizedMedia{
		ID:               tmdbID + 1000000,
		TmdbID:           &tmdbID,
		ExplicitProvider: "tmdb",
		ExplicitID:       strconv.Itoa(tmdbID),
		Title:            title,
		Format:           format,
		Year:             year,
		StartDate:        startDate,
		CoverImage:       coverImage,
		BannerImage:      bannerImage,
		Description:      description,
		Score:            score,
		Genres:           genres,
		Runtime: func() *int {
			if r.Runtime > 0 {
				return &r.Runtime
			}
			return nil
		}(),
	}
}

// parseTMDBDate parses a TMDB date string (YYYY-MM-DD) into NormalizedMediaDate.
func parseTMDBDate(dateStr string) *dto.NormalizedMediaDate {
	parts := strings.Split(dateStr, "-")
	date := &dto.NormalizedMediaDate{}

	if len(parts) >= 1 {
		y := 0
		fmt.Sscanf(parts[0], "%d", &y)
		if y > 0 {
			date.Year = &y
		}
	}
	if len(parts) >= 2 {
		m := 0
		fmt.Sscanf(parts[1], "%d", &m)
		if m > 0 {
			date.Month = &m
		}
	}
	if len(parts) >= 3 {
		d := 0
		fmt.Sscanf(parts[2], "%d", &d)
		if d > 0 {
			date.Day = &d
		}
	}

	return date
}
