// Package controller adapta las peticiones HTTP de Echo a llamadas al servicio y
// serializa las respuestas con el mismo envoltorio {"data"|"error"} que usa el
// resto de la API de KameHouse, para que el cliente TypeScript tenga una forma
// predecible.
package controller

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"kamehouse/internal/api/dragonball/domain"
	"kamehouse/internal/api/dragonball/service"
)

// Controller expone los handlers HTTP de la enciclopedia.
type Controller struct {
	svc *service.Service
}

// New crea un controlador sobre el servicio dado.
func New(svc *service.Service) *Controller {
	return &Controller{svc: svc}
}

// envelope reproduce el contrato de respuesta canónico de la API. Se mantiene
// local al paquete para que el módulo dragonball sea autónomo (sin ciclos de
// importación con internal/handlers).
type envelope struct {
	Data  any    `json:"data"`
	Error string `json:"error,omitempty"`
}

func ok(c echo.Context, data any) error {
	return c.JSON(http.StatusOK, envelope{Data: data})
}

func fail(c echo.Context, code int, err error) error {
	msg := "internal server error"
	if err != nil {
		msg = err.Error()
	}
	return c.JSON(code, envelope{Error: msg})
}

// ListSeries GET /dragonball/series
func (ctl *Controller) ListSeries(c echo.Context) error {
	return ok(c, ctl.svc.ListSeries())
}

// ListEpisodes GET /dragonball/episodes
func (ctl *Controller) ListEpisodes(c echo.Context) error {
	var fillerPtr *bool
	if fStr := c.QueryParam("filler"); fStr != "" {
		if fBool, err := strconv.ParseBool(fStr); err == nil {
			fillerPtr = &fBool
		}
	}

	q := domain.EpisodeQuery{
		SeriesID: c.QueryParam("series"),
		SagaID:   c.QueryParam("saga"),
		Villain:  c.QueryParam("villain"),
		Query:    c.QueryParam("query"),
		Filler:   fillerPtr,
		Page:     atoiDefault(c.QueryParam("page"), 0),
		Limit:    atoiDefault(c.QueryParam("limit"), 0),
	}
	return ok(c, ctl.svc.ListEpisodes(q))
}

// GetEpisode GET /dragonball/episodes/:series/:number
func (ctl *Controller) GetEpisode(c echo.Context) error {
	seriesID := c.Param("series")
	number, err := strconv.Atoi(c.Param("number"))
	if err != nil {
		return fail(c, http.StatusBadRequest, echo.NewHTTPError(http.StatusBadRequest, "el número de episodio debe ser un entero").SetInternal(err))
	}

	detail, err := ctl.svc.GetEpisode(seriesID, number)
	if err != nil {
		switch err {
		case service.ErrSeriesNotFound, service.ErrEpisodeNotFound:
			return fail(c, http.StatusNotFound, err)
		default:
			return fail(c, http.StatusInternalServerError, err)
		}
	}
	return ok(c, detail)
}

// ListVillains GET /dragonball/villains
func (ctl *Controller) ListVillains(c echo.Context) error {
	villains, err := ctl.svc.ListVillains(c.QueryParam("series"))
	if err != nil {
		if err == service.ErrSeriesNotFound {
			return fail(c, http.StatusNotFound, err)
		}
		return fail(c, http.StatusInternalServerError, err)
	}
	return ok(c, villains)
}

// ListMilestones GET /dragonball/milestones
func (ctl *Controller) ListMilestones(c echo.Context) error {
	milestones, err := ctl.svc.ListMilestones(c.QueryParam("type"))
	if err != nil {
		if err == service.ErrInvalidType {
			return fail(c, http.StatusBadRequest, err)
		}
		return fail(c, http.StatusInternalServerError, err)
	}
	return ok(c, milestones)
}

// GetStats GET /dragonball/stats
func (ctl *Controller) GetStats(c echo.Context) error {
	return ok(c, ctl.svc.GetStats())
}

func atoiDefault(s string, def int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}
