// Package mediastream handles HLS and direct streaming of media files, transcode preloading, and subtitle extraction.
package mediastream

import (
	"errors"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/events"
	"kamehouse/internal/mediastream/cassette"
	"kamehouse/internal/mediastream/videofile"
	"kamehouse/internal/util/filecache"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"github.com/rs/zerolog"
	"github.com/samber/mo"
)

type (
	Repository struct {
		transcoder         mo.Option[*cassette.Cassette]
		settings           mo.Option[*models.MediastreamSettings]
		playbackManager    *PlaybackManager
		mediaInfoExtractor *videofile.MediaInfoExtractor
		logger             *zerolog.Logger
		wsEventManager     events.WSEventManagerInterface
		fileCacher         *filecache.Cacher
		reqMu              sync.Mutex
		cacheDir           string // where attachments are stored
		transcodeDir       string // where stream segments are stored
		database           *db.Database
		skipDetector       *SkipDetector
		warmingActive      atomic.Bool // guards WarmMediaInfo against overlapping runs
	}

	NewRepositoryOptions struct {
		Logger         *zerolog.Logger
		WSEventManager events.WSEventManagerInterface
		FileCacher     *filecache.Cacher
		Database       *db.Database
	}
)

func NewRepository(opts *NewRepositoryOptions) *Repository {
	ret := &Repository{
		logger: opts.Logger,
		settings:           mo.None[*models.MediastreamSettings](),
		transcoder:         mo.None[*cassette.Cassette](),
		wsEventManager:     opts.WSEventManager,
		fileCacher:         opts.FileCacher,
		mediaInfoExtractor: videofile.NewMediaInfoExtractor(opts.FileCacher, opts.Logger),
		database:           opts.Database,
	}
	ret.playbackManager = NewPlaybackManager(ret)

	return ret
}

func (r *Repository) IsInitialized() bool {
	return r.settings.IsPresent()
}

func (r *Repository) OnCleanup() {

}

func (r *Repository) InitializeModules(settings *models.MediastreamSettings, cacheDir string, transcodeDir string) {
	if settings == nil {
		r.logger.Error().Msg("mediastream: Settings not present")
		return
	}
	// Create the temp directory
	err := os.MkdirAll(transcodeDir, 0755)
	if err != nil {
		r.logger.Error().Err(err).Msg("mediastream: Failed to create transcode directory")
	}

	if settings.FfmpegPath == "" {
		settings.FfmpegPath = "ffmpeg"
	}

	if settings.FfprobePath == "" {
		settings.FfprobePath = "ffprobe"
	}

	// Set the settings
	r.settings = mo.Some(settings)

	r.cacheDir = cacheDir
	r.transcodeDir = transcodeDir

	r.skipDetector = NewSkipDetector(
		r.database,
		r.logger,
		r.wsEventManager,
		cacheDir,
		settings.FfmpegPath,
		settings.FfprobePath,
	)

	// Initialize the transcoder (respects the TranscodeEnabled setting on startup)
	_ = r.initializeTranscoder(r.settings, false)

	// Purge stale transcode directory leftovers on startup
	r.ClearTranscodeDir()

	r.logger.Info().Msg("mediastream: Module initialized")
}

func (r *Repository) GetSkipDetector() *SkipDetector {
	return r.skipDetector
}

// WarmMediaInfo pre-extracts and caches media info (ffprobe) for the given files
// using a small worker pool, so the first play of any file skips the cold-start
// ffprobe. GetInfo is cache-aware (52-week disk TTL keyed by path hash), so
// already-warmed files are near-free. Best-effort: failures are logged at debug
// and never block. Safe to call from a goroutine; overlapping calls are skipped.
func (r *Repository) WarmMediaInfo(paths []string) {
	if !r.IsInitialized() || len(paths) == 0 {
		return
	}
	if !r.warmingActive.CompareAndSwap(false, true) {
		r.logger.Debug().Msg("mediastream: Media-info warming already in progress, skipping")
		return
	}
	defer r.warmingActive.Store(false)

	ffprobePath := r.settings.MustGet().FfprobePath
	start := time.Now()
	r.logger.Info().Int("files", len(paths)).Msg("mediastream: Warming media-info cache")

	const workers = 3
	sem := make(chan struct{}, workers)
	var wg sync.WaitGroup
	var warmed atomic.Int64

	for _, p := range paths {
		if p == "" {
			continue
		}
		wg.Add(1)
		sem <- struct{}{}
		go func(path string) {
			defer wg.Done()
			defer func() { <-sem }()
			if _, err := r.mediaInfoExtractor.GetInfo(ffprobePath, path); err != nil {
				r.logger.Debug().Err(err).Str("filepath", path).Msg("mediastream: Media-info warm failed")
				return
			}
			warmed.Add(1)
		}(p)
	}
	wg.Wait()

	r.logger.Info().
		Int64("warmed", warmed.Load()).
		Int("total", len(paths)).
		Dur("took", time.Since(start)).
		Msg("mediastream: Media-info cache warming complete")
}

// CacheWasCleared should be called when the cache directory is manually cleared.
func (r *Repository) CacheWasCleared() {
	r.playbackManager.mediaContainers.Clear()
	r.playbackManager.clientMediaContainers.Clear()
}

func (r *Repository) ClearTranscodeDir() {
	r.reqMu.Lock()
	defer r.reqMu.Unlock()

	r.logger.Trace().Msg("mediastream: Clearing transcode directory")

	// Empty the transcode directory
	if r.transcodeDir != "" {
		files, err := os.ReadDir(r.transcodeDir)
		if err != nil {
			r.logger.Error().Err(err).Msg("mediastream: Failed to read transcode directory")
			return
		}

		for _, file := range files {
			err = os.RemoveAll(filepath.Join(r.transcodeDir, file.Name()))
			if err != nil {
				r.logger.Error().Err(err).Msg("mediastream: Failed to remove file from transcode directory")
			}
		}
	}

	r.logger.Debug().Msg("mediastream: Transcode directory cleared")

	r.playbackManager.mediaContainers.Clear()
	r.playbackManager.clientMediaContainers.Clear()
}

// ActiveVideoFileHashes returns a set of file hashes currently active in media containers.
// This is used by the filecacher to avoid pruning actively playing video files.
func (r *Repository) ActiveVideoFileHashes() map[string]struct{} {
	hashes := make(map[string]struct{})
	
	// Collect from mediaContainers
	r.playbackManager.mediaContainers.Range(func(_ string, mc *MediaContainer) bool {
		if mc != nil && mc.MediaInfo != nil {
			hashes[mc.MediaInfo.Sha] = struct{}{}
		}
		return true
	})

	// Collect from clientMediaContainers
	r.playbackManager.clientMediaContainers.Range(func(_ string, mc *MediaContainer) bool {
		if mc != nil && mc.MediaInfo != nil {
			hashes[mc.MediaInfo.Sha] = struct{}{}
		}
		return true
	})

	return hashes
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Transcode
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

func (r *Repository) TranscoderIsInitialized() bool {
	return r.IsInitialized() && r.transcoder.IsPresent()
}

// RequestTranscodeStream builds a transcode media container. When force is true the
// transcoder engine is initialized on-demand even if TranscodeEnabled is off — this is
// used for explicit user actions (e.g. switching audio track during direct play) that
// require HLS but shouldn't demand the user flip the global setting. For H264 sources
// the video is stream-copied and only the audio is re-encoded, so the cost is low.
func (r *Repository) RequestTranscodeStream(filepath string, clientID string, force bool) (ret *MediaContainer, err error) {
	r.logger.Debug().Str("filepath", filepath).Bool("force", force).Msg("mediastream: Transcode stream requested")

	if !r.IsInitialized() {
		return nil, errors.New("module not initialized")
	}

	// reqMu now guards ONLY transcoder initialization and ClearTranscodeDir — not the
	// whole request. The expensive newMediaContainer runs lock-free (deduped by
	// singleflight), so concurrent playback requests no longer serialize behind a
	// global mutex or each other's ffprobe.
	if !r.transcoder.IsPresent() {
		r.reqMu.Lock()
		if !r.transcoder.IsPresent() { // double-check under the lock
			if ok := r.initializeTranscoder(r.settings, force); !ok {
				r.reqMu.Unlock()
				if !force && !r.settings.MustGet().TranscodeEnabled {
					return nil, errors.New("La transcodificación está desactivada. Actívala en Ajustes -> Streaming.")
				}
				return nil, errors.New("real-time transcoder not initialized, check your settings")
			}
		}
		r.reqMu.Unlock()
	}

	ret, err = r.playbackManager.RequestPlayback(filepath, StreamTypeTranscode, clientID, nil)

	return
}

func (r *Repository) RequestPreloadTranscodeStream(filepath string, preferredAudioLang string) (err error) {
	r.logger.Debug().Str("filepath", filepath).Str("preferredAudioLang", preferredAudioLang).Msg("mediastream: Transcode stream preloading requested")

	if !r.IsInitialized() {
		return errors.New("module not initialized")
	}

	_, err = r.playbackManager.PreloadPlayback(filepath, StreamTypeTranscode, preferredAudioLang)

	return
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Direct Play
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

func (r *Repository) RequestDirectPlay(filepath string, clientID string, caps *ClientCapabilities) (ret *MediaContainer, err error) {
	r.logger.Debug().Str("filepath", filepath).Msg("mediastream: Direct play requested")

	if !r.IsInitialized() {
		return nil, errors.New("module not initialized")
	}

	// No global lock: newMediaContainer dedupes concurrent builds via singleflight.
	ret, err = r.playbackManager.RequestPlayback(filepath, StreamTypeDirect, clientID, caps)
	if err != nil {
		return nil, err
	}

	// The client asked for direct play but the server decided the file must be
	// transcoded (e.g. undecodable default audio codec, see isDirectPlayableByClient).
	// The returned container already points at the HLS master playlist, but the
	// transcoder engine may be dormant when TranscodeEnabled=false — serving that
	// playlist with a dead transcoder would guarantee a black screen. Initialize it
	// on-demand with force=true: the server, not the user, decided direct is impossible.
	if ret != nil && ret.StreamType == StreamTypeTranscode && !r.transcoder.IsPresent() {
		r.reqMu.Lock()
		if !r.transcoder.IsPresent() { // double-check under the lock
			if ok := r.initializeTranscoder(r.settings, true); !ok {
				r.logger.Error().Str("filepath", filepath).Msg("mediastream: Direct→transcode fallback could not initialize the transcoder on-demand")
			}
		}
		r.reqMu.Unlock()
	}

	return
}

func (r *Repository) RequestPreloadDirectPlay(filepath string) (err error) {
	r.logger.Debug().Str("filepath", filepath).Msg("mediastream: Direct stream preloading requested")

	if !r.IsInitialized() {
		return errors.New("module not initialized")
	}

	_, err = r.playbackManager.PreloadPlayback(filepath, StreamTypeDirect, "")

	return
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Optimized Play
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

func (r *Repository) RequestOptimizedStream(filepath string, clientID string) (ret *MediaContainer, err error) {
	r.logger.Debug().Str("filepath", filepath).Msg("mediastream: Optimized stream requested")

	if !r.IsInitialized() {
		return nil, errors.New("module not initialized")
	}

	// No global lock: newMediaContainer dedupes concurrent builds via singleflight.
	ret, err = r.playbackManager.RequestPlayback(filepath, StreamTypeOptimized, clientID, nil)

	return
}

func (r *Repository) RequestPreloadOptimizedStream(filepath string) (err error) {
	r.logger.Debug().Str("filepath", filepath).Msg("mediastream: Optimized stream preloading requested")

	if !r.IsInitialized() {
		return errors.New("module not initialized")
	}

	_, err = r.playbackManager.PreloadPlayback(filepath, StreamTypeOptimized, "")

	return
}

///////////////////////////////////////////////////////////////////////////////////////////////

// initializeTranscoder builds the transcoder engine. When force is false it respects the
// TranscodeEnabled setting and refuses to start if transcoding is disabled. When force is
// true (an explicit, user-initiated transcode request) it starts the engine regardless of
// the setting, as long as ffmpeg and the temp dir are available. Constructing the engine is
// cheap — no ffmpeg process runs until a segment is actually requested.
func (r *Repository) initializeTranscoder(settings mo.Option[*models.MediastreamSettings], force bool) bool {
	// Destroy the old transcoder if it exists
	if r.transcoder.IsPresent() {
		tc, _ := r.transcoder.Get()
		tc.Destroy()
	}

	r.transcoder = mo.None[*cassette.Cassette]()

	// If the transcoder is not enabled and this isn't an explicit (forced) request,
	// don't initialize the transcoder.
	if !force && !settings.MustGet().TranscodeEnabled {
		r.logger.Warn().Msg("mediastream: transcoder disabled (TranscodeEnabled=false); files that need transcoding will fail until enabled in Settings -> Streaming")
		return false
	}

	// If the temp directory is not set, don't initialize the transcoder
	if r.transcodeDir == "" {
		r.logger.Error().Msg("mediastream: Transcode directory not set, could not initialize transcoder")
		return false
	}

	opts := &cassette.NewCassetteOptions{
		Logger:                r.logger,
		HwAccelKind:           settings.MustGet().TranscodeHwAccel,
		Preset:                settings.MustGet().TranscodePreset,
		FfmpegPath:            settings.MustGet().FfmpegPath,
		FfprobePath:           settings.MustGet().FfprobePath,
		HwAccelCustomSettings: settings.MustGet().TranscodeHwAccelCustomSettings,
		TempOutDir:            r.transcodeDir,
		MaxConcurrency:        0, // Use default (NumCPU)
	}

	tc, err := cassette.New(opts)
	if err != nil {
		r.logger.Error().Err(err).Msg("mediastream: Failed to initialize transcoder")
		return false
	}

	r.playbackManager.mediaContainers.Clear()

	r.logger.Info().Msg("mediastream: Transcoder module initialized")
	r.transcoder = mo.Some(tc)

	return true
}
