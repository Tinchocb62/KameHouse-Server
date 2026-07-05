import { createFileRoute } from "@tanstack/react-router"
import { HydrationBoundary, dehydrate, useQueryClient } from "@tanstack/react-query"
import React, { useState, useEffect, useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { toast } from "sonner"
import { useAppStore } from "@/lib/store"
import { getHighResImage, getMediumResImage, getLowResImage } from "@/lib/helpers/images"
import { fetchAnimeEntry, useGetAnimeEntry, useUpdateAnimeEntryProgress } from "@/api/hooks/anime_entries.hooks"
import { useGetContinuityWatchHistoryItem } from "@/api/hooks/continuity.hooks"
import { usePreloadMediastreamMediaContainer } from "@/api/hooks/mediastream.hooks"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { Anime_LocalFile, FileTechnicalInfo, Mediastream_StreamType } from "@/api/generated/types"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton/skeleton"

const VideoPlayer = React.lazy(() => import("@/components/video/player").then(m => ({ default: m.VideoPlayer })))
import { startViewTransition } from "@/lib/helpers/transitions"
import { FloatingMatchFlap } from "@/components/shared/floating-match-flap"
import { MediaHero } from "@/components/ui/media-hero"
import { useSound } from "@/hooks/use-sound"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import { DeferredImage } from "@/components/shared/deferred-image"
import { ERA_TABS, cleanMovieTitle } from "./-MovieCard"
import { getEntryEra } from "./-components/movies-utils"
import { useServerQuery } from "@/api/client/requests"
import { CharacterDetailModal } from "@/components/shared/character-detail-modal"

import { isDragonBallTmdbId, getSeriesEraTheme } from "@/lib/config/dragonball.config"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"
import { useThemeSettings } from "@/lib/theme/theme-hooks"


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
    const ts = useThemeSettings()
    const isSmallBanner = ts.themeMediaPageBannerSize === "small"

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
    const { mutate: preloadStream } = usePreloadMediastreamMediaContainer()

    // Warm the media container ahead of the click (page load + hover intent).
    const defaultTargetPath = entry?.localFiles?.[0]?.path || null
    const preloadedPathsRef = useRef<Set<string>>(new Set())
    useEffect(() => {
        if (!defaultTargetPath || preloadedPathsRef.current.has(defaultTargetPath)) return
        preloadedPathsRef.current.add(defaultTargetPath)
        preloadStream({ path: defaultTargetPath, streamType: "direct", audioStreamIndex: 0, preferredAudioLang: "" })
    }, [defaultTargetPath, preloadStream])

    if (initialWatched !== prevInitialWatched) {
        setPrevInitialWatched(initialWatched)
        setIsWatched(initialWatched)
    }

    useEffect(() => {
        if (entry?.media?.id) playSound("detail", 0.4)
    }, [entry?.media?.id, playSound])

    // Parallax del backdrop — escucha en captura porque la página scrollea
    // dentro de su propio contenedor, no en window (mismo patrón que SeriesHero)
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const target = e.target
            if (!backdropRef.current || !containerRef.current) return
            if (target === document || target === window) {
                const scrolled = window.scrollY || document.documentElement.scrollTop
                backdropRef.current.style.transform = `translate3d(0, ${scrolled * 0.35}px, 0)`
            } else if (target instanceof HTMLElement && target.contains(containerRef.current)) {
                backdropRef.current.style.transform = `translate3d(0, ${target.scrollTop * 0.35}px, 0)`
            }
        }
        window.addEventListener("scroll", handleScroll, { capture: true, passive: true })
        return () => window.removeEventListener("scroll", handleScroll, { capture: true })
    }, [])

    // Sincroniza el backdrop con el DynamicBackdrop global (glass real detrás del contenido)
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl)
    const backdropForStore = getHighResImage(entry?.media?.bannerImage || entry?.media?.posterImage || "")
    useEffect(() => {
        if (backdropForStore) setBackdropUrl(backdropForStore)
        return () => setBackdropUrl(null)
    }, [backdropForStore, setBackdropUrl])

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
                <div className="h-full w-full pb-16 p-6 md:p-12 flex flex-col justify-end min-h-screen gap-6">
                    <div className="flex flex-col lg:flex-row items-center lg:items-end gap-10 max-w-[1800px] w-full mx-auto">
                        <Skeleton className="w-56 md:w-64 shrink-0 aspect-[2/3] h-auto rounded-container" />
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
            <div className="min-h-screen text-on-surface flex items-center justify-center">
                <EmptyState title="Película no encontrada" message="No pudimos cargar este contenido." />
            </div>
        )
    }

    const media = entry.media
    const title = media.titleSpanish || media.titleEnglish || media.titleRomaji || "Título Desconocido"
    const year = media.year?.toString() || ""
    const era = getEntryEra(entry)
    const eraConfig = ERA_TABS.find(t => t.value === era) || ERA_TABS[0]
    const eraTheme = getSeriesEraTheme(media.tmdbId)
    const localTheme = !ts.themeEra ? eraTheme : undefined

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
        toast.success(!isFavorite ? "Añadida a favoritos" : "Quitada de favoritos")
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

    const preloadTarget = () => {
        if (!defaultTargetPath || preloadedPathsRef.current.has(defaultTargetPath)) return
        preloadedPathsRef.current.add(defaultTargetPath)
        preloadStream({ path: defaultTargetPath, streamType: "direct", audioStreamIndex: 0, preferredAudioLang: "" })
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
            toast.success("Añadido a la cola de reproducción")
        } else {
            toast.error("No hay archivos locales disponibles.")
        }
    }

    const titleNode = cleanMovieTitle(title)

    const topBadge = (
        <span
            className="inline-flex items-center text-label-sm uppercase px-3 py-1 rounded-full border backdrop-blur-[var(--blur-overlay-sm)]"
            style={{
                color: eraConfig.color,
                borderColor: `color-mix(in srgb, ${eraConfig.color} 27%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${eraConfig.color} 8%, transparent)`,
            }}
        >
            {eraConfig.label}
        </span>
    )

    const metadataRow = (
        <div className="flex flex-wrap items-center text-on-surface-variant text-xs font-semibold tracking-wide gap-3">
            <span className="flex items-center justify-center bg-surface-container-low border border-outline-variant/50 rounded-md px-2 py-0.5 text-on-surface-variant font-bold tracking-widest text-[9px]">
                {media.isNsfw ? "18+" : "PG-13"}
            </span>
            
            {technicalData?.is4K && (
                <span className="flex items-center gap-1 font-black text-on-surface text-[11px] tracking-wide px-2 py-0.5 rounded-md" style={{ background: "linear-gradient(to right, var(--era-shimmer-1), var(--era-shimmer-2))" }}>
                    <Icons.ui.star size={10} fill="currentColor" />
                    4K ENHANCED
                </span>
            )}
            
            <span className="flex items-center justify-center bg-surface-container-low border border-outline-variant/50 rounded-md px-2 py-0.5 text-on-surface-variant font-bold text-[9px]">CC</span>
            
            <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] tracking-wide">
                {year && <span>{year}</span>}
                {year && formattedDuration && <span className="text-on-surface-variant/60">•</span>}
                {formattedDuration && <span>{formattedDuration}</span>}
                {media.score && (
                    <>
                        <span className="text-on-surface-variant/60">•</span>
                        <span className="flex items-center gap-1 text-brand-secondary">
                            <Icons.ui.star size={11} fill="currentColor" className="stroke-none" />
                            {(media.score / 10).toFixed(1)} Ki
                        </span>
                    </>
                )}
            </div>
        </div>
    )

    const actionButtons = (
        <>
            <button
                onClick={handlePlayDefault}
                onPointerEnter={preloadTarget}
                onFocus={preloadTarget}
                className="group/play relative flex items-center gap-4 px-8 py-4 text-zinc-950 rounded-2xl overflow-hidden shadow-brand-primary transition-all duration-300 hover:scale-[1.03] active:scale-95"
                style={{ background: `linear-gradient(to right, var(--era-btn-from), var(--era-btn-to))` }}
            >
                <div className="absolute inset-0 transition-opacity duration-300 opacity-0 group-hover/play:opacity-100 z-0" style={{ background: `linear-gradient(to right, var(--era-btn-hover-from), var(--era-btn-hover-to))` }} />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-0 group-hover/play:opacity-100 transition-opacity duration-slow ease-smooth-out z-0" />

                <div className="p-3 bg-black/15 backdrop-blur-[var(--blur-overlay-sm)] rounded-xl text-zinc-950 group-hover/play:bg-zinc-950 group-hover/play:text-zinc-50 transition-all duration-300 z-10 shrink-0">
                    <Icons.media.play className="w-4 h-4 fill-current" />
                </div>

                <div className="flex flex-col items-start z-10 select-none text-left shrink-0">
                    <span className="font-sans text-button-md tracking-wider font-black uppercase text-zinc-950 transition-colors whitespace-nowrap">
                        {continuityData?.item?.currentTime ? "Reanudar" : "Reproducir"}
                    </span>
                    <span className="text-label-sm font-black text-zinc-950/70 tracking-widest uppercase transition-colors mt-0.5 whitespace-nowrap">
                        {continuityData?.item?.currentTime ? "Continuar viendo" : "Ver película"}
                    </span>
                </div>
            </button>

            {/* Queue Button */}
            {entry.localFiles && entry.localFiles.length > 0 && (
                <button
                    onClick={handleAddToQueue}
                    className="group/queue flex items-center justify-center p-4 rounded-2xl glass-liquid transition-all duration-300 text-on-surface/70 hover:text-on-surface hover:scale-[1.03] active:scale-95"
                    title="Añadir a la cola"
                >
                    <Icons.ui.listPlus className="w-5 h-5 transition-transform group-hover/queue:-translate-y-0.5" />
                </button>
            )}

            {/* Watch Status */}
            <button
                onClick={handleToggleWatched}
                className={cn(
                    "flex items-center justify-center p-4 rounded-2xl glass-liquid transition-all duration-300 hover:scale-[1.03] active:scale-95",
                    isWatched ? "text-brand-success" : "text-on-surface/70 hover:text-on-surface"
                )}
                title={isWatched ? "Marcar como no vista" : "Marcar como vista"}
            >
                {isWatched ? <Icons.ui.check className="w-5 h-5 stroke-[3px]" /> : <Icons.ui.plus className="w-5 h-5 stroke-[2.5px]" />}
            </button>

            {/* Favorite Button */}
            <button
                onClick={handleToggleFavorite}
                className={cn(
                    "flex items-center justify-center p-4 rounded-2xl glass-liquid transition-all duration-300 hover:scale-[1.03] active:scale-95",
                    isFavorite ? "text-brand-destructive" : "text-on-surface/70 hover:text-on-surface"
                )}
                title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            >
                <Icons.ui.heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
            </button>
        </>
    )

    return (
        <div ref={containerRef} className="h-full w-full flex flex-col overflow-y-auto no-scrollbar text-on-surface relative select-none" data-theme={localTheme || undefined}>
            <FloatingMatchFlap
                directoryPath={entry.libraryData?.sharedPath || ""}
                mediaId={entry.mediaId}
            />

            <MediaHero
                scrollContainerRef={containerRef}
                backdropUrl={backdropUrl}
                posterUrl={posterUrl}
                hasBannerImage={hasBannerImage}
                title={titleNode}
                topBadge={topBadge}
                metadataRow={metadataRow}
                synopsis={synopsis}
                actionButtons={actionButtons}
                showPosterColumn={true}
                onBackdropClick={handlePlayDefault}
            />

            {/* Progress bar */}
            {continuityData?.item?.currentTime && continuityData.item.duration && (
                <div className="w-full max-w-[1800px] mx-auto px-8 md:px-16 lg:px-20 xl:px-24 mt-12 pb-24 relative z-20">
                    <div className="movie-animate w-full h-[5px] rounded-full overflow-hidden relative z-10" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 20%, transparent)" }}>
                        <div
                            className="h-full bg-brand-secondary"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Video Player */}
            {playTarget && (
                <React.Suspense fallback={
                    <div className="fixed inset-0 bg-scrim/80 backdrop-blur-[var(--blur-overlay-lg)] flex flex-col justify-center items-center z-50">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-secondary mb-4"></div>
                        <p className="text-on-surface-variant/70 text-label-md uppercase">Cargando reproductor...</p>
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
