/**
 * unified.types.ts
 *
 * Hand-written types mirroring the Go structs in core/resolver.go.
 * Do NOT merge into api/generated/types.ts — that file is auto-generated.
 */

export type SourceType = "Local" | "Torrent" | "Debrid"

export interface SourceMetadata {
    bitrate?: number
    seeders?: number
}

export interface MediaSource {
    type: SourceType
    urlPath: string
    quality: string
    resolution: number
    provider: string
    size: number
    seeders: number
    rank: number
}

export interface UnifiedResolutionResponse {
    title: string
    id: string
    availabilityType: "FULL_LOCAL" | "HYBRID" | "ONLY_ONLINE"
    sources: MediaSource[]
}

export interface ResolveStreamsParams {
    mediaId: number
    episode: number
    mediaType?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Episode Sources — mirrors Go dto.EpisodeSourcesResponse
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors `dto.SourceType` constants on the server.
 * - `"local"`     → file on disk, served via /api/v1/directstream/local
 * - `"torrentio"` → magnet URI resolved via Torrentio/Debrid
 */
export type EpisodeSourceType = "local" | "torrentio"

export interface EpisodeSource {
    /** Discriminates between local and online sources. */
    type: EpisodeSourceType
    /** For local: `/api/v1/directstream/local?id=<stableId>`. For torrentio: magnet URI. */
    url: string
    /** Physical filesystem path — only present for local sources. */
    path?: string
    /** Human-readable quality label, e.g. "1080p", "4K". */
    quality: string
    /** Lower number = higher priority. Local = 1, Debrid = 2, Torrent = 3. */
    priority: number
    /** Display title, e.g. release group name or "Local — Episode 5". */
    title: string
}

export interface EpisodeSourcesResponse {
    episodeNumber: number
    /** Optional episode title from metadata. */
    title?: string
    sources: EpisodeSource[]
    /**
     * The source type the player should auto-select.
     * Equals the `type` of the highest-priority source in `sources`.
     * Empty string when no sources were resolved.
     */
    playSource: EpisodeSourceType | ""
}

export interface EpisodeSourcesParams {
    mediaId: number
    epNum: number
}
