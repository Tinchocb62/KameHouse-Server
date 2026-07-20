import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import Hls from "hls.js"
import JASSUB from "jassub"
import { usePlayerShortcuts } from "./usePlayerShortcuts"
import { usePlayerJassub } from "./usePlayerJassub"
import { usePlayerHls } from "./usePlayerHls"
import { useAnimeTracking } from "@/api/hooks/useAnimeTracking"
import { useWebSocket } from "@/hooks/use-websocket"
import { getApiWebSocketUrl } from "@/api/client/server-url"
import { useMediastreamShutdownTranscodeStream, usePreloadMediastreamMediaContainer } from "@/api/hooks/mediastream.hooks"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { usePlayerProgressSync } from "@/api/hooks/usePlayerProgressSync"
import { useGetContinuityWatchHistoryItem } from "@/api/hooks/continuity.hooks"
import { useGetStatus } from "@/api/hooks/settings.hooks"
import type { AudioTrack, SubtitleTrack } from "@/components/ui/track-types"
import type { PlayerCoreProps, PlayerCore, PlayerStats } from "./player-core.types"

import { usePlayerSkip } from "./usePlayerSkip"
import { __DEV_SERVER_PORT } from "@/lib/server/config"
import { buildSeaQuery } from "@/api/client/requests"


export type { PlayerStats, PlayerCoreProps, PlayerCore }

function getAbsoluteLanUrl(playableUrl: string, serverIPs?: string[], serverPort?: number): string {
    if (!playableUrl) return ""
    let lanIp = "127.0.0.1"

    if (serverIPs && serverIPs.length > 0) {
        const preferredIp = serverIPs.find(ip =>
            ip.startsWith("192.168.") ||
            ip.startsWith("10.") ||
            ip.startsWith("172.")
        )
        lanIp = preferredIp || serverIPs[0]
    } else if (typeof window !== "undefined") {
        const hn = window.location.hostname
        if (hn !== "localhost" && hn !== "127.0.0.1" && hn !== "::1") {
            lanIp = hn
        }
    }
    const port = serverPort || __DEV_SERVER_PORT

    if (playableUrl.startsWith("/")) {
        return `http://${lanIp}:${port}${playableUrl}`
    }

    try {
        const url = new URL(playableUrl)
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]") {
            url.hostname = lanIp
            url.port = String(port)
            return url.toString()
        }
        if (typeof window !== "undefined" && url.host === window.location.host) {
            url.hostname = lanIp
            url.port = String(port)
            return url.toString()
        }
    } catch {
        if (playableUrl.includes("localhost") || playableUrl.includes("127.0.0.1")) {
            return playableUrl
                .replace("localhost", lanIp)
                .replace("127.0.0.1", lanIp)
                .replace(/:\d+\//, `:${port}/`)
        }
    }
    return playableUrl
}

export function usePlayerCore(props: PlayerCoreProps): PlayerCore {
    const {
        playableUrl,
        streamUrl,
        backendTracks,
        initialProgressSeconds = 0,
        onClose,
        onProgress,
        onNextEpisode,
        hasNextEpisode = false,
        mediaId,
        episodeNumber,
        malId,
        clientId,
        mediaFormat,
        title,
        nextStreamUrl,
        nextStreamType,
        streamType,
    } = props

    const { data: statusQuery } = useGetStatus()
    const serverIPs = statusQuery?.serverIPs
    const serverPort = statusQuery?.serverPort

    const absoluteLanUrl = useMemo(() => {
        return getAbsoluteLanUrl(playableUrl, serverIPs, serverPort)
    }, [playableUrl, serverIPs, serverPort])

    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const hlsRef = useRef<Hls | null>(null)
    const jassubRef = useRef<JASSUB | null>(null)

    const progressBarRef = useRef<HTMLDivElement>(null)
    const progressInputRef = useRef<HTMLInputElement>(null)
    const timeTextRef = useRef<HTMLSpanElement>(null)

    const isSeekingRef = useRef(false)
    const lastSeekTimeRef = useRef(0)
    const pendingSeekTimeRef = useRef<number | null>(null)
    const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const [isPlaying, setIsPlaying] = useState(false)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [controlsVisible, setControlsVisible] = useState(true)
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
    const [errorMsg, setErrorMsg] = useState("")
    const [isBuffering, setIsBuffering] = useState(false)
    const [isSeeking, setIsSeeking] = useState(false)
    const [flash, setFlash] = useState<"play" | "pause" | null>(null)

    const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
    const [activeAudioIndex, setActiveAudioIndex] = useState(0)
    const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([])
    const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number | null>(null)
    const [isJassubLoading, setIsJassubLoading] = useState(false)
    const [isJassubActive, setIsJassubActive] = useState(false)
    const [hlsLevels, setHlsLevels] = useState<{ index: number; label: string; height: number }[]>([])
    const [activeHlsLevel, setActiveHlsLevel] = useState<number>(-1) // -1 = auto

    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    const {
        setFullscreen: setGlobalFullscreen,
        autoSkipIntro: autoSkipIntroPref,
        setAutoSkipIntro,
        autoSkipOutro: autoSkipOutroPref,
        setAutoSkipOutro,
        playbackRate: playbackRatePref,
        setPlaybackRate: setPlaybackRatePref,
        preferredAudioLang,
        setPreferredAudioLang,
        preferredSubtitleLang,
        setPreferredSubtitleLang,
        showHeatmap: showHeatmapPref,
        setShowHeatmap: setShowHeatmapPref,
        aspectRatio: aspectRatioPref,
        setAspectRatio: setAspectRatioPref,
        subtitleSize: subtitleSizePref,
        setSubtitleSize: setSubtitleSizePref,
        loopEnabled: loopEnabledPref,
        setLoopEnabled: setLoopEnabledPref,
        autoDisableSubtitlesWhenDubbed,
        tvMode,
        setTvMode,
        marathonMode,
        setMarathonMode,
    } = useAppStore(
        useShallow(state => ({
            setFullscreen: state.setFullscreen,
            autoSkipIntro: state.autoSkipIntro,
            setAutoSkipIntro: state.setAutoSkipIntro,
            autoSkipOutro: state.autoSkipOutro,
            setAutoSkipOutro: state.setAutoSkipOutro,
            playbackRate: state.playbackRate,
            setPlaybackRate: state.setPlaybackRate,
            preferredAudioLang: state.preferredAudioLang,
            setPreferredAudioLang: state.setPreferredAudioLang,
            preferredSubtitleLang: state.preferredSubtitleLang,
            setPreferredSubtitleLang: state.setPreferredSubtitleLang,
            showHeatmap: state.showHeatmap,
            setShowHeatmap: state.setShowHeatmap,
            aspectRatio: state.aspectRatio,
            setAspectRatio: state.setAspectRatio,
            subtitleSize: state.subtitleSize,
            setSubtitleSize: state.setSubtitleSize,
            loopEnabled: state.loopEnabled,
            setLoopEnabled: state.setLoopEnabled,
            autoDisableSubtitlesWhenDubbed: state.autoDisableSubtitlesWhenDubbed,
            tvMode: state.tvMode,
            setTvMode: state.setTvMode,
            marathonMode: state.marathonMode,
            setMarathonMode: state.setMarathonMode,
        }))
    )

    const [showStats, setShowStats] = useState(false)
    const [statsData, setStatsData] = useState<PlayerStats | null>(null)

    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastReportedTimeRef = useRef(0)

    const wsUrl = useMemo(() => getApiWebSocketUrl(), [])
    const { sendJsonMessage } = useWebSocket(wsUrl)
    const lastSentHeartbeatRef = useRef(0)
    const lastStatsUpdateRef = useRef(0)

    const sendHeartbeat = useCallback((curr: number, dur: number) => {
        if (!mediaId || !episodeNumber) return
        const progress = dur > 0 ? curr / dur : 0
        sendJsonMessage({
            type: "native-player",
            payload: {
                eventType: "playback-heartbeat-progress",
                mediaId,
                episodeNumber,
                currentTime: curr,
                duration: dur,
                progress: Math.round(progress * 10000) / 10000,
            }
        })
    }, [mediaId, episodeNumber, sendJsonMessage])

    const chapters = useMemo(() => {
        return backendTracks?.chapters || []
    }, [backendTracks])

    const triggerControlsVisibility = useCallback(() => {
        setControlsVisible(true)
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current)
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setControlsVisible(false)
            }
        }, 3000)
    }, [isPlaying])

    const {
        skipTimesOp,
        skipTimesEd,
        skipMode,
        skipRemainingSeconds,
        segmentProgress,
        showNextEpisode,
        countdownSeconds,
        showAutoSkipToast,
        activeChapter,
        remainingProgress,
        skipOpening,
        skipToNextChapter,
        skipToPrevChapter,
        handleSetAutoSkipIntro,
        handleSetAutoSkipOutro,
        handleSetTvMode,
        handleSkipIntro,
        showCountdown,
        processTimeUpdates,
        checkManualSkipOverrides
    } = usePlayerSkip({
        videoRef,
        playableUrl,
        duration,
        isPlaying,
        malId,
        episodeNumber,
        chapters,
        mediaFormat,
        autoSkipIntroPref,
        autoSkipOutroPref,
        tvMode,
        hasNextEpisode,
        onNextEpisode,
        setAutoSkipIntro,
        setAutoSkipOutro,
        setTvMode,
        triggerControlsVisibility,
        clientId,
        nextStreamUrl,
        nextStreamType,
        streamType,
        mediaId,
    })

    const { mutate: shutdownTranscode } = useMediastreamShutdownTranscodeStream()
    const { mutate: preloadMutate } = usePreloadMediastreamMediaContainer()

    // Proactive preload: fire-and-forget as soon as the player mounts.
    // For transcode: kicks off keyframe extraction + segments 0/1/2 in the background.
    // For direct: does a HEAD request so the server caches ffprobe/MediaInfo and the
    // browser's connection pool is warmed up, reducing cold-start latency.
    useEffect(() => {
        const path = streamUrl || playableUrl
        if (!path) return

        if (streamType === "transcode") {
            preloadMutate({ path, streamType: "transcode", audioStreamIndex: 0 })
        } else if (streamType === "direct" || streamType === "local") {
            // Warm up: request the media container metadata so ffprobe runs now
            // instead of when the user clicks play. This is a no-op if already cached.
            preloadMutate({ path, streamType: "direct", audioStreamIndex: 0 })
        }
    }, [streamUrl, playableUrl, streamType]) // eslint-disable-line react-hooks/exhaustive-deps

    const { onProgress: onTrackingProgress, reset: resetTracking } = useAnimeTracking({
        mediaId,
        episodeNumber,
        filepath: streamUrl || playableUrl,
        enabled: !!(mediaId && episodeNumber),
    })

    const { onProgress: onSyncProgress } = usePlayerProgressSync({
        mediaId,
        episodeNumber,
        filepath: streamUrl || playableUrl,
        enabled: !!(mediaId && episodeNumber),
    })

    const { data: historyData } = useGetContinuityWatchHistoryItem(mediaId || 0)
    const [showResume, setShowResume] = useState(false)
    const [resumeTime, setResumeTime] = useState(0)

    useEffect(() => {
        return () => {
            if (clientId) {
                shutdownTranscode({ clientId })
            }
        }
    }, [clientId, shutdownTranscode])

    useEffect(() => {
        resetTracking()
    }, [mediaId, episodeNumber, playableUrl, resetTracking])

    // Reset de pistas al cambiar de URL, durante el render (patrón "adjusting state when
    // a prop changes"): evita un frame con las pistas del stream anterior y el re-render
    // en cascada que causaba hacerlo en un effect.
    const [prevPlayableUrl, setPrevPlayableUrl] = useState(playableUrl)
    if (playableUrl !== prevPlayableUrl) {
        setPrevPlayableUrl(playableUrl)
        setAudioTracks([])
        setSubtitleTracks([])
        setActiveAudioIndex(0)
        setActiveSubtitleIndex(null)
    }

    const formatTime = useCallback((secs: number) => {
        if (!secs || isNaN(secs)) return "00:00"
        const m = Math.floor(secs / 60)
        const s = Math.floor(secs % 60)
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }, [])

    // HLS and Native video stream management hook
    usePlayerHls({
        videoRef,
        hlsRef,
        playableUrl,
        absoluteLanUrl,
        backendTracks: backendTracks || null,
        initialProgressSeconds,
        episodeNumber,
        historyData,
        setStatus,
        setIsBuffering,
        setErrorMsg,
        setHlsLevels,
        setAudioTracks,
        setSubtitleTracks,
        setActiveAudioIndex,
        setResumeTime,
        setShowResume,
        setIsPlaying,
    })

    // JASSUB Subtitle renderer hook
    usePlayerJassub({
        videoRef,
        canvasRef,
        jassubRef,
        activeSubtitleIndex,
        subtitleTracks,
        subtitleSizePref,
        setIsJassubLoading,
        setIsJassubActive,
    })

    // Auto-select preferred tracks
    const onSelectAudio = useCallback((track: AudioTrack) => {
        if (hlsRef.current) {
            hlsRef.current.audioTrack = track.index
        } else if (videoRef.current && 'audioTracks' in videoRef.current) {
            const video = videoRef.current as HTMLVideoElement & { audioTracks: AudioTrackList }
            const trackList = Array.from(video.audioTracks)
            for (let i = 0; i < trackList.length; i++) {
                trackList[i].enabled = i === track.index
            }
        }
        setActiveAudioIndex(track.index)
        if (track.language) {
            setPreferredAudioLang(track.language)
        }
    }, [setPreferredAudioLang])

    const onSelectSubtitle = useCallback((track: SubtitleTrack | null) => {
        if (track === null) {
            setActiveSubtitleIndex(null)
            if (hlsRef.current) {
                hlsRef.current.subtitleTrack = -1
            }
        } else {
            if (hlsRef.current) {
                hlsRef.current.subtitleTrack = track.index
            }
            setActiveSubtitleIndex(track.index)
            if (track.language) {
                setPreferredSubtitleLang(track.language)
            }
        }
    }, [setPreferredSubtitleLang])

    useEffect(() => {
        if (audioTracks.length > 0) {
            let preferred: AudioTrack | undefined

            preferred = audioTracks.find(t => {
                const lang = t.language?.toLowerCase() || ""
                return lang === "spa-lat" || lang === "es-la"
            })
            if (!preferred) {
                preferred = audioTracks.find(t => {
                    const title = t.title?.toLowerCase() || ""
                    return title.includes("latino") || title.includes("latin")
                })
            }
            if (!preferred) {
                preferred = audioTracks.find(t => {
                    const lang = t.language?.toLowerCase() || ""
                    return lang === "spa" || lang === "es" || lang.startsWith("es-") || lang.startsWith("spa-")
                })
            }

            if (!preferred) {
                preferred = audioTracks.find(t => t.language === preferredAudioLang)
            }

            if (preferred && activeAudioIndex !== preferred.index) {
                // La selección de audio es audible: debe aplicarse síncrona al descubrir las
                // pistas para minimizar el tiempo reproduciendo la pista equivocada.
                // onSelectAudio además sincroniza HLS.js (sistema externo), no solo estado.
                // eslint-disable-next-line react-hooks/set-state-in-effect
                onSelectAudio(preferred)
            }
        }
    }, [audioTracks, preferredAudioLang, activeAudioIndex, onSelectAudio])

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = []
        if (subtitleTracks.length > 0) {
            const currentAudio = audioTracks.find(t => t.index === activeAudioIndex)
            const currentLang = currentAudio?.language?.toLowerCase() || ""
            const isDubbed = currentAudio && (["spa", "es", "eng"].includes(currentLang) || currentLang.startsWith("spa-") || currentLang.startsWith("es-"))

            if (autoDisableSubtitlesWhenDubbed && isDubbed) {
                if (activeSubtitleIndex !== null) {
                    timers.push(setTimeout(() => onSelectSubtitle(null), 0))
                }
            } else {
                const preferred = subtitleTracks.find(t => t.language === preferredSubtitleLang)
                if (preferred && activeSubtitleIndex !== preferred.index) {
                    timers.push(setTimeout(() => onSelectSubtitle(preferred), 0))
                }
            }
        }
        return () => timers.forEach(clearTimeout)
    }, [subtitleTracks, audioTracks, activeAudioIndex, preferredSubtitleLang, autoDisableSubtitlesWhenDubbed, activeSubtitleIndex, onSelectSubtitle])

    useEffect(() => {
        Promise.resolve().then(() => {
            triggerControlsVisibility()
        })
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
        }
    }, [triggerControlsVisibility])

    const togglePlay = useCallback(() => {
        const video = videoRef.current
        if (!video || status !== "ready") return

        if (video.paused) {
            video.play()
                .then(() => {
                    setIsPlaying(true)
                    setFlash("play")
                    setTimeout(() => setFlash(null), 400)
                })
                .catch((e) => console.error("Playback failed:", e))
        } else {
            video.pause()
            setIsPlaying(false)
            setFlash("pause")
            setTimeout(() => setFlash(null), 400)
        }
    }, [status])

    const performSeek = useCallback((time: number) => {
        const video = videoRef.current
        if (!video || !Number.isFinite(time)) return

        setIsSeeking(true)
        checkManualSkipOverrides(time)

        // Visual update of elements instantly
        if (progressBarRef.current) {
            const percent = video.duration > 0 ? (time / video.duration) * 100 : 0
            progressBarRef.current.style.width = `${percent}%`
        }
        if (timeTextRef.current) {
            timeTextRef.current.innerText = formatTime(time)
        }

        if (isSeekingRef.current) {
            // Do not perform actual video seek while dragging to avoid flooding requests
            return
        }

        const now = Date.now()
        const SEEK_THROTTLE_MS = 180

        if (now - lastSeekTimeRef.current >= SEEK_THROTTLE_MS) {
            video.currentTime = time
            lastSeekTimeRef.current = now
            pendingSeekTimeRef.current = null
        } else {
            pendingSeekTimeRef.current = time
            if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current)
            seekTimeoutRef.current = setTimeout(() => {
                const latestTime = pendingSeekTimeRef.current
                if (latestTime !== null && video) {
                    video.currentTime = latestTime
                    lastSeekTimeRef.current = Date.now()
                    pendingSeekTimeRef.current = null
                }
            }, SEEK_THROTTLE_MS - (now - lastSeekTimeRef.current))
        }
    }, [checkManualSkipOverrides, formatTime])

    const handleSeekStart = useCallback(() => {
        isSeekingRef.current = true
    }, [])

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value)
        performSeek(val)
        triggerControlsVisibility()
    }

    const handleSeekEnd = useCallback((e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
        const video = videoRef.current
        if (!video) return

        isSeekingRef.current = false
        setIsSeeking(false)
        if (seekTimeoutRef.current) {
            clearTimeout(seekTimeoutRef.current)
            seekTimeoutRef.current = null
        }

        const val = parseFloat(e.currentTarget.value)
        if (!Number.isFinite(val)) return
        checkManualSkipOverrides(val)
        video.currentTime = val
        lastSeekTimeRef.current = Date.now()
        pendingSeekTimeRef.current = null

        triggerControlsVisibility()
    }, [checkManualSkipOverrides, triggerControlsVisibility])

    useEffect(() => {
        return () => {
            if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current)
        }
    }, [])

    const handleResume = () => {
        const video = videoRef.current
        if (!video || !Number.isFinite(resumeTime)) return
        video.currentTime = resumeTime
        setShowResume(false)
        video.play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
                console.warn("Resume autoplay blocked:", err)
                setIsPlaying(false)
            })
    }

    const skipTime = useCallback((amount: number) => {
        const video = videoRef.current
        if (!video) return
        const target = Math.max(0, Math.min(video.duration, video.currentTime + amount))

        performSeek(target)
        triggerControlsVisibility()
    }, [performSeek, triggerControlsVisibility])

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current
        if (!video) return
        const val = parseFloat(e.target.value)
        video.volume = val
        setVolume(val)
        setIsMuted(val === 0)
        video.muted = val === 0
    }

    const toggleMute = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        const nextMute = !isMuted
        video.muted = nextMute
        setIsMuted(nextMute)
    }, [isMuted])

    const toggleFullscreen = () => {
        const container = containerRef.current
        if (!container) return

        if (!document.fullscreenElement) {
            container.requestFullscreen()
                .then(() => setIsFullscreen(true))
                .catch((err) => console.error("Error entering fullscreen:", err))
        } else {
            document.exitFullscreen()
                .then(() => setIsFullscreen(false))
        }
    }

    const takeScreenshot = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        const canvas = document.createElement("canvas")
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL("image/png")
        const link = document.createElement("a")
        link.download = `kamehouse-cap-${mediaId || "video"}-${Date.now()}.png`
        link.href = dataUrl
        link.click()
    }, [mediaId])

    const togglePip = useCallback(async () => {
        const video = videoRef.current
        if (!video || !document.pictureInPictureEnabled) return
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture()
            } else {
                await video.requestPictureInPicture()
            }
        } catch (err) {
            console.error("PIP failed:", err)
        }
    }, [])

    const changePlaybackRate = (rate: number) => {
        const video = videoRef.current
        if (!video) return
        video.playbackRate = rate
        setPlaybackRatePref(rate)
    }

    useEffect(() => {
        const video = videoRef.current
        if (video) {
            video.loop = loopEnabledPref
        }
    }, [loopEnabledPref, status])

    useEffect(() => {
        const video = videoRef.current
        if (video && playbackRatePref !== 1) {
            video.playbackRate = playbackRatePref
        }
    }, [status, playbackRatePref])

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFs = Boolean(document.fullscreenElement)
            setIsFullscreen(isFs)
            setGlobalFullscreen(isFs)
        }
        document.addEventListener("fullscreenchange", handleFullscreenChange)
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange)
            setGlobalFullscreen(false)
        }
    }, [setGlobalFullscreen])

    useEffect(() => {
        const el = window.electron
        if (!el) return

        const unsub = el.on("window:fullscreen", (...args: unknown[]) => {
            const isFs = args[0] as boolean
            setIsFullscreen(isFs)
            setGlobalFullscreen(isFs)
        })

        return () => {
            unsub?.()
        }
    }, [setGlobalFullscreen])

    // Keyboard shortcuts hook
    usePlayerShortcuts({
        videoRef,
        isPlaying,
        isMuted,
        volume,
        isFullscreen,
        skipMode,
        showNextEpisode,
        onNextEpisode,
        handleSkipIntro,
        onClose,
        skipOpening,
        skipTime,
        takeScreenshot,
        toggleMute,
        togglePip,
        togglePlay,
        toggleFullscreen,
        setVolume,
        setIsMuted,
        setIsSettingsOpen,
        setShowStats,
        skipToNextChapter,
        skipToPrevChapter,
    })

    const handleTimeUpdate = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        if (isSeekingRef.current) return

        const curr = video.currentTime
        const total = video.duration

        if (progressBarRef.current) {
            const percent = total > 0 ? (curr / total) * 100 : 0
            progressBarRef.current.style.width = `${percent}%`
        }

        if (progressInputRef.current) {
            progressInputRef.current.value = String(curr)
        }

        if (timeTextRef.current) {
            timeTextRef.current.innerText = formatTime(curr)
        }

        if (onProgress && Math.abs(curr - lastReportedTimeRef.current) >= 10) {
            onProgress(curr)
            lastReportedTimeRef.current = curr
        }

        onTrackingProgress(curr, total)
        onSyncProgress(curr, total)

        const now = Date.now()
        if (now - lastSentHeartbeatRef.current >= 5000) {
            sendHeartbeat(curr, total)
            lastSentHeartbeatRef.current = now
        }

        processTimeUpdates(curr, total)

        // Stats for Nerds calculation
        if (showStats && now - lastStatsUpdateRef.current >= 1000) {
            lastStatsUpdateRef.current = now
            setStatsData({
                currentTime: curr.toFixed(2),
                duration: total.toFixed(2),
                buffer: video.buffered.length > 0 ? (video.buffered.end(video.buffered.length - 1) - curr).toFixed(2) : "0.00",
                resolution: `${video.videoWidth}x${video.videoHeight}`,
                playbackRate: video.playbackRate.toString(),
                volume: Math.round(video.volume * 100).toString(),
                source: playableUrl.substring(0, 50) + "...",
            })
        }
    }, [showStats, lastStatsUpdateRef, processTimeUpdates, onProgress, onTrackingProgress, onSyncProgress, playableUrl, sendHeartbeat, formatTime])

    // Apply playback rate instantly
    useEffect(() => {
        const video = videoRef.current
        if (video && video.playbackRate !== playbackRatePref) {
            video.playbackRate = playbackRatePref
        }
    }, [playbackRatePref])

    // Force skip check when preferences change
    useEffect(() => {
        handleTimeUpdate()
    }, [autoSkipIntroPref, autoSkipOutroPref, handleTimeUpdate])

    const handleSetHlsLevel = useCallback((levelIndex: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = levelIndex
            setActiveHlsLevel(levelIndex)
        }
    }, [])

    return {
        domElements: {
            videoElement: videoRef,
            containerElement: containerRef,
            canvasElement: canvasRef,
            progressBarElement: progressBarRef,
            progressInputElement: progressInputRef,
            timeTextElement: timeTextRef,
        },
        state: {
            isPlaying, duration, volume, isMuted, isFullscreen, controlsVisible, status, errorMsg, isBuffering, isSeeking, flash, skipMode, skipRemainingSeconds, segmentProgress, showNextEpisode, countdownSeconds, showCountdown, tvMode, audioTracks, activeAudioIndex, subtitleTracks, activeSubtitleIndex, isJassubLoading, isJassubActive, isSettingsOpen, remainingProgress, showAutoSkipToast,
            autoSkipIntro: autoSkipIntroPref,
            autoSkipOutro: autoSkipOutroPref,
            playbackRate: playbackRatePref,
            showHeatmap: showHeatmapPref,
            aspectRatio: aspectRatioPref,
            subtitleSize: subtitleSizePref,
            loopEnabled: loopEnabledPref,
            showStats,
            statsData,
            hlsLevels,
            activeHlsLevel,
            get currentTime() {
                return videoRef.current?.currentTime || 0
            },
            showResume,
            resumeTime,
            autoDisableSubtitlesWhenDubbed,
            marathonMode,
            skipTimesOp,
            skipTimesEd,
            chapters,
            activeChapter,
            absoluteLanUrl,
            serverIPs,
            serverPort,
        },
        actions: {
            setIsPlaying, setDuration, setIsBuffering, setIsSeeking, setControlsVisible, setIsSettingsOpen, triggerControlsVisibility, togglePlay, handleSeek, handleSeekStart, handleSeekEnd, skipTime, skipOpening, handleVolume, toggleMute, onSelectAudio, onSelectSubtitle, toggleFullscreen, handleSkipIntro, handleTimeUpdate,
            takeScreenshot, togglePip, changePlaybackRate, setShowStats,
            setAutoSkipIntro: handleSetAutoSkipIntro,
            setAutoSkipOutro: handleSetAutoSkipOutro,
            setHlsLevel: handleSetHlsLevel,
            setShowHeatmap: setShowHeatmapPref,
            setAspectRatio: setAspectRatioPref,
            setSubtitleSize: setSubtitleSizePref,
            setLoopEnabled: setLoopEnabledPref,
            setTvMode: handleSetTvMode,
            setMarathonMode,
            handleResume,
            setShowResume,
            setAutoDisableSubtitlesWhenDubbed: (val: boolean) => { useAppStore.setState(s => ({ ...s, autoDisableSubtitlesWhenDubbed: val })) },
            skipToNextChapter,
            skipToPrevChapter,
        }
    }
}
