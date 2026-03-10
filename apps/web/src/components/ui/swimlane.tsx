import { HorizontalDraggableScroll } from "@/components/ui/horizontal-draggable-scroll"
import { MediaCard } from "@/components/ui/media-card"
import { cn } from "@/components/ui/core/styling"
import type { CardAspect } from "@/lib/home-catalog"
import * as React from "react"

export interface SwimlaneItem {
    id: string
    title: string
    image: string
    subtitle?: string
    badge?: string
    availabilityType?: "FULL_LOCAL" | "HYBRID" | "ONLY_ONLINE"
    description?: string
    progress?: number
    aspect?: CardAspect
    /** ContentTag from IntelligenceService — rendered as a bottom label on the card */
    intelligenceTag?: string
    onClick: () => void
    /** URL to use as the dynamic home backdrop when this card is hovered */
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

const SwimlaneInner = React.memo(function SwimlaneInner({
    title,
    items,
    defaultAspect = "poster",
    onHover,
    className,
}: SwimlaneProps) {
    if (items.length === 0) {
        return null
    }

    return (
        <section className={cn("relative", className)}>
            <div className="mb-5 flex items-center gap-3 px-6 md:px-10 lg:px-14">
                <span className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="text-lg font-semibold uppercase tracking-[0.18em] text-zinc-200 md:text-xl">
                    {title}
                </h2>
            </div>

            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-30 hidden w-20 bg-gradient-to-r from-black to-transparent md:block" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-30 hidden w-20 bg-gradient-to-l from-black to-transparent md:block" />

                <HorizontalDraggableScroll
                    className="px-0"
                    containerClass="gap-4 px-6 pb-3 md:px-10 lg:px-14 snap-x snap-mandatory"
                    chevronOverlayClass="from-black/95 to-transparent"
                    scrollAmount={420}
                    safeDisplacement={18}
                    applyRubberBandEffect
                >
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="snap-start"
                            onMouseEnter={() => onHover?.(item.backdropUrl ?? null)}
                            onMouseLeave={() => onHover?.(null)}
                        >
                            <MediaCard
                                artwork={item.image}
                                title={item.title}
                                subtitle={item.subtitle}
                                badge={item.badge}
                                availabilityType={item.availabilityType}
                                description={item.description}
                                progress={item.progress}
                                aspect={item.aspect ?? defaultAspect}
                                intelligenceTag={item.intelligenceTag}
                                onClick={item.onClick}
                                className="motion-reduce:transition-none"
                            />
                        </div>
                    ))}
                </HorizontalDraggableScroll>
            </div>
        </section>
    )
})
SwimlaneInner.displayName = "Swimlane"

/** Public API — Swimlane with React.memo for backdrop-change isolation. */
export const Swimlane = SwimlaneInner
/** Alias provided for consumers that prefer the Carousel naming convention. */
export const MediaCarousel = SwimlaneInner
