import { cn } from "@/components/ui/core/styling"
import type { ContentTag } from "@/hooks/useHomeIntelligence"
import { Flame, Info, Play, Sparkles, Star } from "lucide-react"
import * as React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeroBannerItem {
    id: string
    title: string
    synopsis: string
    backdropUrl: string
    posterUrl?: string
    logoUrl?: string
    year?: string | number
    format?: string
    episodeCount?: number
    progress?: number
    /** Narrative arc name from IntelligenceService (e.g. "Saga de Cell") */
    arcName?: string
    /** Intelligence tag from backend */
    contentTag?: ContentTag
    /** 0–10 rating derived from LibraryMedia.Score */
    rating?: number
    /** Original numeric media ID — used for Quick Play resolution. */
    mediaId?: number
    onPlay: () => void
    onMoreInfo: () => void
}

export interface HeroBannerProps {
    items: HeroBannerItem[]
    initialIndex?: number
    autoRotateMs?: number
    className?: string
}

// ─── Utility hook ─────────────────────────────────────────────────────────────

function usePrefersReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

    React.useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
        const update = () => setPrefersReducedMotion(mediaQuery.matches)
        update()
        mediaQuery.addEventListener("change", update)
        return () => mediaQuery.removeEventListener("change", update)
    }, [])

    return prefersReducedMotion
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function EpicChip({ tag }: { tag?: ContentTag }) {
    if (tag !== "EPIC" && tag !== "SPECIAL") return null
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-0.5",
                "text-[0.65rem] font-black uppercase tracking-[0.22em]",
                tag === "EPIC"
                    ? "border-amber-400/50 bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                    : "border-blue-400/40 bg-blue-500/15 text-blue-300",
            )}
        >
            {tag === "EPIC" ? <Flame className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />}
            {tag === "EPIC" ? "Épico" : "Especial"}
        </span>
    )
}

function ArcChip({ arcName }: { arcName?: string }) {
    if (!arcName) return null
    return (
        <span className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-3 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-zinc-300 backdrop-blur-md">
            {arcName}
        </span>
    )
}

function RatingRing({ rating }: { rating: number }) {
    if (rating < 7) return null
    const colour =
        rating >= 8.5 ? "text-amber-400" : rating >= 7.5 ? "text-orange-400" : "text-zinc-300"
    return (
        <div className={cn("flex items-center gap-1 text-[0.7rem] font-bold", colour)}>
            <Star className="h-3 w-3 fill-current" />
            {rating.toFixed(1)}
        </div>
    )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function HeroBanner({
    items,
    initialIndex = 0,
    autoRotateMs = 8000,
    className,
}: HeroBannerProps) {
    const prefersReducedMotion = usePrefersReducedMotion()
    const [activeIndex, setActiveIndex] = React.useState(initialIndex)
    const [isPaused, setIsPaused] = React.useState(false)

    React.useEffect(() => {
        setActiveIndex(initialIndex)
    }, [initialIndex])

    React.useEffect(() => {
        if (prefersReducedMotion || items.length <= 1 || isPaused) return

        const intervalId = window.setInterval(() => {
            setActiveIndex((current) => (current + 1) % items.length)
        }, autoRotateMs)

        return () => window.clearInterval(intervalId)
    }, [autoRotateMs, items.length, prefersReducedMotion, isPaused])

    if (items.length === 0) return null

    const activeItem = items[activeIndex] ?? items[0]

    return (
        <section
            aria-label="Contenido destacado"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className={cn(
                "relative flex min-h-[720px] w-full items-end overflow-hidden bg-black",
                "h-[100dvh] max-h-[1100px]",
                className,
            )}
        >
            {/* ── Backdrop images ────────────────────────────────────────── */}
            <div className="absolute inset-0">
                {items.map((item, index) => (
                    <img
                        key={item.id}
                        src={item.backdropUrl}
                        alt=""
                        aria-hidden="true"
                        className={cn(
                            "absolute inset-0 h-full w-full object-cover object-center",
                            "transition-opacity duration-700 ease-out motion-reduce:transition-none",
                            index === activeIndex ? "opacity-100" : "opacity-0",
                        )}
                    />
                ))}
            </div>

            {/* ── Cinematic vignette stack ───────────────────────────────── */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_38%)]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/65 to-black/5" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
            
            {/* The Perfect Fade to Black: seamless transition to the body bg */}
            <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black via-black/80 to-transparent" />

            {/* ── Content ───────────────────────────────────────────────── */}
            <div className="relative z-10 mx-auto flex w-full max-w-[1680px] flex-col justify-end gap-6 px-6 pb-16 pt-36 md:px-10 lg:px-14 lg:pb-20 xl:flex-row xl:items-end xl:justify-between">
                {/* Left: metadata + CTAs */}
                <div className="max-w-3xl">
                    {/* Intelligence chips + meta strip */}
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                        <EpicChip tag={activeItem.contentTag} />
                        <ArcChip arcName={activeItem.arcName} />
                        {activeItem.rating !== undefined && <RatingRing rating={activeItem.rating} />}
                        {activeItem.format && (
                            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                                {activeItem.format}
                            </span>
                        )}
                        {activeItem.year !== undefined && (
                            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                                {activeItem.year}
                            </span>
                        )}
                        {activeItem.episodeCount !== undefined && (
                            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                                {activeItem.episodeCount} ep.
                            </span>
                        )}
                    </div>

                    {/* Title or logo */}
                    {activeItem.logoUrl ? (
                        <img
                            src={activeItem.logoUrl}
                            alt={activeItem.title}
                            className="mb-6 max-h-28 max-w-[min(32rem,80vw)] object-contain object-left"
                        />
                    ) : (
                        <h1 className="mb-6 max-w-4xl text-5xl font-black leading-[0.92] tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-zinc-200 to-zinc-600 drop-shadow-2xl md:text-7xl xl:text-[5.5rem]">
                            {activeItem.title}
                        </h1>
                    )}

                    <p className="line-clamp-3 max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
                        {activeItem.synopsis || "Sinopsis no disponible."}
                    </p>

                    {/* CTAs */}
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={activeItem.onPlay}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground",
                                "shadow-[0_0_20px_rgba(249,115,22,0.45)]",
                                "transition-all duration-200 hover:bg-primary/90 hover:shadow-[0_0_28px_rgba(249,115,22,0.6)]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80",
                            )}
                        >
                            <Play className="h-4 w-4 fill-current" />
                            Reproducir
                        </button>
                        <button
                            type="button"
                            onClick={activeItem.onMoreInfo}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/8 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md",
                                "transition-all duration-200 hover:border-white/25 hover:bg-white/14",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                            )}
                        >
                            <Info className="h-4 w-4" />
                            Más info
                        </button>
                    </div>
                </div>

                {/* Right: glass poster (xl only) */}
                <div className="hidden w-full max-w-sm xl:block">
                    <div className="overflow-hidden rounded-[2rem] border border-white/12 bg-white/6 p-4 shadow-2xl backdrop-blur-xl">
                        {activeItem.posterUrl ? (
                            <div className="relative">
                                <img
                                    src={activeItem.posterUrl}
                                    alt={activeItem.title}
                                    className="aspect-[2/3] w-full rounded-[1.5rem] object-cover shadow-[0_18px_40px_rgba(0,0,0,0.4)]"
                                />
                                {activeItem.contentTag === "EPIC" && (
                                    <div className="absolute inset-0 rounded-[1.5rem] ring-2 ring-amber-400/40 shadow-[inset_0_0_30px_rgba(245,158,11,0.15)]" />
                                )}
                            </div>
                        ) : (
                            <div className="aspect-[2/3] w-full rounded-[1.5rem] bg-zinc-900" />
                        )}

                        {activeItem.progress !== undefined && (
                            <div className="mt-4">
                                <div className="mb-2 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.18em] text-zinc-400">
                                    <span>Continuar viendo</span>
                                    <span>{Math.round(activeItem.progress)}%</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full bg-primary shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                                        style={{
                                            width: `${Math.min(100, Math.max(0, activeItem.progress))}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Dot navigation ────────────────────────────────────────── */}
            {items.length > 1 && (
                <div className="absolute bottom-8 left-6 z-10 flex items-center gap-2 md:left-10 lg:left-14">
                    {items.map((item, index) => (
                        <button
                            key={item.id}
                            type="button"
                            aria-label={`Mostrar ${item.title}`}
                            aria-pressed={index === activeIndex}
                            onClick={() => setActiveIndex(index)}
                            className={cn(
                                "h-1.5 rounded-full bg-white/20 transition-all duration-300 motion-reduce:transition-none",
                                index === activeIndex ? "w-10 bg-white" : "w-4 hover:bg-white/50",
                            )}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}
