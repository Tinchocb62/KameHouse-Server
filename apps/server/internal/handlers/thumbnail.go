package handlers

import (
	"context"
	"crypto/sha256"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"kamehouse/internal/util/ffmpegutil"

	"github.com/labstack/echo/v4"
)

// HandleGetVideoThumbnail ...
//
//	@summary extract a thumbnail from a video file.
//	@desc Extracts a frame from a video file at approximately 5 minutes (or 25% if shorter)
//	@desc and caches it as a JPEG. Returns the cached image on subsequent requests.
//	@route /api/v1/video-thumbnail [GET]
func (h *Handler) HandleGetVideoThumbnail(c echo.Context) error {
	videoPath := c.QueryParam("path")
	if videoPath == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "path parameter is required"})
	}

	// Validate the file exists
	if _, err := os.Stat(videoPath); os.IsNotExist(err) {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "video file not found"})
	}

	// Prevent path traversal: ensure the path belongs to one of the configured library paths
	libraryPaths, err := h.App.Database.GetAllLibraryPathsFromSettings()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve library paths"})
	}

	isPathAllowed := false
	absVideoPath, err := filepath.Abs(videoPath)
	if err == nil {
		for _, libPath := range libraryPaths {
			absLibPath, err := filepath.Abs(libPath)
			if err != nil {
				continue
			}
			// Clean paths to normalize separators and trailing slashes (case-insensitive for Windows)
			cleanVideo := strings.ToLower(filepath.Clean(absVideoPath))
			cleanLib := strings.ToLower(filepath.Clean(absLibPath))
			
			// Check if cleanVideo starts with cleanLib
			if strings.HasPrefix(cleanVideo, cleanLib+string(os.PathSeparator)) || cleanVideo == cleanLib {
				isPathAllowed = true
				break
			}
		}
	}

	if !isPathAllowed {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "access denied to the requested file path"})
	}

	var customFfmpeg, customFfprobe string
	if h.App.SecondarySettings.Mediastream != nil {
		customFfmpeg = h.App.SecondarySettings.Mediastream.FfmpegPath
		customFfprobe = h.App.SecondarySettings.Mediastream.FfprobePath
	}
	ffmpegPath := ffmpegutil.ResolveFFmpegPath(h.App.Config.Cache.Dir, customFfmpeg)
	ffprobePath := ffmpegutil.ResolveFFprobePath(h.App.Config.Cache.Dir, customFfprobe)

	// Create cache directory for thumbnails
	cacheDir := filepath.Join(h.App.Config.Cache.Dir, "thumbnails")
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to create cache directory"})
	}

	// Generate cache key
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(videoPath)))
	cacheFile := filepath.Join(cacheDir, hash+".jpg")

	// 1. Check HTTP Request ETag for returning 304 Not Modified
	fileStat, err := os.Stat(cacheFile)
	if err == nil {
		eTag := fmt.Sprintf(`"%x-%x"`, fileStat.Size(), fileStat.ModTime().UnixNano())
		if match := c.Request().Header.Get("If-None-Match"); match == eTag {
			return c.NoContent(http.StatusNotModified)
		}
		c.Response().Header().Set("ETag", eTag)
	}

	c.Response().Header().Set("Cache-Control", "public, max-age=86400, immutable")

	// 2. Check LRU Memory Cache (Instant 0ms retrieval)
	if imgBytes, found := h.App.ThumbnailCache.Get(hash); found {
		return c.Blob(http.StatusOK, "image/jpeg", imgBytes)
	}

	// 3. Fallback to Disk Cache if FFMpeg already extracted it previously
	if err == nil {
		imgBytes, readErr := os.ReadFile(cacheFile)
		if readErr == nil {
			// Populate LRU cache for next rapid requests
			h.App.ThumbnailCache.Set(hash, imgBytes)
			return c.Blob(http.StatusOK, "image/jpeg", imgBytes)
		}
	}

	// 4. Generate thumbnail via FFMpeg (Cold Cache)
	reqCtx := c.Request().Context()
	seekTime := getSeekTimestamp(reqCtx, ffprobePath, videoPath)
	
	ctx, cancel := context.WithTimeout(reqCtx, 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(
		ctx,
		ffmpegPath,
		"-ss", seekTime,
		"-i", videoPath,
		"-vframes", "1",
		"-q:v", "5",
		"-vf", "scale=480:-2",
		"-y",
		cacheFile,
	)

	if err := cmd.Run(); err != nil {
		h.App.Logger.Error().Err(err).Str("path", videoPath).Msg("thumbnail: failed to extract frame")
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to extract thumbnail"})
	}

	// Re-read from disk to serve and place into LRU memory map
	imgBytes, readErr := os.ReadFile(cacheFile)
	if readErr == nil {
		h.App.ThumbnailCache.Set(hash, imgBytes)
		fileStat, err = os.Stat(cacheFile)
		if err == nil {
			eTag := fmt.Sprintf(`"%x-%x"`, fileStat.Size(), fileStat.ModTime().UnixNano())
			c.Response().Header().Set("ETag", eTag)
		}
		return c.Blob(http.StatusOK, "image/jpeg", imgBytes)
	}

	return c.File(cacheFile)
}

// getSeekTimestamp returns the timestamp to seek to for thumbnail extraction.
// Targets 5 minutes, or 25% of duration if the video is shorter than 5 minutes.
func getSeekTimestamp(parentCtx context.Context, ffprobePath, videoPath string) string {
	ctx, cancel := context.WithTimeout(parentCtx, 15*time.Second)
	defer cancel()

	cmd := exec.CommandContext(
		ctx,
		ffprobePath,
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		videoPath,
	)

	output, err := cmd.Output()
	if err != nil {
		return "00:05:00" // fallback to 5 minutes
	}

	durationStr := strings.TrimSpace(string(output))
	var durationSec float64
	if _, err := fmt.Sscanf(durationStr, "%f", &durationSec); err != nil {
		return "00:05:00"
	}

	targetSec := 300.0 // 5 minutes
	if durationSec < 300 {
		targetSec = durationSec * 0.25
	}

	dur := time.Duration(targetSec * float64(time.Second))
	hours := int(dur.Hours())
	minutes := int(dur.Minutes()) % 60
	seconds := int(dur.Seconds()) % 60

	return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds)
}
