
import { getApiWebSocketUrl } from "@/api/client/server-url"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { WebSocketMessage, WSEvents, ScannerMessage } from "@/lib/server/ws-events"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useAppStore, type ScanEvent, type ScannerState } from "@/lib/store"
import React, { useCallback, useEffect, useMemo, useRef } from "react"
import useWebSocket from "react-use-websocket"

export function WebsocketProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient()
    const setEvents = useAppStore(state => state.setEvents)
    const setScannerState = useAppStore(state => state.setScannerState)
    const activeStageIdx = useAppStore(state => state.activeStageIdx)
    const activeStageIdxRef = useRef(activeStageIdx)
    
    useEffect(() => {
        activeStageIdxRef.current = activeStageIdx
    }, [activeStageIdx])

    // Batching queues for throttling updates to at most once per 500ms
    const eventQueue = useRef<ScanEvent[]>([])
    const stateUpdateRef = useRef<Partial<ScannerState>>({})
    const flushTimeout = useRef<NodeJS.Timeout | null>(null)

    // Dynamically resolve WebSocket URL from the base URL
    const wsUrl = useMemo(() => getApiWebSocketUrl(), [])


    const { lastJsonMessage, sendJsonMessage } = useWebSocket(wsUrl, {
        shouldReconnect: () => true,
        reconnectAttempts: 10,
        reconnectInterval: 3000,
        share: true, // Allow multiple hooks to share this connection
        onOpen: () => {
        },
        onError: () => {
            // Silencioso: ERR_CONNECTION_REFUSED es esperado mientras el servidor arranca.
            // react-use-websocket ya maneja el reconectar automáticamente.
        },
    })

    const flushUpdates = useCallback(() => {
        // Flush events array
        if (eventQueue.current.length > 0) {
            const newEvents = [...eventQueue.current]
            eventQueue.current = []
            setEvents(prev => [...newEvents, ...prev].slice(0, 200))
        }
        
        // Flush simple states
        const updates = stateUpdateRef.current
        stateUpdateRef.current = {}
        
        if (Object.keys(updates).length > 0) {
            setScannerState(updates)
        }
        
        flushTimeout.current = null
    }, [setEvents, setScannerState])

    // Heartbeat loop
    useEffect(() => {
        const interval = setInterval(() => {
            sendJsonMessage({ type: "ping", payload: { timestamp: Date.now() } })
        }, 25000)
        return () => {
            clearInterval(interval)
            if (flushTimeout.current) clearTimeout(flushTimeout.current)
        }
    }, [sendJsonMessage])

    useEffect(() => {
        if (!lastJsonMessage || typeof lastJsonMessage !== "object") return

        const msg = lastJsonMessage as WebSocketMessage

        switch (msg.type) {
            case WSEvents.AUTO_SCAN_COMPLETED:
            case WSEvents.LIBRARY_WATCHER_FILE_ADDED:
            case WSEvents.LIBRARY_WATCHER_FILE_REMOVED:
            case WSEvents.REFRESHED_ANIME_COLLECTION:
                queryClient.invalidateQueries({
                    queryKey: [API_ENDPOINTS.LOCALFILES.GetLocalFiles.key]
                })
                queryClient.invalidateQueries({
                    queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key]
                })
                queryClient.invalidateQueries({
                    queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key]
                })
                queryClient.invalidateQueries({
                    queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetMissingEpisodes.key]
                })
                queryClient.invalidateQueries({
                    queryKey: [API_ENDPOINTS.LIBRARY_EXPLORER.GetLibraryExplorerFileTree.key]
                })
                break
                
            case WSEvents.LIBRARY_SCAN: {
                const data = msg.payload as ScannerMessage
                const evt: ScanEvent = {
                    ...data,
                    timestamp: Date.now(),
                    id: crypto.randomUUID()
                }
                
                // Add to batch queue
                eventQueue.current.unshift(evt)
                
                // Accumulate state updates
                switch (data.status) {
                    case "START":
                        stateUpdateRef.current = {
                            ...stateUpdateRef.current,
                            isScanning: true,
                            scanProgress: 0,
                            currentScanningFile: "",
                            activeStageIdx: 0,
                            pruneCount: 0,
                            lastFinish: null
                        }
                        break
                    case "PROCESSING":
                        stateUpdateRef.current = {
                            ...stateUpdateRef.current,
                            isScanning: true,
                            currentScanningFile: data.file || "",
                            activeStageIdx: 2
                        }
                        if (data.total && data.current) {
                            stateUpdateRef.current.scanProgress = (data.current / data.total) * 100
                        }
                        break
                    case "PRUNED":
                        stateUpdateRef.current = {
                            ...stateUpdateRef.current,
                            activeStageIdx: 5,
                            pruneCount: data.removed ?? 0
                        }
                        break
                    case "FINISH":
                        stateUpdateRef.current = {
                            ...stateUpdateRef.current,
                            isScanning: false,
                            scanProgress: 100,
                            activeStageIdx: -1,
                            lastFinish: evt
                        }
                        queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key] })
                        queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key] })
                        queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetMissingEpisodes.key] })
                        queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.LIBRARY_EXPLORER.GetLibraryExplorerFileTree.key] })
                        break
                }
                
                // Schedule flush every 500ms
                if (!flushTimeout.current) {
                    flushTimeout.current = setTimeout(flushUpdates, 500)
                }
                break
            }
                
            case WSEvents.SCAN_PROGRESS:
                stateUpdateRef.current = {
                    ...stateUpdateRef.current,
                    isScanning: true,
                    scanProgress: msg.payload as number
                }
                if (!flushTimeout.current) flushTimeout.current = setTimeout(flushUpdates, 500)
                break
 
            case WSEvents.SCAN_PROGRESS_DETAILED: {
                const payload = msg.payload
                const evt: ScanEvent = {
                    status: "PROCESSING",
                    file: payload.message || "",
                    timestamp: Date.now(),
                    id: `legacy-${crypto.randomUUID()}`
                }
                eventQueue.current.unshift(evt)
                stateUpdateRef.current = {
                    ...stateUpdateRef.current,
                    isScanning: true,
                    currentScanningFile: payload.message || ""
                }
                if (!flushTimeout.current) flushTimeout.current = setTimeout(flushUpdates, 500)
                break
            }
 
            case WSEvents.SCAN_STATUS: {
                const statusStr = msg.payload as string
                let newStageIdx = stateUpdateRef.current.activeStageIdx ?? activeStageIdxRef.current
                const lowerStatus = statusStr.toLowerCase();
                const STAGE_KEYWORDS = [
                    ["walk", "escanear", "scanning"],
                    ["parse", "parsing"],
                    ["resolve", "fetching", "metadata", "mejorar"],
                    ["probe", "probing"],
                    ["persist", "saving"],
                    ["prune", "cleaning"],
                ];
                const matchedIdx = STAGE_KEYWORDS.findIndex(keywords =>
                    keywords.some(keyword => lowerStatus.includes(keyword))
                );
                if (matchedIdx !== -1) {
                    newStageIdx = matchedIdx;
                }
 
                const evt: ScanEvent = {
                    status: statusStr.toLowerCase().includes("completed") || statusStr.toLowerCase().includes("finished") ? "FINISH" : "PROCESSING",
                    file: statusStr,
                    timestamp: Date.now(),
                    id: `status-${crypto.randomUUID()}`
                }
                eventQueue.current.unshift(evt)
 
                if (statusStr.toLowerCase().includes("completed") || statusStr.toLowerCase().includes("finished")) {
                    stateUpdateRef.current = {
                        ...stateUpdateRef.current,
                        isScanning: false,
                        scanProgress: 100,
                        activeStageIdx: -1
                    }
                    queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key] })
                    queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key] })
                    queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetMissingEpisodes.key] })
                    queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.LIBRARY_EXPLORER.GetLibraryExplorerFileTree.key] })
                } else {
                    stateUpdateRef.current = {
                        ...stateUpdateRef.current,
                        isScanning: true,
                        activeStageIdx: newStageIdx,
                        currentScanningFile: statusStr
                    }
                }
                if (!flushTimeout.current) flushTimeout.current = setTimeout(flushUpdates, 500)
                break
            }
                
            case WSEvents.NOTIFICATION_RECEIVED: {
                const n = msg.payload
                queryClient.invalidateQueries({
                    queryKey: [API_ENDPOINTS.NOTIFICATIONS.GetNotifications.key]
                })
                if (n?.title) {
                    toast(n.title, { description: n.message })
                }
                break
            }

            default:
                break
        }
    }, [lastJsonMessage, queryClient, flushUpdates])

    return <>{children}</>
}
