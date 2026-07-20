import { cn } from "@/components/ui/core/styling"
import type { CardAspect } from "@/api/types/intelligence.types"
import * as React from "react"
import { getMediumResImage } from "@/lib/helpers/images"
import { DeferredImage } from "@/components/shared/deferred-image"
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
    /** Tarjeta reducida — Settings → Apariencia → Carruseles Compactos */
    compact?: boolean
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
    compact = false,
}: MediaCardProps) {
    const isPoster = aspect === "poster"
    const { isMobile } = useResponsive()
    const [drawerOpen, setDrawerOpen] = React.useState(false)
    const [isHovered, setIsHovered] = React.useState(false)
    const tvMode = useAppStore(state => state.tvMode)

    const handleMouseEnter = React.useCallback(() => {
        if (isMobile) return
        setIsHovered(true)
    }, [isMobile])

    const handleMouseLeave = React.useCallback(() => {
        if (isMobile) return
        setIsHovered(false)
    }, [isMobile])



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
                    ? (compact
                        ? "aspect-[2/3] w-[132px] md:w-[160px] lg:w-[192px] 2xl:w-[212px] 3xl:w-[232px]"
                        : "aspect-[2/3] w-[160px] md:w-[200px] lg:w-[240px] 2xl:w-[264px] 3xl:w-[288px]")
                    : (compact
                        ? "aspect-[16/9] w-[224px] md:w-[304px] lg:w-[352px] 2xl:w-[384px] 3xl:w-[416px]"
                        : "aspect-[16/9] w-[280px] md:w-[380px] lg:w-[440px] 2xl:w-[480px] 3xl:w-[520px]"),
                className
            )}
        >
            <div
                onClick={onClick}
                className={cn(
                    "absolute top-0 left-0 overflow-hidden flex flex-col origin-top",
                    "transition-all duration-base",
                    "z-10 hover:z-20 hover:scale-[1.03] transform-gpu w-full h-full bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_10%,transparent)] border border-outline-variant/5 hover:border-brand-accent/30 hover:shadow-[0_0_20px_hsl(var(--brand-accent)/0.15)] shadow-elevation-2 group cursor-pointer",
                    isPoster ? "rounded-xl" : "rounded-container"
                )}
                style={{
                    contentVisibility: "auto",
                    containIntrinsicSize: "auto 280px",
                }}
            >
                {/* Artwork Container */}
                <div className="relative w-full overflow-hidden shrink-0 h-full">
                    <DeferredImage
                        src={getMediumResImage(artwork)}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-slow [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] group-hover:scale-105"
                    />

                    {/* Shadow Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent transition-opacity duration-slow opacity-75 group-hover:opacity-85" />

                    {/* Glass sheen sweep */}
                    {!tvMode && (
                        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[inherit]">
                            <div
                                className={cn(
                                    "w-1/3 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 absolute inset-y-0 transition-transform duration-slow ease-out translate-x-[-150%]",
                                    isHovered && "translate-x-[150%]"
                                )}
                            />
                        </div>
                    )}

                    {/* Episode/Saga Badge */}
                    {episodeNumber !== undefined && (
                        <div className="absolute top-0 left-0 z-20">
                            <div className="bg-surface-container/90 text-on-surface-variant border-r border-b border-outline-variant/10 px-3 py-1.5 rounded-br-xl font-black text-label-sm tracking-display uppercase flex items-center gap-1 shadow-elevation-2">
                                <span>EP</span>
                                <span className="text-brand-accent">{episodeNumber}</span>
                            </div>
                        </div>
                    )}

                    {/* Media Type Badge (e.g. PELÍCULA, EPISODIO, OVA) */}
                    {mediaTypeBadge && (
                        <div className="absolute top-0 right-0 z-20">
                            <div className="bg-surface-container/90 text-on-surface-variant border-l border-b border-outline-variant/10 px-2.5 py-1 rounded-bl-xl font-black text-label-sm tracking-ultra uppercase shadow-elevation-2">
                                {mediaTypeBadge}
                            </div>
                        </div>
                    )}

                    {/* Static Text Content */}
                    <div className="absolute inset-0 z-10 flex flex-col justify-end p-4 md:p-5 transition-transform duration-slow ease-out group-hover:translate-y-[-2px]">
                        <div className="space-y-1.5">
                            <h3 className="font-display text-lg md:text-xl leading-none tracking-wide text-on-surface line-clamp-1">
                                {title}
                            </h3>
                            {subtitle && (
                                <p className="text-label-sm font-black uppercase tracking-display text-on-surface/40 group-hover:text-on-surface/60 transition-colors duration-slow line-clamp-1">
                                    {subtitle}
                                </p>
                            )}
                        </div>
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
                                <h3 className="font-display text-2xl text-on-surface uppercase tracking-wide truncate">
                                    {title}
                                </h3>
                                {subtitle && (
                                    <p className="text-label-sm font-black uppercase tracking-widest text-on-surface-variant mt-1 truncate">
                                        {subtitle}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-2 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                                    {rating && (
                                        <span className="text-brand-success font-extrabold">
                                            {(rating * 10).toFixed(0)}% COINCIDENCIA
                                        </span>
                                    )}
                                    {year && <span className="text-on-surface-variant font-medium">{year}</span>}
                                    {badge && (
                                        <span className="border border-outline-variant/10 bg-surface-variant px-1.5 py-0.5 rounded-md text-on-surface-variant text-label-sm">
                                            {badge}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {description && (
                            <p className="text-caption leading-relaxed text-on-surface-variant line-clamp-4 mb-6">
                                {cleanDesc}
                            </p>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setDrawerOpen(false)
                                    onClick?.()
                                }}
                                className="w-full py-3 bg-brand-accent text-on-primary font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
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
