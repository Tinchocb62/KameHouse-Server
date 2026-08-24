import type {
    Anime_Episode,
    Anime_LibraryCollectionEntry,
    Models_LibraryMedia,
    MediaCandidate,
    SelectionResult,
} from "@/api/generated/types"

export type CardAspect = "poster" | "wide" | "square"

/**
 * ContentTag mirrors the Go backend enum in internal/library/anime/intelligence.go
 */
export type ContentTag = "FILLER" | "EPIC" | "CANON" | "SPECIAL" | "HYPED" | "EMOTIONAL" | "INTENSE" | "CHILL"

/**
 * EpisodeIntelligence carries computed intelligence about a single episode or movie.
 * Mirrors the Go struct in internal/library/anime/intelligence.go
 */
export interface EpisodeIntelligence {
    /** 0–10 score derived from backend providers */
    rating: number
    /** Whether the episode is considered filler */
    isFiller: boolean
    /** Name of the narrative arc this episode belongs to */
    arcName: string
    /** Categorization tag (e.g. EPIC, FILLER) */
    tag: ContentTag
    /** Thematic or emotional vibes */
    vibes?: string[]
}

/**
 * An entry enriched with optional intelligence data.
 */
export interface IntelligentEntry extends Omit<Anime_LibraryCollectionEntry, "episode" | "dominantVibe" | "vibes" | "tags"> {
    /** Aggregated or specific intelligence for the item */
    intelligence?: EpisodeIntelligence
    /** AI-derived tags (Character, Technique, Lore) */
    tags?: string[]
    /** Primary vibe detected by the AI engine */
    dominantVibe?: string
    /** Thematic vibes for filtering */
    vibes?: string[]
    /** Local episode data if this entry is an episode swimlane */
    episode?: Anime_Episode
}

/**
 * CuratedSwimlane represents a row of content on the home page.
 * Mirrors the Go struct in internal/library/anime/intelligence.go
 */
export interface CuratedSwimlane {
    id: string
    title: string
    /** Row identifier: "local_library" | "epic_moments" | "essential_cinema" | "trending" */
    type: string
    /** Enriched entries for this lane */
    entries: IntelligentEntry[]
}

/**
 * CuratedHomeResponse is the envelope for the curated home page sections.
 */
export interface CuratedHomeResponse {
    swimlanes: CuratedSwimlane[]
}

/**
 * ContinueWatchingEntry represents a media item to resume.
 * Syncs with the backend dto.ContinueWatchingItem in models/dto/continue_watching_dto.go
 */
export interface ContinueWatchingEntry {
    media: Models_LibraryMedia
    episode: Anime_Episode
    /** 0-1 playback percentage progress */
    progress: number
    /** Last known position in seconds (mirrors LastPlaybackPos in Go) */
    lastPlaybackPos: number
    /** True if this is the next episode in the sequence */
    isNextEpisode: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Intelligent Selection Engine Types
// Re-exported from @/api/generated/types
// ─────────────────────────────────────────────────────────────────────────────

export type { MediaCandidate, SelectionResult }

export interface ScoringWeights {
    resolution: number
    codec: number
    bitrate: number
    audioMatch: number
}

export interface IntelligenceStats {
    weights: ScoringWeights
    cache: {
        size: number
        maxSize: number
        maxAge: number
    }
}
