package handlers

import (
	"fmt"
	"kamehouse/internal/constants"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/library/anime"
	"strconv"

	"github.com/labstack/echo/v4"
)

func (h *Handler) getAnimeEpisodeCollection(c echo.Context, mID int) (*anime.EpisodeCollection, error) {

	h.App.AddOnRefreshAnimeCollectionFunc("HandleGetAnimeEpisodeCollection", func() {
		anime.ClearEpisodeCollectionCache()
	})

	// For TMDB-only media (negative IDs), build episode collection from local LibraryEpisode data
	if mID <= 0 {
		return h.getTMDBEpisodeCollection(mID)
	}

completeAnime, err := h.App.Metadata.Platform.GetAnime(c.Request().Context(), mID)
	if err != nil {
		return nil, err
	}
	animeMetadata, err := h.App.Metadata.Provider.GetAnimeMetadata(mID)
	if err != nil {
		return nil, err
	}

	baseAnime, ok := completeAnime.(interface{ ToBaseAnime() *models.LibraryMedia })
	if !ok {
		return nil, fmt.Errorf("anime type does not implement ToBaseAnime")
	}

	ec, err := anime.NewEpisodeCollection(anime.NewEpisodeCollectionOptions{
		AnimeMetadata:       animeMetadata,
		Media:               baseAnime.ToBaseAnime(),
		MetadataProviderRef: h.App.Metadata.Provider,
		Logger:              h.App.Logger,
	})
	if err != nil {
		return nil, err
	}

	h.App.FillerManager.HydrateEpisodeFillerData(mID, ec.Episodes)

	return ec, nil
}

// getTMDBEpisodeCollection builds an EpisodeCollection from local LibraryEpisode records.
// Used for TMDB-only media that don't have Platform metadata.
func (h *Handler) getTMDBEpisodeCollection(mID int) (*anime.EpisodeCollection, error) {
	// The TMDB ID is stored as the negative of the NormalizedMedia ID
	tmdbID := -mID

	// Look for LibraryMedia that has this TMDB ID
	var libraryMedia *models.LibraryMedia
	var err error
	if tmdbID >= constants.MovieIDOffset {
		libraryMedia, err = db.GetLibraryMediaByTmdbIdAndType(h.App.Database, tmdbID-constants.MovieIDOffset, "MOVIE")
	} else {
		libraryMedia, err = db.GetLibraryMediaByTmdbIdAndType(h.App.Database, tmdbID, "SHOW")
	}
	if err != nil || libraryMedia == nil {
		return &anime.EpisodeCollection{
			Episodes: make([]*anime.Episode, 0),
		}, nil
	}

	// Get episodes from the database
	libEpisodes, err := db.GetLibraryEpisodesByMediaID(h.App.Database, libraryMedia.ID)
	if err != nil {
		return &anime.EpisodeCollection{
			Episodes: make([]*anime.Episode, 0),
		}, nil
	}

	// Convert LibraryEpisode to anime.Episode
	episodes := make([]*anime.Episode, 0, len(libEpisodes))
	for _, libEp := range libEpisodes {
		displayTitle := "Episode " + strconv.Itoa(libEp.EpisodeNumber)
		if libraryMedia.Format == "MOVIE" {
			displayTitle = libraryMedia.GetPreferredTitle()
		}

		epMeta := &anime.EpisodeMetadata{
			Image:    libEp.Image,
			Summary:  libEp.Description,
			Overview: libEp.Description,
			Length:   libEp.RuntimeMinutes,
			Title:    libEp.Title,
			HasImage: libEp.Image != "",
		}
		if !libEp.AirDate.IsZero() {
			epMeta.AirDate = libEp.AirDate.Format("2006-01-02")
		}

		epType := dto.LocalFileTypeMain
		if libEp.Type == "SPECIAL" {
			epType = dto.LocalFileTypeSpecial
		}

		ep := &anime.Episode{
			Type:            epType,
			DisplayTitle:    displayTitle,
			EpisodeTitle:    libEp.Title,
			EpisodeNumber:   libEp.EpisodeNumber,
			SeasonNumber:    libEp.SeasonNumber,
			ProgressNumber:  libEp.EpisodeNumber,
			EpisodeMetadata: epMeta,
			BaseAnime:       libraryMedia,
		}

		episodes = append(episodes, ep)
	}

	return &anime.EpisodeCollection{
		Episodes: episodes,
	}, nil
}

// HandleGetAnimeEpisodeCollection ...
//
//	@summary gets list of main episodes
//	@desc This returns a list of main episodes for the given anime media id (Platform or TMDB).
//	@desc It also loads the episode list into the different modules.
//	@returns anime.EpisodeCollection
//	@param id - int - true - "Anime media ID (positive=Platform, negative=TMDB)"
//	@route /api/v1/anime/episode-collection/{id} [GET]
func (h *Handler) HandleGetAnimeEpisodeCollection(c echo.Context) error {
	mID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return h.RespondWithError(c, err)
	}

	ec, err := h.getAnimeEpisodeCollection(c, mID)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, ec)
}




