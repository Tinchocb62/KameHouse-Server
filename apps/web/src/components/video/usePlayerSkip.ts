import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useAniSkipTimes, getAniSkipTimes } from "@/api/hooks/aniskip.hooks"
import { useGetSettings } from "@/api/hooks/settings.hooks"
import { usePreloadMediastreamMediaContainer } from "@/api/hooks/mediastream.hooks"
import { useQueryClient } from "@tanstack/react-query"
import { useAppStore, useSkipTimesStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Mediastream_StreamType } from "@/api/generated/types"

// ─── Constants ─────────────────────────────────────────────────────────────────

const COUNTDOWN_START = 5
const SEEK_COOLDOWN_MS = 800

const INTRO_REGEX = /^(op\d*|opening\d*|intro\d*)\b/i
const INTRO_WORD_REGEX = /\b(op\d*|opening\d*|intro\d*)\b/i
const OUTRO_REGEX = /^(ed\d*|ending\d*|credits|créditos|outro\d*)\b/i
const OUTRO_WORD_REGEX = /\b(ed\d*|ending\d*|credits|créditos|outro\d*)\b/i

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SkipWindow {
    startTime: number
    endTime: number
    source: string
}

interface Chapter {
    startTime: number
    endTime: number
    name: string
    type?: string
}

interface UsePlayerSkipProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    playableUrl: string
    duration: number
    isPlaying: boolean
    malId?: number | null
    episodeNumber?: number
    chapters: Chapter[]
    mediaFormat?: string | null
    autoSkipIntroPref: boolean
    autoSkipOutroPref: boolean
    skipStepSecondsPref: number
    hasNextEpisode: boolean
    onNextEpisode?: () => void
    setAutoSkipIntro: (val: boolean) => void
    setAutoSkipOutro: (val: boolean) => void
    triggerControlsVisibility: () => void
    clientId?: string
    nextStreamUrl?: string
    nextStreamType?: "local" | "online" | "direct" | "transcode" | "optimized"
    streamType?: "local" | "online" | "direct" | "transcode" | "optimized"
    mediaId?: number | null
    preferredAudioLang?: string
    tvMode: boolean
    setTvMode: (val: boolean) => void
}

// ─── Pure Helpers (no hooks) ────────────────────────────────────────────────────

function resolveActiveOp(skipTimesOp: SkipWindow | undefined, total: number, mediaFormat?: string | null): SkipWindow | undefined {
    if (skipTimesOp) return skipTimesOp
    if (mediaFormat?.toUpperCase() === "MOVIE") return undefined
    // D8: Anime TV OPs usually last exactly 85-90s. The old 12% calculation
    // was crude. We apply this heuristic only if the video is >10 mins (600s).
    if (total > 600) return { startTime: 0, endTime: 85, source: "heuristic" }
    return undefined
}

/** Returns the effective ED/outro window: explicit AniSkip data → chapter → heuristic.
 * A real end mark that lands before the end of the file is trusted as-is: capping
 * it at `total - 5` made every skip land up to 5s short and the user watched the
 * tail of the outro. The 5s buffer only applies to placeholder/malformed ends
 * ("runs to the end of the file"), where we can't tell the outro's real end and
 * skipping to `total` would end the video. */
function resolveActiveEd(skipTimesEd: SkipWindow | undefined, total: number, mediaFormat?: string | null): SkipWindow | undefined {
    const getHeuristicEd = (): SkipWindow | undefined => {
        if (mediaFormat?.toUpperCase() === "MOVIE") return undefined
        if (total > 300) {
            const edDuration = Math.min(95, total * 0.08)
            return { startTime: total - edDuration, endTime: total - 5, source: "heuristic" }
        }
        return undefined
    }

    if (skipTimesEd) {
        const start = skipTimesEd.startTime
        // Outro starting at/after the end of the video is unusable — fallback to heuristic.
        if (total > 0 && start >= total) return getHeuristicEd()

        let parsedEndTime = skipTimesEd.endTime
        // Many AniSkip entries have malformed ed.endTime (e.g., equal to startTime or just 1s later)
        if (parsedEndTime <= start + 10) {
            parsedEndTime = total - 5
        }

        // Placeholder end (>= total - 0.5): the mark says "until the end of the
        // file", which is indistinguishable from "unknown". Keep the 5s buffer so
        // the skip doesn't end the video. A measured end below that is exact —
        // land on it, clamped to the file duration.
        const cap = parsedEndTime >= total - 0.5 ? Math.max(start + 1, total - 5) : total
        const endTime = Math.min(Math.max(parsedEndTime, start + 1), cap)
        return { startTime: start, endTime, source: skipTimesEd.source }
    }
    return getHeuristicEd()
}

function shouldAutoSkip(source: string): boolean {
    return ["manual", "fingerprint", "aniskip", "chapters", "propagated", "heuristic", "animethemes", "fpcross", "subtitle"].includes(source)
}

/** Outro auto-skip is also permissive for the heuristic window.
 * Both intro and outro accept heuristic since the user explicitly enabled auto-skip. */
function shouldAutoSkipOutro(source: string): boolean {
    return shouldAutoSkip(source)
}

/** Returns true if the chapter name/type matches an intro/opening pattern */
function isIntroChapter(c: Chapter): boolean {
    const n = c.name.toLowerCase()
    return c.type === "opening" || INTRO_REGEX.test(n) || INTRO_WORD_REGEX.test(n)
}

/** Returns true if the chapter name/type matches an outro/ending pattern */
function isOutroChapter(c: Chapter): boolean {
    const n = c.name.toLowerCase()
    return c.type === "ending" || OUTRO_REGEX.test(n) || OUTRO_WORD_REGEX.test(n)
}

/** Finds the first chapter from the list that matches intro patterns */
function findIntroChapter(chapters: Chapter[]): Chapter | undefined {
    return chapters.find(isIntroChapter)
}

/** Finds the first chapter from the list that matches outro patterns */
function findOutroChapter(chapters: Chapter[]): Chapter | undefined {
    return chapters.find(isOutroChapter)
}

// ─── Main Hook ─────────────────────────────────────────────────────────────────

export function usePlayerSkip({
    videoRef,
    playableUrl,
    duration,
    isPlaying: _isPlaying,
    malId,
    episodeNumber,
    chapters,
    mediaFormat,
    autoSkipIntroPref,
    autoSkipOutroPref,
    skipStepSecondsPref,
    hasNextEpisode,
    onNextEpisode,
    setAutoSkipIntro,
    setAutoSkipOutro,
    triggerControlsVisibility,
    clientId,
    nextStreamUrl,
    streamType,
    mediaId,
    preferredAudioLang,
    tvMode,
    setTvMode,
}: UsePlayerSkipProps) {
    const { data: settings } = useGetSettings()
    const { mutate: preloadStream } = usePreloadMediastreamMediaContainer()
    const queryClient = useQueryClient()
    const autoPlayNextEpisode = settings?.library?.autoPlayNextEpisode ?? true

    const { marathonMode } = useAppStore(
        useShallow(state => ({
            marathonMode: state.marathonMode,
        }))
    )

    const { seriesSkipTimes, saveSeriesSkipTimes } = useSkipTimesStore(
        useShallow(state => ({
            seriesSkipTimes: state.seriesSkipTimes,
            saveSeriesSkipTimes: state.saveSeriesSkipTimes
        }))
    )

    // ── Refs ────────────────────────────────────────────────────────────────────
    const hasAutoSkippedIntroRef = useRef(false)
    const hasAutoSkippedOutroRef = useRef(false)
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null)
    const nextEpisodeTimerRef = useRef<NodeJS.Timeout | null>(null)
    const hasTriggeredNextEpisodeRef = useRef<boolean>(false)
    const hasPreloadedRef = useRef<boolean>(false)
    const lastManualSeekTimestampRef = useRef<number>(0)
    const preSkipPositionRef = useRef<number>(0)
    const skippedChaptersRef = useRef<Set<string>>(new Set())

    // ── Stable config ref (decouples processTimeUpdates from closure deps) ──────
    const configRef = useRef({
        skipTimesOp: undefined as SkipWindow | undefined,
        skipTimesEd: undefined as SkipWindow | undefined,
        autoSkipIntroPref: false,
        autoSkipOutroPref: false,
        skipStepSecondsPref: 85,
        chapters: [] as Chapter[],
        mediaFormat: undefined as string | undefined | null,
        marathonMode: false,
        tvMode: false,
        hasNextEpisode: false,
        onNextEpisode: undefined as (() => void) | undefined,
        autoPlayNextEpisode: false,
        nextStreamUrl: undefined as string | undefined,
        streamType: undefined as string | undefined,
        preloadStream: ((_: { path: string; streamType: Mediastream_StreamType; audioStreamIndex: number; preferredAudioLang: string }) => {}) as (vars: { path: string; streamType: Mediastream_StreamType; audioStreamIndex: number; preferredAudioLang: string }) => void,
        queryClient: undefined as ReturnType<typeof useQueryClient> | undefined,
        clientId: undefined as string | undefined,
        malId: undefined as number | null | undefined,
        mediaId: undefined as number | null | undefined,
        episodeNumber: undefined as number | undefined,
        showCountdown: false,
        preferredAudioLang: undefined as string | undefined,
    })
    // ── Dual ref+state pattern (avoids stale closures in hot callbacks) ─────────
    const [skipMode, setSkipModeState] = useState<"intro" | "outro" | null>(null)
    const skipModeRef = useRef<"intro" | "outro" | null>(null)
    const setSkipMode = useCallback((val: "intro" | "outro" | null) => {
        skipModeRef.current = val
        setSkipModeState(val)
    }, [])

    const [skipRemainingSeconds, setSkipRemainingSecondsState] = useState(0)
    const skipRemainingSecondsRef = useRef(0)
    const setSkipRemainingSeconds = useCallback((val: number) => {
        skipRemainingSecondsRef.current = val
        setSkipRemainingSecondsState(val)
    }, [])

    const [segmentProgress, setSegmentProgressState] = useState(0)
    const segmentProgressRef = useRef(0)
    const setSegmentProgress = useCallback((val: number) => {
        segmentProgressRef.current = val
        setSegmentProgressState(val)
    }, [])

    const [showNextEpisode, setShowNextEpisodeState] = useState(false)
    const showNextEpisodeRef = useRef(false)
    const setShowNextEpisode = useCallback((val: boolean) => {
        showNextEpisodeRef.current = val
        setShowNextEpisodeState(val)
    }, [])

    const [showAutoSkipToast, setShowAutoSkipToast] = useState<"intro" | "outro" | "pause" | null>(null)

    const [activeChapter, setActiveChapterState] = useState<string | null>(null)
    const activeChapterRef = useRef<string | null>(null)
    const setActiveChapter = useCallback((val: string | null) => {
        activeChapterRef.current = val
        setActiveChapterState(val)
    }, [])

    const [countdownSeconds, setCountdownSeconds] = useState(COUNTDOWN_START)
    const [showCountdown, setShowCountdown] = useState(false)
    const [videoEnded, setVideoEnded] = useState(false)

    // ── Episode change reset ─────────────────────────────────────────────────────
    // When the orchestrator loads a new episode, playableUrl transitions "" → realUrl
    // while episodeNumber changes immediately. Keying the effect on episodeNumber alone
    // meant it ran during the "" phase (early return) and never re-ran once the real
    // URL arrived, so every flag stayed stale for the new episode. Depending on both
    // and deduping with a ref guarantees exactly one reset per episode+URL, avoiding
    // the double-reset ("" then realUrl) that cleared hasTriggeredNextEpisodeRef
    // prematurely.
    const lastResetKeyRef = useRef<string | null>(null)
    useEffect(() => {
        if (!playableUrl) return  // still in the loading phase — wait for real URL
        const resetKey = `${episodeNumber}_${playableUrl}`
        if (lastResetKeyRef.current === resetKey) return
        lastResetKeyRef.current = resetKey
        setShowNextEpisode(false)
        setSkipMode(null)
        setShowCountdown(false)
        setCountdownSeconds(COUNTDOWN_START)
        setVideoEnded(false)
        hasAutoSkippedIntroRef.current = false
        hasAutoSkippedOutroRef.current = false
        hasTriggeredNextEpisodeRef.current = false
        hasPreloadedRef.current = false
        skippedChaptersRef.current.clear()
    }, [episodeNumber, playableUrl]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Video ended tracking ─────────────────────────────────────────────────────
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handleEnded = () => setVideoEnded(true)
        const handlePlay = () => setVideoEnded(false)
        const handleSeeked = () => setVideoEnded(video.ended)

        video.addEventListener("ended", handleEnded)
        video.addEventListener("play", handlePlay)
        video.addEventListener("seeked", handleSeeked)
        setVideoEnded(video.ended)

        return () => {
            video.removeEventListener("ended", handleEnded)
            video.removeEventListener("play", handlePlay)
            video.removeEventListener("seeked", handleSeeked)
        }
    }, [videoRef])

    // ── AniSkip data ─────────────────────────────────────────────────────────────
    const { data: skipTimes } = useAniSkipTimes({
        malId: malId ?? null,
        episodeNumber: episodeNumber ?? null,
        episodeDuration: duration > 0 ? duration : undefined,
        enabled: !!((malId || mediaId) && episodeNumber),
        mediaId: mediaId ?? null,
    })

    // ── Resolved skip windows (AniSkip → chapter → series cache) ────────────────
    const storeKey = malId || mediaId
    const skipTimesOp = useMemo<SkipWindow | undefined>(() => {
        if (skipTimes?.op) return { startTime: skipTimes.op.startTime, endTime: skipTimes.op.endTime, source: skipTimes.opSource ?? "aniskip" }
        const chap = findIntroChapter(chapters)
        if (chap) return { startTime: chap.startTime, endTime: chap.endTime, source: "chapters" }
        if (storeKey) {
            const cached = seriesSkipTimes[String(storeKey)]
            if (cached && typeof cached.opStart === "number" && typeof cached.opEnd === "number") {
                return { startTime: cached.opStart, endTime: cached.opEnd, source: "propagated" }
            }
        }
        return undefined
    }, [skipTimes, chapters, storeKey, seriesSkipTimes])

    const skipTimesEd = useMemo<SkipWindow | undefined>(() => {
        if (skipTimes?.ed) {
            const endTime = skipTimes.ed.endTime > 0 ? skipTimes.ed.endTime : (duration > 0 ? duration : 0)
            return { startTime: skipTimes.ed.startTime, endTime, source: skipTimes.edSource ?? "aniskip" }
        }
        const chap = findOutroChapter(chapters)
        if (chap) return { startTime: chap.startTime, endTime: chap.endTime, source: "chapters" }
        if (storeKey && duration > 0) {
            const cached = seriesSkipTimes[String(storeKey)]
            if (cached && typeof cached.edOffset === "number" && cached.edOffset > 0) {
                const endTime = (typeof cached.edEnd === "number" && cached.edEnd > 0) ? cached.edEnd : duration
                return { startTime: cached.edOffset, endTime, source: "propagated" }
            }
        }
        return undefined
    }, [skipTimes, chapters, storeKey, duration, seriesSkipTimes])

    // ── Auto-learning: persist resolved skip times to series cache ───────────────
    useEffect(() => {
        if (!storeKey || duration <= 0) return

        const cached = seriesSkipTimes[String(storeKey)]
        let opStart = cached?.opStart
        let opEnd = cached?.opEnd
        let edOffset = cached?.edOffset
        let edEnd = cached?.edEnd

        // Use resolved skipTimesOp/Ed rather than re-running chapter regex
        if (skipTimesOp) {
            opStart = skipTimesOp.startTime
            opEnd = skipTimesOp.endTime
        }
        if (skipTimesEd) {
            edOffset = skipTimesEd.startTime
            edEnd = skipTimesEd.endTime
        }

        if (typeof opStart === "number" && typeof opEnd === "number" && typeof edOffset === "number") {
            if (cached?.opStart !== opStart || cached?.opEnd !== opEnd || cached?.edOffset !== edOffset || cached?.edEnd !== edEnd) {
                saveSeriesSkipTimes(storeKey!, opStart, opEnd, edOffset, edEnd)
            }
        }
    }, [storeKey, duration, skipTimesOp, skipTimesEd, seriesSkipTimes, saveSeriesSkipTimes])

    // ── Helpers ──────────────────────────────────────────────────────────────────
    const triggerToast = useCallback((type: "intro" | "outro" | "pause") => {
        setShowAutoSkipToast(type)
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        toastTimerRef.current = setTimeout(() => setShowAutoSkipToast(null), 3000)
    }, [])

    /** Duración efectiva: video.duration si es finita, si no el prop `duration`
     * (ya saneado en player-core con la duración de ffprobe). Con Infinity/NaN,
     * resolveActiveOp/Ed generan ventanas inalcanzables y los skips mueren. */
    const getEffectiveTotal = useCallback((video: HTMLVideoElement): number => {
        const raw = video.duration
        if (Number.isFinite(raw) && raw > 0) return raw
        return duration
    }, [duration])

    /** Suppress auto-skip after any manual seek into a skip window */
    const checkManualSkipOverrides = useCallback((target: number) => {
        const video = videoRef.current
        if (!video) return
        const total = getEffectiveTotal(video)

        lastManualSeekTimestampRef.current = Date.now()

        const activeOp = resolveActiveOp(skipTimesOp, total, mediaFormat)
        if (activeOp && target >= activeOp.startTime && target < activeOp.endTime) {
            hasAutoSkippedIntroRef.current = true
        }

        const activeEd = resolveActiveEd(skipTimesEd, total, mediaFormat)
        if (activeEd && target >= activeEd.startTime && target < activeEd.endTime) {
            hasAutoSkippedOutroRef.current = true
        }
    }, [skipTimesOp, skipTimesEd, videoRef, mediaFormat, getEffectiveTotal])

    // ── Public skip actions ───────────────────────────────────────────────────────
    const skipOpening = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        const dur = Number.isFinite(video.duration) ? video.duration : Infinity
        
        let target = Math.max(0, Math.min(dur, video.currentTime + configRef.current.skipStepSecondsPref))
        
        const activeOp = resolveActiveOp(skipTimesOp, dur, mediaFormat)
        if (activeOp && video.currentTime < activeOp.endTime && video.currentTime >= activeOp.startTime - 20) {
            target = activeOp.endTime
        } else {
            const activeEd = resolveActiveEd(skipTimesEd, dur, mediaFormat)
            if (activeEd && video.currentTime < activeEd.endTime && video.currentTime >= activeEd.startTime - 20) {
                target = activeEd.endTime
            }
        }

        checkManualSkipOverrides(target)
        video.currentTime = target
        lastManualSeekTimestampRef.current = Date.now()
        video.play().catch(() => {})
        triggerControlsVisibility()
    }, [videoRef, skipTimesOp, skipTimesEd, mediaFormat, triggerControlsVisibility, checkManualSkipOverrides])

    const undoSkip = useCallback(() => {
        const video = videoRef.current
        if (!video || preSkipPositionRef.current === 0) return
        video.currentTime = preSkipPositionRef.current
        lastManualSeekTimestampRef.current = Date.now()
        video.play().catch(() => {})
        triggerControlsVisibility()
        setShowAutoSkipToast(null)
    }, [videoRef, triggerControlsVisibility])

    const skipToNextChapter = useCallback(() => {
        const video = videoRef.current
        if (!video || chapters.length === 0) return
        const curr = video.currentTime
        const next = chapters.find(c => c.startTime > curr + 0.5)
        if (next) {
            checkManualSkipOverrides(next.startTime)
            video.currentTime = next.startTime
            lastManualSeekTimestampRef.current = Date.now()
            video.play().catch(() => {})
            triggerControlsVisibility()
        }
    }, [videoRef, chapters, checkManualSkipOverrides, triggerControlsVisibility])

    const skipToPrevChapter = useCallback(() => {
        const video = videoRef.current
        if (!video || chapters.length === 0) return
        const curr = video.currentTime
        const prevs = chapters.filter(c => c.startTime < curr - 1.5)
        const target = prevs.length > 0 ? prevs[prevs.length - 1].startTime : 0
        checkManualSkipOverrides(target)
        video.currentTime = target
        lastManualSeekTimestampRef.current = Date.now()
        video.play().catch(() => {})
        triggerControlsVisibility()
    }, [videoRef, chapters, checkManualSkipOverrides, triggerControlsVisibility])

    const handleSetAutoSkipIntro = useCallback((val: boolean) => {
        setAutoSkipIntro(val)
        const video = videoRef.current
        if (!video || !val) return
        const curr = video.currentTime
        const activeOp = resolveActiveOp(skipTimesOp, getEffectiveTotal(video), mediaFormat)
        if (activeOp && curr >= activeOp.startTime && curr < activeOp.endTime) {
            video.currentTime = activeOp.endTime
            lastManualSeekTimestampRef.current = Date.now()
            video.play().catch(() => {})
            setSkipMode(null)
        }
    }, [videoRef, setAutoSkipIntro, skipTimesOp, setSkipMode, getEffectiveTotal])

    const handleSetAutoSkipOutro = useCallback((val: boolean) => {
        setAutoSkipOutro(val)
        const video = videoRef.current
        if (!video || !val) return
        const curr = video.currentTime
        const total = getEffectiveTotal(video)
        // Only act on outro, not inside intro window
        const activeOp = resolveActiveOp(skipTimesOp, total, mediaFormat)
        if (activeOp && curr < activeOp.endTime) return
        const activeEd = resolveActiveEd(skipTimesEd, total, mediaFormat)
        if (activeEd && curr >= activeEd.startTime && curr < activeEd.endTime) {
            video.currentTime = activeEd.endTime
            lastManualSeekTimestampRef.current = Date.now()
            video.play().catch(() => {})
            setSkipMode(null)
        }
    }, [videoRef, setAutoSkipOutro, skipTimesOp, skipTimesEd, setSkipMode, getEffectiveTotal])

    const handleSetTvMode = useCallback((val: boolean) => {
        setTvMode(val)
    }, [setTvMode])

    const handleSetMarathonMode = useCallback((val: boolean) => {
        useAppStore.setState({ marathonMode: val })
        
        const video = videoRef.current
        if (!video || !val) return
        
        hasAutoSkippedIntroRef.current = false
        hasAutoSkippedOutroRef.current = false

        const curr = video.currentTime
        const total = getEffectiveTotal(video)

        // 1. Check intro
        const activeOp = resolveActiveOp(skipTimesOp, total, mediaFormat)
        if (activeOp && curr >= activeOp.startTime && curr < activeOp.endTime) {
            video.currentTime = activeOp.endTime
            lastManualSeekTimestampRef.current = Date.now()
            video.play().catch(() => {})
            setSkipMode(null)
            return
        }
        
        // 2. En el outro o muy cerca del final: en maratón se avanza directo al
        //    siguiente episodio (mismo criterio que la sección 6 de
        //    processTimeUpdates). Si es el último episodio, se salta el outro.
        const activeEd = resolveActiveEd(skipTimesEd, total, mediaFormat)
        const inEd = !!activeEd && curr >= activeEd.startTime && curr < activeEd.endTime
        const nearEnd = total > 0 && total - curr <= 3
        const canAdvance = hasNextEpisode && !!onNextEpisode && mediaFormat?.toUpperCase() !== "MOVIE"
        if ((inEd || nearEnd) && canAdvance) {
            if (!hasTriggeredNextEpisodeRef.current) {
                hasTriggeredNextEpisodeRef.current = true
                video.pause()
                onNextEpisode!()
            }
            return
        }
        if (inEd && activeEd) {
            video.currentTime = activeEd.endTime
            lastManualSeekTimestampRef.current = Date.now()
            video.play().catch(() => {})
            setSkipMode(null)
        }
    }, [videoRef, skipTimesOp, skipTimesEd, mediaFormat, hasNextEpisode, onNextEpisode, setSkipMode, getEffectiveTotal])

    const handleSkipIntro = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        const curr = video.currentTime
        const total = getEffectiveTotal(video)
        const activeMode = skipMode || (curr < 120 ? "intro" : "outro")

        if (activeMode === "intro") {
            const activeOp = resolveActiveOp(skipTimesOp, total, mediaFormat)
            if (!activeOp || !(curr >= activeOp.startTime && curr < activeOp.endTime)) return
            video.currentTime = activeOp.endTime
        } else {
            const activeEd = resolveActiveEd(skipTimesEd, total, mediaFormat)
            if (!activeEd || !(curr >= activeEd.startTime && curr < activeEd.endTime)) return
            video.currentTime = activeEd.endTime
        }

        lastManualSeekTimestampRef.current = Date.now()
        video.play().catch(() => {})
        setSkipMode(null)
    }, [videoRef, skipMode, skipTimesOp, skipTimesEd, setSkipMode, mediaFormat, getEffectiveTotal])

    // ─────────────────────────────────────────────────────────────────────────────
    // processTimeUpdates — called on every timeupdate event from the video element
    // Split into focused sub-sections for clarity.
    // ─────────────────────────────────────────────────────────────────────────────
    // D5: configRef.current se asignaba directamente en el cuerpo del render,
    // lo cual es un anti-patrón en React (los renders pueden ser interrumpidos
    // o repetidos en modo concurrente / StrictMode). useLayoutEffect garantiza
    // que la mutación ocurre sincrónicamente después del commit, antes de que
    // el navegador pinte, y nunca en medio de un render interrumpido.
    useEffect(() => {
        configRef.current = {
            skipTimesOp,
            skipTimesEd,
            autoSkipIntroPref: autoSkipIntroPref || marathonMode,
            autoSkipOutroPref: autoSkipOutroPref || marathonMode,
            skipStepSecondsPref,
            chapters,
            mediaFormat,
            marathonMode,
            tvMode,
            hasNextEpisode,
            onNextEpisode,
            autoPlayNextEpisode,
            nextStreamUrl,
            streamType,
            preloadStream,
            queryClient,
            clientId,
            malId,
            mediaId,
            episodeNumber,
            showCountdown,
            preferredAudioLang,
        }
    })

    const processTimeUpdates = useCallback((curr: number, total: number) => {
        const video = videoRef.current
        if (!video) return

        const cfg = configRef.current
        const activeOp = resolveActiveOp(cfg.skipTimesOp, total, cfg.mediaFormat)
        const activeEd = resolveActiveEd(cfg.skipTimesEd, total, cfg.mediaFormat)

        // ── 1. Seek cooldown guard ─────────────────────────────────────────────
        const inCooldown = Date.now() - lastManualSeekTimestampRef.current < SEEK_COOLDOWN_MS
        if (inCooldown) {
            if (cfg.chapters.length > 0) {
                const chap = cfg.chapters.find(c => curr >= c.startTime && curr < c.endTime)
                const name = chap ? chap.name : null
                if (activeChapterRef.current !== name) setActiveChapter(name)
            }
            return
        }

        // ── 2. Active chapter detection ────────────────────────────────────────
        if (cfg.chapters.length > 0) {
            const chap = cfg.chapters.find(c => curr >= c.startTime && curr < c.endTime)
            const name = chap ? chap.name : null
            if (activeChapterRef.current !== name) setActiveChapter(name)
        }

        // ── 3. Chapter-based intermediate auto-skip ────────────────────────────
        if (cfg.chapters.length > 0) {
            const skippable = cfg.chapters.find(c => {
                if (!(curr >= c.startTime && curr < c.endTime - 0.5)) return false
                const key = `${c.name}_${c.startTime}`
                if (skippedChaptersRef.current.has(key)) return false
                if (isIntroChapter(c)) return cfg.autoSkipIntroPref
                if (isOutroChapter(c)) return cfg.autoSkipOutroPref
                const n = c.name.toLowerCase()
                return (
                    cfg.autoSkipIntroPref &&
                    (n.includes("eyecatch") || n.includes("eye-catch") ||
                        n.includes("commercial") || n.includes("sponsor") || n.includes("sponsors") ||
                        n.includes("recap") || n.includes("resumen") ||
                        n.includes("preview") || n.includes("avance") || n.includes("adelanto") ||
                        n.includes("title card") || n.includes("titlecard") || n.includes("title") || n.includes("título") ||
                        n.includes("publicidad") || n.includes("patrocinio") ||
                        n.includes("intermedio") || n.includes("prologue") || n.includes("prólogo") ||
                        c.type === "sponsor" || c.type === "recap" || c.type === "preview")
                )
            })
            if (skippable) {
                const key = `${skippable.name}_${skippable.startTime}`
                skippedChaptersRef.current.add(key)
                video.currentTime = skippable.endTime
                lastManualSeekTimestampRef.current = Date.now()
                video.play().catch(() => {})
                triggerToast("pause")
                return
            }
        }

        // ── 4. Reset auto-skip flags when before windows ──────────────────────
        if (activeOp && curr < activeOp.startTime) {
            hasAutoSkippedIntroRef.current = false
        }
        if (activeEd && curr < activeEd.startTime) {
            hasAutoSkippedOutroRef.current = false
        }

        // ── 5. OP / Intro window ───────────────────────────────────────────────
        if (activeOp) {
            const { startTime, endTime, source } = activeOp
            const inWindow = curr >= startTime && curr < endTime
            if (cfg.autoSkipIntroPref && inWindow && !hasAutoSkippedIntroRef.current && shouldAutoSkip(source)) {
                hasAutoSkippedIntroRef.current = true
                preSkipPositionRef.current = curr
                video.currentTime = endTime
                lastManualSeekTimestampRef.current = Date.now()
                video.play().catch(() => {})
                setSkipMode(null)
                triggerToast("intro")
                return
            }
            if (inWindow && curr >= startTime + 1) {
                const remaining = Math.ceil(endTime - curr)
                const progress = Math.round(((curr - startTime) / Math.max(1, endTime - startTime)) * 100)
                if (skipModeRef.current !== "intro") setSkipMode("intro")
                if (skipRemainingSecondsRef.current !== remaining) setSkipRemainingSeconds(remaining)
                if (segmentProgressRef.current !== progress) setSegmentProgress(progress)
            } else if (skipModeRef.current === "intro") {
                setSkipMode(null)
            }
        }

        // ── 6. ED / Outro window ───────────────────────────────────────────────
        if (activeEd) {
            const { startTime, endTime, source } = activeEd
            const inWindow = curr >= startTime && curr < endTime
            
            if (cfg.autoSkipOutroPref && inWindow && !hasAutoSkippedOutroRef.current && shouldAutoSkipOutro(source)) {
                // En maratón no tiene sentido saltar el outro para seguir viendo el
                // buffer post-ED: se avanza directo al siguiente episodio, sin el
                // residuo de ~2s que dejaba el salto a `endTime` (= total-5) hasta
                // que la sección 9 disparaba a total-3. Si es el último episodio
                // (no hay siguiente), cae al salto de outro normal de abajo.
                if (cfg.marathonMode && cfg.hasNextEpisode && cfg.onNextEpisode && cfg.mediaFormat?.toUpperCase() !== "MOVIE") {
                    if (!hasTriggeredNextEpisodeRef.current) {
                        hasTriggeredNextEpisodeRef.current = true
                        video.pause()
                        cfg.onNextEpisode()
                    }
                    return
                }

                hasAutoSkippedOutroRef.current = true
                preSkipPositionRef.current = curr

                video.currentTime = endTime
                lastManualSeekTimestampRef.current = Date.now()
                video.play().catch(() => {})

                setSkipMode(null)
                triggerToast("outro")
                return
            }
            
            if (inWindow && curr >= startTime + 1) {
                const remaining = Math.ceil(endTime - curr)
                const progress = Math.round(((curr - startTime) / Math.max(1, endTime - startTime)) * 100)
                if (skipModeRef.current !== "outro") setSkipMode("outro")
                if (skipRemainingSecondsRef.current !== remaining) setSkipRemainingSeconds(remaining)
                if (segmentProgressRef.current !== progress) setSegmentProgress(progress)
            } else if (skipModeRef.current === "outro") {
                setSkipMode(null)
            }
        }

        // ── 7. Next-episode preload ────────────────────────────────────────────
        const nearEnd = total > 0 && (total - curr <= 180 || (activeEd && curr >= activeEd.startTime))
        if (cfg.nextStreamUrl && !hasPreloadedRef.current && nearEnd) {
            hasPreloadedRef.current = true

            const resolvedStreamType = (
                cfg.streamType === "transcode" || cfg.streamType === "optimized"
                    ? cfg.streamType
                    : "direct"
            ) as Mediastream_StreamType

            // Warm the NEXT episode via the side-effect-free preload path only.
            cfg.preloadStream({ path: cfg.nextStreamUrl, streamType: resolvedStreamType, audioStreamIndex: 0, preferredAudioLang: cfg.preferredAudioLang || "" })

            if ((cfg.malId || cfg.mediaId) && cfg.episodeNumber) {
                const nextEp = cfg.episodeNumber + 1
                cfg.queryClient!.prefetchQuery({
                    queryKey: ["aniskip", cfg.malId ?? null, cfg.mediaId ?? null, nextEp, 0],
                    queryFn: () => getAniSkipTimes({ malId: cfg.malId ?? null, mediaId: cfg.mediaId ?? null, episodeNumber: nextEp, episodeDuration: 0 })
                })
            }
        }

        // ── 8. "Up next" panel + countdown visibility ─────────────────────────
        const isPureMarathon = cfg.marathonMode && !cfg.tvMode
        const inEdWindow = activeEd ? curr >= activeEd.startTime && curr < activeEd.endTime : false
        const nextThreshold = cfg.tvMode ? 3 : 15
        const shouldShowNext =
            cfg.mediaFormat?.toUpperCase() !== "MOVIE" && !isPureMarathon && cfg.hasNextEpisode && (
                (total > 0 && total - curr <= nextThreshold) ||
                (!cfg.tvMode && inEdWindow)
            )

        if (shouldShowNext) {
            if (!showNextEpisodeRef.current) {
                setShowNextEpisode(true)
                const wantCountdown = cfg.tvMode || (!cfg.marathonMode && cfg.autoPlayNextEpisode)
                setShowCountdown(wantCountdown)
                setCountdownSeconds(cfg.tvMode ? 3 : COUNTDOWN_START)
            }
        } else {
            if (showNextEpisodeRef.current) {
                setShowNextEpisode(false)
                setShowCountdown(false)
            }
        }

        // ── 9. Marathon mode auto-advance ────────────────────────────────
        if (
            cfg.marathonMode && cfg.hasNextEpisode && cfg.onNextEpisode &&
            cfg.mediaFormat?.toUpperCase() !== "MOVIE" &&
            (video.ended || (total > 0 && total - curr <= 3))
        ) {
            if (!hasTriggeredNextEpisodeRef.current) {
                hasTriggeredNextEpisodeRef.current = true
                video.pause()
                cfg.onNextEpisode()
            }
        }
    }, [])

    // D6: Se eliminó el efecto que limpiaba hasTriggeredNextEpisodeRef cuando
    // showNextEpisode pasaba a false. Ese comportamiento era incorrecto: si el
    // usuario retrocede dentro del outro y el panel se oculta y reaparece, el
    // guard quedaba limpio y el avance podía re-dispararse. El ref ahora se
    // limpia exclusivamente en el reset por cambio de episodio (~línea 275),
    // keyed en `${episodeNumber}_${playableUrl}`.

    // ── Reset skip flags when marathon mode is activated ────────────────────────
    // If the user enables marathon mode while the video is inside an intro/outro
    // window (or after already passing through it without auto-skipping), the
    // forced handleTimeUpdate() in player-core won't fire the skip because
    // hasAutoSkippedIntroRef is true from a previous manual skip or heuristic pass.
    // Resetting the flags here gives processTimeUpdates a clean slate so the
    // very next timeupdate (or the force-check) can skip immediately.
    useEffect(() => {
        if (marathonMode) {
            hasAutoSkippedIntroRef.current = false
            hasAutoSkippedOutroRef.current = false
        }
    }, [marathonMode])


    // ── Countdown tick ────────────────────────────────────────────────────────────
    const remainingProgress = useMemo(() => (countdownSeconds / COUNTDOWN_START) * 100, [countdownSeconds])

    useEffect(() => {
        if (showNextEpisode && countdownSeconds > 0 && showCountdown) {
            nextEpisodeTimerRef.current = setTimeout(() => setCountdownSeconds(c => c - 1), 1000)
        } else if (showNextEpisode && countdownSeconds === 0 && showCountdown && configRef.current.onNextEpisode) {
            if (!hasTriggeredNextEpisodeRef.current) {
                hasTriggeredNextEpisodeRef.current = true
                if (videoRef.current) videoRef.current.pause()
                configRef.current.onNextEpisode()
            }
        }
        return () => { if (nextEpisodeTimerRef.current) clearTimeout(nextEpisodeTimerRef.current) }
    }, [showNextEpisode, countdownSeconds, showCountdown, videoRef])  

    // ── Auto-advance on video end ─────────────────────────────────────────────────
    // onNextEpisode is intentionally NOT in the dep array: it is an inline arrow
    // function in the parent and gets a new reference on every parent re-render.
    // Including it would cause React to cancel the pending 1-second timer on each
    // re-render (via the effect cleanup), meaning onNextEpisode() would never fire.
    // We read it through configRef.current inside the callback so it is always current.
    // episodeNumber IS in the dep array on purpose: if the episode advances through any
    // other path (manual click, "Up next" panel, shortcut) while this timer is pending,
    // the cleanup cancels it — otherwise the stale timer fired against the already-updated
    // queue index and skipped an extra episode.
    useEffect(() => {
        if (videoEnded && hasNextEpisode && configRef.current.onNextEpisode && mediaFormat?.toUpperCase() !== "MOVIE" && (marathonMode || autoPlayNextEpisode)) {
            if (marathonMode) {
                if (!hasTriggeredNextEpisodeRef.current) {
                    hasTriggeredNextEpisodeRef.current = true
                    if (videoRef.current) videoRef.current.pause()
                    configRef.current.onNextEpisode()
                }
            } else {
                if (!hasTriggeredNextEpisodeRef.current) {
                    hasTriggeredNextEpisodeRef.current = true
                    const timer = setTimeout(() => {
                        if (videoRef.current) videoRef.current.pause()
                        configRef.current.onNextEpisode?.()
                    }, tvMode ? 5000 : 1000)
                    return () => clearTimeout(timer)
                }
            }
        }
    }, [videoEnded, hasNextEpisode, autoPlayNextEpisode, tvMode, marathonMode, mediaFormat, videoRef, episodeNumber])

    // ── Cleanup ───────────────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
            if (nextEpisodeTimerRef.current) clearTimeout(nextEpisodeTimerRef.current)
        }
    }, [])

    return {
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
        showCountdown,
        processTimeUpdates,
        checkManualSkipOverrides,
        undoSkip,
    }
}
