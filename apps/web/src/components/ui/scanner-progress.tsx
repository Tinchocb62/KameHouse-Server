/**
 * scanner-progress.tsx
 *
 * Real-time feedback UI for Local Library scanning.
 * Subscribes to the shared WebSocket connection to parse `scan_progress`
 * and `scan_complete` events, updating a progress bar and status text.
 */

import React, { useEffect, useState, useMemo } from "react"
import { getServerBaseUrl } from "@/api/client/server-url"
import useWebSocket from "react-use-websocket"
import { ProgressBar } from "@/components/ui/progress-bar"
import { queryClient } from "@/app/client-providers"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { toast } from "sonner"
import { AlertTriangle, Loader2 } from "lucide-react"

export function ScannerProgress() {
    const [progress, setProgress] = useState(0)
    const [currentFile, setCurrentFile] = useState("")
    const [isScanning, setIsScanning] = useState(false)
    const [isRateLimited, setIsRateLimited] = useState(false)

    // Reuse the exact same WS URL derivation as websocket-provider.tsx
    const wsUrl = useMemo(() => {
        const base = getServerBaseUrl()
        if (base.startsWith("http://")) return base.replace("http://", "ws://") + "/api/v1/ws"
        if (base.startsWith("https://")) return base.replace("https://", "wss://") + "/api/v1/ws"
        return "ws://127.0.0.1:43211/api/v1/ws"
    }, [])

    // Hook into the shared connection
    const { lastJsonMessage } = useWebSocket(wsUrl, {
        share: true,
        shouldReconnect: () => true,
    })

    useEffect(() => {
        if (!lastJsonMessage || typeof lastJsonMessage !== 'object') return

        const msg = lastJsonMessage as any
        const eventType = msg.type

        if (eventType === "scan_progress") {
            if (!isScanning) setIsScanning(true)
            
            const payload = msg.payload || msg
            if (typeof payload.percentage === "number") {
                setProgress(payload.percentage)
            }
            if (typeof payload.currentFile === "string" || typeof payload.file === "string") {
                setCurrentFile(payload.currentFile || payload.file)
            }
        }
        else if (eventType === "scan_status") {
            const payload = msg.payload || msg
            const status: string = payload.status ?? payload.message ?? ""
            setIsRateLimited(status === "PAUSED_RATE_LIMIT")
        }
        else if (eventType === "scan_complete") {
            setIsScanning(false)
            setIsRateLimited(false)
            setProgress(100)
            toast.success("Escaneo completado exitosamente.")
            
            // Invalidate library and local files queries to show the new content
            queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key] })
            queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.LOCALFILES.GetLocalFiles.key] })
            queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetMissingEpisodes.key] })
            
            // Auto hide after a few seconds
            setTimeout(() => {
                setProgress(0)
                setCurrentFile("")
            }, 3000)
        }
    }, [lastJsonMessage])

    if (!isScanning && progress === 0) return null

    return (
        <div className="w-full bg-[#1C1C28] border border-orange-500/20 rounded-xl p-4 shadow-xl mb-6 relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center gap-4 mb-3 relative z-10">
                {isRateLimited
                    ? <AlertTriangle className="w-5 h-5 text-yellow-500 animate-pulse shrink-0" />
                    : <Loader2 className="w-5 h-5 text-orange-500 animate-spin shrink-0" />
                }
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white mb-0.5 flex justify-between">
                        <span>Escaneando Biblioteca...</span>
                        <span className="text-orange-400">{Math.round(progress)}%</span>
                    </p>
                    {isRateLimited ? (
                        <span className="text-yellow-500 font-medium text-xs">Rate limit reached. Waiting for API...</span>
                    ) : (
                        <p className="text-xs text-gray-400 font-mono truncate" title={currentFile}>
                            {currentFile || "Buscando archivos..."}
                        </p>
                    )}
                </div>
            </div>
            
            <div className="relative z-10 px-0.5">
                <ProgressBar 
                    progress={progress} 
                    className="h-2 bg-black/50" 
                    color={isRateLimited ? "bg-yellow-500 animate-pulse" : "bg-orange-500"}
                />
            </div>
        </div>
    )
}
