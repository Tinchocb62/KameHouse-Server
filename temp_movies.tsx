import { createFileRoute } from "@tanstack/react-router"
import { HydrationBoundary, dehydrate, useQueryClient } from "@tanstack/react-query"
import React, { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { useAppStore } from "@/lib/store"
import { getHighResImage, getMediumResImage, getLowResImage } from "@/lib/helpers/images"
import { fetchAnimeEntry, useGetAnimeEntry, useUpdateAnimeEntryProgress } from "@/api/hooks/anime_entries.hooks"
import { useGetContinuityWatchHistoryItem } from "@/api/hooks/continuity.hooks"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { Anime_LocalFile, FileTechnicalInfo, Mediastream_StreamType } from "@/api/generated/types"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton/skeleton"

const VideoPlayer = React.lazy(() => import("@/components/video/player").then(m => ({ default: m.VideoPlayer })))
import { startViewTransition } from "@/lib/helpers/transitions"
import { FloatingMatchFlap } from "@/components/shared/floating-match-flap"
import { useSound } from "@/hooks/use-sound"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import { DeferredImage } from "@/components/shared/deferred-image"
import { ERA_TABS, cleanMovieTitle } from "./-MovieCard"
import { getEntryEra } from "./-components/movies-utils"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useServerQuery } from "@/api/client/requests"
import { CharacterDetailModal } from "@/components/shared/character-detail-modal"
import { isDragonBallTmdbId } from "@/lib/config/dragonball.config"


export const Route = createFileRoute("/movies/$movieId")({
    loader: ({ params: { movieId }, context }) => {
        const qc = context.queryClient
        qc.prefetchQuery({
            queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key, movieId],
            queryFn: () => fetchAnimeEntry(movieId),
        })
        return { dehydrateState: dehydrate(qc) }
    },
    component: MovieDetailPage,
})

const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 MB"
    const mb = bytes / (1024 * 1024)
    if (mb >= 1024) {
        return `${(mb / 1024).toFixed(2)} GB`
    }
    return `${mb.toFixed(0)} MB`
}

function MovieDetailPage() {
    const { movieId } = Route.useParams()
    const { dehydrateState } = Route.useLoaderData()

    return (
        <HydrationBoundary state={dehydrateState}>
            <MovieDetailClient key={movieId} movieId={movieId} />
        </HydrationBoundary>
    )
}

function MovieDetailClient({ movieId }: { movieId: string }) {
    const { playSound } = useSound()
    const queryClient = useQueryClient()
    const { data: entry, isLoading } = useGetAnimeEntry(movieId)
    const { data: continuityData, refetch: refetchContinuity } = useGetContinuityWatchHistoryItem(Number(movieId))
    const containerRef = useRef<HTMLDivElement>(null)
    const backdropRef = useRef<HTMLDivElement>(null)
    const addToQueue = useAppStore(state => state.addToQueue)

    const { data: lore } = useServerQuery<any>({
        endpoint: "/api/v1/lore/dragonball",
        method: "GET",
        queryKey: ["dragonball-lore"],
        staleTime: 300000,
        enabled: isDragonBallTmdbId(entry?.media?.tmdbId),
        muteError: true,
    })

    const [isFavorite, setIsFavorite] = useState(false)
    const [selectedCharacterName, setSelectedCharacterName] = useState<string | null>(null)
    const [playTarget, setPlayTarget] = useState<{
        path: string
        streamType: Mediastream_StreamType
        episodeLabel: string
        episodeNumber: number
        malId?: number | null
    } | null>(null)

    const initialWatched = entry?.episodes?.[0]?.watched || false
    const [isWatched, setIsWatched] = useState(initialWatched)
    const [prevInitialWatched, setPrevInitialWatched] = useState(initialWatched)
    const { mutate: updateProgress } = useUpdateAnimeEntryProgress(Number(movieId), 1, false)

    if (initialWatched !== prevInitialWatched) {
        setPrevInitialWatched(initialWatched)
        setIsWatched(initialWatched)
    }

    useEffect(() => {
        if (entry?.media?.id) playSound("detail", 0.4)
    }, [entry?.media?.id, playSound])

    useEffect(() => {
        const handleScroll = () => {
            if (!backdropRef.current) return
            const scrolled = window.scrollY || document.documentElement.scrollTop
            backdropRef.current.style.transform = `translate3d(0, ${scrolled * 0.35}px, 0)`
        }
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    useGSAP(() => {
        gsap.from(".movie-animate", {
            y: 35,
            opacity: 0,
            duration: 1.2,
            stagger: 0.08,
            ease: "power4.out",
            delay: 0.15
        })
    }, { scope: containerRef, dependencies: [movieId] })

    if (!entry || !entry.media) {
        if (isLoading) {
            return (
                <div className="h-full w-full bg-surface pb-16 p-6 md:p-12 flex flex-col justify-end min-h-screen gap-6">
                    <div className="flex flex-col lg:flex-row items-center lg:items-end gap-10 max-w-[1800px] w-full mx-auto">
                        <Skeleton className="w-56 md:w-68 shrink-0 aspect-[2/3] h-auto rounded-container" />
                        <div className="flex-1 w-full flex flex-col gap-4">
                            <Skeleton className="h-6 w-32 rounded-lg" />
                            <Skeleton className="h-14 w-2/3 rounded-lg" />
                            <Skeleton className="h-4 w-full rounded-lg" />
                            <Skeleton className="h-4 w-3/4 rounded-lg" />
                            <Skeleton className="h-14 w-48 rounded-full mt-2" />
                        </div>
                    </div>
                </div>
            )
        }
        return (
            <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center">
                <EmptyState title="Pel├¡cula no encontrada" message="No pudimos cargar este contenido." />
            </div>
        )
    }

    const media = entry.media
    const title = media.titleSpanish || media.titleEnglish || media.titleRomaji || "T├¡tulo Desconocido"
    const year = media.year?.toString() || ""
    const era = getEntryEra(entry)
    const eraConfig = ERA_TABS.find(t => t.value === era) || ERA_TABS[0]

    const synopsis = media.description ? media.description.replace(/<[^>]*>/g, "") : ""

    const backdropSrc = media.bannerImage ?? media.posterImage ?? null
    const backdropUrl = getHighResImage(backdropSrc || "")
    const posterUrl = getHighResImage(media.posterImage || "")
    const hasBannerImage = !!media.bannerImage

    const durationMins = entry.episodes?.[0]?.episodeMetadata?.length || (continuityData?.item?.duration ? Math.round(continuityData.item.duration / 60) : null)
    const formattedDuration = durationMins ? (durationMins >= 60 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : `${durationMins}m`) : null

    const techInfo = entry.localFiles?.[0]?.technicalInfo as FileTechnicalInfo | undefined
    const streamWidth = techInfo?.videoStream?.width ?? 0
    const technicalData = techInfo ? {
        fileSize: formatFileSize(techInfo.size || 0),
        resolutionTag: streamWidth >= 1920 ? "1080P FHD" : "720P HD",
        is4K: streamWidth >= 3840,
    } : null

    const progressPercent = continuityData?.item?.duration ? (continuityData.item.currentTime / continuityData.item.duration) * 100 : 0

    const handleToggleWatched = (e: React.MouseEvent) => {
        e.stopPropagation()
        const nextState = !isWatched
        setIsWatched(nextState)
        updateProgress({
            mediaId: Number(movieId),
            progress: nextState ? 1 : 0,
        })
        toast.success(nextState ? "Marcada como vista" : "Quitada de vistas")
    }

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsFavorite(prev => !prev)
        toast.success(!isFavorite ? "A├▒adida a favoritos" : "Quitada de favoritos")
    }

    const handlePlayLocalFile = (localFile: Anime_LocalFile) => {
        if (!localFile.path) return toast.error("Archivo no disponible.")
        const epNum = localFile.parsedInfo?.episode || localFile.metadata?.episode || 1
        const targetType = "direct"
        startViewTransition(() => {
            setPlayTarget({
                path: localFile.path,
                streamType: targetType as Mediastream_StreamType,
                episodeLabel: localFile.name,
                episodeNumber: Number(epNum),
                malId: media.idMal ?? null,
            })
        })
    }

    const handlePlayDefault = () => {
        if (entry.localFiles && entry.localFiles.length > 0) {
            handlePlayLocalFile(entry.localFiles[0])
        } else {
            toast.info("No hay archivos locales disponibles para reproducir.")
        }
    }

    const handleAddToQueue = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (entry.localFiles && entry.localFiles.length > 0) {
            const localFile = entry.localFiles[0]
            addToQueue({
                id: Number(movieId),
                title: title,
                playableUrl: localFile.path || "",
                thumbnail: getMediumResImage(media.posterImage || ""),
                mediaId: Number(movieId),
                episodeNumber: 1,
                malId: media.idMal ?? null,
                mediaFormat: media.format ?? "MOVIE"
            })
            toast.success("A├▒adido a la cola de reproducci├│n")
        } else {
            toast.error("No hay archivos locales disponibles.")
        }
    }

    return (
        <div ref={containerRef} className="h-full w-full flex flex-col overflow-y-auto no-scrollbar bg-surface text-on-surface pb-24 relative select-none">
            <FloatingMatchFlap
                directoryPath={entry.libraryData?.sharedPath || ""}
                mediaId={entry.mediaId}
            />

            {/* FULLSCREEN HERO SECTION */}
            <section className="relative w-full min-h-screen flex flex-col justify-end overflow-hidden pb-16 pt-32">
                {/* Ambient Blur Background */}
                <div className="absolute inset-0 overflow-hidden bg-transparent z-0">
                    {backdropSrc && (
                        <div
                            className="absolute inset-0 opacity-100"
                            style={{
                                backgroundImage: `url(${getLowResImage(backdropSrc)})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center 20%",
                                filter: "blur(80px) brightness(0.35) saturate(160%)",
                            }}
                        />
                    )}
                </div>

                {/* High Res Parallax Backdrop */}
                <div className="absolute inset-0 z-0">
                    {backdropUrl && (
                        hasBannerImage ? (
                            <div
                                ref={backdropRef}
                                onClick={handlePlayDefault}
                                className="absolute right-0 top-0 h-full w-full md:w-[82%] lg:w-[78%] overflow-hidden cursor-pointer z-0 will-change-transform group/backdrop"
                            >
                                <DeferredImage
                                    src={backdropUrl}
                                    alt={title}
                                    priority={true}
                                    className="w-full h-full object-cover object-[center_20%] opacity-85 transition-all [transition-duration:20s] ease-out group-hover/backdrop:scale-[1.02] animate-ken-burns"
                                    style={{
                                        WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 12%, black 40%)",
                                        maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 12%, black 40%)",
                                    }}
                                />
                            </div>
                        ) : (
                            <div
                                ref={backdropRef}
                                onClick={handlePlayDefault}
                                className="absolute right-0 top-0 h-full w-auto overflow-hidden cursor-pointer z-0 will-change-transform group/backdrop"
                            >
                                <DeferredImage
                                    src={backdropUrl}
                                    alt={title}
                                    priority={true}
                                    className="h-full w-auto object-contain object-right-top opacity-[0.65] transition-all [transition-duration:20s] ease-out group-hover/backdrop:scale-[1.02] animate-ken-burns"
                                />
                            </div>
                        )
                    )}
                </div>

                {/* Cinematic Vignettes */}
                <div
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                        background: hasBannerImage
                            ? "linear-gradient(to right, rgba(7,7,10,0.95) 0%, rgba(7,7,10,0.8) 25%, rgba(7,7,10,0.2) 65%, transparent 95%)"
                            : "linear-gradient(to right, rgba(7,7,10,0.95) 0%, rgba(7,7,10,0.8) 30%, rgba(7,7,10,0.15) 75%, transparent 98%)",
                    }}
                />
                <div
                    className="absolute inset-x-0 bottom-0 h-64 z-10 pointer-events-none"
                    style={{ background: "linear-gradient(to top, #07070a 0%, rgba(7,7,10,0.8) 25%, rgba(7,7,10,0.4) 60%, transparent 100%)" }}
                />
                <div
                    className="absolute inset-x-0 top-0 h-32 z-10 pointer-events-none"
                    style={{ background: "linear-gradient(to bottom, rgba(7,7,10,0.6) 0%, transparent 100%)" }}
                />

                {/* Content Container (Split Grid) */}
                <div className="relative z-20 w-full max-w-[1800px] mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center lg:items-end gap-10">
                                 {/* Left Column: Portrait Poster Card */}
                    <div className="movie-animate w-56 md:w-68 shrink-0 aspect-[2/3] rounded-container overflow-hidden border border-outline-variant bg-surface-container shadow-elevation-5">
                        <DeferredImage
                            src={posterUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Right Column: Meta & Description */}
                    <div className="flex-1 flex flex-col gap-6 text-left w-full">
                        {/* Era Badge */}
                        <div className="movie-animate">
                            <span 
                                className="inline-flex items-center text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-lg shadow-elevation-2 border"
                                style={{
                                    color: eraConfig.color,
                                    borderColor: `color-mix(in srgb, ${eraConfig.color} 27%, transparent)`,
                                    backgroundColor: `color-mix(in srgb, ${eraConfig.color} 8%, transparent)`,
                                }}
                            >
                                {eraConfig.label}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="movie-animate font-sans font-extrabold leading-[1.05] tracking-tighter text-white drop-shadow-[0_4px_25px_rgba(0,0,0,0.85)] uppercase" style={{ fontSize: "max(2.5rem, min(5.5vw, 4.5rem))" }}>
                            {cleanMovieTitle(title)}
                        </h1>

                        {/* Meta Info Row */}
                        <div className="movie-animate flex flex-wrap items-center text-on-surface-variant text-xs font-semibold tracking-wide gap-3">
                            <span className="flex items-center justify-center bg-surface-container-low border border-outline-variant/50 rounded-md px-2 py-0.5 text-on-surface-variant font-bold tracking-widest text-[9px]">
                                {media.isNsfw ? "18+" : "PG-13"}
                            </span>
                            
                            {technicalData?.is4K && (
                                <span className="flex items-center gap-1 font-black text-on-surface text-[11px] tracking-wide bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 rounded-md">
                                    4K ENHANCED
                                </span>
                            )}
                            
                            <span className="flex items-center justify-center bg-surface-container-low border border-outline-variant/50 rounded-md px-2 py-0.5 text-on-surface-variant font-bold text-[9px]">CC</span>
                            
                            <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] tracking-wide">
                                {year && <span>{year}</span>}
                                {year && formattedDuration && <span className="text-on-surface-variant/60">ÔÇó</span>}
                                {formattedDuration && <span>{formattedDuration}</span>}
                                {media.score && (
                                    <>
                                        <span className="text-on-surface-variant/60">ÔÇó</span>
                                        <span className="flex items-center gap-1 text-amber-400">
                                            <Icons.ui.star size={11} fill="currentColor" className="stroke-none" />
                                            {(media.score / 10).toFixed(1)} Ki
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Synopsis */}
                        {synopsis && (
                            <p className="movie-animate text-on-surface-variant text-sm md:text-[15px] leading-relaxed max-w-3xl line-clamp-3 pl-4 border-l-2 border-brand-secondary/30">
                                {synopsis}
                            </p>
                        )}

                        {/* Action Row */}
                        <div className="movie-animate flex flex-wrap items-center gap-4 pt-2">
                            {/* Premium Play Button */}
                            <button
                                onClick={handlePlayDefault}
                                className="group/play relative flex items-center gap-4 px-9 py-4 bg-gradient-to-r from-brand-secondary via-brand-secondary to-brand-secondary text-white rounded-full overflow-hidden shadow-[0_12px_40px_rgba(255,110,58,0.35)] hover:shadow-[0_18px_50px_rgba(255,110,58,0.55)] transition-all duration-500 hover:scale-105 active:scale-95 border border-outline-variant hover:border-brand-secondary/40"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-0 group-hover/play:opacity-100 transition-opacity duration-500 z-0" />
                                <div className="absolute -inset-10 bg-brand-secondary/30 blur-xl group-hover/play:opacity-100 opacity-0 transition-opacity duration-500 -z-10 animate-pulse" />

                                <div className="p-2.5 bg-surface-container backdrop-blur-overlay-xl rounded-full border border-outline-variant text-on-surface group-hover/play:bg-white group-hover/play:text-black transition-all duration-300 shadow-inner z-10 shrink-0">
                                    <Icons.media.play className="w-4 h-4 fill-current" />
                                </div>

                                <div className="flex flex-col items-start z-10 select-none text-left shrink-0">
                                    <span className="font-sans text-[13px] tracking-widest font-extrabold uppercase text-on-surface transition-colors whitespace-nowrap">
                                        {continuityData?.item?.currentTime ? "REANUDAR" : "PLAY"}
                                    </span>
                                    <span className="text-[8px] font-black text-on-surface/60 tracking-widest uppercase transition-colors mt-0.5 whitespace-nowrap">
                                        {continuityData?.item?.currentTime ? "Continuar viendo" : "Ver pel├¡cula"}
                                    </span>
                                </div>
                            </button>

                            {/* Queue Button */}
                            {entry.localFiles && entry.localFiles.length > 0 && (
                                <button
                                    onClick={handleAddToQueue}
                                    className="group/queue flex items-center justify-center w-14 h-14 rounded-full bg-[var(--glass-bg)] backdrop-blur-overlay-md border border-[var(--glass-border)] hover:bg-[var(--glass-hover)] hover:border-[var(--glass-strong)] cursor-pointer text-on-surface hover:text-brand-secondary transition-all duration-300 active:scale-95"
                                    title="A├▒adir a la cola"
                                >
                                    <Icons.ui.listPlus className="w-5 h-5 transition-transform group-hover/queue:-translate-y-0.5" />
                                </button>
                            )}

                            {/* Watch Status */}
                            <button
                                onClick={handleToggleWatched}
                                className={cn(
                                    "flex items-center justify-center w-14 h-14 rounded-full border transition-all duration-300 active:scale-95",
                                    isWatched
                                        ? "bg-surface-container text-on-surface border-outline-variant"
                                        : "bg-surface-container/5 border-outline-variant/10 text-on-surface"
                                )}
                                title={isWatched ? "Marcar como no vista" : "Marcar como vista"}
                            >
                                {isWatched ? <Icons.ui.check className="w-5 h-5 stroke-[3px]" /> : <Icons.ui.plus className="w-5 h-5 stroke-[2.5px]" />}
                            </button>

                            {/* Favorite Button */}
                            <button
                                onClick={handleToggleFavorite}
                                className={cn(
                                    "flex items-center justify-center w-14 h-14 rounded-full border transition-all duration-300 active:scale-95",
                                    isFavorite
                                        ? "bg-surface-container text-on-surface border-outline-variant"
                                        : "bg-surface-container/5 border-outline-variant/10 text-on-surface"
                                )}
                                title={isFavorite ? "Quitar de favoritos" : "A├▒adir a favoritos"}
                            >
                                <Icons.navigation.users className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Progress bar */}
                        {continuityData?.item?.currentTime && continuityData.item.duration && (
                            <div className="movie-animate w-full max-w-sm mt-1 h-[5px] bg-surface-container/20 rounded-full overflow-hidden relative z-10">
                                <div 
                                    className="h-full bg-brand-secondary"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Video Player */}
            {playTarget && (
                <React.Suspense fallback={
                    <div className="fixed inset-0 bg-surface/90 backdrop-blur-overlay-xl flex flex-col justify-center items-center z-50">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-secondary mb-4"></div>
                        <p className="text-on-surface-variant text-label-md uppercase tracking-widest">Cargando reproductor...</p>
                    </div>
                }>
                    <VideoPlayer
                        streamUrl={playTarget.path}
                        streamType={playTarget.streamType as "local" | "online" | "direct"}
                        title={title}
                        episodeLabel={playTarget.episodeLabel}
                        episodeNumber={playTarget.episodeNumber}
                        mediaId={Number(movieId)}
                        malId={playTarget.malId}
                        mediaFormat={media.format ?? "MOVIE"}
                        onNextEpisode={() => {}}
                        hasNextEpisode={false}
                        onClose={() => {
                            startViewTransition(() => setPlayTarget(null))
                            refetchContinuity()
                            queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key, String(movieId)] })
                        }}
                    />
                </React.Suspense>
            )}

            {/* Character Lore Detail Modal overlay */}
            {selectedCharacterName && (
                <CharacterDetailModal 
                    characterName={selectedCharacterName}
                    entry={entry}
                    loreData={lore}
                    onClose={() => setSelectedCharacterName(null)}
                />
            )}
        </div>
    )
}
