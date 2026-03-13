package streaming

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"kamehouse/internal/api/anizip"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models/dto"
	msTranscoder "kamehouse/internal/mediastream/transcoder"
	"kamehouse/internal/mediastream/videofile"
	"kamehouse/internal/onlinestream/providers/torrentio"
	"kamehouse/internal/util/cache"
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

// Priority constants for sources. Lower = higher priority.
const (
	PriorityLocal   = 1 // Direct local file — zero network cost
	PriorityDebrid  = 2 // Debrid-cached torrent — fast HTTP, near-instant
	PriorityTorrent = 3 // Raw P2P magnet — seeders variable
)

// SourcePriorityEngine is responsible for unifying local and online media sources.
type SourcePriorityEngine struct {
	logger      *zerolog.Logger
	database    *db.Database
	// anizipCache stores AniZip media mappings to avoid repeated HTTP calls per request.
	anizipCache *anizip.Cache
	// remoteCache stores Torrentio results per imdbID-season-episode to avoid redundant remote requests.
	remoteCache *cache.Cache[[]dto.EpisodeSource]
}

// Global instance to persist cache across requests (typically you'd attach it to core.App,
// but for simplicity it's scoped here if used statically).
var defaultSourceEngine *SourcePriorityEngine
var once sync.Once

// GetSourcePriorityEngine returns a singleton instance.
func GetSourcePriorityEngine(logger *zerolog.Logger, database *db.Database) *SourcePriorityEngine {
	once.Do(func() {
		defaultSourceEngine = &SourcePriorityEngine{
			logger:      logger,
			database:    database,
			anizipCache: anizip.NewCache(),
			remoteCache: cache.NewCache[[]dto.EpisodeSource](2 * time.Hour),
		}
	})
	// Keep logger/db references up to date in case they change
	defaultSourceEngine.logger = logger
	defaultSourceEngine.database = database
	return defaultSourceEngine
}


// ResolveEpisodeSources fans out to all source tiers concurrently via errgroup,
// collects results in a thread-safe slice, and returns them sorted by Priority.
//
// The function ALWAYS returns whatever partial results were gathered even when
// one goroutine fails — callers should not treat a non-nil error as fatal if
// len(sources) > 0.
func (e *SourcePriorityEngine) ResolveEpisodeSources(
	ctx context.Context,
	mediaId int,
	episodeNum int,
) (*dto.EpisodeSourcesResponse, error) {
	var (
		mu      sync.Mutex
		sources []dto.EpisodeSource
	)

	g, gCtx := errgroup.WithContext(ctx)

	// ── Goroutine 1: Local Files (Always fresh) ──────────────────────────────
	g.Go(func() error {
		lfs, _, err := db.GetLocalFiles(e.database)
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
			stableID := lf.GetStableID()
			mu.Lock()
			sources = append(sources, dto.EpisodeSource{
				Type:     dto.SourceTypeLocal,
				URL:      "/api/v1/directstream/local?id=" + stableID,
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

	// ── Goroutine 2: Torrentio / Debrid (Cached, with timeout) ──────────────
	g.Go(func() error {
		// 5-second hard deadline: if AniZip or Torrentio is slow/down, local
		// catalogue still loads instantly and this goroutine is cancelled cleanly.
		remoteCtx, cancelRemote := context.WithTimeout(gCtx, 5*time.Second)
		defer cancelRemote()

		// Cached anizip lookup — avoids one HTTP call per episode rendered
		mapping, err := anizip.FetchAniZipMediaC("anilist", mediaId, e.anizipCache)
		if err != nil || mapping == nil || mapping.Mappings == nil {
			// Non-fatal: local sources may still satisfy the request
			e.logger.Warn().Err(err).Int("mediaId", mediaId).
				Msg("decision_engine: anizip mapping unavailable — skipping torrentio tier")
			return nil
		}

		imdbID := mapping.Mappings.ImdbID
		if imdbID == "" {
			e.logger.Warn().Int("mediaId", mediaId).
				Msg("decision_engine: no IMDB ID in anizip mapping — cannot query torrentio")
			return nil
		}

		// Check memory cache
		cacheKey := fmt.Sprintf("%s-%d-%d", imdbID, 1, episodeNum)
		if cachedSources, found := e.remoteCache.Get(cacheKey); found {
			mu.Lock()
			sources = append(sources, cachedSources...)
			mu.Unlock()
			return nil
		}

		provider := torrentio.NewProvider(e.logger)
		streams, err := provider.GetSourcesForEpisode(remoteCtx, imdbID, 1, episodeNum)
		if err != nil {
			// Non-fatal: partial results are better than nothing
			e.logger.Warn().Err(err).Str("imdbID", imdbID).
				Msg("decision_engine: torrentio fetch failed")
			return nil
		}

		var remoteSources []dto.EpisodeSource
		for _, s := range streams {
			priority := PriorityTorrent
			if s.IsDebrid {
				priority = PriorityDebrid
			}
			remoteSources = append(remoteSources, dto.EpisodeSource{
				Type:     dto.SourceTypeTorrentio,
				URL:      s.MagnetURI,
				Quality:  s.Quality,
				Priority: priority,
				Title:    s.ReleaseGroup,
			})
		}

		if len(remoteSources) > 0 {
			e.remoteCache.Set(cacheKey, remoteSources)
		}

		mu.Lock()
		sources = append(sources, remoteSources...)
		mu.Unlock()
		return nil
	})

	// ── Collect & sort ───────────────────────────────────────────────────────
	// g.Wait() returns the first non-nil error from any goroutine, but we
	// deliberately swallow goroutine-level errors above (returning nil) so that
	// partial successes are always surfaced to the caller.
	if err := g.Wait(); err != nil {
		e.logger.Error().Err(err).Msg("decision_engine: unexpected errgroup error")
	}

	sort.Slice(sources, func(i, j int) bool {
		return sources[i].Priority < sources[j].Priority
	})
	
	playSource := dto.SourceType("")
	if len(sources) > 0 {
		playSource = sources[0].Type
	}

	return &dto.EpisodeSourcesResponse{
		EpisodeNumber: episodeNum,
		Sources:       sources,
		PlaySource:    playSource,
	}, nil
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
