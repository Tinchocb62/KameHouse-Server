import React, { useEffect, useState, useRef } from "react"
import { PlayerPreviewManager } from "./player-preview"
import { cn } from "@/components/ui/core/styling"

interface PlayerSeekPreviewProps {
    previewManager: PlayerPreviewManager | null
    hoverTime: number | null
    hoverPosPercent: number
    duration: number
}

const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "00:00"
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = Math.floor(secs % 60)
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function PlayerSeekPreview({ previewManager, hoverTime, hoverPosPercent, duration }: PlayerSeekPreviewProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const lastRenderedSegmentRef = useRef<number>(-1)

    useEffect(() => {
        if (!previewManager || hoverTime === null) return
        
        let isActive = true
        const segment = previewManager.calculateSegmentIndex(hoverTime)

        if (lastRenderedSegmentRef.current === segment && previewUrl) {
            return
        }

        const loadPreview = async () => {
            try {
                const url = await previewManager.retrievePreviewForSegment(segment, true)
                if (isActive && url) {
                    setPreviewUrl(url)
                    lastRenderedSegmentRef.current = segment
                }
            } catch (e) {
                // Ignore errors
            }
        }

        loadPreview()

        return () => {
            isActive = false
        }
    }, [hoverTime, previewManager, previewUrl])

    if (hoverTime === null) return null

    // Clamp the position so the preview doesn't go off-screen
    // The bar width is ~100%, preview is 160px wide (half is 80px).
    // It will be positioned using left: hoverPosPercent
    const safeLeftPercent = Math.max(0, Math.min(100, hoverPosPercent))

    return (
        <div 
            className="absolute bottom-[calc(100%+16px)] pointer-events-none z-[100] transform -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${safeLeftPercent}%` }}
        >
            <div className="relative overflow-hidden rounded-md border border-outline-variant/30 shadow-elevation-4 bg-surface-container-high w-[160px] aspect-video">
                {previewUrl ? (
                    <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover animate-in fade-in duration-200"
                    />
                ) : (
                    <div className="w-full h-full bg-surface-container flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>
            
            {/* Time badge */}
            <div className="mt-2 bg-surface-container-high/90 backdrop-blur-[var(--blur-overlay-sm)] px-2.5 py-0.5 rounded-sm border border-outline-variant/30 text-xs font-mono font-medium text-white shadow-elevation-2">
                {formatTime(hoverTime)}
            </div>
            
            {/* Arrow */}
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-surface-container-high/90 mt-1 shadow-elevation-2" />
        </div>
    )
}
