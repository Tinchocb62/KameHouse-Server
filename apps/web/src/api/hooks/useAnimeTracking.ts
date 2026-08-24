/**
 * useAnimeTracking.ts
 *
 * Tracks anime episode watch progress and syncs to the backend when the
 * user has watched ≥85 % of an episode.
 *
 * ── Behaviour ────────────────────────────────────────────────────────────────
 *  • Monitors currentTime / duration on every timeupdate callback.
 *  • When progress >= 85 % it calls the continuity sync endpoint once per
 *    episode (debounced — the mutation itself is idempotent).
 *  • Exposes a `reset()` so the hook can be reused when the episode changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useCallback } from "react"
import { useUpdateContinuityWatchHistoryItem } from "@/api/hooks/continuity.hooks"
import { toast } from "sonner"

interface UseAnimeTrackingOptions {
    /** Media (series / movie) ID from the backend */
    mediaId?: number
    /** 1‑based episode number */
    episodeNumber?: number
    /** Local file path (optional) */
    filepath?: string
    /** Completion threshold (0.0 – 1.0). Default 0.85 */
    threshold?: number
    /** Enable / disable tracking */
    enabled?: boolean
}

interface UseAnimeTrackingReturn {
    /** Call this from your <video> onTimeUpdate handler */
    onProgress: (currentTime: number, duration: number) => void
    /** Reset the "already synced" flag — call when switching episodes */
    reset: () => void
    /** Whether the current episode has been marked as watched */
    isWatched: () => boolean
}

export function useAnimeTracking({
    mediaId,
    episodeNumber,
    filepath,
    threshold = 0.85,
    enabled = true,
}: UseAnimeTrackingOptions): UseAnimeTrackingReturn {
    const { mutate: saveContinuity } = useUpdateContinuityWatchHistoryItem()

    // Guards — fire only once per episode
    const syncedRef = useRef(false)
    const watchedRef = useRef(false)

    const isWatched = useCallback(() => watchedRef.current, [])

    const onProgress = useCallback(
        (currentTime: number, duration: number) => {
            if (!enabled || !mediaId || !episodeNumber) return
            if (syncedRef.current) return
            if (duration <= 0) return

            const progress = currentTime / duration

            // Mark as watched when crossing the threshold
            if (progress >= threshold && !watchedRef.current) {
                watchedRef.current = true
            }

            // Sync to backend (once, at threshold)
            if (progress >= threshold) {
                syncedRef.current = true

                saveContinuity({
                    options: {
                        mediaId,
                        episodeNumber,
                        currentTime,
                        duration,
                        filepath,
                        kind: "mediastream",
                        predictive: false,
                    },
                }, {
                    onSuccess: () => {
                        toast.success(`Episodio ${episodeNumber} completado — Progreso sincronizado`, {
                            duration: 3500,
                            id: `scrobble-${mediaId}-${episodeNumber}`,
                        })
                    }
                })
            }
        },
        [enabled, mediaId, episodeNumber, filepath, threshold, saveContinuity],
    )

    const reset = useCallback(() => {
        syncedRef.current = false
        watchedRef.current = false
    }, [])

    return { onProgress, reset, isWatched }
}
