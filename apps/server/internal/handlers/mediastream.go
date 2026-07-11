package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/mediastream"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// HandleGetMediastreamSettings returns the mediastream settings.
//
//	@summary get mediastream settings.
//	@desc This returns the mediastream settings.
//	@returns models.MediastreamSettings
//	@route /api/v1/mediastream/settings [GET]
func (h *Handler) HandleGetMediastreamSettings(c echo.Context) error {
	mediastreamSettings, found := h.App.Database.GetMediastreamSettings()
	if !found {
		// Create default settings if none exist
		defaultSettings := &models.MediastreamSettings{
			BaseModel: models.BaseModel{
				ID: 1,
			},
			TranscodeEnabled: false,
			TranscodeHwAccel: "auto",
			TranscodePreset:  "fast",
			TranscodeThreads: 0,
			DirectPlayOnly:   false,
			FfmpegPath:       "",
			FfprobePath:      "",
		}
		saved, err := h.App.Database.UpsertMediastreamSettings(defaultSettings)
		if err != nil {
			return h.RespondWithError(c, err)
		}
		return h.RespondWithData(c, saved)
	}

	return h.RespondWithData(c, mediastreamSettings)
}

// HandleSaveMediastreamSettings saves the mediastream settings.
//
//	@summary save mediastream settings.
//	@desc This saves the mediastream settings.
//	@returns models.MediastreamSettings
//	@route /api/v1/mediastream/settings [PATCH]
func (h *Handler) HandleSaveMediastreamSettings(c echo.Context) error {
	type body struct {
		Settings models.MediastreamSettings `json:"settings"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	settings, err := h.App.Database.UpsertMediastreamSettings(&b.Settings)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	h.App.InitOrRefreshMediastreamSettings()

	return h.RespondWithData(c, settings)
}

// HandleRequestMediastreamMediaContainer requests a media stream container.
//
//	@summary request media stream.
//	@desc This requests a media stream and returns the media container to start the playback.
//	@returns mediastream.MediaContainer
//	@route /api/v1/mediastream/request [POST]
func (h *Handler) HandleRequestMediastreamMediaContainer(c echo.Context) error {

	type body struct {
		Path             string                 `json:"path"`             // The path of the file.
		StreamType       mediastream.StreamType `json:"streamType"`       // The type of stream to request.
		AudioStreamIndex int                    `json:"audioStreamIndex"` // The audio stream index to use. (unused)
		ClientID         string                 `json:"clientID"`         // The session id
		Force            bool                   `json:"force"`            // Force transcoder init even if TranscodeEnabled=false (explicit user action, e.g. switching audio track during direct play).
		// Codecs the client can decode natively (probed via canPlayType/MediaSource).
		// Omitted/null falls back to static Chromium-based assumptions.
		ClientCapabilities *mediastream.ClientCapabilities `json:"clientCapabilities"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	var mediaContainer *mediastream.MediaContainer
	var err error

	switch b.StreamType {
	case mediastream.StreamTypeDirect:
		mediaContainer, err = h.App.MediastreamRepository.RequestDirectPlay(b.Path, b.ClientID, b.ClientCapabilities)
	case mediastream.StreamTypeTranscode:
		mediaContainer, err = h.App.MediastreamRepository.RequestTranscodeStream(b.Path, b.ClientID, b.Force)
	case mediastream.StreamTypeOptimized:
		mediaContainer, err = h.App.MediastreamRepository.RequestOptimizedStream(b.Path, b.ClientID)
	default:
		err = fmt.Errorf("stream type %s not implemented", b.StreamType)
	}
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, mediaContainer)
}

// HandlePreloadMediastreamMediaContainer preloads a media stream for playback.
//
//	@summary preloads media stream for playback.
//	@desc This preloads a media stream by extracting the media information and attachments.
//	@returns bool
//	@route /api/v1/mediastream/preload [POST]
func (h *Handler) HandlePreloadMediastreamMediaContainer(c echo.Context) error {

	type body struct {
		Path               string                 `json:"path"`               // The path of the file.
		StreamType         mediastream.StreamType `json:"streamType"`         // The type of stream to request.
		AudioStreamIndex   int                    `json:"audioStreamIndex"`   // The audio stream index to use.
		PreferredAudioLang string                 `json:"preferredAudioLang"` // The preferred audio language.
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	var err error

	switch b.StreamType {
	case mediastream.StreamTypeTranscode:
		err = h.App.MediastreamRepository.RequestPreloadTranscodeStream(b.Path, b.PreferredAudioLang)
	case mediastream.StreamTypeDirect:
		err = h.App.MediastreamRepository.RequestPreloadDirectPlay(b.Path)
	case mediastream.StreamTypeOptimized:
		err = h.App.MediastreamRepository.RequestPreloadOptimizedStream(b.Path)
	default:
		err = fmt.Errorf("stream type %s not implemented", b.StreamType)
	}
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, true)
}

func (h *Handler) HandleMediastreamGetSubtitles(c echo.Context) error {
	c.Response().Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Response().Header().Set("Pragma", "no-cache")
	c.Response().Header().Set("Expires", "0")
	return h.App.MediastreamRepository.ServeEchoExtractedSubtitles(c)
}

func (h *Handler) HandleMediastreamGetPGSEvents(c echo.Context) error {
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")
	return h.App.MediastreamRepository.ServeEchoParsedPGS(c)
}

func (h *Handler) HandleMediastreamGetAttachments(c echo.Context) error {
	// tell the client not to cache the response
	c.Response().Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Response().Header().Set("Pragma", "no-cache")
	c.Response().Header().Set("Expires", "0")
	return h.App.MediastreamRepository.ServeEchoExtractedAttachments(c)
}

// getClientID resolves the client ID from query param, header, or context cookie.
func (h *Handler) getClientID(c echo.Context) string {
	client := c.QueryParam("clientID")
	if client != "" {
		return client
	}
	client = c.QueryParam("clientId")
	if client != "" {
		return client
	}
	if val := c.Get("KameHouse-Client-Id"); val != nil {
		if id, ok := val.(string); ok && id != "" {
			return id
		}
	}
	return "1"
}

//
// Direct
//

func (h *Handler) HandleMediastreamDirectPlay(c echo.Context) error {
	client := h.getClientID(c)
	return h.App.MediastreamRepository.ServeEchoDirectPlay(c, client)
}

//
// Transcode
//

func (h *Handler) HandleMediastreamTranscode(c echo.Context) error {
	client := h.getClientID(c)
	return h.App.MediastreamRepository.ServeEchoTranscodeStream(c, client)
}

// HandleMediastreamShutdownTranscodeStream shuts down the transcode stream.
//
//	@summary shuts down the transcode stream.
//	@desc This requests the transcoder to shut down. It should be called when unmounting the player (playback is no longer needed).
//	@desc This will also send an events.MediastreamShutdownStream event.
//	@desc It will not return any error and is safe to call multiple times.
//	@returns bool
//	@route /api/v1/mediastream/shutdown-transcode [POST]
func (h *Handler) HandleMediastreamShutdownTranscodeStream(c echo.Context) error {
	client := h.getClientID(c)
	h.App.MediastreamRepository.ShutdownTranscodeStream(client)
	return h.RespondWithData(c, true)
}

//
// Serve file
//

func (h *Handler) HandleMediastreamServeOptimizedStatic(c echo.Context) error {
	client := h.getClientID(c)
	return h.App.MediastreamRepository.ServeEchoOptimizedStream(c, client)
}

func (h *Handler) HandleMediastreamFile(c echo.Context) error {
	client := h.getClientID(c)
	fp := c.QueryParam("path")
	libraryPaths := h.App.Settings.GetLibrary().GetAllPaths()
	return h.App.MediastreamRepository.ServeEchoFile(c, fp, client, libraryPaths)
}

// HandleGetEpisodeSkipTimes returns the custom/saved skip times for a given episode.
//
//	@summary get episode skip times.
//	@desc This gets the saved skip times (OP/ED) for a specific episode of a series.
//	@returns models.EpisodeSkipTime
//	@route /api/v1/mediastream/skip-times [GET]
func (h *Handler) HandleGetEpisodeSkipTimes(c echo.Context) error {
	mediaIdStr := c.QueryParam("mediaId")
	malIdStr := c.QueryParam("malId")
	episodeNumStr := c.QueryParam("episodeNumber")

	mediaId, _ := strconv.Atoi(mediaIdStr)
	malId, _ := strconv.Atoi(malIdStr)
	episodeNum, _ := strconv.Atoi(episodeNumStr)

	// Resolve mediaId if malId is provided instead
	if mediaId == 0 && malId > 0 {
		var lm models.LibraryMedia
		if err := h.App.Database.Gorm().Where("myanimelist_id = ?", malId).First(&lm).Error; err == nil {
			mediaId = int(lm.ID)
		}
	}

	if mediaId == 0 || episodeNum == 0 {
		return h.RespondWithError(c, fmt.Errorf("invalid mediaId/malId or episodeNumber"))
	}

	var skipTime models.EpisodeSkipTime
	err := h.App.Database.Gorm().
		Where("media_id = ? AND episode_number = ?", mediaId, episodeNum).
		First(&skipTime).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Phase 5: Fill-forward heuristic
			var siblings []models.EpisodeSkipTime
			if err := h.App.Database.Gorm().Where("media_id = ?", mediaId).Find(&siblings).Error; err == nil && len(siblings) >= 2 {
				var closest *models.EpisodeSkipTime
				minDiff := 9999
				validSiblings := 0
				for i := range siblings {
					if siblings[i].OpEnd > 0 {
						validSiblings++
						diff := siblings[i].EpisodeNumber - episodeNum
						if diff < 0 {
							diff = -diff
						}
						if diff < minDiff {
							minDiff = diff
							closest = &siblings[i]
						}
					}
				}
				if validSiblings >= 2 && closest != nil {
					consistentCount := 0
					for i := range siblings {
						if siblings[i].OpEnd > 0 && siblings[i].OpStart >= closest.OpStart-2 && siblings[i].OpStart <= closest.OpStart+2 {
							consistentCount++
						}
					}
					if consistentCount >= 2 {
						return h.RespondWithData(c, models.EpisodeSkipTime{
							MediaID:       mediaId,
							EpisodeNumber: episodeNum,
							OpStart:       closest.OpStart,
							OpEnd:         closest.OpEnd,
							EdOffset:      closest.EdOffset,
							EdEnd:         closest.EdEnd,
							Source:        "heuristic",
						})
					}
				}
			}
			return h.RespondWithData(c, nil)
		}
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, skipTime)
}

// HandleSaveEpisodeSkipTimes saves the skip times for an episode.
//
//	@summary save episode skip times.
//	@desc This saves custom skip times for an episode. If applyToSeason is true, it propagates it as default offsets for all other episodes of the same series.
//	@route /api/v1/mediastream/skip-times [POST]
func (h *Handler) HandleSaveEpisodeSkipTimes(c echo.Context) error {
	type body struct {
		MediaID       int     `json:"mediaId"`
		MalID         int     `json:"malId"`
		EpisodeNumber int     `json:"episodeNumber"`
		OpStart       float64 `json:"opStart"`
		OpEnd         float64 `json:"opEnd"`
		EdOffset      float64 `json:"edOffset"`
		EdEnd         float64 `json:"edEnd"`
		Source        string  `json:"source"`
		Confidence    float64 `json:"confidence"`
		ApplyToSeason bool    `json:"applyToSeason"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	// Resolve mediaId if malId is provided instead
	mediaID := b.MediaID
	if mediaID == 0 && b.MalID > 0 {
		var lm models.LibraryMedia
		if err := h.App.Database.Gorm().Where("myanimelist_id = ?", b.MalID).First(&lm).Error; err == nil {
			mediaID = int(lm.ID)
		}
	}

	if mediaID == 0 || b.EpisodeNumber == 0 {
		return h.RespondWithError(c, fmt.Errorf("invalid mediaId/malId or episodeNumber"))
	}

	// Save or update the single episode skip times
	skipTime := models.EpisodeSkipTime{
		MediaID:       mediaID,
		EpisodeNumber: b.EpisodeNumber,
		OpStart:       b.OpStart,
		OpEnd:         b.OpEnd,
		EdOffset:      b.EdOffset,
		EdEnd:         b.EdEnd,
		Source:        b.Source,
		Confidence:    b.Confidence,
	}

	err := h.App.Database.Gorm().Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "media_id"}, {Name: "episode_number"}},
		DoUpdates: clause.AssignmentColumns([]string{"op_start", "op_end", "ed_offset", "ed_end", "source", "confidence"}),
	}).Create(&skipTime).Error
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Propagate if requested
	episodesUpdated := 0
	if b.ApplyToSeason {
		var episodes []models.LibraryEpisode
		if err := h.App.Database.Gorm().Where("library_media_id = ?", mediaID).Find(&episodes).Error; err == nil {
			var skipTimes []models.EpisodeSkipTime
			for _, ep := range episodes {
				if ep.EpisodeNumber == b.EpisodeNumber {
					continue // skip the current one
				}
				skipTimes = append(skipTimes, models.EpisodeSkipTime{
					MediaID:       mediaID,
					EpisodeNumber: ep.EpisodeNumber,
					OpStart:       b.OpStart,
					OpEnd:         b.OpEnd,
					EdOffset:      b.EdOffset,
					EdEnd:         b.EdEnd,
					Source:        b.Source,
					Confidence:    b.Confidence,
				})
			}
			if len(skipTimes) > 0 {
				if err := h.App.Database.Gorm().Clauses(clause.OnConflict{
					Columns:   []clause.Column{{Name: "media_id"}, {Name: "episode_number"}},
					DoUpdates: clause.AssignmentColumns([]string{"op_start", "op_end", "ed_offset", "ed_end", "source", "confidence"}),
				}).Create(&skipTimes).Error; err != nil {
					h.App.Logger.Error().Err(err).Msg("mediastream: failed to propagate skip times to season")
				} else {
					episodesUpdated = len(skipTimes)
				}
			}
		} else {
			h.App.Logger.Warn().Err(err).Int("mediaID", mediaID).Msg("mediastream: failed to query episodes for season propagation")
		}
	}

	return h.RespondWithData(c, map[string]interface{}{
		"saved":            true,
		"episodesUpdated":  episodesUpdated,
		"appliedToSeason":  b.ApplyToSeason,
	})
}

// HandleScanEpisodeSkipTimes triggers a background scan to detect skip times for a series.
//
//	@summary trigger skip times auto-scan.
//	@desc This starts a background task using acoustic fingerprinting to detect intro/outro boundaries.
//	@route /api/v1/mediastream/skip-times/scan [POST]
func (h *Handler) HandleScanEpisodeSkipTimes(c echo.Context) error {
	type body struct {
		MediaID int `json:"mediaId"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}

	if b.MediaID == 0 {
		return h.RespondWithError(c, fmt.Errorf("invalid mediaId"))
	}

	detector := h.App.MediastreamRepository.GetSkipDetector()
	if detector == nil {
		return h.RespondWithError(c, fmt.Errorf("skip detector is not initialized yet"))
	}

	if detector.IsScanning(b.MediaID) {
		return h.RespondWithError(c, fmt.Errorf("a scan is already in progress for this series"))
	}

	// Trigger asynchronously to avoid HTTP timeouts
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
		defer cancel()

		if err := detector.ScanSeries(ctx, b.MediaID); err != nil {
			h.App.Logger.Error().Err(err).Int("mediaId", b.MediaID).Msg("mediastream: auto skip-time scan failed")
		}
	}()

	return h.RespondWithData(c, map[string]any{"ok": true, "message": "Scan started"})
}

// HandleResolveMAL resolves a media's MAL ID dynamically.
//
//	@summary resolve MAL ID.
//	@desc Looks up MAL ID on Jikan.
//	@route /api/v1/mediastream/skip-times/resolve-mal [GET]
func (h *Handler) HandleResolveMAL(c echo.Context) error {
	mediaIdStr := c.QueryParam("mediaId")
	mediaId, _ := strconv.Atoi(mediaIdStr)
	if mediaId == 0 {
		return h.RespondWithError(c, fmt.Errorf("invalid mediaId"))
	}

	var lm models.LibraryMedia
	if err := h.App.Database.Gorm().First(&lm, mediaId).Error; err != nil {
		// Media isn't in the local library (e.g. pure TMDB/online entry) — this is an
		// expected "no mapping" case, not a server error. Respond gracefully with nil.
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return h.RespondWithData(c, map[string]interface{}{"malId": nil})
		}
		return h.RespondWithError(c, err)
	}
	if lm.MyanimelistId > 0 {
		return h.RespondWithData(c, map[string]interface{}{"malId": lm.MyanimelistId})
	}

	searchTitle := lm.TitleEnglish
	if searchTitle == "" {
		searchTitle = lm.TitleRomaji
	}
	if searchTitle == "" {
		searchTitle = lm.TitleOriginal
	}

	if searchTitle != "" {
		reqUrl := fmt.Sprintf("https://api.jikan.moe/v4/anime?q=%s&limit=1", url.QueryEscape(searchTitle))
		resp, err := http.Get(reqUrl)
		if err == nil {
			defer resp.Body.Close()
			var jikanResp struct {
				Data []struct {
					MalId int `json:"mal_id"`
				} `json:"data"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&jikanResp); err == nil && len(jikanResp.Data) > 0 {
				malId := jikanResp.Data[0].MalId
				if malId > 0 {
					db.UpdateLibraryMediaMappings(h.App.Database, lm.ID, lm.AnidbId, malId)
					return h.RespondWithData(c, map[string]interface{}{"malId": malId})
				}
			}
		}
	}

	return h.RespondWithData(c, map[string]interface{}{"malId": nil})
}

