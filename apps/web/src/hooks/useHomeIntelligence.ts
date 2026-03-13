import { useQuery } from "@tanstack/react-query"
import type {
    Anime_Episode,
    Anime_LibraryCollectionEntry,
    Models_LibraryMedia,
} from "@/api/generated/types"
import { create } from "zustand"
import { getServerBaseUrl } from "@/api/client/server-url"

// ─── Intelligence types (mirrors Go backend) ─────────────────────────────────

export type ContentTag = "FILLER" | "EPIC" | "CANON" | "SPECIAL"

export interface EpisodeIntelligence {
    rating: number       // 0–10
    isFiller: boolean
    arcName: string      // empty when unknown
    tag: ContentTag
}

/** An entry optionally enriched with per-series intelligence from the backend. */
export interface IntelligentEntry extends Anime_LibraryCollectionEntry {
    /** Aggregated intelligence for the series (e.g. highest-scoring episode tag) */
    intelligence?: EpisodeIntelligence
}

export interface CuratedSwimlane {
    id: string
    title: string
    /** "local_library" | "epic_moments" | "essential_cinema" | "trending" */
    type: string
    entries: IntelligentEntry[]
}

export interface CuratedHomeResponse {
    swimlanes: CuratedSwimlane[]
}

export interface ContinueWatchingEntry {
    media: Models_LibraryMedia
    episode: Anime_Episode
    progress: number // 0-1
    isNextEpisode: boolean
}

async function fetchCuratedHome(): Promise<CuratedHomeResponse> {
    const url = new URL(getServerBaseUrl() + "/api/v1/home/curated")
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error("Failed to fetch curated home list")
    const json = (await res.json()) as { data: CuratedHomeResponse }
    return json.data
}

async function fetchContinueWatching(): Promise<ContinueWatchingEntry[]> {
    const url = new URL(getServerBaseUrl() + "/api/v1/home/continue-watching")
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error("Failed to fetch continue watching list")
    const json = (await res.json()) as { data: ContinueWatchingEntry[] }
    return json.data
}

export function useHomeIntelligence() {
    return useQuery({
        queryKey: ["home", "curated"],
        queryFn: fetchCuratedHome,
        staleTime: 1000 * 60 * 5, // 5 min
    })
}

export function useContinueWatching() {
    return useQuery({
        queryKey: ["home", "continue-watching"],
        queryFn: fetchContinueWatching,
        staleTime: 1000 * 60 * 2, // 2 min
    })
}

// ─── Global backdrop store ────────────────────────────────────────────────────

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
        // 150 ms debounce — prevents flickering during fast mouse movements
        if (hoverTimer) clearTimeout(hoverTimer)
        if (url === null) {
            // Clear immediately when leaving entire swimlane
            hoverTimer = setTimeout(() => set({ currentBackdropUrl: null }), 300)
        } else {
            hoverTimer = setTimeout(() => set({ currentBackdropUrl: url }), 150)
        }
    },
}))
