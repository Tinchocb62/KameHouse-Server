package torrentio

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"golang.org/x/sync/singleflight"
	"golang.org/x/time/rate"

	"kamehouse/internal/util/cache"
)

const (
	// defaultBaseURL is the public Torrentio endpoint pre-configured with
	// anime-focused sources and Latino/Japanese/Spanish audio tracks.
	//
	// IMPORTANT: The config segment (providers=...|language=...|...) uses raw pipe
	// and comma characters that Torrentio strict-matches. Do NOT pass this URL
	// through url.JoinPath or url.PathEscape — they will percent-encode | and ,
	// causing 404s from the upstream. Always use raw string concatenation.
	defaultBaseURL = "https://torrentio.strem.fun/providers=yts,eztv,rarbg,1337x,thepiratebay,kickasstorrents,torrentgalaxy,magnetdl,horriblesubs,nyaasi,tokyotosho,anidex,nekobt|language=latino,japanese,spanish|qualityfilter=hdrall,dolbyvision,dolbyvisionwithhdr,4k,1080p,720p,unknown|limit=2"

	// streamHTTPTimeout is the maximum round-trip for a single stream fetch.
	streamHTTPTimeout = 10 * time.Second

	// rateLimitRPS — sustained request rate (requests per second).
	rateLimitRPS = 1.0
	// rateLimitBurst — maximum burst allowed above the sustained rate.
	rateLimitBurst = 3

	// l1CacheTTL is the TTL for the in-memory stream result cache.
	// 4 hours prevents Cloudflare 429s on repeated episode queries.
	l1CacheTTL = 4 * time.Hour
)

// cleanBaseURL strips a trailing "/manifest.json" (or "/manifest.json?…") from
// rawURL and returns the bare configuration base path.
func cleanBaseURL(rawURL string) string {
	base, _, _ := strings.Cut(rawURL, "?")
	return strings.TrimSuffix(base, "/manifest.json")
}

// streamURL builds the raw stream endpoint for a given media type and Stremio ID.
func streamURL(baseURL, mediaType, stremioID string) string {
	var b strings.Builder
	b.Grow(len(baseURL) + 10 + len(mediaType) + len(stremioID))
	b.WriteString(baseURL)
	b.WriteString("/stream/")
	b.WriteString(mediaType)
	b.WriteByte('/')
	b.WriteString(stremioID)
	b.WriteString(".json")
	return b.String()
}

// Client wraps net/http with a token-bucket rate limiter, an L1 TTL cache, and
// a singleflight group that collapses concurrent requests for the same key into
// a single HTTP call — eliminating duplicate 429s on burst traffic.
type Client struct {
	httpClient  *http.Client
	rateLimiter *rate.Limiter
	baseURL     string // clean base — no trailing /manifest.json
	logger      *zerolog.Logger

	// l1 is the in-memory TTL cache keyed by "mediaType:stremioID".
	l1 *cache.Cache[[]torrentioStream]
	// sfGroup ensures only one HTTP call is made per key under concurrent load.
	sfGroup singleflight.Group
}

// newClient returns a Client using the built-in default Torrentio configuration.
func newClient(logger *zerolog.Logger) *Client {
	return newClientWithURL(defaultBaseURL, logger)
}

// newClientWithURL returns a Client whose base URL is derived from rawURL.
func newClientWithURL(rawURL string, logger *zerolog.Logger) *Client {
	return &Client{
		httpClient:  &http.Client{Timeout: streamHTTPTimeout},
		rateLimiter: rate.NewLimiter(rate.Limit(rateLimitRPS), rateLimitBurst),
		baseURL:     cleanBaseURL(rawURL),
		logger:      logger,
		l1:          cache.NewCache[[]torrentioStream](l1CacheTTL),
	}
}

// fetchStreams is the anime-specific shorthand using the Kitsu ID:episode scheme.
func (c *Client) fetchStreams(ctx context.Context, kitsuID int, episode int) (*torrentioResponse, error) {
	stremioID := fmt.Sprintf("%d:%d", kitsuID, episode)
	return c.fetchStreamsForID(ctx, "anime", stremioID)
}

// fetchStreamsForID fetches streams for any Stremio media type and pre-formatted ID.
// It checks the L1 cache first and uses singleflight to prevent duplicate HTTP calls.
func (c *Client) fetchStreamsForID(ctx context.Context, mediaType, stremioID string) (*torrentioResponse, error) {
	cacheKey := mediaType + ":" + stremioID

	// ── L1 Cache read (sub-µs) ────────────────────────────────────────────────
	if cached, ok := c.l1.Get(cacheKey); ok {
		c.logger.Debug().Str("key", cacheKey).Msg("torrentio: L1 cache hit")
		return &torrentioResponse{Streams: cached}, nil
	}

	// ── Singleflight — collapse concurrent misses to one HTTP call ────────────
	type result struct {
		resp *torrentioResponse
		err  error
	}

	v, err, _ := c.sfGroup.Do(cacheKey, func() (interface{}, error) {
		resp, err := c.doHTTP(ctx, mediaType, stremioID)
		if err != nil {
			return result{nil, err}, nil //nolint:nilerr — propagated via result
		}
		c.l1.Set(cacheKey, resp.Streams)
		return result{resp, nil}, nil
	})
	if err != nil {
		return nil, err
	}

	r := v.(result)
	return r.resp, r.err
}

// doHTTP performs the actual HTTP request (rate-limited).
func (c *Client) doHTTP(ctx context.Context, mediaType, stremioID string) (*torrentioResponse, error) {
	// ── Rate limiting ──────────────────────────────────────────────────────────
	if err := c.rateLimiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("torrentio: rate limiter cancelled: %w", err)
	}

	url := streamURL(c.baseURL, mediaType, stremioID)
	c.logger.Debug().Str("url", url).Msg("torrentio: HTTP fetch")

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("torrentio: build request: %w", err)
	}
	req.Header.Set("User-Agent", "KameHouse/1.0")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("torrentio: HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusTooManyRequests:
		return nil, fmt.Errorf("torrentio: rate-limited by upstream (HTTP 429)")
	case http.StatusOK:
	default:
		return nil, fmt.Errorf("torrentio: unexpected status %d for %s", resp.StatusCode, url)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, fmt.Errorf("torrentio: read body: %w", err)
	}

	var result torrentioResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("torrentio: decode JSON: %w", err)
	}

	c.logger.Debug().Int("count", len(result.Streams)).Msg("torrentio: streams received")
	return &result, nil
}
