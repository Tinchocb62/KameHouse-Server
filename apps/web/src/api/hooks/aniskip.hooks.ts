/**
 * AniSkip API hook
 * Fetches community-sourced skip times (OP/ED) for anime episodes.
 * API docs: https://api.aniskip.com/v2
 *
 * Strategy: KameHouse uses Platform IDs (AniList). AniSkip requires MAL IDs.
 * We use `idMal` from `Platform_BaseAnime` if available.
 * If not available, we fall back to undefined (no skip times).
 */

import { useQuery } from "@tanstack/react-query"
import { buildSeaQuery } from "@/api/client/requests"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AniSkipType = "op" | "ed" | "mixed-ed" | "mixed-op" | "recap"

export interface AniSkipInterval {
    startTime: number
    endTime: number
}

export interface AniSkipResult {
    interval: AniSkipInterval
    skipType: AniSkipType
    episodeLength: number
}

export interface AniSkipResponse {
    found: boolean
    results?: AniSkipResult[]
    statusCode: number
    message?: string
    error?: string
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchAniSkipTimes(
    malId: number,
    episodeNumber: number,
    episodeDuration?: number,
): Promise<AniSkipResponse> {
    const types = ["op", "ed"].join("&types[]=")
    let url = `https://api.aniskip.com/v2/skip-times/${malId}/${episodeNumber}?types[]=${types}`

    // If we have a known episode duration, pass it for better matching
    if (episodeDuration && episodeDuration > 0) {
        url += `&episodeLength=${Math.round(episodeDuration)}`
    }

    const res = await fetch(url)

    if (!res.ok) {
        // AniSkip returns 404 when no skip times found, and 400 for invalid
        // MAL id / episode numbers (e.g. an episode beyond the mapped range).
        // Neither is a real error for us — just treat as "no skip times".
        if (res.status === 404 || res.status === 400) {
            return { found: false, statusCode: res.status } as AniSkipResponse
        }
        throw new Error(`AniSkip API error: ${res.status}`)
    }

    return res.json() as Promise<AniSkipResponse>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAniSkipTimesOptions {
    /** MAL (MyAnimeList) ID — required for AniSkip queries */
    malId?: number | null
    /** 1-indexed episode number */
    episodeNumber?: number | null
    /** Duration of the video in seconds (optional, improves accuracy) */
    episodeDuration?: number
    /** Set to false to disable fetching */
    enabled?: boolean
    /** Local Media ID */
    mediaId?: number | null
}

export interface AniSkipTimes {
    /** Intro / Opening timestamps */
    op?: AniSkipInterval
    /** Outro / Ending timestamps */
    ed?: AniSkipInterval
    opSource?: string
    edSource?: string
    /** Whether any skip times were found */
    hasSkipTimes: boolean
}

interface LocalSkipTimeResponse {
    id: number
    mediaId: number
    episodeNumber: number
    opStart: number
    opEnd: number
    edOffset: number
    edEnd: number
    source: string
    confidence: number
}

export async function getAniSkipTimes({
    malId,
    mediaId,
    episodeNumber,
    episodeDuration,
}: {
    malId?: number | null
    mediaId?: number | null
    episodeNumber: number
    episodeDuration?: number
}): Promise<AniSkipTimes> {
    if ((!malId && !mediaId) || !episodeNumber) {
        return { hasSkipTimes: false }
    }

    // 1. Try local KameHouse server database first
    try {
        const localData = await buildSeaQuery<LocalSkipTimeResponse, any>({
            endpoint: "/api/v1/mediastream/skip-times",
            method: "GET",
            params: {
                mediaId: mediaId || undefined,
                malId: malId || undefined,
                episodeNumber,
            }
        })

        if (localData) {
            const op = localData.opStart > 0 || localData.opEnd > 0 ? {
                startTime: localData.opStart,
                endTime: localData.opEnd,
            } : undefined

            let ed: AniSkipInterval | undefined = undefined
            if (localData.edOffset > 0) {
                const edEndTime = (localData.edEnd && localData.edEnd > 0) ? localData.edEnd : (episodeDuration ?? 0)
                ed = {
                    startTime: localData.edOffset,
                    endTime: edEndTime,
                }
            }

            if (op || ed) {
                return {
                    op,
                    ed,
                    opSource: localData.source,
                    edSource: localData.source,
                    hasSkipTimes: true,
                }
            }
        }
    } catch (e) {
        console.warn("Failed to check local skip times:", e)
    }

    // 2. Fallback to AniSkip API
    let activeMalId = malId;

    if (!activeMalId && mediaId) {
        try {
            const res = await buildSeaQuery<any, any>({
                endpoint: `/api/v1/mediastream/skip-times/resolve-mal?mediaId=${mediaId}`,
                method: "GET",
            })
            if (res?.malId) {
                activeMalId = res.malId
            }
        } catch (e) {
            // Expected for media without a MAL mapping (e.g. pure TMDB/library entries);
            // skip-times gracefully fall back to heuristics. Kept at debug to avoid noise.
            console.debug("No MAL mapping for TMDB/Media ID:", e)
        }
    }

    if (!activeMalId) {
        return { hasSkipTimes: false }
    }

    const data = await fetchAniSkipTimes(activeMalId, episodeNumber, episodeDuration)

    if (!data.found || !data.results?.length) {
        return { hasSkipTimes: false }
    }

    const opResult = data.results.find(r => r.skipType === "op" || r.skipType === "mixed-op")
    const edResult = data.results.find(r => r.skipType === "ed" || r.skipType === "mixed-ed")

    const op = opResult?.interval
    const ed = edResult?.interval

    // 3. Cache AniSkip times on our local server as a side-effect
    if (op || ed) {
        let resolvedEdOffset = 0
        let resolvedEdEnd = 0
        if (ed) {
            resolvedEdOffset = ed.startTime
            resolvedEdEnd = ed.endTime ?? (episodeDuration ?? 0)
        }

        buildSeaQuery<any, any>({
            endpoint: "/api/v1/mediastream/skip-times",
            method: "POST",
            data: {
                mediaId: mediaId || undefined,
                malId: activeMalId || undefined,
                episodeNumber,
                opStart: op?.startTime ?? 0,
                opEnd: op?.endTime ?? 0,
                edOffset: resolvedEdOffset,
                edEnd: resolvedEdEnd,
                applyToSeason: false,
                source: "aniskip",
            }
        }).catch(err => console.warn("Failed to cache AniSkip times in KameHouse:", err))
    }

    return {
        op,
        ed,
        opSource: "aniskip",
        edSource: "aniskip",
        hasSkipTimes: !!(op || ed),
    }
}

export function useAniSkipTimes({
    malId,
    episodeNumber,
    episodeDuration,
    enabled = true,
    mediaId,
}: UseAniSkipTimesOptions) {
    return useQuery<AniSkipTimes>({
        // NOTE: episodeDuration is intentionally NOT part of the query key.
        // Including it causes the key to change as the video metadata loads
        // (duration goes 0 → real value), which discards the previous result
        // and re-triggers loading. The duration is passed to the fetcher as a
        // hint but the API response is independent of it.
        queryKey: ["aniskip", malId, mediaId, episodeNumber],
        queryFn: () => getAniSkipTimes({
            malId,
            mediaId,
            episodeNumber: episodeNumber!,
            episodeDuration,
        }),
        enabled: enabled && !!(malId || mediaId) && !!episodeNumber,
        staleTime: 1000 * 60 * 60 * 24, // Cache for 24h
        retry: 1,
        refetchOnWindowFocus: false,
    })
}
