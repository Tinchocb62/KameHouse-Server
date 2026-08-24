import { HorizontalDraggableScroll } from "@/components/ui/horizontal-draggable-scroll"
import { MediaCard, type MediaCardProps } from "./media-card"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/components/ui/core/styling"
import type { CardAspect } from "@/api/types/intelligence.types"
import * as React from "react"
import { useThemeSettings } from "@/lib/theme/theme-hooks"
import { useAppStore } from "@/lib/store"

export interface SwimlaneItem {
    id: string
    title: string
    image: string
    subtitle?: string
    badge?: string
    mediaTypeBadge?: string
    availabilityType?: "FULL_LOCAL" | "HYBRID" | "ONLY_ONLINE"
    description?: string
    progress?: number
    aspect?: CardAspect
    intelligenceTag?: string
    year?: string | number
    rating?: number
    episodeNumber?: number
    tmdbId?: number
    mediaId?: number
    onClick: () => void
    backdropUrl?: string
}

export interface SwimlaneProps {
    title: string
    items: SwimlaneItem[]
    defaultAspect?: CardAspect
    /**
     * Called with the hovered item's backdropUrl (or null on mouse leave).
     * Used by the home page to drive the Seanime-style dynamic backdrop.
     */
    onHover?: (url: string | null) => void
    className?: string
}

interface MediaStackProps extends MediaCardProps {
    stackCount?: number
}

function MediaStack({ stackCount = 2, className, ...props }: MediaStackProps) {
    const stackItems = Array.from({ length: stackCount }).map((_, i) => i + 1)

    return (
        <div className={cn("relative group/stack", className)}>
            {/* Background stack elements */}
            {stackItems.map((idx) => (
                <div
                    key={idx}
                    className={cn(
                        "absolute inset-0 border border-white/5 shadow-2xl overflow-hidden pointer-events-none",
                        "bg-zinc-900/90 rounded-xl transition-transform duration-300 ease-out",
                        idx === 1 && "translate-x-1 translate-y-1 group-hover/stack:translate-x-3 group-hover/stack:-translate-y-1 group-hover/stack:rotate-1",
                        idx === 2 && "translate-x-2 translate-y-2 group-hover/stack:translate-x-6 group-hover/stack:-translate-y-2 group-hover/stack:rotate-2"
                    )}
                    style={{
                        zIndex: 10 - idx,
                    }}
                />
            ))}

            {/* Main top card */}
            <div className="relative z-20 transition-transform duration-300 ease-out group-hover/stack:-translate-y-2">
                <MediaCard {...props} />
                
                {/* Minimalist Series Indicator */}
                <div className="absolute top-4 right-4 z-30">
                    <div className="bg-black/85 text-white/80 text-caption font-black px-2 py-1 rounded-md border border-white/10 uppercase tracking-ultra">
                        Serie
                    </div>
                </div>
            </div>
        </div>
    )
}

const SwimlaneInner = React.memo(function SwimlaneInner({
    title,
    items,
    defaultAspect = "poster",
    onHover,
    className,
}: SwimlaneProps) {
    const ts = useThemeSettings()
    const tvMode = useAppStore(state => state.tvMode)

    if (items.length === 0) {
        return null
    }

    return (
        <section className={cn("relative py-8 max-w-content mx-auto", className)}>
            {title && (
                <div className="mb-8 flex items-center page-px [&>*:not(:first-child)]:ml-4">
                    <h2 className="text-3xl font-display font-normal uppercase tracking-display text-white/90">
                        {title}
                    </h2>
                </div>
            )}

            <div className="relative group/swimlane">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-30 hidden w-48 bg-gradient-to-r from-background via-background/20 to-transparent md:block" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-30 hidden w-48 bg-gradient-to-l from-background via-background/20 to-transparent md:block" />

                <HorizontalDraggableScroll
                    className="px-0"
                    containerClass="page-px pt-16 pb-32 -mt-16 -mb-16 [&>*:not(:first-child)]:ml-6"
                    chevronOverlayClass="from-background/95 via-background/60 to-transparent"
                    scrollAmount={420}
                    safeDisplacement={18}
                    applyRubberBandEffect
                    autoScroll={!ts.themeDisableCarouselAutoScroll && !tvMode}
                >
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="snap-start shrink-0 transform-gpu animate-in fade-in duration-base"
                            style={{ contentVisibility: "auto", containIntrinsicSize: "auto 240px" }}
                            onMouseEnter={() => onHover?.(item.backdropUrl ?? null)}
                            onMouseLeave={() => onHover?.(null)}
                        >
                            {item.badge === "TV" ? (
                                <MediaStack
                                    {...item}
                                    artwork={item.image}
                                    aspect={item.aspect ?? defaultAspect}
                                    compact={!!ts.themeSmallerEpisodeCarouselSize}
                                />
                            ) : (
                                <MediaCard
                                    {...item}
                                    artwork={item.image}
                                    aspect={item.aspect ?? defaultAspect}
                                    compact={!!ts.themeSmallerEpisodeCarouselSize}
                                />
                            )}
                        </div>
                    ))}
                </HorizontalDraggableScroll>
            </div>
        </section>
    )
})
SwimlaneInner.displayName = "Swimlane"

export function SwimlaneSkeleton({
    aspect = "poster",
    itemCount = 6,
    className,
}: {
    title?: string
    aspect?: CardAspect
    itemCount?: number
    className?: string
}) {
    const cardWidths = {
        poster: "w-[160px] md:w-[200px] lg:w-[240px]",
        wide: "w-[280px] md:w-[360px] lg:w-[440px]",
        square: "w-[180px] md:w-[240px] lg:w-[300px]",
    }

    const cardAspects = {
        poster: "aspect-[2/3]",
        wide: "aspect-[16/9]",
        square: "aspect-square",
    }

    return (
        <section className={cn("relative py-8 max-w-content mx-auto", className)}>
            <div className="mb-10 flex items-center page-px [&>*:not(:first-child)]:ml-6">
                <Skeleton className="h-10 w-48 bg-white/5 rounded-lg" />
            </div>

            <div className="flex overflow-hidden page-px pb-3 [&>*:not(:first-child)]:ml-6">
                {Array.from({ length: itemCount }).map((_, i) => (
                    <div key={i} className={cn("flex-shrink-0", cardWidths[aspect])}>
                        <Skeleton className={cn("mb-6 bg-white/[0.03] border border-white/5 rounded-xl shadow-2xl", cardAspects[aspect])} />
                        <Skeleton className="mb-3 h-5 w-3/4 bg-white/[0.02] rounded-md" />
                        <Skeleton className="h-4 w-1/2 bg-white/[0.015] rounded-md" />
                    </div>
                ))}
            </div>
        </section>
    )
}


/** Public API — Swimlane with React.memo for backdrop-change isolation. */
export const Swimlane = SwimlaneInner
/** Alias provided for consumers that prefer the Carousel naming convention. */
export const MediaCarousel = SwimlaneInner
