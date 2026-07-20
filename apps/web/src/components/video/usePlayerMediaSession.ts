import { useEffect, useLayoutEffect, useRef } from "react"
import { getSeriesName } from "@/lib/helpers/media"

interface UsePlayerMediaSessionProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    isPlaying: boolean
    title?: string
    episodeNumber?: number
    episodeImage?: string
    togglePlay: () => void
    skipTime: (amount: number) => void
    onNextEpisode?: () => void
    hasNextEpisode?: boolean
}

const actions = ["play", "pause", "seekforward", "seekbackward", "seekto", "nexttrack", "previoustrack"] as const

export function usePlayerMediaSession({
    videoRef,
    isPlaying,
    title,
    episodeNumber,
    episodeImage,
    togglePlay,
    skipTime,
    onNextEpisode,
    hasNextEpisode,
}: UsePlayerMediaSessionProps) {
    const isActive = useRef(false)
    const isPlayingRef = useRef(isPlaying)

    // El ref se sincroniza después del commit, no en el cuerpo del render: un render
    // interrumpido (modo concurrente / StrictMode) dejaría el ref con un valor que
    // nunca se pintó.
    useLayoutEffect(() => {
        isPlayingRef.current = isPlaying
    }, [isPlaying])

    // Initialize media session action handlers
    useEffect(() => {
        if (!("mediaSession" in navigator)) return
        isActive.current = true

        const handleAction = (details: MediaSessionActionDetails) => {
            switch (details.action) {
                case "play":
                    if (!isPlayingRef.current) togglePlay()
                    break
                case "pause":
                    if (isPlayingRef.current) togglePlay()
                    break
                case "seekto":
                    if (details.seekTime !== undefined && videoRef.current) {
                        videoRef.current.currentTime = details.seekTime
                    }
                    break
                case "seekforward":
                    skipTime(10)
                    break
                case "seekbackward":
                    skipTime(-10)
                    break
                case "nexttrack":
                    if (onNextEpisode && hasNextEpisode) {
                        onNextEpisode()
                    }
                    break
            }
        }

        for (const action of actions) {
            try {
                navigator.mediaSession.setActionHandler(action, handleAction)
            } catch {
                // Ignore unsupported actions
            }
        }

        return () => {
            isActive.current = false
            for (const action of actions) {
                try {
                    navigator.mediaSession.setActionHandler(action, null)
                } catch { /* noop */ }
            }
            if ("mediaSession" in navigator) {
                navigator.mediaSession.playbackState = "none"
                navigator.mediaSession.metadata = null
            }
        }
    }, [togglePlay, skipTime, onNextEpisode, hasNextEpisode, videoRef])

    // Update metadata when info changes
    useEffect(() => {
        if (!("mediaSession" in navigator) || !isActive.current) return

        const seriesName = getSeriesName(title)
        
        let displayTitle = title || "KameHouse"
        if (episodeNumber) {
            displayTitle = `Episodio ${episodeNumber}`
        }

        const artwork: MediaImage[] = []
        if (episodeImage) {
            artwork.push({ src: episodeImage, sizes: "512x512", type: "image/webp" })
        }

        navigator.mediaSession.metadata = new MediaMetadata({
            title: displayTitle,
            artist: seriesName,
            artwork,
        })
    }, [title, episodeNumber, episodeImage])

    // Update playback state when playing changes
    useEffect(() => {
        if (!("mediaSession" in navigator) || !isActive.current) return
        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused"
    }, [isPlaying])

    // Update position state when time updates
    useEffect(() => {
        const video = videoRef.current
        if (!video || !("mediaSession" in navigator)) return

        const handleTimeUpdate = () => {
            if ("setPositionState" in navigator.mediaSession && isActive.current) {
                try {
                    navigator.mediaSession.setPositionState({
                        duration: video.duration || 0,
                        playbackRate: video.playbackRate || 1,
                        position: video.currentTime || 0,
                    })
                } catch { /* noop */ }
            }
        }

        // Throttle the time update to avoid too many calls
        let throttleTimer: NodeJS.Timeout | null = null
        const throttledUpdate = () => {
            if (!throttleTimer) {
                throttleTimer = setTimeout(() => {
                    handleTimeUpdate()
                    throttleTimer = null
                }, 1000)
            }
        }

        video.addEventListener("timeupdate", throttledUpdate)
        video.addEventListener("ratechange", handleTimeUpdate)
        video.addEventListener("loadedmetadata", handleTimeUpdate)

        return () => {
            video.removeEventListener("timeupdate", throttledUpdate)
            video.removeEventListener("ratechange", handleTimeUpdate)
            video.removeEventListener("loadedmetadata", handleTimeUpdate)
            if (throttleTimer) clearTimeout(throttleTimer)
        }
    }, [videoRef])
}
