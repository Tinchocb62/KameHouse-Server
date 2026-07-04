package metadata_provider

import (
	"context"
	"fmt"
	"strconv"
	"sync"
	"time"

	"kamehouse/internal/api/jikan"
	apiMetadata "kamehouse/internal/api/metadata"
	"kamehouse/internal/api/tmdb"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/platforms/platform"

	"github.com/rs/zerolog"
)

type JikanProviderImpl struct {
	client     *jikan.Client
	db         *db.Database
	logger     *zerolog.Logger
	tmdbClient *tmdb.Client

	mu    sync.Mutex
	cache map[int]*jikanCachedEntry
}

type jikanCachedEntry struct {
	data      *apiMetadata.AnimeMetadata
	expiresAt time.Time
}

const jikanMetadataTTL = 6 * time.Hour

func NewJikanProviderImpl(client *jikan.Client, database *db.Database, logger *zerolog.Logger, tmdbClient *tmdb.Client) *JikanProviderImpl {
	return &JikanProviderImpl{
		client:     client,
		db:         database,
		logger:     logger,
		tmdbClient: tmdbClient,
		cache:      make(map[int]*jikanCachedEntry),
	}
}

func (p *JikanProviderImpl) GetAnimeMetadata(id int) (*apiMetadata.AnimeMetadata, error) {
	// 1. Check in-memory cache
	p.mu.Lock()
	if entry, ok := p.cache[id]; ok && time.Now().Before(entry.expiresAt) {
		p.mu.Unlock()
		return entry.data, nil
	}
	p.mu.Unlock()

	// 2. Check Database Persistent Cache
	if p.db != nil {
		var cachedData apiMetadata.AnimeMetadata
		found, err := db.GetMetadataCache(p.db, "jikan-anime-episodes", strconv.Itoa(id), &cachedData)
		if err == nil && found {
			p.mu.Lock()
			p.cache[id] = &jikanCachedEntry{
				data:      &cachedData,
				expiresAt: time.Now().Add(jikanMetadataTTL),
			}
			p.mu.Unlock()
			return &cachedData, nil
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if p.db == nil {
		return nil, fmt.Errorf("database required to map local ID to Jikan")
	}

	var media *models.LibraryMedia
	var err error
	if m, errGet := db.GetLibraryMediaByID(p.db, uint(id)); errGet == nil && m != nil {
		media = m
	} else {
		if id >= 1_000_000 {
			media, err = db.GetLibraryMediaByTmdbIdAndType(p.db, id-1_000_000, "MOVIE")
		} else {
			media, err = db.GetLibraryMediaByTmdbIdAndType(p.db, id, "SHOW")
		}
	}
	if err != nil || media == nil {
		return nil, fmt.Errorf("media not found in library for ID %d", id)
	}

	titleToSearch := media.TitleEnglish
	if titleToSearch == "" {
		titleToSearch = media.TitleOriginal
	}
	if titleToSearch == "" {
		titleToSearch = media.TitleRomaji
	}

	var malID int
	var malTitle, malTitleEng, malTitleJpn, malSynopsis, malLargeImage string
	var malEpisodes int
	var fullData *jikan.AnimeFullResponse

	if media.MyanimelistId > 0 {
		malID = media.MyanimelistId
	} else {
		searchRes, err := p.client.SearchAnime(ctx, titleToSearch)
		if err != nil {
			return nil, fmt.Errorf("jikan_provider: SearchAnime failed for '%s': %w", titleToSearch, err)
		}
		if len(searchRes.Data) == 0 {
			return nil, fmt.Errorf("no anime found for title: %s", titleToSearch)
		}
		malAnime := searchRes.Data[0]
		malID = malAnime.MalID
		malTitle = malAnime.Title
		malTitleEng = malAnime.TitleEng
		malTitleJpn = malAnime.TitleJpn
		malSynopsis = malAnime.Synopsis
		malLargeImage = malAnime.Images.Jpg.LargeImageUrl
		malEpisodes = malAnime.Episodes
	}

	if malTitle == "" {
		fullRes, errFull := p.client.GetAnimeFull(ctx, malID)
		if errFull != nil || fullRes == nil {
			return nil, fmt.Errorf("jikan_provider: GetAnimeFull failed for mal_id %d: %w", malID, errFull)
		}
		fullData = fullRes
		malTitle = fullRes.Data.Title
		malTitleEng = fullRes.Data.TitleEng
		malTitleJpn = fullRes.Data.TitleJpn
		malSynopsis = fullRes.Data.Synopsis
		malLargeImage = fullRes.Data.Images.Jpg.LargeImageUrl
		malEpisodes = fullRes.Data.Episodes
	}

	titles := map[string]string{
		"en": malTitleEng,
		"ja": malTitleJpn,
	}
	if titles["en"] == "" {
		titles["en"] = malTitle
	}

	result := &apiMetadata.AnimeMetadata{
		Titles:       titles,
		Episodes:     make(map[string]*apiMetadata.EpisodeMetadata),
		EpisodeCount: malEpisodes,
		SpecialCount: 0,
		Mappings:     &apiMetadata.AnimeMappings{MyanimelistId: malID},
	}

	if fullData == nil {
		if fullRes, errFull := p.client.GetAnimeFull(ctx, malID); errFull == nil && fullRes != nil {
			fullData = fullRes
		}
	}
	if fullData != nil {
		result.Status = fullData.Data.Status
		result.Duration = fullData.Data.Duration
		result.Rating = fullData.Data.Rating
		result.Score = fullData.Data.Score
		for _, g := range fullData.Data.Genres {
			result.Genres = append(result.Genres, g.Name)
		}
		for _, s := range fullData.Data.Studios {
			result.Studios = append(result.Studios, s.Name)
		}
		for _, d := range fullData.Data.Demographics {
			result.Demographics = append(result.Demographics, d.Name)
		}
		result.Openings = fullData.Data.Theme.Openings
		result.Endings = fullData.Data.Theme.Endings
	}

	// Fetch Characters
	if charRes, errChar := p.client.GetAnimeCharacters(ctx, malID); errChar == nil && charRes != nil {
		for i, c := range charRes.Data {
			if i >= 15 { // Cap at 15 characters to avoid huge payload
				break
			}
			result.Characters = append(result.Characters, apiMetadata.CharacterMetadata{
				Name:     c.Character.Name,
				Role:     c.Role,
				ImageUrl: c.Character.Images.Jpg.ImageUrl,
			})
		}
	}

	// Step 2: If it's a TV series with multiple episodes, fetch the episode list
	if malEpisodes > 1 {
		episodesRes, err := p.client.GetAnimeEpisodes(ctx, malID)
		if err == nil && episodesRes != nil {
			for _, ep := range episodesRes.Data {
				epStr := strconv.Itoa(ep.Episode)
				
				// Parse air date
				var airDate string
				if ep.Aired != "" {
					parsed, err := time.Parse(time.RFC3339, ep.Aired)
					if err == nil {
						airDate = parsed.Format("2006-01-02")
					}
				}

				result.Episodes[epStr] = &apiMetadata.EpisodeMetadata{
					EpisodeNumber:         ep.Episode,
					SeasonNumber:          1,
					Episode:               epStr,
					Title:                 ep.Title,
					Overview:              ep.Synopsis,
					HasImage:              false,
					AirDate:               airDate,
					AbsoluteEpisodeNumber: ep.Episode,
				}
			}
		}
	}

	// Step 3: Fill generic data if episode list failed or it's a movie/single episode
	if len(result.Episodes) == 0 {
		for i := 1; i <= malEpisodes; i++ {
			epStr := strconv.Itoa(i)
			result.Episodes[epStr] = &apiMetadata.EpisodeMetadata{
				EpisodeNumber:         i,
				SeasonNumber:          1,
				Episode:               epStr,
				Title:                 fmt.Sprintf("Episode %d", i),
				Overview:              malSynopsis,
				Image:                 malLargeImage,
				HasImage:              true,
				AbsoluteEpisodeNumber: i,
			}
		}
		if malEpisodes == 0 { // e.g. ongoing or unknown count movie
			result.Episodes["1"] = &apiMetadata.EpisodeMetadata{
				EpisodeNumber:         1,
				SeasonNumber:          1,
				Episode:               "1",
				Title:                 titles["en"],
				Overview:              malSynopsis,
				Image:                 malLargeImage,
				HasImage:              true,
				AbsoluteEpisodeNumber: 1,
			}
			result.EpisodeCount = 1
		}
	}

	// Apply Dragon Ball specific enrichments (reusing the same logic as TMDB)
	EnrichWithLatinTitles(media.TmdbID, result)
	EnrichWithFiller(media.TmdbID, result)
	EnrichWithSeriesTitles(media.TmdbID, result)

	// Fallback to TMDB for Images and Synopsis
	if p.tmdbClient != nil && len(result.Episodes) > 0 {
		tmdbProvider := NewTMDBProviderImpl(p.tmdbClient, p.db, p.logger)
		if tmdbMeta, err := tmdbProvider.GetAnimeMetadata(id); err == nil && tmdbMeta != nil {
			for epNum, ep := range result.Episodes {
				if tmdbEp, ok := tmdbMeta.Episodes[epNum]; ok {
					if tmdbEp.Image != "" {
						ep.Image = tmdbEp.Image
						ep.HasImage = true
					}
					if ep.Overview == "" || ep.Overview == malSynopsis {
						ep.Overview = tmdbEp.Overview
					}
				}
			}
		}
	}

	// Store in cache
	p.mu.Lock()
	p.cache[id] = &jikanCachedEntry{
		data:      result,
		expiresAt: time.Now().Add(jikanMetadataTTL),
	}
	p.mu.Unlock()

	// 3. Save to Database Persistent Cache
	if p.db != nil {
		_ = db.UpsertMetadataCache(p.db, "jikan-anime-episodes", strconv.Itoa(id), result, 7*24*time.Hour)
	}

	return result, nil
}

func (p *JikanProviderImpl) GetAnimeMetadataWrapper(baseAnime *platform.UnifiedMedia, animeMetadata *apiMetadata.AnimeMetadata) AnimeMetadataWrapper {
	return NewSimpleAnimeMetadataWrapper(animeMetadata)
}

func (p *JikanProviderImpl) SetUseFallbackProvider(v bool) {}

func (p *JikanProviderImpl) ClearCache() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.cache = make(map[int]*jikanCachedEntry)
}

func (p *JikanProviderImpl) Close() error { return nil }
