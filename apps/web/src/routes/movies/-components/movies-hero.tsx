import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Icons } from "@/components/ui/icons"
import type { Anime_LibraryCollectionEntry } from "@/api/generated/types"
import { ERA_TABS, EraTab, cleanMovieTitle } from "../-MovieCard"
import { cn } from "@/components/ui/core/styling"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"
import { getLowResImage, getLargeResImage } from "@/lib/helpers/images"

interface MoviesHeroProps {
    topFeatured: (Anime_LibraryCollectionEntry & { era: EraTab; startedAtTimestamp: number })[]
    debouncedMovie: (Anime_LibraryCollectionEntry & { era: EraTab; startedAtTimestamp: number }) | null
    activeEraConfig: typeof ERA_TABS[0]
    handleMovieClick: (mediaId: number) => void
}

export function MoviesHero({
    topFeatured,
    debouncedMovie,
    activeEraConfig,
    handleMovieClick,
}: MoviesHeroProps) {
    const [featuredIndex, setFeaturedIndex] = useState(0)
    const [prevTopFeatured, setPrevTopFeatured] = useState(topFeatured)
    const [isHeroHovered, setIsHeroHovered] = useState(false)
    const heroRef = useRef<HTMLElement>(null)
    const setBackdropUrl = useIntelligenceStore((s) => s.setBackdropUrl)

    if (topFeatured !== prevTopFeatured) {
        setPrevTopFeatured(topFeatured)
        setFeaturedIndex(0)
    }

    useEffect(() => {
        if (isHeroHovered || topFeatured.length <= 1) return
        const id = setInterval(() => setFeaturedIndex((p) => (p + 1) % topFeatured.length), 8000)
        return () => clearInterval(id)
    }, [isHeroHovered, topFeatured])

    const defaultFeatured = topFeatured[featuredIndex] ?? topFeatured[0] ?? null
    const currentMovie = debouncedMovie ?? defaultFeatured
    const displayMedia = currentMovie?.media
    const currentEraConfig = ERA_TABS.find((t) => t.value === currentMovie?.era) ?? activeEraConfig

    // Si no hay bannerImage (landscape), la imagen disponible es un poster (portrait)
    // y object-cover la amplía demasiado — hay que tratarlas distinto
    const hasBannerImage = !!displayMedia?.bannerImage
    const backdropSrc = displayMedia?.bannerImage ?? displayMedia?.posterImage ?? null

    useEffect(() => {
        setBackdropUrl("/casa-kame-de-dragon-ball-3963.webp")
        return () => setBackdropUrl(null)
    }, [setBackdropUrl])

    const plainDescription = displayMedia?.description
        ? displayMedia.description.replace(/<[^>]*>/g, "")
        : null

    return (
        <section
            ref={heroRef}
            // h- fija la altura exacta; min-h permite que crezca con el contenido
            className="relative w-full h-[150vh] max-h-[600px] flex flex-col justify-center overflow-hidden bg-transparent select-none"
            onMouseEnter={() => setIsHeroHovered(true)}
            onMouseLeave={() => setIsHeroHovered(false)}
        >
            {/* Background elements with vertical feathering */}
            <div 
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    WebkitMaskImage: "linear-gradient(to top, transparent 0%, rgba(0,0,0,0.05) 1%, rgba(0,0,0,0.4) 6%, rgba(0,0,0,0.9) 14%, black 25%)",
                    maskImage: "linear-gradient(to top, transparent 0%, rgba(0,0,0,0.05) 1%, rgba(0,0,0,0.4) 6%, rgba(0,0,0,0.9) 14%, black 25%)",
                }}
            >
                {/* Ambient blur (siempre, sirve de fondo de color aunque sea poster) */}
                <AnimatePresence mode="wait">
                    {backdropSrc && (
                        <motion.div
                            key={backdropSrc + "_blur"}
                            className="absolute inset-0 z-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            style={{
                                backgroundImage: `url(${getLowResImage(backdropSrc)})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center 20%",
                                filter: "blur(var(--filter-blur-hero-bg)) brightness(0.5) saturate(170%)",
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* Imagen principal: banner → cubre todo; poster → se ancla a la derecha sin zoom */}
                <div className="absolute inset-0 z-0">
                    <AnimatePresence mode="wait">
                        {backdropSrc && (
                            hasBannerImage ? (
                                // Banner landscape: cubre el ancho completo en móviles, se ancla a la derecha con menos zoom en desktop
                                <motion.img
                                    key={backdropSrc + "_banner"}
                                    src={getLargeResImage(backdropSrc)}
                                    alt={displayMedia?.titleSpanish || ""}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.0 }}
                                    className="absolute right-0 top-0 h-full w-full md:w-[80%] lg:w-[75%] object-cover object-[center_20%]"
                                    style={{
                                        WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 12%, black 40%)",
                                        maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 12%, black 40%)",
                                    }}
                                />
                            ) : (
                                // Poster portrait: anclado a la derecha, tamaño natural sin zoom
                                <motion.img
                                    key={backdropSrc + "_poster"}
                                    src={getLargeResImage(backdropSrc)}
                                    alt={displayMedia?.titleSpanish || ""}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.75 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.0 }}
                                    className="absolute right-0 top-0 h-full w-auto object-contain object-right-top"
                                />
                            )
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Gradient izquierdo */}
            <div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{
                    background: hasBannerImage
                        ? "linear-gradient(to right, color-mix(in srgb, var(--bg-primary) 85%, transparent) 0%, color-mix(in srgb, var(--bg-primary) 70%, transparent) 25%, color-mix(in srgb, var(--bg-primary) 20%, transparent) 60%, transparent 90%)"
                        : "linear-gradient(to right, color-mix(in srgb, var(--bg-primary) 85%, transparent) 0%, color-mix(in srgb, var(--bg-primary) 70%, transparent) 30%, color-mix(in srgb, var(--bg-primary) 15%, transparent) 70%, transparent 95%)",
                    WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 15%)",
                    maskImage: "linear-gradient(to top, transparent 0%, black 15%)",
                }}
            />
            {/* Gradient inferior: semi-transparente para fundirse con el fondo Kame House */}
            <div
                className="absolute inset-x-0 bottom-0 h-40 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to top, transparent 0%, color-mix(in srgb, var(--bg-primary) 45%, transparent) 50%, transparent 100%)" }}
            />
            {/* Vignette superior */}
            <div
                className="absolute inset-x-0 top-0 h-16 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--bg-primary) 40%, transparent) 0%, transparent 100%)" }}
            />

            {/* Grain */}
            <div
                className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-overlay z-20"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Contenido */}
            <div className="relative z-30 w-full max-w-[1800px] mx-auto px-6 md:px-12 flex flex-col pointer-events-none">
                <div className="max-w-xl space-y-2.5 pointer-events-auto">

                    {/* Era badge */}
                    <AnimatePresence mode="wait">
                        {currentMovie && (
                            <motion.div
                                key={currentMovie.mediaId + "_badge"}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                            >
                                <span
                                    className="inline-flex items-center text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm border"
                                    style={{
                                        color: currentEraConfig.color,
                                        borderColor: `color-mix(in srgb, ${currentEraConfig.color} 27%, transparent)`,
                                        backgroundColor: `color-mix(in srgb, ${currentEraConfig.color} 7%, transparent)`,
                                    }}
                                >
                                    {currentEraConfig.label}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Título */}
                    <AnimatePresence mode="wait">
                        <motion.h1
                            key={displayMedia?.id ?? "default"}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="font-extrabold leading-[1.05] tracking-tight text-white uppercase cursor-pointer hover:text-zinc-200 transition-colors duration-300"
                            style={{ fontSize: "max(1.6rem, min(3.5vw, 2.8rem))" }}
                            onClick={() => currentMovie && handleMovieClick(currentMovie.mediaId!)}
                        >
                            {displayMedia
                                ? cleanMovieTitle(displayMedia.titleSpanish ?? displayMedia.titleEnglish ?? displayMedia.titleRomaji)
                                : "Películas"}
                        </motion.h1>
                    </AnimatePresence>

                    {/* Metadata */}
                    <AnimatePresence mode="wait">
                        {displayMedia && (
                            <motion.div
                                key={displayMedia.id + "_meta"}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="flex items-center gap-3 text-zinc-400 text-[11px] font-medium tracking-wide"
                            >
                                {displayMedia.score && displayMedia.score > 0 && (
                                    <span className="flex items-center gap-1 text-amber-400">
                                        <Icons.ui.star size={11} fill="currentColor" className="stroke-none" />
                                        {(displayMedia.score / 10).toFixed(1)} Ki
                                    </span>
                                )}
                                {displayMedia.year && displayMedia.year > 0 && (
                                    <>
                                        {displayMedia.score && displayMedia.score > 0 && <span className="text-zinc-600 select-none">·</span>}
                                        <span>{displayMedia.year}</span>
                                    </>
                                )}
                                {displayMedia.runtime && displayMedia.runtime > 0 && (
                                    <>
                                        <span className="text-zinc-600 select-none">·</span>
                                        <span>{displayMedia.runtime} min</span>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Sinopsis */}
                    <AnimatePresence mode="wait">
                        {plainDescription && (
                            <motion.p
                                key={displayMedia!.id + "_desc"}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.35, delay: 0.1 }}
                                className="text-zinc-300 text-xs leading-relaxed line-clamp-2 max-w-md"
                            >
                                {plainDescription}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    {/* Botón + dots */}
                    <div className="flex items-center gap-5 pt-0.5">
                        <AnimatePresence mode="wait">
                            {currentMovie && (
                                <motion.button
                                    key={currentMovie.mediaId + "_btn"}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3, delay: 0.15 }}
                                    onClick={() => handleMovieClick(currentMovie.mediaId!)}
                                    className="flex items-center gap-2 px-5 py-2 bg-white text-black text-[11px] font-bold tracking-widest uppercase rounded-sm hover:bg-zinc-100 active:scale-95 transition-all duration-200"
                                >
                                    <Icons.media.play size={11} fill="currentColor" />
                                    Ver Ahora
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {topFeatured.length > 1 && (
                            <div className="flex items-center gap-2">
                                {topFeatured.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setFeaturedIndex(i)}
                                        className={cn(
                                            "h-[2px] rounded-full transition-all duration-300",
                                            i !== featuredIndex && "w-4 bg-white/20 hover:bg-white/45"
                                        )}
                                        style={
                                            i === featuredIndex
                                                ? { width: "2rem", backgroundColor: currentEraConfig.color }
                                                : undefined
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}