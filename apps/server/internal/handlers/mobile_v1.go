package handlers

import (


	"kamehouse/internal/core"

	"github.com/labstack/echo/v4"
)

// MobileV1Handler provides optimized endpoints for the Android client.
type MobileV1Handler struct {
	App      *core.Antigravity
	Services *core.ServiceContainer
}

// MediaItemDVO (Data View Object) is a heavily optimized payload
// to minimize mobile data usage on cellular networks.
type MediaItemDVO struct {
	ID        int     `json:"id"`
	Title     string  `json:"title"`
	PosterURL string  `json:"p_url,omitempty"`
	Rating    float64 `json:"rating,omitempty"`
	Progress  float64 `json:"pg,omitempty"` // Playback progress percentage
}

func NewMobileV1Handler(app *core.Antigravity, services *core.ServiceContainer) *MobileV1Handler {
	return &MobileV1Handler{
		App:      app,
		Services: services,
	}
}

// RegisterRoutes registers the mobile optimized routes.
func (h *MobileV1Handler) RegisterRoutes(e *echo.Group) {
	v1 := e.Group("/v1/mobile")
	v1.GET("/library/anime", h.GetAnimeLibraryDVO)
	v1.GET("/library/general", h.GetGeneralLibraryDVO)
}

// GetAnimeLibraryDVO returns a list of anime optimized for Android.
func (h *MobileV1Handler) GetAnimeLibraryDVO(c echo.Context) error {
	// 1. Fetch from ServiceContainer
	// data, err := h.Services.Anime.GetAnimeCollection(c.Request().Context())

	// Mock implementation returning DVOs
	dvos := []MediaItemDVO{
		{
			ID:        1,
			Title:     "Dragon Ball Z",
			PosterURL: "https://example.com/dbz.jpg",
			Rating:    9.0,
		},
		{
			ID:        2,
			Title:     "Naruto",
			PosterURL: "https://example.com/naruto.jpg",
			Rating:    8.5,
			Progress:  45.5,
		},
	}

	return JSONSuccess(c, dvos)
}

// GetGeneralLibraryDVO returns a list of general media optimized for Android.
func (h *MobileV1Handler) GetGeneralLibraryDVO(c echo.Context) error {
	dvos := []MediaItemDVO{
		{
			ID:        100,
			Title:     "The Matrix",
			PosterURL: "https://example.com/matrix.jpg",
			Rating:    8.7,
		},
	}

	return JSONSuccess(c, dvos)
}
