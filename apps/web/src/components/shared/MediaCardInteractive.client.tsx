"use client"

import React, { ReactNode } from "react"
import { Play } from "lucide-react" // Expecting lucide-react to be installed

export interface MediaCardInteractiveProps {
    id: string | number
    title: string
    year?: string | number
    rating?: number
    badge?: string
    onClick?: () => void
    children?: ReactNode
}

/**
 * Lightweight Client Component wrapper to handle interactivity over Server-Rendered grid items.
 * Relies entirely on Tailwind group-hover physics for the play button overlay.
 */
export function MediaCardInteractive({
    id,
    title,
    year,
    rating,
    badge,
    onClick,
    children,
}: MediaCardInteractiveProps) {
    return (
        <button
            type="button"
            className="group absolute inset-0 z-10 flex h-full w-full cursor-pointer flex-col justify-end text-left outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md"
            onClick={onClick}
            aria-label={`Play ${title}`}
        >
            {children}

            {/* Hardware-accelerated hover overlay (darkens card, shows Play button) */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 backdrop-blur-none transition-all duration-300 group-hover:bg-black/40 group-hover:opacity-100 group-hover:backdrop-blur-[2px]">
                <div className="flex h-12 w-12 transform items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <Play className="ml-1 h-6 w-6 fill-current" />
                </div>
            </div>

            {/* Quick metadata ribbon (appears on hover) */}
            {(year || rating || badge) && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
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

            <span className="sr-only">Play {title}</span>
        </button>
    )
}
