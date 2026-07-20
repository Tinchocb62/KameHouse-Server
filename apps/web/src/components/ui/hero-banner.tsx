import { cn } from "@/components/ui/core/styling"
import { Skeleton } from "@/components/ui/skeleton"
import { Info, Play, ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ParticleBackground } from "@/components/shared/particle-bg"

export interface HeroBannerItem {
    id: string
    title: string
    synopsis: string
    backdropUrl: string
    posterUrl?: string
    year?: string | number
    format?: string
    rating?: number
    mediaId?: number
    youtubeTrailerId?: string // Optional YouTube trailer video ID
    onPlay: () => void
    onMoreInfo: () => void
}

export interface HeroBannerProps {
    items: HeroBannerItem[]
    initialIndex?: number
    autoRotateMs?: number
    className?: string
}

export function HeroBanner({
    items,
    initialIndex = 0,
    autoRotateMs = 8000,
    className,
}: HeroBannerProps) {
    const [activeIndex, setActiveIndex] = React.useState(initialIndex)
    const [isPaused, setIsPaused] = React.useState(false)
    const [playVideo, setPlayVideo] = React.useState(false)

    const handleNext = React.useCallback(() => {
        setActiveIndex((current) => (current + 1) % items.length)
    }, [items.length])

    const handlePrev = React.useCallback(() => {
        setActiveIndex((current) => (current - 1 + items.length) % items.length)
    }, [items.length])

    React.useEffect(() => {
        if (items.length <= 1 || isPaused || playVideo) return
        const interval = setInterval(() => {
            handleNext()
        }, autoRotateMs)
        return () => clearInterval(interval)
    }, [autoRotateMs, items.length, isPaused, handleNext, playVideo])

    const activeItem = items[activeIndex]

    // Reset video playback during render when active slide changes
    const [prevActiveIndex, setPrevActiveIndex] = React.useState(activeIndex)
    if (activeIndex !== prevActiveIndex) {
        setPrevActiveIndex(activeIndex)
        setPlayVideo(false)
    }

    // Activate YouTube trailer backdrop after 2.5s delay
    React.useEffect(() => {
        if (!activeItem?.youtubeTrailerId) return

        const timer = setTimeout(() => {
            setPlayVideo(true)
        }, 2500)

        return () => clearTimeout(timer)
    }, [activeIndex, activeItem?.youtubeTrailerId])

    if (!activeItem) return null

    return (
        <section
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className={cn(
                "relative w-full overflow-hidden bg-zinc-950 group/hero flex items-end",
                "h-[90vh] md:h-[95dvh] min-h-[780px] max-h-[1100px]",
                className
            )}
        >
            {/* ── Background Layer ─────────────────────────────── */}
            <AnimatePresence>
                <motion.div
                    key={activeItem.id}
                    initial={{ opacity: 0, scale: 1.06 }}
                    animate={{ opacity: 1, scale: 1.0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 1.4, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute inset-0 z-0 overflow-hidden"
                >
                    {/* Ken Burns slow zoom on the inner image — CSS compositor-driven (zero JS thread cost) */}
                    <img
                        key={`img-${activeItem.id}`}
                        src={activeItem.backdropUrl}
                        alt=""
                        className={cn(
                            "h-full w-full object-cover object-[center_15%] brightness-[0.45] saturate-[0.9] transition-opacity duration-1000 animate-hero-ken-burns",
                            playVideo && activeItem.youtubeTrailerId ? "opacity-0" : "opacity-100"
                        )}
                    />

                    {/* YouTube Trailer iframe */}
                    {activeItem.youtubeTrailerId && playVideo && (
                        <iframe
                            src={`https://www.youtube.com/embed/${activeItem.youtubeTrailerId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${activeItem.youtubeTrailerId}&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&playsinline=1&enablejsapi=1`}
                            className="absolute pointer-events-none brightness-[0.4] saturate-[0.8] transition-opacity duration-1000"
                            style={{
                                width: "100vw",
                                height: "56.25vw", /* 16:9 ratio */
                                minHeight: "100vh",
                                minWidth: "177.77vh",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%) scale(1.15)",
                            }}
                            allow="autoplay; encrypted-media"
                            title="Trailer"
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Particle Background */}
            <ParticleBackground className="absolute inset-0 z-[5] pointer-events-none opacity-40 mix-blend-screen" color="#FF6E3A" quantity={60} />

            {/* ── Cinematic Double Vignettes ───────────────── */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none" />
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent opacity-75 pointer-events-none" />
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-zinc-950/80 via-zinc-950/30 to-transparent pointer-events-none" />

            {/* ── Content ─────────────────────────────────── */}
            <div className="relative z-20 mx-auto h-full w-full max-w-[1800px] px-8 pb-48 md:px-16 flex flex-col justify-end">
                <div className="max-w-4xl space-y-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeItem.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="space-y-6"
                        >
                            {/* Metadata */}
                            <div className="flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-white/50 [&>*:not(:first-child)]:ml-4">
                                {activeItem.year && <span>{activeItem.year}</span>}
                                {activeItem.format && (
                                    <>
                                        <div className="h-1 w-1 rounded-full bg-white/20" />
                                        <span>{activeItem.format}</span>
                                    </>
                                )}
                                {activeItem.rating && (
                                    <>
                                        <div className="h-1 w-1 rounded-full bg-white/20" />
                                        <span className="text-emerald-400">{(activeItem.rating * 10).toFixed(0)}% Match</span>
                                    </>
                                )}
                            </div>

                            {/* Title */}
                            <h1 className="font-display text-[5.5rem] md:text-[8rem] lg:text-[10rem] xl:text-[11.5rem] leading-[0.8] tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-400 drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)] select-none">
                                {activeItem.title}
                            </h1>

                            {/* Synopsis */}
                            <p className="line-clamp-2 max-w-2xl text-lg leading-relaxed text-zinc-300 font-medium">
                                {activeItem.synopsis}
                            </p>

                            {/* Actions */}
                            <div className="flex items-center pt-4 [&>*:not(:first-child)]:ml-6">
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={activeItem.onPlay}
                                    className="flex items-center bg-brand-orange text-white px-10 py-4 rounded-xl font-display text-xl uppercase tracking-wider shadow-[0_15px_30px_-5px_rgba(255,110,58,0.3)] hover:shadow-[0_20px_40px_-5px_rgba(255,110,58,0.45)] border border-brand-orange/20 transition-all duration-300 [&>*:not(:first-child)]:ml-4"
                                >
                                    <Play size={20} fill="currentColor" />
                                    <span>Reproducir</span>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={activeItem.onMoreInfo}
                                    className="flex items-center bg-white/[0.03] backdrop-blur-md text-white px-10 py-4 rounded-xl border border-white/10 font-display text-xl uppercase tracking-wider hover:bg-white/[0.08] hover:border-white/25 transition-all duration-300 [&>*:not(:first-child)]:ml-4"
                                >
                                    <Info size={20} />
                                    <span>Detalles</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Slide Arrows ─────────────────────────────── */}
            {items.length > 1 && (
                <>
                    {/* Left Chevron */}
                    <div className="absolute inset-y-0 left-0 z-30 flex items-center pl-6 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: "rgba(24, 24, 27, 0.6)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                                e.stopPropagation()
                                handlePrev()
                            }}
                            className="pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full bg-zinc-900/40 backdrop-blur-md border border-white/5 text-white/70 hover:text-white transition-all duration-300 shadow-2xl"
                            aria-label="Previous Slide"
                        >
                            <ChevronLeft size={28} />
                        </motion.button>
                    </div>

                    {/* Right Chevron */}
                    <div className="absolute inset-y-0 right-0 z-30 flex items-center pr-6 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: "rgba(24, 24, 27, 0.6)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                                e.stopPropagation()
                                handleNext()
                            }}
                            className="pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full bg-zinc-900/40 backdrop-blur-md border border-white/5 text-white/70 hover:text-white transition-all duration-300 shadow-2xl"
                            aria-label="Next Slide"
                        >
                            <ChevronRight size={28} />
                        </motion.button>
                    </div>
                </>
            )}

            {/* ── Scroll Indicator ──────────────────────────── */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center opacity-40 hover:opacity-90 transition-opacity duration-300 pointer-events-none hidden md:flex [&>*:not(:first-child)]:mt-1.5">
                <span className="text-[9px] tracking-[0.3em] text-white/50 uppercase font-black">Explorar Catálogo</span>
                <div className="w-5 h-7 rounded-full border border-white/20 flex justify-center p-1">
                    <motion.div 
                        animate={{ y: [0, 6, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        className="w-1 h-1.5 rounded-full bg-brand-orange shadow-[0_0_6px_#ff6e3a]"
                    />
                </div>
            </div>

            {/* ── Indicators ──────────────────────────────── */}
            {items.length > 1 && (
                <div className="absolute bottom-10 right-16 z-30 flex items-center gap-2">
                    {items.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-500 ease-out",
                                activeIndex === idx 
                                    ? "w-10 bg-brand-orange shadow-[0_0_12px_rgba(255,110,58,0.4)]" 
                                    : "w-2.5 bg-white/25 hover:bg-white/50"
                            )}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}

export function HeroBannerSkeleton() {
    return (
        <div className="h-[90vh] md:h-[95dvh] min-h-[780px] max-h-[1100px] w-full bg-gradient-to-r from-zinc-950 via-zinc-900/30 to-zinc-950 animate-pulse relative flex items-end">
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
            <div className="mx-auto h-full w-full max-w-[1800px] px-8 pb-48 md:px-16 flex flex-col justify-end gap-6 relative z-10">
                <Skeleton className="h-4 w-32 bg-white/5 rounded-full" />
                <Skeleton className="h-28 w-2/3 bg-white/5 rounded-2xl" />
                <Skeleton className="h-16 w-1/2 bg-white/5 rounded-xl" />
                <div className="flex gap-4 pt-4">
                    <Skeleton className="h-14 w-40 bg-white/5 rounded-xl" />
                    <Skeleton className="h-14 w-40 bg-white/5 rounded-xl" />
                </div>
            </div>
        </div>
    )
}
