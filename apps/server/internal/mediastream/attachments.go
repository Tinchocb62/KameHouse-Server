package mediastream

import (
	"context"
	"errors"
	"kamehouse/internal/events"
	"kamehouse/internal/mediastream/videofile"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

func (r *Repository) ServeEchoExtractedSubtitles(c echo.Context) error {

	if !r.IsInitialized() {
		r.wsEventManager.SendEvent(events.MediastreamShutdownStream, "Module not initialized")
		return errors.New("module not initialized")
	}

	// Get current media
	clientID := c.QueryParam("clientId")
	if clientID == "" {
		clientID = c.QueryParam("clientID")
	}
	mediaContainer, found := r.playbackManager.clientMediaContainers.Get(clientID)
	if !found {
		mediaContainer, found = r.playbackManager.getCurrentMediaContainer()
		if !found {
			return echo.NewHTTPError(404, "no file has been loaded")
		}
	}

	ctx, cancel := context.WithTimeout(c.Request().Context(), 90*time.Second)
	defer cancel()
	if err := r.playbackManager.WaitForExtraction(ctx, mediaContainer.Hash); err != nil {
		c.Response().Header().Set("Retry-After", "5")
		return echo.NewHTTPError(503, "subtitle extraction in progress")
	}

	cacheDir := videofile.GetFileSubsCacheDir(r.cacheDir, mediaContainer.Hash)
	if cacheDir == "" {
		return echo.NewHTTPError(404, "could not find subtitles")
	}

	trackIndex := c.QueryParam("trackIndex")
	if trackIndex == "" {
		return echo.NewHTTPError(400, "trackIndex query parameter is required")
	}

	entries, err := os.ReadDir(cacheDir)
	if err != nil {
		return echo.NewHTTPError(404, "could not read subtitles directory")
	}

	for _, entry := range entries {
		if !entry.IsDir() && strings.HasPrefix(entry.Name(), trackIndex+".") {
			r.logger.Trace().Msgf("mediastream: Serving subtitle %s", entry.Name())
			return c.File(filepath.Join(cacheDir, entry.Name()))
		}
	}

	return echo.NewHTTPError(404, "subtitle file not found")
}

func (r *Repository) ServeEchoParsedPGS(c echo.Context) error {
	if !r.IsInitialized() {
		r.wsEventManager.SendEvent(events.MediastreamShutdownStream, "Module not initialized")
		return errors.New("module not initialized")
	}

	// Get current media
	clientID := c.QueryParam("clientId")
	if clientID == "" {
		clientID = c.QueryParam("clientID")
	}
	mediaContainer, found := r.playbackManager.clientMediaContainers.Get(clientID)
	if !found {
		mediaContainer, found = r.playbackManager.getCurrentMediaContainer()
		if !found {
			return echo.NewHTTPError(404, "no file has been loaded")
		}
	}

	ctx, cancel := context.WithTimeout(c.Request().Context(), 90*time.Second)
	defer cancel()
	if err := r.playbackManager.WaitForExtraction(ctx, mediaContainer.Hash); err != nil {
		c.Response().Header().Set("Retry-After", "5")
		return echo.NewHTTPError(503, "subtitle extraction in progress")
	}

	cacheDir := videofile.GetFileSubsCacheDir(r.cacheDir, mediaContainer.Hash)
	if cacheDir == "" {
		return echo.NewHTTPError(404, "could not find subtitles")
	}

	trackIndex := c.QueryParam("trackIndex")
	if trackIndex == "" {
		return echo.NewHTTPError(400, "trackIndex query parameter is required")
	}

	entries, err := os.ReadDir(cacheDir)
	if err != nil {
		return echo.NewHTTPError(404, "could not read subtitles directory")
	}

	for _, entry := range entries {
		if !entry.IsDir() && strings.HasPrefix(entry.Name(), trackIndex+".sup") {
			r.logger.Trace().Msgf("mediastream: Parsing PGS subtitle %s", entry.Name())
			events, err := ParseSupFile(filepath.Join(cacheDir, entry.Name()))
			if err != nil {
				r.logger.Error().Err(err).Msg("mediastream: Failed to parse PGS subtitle")
				return err
			}
			return c.JSON(200, events)
		}
	}

	return echo.NewHTTPError(404, "subtitle file not found")
}

func (r *Repository) ServeEchoExtractedAttachments(c echo.Context) error {
	if !r.IsInitialized() {
		r.wsEventManager.SendEvent(events.MediastreamShutdownStream, "Module not initialized")
		return echo.NewHTTPError(http.StatusServiceUnavailable, "module not initialized")
	}

	// Serving an extracted font/attachment does not use the transcoder, so we don't
	// require it to be initialized (fonts must load in pure direct play too).

	// Get the parameter group
	subFilePath := c.Param("*")

	// Get current media
	clientID := c.QueryParam("clientId")
	if clientID == "" {
		clientID = c.QueryParam("clientID")
	}
	mediaContainer, found := r.playbackManager.clientMediaContainers.Get(clientID)
	if !found {
		mediaContainer, found = r.playbackManager.getCurrentMediaContainer()
		if !found {
			return echo.NewHTTPError(http.StatusNotFound, "no file has been loaded")
		}
	}

	// Fonts are written by the same extraction job as subtitles; wait for it so the
	// first play of a cold file doesn't 404 the fonts before ffmpeg has written them.
	ctx, cancel := context.WithTimeout(c.Request().Context(), 90*time.Second)
	defer cancel()
	if err := r.playbackManager.WaitForExtraction(ctx, mediaContainer.Hash); err != nil {
		c.Response().Header().Set("Retry-After", "5")
		return echo.NewHTTPError(http.StatusServiceUnavailable, "attachment extraction in progress")
	}

	retPath := videofile.GetFileAttCacheDir(r.cacheDir, mediaContainer.Hash)

	if retPath == "" {
		return echo.NewHTTPError(http.StatusNotFound, "could not find attachments")
	}

	subFilePath, _ = url.PathUnescape(subFilePath)

	return c.File(filepath.Join(retPath, subFilePath))
}
