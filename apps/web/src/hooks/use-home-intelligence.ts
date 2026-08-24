import { create } from "zustand"

export type { IntelligentEntry } from "@/api/types/intelligence.types"

interface IntelligenceStore {
    currentBackdropUrl: string | null
    pendingUrl: string | null
    setBackdropUrl: (url: string | null) => void
}

let hoverTimer: ReturnType<typeof setTimeout> | null = null

export const useIntelligenceStore = create<IntelligenceStore>((set) => ({
    currentBackdropUrl: null,
    pendingUrl: null,
    setBackdropUrl: (url) => {
        if (hoverTimer) {
            clearTimeout(hoverTimer)
            hoverTimer = null
        }
        if (url === null) {
            set({ currentBackdropUrl: null, pendingUrl: null })
        } else {
            set({ pendingUrl: url })
            hoverTimer = setTimeout(() => {
                set({ currentBackdropUrl: url })
                hoverTimer = null
            }, 120)
        }
    },
}))
