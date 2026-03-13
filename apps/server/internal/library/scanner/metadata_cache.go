package scanner

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"kamehouse/internal/database/models/dto"
	librarymetadata "kamehouse/internal/library/metadata"
	"kamehouse/internal/util/limiter"

	"github.com/rs/zerolog/log"
	"golang.org/x/sync/singleflight"
)

// ─────────────────────────────────────────────────────────────────────────────
// metadataFetchCache — per-scan, in-memory, concurrent-safe metadata cache.
//
// Lifecycle: Create one per Scan() call, discard after. Contains no global
// state so it is naturally garbage-collected once the scan goroutine exits.
//
// Concurrency model:
//   - singleflight.Group collapses concurrent requests for the same title into
//     one outbound HTTP call. Workers 2-N block until worker 1 completes and
//     then receive the shared *dto.NormalizedMedia.
//   - sync.Map stores completed results so subsequent calls for the same title
//     skip the provider round-trip entirely.
// ─────────────────────────────────────────────────────────────────────────────

// metadataFetchCache wraps singleflight + sync.Map for deduplicated, cached
// external metadata lookups during a single scanner pass.
type metadataFetchCache struct {
	sf    singleflight.Group
	cache sync.Map // key: normalised title → *dto.NormalizedMedia
}

// newMetadataFetchCache returns a zero-value, ready-to-use cache.
// Allocate one per Scan() invocation; discard after the scan completes.
func newMetadataFetchCache() *metadataFetchCache {
	return &metadataFetchCache{}
}

// cacheKey normalises a title string into a stable lookup key.
// Lower-case + trim so "Attack on Titan" and "attack on titan" share an entry.
func cacheKey(title string) string {
	return strings.ToLower(strings.TrimSpace(title))
}

// Lookup attempts to retrieve a cached result, returning (entry, true) if found.
func (c *metadataFetchCache) Lookup(title string) (*dto.NormalizedMedia, bool) {
	v, ok := c.cache.Load(cacheKey(title))
	if !ok {
		return nil, false
	}
	return v.(*dto.NormalizedMedia), true
}

// FetchOnce ensures exactly ONE outbound provider call is made per unique title
// across all concurrently running workers.
//
// Algorithm:
//  1. Check the local cache (sync.Map) — cache hit: return immediately.
//  2. Deduplicate concurrent callers via singleflight — only the first goroutine
//     makes the HTTP call; others await the result.
//  3. On success, store the result in sync.Map for future callers.
//  4. HTTP 429 responses are retried with exponential back-off (1s → 2s → 4s)
//     up to 3 attempts before propagating the error.
func (c *metadataFetchCache) FetchOnce(
	ctx context.Context,
	title string,
	providers []librarymetadata.Provider,
	limiter *limiter.Limiter,
) (*dto.NormalizedMedia, error) {
	key := cacheKey(title)

	// Fast-path: already resolved by a previous worker.
	if cached, ok := c.cache.Load(key); ok {
		return cached.(*dto.NormalizedMedia), nil
	}

	// Deduplicate: collapse N concurrent requests for `key` into one HTTP call.
	v, err, _ := c.sf.Do(key, func() (interface{}, error) {
		// Re-check cache inside singleflight in case it was populated while
		// this goroutine was waiting for the group lock.
		if cached, ok := c.cache.Load(key); ok {
			return cached.(*dto.NormalizedMedia), nil
		}

		var result *dto.NormalizedMedia
		orderedProviders := orderProviders(providers)
		if len(orderedProviders) == 0 {
			return nil, nil
		}

		log.Debug().
			Str("title", title).
			Strs("providers", orderedProviderIDs(orderedProviders)).
			Msg("metadata cache: provider order")

		for _, provider := range orderedProviders {
			var searchRes []*dto.NormalizedMedia
			providerID := strings.ToLower(provider.GetProviderID())

			// Exponential back-off for HTTP 429 from the external provider.
			retryErr := retryWithBackoff(ctx, 3, func() error {
				var err error
				// Global Rate Limit block to smoothly ride out bursts
				if limiter != nil {
					if err := limiter.Wait(ctx); err != nil {
						return err
					}
				}
				searchRes, err = provider.SearchMedia(ctx, title)
				if err != nil && errors.Is(err, librarymetadata.ErrNotFound) {
					return nil
				}
				return err
			})
			if retryErr != nil || len(searchRes) == 0 {
				continue // try next provider
			}

			if providerID == "tmdb" || providerID == "anidb" {
				best, score := pickBestCandidate(title, searchRes)
				if best == nil || score < 0.75 {
					continue
				}
				if providerID == "tmdb" {
					if best.TmdbId == nil {
						continue
					}
					anilistID, err := mapAniListIDFromTMDB(ctx, *best.TmdbId)
					if err != nil || anilistID <= 0 {
						continue
					}
					best.ID = anilistID
				} else {
					anidbID := best.ID
					anilistID, err := mapAniListIDFromAniDB(ctx, anidbID)
					if err != nil || anilistID <= 0 {
						continue
					}
					best.ID = anilistID
				}
				result = best
				break
			}

			result = searchRes[0]
			break
		}

		if result == nil {
			// Nothing found — return nil without caching so future calls can retry.
			return nil, nil
		}

		// Store in sync.Map before returning from singleflight so waiting
		// goroutines skip the provider round-trip on their next request.
		c.cache.Store(key, result)
		return result, nil
	})

	if err != nil {
		return nil, err
	}
	if v == nil {
		return nil, nil
	}
	return v.(*dto.NormalizedMedia), nil
}

// Clear releases all cached entries. Call after the scan pipeline completes to
// allow GC to reclaim the cached NormalizedMedia structs.
func (c *metadataFetchCache) Clear() {
	c.cache.Range(func(k, _ any) bool {
		c.cache.Delete(k)
		return true
	})
}

var providerOrder = []string{"tmdb", "anidb", "anilist"}

func orderProviders(providers []librarymetadata.Provider) []librarymetadata.Provider {
	byID := make(map[string]librarymetadata.Provider, len(providers))
	for _, p := range providers {
		if p == nil {
			continue
		}
		byID[strings.ToLower(p.GetProviderID())] = p
	}

	ordered := make([]librarymetadata.Provider, 0, len(providers))
	seen := make(map[string]struct{}, len(providers))
	for _, id := range providerOrder {
		if p, ok := byID[id]; ok {
			ordered = append(ordered, p)
			seen[id] = struct{}{}
		}
	}

	for id, p := range byID {
		if _, ok := seen[id]; ok {
			continue
		}
		ordered = append(ordered, p)
	}

	return ordered
}

func orderedProviderIDs(providers []librarymetadata.Provider) []string {
	out := make([]string, 0, len(providers))
	for _, p := range providers {
		if p == nil {
			continue
		}
		out = append(out, strings.ToLower(p.GetProviderID()))
	}
	return out
}

func pickBestCandidate(query string, candidates []*dto.NormalizedMedia) (*dto.NormalizedMedia, float64) {
	bestScore := 0.0
	var best *dto.NormalizedMedia
	for _, c := range candidates {
		score := confidenceScore(query, c)
		if score > bestScore {
			bestScore = score
			best = c
		}
	}
	return best, bestScore
}

func confidenceScore(query string, media *dto.NormalizedMedia) float64 {
	if media == nil {
		return 0
	}
	queryNorm := normalizeTitle(stripYear(query))
	if queryNorm == "" {
		return 0
	}

	candidates := candidateTitles(media)
	best := 0.0
	for _, t := range candidates {
		if t == "" {
			continue
		}
		score := dice(queryNorm, normalizeTitle(t))
		if score > best {
			best = score
		}
	}

	// Penalize year mismatch if a year exists in the query and media has a year.
	queryYear := extractYearMetadata(query)
	mediaYear := getMediaYear(media)
	if queryYear > 0 && mediaYear > 0 && queryYear != mediaYear {
		best *= 0.6
	}

	return best
}

func candidateTitles(media *dto.NormalizedMedia) []string {
	out := make([]string, 0, 8)
	if media.Title != nil {
		if media.Title.Romaji != nil {
			out = append(out, *media.Title.Romaji)
		}
		if media.Title.English != nil {
			out = append(out, *media.Title.English)
		}
		if media.Title.Native != nil {
			out = append(out, *media.Title.Native)
		}
		if media.Title.UserPreferred != nil {
			out = append(out, *media.Title.UserPreferred)
		}
	}
	for _, s := range media.Synonyms {
		if s != nil {
			out = append(out, *s)
		}
	}
	return out
}

func getMediaYear(media *dto.NormalizedMedia) int {
	if media == nil {
		return 0
	}
	if media.Year != nil && *media.Year > 0 {
		return *media.Year
	}
	if media.StartDate != nil && media.StartDate.Year != nil {
		return *media.StartDate.Year
	}
	return 0
}

var reYearMetadata = regexp.MustCompile(`\b((?:19|20)\d{2})\b`)

func extractYearMetadata(s string) int {
	if loc := reYearMetadata.FindStringSubmatch(s); len(loc) > 1 {
		if y, err := strconv.Atoi(loc[1]); err == nil {
			return y
		}
	}
	return 0
}

func stripYear(s string) string {
	if reYearMetadata.MatchString(s) {
		return strings.TrimSpace(reYearMetadata.ReplaceAllString(s, ""))
	}
	return s
}

func normalizeTitle(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "" {
		return ""
	}
	var b strings.Builder
	b.Grow(len(s))
	lastSpace := false
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			lastSpace = false
			continue
		}
		if !lastSpace {
			b.WriteByte(' ')
			lastSpace = true
		}
	}
	return strings.TrimSpace(b.String())
}

func dice(a, b string) float64 {
	if a == "" || b == "" {
		return 0
	}
	if a == b {
		return 1
	}
	ba := bigrams(a)
	bb := bigrams(b)
	if len(ba) == 0 || len(bb) == 0 {
		if strings.Contains(a, b) || strings.Contains(b, a) {
			return 0.85
		}
		return 0
	}
	used := make(map[int]bool, len(bb))
	intersection := 0
	for _, x := range ba {
		for i, y := range bb {
			if used[i] {
				continue
			}
			if x == y {
				intersection++
				used[i] = true
				break
			}
		}
	}
	return (2.0 * float64(intersection)) / float64(len(ba)+len(bb))
}

func bigrams(s string) []string {
	runes := []rune(s)
	if len(runes) < 2 {
		return nil
	}
	out := make([]string, 0, len(runes)-1)
	for i := 0; i < len(runes)-1; i++ {
		out = append(out, string(runes[i:i+2]))
	}
	return out
}

// ─────────────────────────────────────────────────────────────────────────────
// retryWithBackoffDuration is an alias for use by external callers that need
// a configurable initial delay (tests, etc.). The scanner uses retryWithBackoff
// defined in media_fetcher.go (initial delay = 1 s).
// ─────────────────────────────────────────────────────────────────────────────

// retryProviderCall wraps a provider call with 429-aware exponential backoff
// and a hard context deadline so a hung upstream cannot stall the scanner
// indefinitely.
func retryProviderCall(
	ctx context.Context,
	maxAttempts int,
	initialDelay time.Duration,
	fn func() error,
) error {
	delay := initialDelay
	for attempt := 0; attempt < maxAttempts; attempt++ {
		if err := ctx.Err(); err != nil {
			return err
		}
		err := fn()
		if err == nil {
			return nil
		}
		if !strings.Contains(err.Error(), "429") {
			return err // non-rate-limit errors are not retried
		}
		if attempt == maxAttempts-1 {
			return errRateLimited
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
			delay *= 2
		}
	}
	return errRateLimited
}
