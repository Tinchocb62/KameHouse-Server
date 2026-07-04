import React, { useEffect, Suspense, lazy, useState } from "react"
import { createPortal } from "react-dom"
import { Icons } from "@/components/ui/icons"
import { useAppStore } from "@/lib/store"

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
            <p className="font-bold tracking-widest uppercase text-[10px] opacity-80 animate-pulse">
                Cargando Reproductor
            </p>
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
        Promise.resolve().then(() => {
            setMounted(true)
            setVideoActive(true)
        })
        return () => {
            setVideoActive(false)
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
        <Suspense fallback={<PlayerLoadingScreen />}>
            {playerContent}
        </Suspense>,
        document.body
    )
}

