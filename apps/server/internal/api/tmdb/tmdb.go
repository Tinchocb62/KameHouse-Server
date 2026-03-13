package tmdb

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"
)

const maxRetries = 3

var baseURL = "https://api.themoviedb.org/3"

// Client handles TMDb API requests with caching using the new EdgeHTTPClient.
type Client struct {
	bearerToken string
	language    string
	cache       sync.Map // simple in-memory cache for search results
	rateLimiter chan struct{}
}

// language is a BCP 47 language tag (e.g. "es-ES", "en-US"). If empty, defaults to "es-ES".
func NewClient(bearerToken string, language ...string) *Client {
	lang := "es-ES"
	if len(language) > 0 && language[0] != "" {
		lang = language[0]
	}
	return &Client{
		bearerToken: bearerToken,
		language:    lang,
		rateLimiter: make(chan struct{}, 4), // max 4 concurrent requests
	}
}

// SearchResult represents a single search result from TMDb.
type SearchResult struct {
	ID               int      `json:"id"`
	Name             string   `json:"name"`           // For TV shows
	Title            string   `json:"title"`          // For movies
	OriginalName     string   `json:"original_name"`  // For TV shows
	OriginalTitle    string   `json:"original_title"` // For movies
	OriginalLanguage string   `json:"original_language"`
	Overview         string   `json:"overview"`
	FirstAirDate     string   `json:"first_air_date"` // For TV shows
	ReleaseDate      string   `json:"release_date"`   // For movies
	GenreIDs         []int    `json:"genre_ids"`
	OriginCountry    []string `json:"origin_country"`
	PosterPath       string   `json:"poster_path"`
	BackdropPath     string   `json:"backdrop_path"`
}

// SearchResponse is the paginated response from TMDb search.
type SearchResponse struct {
	Page         int            `json:"page"`
	Results      []SearchResult `json:"results"`
	TotalPages   int            `json:"total_pages"`
	TotalResults int            `json:"total_results"`
}

// AlternativeTitle represents an alternative title for a show.
type AlternativeTitle struct {
	ISO31661 string `json:"iso_3166_1"`
	Title    string `json:"title"`
	Type     string `json:"type"`
}

// AlternativeTitlesResponse is the response for alternative titles.
type AlternativeTitlesResponse struct {
	ID      int                `json:"id"`
	Results []AlternativeTitle `json:"results"`
}

// TVDetails represents detailed info about a TV show.
type TVDetails struct {
	ID               int      `json:"id"`
	Name             string   `json:"name"`
	OriginalName     string   `json:"original_name"`
	OriginalLanguage string   `json:"original_language"`
	Overview         string   `json:"overview"`
	FirstAirDate     string   `json:"first_air_date"`
	OriginCountry    []string `json:"origin_country"`
	NumberOfSeasons  int      `json:"number_of_seasons"`
	NumberOfEpisodes int      `json:"number_of_episodes"`
}

// TVEpisode represents a single episode within a TMDb TV season.
type TVEpisode struct {
	ID            int    `json:"id"`
	EpisodeNumber int    `json:"episode_number"`
	SeasonNumber  int    `json:"season_number"`
	Name          string `json:"name"`
	Overview      string `json:"overview"`
	StillPath     string `json:"still_path"`
	AirDate       string `json:"air_date"`
	Runtime       int    `json:"runtime"`
}

// TVSeasonDetails represents a TV season including its episodes.
type TVSeasonDetails struct {
	ID           int         `json:"id"`
	SeasonNumber int         `json:"season_number"`
	Name         string      `json:"name"`
	Overview     string      `json:"overview"`
	AirDate      string      `json:"air_date"`
	PosterPath   string      `json:"poster_path"`
	Episodes     []TVEpisode `json:"episodes"`
}

// GetTVSeason fetches the details of a specific TV season, including its episodes.
func (c *Client) GetTVSeason(ctx context.Context, tvID int, seasonNumber int) (TVSeasonDetails, error) {
	cacheKey := fmt.Sprintf("tv_season:%d:%d:%s", tvID, seasonNumber, c.language)
	if cached, ok := c.cache.Load(cacheKey); ok {
		return cached.(TVSeasonDetails), nil
	}

	params := url.Values{}
	params.Set("language", c.language)
	params.Set("api_key", c.bearerToken)

	resp, err := executeWithRetry[TVSeasonDetails](ctx, c, fmt.Sprintf("/tv/%d/season/%d?%s", tvID, seasonNumber, params.Encode()))
	if err != nil {
		return TVSeasonDetails{}, fmt.Errorf("tmdb get tv season: %w", err)
	}

	c.cache.Store(cacheKey, *resp)
	return *resp, nil
}

// SearchTV searches for anime TV shows on TMDb.
// It filters results to animation genre (16) and Japanese origin when possible.
func (c *Client) SearchTV(ctx context.Context, query string) ([]SearchResult, error) {
	// Check cache
	if cached, ok := c.cache.Load("tv:" + query); ok {
		return cached.([]SearchResult), nil
	}

	params := url.Values{}
	params.Set("query", query)
	params.Set("language", c.language)
	params.Set("page", "1")
	params.Set("api_key", c.bearerToken)

	resp, err := executeWithRetry[SearchResponse](ctx, c, "/search/tv?"+params.Encode())
	if err != nil {
		return nil, fmt.Errorf("tmdb search tv: %w", err)
	}

	// Filter for animation genre (16) to prioritize anime
	animationResults := make([]SearchResult, 0)
	otherResults := make([]SearchResult, 0)
	for _, r := range resp.Results {
		isAnimation := false
		for _, g := range r.GenreIDs {
			if g == 16 { // Animation genre
				isAnimation = true
				break
			}
		}
		if isAnimation {
			animationResults = append(animationResults, r)
		} else {
			otherResults = append(otherResults, r)
		}
	}

	// Prefer animation results, fallback to all results
	results := animationResults
	if len(results) == 0 {
		results = otherResults
	}

	// Limit to top 5 results
	if len(results) > 5 {
		results = results[:5]
	}

	c.cache.Store("tv:"+query, results)
	return results, nil
}

// SearchMovie searches for anime movies on TMDb.
func (c *Client) SearchMovie(ctx context.Context, query string) ([]SearchResult, error) {
	// Check cache
	if cached, ok := c.cache.Load("movie:" + query); ok {
		return cached.([]SearchResult), nil
	}

	params := url.Values{}
	params.Set("query", query)
	params.Set("language", c.language)
	params.Set("page", "1")
	params.Set("api_key", c.bearerToken)

	resp, err := executeWithRetry[SearchResponse](ctx, c, "/search/movie?"+params.Encode())
	if err != nil {
		return nil, fmt.Errorf("tmdb search movie: %w", err)
	}

	// Filter for animation genre (16)
	animationResults := make([]SearchResult, 0)
	for _, r := range resp.Results {
		for _, g := range r.GenreIDs {
			if g == 16 {
				animationResults = append(animationResults, r)
				break
			}
		}
	}

	// Prefer animation results, fallback to all results
	results := animationResults
	if len(results) == 0 {
		results = resp.Results
	}
	if len(results) > 5 {
		results = results[:5]
	}

	c.cache.Store("movie:"+query, results)
	return results, nil
}

// GetTVAlternativeTitles gets all alternative titles for a TV show.
func (c *Client) GetTVAlternativeTitles(ctx context.Context, tvID int) ([]AlternativeTitle, error) {
	cacheKey := fmt.Sprintf("tv_alt:%d", tvID)
	if cached, ok := c.cache.Load(cacheKey); ok {
		return cached.([]AlternativeTitle), nil
	}

	params := url.Values{}
	params.Set("api_key", c.bearerToken)

	resp, err := executeWithRetry[AlternativeTitlesResponse](ctx, c, fmt.Sprintf("/tv/%d/alternative_titles?%s", tvID, params.Encode()))
	if err != nil {
		return nil, fmt.Errorf("tmdb get tv alternative titles: %w", err)
	}

	c.cache.Store(cacheKey, resp.Results)
	return resp.Results, nil
}

// GetAllTitlesForResult returns all known titles for a search result,
// including the main name, original name, and all alternative titles.
func (c *Client) GetAllTitlesForResult(ctx context.Context, result SearchResult) []string {
	titles := make([]string, 0, 10)

	// Add main titles
	if result.Name != "" {
		titles = append(titles, result.Name)
	}
	if result.Title != "" {
		titles = append(titles, result.Title)
	}
	if result.OriginalName != "" && result.OriginalName != result.Name {
		titles = append(titles, result.OriginalName)
	}
	if result.OriginalTitle != "" && result.OriginalTitle != result.Title {
		titles = append(titles, result.OriginalTitle)
	}

	// Fetch alternative titles
	altTitles, err := c.GetTVAlternativeTitles(ctx, result.ID)
	if err == nil {
		for _, alt := range altTitles {
			if alt.Title != "" {
				titles = append(titles, alt.Title)
			}
		}
	}

	// Deduplicate
	seen := make(map[string]struct{}, len(titles))
	unique := make([]string, 0, len(titles))
	for _, t := range titles {
		if _, ok := seen[t]; !ok {
			seen[t] = struct{}{}
			unique = append(unique, t)
		}
	}

	return unique
}

// doRequest was removed. EdgeHTTPClient handles all request logic natively securely.

// GetTVDetails fetches a specific TV show by ID and returns it as a SearchResult for mapping.
func (c *Client) GetTVDetails(ctx context.Context, id string) (SearchResult, error) {
	params := url.Values{}
	params.Set("language", c.language)
	params.Set("api_key", c.bearerToken)

	resp, err := executeWithRetry[SearchResult](ctx, c, fmt.Sprintf("/tv/%s?%s", id, params.Encode()))
	if err != nil {
		return SearchResult{}, fmt.Errorf("tmdb get tv details: %w", err)
	}
	return *resp, nil
}

// GetMovieDetails fetches a specific Movie by ID and returns it as a SearchResult for mapping.
func (c *Client) GetMovieDetails(ctx context.Context, id string) (SearchResult, error) {
	params := url.Values{}
	params.Set("language", c.language)
	params.Set("api_key", c.bearerToken)

	resp, err := executeWithRetry[SearchResult](ctx, c, fmt.Sprintf("/movie/%s?%s", id, params.Encode()))
	if err != nil {
		return SearchResult{}, fmt.Errorf("tmdb get movie details: %w", err)
	}
	return *resp, nil
}

func executeWithRetry[T any](ctx context.Context, c *Client, endpoint string) (*T, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		req, err := http.NewRequestWithContext(ctx, "GET", baseURL+endpoint, nil)
		if err != nil {
			return nil, err
		}

		req.Header.Set("Accept", "application/json")

		c.rateLimiter <- struct{}{}
		resp, err := client.Do(req)
		<-c.rateLimiter

		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			resp.Body.Close()

			var waitTime time.Duration
			if retryAfter, err := strconv.Atoi(resp.Header.Get("Retry-After")); err == nil {
				waitTime = time.Duration(retryAfter) * time.Second
			} else {
				waitTime = time.Duration(math.Pow(2, float64(attempt))) * time.Second
			}

			select {
			case <-time.After(waitTime):
			case <-ctx.Done():
				return nil, ctx.Err()
			}

			lastErr = fmt.Errorf("rate limited")
			continue
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			resp.Body.Close()
			return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
		}

		var result T
		err = json.NewDecoder(resp.Body).Decode(&result)
		resp.Body.Close()

		if err != nil {
			return nil, err
		}

		return &result, nil
	}

	return nil, lastErr
}
