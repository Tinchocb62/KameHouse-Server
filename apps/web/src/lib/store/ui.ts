import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface UIState {
    sidebarOpen: boolean
    searchQuery: string
    isVideoActive: boolean
    bgMusicEnabled: boolean
    bgMusicVolume: number
    uiSoundsEnabled: boolean
    uiSoundsVolume: number
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
    setGlobalQueueOpen: (open: boolean) => void
    setDynamicBackdropEnabled: (enabled: boolean) => void
    setDynamicBackdropMotionEnabled: (enabled: boolean) => void
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            sidebarOpen: true,
            searchQuery: "",
            isVideoActive: false,
            bgMusicEnabled: false,
            bgMusicVolume: 0.25,
            uiSoundsEnabled: true,
            uiSoundsVolume: 1.0,
            globalQueueOpen: false,
            dynamicBackdropEnabled: true,
            dynamicBackdropMotionEnabled: false,
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            setSearchQuery: (query) => set({ searchQuery: query }),
            setVideoActive: (active) => set({ isVideoActive: active }),
            setBgMusicEnabled: (enabled) => set({ bgMusicEnabled: enabled }),
            setBgMusicVolume: (volume) => set({ bgMusicVolume: volume }),
            setUiSoundsEnabled: (enabled) => set({ uiSoundsEnabled: enabled }),
            setUiSoundsVolume: (volume) => set({ uiSoundsVolume: volume }),
            setGlobalQueueOpen: (open) => set({ globalQueueOpen: open }),
            setDynamicBackdropEnabled: (enabled) => set({ dynamicBackdropEnabled: enabled }),
            setDynamicBackdropMotionEnabled: (enabled) => set({ dynamicBackdropMotionEnabled: enabled }),
        }),
        {
            name: "kamehouse-ui-settings",
            partialize: (state) => ({
                sidebarOpen: state.sidebarOpen,
                bgMusicEnabled: state.bgMusicEnabled,
                bgMusicVolume: state.bgMusicVolume,
                uiSoundsEnabled: state.uiSoundsEnabled,
                uiSoundsVolume: state.uiSoundsVolume,
                dynamicBackdropEnabled: state.dynamicBackdropEnabled,
                dynamicBackdropMotionEnabled: state.dynamicBackdropMotionEnabled,
            }),
        }
    )
)
