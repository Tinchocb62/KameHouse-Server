import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react"
import Hls from "hls.js"
import JASSUB from "jassub"
import { usePlayerShortcuts } from "./usePlayerShortcuts"
import { usePlayerJassub } from "./usePlayerJassub"
import { usePlayerPgs } from "./usePlayerPgs"
import { usePlayerMediaSession } from "./usePlayerMediaSession"
import { PlayerPreviewManager } from "./player-preview"
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
    if (typeof window !== "undefined" && (window.location.protocol === "https:" || !window.location.hostname.match(/^(192\.168\.|10\.|172\.|localhost|127\.0\.0\.1)/))) {
        return playableUrl.startsWith("/") ? `${window.location.origin}${playableUrl}` : playableUrl;
    }
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
        onRequestStreamTypeChange,
        onDirectPlayFailed,
        metadataDuration,
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
    const streamSwitchResumeRef = useRef<number | null>(null)
    
    const [previewManager, setPreviewManager] = useState<PlayerPreviewManager | null>(null)

    const progressBarRef = useRef<HTMLDivElement>(null)
    const thumbRef = useRef<HTMLDivElement>(null)
    const progressInputRef = useRef<HTMLInputElement>(null)
    const timeTextRef = useRef<HTMLSpanElement>(null)

    const isSeekingRef = useRef(false)
    const lastSeekTimeRef = useRef(0)
    const pendingSeekTimeRef = useRef<number | null>(null)
    const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const [isPlaying, setIsPlaying] = useState(false)
    const [duration, setDurationState] = useState(0)

    // El navegador puede reportar duration = Infinity/NaN en direct play de MKV
    // sin duración en el header. Si ese valor entra al estado, toda la lógica de
    // "cerca del final" (auto-skip de outro, avance marathon, panel de siguiente
    // episodio) se rompe: `total - curr <= N` nunca es cierto. Saneamos acá y
    // caemos a la duración de ffprobe (metadataDuration) que el server ya conoce.
    const metadataDurationRef = useRef(metadataDuration)
    useLayoutEffect(() => {
        metadataDurationRef.current = metadataDuration
    }, [metadataDuration])
    const setDuration = useCallback((dur: number) => {
        if (Number.isFinite(dur) && dur > 0) {
            setDurationState(dur)
            return
        }
        const meta = metadataDurationRef.current
        if (meta && Number.isFinite(meta) && meta > 0) {
            setDurationState(meta)
        }
        // Sin valor confiable: conservar el anterior en vez de guardar Infinity/0.
    }, [])

    // Semilla inicial: si la metadata del server llega antes (o el navegador nunca
    // emite un durationchange finito), partimos de la duración de ffprobe.
    useEffect(() => {
        if (duration === 0 && metadataDuration && Number.isFinite(metadataDuration) && metadataDuration > 0) {
            setDurationState(metadataDuration)
        }
    }, [metadataDuration, duration])
    // D3: initialize from the persisted store so volume survives page reloads.
    const { playerVolume: persistedVolume, setPlayerVolume } = useAppStore(
        useShallow(state => ({ playerVolume: state.playerVolume, setPlayerVolume: state.setPlayerVolume }))
    )
    const [volume, setVolume] = useState(() => persistedVolume ?? 1)
    const [isMuted, setIsMuted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [controlsVisible, setControlsVisible] = useState(true)
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
    // true durante un cambio de stream mid-playback (ej. direct→transcode por cambio de pista de audio).
    // En ese caso el overlay de loading debe ser semitransparente (no negro sólido) para que
    // la imagen congelada del video sea visible y la UI no parezca rota.
    const [isStreamSwitching, setIsStreamSwitching] = useState(false)
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
    const [isPgsLoading, setIsPgsLoading] = useState(false)
    const [isPgsActive, setIsPgsActive] = useState(false)
    const [hlsLevels, setHlsLevels] = useState<{ index: number; label: string; height: number }[]>([])
    const [activeHlsLevel, setActiveHlsLevel] = useState<number>(-1) // -1 = auto

    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    const {
        setFullscreen: setGlobalFullscreen,
        autoSkipIntro: autoSkipIntroPref,
        setAutoSkipIntro,
        autoSkipOutro: autoSkipOutroPref,
        setAutoSkipOutro,
        skipStepSeconds: skipStepSecondsPref,
        setSkipStepSeconds: setSkipStepSecondsPref,
        playbackRate: playbackRatePref,
        setPlaybackRate: setPlaybackRatePref,
        preferredAudioLang,
        setPreferredAudioLang,
        preferredAudioTrackIndexMap,
        setPreferredAudioTrackIndexMap,
        preferredSubtitleLang,
        setPreferredSubtitleLang,
        subtitlesEnabled,
        setSubtitlesEnabled,
        showHeatmap: showHeatmapPref,
        setShowHeatmap: setShowHeatmapPref,
        aspectRatio: globalAspectRatioPref,
        setAspectRatio: setGlobalAspectRatioPref,
        aspectRatioBySeries,
        setAspectRatioForSeries,
        subtitleSize: subtitleSizePref,
        setSubtitleSize: setSubtitleSizePref,
        loopEnabled: loopEnabledPref,
        setLoopEnabled: setLoopEnabledPref,
        autoDisableSubtitlesWhenDubbed,
        marathonMode,
        setMarathonMode,
        tvMode,
        setTvMode,
        ambientModeEnabled,
        setAmbientModeEnabled,
    } = useAppStore(
        // Note: playerVolume/setPlayerVolume already destructured above (D3).
        useShallow(state => ({
            setFullscreen: state.setFullscreen,
            autoSkipIntro: state.autoSkipIntro,
            setAutoSkipIntro: state.setAutoSkipIntro,
            autoSkipOutro: state.autoSkipOutro,
            setAutoSkipOutro: state.setAutoSkipOutro,
            skipStepSeconds: state.skipStepSeconds,
            setSkipStepSeconds: state.setSkipStepSeconds,
            playbackRate: state.playbackRate,
            setPlaybackRate: state.setPlaybackRate,
            preferredAudioLang: state.preferredAudioLang,
            setPreferredAudioLang: state.setPreferredAudioLang,
            preferredAudioTrackIndexMap: state.preferredAudioTrackIndex,
            setPreferredAudioTrackIndexMap: state.setPreferredAudioTrackIndex,
            preferredSubtitleLang: state.preferredSubtitleLang,
            setPreferredSubtitleLang: state.setPreferredSubtitleLang,
            subtitlesEnabled: state.subtitlesEnabled,
            setSubtitlesEnabled: state.setSubtitlesEnabled,
            showHeatmap: state.showHeatmap,
            setShowHeatmap: state.setShowHeatmap,
            aspectRatio: state.aspectRatio,
            setAspectRatio: state.setAspectRatio,
            aspectRatioBySeries: state.aspectRatioBySeries,
            setAspectRatioForSeries: state.setAspectRatioForSeries,
            subtitleSize: state.subtitleSize,
            setSubtitleSize: state.setSubtitleSize,
            loopEnabled: state.loopEnabled,
            setLoopEnabled: state.setLoopEnabled,
            autoDisableSubtitlesWhenDubbed: state.autoDisableSubtitlesWhenDubbed,
            marathonMode: state.marathonMode,
            setMarathonMode: state.setMarathonMode,
            tvMode: state.tvMode,
            setTvMode: state.setTvMode,
            ambientModeEnabled: state.ambientModeEnabled,
            setAmbientModeEnabled: state.setAmbientModeEnabled,
        }))
    )
    
    const preferredAudioTrackIndex = mediaId ? (preferredAudioTrackIndexMap[mediaId] ?? -1) : -1

    // Aspect ratio efectivo: el override de esta serie gana; el global es fallback.
    // El setter escribe en el mapa por serie cuando hay mediaId, así el ajuste
    // queda recordado para esta serie sin pisar el de las demás.
    const aspectRatioPref = (mediaId && aspectRatioBySeries[mediaId]) || globalAspectRatioPref
    const setAspectRatioPref = useCallback((ratio: "contain" | "fill" | "cover" | "16/9") => {
        if (mediaId) {
            setAspectRatioForSeries(mediaId, ratio)
        } else {
            setGlobalAspectRatioPref(ratio)
        }
    }, [mediaId, setAspectRatioForSeries, setGlobalAspectRatioPref])
    const setPreferredAudioTrackIndex = (index: number) => {
        if (mediaId) setPreferredAudioTrackIndexMap(mediaId, index)
    }

    // D3: Sync the <video> element volume with the persisted value on mount.
    // We do this once after the video element is created so that it is in sync
    // with the store from the very first frame without a visible flash.
    const volumeSyncedRef = useRef(false)
    useEffect(() => {
        const video = videoRef.current
        if (!video || volumeSyncedRef.current) return
        volumeSyncedRef.current = true
        const v = persistedVolume ?? 1
        video.volume = v
        setVolume(v)
    }, [videoRef, persistedVolume])

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
                setIsSettingsOpen(false)
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
        handleSetMarathonMode,
        handleSkipIntro,
        undoSkip,
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
        skipStepSecondsPref,
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
        preferredAudioLang,
    })

    const { mutate: shutdownTranscode } = useMediastreamShutdownTranscodeStream()
    const { mutate: preloadMutate } = usePreloadMediastreamMediaContainer()

    // Proactive preload for TRANSCODE only: kicks off keyframe extraction + the
    // first segments in the background so playback starts without waiting on the
    // on-demand encode. The direct-play branch was removed as redundant — the
    // detail pages (series/movies) now warm the container on hover/page-load, and
    // the RequestMediastreamMediaContainer POST already forces ffprobe for the
    // current episode, so a second direct preload here only duplicated work.
    useEffect(() => {
        const path = streamUrl || playableUrl
        if (!path || streamType !== "transcode") return
        preloadMutate({ path, streamType: "transcode", audioStreamIndex: 0, preferredAudioLang })
    }, [streamUrl, playableUrl, streamType, preferredAudioLang])

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

    useEffect(() => {
        setAudioTracks([])
        setSubtitleTracks([])
        setActiveAudioIndex(0)
        setActiveSubtitleIndex(null)
        // Nuevo episodio o URL completamente distinta: nunca es un stream-switch de audio.
        // Resetear para que el loading inicial use fondo negro sólido.
        setIsStreamSwitching(false)
    }, [playableUrl])

    // Cuando el stream está listo (ya sea tras carga inicial o tras un switch de audio),
    // desactivar la bandera de stream-switching para limpiar el overlay.
    useEffect(() => {
        if (status === "ready") {
            setIsStreamSwitching(false)
        }
    }, [status])

    const formatTime = useCallback((secs: number) => {
        if (!secs || isNaN(secs)) return "00:00"
        const h = Math.floor(secs / 3600)
        const m = Math.floor((secs % 3600) / 60)
        const s = Math.floor(secs % 60)

        const mm = m.toString().padStart(2, '0')
        const ss = s.toString().padStart(2, '0')

        return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
    }, [])

    // HLS and Native video stream management hook
    usePlayerHls({
        videoRef,
        hlsRef,
        playableUrl,
        absoluteLanUrl,
        backendTracks: backendTracks || null,
        initialProgressSeconds,
        streamSwitchResumeRef,
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
        onDirectPlayFailed,
    })

    // JASSUB Subtitle renderer hook
    usePlayerJassub({
        videoRef,
        canvasRef,
        jassubRef,
        activeSubtitleIndex,
        subtitleTracks,
        subtitleSizePref,
        fontUrls: backendTracks?.fontUrls,
        setIsJassubLoading,
        setIsJassubActive,
    })

    // --- PGS Plugin ---
    usePlayerPgs({
        videoRef,
        subtitleTracks,
        activeSubtitleIndex,
        setIsPgsLoading,
        setIsPgsActive,
    })

    // Preview Manager
    useEffect(() => {
        const video = videoRef.current
        if (!video || !playableUrl) return

        const pm = new PlayerPreviewManager(video, playableUrl as string, (streamType || "direct") as "local" | "online" | "direct" | "transcode" | "optimized")
        setPreviewManager(pm)

        return () => {
            pm.cleanup()
            setPreviewManager(null)
        }
    }, [playableUrl, streamType])

    // Selección de audio pendiente tras un cambio de stream (direct → transcode):
    // se aplica cuando llega la nueva lista de pistas HLS.
    const pendingAudioSelectionRef = useRef<AudioTrack | null>(null)

    // Auto-select preferred tracks
    // opts.auto === true → selección automática (preferencia): nunca forzar transcode.
    // Sin opts (o auto === false) → selección manual del usuario.
    const onSelectAudio = useCallback((track: AudioTrack, opts?: { auto?: boolean }) => {
        const isAuto = opts?.auto === true
        if (hlsRef.current) {
            // Use hlsId (hls.js sequential manifest position) for hls.audioTrack.
            // `track.index` is the ABSOLUTE container index (used in backend URIs);
            // hls.js expects the positional id within its own audioTracks list.
            // hlsId is set during AUDIO_TRACKS_UPDATED merging; fall back to index
            // only when hlsId is not available (e.g. backend-only fallback list).
            hlsRef.current.audioTrack = track.hlsId ?? track.index
        } else if (videoRef.current && 'audioTracks' in videoRef.current && (videoRef.current as HTMLVideoElement & { audioTracks: AudioTrackList }).audioTracks?.length > 0) {
            const video = videoRef.current as HTMLVideoElement & { audioTracks: AudioTrackList }
            const trackList = Array.from(video.audioTracks)
            for (let i = 0; i < trackList.length; i++) {
                trackList[i].enabled = i === track.index
            }
        } else if (streamType === "direct" || streamType === "local") {
            // Chromium/WebView2 no soporta la API nativa de audioTracks en direct play.
            if (isAuto) {
                // Auto-selección: solo persistir la preferencia de idioma y mantener
                // direct play con la pista por defecto. No disparar transcode.
                if (track.language && track.language.toLowerCase() !== "und") {
                    setPreferredAudioLang(track.language)
                }
                if (!track.default) {
                    streamSwitchResumeRef.current = videoRef.current?.currentTime ?? null
                    pendingAudioSelectionRef.current = track
                    if (onRequestStreamTypeChange) {
                        // Marcar como stream-switch para que el overlay use fondo semitransparente
                        setIsStreamSwitching(true)
                        onRequestStreamTypeChange("transcode", { force: true })
                    }
                }
                return
            } else if (onRequestStreamTypeChange) {
                // Selección manual explícita del usuario. Chromium/WebView2 no puede
                // cambiar de pista sin reconstruir el stream, así que forzamos el salto a
                // HLS transcode aunque el toggle global esté apagado: force:true permite al
                // backend inicializar el transcoder on-demand. Para fuentes H264 el video se
                // copia (-c:v copy) y solo se re-encodea el audio a AAC, así que es barato.
                streamSwitchResumeRef.current = videoRef.current?.currentTime ?? null
                pendingAudioSelectionRef.current = track
                // Marcar como stream-switch para que el overlay use fondo semitransparente
                setIsStreamSwitching(true)
                onRequestStreamTypeChange("transcode", { force: true })
            }
        }
        setActiveAudioIndex(track.index)
        if (!isAuto) {
            // Guardar el índice como fallback persistido, ideal para "und".
            setPreferredAudioTrackIndex(track.index)
            // "und" (unlabeled track, común en MKVs de anime) no identifica un idioma:
            // persistirlo hacía que en el siguiente episodio se auto-seleccionara la
            // PRIMERA pista sin etiqueta (normalmente japonés) en vez de la elegida.
            if (track.language && track.language.toLowerCase() !== "und") {
                setPreferredAudioLang(track.language)
            }
        }
    }, [setPreferredAudioLang, setPreferredAudioTrackIndex, onRequestStreamTypeChange, streamType])


    const onSelectSubtitle = useCallback((track: SubtitleTrack | null, opts?: { auto?: boolean }) => {
        const isAuto = opts?.auto === true
        if (track === null) {
            setActiveSubtitleIndex(null)
            if (!isAuto) setSubtitlesEnabled(false)
            if (hlsRef.current) {
                hlsRef.current.subtitleTrack = -1
            }
        } else {
            if (hlsRef.current) {
                hlsRef.current.subtitleTrack = track.index
            }
            setActiveSubtitleIndex(track.index)
            if (!isAuto) setSubtitlesEnabled(true)
            if (!isAuto && track.language) {
                setPreferredSubtitleLang(track.language)
            }
        }
    }, [setPreferredSubtitleLang, setSubtitlesEnabled])

    // Guarda: auto-seleccionar UNA sola vez por lista de pistas (por stream).
    // Este efecto también se re-dispara cuando el usuario cambia de pista
    // manualmente (activeAudioIndex está en las deps) — sin esta guarda, la
    // heurística "Latino primero" revertía la selección manual al instante
    // y el menú de audio parecía no funcionar.
    //
    // D4: La guarda usa una clave de CONTENIDO estable en lugar de identidad de array.
    // Si React crea un nuevo array con los mismos elementos (ej. re-render de HLS),
    // la comparación por referencia fallaba y se re-ejecutaba la auto-selección,
    // pisando la elección manual. La clave "index:lang|..." es estable mientras
    // el contenido de las pistas no cambie.
    const audioAutoSelectedForRef = useRef<string | null>(null)
    const audioTracksKey = audioTracks.map(t => `${t.index}:${t.language ?? ""}`).join("|")
    useEffect(() => {
        if (audioTracks.length === 0) return
        if (audioAutoSelectedForRef.current === audioTracksKey) return
        audioAutoSelectedForRef.current = audioTracksKey

        // Prioridad máxima: pista elegida explícitamente por el usuario antes
        // de un cambio de stream (direct → transcode). Los índices difieren
        // entre listas (ffprobe vs renditions HLS), así que se matchea por
        // título y, si no, por idioma.
        const pending = pendingAudioSelectionRef.current
        if (pending) {
            pendingAudioSelectionRef.current = null
            // Matchear PRIMERO por `index` (posición de la pista dentro de la lista de
            // audios: 0,1,2…). El backend lo asigna igual en direct y transcode (mismo
            // ffprobe, ver streamToMap), y coincide con el hlsId secuencial de hls.js,
            // así que es el identificador estable entre ambos streams. El título difiere
            // entre modos (ffprobe `a.title` vs nombre de la rendition HLS `t.name`) y el
            // idioma puede repetirse entre varias pistas (p. ej. dos dubs "Latino"), por
            // lo que matchear por título/idioma elegía la pista equivocada.
            const match = audioTracks.find(t => t.index === pending.index)
                ?? audioTracks.find(t => pending.title && t.title === pending.title)
                ?? audioTracks.find(t => t.language === pending.language)
            if (match) {
                // La selección pendiente vino de una elección manual (antes del cambio de stream):
                // no pasar { auto: true } para que se aplique correctamente en transcode.
                if (activeAudioIndex !== match.index) onSelectAudio(match)
                return
            }
        }

        let preferred: AudioTrack | undefined

        // Ignorar "und" como preferencia: matchearía la primera pista sin etiqueta
        // (ver onSelectAudio) y pisaría las heurísticas de Latino/Español de abajo.
        if (preferredAudioLang && preferredAudioLang.toLowerCase() !== "und") {
            preferred = audioTracks.find(t => {
                const lang = t.language?.toLowerCase() || ""
                return lang === preferredAudioLang.toLowerCase() || lang.startsWith(preferredAudioLang.toLowerCase())
            })
        }

        // Si falló el match por idioma (ej. era "und"), intentar recuperar el índice persistido.
        if (!preferred && preferredAudioTrackIndex >= 0) {
            preferred = audioTracks.find(t => t.index === preferredAudioTrackIndex)
        }

        if (!preferred) {
            preferred = audioTracks.find(t => {
                const lang = t.language?.toLowerCase() || ""
                return lang === "spa-lat" || lang === "es-la"
            })
        }
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

        if (preferred && activeAudioIndex !== preferred.index) {
            // Pasar { auto: true } para que en direct play no dispare transcode.
            onSelectAudio(preferred, { auto: true })
        }
    }, [audioTracksKey, preferredAudioLang, preferredAudioTrackIndex, activeAudioIndex, onSelectAudio, audioTracks])

    // Misma guarda que el audio: auto-configurar subtítulos UNA vez por lista
    // de pistas. Sin esto, elegir un subtítulo manualmente con audio doblado
    // lo apagaba al instante (y desactivarlo lo re-activaba), porque el efecto
    // se re-dispara con cada cambio de activeSubtitleIndex.
    // D4: misma corrección por clave de contenido.
    const subtitleAutoSelectedForRef = useRef<string | null>(null)
    const subtitleTracksKey = subtitleTracks.map(t => `${t.index}:${t.language ?? ""}`).join("|")
    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = []
        if (subtitleTracks.length > 0 && subtitleAutoSelectedForRef.current !== subtitleTracksKey) {
            subtitleAutoSelectedForRef.current = subtitleTracksKey
            const currentAudio = audioTracks.find(t => t.index === activeAudioIndex)
            const currentLang = currentAudio?.language?.toLowerCase() || ""
            const isDubbed = currentAudio && (["spa", "es", "eng"].includes(currentLang) || currentLang.startsWith("spa-") || currentLang.startsWith("es-"))

            if (!subtitlesEnabled) {
                if (activeSubtitleIndex !== null) {
                    timers.push(setTimeout(() => onSelectSubtitle(null, { auto: true }), 0))
                }
            } else if (autoDisableSubtitlesWhenDubbed && isDubbed) {
                if (activeSubtitleIndex !== null) {
                    timers.push(setTimeout(() => onSelectSubtitle(null, { auto: true }), 0))
                }
            } else {
                // Match tolerantly: ffprobe reports Spanish subs as "spa" or "es" (and
                // regional variants like "es-la"), so exact equality misses them. Fall
                // back to the container's default/forced track so subs still appear.
                const pref = preferredSubtitleLang.toLowerCase()
                const matchesPref = (t: SubtitleTrack) => {
                    const lang = t.language?.toLowerCase() || ""
                    if (lang === pref || lang.startsWith(pref + "-") || pref.startsWith(lang + "-")) return true
                    const spanish = (l: string) => l === "spa" || l === "es" || l.startsWith("spa-") || l.startsWith("es-")
                    return (pref === "spa" || pref === "es") && spanish(lang)
                }
                const preferred = subtitleTracks.find(matchesPref)
                    ?? subtitleTracks.find(t => t.default)
                    ?? subtitleTracks.find(t => t.forced)
                if (preferred && activeSubtitleIndex !== preferred.index) {
                    timers.push(setTimeout(() => onSelectSubtitle(preferred, { auto: true }), 0))
                }
            }
        }
        return () => timers.forEach(clearTimeout)
    }, [subtitleTracksKey, subtitleTracks, audioTracks, activeAudioIndex, preferredSubtitleLang, autoDisableSubtitlesWhenDubbed, activeSubtitleIndex, onSelectSubtitle, subtitlesEnabled])

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

        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current)

        if (video.paused) {
            video.play()
                .then(() => {
                    setIsPlaying(true)
                    setFlash("play")
                    flashTimeoutRef.current = setTimeout(() => setFlash(null), 400)
                })
                .catch((e) => console.error("Playback failed:", e))
        } else {
            video.pause()
            setIsPlaying(false)
            setFlash("pause")
            flashTimeoutRef.current = setTimeout(() => setFlash(null), 400)
        }
    }, [status])

    const performSeek = useCallback((time: number) => {
        const video = videoRef.current
        if (!video || !Number.isFinite(time)) return

        setIsSeeking(true)
        checkManualSkipOverrides(time)

        // Visual update of elements instantly
        if (progressBarRef.current) {
            const percent = video.duration > 0 ? (time / video.duration) : 0
            progressBarRef.current.style.transform = `scaleX(${percent})`
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
        const dur = Number.isFinite(video.duration) ? video.duration : Infinity
        const target = Math.max(0, Math.min(dur, video.currentTime + amount))

        performSeek(target)
        triggerControlsVisibility()
    }, [performSeek, triggerControlsVisibility])

    // D3: last non-zero volume before a mute, so we can restore it on unmute.
    const lastNonZeroVolumeRef = useRef(persistedVolume > 0 ? persistedVolume : 1)

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current
        if (!video) return
        const val = parseFloat(e.target.value)
        video.volume = val
        setVolume(val)
        setIsMuted(val === 0)
        video.muted = val === 0
        // D3: persist and track last non-zero volume.
        setPlayerVolume(val)
        if (val > 0) lastNonZeroVolumeRef.current = val
    }

    const toggleMute = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        const nextMute = !isMuted

        if (!nextMute) {
            // Restore the last non-zero volume instead of defaulting to 1.
            const restore = lastNonZeroVolumeRef.current > 0 ? lastNonZeroVolumeRef.current : 1
            video.volume = restore
            setVolume(restore)
            setPlayerVolume(restore)
        }

        video.muted = nextMute
        setIsMuted(nextMute)
    }, [isMuted, setPlayerVolume])

    const toggleFullscreen = () => {
        const container = containerRef.current
        const video = videoRef.current
        if (!container) return

        if (!document.fullscreenElement) {
            if (container.requestFullscreen) {
                container.requestFullscreen()
                    .then(() => setIsFullscreen(true))
                    .catch((err) => console.error("Error entering fullscreen:", err))
            } else if (video && (video as any).webkitEnterFullscreen) {
                try {
                    ;(video as any).webkitEnterFullscreen()
                    setIsFullscreen(true)
                } catch (err) {
                    console.error("webkitEnterFullscreen error:", err)
                }
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen()
                    .then(() => setIsFullscreen(false))
            }
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
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.error("Error exiting fullscreen on unmount:", err))
            }
        }
    }, [setGlobalFullscreen])

    // Media Session API hook (moved here to ensure togglePlay and skipTime are defined)
    usePlayerMediaSession({
        videoRef,
        isPlaying,
        title,
        episodeNumber,
        togglePlay,
        skipTime,
        onNextEpisode,
        hasNextEpisode,
    })

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

    // Handle Page Visibility / App Suspend (especially on Tizen Smart TVs)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                const video = videoRef.current
                if (video && !video.paused) {
                    video.pause()
                    setIsPlaying(false)
                }
            }
        }
        document.addEventListener("visibilitychange", handleVisibilityChange)
        document.addEventListener("webkitvisibilitychange", handleVisibilityChange)
        document.addEventListener("tizenvisibilitywrapper", handleVisibilityChange)
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            document.removeEventListener("webkitvisibilitychange", handleVisibilityChange)
            document.removeEventListener("tizenvisibilitywrapper", handleVisibilityChange)
        }
    }, [setIsPlaying, videoRef])

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
        const rawDur = video.duration
        const total = Number.isFinite(rawDur) && rawDur > 0 ? rawDur : duration

        if (progressBarRef.current) {
            const percent = total > 0 ? (curr / total) : 0
            progressBarRef.current.style.transform = `scaleX(${percent})`
        }

        if (thumbRef.current) {
            const percent = total > 0 ? (curr / total) * 100 : 0
            thumbRef.current.style.left = `${percent}%`
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
    }, [showStats, lastStatsUpdateRef, processTimeUpdates, onProgress, onTrackingProgress, onSyncProgress, playableUrl, sendHeartbeat, formatTime, duration])

    // Apply playback rate instantly
    useEffect(() => {
        const video = videoRef.current
        if (video && video.playbackRate !== playbackRatePref) {
            video.playbackRate = playbackRatePref
        }
    }, [playbackRatePref])

    // Force skip check when preferences change (including marathon mode toggle)
    useEffect(() => {
        handleTimeUpdate()
    }, [autoSkipIntroPref, autoSkipOutroPref, marathonMode, handleTimeUpdate])

    const handleSetHlsLevel = useCallback((levelIndex: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = levelIndex
            setActiveHlsLevel(levelIndex)
        }
    }, [])

    return {
        domElements: {
            videoElement: videoRef as React.RefObject<HTMLVideoElement>,
            containerElement: containerRef as React.RefObject<HTMLDivElement>,
            canvasElement: canvasRef as React.RefObject<HTMLCanvasElement>,
            progressBarElement: progressBarRef as React.RefObject<HTMLDivElement>,
            thumbElement: thumbRef as React.RefObject<HTMLDivElement>,
            progressInputElement: progressInputRef as React.RefObject<HTMLInputElement>,
            timeTextElement: timeTextRef as React.RefObject<HTMLSpanElement>,
        },
        state: {
            isPlaying, duration, volume, isMuted, isFullscreen, controlsVisible, status, isStreamSwitching, errorMsg, isBuffering, isSeeking, flash, skipMode, skipRemainingSeconds, segmentProgress, showNextEpisode, hasNextEpisode, countdownSeconds, showCountdown, tvMode, audioTracks, activeAudioIndex, subtitleTracks, activeSubtitleIndex, isJassubLoading, isJassubActive, isPgsLoading, isPgsActive, isSettingsOpen, remainingProgress, showAutoSkipToast,
            autoSkipIntro: autoSkipIntroPref,
            autoSkipOutro: autoSkipOutroPref,
            skipStepSeconds: skipStepSecondsPref,
            playbackRate: playbackRatePref,
            showHeatmap: showHeatmapPref,
            aspectRatio: aspectRatioPref,
            subtitleSize: subtitleSizePref,
            loopEnabled: loopEnabledPref,
            showStats,
            statsData,
            hlsLevels,
            activeHlsLevel,
            previewManager,
            get currentTime() {
                return videoRef.current?.currentTime || 0
            },
            showResume,
            resumeTime,
            autoDisableSubtitlesWhenDubbed,
            ambientModeEnabled,
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
            setIsPlaying, setDuration, setIsBuffering, setIsSeeking, setControlsVisible, setIsSettingsOpen, triggerControlsVisibility, togglePlay, handleSeek, handleSeekStart, handleSeekEnd, skipTime, skipOpening, handleVolume, toggleMute, onSelectAudio, onSelectSubtitle, toggleFullscreen, handleSkipIntro, undoSkip, handleTimeUpdate,
            takeScreenshot, togglePip, changePlaybackRate, setShowStats,
            setAutoSkipIntro: handleSetAutoSkipIntro,
            setAutoSkipOutro: handleSetAutoSkipOutro,
            setSkipStepSeconds: setSkipStepSecondsPref,
            setHlsLevel: handleSetHlsLevel,
            setShowHeatmap: setShowHeatmapPref,
            setAspectRatio: setAspectRatioPref,
            setSubtitleSize: setSubtitleSizePref,
            setLoopEnabled: setLoopEnabledPref,
            setTvMode: handleSetTvMode,
            setAmbientModeEnabled,
            setMarathonMode: handleSetMarathonMode,
            handleResume,
            setShowResume,
            setAutoDisableSubtitlesWhenDubbed: (val: boolean) => { useAppStore.setState(s => ({ ...s, autoDisableSubtitlesWhenDubbed: val })) },
            skipToNextChapter,
            skipToPrevChapter,
        }
    }
}
