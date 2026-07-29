package handlers

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/library/anime"
	librarymetadata "kamehouse/internal/library/metadata"

	"kamehouse/internal/platforms/platform"
	"kamehouse/internal/util/result"
	"net/http"
	"os/exec"
	"runtime"
	"strconv"
	"time"
	"sync"

	"kamehouse/internal/database/models"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

var fillerFetchAttempts sync.Map

func (h *Handler) getAnimeEntry(c echo.Context, lfs []*dto.LocalFile, mID int) (*anime.Entry, error) {
	//

	// Anime collection is no longer used for getting entries

	// Create a new media entry
	entry, err := anime.NewEntry(c.Request().Context(), &anime.NewEntryOptions{
		MediaID:             mID,
		LocalFiles:          lfs,
		Database:            h.App.Database,
		PlatformRef:         h.App.Metadata.Platform,
		MetadataProviderRef: h.App.Metadata.Provider,
		IsSimulated:         h.App.GetUser() != nil && h.App.GetUser().IsSimulated,
		IntelligenceSvc:     h.App.IntelligenceService,
	})
	if err != nil {
		return nil, err
	}

	h.App.FillerManager.HydrateFillerData(entry)

	if !h.App.FillerManager.HasFillerFetched(mID) {
		if _, loading := fillerFetchAttempts.LoadOrStore(mID, true); !loading {
			go func(mediaID int, media *models.LibraryMedia) {
				defer fillerFetchAttempts.Delete(mediaID)
				if media == nil {
					return
				}
				titles := make([]string, 0)
				if media.TitleRomaji != "" {
					titles = append(titles, media.TitleRomaji)
				}
				if media.TitleEnglish != "" {
					titles = append(titles, media.TitleEnglish)
				}
				if media.TitleOriginal != "" {
					titles = append(titles, media.TitleOriginal)
				}
				_ = h.App.FillerManager.FetchAndStoreFillerData(mediaID, titles)
			}(mID, entry.Media)
		}
	}

	// ── TMDB Episode & Media Enrichment ──────────────────────────────────────────────────────────────────────────────
	// If the media has a TmdbID and episodes are missing synopsis/image,
	// fetch TMDB season data and fill in the gaps (best-effort, never fails the request).
	h.enrichEpisodesWithTMDB(c.Request().Context(), entry, nil)
	h.enrichMediaWithTMDB(c.Request().Context(), entry, nil)

	return entry, nil
}






// HandleGetAnimeEntry returns a media entry for the given anime media id.
//
//	@summary return a media entry for the given anime media id.
//	@desc This is used by the anime media entry pages to get all the data about the anime.
//	@desc This includes episodes and metadata (if any), list data, download info...
//	@route /api/v1/library/anime-entry/{id} [GET]
//	@param id - int - true - "Anime media ID"
//	@returns anime.Entry
func (h *Handler) HandleGetAnimeEntry(c echo.Context) error {
	idParam := c.Param("id")
	mID, err := strconv.Atoi(idParam)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	lfs, err := db.GetLocalFilesByMediaID(h.App.Database, mID)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	entry, err := h.getAnimeEntry(c, lfs, mID)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, entry)
}

// HandleGetAnimeEntryLocalFiles returns only the local files for the given anime media id.
//
//	@summary return local files for the given anime media id.
//	@desc Used for fast fetching of playable files (like random play or TV mode).
//	@route /api/v1/library/anime-entry/{id}/local-files [GET]
//	@param id - int - true - "Anime media ID"
//	@returns []dto.LocalFile
func (h *Handler) HandleGetAnimeEntryLocalFiles(c echo.Context) error {
	idParam := c.Param("id")
	mID, err := strconv.Atoi(idParam)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	lfs, err := db.GetLocalFilesByMediaID(h.App.Database, mID)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, lfs)
}

//----------------------------------------------------------------------------------------------------------------------------------------------------

var entriesSuggestionsCache = result.NewCache[string, []*platform.UnifiedMedia]()

// HandleGetAnimeEntrySuggestions returns anime suggestions for the given local files.
//
//	@summary returns anime suggestions for the given local files.
//	@desc Accepts either a directory path (dir) or explicit file paths (paths[]).
//	@desc The frontend codegen contract sends dir; the legacy backend contract sends paths.
//	@route /api/v1/library/anime-entry/suggestions [POST]
//	@param dir - string - false - "Directory of the local files (frontend contract)"
//	@param paths - []string - false - "Explicit file paths (legacy contract)"
//	@returns []*platform.UnifiedMedia
func (h *Handler) HandleGetAnimeEntrySuggestions(c echo.Context) error {

	type body struct {
		// Frontend codegen sends dir (a directory path)
		Dir   string   `json:"dir"`
		Paths []string `json:"paths"`
	}
	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	lfs, _, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	var selectedLfs []*dto.LocalFile

	if b.Dir != "" {
		dir := strings.ReplaceAll(b.Dir, "\\", "/")
		selectedLfs = lo.Filter(lfs, func(lf *dto.LocalFile, _ int) bool {
			norm := strings.ReplaceAll(lf.Path, "\\", "/")
			return strings.HasPrefix(norm, dir)
		})
	} else if len(b.Paths) > 0 {
		selectedLfs = lo.Filter(lfs, func(lf *dto.LocalFile, _ int) bool {
			return matchesAnyRequestedPath(lf.Path, b.Paths)
		})
	} else {
		return h.RespondWithError(c, errors.New("provide either dir or paths"))
	}

	if len(selectedLfs) == 0 {
		return h.RespondWithError(c, errors.New("no local files found for the given location"))
	}

	title := selectedLfs[0].GetParsedTitle()

	if res, ok := entriesSuggestionsCache.Get(title); ok {
		return h.RespondWithData(c, res)
	}

	h.App.Logger.Info().Str("title", title).Msg("handlers: Fetching anime suggestions")

	if h.App.Metadata.TMDBClient == nil {
		return h.RespondWithError(c, errors.New("tmdb client is not configured"))
	}

	provider := librarymetadata.NewTMDBProviderWithClient(h.App.Metadata.TMDBClient, h.App.Database)

	res, err := provider.SearchMedia(c.Request().Context(), title)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Fake UnifiedMedia array for frontend compatibility
	var newSuggestions []*platform.UnifiedMedia
	for _, nm := range res {
		title := &platform.MediaTitle{}
		if nm.Title != nil {
			title.English = nm.Title.English
			title.Romaji = nm.Title.Romaji
			title.Native = nm.Title.Native
		}

		var cover *platform.MediaCoverImage
		if nm.CoverImage != nil {
			cover = &platform.MediaCoverImage{
				ExtraLarge: nm.CoverImage.ExtraLarge,
				Large:      nm.CoverImage.Large,
				Medium:     nm.CoverImage.Medium,
				Color:      nm.CoverImage.Color,
			}
		}

		var startDate *platform.FuzzyDate
		if nm.StartDate != nil {
			startDate = &platform.FuzzyDate{
				Year:  nm.StartDate.Year,
				Month: nm.StartDate.Month,
				Day:   nm.StartDate.Day,
			}
		}

		var format platform.MediaFormat
		if nm.Format != nil {
			format = platform.MediaFormat(*nm.Format)
		}

		var status platform.MediaStatus
		if nm.Status != nil {
			status = platform.MediaStatus(*nm.Status)
		}

		newSuggestions = append(newSuggestions, &platform.UnifiedMedia{
			ID:         nm.ID,
			Title:      title,
			CoverImage: cover,
			Format:     format,
			StartDate:  startDate,
			Status:     status,
		})
	}

	entriesSuggestionsCache.SetT(title, newSuggestions, 1*time.Hour)

	return h.RespondWithData(c, newSuggestions)
}

// HandleUpdateAnimeEntryProgress updates the progress of an anime entry.
//
//	@summary updates the progress of an anime entry.
//	@desc This is used when the user manually updates the progress of an anime.
//	@route /api/v1/library/anime-entry/progress [POST]
//	@param mediaID - int - true - "Anime media ID"
//	@param progress - int - true - "New progress"
//	@returns bool
func (h *Handler) HandleUpdateAnimeEntryProgress(c echo.Context) error {

	type body struct {
		MediaID  int `json:"mediaId"`
		Progress int `json:"progress"`
	}
	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	err := h.App.Metadata.Platform.UpdateEntryProgress(c.Request().Context(), b.MediaID, b.Progress, nil)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	_, _ = h.App.Metadata.Platform.RefreshAnimeCollection(context.Background())
	ClearLibraryCollectionCache()


	return h.RespondWithData(c, true)
}

// HandleUpdateAnimeEntryRepeat updates the repeat count of an anime entry.
//
//	@summary updates the repeat count of an anime entry.
//	@desc This is used when the user manually updates the repeat count of an anime.
//	@route /api/v1/library/anime-entry/repeat [POST]
//	@param mediaID - int - true - "Anime media ID"
//	@param repeat - int - true - "New repeat count"
//	@returns bool
func (h *Handler) HandleUpdateAnimeEntryRepeat(c echo.Context) error {

	type body struct {
		MediaID int `json:"mediaId"`
		Repeat  int `json:"repeat"`
	}
	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	err := h.App.Metadata.Platform.UpdateEntryRepeat(c.Request().Context(), b.MediaID, b.Repeat)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	_, _ = h.App.Metadata.Platform.RefreshAnimeCollection(context.Background())
	ClearLibraryCollectionCache()


	return h.RespondWithData(c, true)
}

// HandleAnimeEntryManualMatch is used to manually match a group of local files to a media.
//
//	@summary manually match a group of local files to a media.
//	@desc It will create a new scanner and run it for the selected files.
//	@route /api/v1/library/anime-entry/manual-match [POST]
//	@returns bool
func (h *Handler) HandleAnimeEntryManualMatch(c echo.Context) error {
	type body struct {
		MediaID int      `json:"mediaId"`
		Paths   []string `json:"paths"`
	}
	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	lfs, lfsID, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Get the local files that are being matched
	selectedLfs := lo.Filter(lfs, func(lf *dto.LocalFile, _ int) bool {
		return matchesAnyRequestedPath(lf.Path, b.Paths)
	})
	if len(selectedLfs) == 0 {
		return h.RespondWithError(c, errors.New("no local files found for the given paths"))
	}

	// Clear metadata cache to ensure fresh data
	_ = db.DeleteMetadataCache(h.App.Database, "jikan-anime-episodes", strconv.Itoa(b.MediaID))
	_ = db.DeleteMetadataCache(h.App.Database, "tmdb-tv-details", strconv.Itoa(b.MediaID))
	_ = db.DeleteMetadataCache(h.App.Database, "tmdb-movie-details", strconv.Itoa(b.MediaID))
	h.App.Metadata.Provider.ClearCache()

	libraryMediaID, err := h.ensureLibraryMediaForManualMatch(c.Request().Context(), b.MediaID, lfs)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	for _, lf := range selectedLfs {
		lf.MediaID = b.MediaID
		lf.LibraryMediaId = libraryMediaID
		lf.Locked = true
		lf.Ignored = false
		ensureManualMatchMetadata(lf)
	}

	if lfsID == 0 {
		_, err = db.InsertLocalFiles(h.App.Database, lfs)
	} else {
		_, err = db.SaveLocalFiles(h.App.Database, lfsID, lfs)
	}
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Refresh the collection
	_, _ = h.App.Metadata.Platform.RefreshAnimeCollection(context.Background())
	ClearLibraryCollectionCache()

	return h.RespondWithData(c, true)
}

// HandleAnimeEntryUnmatch will unmatch the given local files.
//
//	@summary unmatch the given local files.
//	@desc It will set the mediaID of the files to 0 and remove the metadata.
//	@route /api/v1/library/anime-entry/unmatch [POST]
//	@returns bool
func (h *Handler) HandleAnimeEntryUnmatch(c echo.Context) error {
	type body struct {
		Paths []string `json:"paths"`
	}
	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	lfs, lfsID, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Get the local files that are being unmatched
	selectedLfs := lo.Filter(lfs, func(lf *dto.LocalFile, _ int) bool {
		return matchesAnyRequestedPath(lf.Path, b.Paths)
	})
	if len(selectedLfs) == 0 {
		return h.RespondWithError(c, errors.New("no local files found for the given paths"))
	}

	// Unmatch the files
	for _, lf := range selectedLfs {
		lf.MediaID = 0
		lf.Metadata = nil
		lf.Locked = false
		lf.Ignored = false
	}

	// Save local files
	_, err = db.SaveLocalFiles(h.App.Database, lfsID, lfs)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	ClearLibraryCollectionCache()



	return h.RespondWithData(c, true)
}

// HandleDeletePlatformEntry will delete the given media entry from Platform.
func (h *Handler) HandleDeletePlatformEntry(c echo.Context) error {
	type body struct {
		MediaID int `json:"mediaId"`
	}
	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	// Delete the entry from the user's collection
	if err := h.App.Metadata.Platform.DeleteEntry(c.Request().Context(), b.MediaID, b.MediaID); err != nil {
		return h.RespondWithError(c, errors.New("error: Platform responded with an error, this is most likely a rate limit issue"))
	}
	_, _ = h.App.Metadata.Platform.RefreshAnimeCollection(context.Background())

	return h.RespondWithData(c, true)
}



// HandleGetMissingEpisodes returns a list of missing episodes.
//
//	@summary returns a list of missing episodes.
//	@desc This is used by the "Missing episodes" page to display the missing episodes.
//	@route /api/v1/library/missing-episodes [GET]
//	@returns anime.MissingEpisodes
func (h *Handler) HandleGetMissingEpisodes(c echo.Context) error {
	mIds, _ := h.App.Database.GetSilencedMediaEntryIds()

	lfs, _, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	missing := anime.NewMissingEpisodes(&anime.NewMissingEpisodesOptions{
		Database:            h.App.Database,
		LocalFiles:          lfs,
		SilencedMediaIds:    mIds,
		MetadataProviderRef: h.App.Metadata.Provider,
	})

	return h.RespondWithData(c, missing)
}

// HandleSilenceMissingEpisodes will silence the missing episodes for the given media.
func (h *Handler) HandleSilenceMissingEpisodes(c echo.Context) error {
	type body struct {
		MediaID int `json:"mediaId"`
	}
	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	if err := h.App.Database.InsertSilencedMediaEntry(uint(b.MediaID)); err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, true)
}

// HandleGetUpcomingEpisodes returns a list of upcoming episodes.
//
//	@summary returns a list of upcoming episodes.
//	@desc This is used by the "Upcoming" page to display the upcoming episodes.
//	@route /api/v1/library/upcoming-episodes [GET]
//	@returns anime.UpcomingEpisodes
func (h *Handler) HandleGetUpcomingEpisodes(c echo.Context) error {
	animeCollection, err := h.App.GetAnimeCollection(false)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	upcoming := anime.NewUpcomingEpisodes(&anime.NewUpcomingEpisodesOptions{
		AnimeCollection:     animeCollection,
		MetadataProviderRef: h.App.Metadata.Provider,
	})

	return h.RespondWithData(c, upcoming)
}

// --- Anime Entry Actions ---

func (h *Handler) HandleAnimeEntryBulkAction(c echo.Context) error {
	type body struct {
		MediaID int    `json:"mediaId"`
		Action  string `json:"action"`
	}
	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}
	if b.MediaID == 0 {
		return c.JSON(http.StatusBadRequest, NewErrorResponse(fmt.Errorf("mediaID is required")))
	}

	lfs, err := db.GetLocalFilesByMediaID(h.App.Database, b.MediaID)
	if err != nil {
		return h.RespondWithError(c, err)
	}
	if len(lfs) == 0 {
		return h.RespondWithData(c, true) // no-op
	}

	for _, lf := range lfs {
		switch b.Action {
		case "lock":
			lf.Locked = true
		case "unlock":
			lf.Locked = false
		case "ignore":
			lf.Ignored = true
			lf.Locked = false
		case "unignore":
			lf.Ignored = false
		}
	}

	if _, err := db.SaveLocalFiles(h.App.Database, 0, lfs); err != nil {
		return h.RespondWithError(c, err)
	}
	return h.RespondWithData(c, true)
}

func (h *Handler) HandleOpenAnimeEntryInExplorer(c echo.Context) error {
	type body struct {
		MediaID int `json:"mediaId"`
	}
	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	lfs, err := db.GetLocalFilesByMediaID(h.App.Database, b.MediaID)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	var targetPath string
	for _, lf := range lfs {
		if lf.MediaID == b.MediaID && lf.Path != "" {
			targetPath = lf.Path
			break
		}
	}

	if targetPath == "" {
		return c.JSON(http.StatusNotFound, NewErrorResponse(fmt.Errorf("no local files found for mediaID %d", b.MediaID)))
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("explorer", "/select,", targetPath)
	case "darwin":
		cmd = exec.Command("open", "-R", targetPath)
	default:
		cmd = exec.Command("xdg-open", targetPath)
	}

	if err := cmd.Start(); err != nil {
		h.App.Logger.Warn().Err(err).Str("path", targetPath).Msg("handlers: Could not open file explorer")
	}
	return h.RespondWithData(c, true)
}

// HandleGetAnimeEntrySilenceStatus returns a stable no-op silence status.
//
//	@summary returns the silence status.
//	@param id - int - true - "Anime media ID"
//	@route /api/v1/library/anime-entry/silence/{id} [GET]
//	@returns bool
func (h *Handler) HandleGetAnimeEntrySilenceStatus(c echo.Context) error {
	return h.RespondWithData(c, map[string]interface{}{
		"mediaID":  c.Param("id"),
		"silenced": false,
	})
}

// HandleToggleAnimeEntrySilenceStatus toggles the silence flag (no-op until DB column exists).
//
//	@summary toggles the silence flag.
//	@route /api/v1/library/anime-entry/silence [POST]
//	@returns bool
func (h *Handler) HandleToggleAnimeEntrySilenceStatus(c echo.Context) error {
	type body struct {
		MediaID int `json:"mediaId"`
	}
	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}
	return h.RespondWithData(c, map[string]interface{}{
		"mediaID":  b.MediaID,
		"silenced": false, // Placeholder until silence column is added to DB
	})
}

