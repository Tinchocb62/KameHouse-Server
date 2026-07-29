// Package dragonball es el punto de entrada del módulo de la enciclopedia de
// Dragon Ball. Aquí se realiza la inyección de dependencias (repository ->
// service -> controller) y el registro de las rutas REST sobre un grupo de Echo.
//
// Arquitectura en capas:
//
//	domain      -> entidades puras + interfaz Repository (sin dependencias)
//	repository  -> almacenamiento en memoria + datos seed (seed_*.go)
//	service     -> lógica de negocio (filtros, paginación, validación)
//	controller  -> adaptadores HTTP (Echo) con envoltorio JSON estándar
//	router.go   -> cableado e inyección de dependencias
package dragonball

import (
	"github.com/labstack/echo/v4"

	"kamehouse/internal/api/dragonball/controller"
	"kamehouse/internal/api/dragonball/repository"
	"kamehouse/internal/api/dragonball/service"
)

// Module agrupa las dependencias construidas del módulo, por si otras partes del
// servidor necesitan reutilizar el servicio (p. ej. para enriquecer el endpoint
// de lore existente).
type Module struct {
	Repo       *repository.MemoryRepository
	Service    *service.Service
	Controller *controller.Controller
}

// NewModule construye el grafo de dependencias del módulo una sola vez.
func NewModule() *Module {
	repo := repository.New()
	svc := service.New(repo)
	ctl := controller.New(svc)
	return &Module{Repo: repo, Service: svc, Controller: ctl}
}

// RegisterRoutes monta los endpoints REST bajo el grupo recibido (típicamente
// el grupo /api/v1). Las rutas resultantes son:
//
//	GET /dragonball/series
//	GET /dragonball/episodes
//	GET /dragonball/episodes/:series/:number
//	GET /dragonball/villains
//	GET /dragonball/milestones
//	GET /dragonball/stats
func (m *Module) RegisterRoutes(g *echo.Group) {
	db := g.Group("/dragonball")
	db.GET("/series", m.Controller.ListSeries)
	db.GET("/episodes", m.Controller.ListEpisodes)
	db.GET("/episodes/:series/:number", m.Controller.GetEpisode)
	db.GET("/villains", m.Controller.ListVillains)
	db.GET("/milestones", m.Controller.ListMilestones)
	db.GET("/stats", m.Controller.GetStats)
}

// Register es un atajo que construye el módulo y registra sus rutas en un solo
// paso, para call sites que no necesitan conservar la referencia al módulo.
func Register(g *echo.Group) *Module {
	m := NewModule()
	m.RegisterRoutes(g)
	return m
}
