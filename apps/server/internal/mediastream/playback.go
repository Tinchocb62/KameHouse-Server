package mediastream

import (
	"context"
	"errors"
	"fmt"
	"kamehouse/internal/mediastream/videofile"
	"kamehouse/internal/util/result"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog"
	"github.com/samber/mo"
	"golang.org/x/sync/singleflight"
)

var attachmentSemaphore = make(chan struct{}, 2)

const (
	StreamTypeTranscode StreamType = "transcode" // On-the-fly transcoding
	StreamTypeOptimized StreamType = "optimized" // Pre-transcoded
	StreamTypeDirect    StreamType = "direct"    // Direct streaming
)

type (
	StreamType string

	// ClientCapabilities describes the codecs/containers the requesting client can
	// decode natively. Populated by the web player via canPlayType/MediaSource
	// probing. A nil pointer means "unknown client" and falls back to the static
	// Chromium-based assumptions used before capabilities existed.
	ClientCapabilities struct {
		Hevc      bool `json:"hevc"`      // HEVC/H.265 8-bit
		Hevc10Bit bool `json:"hevc10Bit"` // HEVC Main 10
		Av1       bool `json:"av1"`
		Vp9       bool `json:"vp9"`
		Ac3       bool `json:"ac3"`
		Eac3      bool `json:"eac3"`
		Dts       bool `json:"dts"`
		Matroska  bool `json:"matroska"` // can demux .mkv in <video> (Chromium yes, Firefox/Safari no)
	}

	PlaybackManager struct {
		logger                *zerolog.Logger
		stateMu               sync.Mutex                 // Guards currentMediaContainer (no longer serialized by repository.reqMu).
		currentMediaContainer mo.Option[*MediaContainer] // The current media being played.
		repository            *Repository
		mediaContainers       *result.Map[string, *MediaContainer] // Temporary cache for the media containers.
		clientMediaContainers *result.Map[string, *MediaContainer]
		// Dedupes concurrent identical newMediaContainer builds (keyed by hash:streamType)
		// so a hover-preload racing the play click runs ffprobe once instead of twice.
		containerGroup singleflight.Group
		// Tracks in-flight attachment/subtitle extractions keyed by file hash. The value
		// is a chan struct{} that is closed when extraction finishes successfully; on
		// failure the entry is deleted so a later request can retry. The subtitles/PGS
		// endpoints block on this (WaitForExtraction) instead of racing an empty dir.
		extractionJobs sync.Map // hash -> chan struct{}
	}

	PlaybackState struct {
		MediaID int `json:"mediaId"` // The media ID
	}

	MediaContainer struct {
		Filepath   string               `json:"filePath"`
		Hash       string               `json:"hash"`
		StreamType StreamType           `json:"streamType"` // Tells the frontend how to play the media.
		StreamURL  string               `json:"streamUrl"`  // The relative endpoint to stream the media.
		MediaInfo  *videofile.MediaInfo `json:"mediaInfo"`
		//Metadata  *Metadata       `json:"metadata"`
		// todo: add more fields (e.g. metadata)
	}
)

func NewPlaybackManager(repository *Repository) *PlaybackManager {
	return &PlaybackManager{
		logger:                repository.logger,
		repository:            repository,
		mediaContainers:       result.NewMap[string, *MediaContainer](),
		clientMediaContainers: result.NewMap[string, *MediaContainer](),
	}
}

func (p *PlaybackManager) KillPlayback() {
	p.logger.Debug().Msg("mediastream: Killing playback")
	p.stateMu.Lock()
	defer p.stateMu.Unlock()
	if p.currentMediaContainer.IsPresent() {
		p.currentMediaContainer = mo.None[*MediaContainer]()
		p.logger.Trace().Msg("mediastream: Removed current media container")
	}
}

// setCurrentMediaContainer / getCurrentMediaContainer guard the "current media"
// pointer that stream endpoints fall back to when a request carries no bound
// clientID. Previously the surrounding repository.reqMu made these writes safe;
// now that container builds run lock-free (singleflight), the writes/reads need
// their own small mutex.
func (p *PlaybackManager) setCurrentMediaContainer(mc *MediaContainer) {
	p.stateMu.Lock()
	p.currentMediaContainer = mo.Some(mc)
	p.stateMu.Unlock()
}

func (p *PlaybackManager) getCurrentMediaContainer() (*MediaContainer, bool) {
	p.stateMu.Lock()
	defer p.stateMu.Unlock()
	return p.currentMediaContainer.Get()
}

// fingerprint returns a short cache-key component so containers built for
// clients with different codec support don't leak into each other's decisions.
func (c *ClientCapabilities) fingerprint() string {
	if c == nil {
		return "legacy"
	}
	b := func(v bool) byte {
		if v {
			return '1'
		}
		return '0'
	}
	return string([]byte{b(c.Hevc), b(c.Hevc10Bit), b(c.Av1), b(c.Vp9), b(c.Ac3), b(c.Eac3), b(c.Dts), b(c.Matroska)})
}

// RequestPlayback is called by the frontend to stream a media file
func (p *PlaybackManager) RequestPlayback(filepath string, streamType StreamType, clientID string, caps *ClientCapabilities) (ret *MediaContainer, err error) {

	p.logger.Debug().Str("filepath", filepath).Any("type", streamType).Msg("mediastream: Requesting playback")

	start := time.Now()

	// Create a new media container. priority=true: this is the episode being played,
	// so its attachment extraction skips the preload semaphore and starts immediately.
	ret, err = p.newMediaContainer(filepath, streamType, caps, true)

	if err != nil {
		p.logger.Error().Err(err).Msg("mediastream: Failed to create media container")
		return nil, fmt.Errorf("failed to create media container: %v", err)
	}

	// Bind the session: stream endpoints (segments, ranges, subtitles) resolve the
	// file from this per-client (and global fallback) pointer.
	p.setCurrentMediaContainer(ret)
	if clientID != "" {
		p.clientMediaContainers.Set(clientID, ret)
	}

	p.logger.Info().Str("filepath", filepath).Str("hash", ret.Hash).Dur("total", time.Since(start)).Msg("mediastream: Ready to play media")

	return
}

// PreloadPlayback is called by the frontend to preload a media container so that the data is stored in advanced
func (p *PlaybackManager) PreloadPlayback(filepath string, streamType StreamType, preferredAudioLang string) (ret *MediaContainer, err error) {

	p.logger.Debug().Str("filepath", filepath).Any("type", streamType).Str("preferredAudioLang", preferredAudioLang).Msg("mediastream: Preloading playback")

	// Create a new media container. priority=false: preloads (hover) must not jump the
	// extraction queue ahead of the episode currently playing.
	ret, err = p.newMediaContainer(filepath, streamType, nil, false)

	if err != nil {
		p.logger.Error().Err(err).Msg("mediastream: Failed to create media container")
		return nil, fmt.Errorf("failed to create media container: %v", err)
	}

	// Zero Latency Next: Pre-transcode and cache the first N segments (video and audio) of the next episode in the background.
	if ret.StreamType == StreamTypeTranscode && p.repository.transcoder.IsPresent() {
		go func() {
			tc, _ := p.repository.transcoder.Get()
			ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
			defer cancel()

			preloadSegments := 3
			if p.repository.settings.IsPresent() {
				s := p.repository.settings.MustGet()
				if s != nil && s.TranscodeThreads > 0 {
					preloadSegments = s.TranscodeThreads
				}
			}

			p.logger.Debug().Str("filepath", ret.Filepath).Int("segments", preloadSegments).Msg("mediastream: Pre-transcoding video segments for zero-latency start")
			for i := 0; i < preloadSegments; i++ {
				_, _ = tc.GetVideoSegment(ctx, ret.Filepath, ret.Hash, ret.MediaInfo, "original", int32(i), "preload-client")
			}

			if len(ret.MediaInfo.Audios) > 0 {
				defaultAudioIdx := int32(0)
				foundPreferred := false
				if preferredAudioLang != "" {
					prefLang := strings.ToLower(preferredAudioLang)
					// First pass: try exact match or prefix match (e.g. "spa-lat" matches a track tagged "spa" or title containing "latino" / "lat")
					for _, aud := range ret.MediaInfo.Audios {
						audLang := ""
						if aud.Language != nil {
							audLang = strings.ToLower(*aud.Language)
						}
						audTitle := ""
						if aud.Title != nil {
							audTitle = strings.ToLower(*aud.Title)
						}

						if prefLang == "spa-lat" {
							if (audLang == "spa" || audLang == "es") && (strings.Contains(audTitle, "lat") || strings.Contains(audTitle, "latino")) {
								defaultAudioIdx = int32(aud.Index)
								foundPreferred = true
								break
							}
						} else {
							if audLang == prefLang || (prefLang == "spa" && audLang == "es") || (prefLang == "es" && audLang == "spa") {
								defaultAudioIdx = int32(aud.Index)
								foundPreferred = true
								break
							}
						}
					}

					// Second pass: if we wanted "spa-lat" but didn't find specific latino title, fallback to any Spanish/es track
					if !foundPreferred && prefLang == "spa-lat" {
						for _, aud := range ret.MediaInfo.Audios {
							audLang := ""
							if aud.Language != nil {
								audLang = strings.ToLower(*aud.Language)
							}
							if audLang == "spa" || audLang == "es" {
								defaultAudioIdx = int32(aud.Index)
								foundPreferred = true
								break
							}
						}
					}
				}

				// Fallback to default if no preferred audio match was found
				if !foundPreferred {
					for _, aud := range ret.MediaInfo.Audios {
						if aud.IsDefault {
							defaultAudioIdx = int32(aud.Index)
							break
						}
					}
				}

				p.logger.Debug().Str("filepath", ret.Filepath).Int("segments", preloadSegments).Int32("audioIndex", defaultAudioIdx).Msg("mediastream: Pre-transcoding audio segments for zero-latency start")
				for i := 0; i < preloadSegments; i++ {
					_, _ = tc.GetAudioSegment(ctx, ret.Filepath, ret.Hash, ret.MediaInfo, defaultAudioIdx, int32(i), "preload-client")
				}
			}
			p.logger.Info().Str("filepath", ret.Filepath).Int("segments", preloadSegments).Msg("mediastream: Finished proactive pre-transcoding of segments")
		}()
	}

	p.logger.Info().Str("filepath", filepath).Msg("mediastream: Ready to play media")

	return
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Optimize
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

func (p *PlaybackManager) newMediaContainer(filePath string, streamType StreamType, caps *ClientCapabilities, priority bool) (ret *MediaContainer, err error) {
	p.logger.Debug().Str("filepath", filePath).Any("type", streamType).Msg("mediastream: New media container requested")
	// Get the hash of the file.
	hash, err := videofile.GetHashFromPath(filePath)
	if err != nil {
		return nil, err
	}

	p.logger.Trace().Str("hash", hash).Msg("mediastream: Checking cache")

	// Cache key includes the client capability fingerprint: the direct-vs-transcode
	// decision depends on what the requesting client can decode, so a container
	// built for a HEVC-capable client must not be reused for one that isn't.
	cacheKey := hash + "|" + caps.fingerprint()

	// Fast path: cache hit (lock-free read). Only reuse if the stream type matches.
	if mc, ok := p.mediaContainers.Get(cacheKey); ok && mc.StreamType == streamType {
		p.logger.Debug().Str("hash", hash).Bool("cached", true).Msg("mediastream: Media container cache HIT")
		return mc, nil
	}

	// Slow path: dedupe concurrent identical builds. Keyed by hash:streamType:caps so
	// a preload racing a play (or two clients opening the same file) runs ffprobe
	// once and shares the result; different files still build in parallel (no global
	// lock). This replaces the old repository-wide reqMu around the whole request.
	key := cacheKey + ":" + string(streamType)
	v, err, _ := p.containerGroup.Do(key, func() (interface{}, error) {
		// Re-check the cache: a concurrent build may have completed while we queued.
		if mc, ok := p.mediaContainers.Get(cacheKey); ok && mc.StreamType == streamType {
			p.logger.Debug().Str("hash", hash).Bool("cached", true).Msg("mediastream: Media container cache HIT (deduped)")
			return mc, nil
		}
		return p.buildMediaContainer(filePath, hash, streamType, caps, cacheKey, priority)
	})
	if err != nil {
		return nil, err
	}
	return v.(*MediaContainer), nil
}

// buildMediaContainer performs the expensive work (ffprobe media-info extraction,
// codec compatibility decision, stream-URL resolution) and caches the result. It
// must only be called from within the containerGroup singleflight in
// newMediaContainer so the ffprobe never runs concurrently for the same file.
func (p *PlaybackManager) buildMediaContainer(filePath string, hash string, streamType StreamType, caps *ClientCapabilities, cacheKey string, priority bool) (ret *MediaContainer, err error) {
	p.logger.Trace().Str("hash", hash).Msg("mediastream: Creating media container")

	// Get the media information of the file.
	ret = &MediaContainer{
		Filepath:   filePath,
		Hash:       hash,
		StreamType: streamType,
	}

	p.logger.Debug().Msg("mediastream: Extracting media info")

	ffprobeStart := time.Now()
	ret.MediaInfo, err = p.repository.mediaInfoExtractor.GetInfo(p.repository.settings.MustGet().FfprobePath, filePath)
	if err != nil {
		return nil, err
	}
	p.logger.Debug().Str("hash", hash).Bool("cached", false).Dur("mediaInfo", time.Since(ffprobeStart)).Msg("mediastream: Media info extracted")

	p.logger.Debug().Msg("mediastream: Extracted media info, starting attachment extraction")

	// Extract attachments (fonts, embedded subtitles) in the background so it doesn't block
	// playback start. Exactly one extraction runs per file hash: the subtitles/PGS endpoints
	// wait on the tracked channel (WaitForExtraction) instead of racing a half-written dir,
	// and preloads (priority=false) queue behind the playback semaphore so the episode being
	// watched extracts first.
	p.startAttachmentExtraction(filePath, hash, ret.MediaInfo, priority)

	// Dynamic fallback from Direct Play to Transcode if the browser doesn't support the container/codecs natively.
	// We bypass this check if DirectPlayOnly is set to true in settings.
	isDirectPlayOnly := false
	if p.repository.settings.IsPresent() {
		if s := p.repository.settings.MustGet(); s != nil {
			isDirectPlayOnly = s.DirectPlayOnly
		}
	}

	if streamType == StreamTypeDirect && !isDirectPlayOnly {
		isDirectPlayable := isDirectPlayableByClient(ret.MediaInfo, caps)

		if !isDirectPlayable {
			vCodec := ""
			if ret.MediaInfo.Video != nil {
				vCodec = strings.ToLower(ret.MediaInfo.Video.Codec)
			}
			aCodec := ""
			if len(ret.MediaInfo.Audios) > 0 {
				var audioCodecs []string
				for _, audio := range ret.MediaInfo.Audios {
					audioCodecs = append(audioCodecs, strings.ToLower(audio.Codec))
				}
				aCodec = strings.Join(audioCodecs, ",")
			}
			p.logger.Info().Str("filepath", filePath).Str("ext", strings.ToLower(ret.MediaInfo.Extension)).Str("videoCodec", vCodec).Str("audioCodec", aCodec).Str("caps", caps.fingerprint()).Msg("mediastream: File container or codecs not supported by this client. Falling back to Transcode HLS.")
			streamType = StreamTypeTranscode
			ret.StreamType = StreamTypeTranscode
		}
	}



	streamURL := ""
	switch streamType {
	case StreamTypeDirect:
		// Directly serve the file.
		streamURL = "/api/v1/mediastream/direct/play"
	case StreamTypeTranscode:
		// Live transcode the file.
		streamURL = "/api/v1/mediastream/transcode/master.m3u8"
	case StreamTypeOptimized:
		optimizedPath := filepath.Join(p.repository.cacheDir, "optimized", hash, "master.m3u8")
		if _, err := os.Stat(optimizedPath); err == nil {
			streamURL = "/api/v1/mediastream/hls/master.m3u8"
		} else {
			// Fall back gracefully to transcode stream
			ret.StreamType = StreamTypeTranscode
			streamURL = "/api/v1/mediastream/transcode/master.m3u8"
		}
	}

	// TODO: Add metadata to the media container.
	// ...

	if streamURL == "" {
		return nil, errors.New("invalid stream type")
	}

	// Set the stream URL.
	ret.StreamURL = streamURL

	// Store the media container in the map.
	p.mediaContainers.Set(cacheKey, ret)

	return
}

// startAttachmentExtraction launches (at most once per hash) the ffmpeg demux that
// writes embedded subtitles and fonts to the cache. The registered channel is closed
// when extraction succeeds so waiters can proceed; on failure the entry is removed so
// a subsequent request can retry. priority=false routes the work through the global
// attachmentSemaphore (preloads), priority=true bypasses it (the episode being played).
func (p *PlaybackManager) startAttachmentExtraction(filePath string, hash string, mediaInfo *videofile.MediaInfo, priority bool) {
	ch := make(chan struct{})
	actual, loaded := p.extractionJobs.LoadOrStore(hash, ch)
	if loaded {
		// Another request already started (or finished) extraction for this hash.
		_ = actual
		return
	}

	go func() {
		defer close(ch)

		if !priority {
			attachmentSemaphore <- struct{}{}
			defer func() { <-attachmentSemaphore }()
		}

		if err := videofile.ExtractAttachment(p.repository.settings.MustGet().FfmpegPath, filePath, hash, mediaInfo, p.repository.cacheDir, p.logger); err != nil {
			p.logger.Error().Err(err).Str("filepath", filePath).Msg("mediastream: Attachment extraction failed")
			// Allow a later request to retry by dropping the (about-to-close) job entry.
			p.extractionJobs.Delete(hash)
		} else {
			p.logger.Debug().Str("filepath", filePath).Msg("mediastream: Attachment extraction completed")
		}
	}()
}

// WaitForExtraction blocks until the attachment/subtitle extraction for the given hash
// has finished, ctx is cancelled, or there is no extraction in flight. It returns nil
// when extraction is done (or was never needed) and ctx.Err() when the wait times out.
func (p *PlaybackManager) WaitForExtraction(ctx context.Context, hash string) error {
	v, ok := p.extractionJobs.Load(hash)
	if !ok {
		// No job tracked for this hash. Either extraction was never triggered or it
		// failed (entry deleted); if the subs dir already exists the caller will find
		// the files, otherwise it will report the appropriate error.
		return nil
	}
	ch := v.(chan struct{})
	select {
	case <-ch:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// isDirectPlayableByClient decides whether the file can be played natively by
// the requesting client without transcoding. When caps is nil (older clients
// that don't report capabilities) it assumes a Chromium/WebView2 engine, which
// matches the previous hardcoded behavior.
func isDirectPlayableByClient(info *videofile.MediaInfo, caps *ClientCapabilities) bool {
	switch strings.ToLower(info.Extension) {
	case "mp4", "m4v", "webm", "mov", "ogg":
		// Universal containers.
	case "mkv":
		// Chromium/WebView2 demuxes Matroska natively; Firefox and Safari do not.
		if caps != nil && !caps.Matroska {
			return false
		}
	default:
		return false
	}

	if info.Video != nil {
		vCodec := strings.ToLower(info.Video.Codec)
		// 10/12-bit content needs special handling: no browser decodes Hi10P H.264,
		// and HEVC Main 10 requires explicit hardware support on the client.
		isHighBitDepth := strings.Contains(info.Video.PixFmt, "10") || strings.Contains(info.Video.PixFmt, "12")
		switch vCodec {
		case "h264":
			if isHighBitDepth {
				return false
			}
		case "hevc", "h265":
			if caps != nil {
				if !caps.Hevc {
					return false
				}
				if isHighBitDepth && !caps.Hevc10Bit {
					return false
				}
			}
		case "vp8":
			// Universally supported.
		case "vp9":
			if caps != nil && !caps.Vp9 {
				return false
			}
		case "av1":
			if caps != nil && !caps.Av1 {
				return false
			}
		default:
			return false
		}
	}

	// The DEFAULT audio track must be decodable by the client. In direct play the
	// browser plays whichever track the container marks as default and exposes no API
	// to switch it (Chromium/WebView2), so it is not enough that *some* track is
	// supported: if the default is e.g. E-AC3 while a secondary FLAC track exists, the
	// browser would still try (and fail) to play the E-AC3 default → black screen /
	// silence. Falling back to transcode here lets hls.js expose both tracks switchably.
	if len(info.Audios) > 0 {
		defaultAudio := info.Audios[0]
		for _, audio := range info.Audios {
			if audio.IsDefault {
				defaultAudio = audio
				break
			}
		}
		if !isAudioCodecSupported(defaultAudio.Codec, caps) {
			return false
		}
	}

	return true
}

// isAudioCodecSupported reports whether the client can natively decode the given audio
// codec. AC3/E-AC3/DTS are proprietary and not shipped in Chromium, so only clients that
// explicitly probed support for them may direct-play those.
func isAudioCodecSupported(codec string, caps *ClientCapabilities) bool {
	switch strings.ToLower(codec) {
	case "aac", "mp3", "opus", "flac", "vorbis":
		return true
	case "ac3":
		return caps != nil && caps.Ac3
	case "eac3", "e-ac-3":
		return caps != nil && caps.Eac3
	case "dts", "dca":
		return caps != nil && caps.Dts
	}
	return false
}
