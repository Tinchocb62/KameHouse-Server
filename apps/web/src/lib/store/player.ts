import { create } from "zustand"
import { persist } from "zustand/middleware"

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

export const usePlayerStore = create<PlayerState>()(
    persist(
        (set) => ({
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
            setTvMode: (tvMode) => set({ tvMode }),

            playlistQueue: [],
            currentQueueIndex: -1,
            activeQueuePlayItem: null,
            addToQueue: (item) => set((state) => {
                const exists = state.playlistQueue.some(i => i.id === item.id && i.episodeNumber === item.episodeNumber);
                if (exists) return {}; // Need globalQueueOpen from UIStore here, but omitted for now
                return { 
                    playlistQueue: [...state.playlistQueue, item],
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
        }),
        {
            name: "kamehouse-player-settings",
            partialize: (state) => ({
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
            }),
        }
    )
)
