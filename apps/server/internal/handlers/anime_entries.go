package handlers

import (
	"errors"
	"fmt"
	"kamehouse/internal/api/anilist"
	"kamehouse/internal/customsource"

	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/hook"
	"kamehouse/internal/library/anime"
	librarymetadata "kamehouse/internal/library/metadata"
	"kamehouse/internal/library/scanner"
	"kamehouse/internal/library/summary"
	"kamehouse/internal/util"
	"kamehouse/internal/util/limiter"
	"kamehouse/internal/util/result"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
	lop "github.com/samber/lo/parallel"
	"gorm.io/gorm"
)

func getActiveProvider(h *Handler) librarymetadata.Provider {
	var useTMDB bool
	var tmdbToken string
	var tmdbLanguage string
	if settings, err := h.App.Database.GetSettings(); err == nil && settings.Library != nil {
		useTMDB = settings.Library.ScannerProvider == "tmdb"
		tmdbToken = settings.Library.TmdbApiKey
		tmdbLanguage = settings.Library.TmdbLanguage
	}
	if tmdbToken == "" {
		tmdbToken = os.Getenv("KAMEHOUSE_TMDB_TOKEN")
	}

	if useTMDB {
		if tmdbToken != "" {
			return librarymetadata.NewTMDBProvider(tmdbToken, tmdbLanguage)
		} else {
			h.App.Logger.Warn().Msg("handlers: TMDB mode requested but TMDB token not set, falling back to AniList")
		}
	}

	return librarymetadata.NewAniListProvider(h.App.Metadata.AnilistClientRef.Get())
}

func (h *Handler) getAnimeEntry(c echo.Context, lfs []*dto.LocalFile, mId int) (*anime.Entry, error) {
	// Get the host anime library files
	nakamaLfs, customSourceMap, hydratedFromNakama := h.App.NakamaManager.GetHostAnimeLibraryFiles(c.Request().Context(), mId)
	if hydratedFromNakama && nakamaLfs != nil {
		lfs = nakamaLfs
		// for each local file, if it's matched to a custom source, convert the ID using the local extension identifier
		// this is needed because the custom source media ID returned by the host will not match the local one
		for _, lf := range lfs {
			if !customsource.IsExtensionId(lf.MediaId) {
				continue
			}
			_, localId := customsource.ExtractExtensionData(lf.MediaId)
			extensionId, ok := customSourceMap[lf.MediaId]
			if !ok {
				continue // custom source not found
			}

			// Find the same extension, if it's not installed, skip it
			customSource, ok := h.App.ExtensionRepository.GetCustomSourceExtensionByID(extensionId)
			if !ok {
				continue
			}

			// Generate a new ID for the custom source media
			newId := customsource.GenerateMediaId(customSource.GetExtensionIdentifier(), localId)
			lf.MediaId = newId
		}
	}

	// Anime collection is no longer used for getting entries

	// Create a new media entry
	entry, err := anime.NewEntry(c.Request().Context(), &anime.NewEntryOptions{
		MediaId:             mId,
		LocalFiles:          lfs,
		Database:            h.App.Database,
		PlatformRef:         h.App.Metadata.AnilistPlatformRef,
		MetadataProviderRef: h.App.Metadata.ProviderRef,
		IsSimulated:         h.App.GetUser().IsSimulated,
	})
	if err != nil {
		return nil, err
	}

	fillerEvent := new(anime.AnimeEntryFillerHydrationEvent)
	fillerEvent.Entry = entry
	err = hook.GlobalHookManager.OnAnimeEntryFillerHydration().Trigger(fillerEvent)
	if err != nil {
		return nil, h.RespondWithError(c, err)
	}
	entry = fillerEvent.Entry

	if !fillerEvent.DefaultPrevented {
		h.App.FillerManager.HydrateFillerData(fillerEvent.Entry)
	}

	if hydratedFromNakama {
		entry.IsNakamaEntry = true
		for _, ep := range entry.Episodes {
			ep.IsNakamaEpisode = true
		}
	}

	return entry, nil
}

// HandleGetAnimeEntry
//
//	@summary return a media entry for the given AniList anime media id.
//	@desc This is used by the anime media entry pages to get all the data about the anime.
//	@desc This includes episodes and metadata (if any), AniList list data, download info...
//	@route /api/v1/library/anime-entry/{id} [GET]
//	@param id - int - true - "AniList anime media ID"
//	@returns anime.Entry
func (h *Handler) HandleGetAnimeEntry(c echo.Context) error {
	idParam := c.Param("id")
	mId, err := strconv.Atoi(idParam)
	if err != nil {
		// If it's not a number, try search by external ID (slug/custom)
		media, err := db.GetLibraryMediaByExternalID(h.App.Database, idParam)
		if err != nil {
			return h.RespondWithError(c, err)
		}
		mId = int(media.ID)
	}

	// Get all the local files
	lfs, _, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	entry, err := h.getAnimeEntry(c, lfs, mId)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, entry)
}

//----------------------------------------------------------------------------------------------------------------------

// HandleAnimeEntryBulkAction
//
//	@summary perform given action on all the local files for the given media id.
//	@desc This is used to unmatch or toggle the lock status of all the local files for a specific media entry
//	@desc The response is not used in the frontend. The client should just refetch the entire media entry data.
//	@route /api/v1/library/anime-entry/bulk-action [PATCH]
//	@returns []dto.LocalFile
func (h *Handler) HandleAnimeEntryBulkAction(c echo.Context) error {

	type body struct {
		MediaId int    `json:"mediaId"`
		Action  string `json:"action"` // "unmatch" or "toggle-lock"
	}

	p := new(body)
	if err := c.Bind(p); err != nil {
		return h.RespondWithError(c, err)
	}

	// Get all the local files
	lfs, lfsId, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Group local files by media id
	groupedLfs := anime.GroupLocalFilesByMediaID(lfs)

	selectLfs, ok := groupedLfs[p.MediaId]
	if !ok {
		return h.RespondWithError(c, errors.New("no local files found for media id"))
	}

	switch p.Action {
	case "unmatch":
		lfs = lop.Map(lfs, func(item *dto.LocalFile, _ int) *dto.LocalFile {
			if item.MediaId == p.MediaId && p.MediaId != 0 {
				item.MediaId = 0
				item.Locked = false
				item.Ignored = false
			}
			return item
		})
	case "toggle-lock":
		// Flip the locked status of all the local files for the given media
		allLocked := lo.EveryBy(selectLfs, func(item *dto.LocalFile) bool { return item.Locked })
		lfs = lop.Map(lfs, func(item *dto.LocalFile, _ int) *dto.LocalFile {
			if item.MediaId == p.MediaId && p.MediaId != 0 {
				item.Locked = !allLocked
			}
			return item
		})
	}

	// Save the local files
	retLfs, err := db.SaveLocalFiles(h.App.Database, lfsId, lfs)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, retLfs)

}

//----------------------------------------------------------------------------------------------------------------------

// HandleOpenAnimeEntryInExplorer
//
//	@summary opens the directory of a media entry in the file explorer.
//	@desc This finds a common directory for all media entry local files and opens it in the file explorer.
//	@desc Returns 'true' whether the operation was successful or not, errors are ignored.
//	@route /api/v1/library/anime-entry/open-in-explorer [POST]
//	@returns bool
func (h *Handler) HandleOpenAnimeEntryInExplorer(c echo.Context) error {

	type body struct {
		MediaId int `json:"mediaId"`
	}

	p := new(body)
	if err := c.Bind(p); err != nil {
		return h.RespondWithError(c, err)
	}

	// Get all the local files
	lfs, _, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	lf, found := lo.Find(lfs, func(i *dto.LocalFile) bool {
		return i.MediaId == p.MediaId
	})
	if !found {
		return h.RespondWithError(c, errors.New("local file not found"))
	}

	dir := filepath.Dir(lf.GetNormalizedPath())
	cmd := ""
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "explorer"
		wPath := strings.ReplaceAll(strings.ToLower(dir), "/", "\\")
		args = []string{wPath}
	case "darwin":
		cmd = "open"
		args = []string{dir}
	case "linux":
		cmd = "xdg-open"
		args = []string{dir}
	default:
		return fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
	cmdObj := util.NewCmd(cmd, args...)
	cmdObj.Stdout = os.Stdout
	cmdObj.Stderr = os.Stderr
	_ = cmdObj.Run()

	return h.RespondWithData(c, true)

}

//----------------------------------------------------------------------------------------------------------------------

var (
	entriesSuggestionsCache = result.NewCache[string, []*anilist.BaseAnime]()
)

// HandleFetchAnimeEntrySuggestions
//
//	@summary returns a list of media suggestions for files in the given directory.
//	@desc This is used by the "Resolve unmatched media" feature to suggest media entries for the local files in the given directory.
//	@desc If some matches files are found in the directory, it will ignore them and base the suggestions on the remaining files.
//	@route /api/v1/library/anime-entry/suggestions [POST]
//	@returns []anilist.BaseAnime
func (h *Handler) HandleFetchAnimeEntrySuggestions(c echo.Context) error {

	type body struct {
		Dir string `json:"dir"`
	}

	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	b.Dir = util.NormalizePath(b.Dir)

	suggestions, found := entriesSuggestionsCache.Get(b.Dir)
	if found {
		return h.RespondWithData(c, suggestions)
	}

	// Retrieve local files
	lfs, _, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Group local files by dir
	groupedLfs := lop.GroupBy(lfs, func(item *dto.LocalFile) string {
		return util.NormalizePath(filepath.Dir(item.GetNormalizedPath()))
	})

	selectedLfs, found := groupedLfs[b.Dir]
	if !found {
		return h.RespondWithError(c, errors.New("no local files found for selected directory"))
	}

	// Filter out local files that are already matched
	selectedLfs = lo.Filter(selectedLfs, func(item *dto.LocalFile, _ int) bool {
		return item.MediaId == 0
	})

	title := selectedLfs[0].GetParsedTitle()

	h.App.Logger.Info().Str("title", title).Msg("handlers: Fetching anime suggestions")

	provider := getActiveProvider(h)
	if provider == nil {
		return h.RespondWithError(c, errors.New("metadata provider is not configured"))
	}

	res, err := provider.SearchMedia(c.Request().Context(), title)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Fake BaseAnime array for frontend compatibility
	var newSuggestions []*anilist.BaseAnime
	for _, nm := range res {
		title := &anilist.BaseAnime_Title{}
		if nm.Title != nil {
			title.English = nm.Title.English
			title.Romaji = nm.Title.Romaji
			title.Native = nm.Title.Native
			title.UserPreferred = nm.Title.UserPreferred
		}

		var cover *anilist.BaseAnime_CoverImage
		if nm.CoverImage != nil {
			cover = &anilist.BaseAnime_CoverImage{
				ExtraLarge: nm.CoverImage.ExtraLarge,
				Large:      nm.CoverImage.Large,
				Medium:     nm.CoverImage.Medium,
				Color:      nm.CoverImage.Color,
			}
		}

		var startDate *anilist.BaseAnime_StartDate
		if nm.StartDate != nil {
			startDate = &anilist.BaseAnime_StartDate{
				Year:  nm.StartDate.Year,
				Month: nm.StartDate.Month,
				Day:   nm.StartDate.Day,
			}
		}

		var format *anilist.MediaFormat
		if nm.Format != nil {
			f := anilist.MediaFormat(*nm.Format)
			format = &f
		}

		var status *anilist.MediaStatus
		if nm.Status != nil {
			s := anilist.MediaStatus(*nm.Status)
			status = &s
		}

		newSuggestions = append(newSuggestions, &anilist.BaseAnime{
			ID:         nm.ID,
			Title:      title,
			CoverImage: cover,
			Format:     format,
			StartDate:  startDate,
			Status:     status,
		})
	}

	// Cache the results
	entriesSuggestionsCache.Set(b.Dir, newSuggestions)

	return h.RespondWithData(c, newSuggestions)
}

//----------------------------------------------------------------------------------------------------------------------

// HandleAnimeEntryManualMatch
//
//	@summary matches un-matched local files in the given directory to the given media.
//	@desc It is used by the "Resolve unmatched media" feature to manually match local files to a specific media entry.
//	@desc Matching involves the use of scanner.FileHydrator. It will also lock the files.
//	@desc The response is not used in the frontend. The client should just refetch the entire library collection.
//	@route /api/v1/library/anime-entry/manual-match [POST]
//	@returns []dto.LocalFile
func (h *Handler) HandleAnimeEntryManualMatch(c echo.Context) error {

	type body struct {
		Paths   []string `json:"paths"`
		MediaId int      `json:"mediaId"`
	}

	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	animeCollectionWithRelations, err := h.App.Metadata.AnilistPlatformRef.Get().GetAnimeCollectionWithRelations(c.Request().Context())
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Retrieve local files
	lfs, lfsId, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	compPaths := make(map[string]struct{})
	for _, p := range b.Paths {
		compPaths[util.NormalizePath(p)] = struct{}{}
	}

	selectedLfs := lo.Filter(lfs, func(item *dto.LocalFile, _ int) bool {
		_, found := compPaths[item.GetNormalizedPath()]
		return found && item.MediaId == 0
	})

	// Add the media id to the selected local files
	// Also, lock the files
	selectedLfs = lop.Map(selectedLfs, func(item *dto.LocalFile, _ int) *dto.LocalFile {
		item.MediaId = b.MediaId
		item.Locked = true
		item.Ignored = false
		return item
	})

	provider := getActiveProvider(h)
	if provider == nil {
		return h.RespondWithError(c, errors.New("metadata provider is not configured"))
	}
	nm, err := provider.GetMediaDetails(c.Request().Context(), strconv.Itoa(b.MediaId))
	if err != nil {
		return h.RespondWithError(c, err)
	}

	normalizedMedia := []*dto.NormalizedMedia{nm}

	scanLogger, err := scanner.NewScanLogger(h.App.Config.Logs.Dir)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Create scan summary logger
	scanSummaryLogger := summary.NewScanSummaryLogger()

	fh := scanner.FileHydrator{
		LocalFiles:          selectedLfs,
		CompleteAnimeCache:  anilist.NewCompleteAnimeCache(),
		PlatformRef:         h.App.Metadata.AnilistPlatformRef,
		MetadataProviderRef: h.App.Metadata.ProviderRef,
		AnilistRateLimiter:  limiter.NewAnilistLimiter(),
		Logger:              h.App.Logger,
		ScanLogger:          scanLogger,
		ScanSummaryLogger:   scanSummaryLogger,
		AllMedia:            normalizedMedia,
		ForceMediaId:        nm.ID,
	}

	fh.HydrateMetadata()

	// Hydrate the summary logger before merging files
	fh.ScanSummaryLogger.HydrateData(selectedLfs, normalizedMedia, animeCollectionWithRelations)

	// Save the scan summary
	go func() {
		err = db.InsertScanSummary(h.App.Database, scanSummaryLogger.GenerateSummary())
	}()

	// Remove select local files from the database slice, we will add them (hydrated) later
	selectedPaths := lop.Map(selectedLfs, func(item *dto.LocalFile, _ int) string { return item.GetNormalizedPath() })
	lfs = lo.Filter(lfs, func(item *dto.LocalFile, _ int) bool {
		if slices.Contains(selectedPaths, item.GetNormalizedPath()) {
			return false
		}
		return true
	})

	// Event
	event := new(anime.AnimeEntryManualMatchBeforeSaveEvent)
	event.MediaId = b.MediaId
	event.Paths = b.Paths
	event.MatchedLocalFiles = selectedLfs
	err = hook.GlobalHookManager.OnAnimeEntryManualMatchBeforeSave().Trigger(event)
	if err != nil {
		return h.RespondWithError(c, fmt.Errorf("OnAnimeEntryManualMatchBeforeSave: %w", err))
	}

	// Default prevented, do not save the local files
	if event.DefaultPrevented {
		return h.RespondWithData(c, lfs)
	}

	// Add the hydrated local files to the slice
	lfs = append(lfs, event.MatchedLocalFiles...)

	// Update the local files
	retLfs, err := db.SaveLocalFiles(h.App.Database, lfsId, lfs)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, retLfs)
}

//----------------------------------------------------------------------------------------------------------------------

var missingEpisodesCache *anime.MissingEpisodes

// HandleGetMissingEpisodes
//
//	@summary returns a list of episodes missing from the user's library collection
//	@desc It detects missing episodes by comparing the user's AniList collection 'next airing' data with the local files.
//	@desc This route can be called multiple times, as it does not bypass the cache.
//	@route /api/v1/library/missing-episodes [GET]
//	@returns anime.MissingEpisodes
func (h *Handler) HandleGetMissingEpisodes(c echo.Context) error {
	h.App.AddOnRefreshAnilistCollectionFunc("HandleGetMissingEpisodes", func() {
		missingEpisodesCache = nil
	})

	if missingEpisodesCache != nil {
		return h.RespondWithData(c, missingEpisodesCache)
	}

	// Anime collection is no longer used for missing episodes calculation

	lfs, _, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Get the silenced media ids
	silencedMediaIds, _ := h.App.Database.GetSilencedMediaEntryIds()

	missingEps := anime.NewMissingEpisodes(&anime.NewMissingEpisodesOptions{
		Database:            h.App.Database,
		LocalFiles:          lfs,
		SilencedMediaIds:    silencedMediaIds,
		MetadataProviderRef: h.App.Metadata.ProviderRef,
	})

	event := new(anime.MissingEpisodesEvent)
	event.MissingEpisodes = missingEps
	err = hook.GlobalHookManager.OnMissingEpisodes().Trigger(event)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	missingEpisodesCache = event.MissingEpisodes

	return h.RespondWithData(c, event.MissingEpisodes)
}

//----------------------------------------------------------------------------------------------------------------------

var upcomingEpisodesCache *anime.UpcomingEpisodes

// HandleGetUpcomingEpisodes
//
//	@summary returns a list of upcoming episodes based on the user's anime collection
//	@desc It uses the AniList 'next airing episode' data to determine upcoming episodes.
//	@desc This route can be called multiple times, as it does not bypass the cache.
//	@route /api/v1/library/upcoming-episodes [GET]
//	@returns anime.UpcomingEpisodes
func (h *Handler) HandleGetUpcomingEpisodes(c echo.Context) error {
	h.App.AddOnRefreshAnilistCollectionFunc("HandleGetUpcomingEpisodes", func() {
		upcomingEpisodesCache = nil
	})

	if upcomingEpisodesCache != nil {
		return h.RespondWithData(c, upcomingEpisodesCache)
	}

	// Get the user's anilist collection
	animeCollection, err := h.App.GetAnimeCollection(false)
	if err != nil {
		return h.RespondWithError(c, err)
	}
	upcomingEps := anime.NewUpcomingEpisodes(&anime.NewUpcomingEpisodesOptions{
		AnimeCollection:     animeCollection,
		MetadataProviderRef: h.App.Metadata.ProviderRef,
	})

	event := new(anime.UpcomingEpisodesEvent)
	event.UpcomingEpisodes = upcomingEps
	err = hook.GlobalHookManager.OnUpcomingEpisodes().Trigger(event)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	upcomingEpisodesCache = event.UpcomingEpisodes

	return h.RespondWithData(c, event.UpcomingEpisodes)
}

//----------------------------------------------------------------------------------------------------------------------

// HandleGetAnimeEntrySilenceStatus
//
//	@summary returns the silence status of a media entry.
//	@param id - int - true - "The ID of the media entry."
//	@route /api/v1/library/anime-entry/silence/{id} [GET]
//	@returns models.SilencedMediaEntry
func (h *Handler) HandleGetAnimeEntrySilenceStatus(c echo.Context) error {
	mId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return h.RespondWithError(c, errors.New("invalid id"))
	}

	animeEntry, err := h.App.Database.GetSilencedMediaEntry(uint(mId))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return h.RespondWithData(c, false)
		} else {
			return h.RespondWithError(c, err)
		}
	}

	return h.RespondWithData(c, animeEntry)
}

// HandleToggleAnimeEntrySilenceStatus
//
//	@summary toggles the silence status of a media entry.
//	@desc The missing episodes should be re-fetched after this.
//	@route /api/v1/library/anime-entry/silence [POST]
//	@returns bool
func (h *Handler) HandleToggleAnimeEntrySilenceStatus(c echo.Context) error {

	type body struct {
		MediaId int `json:"mediaId"`
	}

	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	animeEntry, err := h.App.Database.GetSilencedMediaEntry(uint(b.MediaId))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			err = h.App.Database.InsertSilencedMediaEntry(uint(b.MediaId))
			if err != nil {
				return h.RespondWithError(c, err)
			}
			return h.RespondWithData(c, true)
		} else {
			return h.RespondWithError(c, err)
		}
	}

	err = h.App.Database.DeleteSilencedMediaEntry(animeEntry.ID)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, true)
}

//-----------------------------------------------------------------------------------------------------------------------------

// HandleUpdateAnimeEntryProgress
//
//	@summary update the progress of the given anime media entry.
//	@desc This is used to update the progress of the given anime media entry on AniList.
//	@desc The response is not used in the frontend, the client should just refetch the entire media entry data.
//	@desc NOTE: This is currently only used by the 'Online streaming' feature since anime progress updates are handled by the Playback Manager.
//	@route /api/v1/library/anime-entry/update-progress [POST]
//	@returns bool
func (h *Handler) HandleUpdateAnimeEntryProgress(c echo.Context) error {

	type body struct {
		MediaId        int  `json:"mediaId"`
		MalId          int  `json:"malId,omitempty"`
		EpisodeNumber  int  `json:"episodeNumber"`
		TotalEpisodes  int  `json:"totalEpisodes"`
		LibraryMediaId uint `json:"libraryMediaId,omitempty"`
	}

	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	// For TMDB-only media (negative or zero mediaId), update progress locally
	if b.MediaId <= 0 && b.LibraryMediaId > 0 {
		status := "CURRENT"
		if b.TotalEpisodes > 0 && b.EpisodeNumber >= b.TotalEpisodes {
			status = "COMPLETED"
		}

		_, err := db.InsertMediaEntryListData(h.App.Database, &models.MediaEntryListData{
			LibraryMediaID: b.LibraryMediaId,
			Status:         status,
			Progress:       b.EpisodeNumber,
		})
		if err != nil {
			return h.RespondWithError(c, err)
		}

		return h.RespondWithData(c, true)
	}

	// Update the progress on AniList (for AniList-tracked media)
	err := h.App.Metadata.AnilistPlatformRef.Get().UpdateEntryProgress(
		c.Request().Context(),
		b.MediaId,
		b.EpisodeNumber,
		&b.TotalEpisodes,
	)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	_, _ = h.App.RefreshAnimeCollection() // Refresh the AniList collection

	return h.RespondWithData(c, true)
}

//-----------------------------------------------------------------------------------------------------------------------------

// HandleUpdateAnimeEntryRepeat
//
//	@summary update the repeat value of the given anime media entry.
//	@desc This is used to update the repeat value of the given anime media entry on AniList.
//	@desc The response is not used in the frontend, the client should just refetch the entire media entry data.
//	@route /api/v1/library/anime-entry/update-repeat [POST]
//	@returns bool
func (h *Handler) HandleUpdateAnimeEntryRepeat(c echo.Context) error {

	type body struct {
		MediaId int `json:"mediaId"`
		Repeat  int `json:"repeat"`
	}

	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	err := h.App.Metadata.AnilistPlatformRef.Get().UpdateEntryRepeat(
		c.Request().Context(),
		b.MediaId,
		b.Repeat,
	)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	//_, _ = h.App.RefreshAnimeCollection() // Refresh the AniList collection

	return h.RespondWithData(c, true)
}
