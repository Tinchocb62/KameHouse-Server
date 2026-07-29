// Package service contiene la lógica de negocio de la API de Dragon Ball:
// normalización de paginación, validación de filtros y ensamblado de los DTOs de
// respuesta. Depende únicamente del dominio (interfaz Repository) y de los DTOs,
// nunca de Echo ni del transporte HTTP.
package service

import (
	"errors"
	"strings"

	"kamehouse/internal/api/dragonball/domain"
	"kamehouse/internal/api/dragonball/dto"
)

const (
	defaultLimit = 25
	// maxLimit permite traer la guía episódica completa (660 bloques) en una sola
	// llamada. El repositorio es un seed estático en memoria, así que un tope bajo
	// no protege de nada y sólo obliga al cliente a paginar de más.
	maxLimit = 1000
)

// Errores de negocio expuestos al controlador para su mapeo a códigos HTTP.
var (
	ErrSeriesNotFound  = errors.New("serie de Dragon Ball no encontrada")
	ErrEpisodeNotFound = errors.New("episodio no encontrado")
	ErrInvalidType     = errors.New("tipo de hito inválido")
)

// Service orquesta las consultas sobre el repositorio.
type Service struct {
	repo domain.Repository
}

// New crea un servicio sobre el repositorio dado.
func New(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// ListSeries devuelve el resumen de las series con su conteo de sagas.
func (s *Service) ListSeries() []dto.SeriesSummary {
	series := s.repo.ListSeries()
	out := make([]dto.SeriesSummary, 0, len(series))
	for _, se := range series {
		out = append(out, dto.SeriesSummary{Series: se, SagaCount: len(se.SagaIDs)})
	}
	return out
}

// ListEpisodes normaliza la paginación, aplica los filtros y ensambla la
// respuesta paginada.
func (s *Service) ListEpisodes(q domain.EpisodeQuery) dto.EpisodeList {
	q.Page, q.Limit = normalizePaging(q.Page, q.Limit)

	items, total := s.repo.FilterEpisodes(q)
	if items == nil {
		items = []domain.Episode{}
	}

	totalPages := 0
	if q.Limit > 0 {
		totalPages = (total + q.Limit - 1) / q.Limit
	}

	return dto.EpisodeList{
		Items: items,
		Pagination: dto.Pagination{
			Page:       q.Page,
			Limit:      q.Limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}
}

// GetEpisode devuelve el detalle de un episodio concreto, con el contexto de su
// serie y saga. Devuelve ErrSeriesNotFound / ErrEpisodeNotFound según el caso.
func (s *Service) GetEpisode(seriesID string, number int) (dto.EpisodeDetail, error) {
	series, ok := s.repo.GetSeries(seriesID)
	if !ok {
		return dto.EpisodeDetail{}, ErrSeriesNotFound
	}

	ep, ok := s.repo.EpisodeByNumber(seriesID, number)
	if !ok {
		return dto.EpisodeDetail{}, ErrEpisodeNotFound
	}

	sagaName := ""
	for _, sg := range s.repo.ListSagas(seriesID) {
		if sg.ID == ep.SagaID {
			sagaName = sg.Name
			break
		}
	}

	return dto.EpisodeDetail{
		Episode:    ep,
		SeriesID:   series.ID,
		SeriesName: series.Title,
		SagaName:   sagaName,
	}, nil
}

// ListVillains devuelve el catálogo de villanos, opcionalmente filtrado por
// serie. Valida que la serie exista si se especifica.
func (s *Service) ListVillains(seriesID string) ([]domain.Villain, error) {
	if seriesID != "" {
		if _, ok := s.repo.GetSeries(seriesID); !ok {
			return nil, ErrSeriesNotFound
		}
	}
	villains := s.repo.ListVillains(seriesID)
	if villains == nil {
		villains = []domain.Villain{}
	}
	return villains, nil
}

// ListMilestones devuelve los hitos filtrados por tipo. Un tipo vacío devuelve
// todos; un tipo desconocido devuelve ErrInvalidType.
func (s *Service) ListMilestones(rawType string) ([]domain.Milestone, error) {
	t := domain.MilestoneType(strings.ToLower(strings.TrimSpace(rawType)))
	if t != "" && !validMilestoneType(t) {
		return nil, ErrInvalidType
	}
	ms := s.repo.ListMilestones(t)
	if ms == nil {
		ms = []domain.Milestone{}
	}
	return ms, nil
}

// GetStats devuelve estadísticas consolidadas del catálogo.
func (s *Service) GetStats() domain.Stats {
	return s.repo.GetStats()
}

func validMilestoneType(t domain.MilestoneType) bool {

	switch t {
	case domain.MilestoneTransformation, domain.MilestoneSacrifice,
		domain.MilestoneWish, domain.MilestoneDeath, domain.MilestoneEvent:
		return true
	}
	return false
}

// normalizePaging aplica los valores por defecto y los límites máximos.
func normalizePaging(page, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 {
		limit = defaultLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	return page, limit
}
