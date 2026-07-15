package handlers

import (
	"errors"
	"kamehouse/internal/core"
	"kamehouse/internal/database/models"
	"kamehouse/internal/intelligence"
	util "kamehouse/internal/util/proxies"
	"net/http"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/rs/zerolog"
	"github.com/ziflex/lecho/v3"
)

type Handler struct {
	App                  *core.App
	settingsMu           sync.RWMutex
	settings             *models.Settings
	IntelligenceSelector *intelligence.Selector
}

func InitRoutes(app *core.App, e *echo.Echo) {
	allowedOrigins := app.Config.Server.CorsOrigins

	// CORS — incluye cabeceras byte-range requeridas por el reproductor web de video
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: allowedOrigins,
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions, http.MethodHead},
		AllowHeaders: []string{
			"Origin", "Content-Type", "Accept", "Cookie", "Authorization",
			"Range", "Accept-Ranges", "Content-Range", "If-Range",
			"X-KameHouse-Token",
		},
		ExposeHeaders: []string{
			"Accept-Ranges", "Content-Range", "Content-Length", "Content-Disposition",
		},
		AllowCredentials: true,
		Skipper: func(c echo.Context) bool {
			// Skip CORS for health endpoint — handled manually with permissive headers
			return c.Path() == "/api/health"
		},
	}))

	e.HTTPErrorHandler = CustomHTTPErrorHandler

	lechoLogger := lecho.From(*app.Logger)

	urisToSkip := []string{
		"/internal/metrics",
		"/icons",
		"/events",
		"/api/v1/image-proxy",
		"/api/v1/mediastream/transcode/",
		"/api/v1/proxy",
	}

	e.Use(lecho.Middleware(lecho.Config{
		Logger: lechoLogger,
		Skipper: func(c echo.Context) bool {
			path := c.Request().URL.RequestURI()
			if filepath.Ext(c.Request().URL.Path) == ".txt" ||
				filepath.Ext(c.Request().URL.Path) == ".png" ||
				filepath.Ext(c.Request().URL.Path) == ".ico" {
				return true
			}
			for _, uri := range urisToSkip {
				if uri == path || strings.HasPrefix(path, uri) {
					return true
				}
			}
			return false
		},
		Enricher: func(c echo.Context, logger zerolog.Context) zerolog.Context {
			return logger.Str("file", c.Path())
		},
	}))

	e.Use(middleware.Recover())

	e.Use(middleware.GzipWithConfig(middleware.GzipConfig{
		Level: 5,
		Skipper: func(c echo.Context) bool {
			path := c.Request().URL.Path
			return strings.HasPrefix(path, "/api/v1/mediastream") ||
				strings.HasPrefix(path, "/api/v1/proxy") ||
				strings.HasPrefix(path, "/api/v1/events") ||
				strings.HasPrefix(path, "/api/v1/ws")
		},
	}))

	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			cookie, err := c.Cookie("KameHouse-Client-Id")
			if err != nil || cookie.Value == "" {
				u := uuid.New().String()
				newCookie := new(http.Cookie)
				newCookie.Name = "KameHouse-Client-Id"
				newCookie.Value = u
				newCookie.HttpOnly = false
				newCookie.Expires = time.Now().Add(30 * 24 * time.Hour)
				newCookie.Path = "/"
				newCookie.Domain = ""
				newCookie.SameSite = http.SameSiteStrictMode
				newCookie.Secure = c.Scheme() == "https" || c.Request().Header.Get("X-Forwarded-Proto") == "https"
				c.SetCookie(newCookie)
				c.Set("KameHouse-Client-Id", u)
			} else {
				c.Set("KameHouse-Client-Id", cookie.Value)
			}
			return next(c)
		}
	})

	e.Use(headMethodMiddleware)

	h := &Handler{
		App:                  app,
		IntelligenceSelector: intelligence.NewSelector(app.Database, app.Logger),
	}

	app.AddOnRefreshAnimeCollectionFunc("ClearLibraryCollectionCache", func() {
		ClearLibraryCollectionCache()
	})

	h.StartPlaybackHeartbeatSubscriber()

	// Health endpoint for KameHouseTV auto-discovery (no auth required, open CORS)
	e.GET("/api/health", h.HandleHealth)
	e.OPTIONS("/api/health", h.HandleHealth)

	v1 := e.Group("/api/v1")
	v1.GET("/events", h.webSocketEventHandler)
	v1.GET("/ws", h.webSocketEventHandler)

	v1.Use(h.OptionalAuthMiddleware)
	v1.Use(h.FeaturesMiddleware)

	imageProxy := &util.ImageProxy{}
	v1.GET("/image-proxy", imageProxy.ProxyImage)
	v1.GET("/proxy", h.VideoProxy)
	v1.HEAD("/proxy", h.VideoProxy)
	v1.GET("/status", h.HandleGetStatus)
	v1.GET("/config/metadata", h.HandleGetConfigMetadata)
	v1.GET("/status/home-items", h.HandleGetHomeItems)
	v1.POST("/status/home-items", h.HandleUpdateHomeItems)
	v1.GET("/home/curated", h.HandleGetHomeCurated)
	v1.GET("/home/continue-watching", h.HandleGetContinueWatching)
	v1.POST("/home/retag", h.HandleRetagEpisodes)
	v1.GET("/resolver/streams", h.HandleResolveStreams)
	v1.GET("/log/*", h.HandleGetLogContent)
	v1.GET("/logs/filenames", h.HandleGetLogFilenames)
	v1.DELETE("/logs", h.HandleDeleteLogs)
	v1.GET("/logs/latest", h.HandleGetLatestLogContent)
	v1.GET("/memory/stats", h.HandleGetMemoryStats)
	v1.GET("/memory/profile", h.HandleGetMemoryProfile)
	v1.GET("/memory/goroutine", h.HandleGetGoRoutineProfile)
	v1.GET("/memory/cpu", h.HandleGetCPUProfile)
	v1.POST("/memory/gc", h.HandleForceGC)
	v1.POST("/announcements", h.HandleGetAnnouncements)
	v1.GET("/notifications", h.HandleGetNotifications)
	v1.POST("/notifications/read", h.HandleMarkNotificationsRead)
	v1.DELETE("/notifications", h.HandleClearNotifications)
	v1.POST("/directory-selector", h.HandleDirectorySelector)
	v1.POST("/open-in-explorer", h.HandleOpenInExplorer)
	v1.GET("/lore/dragonball", h.HandleGetDragonballLore)

	h.RegisterLibraryRoutes(v1)
	h.RegisterStreamingRoutes(v1)
	h.RegisterSettingsRoutes(v1)
	h.RegisterLocalRoutes(v1)
	h.RegisterIntelligenceRoutes(v1)
}

// RegisterIntelligenceRoutes registra las rutas del motor de selección inteligente.
func (h *Handler) RegisterIntelligenceRoutes(v1 *echo.Group) {
	intelligence := v1.Group("/intelligence")
	intelligence.GET("/best-source", h.HandleGetBestSource)
	intelligence.GET("/stats", h.HandleGetIntelligenceStats)
}

func (h *Handler) JSON(c echo.Context, code int, i interface{}) error {
	return c.JSON(code, i)
}

func (h *Handler) RespondWithData(c echo.Context, data interface{}) error {
	return c.JSON(200, NewDataResponse(data))
}

func (h *Handler) RespondWithError(c echo.Context, err error) error {
	return c.JSON(500, NewErrorResponse(err))
}

func (h *Handler) RespondWithCodeError(c echo.Context, code int, err error) error {
	return c.JSON(code, NewErrorResponse(err))
}

func (h *Handler) getCachedSettings() *models.Settings {
	h.settingsMu.RLock()
	if h.settings != nil {
		s := h.settings
		h.settingsMu.RUnlock()
		return s
	}
	h.settingsMu.RUnlock()

	h.settingsMu.Lock()
	defer h.settingsMu.Unlock()
	settings, err := h.App.Database.GetSettings()
	if err == nil && settings != nil {
		h.settings = settings
	}
	return h.settings
}

func (h *Handler) invalidateSettingsCache() {
	h.settingsMu.Lock()
	h.settings = nil
	h.settingsMu.Unlock()
}

func headMethodMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if c.Request().Method == http.MethodHead {
			c.Request().Method = http.MethodGet
			defer func() {
				c.Request().Method = http.MethodHead
			}()
			if err := next(c); err != nil {
				if errors.Is(err, echo.ErrMethodNotAllowed) {
					return c.NoContent(http.StatusOK)
				}
				return err
			}
			return nil
		}
		return next(c)
	}
}
