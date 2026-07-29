// Package dto define los objetos de transferencia (request/response) de la API
// de Dragon Ball. Mantener los DTOs separados del dominio permite evolucionar el
// contrato HTTP (paginación, campos derivados) sin contaminar las entidades.
package dto

import "kamehouse/internal/api/dragonball/domain"

// SeriesSummary enriquece la entidad Series con el conteo de sagas para el
// listado de resumen.
type SeriesSummary struct {
	domain.Series
	SagaCount int `json:"saga_count"`
}

// Pagination describe la metadata de paginación devuelta en listados grandes.
type Pagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// EpisodeList es la respuesta paginada del endpoint de episodios.
type EpisodeList struct {
	Items      []domain.Episode `json:"items"`
	Pagination Pagination       `json:"pagination"`
}

// EpisodeDetail es la respuesta del endpoint de detalle de un episodio, con
// contexto de la serie y saga a la que pertenece.
type EpisodeDetail struct {
	Episode    domain.Episode `json:"episode"`
	SeriesID   string         `json:"series_id"`
	SeriesName string         `json:"series_name"`
	SagaName   string         `json:"saga_name"`
}
