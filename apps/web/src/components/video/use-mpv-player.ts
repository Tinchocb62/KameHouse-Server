import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useWebSocket } from "@/hooks/use-websocket"
import { getApiWebSocketUrl } from "@/api/client/server-url"
import { useUpdateContinuityWatchHistoryItem } from "@/api/hooks/continuity.hooks"

interface MpvProgressEvent {
    currentTime: number
    duration: number
    paused: boolean
    mediaId: number
    episodeNumber: number
}

interface UseMpvPlayerOptions {
    /** Absolute file path on the server machine (same machine as the desktop app). */
    path?: string
    title?: string
    mediaId?: number
    episodeNumber?: number
    /** Called when mpv exits (user closed the window or playback finished). */
    onExited?: (finalTime: number, duration: number) => void
}

/**
 * Plays media in an external mpv window (desktop app only) while keeping the
 * server in sync: progress events from mpv's IPC are relayed as the same
 * WebSocket heartbeat the web player sends (continuity + auto-scrobble at 85%),
 * plus periodic continuity watch-history saves for resume support.
 */
export function useMpvPlayer(options: UseMpvPlayerOptions) {
    const { path, title, mediaId, episodeNumber, onExited } = options

    const isDesktop = typeof window !== "undefined" && !!window.__isTauriDesktop__
    const [isAvailable, setIsAvailable] = useState(false)
    const [isActive, setIsActive] = useState(false)

    const wsUrl = useMemo(() => getApiWebSocketUrl(), [])
    const { sendJsonMessage } = useWebSocket(wsUrl)
    const { mutate: saveProgress } = useUpdateContinuityWatchHistoryItem()

    const lastHeartbeatRef = useRef(0)
    const lastContinuitySaveRef = useRef(0)
    const lastProgressRef = useRef<{ currentTime: number; duration: number }>({ currentTime: 0, duration: 0 })
    const onExitedRef = useRef(onExited)
    onExitedRef.current = onExited

    useEffect(() => {
        if (!isDesktop) return
        let cancelled = false
        window.electron?.mpv.isAvailable().then((ok) => {
            if (!cancelled) setIsAvailable(ok)
        })
        return () => {
            cancelled = true
        }
    }, [isDesktop])

    const saveContinuity = useCallback((currentTime: number, duration: number) => {
        if (!mediaId || !episodeNumber || currentTime <= 0) return
        saveProgress({
            options: {
                mediaId,
                episodeNumber,
                currentTime,
                duration,
                filepath: path,
                kind: "mediastream",
                predictive: false,
            },
        })
    }, [mediaId, episodeNumber, path, saveProgress])

    // Relay mpv progress while a session is active.
    useEffect(() => {
        if (!isDesktop || !isActive || !window.electron) return

        const unsubProgress = window.electron.on("mpv:progress", (...args: unknown[]) => {
            const ev = args[0] as MpvProgressEvent
            if (!ev || typeof ev.currentTime !== "number") return
            lastProgressRef.current = { currentTime: ev.currentTime, duration: ev.duration }

            const now = Date.now()
            if (now - lastHeartbeatRef.current >= 5000) {
                lastHeartbeatRef.current = now
                const progress = ev.duration > 0 ? ev.currentTime / ev.duration : 0
                sendJsonMessage({
                    type: "native-player",
                    payload: {
                        eventType: "playback-heartbeat-progress",
                        mediaId: mediaId ?? ev.mediaId,
                        episodeNumber: episodeNumber ?? ev.episodeNumber,
                        currentTime: ev.currentTime,
                        duration: ev.duration,
                        progress: Math.round(progress * 10000) / 10000,
                    },
                })
            }
            if (now - lastContinuitySaveRef.current >= 15000) {
                lastContinuitySaveRef.current = now
                saveContinuity(ev.currentTime, ev.duration)
            }
        })

        const unsubExited = window.electron.on("mpv:exited", (...args: unknown[]) => {
            const ev = args[0] as MpvProgressEvent
            const finalTime = typeof ev?.currentTime === "number" ? ev.currentTime : lastProgressRef.current.currentTime
            const duration = typeof ev?.duration === "number" ? ev.duration : lastProgressRef.current.duration
            saveContinuity(finalTime, duration)
            setIsActive(false)
            onExitedRef.current?.(finalTime, duration)
        })

        return () => {
            unsubProgress?.()
            unsubExited?.()
        }
    }, [isDesktop, isActive, mediaId, episodeNumber, sendJsonMessage, saveContinuity])

    const play = useCallback(async (startTime?: number) => {
        if (!isDesktop || !window.electron || !path) return false
        try {
            lastHeartbeatRef.current = 0
            lastContinuitySaveRef.current = Date.now()
            lastProgressRef.current = { currentTime: startTime ?? 0, duration: 0 }
            await window.electron.mpv.play({
                path,
                title,
                startTime,
                mediaId,
                episodeNumber,
            })
            setIsActive(true)
            return true
        } catch (e) {
            console.error("[mpv] No se pudo iniciar la reproducción:", e)
            return false
        }
    }, [isDesktop, path, title, mediaId, episodeNumber])

    const stop = useCallback(async () => {
        await window.electron?.mpv.stop()
    }, [])

    return { isDesktop, isAvailable, isActive, play, stop }
}
