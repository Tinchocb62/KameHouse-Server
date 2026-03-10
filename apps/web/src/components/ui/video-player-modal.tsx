/**
 * VideoPlayerModal
 *
 * Full-screen modal video player powered by HLS.js.
 * - Supports HLS streams (transcode / optimized) and direct MP4/MKV via native <video>
 * - Immersive premium Netflix-style UI with custom controls.
 * - JASSUB WASM renderer for complex ASS/SSA anime subtitles (no video reload on swap).
 * - Audio and subtitle track selection via PlayerSettingsMenu gear overlay.
 */

import React, { useEffect, useRef, useCallback, useState } from "react"
import Hls from "hls.js"
import { Loader2, AlertTriangle } from "lucide-react"
import { FaPlay, FaPause, FaForward, FaBackward, FaExpand, FaCompress, FaVolumeUp, FaVolumeMute } from "react-icons/fa"
import { FiX } from "react-icons/fi"
import { cn } from "@/components/ui/core/styling"
import type { Mediastream_StreamType } from "@/api/generated/types"
import { useUpdateContinuityWatchHistoryItem } from "@/api/hooks/continuity.hooks"
import { useGetSettings } from "@/api/hooks/settings.hooks"
import { useGetAddonSubtitles } from "@/api/hooks/addon-subtitles.hooks"
import { usePlaybackTelemetry } from "@/hooks/usePlaybackTelemetry"
import { useJassub } from "@/hooks/useJassub"
import { PlayerSettingsMenu } from "@/components/ui/PlayerSettingsMenu"
import { TimelineHeatmap, type InsightNode } from "@/components/ui/timeline-heatmap"
import type { AudioTrack, SubtitleTrack, StreamTrackInfo } from "@/components/ui/track-types"

export interface VideoPlayerModalProps {
    streamUrl: string
    streamType: Mediastream_StreamType
    title?: string
    episodeLabel?: string
    mediaId?: number
    episodeNumber?: number
    /** If true, the stream URL points to an external CDN (e.g. Debrid). Enables crossOrigin. */
    isExternalStream?: boolean
    trackInfo?: StreamTrackInfo
    onClose: () => void
    // ── Marathon Mode ────────────────────────────────────────────────────────
    /** When true, automatically skips intro and transitions to next episode. */
    marathonMode?: boolean
    /** Called when the player reaches outro start in marathon mode, or the user clicks "Next". */
    onNextEpisode?: () => void
    /** Title of the next episode shown in the Next Episode card. */
    nextEpisodeTitle?: string
    /**
     * Precise intro end time in seconds from the backend intelligence service.
     * Falls back to 90 s if undefined.
     */
    introEnd?: number
    /**
     * Precise outro start time in seconds from the backend intelligence service.
     * Falls back to `duration - 120` if undefined.
     */
    outroStart?: number
}

const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "00:00"
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ── Jassub Overlay Component ────────────────────────────────────────────────
// Memoized overlay that conditionally spins up the WASM worker only when mounted.
interface JassubOverlayProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    subtitleUrl: string
    onLoading: (isLoading: boolean) => void
}

const JassubOverlay = React.memo(({ videoRef, subtitleUrl, onLoading }: JassubOverlayProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    
    const { isLoadingSubtitle } = useJassub({
        canvasRef,
        videoRef,
        initialSubtitleUrl: subtitleUrl
    })

    useEffect(() => {
        onLoading(isLoadingSubtitle)
    }, [isLoadingSubtitle, onLoading])

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
        />
    )
})

export function VideoPlayerModal({
    streamUrl,
    streamType,
    title,
    episodeLabel,
    mediaId,
    episodeNumber,
    isExternalStream = false,
    trackInfo,
    onClose,
    marathonMode = false,
    onNextEpisode,
    nextEpisodeTitle,
    introEnd: introEndProp,
    outroStart: outroStartProp,
}: VideoPlayerModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const hlsRef = useRef<Hls | null>(null)

    // DOM Refs to bypass React State loop during high-frequency time updates
    const timeTextRef = useRef<HTMLSpanElement>(null)
    const progressBarRef = useRef<HTMLDivElement>(null)
    const progressInputRef = useRef<HTMLInputElement>(null)
    const currentTimeRef = useRef(0)

    // Status
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
    const [errorMsg, setErrorMsg] = useState<string>("")

    // Center play/pause flash overlay
    const [centerFlash, setCenterFlash] = useState<"play" | "pause" | null>(null)
    const centerFlashTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Custom Controls State
    const [isPlaying, setIsPlaying] = useState(false)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Visibility
    const [isControlsVisible, setIsControlsVisible] = useState(true)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Touch / double-tap skip
    const lastTapRef = useRef<{ time: number; x: number } | null>(null)
    const [tapFeedback, setTapFeedback] = useState<"left" | "right" | null>(null)
    const tapFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null)

    // ── Marathon Mode ────────────────────────────────────────────────────────
    // Resolved timestamps — props take priority, API fills in, defaults are fallback
    const introEndRef = useRef<number>(introEndProp ?? 90)       // default 1:30
    const outroStartRef = useRef<number>(outroStartProp ?? Infinity) // computed once duration is known

    // Ref-based overlay visibility — toggled by checkPlaybackTriggers without causing re-renders
    const [showSkipIntro, setShowSkipIntro] = useState(false)
    const [showNextEpisode, setShowNextEpisode] = useState(false)
    const [nextEpCountdown, setNextEpCountdown] = useState(0)

    // Flag: did we already auto-trigger next episode during this session?
    const autoTriggeredRef = useRef(false)

    // Fetch precise timestamps from backend intelligence service
    useEffect(() => {
        if (!mediaId || !episodeNumber) return
        // Props already provided — skip API call
        if (introEndProp !== undefined || outroStartProp !== undefined) return

        let cancelled = false
        fetch(`/api/v1/library/anime/intelligence?mediaId=${mediaId}&episode=${episodeNumber}`)
            .then((r) => r.ok ? r.json() : null)
            .then((rawData) => {
                const data = rawData as { intro_end?: number; outro_start?: number } | null
                if (cancelled || !data) return
                if (typeof data.intro_end === "number") introEndRef.current = data.intro_end
                if (typeof data.outro_start === "number") outroStartRef.current = data.outro_start
            })
            .catch(() => { /* silently use defaults */ })
        return () => { cancelled = true }
    }, [mediaId, episodeNumber, introEndProp, outroStartProp])

    // Propagate prop changes to refs
    useEffect(() => { if (introEndProp !== undefined) introEndRef.current = introEndProp }, [introEndProp])
    useEffect(() => { if (outroStartProp !== undefined) outroStartRef.current = outroStartProp }, [outroStartProp])

    /**
     * checkPlaybackTriggers — called inside the native `timeupdate` listener.
     * Uses ONLY refs for reads and buckets updates to ~1/s to prevent re-renders.
     *
     * State is only set when it actually changes (boolean equality guard).
     */
    const lastBucketRef = useRef(-1)
    const checkPlaybackTriggers = useCallback((time: number, dur: number) => {
        if (dur === 0) return

        // Compute outro start lazily once duration is known
        if (outroStartRef.current === Infinity) {
            outroStartRef.current = Math.max(0, dur - 120) // default: last 2 min
        }

        // Bucket to 1-second resolution to avoid running this 30× per second
        const bucket = Math.floor(time)
        if (bucket === lastBucketRef.current) return
        lastBucketRef.current = bucket

        const inIntro = time >= 0 && time < introEndRef.current
        const inOutro = time >= outroStartRef.current
        const inPreOutro = time >= dur - 180 // "Next Episode" card shows at last 3 min

        setShowSkipIntro((prev) => prev !== inIntro ? inIntro : prev)
        setShowNextEpisode((prev) => prev !== inPreOutro ? inPreOutro : prev)

        if (inPreOutro) {
            setNextEpCountdown(Math.max(0, Math.ceil(dur - time)))
        }

        // Marathon auto-trigger: jump to next episode when outro begins
        if (marathonMode && inOutro && !autoTriggeredRef.current && onNextEpisode) {
            autoTriggeredRef.current = true
            onNextEpisode()
        }
    }, [marathonMode, onNextEpisode])

    // ── Track selection state ──────────────────────────────────────────────────
    // Audio tracks — seeded from the trackInfo prop; HLS streams also auto-detect
    // them from the manifest via AUDIO_TRACKS_UPDATED (see HLS effect below).
    const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(trackInfo?.audioTracks ?? [])
    const [activeAudioIndex, setActiveAudioIndex] = useState<number>(0)

    // Subtitle tracks — always sourced from the trackInfo prop (MKV container metadata).
    const [subtitleTracks] = useState<SubtitleTrack[]>(trackInfo?.subtitleTracks ?? [])
    const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number | null>(
        // Default to the container's default-flagged track if present.
        trackInfo?.subtitleTracks.find((t) => t.default)?.index ?? null
    )

    // Active .ass track logic for Jassub lazy loading
    const activeAssTrackUrl = subtitleTracks.find(
        (t) => t.index === activeSubtitleIndex && (t.codec === "ass" || t.codec === "ssa")
    )?.url ?? null

    const [isJassubLoading, setIsJassubLoading] = useState(false)

    // Addon Subtitles
    const { data: addonSubtitles } = useGetAddonSubtitles("series", mediaId)

    // Playback Telemetry
    const telemetry = usePlaybackTelemetry(mediaId ? String(mediaId) : "")

    // Settings
    const { data: settings } = useGetSettings()
    const isPredictiveCacheEnabled = (settings?.mediaPlayer as any)?.predictiveCache ?? false

    // Insights (X-Ray Heatmap)
    const [insights, setInsights] = useState<InsightNode[]>([])
    useEffect(() => {
        if (!mediaId || !episodeNumber || duration <= 0) return
        let cancelled = false
        fetch(`/api/v1/videocore/insights/${mediaId}-${episodeNumber}?duration=${duration}`)
            .then((r) => r.ok ? r.json() : null)
            .then((res: any) => {
                if (cancelled || !res?.data) return
                setInsights(res.data)
            })
            .catch(() => {})
        return () => { cancelled = true }
    }, [mediaId, episodeNumber, duration])

    // Continuity Tracking
    const { mutate: updateContinuity } = useUpdateContinuityWatchHistoryItem()

    const saveContinuity = useCallback((time: number, total: number) => {
        if (!mediaId || !episodeNumber || total === 0) return
        updateContinuity({
            options: {
                mediaId,
                episodeNumber,
                currentTime: time,
                duration: total,
                kind: "mediastream",
                predictive: isPredictiveCacheEnabled,
            }
        })
    }, [mediaId, episodeNumber, updateContinuity, isPredictiveCacheEnabled])

    // Close on Escape key
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Don't intercept when user is typing in an input
            if ((e.target as HTMLElement).tagName === "INPUT") return

            switch (e.code) {
                case "Escape":
                    if (videoRef.current) saveContinuity(videoRef.current.currentTime, videoRef.current.duration)
                    onClose()
                    break
                case "Space":
                case "KeyK":
                    e.preventDefault()
                    if (videoRef.current) {
                        if (videoRef.current.paused) videoRef.current.play()
                        else videoRef.current.pause()
                    }
                    break
                case "KeyF":
                    if (!containerRef.current) break
                    if (!document.fullscreenElement) containerRef.current.requestFullscreen().catch(() => {})
                    else document.exitFullscreen()
                    break
                case "KeyM":
                    if (videoRef.current) {
                        videoRef.current.muted = !videoRef.current.muted
                        setIsMuted(videoRef.current.muted)
                    }
                    break
                case "ArrowRight":
                    e.preventDefault()
                    if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, videoRef.current.duration)
                    break
                case "ArrowLeft":
                    e.preventDefault()
                    if (videoRef.current) videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0)
                    break
                case "KeyS":
                    // Skip Intro shortcut — only active while Skip Intro overlay is visible
                    if (showSkipIntro && videoRef.current) {
                        videoRef.current.currentTime = introEndRef.current
                    }
                    break
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose, saveContinuity, showSkipIntro])

    // Prevent body scroll
    useEffect(() => {
        document.body.style.overflow = "hidden"
        return () => { document.body.style.overflow = "" }
    }, [])

    // HLS Logic
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        setStatus("loading")
        const isHls = streamType === "transcode" || streamType === "optimized"

        if (isHls) {
            if (Hls.isSupported()) {
                const hls = new Hls({ startLevel: -1, enableWorker: true, lowLatencyMode: false })
                hlsRef.current = hls
                hls.loadSource(streamUrl)
                hls.attachMedia(video)
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    setStatus("ready")
                    video.play().catch(() => { })
                })
                hls.on(Hls.Events.ERROR, (_evt, data) => {
                    if (data.fatal) {
                        setStatus("error")
                        setErrorMsg(`Error HLS: ${data.details}`)
                        hls.destroy()
                    }
                })
                /**
                 * AUDIO_TRACKS_UPDATED fires after the manifest is parsed and
                 * whenever the available audio tracks change. We map HLS.js
                 * AudioTrack objects → our AudioTrack interface and merge them
                 * with any tracks already provided via the trackInfo prop.
                 *
                 * HLS.js AudioTrack fields:
                 *   { id, name, lang, default, ... }
                 */
                hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_evt, data) => {
                    const hlsTracks: AudioTrack[] = data.audioTracks.map((t, idx) => ({
                        index: idx,
                        language: t.lang ?? "und",
                        title: t.name ?? t.lang ?? `Track ${idx + 1}`,
                        default: t.default ?? idx === 0,
                    }))
                    // Prefer trackInfo (has codec/channels); fall back to HLS discovery.
                    if (trackInfo?.audioTracks && trackInfo.audioTracks.length > 0) return
                    setAudioTracks(hlsTracks)
                })
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                video.src = streamUrl
                video.addEventListener("canplay", () => setStatus("ready"), { once: true })
                video.play().catch(() => { })
            } else {
                setStatus("error")
                setErrorMsg("Navegador no soportado.")
            }
        } else {
            video.src = streamUrl
            video.addEventListener("canplay", () => setStatus("ready"), { once: true })
            video.addEventListener("error", () => {
                setStatus("error")
                setErrorMsg("Fallo al reproducir archivo directo.")
            }, { once: true })
            video.play().catch(() => { })
        }

        // ── localStorage resume position — written every 5 s ─────────────
        const lsKey = mediaId ? `player-pos-${mediaId}-${episodeNumber ?? 0}` : null
        if (lsKey) {
            const saved = localStorage.getItem(lsKey)
            // Restore saved position once metadata is available
            video.addEventListener("loadedmetadata", () => {
                if (saved) {
                    const savedTime = Number(saved)
                    if (savedTime > 10 && savedTime < (video.duration - 5)) {
                        video.currentTime = savedTime
                    }
                }
            }, { once: true })
        }

        const posInterval = lsKey
            ? setInterval(() => {
                if (videoRef.current && !videoRef.current.paused) {
                    localStorage.setItem(lsKey, String(videoRef.current.currentTime))
                }
            }, 5000)
            : null

        const updateTime = () => {
            const time = video.currentTime
            const dur = video.duration || 0
            currentTimeRef.current = time

            if (timeTextRef.current) {
                timeTextRef.current.textContent = formatTime(time)
            }
            if (progressBarRef.current) {
                progressBarRef.current.style.width = `${Math.max(0, Math.min(100, (time / (dur || 1)) * 100))}%`
            }
            if (progressInputRef.current) {
                progressInputRef.current.value = time.toString()
            }

            // Marathon triggers — buckets to 1 s, no re-render on every RAF tick
            checkPlaybackTriggers(time, dur)

            // Playback telemetry
            telemetry.reportProgress(time, false)
        }
        const updateDuration = () => setDuration(video.duration)
        const onPlay = () => {
            setIsPlaying(true)
            // Flash the center play icon
            if (centerFlashTimerRef.current) clearTimeout(centerFlashTimerRef.current)
            setCenterFlash("play")
            centerFlashTimerRef.current = setTimeout(() => setCenterFlash(null), 600)
        }
        const onPause = () => {
            setIsPlaying(false)
            if (video.duration > 0) {
                saveContinuity(video.currentTime, video.duration)
                telemetry.reportProgress(video.currentTime, true)
            }
            // Flash the center pause icon
            if (centerFlashTimerRef.current) clearTimeout(centerFlashTimerRef.current)
            setCenterFlash("pause")
            centerFlashTimerRef.current = setTimeout(() => setCenterFlash(null), 600)
        }

        video.addEventListener('timeupdate', updateTime)
        video.addEventListener('loadedmetadata', updateDuration)
        video.addEventListener('play', onPlay)
        video.addEventListener('pause', onPause)

        return () => {
            saveContinuity(video.currentTime, video.duration)
            if (lsKey) localStorage.setItem(lsKey, String(video.currentTime))
            if (posInterval) clearInterval(posInterval)
            video.removeEventListener('timeupdate', updateTime)
            video.removeEventListener('loadedmetadata', updateDuration)
            video.removeEventListener('play', onPlay)
            video.removeEventListener('pause', onPause)
            hlsRef.current?.destroy()
            hlsRef.current = null
            video.src = ""
        }
    }, [streamUrl, streamType, saveContinuity, mediaId, episodeNumber])

    // ── Audio track selection handler ─────────────────────────────────────────
    const handleSelectAudio = useCallback((track: AudioTrack) => {
        setActiveAudioIndex(track.index)

        // ── HLS.js path ──
        // For HLS streams, tell HLS.js to switch the audio rendition.
        // HLS.js handles the segment fetching and codec switch automatically.
        if (hlsRef.current) {
            hlsRef.current.audioTrack = track.index
            return
        }

        // ── Native HTMLVideoElement AudioTrackList path ──
        // For direct MKV/MP4 streams, the browser exposes AudioTrackList on the
        // <video> element. We enable only the chosen track.
        // NOTE: Chrome/Edge support this; Firefox has partial support; Safari is full.
        const video = videoRef.current
        if (video && "audioTracks" in video) {
            const nativeTracks = (video as HTMLVideoElement & { audioTracks: AudioTrackList }).audioTracks
            for (let i = 0; i < nativeTracks.length; i++) {
                // Cast via `unknown` first to satisfy TS — the native AudioTrack spec
                // has an `enabled` property but it is not exposed in lib.dom.d.ts.
                ; ((nativeTracks[i] as unknown) as { enabled: boolean }).enabled =
                    i === track.index
            }
        }
    }, [])

    // ── Subtitle track selection handler ─────────────────────────────────────
    const handleSelectSubtitle = useCallback(
        (track: SubtitleTrack | null) => {
            if (track === null) {
                // User chose "Off" 
                setActiveSubtitleIndex(null)
                return
            }

            setActiveSubtitleIndex(track.index)

            if (track.codec !== "ass" && track.codec !== "ssa" && track.url) {
                // ── VTT/SRT path: use browser's native TextTrack ──
                const video = videoRef.current
                if (!video) return
                const existing = Array.from(video.textTracks)
                existing.forEach((t) => { t.mode = "disabled" })
                // The <track> element for external addon subtitles already exists in the JSX;
                // for MKV-native non-ASS tracks the parent can inject them dynamically.
                const nativeTrack = Array.from(video.textTracks).find(
                    (t) => t.language === track.language
                )
                if (nativeTrack) nativeTrack.mode = "showing"
            }
        },
        []
    )

    // Controls Logic
    const togglePlay = () => {
        if (!videoRef.current) return
        if (isPlaying) videoRef.current.pause()
        else videoRef.current.play()
    }

    const skipTime = (amount: number) => {
        if (!videoRef.current) return
        let newTime = videoRef.current.currentTime + amount
        if (newTime < 0) newTime = 0
        if (newTime > duration) newTime = duration
        videoRef.current.currentTime = newTime
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return
        const time = Number(e.target.value)
        videoRef.current.currentTime = time
    }

    const toggleMute = () => {
        if (!videoRef.current) return
        videoRef.current.muted = !isMuted
        setIsMuted(!isMuted)
    }

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return
        const val = Number(e.target.value)
        videoRef.current.volume = val
        setVolume(val)
        if (val === 0) {
            setIsMuted(true)
            videoRef.current.muted = true
        } else if (isMuted) {
            setIsMuted(false)
            videoRef.current.muted = false
        }
    }

    const toggleFullscreen = () => {
        if (!containerRef.current) return
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => { })
            setIsFullscreen(true)
        } else {
            document.exitFullscreen()
            setIsFullscreen(false)
        }
    }

    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', onFsChange)
        return () => document.removeEventListener('fullscreenchange', onFsChange)
    }, [])

    // Autohide controls logic (Throttled for Performance)
    const lastMouseMovedRef = useRef<number>(0)
    const showControlsTemporarily = useCallback(() => {
        const now = Date.now()
        // Throttle to max 1 update per 200ms to avoid DOM trashing on mouse move
        if (now - lastMouseMovedRef.current < 200) return
        lastMouseMovedRef.current = now

        setIsControlsVisible(true)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(() => {
            if (videoRef.current && !videoRef.current.paused) {
                setIsControlsVisible(false)
            }
        }, 3000)
    }, [])

    const handleMouseLeave = () => {
        if (videoRef.current && !videoRef.current.paused) {
            setIsControlsVisible(false)
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }

    useEffect(() => {
        showControlsTemporarily()
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
    }, [isPlaying, showControlsTemporarily])

    // handleTap — called on touch/click over the video area.
    // Single tap: show/hide controls.
    // Double-tap left third: rewind 10s, right third: forward 10s.
    const handleTap = useCallback((clientX: number, containerWidth: number) => {
        const now = Date.now()
        const last = lastTapRef.current
        const DOUBLE_TAP_MS = 300

        if (last && now - last.time < DOUBLE_TAP_MS) {
            // Double tap detected
            lastTapRef.current = null
            const zone = clientX / containerWidth
            if (zone < 0.4) {
                skipTime(-10)
                setTapFeedback("left")
            } else if (zone > 0.6) {
                skipTime(10)
                setTapFeedback("right")
            } else {
                // Center double tap — toggle play
                togglePlay()
            }
            if (tapFeedbackTimerRef.current) clearTimeout(tapFeedbackTimerRef.current)
            tapFeedbackTimerRef.current = setTimeout(() => setTapFeedback(null), 600)
        } else {
            lastTapRef.current = { time: now, x: clientX }
            // Force reset lastMouseMovedRef to ensure tap always triggers visible state
            lastMouseMovedRef.current = 0 
            showControlsTemporarily()
        }
    }, [skipTime, togglePlay, showControlsTemporarily])

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[10000] bg-black w-screen h-screen flex items-center justify-center font-sans select-none overflow-hidden"
            onMouseMove={showControlsTemporarily}
            onMouseLeave={handleMouseLeave}
            onClick={showControlsTemporarily}
            onTouchStart={(e) => {
                // onTouchStart used for quick responsiveness; handleTap handles the logic
                const touch = e.changedTouches[0]
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                handleTap(touch.clientX - rect.left, rect.width)
            }}
        >
            {/* Loading / Error States */}
            {status === "loading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 text-white">
                    <Loader2 className="w-14 h-14 text-orange-500 animate-spin drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
                    <p className="font-bold tracking-widest uppercase text-sm opacity-80 animate-pulse">
                        {streamType === "transcode" ? "Preparando Transmisión" : "Estableciendo Conexión"}
                    </p>
                </div>
            )}

            {status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 px-6 text-center text-white bg-black/90">
                    <AlertTriangle className="w-16 h-16 text-orange-500" />
                    <h3 className="font-black text-2xl tracking-wide">Transmisión Caída</h3>
                    <p className="text-gray-400 max-w-md">{errorMsg}</p>
                    <button onClick={onClose} className="mt-4 px-8 py-3 rounded-md bg-orange-500 hover:bg-orange-600 font-bold transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                        Regresar
                    </button>
                </div>
            )}

            {/* Video Element */}
            <video
                ref={videoRef}
                onClick={togglePlay}
                className={cn(
                    "w-full h-full object-contain bg-black outline-none",
                    status !== "ready" && "opacity-0"
                )}
                // Enable CORS for external CDN streams (Debrid redirects)
                crossOrigin={isExternalStream || (addonSubtitles && addonSubtitles.length > 0) ? "anonymous" : undefined}
                // Ocultar controles nativos
                controls={false}
                // Playback telemetry
                onEnded={() => {
                    const video = videoRef.current
                    if (video) telemetry.reportProgress(video.currentTime, true)
                }}
                onSeeked={() => {
                    const video = videoRef.current
                    if (video) telemetry.reportProgress(video.currentTime, true)
                }}
            >
                {/* Addon subtitle tracks (external WebVTT sources from addon system) */}
                {addonSubtitles?.map((sub, idx) => (
                    <track
                        key={sub.id || idx}
                        kind="subtitles"
                        src={sub.url}
                        srcLang={sub.lang}
                        label={sub.lang.toUpperCase()}
                        default={idx === 0}
                    />
                ))}
            </video>

            {/* JASSUB WASM Lazy Loaded Renderer */}
            {activeAssTrackUrl && status === "ready" && (
                <JassubOverlay
                    videoRef={videoRef}
                    subtitleUrl={activeAssTrackUrl}
                    onLoading={setIsJassubLoading}
                />
            )}

            {/* Center Play/Pause Flash (Stremio-style) */}
            {centerFlash && (
                <div
                    key={centerFlash}
                    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                >
                    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-black/45 backdrop-blur-sm animate-[ping_0.5s_ease-out_forwards]">
                        {centerFlash === "play"
                            ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-white ml-1"><path d="M8 5v14l11-7z"/></svg>
                            : <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        }
                    </div>
                </div>
            )}


            {/* ── Smart Overlay: Skip Intro ─────────────────────────────────────
                 Appears during the intro window. 'S' key or click jumps to introEnd.
                 bottom-20 keeps it above the control bar; z-30 above center-flash.     */}
            <div className={cn(
                "absolute bottom-24 left-8 md:left-10 z-30 transition-all duration-500 pointer-events-auto",
                showSkipIntro ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
            )}>
                <button
                    id="skip-intro-btn"
                    aria-label="Saltar Introducción"
                    onClick={(e) => {
                        e.stopPropagation()
                        if (videoRef.current) videoRef.current.currentTime = introEndRef.current
                    }}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-lg",
                        "bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40",
                        "backdrop-blur-md text-white text-sm font-semibold tracking-wide",
                        "transition-all duration-200 shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
                        "active:scale-95"
                    )}
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-80">
                        <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/>
                    </svg>
                    Saltar Intro
                    <span className="text-white/40 text-xs font-normal ml-1 hidden sm:inline">[S]</span>
                </button>
            </div>

            {/* ── Smart Overlay: Next Episode card ─────────────────────────────
                 Appears during the last 3 minutes. Shows countdown and next ep title.
                 Auto-triggers onNextEpisode when marathon mode is ON.               */}
            <div className={cn(
                "absolute bottom-24 right-6 md:right-10 z-30 transition-all duration-500 pointer-events-auto",
                showNextEpisode ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
            )}>
                <div className={cn(
                    "flex flex-col gap-3 p-4 rounded-xl w-64",
                    "bg-zinc-900/80 border border-white/10 backdrop-blur-xl",
                    "shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
                )}>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Siguiente episodio</span>
                        {marathonMode && (
                            <span className="text-orange-400 text-xs font-bold tabular-nums">
                                Auto en {Math.ceil(Math.max(0, nextEpCountdown - (outroStartRef.current === Infinity ? 120 : (duration - outroStartRef.current))))}s
                            </span>
                        )}
                    </div>

                    {nextEpisodeTitle && (
                        <p className="text-white text-sm font-semibold leading-snug line-clamp-2">
                            {nextEpisodeTitle}
                        </p>
                    )}

                    {/* Marathon mode progress bar */}
                    {marathonMode && duration > 0 && (
                        <div className="w-full h-0.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-orange-500 transition-all duration-1000"
                                style={{ width: `${Math.min(100, Math.max(0, ((duration - nextEpCountdown) / (duration - (outroStartRef.current === Infinity ? duration - 120 : outroStartRef.current))) * 100))}%` }}
                            />
                        </div>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            autoTriggeredRef.current = true
                            onNextEpisode?.()
                        }}
                        className={cn(
                            "w-full py-2 rounded-lg text-sm font-bold tracking-wide",
                            "bg-orange-500 hover:bg-orange-400 text-white",
                            "transition-all duration-200 active:scale-95",
                            "shadow-[0_0_16px_rgba(249,115,22,0.35)]"
                        )}
                    >
                        Ir al siguiente →
                    </button>
                </div>
            </div>

            {/* UI Overlay — Cinematic VOD Style */}
            <div className="absolute inset-0 pointer-events-none z-[10]">
                {/* Top Bar — Gradient Mask */}
                <div className={cn(
                    "absolute top-0 inset-x-0 pt-6 pb-24 px-6 md:px-10 flex flex-col md:flex-row md:items-start justify-between pointer-events-auto bg-gradient-to-b from-black/70 to-transparent",
                    "transition-all duration-300 ease-out",
                    isControlsVisible || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"
                )}>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 text-white/70 hover:text-white transition-colors group bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md"
                        >
                            <FiX className="w-6 h-6 drop-shadow-md" />
                        </button>
                        
                        <div className="flex flex-col drop-shadow-lg max-w-lg mt-2 md:mt-0">
                            <span className="text-white font-black text-xl md:text-2xl leading-tight tracking-wide">{title || "Reproduciendo"}</span>
                            {episodeLabel && (
                                <span className="text-zinc-300 font-bold tracking-widest uppercase text-xs mt-1 md:mt-0.5">{episodeLabel}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center click area (to pause/play on video tap) — disabled in favour of onTouchStart on container */}
                <div className="flex-1 pointer-events-auto cursor-pointer hidden md:block" onClick={(e) => { e.stopPropagation(); togglePlay(); }} />

                {/* Tap Feedback Overlay (mobile skip animation) */}
                {tapFeedback && (
                    <div className={cn(
                        "absolute inset-y-0 flex items-center justify-center pointer-events-none z-20 transition-opacity duration-300",
                        tapFeedback === "left" ? "left-0 w-1/3" : "right-0 w-1/3",
                        "bg-white/5 backdrop-blur-sm mx-4 my-24 rounded-3xl"
                    )}>
                        <div className="flex flex-col items-center gap-2 text-white/90">
                            {tapFeedback === "left" ? (
                                <>
                                    <FaBackward className="w-10 h-10 drop-shadow-xl" />
                                    <span className="text-sm font-black tracking-widest">-10s</span>
                                </>
                            ) : (
                                <>
                                    <FaForward className="w-10 h-10 drop-shadow-xl" />
                                    <span className="text-sm font-black tracking-widest">+10s</span>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Bottom Bar — Floating Dark Glass Pill */}
                <div className={cn(
                    "absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl flex flex-col gap-2 pointer-events-auto select-none",
                    "bg-black/50 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-4 shadow-2xl",
                    "transition-all duration-300 ease-out",
                    isControlsVisible || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                )}>
                    
                    {/* Minimalist Expanding Progress Timeline */}
                    <div className="relative w-full h-1 hover:h-1.5 transition-all bg-white/20 group cursor-pointer flex items-center rounded-full" onClick={(e) => { e.stopPropagation() }}>
                        
                        <TimelineHeatmap duration={duration} insights={insights} />

                        <div
                            ref={progressBarRef}
                            className="h-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)] transition-all ease-linear rounded-full rounded-r-none relative z-10"
                            style={{ width: "0%" }}
                        >
                            {/* Hover Thumb Component */}
                            <div
                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 md:w-4 md:h-4 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,1)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            />
                        </div>

                        {/* Dragging input */}
                        <input
                            ref={progressInputRef}
                            type="range"
                            min={0}
                            max={duration || 100}
                            defaultValue={0}
                            onChange={(e) => { e.stopPropagation(); handleSeek(e); }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
                            style={{ height: "40px", top: "50%", transform: "translateY(-50%)" }}
                        />
                    </div>

                    {/* Bottom Controls Row */}
                    <div className="flex items-center justify-between w-full mt-1">

                        {/* Left Wing */}
                        <div className="flex items-center gap-2 md:gap-4">
                            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-zinc-400 hover:text-white transition-colors flex items-center justify-center transform hover:scale-110 p-2">
                                {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5 pl-0.5" />}
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); skipTime(-10); }} className="text-zinc-400 hover:text-white transition-colors flex items-center justify-center p-2 hidden sm:block">
                                <FaBackward className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); skipTime(10); }} className="text-zinc-400 hover:text-white transition-colors flex items-center justify-center p-2 hidden sm:block">
                                <FaForward className="w-4 h-4" />
                            </button>

                            {/* Volume Control */}
                            <div className="hidden md:flex items-center gap-2 group ml-2">
                                <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="text-zinc-400 hover:text-white transition-colors flex items-center justify-center p-2">
                                    {isMuted || volume === 0 ? <FaVolumeMute className="w-4 h-4" /> : <FaVolumeUp className="w-4 h-4" />}
                                </button>
                                <div className="w-0 group-hover:w-20 transition-all duration-300 overflow-hidden relative h-1 flex items-center bg-white/20 rounded-full cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                    <div className="absolute left-0 h-full bg-white rounded-full" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
                                    <input
                                        type="range"
                                        min={0} max={1} step={0.05}
                                        value={isMuted ? 0 : volume}
                                        onChange={(e) => { e.stopPropagation(); handleVolume(e); }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
                                    />
                                </div>
                            </div>

                            {/* Time indicator */}
                            <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium tabular-nums tracking-wide ml-2">
                                <span ref={timeTextRef} className="text-white">00:00</span>
                                <span className="opacity-50">/</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Right Wing: Settings, Fullscreen */}
                        <div className="flex items-center gap-1 md:gap-2">
                            <PlayerSettingsMenu
                                audioTracks={audioTracks}
                                activeAudioIndex={activeAudioIndex}
                                onSelectAudio={handleSelectAudio}
                                subtitleTracks={subtitleTracks}
                                activeSubtitleIndex={activeSubtitleIndex}
                                onSelectSubtitle={handleSelectSubtitle}
                                isLoadingSubtitle={isJassubLoading}
                            />

                            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-zinc-400 hover:text-white transition-colors flex items-center justify-center p-2">
                                {isFullscreen ? <FaCompress className="w-4 h-4" /> : <FaExpand className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
