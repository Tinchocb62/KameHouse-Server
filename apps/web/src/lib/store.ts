import { create, StateCreator } from "zustand"
import { persist } from "zustand/middleware"

// --- UI Slice ---
export interface UIState {
    sidebarOpen: boolean
    activeTheme: string
    searchQuery: string
    setSidebarOpen: (open: boolean) => void
    setActiveTheme: (theme: string) => void
    setSearchQuery: (query: string) => void
}

// --- Scanner Slice ---
export interface ScannerState {
    isScanning: boolean
    scanProgress: number
    currentScanningFile: string
    setScanning: (isScanning: boolean) => void
    setScanProgress: (progress: number) => void
    setScanningFile: (file: string) => void
}

export const createScannerSlice: StateCreator<UIState & PlayerState & ScannerState, [], [], ScannerState> = (set) => ({
    isScanning: false,
    scanProgress: 0,
    currentScanningFile: "",
    setScanning: (isScanning) => set({ isScanning }),
    setScanProgress: (scanProgress) => set({ scanProgress }),
    setScanningFile: (currentScanningFile) => set({ currentScanningFile }),
})

export const createUISlice: StateCreator<UIState & PlayerState, [], [], UIState> = (set) => ({
    sidebarOpen: true,
    activeTheme: "dark",
    searchQuery: "",
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setActiveTheme: (theme) => set({ activeTheme: theme }),
    setSearchQuery: (query) => set({ searchQuery: query }),
})

// --- Player Slice ---
export interface PlayerState {
    playerVolume: number
    videoQualities: string[]
    currentQuality: string
    isFullscreen: boolean
    setPlayerVolume: (volume: number) => void
    setVideoQualities: (qualities: string[]) => void
    setCurrentQuality: (quality: string) => void
    setFullscreen: (fullscreen: boolean) => void
}

export const createPlayerSlice: StateCreator<UIState & PlayerState, [], [], PlayerState> = (set) => ({
    playerVolume: 1,
    videoQualities: ["1080p"],
    currentQuality: "1080p",
    isFullscreen: false,
    setPlayerVolume: (volume) => set({ playerVolume: volume }),
    setVideoQualities: (qualities) => set({ videoQualities: qualities }),
    setCurrentQuality: (quality) => set({ currentQuality: quality }),
    setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
})

// --- Combined Store ---
export const useAppStore = create<UIState & PlayerState & ScannerState>()((...a) => ({
    ...createUISlice(...a),
    ...createPlayerSlice(...a),
    ...createScannerSlice(...a),
}))

// --- Progress Store (Persisted) ---
interface ProgressState {
    watchedEpisodes: string[] // Array of episode IDs
    markWatched: (episodeId: string) => void
    unmarkWatched: (episodeId: string) => void
    isWatched: (episodeId: string) => boolean
}

export const useProgressStore = create<ProgressState>()(
    persist(
        (set, get) => ({
            watchedEpisodes: [],
            markWatched: (episodeId) =>
                set((state) => ({
                    watchedEpisodes: state.watchedEpisodes.includes(episodeId)
                        ? state.watchedEpisodes
                        : [...state.watchedEpisodes, episodeId],
                })),
            unmarkWatched: (episodeId) =>
                set((state) => ({
                    watchedEpisodes: state.watchedEpisodes.filter((id) => id !== episodeId),
                })),
            isWatched: (episodeId) => get().watchedEpisodes.includes(episodeId),
        }),
        {
            name: "kamehouse-minimal-progress", // Key in localStorage
        }
    )
)
