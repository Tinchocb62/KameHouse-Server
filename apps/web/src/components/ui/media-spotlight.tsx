"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DUR_BASE_S, EASE_SMOOTH_OUT } from "@/components/ui/core/motion"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"
import { getHighResImage, getLargeResImage, getMediumResImage } from "@/lib/helpers/images"
import { DeferredImage } from "@/components/shared/deferred-image"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"
import { useSound } from "@/hooks/use-sound"
import { useThemeSettings } from "@/lib/theme/theme-hooks"
import type { SwimlaneItem } from "./swimlane"

interface MediaSpotlightProps {
    items: SwimlaneItem[]
    onNavigate: (item: SwimlaneItem) => void
    className?: string
}

import { ERAS, ERA_COLOR_MAP, ERA_DEFAULTS, type EraId, getEraFromItem, isMovieItem } from "./media-spotlight-helpers"
import { ChronologyModal } from "@/components/shared/chronology-modal"
import { EraOpeningPlayer } from "@/routes/series/$seriesId/-components/era-opening-player"

export const MediaSpotlight = React.memo(function MediaSpotlight({ items, onNavigate, className }: MediaSpotlightProps) {
    const { playSound } = useSound()
    const themeSettings = useThemeSettings()
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl)
    const [activeEraId, setActiveEraId] = React.useState<EraId>("db")
    const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null)
    const [isHovered, setIsHovered] = React.useState(false)
    const [chronologyOpen, setChronologyOpen] = React.useState(false)
    const [movieFilter, setMovieFilter] = React.useState<"all" | "movies" | "specials">("all")

    const colors = ERA_COLOR_MAP[activeEraId]
    const currentEraConfig = React.useMemo(() => ERAS.find(e => e.id === activeEraId), [activeEraId])

    const playHoverSound = React.useCallback(() => {
        playSound("hover")
    }, [playSound])

    // Classify all library items into eras
    const categorizedData = React.useMemo(() => {
        const result: Record<EraId, { series: SwimlaneItem | null; movies: SwimlaneItem[] }> = {
            db: { series: null, movies: [] },
            dbz: { series: null, movies: [] },
            dbgt: { series: null, movies: [] },
            dbkai: { series: null, movies: [] },
            dbs: { series: null, movies: [] },
            dbdaima: { series: null, movies: [] },
        }

        items.forEach(item => {
            const era = getEraFromItem(item)
            if (era && result[era]) {
                const titleLower = item.title.toLowerCase().trim()
                const isMovie = isMovieItem(item)
                
                // Check if title exactly matches canonical era series title
                const isCanonicalMainSeries = !isMovie && (
                    (era === "db" && (titleLower === "dragon ball" || titleLower === "dragon ball (original)")) ||
                    (era === "dbz" && (titleLower === "dragon ball z" || titleLower === "dragon ball z (tv)")) ||
                    (era === "dbgt" && (titleLower === "dragon ball gt")) ||
                    (era === "dbkai" && (titleLower.includes("kai") && !titleLower.includes("pelicula") && !titleLower.includes("movie"))) ||
                    (era === "dbs" && (titleLower === "dragon ball super")) ||
                    (era === "dbdaima" && (titleLower === "dragon ball daima"))
                )

                if (isCanonicalMainSeries) {
                    result[era].series = item
                } else if (isMovie) {
                    result[era].movies.push(item)
                } else if (!result[era].series && (item.badge === "TV" || item.badge === "ONA" || item.badge === "TV_SHORT")) {
                    result[era].series = item
                } else {
                    // All other entries (movies, specials, OVAs) belong to movies list
                    result[era].movies.push(item)
                }
            }
        })

        // Sort movies by release year ascending
        ERAS.forEach(era => {
            const data = result[era.id]
            if (data) {
                data.movies.sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0))
            }
        })

        return result
    }, [items])

    const availableEras = React.useMemo(() => {
        return ERAS.filter(era => {
            const data = categorizedData[era.id]
            return data && (data.series !== null || data.movies.length > 0)
        })
    }, [categorizedData])

    const preferredEraId = React.useMemo<EraId | null>(() => {
        if (themeSettings.themeEra) {
            const mapped = themeSettings.themeEra.replace("era-", "") as EraId
            if (ERAS.some(e => e.id === mapped)) return mapped
        }
        return null
    }, [themeSettings.themeEra])

    const initialEraId = React.useMemo<EraId>(() => {
        if (preferredEraId && (categorizedData[preferredEraId]?.series || categorizedData[preferredEraId]?.movies.length > 0)) {
            return preferredEraId
        }
        const firstWithContent = ERAS.find(era => categorizedData[era.id]?.series || categorizedData[era.id]?.movies.length > 0)
        if (firstWithContent) return firstWithContent.id
        return preferredEraId || "db"
    }, [categorizedData, preferredEraId])

    const activeSeries = React.useMemo(() => {
        return categorizedData[activeEraId]?.series
    }, [categorizedData, activeEraId])

    // Update active items when switching eras
    const handleEraSelect = React.useCallback((eraId: EraId) => {
        setActiveEraId(eraId)
        setMovieFilter("all")
    }, [])

    // Auto-rotate featured eras every 8s when not hovered, only between available eras
    React.useEffect(() => {
        if (isHovered || availableEras.length <= 1) return

        const timer = setInterval(() => {
            if (document.visibilityState === "hidden") return

            setActiveEraId(prevEraId => {
                const currentIndex = availableEras.findIndex(e => e.id === prevEraId)
                const nextIndex = (currentIndex + 1) % availableEras.length
                return availableEras[nextIndex].id
            })
        }, 8000)

        return () => clearInterval(timer)
    }, [isHovered, availableEras])

    // Initialize era on first load
    const initializedRef = React.useRef(false)
    React.useEffect(() => {
        if (!initializedRef.current && items.length > 0) {
            initializedRef.current = true
            setActiveEraId(initialEraId)
        }
    }, [items, initialEraId])

    const cleanDescription = React.useMemo(() => {
        return activeSeries?.description
            ? activeSeries.description.replace(/<[^>]*>/g, '')
            : ""
    }, [activeSeries])

    const displayTitle = React.useMemo(() => {
        return ERA_DEFAULTS[activeEraId]?.title || activeSeries?.title || currentEraConfig?.title || "Dragon Ball"
    }, [activeEraId, activeSeries, currentEraConfig])

    const displayDescription = React.useMemo(() => {
        if (!cleanDescription || cleanDescription.length < 30) {
            return ERA_DEFAULTS[activeEraId]?.description || cleanDescription || ""
        }
        return cleanDescription
    }, [cleanDescription, activeEraId])

    // Real API backdrops/banners take precedence; fallback to canonical era horizontal backdrop
    const effectiveBackdropSrc = React.useMemo(() => {
        if (activeSeries?.backdropUrl) return activeSeries.backdropUrl
        return ERA_DEFAULTS[activeEraId]?.backdropUrl || ""
    }, [activeSeries, activeEraId])

    // Update global home page backdrop
    React.useEffect(() => {
        if (effectiveBackdropSrc) {
            setBackdropUrl(effectiveBackdropSrc)
        }
        return () => {
            setBackdropUrl(null)
        }
    }, [effectiveBackdropSrc, setBackdropUrl])

    const activeEraInfo = React.useMemo(() => {
        const rawMovies = categorizedData[activeEraId]?.movies ?? []
        const name = ERAS.find(era => era.id === activeEraId)?.title ?? ""

        const filteredMovies = rawMovies.filter(m => {
            if (movieFilter === "all") return true
            const isSpecial = m.badge === "SPECIAL" || m.badge === "OVA" || m.title.toLowerCase().includes("especial") || m.title.toLowerCase().includes("ova")
            if (movieFilter === "specials") return isSpecial
            if (movieFilter === "movies") return !isSpecial
            return true
        })

        return {
            movies: filteredMovies,
            totalMovies: rawMovies.length,
            name,
            hasMovies: rawMovies.length > 0
        }
    }, [categorizedData, activeEraId, movieFilter])

const ERA_SERIES_ID_MAP: Record<EraId, number> = {
    db: 12609,
    dbz: 12971,
    dbgt: 12697,
    dbkai: 61709,
    dbs: 62715,
    dbdaima: 236994,
}

    const { movies: activeEraMovies, totalMovies, name: activeEraName, hasMovies } = activeEraInfo

    const handleHeroNavigate = React.useCallback(() => {
        if (activeSeries) {
            onNavigate(activeSeries)
        } else {
            const eraDef = ERA_DEFAULTS[activeEraId]
            const fallbackId = ERA_SERIES_ID_MAP[activeEraId] || 12609
            onNavigate({
                id: `media-${fallbackId}`,
                mediaId: fallbackId,
                title: eraDef?.title || "Dragon Ball",
                image: eraDef?.posterUrl || "",
                aspect: "poster",
                onClick: () => {}
            })
        }
    }, [activeSeries, onNavigate, activeEraId])

    return (
        <section 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn("relative pt-2 md:pt-4 pb-12 w-full select-none flex flex-col justify-start space-y-6 px-4 sm:px-6 md:px-8 xl:px-10 max-w-[1800px] mx-auto", className)}
        >
            {/* Dynamic ambient background glows with GPU acceleration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 transform-gpu">
                <div
                    className="absolute -top-[10%] -left-[5%] w-[50%] h-[70%] rounded-full opacity-[0.25] transition-opacity duration-500 will-change-opacity pointer-events-none"
                    style={{ background: `radial-gradient(ellipse, ${colors.ambientGlow1} 0%, transparent 70%)` }}
                />
                <div
                    className="absolute top-[10%] right-[-5%] w-[45%] h-[60%] rounded-full opacity-[0.25] transition-opacity duration-500 will-change-opacity pointer-events-none"
                    style={{ background: `radial-gradient(ellipse, ${colors.ambientGlow2} 0%, transparent 70%)` }}
                />
            </div>

            {/* ─── 1. TOP HORIZONTAL ERA SELECTOR BAR ─── */}
            <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/75 backdrop-blur-xl border border-white/10 rounded-2xl p-2 sm:p-2.5 shadow-xl">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
                    {ERAS.map((era) => {
                        const isEraActive = era.id === activeEraId
                        const displayTitle = era.title
                        const displayYear = era.year
                        const eraColors = ERA_COLOR_MAP[era.id]
                        const eraData = categorizedData[era.id]
                        const hasSeries = !!eraData?.series
                        const movieCount = eraData?.movies?.length || 0
                        const hasItems = hasSeries || movieCount > 0

                        return (
                            <motion.button
                                key={era.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                onClick={() => handleEraSelect(era.id)}
                                onMouseEnter={playHoverSound}
                                className={cn(
                                    "relative flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-left shrink-0 cursor-pointer select-none",
                                    isEraActive
                                        ? "text-white"
                                        : hasItems
                                            ? "text-zinc-300 hover:text-white hover:bg-white/[0.05]"
                                            : "text-zinc-500 hover:text-zinc-400 opacity-60"
                                )}
                            >
                                {/* Floating active highlight pill */}
                                {isEraActive && (
                                    <motion.div
                                        layoutId="activeEraPill"
                                        className="absolute inset-0 rounded-xl pointer-events-none z-0 border"
                                        style={{
                                            borderColor: eraColors.glowStrong,
                                            backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                            boxShadow: `0 0 16px ${eraColors.glow}, inset 0 1px 1px rgba(255, 255, 255, 0.15)`
                                        }}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}

                                {/* Kanji Circle */}
                                <div
                                    className={cn(
                                        "relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[11px] sm:text-xs select-none shrink-0 transition-all duration-300 border",
                                        isEraActive ? "text-white shadow-sm" : "bg-zinc-900 text-zinc-400"
                                    )}
                                    style={{
                                        borderColor: isEraActive ? eraColors.ambientGlow1 : `color-mix(in srgb, ${eraColors.ambientGlow1} 30%, rgba(255,255,255,0.1))`,
                                        backgroundColor: isEraActive ? eraColors.ambientGlow1 : 'rgba(255,255,255,0.03)',
                                    }}
                                >
                                    {era.kanji}
                                </div>

                                <div className="relative z-10 flex flex-col text-left justify-center min-w-0 pr-1">
                                    <span className={cn(
                                        "font-sans font-extrabold text-[11px] sm:text-xs tracking-wider uppercase leading-tight truncate transition-colors duration-200",
                                        isEraActive ? eraColors.textBrand : "text-zinc-200"
                                    )}>
                                        {displayTitle}
                                    </span>
                                    <span className="text-[9px] font-mono text-zinc-400 leading-none">
                                        {displayYear}
                                    </span>
                                </div>
                            </motion.button>
                        )
                    })}
                </div>

                {/* Chronology Action Button */}
                <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                    onClick={() => setChronologyOpen(true)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider transition-all px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 shadow-sm ml-auto cursor-pointer"
                    title="Ver Orden Cronológico Completo"
                >
                    <Icons.status.sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cronología</span>
                </motion.button>
            </div>

            {/* ─── 2. FULL-WIDTH CINEMATIC HERO (MAIN TV SERIES ONLY) ─── */}
            <div className="relative z-10 w-full">
                <div
                    onClick={handleHeroNavigate}
                    className="w-full relative aspect-[16/9] sm:aspect-[2.1/1] lg:aspect-[2.4/1] min-h-[380px] sm:min-h-[420px] max-h-[480px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl group/showcase cursor-pointer bg-zinc-950 flex flex-col justify-end"
                    style={{
                        boxShadow: `0 22px 45px -12px rgba(0,0,0,0.85), 0 0 28px -15px ${colors.glow}`,
                        borderColor: `color-mix(in srgb, ${colors.glowStrong} 25%, rgba(255,255,255,0.1))`
                    }}
                >
                    <AnimatePresence mode="popLayout">
                        <motion.div
                            key={activeEraId}
                            initial={{ opacity: 0, scale: 1.03 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute inset-0 w-full h-full transform-gpu will-change-transform pointer-events-none"
                        >
                            {/* Right-aligned compact image container with object-contain & smooth horizontal integration */}
                            <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[50%] lg:w-[45%] h-full flex items-center justify-end overflow-hidden">
                                <DeferredImage
                                    src={effectiveBackdropSrc.startsWith("/") ? effectiveBackdropSrc : getLargeResImage(effectiveBackdropSrc)}
                                    alt={displayTitle}
                                    priority={true}
                                    className="w-full h-full flex items-center justify-end"
                                    imgClassName="!w-full !h-full !object-contain !object-right transition-transform duration-700 group-hover/showcase:scale-[1.02]"
                                />
                                {/* Smooth horizontal gradient strictly covering the first 5% of the left edge */}
                                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/50 via-[5%] to-transparent pointer-events-none" />
                                {/* Bottom & Top minimal edge blends */}
                                <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-zinc-950/40 to-transparent pointer-events-none" />
                            </div>

                            {/* Left-side solid dark background for title & text */}
                            <div className="absolute inset-y-0 left-0 w-1/2 bg-zinc-950 pointer-events-none hidden sm:block" />

                            {/* Ambient era color glow */}
                            <div
                                className="absolute inset-0 opacity-15 pointer-events-none z-10 mix-blend-screen transition-opacity duration-500"
                                style={{ background: `radial-gradient(circle at 10% 90%, ${colors.ambientGlow1} 0%, transparent 60%)` }}
                            />
                        </motion.div>
                    </AnimatePresence>

                    {/* Text, Badges and Actions Overlay */}
                    <div className="relative z-20 flex flex-col justify-end p-6 sm:p-8 space-y-3 max-w-2xl">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeEraId}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                className="flex flex-col space-y-3 transform-gpu will-change-transform text-left"
                            >
                                {/* Overline / Tagline */}
                                {currentEraConfig?.tagline && (
                                    <p className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.2em] text-amber-400 uppercase drop-shadow-md select-none">
                                        {currentEraConfig.tagline}
                                    </p>
                                )}

                                {/* Title with display font */}
                                <h3
                                    onClick={handleHeroNavigate}
                                    className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05] text-white uppercase select-none font-display cursor-pointer hover:text-amber-400 transition-colors drop-shadow-lg"
                                    style={{
                                        textShadow: "0 2px 12px rgba(0, 0, 0, 0.9)"
                                    }}
                                >
                                    {displayTitle}
                                </h3>

                                {/* Metadata Row */}
                                <div className="flex flex-wrap items-center gap-2 py-0.5">
                                    <span className="bg-white/15 backdrop-blur-md text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-md border border-white/20 uppercase shadow-sm select-none">
                                        SERIE TV
                                    </span>

                                    {(activeSeries?.year || ERA_DEFAULTS[activeEraId]?.year) && (
                                        <span className="bg-white/10 backdrop-blur-md text-zinc-200 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md border border-white/15 uppercase select-none">
                                            {activeSeries?.year || ERA_DEFAULTS[activeEraId]?.year}
                                        </span>
                                    )}

                                    {ERA_DEFAULTS[activeEraId]?.episodes && (
                                        <span className="bg-white/10 backdrop-blur-md text-zinc-200 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md border border-white/15 uppercase select-none">
                                            {ERA_DEFAULTS[activeEraId].episodes}
                                        </span>
                                    )}

                                    {activeSeries?.rating && (
                                        <span className="bg-emerald-950/80 backdrop-blur-md text-emerald-300 text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded-md border border-emerald-500/40 uppercase flex items-center gap-1 select-none shadow-sm">
                                            <Icons.ui.star size={10} fill="currentColor" className="text-emerald-400" />
                                            {activeSeries.rating.toFixed(1)} Ki
                                        </span>
                                    )}
                                </div>

                                {/* Synopsis in High Contrast with Constrained Line Length */}
                                {displayDescription && (
                                    <p className="text-zinc-200/95 text-xs sm:text-sm leading-relaxed font-normal select-none line-clamp-3 max-w-xl drop-shadow">
                                        {displayDescription}
                                    </p>
                                )}

                                {/* Action Buttons & Opening Player */}
                                <div className="flex flex-wrap items-center gap-3 pt-1.5">
                                    <motion.button
                                        whileHover={{ scale: 1.05, y: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: "spring", stiffness: 450, damping: 20 }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleHeroNavigate()
                                        }}
                                        className="flex items-center justify-center bg-brand-accent text-zinc-950 hover:brightness-110 font-bold text-xs sm:text-sm uppercase tracking-wider py-2.5 px-6 rounded-xl shadow-md shadow-brand-accent/20 font-display gap-2 cursor-pointer"
                                    >
                                        <Icons.media.play size={15} fill="currentColor" />
                                        <span>Reproducir</span>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.05, y: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: "spring", stiffness: 450, damping: 20 }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleHeroNavigate()
                                        }}
                                        className="flex items-center justify-center border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm uppercase tracking-wider py-2.5 px-5 rounded-xl backdrop-blur-md font-display gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <Icons.ui.info size={15} />
                                        <span>Detalles</span>
                                    </motion.button>

                                    {/* Opening Player pill if available */}
                                    {currentEraConfig?.defaultSaga && (
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <EraOpeningPlayer
                                                sagaId={currentEraConfig.defaultSaga}
                                                className="text-xs sm:text-sm"
                                            />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* ─── 3. INTEGRATED CATALOG (MOVIES & SPECIALS ONLY) ─── */}
            <div className="relative z-10 text-left space-y-4 pt-2 w-full">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="font-display text-lg md:text-xl tracking-wider text-zinc-200 uppercase flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors.ambientGlow1, boxShadow: `0 0 10px ${colors.glowStrong}` }} />
                        <span>Películas & Especiales de</span>
                        <span className={colors.textBrand}>{activeEraName}</span>
                        <span className="text-xs text-zinc-400 font-sans font-bold tracking-normal lowercase px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 ml-1">
                            {totalMovies} {totalMovies === 1 ? "título" : "títulos"}
                        </span>
                    </h4>

                    {/* Quick Category Filter Pills */}
                    {totalMovies > 1 && (
                        <div className="relative flex items-center gap-1 bg-zinc-950/70 p-1 rounded-xl border border-white/10">
                            {(["all", "movies", "specials"] as const).map((filterKey) => {
                                const isActive = movieFilter === filterKey
                                const label = filterKey === "all" ? `Todas (${totalMovies})` : filterKey === "movies" ? "Películas" : "OVAs / Especiales"
                                return (
                                    <button
                                        key={filterKey}
                                        onClick={() => setMovieFilter(filterKey)}
                                        className={cn(
                                            "relative px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer select-none z-10",
                                            isActive ? "text-white font-black" : "text-zinc-400 hover:text-zinc-200"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeMovieFilter"
                                                className="absolute inset-0 bg-white/15 rounded-lg -z-10 shadow-sm border border-white/15"
                                                transition={{ type: "spring", stiffness: 450, damping: 30 }}
                                            />
                                        )}
                                        {label}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Movies Grid */}
                {activeEraMovies.length > 0 ? (
                    <motion.div
                        layout
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-1 pb-4 w-full"
                    >
                        <AnimatePresence mode="popLayout">
                            {activeEraMovies.map((movie, idx) => (
                                <SpotlightMovieCard
                                    key={movie.id}
                                    movie={movie}
                                    index={idx + 1}
                                    colors={colors}
                                    onNavigate={onNavigate}
                                    onHover={playHoverSound}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <div className="p-8 rounded-2xl bg-zinc-950/40 border border-white/5 text-center text-zinc-500 text-sm">
                        No hay películas ni especiales de esta era en tu biblioteca
                    </div>
                )}
            </div>

            <ChronologyModal isOpen={chronologyOpen} onClose={() => setChronologyOpen(false)} />
        </section>
    )
})

// ─── Memoized movie card sub-component ────────────────────────────────────────
interface SpotlightMovieCardProps {
    movie: SwimlaneItem
    index?: number
    colors: typeof ERA_COLOR_MAP[EraId]
    onNavigate: (item: SwimlaneItem) => void
    onHover: () => void
}

const SpotlightMovieCard = React.memo(function SpotlightMovieCard({
    movie,
    index,
    colors,
    onNavigate,
    onHover,
}: SpotlightMovieCardProps) {
    const posterSrc = movie.image
        ? (movie.image.startsWith("/") ? movie.image : getMediumResImage(movie.image))
        : (movie.backdropUrl || "/sagas/namek-freezer.jpg")

    const isSpecial = movie.badge === "SPECIAL" || movie.badge === "OVA" || movie.title.toLowerCase().includes("especial") || movie.title.toLowerCase().includes("ova")
    const indexLabel = isSpecial ? "OVA" : (index !== undefined ? `#${String(index).padStart(2, '0')}` : undefined)

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            whileHover={{ y: -5, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate(movie)}
            onMouseEnter={onHover}
            className={cn(
                "group relative w-full aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-white/30 select-none shrink-0 bg-zinc-900",
                "hover:z-10 hover:shadow-[0_15px_35px_rgba(0,0,0,0.9)]"
            )}
        >
            <DeferredImage
                src={posterSrc}
                alt={movie.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />

            {/* Top Badges (Chronology Index & Format) */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-none">
                {indexLabel && (
                    <span className={cn(
                        "text-[9px] font-mono font-black tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md border shadow-sm uppercase",
                        isSpecial
                            ? "bg-purple-950/80 text-purple-300 border-purple-500/30"
                            : "bg-black/60 text-white border-white/15"
                    )}>
                        {indexLabel}
                    </span>
                )}
                {movie.year && (
                    <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-md border border-white/10 text-zinc-300 uppercase ml-auto">
                        {movie.year}
                    </span>
                )}
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />

            {/* Play Button Overlay on Hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none">
                <motion.div
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 450, damping: 20 }}
                    onClick={(e) => {
                        e.stopPropagation()
                        onNavigate(movie)
                    }}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white bg-brand-accent shadow-lg shadow-brand-accent/40 pointer-events-auto cursor-pointer"
                >
                    <Icons.media.play size={16} fill="currentColor" className="ml-0.5" />
                </motion.div>
            </div>

            {/* Title at bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-3 flex flex-col justify-end">
                <p className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide leading-tight line-clamp-2 drop-shadow-md group-hover:text-amber-400 transition-colors">
                    {movie.title}
                </p>
            </div>
        </motion.div>
    )
})

