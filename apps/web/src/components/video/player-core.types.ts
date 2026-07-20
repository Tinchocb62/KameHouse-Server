import type { AudioTrack, SubtitleTrack } from "@/components/ui/track-types"
import type { PlayerPreviewManager } from "./player-preview"

export interface PlayerStats {
    currentTime: string
    duration: string
    buffer: string
    resolution: string
    playbackRate: string
    volume: string
    source: string
}

export interface PlayerCoreProps {
    playableUrl: string
    streamUrl?: string
    backendTracks?: {
        audioTracks: AudioTrack[]
        subtitleTracks: SubtitleTrack[]
        chapters?: { startTime: number; endTime: number; name: string; type?: string }[]
        fontUrls?: string[]
    }
    initialProgressSeconds?: number
    onProgress?: (seconds: number) => void
    onNextEpisode?: () => void
    hasNextEpisode?: boolean
    mediaId?: number
    episodeNumber?: number
    malId?: number | null
    clientId?: string
    onClose: () => void
    title?: string
    /** e.g. "TV", "TV_SHORT", "MOVIE", "OVA", "SPECIAL" — used to decide fallback skip window */
    mediaFormat?: string | null
    nextStreamUrl?: string
    nextStreamType?: "local" | "online" | "direct" | "transcode" | "optimized"
    streamType?: "local" | "online" | "direct" | "transcode" | "optimized"
    /** Permite al core pedir un cambio de tipo de stream (ej. direct → transcode
     *  cuando el usuario elige una pista de audio y el navegador no soporta
     *  cambiarla nativamente en direct play). */
    onRequestStreamTypeChange?: (type: "transcode" | "direct", opts?: { force?: boolean }) => void
    /** Llamado cuando direct play falla de forma irrecuperable. El orchestrator
     *  puede usarlo para hacer fallback a transcode si está habilitado. */
    onDirectPlayFailed?: () => void
    nextEpisodeTitle?: string
    nextEpisodeNumber?: number
    nextEpisodeImage?: string
    /** Duración real del archivo según ffprobe (mediaInfo.duration del server).
     *  Fallback cuando el navegador reporta Infinity/NaN (MKV directo sin
     *  duración en el header): sin esto, todas las lógicas de "cerca del final"
     *  (auto-skip de outro, avance marathon, panel de siguiente episodio) mueren. */
    metadataDuration?: number
}

export interface PlayerCore {
    domElements: {
        videoElement: React.RefObject<HTMLVideoElement>
        containerElement: React.RefObject<HTMLDivElement>
        canvasElement: React.RefObject<HTMLCanvasElement>
        progressBarElement: React.RefObject<HTMLDivElement>
        thumbElement: React.RefObject<HTMLDivElement>
        progressInputElement: React.RefObject<HTMLInputElement>
        timeTextElement: React.RefObject<HTMLSpanElement>
    }
    state: {
        isPlaying: boolean
        duration: number
        currentTime: number
        volume: number
        isMuted: boolean
        isFullscreen: boolean
        controlsVisible: boolean
        status: "loading" | "ready" | "error"
        /** true cuando el loading corresponde a un cambio de stream mid-playback (ej. audio track switch),
         *  en oposición al loading inicial del player. El overlay usa esto para mostrar un fondo semitransparente
         *  en vez de negro sólido, manteniendo la imagen congelada del video visible. */
        isStreamSwitching: boolean
        errorMsg: string
        isBuffering: boolean
        isSeeking: boolean
        flash: "play" | "pause" | null
        /** null = hidden, "intro" = showing skip-intro button, "outro" = showing skip-outro button */
        skipMode: "intro" | "outro" | null
        skipRemainingSeconds: number
        /** 0–100: how much of the current skip segment has elapsed (used for progress fill on the button) */
        segmentProgress: number
        showNextEpisode: boolean
        hasNextEpisode: boolean
        countdownSeconds: number
        showCountdown: boolean
        remainingProgress: number
        audioTracks: AudioTrack[]
        activeAudioIndex: number
        subtitleTracks: SubtitleTrack[]
        activeSubtitleIndex: number | null
        isJassubLoading: boolean
        isJassubActive: boolean
        isPgsLoading: boolean
        isPgsActive: boolean
        isSettingsOpen: boolean
        autoSkipIntro: boolean
        autoSkipOutro: boolean
        skipStepSeconds: number
        playbackRate: number
        showHeatmap: boolean
        aspectRatio: "contain" | "fill" | "cover" | "16/9"
        subtitleSize: number
        loopEnabled: boolean
        showStats: boolean
        statsData: PlayerStats | null
        hlsLevels: { index: number; label: string; height: number }[]
        activeHlsLevel: number
        previewManager: PlayerPreviewManager | null
        showResume: boolean
        resumeTime: number
        autoDisableSubtitlesWhenDubbed: boolean
        marathonMode: boolean
        tvMode: boolean
        ambientModeEnabled: boolean
        /** AniSkip intervals exposed to child components for rendering timeline markers */
        skipTimesOp?: { startTime: number; endTime: number }
        skipTimesEd?: { startTime: number; endTime: number }
        showAutoSkipToast: "intro" | "outro" | "pause" | null
        chapters: { startTime: number; endTime: number; name: string; type?: string }[]
        activeChapter: string | null
        absoluteLanUrl?: string
        serverIPs?: string[]
        serverPort?: number
    }
    actions: {
        setIsPlaying: (playing: boolean) => void
        setDuration: (duration: number) => void
        setIsBuffering: (buffering: boolean) => void
        setIsSeeking: (seeking: boolean) => void
        setControlsVisible: (visible: boolean) => void
        setIsSettingsOpen: (open: boolean) => void
        triggerControlsVisibility: () => void
        togglePlay: () => void
        handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void
        handleSeekStart: () => void
        handleSeekEnd: (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => void
        skipTime: (seconds: number) => void
        skipOpening: () => void
        handleVolume: (e: React.ChangeEvent<HTMLInputElement>) => void
        toggleMute: () => void
        onSelectAudio: (track: AudioTrack, opts?: { auto?: boolean }) => void
        onSelectSubtitle: (track: SubtitleTrack | null, opts?: { auto?: boolean }) => void
        toggleFullscreen: () => void
        handleSkipIntro: () => void
        undoSkip: () => void
        handleTimeUpdate: (e?: React.SyntheticEvent<HTMLVideoElement>) => void
        takeScreenshot: () => void
        togglePip: () => void
        changePlaybackRate: (rate: number) => void
        setShowStats: (show: boolean) => void
        setAutoSkipIntro: (val: boolean) => void
        setAutoSkipOutro: (val: boolean) => void
        setSkipStepSeconds: (val: number) => void
        setHlsLevel: (level: number) => void
        setShowHeatmap: (val: boolean) => void
        setAspectRatio: (val: "contain" | "fill" | "cover" | "16/9") => void
        setSubtitleSize: (val: number) => void
        setLoopEnabled: (val: boolean) => void
        setMarathonMode: (val: boolean) => void
        setTvMode: (val: boolean) => void
        handleResume: () => void
        setShowResume: (val: boolean) => void
        setAutoDisableSubtitlesWhenDubbed: (val: boolean) => void
        setAmbientModeEnabled: (val: boolean) => void
        skipToNextChapter: () => void
        skipToPrevChapter: () => void
    }
}
