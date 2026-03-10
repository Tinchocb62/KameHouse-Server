import { cn } from "@/components/ui/core/styling"
import type { CardAspect } from "@/lib/home-catalog"
import { Folder, Zap } from "lucide-react"
import * as React from "react"
import { DeferredImage } from "@/components/shared/deferred-image"

// ─── Intelligence tag colours ─────────────────────────────────────────────────

const TAG_STYLES: Record<string, string> = {
    EPIC:    "text-amber-400",
    FILLER:  "text-zinc-500",
    SPECIAL: "text-blue-400",
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaCardProps {
    artwork: string
    title: string
    subtitle?: string
    /** Top-left format badge (e.g. "TV", "MOVIE") */
    badge?: string
    availabilityType?: "FULL_LOCAL" | "HYBRID" | "ONLY_ONLINE"
    description?: string
    /** Enforce strict aspect ratio */
    aspect?: CardAspect
    progress?: number
    progressColor?: "white" | "orange"
    /** Intelligence ContentTag — rendered as a tiny bottom label */
    intelligenceTag?: string
    /** Quick metadata for the hover ribbon */
    year?: string | number
    rating?: number
    onClick?: () => void
    className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MediaCard({
    artwork,
    title,
    subtitle,
    badge,
    availabilityType,
    aspect = "poster",
    progress,
    progressColor = "orange",
    intelligenceTag,
    year,
    rating,
    onClick,
    className,
}: MediaCardProps) {
    const isPoster = aspect === "poster"

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={title}
            onClick={onClick}
            onKeyDown={(e) => e.key === "Enter" && onClick?.()}
            className={cn(
                // Base — group for child hover triggers
                "group/card relative shrink-0 cursor-pointer overflow-hidden rounded-md",
                // Stremio-style subtle border — brightens on hover
                "border border-white/5 hover:border-white/20",
                // Flat lift: scale only, no translate — hardware-composited
                "transition-all duration-300 ease-out will-change-transform",
                "hover:-translate-y-1 hover:scale-105",
                "hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] hover:z-50",
                // Aria / focus ring
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                // Intrinsic sizing by aspect ratio
                isPoster
                    ? "aspect-[2/3] w-[140px] md:w-[170px] lg:w-[200px]"
                    : "aspect-[16/9] w-[240px] md:w-[300px] lg:w-[340px]",
                className,
            )}
        >
            {/* ── Poster / Backdrop image (Deferred) ────────────────────── */}
            <DeferredImage
                src={artwork}
                alt={title}
                className="absolute inset-0 h-full w-full select-none object-cover"
                onError={(e) => {
                    ;(e.target as HTMLImageElement).src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='%2318181b'/%3E%3C/svg%3E"
                }}
            />

            {/* ── Top-right: source icon (Folder / Zap) ─────────────────── */}
            {availabilityType && (
                <div className="absolute right-1.5 top-1.5 z-20">
                    <span
                        title={
                            availabilityType === "FULL_LOCAL"
                                ? "Local"
                                : availabilityType === "HYBRID"
                                  ? "Híbrido"
                                  : "Solo Online"
                        }
                        className="flex items-center justify-center rounded bg-black/60 p-1 backdrop-blur-sm border border-white/8"
                    >
                        {availabilityType === "ONLY_ONLINE" ? (
                            <Zap className="h-2.5 w-2.5 text-white/70" />
                        ) : (
                            <Folder className="h-2.5 w-2.5 text-white/70" />
                        )}
                    </span>
                </div>
            )}

            {/* ── Top-left: format badge (hidden on hover) ──────────────── */}
            {badge && (
                <div className="absolute left-1.5 top-1.5 z-20 transition-opacity duration-300 group-hover/card:opacity-0">
                    <span className="rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/60 backdrop-blur-sm border border-white/8">
                        {badge}
                    </span>
                </div>
            )}

            {/* ── Bottom gradient + text ─────────────────────────────────── */}
            <div
                className={cn(
                    "absolute inset-x-0 bottom-0 z-10",
                    isPoster ? "h-[45%]" : "h-[55%]",
                    "bg-gradient-to-t from-black/90 via-black/50 to-transparent",
                )}
            />

            {/* ── Title + intelligence tag ───────────────────────────────── */}
            <div className="absolute inset-x-0 bottom-0 z-20 px-2.5 pb-2.5 pt-6">
                <p className="line-clamp-1 text-[0.72rem] font-medium leading-tight text-white/90 drop-shadow">
                    {title}
                </p>

                <div className="mt-0.5 flex items-center justify-between gap-1">
                    {subtitle && (
                        <p className="truncate text-[0.62rem] text-zinc-500">{subtitle}</p>
                    )}
                    {intelligenceTag && TAG_STYLES[intelligenceTag] && (
                        <span
                            className={cn(
                                "shrink-0 text-[0.58rem] font-bold uppercase tracking-widest",
                                TAG_STYLES[intelligenceTag],
                            )}
                        >
                            {intelligenceTag === "EPIC"
                                ? "ÉPICO"
                                : intelligenceTag === "FILLER"
                                  ? "RELLENO"
                                  : "ESPECIAL"}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Play button overlay (appears on hover) ────────────────── */}
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/0 opacity-0 backdrop-blur-none transition-all duration-300 group-hover/card:bg-black/40 group-hover/card:opacity-100 group-hover/card:backdrop-blur-[1px]">
                <div className="flex h-12 w-12 transform items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-transform duration-300 group-hover/card:scale-110">
                    <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
            </div>

            {/* ── Quick metadata ribbon (appears on hover) ──────────────── */}
            {(year || rating || badge) && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-40 translate-y-3 opacity-0 transition-all duration-300 group-hover/card:translate-y-0 group-hover/card:opacity-100">
                    <div className="flex items-center justify-between gap-2 bg-black/80 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/90 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            {year && <span className="rounded-full border border-white/10 px-2 py-0.5">{year}</span>}
                            {badge && <span className="rounded-full border border-white/10 px-2 py-0.5">{badge}</span>}
                        </div>
                        {rating !== undefined && (
                            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-orange-200">
                                {rating.toFixed(1)} ★
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* ── Progress bar ──────────────────────────────────────────── */}
            {progress !== undefined && (
                <div className="absolute inset-x-0 bottom-0 z-50 h-[3px] bg-white/10">
                    <div
                        className={cn(
                            "h-full",
                            progressColor === "orange" ? "bg-orange-500" : "bg-white/60",
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                </div>
            )}
        </div>
    )
}
