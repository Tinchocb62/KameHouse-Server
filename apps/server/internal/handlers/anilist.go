package handlers

import (
	"errors"
	"fmt"
	"kamehouse/internal/api/anilist"

	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/platforms/shared_platform"
	"kamehouse/internal/util/result"
	"strconv"
	"time"

	"github.com/goccy/go-json"
	"github.com/labstack/echo/v4"
)

// HandleGetAnimeCollection
//
//	@summary returns the user's AniList anime collection.
//	@desc Calling GET will return the cached anime collection.
//	@desc The manga collection is also refreshed in the background, and upon completion, a WebSocket event is sent.
//	@desc Calling POST will refetch both the anime and manga collections.
//	@returns anilist.AnimeCollection
//	@route /api/v1/anilist/collection [GET,POST]
func (h *Handler) HandleGetAnimeCollection(c echo.Context) error {

	bypassCache := c.Request().Method == "POST"

	if !bypassCache {
		// Get the user's anilist collection
		animeCollection, err := h.App.GetAnimeCollection(false)
		if err != nil {
			return h.RespondWithError(c, err)
		}
		return h.RespondWithData(c, animeCollection)
	}

	animeCollection, err := h.App.RefreshAnimeCollection()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	go func() {
		_, _ = h.App.RefreshMangaCollection()
	}()

	return h.RespondWithData(c, animeCollection)
}

// HandleGetRawAnimeCollection
//
//	@summary returns the user's AniList anime collection without filtering out custom lists.
//	@desc Calling GET will return the cached anime collection.
//	@returns anilist.AnimeCollection
//	@route /api/v1/anilist/collection/raw [GET,POST]
func (h *Handler) HandleGetRawAnimeCollection(c echo.Context) error {

	bypassCache := c.Request().Method == "POST"

	// Get the user's anilist collection
	animeCollection, err := h.App.GetRawAnimeCollection(bypassCache)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, animeCollection)
}

// HandleEditAnilistListEntry
//
//	@summary updates the user's list entry on Anilist.
//	@desc This is used to edit an entry on AniList.
//	@desc The "type" field is used to determine if the entry is an anime or manga and refreshes the collection accordingly.
//	@desc The client should refetch collection-dependent queries after this mutation.
//	@returns true
//	@route /api/v1/anilist/list-entry [POST]
func (h *Handler) HandleEditAnilistListEntry(c echo.Context) error {

	type body struct {
		MediaId   *int                     `json:"mediaId"`
		Status    *anilist.MediaListStatus `json:"status"`
		Score     *int                     `json:"score"`
		Progress  *int                     `json:"progress"`
		StartDate *anilist.FuzzyDateInput  `json:"startedAt"`
		EndDate   *anilist.FuzzyDateInput  `json:"completedAt"`
		Type      string                   `json:"type"`
	}

	p := new(body)
	if err := c.Bind(p); err != nil {
		return h.RespondWithError(c, err)
	}

	err := h.App.Metadata.AnilistPlatformRef.Get().UpdateEntry(
		c.Request().Context(),
		*p.MediaId,
		p.Status,
		p.Score,
		p.Progress,
		p.StartDate,
		p.EndDate,
	)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	switch p.Type {
	case "anime":
		_, _ = h.App.RefreshAnimeCollection()
	case "manga":
		_, _ = h.App.RefreshMangaCollection()
	default:
		_, _ = h.App.RefreshAnimeCollection()
		_, _ = h.App.RefreshMangaCollection()
	}

	return h.RespondWithData(c, true)
}

//----------------------------------------------------------------------------------------------------------------------------------------------------

var (
	detailsCache = result.NewCache[int, *anilist.AnimeDetailsById_Media]()
)

// HandleGetAnilistAnimeDetails
//
//	@summary returns more details about an AniList anime entry.
//	@desc This fetches more fields omitted from the base queries.
//	@param id - int - true - "The AniList anime ID"
//	@returns anilist.AnimeDetailsById_Media
//	@route /api/v1/anilist/media-details/{id} [GET]
func (h *Handler) HandleGetAnilistAnimeDetails(c echo.Context) error {

	mId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// For negative IDs (TMDB-sourced media), look up from local DB and construct inline response
	if mId < 0 {
		return h.handleLocalMediaDetails(c, mId)
	}

	if details, ok := detailsCache.Get(mId); ok {
		return h.RespondWithData(c, details)
	}
	details, err := h.App.Metadata.AnilistPlatformRef.Get().GetAnimeDetails(c.Request().Context(), mId)
	if err != nil {
		return h.RespondWithError(c, err)
	}
	detailsCache.Set(mId, details)

	return h.RespondWithData(c, details)
}

// handleLocalMediaDetails constructs an AnimeDetailsById_Media from the local DB for TMDB-sourced media
func (h *Handler) handleLocalMediaDetails(c echo.Context, mId int) error {
	lfs, _, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Find the LibraryMediaId from local files
	var libMedia *models.LibraryMedia
	for _, lf := range lfs {
		if lf.MediaId == mId && lf.LibraryMediaId > 0 {
			m, err := db.GetLibraryMediaByID(h.App.Database, lf.LibraryMediaId)
			if err == nil && m != nil {
				libMedia = m
				break
			}
		}
	}

	if libMedia == nil {
		return h.RespondWithError(c, errors.New("media not found for id"))
	}

	// Decode genres from JSON
	var genreStrs []string
	_ = json.Unmarshal(libMedia.Genres, &genreStrs)
	var genrePtrs []*string
	for i := range genreStrs {
		g := genreStrs[i]
		genrePtrs = append(genrePtrs, &g)
	}

	// Build a minimal AnimeDetailsById_Media from local data
	details := &anilist.AnimeDetailsById_Media{
		ID:          mId,
		Description: &libMedia.Description,
		Genres:      genrePtrs,
		AverageScore: func() *int {
			if libMedia.Score > 0 {
				s := int(libMedia.Score)
				return &s
			}
			return nil
		}(),
		StartDate: &anilist.AnimeDetailsById_Media_StartDate{
			Year: func() *int {
				y := libMedia.Year
				if y > 0 {
					return &y
				}
				return nil
			}(),
		},
	}

	return h.RespondWithData(c, details)
}

//----------------------------------------------------------------------------------------------------------------------------------------------------

var studioDetailsMap = result.NewMap[int, *anilist.StudioDetails]()

// HandleGetAnilistStudioDetails
//
//	@summary returns details about a studio.
//	@desc This fetches media produced by the studio.
//	@param id - int - true - "The AniList studio ID"
//	@returns anilist.StudioDetails
//	@route /api/v1/anilist/studio-details/{id} [GET]
func (h *Handler) HandleGetAnilistStudioDetails(c echo.Context) error {

	mId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return h.RespondWithError(c, err)
	}

	if details, ok := studioDetailsMap.Get(mId); ok {
		return h.RespondWithData(c, details)
	}
	details, err := h.App.Metadata.AnilistPlatformRef.Get().GetStudioDetails(c.Request().Context(), mId)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	go func() {
		if details != nil {
			studioDetailsMap.Set(mId, details)
		}
	}()

	return h.RespondWithData(c, details)
}

//----------------------------------------------------------------------------------------------------------------------------------------------------

// HandleDeleteAnilistListEntry
//
//	@summary deletes an entry from the user's AniList list.
//	@desc This is used to delete an entry on AniList.
//	@desc The "type" field is used to determine if the entry is an anime or manga and refreshes the collection accordingly.
//	@desc The client should refetch collection-dependent queries after this mutation.
//	@route /api/v1/anilist/list-entry [DELETE]
//	@returns bool
func (h *Handler) HandleDeleteAnilistListEntry(c echo.Context) error {

	type body struct {
		MediaId *int    `json:"mediaId"`
		Type    *string `json:"type"`
	}

	p := new(body)
	if err := c.Bind(p); err != nil {
		return h.RespondWithError(c, err)
	}

	if p.Type == nil || p.MediaId == nil {
		return h.RespondWithError(c, errors.New("missing parameters"))
	}

	var listEntryID int

	switch *p.Type {
	case "anime":
		// Get the list entry ID
		animeCollection, err := h.App.GetAnimeCollection(false)
		if err != nil {
			return h.RespondWithError(c, err)
		}

		listEntry, found := animeCollection.GetListEntryFromAnimeId(*p.MediaId)
		if !found {
			return h.RespondWithError(c, errors.New("list entry not found"))
		}
		listEntryID = listEntry.ID
	case "manga":
		// Get the list entry ID
		mangaCollection, err := h.App.GetMangaCollection(false)
		if err != nil {
			return h.RespondWithError(c, err)
		}

		listEntry, found := mangaCollection.GetListEntryFromMangaId(*p.MediaId)
		if !found {
			return h.RespondWithError(c, errors.New("list entry not found"))
		}
		listEntryID = listEntry.ID
	}

	// Delete the list entry
	err := h.App.Metadata.AnilistPlatformRef.Get().DeleteEntry(c.Request().Context(), *p.MediaId, listEntryID)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	switch *p.Type {
	case "anime":
		_, _ = h.App.RefreshAnimeCollection()
	case "manga":
		_, _ = h.App.RefreshMangaCollection()
	}

	return h.RespondWithData(c, true)
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var (
	anilistListAnimeCache       = result.NewCache[string, *anilist.ListAnime]()
	anilistListRecentAnimeCache = result.NewCache[string, *anilist.ListRecentAnime]() // holds 1 value
)

// HandleAnilistListAnime
//
//	@summary returns a list of anime based on the search parameters.
//	@desc This is used by the "Discover" and "Advanced Search".
//	@route /api/v1/anilist/list-anime [POST]
//	@returns anilist.ListAnime
func (h *Handler) HandleAnilistListAnime(c echo.Context) error {

	type body struct {
		Page                *int                   `json:"page,omitempty"`
		Search              *string                `json:"search,omitempty"`
		PerPage             *int                   `json:"perPage,omitempty"`
		Sort                []*anilist.MediaSort   `json:"sort,omitempty"`
		Status              []*anilist.MediaStatus `json:"status,omitempty"`
		Genres              []*string              `json:"genres,omitempty"`
		AverageScoreGreater *int                   `json:"averageScore_greater,omitempty"`
		Season              *anilist.MediaSeason   `json:"season,omitempty"`
		SeasonYear          *int                   `json:"seasonYear,omitempty"`
		Format              *anilist.MediaFormat   `json:"format,omitempty"`
		IsAdult             *bool                  `json:"isAdult,omitempty"`
		CountryOfOrigin     *string                `json:"countryOfOrigin,omitempty"`
		LibraryOnly         *bool                  `json:"libraryOnly,omitempty"`
	}

	p := new(body)
	if err := c.Bind(p); err != nil {
		return h.RespondWithError(c, err)
	}

	if p.Page == nil || p.PerPage == nil {
		*p.Page = 1
		*p.PerPage = 20
	}

	isAdult := false
	if p.IsAdult != nil {
		isAdult = *p.IsAdult && false // Adult content logic removed
	}

	cacheKey := anilist.ListAnimeCacheKey(
		p.Page,
		p.Search,
		p.PerPage,
		p.Sort,
		p.Status,
		p.Genres,
		p.AverageScoreGreater,
		p.Season,
		p.SeasonYear,
		p.Format,
		&isAdult,
		p.CountryOfOrigin,
	)

	// Modify cache key if library only
	if p.LibraryOnly != nil && *p.LibraryOnly {
		cacheKey = cacheKey + "-libraryOnly"
	}

	// ── Step A: In-memory hot cache (10 min TTL) ─────────────────────────
	cached, ok := anilistListAnimeCache.Get(cacheKey)
	if ok {
		return h.RespondWithData(c, cached)
	}

	// ── Step B: SQLite persistent cache (24 h freshness) ─────────────────
	if dbEntry, err := db.GetAnilistCache(h.App.Database, cacheKey); err == nil && dbEntry != nil {
		var dbResult anilist.ListAnime
		if unmarshalErr := json.Unmarshal(dbEntry.Data, &dbResult); unmarshalErr == nil {
			// Promote back to in-memory cache
			anilistListAnimeCache.SetT(cacheKey, &dbResult, time.Minute*10)
			return h.RespondWithData(c, &dbResult)
		}
	}

	// ── Step C: AniList API (network call) ───────────────────────────────
	ret, err := anilist.ListAnimeM(
		shared_platform.NewCacheLayer(h.App.Metadata.AnilistClientRef),
		p.Page,
		p.Search,
		p.PerPage,
		p.Sort,
		p.Status,
		p.Genres,
		p.AverageScoreGreater,
		p.Season,
		p.SeasonYear,
		p.Format,
		&isAdult,
		p.CountryOfOrigin,
		h.App.Logger,
		h.App.GetUserAnilistToken(),
	)
	if err != nil {
		// Last resort: try returning expired SQLite data on network failure
		if staleEntry, staleErr := db.GetStaleAnilistCache(h.App.Database, cacheKey); staleErr == nil && staleEntry != nil {
			var staleResult anilist.ListAnime
			if json.Unmarshal(staleEntry.Data, &staleResult) == nil {
				return h.RespondWithData(c, &staleResult)
			}
		}
		return h.RespondWithError(c, err)
	}

	if ret != nil {
		// Filter by local library if requested
		if p.LibraryOnly != nil && *p.LibraryOnly {
			lfs, _, err := db.GetLocalFiles(h.App.Database)
			if err == nil {
				// Create map of loaded media IDs
				loadedMediaIds := make(map[int]struct{})
				for _, lf := range lfs {
					loadedMediaIds[lf.MediaId] = struct{}{}
				}

				// Filter anime list
				var filteredMedia []*anilist.BaseAnime
				if ret.Page != nil && ret.Page.Media != nil {
					for _, media := range ret.Page.Media {
						if _, ok := loadedMediaIds[media.ID]; ok {
							filteredMedia = append(filteredMedia, media)
						}
					}
					ret.Page.Media = filteredMedia
				}
			}
		}

		// Update in-memory cache
		anilistListAnimeCache.SetT(cacheKey, ret, time.Minute*10)

		// Persist to SQLite in background (don't block the response)
		go func() {
			data, marshalErr := json.Marshal(ret)
			if marshalErr != nil {
				return
			}
			entry := &models.AnilistCacheEntry{
				CacheKey:  cacheKey,
				Data:      data,
				ExpiresAt: time.Now().Add(24 * time.Hour),
			}
			_ = db.UpsertAnilistCache(h.App.Database, entry)
		}()
	}

	return h.RespondWithData(c, ret)
}

// HandleAnilistListRecentAiringAnime
//
//	@summary returns a list of recently aired anime.
//	@desc This is used by the "Schedule" page to display recently aired anime.
//	@route /api/v1/anilist/list-recent-anime [POST]
//	@returns anilist.ListRecentAnime
func (h *Handler) HandleAnilistListRecentAiringAnime(c echo.Context) error {

	type body struct {
		Page            *int                  `json:"page,omitempty"`
		Search          *string               `json:"search,omitempty"`
		PerPage         *int                  `json:"perPage,omitempty"`
		AiringAtGreater *int                  `json:"airingAt_greater,omitempty"`
		AiringAtLesser  *int                  `json:"airingAt_lesser,omitempty"`
		NotYetAired     *bool                 `json:"notYetAired,omitempty"`
		Sort            []*anilist.AiringSort `json:"sort,omitempty"`
		LibraryOnly     *bool                 `json:"libraryOnly,omitempty"`
	}

	p := new(body)
	if err := c.Bind(p); err != nil {
		return h.RespondWithError(c, err)
	}

	if p.Page == nil || p.PerPage == nil {
		*p.Page = 1
		*p.PerPage = 50
	}

	cacheKey := fmt.Sprintf("%v-%v-%v-%v-%v-%v-%v", p.Page, p.Search, p.PerPage, p.AiringAtGreater, p.AiringAtLesser, p.NotYetAired, p.Sort)
	if p.LibraryOnly != nil && *p.LibraryOnly {
		cacheKey += "-libraryOnly"
	}

	cached, ok := anilistListRecentAnimeCache.Get(cacheKey)
	if ok {
		return h.RespondWithData(c, cached)
	}

	ret, err := anilist.ListRecentAiringAnimeM(
		shared_platform.NewCacheLayer(h.App.Metadata.AnilistClientRef),
		p.Page,
		p.Search,
		p.PerPage,
		p.AiringAtGreater,
		p.AiringAtLesser,
		p.NotYetAired,
		p.Sort,
		h.App.Logger,
		h.App.GetUserAnilistToken(),
	)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	if ret != nil {
		if p.LibraryOnly != nil && *p.LibraryOnly {
			if lfs, _, err := db.GetLocalFiles(h.App.Database); err == nil {
				loadedMediaIds := make(map[int]struct{})
				for _, lf := range lfs {
					loadedMediaIds[lf.MediaId] = struct{}{}
				}

				var filteredSchedules []*anilist.ListRecentAnime_Page_AiringSchedules
				if ret.Page != nil && ret.Page.AiringSchedules != nil {
					for _, schedule := range ret.Page.AiringSchedules {
						if schedule.Media != nil {
							if _, ok := loadedMediaIds[schedule.Media.ID]; ok {
								filteredSchedules = append(filteredSchedules, schedule)
							}
						}
					}
					ret.Page.AiringSchedules = filteredSchedules
				}
			}
		}
		anilistListRecentAnimeCache.SetT(cacheKey, ret, time.Hour*1)
	}

	return h.RespondWithData(c, ret)
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var anilistMissedSequelsCache = result.NewCache[int, []*anilist.BaseAnime]()

// HandleAnilistListMissedSequels
//
//	@summary returns a list of sequels not in the user's list.
//	@desc This is used by the "Discover" page to display sequels the user may have missed.
//	@route /api/v1/anilist/list-missed-sequels [GET]
//	@returns []anilist.BaseAnime
func (h *Handler) HandleAnilistListMissedSequels(c echo.Context) error {

	cached, ok := anilistMissedSequelsCache.Get(1)
	if ok {
		return h.RespondWithData(c, cached)
	}

	// Get complete anime collection
	animeCollection, err := h.App.Metadata.AnilistPlatformRef.Get().GetAnimeCollectionWithRelations(c.Request().Context())
	if err != nil {
		return h.RespondWithError(c, err)
	}

	ret, err := anilist.ListMissedSequels(
		shared_platform.NewCacheLayer(h.App.Metadata.AnilistClientRef),
		animeCollection,
		h.App.Logger,
		h.App.GetUserAnilistToken(),
	)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	anilistMissedSequelsCache.SetT(1, ret, time.Hour*4)

	return h.RespondWithData(c, ret)
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var anilistStatsCache = result.NewCache[int, *anilist.Stats]()

// HandleGetAniListStats
//
//	@summary returns the anilist stats.
//	@desc This returns the AniList stats for the user.
//	@route /api/v1/anilist/stats [GET]
//	@returns anilist.Stats
func (h *Handler) HandleGetAniListStats(c echo.Context) error {
	cached, ok := anilistStatsCache.Get(0)
	if ok {
		return h.RespondWithData(c, cached)
	}

	stats, err := h.App.Metadata.AnilistPlatformRef.Get().GetViewerStats(c.Request().Context())
	if err != nil {
		return h.RespondWithError(c, err)
	}

	ret, err := anilist.GetStats(
		c.Request().Context(),
		stats,
	)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	anilistStatsCache.SetT(0, ret, time.Hour*1)

	return h.RespondWithData(c, ret)
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// HandleGetAnilistCacheLayerStatus
//
//	@summary returns the status of the AniList cache layer.
//	@desc This returns the status of the AniList cache layer.
//	@route /api/v1/anilist/cache-layer/status [GET]
//	@returns bool
func (h *Handler) HandleGetAnilistCacheLayerStatus(c echo.Context) error {
	return h.RespondWithData(c, shared_platform.IsWorking.Load())
}

// HandleToggleAnilistCacheLayerStatus
//
//	@summary toggles the status of the AniList cache layer.
//	@desc This toggles the status of the AniList cache layer.
//	@route /api/v1/anilist/cache-layer/status [POST]
//	@returns bool
func (h *Handler) HandleToggleAnilistCacheLayerStatus(c echo.Context) error {
	shared_platform.IsWorking.Store(!shared_platform.IsWorking.Load())
	return h.RespondWithData(c, shared_platform.IsWorking.Load())
}
