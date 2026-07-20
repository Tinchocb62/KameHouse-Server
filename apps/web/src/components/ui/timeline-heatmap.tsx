import React from "react"
import { cn } from "@/components/ui/core/styling"

export interface InsightNode {
    timestamp: number
    intensity: number
}

interface TimelineHeatmapProps {
    duration: number
    insights: InsightNode[]
    className?: string
}

export const TimelineHeatmap = React.memo(({ duration, insights, className }: TimelineHeatmapProps) => {
    if (!insights || insights.length === 0 || duration <= 0) return null

    return (
        <div className={cn("absolute bottom-full left-0 w-full flex items-end pointer-events-none opacity-20 group-hover:opacity-40 transition-all duration-slow mb-0.5 z-0", className)} style={{ height: "10px" }}>
            {insights.map((node, i) => {
                const height = Math.max(15, Math.floor(node.intensity * 100))
                const isPeak = node.intensity > 0.7
                return (
                    <div
                        key={i}
                        className={cn(
                            "flex-1 mx-[0.25px] rounded-t-[0.5px] transition-all duration-base",
                            isPeak ? "bg-brand-accent/60 z-10 relative" : "bg-white/10"
                        )}
                        style={{ height: `${height}%` }}
                    />
                )
            })}
        </div>
    )
})
TimelineHeatmap.displayName = "TimelineHeatmap"
