package mediastream

import (
	"errors"
	"fmt"
	"kamehouse/internal/events"
	"kamehouse/internal/util"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
)

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Direct
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

func (r *Repository) ServeEchoFile(c echo.Context, rawFilePath string, clientID string, libraryPaths []string) error {
	// Unescape the file path, ignore errors
	filePath, _ := url.PathUnescape(rawFilePath)

	// If the file path is base64 encoded, decode it
	if util.IsBase64(rawFilePath) {
		var err error
		filePath, err = util.Base64DecodeStr(rawFilePath)
		if err != nil {
			// this shouldn't happen, but just in case IsBase64 is wrong
			filePath, _ = url.PathUnescape(rawFilePath)
		}
	}

	// Make sure the file is in the library directories
	inLibrary := false
	for _, libraryPath := range libraryPaths {
		if util.IsFileUnderDir(filePath, libraryPath) {
			inLibrary = true
			break
		}
	}

	if !inLibrary {
		return c.NoContent(http.StatusNotFound)
	}

	r.logger.Trace().Str("filepath", filePath).Str("payload", rawFilePath).Msg("mediastream: Served file")
	// Content disposition
	filename := filepath.Base(filePath)
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))

	return c.File(filePath)
}

func (r *Repository) ServeEchoDirectPlay(c echo.Context, clientID string) error {

	if !r.IsInitialized() {
		r.wsEventManager.SendEvent(events.MediastreamShutdownStream, "Module not initialized")
		return errors.New("module not initialized")
	}

	// Get current media
	mediaContainer, found := r.playbackManager.clientMediaContainers.Get(clientID)
	if !found {
		mediaContainer, found = r.playbackManager.getCurrentMediaContainer()
		if !found {
			r.wsEventManager.SendEvent(events.MediastreamShutdownStream, "no file has been loaded")
			return errors.New("no file has been loaded")
		}
	}

	if c.Request().Method == http.MethodHead {
		r.logger.Trace().Msg("mediastream: Received HEAD request for direct play")

		// Get the file size
		fileInfo, err := os.Stat(mediaContainer.Filepath)
		if err != nil {
			r.logger.Error().Msg("mediastream: Failed to get file info")
			return c.NoContent(http.StatusInternalServerError)
		}

		// Set the content length
		c.Response().Header().Set("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))
		ext := strings.ToLower(filepath.Ext(mediaContainer.Filepath))
		contentType := "video/mp4"
		switch ext {
		case ".webm":
			contentType = "video/webm"
		case ".ogg", ".ogv":
			contentType = "video/ogg"
		case ".mov":
			contentType = "video/quicktime"
		}
		c.Response().Header().Set("Content-Type", contentType)
		c.Response().Header().Set("Accept-Ranges", "bytes")
		filename := filepath.Base(mediaContainer.Filepath)
		c.Response().Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
		return c.NoContent(http.StatusOK)
	}

	// Set proper Content-Type for all supported container formats.
	// Echo's c.File() uses http.ServeContent which detects MIME from extension,
	// but it doesn't know .mkv or some niche formats — the browser delays parsing
	// without a proper Content-Type.
	ext := strings.ToLower(filepath.Ext(mediaContainer.Filepath))
	contentType := ""
	switch ext {
	case ".mp4", ".m4v":
		contentType = "video/mp4"
	case ".webm":
		contentType = "video/webm"
	case ".ogg", ".ogv":
		contentType = "video/ogg"
	case ".mov":
		contentType = "video/quicktime"
	case ".mkv":
		contentType = "video/x-matroska"
	case ".avi":
		contentType = "video/x-msvideo"
	case ".wmv":
		contentType = "video/x-ms-wmv"
	case ".flv":
		contentType = "video/x-flv"
	case ".ts":
		contentType = "video/mp2t"
	case ".mts", ".m2ts":
		contentType = "video/mp2t"
	}
	if contentType != "" {
		c.Response().Header().Set("Content-Type", contentType)
	}
	c.Response().Header().Set("Accept-Ranges", "bytes")
	filename := filepath.Base(mediaContainer.Filepath)
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	return c.File(mediaContainer.Filepath)
}
