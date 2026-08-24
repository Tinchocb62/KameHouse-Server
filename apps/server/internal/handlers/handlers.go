// Package handlers implements the HTTP route handlers for the KameHouse server.
package handlers

import (
	"kamehouse/internal/core"
	"kamehouse/internal/database/models"
	"kamehouse/internal/library/anime"
	"kamehouse/internal/local"
	"kamehouse/internal/mediastream"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog"
)

// LibraryHandler maneja rutas de biblioteca, archivos locales y explorador.
type LibraryHandler struct {
	Database            Database
	Logger              *zerolog.Logger
	WSEventManager      WSEventManager
	Platform            PlatformProvider
	MetadataProvider    MetadataProvider
	TMDBClient          TMDBClient
	AnimeCollection     AnimeCollectionProvider
	FillerManager       FillerManagerProvider
	IntelligenceService *anime.IntelligenceService
	LibraryExplorer     LibraryExplorerProvider
	AutoScanner         AutoScannerProvider
	Settings            func() *models.Settings
	ConfigDir           string
	CacheDir            string
	LoggerFn            func() *zerolog.Logger
}

// NewLibraryHandler crea un handler de biblioteca con sus dependencias específicas.
func NewLibraryHandler(deps LibraryHandlerDeps) *LibraryHandler {
	return &LibraryHandler{
		Database:            deps.Database,
		Logger:              deps.Logger,
		WSEventManager:      deps.WSEventManager,
		Platform:            deps.Platform,
		MetadataProvider:    deps.MetadataProvider,
		TMDBClient:          deps.TMDBClient,
		AnimeCollection:     deps.AnimeCollection,
		FillerManager:       deps.FillerManager,
		IntelligenceService: deps.IntelligenceService,
		LibraryExplorer:     deps.LibraryExplorer,
		AutoScanner:         deps.AutoScanner,
		Settings:            deps.Settings,
		ConfigDir:           deps.ConfigDir,
		CacheDir:            deps.CacheDir,
		LoggerFn:            deps.LoggerFn,
	}
}

type LibraryHandlerDeps struct {
	Database            Database
	Logger              *zerolog.Logger
	WSEventManager      WSEventManager
	Platform            PlatformProvider
	MetadataProvider    MetadataProvider
	TMDBClient          TMDBClient
	AnimeCollection     AnimeCollectionProvider
	FillerManager       FillerManagerProvider
	IntelligenceService *anime.IntelligenceService
	LibraryExplorer     LibraryExplorerProvider
	AutoScanner         AutoScannerProvider
	Settings            func() *models.Settings
	ConfigDir           string
	CacheDir            string
	LoggerFn            func() *zerolog.Logger
}

// StreamingHandler maneja rutas de streaming y reproducción.
type StreamingHandler struct {
	Database          Database
	MediastreamRepo   *mediastream.Repository
	Logger            *zerolog.Logger
	WSEventManager    WSEventManager
	ThumbnailCache    ThumbnailCacheProvider
	FileCacher        FileCacherProvider
	Settings          func() *models.Settings
	CacheDir          string
	RefreshMediastream func()
}

func NewStreamingHandler(deps StreamingHandlerDeps) *StreamingHandler {
	return &StreamingHandler{
		Database:          deps.Database,
		MediastreamRepo:   deps.MediastreamRepo,
		Logger:            deps.Logger,
		WSEventManager:    deps.WSEventManager,
		ThumbnailCache:    deps.ThumbnailCache,
		FileCacher:        deps.FileCacher,
		Settings:          deps.Settings,
		CacheDir:          deps.CacheDir,
		RefreshMediastream: deps.RefreshMediastream,
	}
}

type StreamingHandlerDeps struct {
	Database          Database
	MediastreamRepo   *mediastream.Repository
	Logger            *zerolog.Logger
	WSEventManager    WSEventManager
	ThumbnailCache    ThumbnailCacheProvider
	FileCacher        FileCacherProvider
	Settings          func() *models.Settings
	CacheDir          string
	RefreshMediastream func()
}

// SettingsHandler maneja rutas de configuración, autenticación y sistema.
type SettingsHandler struct {
	Database         Database
	Logger           *zerolog.Logger
	WSEventManager   WSEventManager
	Config           *core.Config
	FeatureManager   *core.FeatureManager
	LocalManager     local.Manager
	InitModules      func()
	NewStatus        func(c echo.Context) *Status
	IsOffline        func() bool
	SetOfflineMode   func(bool)
	GetUser          func() interface{}
}

func NewSettingsHandler(deps SettingsHandlerDeps) *SettingsHandler {
	return &SettingsHandler{
		Database:       deps.Database,
		Logger:         deps.Logger,
		WSEventManager: deps.WSEventManager,
		Config:         deps.Config,
		FeatureManager: deps.FeatureManager,
		LocalManager:   deps.LocalManager,
		InitModules:    deps.InitModules,
		NewStatus:      deps.NewStatus,
		IsOffline:      deps.IsOffline,
		SetOfflineMode: deps.SetOfflineMode,
		GetUser:        deps.GetUser,
	}
}

type SettingsHandlerDeps struct {
	Database       Database
	Logger         *zerolog.Logger
	WSEventManager WSEventManager
	Config         *core.Config
	FeatureManager *core.FeatureManager
	LocalManager   local.Manager
	InitModules    func()
	NewStatus      func(c echo.Context) *Status
	IsOffline      func() bool
	SetOfflineMode func(bool)
	GetUser        func() interface{}
}
