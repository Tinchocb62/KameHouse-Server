import { create, StateCreator } from "zustand"
import { persist } from "zustand/middleware"

// --- UI Slice ---
export interface BackgroundMusicTrack {
    name: string
    file: string
}

export interface UIState {
    sidebarOpen: boolean
    searchQuery: string
    isVideoActive: boolean
    bgMusicEnabled: boolean
    bgMusicVolume: number
    bgMusicDir: string
    bgMusicTracks: BackgroundMusicTrack[]
    uiSoundsEnabled: boolean
    uiSoundsVolume: number
    globalQueueOpen: boolean
    dynamicBackdropEnabled: boolean
    dynamicBackdropMotionEnabled: boolean
    eraOpeningPlaying: boolean
    showInitialSetup: boolean
    activeSeriesContext: string | null
    seriesSoundtrackMode: boolean
    setSidebarOpen: (open: boolean) => void
    setSearchQuery: (query: string) => void
    setVideoActive: (active: boolean) => void
    setBgMusicEnabled: (enabled: boolean) => void
    setBgMusicVolume: (volume: number) => void
    setBgMusicDir: (dir: string) => void
    setBgMusicTracks: (tracks: BackgroundMusicTrack[]) => void
    setUiSoundsEnabled: (enabled: boolean) => void
    setUiSoundsVolume: (volume: number) => void
    setGlobalQueueOpen: (open: boolean) => void
    setDynamicBackdropEnabled: (enabled: boolean) => void
    setDynamicBackdropMotionEnabled: (enabled: boolean) => void
    setEraOpeningPlaying: (playing: boolean) => void
    setShowInitialSetup: (show: boolean) => void
    setActiveSeriesContext: (context: string | null) => void
    setSeriesSoundtrackMode: (enabled: boolean) => void
}

import { type ScannerMessage } from "@/lib/server/ws-events"

export interface ScanEvent extends ScannerMessage {
    id: string
    timestamp: number
}

// --- Scanner Slice ---
export interface ScannerState {
    isScanning: boolean
    scanProgress: number
    currentScanningFile: string
    events: ScanEvent[]
    activeStageIdx: number
    lastFinish: ScanEvent | null
    pruneCount: number
    setScanning: (isScanning: boolean) => void
    setScanProgress: (progress: number) => void
    setScanningFile: (file: string) => void
    setEvents: (events: ScanEvent[] | ((prev: ScanEvent[]) => ScanEvent[])) => void
    setScannerState: (state: Partial<ScannerState>) => void
}

export const createScannerSlice: StateCreator<UIState & PlayerState & ScannerState, [], [], ScannerState> = (set) => ({
    isScanning: false,
    scanProgress: 0,
    currentScanningFile: "",
    events: [],
    activeStageIdx: -1,
    lastFinish: null,
    pruneCount: 0,
    setScanning: (isScanning) => set({ isScanning }),
    setScanProgress: (scanProgress) => set({ scanProgress }),
    setScanningFile: (currentScanningFile) => set({ currentScanningFile }),
    setEvents: (events) => set((state) => ({ 
        events: typeof events === "function" ? events(state.events) : events 
    })),
    setScannerState: (state) => set((s) => ({ ...s, ...state })),
})

export const createUISlice: StateCreator<UIState & PlayerState, [], [], UIState> = (set) => ({
    sidebarOpen: false,
    searchQuery: "",
    isVideoActive: false,
    bgMusicEnabled: true,
    bgMusicVolume: 0.25,
    bgMusicDir: "",
    bgMusicTracks: [],
    uiSoundsEnabled: true,
    uiSoundsVolume: 1.0,
    globalQueueOpen: false,
    dynamicBackdropEnabled: true,
    dynamicBackdropMotionEnabled: true,
    eraOpeningPlaying: false,
    showInitialSetup: false,
    activeSeriesContext: null,
    seriesSoundtrackMode: true,
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL: Corte síncrono de audio en setters de Zustand.
    // Al mutar el estado, pausamos directamente la instancia global de audio en window
    // para garantizar una respuesta inmediata en 0ms sin depender del ciclo de React.
    // ═══════════════════════════════════════════════════════════════════════════
    setVideoActive: (active) => {
        set({ isVideoActive: active })
        if (active && typeof window !== "undefined" && (window as any).__kamehouse_bg_audio) {
            try {
                (window as any).__kamehouse_bg_audio.pause()
            } catch {}
        }
    },
    setBgMusicEnabled: (enabled) => {
        set({ bgMusicEnabled: enabled })
        if (!enabled && typeof window !== "undefined" && (window as any).__kamehouse_bg_audio) {
            try {
                (window as any).__kamehouse_bg_audio.pause()
            } catch {}
        }
    },
    setBgMusicVolume: (volume) => {
        set({ bgMusicVolume: volume })
        if (typeof window !== "undefined" && (window as any).__kamehouse_bg_audio) {
            try {
                (window as any).__kamehouse_bg_audio.volume = Math.pow(volume, 2)
            } catch {}
        }
    },
    setBgMusicDir: (dir) => set({ bgMusicDir: dir }),
    setBgMusicTracks: (tracks) => set({ bgMusicTracks: tracks }),
    setUiSoundsEnabled: (enabled) => set({ uiSoundsEnabled: enabled }),
    setUiSoundsVolume: (volume) => set({ uiSoundsVolume: volume }),
    setGlobalQueueOpen: (open) => set({ globalQueueOpen: open }),
    setDynamicBackdropEnabled: (enabled) => {
        set({ dynamicBackdropEnabled: enabled })
    },
    setDynamicBackdropMotionEnabled: (enabled) => {
        set({ dynamicBackdropMotionEnabled: enabled })
    },
    setEraOpeningPlaying: (playing) => {
        set({ eraOpeningPlaying: playing })
        if (playing && typeof window !== "undefined" && (window as any).__kamehouse_bg_audio) {
            try {
                (window as any).__kamehouse_bg_audio.pause()
            } catch {}
        }
    },
    setShowInitialSetup: (show) => {
        set({ showInitialSetup: show })
    },
    setActiveSeriesContext: (context) => {
        set({ activeSeriesContext: context })
    },
    setSeriesSoundtrackMode: (enabled) => {
        set({ seriesSoundtrackMode: enabled })
    },
})

export interface PlaylistItem {
    id: string | number
    title: string
    subtitle?: string
    playableUrl: string
    thumbnail?: string
    mediaId: number
    episodeNumber?: number
    malId?: number | null
    mediaFormat?: string | null
}

// --- Player Slice ---
export interface PlayerState {
    playerVolume: number
    isFullscreen: boolean
    setPlayerVolume: (volume: number) => void
    setFullscreen: (fullscreen: boolean) => void
    autoSkipIntro: boolean
    setAutoSkipIntro: (auto: boolean) => void
    autoSkipOutro: boolean
    setAutoSkipOutro: (auto: boolean) => void
    skipStepSeconds: number
    setSkipStepSeconds: (seconds: number) => void
    playbackRate: number
    setPlaybackRate: (rate: number) => void
    preferredAudioProfile: "latino" | "castellano" | "japanese" | "english" | "auto"
    setPreferredAudioProfile: (profile: "latino" | "castellano" | "japanese" | "english" | "auto") => void
    preferredAudioLang: string
    setPreferredAudioLang: (lang: string) => void
    preferredAudioTrackIndex: Record<number, number>
    setPreferredAudioTrackIndex: (mediaId: number, index: number) => void
    preferredSubtitleLang: string
    setPreferredSubtitleLang: (lang: string) => void
    subtitlesEnabled: boolean
    setSubtitlesEnabled: (enabled: boolean) => void
    filterFillers: boolean
    setFilterFillers: (enabled: boolean) => void
    autoSkipFiller: boolean
    setAutoSkipFiller: (enabled: boolean) => void
    showHeatmap: boolean
    setShowHeatmap: (show: boolean) => void
    aspectRatio: "contain" | "fill" | "cover" | "16/9"
    setAspectRatio: (ratio: "contain" | "fill" | "cover" | "16/9") => void
    // Override por serie (keyed por mediaId): cada serie tiene su propio formato
    // de imagen (4:3 en DB/DBZ vs 16:9 en Super), así que el ajuste se recuerda
    // por serie en vez de global. El global queda como fallback.
    aspectRatioBySeries: Record<number, "contain" | "fill" | "cover" | "16/9">
    setAspectRatioForSeries: (mediaId: number, ratio: "contain" | "fill" | "cover" | "16/9") => void
    subtitleSize: number
    setSubtitleSize: (size: number) => void
    loopEnabled: boolean
    setLoopEnabled: (enabled: boolean) => void
    autoDisableSubtitlesWhenDubbed: boolean
    setAutoDisableSubtitlesWhenDubbed: (auto: boolean) => void
    marathonMode: boolean
    setMarathonMode: (enabled: boolean) => void
    tvMode: boolean
    setTvMode: (enabled: boolean) => void
    // Snapshot of the skip/marathon prefs before TV mode force-enabled them,
    // so they can be restored when TV mode is turned off. Not persisted.
    tvModePrevPrefs: { autoSkipIntro: boolean; autoSkipOutro: boolean; marathonMode: boolean } | null
    ambientModeEnabled: boolean
    setAmbientModeEnabled: (enabled: boolean) => void

    playlistQueue: PlaylistItem[]
    currentQueueIndex: number
    activeQueuePlayItem: PlaylistItem | null
    addToQueue: (item: PlaylistItem) => void
    removeFromQueue: (index: number) => void
    clearQueue: () => void
    setCurrentQueueIndex: (index: number) => void
    setActiveQueuePlayItem: (item: PlaylistItem | null) => void
    playNext: (item: PlaylistItem) => void
}

export const createPlayerSlice: StateCreator<UIState & PlayerState, [], [], PlayerState> = (set) => ({
    playerVolume: 1,
    isFullscreen: false,
    autoSkipIntro: false,
    autoSkipOutro: false,
    skipStepSeconds: 85,
    playbackRate: 1,
    setPlayerVolume: (volume) => set({ playerVolume: volume }),
    setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
    setAutoSkipIntro: (autoSkipIntro) => set({ autoSkipIntro }),
    setAutoSkipOutro: (autoSkipOutro) => set({ autoSkipOutro }),
    setSkipStepSeconds: (skipStepSeconds) => set({ skipStepSeconds }),
    setPlaybackRate: (playbackRate) => set({ playbackRate }),
    preferredAudioProfile: "latino",
    setPreferredAudioProfile: (preferredAudioProfile) => set({ preferredAudioProfile }),
    preferredAudioLang: "spa-lat",
    setPreferredAudioLang: (preferredAudioLang) => set({ preferredAudioLang }),
    preferredAudioTrackIndex: {},
    setPreferredAudioTrackIndex: (mediaId, index) => set((state) => ({ 
        preferredAudioTrackIndex: { ...state.preferredAudioTrackIndex, [mediaId]: index } 
    })),
    preferredSubtitleLang: "spa",
    setPreferredSubtitleLang: (preferredSubtitleLang) => set({ preferredSubtitleLang }),
    subtitlesEnabled: true,
    setSubtitlesEnabled: (subtitlesEnabled) => set({ subtitlesEnabled }),
    filterFillers: false,
    setFilterFillers: (filterFillers) => set({ filterFillers }),
    autoSkipFiller: false,
    setAutoSkipFiller: (autoSkipFiller) => set({ autoSkipFiller }),
    showHeatmap: true,
    setShowHeatmap: (showHeatmap) => set({ showHeatmap }),
    aspectRatio: "contain",
    setAspectRatio: (aspectRatio) => set({ aspectRatio }),
    aspectRatioBySeries: {},
    setAspectRatioForSeries: (mediaId, ratio) => set((state) => ({
        aspectRatioBySeries: { ...state.aspectRatioBySeries, [mediaId]: ratio }
    })),
    subtitleSize: 100,
    setSubtitleSize: (subtitleSize) => set({ subtitleSize }),
    loopEnabled: false,
    setLoopEnabled: (loopEnabled) => set({ loopEnabled }),
    autoDisableSubtitlesWhenDubbed: true,
    setAutoDisableSubtitlesWhenDubbed: (autoDisableSubtitlesWhenDubbed) => set({ autoDisableSubtitlesWhenDubbed }),
    marathonMode: false,
    setMarathonMode: (marathonMode) => set({ marathonMode }),
    tvMode: false,
    tvModePrevPrefs: null,
    setTvMode: (tvMode) => set((state) => {
        if (tvMode) {
            // Entering TV mode: snapshot current prefs (unless already in TV mode)
            // and force-enable the lean-back behavior.
            return {
                tvMode: true,
                tvModePrevPrefs: state.tvModePrevPrefs ?? {
                    autoSkipIntro: state.autoSkipIntro,
                    autoSkipOutro: state.autoSkipOutro,
                    marathonMode: state.marathonMode,
                },
                autoSkipIntro: true,
                autoSkipOutro: true,
                marathonMode: true,
            }
        }
        // Leaving TV mode: restore the snapshot (fallback to defaults if TV mode
        // was enabled via ?tvMode=true without a prior snapshot).
        const prev = state.tvModePrevPrefs ?? { autoSkipIntro: false, autoSkipOutro: false, marathonMode: false }
        return {
            tvMode: false,
            tvModePrevPrefs: null,
            autoSkipIntro: prev.autoSkipIntro,
            autoSkipOutro: prev.autoSkipOutro,
            marathonMode: prev.marathonMode,
        }
    }),
    ambientModeEnabled: true,
    setAmbientModeEnabled: (ambientModeEnabled) => set({ ambientModeEnabled }),

    playlistQueue: [],
    currentQueueIndex: -1,
    activeQueuePlayItem: null,
    addToQueue: (item) => set((state) => {
        const exists = state.playlistQueue.some(i => i.id === item.id && i.episodeNumber === item.episodeNumber);
        if (exists) return { globalQueueOpen: true };
        return { 
            playlistQueue: [...state.playlistQueue, item],
            globalQueueOpen: true
        };
    }),
    removeFromQueue: (index) => set((state) => {
        const nextQueue = state.playlistQueue.filter((_, i) => i !== index);
        let nextIndex = state.currentQueueIndex;
        if (index === state.currentQueueIndex) {
            nextIndex = nextQueue.length > 0 ? Math.min(index, nextQueue.length - 1) : -1;
        } else if (index < state.currentQueueIndex) {
            nextIndex = state.currentQueueIndex - 1;
        }

        let nextPlayItem = state.activeQueuePlayItem;
        if (nextIndex === -1) {
            nextPlayItem = null;
        } else if (index === state.currentQueueIndex || index < state.currentQueueIndex) {
            nextPlayItem = nextQueue[nextIndex] || null;
        }

        return {
            playlistQueue: nextQueue,
            currentQueueIndex: nextIndex,
            activeQueuePlayItem: nextPlayItem
        };
    }),
    clearQueue: () => set({ playlistQueue: [], currentQueueIndex: -1, activeQueuePlayItem: null }),
    setCurrentQueueIndex: (index) => set((state) => {
        const item = state.playlistQueue[index] || null;
        return { currentQueueIndex: index, activeQueuePlayItem: item };
    }),
    setActiveQueuePlayItem: (item) => set((state) => {
        if (!item) {
            return { activeQueuePlayItem: null, currentQueueIndex: -1 };
        }
        const idx = state.playlistQueue.findIndex(i => i.id === item.id && i.episodeNumber === item.episodeNumber);
        return { activeQueuePlayItem: item, currentQueueIndex: idx };
    }),
    playNext: (item) => set((state) => {
        const nextQueue = [...state.playlistQueue];
        const existingIdx = nextQueue.findIndex(i => i.id === item.id && i.episodeNumber === item.episodeNumber);
        if (existingIdx !== -1) {
            nextQueue.splice(existingIdx, 1);
        }
        const insertIdx = state.currentQueueIndex + 1;
        nextQueue.splice(insertIdx, 0, item);
        return { playlistQueue: nextQueue };
    }),
})

// --- Combined Store ---
export const useAppStore = create<UIState & PlayerState & ScannerState>()(
    persist(
        (...a) => ({
            ...createUISlice(...a),
            ...createPlayerSlice(...a),
            ...createScannerSlice(...a),
        }),
        {
            name: "kamehouse-app-settings",
            merge: (persistedState, currentState) => {
                const p = persistedState as (Partial<UIState & PlayerState & ScannerState> & { aspectRatio?: string; sidebarOpen?: unknown }) | undefined
                if (p && (p.aspectRatio === "fill" || p.aspectRatio === "16/9")) {
                    p.aspectRatio = "contain"
                }
                if (p && typeof p.sidebarOpen !== 'undefined') {
                    delete p.sidebarOpen
                }
                return { ...currentState, ...p }
            },
            partialize: (state) => ({
                // Solo persistimos lo que queremos que sobreviva

                bgMusicEnabled: state.bgMusicEnabled,
                bgMusicVolume: state.bgMusicVolume,
                bgMusicDir: state.bgMusicDir,
                bgMusicTracks: state.bgMusicTracks,
                uiSoundsEnabled: state.uiSoundsEnabled,
                uiSoundsVolume: state.uiSoundsVolume,
                autoSkipIntro: state.autoSkipIntro,
                autoSkipOutro: state.autoSkipOutro,
                skipStepSeconds: state.skipStepSeconds,
                playbackRate: state.playbackRate,
                preferredAudioLang: state.preferredAudioLang,
                preferredAudioTrackIndex: state.preferredAudioTrackIndex,
                preferredSubtitleLang: state.preferredSubtitleLang,
                subtitlesEnabled: state.subtitlesEnabled,
                showHeatmap: state.showHeatmap,
                aspectRatio: state.aspectRatio,
                aspectRatioBySeries: state.aspectRatioBySeries,
                subtitleSize: state.subtitleSize,
                loopEnabled: state.loopEnabled,
                autoDisableSubtitlesWhenDubbed: state.autoDisableSubtitlesWhenDubbed,
                playerVolume: state.playerVolume,
                marathonMode: state.marathonMode,
                tvMode: state.tvMode,
                ambientModeEnabled: state.ambientModeEnabled,
                dynamicBackdropEnabled: state.dynamicBackdropEnabled,
                dynamicBackdropMotionEnabled: state.dynamicBackdropMotionEnabled,
            }),
        }
    )
)

// --- Progress Store (Persisted) ---
// Uses Record<string, true> instead of string[] for O(1) isWatched() lookups.
interface ProgressState {
    watchedEpisodes: Record<string, true>
    markWatched: (episodeId: string) => void
    unmarkWatched: (episodeId: string) => void
    isWatched: (episodeId: string) => boolean
}

export const useProgressStore = create<ProgressState>()(
    persist(
        (set, get) => ({
            watchedEpisodes: {},
            markWatched: (episodeId) =>
                set((state) => ({
                    watchedEpisodes: { ...state.watchedEpisodes, [episodeId]: true },
                })),
            unmarkWatched: (episodeId) =>
                set((state) => {
                    const next = { ...state.watchedEpisodes }
                    delete next[episodeId]
                    return { watchedEpisodes: next }
                }),
            isWatched: (episodeId) => episodeId in get().watchedEpisodes,
        }),
        {
            name: "kamehouse-minimal-progress",
            // Migrate old string[] format from localStorage to Record<string, true>
            merge: (persisted, current) => {
                const p = persisted as Partial<ProgressState> & { watchedEpisodes?: unknown }
                if (Array.isArray(p.watchedEpisodes)) {
                    const migrated: Record<string, true> = {}
                    for (const id of p.watchedEpisodes as string[]) migrated[id] = true
                    return { ...current, watchedEpisodes: migrated }
                }
                return { ...current, ...p }
            },
        }
    )
)

// --- Skip Times Store (Persisted, Isolated) ---
interface SkipTimesState {
    seriesSkipTimes: Record<string, { opStart?: number; opEnd?: number; edOffset?: number; edEnd?: number }>
    saveSeriesSkipTimes: (key: string | number, opStart: number, opEnd: number, edOffset: number, edEnd?: number) => void
}

export const useSkipTimesStore = create<SkipTimesState>()(
    persist(
        (set) => ({
            seriesSkipTimes: {},
            saveSeriesSkipTimes: (key, opStart, opEnd, edOffset, edEnd) =>
                set(state => ({
                    seriesSkipTimes: {
                        ...state.seriesSkipTimes,
                        [String(key)]: { opStart, opEnd, edOffset, edEnd }
                    }
                })),
        }),
        {
            name: "kamehouse-skip-times",
            version: 2,
            migrate: (persistedState: unknown, version: number) => {
                // v1 → v2: purge corrupt marks produced by the acoustic fingerprint scanner
                // (which stored intro-end at ~9:03 due to a secondsPerFrame scaling bug).
                // v0 → v1: same, clear everything.
                if (version < 2) {
                    return { seriesSkipTimes: {} } as SkipTimesState
                }
                return persistedState as SkipTimesState
            },
        }
    )
)
