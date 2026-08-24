package scanner

import (
	"kamehouse/internal/database/models/dto"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// FolderInfo contains metadata extracted from the folder structure (Kodi/Standard style).
type FolderInfo struct {
	SeriesName       string // e.g. "Dragon Ball Z"
	Year             int    // e.g. 1989 (0 if not found)
	Season           int    // e.g. 2 (0 if not in a Season folder)
	IsMovie          bool   // true if detected as a movie
	ExplicitProvider string // e.g. "mal", "tmdb", "imdb"
	ExplicitID       string // e.g. "12345", "tt12345"
}

var (
	// Matches "Show Name (2023)" or "Show Name (2023) [tags]"
	reYearInFolder = regexp.MustCompile(`^(.+?)\s*\((\d{4})\)`)
	// Matches "Season 01", "Season 1", "S01", "S1", "Temp 01", "Temporada 1", "T01", "T1"
	reSeasonFolder = regexp.MustCompile(`(?i)^(?:season|s|temp|temporada|t)\s*0*(\d+)$`)
	// Matches Specials, Extras, OVA folders which resolve to Season 0
	reSpecialsFolder = regexp.MustCompile(`(?i)^(?:season\s*0+|s0+|temp\s*0+|temporada\s*0+|specials|extras|ovas?|oads?|nc|sp|cortos)$`)
	// Matches saga/arc subfolders like "1 - Saga El Gran Viaje", "02 - Saga Baby", "Saga Saiyajin", "Saga Freezer", "Saga Cell", "Saga Buu"
	reSagaFolder = regexp.MustCompile(`(?i)^(?:(?:\d+\s*[-–]\s*)?(?:saga|arco?|arc|part|parte)\s+|saga\b)`)
	// Extracts the leading number from saga folders
	reSagaNumber = regexp.MustCompile(`^(\d+)\s*[-–]`)
	// Matches movie filename like "Dragon Ball Z - La batalla (2013).mkv"
	reMovieFilename = regexp.MustCompile(`^(.+?)\s*\((\d{4})\)\.[a-zA-Z0-9]+$`)
	// Matches movie filename without year like "Dragon Ball GT- 100 Años Después.mkv"
	reMovieFilenameNoYear = regexp.MustCompile(`^(.+?)\.[a-zA-Z0-9]+$`)
	// Precompiled regexes for cleanMovieTitle
	reLeadingBracketTag  = regexp.MustCompile(`^\[[^\]]+\]\s*`)
	reCodecQualityTag    = regexp.MustCompile(`\s*[\[\(][^\]\)]*(?:x264|x265|h264|h265|hevc|aac|flac|bluray|bdrip|webrip|dvdrip|1080p|720p|480p|960p|4k|2160p|\d+[-:]\d+)[^\]\)]*[\]\)]\s*`)
	reTrailingResolution = regexp.MustCompile(`\s*\[\d+p\]\s*$`)

	knownCategoryFolders = map[string]struct{}{
		"anime": {}, "movies": {}, "peliculas": {}, "películas": {}, "films": {}, "series": {},
		"tv": {}, "tv shows": {}, "descargas": {}, "downloads": {}, "torrents": {}, "nuevos": {},
		"new": {}, "completos": {}, "complete": {}, "batch": {}, "otros": {}, "videos": {},
	}
)

// IsSeasonFolder returns true if the folder name is a season indicator.
func IsSeasonFolder(name string) bool {
	clean := strings.TrimSpace(name)
	return reSeasonFolder.MatchString(clean) || reSpecialsFolder.MatchString(clean)
}

// IsSagaFolder returns true if the folder name is a saga or arc indicator.
func IsSagaFolder(name string) bool {
	clean := strings.TrimSpace(name)
	return reSagaFolder.MatchString(clean)
}

// IsCategoryFolder returns true if the folder name is a generic media category folder.
func IsCategoryFolder(name string) bool {
	clean := strings.ToLower(strings.TrimSpace(name))
	if _, ok := knownCategoryFolders[clean]; ok {
		return true
	}
	if clean == "movies" || clean == "peliculas" || clean == "películas" || clean == "films" ||
		strings.Contains(clean, "movies") || strings.Contains(clean, "peliculas") || strings.Contains(clean, "películas") ||
		strings.Contains(clean, "pelis") {
		return true
	}
	return false
}

// IsSeasonOrSagaFolderName returns true if the folder represents a season, saga, special, or category.
func IsSeasonOrSagaFolderName(name string) bool {
	return IsSeasonFolder(name) || IsSagaFolder(name) || IsCategoryFolder(name)
}

// ParseFolderStructure extracts series name, year, and season from a file path
// using Kodi/Standard folder conventions.
//
// Supported structures:
//   - Library/Show Name (Year)/Season XX/episode.mkv
//   - Library/Show Name/Season XX/episode.mkv
//   - Library/Show Name/Saga XX/episode.mkv
//   - Library/Show Name (Year)/episode.mkv
//   - Library/Movies/Movie Name (Year)/movie.mkv
func ParseFolderStructure(filePath string, libraryPaths []string) *FolderInfo {
	info := &FolderInfo{}

	// Normalize the path
	absPath := filepath.Clean(filePath)
	filename := filepath.Base(absPath)
	dir := filepath.Dir(absPath)

	// Split the path into components
	parts := splitPath(dir)
	if len(parts) == 0 {
		return info
	}

	// Find the library root to determine the relative structure
	relParts := parts
	for _, libPath := range libraryPaths {
		cleanLib := filepath.Clean(libPath)
		libParts := splitPath(cleanLib)
		if len(libParts) > 0 && len(parts) > len(libParts) {
			// Check if the file path starts with this library path
			match := true
			for i, lp := range libParts {
				if !strings.EqualFold(parts[i], lp) {
					match = false
					break
				}
			}
			if match {
				relParts = parts[len(libParts):]
				break
			}
		}
	}

	if len(relParts) == 0 {
		return info
	}

	// Extract explicit provider ID if present anywhere in the path
	var tempMedia dto.NormalizedMedia
	ExtractExplicitProvider(filename, &tempMedia)
	if tempMedia.ExplicitProvider != "" {
		info.ExplicitProvider = tempMedia.ExplicitProvider
		info.ExplicitID = tempMedia.ExplicitID
	} else {
		for _, part := range relParts {
			ExtractExplicitProvider(part, &tempMedia)
			if tempMedia.ExplicitProvider != "" {
				info.ExplicitProvider = tempMedia.ExplicitProvider
				info.ExplicitID = tempMedia.ExplicitID
				break
			}
		}
	}

	// Detect movie based on folder name
	isInMovieCategory := false
	for _, part := range relParts {
		lower := strings.ToLower(strings.TrimSpace(part))
		if lower == "movies" || lower == "peliculas" || lower == "películas" || lower == "films" ||
			strings.Contains(lower, "movies") || strings.Contains(lower, "peliculas") || strings.Contains(lower, "películas") ||
			strings.Contains(lower, "pelis") {
			info.IsMovie = true
			isInMovieCategory = true
		}
	}

	// Count non-category folders to detect if file is directly in a category folder
	nonCategoryParts := 0
	for _, part := range relParts {
		if !IsCategoryFolder(part) {
			nonCategoryParts++
		}
	}

	// If movie file sits directly in a category folder (e.g., Peliculas/movie.mkv),
	// extract the title from the filename instead
	if isInMovieCategory && nonCategoryParts == 0 {
		info.IsMovie = true
		if m := reMovieFilename.FindStringSubmatch(filename); m != nil {
			info.SeriesName = cleanMovieTitle(m[1])
			info.Year, _ = strconv.Atoi(m[2])
		} else if m := reMovieFilenameNoYear.FindStringSubmatch(filename); m != nil {
			info.SeriesName = cleanMovieTitle(m[1])
		}
		return info
	}

	// Parse the relative path components
	for i, part := range relParts {
		// Check if this is a season folder
		if m := reSeasonFolder.FindStringSubmatch(part); m != nil {
			info.Season, _ = strconv.Atoi(m[1])
			continue
		}

		// Check if this is a specials/extras folder
		if reSpecialsFolder.MatchString(part) {
			info.Season = 0
			continue
		}

		// Check if this is a saga/arc subfolder
		if reSagaFolder.MatchString(part) {
			if sm := reSagaNumber.FindStringSubmatch(part); sm != nil {
				if num, err := strconv.Atoi(sm[1]); err == nil {
					info.Season = num
				}
			}
			continue
		}

		// Check if this is a series/movie folder with year
		if m := reYearInFolder.FindStringSubmatch(part); m != nil {
			// Only use the first non-category folder as the series name
			if info.SeriesName == "" {
				info.SeriesName = strings.TrimSpace(m[1])
				info.Year, _ = strconv.Atoi(m[2])
			}
			continue
		}

		// Skip known category folders
		if IsCategoryFolder(part) {
			continue
		}

		// First non-category, non-season, non-saga folder is the series name
		if info.SeriesName == "" && (i < len(relParts)-1 || len(relParts) == 1) {
			info.SeriesName = strings.TrimSpace(part)
		}
	}

	// Fallback: if no series name was found, use the first non-category component
	if info.SeriesName == "" && len(relParts) > 0 {
		for _, name := range relParts {
			if IsCategoryFolder(name) || IsSeasonFolder(name) {
				continue
			}
			if m := reYearInFolder.FindStringSubmatch(name); m != nil {
				info.SeriesName = strings.TrimSpace(m[1])
				info.Year, _ = strconv.Atoi(m[2])
			} else {
				info.SeriesName = strings.TrimSpace(name)
			}
			break
		}
	}

	if info.SeriesName != "" {
		info.SeriesName = cleanMovieTitle(info.SeriesName)
	}

	return info
}

// cleanMovieTitle cleans up a movie title extracted from a filename.
// Removes trailing hyphens/dashes, codec info, resolution tags, etc.
func cleanMovieTitle(title string) string {
	title = strings.TrimSpace(title)
	// Remove trailing dash or hyphen with optional whitespace
	title = strings.TrimRight(title, " -–")
	// Remove explicit provider tags
	title = ReExplicitProvider.ReplaceAllString(title, "")
	// Remove leading bracket tags (e.g., [Fansub])
	title = reLeadingBracketTag.ReplaceAllString(title, "")
	// Remove common codec/quality tags in brackets
	title = reCodecQualityTag.ReplaceAllString(title, "")
	// Remove resolution patterns like "[960p]" at the end
	title = reTrailingResolution.ReplaceAllString(title, "")
	title = strings.TrimSpace(title)
	title = strings.TrimRight(title, " -–")
	return title
}

// splitPath splits a file path into its individual directory components.
func splitPath(p string) []string {
	var parts []string
	for {
		dir, file := filepath.Split(filepath.Clean(p))
		if file == "" {
			if dir != "" {
				parts = append([]string{filepath.Clean(dir)}, parts...)
			}
			break
		}
		parts = append([]string{file}, parts...)
		if dir == p { // root
			break
		}
		p = dir
	}
	return parts
}
