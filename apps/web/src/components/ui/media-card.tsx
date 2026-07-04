import { cn } from "@/components/ui/core/styling"
import type { CardAspect } from "@/api/types/intelligence.types"
import { Play, Info, Sparkles, Plus, Check } from "lucide-react"
import * as React from "react"
import { getHighResImage, getMediumResImage } from "@/lib/helpers/images"
import { DeferredImage } from "@/components/shared/deferred-image"
import { GlowingEffect } from "@/components/shared/glowing-effect"

export interface MediaCardProps {
    artwork: string
    title: string
    subtitle?: string
    badge?: string
    mediaTypeBadge?: string
    availabilityType?: "FULL_LOCAL" | "HYBRID" | "ONLY_ONLINE"
    description?: string
    aspect?: CardAspect
    progress?: number
    year?: string | number
    rating?: number
    episodeNumber?: number
    onClick?: () => void
    className?: string
    layoutId?: string
    onPopupOpenChange?: (isOpen: boolean) => void
}

export const MediaCard = React.memo(function MediaCard({
    artwork,
    title,
    subtitle,
    badge,
    mediaTypeBadge,
    description,
    aspect = "poster",
    progress,
    year,
    rating,
    episodeNumber,
    onClick,
    className,
    layoutId,
    onPopupOpenChange,
}: MediaCardProps) {
    const isPoster = aspect === "poster"
    const [isHovered, setIsHovered] = React.useState(false)
    const [showPopup, setShowPopup] = React.useState(false)
    const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const handleMouseEnter = React.useCallback(() => {
        setIsHovered(true)
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        
        // Debounce hover activation by 350ms to verify "hover intent" (Netflix style)
        hoverTimeoutRef.current = setTimeout(() => {
            setShowPopup(true)
            onPopupOpenChange?.(true)
        }, 350)
    }, [onPopupOpenChange])

    const handleMouseLeave = React.useCallback(() => {
        setIsHovered(false)
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = null
        }
        setShowPopup(false)
        onPopupOpenChange?.(false)
    }, [onPopupOpenChange])

    React.useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        }
    }, [])

    // Extract vibes/moods from subtitle if it exists (e.g. "2024 · TV · EPIC · CHILL")
    const vibes = React.useMemo(() => {
        if (!subtitle) return []
        return subtitle
            .split("·")
            .map((s) => s.trim())
            .filter((s) => ["EPIC", "CHILL", "EMOTIONAL", "HYPE", "INTENSE", "ÉPICO", "ESENCIAL", "LOCAL", "RELLENO", "ESPECIAL"].includes(s.toUpperCase()))
    }, [subtitle])

    const cleanDesc = React.useMemo(
        () => description?.replace(/<[^>]*>/g, '') ?? '',
        [description]
    )

    return (
        <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "relative shrink-0 select-none",
                isPoster
                    ? "aspect-[2/3] w-[160px] md:w-[200px] lg:w-[240px]"
                    : "aspect-[16/9] w-[280px] md:w-[380px] lg:w-[440px]"
            )}
        >
            <div
                onClick={onClick}
                className={cn(
                    "absolute top-0 left-0 overflow-hidden flex flex-col origin-top",
                    "transition-all duration-300",
                    showPopup
                        ? cn(
                              "z-[100] bg-surface-container backdrop-blur-overlay-xl border border-outline-variant/10 shadow-overlay",
                              isPoster
                                  ? "-top-[12%] -left-[12.5%] w-[125%] h-[135%] rounded-container"
                                  : "-top-[15%] -left-[10%] w-[120%] h-[135%] rounded-container"
                          )
                        : cn(
                              "z-10 w-full h-full bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_10%,transparent)] border border-outline-variant/5 hover:border-brand-orange/30 hover:shadow-[0_0_20px_hsl(var(--brand-orange)/0.15)] shadow-elevation-2 group cursor-pointer",
                              isPoster ? "rounded-xl" : "rounded-container"
                          )
                )}
                style={{
                    willChange: showPopup ? "transform, opacity" : "auto",
                }}
            >
                {/* Glowing effect inside expanded card */}
                {showPopup && (
                    <GlowingEffect glow={true} blur={8} spread={40} disabled={false} borderWidth={1.5} className="opacity-30 pointer-events-none" />
                )}

                {/* Artwork Container */}
                <div className={cn("relative w-full overflow-hidden shrink-0", showPopup ? "aspect-[16/9]" : "h-full")}>
                    <DeferredImage
                        src={getMediumResImage(artwork)}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-1000 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] group-hover:scale-105"
                    />
                    
                    {/* Shadow Gradient Overlay */}
                    <div className={cn(
                        "absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent transition-opacity duration-500",
                        showPopup ? "opacity-100" : "opacity-75 group-hover:opacity-85"
                    )} />

                    {/* Glass sheen sweep */}
                    {!showPopup && (
                        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[inherit]">
                            <div 
                                className={cn(
                                    "w-1/3 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 absolute inset-y-0 transition-transform duration-700 ease-out translate-x-[-150%]",
                                    isHovered && "translate-x-[150%]"
                                )}
                            />
                        </div>
                    )}

                    {/* Episode/Saga Badge */}
                    {episodeNumber !== undefined && (
                        <div className="absolute top-0 left-0 z-20">
                            <div className="bg-surface-container backdrop-blur-overlay-md text-on-surface-variant border-r border-b border-outline-variant/10 px-3 py-1.5 rounded-br-xl font-black text-[10px] tracking-[0.15em] uppercase flex items-center gap-1 shadow-elevation-2">
                                <span>EP</span>
                                <span className="text-brand-orange">{episodeNumber}</span>
                            </div>
                        </div>
                    )}

                    {/* Media Type Badge (e.g. PELÍCULA, EPISODIO, OVA) */}
                    {mediaTypeBadge && (
                        <div className="absolute top-0 right-0 z-20">
                            <div className="bg-surface-container backdrop-blur-overlay-md text-on-surface-variant border-l border-b border-outline-variant/10 px-2.5 py-1 rounded-bl-xl font-black text-[8px] tracking-[0.2em] uppercase shadow-elevation-2">
                                {mediaTypeBadge}
                            </div>
                        </div>
                    )}

                    {/* Quick Play Action Indicator */}
                    {showPopup && (
                        <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange text-white shadow-elevation-3 hover:scale-110 hover:shadow-brand-orange/20 active:scale-95 transition-all duration-300 cursor-pointer">
                                <Play size={15} fill="currentColor" className="ml-0.5" />
                            </div>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/10 bg-surface-container backdrop-blur-overlay-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
                                <Plus size={15} />
                            </div>
                        </div>
                    )}

                    {/* Static Text Content (only when not popped up) */}
                    {!showPopup && (
                        <div className="absolute inset-0 z-10 flex flex-col justify-end p-4 md:p-5 transition-transform duration-500 ease-out group-hover:translate-y-[-2px]">
                            <div className="space-y-1.5">
                                <h3 className="font-bebas text-lg md:text-xl leading-none tracking-wide text-on-surface line-clamp-1">
                                    {title}
                                </h3>
                                {subtitle && (
                                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-on-surface/40 group-hover:text-on-surface/60 transition-colors duration-500 line-clamp-1">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Extended Details Body */}
                <div
                    className={cn(
                        "p-4 space-y-2 select-none flex flex-col justify-between overflow-hidden bg-surface-container transition-all duration-300 ease-out transform-gpu",
                        showPopup 
                            ? "opacity-100 max-h-[220px] pointer-events-auto" 
                            : "opacity-0 max-h-0 py-0 pointer-events-none"
                    )}
                >
                    <div className="space-y-2">
                        <h3 className="font-bebas text-xl md:text-2xl leading-none text-on-surface uppercase tracking-wide line-clamp-1">
                            {title}
                        </h3>

                        {/* Tags / Meta Information */}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                            {rating && (
                                <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                                    {(rating * 10).toFixed(0)}% COINCIDENCIA
                                </span>
                            )}
                            {year && <span className="text-on-surface-variant font-medium">{year}</span>}
                            {badge && (
                                <span className="border border-outline-variant/10 bg-surface-variant backdrop-blur-overlay-md px-1.5 py-0.5 rounded text-on-surface-variant text-[8px]">
                                    {badge}
                                </span>
                            )}
                        </div>

                        {/* Dynamic AI Vibes / Mood Badges */}
                        {vibes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {vibes.slice(0, 3).map((vibe, idx) => (
                                    <span
                                        key={idx}
                                        className="text-[8px] font-bold tracking-widest uppercase bg-gradient-to-r from-brand-orange/15 via-amber-500/15 to-brand-orange/15 border border-brand-orange/30 text-brand-orange px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-ki-shimmer"
                                    >
                                        <Sparkles size={8} className="animate-pulse" />
                                        {vibe}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Description/Synopsis */}
                        {description && (
                            <p className="line-clamp-3 text-[11px] leading-relaxed text-on-surface-variant pt-1 font-medium select-none">
                                {cleanDesc}
                            </p>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                {progress !== undefined && (
                    <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-surface-variant">
                        <div
                            className="h-full bg-brand-orange shadow-[0_0_8px_hsl(var(--brand-orange)/0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    )
})
MediaCard.displayName = "MediaCard"
