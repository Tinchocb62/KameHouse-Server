import { cn } from "@/components/ui/core/styling"
import type { CardAspect } from "@/api/types/intelligence.types"
import { Play, Info, Sparkles, Plus, Check } from "lucide-react"
import * as React from "react"
import { getHighResImage, getMediumResImage } from "@/lib/helpers/images"
import { DeferredImage } from "@/components/shared/deferred-image"
import { GlowingEffect } from "@/components/shared/glowing-effect"
import { useAppStore } from "@/lib/store"
import { useResponsive } from "@/hooks/use-responsive"
import { Icons } from "@/components/ui/icons"
import { Vaul, VaulContent } from "@/components/vaul"

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
    const { isMobile } = useResponsive()
    const [drawerOpen, setDrawerOpen] = React.useState(false)
    const [isHovered, setIsHovered] = React.useState(false)
    const [showPopup, setShowPopup] = React.useState(false)
    const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
    const tvMode = useAppStore(state => state.tvMode)

    const handleMouseEnter = React.useCallback(() => {
        if (isMobile) return
        setIsHovered(true)
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)

        // Debounce hover activation by 350ms to verify "hover intent" (Netflix style)
        hoverTimeoutRef.current = setTimeout(() => {
            setShowPopup(true)
            onPopupOpenChange?.(true)
        }, 350)
    }, [onPopupOpenChange, isMobile])

    const handleMouseLeave = React.useCallback(() => {
        if (isMobile) return
        setIsHovered(false)
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = null
        }
        setShowPopup(false)
        onPopupOpenChange?.(false)
    }, [onPopupOpenChange, isMobile])

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
                            "z-[100] bg-surface-container backdrop-blur-overlay-md border border-outline-variant/10 shadow-overlay",
                            isPoster
                                ? "-top-[12%] -left-[12.5%] w-[125%] h-[135%] rounded-container"
                                : "-top-[15%] -left-[10%] w-[120%] h-[135%] rounded-container"
                        )
                        : cn(
                            "z-10 w-full h-full bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_10%,transparent)] border border-outline-variant/5 hover:border-brand-accent/30 hover:shadow-[0_0_20px_hsl(var(--brand-accent)/0.15)] shadow-elevation-2 group cursor-pointer",
                            isPoster ? "rounded-xl" : "rounded-container"
                        )
                )}
                style={{
                    willChange: showPopup ? "transform, opacity" : "auto",
                    contentVisibility: "auto",
                    containIntrinsicSize: "auto 280px",
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
                        "absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent transition-opacity duration-500",
                        showPopup ? "opacity-100" : "opacity-75 group-hover:opacity-85"
                    )} />

                    {/* Glass sheen sweep */}
                    {!showPopup && !tvMode && (
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
                            <div className="bg-surface-container/90 text-on-surface-variant border-r border-b border-outline-variant/10 px-3 py-1.5 rounded-br-xl font-black text-[10px] tracking-[0.15em] uppercase flex items-center gap-1 shadow-elevation-2">
                                <span>EP</span>
                                <span className="text-brand-accent">{episodeNumber}</span>
                            </div>
                        </div>
                    )}

                    {/* Media Type Badge (e.g. PELÍCULA, EPISODIO, OVA) */}
                    {mediaTypeBadge && (
                        <div className="absolute top-0 right-0 z-20">
                            <div className="bg-surface-container/90 text-on-surface-variant border-l border-b border-outline-variant/10 px-2.5 py-1 rounded-bl-xl font-black text-[8px] tracking-[0.2em] uppercase shadow-elevation-2">
                                {mediaTypeBadge}
                            </div>
                        </div>
                    )}

                    {/* Quick Play Action Indicator */}
                    {showPopup && (
                        <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-accent text-primary-foreground shadow-elevation-3 hover:scale-110 hover:shadow-[0_0_20px_hsl(var(--brand-accent)/0.2)] active:scale-95 transition-all duration-300 cursor-pointer">
                                <Play size={16} className="ml-0.5 fill-current" />
                            </div>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/10 bg-surface-container/90 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
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
                                <span className="text-brand-success font-extrabold flex items-center gap-1">
                                    {(rating * 10).toFixed(0)}% COINCIDENCIA
                                </span>
                            )}
                            {year && <span className="text-on-surface-variant font-medium">{year}</span>}
                            {badge && (
                                <span className="border border-outline-variant/10 bg-surface-variant px-1.5 py-0.5 rounded text-on-surface-variant text-[8px]">
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
                                        className="text-[8px] font-bold tracking-widest uppercase bg-gradient-to-r from-brand-accent/15 via-brand-accent/25 to-brand-accent/15 border border-brand-accent/30 text-brand-accent px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-ki-shimmer"
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
                            className="h-full bg-brand-accent shadow-[0_0_8px_hsl(var(--brand-accent)/0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {isMobile && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setDrawerOpen(true)
                        }}
                        className="absolute top-2 right-2 z-[30] p-2 rounded-full bg-zinc-950/60 backdrop-blur-[var(--blur-overlay-sm)] border border-white/10 text-white/70 active:scale-95 transition-all"
                        aria-label="Más opciones"
                    >
                        <Icons.ui.moreHorizontal className="w-4 h-4" />
                    </button>
                )}
            </div>
            
            {isMobile && (
                <Vaul open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <VaulContent className="bg-zinc-950/95 backdrop-blur-[var(--blur-overlay-xl)] border-t border-outline-variant/10 p-5 pb-8 flex flex-col focus:outline-none">
                        <div className="flex gap-4 mb-4">
                            <img
                                src={getMediumResImage(artwork)}
                                alt={title}
                                className="w-20 aspect-[2/3] object-cover rounded-xl border border-white/10 shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                                <h3 className="font-bebas text-2xl text-on-surface uppercase tracking-wide truncate">
                                    {title}
                                </h3>
                                {subtitle && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mt-1 truncate">
                                        {subtitle}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                                    {rating && (
                                        <span className="text-brand-success font-extrabold">
                                            {(rating * 10).toFixed(0)}% COINCIDENCIA
                                        </span>
                                    )}
                                    {year && <span className="text-on-surface-variant font-medium">{year}</span>}
                                    {badge && (
                                        <span className="border border-outline-variant/10 bg-surface-variant px-1.5 py-0.5 rounded text-on-surface-variant text-[8px]">
                                            {badge}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {description && (
                            <p className="text-[11px] leading-relaxed text-on-surface-variant line-clamp-4 mb-6">
                                {cleanDesc}
                            </p>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setDrawerOpen(false)
                                    onClick?.()
                                }}
                                className="w-full py-3 bg-primary text-on-surface font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                <Icons.media.play className="w-4 h-4 fill-current" />
                                <span>Ver Detalles</span>
                            </button>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="w-full py-3 border border-outline-variant/30 text-on-surface-variant font-bold uppercase tracking-wider text-xs rounded-xl active:scale-95 transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    </VaulContent>
                </Vaul>
            )}
        </div>
    )
})
MediaCard.displayName = "MediaCard"
