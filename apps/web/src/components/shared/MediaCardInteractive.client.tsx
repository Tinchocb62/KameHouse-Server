"use client"

import React, { ReactNode, useState } from "react"
import { Play } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export interface MediaCardInteractiveProps {
    id: string | number
    title: string
    posterUrl?: string
    year?: string | number
    rating?: number
    badge?: string
    progress?: number // Percentage 0 - 100
    onClick?: () => void
    children?: ReactNode
}

/**
 * Lightweight Client Component wrapper to handle interactivity over Server-Rendered grid items.
 * When `posterUrl` is provided, the component renders and manages the poster image internally,
 * with a Skeleton placeholder that fades out once the image loads.
 * Relies entirely on Tailwind group-hover physics for the play button overlay.
 */
export function MediaCardInteractive({
    id,
    title,
    posterUrl,
    year,
    rating,
    badge,
    progress,
    onClick,
    children,
}: MediaCardInteractiveProps) {
    const [isLoaded, setIsLoaded] = useState(false)

    return (
        <button
            type="button"
            className="group relative w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md overflow-hidden"
            onClick={onClick}
            aria-label={`Play ${title}`}
        >
            {/* ── Poster image container with locked 2:3 aspect ratio ─────────── */}
            <div className="aspect-[2/3] relative overflow-hidden rounded-md">
                {/* Skeleton shimmer — visible until image loads */}
                <Skeleton
                    className={[
                        "absolute inset-0 z-10 rounded-md",
                        "transition-opacity duration-500",
                        isLoaded ? "opacity-0 pointer-events-none" : "opacity-100",
                    ].join(" ")}
                />

                {posterUrl ? (
                    <img
                        src={posterUrl}
                        alt={title}
                        onLoad={() => setIsLoaded(true)}
                        className={[
                            "absolute inset-0 h-full w-full object-cover rounded-md",
                            "transition-opacity duration-500",
                            isLoaded ? "opacity-100" : "opacity-0",
                        ].join(" ")}
                        loading="lazy"
                        draggable={false}
                    />
                ) : (
                    // Slot for server-rendered children (e.g. MediaCard) when no posterUrl is given
                    <div
                        className={[
                            "absolute inset-0 transition-opacity duration-500",
                            isLoaded ? "opacity-100" : "opacity-0",
                        ].join(" ")}
                    >
                        {children}
                    </div>
                )}

                {/* ── Hardware-accelerated hover overlay ─────────────────────── */}
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/0 opacity-0 backdrop-blur-none transition-all duration-300 group-hover:bg-black/40 group-hover:opacity-100 group-hover:backdrop-blur-[2px]">
                    <div className="flex h-12 w-12 transform items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                        <Play className="ml-1 h-6 w-6 fill-current" />
                    </div>
                </div>

                {/* ── Metadata ribbon (slides in on hover) ───────────────────── */}
                {(year || rating || badge) && (
                    <div
                        className={[
                            "pointer-events-none absolute bottom-0 left-0 right-0 z-20 translate-y-3 pb-1",
                            "transition-all duration-300 group-hover:translate-y-0",
                            // Fade ribbon together with image so it never floats over skeleton
                            isLoaded ? "opacity-0 group-hover:opacity-100" : "opacity-0",
                        ].join(" ")}
                    >
                        <div className="flex items-center justify-between gap-2 rounded-b-md bg-black/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                            <div className="flex items-center gap-2">
                                {year && <span className="rounded-full border border-white/10 px-2 py-0.5 text-white/80">{year}</span>}
                                {badge && <span className="rounded-full border border-white/10 px-2 py-0.5 text-white/80">{badge}</span>}
                            </div>
                            {rating !== undefined && (
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-orange-200">
                                    {rating.toFixed(1)} ★
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Playback progress stroke ────────────────────────────────── */}
                {progress !== undefined && progress > 0 && progress < 100 && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800/50 z-20">
                        <div
                            className="h-full bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.8)] transition-all duration-300"
                            style={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
                        />
                    </div>
                )}
            </div>

            <span className="sr-only">Play {title}</span>
        </button>
    )
}
