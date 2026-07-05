package mediastream

import (
	"errors"
	"kamehouse/internal/events"
	"kamehouse/internal/mediastream/cassette"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
)

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Transcode
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

func (r *Repository) ServeEchoTranscodeStream(c echo.Context, clientID string) error {

	if !r.IsInitialized() {
		r.wsEventManager.SendEvent(events.MediastreamShutdownStream, "Module not initialized")
		return errors.New("module not initialized")
	}

	if !r.TranscoderIsInitialized() {
		r.wsEventManager.SendEvent(events.MediastreamShutdownStream, "Transcoder not initialized")
		return errors.New("transcoder not initialized")
	}

	path := c.Param("*")

	mediaContainer, found := r.playbackManager.clientMediaContainers.Get(clientID)
	if !found {
		mediaContainer, found = r.playbackManager.getCurrentMediaContainer()
		if !found {
			return errors.New("no file has been loaded")
		}
	}

	if path == "master.m3u8" {
		ret, err := r.transcoder.MustGet().GetMaster(mediaContainer.Filepath, mediaContainer.Hash, mediaContainer.MediaInfo, clientID, "")
		if err != nil {
			r.logger.Error().Err(err).Str("path", mediaContainer.Filepath).Msg("mediastream: GetMaster failed")
			return err
		}

		return c.String(200, ret)
	}

	// Video stream
	// /:quality/index.m3u8
	if strings.HasSuffix(path, "index.m3u8") && !strings.Contains(path, "audio") {
		split := strings.Split(path, "/")
		if len(split) != 2 {
			return errors.New("invalid index.m3u8 path")
		}

		quality, err := cassette.QualityFromString(split[0])
		if err != nil {
			return err
		}

		ret, err := r.transcoder.MustGet().GetVideoIndex(mediaContainer.Filepath, mediaContainer.Hash, mediaContainer.MediaInfo, quality, clientID, "")
		if err != nil {
			r.logger.Error().Err(err).Str("path", mediaContainer.Filepath).Str("quality", split[0]).Msg("mediastream: GetVideoIndex failed")
			return err
		}

		return c.String(200, ret)
	}

	// Audio stream
	// /audio/:audio/index.m3u8
	if strings.HasSuffix(path, "index.m3u8") && strings.Contains(path, "audio") {
		split := strings.Split(path, "/")
		if len(split) != 3 {
			return errors.New("invalid audio index.m3u8 path")
		}

		audioIndex, err := strconv.ParseInt(split[1], 10, 32)
		if err != nil {
			return err
		}

		ret, err := r.transcoder.MustGet().GetAudioIndex(mediaContainer.Filepath, mediaContainer.Hash, mediaContainer.MediaInfo, int32(audioIndex), clientID, "")
		if err != nil {
			r.logger.Error().Err(err).Str("path", mediaContainer.Filepath).Str("audio", split[1]).Msg("mediastream: GetAudioIndex failed")
			return err
		}

		return c.String(200, ret)
	}

	// Video segment
	// /:quality/segment-:segment.ts
	if strings.HasSuffix(path, ".ts") && !strings.Contains(path, "audio") {
		split := strings.Split(path, "/")
		if len(split) != 2 {
			return errors.New("invalid video segment path")
		}

		quality, err := cassette.QualityFromString(split[0])
		if err != nil {
			return err
		}

		segment, err := cassette.ParseSegment(split[1])
		if err != nil {
			return err
		}

		ret, err := r.transcoder.MustGet().GetVideoSegment(c.Request().Context(), mediaContainer.Filepath, mediaContainer.Hash, mediaContainer.MediaInfo, quality, segment, clientID)
		if err != nil {
			r.logger.Error().Err(err).Str("path", mediaContainer.Filepath).Str("quality", split[0]).Int32("segment", segment).Msg("mediastream: GetVideoSegment failed")
			return err
		}

		return c.File(ret)
	}

	// Audio segment
	// /audio/:audio/segment-:segment.ts
	if strings.HasSuffix(path, ".ts") && strings.Contains(path, "audio") {
		split := strings.Split(path, "/")
		if len(split) != 3 {
			return errors.New("invalid audio segment path")
		}

		audioIndex, err := strconv.ParseInt(split[1], 10, 32)
		if err != nil {
			return err
		}

		segment, err := cassette.ParseSegment(split[2])
		if err != nil {
			return err
		}

		ret, err := r.transcoder.MustGet().GetAudioSegment(c.Request().Context(), mediaContainer.Filepath, mediaContainer.Hash, mediaContainer.MediaInfo, int32(audioIndex), segment, clientID)
		if err != nil {
			r.logger.Error().Err(err).Str("path", mediaContainer.Filepath).Str("audio", split[1]).Int32("segment", segment).Msg("mediastream: GetAudioSegment failed")
			return err
		}

		return c.File(ret)
	}

	return errors.New("invalid path")
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Optimized
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// ServeEchoOptimizedStream serves pre-transcoded static HLS stream files directly from cacheDir/optimized/<hash>.
func (r *Repository) ServeEchoOptimizedStream(c echo.Context, clientID string) error {
	if !r.IsInitialized() {
		return errors.New("module not initialized")
	}

	mediaContainer, found := r.playbackManager.clientMediaContainers.Get(clientID)
	if !found {
		mediaContainer, found = r.playbackManager.getCurrentMediaContainer()
		if !found {
			return errors.New("no file has been loaded")
		}
	}

	path := c.Param("*")
	if path == "" {
		return errors.New("invalid path")
	}

	targetDir := filepath.Join(r.cacheDir, "optimized", mediaContainer.Hash)
	absPath := filepath.Join(targetDir, path)

	// Ensure the path does not escape the target directory (path traversal check)
	rel, err := filepath.Rel(targetDir, absPath)
	if err != nil || strings.HasPrefix(rel, "..") {
		return errors.New("invalid path (directory traversal)")
	}

	return c.File(absPath)
}

// ShutdownTranscodeStream It should be called when unmounting the player (playback is no longer needed).
// This will also send an events.MediastreamShutdownStream event.
func (r *Repository) ShutdownTranscodeStream(clientID string) {
	r.reqMu.Lock()
	defer r.reqMu.Unlock()

	if !r.IsInitialized() {
		return
	}

	if !r.TranscoderIsInitialized() {
		return
	}

	r.logger.Warn().Str("client_id", clientID).Msg("mediastream: Received shutdown transcode stream request")

	r.playbackManager.clientMediaContainers.Delete(clientID)
	r.transcoder.MustGet().RemoveClient(clientID)

	// Send event
	r.wsEventManager.SendEvent(events.MediastreamShutdownStream, nil)
}
