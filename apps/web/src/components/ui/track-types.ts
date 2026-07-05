/**
 * track-types.ts
 *
 * Shared TypeScript types for audio/subtitle track metadata.
 *
 * ─── Backend contract ──────────────────────────────────────────────────────────
 *
 * The backend should expose a dedicated endpoint (or include this in the stream
 * start response) that returns the available tracks extracted from the MKV
 * container header via `ffprobe` or `mkvmerge -J`.
 *
 * Recommended endpoint:
 *
 *   GET /api/v1/mediastream/track-info?streamId=<id>
 *
 * Example JSON response:
 * ```json
 * {
 *   "audioTracks": [
 *     { "index": 0, "language": "jpn", "title": "Japanese",          "codec": "FLAC",     "channels": 2, "default": true  },
 *     { "index": 1, "language": "spa", "title": "Español Latino",    "codec": "AAC",      "channels": 2, "default": false }
 *   ],
 *   "subtitleTracks": [
 *     { "index": 0, "language": "spa", "title": "Español",           "codec": "ASS",      "forced": false, "default": true  },
 *     { "index": 1, "language": "eng", "title": "English (Honorifics)","codec": "ASS",    "forced": false, "default": false },
 *     { "index": 2, "language": "spa", "title": "Español (Forzado)", "codec": "ASS",      "forced": true,  "default": false }
 *   ]
 * }
 * ```
 *
 * For **HLS transcode** streams, the backend additionally embeds audio track IDs
 * into the HLS manifest as `#EXT-X-MEDIA` tags; HLS.js surfaces these via
 * `Hls.Events.AUDIO_TRACKS_UPDATED`.  Both paths converge to the same
 * `AudioTrack` shape below so the UI layer is agnostic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Audio ───────────────────────────────────────────────────────────────────────

/**
 * Represents a single audio track inside a media container.
 *
 * For HLS streams this struct is built by merging hls.js audioTracks with
 * backend metadata. For direct-play streams it is seeded from the backend
 * mediaInfo response.
 */
export interface AudioTrack {
    /**
     * Absolute container index (MKV track number / ffprobe stream index).
     * Used by the backend in audio URIs: `./audio/{index}/index.m3u8`.
     * For native HTML5 AudioTrackList, use this as the array index.
     */
    index: number
    /**
     * hls.js internal id (sequential position in the manifest: 0, 1, 2…).
     * Only populated for HLS streams. Use this for `hls.audioTrack = hlsId`.
     * Distinct from `index` because hls.js ids are always sequential while
     * container indexes can have gaps (e.g. container has streams 0, 2, 5).
     */
    hlsId?: number
    /** BCP-47 / ISO 639-2 language code, e.g. "jpn", "spa", "eng". */
    language: string
    /** Human-readable label as embedded in the MKV — fall back to `language` if absent. */
    title: string
    /** Codec string, e.g. "FLAC", "AAC", "AC3", "OPUS". */
    codec?: string
    /** Number of audio channels (2 = stereo, 6 = 5.1, 8 = 7.1). */
    channels?: number
    /** Whether this is the default track as embedded in the container. */
    default?: boolean
}

// ── Subtitles ──────────────────────────────────────────────────────────────────

/**
 * Codec-agnostic subtitle track descriptor.
 *
 * For `.ass` / `.ssa` tracks `jassub` is used; for `subrip` (SRT) or external
 * tracks the native `<track>` element / VTT approach is used instead.
 * The UI component checks `codec` to decide the rendering strategy.
 */
export interface SubtitleTrack {
    /** Zero-based index in the MKV container. */
    index: number
    /** BCP-47 / ISO 639-2 language code. */
    language: string
    /** Human-readable label from the container metadata. */
    title: string
    /**
     * Container codec: "ass" | "ssa" | "subrip" | "webvtt" | "hdmv_pgs_subtitle".
     * The player uses this to choose the renderer (jassub vs. native <track>).
     */
    codec?: string
    /**
     * URL to a pre-extracted subtitle file served by the backend.
     *
     * For **jassub** this must point to the raw `.ass` file.
     * Endpoint example:
     *   GET /api/v1/mediastream/subtitles?path=<path>&trackIndex=<n>&clientId=<id>
     *
     * Image-based tracks (PGS/DVB) do NOT have a url — they require burn-in during transcode.
     */
    url?: string
    /** Whether this is a forced-subtitle-only track (signs/songs). */
    forced?: boolean
    /** Whether this is flagged as the default track in the container. */
    default?: boolean
    /**
     * True for bitmap subtitle codecs (PGS, DVB, XSUB) that cannot be
     * extracted as text. These require burn-in during transcode to be
     * rendered in a browser. When true, `url` is undefined and JASSUB
     * must NOT be used.
     */
    isImageBased?: boolean
}

// ── Aggregate container ─────────────────────────────────────────────────────────

/**
 * Track metadata bundle returned by the backend for the active stream.
 */
export interface StreamTrackInfo {
    audioTracks: AudioTrack[]
    subtitleTracks: SubtitleTrack[]
}

// ── UI Props ─────────────────────────────────────────────────────────────────────

/**
 * Props for the PlayerSettingsMenu component.
 * Centralizes all playback, audio, and subtitle settings.
 */
export interface PlayerSettingsMenuProps {
    audioTracks: AudioTrack[]
    activeAudioIndex: number
    onSelectAudio: (track: AudioTrack) => void
    
    subtitleTracks: SubtitleTrack[]
    activeSubtitleIndex: number | null
    onSelectSubtitle: (track: SubtitleTrack | null) => void
    isLoadingSubtitle?: boolean

    sources?: import("@/api/types/unified.types").EpisodeSource[]
    currentSourceUrl?: string
    onSourceChange?: (source: import("@/api/types/unified.types").EpisodeSource) => void

    hlsLevels?: { index: number; label: string; height: number }[]
    activeHlsLevel?: number
    onHlsLevelChange?: (level: number) => void

    playbackRate?: number
    onPlaybackRateChange?: (rate: number) => void

    autoSkipIntro?: boolean
    onAutoSkipIntroChange?: (auto: boolean) => void

    autoSkipOutro?: boolean
    onAutoSkipOutroChange?: (auto: boolean) => void

    showHeatmap?: boolean
    onShowHeatmapChange?: (show: boolean) => void

    aspectRatio?: "contain" | "fill" | "cover" | "16/9"
    onAspectRatioChange?: (ratio: "contain" | "fill" | "cover" | "16/9") => void

    subtitleSize?: number
    onSubtitleSizeChange?: (size: number) => void

    loopEnabled?: boolean
    onLoopEnabledChange?: (enabled: boolean) => void

    autoDisableSubtitlesWhenDubbed?: boolean
    onAutoDisableSubtitlesWhenDubbedChange?: (auto: boolean) => void

    tvMode?: boolean
    onTvModeChange?: (enabled: boolean) => void

    marathonMode?: boolean
    onMarathonModeChange?: (enabled: boolean) => void

    ambientModeEnabled?: boolean
    onAmbientModeEnabledChange?: (enabled: boolean) => void

    open?: boolean
    onOpenChange?: (open: boolean) => void
    className?: string

    mediaFormat?: string | null
    videoRef?: React.RefObject<HTMLVideoElement | null>
    malId?: number | null
    duration?: number
    mediaId?: number
    episodeNumber?: number
}