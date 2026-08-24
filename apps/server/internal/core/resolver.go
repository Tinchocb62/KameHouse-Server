package core

import (
	"context"
	"fmt"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"kamehouse/internal/constants"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"github.com/rs/zerolog"
)

// ── Data Structures ──────────────────────────────────────────────────────────

type SourceType string

const (
	SourceTypeLocal SourceType = "Local"
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

// ResolveUnifiedMedia aggregates sources. mediaID should be the Platform ID (TMDb).
func (r *UnifiedResolver) ResolveUnifiedMedia(ctx context.Context, mediaID string, episode int, mediaType string) (*UnifiedResolutionResponse, error) {
	id, err := strconv.Atoi(mediaID)
	if err != nil {
		return nil, fmt.Errorf("invalid mediaID: %v", err)
	}

	// Local Files only
	sources := r.getLocalSources(id, episode)

	// Priority Sorting
	sortSources(sources)

	// Calculate AvailabilityType
	hasLocal := len(sources) > 0
	availabilityType := "ONLY_ONLINE"
	if hasLocal {
		availabilityType = "FULL_LOCAL"
	}

	// Resolve media title from the database (best-effort).
	title := fmt.Sprintf("Episode %d", episode)
	if id < 0 {
		var libMedia *models.LibraryMedia
		var err error
		tmdbID := -id
		if tmdbID >= constants.MovieIDOffset {
			libMedia, err = db.GetLibraryMediaByTmdbIdAndType(r.db, tmdbID-constants.MovieIDOffset, "MOVIE")
		} else {
			libMedia, err = db.GetLibraryMediaByTmdbIdAndType(r.db, tmdbID, "SHOW")
		}
		if err == nil && libMedia != nil {
			title = resolveTitle(libMedia, title)
		}
	} else {
		if libMedia, err := db.GetLibraryMediaByID(r.db, uint(id)); err == nil && libMedia != nil {
			title = resolveTitle(libMedia, title)
		}
	}

	return &UnifiedResolutionResponse{
		Title:            title,
		ID:               mediaID,
		AvailabilityType: availabilityType,
		Sources:          sources,
	}, nil
}

// ── Local Sources ────────────────────────────────────────────────────────────

func (r *UnifiedResolver) getLocalSources(mediaID int, episode int) []MediaSource {
	lfs, err := db.GetLocalFilesByMediaID(r.db, mediaID)
	if err != nil {
		return nil
	}

	var sources []MediaSource
	for _, lf := range lfs {
		if lf == nil || lf.Metadata == nil || lf.Metadata.Episode != episode {
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

// ── Sorting ──────────────────────────────────────────────────────────────────

// sortSources implementation for local-only sources:
// Rank 0: Local Files (Highest Priority)
func sortSources(sources []MediaSource) {
	sort.SliceStable(sources, func(i, j int) bool {
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

func resolveTitle(libMedia *models.LibraryMedia, defaultTitle string) string {
	if libMedia == nil {
		return defaultTitle
	}
	switch {
	case libMedia.TitleEnglish != "":
		return libMedia.TitleEnglish
	case libMedia.TitleRomaji != "":
		return libMedia.TitleRomaji
	case libMedia.TitleOriginal != "":
		return libMedia.TitleOriginal
	default:
		return defaultTitle
	}
}

