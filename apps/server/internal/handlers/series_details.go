package handlers

import (
	"fmt"
	"strconv"

	"kamehouse/internal/constants"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/library/scanner"

	"github.com/labstack/echo/v4"
)

// resolveLibraryMediaForSagas finds the LibraryMedia for a route media ID
// using the same resolution order as anime.NewSimpleEntry: try the ID as a
// primary key first, then fall back to a TMDB ID lookup (with the +1,000,000
// offset used for movie IDs in this app's normalized ID space).
func (h *Handler) resolveLibraryMediaForSagas(mID int) (*models.LibraryMedia, error) {
	media, err := db.GetLibraryMediaByID(h.App.Database, uint(mID))
	if err != nil {
		return nil, err
	}
	if media != nil {
		return media, nil
	}

	if mID >= constants.MovieIDOffset {
		return db.GetLibraryMediaByTmdbIdAndType(h.App.Database, mID-constants.MovieIDOffset, "MOVIE")
	}
	return db.GetLibraryMediaByTmdbIdAndType(h.App.Database, mID, "SHOW")
}

// HandleGetSeriesSagas returns fully enriched sagas for a given media entry.
//
//	@summary returns enriched saga array for a media entry.
//	@route /api/v1/library/anime-entry/{id}/sagas [GET]
//	@param id - int - true - "Anime media ID"
//	@returns []dto.SagaDTO
func (h *Handler) HandleGetSeriesSagas(c echo.Context) error {
	idParam := c.Param("id")
	mID, err := strconv.Atoi(idParam)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	media, err := h.resolveLibraryMediaForSagas(mID)
	if err != nil {
		return h.RespondWithError(c, err)
	}
	if media == nil {
		return h.RespondWithData(c, []dto.SagaDTO{})
	}

	sagaInfos := scanner.GetDragonBallSagaInfo(media.TmdbID)
	sagas := make([]dto.SagaDTO, 0, len(sagaInfos))
	for _, s := range sagaInfos {
		subSagas := make([]dto.SubSagaDTO, 0, len(s.SubSagas))
		for _, ss := range s.SubSagas {
			subSagas = append(subSagas, dto.SubSagaDTO{
				ID:           ss.ID,
				Name:         ss.Name,
				EpisodeRange: fmt.Sprintf("%d-%d", ss.StartEp, ss.EndEp),
				StartEp:      ss.StartEp,
				EndEp:        ss.EndEp,
			})
		}

		sagas = append(sagas, dto.SagaDTO{
			ID:            s.ID,
			Name:          s.Name,
			EpisodeRange:  fmt.Sprintf("%d-%d", s.StartEp, s.EndEp),
			StartEp:       s.StartEp,
			EndEp:         s.EndEp,
			Description:   "",
			IsFiller:      false,
			CanonStatus:   "Canon",
			Antagonists:   []string{},
			KeyEvents:     []string{},
			NewCharacters: []string{},
			KeyCharacters: []dto.CharacterDTO{},
			SubSagas:      subSagas,
		})
	}

	return h.RespondWithData(c, sagas)
}
