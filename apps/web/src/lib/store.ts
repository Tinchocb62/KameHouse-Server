import { create, StateCreator } from "zustand"
import { persist } from "zustand/middleware"

// --- UI Slice ---
export interface UIState {
    sidebarOpen: boolean
    searchQuery: string
    isVideoActive: boolean
    bgMusicEnabled: boolean
    bgMusicVolume: number
    uiSoundsEnabled: boolean
    uiSoundsVolume: number
    isGlobalMuted: boolean
    globalQueueOpen: boolean
    dynamicBackdropEnabled: boolean
    dynamicBackdropMotionEnabled: boolean
    setSidebarOpen: (open: boolean) => void
    setSearchQuery: (query: string) => void
    setVideoActive: (active: boolean) => void
    setBgMusicEnabled: (enabled: boolean) => void
    setBgMusicVolume: (volume: number) => void
    setUiSoundsEnabled: (enabled: boolean) => void
    setUiSoundsVolume: (volume: number) => void
    setGlobalMuted: (muted: boolean) => void
    setGlobalQueueOpen: (open: boolean) => void
    setDynamicBackdropEnabled: (enabled: boolean) => void
    setDynamicBackdropMotionEnabled: (enabled: boolean) => void
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
    bgMusicEnabled: false,
    bgMusicVolume: 0.25,
    uiSoundsEnabled: true,
    uiSoundsVolume: 1.0,
    isGlobalMuted: false,
    globalQueueOpen: false,
    dynamicBackdropEnabled: false,
    dynamicBackdropMotionEnabled: false,
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setVideoActive: (active) => set({ isVideoActive: active }),
    setBgMusicEnabled: (enabled) => set({ bgMusicEnabled: enabled }),
    setBgMusicVolume: (volume) => set({ bgMusicVolume: volume }),
    setUiSoundsEnabled: (enabled) => set({ uiSoundsEnabled: enabled }),
    setUiSoundsVolume: (volume) => set({ uiSoundsVolume: volume }),
    setGlobalMuted: (muted) => set({ isGlobalMuted: muted }),
    setGlobalQueueOpen: (open) => set({ globalQueueOpen: open }),
    setDynamicBackdropEnabled: (enabled) => {
        set({ dynamicBackdropEnabled: enabled })
    },
    setDynamicBackdropMotionEnabled: (enabled) => {
        set({ dynamicBackdropMotionEnabled: enabled })
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
    playbackRate: number
    setPlaybackRate: (rate: number) => void
    preferredAudioLang: string
    setPreferredAudioLang: (lang: string) => void
    preferredSubtitleLang: string
    setPreferredSubtitleLang: (lang: string) => void
    showHeatmap: boolean
    setShowHeatmap: (show: boolean) => void
    aspectRatio: "contain" | "fill" | "cover" | "16/9"
    setAspectRatio: (ratio: "contain" | "fill" | "cover" | "16/9") => void
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
    playbackRate: 1,
    setPlayerVolume: (volume) => set({ playerVolume: volume }),
    setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
    setAutoSkipIntro: (autoSkipIntro) => set({ autoSkipIntro }),
    setAutoSkipOutro: (autoSkipOutro) => set({ autoSkipOutro }),
    setPlaybackRate: (playbackRate) => set({ playbackRate }),
    preferredAudioLang: "jpn",
    setPreferredAudioLang: (preferredAudioLang) => set({ preferredAudioLang }),
    preferredSubtitleLang: "spa",
    setPreferredSubtitleLang: (preferredSubtitleLang) => set({ preferredSubtitleLang }),
    showHeatmap: true,
    setShowHeatmap: (showHeatmap) => set({ showHeatmap }),
    aspectRatio: "contain",
    setAspectRatio: (aspectRatio) => set({ aspectRatio }),
    subtitleSize: 100,
    setSubtitleSize: (subtitleSize) => set({ subtitleSize }),
    loopEnabled: false,
    setLoopEnabled: (loopEnabled) => set({ loopEnabled }),
    autoDisableSubtitlesWhenDubbed: true,
    setAutoDisableSubtitlesWhenDubbed: (autoDisableSubtitlesWhenDubbed) => set({ autoDisableSubtitlesWhenDubbed }),
    marathonMode: false,
    setMarathonMode: (marathonMode) => set({ marathonMode }),
    tvMode: false,
    setTvMode: (tvMode) => set((state) => ({
        tvMode,
        ...(tvMode ? {
            autoSkipIntro: true,
            autoSkipOutro: true,
            marathonMode: true,
        } : {}),
    })),
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
                const p = persistedState as any
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
                uiSoundsEnabled: state.uiSoundsEnabled,
                uiSoundsVolume: state.uiSoundsVolume,
                isGlobalMuted: state.isGlobalMuted,
                autoSkipIntro: state.autoSkipIntro,
                autoSkipOutro: state.autoSkipOutro,
                playbackRate: state.playbackRate,
                preferredAudioLang: state.preferredAudioLang,
                preferredSubtitleLang: state.preferredSubtitleLang,
                showHeatmap: state.showHeatmap,
                aspectRatio: state.aspectRatio,
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
            seriesSkipTimes: (() => {
                try {
                    const settingsStr = typeof window !== "undefined" ? localStorage.getItem("kamehouse-app-settings") : null
                    if (settingsStr) {
                        const parsed = JSON.parse(settingsStr) as { state?: { seriesSkipTimes?: Record<string, { opStart?: number; opEnd?: number; edOffset?: number; edEnd?: number }> } }
                        if (parsed?.state?.seriesSkipTimes) {
                            return parsed.state.seriesSkipTimes
                        }
                    }
                } catch (e) {
                    console.error("Failed to migrate seriesSkipTimes", e)
                }
                return {}
            })(),
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
        }
    )
)
