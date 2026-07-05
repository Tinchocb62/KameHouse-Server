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

// RequestPlayback is called by the frontend to stream a media file
func (p *PlaybackManager) RequestPlayback(filepath string, streamType StreamType, clientID string) (ret *MediaContainer, err error) {

	p.logger.Debug().Str("filepath", filepath).Any("type", streamType).Msg("mediastream: Requesting playback")

	start := time.Now()

	// Create a new media container
	ret, err = p.newMediaContainer(filepath, streamType)

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

	// Create a new media container
	ret, err = p.newMediaContainer(filepath, streamType)

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

func (p *PlaybackManager) newMediaContainer(filePath string, streamType StreamType) (ret *MediaContainer, err error) {
	p.logger.Debug().Str("filepath", filePath).Any("type", streamType).Msg("mediastream: New media container requested")
	// Get the hash of the file.
	hash, err := videofile.GetHashFromPath(filePath)
	if err != nil {
		return nil, err
	}

	p.logger.Trace().Str("hash", hash).Msg("mediastream: Checking cache")

	// Fast path: cache hit (lock-free read). Only reuse if the stream type matches.
	if mc, ok := p.mediaContainers.Get(hash); ok && mc.StreamType == streamType {
		p.logger.Debug().Str("hash", hash).Bool("cached", true).Msg("mediastream: Media container cache HIT")
		return mc, nil
	}

	// Slow path: dedupe concurrent identical builds. Keyed by hash:streamType so
	// a preload racing a play (or two clients opening the same file) runs ffprobe
	// once and shares the result; different files still build in parallel (no global
	// lock). This replaces the old repository-wide reqMu around the whole request.
	key := hash + ":" + string(streamType)
	v, err, _ := p.containerGroup.Do(key, func() (interface{}, error) {
		// Re-check the cache: a concurrent build may have completed while we queued.
		if mc, ok := p.mediaContainers.Get(hash); ok && mc.StreamType == streamType {
			p.logger.Debug().Str("hash", hash).Bool("cached", true).Msg("mediastream: Media container cache HIT (deduped)")
			return mc, nil
		}
		return p.buildMediaContainer(filePath, hash, streamType)
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
func (p *PlaybackManager) buildMediaContainer(filePath string, hash string, streamType StreamType) (ret *MediaContainer, err error) {
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

	p.logger.Debug().Msg("mediastream: Extracted media info, deferring attachment extraction to background")

	// Extract attachments (fonts, embedded subtitles) in background so it doesn't block playback start.
	// The subtitles endpoint will still work once extraction completes; if the user requests subs before
	// extraction finishes, the file will simply not be ready yet (handled by the serve endpoint).
	go func() {
		attachmentSemaphore <- struct{}{}
		defer func() { <-attachmentSemaphore }()

		if err := videofile.ExtractAttachment(p.repository.settings.MustGet().FfmpegPath, filePath, hash, ret.MediaInfo, p.repository.cacheDir, p.logger); err != nil {
			p.logger.Error().Err(err).Str("filepath", filePath).Msg("mediastream: Background attachment extraction failed")
		} else {
			p.logger.Debug().Str("filepath", filePath).Msg("mediastream: Background attachment extraction completed")
		}
	}()

	// Dynamic fallback from Direct Play to Transcode if the browser doesn't support the container/codecs natively.
	// We bypass this check if DirectPlayOnly is set to true in settings.
	isDirectPlayOnly := false
	if p.repository.settings.IsPresent() {
		if s := p.repository.settings.MustGet(); s != nil {
			isDirectPlayOnly = s.DirectPlayOnly
		}
	}

	if streamType == StreamTypeDirect && !isDirectPlayOnly {
		isDirectPlayable := false
		ext := strings.ToLower(ret.MediaInfo.Extension)
		// Universal direct-playable containers in modern browsers (including mkv inside WebView2)
		if ext == "mp4" || ext == "m4v" || ext == "webm" || ext == "mov" || ext == "ogg" || ext == "mkv" {
			hasSupportedVideo := false
			if ret.MediaInfo.Video != nil {
				vCodec := strings.ToLower(ret.MediaInfo.Video.Codec)
				// h264, hevc/h265, vp8, vp9, and av1 are natively supported.
				if vCodec == "h264" || vCodec == "hevc" || vCodec == "h265" || vCodec == "vp8" || vCodec == "vp9" || vCodec == "av1" {
					hasSupportedVideo = true
				}
			} else {
				// Audio only
				hasSupportedVideo = true
			}

			hasSupportedAudio := true
			if len(ret.MediaInfo.Audios) > 0 {
				hasSupportedAudio = false
				for _, audio := range ret.MediaInfo.Audios {
					aCodec := strings.ToLower(audio.Codec)
					// Only codecs with decoders shipped in Chromium/WebView2 are safe for direct play.
					// AC3, E-AC3 and DTS (dca) are proprietary and NOT decoded by Chromium (an OS
					// Media Foundation decoder may exist on some Windows builds, but it's unreliable and
					// absent on Firefox/Chrome), so they must fall back to Transcode HLS (re-encoded to AAC).
					// Leaving them here caused PIPELINE_ERROR_DECODE: "Failed to send audio packet for decoding".
					if aCodec == "aac" || aCodec == "mp3" || aCodec == "opus" || aCodec == "flac" || aCodec == "vorbis" {
						hasSupportedAudio = true
						break
					}
				}
			}

			if hasSupportedVideo && hasSupportedAudio {
				isDirectPlayable = true
			}
		}

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
			p.logger.Info().Str("filepath", filePath).Str("ext", ext).Str("videoCodec", vCodec).Str("audioCodec", aCodec).Msg("mediastream: File container or codecs not natively supported by browser. Falling back to Transcode HLS.")
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
	p.mediaContainers.Set(hash, ret)

	return
}
