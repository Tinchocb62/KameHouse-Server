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
    votes?: number
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

export function normalizeInterval(
    interval: AniSkipInterval,
    sourceLen: number,
    localLen: number,
    anchor: "start" | "end"
): AniSkipInterval {
    // Cannot normalize without valid durations
    if (!sourceLen || !localLen || sourceLen <= 0 || localLen <= 0) return interval

    // Ignore sub-second discrepancies (metadata jitter). Anything above that is a
    // real cut difference: an end-anchored ED off by 1-2s leaves the tail of the
    // outro visible after a skip, so re-anchor instead of tolerating it.
    if (Math.abs(sourceLen - localLen) < 0.5) return interval

    if (anchor === "end") {
        // Anchor to the END of the episode:
        // The distance from the event to the end of the video should remain constant.
        const offsetStartFromEnd = sourceLen - interval.startTime
        const offsetEndFromEnd = sourceLen - interval.endTime
        
        let newStart = localLen - offsetStartFromEnd
        let newEnd = localLen - offsetEndFromEnd
        
        // Clamp to valid range
        newStart = Math.max(0, newStart)
        newEnd = Math.min(localLen, newEnd)
        
        // Sanity check: if clamping corrupted the interval, revert
        if (newStart >= newEnd) return interval
        
        return { startTime: newStart, endTime: newEnd }
    } else {
        // Anchor to START (typically OP):
        // OP offsets from the beginning are absolute (recap length is fixed).
        return interval
    }
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

    let localFallback: AniSkipTimes | null = null

    // 1. Try local KameHouse server database first
    try {
        const localData = await buildSeaQuery<LocalSkipTimeResponse, { mediaId?: number; malId?: number; episodeNumber: number }>({
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
                const times = {
                    op,
                    ed,
                    opSource: localData.source,
                    edSource: localData.source,
                    hasSkipTimes: true,
                }
                
                // If it's a heuristic or unconfident guess, don't return early;
                // save it as fallback and keep trying AniSkip.
                if (localData.source === "heuristic" || (localData.confidence ?? 0) <= 0) {
                    localFallback = times
                } else {
                    return times
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
            const res = await buildSeaQuery<{ malId?: number }>({
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
        return localFallback || { hasSkipTimes: false }
    }

    const opResults = data.results.filter(r => r.skipType === "op" || r.skipType === "mixed-op")
    const edResults = data.results.filter(r => r.skipType === "ed" || r.skipType === "mixed-ed")

    // D6: Ranking por votos
    const bestOp = opResults.length > 0 ? opResults.reduce((prev, curr) => (curr.votes || 0) > (prev.votes || 0) ? curr : prev) : undefined
    const bestEd = edResults.length > 0 ? edResults.reduce((prev, curr) => (curr.votes || 0) > (prev.votes || 0) ? curr : prev) : undefined

    let op = bestOp?.interval
    let ed = bestEd?.interval

    // D1: Normalización de OP y ED (usando episodeDuration local vs episodeLength de AniSkip)
    if (episodeDuration && episodeDuration > 0) {
        if (op && bestOp?.episodeLength) {
            op = normalizeInterval(op, bestOp.episodeLength, episodeDuration, "start")
        }
        if (ed && bestEd?.episodeLength) {
            ed = normalizeInterval(ed, bestEd.episodeLength, episodeDuration, "end")
        }
    }

    // 3. Cache AniSkip times on our local server as a side-effect
    if (op || ed) {
        let resolvedEdOffset = 0
        let resolvedEdEnd = 0
        if (ed) {
            resolvedEdOffset = ed.startTime
            resolvedEdEnd = ed.endTime ?? (episodeDuration ?? 0)
        }

        // Enviar la confianza basada en los votos (o 1 como base si AniSkip fue exitoso)
        const confidence = Math.max(bestOp?.votes || 0, bestEd?.votes || 0, 1)

        buildSeaQuery<unknown, {
            mediaId?: number
            malId?: number
            episodeNumber: number
            opStart: number
            opEnd: number
            edOffset: number
            edEnd: number
            applyToSeason: boolean
            source: string
            confidence: number
        }>({
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
                confidence: confidence
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
