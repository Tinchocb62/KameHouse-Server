import React, { useEffect, Suspense, lazy, useState } from "react"
import { createPortal } from "react-dom"
import { Icons } from "@/components/ui/icons"
import { useAppStore } from "@/lib/store"
import { PlayerErrorBoundary } from "./player-error-boundary"

export type VideoPlayerProps = {
    streamUrl: string
    streamType?: "local" | "online" | "direct" | "transcode" | "optimized"
    isExternalStream?: boolean
    title?: string
    episodeLabel?: string
    initialProgressSeconds?: number
    onClose: () => void
    onProgress?: (seconds: number) => void
    onNextEpisode?: () => void
    hasNextEpisode?: boolean
    mediaId?: number
    episodeNumber?: number
    malId?: number | null
    /** Media format ("TV", "MOVIE", "OVA", etc.) — passed to player core to control fallback skip window */
    mediaFormat?: string | null
    episodes?: {
        title?: string
        episodeNumber: number
        absoluteEpisodeNumber?: number
        thumbnail?: string
        watched?: boolean
    }[]
    onSelectEpisode?: (episodeNumber: number) => void
    nextStreamUrl?: string
    nextStreamType?: "local" | "online" | "direct" | "transcode" | "optimized"
    nextEpisodeTitle?: string
    nextEpisodeNumber?: number
    nextEpisodeImage?: string
}

function PlayerLoadingScreen() {
    return (
        <div className="fixed inset-0 z-[10000] bg-black w-screen h-screen flex flex-col items-center justify-center gap-4 text-white">
            <Icons.ui.spinner className="w-14 h-14 text-white animate-spin" />
        </div>
    )
}

const VideoPlayerOrchestrator = lazy(() =>
    import("./player-orchestrator").then((m) => ({ default: m.VideoPlayerOrchestrator }))
)

export function VideoPlayer(props: VideoPlayerProps) {
    const setVideoActive = useAppStore(state => state.setVideoActive)
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        // Attempt to enter fullscreen
        try {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch((err: unknown) => {
                    console.warn("Fullscreen request failed:", err)
                })
            }
        } catch (err) {
            console.warn("Fullscreen error:", err)
        }

        // Try lock screen orientation to landscape
        try {
            const screenAny = window.screen as Screen & { orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void } }
            if (screenAny && screenAny.orientation && screenAny.orientation.lock) {
                screenAny.orientation.lock("landscape").catch((err: unknown) => {
                    console.warn("Orientation lock failed:", err)
                })
            }
        } catch (err) {
            console.warn("Orientation lock error:", err)
        }

        Promise.resolve().then(() => {
            setMounted(true)
            setVideoActive(true)
        })
        
        return () => {
            setVideoActive(false)
            // Unlock screen orientation
            try {
                const screenAny = window.screen as Screen & { orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void } }
                if (screenAny && screenAny.orientation && screenAny.orientation.unlock) {
                    screenAny.orientation.unlock()
                }
            } catch (err) {
                console.warn("Orientation unlock error:", err)
            }
            // Attempt to exit fullscreen when closing player
            try {
                if (document.fullscreenElement && document.exitFullscreen) {
                    document.exitFullscreen().catch((err: unknown) => {
                        console.warn("Exit fullscreen failed:", err)
                    })
                }
            } catch (err) {
                console.warn("Exit fullscreen error:", err)
            }
        }
    }, [setVideoActive])
    const isLocal = !props.isExternalStream && Boolean(props.streamUrl) && props.streamType !== "online"

    const playerContent = isLocal ? (
        <VideoPlayerOrchestrator {...props} />
    ) : (
        <VideoPlayerOrchestrator
            {...props}
            playableUrl={props.streamUrl}
        />
    )

    if (!mounted || typeof document === "undefined") {
        return null
    }

    return createPortal(
        <PlayerErrorBoundary label="Video Player">
            <div className="fixed inset-0 z-[10000] animate-in fade-in zoom-in-95 duration-slow fill-mode-forwards">
                <Suspense fallback={<PlayerLoadingScreen />}>
                    {playerContent}
                </Suspense>
            </div>
        </PlayerErrorBoundary>,
        document.body
    )
}

