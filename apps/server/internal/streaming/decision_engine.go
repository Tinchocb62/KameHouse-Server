package streaming

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"

	"kamehouse/internal/api/anizip"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models/dto"
	msTranscoder "kamehouse/internal/mediastream/transcoder"
	"kamehouse/internal/mediastream/videofile"
	"kamehouse/internal/onlinestream/providers/torrentio"
	"kamehouse/internal/util/filecache"

	"github.com/rs/zerolog"
	"golang.org/x/sync/errgroup"
)

// StreamOrchestrator is entirely decoupled from HTTP — it only returns structs/URLs.
type StreamOrchestrator struct {
	logger             *zerolog.Logger
	db                 *db.Database
	mediaInfoExtractor *videofile.MediaInfoExtractor
	transcoder         *FfmpegTranscoder
	hwProbe            *msTranscoder.HwProbeResult
}

type StreamingOptions struct {
	FfmpegPath string
}

// OrchestratorResponse is transport-agnostic: callers map it to HTTP, WS, or native player contracts.
type OrchestratorResponse struct {
	Decision Decision `json:"decision"`
	PlayURL  string   `json:"playUrl"`
}

// NewStreamOrchestrator builds a ready-to-use orchestrator.
// Hardware acceleration is probed once at startup and wired into the transcoder.
func NewStreamOrchestrator(database *db.Database, logger *zerolog.Logger, cache *filecache.Cacher, opts *StreamingOptions) *StreamOrchestrator {
	ffmpegPath := "ffmpeg"
	if opts != nil && opts.FfmpegPath != "" {
		ffmpegPath = opts.FfmpegPath
	}

	// Probe HW accel once at process startup (result is cached in sync.Once).
	hwProbe := msTranscoder.ProbeHardwareAccel(ffmpegPath, logger)

	sem := NewSemaphore(MaxTranscodeSessions)
	trans := NewTranscoder(ffmpegPath, sem, logger)

	// Wire best HW accel into the transcoder (nil = CPU libx264 fallback).
	if hwProbe != nil && hwProbe.Best != nil {
		trans.WithHwAccel(hwProbe.Best)
	}

	return &StreamOrchestrator{
		logger:             logger,
		db:                 database,
		mediaInfoExtractor: videofile.NewMediaInfoExtractor(cache, logger),
		transcoder:         trans,
		hwProbe:            hwProbe,
	}
}

// HandleRequest resolves the local media file, evaluates playback against the ClientProfile,
// and returns the appropriate URL — all strictly decoupled from HTTP transport.
func (o *StreamOrchestrator) HandleRequest(ctx context.Context, mediaId string, clientProfile ClientProfile) (*OrchestratorResponse, error) {
	mId, err := strconv.Atoi(mediaId)
	if err != nil {
		return nil, fmt.Errorf("invalid mediaId %q: %w", mediaId, err)
	}

	lfs, _, err := db.GetLocalFiles(o.db)
	if err != nil {
		return nil, fmt.Errorf("could not list local files: %w", err)
	}

	var targetFile *dto.LocalFile
	for _, l := range lfs {
		if l.MediaId == mId && l.IsMain() {
			targetFile = l
			break
		}
	}
	if targetFile == nil {
		return nil, fmt.Errorf("media file not found for ID %s", mediaId)
	}

	info, infoErr := o.mediaInfoExtractor.GetInfo(o.transcoder.FfmpegPath, targetFile.GetNormalizedPath())
	if infoErr != nil {
		o.logger.Warn().Err(infoErr).Msg("streaming: media info extraction failed — forcing Transcode fallback")
	}

	decision := EvaluatePlayback(info, clientProfile)

	o.logger.Info().
		Str("method", string(decision.Method)).
		Str("reason", decision.Reason).
		Bool("burnSubs", decision.NeedsSubtitleBurn).
		Str("mediaId", mediaId).
		Msg("streaming: orchestration decision")

	// Attach HW accel info to logs when transcoding
	if decision.Method != DirectPlay && o.hwProbe != nil && o.hwProbe.Best != nil {
		o.logger.Info().
			Str("hwAccel", o.hwProbe.Best.Name).
			Str("encoder", o.hwProbe.Best.Encoder).
			Msg("streaming: using hardware acceleration")
	}

	var playURL string
	switch decision.Method {

	case DirectPlay:
		// No FFmpeg — serve the file directly.
		playURL = fmt.Sprintf("/api/v1/media/%s/direct", mediaId)

	case DirectStream:
		// Remux-only: container changes, streams are copied.
		// Non-blocking: caller gets the m3u8 URL immediately; FFmpeg starts async.
		go func() {
			if _, err := o.transcoder.StartDirectStreamSession(ctx, mediaId, targetFile.GetNormalizedPath(), decision.NeedsSubtitleBurn); err != nil {
				o.logger.Error().Err(err).Str("mediaId", mediaId).Msg("streaming: DirectStream session failed")
			}
		}()
		playURL = fmt.Sprintf("/api/v1/media/%s/hls/master.m3u8", mediaId)

	default: // Transcode
		// Full re-encode to HLS with HW accel when available.
		go func() {
			if _, err := o.transcoder.StartSession(ctx, mediaId, targetFile.GetNormalizedPath()); err != nil {
				o.logger.Error().Err(err).Str("mediaId", mediaId).Msg("streaming: Transcode session failed")
			}
		}()
		playURL = fmt.Sprintf("/api/v1/media/%s/hls/master.m3u8", mediaId)
	}

	return &OrchestratorResponse{
		Decision: decision,
		PlayURL:  playURL,
	}, nil
}

// Orchestrate is a backward-compatible wrapper around HandleRequest (int mediaId variant).
func (o *StreamOrchestrator) Orchestrate(ctx context.Context, mediaId int, clientProfile *ClientProfile) (*OrchestratorResponse, error) {
	profile := ClientProfile{}
	if clientProfile != nil {
		profile = *clientProfile
	}
	return o.HandleRequest(ctx, strconv.Itoa(mediaId), profile)
}

// Priority constants for MediaSource. Lower = higher priority.
const (
	PriorityLocal   = 1 // Direct local file — zero network cost
	PriorityDebrid  = 2 // Debrid-cached torrent — fast HTTP, near-instant
	PriorityTorrent = 3 // Raw P2P magnet — seeders variable
)

// MediaSource is the canonical, transport-agnostic descriptor for a single
// playable source returned by the decision engine.
type MediaSource struct {
	Type     string `json:"type"`     // "local" | "torrentio"
	URL      string `json:"url"`      // Remote URL or direct-play HTTP path
	Path     string `json:"path"`     // Absolute filesystem path (local sources only)
	Quality  string `json:"quality"`  // e.g. "1080p", "4K", "unknown"
	Priority int    `json:"priority"` // PriorityLocal < PriorityDebrid < PriorityTorrent
	Title    string `json:"title"`    // Human-readable label shown in the UI badge
}


// ResolveEpisodeSources fans out to all source tiers concurrently via errgroup,
// collects results in a thread-safe slice, and returns them sorted by Priority.
//
// The function ALWAYS returns whatever partial results were gathered even when
// one goroutine fails — callers should not treat a non-nil error as fatal if
// len(sources) > 0.
func ResolveEpisodeSources(
	ctx context.Context,
	logger *zerolog.Logger,
	database *db.Database,
	mediaId int,
	episodeNum int,
) ([]MediaSource, error) {
	var (
		mu      sync.Mutex
		sources []MediaSource
	)

	g, gCtx := errgroup.WithContext(ctx)

	// ── Goroutine 1: Local Files ──────────────────────────────────────────────
	g.Go(func() error {
		lfs, _, err := db.GetLocalFiles(database)
		if err != nil {
			return fmt.Errorf("local files query: %w", err)
		}

		for _, lf := range lfs {
			if lf == nil || lf.Metadata == nil {
				continue
			}
			if lf.MediaId != mediaId || lf.Metadata.Episode != episodeNum {
				continue
			}

			normalizedPath := lf.GetNormalizedPath()
			mu.Lock()
			sources = append(sources, MediaSource{
				Type:     "local",
				URL:      "/api/v1/directstream/stream/" + normalizedPath,
				Path:     normalizedPath,
				Quality:  inferQualityFromPath(normalizedPath),
				Priority: PriorityLocal,
				Title:    fmt.Sprintf("Local — Episode %d", episodeNum),
			})
			mu.Unlock()
			break // Take the first match; scanner already picks the best file
		}
		return nil
	})

	// ── Goroutine 2: Torrentio / Debrid ──────────────────────────────────────
	g.Go(func() error {
		mapping, err := anizip.FetchAniZipMedia("anilist", mediaId)
		if err != nil || mapping == nil || mapping.Mappings == nil {
			// Non-fatal: local sources may still satisfy the request
			logger.Warn().Err(err).Int("mediaId", mediaId).
				Msg("decision_engine: anizip mapping unavailable — skipping torrentio tier")
			return nil
		}

		imdbID := mapping.Mappings.ImdbID
		if imdbID == "" {
			logger.Warn().Int("mediaId", mediaId).
				Msg("decision_engine: no IMDB ID in anizip mapping — cannot query torrentio")
			return nil
		}

		provider := torrentio.NewProvider(logger)
		streams, err := provider.GetSourcesForEpisode(gCtx, imdbID, 1, episodeNum)
		if err != nil {
			// Non-fatal: partial results are better than nothing
			logger.Warn().Err(err).Str("imdbID", imdbID).
				Msg("decision_engine: torrentio fetch failed")
			return nil
		}

		mu.Lock()
		defer mu.Unlock()
		for _, s := range streams {
			priority := PriorityTorrent
			if s.IsDebrid {
				priority = PriorityDebrid
			}
			sources = append(sources, MediaSource{
				Type:     "torrentio",
				URL:      s.MagnetURI,
				Path:     "",
				Quality:  s.Quality,
				Priority: priority,
				Title:    s.ReleaseGroup,
			})
		}
		return nil
	})

	// ── Collect & sort ───────────────────────────────────────────────────────
	// g.Wait() returns the first non-nil error from any goroutine, but we
	// deliberately swallow goroutine-level errors above (returning nil) so that
	// partial successes are always surfaced to the caller.
	if err := g.Wait(); err != nil {
		logger.Error().Err(err).Msg("decision_engine: unexpected errgroup error")
	}

	sort.Slice(sources, func(i, j int) bool {
		return sources[i].Priority < sources[j].Priority
	})

	return sources, nil
}

// inferQualityFromPath extracts a quality label from the file path.
func inferQualityFromPath(path string) string {
	lower := strings.ToLower(path)
	switch {
	case strings.Contains(lower, "2160") || strings.Contains(lower, "4k"):
		return "4K"
	case strings.Contains(lower, "1080"):
		return "1080p"
	case strings.Contains(lower, "720"):
		return "720p"
	case strings.Contains(lower, "480"):
		return "480p"
	}
	return "unknown"
}
