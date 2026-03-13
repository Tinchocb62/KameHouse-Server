package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"kamehouse/internal/database/db"
	"kamehouse/internal/mediastream/transcoder"
	"kamehouse/internal/mediastream/videofile"
	"kamehouse/internal/streaming"

	"github.com/labstack/echo/v4"
)

// HandleMasterPlaylist responds to GET /api/v1/stream/:id/master.m3u8
func (h *Handler) HandleMasterPlaylist(c echo.Context) error {
	idStr := c.Param("id")
	mediaId, err := strconv.Atoi(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid media ID")
	}

	// 1. Fetch from DB
	lfs, _, err := db.GetLocalFiles(h.App.Database)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to get local files")
	}

	var targetFile string
	for _, l := range lfs {
		if l.MediaId == mediaId && l.IsMain() {
			targetFile = l.GetNormalizedPath()
			break
		}
	}

	if targetFile == "" {
		return echo.NewHTTPError(http.StatusNotFound, "media file not found")
	}

	// Extract info (or fetch from cache)
	extractor := videofile.NewMediaInfoExtractor(h.App.FileCacher, h.App.Logger)
	info, _ := extractor.GetInfo("ffmpeg", targetFile) // fallback safe

	// Dummy client profile - in prod this comes from headers/query
	clientProfile := &streaming.ClientProfile{
		Name:            "Web Browser",
		SupportedVideo:  []string{"h264"},
		SupportedAudio:  []string{"aac", "mp3"},
		SupportedFormat: []string{"mp4", "webm"},
	}
	if strings.Contains(c.Request().Header.Get("User-Agent"), "KameHouseApp") {
		clientProfile.SupportedVideo = append(clientProfile.SupportedVideo, "hevc", "h265")
		clientProfile.SupportedFormat = append(clientProfile.SupportedFormat, "mkv", "matroska")
	}

	// 2. Decision Engine
	decision := streaming.EvaluatePlayback(info, *clientProfile)

	if decision.Method == streaming.DirectPlay {
		return c.File(targetFile) // Zero-copy native serve
	}

	// 3. Setup Transcode/DirectStream directories
	outDir := filepath.Join(os.TempDir(), "kamehouse", "transcodes", idStr)
	os.MkdirAll(outDir, 0755)
	playlistPath := filepath.Join(outDir, "index.m3u8")

	// 4. Start FFmpeg if playlist doesn't exist
	if _, err := os.Stat(playlistPath); os.IsNotExist(err) {
		builder := transcoder.NewFFmpegBuilder()
		args := builder.BuildForHLS(transcoder.PlaybackMethod(decision.Method), targetFile, outDir)
		
		pm := transcoder.NewFFmpegProcess(h.App.Logger)
		if err := pm.StartTranscode(c.Request().Context(), args); err != nil {
			h.App.Logger.Error().Err(err).Msg("ffmpeg start failed")
			return echo.NewHTTPError(500, "ffmpeg init failed")
		}

		// Polling wait for the first playlist chunk to appear
		deadline := time.Now().Add(10 * time.Second)
		for time.Now().Before(deadline) {
			if _, err := os.Stat(playlistPath); err == nil {
				break
			}
			time.Sleep(200 * time.Millisecond)
		}
	}

	return c.File(playlistPath) // Zero-copy serve via OS net pipe
}

// HandleHlsSegment responds to GET /api/v1/stream/:id/:file
func (h *Handler) HandleHlsSegment(c echo.Context) error {
	id, file := c.Param("id"), c.Param("file")
	if strings.Contains(file, "..") {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid path")
	}

	targetPath := filepath.Join(os.TempDir(), "kamehouse", "transcodes", id, file)
	if _, err := os.Stat(targetPath); os.IsNotExist(err) {
		return echo.NewHTTPError(http.StatusNotFound, "segment not found")
	}

	c.Response().Header().Set("Cache-Control", "no-cache")
	c.Response().Header().Set("Access-Control-Allow-Origin", "*")
	return c.File(targetPath)
}

// StopStreamSession responds to DELETE /api/v1/stream/:id
func (h *Handler) StopStreamSession(c echo.Context) error {
	id := c.Param("id")
	if strings.Contains(id, "..") { return echo.NewHTTPError(http.StatusBadRequest, "invalid id") }

	// Removes the entire temporary directory.
	// Note: Active transcoding processes attached to client Context will be killed automatically
	// when the client terminates the HTTP connection requesting the master playlist or segments stream.
	dir := filepath.Join(os.TempDir(), "kamehouse", "transcodes", id)
	os.RemoveAll(dir)
	
	h.App.Logger.Info().Str("mediaId", id).Msg("stream session cleaned up")
	return c.NoContent(http.StatusOK)
}

func (h *Handler) HandleGetEpisodeSources(c echo.Context) error {
	mediaId, err := strconv.Atoi(c.Param("mediaId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid parameters"})
	}

	epNum, err := strconv.Atoi(c.Param("epNum"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid parameters"})
	}

	engine := streaming.GetSourcePriorityEngine(h.App.Logger, h.App.Database)
	response, err := engine.ResolveEpisodeSources(
		c.Request().Context(),
		mediaId,
		epNum,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	if response == nil || len(response.Sources) == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "No sources available"})
	}

	return c.JSON(http.StatusOK, response)
}
