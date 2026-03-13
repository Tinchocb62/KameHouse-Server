package core

import (
	"context"
	"fmt"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"kamehouse/internal/api/anizip"
	"kamehouse/internal/database/db"
	torrentio "kamehouse/internal/onlinestream/providers/torrentio"

	"github.com/rs/zerolog"
)

// ── Data Structures ──────────────────────────────────────────────────────────

type SourceType string

const (
	SourceTypeLocal   SourceType = "Local"
	SourceTypeDebrid  SourceType = "Debrid"
	SourceTypeTorrent SourceType = "Torrent"
)

type MediaSource struct {
	URLPath    string     `json:"urlPath"`
	Type       SourceType `json:"type"`
	Quality    string     `json:"quality"`
	Resolution int        `json:"resolution"`
	Provider   string     `json:"provider"`
	Size       int64      `json:"size"`
	Seeders    int        `json:"seeders"`
	Rank       int        `json:"rank"`
}

type UnifiedResolutionResponse struct {
	Title            string        `json:"title"`
	ID               string        `json:"id"`
	AvailabilityType string        `json:"availabilityType"` // "FULL_LOCAL", "HYBRID", "ONLY_ONLINE"
	Sources          []MediaSource `json:"sources"`
}

// ── Resolver Implementation ──────────────────────────────────────────────────

type UnifiedResolver struct {
	db     *db.Database
	logger *zerolog.Logger
}

func NewUnifiedResolver(database *db.Database, logger *zerolog.Logger) *UnifiedResolver {
	return &UnifiedResolver{db: database, logger: logger}
}

// ResolveUnifiedMedia aggregates sources. mediaID should be the AniList ID.
func (r *UnifiedResolver) ResolveUnifiedMedia(ctx context.Context, mediaID string, episode int, mediaType string) (*UnifiedResolutionResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3500*time.Millisecond)
	defer cancel()

	id, err := strconv.Atoi(mediaID)
	if err != nil {
		return nil, fmt.Errorf("invalid mediaID: %v", err)
	}

	var (
		mu      sync.Mutex
		sources []MediaSource
		wg      sync.WaitGroup
	)

	// Step 1: Local Files (Instantaneous via DB)
	localFiles := r.getLocalSources(id, episode)
	sources = append(sources, localFiles...)

	// ID Mapping Bridge: Translate AniList -> IMDB/Kitsu for external addons
	imdbID, kitsuID := r.translateAniListIDs(id)

	// Step 2: External Streams (Torrentio / Debrid) Concurrent Fetch
	wg.Add(1)
	go func() {
		defer wg.Done()

		// If kitsuID is available, use legacy GetStreams. Alternatively IMDB if using Provider generic IDs.
		if kitsuID > 0 {
			extSources := r.getTorrentioSources(ctx, kitsuID, episode)
			mu.Lock()
			sources = append(sources, extSources...)
			mu.Unlock()
		} else if imdbID != "" {
			// Fallback placeholder
		}
	}()

	wg.Wait()

	// Step 3: Priority Sorting
	sortSources(sources)

	// Calculate AvailabilityType
	hasLocal := false
	hasOnline := false
	for _, s := range sources {
		if s.Type == "Local" {
			hasLocal = true
		} else {
			hasOnline = true
		}
	}

	availabilityType := "ONLY_ONLINE"
	if hasLocal && hasOnline {
		availabilityType = "HYBRID"
	} else if hasLocal {
		availabilityType = "FULL_LOCAL"
	}

	return &UnifiedResolutionResponse{
		Title:            fmt.Sprintf("Media %s - Ep %d", mediaID, episode),
		ID:               mediaID,
		AvailabilityType: availabilityType,
		Sources:          sources,
	}, nil
}

// ── ID Mapping Bridge ────────────────────────────────────────────────────────

// translateAniListIDs maps AniList ID to IMDB and Kitsu using AniZip API.
func (r *UnifiedResolver) translateAniListIDs(anilistID int) (imdbID string, kitsuID int) {
	media, err := anizip.FetchAniZipMedia("anilist", anilistID)
	if err != nil || media == nil || media.Mappings == nil {
		return "", 0
	}
	return media.Mappings.ImdbID, media.Mappings.KitsuID
}

// ── Local Sources ────────────────────────────────────────────────────────────

func (r *UnifiedResolver) getLocalSources(mediaID int, episode int) []MediaSource {
	lfs, _, err := db.GetLocalFiles(r.db)
	if err != nil {
		return nil
	}

	var sources []MediaSource
	for _, lf := range lfs {
		if lf == nil || lf.MediaId != mediaID || lf.Metadata == nil || lf.Metadata.Episode != episode {
			continue
		}
		quality := inferQuality(lf.Path)
		res := inferResolution(quality)
		sources = append(sources, MediaSource{
			URLPath:    lf.Path,
			Type:       SourceTypeLocal,
			Quality:    quality,
			Resolution: res,
			Provider:   "KameHouse",
			Seeders:    0,
			Rank:       0, // Highest priority
		})
	}
	return sources
}

// ── External Sources ─────────────────────────────────────────────────────────

func (r *UnifiedResolver) getTorrentioSources(ctx context.Context, kitsuID int, episode int) []MediaSource {
	provider := torrentio.NewProvider(r.logger)
	streams, err := provider.GetStreams(ctx, kitsuID, episode)
	if err != nil {
		return nil
	}

	var sources []MediaSource
	for _, s := range streams {
		sourceType := SourceTypeTorrent
		rank := 2
		if isDebridURL(s.MagnetURI) {
			sourceType = SourceTypeDebrid
			rank = 1
		}

		seeders := extractSeeders(s.Title)
		res := inferResolution(s.Quality)

		sources = append(sources, MediaSource{
			URLPath:    s.MagnetURI,
			Type:       sourceType,
			Quality:    s.Quality,
			Resolution: res,
			Provider:   "Torrentio",
			Seeders:    seeders,
			Rank:       rank,
		})
	}
	return sources
}

// ── Sorting ──────────────────────────────────────────────────────────────────

// sortSources implements the Hybrid Sorting Algorithm:
// Rank 0: Local Files (Highest Priority)
// Rank 1: Debrid-cached streams (Sorted by Resolution DESC)
// Rank 2: P2P Torrents (Sorted by Seeders DESC)
func sortSources(sources []MediaSource) {
	sort.SliceStable(sources, func(i, j int) bool {
		if sources[i].Rank != sources[j].Rank {
			return sources[i].Rank < sources[j].Rank
		}
		if sources[i].Rank == 1 {
			return sources[i].Resolution > sources[j].Resolution
		}
		if sources[i].Rank == 2 {
			return sources[i].Seeders > sources[j].Seeders
		}
		return sources[i].Resolution > sources[j].Resolution
	})
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func inferResolution(quality string) int {
	q := strings.ToLower(quality)
	switch {
	case strings.Contains(q, "2160") || strings.Contains(q, "4k"):
		return 2160
	case strings.Contains(q, "1080"):
		return 1080
	case strings.Contains(q, "720"):
		return 720
	case strings.Contains(q, "480"):
		return 480
	}
	return 0
}

func inferQuality(path string) string {
	name := strings.ToLower(filepath.Base(path))
	switch {
	case strings.Contains(name, "2160") || strings.Contains(name, "4k"):
		return "4K"
	case strings.Contains(name, "1080"):
		return "1080p"
	case strings.Contains(name, "720"):
		return "720p"
	case strings.Contains(name, "480"):
		return "480p"
	}
	return "unknown"
}

func isDebridURL(url string) bool {
	return strings.Contains(url, "real-debrid") || strings.Contains(url, "alldebrid") || strings.Contains(url, "premiumize")
}

func extractSeeders(title string) int {
	// Torrentio titles often have format "... \n👥 42 ⬇️ 17 ..."
	// We'll search for "👥 " or fallback regex-like parsing.
	idx := strings.Index(title, "👥 ")
	if idx == -1 {
		return 0
	}

	part := title[idx+len("👥 "):]
	spaceIdx := strings.Index(part, " ")
	if spaceIdx != -1 {
		part = part[:spaceIdx]
	}

	seeders, _ := strconv.Atoi(part)
	return seeders
}
