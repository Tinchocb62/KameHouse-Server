package handlers

import (
	"context"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"kamehouse/internal/api/jikan"
	"kamehouse/internal/api/tmdb"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/library/anime"
	librarymetadata "kamehouse/internal/library/metadata"
	"kamehouse/internal/platforms/platform"

	"github.com/rs/zerolog"
)

// SettingsCache provides in-memory caching for application settings to reduce repeated database calls.
// It stores the settings and can be invalidated when settings are updated.
type SettingsCache struct {
	settingsMutex sync.RWMutex
	settings     *models.Settings
	settingsTime time.Time
}

func (c *SettingsCache) GetSettings(database *db.Database) (*models.Settings, error) {
	c.settingsMutex.RLock()
	if c.settings != nil {
		c.settingsMutex.RUnlock()
		return c.settings, nil
	}
	c.settingsMutex.RUnlock()

	c.settingsMutex.Lock()
	defer c.settingsMutex.Unlock()

	if c.settings != nil {
		return c.settings, nil
	}

	var settings models.Settings
	err := database.Gorm().Where("id = ?", 1).First(&settings).Error
	if err != nil {
		return nil, err
	}
	c.settings = &settings
	c.settingsTime = time.Now()
	return &settings, nil
}

func (c *SettingsCache) Invalidate() {
	c.settingsMutex.Lock()
	defer c.settingsMutex.Unlock()
	c.settings = nil
}

// GlobalSettingsCache is the centralized instance for application settings.
var GlobalSettingsCache = &SettingsCache{}

func getActiveProvider(settings *models.Settings, dbInstance *db.Database, logger *zerolog.Logger) librarymetadata.Provider {
	var useTMDB bool
	var tmdbToken string
	var tmdbLanguage string
	if settings != nil {
		useTMDB = settings.Library.ScannerProvider == "tmdb" || settings.Library.ScannerProvider == ""
		tmdbToken = settings.Library.TmdbApiKey
		tmdbLanguage = settings.Library.TmdbLanguage
	}
	if tmdbToken == "" {
		tmdbToken = os.Getenv("KAMEHOUSE_TMDB_TOKEN")
	}

	if useTMDB && tmdbToken != "" {
		if tmdbLanguage == "" || tmdbLanguage == "en" || tmdbLanguage == "es" {
			tmdbLanguage = "es-MX"
		}
		return librarymetadata.NewTMDBProvider(tmdbToken, dbInstance, tmdbLanguage)
	}

	// Fallback to Jikan provider when TMDB token is not present
	return librarymetadata.NewJikanProvider(dbInstance, logger)
}

// enrichEpisodesWithTMDB fetches episode-level metadata from TMDB or Jikan and fills in
// any fields that AniDB/Animap left empty (title, overview/summary, still image, runtime).
// Supports multi-season series by fetching all available seasons in parallel.
// This is purely additive — never overwrites existing non-empty values.
func (h *Handler) enrichEpisodesWithTMDB(ctx context.Context, entry *anime.Entry, settings *models.Settings) {
	if entry == nil || entry.Media == nil || (entry.Media.TmdbID == 0 && entry.Media.MyanimelistId == 0) {
		return
	}
	if len(entry.Episodes) == 0 {
		return
	}

	// Skip fetch when all episodes already have image and overview from the primary provider.
	allComplete := true
	for _, ep := range entry.Episodes {
		if ep == nil {
			continue
		}
		md := ep.EpisodeMetadata
		if md == nil || !md.HasImage || md.Overview == "" {
			allComplete = false
			break
		}
	}
	if allComplete {
		h.App.Logger.Debug().
			Int("tmdbID", entry.Media.TmdbID).
			Int("malID", entry.Media.MyanimelistId).
			Int("episodeCount", len(entry.Episodes)).
			Msg("enrichEpisodesWithTMDB: skipped — episodes complete")
		return
	}

	h.App.Logger.Debug().
		Int("tmdbID", entry.Media.TmdbID).
		Int("malID", entry.Media.MyanimelistId).
		Msg("enrichEpisodesWithTMDB: starting enrichment")

	provider := getActiveProvider(settings, h.App.Database, h.App.Logger)
	if provider == nil {
		return
	}
	tmdbID := entry.Media.TmdbID

	// Determine the number of seasons we need to cover.
	maxEp := 0
	for _, ep := range entry.Episodes {
		if ep != nil && ep.EpisodeNumber > maxEp {
			maxEp = ep.EpisodeNumber
		}
	}

	if maxEp == 0 {
		return
	}

	// If it's a movie, handle differently
	if entry.Media.Format == string(platform.MediaFormatMovie) {
		lookUpID := strconv.Itoa(tmdbID + 1000000)
		if tmdbID == 0 && entry.Media.MyanimelistId > 0 {
			lookUpID = strconv.Itoa(entry.Media.MyanimelistId)
		}
		movie, err := provider.GetMediaDetails(ctx, lookUpID)
		if err == nil && movie != nil {
			for i := range entry.Episodes {
				if entry.Episodes[i].EpisodeMetadata == nil {
					entry.Episodes[i].EpisodeMetadata = &anime.EpisodeMetadata{}
				}
				md := entry.Episodes[i].EpisodeMetadata
				if md.Summary == "" && movie.Description != nil {
					md.Summary = *movie.Description
					md.Overview = *movie.Description
				}
				if !md.HasImage && movie.CoverImage != nil && movie.CoverImage.Large != nil {
					md.Image = *movie.CoverImage.Large
					md.HasImage = true
				}
			}
		}
		return
	}

	// Fetch Season 1 baseline if using TMDBProvider specifically
	tmdbProvider, ok := provider.(*librarymetadata.TMDBProvider)
	if !ok || tmdbID == 0 {
		// Fallback to Jikan for episode list enrichment
		malID := entry.Media.MyanimelistId
		if malID > 0 {
			jClient := jikan.NewClient(h.App.Logger)
			if epList, err := jClient.GetAnimeEpisodes(ctx, malID); err == nil && epList != nil {
				jEpMap := make(map[int]string)
				jSynMap := make(map[int]string)
				jAirMap := make(map[int]string)
				for _, epData := range epList.Data {
					jEpMap[epData.Episode] = epData.Title
					jSynMap[epData.Episode] = epData.Synopsis
					jAirMap[epData.Episode] = epData.Aired
				}
				for i := range entry.Episodes {
					ep := entry.Episodes[i]
					if ep == nil {
						continue
					}
					if ep.EpisodeMetadata == nil {
						entry.Episodes[i].EpisodeMetadata = &anime.EpisodeMetadata{}
					}
					md := entry.Episodes[i].EpisodeMetadata
					if t, ok := jEpMap[ep.EpisodeNumber]; ok && t != "" {
						if md.Title == "" {
							md.Title = t
						}
						if entry.Episodes[i].EpisodeTitle == "" {
							entry.Episodes[i].EpisodeTitle = t
						}
					}
					if syn, ok := jSynMap[ep.EpisodeNumber]; ok && syn != "" {
						if md.Overview == "" {
							md.Overview = syn
						}
						if md.Summary == "" {
							md.Summary = syn
						}
					}
					if air, ok := jAirMap[ep.EpisodeNumber]; ok && air != "" {
						if md.AirDate == "" {
							md.AirDate = air
						}
					}
				}
			}
		}
		return
	}

	s1, err := tmdbProvider.GetTVSeason(ctx, tmdbID, 1)
	if err != nil {
		h.App.Logger.Warn().Err(err).Int("tmdbID", tmdbID).Msg("enrichEpisodesWithTMDB: could not fetch TMDB season 1")
		return
	}

	numSeasonsNeeded := 1
	if len(s1.Episodes) > 0 && maxEp > len(s1.Episodes) {
		numSeasonsNeeded = (maxEp / len(s1.Episodes)) + 1
		if numSeasonsNeeded > 15 {
			numSeasonsNeeded = 15
		}
	}

	epMap := make(map[int]tmdb.TVEpisode)
	offset := 0

	addSeason := func(season tmdb.TVSeasonDetails) {
		for _, te := range season.Episodes {
			absNum := offset + te.EpisodeNumber
			epMap[absNum] = te
		}
		offset += len(season.Episodes)
	}
	addSeason(s1)

	if numSeasonsNeeded > 1 {
		type seasonResult struct {
			season tmdb.TVSeasonDetails
			num    int
			err    error
		}
		ch := make(chan seasonResult, numSeasonsNeeded-1)
		for sn := 2; sn <= numSeasonsNeeded; sn++ {
			go func(seasonNum int) {
				s, e := tmdbProvider.GetTVSeason(ctx, tmdbID, seasonNum)
				ch <- seasonResult{season: s, num: seasonNum, err: e}
			}(sn)
		}

		results := make([]seasonResult, 0, numSeasonsNeeded-1)
		for i := 0; i < numSeasonsNeeded-1; i++ {
			results = append(results, <-ch)
		}
		sort.Slice(results, func(i, j int) bool {
			return results[i].num < results[j].num
		})
		for _, r := range results {
			if r.err == nil {
				addSeason(r.season)
			}
		}
	}

	const imgBase = "https://image.tmdb.org/t/p/w500"

	for i := range entry.Episodes {
		ep := entry.Episodes[i]
		if ep == nil {
			continue
		}
		te, ok := epMap[ep.AbsoluteEpisodeNumber]
		if !ok {
			continue
		}

		if ep.EpisodeMetadata == nil {
			entry.Episodes[i].EpisodeMetadata = &anime.EpisodeMetadata{}
		}
		md := entry.Episodes[i].EpisodeMetadata

		if te.Name != "" {
			if md.Title == "" {
				md.Title = te.Name
			}
			if entry.Episodes[i].EpisodeTitle == "" {
				entry.Episodes[i].EpisodeTitle = te.Name
			}
		}

		if md.Summary == "" && te.Overview != "" {
			md.Summary = te.Overview
		}
		if md.Overview == "" && te.Overview != "" {
			md.Overview = te.Overview
		}

		if !md.HasImage && te.StillPath != "" {
			md.Image = imgBase + te.StillPath
			md.HasImage = true
		}

		if md.Length == 0 && te.Runtime > 0 {
			md.Length = te.Runtime
		}

		if md.AirDate == "" && te.AirDate != "" {
			md.AirDate = te.AirDate
		}
	}

	h.App.Logger.Debug().
		Int("tmdbID", tmdbID).
		Int("mapped", len(epMap)).
		Msg("enrichEpisodesWithTMDB: complete")
}

// isBrokenImageURL returns true if the given URL is clearly an invalid / placeholder path that
// will return a 404. These are short filename-style hashes (e.g. "daima_poster.jpg",
// "bardock_poster.jpg") that were hardcoded without a real TMDB hash, or genuinely empty strings.
func isBrokenImageURL(url string) bool {
	if url == "" {
		return true
	}
	// Real TMDB image hashes are 24–30 hex-like characters followed by .jpg / .png.
	// Placeholder filenames typically contain underscores and are much shorter.
	// Quick heuristic: flag any TMDB CDN URL whose filename looks like a placeholder.
	placeholders := []string{
		"daima_poster", "daima_banner",
		"bardock_poster", "bardock_banner",
		"trunks_future", "deadzone",
		"broly_poster", "superhero_poster",
	}
	for _, p := range placeholders {
		if len(url) > 0 && containsStr(url, p) {
			return true
		}
	}
	return false
}

func containsStr(s, substr string) bool {
	return strings.Contains(s, substr)
}

// enrichMediaWithTMDB fetches series-level metadata from TMDB or Jikan API if the local metadata or poster is missing/broken.
func (h *Handler) enrichMediaWithTMDB(ctx context.Context, entry *anime.Entry, settings *models.Settings) {
	if entry == nil || entry.Media == nil || (entry.Media.TmdbID == 0 && entry.Media.MyanimelistId == 0 && entry.Media.TitleRomaji == "") {
		return
	}

	// Only enrich if important metadata is missing OR if the stored image URL is a broken placeholder
	missingMetadata := entry.Media.Description == "" ||
		entry.Media.Description == "Sin descripción" ||
		(entry.Media.TitleSpanish == "" && entry.Media.TitleEnglish == "") ||
		isBrokenImageURL(entry.Media.PosterImage) ||
		isBrokenImageURL(entry.Media.BannerImage)

	if !missingMetadata {
		return
	}

	provider := getActiveProvider(settings, h.App.Database, h.App.Logger)
	if provider == nil {
		return
	}

	lookUpID := ""
	if provider.GetProviderID() == "jikan" {
		if entry.Media.MyanimelistId > 0 {
			lookUpID = strconv.Itoa(entry.Media.MyanimelistId)
		} else {
			// Map known TMDB IDs to MAL IDs for anime
			malMap := map[int]int{
				12609:  223,   // Dragon Ball
				12971:  813,   // Dragon Ball Z
				12697:  225,   // Dragon Ball GT
				61709:  6033,  // Dragon Ball Kai
				42705:  6033,  // Dragon Ball Kai
				62715:  30694, // Dragon Ball Super
				236994: 56884, // Dragon Ball Daima
			}
			if malID, ok := malMap[entry.Media.TmdbID]; ok {
				lookUpID = strconv.Itoa(malID)
				entry.Media.MyanimelistId = malID
			} else {
				// Search dynamically by title on Jikan API
				searchQuery := entry.Media.TitleRomaji
				if searchQuery == "" {
					searchQuery = entry.Media.TitleEnglish
				}
				if searchQuery == "" {
					searchQuery = entry.Media.TitleSpanish
				}
				if searchQuery != "" {
					results, err := provider.SearchMedia(ctx, searchQuery)
					if err == nil && len(results) > 0 && results[0] != nil {
						lookUpID = results[0].ExplicitID
						if results[0].MyanimelistId != nil {
							entry.Media.MyanimelistId = *results[0].MyanimelistId
						}
					}
				}
			}
		}
	} else {
		// TMDB provider
		tmdbID := entry.Media.TmdbID
		if tmdbID > 0 {
			if entry.Media.Format == string(platform.MediaFormatMovie) || entry.Media.Type == "MOVIE" {
				lookUpID = strconv.Itoa(tmdbID + 1000000)
			} else {
				lookUpID = strconv.Itoa(tmdbID)
			}
		}
	}

	if lookUpID == "" {
		return
	}

	h.App.Logger.Debug().
		Str("provider", provider.GetName()).
		Str("lookUpID", lookUpID).
		Int("tmdbID", entry.Media.TmdbID).
		Int("malID", entry.Media.MyanimelistId).
		Str("existingPoster", entry.Media.PosterImage).
		Msg("enrichMediaWithTMDB: fetching series metadata via API")

	nm, err := provider.GetMediaDetails(ctx, lookUpID)
	if err != nil || nm == nil {
		return
	}

	updated := false
	if nm.Description != nil && *nm.Description != "" && (entry.Media.Description == "" || entry.Media.Description == "Sin descripción") {
		entry.Media.Description = *nm.Description
		updated = true
	}
	if nm.Title != nil {
		if nm.Title.Spanish != nil && *nm.Title.Spanish != "" && entry.Media.TitleSpanish == "" {
			entry.Media.TitleSpanish = *nm.Title.Spanish
			updated = true
		}
		if nm.Title.English != nil && *nm.Title.English != "" && entry.Media.TitleEnglish == "" {
			entry.Media.TitleEnglish = *nm.Title.English
			updated = true
		}
		if nm.Title.Romaji != nil && *nm.Title.Romaji != "" && entry.Media.TitleRomaji == "" {
			entry.Media.TitleRomaji = *nm.Title.Romaji
			updated = true
		}
	}
	// Update poster if missing or broken
	if nm.CoverImage != nil && nm.CoverImage.Large != nil && *nm.CoverImage.Large != "" &&
		isBrokenImageURL(entry.Media.PosterImage) {
		entry.Media.PosterImage = *nm.CoverImage.Large
		updated = true
	}
	// Update banner if missing or broken
	if nm.BannerImage != nil && *nm.BannerImage != "" && isBrokenImageURL(entry.Media.BannerImage) {
		entry.Media.BannerImage = *nm.BannerImage
		updated = true
	}

	if updated {
		// Persist to database
		_, err := db.InsertLibraryMedia(h.App.Database, entry.Media)
		if err != nil {
			h.App.Logger.Warn().Err(err).Int("tmdbID", entry.Media.TmdbID).Int("malID", entry.Media.MyanimelistId).Msg("enrichMediaWithTMDB: failed to persist enriched metadata")
		} else {
			h.App.Logger.Info().Int("tmdbID", entry.Media.TmdbID).Int("malID", entry.Media.MyanimelistId).Str("poster", entry.Media.PosterImage).Msg("enrichMediaWithTMDB: updated series metadata in DB from API")
		}
	}
}