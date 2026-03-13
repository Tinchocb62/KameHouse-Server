/**
 * useEpisodeSources.ts
 *
 * TanStack Query hook that hits GET /api/v1/streaming/:mediaId/episode/:epNum/sources
 * and returns a typed EpisodeSourcesResponse.
 *
 * Design:
 * - Disabled until both mediaId and epNum are provided (no speculative firing).
 * - staleTime = 5 min — Torrentio results don't change frequently.
 * - Exposes `prefetchEpisodeSources(queryClient, params)` for onMouseEnter prefetching.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { EpisodeSourcesParams, EpisodeSourcesResponse } from "@/api/types/unified.types"

/** Stale window: 5 minutes — Torrentio index doesn't change more frequently. */
const EPISODE_SOURCES_STALE_MS = 1_000 * 60 * 5

/** Cache time: 15 minutes — keeps the result alive while the user browses the EP list. */
const EPISODE_SOURCES_GC_MS = 1_000 * 60 * 15

// ─────────────────────────────────────────────────────────────────────────────
// Query key factory
// ─────────────────────────────────────────────────────────────────────────────

export const episodeSourcesKey = (mediaId: number, epNum: number) =>
    ["streaming/episode-sources", mediaId, epNum] as const

// ─────────────────────────────────────────────────────────────────────────────
// Fetch function
// ─────────────────────────────────────────────────────────────────────────────

type ApiDataResponse<T> = { data: T }

async function fetchEpisodeSources(params: EpisodeSourcesParams): Promise<EpisodeSourcesResponse> {
    const url = `/api/v1/streaming/${params.mediaId}/episode/${params.epNum}/sources`
    const res = await fetch(url)
    if (!res.ok) {
        throw new Error(`episode-sources: ${res.status} ${res.statusText} (media=${params.mediaId} ep=${params.epNum})`)
    }
    const json = (await res.json()) as ApiDataResponse<EpisodeSourcesResponse>
    return json.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves all available playback sources for a specific episode.
 *
 * @param params  mediaId + epNum. Pass `null` to keep the query dormant.
 * @param enabled Additional gate — set to false to defer fetching until the
 *                user explicitly requests the sources (e.g. opens the player).
 *
 * @example
 * ```tsx
 * const { data: sources, isLoading } = useEpisodeSources({ mediaId: 42, epNum: 5 })
 * ```
 */
export function useEpisodeSources(
    params: EpisodeSourcesParams | null,
    { enabled = true }: { enabled?: boolean } = {},
) {
    return useQuery({
        queryKey: params ? episodeSourcesKey(params.mediaId, params.epNum) : (["streaming/episode-sources", null] as const),
        queryFn: () => fetchEpisodeSources(params!),
        enabled: enabled && !!params?.mediaId && !!params?.epNum,
        staleTime: EPISODE_SOURCES_STALE_MS,
        gcTime: EPISODE_SOURCES_GC_MS,
        retry: 1,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Prefetch helper — call on onMouseEnter so data is ready before the click
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Eagerly primes the React Query cache for the given episode.
 * Safe to call multiple times — TanStack Query deduplicates in-flight requests.
 *
 * @example
 * ```tsx
 * const queryClient = useQueryClient()
 * <button onMouseEnter={() => prefetchEpisodeSources(queryClient, { mediaId, epNum })}>
 *   Play
 * </button>
 * ```
 */
export function usePrefetchEpisodeSources() {
    const queryClient = useQueryClient()
    return (params: EpisodeSourcesParams) => {
        void queryClient.prefetchQuery({
            queryKey: episodeSourcesKey(params.mediaId, params.epNum),
            queryFn: () => fetchEpisodeSources(params),
            staleTime: EPISODE_SOURCES_STALE_MS,
        })
    }
}
