package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/labstack/echo/v4"
)

// audioExtensions son los formatos que el <audio> del navegador puede reproducir.
var audioExtensions = map[string]bool{
	".mp3":  true,
	".m4a":  true,
	".aac":  true,
	".ogg":  true,
	".oga":  true,
	".opus": true,
	".flac": true,
	".wav":  true,
	".webm": true,
}

type BackgroundMusicTrack struct {
	Name string `json:"name"`
	File string `json:"file"`
}

type BackgroundMusicScanResponse struct {
	Dir    string                 `json:"dir"`
	Tracks []BackgroundMusicTrack `json:"tracks"`
}

// HandleScanBackgroundMusic
//
//	@summary lista los archivos de audio de la carpeta indicada para usarlos como música de fondo.
//	@route /api/v1/music/scan [GET]
//	@returns handlers.BackgroundMusicScanResponse
func (h *Handler) HandleScanBackgroundMusic(c echo.Context) error {
	dir := strings.TrimSpace(c.QueryParam("dir"))
	if dir == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "missing 'dir' query parameter")
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "could not read directory: "+err.Error())
	}

	tracks := make([]BackgroundMusicTrack, 0)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if !audioExtensions[ext] {
			continue
		}
		tracks = append(tracks, BackgroundMusicTrack{
			Name: strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name())),
			File: entry.Name(),
		})
	}

	sort.Slice(tracks, func(i, j int) bool {
		return strings.ToLower(tracks[i].Name) < strings.ToLower(tracks[j].Name)
	})

	return JSONSuccess(c, BackgroundMusicScanResponse{
		Dir:    dir,
		Tracks: tracks,
	})
}

// HandleStreamBackgroundMusic
//
//	@summary sirve un archivo de audio de la carpeta de música de fondo (soporta byte-range).
//	@route /api/v1/music/stream [GET]
func (h *Handler) HandleStreamBackgroundMusic(c echo.Context) error {
	dir := strings.TrimSpace(c.QueryParam("dir"))
	file := c.QueryParam("file")
	if dir == "" || file == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "missing 'dir' or 'file' query parameter")
	}

	// Solo se aceptan nombres de archivo planos dentro de la carpeta escaneada.
	if file != filepath.Base(file) || file == "." || file == ".." {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid file name")
	}
	if !audioExtensions[strings.ToLower(filepath.Ext(file))] {
		return echo.NewHTTPError(http.StatusBadRequest, "unsupported audio format")
	}

	path := filepath.Join(dir, file)
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return echo.NewHTTPError(http.StatusNotFound, "file not found")
	}

	return c.File(path)
}
