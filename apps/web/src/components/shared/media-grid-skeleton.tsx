import React from "react"
import { cn } from "@/components/ui/core/styling"

interface MediaGridSkeletonProps {
    /**
     * Number of skeleton cards to render. Defaults to 12.
     */
    count?: number
    /**
     * Poster (2/3) or wide (16/9) placeholder.
     */
    aspect?: "poster" | "wide"
    className?: string
}

/**
 * Reusable loading scaffold for media grids.
 * Uses content-visibility for cheap offscreen rendering.
 */
export function MediaGridSkeleton({ count = 12, aspect = "poster", className }: MediaGridSkeletonProps) {
    const cards = React.useMemo(() => Array.from({ length: count }), [count])
    const aspectClass = aspect === "poster" ? "aspect-[2/3]" : "aspect-video"

    return (
        <div
            className={cn(
                "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6",
                "content-visibility-auto",
                className,
            )}
        >
            {cards.map((_, idx) => (
                <div key={idx} className="flex flex-col gap-3">
                    <div
                        className={cn(
                            "w-full rounded-xl bg-white/5 border border-white/10 overflow-hidden relative",
                            aspectClass,
                        )}
                    >
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
                    </div>
                    <div className="h-3 w-3/4 rounded bg-white/10 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
                </div>
            ))}
        </div>
    )
}
