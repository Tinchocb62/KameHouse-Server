package metadata_provider

import (
	"context"
	"fmt"
	"strconv"
	"sync"
	"time"

	"kamehouse/internal/api/anilist"
	apiMetadata "kamehouse/internal/api/metadata"
	"kamehouse/internal/api/tmdb"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/platforms/platform"

	"github.com/rs/zerolog"
)

type AniListProviderImpl struct {
	client     *anilist.Client
	db         *db.Database
	logger     *zerolog.Logger
	tmdbClient *tmdb.Client

	mu    sync.Mutex
	cache map[int]*anilistCachedEntry
}

type anilistCachedEntry struct {
	data      *apiMetadata.AnimeMetadata
	expiresAt time.Time
}

const anilistMetadataTTL = 6 * time.Hour

func NewAniListProviderImpl(client *anilist.Client, database *db.Database, logger *zerolog.Logger, tmdbClient *tmdb.Client) *AniListProviderImpl {
	return &AniListProviderImpl{
		client:     client,
		db:         database,
		logger:     logger,
		tmdbClient: tmdbClient,
		cache:      make(map[int]*anilistCachedEntry),
	}
}

func (p *AniListProviderImpl) GetAnimeMetadata(id int) (*apiMetadata.AnimeMetadata, error) {
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
		found, err := db.GetMetadataCache(p.db, "anilist-anime-episodes", strconv.Itoa(id), &cachedData)
		if err == nil && found {
			p.mu.Lock()
			p.cache[id] = &anilistCachedEntry{
				data:      &cachedData,
				expiresAt: time.Now().Add(anilistMetadataTTL),
			}
			p.mu.Unlock()
			return &cachedData, nil
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if p.db == nil {
		return nil, fmt.Errorf("database required to map local ID to AniList")
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

	var aniData *anilist.AniListMedia

	searchRes, err := p.client.SearchAnime(ctx, titleToSearch, 1, 1)
	if err == nil && len(searchRes) > 0 {
		fullMedia, errGet := p.client.GetMediaByID(ctx, searchRes[0].ID)
		if errGet == nil && fullMedia != nil {
			aniData = fullMedia
		}
	}

	if aniData == nil {
		return nil, fmt.Errorf("no anilist media found for title: %s", titleToSearch)
	}

	titles := map[string]string{
		"en": aniData.Title.English,
		"ja": aniData.Title.Native,
		"ro": aniData.Title.Romaji,
	}
	if titles["en"] == "" {
		titles["en"] = aniData.Title.Romaji
	}

	result := &apiMetadata.AnimeMetadata{
		Titles:       titles,
		Episodes:     make(map[string]*apiMetadata.EpisodeMetadata),
		EpisodeCount: aniData.Episodes,
		SpecialCount: 0,
		Mappings: &apiMetadata.AnimeMappings{
			AnilistId:     aniData.ID,
			MyanimelistId: aniData.IDMal,
		},
		Status:   aniData.Status,
		Duration: strconv.Itoa(aniData.Duration),
		Score:    float64(aniData.AverageScore) / 10.0,
		Genres:   aniData.Genres,
	}

	// Fetch Characters
	for i, edge := range aniData.Characters.Edges {
		if i >= 15 {
			break
		}
		img := edge.Node.Image.Large
		if img == "" {
			img = edge.Node.Image.Medium
		}
		result.Characters = append(result.Characters, apiMetadata.CharacterMetadata{
			Name:     edge.Node.Name.Full,
			Role:     edge.Role,
			ImageUrl: img,
		})
	}

	// Populate episodes
	totalEps := aniData.Episodes
	if totalEps <= 0 {
		totalEps = 1
	}

	for i := 1; i <= totalEps; i++ {
		epStr := strconv.Itoa(i)
		img := aniData.CoverImage.ExtraLarge
		if img == "" {
			img = aniData.CoverImage.Large
		}
		result.Episodes[epStr] = &apiMetadata.EpisodeMetadata{
			EpisodeNumber:         i,
			SeasonNumber:          1,
			Episode:               epStr,
			Title:                 fmt.Sprintf("Episodio %d", i),
			Overview:              aniData.Description,
			Image:                 img,
			HasImage:              img != "",
			AbsoluteEpisodeNumber: i,
		}
	}

	// Apply Dragon Ball specific enrichments
	EnrichWithLatinTitles(media.TmdbID, result)
	EnrichWithFiller(media.TmdbID, result)
	EnrichWithSeriesTitles(media.TmdbID, result)

	// Fallback to TMDB for episode screenshots and localized synopses
	if p.tmdbClient != nil && len(result.Episodes) > 0 {
		tmdbProvider := NewTMDBProviderImpl(p.tmdbClient, p.db, p.logger)
		if tmdbMeta, err := tmdbProvider.GetAnimeMetadata(id); err == nil && tmdbMeta != nil {
			for epNum, ep := range result.Episodes {
				if tmdbEp, ok := tmdbMeta.Episodes[epNum]; ok {
					if tmdbEp.Image != "" {
						ep.Image = tmdbEp.Image
						ep.HasImage = true
					}
					if ep.Overview == "" || ep.Overview == aniData.Description {
						ep.Overview = tmdbEp.Overview
					}
				}
			}
		}
	}

	// Store in cache
	p.mu.Lock()
	p.cache[id] = &anilistCachedEntry{
		data:      result,
		expiresAt: time.Now().Add(anilistMetadataTTL),
	}
	p.mu.Unlock()

	// 3. Save to Database Persistent Cache
	if p.db != nil {
		_ = db.UpsertMetadataCache(p.db, "anilist-anime-episodes", strconv.Itoa(id), result, 7*24*time.Hour)
	}

	return result, nil
}

func (p *AniListProviderImpl) GetAnimeMetadataWrapper(baseAnime *platform.UnifiedMedia, animeMetadata *apiMetadata.AnimeMetadata) AnimeMetadataWrapper {
	return NewSimpleAnimeMetadataWrapper(animeMetadata)
}

func (p *AniListProviderImpl) SetUseFallbackProvider(v bool) {}

func (p *AniListProviderImpl) ClearCache() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.cache = make(map[int]*anilistCachedEntry)
}

func (p *AniListProviderImpl) Close() error { return nil }
