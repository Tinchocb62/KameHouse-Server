package tmdb

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	httputil "kamehouse/internal/util/http"

	"golang.org/x/time/rate"
)

// Cache defines the interface for persistent caching of TMDb API responses.
type Cache interface {
	Get(key string, out interface{}) (bool, error)
	Set(key string, value interface{}, ttl time.Duration) error
}

// Client handles TMDb API requests with caching using the new EdgeHTTPClient.
type Client struct {
	bearerToken     string
	language        string
	cache           sync.Map // simple in-memory cache for search results
	persistentCache Cache    // persistent SQL-backed cache
	limiter         *rate.Limiter
	httpClient      *http.Client
}

// language is a BCP 47 language tag (e.g. "es-MX", "en-US"). If empty, defaults to "es-MX".
func NewClient(bearerToken string, language ...string) *Client {
	lang := "es-MX"
	if len(language) > 0 && language[0] != "" {
		lang = language[0]
	}
	return &Client{
		bearerToken: bearerToken,
		language:    lang,
		limiter:     rate.NewLimiter(rate.Limit(30), 10), // 30 req/sec, burst of 10
		httpClient:  httputil.NewFastClient(),
	}
}

// SetPersistentCache assigns a persistent cache backend to the client.
func (c *Client) SetPersistentCache(pc Cache) {
	c.persistentCache = pc
}

// GetCached attempts to retrieve a value from the persistent cache first, falling back to the in-memory cache.
func GetCached[T any](c *Client, key string) (T, bool) {
	var zero T
	if c.persistentCache != nil {
		var val T
		if ok, err := c.persistentCache.Get(key, &val); ok && err == nil {
			return val, true
		}
	}
	if cached, ok := c.cache.Load(key); ok {
		if val, assertOk := cached.(T); assertOk {
			return val, true
		}
	}
	return zero, false
}

// SetCached stores a value in both the in-memory cache and the persistent cache (if available).
func SetCached[T any](c *Client, key string, value T, ttl time.Duration) {
	if c.persistentCache != nil {
		_ = c.persistentCache.Set(key, value, ttl)
	}
	c.cache.Store(key, value)
}

// GetClient returns the client instance itself (provided for compatibility/easier access)
func (c *Client) GetClient() *Client {
	return c
}

func executeWithRetry[T any](ctx context.Context, c *Client, endpoint string) (*T, error) {
	client := c.httpClient
	if client == nil {
		client = httputil.NewFastClient()
	}
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
		// Dynamically handle both v3 and v4 tokens
		token := strings.Trim(c.bearerToken, " \t\r\n\"'")
		if token != "" {
			if len(token) > 50 {
				// It's a v4 Read Access Token (JWT) -> use Bearer Auth
				req.Header.Set("Authorization", "Bearer "+token)
			} else {
				// It's a v3 API Key -> inject into query string
				q := req.URL.Query()
				q.Add("api_key", token)
				req.URL.RawQuery = q.Encode()
			}
		}

		if err := c.limiter.Wait(ctx); err != nil {
			return nil, err
		}
		resp, err := client.Do(req)

		if err != nil {
			lastErr = err
			waitTime := time.Duration(math.Pow(2, float64(attempt))) * time.Second
			select {
			case <-time.After(waitTime):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
			continue
		}

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
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

			lastErr = fmt.Errorf("retriable status code: %d", resp.StatusCode)
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
