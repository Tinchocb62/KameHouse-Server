package handlers

import (
	"fmt"
	"kamehouse/internal/api/mal"
	"kamehouse/internal/continuity"
	"net/http"
	"sync"

	"github.com/labstack/echo/v4"
)

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type PlaybackSyncPayload struct {
	MediaId       int     `json:"mediaId"`
	EpisodeNumber int     `json:"episodeNumber"`
	Progress      float64 `json:"progress"`        // 0.0 - 1.0 percentage
	CurrentTime   float64 `json:"currentTime"`     // seconds
	Duration      float64 `json:"duration"`        // seconds
	TotalEpisodes int     `json:"totalEpisodes"`   // total episodes in the series (0 if unknown)
	MalId         int     `json:"malId,omitempty"` // optional MAL ID for cross-scrobble
}

// ──────────────────────────────────────────────────────────────────────────────
// Auto-scrobble dedup guard
// ──────────────────────────────────────────────────────────────────────────────

// scrobbleGuard prevents double-scrobbling the same episode within a session.
// Key format: "mediaId:episodeNumber"
var (
	scrobbledEpisodes sync.Map
)

func scrobbleKey(mediaId, episode int) string {
	return fmt.Sprintf("%d:%d", mediaId, episode)
}

// ──────────────────────────────────────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────────────────────────────────────

// HandlePlaybackSync
//
//	@summary receives playback telemetry from the frontend.
//	@desc    Updates continuity watch history and, when progress >= 85%,
//	         automatically scrobbles the episode as watched to AniList/MAL.
//	@route /api/v1/playback/sync [POST]
//	@returns bool
func (h *Handler) HandlePlaybackSync(c echo.Context) error {
	var b PlaybackSyncPayload
	if err := c.Bind(&b); err != nil {
		return c.JSON(http.StatusBadRequest, NewErrorResponse(err))
	}

	if b.MediaId == 0 || b.EpisodeNumber == 0 {
		return c.JSON(http.StatusBadRequest, NewErrorResponse(fmt.Errorf("mediaId and episodeNumber are required")))
	}

	// Process updates asynchronously to ensure <20ms HTTP response time
	go func(payload PlaybackSyncPayload) {
		// ─── 1. Update Continuity (watch position) ─────────────────────────
		if payload.Duration > 0 {
			h.App.ContinuityManager.TelemetryManager.Queue(continuity.TelemetryEvent{
				MediaId:       payload.MediaId,
				EpisodeNumber: payload.EpisodeNumber,
				CurrentTime:   payload.CurrentTime,
				Duration:      payload.Duration,
				Kind:          "mediastream",
				IsFinal:       false,
			})
		}

		// ─── 2. Auto-scrobble at 85% ───────────────────────────────────────
		if payload.Progress >= 0.85 {
			key := scrobbleKey(payload.MediaId, payload.EpisodeNumber)

			// Only scrobble once per episode per session
			if _, alreadyScrobbled := scrobbledEpisodes.LoadOrStore(key, true); !alreadyScrobbled {
				h.App.Logger.Info().
					Int("mediaId", payload.MediaId).
					Int("episode", payload.EpisodeNumber).
					Float64("progress", payload.Progress).
					Msg("playback sync: auto-scrobbling episode (>= 85%)")

				// Dispatch to the MAL Dead Letter Queue Scrobbler Worker
				if payload.MalId > 0 && h.App.Metadata.MalScrobbler != nil {
					h.App.Metadata.MalScrobbler.Dispatch(&mal.ScrobbleTarget{
						MalMediaID:    payload.MalId,
						EpisodeNumber: payload.EpisodeNumber,
						Status:        "watching",
					})
				}
			}
		}
	}(b)

	return c.JSON(http.StatusAccepted, map[string]bool{"success": true})
}
