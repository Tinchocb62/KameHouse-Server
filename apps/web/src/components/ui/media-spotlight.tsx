"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Info, Sparkles, Star, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/components/ui/core/styling"
import { getLargeResImage, getMediumResImage, getLowResImage } from "@/lib/helpers/images"
import { DeferredImage } from "@/components/shared/deferred-image"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"
import { useSound } from "@/hooks/use-sound"
import type { SwimlaneItem } from "./swimlane"
import { HorizontalDraggableScroll } from "@/components/ui/horizontal-draggable-scroll/horizontal-draggable-scroll"

interface MediaSpotlightProps {
    items: SwimlaneItem[]
    onNavigate: (item: SwimlaneItem) => void
    className?: string
}

import { ERAS, ERA_COLOR_MAP, type EraId, getEraFromItem } from "./media-spotlight-helpers"

export const MediaSpotlight = React.memo(function MediaSpotlight({ items, onNavigate, className }: MediaSpotlightProps) {
    const { playSound } = useSound()
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl)
    const [activeEraId, setActiveEraId] = React.useState<EraId>("db")
    const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null)
    const [isHovered, setIsHovered] = React.useState(false)

    const colors = ERA_COLOR_MAP[activeEraId]

    const playHoverSound = React.useCallback(() => {
        playSound("hover")
    }, [playSound])

    // Classify all library items into eras
    const categorizedData = React.useMemo(() => {
        const result: Record<EraId, { series: SwimlaneItem | null; movies: SwimlaneItem[] }> = {
            db: { series: null, movies: [] },
            dbz: { series: null, movies: [] },
            dbgt: { series: null, movies: [] },
            dbs: { series: null, movies: [] },
            dbdaima: { series: null, movies: [] },
        }

        items.forEach(item => {
            const era = getEraFromItem(item)
            if (era) {
                const isTV = item.badge === "TV"
                if (isTV) {
                    const existing = result[era].series
                    if (!existing) {
                        result[era].series = item
                    } else {
                        // Prioritize classic canonical series over "Kai" recut if both are present in library
                        const currentIsKai = item.title.toLowerCase().includes("kai")
                        const existingIsKai = existing.title.toLowerCase().includes("kai")
                        if (existingIsKai && !currentIsKai) {
                            result[era].series = item
                        }
                    }
                } else {
                    result[era].movies.push(item)
                }
            }
        })

        // Sort movies by release year ascending
        ERAS.forEach(era => {
            const data = result[era.id]
            data.movies.sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0))

            // If there's no main TV series in library, fallback to the first movie
            if (!data.series && data.movies.length > 0) {
                data.series = data.movies[0]
                data.movies = data.movies.slice(1)
            }
        })

        return result
    }, [items])

    // Find the currently active item to showcase (series or selected movie)
    const activeItem = React.useMemo(() => {
        const eraData = categorizedData[activeEraId]
        if (!eraData) return null

        if (selectedItemId) {
            const movie = eraData.movies.find(m => m.id === selectedItemId)
            if (movie) return movie
            if (eraData.series?.id === selectedItemId) return eraData.series
        }

        return eraData.series
    }, [categorizedData, activeEraId, selectedItemId])

    // Update active items when switching eras
    const handleEraSelect = React.useCallback((eraId: EraId) => {
        setActiveEraId(eraId)
        const eraData = categorizedData[eraId]
        setSelectedItemId(eraData?.series?.id || null)
    }, [categorizedData])

    // Auto-rotate featured eras/content every 8s when not hovered
    React.useEffect(() => {
        if (isHovered) return

        const timer = setInterval(() => {
            setActiveEraId(prevEraId => {
                const currentIndex = ERAS.findIndex(e => e.id === prevEraId)
                const nextIndex = (currentIndex + 1) % ERAS.length
                const nextEraId = ERAS[nextIndex].id
                const eraData = categorizedData[nextEraId]
                setSelectedItemId(eraData?.series?.id || null)
                return nextEraId
            })
        }, 8000)

        return () => clearInterval(timer)
    }, [isHovered, categorizedData])

    // Initialize selected item on first load with a ref guard to avoid circular dependency
    const initializedRef = React.useRef(false)
    React.useEffect(() => {
        if (!initializedRef.current && categorizedData[activeEraId]?.series) {
            initializedRef.current = true
            setSelectedItemId(categorizedData[activeEraId].series!.id)
        }
    }, [categorizedData, activeEraId])

    // Update global home page backdrop (always use the main series/era image, not the selected movie)
    React.useEffect(() => {
        const mainSeries = categorizedData[activeEraId]?.series
        if (mainSeries) {
            setBackdropUrl(mainSeries.backdropUrl || mainSeries.image)
        }
        return () => {
            setBackdropUrl(null)
        }
    }, [activeEraId, categorizedData, setBackdropUrl])

    const activeEraInfo = React.useMemo(() => {
        const movies = categorizedData[activeEraId]?.movies ?? []
        const name = ERAS.find(era => era.id === activeEraId)?.title ?? ""
        return { movies, name, hasMovies: movies.length > 0 }
    }, [categorizedData, activeEraId])

    const { movies: activeEraMovies, name: activeEraName, hasMovies } = activeEraInfo

    const cleanDescription = React.useMemo(() => {
        return activeItem?.description
            ? activeItem.description.replace(/<[^>]*>/g, '')
            : ""
    }, [activeItem])

    const displayTitle = React.useMemo(() => {
        if (!activeItem) return ""
        if (activeItem.title.toLowerCase().includes("kai") && activeItem.badge === "TV") {
            return "Dragon Ball Z"
        }
        return activeItem.title
    }, [activeItem])

    const displayDescription = React.useMemo(() => {
        if (!activeItem) return ""
        if (activeItem.title.toLowerCase().includes("kai") && activeItem.badge === "TV") {
            return "Cinco años después del final de Dragon Ball, Goku se encuentra con su hermano Raditz, quien le revela su origen alienígena. Comienza una serie de batallas contra poderosos enemigos como Vegeta, Freezer, Cell y Majin Buu para proteger la Tierra de invasores alienígenas y amenazas universales."
        }
        return cleanDescription
    }, [activeItem, cleanDescription])

    if (!activeItem) {
        return null
    }

    return (
        <section 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn("relative pt-20 md:pt-28 pb-16 w-full select-none overflow-hidden", hasMovies ? "lg:min-h-0" : "lg:min-h-[720px]", className)}
        >
            {/* Ambient glow backgrounds */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                {/* Global dark/slate base */}
                <div className="absolute inset-0 bg-transparent" />

                {/* Dynamic colored ambient glows */}
                <div
                    className="absolute -top-[10%] -left-[5%] w-[50%] h-[70%] rounded-full opacity-[0.35] transition-all duration-1000"
                    style={{
                        background: `radial-gradient(ellipse, ${colors.ambientGlow1} 0%, transparent 70%)`
                    }}
                />
                <div
                    className="absolute top-[10%] right-[-5%] w-[45%] h-[60%] rounded-full opacity-[0.35] transition-all duration-1000"
                    style={{
                        background: `radial-gradient(ellipse, ${colors.ambientGlow2} 0%, transparent 70%)`
                    }}
                />

                {/* Multi-color warm ambient light matching reference image background */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, color-mix(in srgb, var(--era-dbz-hex) 18%, transparent) 0%, color-mix(in srgb, var(--era-daima-hex) 8%, transparent) 45%, transparent 80%)' }} />
            </div>

            {/* Main content grid: Left Column (Artwork + Info Side-by-Side) & Right Column (Era Selector) */}
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch z-10 w-full px-6 md:px-10 lg:px-14 xl:px-16">

                {/* ─── LADO IZQUIERDO (8/12): Hero + Info lado a lado ─── */}
                <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">

                    {/* Imagen Hero */}
                    <div
                        className="md:col-span-7 relative w-full aspect-[4/3] md:aspect-[16/10] rounded-[32px] overflow-hidden border border-white/10 bg-surface-container group/hero transition-all duration-700"
                        style={{
                            boxShadow: `var(--shadow-glass), 0 0 40px -10px ${colors.glow}`
                        }}
                    >
                        {/* Glass glare reflex */}
                        <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-[150%] group-hover/hero:translate-x-[150%] transition-transform [transition-duration:1.6s] ease-out pointer-events-none z-30" />

                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={activeItem.id}
                                initial={{ opacity: 0, scale: 1.03 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.85, ease: [0.25, 0.8, 0.25, 1] }}
                                className="absolute inset-0 w-full h-full"
                            >
                                {/* Artwork Background */}
                                <div className="absolute inset-0 w-full h-full z-0 bg-surface-container">
                                    {activeItem.backdropUrl ? (
                                        <DeferredImage
                                            src={getLargeResImage(activeItem.backdropUrl)}
                                            alt={activeItem.title}
                                            priority={true}
                                            className="h-full w-full object-cover object-top transition-transform [transition-duration:6s] ease-out group-hover/hero:scale-[1.02]"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-surface-container">
                                            <div className="absolute inset-0 opacity-40">
                                                <DeferredImage
                                                    src={getLargeResImage(activeItem.image)}
                                                    alt=""
                                                    priority={true}
                                                    className="h-full w-full object-cover object-center blur-2xl saturate-150 scale-110"
                                                />
                                            </div>
                                            <DeferredImage
                                                src={getLargeResImage(activeItem.image)}
                                                alt={activeItem.title}
                                                priority={true}
                                                className="relative z-10 h-full w-full object-cover opacity-80 mix-blend-luminosity transition-transform [transition-duration:6s] ease-out group-hover/hero:scale-[1.02]"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Subtle vignette only */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent z-10" />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Info a la derecha */}
                    <div className="md:col-span-5 flex flex-col justify-center h-full py-2">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeItem.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
                                className="flex flex-col px-1 [&>*:not(:first-child)]:mt-4"
                            >
                                {/* Badges */}
                                <div className="flex flex-wrap items-center [&>*:not(:first-child)]:ml-1.5">
                                    <span className={cn(
                                        "bg-[#f59e0b] text-zinc-950 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-[6px] tracking-wider flex items-center gap-1 shadow-sm border border-[#f59e0b]/20 select-none"
                                    )}>
                                        <Sparkles size={8} className="fill-current animate-pulse" />
                                        Destacado
                                    </span>
                                    {activeItem.badge && (
                                        <span className="bg-surface-variant text-white text-[9px] font-bold tracking-wider px-2.5 py-1 rounded-[6px] border border-white/5 uppercase select-none">
                                            {activeItem.badge}
                                        </span>
                                    )}
                                    {activeItem.year && (
                                        <span className="bg-surface-variant text-white text-[9px] font-bold tracking-wider px-2.5 py-1 rounded-[6px] border border-white/5 uppercase select-none">
                                            {activeItem.year}
                                        </span>
                                    )}
                                    {activeItem.rating && (
                                        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold tracking-wider px-2.5 py-1 rounded-[6px] border border-emerald-500/20 uppercase flex items-center ml-1 shadow-sm select-none">
                                            <Star size={8} fill="currentColor" />
                                            {activeItem.rating.toFixed(1)} Ki
                                        </span>
                                    )}
                                </div>

                                {/* Title */}
                                <h3 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-none text-white uppercase select-none drop-shadow-md font-bebas">
                                    {displayTitle}
                                </h3>

                                {/* Description */}
                                {activeItem.description && (
                                    <p className="text-zinc-300/75 text-xs md:text-sm leading-relaxed font-normal select-none max-w-sm">
                                        {displayDescription}
                                    </p>
                                )}

                                {/* Botones */}
                                <div className="flex flex-row items-center mt-2 [&>*:not(:first-child)]:ml-3">
                                    <button
                                        onClick={() => onNavigate(activeItem)}
                                        className={cn(
                                            "relative overflow-hidden flex items-center justify-center bg-gradient-to-r from-[#f59e0b] to-[#ea580c] hover:from-[#fbbf24] hover:to-[#f97316] text-white font-black text-xs md:text-sm uppercase tracking-wider py-3 px-6 rounded-2xl hover:scale-[1.03] active:scale-95 transition-all duration-300 shadow-xl shadow-orange-950/20 group/play-btn font-bebas [&>*:not(:first-child)]:ml-2"
                                        )}
                                    >
                                        <div className="absolute inset-0 w-[40px] h-full bg-on-surface/20 transform skew-x-12 -translate-x-[60px] group-hover/play-btn:translate-x-[250px] transition-transform [transition-duration:1.2s] ease-out pointer-events-none" />
                                        <Play size={14} fill="currentColor" />
                                        <span>Reproducir</span>
                                    </button>

                                    <button
                                        onClick={() => onNavigate(activeItem)}
                                        className="flex items-center justify-center border border-white/10 bg-white/5 hover:bg-surface-variant hover:border-white/20 text-zinc-200 hover:text-white hover:scale-[1.03] active:scale-95 font-black text-xs md:text-sm uppercase tracking-wider py-3 px-6 rounded-2xl transition-all duration-300 shadow-xl backdrop-blur-[var(--blur-overlay-sm)] font-bebas [&>*:not(:first-child)]:ml-2"
                                    >
                                        <Info size={14} />
                                        <span>Detalles</span>
                                    </button>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* ─── LADO DERECHO (3/12): Selector de Eras en tarjeta Glassmorphic ─── */}
                <div className="flex flex-col lg:col-span-3 h-full z-10 justify-center">
                    <div className="h-full bg-[var(--glass-panel-bg)] backdrop-blur-[var(--blur-overlay-xl)] border border-white/10 lg:border-r-0 rounded-3xl lg:rounded-r-none lg:rounded-l-[32px] p-5 lg:-mr-14 xl:-mr-16 shadow-2xl flex flex-col justify-center [&>*:not(:first-child)]:mt-4">
                        <h4 className="font-bold text-[10px] tracking-widest text-zinc-300 uppercase pl-1">
                            Seleccionar Saga / Era
                        </h4>

                        <div className="flex flex-col relative [&>*:not(:first-child)]:mt-2">
                            <AnimatePresence initial={false}>
                                {ERAS.map((era) => {
                                    const eraData = categorizedData[era.id]
                                    const isEraActive = era.id === activeEraId
                                    const displayTitle = era.title
                                    const displayYear = era.year
                                    const eraColors = ERA_COLOR_MAP[era.id]

                                    return (
                                        <button
                                            key={era.id}
                                            onClick={() => handleEraSelect(era.id)}
                                            onMouseEnter={playHoverSound}
                                            className={cn(
                                                "group relative flex items-center justify-between px-4 py-3 rounded-2xl border text-left transition-all duration-500 w-full overflow-hidden",
                                                isEraActive
                                                    ? "text-white scale-[1.02] bg-white/[0.06]"
                                                    : "bg-transparent border-transparent text-zinc-300 hover:text-white hover:bg-white/[0.04] hover:scale-[1.01]"
                                            )}
                                            style={{
                                                borderColor: isEraActive ? eraColors.glow.replace('0.25', '0.6') : 'transparent',
                                                boxShadow: isEraActive ? `0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.05)` : 'none',
                                                transition: "all 400ms cubic-bezier(0.16, 1, 0.3, 1)"
                                            }}
                                        >
                                            {/* Active background neon layer */}
                                            {isEraActive && (
                                                <motion.div
                                                    layoutId="activeEraBackground"
                                                    className="absolute inset-0 -z-10"
                                                    style={{
                                                        background: `linear-gradient(to right, ${eraColors.glow.replace('0.25', '0.15')} 0%, transparent 100%)`
                                                    }}
                                                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                                                />
                                            )}

                                            <div className="flex flex-col text-left justify-center relative z-10">
                                                <span className={cn(
                                                    "font-sans font-bold text-xs tracking-wide uppercase transition-colors duration-300 leading-none mb-1",
                                                    isEraActive ? eraColors.textBrand : "text-zinc-300 group-hover:text-white"
                                                )}>
                                                    {displayTitle}
                                                </span>
                                                <span className="text-[9px] font-black tracking-widest text-zinc-500 select-none">({displayYear})</span>
                                            </div>

                                            <ChevronRight size={14} className={cn(
                                                "transition-all duration-300 relative z-10 shrink-0",
                                                isEraActive ? eraColors.textBrand : "text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-1"
                                            )} />
                                        </button>
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── PARTE INFERIOR: Películas con glows y play overlay temático ─── */}
            <AnimatePresence mode="wait">
                {hasMovies && (
                    <motion.div
                        key={activeEraId}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-10 text-left space-y-4 mt-14 px-6 md:px-10 lg:px-14 xl:px-16 w-full"
                    >
                        <h4 className="font-bebas text-lg md:text-xl tracking-wider text-zinc-300 uppercase flex items-center gap-2">
                            <span>Películas disponibles de</span>
                            <span className={colors.textBrand}>{activeEraName}</span>
                            <span className="text-xs text-zinc-500 font-sans font-bold tracking-normal lowercase">({activeEraMovies.length} películas)</span>
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 pt-2 pb-4 w-full animate-in fade-in slide-in-from-bottom-3 duration-500">
                            {/* hasSelection is computed once, not inside each card render */}
                            {(() => {
                                const hasSelection = selectedItemId !== null && activeEraMovies.some(m => m.id === selectedItemId)
                                return activeEraMovies.map((movie) => (
                                    <SpotlightMovieCard
                                        key={movie.id}
                                        movie={movie}
                                        isSelected={selectedItemId === movie.id}
                                        hasSelection={hasSelection}
                                        colors={colors}
                                        onSelect={setSelectedItemId}
                                        onHover={playHoverSound}
                                    />
                                ))
                            })()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
})

// ─── Memoized movie card sub-component ────────────────────────────────────────
interface SpotlightMovieCardProps {
    movie: SwimlaneItem
    isSelected: boolean
    hasSelection: boolean
    colors: typeof ERA_COLOR_MAP[EraId]
    onSelect: (id: string) => void
    onHover: () => void
}

const SpotlightMovieCard = React.memo(function SpotlightMovieCard({
    movie,
    isSelected,
    hasSelection,
    colors,
    onSelect,
    onHover,
}: SpotlightMovieCardProps) {
    return (
        <div
            onClick={() => onSelect(movie.id)}
            onMouseEnter={onHover}
            className={cn(
                "group relative w-full aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer border select-none transition-all duration-500 shrink-0",
                isSelected
                    ? "scale-[1.04] z-10 opacity-100"
                    : hasSelection
                        ? "border-white/5 opacity-40 grayscale-[30%] hover:opacity-85 hover:grayscale-0 hover:scale-[1.01]"
                        : "border-white/5 opacity-100 hover:border-white/20 hover:scale-[1.01]"
            )}
            style={{
                borderColor: isSelected ? colors.glowStrong : 'rgba(255, 255, 255, 0.05)',
                boxShadow: isSelected ? `0 0 25px -3px ${colors.glow}` : 'none',
                transition: "all 600ms cubic-bezier(0.16, 1, 0.3, 1)"
            }}
        >
            <DeferredImage
                src={getMediumResImage(movie.image)}
                alt={movie.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Glass sheen sweep */}
            <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[inherit]">
                <div
                    className="w-[150%] h-[150%] bg-gradient-to-tr from-transparent via-white/10 to-transparent -rotate-12 absolute -top-[25%] -left-[100%] transition-transform [transition-duration:800ms] ease-out group-hover:translate-x-[150%] group-hover:translate-y-[10%]"
                />
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />

            {/* Play icon overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className={cn(
                    "p-2.5 rounded-full text-white transform scale-90 group-hover:scale-100 transition-transform duration-300 shadow-lg bg-gradient-to-r",
                    colors.primary
                )}>
                    <Play size={14} fill="currentColor" />
                </div>
            </div>

            {/* Title + year at bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-30 p-3">
                <p className="text-white font-bold text-[10px] uppercase tracking-wide leading-tight line-clamp-2 drop-shadow-md">
                    {movie.title}
                </p>
                {movie.year && (
                    <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">{movie.year}</span>
                )}
            </div>

            {/* Active wash */}
            {isSelected && (
                <div className="absolute inset-0 bg-white/[0.04] z-10 pointer-events-none" />
            )}
        </div>
    )
})

