package metadata

import (
	"compress/gzip"
	"context"
	"encoding/gob"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/util/httpclient"

	"github.com/rs/zerolog"
	"go.felesatra.moe/anidb"
)

const (
	aniDBTitlesURL    = "http://anidb.net/api/anime-titles.xml.gz"
	aniDBDefaultCache = "cache/anidb_titles.gob"
)

type (
	aniDBTitleEntry struct {
		AID   int
		Title string
		Norm  string
		Lang  string
		Type  string
	}

	// AniDBProvider implements Provider using the AniDB title dump.
	AniDBProvider struct {
		cachePath string
		logger    *zerolog.Logger
		client    *http.Client

		loaded bool
		titles []anidb.AnimeT
		flat   []aniDBTitleEntry
		mu     sync.Mutex
	}
)

// NewAniDBProvider creates a new AniDB provider using the title dump cache.
// If cachePath is empty, it defaults to "cache/anidb_titles.gob".
func NewAniDBProvider(cachePath string, logger *zerolog.Logger) *AniDBProvider {
	if cachePath == "" {
		cachePath = aniDBDefaultCache
	}
	return &AniDBProvider{
		cachePath: filepath.Clean(cachePath),
		logger:    logger,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (p *AniDBProvider) GetProviderID() string {
	return "anidb"
}

func (p *AniDBProvider) GetName() string {
	return "AniDB"
}

func (p *AniDBProvider) SearchMedia(ctx context.Context, query string) ([]*dto.NormalizedMedia, error) {
	if err := p.ensureTitles(ctx); err != nil {
		return nil, err
	}

	normalizedQuery := normalizeTitle(stripYear(query))
	if normalizedQuery == "" {
		return nil, ErrNotFound
	}

	bestScore := 0.0
	bestAid := 0
	bestTitle := ""

	for _, entry := range p.flat {
		score := dice(normalizedQuery, entry.Norm)
		if score > bestScore {
			bestScore = score
			bestAid = entry.AID
			bestTitle = entry.Title
		}
	}

	if bestAid == 0 || bestScore < 0.75 {
		return nil, ErrNotFound
	}

	media := p.buildNormalizedMedia(bestAid, bestTitle)
	if media == nil {
		return nil, ErrNotFound
	}
	return []*dto.NormalizedMedia{media}, nil
}

func (p *AniDBProvider) GetMediaDetails(ctx context.Context, id string) (*dto.NormalizedMedia, error) {
	if err := p.ensureTitles(ctx); err != nil {
		return nil, err
	}
	aid, err := strconv.Atoi(id)
	if err != nil || aid <= 0 {
		return nil, ErrNotFound
	}
	media := p.buildNormalizedMedia(aid, "")
	if media == nil {
		return nil, ErrNotFound
	}
	return media, nil
}

func (p *AniDBProvider) ensureTitles(ctx context.Context) error {
	p.mu.Lock()
	if p.loaded {
		p.mu.Unlock()
		return nil
	}
	p.mu.Unlock()

	titles, err := p.loadTitlesFromCache()
	if err != nil || len(titles) == 0 {
		titles, err = p.downloadTitles(ctx)
		if err != nil {
			return err
		}
		_ = p.saveTitlesToCache(titles)
	}

	flat := make([]aniDBTitleEntry, 0, len(titles)*3)
	for _, t := range titles {
		for _, title := range t.Titles {
			entry := aniDBTitleEntry{
				AID:   t.AID,
				Title: title.Name,
				Norm:  normalizeTitle(title.Name),
				Lang:  title.Lang,
				Type:  title.Type,
			}
			if entry.Norm != "" {
				flat = append(flat, entry)
			}
		}
	}

	p.mu.Lock()
	p.titles = titles
	p.flat = flat
	p.loaded = true
	p.mu.Unlock()

	if p.logger != nil {
		p.logger.Debug().Int("titles", len(titles)).Msg("anidb provider: titles cache loaded")
	}
	return nil
}

func (p *AniDBProvider) loadTitlesFromCache() ([]anidb.AnimeT, error) {
	f, err := os.Open(p.cachePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var titles []anidb.AnimeT
	if err := gob.NewDecoder(f).Decode(&titles); err != nil {
		return nil, err
	}
	return titles, nil
}

func (p *AniDBProvider) saveTitlesToCache(titles []anidb.AnimeT) error {
	if err := os.MkdirAll(filepath.Dir(p.cachePath), 0777); err != nil {
		return err
	}
	f, err := os.Create(p.cachePath)
	if err != nil {
		return err
	}
	defer f.Close()

	return gob.NewEncoder(f).Encode(titles)
}

func (p *AniDBProvider) downloadTitles(ctx context.Context) ([]anidb.AnimeT, error) {
	var lastErr error
	delay := time.Second

	for attempt := 0; attempt < 3; attempt++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		req, err := http.NewRequestWithContext(ctx, "GET", aniDBTitlesURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("User-Agent", "KameHouse/1.0")

		resp, err := p.client.Do(req)
		if err != nil {
			lastErr = err
		} else if resp != nil {
			if resp.StatusCode == http.StatusTooManyRequests {
				resp.Body.Close()
				if attempt == 2 {
					return nil, errors.New("anidb rate limited")
				}
				retryAfter, ok := httpclient.ParseRetryAfter(resp.Header, time.Now())
				if !ok {
					retryAfter = delay
					delay *= 2
				}
				sleepWithContext(ctx, retryAfter)
				continue
			}
			if resp.StatusCode < 200 || resp.StatusCode >= 300 {
				resp.Body.Close()
				return nil, fmt.Errorf("anidb titles status %d", resp.StatusCode)
			}

			reader, err := gzip.NewReader(resp.Body)
			if err != nil {
				lastErr = err
				resp.Body.Close()
			} else {
				payload, err := io.ReadAll(reader)
				reader.Close()
				resp.Body.Close()
				if err != nil {
					lastErr = err
				} else {
					titles, err := decodeAniDBTitles(payload)
					if err != nil {
						lastErr = err
					} else {
						lastErr = nil
						p.mu.Lock()
						p.titles = titles
						p.mu.Unlock()
					}
				}
			}
		}

		if lastErr == nil {
			return p.titles, nil
		}

		if attempt < 2 {
			sleepWithContext(ctx, delay)
			delay *= 2
		}
	}

	return nil, lastErr
}

func decodeAniDBTitles(payload []byte) ([]anidb.AnimeT, error) {
	return anidb.DecodeTitles(payload)
}

func (p *AniDBProvider) buildNormalizedMedia(aid int, matchedTitle string) *dto.NormalizedMedia {
	var titles []anidb.Title
	for _, t := range p.titles {
		if t.AID == aid {
			titles = t.Titles
			break
		}
	}
	if len(titles) == 0 {
		return nil
	}

	var english, romaji, native string
	synonyms := make([]*string, 0, len(titles))
	seen := make(map[string]struct{}, len(titles))

	for _, t := range titles {
		name := strings.TrimSpace(t.Name)
		if name == "" {
			continue
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		synonyms = append(synonyms, &name)

		switch t.Lang {
		case "en":
			if english == "" {
				english = name
			}
		case "x-jat":
			if romaji == "" {
				romaji = name
			}
		case "ja":
			if native == "" {
				native = name
			}
		}
	}

	title := &dto.NormalizedMediaTitle{}
	if english != "" {
		title.English = &english
		title.UserPreferred = &english
	}
	if romaji != "" {
		title.Romaji = &romaji
		if title.UserPreferred == nil {
			title.UserPreferred = &romaji
		}
	}
	if native != "" {
		title.Native = &native
		if title.UserPreferred == nil {
			title.UserPreferred = &native
		}
	}
	if matchedTitle != "" {
		mt := matchedTitle
		title.UserPreferred = &mt
	}

	return &dto.NormalizedMedia{
		ID:               aid,
		ExplicitProvider: "anidb",
		ExplicitID:       strconv.Itoa(aid),
		Title:            title,
		Synonyms:         synonyms,
	}
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

func stripYear(s string) string {
	parts := strings.Fields(s)
	kept := make([]string, 0, len(parts))
	for _, p := range parts {
		if len(p) == 4 {
			if year, err := strconv.Atoi(p); err == nil && year >= 1900 && year <= 2099 {
				continue
			}
		}
		kept = append(kept, p)
	}
	return strings.Join(kept, " ")
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

func sleepWithContext(ctx context.Context, d time.Duration) {
	if d <= 0 {
		return
	}
	select {
	case <-ctx.Done():
		return
	case <-time.After(d):
		return
	}
}
