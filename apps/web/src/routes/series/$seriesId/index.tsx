import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router"
import { HydrationBoundary, dehydrate, useQueryClient } from "@tanstack/react-query"
import React, { useMemo, useState, useCallback } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { useSound } from "@/hooks/use-sound"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"

import { cn } from "@/components/ui/core/styling"
import { getHighResImage } from "@/lib/helpers/images"
import { fetchAnimeEntry, useGetAnimeEntry } from "@/api/hooks/anime_entries.hooks"
import { useGetContinuityWatchHistoryItem } from "@/api/hooks/continuity.hooks"
import { useServerQuery } from "@/api/client/requests"
import { usePreloadMediastreamMediaContainer } from "@/api/hooks/mediastream.hooks"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { Anime_Episode, Anime_LocalFile, Mediastream_StreamType } from "@/api/generated/types"
import { EmptyState } from "@/components/shared/empty-state"

const VideoPlayer = React.lazy(() => import("@/components/video/player").then(m => ({ default: m.VideoPlayer })))
import { RelationsTab, CharactersTab } from "./-series-bento-tabs"
import { getDragonBallSpanishTitle, isDragonBallTmdbId, getSeriesEraTheme, resolveSeriesSagas } from "@/lib/config/dragonball.config"
import sagaSynopsisTags from "@/lib/config/saga_synopsis_tags.json"
import { getNextInTimeline } from "@/lib/config/franchise_timeline"
import { useGetLibraryCollection } from "@/api/hooks/anime_collection.hooks"
import { startViewTransition } from "@/lib/helpers/transitions"
import { useThemeSettings } from "@/lib/theme/theme-hooks"

// New Design System Components
import { SeriesHero } from "./-components/series-hero"
import { SagaSelector } from "./-components/saga-selector"
import { CharacterCarousel } from "./-components/character-carousel"
import { PremiumEpisodeList } from "./-components/premium-episode-list"
import type { SagaDTO, SagaDetailSearchParams } from "@/api/types/series.types"
import { BentoDetailsSkeleton } from "@/components/ui/shimmer-skeleton"
import { CharacterDetailModal } from "@/components/shared/character-detail-modal"
import { IconButton } from "@/components/ui"
import { Icons } from "@/components/ui/icons"
import { PosterCard } from "@/components/ui/poster-card"

export const Route = createFileRoute("/series/$seriesId/")({
    validateSearch: (search: Record<string, unknown>): SagaDetailSearchParams => ({
        tab: (search.tab as SagaDetailSearchParams["tab"]) || "episodes",
        saga: (search.saga as string) ?? "",
        subSaga: (search.subSaga as string) ?? "",
        autoplay: (search.autoplay as string) || undefined,
    }),
    loader: async ({ params: { seriesId }, context }) => {
        const qc = context.queryClient
        const data = await qc.fetchQuery({
            queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key, seriesId],
            queryFn: () => fetchAnimeEntry(seriesId),
        })
        if (data?.media?.format === "MOVIE" || data?.media?.format === "SPECIAL" || data?.media?.format === "OVA") {
            throw redirect({ to: "/movies/$movieId", params: { movieId: String(seriesId) }, replace: true })
        }
        return { dehydrateState: dehydrate(qc) }
    },
    component: SeriesDetailPage,
})

function resolveLocalFileForEpisode(episode: Anime_Episode, localFiles: Anime_LocalFile[] | undefined | null): Anime_LocalFile | undefined {
    if (episode.localFile) return episode.localFile
    return (localFiles || []).find(f => {
        const fEp = f.metadata?.episode || f.parsedInfo?.episode
        const fSeason = f.parsedInfo?.season
        if (fEp == null) return false
        if (Number(fEp) === episode.absoluteEpisodeNumber) {
            return true
        }
        if (typeof episode.seasonNumber === 'number' && fSeason != null) {
            return Number(fEp) === episode.episodeNumber && Number(fSeason) === episode.seasonNumber
        }
        return Number(fEp) === episode.episodeNumber
    })
}

function SeriesDetailPage() {
    const { seriesId } = Route.useParams()
    const loaderData = Route.useLoaderData()
    const dehydrateState = loaderData?.dehydrateState

    return (
        <HydrationBoundary state={dehydrateState}>
            <SeriesDetailClient key={seriesId} seriesId={seriesId} />
        </HydrationBoundary>
    )
}

export function SeriesDetailClient({ seriesId }: { seriesId: string }) {
    const { playSound } = useSound()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const { tab: activeTab, saga: activeSagaId, subSaga: activeSubSagaId, autoplay: autoplayEp } = Route.useSearch()
    const { data: entry, isLoading } = useGetAnimeEntry(seriesId)
    const { data: libraryCollection } = useGetLibraryCollection()
    const { data: continuityData, refetch: refetchContinuity } = useGetContinuityWatchHistoryItem(Number(seriesId))
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl)
    const ts = useThemeSettings()

    const { mutate: preloadStream } = usePreloadMediastreamMediaContainer()
    // Paths already warmed this session (server preload is idempotent, but this
    // avoids spamming the mutation on every hover/re-render).
    const preloadedPathsRef = React.useRef<Set<string>>(new Set())
    const preloadPath = useCallback((path: string | undefined | null) => {
        if (!path || preloadedPathsRef.current.has(path)) return
        preloadedPathsRef.current.add(path)
        preloadStream({ path, streamType: "direct", audioStreamIndex: 0, preferredAudioLang: "" })
    }, [preloadStream])

    const { data: lore } = useServerQuery<any>({
        endpoint: "/api/v1/lore/dragonball",
        method: "GET",
        queryKey: ["dragonball-lore"],
        staleTime: 300000,
        enabled: isDragonBallTmdbId(entry?.media?.tmdbId),
        muteError: true,
    })

    const [selectedCharacterName, setSelectedCharacterName] = useState<string | null>(null)

    const setSearchParams = useCallback((updates: Partial<SagaDetailSearchParams>) => {
        const newSearch = new URLSearchParams(window.location.search)
        for (const [key, value] of Object.entries(updates)) {
            if (value) {
                newSearch.set(key, value)
            } else {
                newSearch.delete(key)
            }
        }
        navigate({ to: "/series/$seriesId", params: { seriesId }, search: Object.fromEntries(newSearch) as SagaDetailSearchParams })
    }, [navigate, seriesId])

    React.useEffect(() => {
        if (entry?.media?.id) {
            playSound("detail", 0.4)
        }
    }, [entry?.media?.id, playSound])

    const [playTarget, setPlayTarget] = useState<{
        path: string
        streamType: Mediastream_StreamType
        episodeLabel: string
        episodeNumber: number
        malId?: number | null
    } | null>(null)

    const { data: sagas } = useServerQuery<SagaDTO[]>({
        endpoint: `/api/v1/library/anime-entry/${seriesId}/sagas`,
        method: "GET",
        queryKey: [`series-sagas-${seriesId}`],
        staleTime: 600000,
    })

    const activeSubSaga = useMemo(() => {
        if (!activeSagaId || !activeSubSagaId || !sagas) return null
        const currentSaga = sagas.find(s => s.id === activeSagaId)
        return currentSaga?.subSagas?.find(ss => ss.id === activeSubSagaId) || null
    }, [sagas, activeSagaId, activeSubSagaId])

    React.useEffect(() => {
        if (sagas && sagas.length > 0 && !activeSagaId) {
            setSearchParams({ saga: sagas[0].id })
        }
    }, [sagas, activeSagaId, setSearchParams])

    const computedEpisodes = useMemo(() => {
        if (!entry) return []
        if (entry.episodes && entry.episodes.length > 0) {
            return entry.episodes
                .filter(ep => ep && typeof ep.episodeNumber === 'number')
                .map(ep => {
                    if (!sagas || sagas.length === 0) return ep;
                    const epNum = ep.absoluteEpisodeNumber || ep.episodeNumber;
                    const matchingSaga = sagas.find(s => epNum >= s.startEp && epNum <= s.endEp);
                    return matchingSaga ? { ...ep, sagaId: matchingSaga.id } : ep;
                })
                .sort((a, b) => (a.absoluteEpisodeNumber || a.episodeNumber) - (b.absoluteEpisodeNumber || b.episodeNumber));
        }

        if (entry.localFiles && entry.localFiles.length > 0) {
            const epMap = new Map<number, Anime_Episode>();

            entry.localFiles.forEach(lf => {
                const parsedEp = lf.parsedInfo?.episode || lf.metadata?.episode;
                const epNum = Number(parsedEp);
                if (!epNum || isNaN(epNum)) return;

                if (!epMap.has(epNum)) {
                    let sagaId: string | undefined = undefined;
                    if (sagas && sagas.length > 0) {
                        const matchingSaga = sagas.find(s => epNum >= s.startEp && epNum <= s.endEp);
                        if (matchingSaga) sagaId = matchingSaga.id;
                    }

                    epMap.set(epNum, {
                        episodeNumber: epNum,
                        absoluteEpisodeNumber: epNum,
                        episodeTitle: lf.name,
                        displayTitle: lf.name,
                        watched: false,
                        sagaId: sagaId,
                        type: "main",
                        progressNumber: epNum,
                        isDownloaded: true,
                        isInvalid: false,
                        episodeMetadata: {
                            episodeNumber: epNum,
                            image: entry.media?.posterImage || entry.media?.bannerImage || "",
                        }
                    } as unknown as Anime_Episode);
                }
            });

            return Array.from(epMap.values()).sort((a, b) => a.episodeNumber - b.episodeNumber);
        }
        return [];
    }, [entry, sagas])

    // Siguiente serie en la línea temporal de la franquicia (orden de emisión),
    // resuelta contra el catálogo del usuario: solo se ofrece continuación si la
    // serie existe realmente en la biblioteca (mapeo tmdbId → id interno).
    const nextSeriesTarget = useMemo(() => {
        const next = getNextInTimeline(entry?.media?.tmdbId)
        if (!next) return null
        const entries = libraryCollection?.lists?.flatMap(l => l.entries || []) || []
        const match = entries.find(e => e.media?.tmdbId === next.tmdbId && e.mediaId)
        if (!match?.mediaId) return null
        return { seriesId: String(match.mediaId), label: next.label }
    }, [entry?.media?.tmdbId, libraryCollection])

    const handlePlayEpisode = useCallback((localFile: Anime_LocalFile, episode: Anime_Episode) => {
        if (!localFile.path) {
            toast.error("Archivo local no disponible.")
            return
        }
        const targetType = "direct"
        const epNum = episode.absoluteEpisodeNumber || episode.episodeNumber
        const localizedTitle = getDragonBallSpanishTitle(entry?.media?.tmdbId, epNum)
        const resolvedTitle = localizedTitle || episode.titleSpanish || episode.episodeMetadata?.title || episode.episodeTitle || episode.displayTitle || `Episodio ${epNum}`
        
        startViewTransition(() => {
            setPlayTarget({
                path: localFile.path,
                streamType: targetType as Mediastream_StreamType,
                episodeLabel: resolvedTitle,
                episodeNumber: epNum,
                malId: entry?.media?.idMal ?? null,
            })
        })
    }, [entry?.media?.idMal, entry?.media?.tmdbId])

    const handlePlayLocalFile = useCallback((localFile: Anime_LocalFile) => {
        if (!localFile.path) {
            toast.error("Archivo no disponible.")
            return
        }
        const epNum = localFile.parsedInfo?.episode || localFile.metadata?.episode || 1
        const seasonNum = localFile.parsedInfo?.season
        
        const matchedEp = computedEpisodes.find(ep => {
            if (ep.absoluteEpisodeNumber === Number(epNum)) {
                return true
            }
            if (typeof ep.seasonNumber === 'number' && seasonNum != null) {
                return ep.episodeNumber === Number(epNum) && ep.seasonNumber === Number(seasonNum)
            }
            return ep.episodeNumber === Number(epNum)
        })
        const resolvedEpNum = matchedEp ? (matchedEp.absoluteEpisodeNumber || matchedEp.episodeNumber) : Number(epNum)

        const targetType = "direct"
        startViewTransition(() => {
            setPlayTarget({
                path: localFile.path,
                streamType: targetType as Mediastream_StreamType,
                episodeLabel: localFile.name,
                episodeNumber: resolvedEpNum,
                malId: entry?.media?.idMal ?? null,
            })
        })
    }, [computedEpisodes, entry?.media?.idMal])
    
    const handlePlayDefault = useCallback(() => {
        if (entry?.media?.format === "MOVIE" || !computedEpisodes || computedEpisodes.length === 0) {
            if (entry?.localFiles && entry.localFiles.length > 0) {
                let targetFile = entry.localFiles[0]
                if (continuityData?.item?.episodeNumber) {
                    const matchedFile = entry.localFiles.find(f => {
                        const ep = f.metadata?.episode || f.parsedInfo?.episode
                        return ep != null && Number(ep) === continuityData.item?.episodeNumber
                    })
                    if (matchedFile) targetFile = matchedFile
                }
                handlePlayLocalFile(targetFile)
            } else {
                toast.info("No hay archivos locales disponibles para reproducir.")
            }
            return
        }
        
        let targetEp = computedEpisodes.find(ep => !ep.watched) || computedEpisodes[0]
        if (continuityData?.item) {
            const resumeEp = computedEpisodes.find(ep => (ep.absoluteEpisodeNumber || ep.episodeNumber) === continuityData.item?.episodeNumber)
            if (resumeEp) {
                targetEp = resumeEp
            }
        }
        
        const lf = resolveLocalFileForEpisode(targetEp, entry?.localFiles)

        if (lf) {
            handlePlayEpisode(lf, targetEp)
        } else if (entry?.localFiles && entry.localFiles.length > 0) {
            handlePlayLocalFile(entry.localFiles[0])
        } else {
            toast.info("No hay archivos locales disponibles para reproducir.")
        }
    }, [entry, computedEpisodes, continuityData, handlePlayLocalFile, handlePlayEpisode])

    // Path that the primary "Reproducir" button would open — mirrors the selection
    // in handlePlayDefault so we can warm it ahead of the click.
    const defaultTargetPath = useMemo<string | null>(() => {
        if (!entry) return null
        if (entry.media?.format === "MOVIE" || !computedEpisodes || computedEpisodes.length === 0) {
            if (!entry.localFiles || entry.localFiles.length === 0) return null
            let targetFile = entry.localFiles[0]
            if (continuityData?.item?.episodeNumber) {
                const matchedFile = entry.localFiles.find(f => {
                    const ep = f.metadata?.episode || f.parsedInfo?.episode
                    return ep != null && Number(ep) === continuityData.item?.episodeNumber
                })
                if (matchedFile) targetFile = matchedFile
            }
            return targetFile.path || null
        }
        let targetEp = computedEpisodes.find(ep => !ep.watched) || computedEpisodes[0]
        if (continuityData?.item) {
            const resumeEp = computedEpisodes.find(ep => (ep.absoluteEpisodeNumber || ep.episodeNumber) === continuityData.item?.episodeNumber)
            if (resumeEp) targetEp = resumeEp
        }
        const lf = resolveLocalFileForEpisode(targetEp, entry.localFiles)
        return lf?.path || entry.localFiles?.[0]?.path || null
    }, [entry, computedEpisodes, continuityData])

    // Warm the default target on page load so the first play is instant.
    React.useEffect(() => {
        if (defaultTargetPath) preloadPath(defaultTargetPath)
    }, [defaultTargetPath, preloadPath])

    const handlePlayByNumber = useCallback((episodeNumber: number) => {
        const targetEp = computedEpisodes.find(ep => (ep.absoluteEpisodeNumber || ep.episodeNumber) === episodeNumber)
        if (!targetEp) {
            toast.error("Episodio no encontrado en la base de datos.")
            return
        }
        const lf = resolveLocalFileForEpisode(targetEp, entry?.localFiles)
        if (lf) {
            handlePlayEpisode(lf, targetEp)
        } else {
            toast.error("Archivo local no disponible para este episodio.")
        }
    }, [computedEpisodes, entry?.localFiles, handlePlayEpisode])

    // Salta a la primera entrega disponible de la siguiente serie de la línea
    // temporal (p.ej. terminar Dragon Ball → arrancar Dragon Ball Z ep 1).
    const continueToNextSeries = useCallback(() => {
        if (!nextSeriesTarget) return false
        toast.success(`Continuando con ${nextSeriesTarget.label}`)
        startViewTransition(() => {
            setPlayTarget(null)
            navigate({
                to: "/series/$seriesId",
                params: { seriesId: nextSeriesTarget.seriesId },
                search: { tab: "episodes", saga: "", subSaga: "", autoplay: "1" },
            })
        })
        return true
    }, [nextSeriesTarget, navigate])

    // Autoplay al llegar desde la continuación entre series: reproduce el
    // episodio indicado en la URL (?autoplay=N) una sola vez y limpia el flag.
    const autoplayFiredRef = React.useRef(false)
    React.useEffect(() => {
        if (!autoplayEp || autoplayFiredRef.current) return
        if (!computedEpisodes || computedEpisodes.length === 0) return
        autoplayFiredRef.current = true
        handlePlayByNumber(Number(autoplayEp))
        setSearchParams({ autoplay: "" })
    }, [autoplayEp, computedEpisodes, handlePlayByNumber, setSearchParams])

    const handleNextEpisode = () => {
        if (!computedEpisodes || !playTarget) return
        const currentEpIdx = computedEpisodes.findIndex(ep => (ep.absoluteEpisodeNumber || ep.episodeNumber) === playTarget.episodeNumber)
        if (currentEpIdx === -1 || currentEpIdx >= computedEpisodes.length - 1) {
            // Fin de la serie: intentar encadenar con la siguiente del timeline.
            if (continueToNextSeries()) return
            toast.info("Has llegado al final de la lista de episodios.")
            startViewTransition(() => {
                setPlayTarget(null)
            })
            return
        }
        const nextEp = computedEpisodes[currentEpIdx + 1]
        const lf = resolveLocalFileForEpisode(nextEp, entry?.localFiles)
        if (!lf) {
            toast.error("El siguiente episodio no está disponible localmente.")
            startViewTransition(() => {
                setPlayTarget(null)
            })
            return
        }
        handlePlayEpisode(lf, nextEp)
    }

    const heroBackdrop = useMemo(
        () => getHighResImage(entry?.media?.bannerImage || entry?.media?.posterImage || ""),
        [entry?.media?.bannerImage, entry?.media?.posterImage]
    )

    React.useEffect(() => {
        if (heroBackdrop) {
            setBackdropUrl(heroBackdrop)
        }
    }, [heroBackdrop, setBackdropUrl])

    const hasNextEpisode = useMemo(() => {
        if (!computedEpisodes || !playTarget) return false
        const idx = computedEpisodes.findIndex(ep =>
            (ep?.absoluteEpisodeNumber || ep?.episodeNumber) === playTarget.episodeNumber
        )
        if (idx >= 0 && idx < computedEpisodes.length - 1) return true
        // Último episodio de la serie: hay "siguiente" si el timeline encadena.
        return idx >= 0 && !!nextSeriesTarget
    }, [computedEpisodes, playTarget, nextSeriesTarget])

    const nextEp = useMemo(() => {
        if (!computedEpisodes || !playTarget) return null
        const currentEpIdx = computedEpisodes.findIndex(ep => (ep.absoluteEpisodeNumber || ep.episodeNumber) === playTarget.episodeNumber)
        if (currentEpIdx === -1 || currentEpIdx >= computedEpisodes.length - 1) {
            return null
        }
        return computedEpisodes[currentEpIdx + 1]
    }, [computedEpisodes, playTarget])

    const nextLocalFile = useMemo(() => {
        if (!nextEp) return null
        return resolveLocalFileForEpisode(nextEp, entry?.localFiles)
    }, [nextEp, entry?.localFiles])

    if (isLoading && !entry) {
        return (
            <div className="h-full w-full text-on-surface pb-16 overflow-y-auto">
                <BentoDetailsSkeleton />
            </div>
        )
    }

    if (!entry || !entry.media) {
        return (
            <div className="h-full w-full text-on-surface flex items-center justify-center px-6">
                <EmptyState
                    title="Contenido no encontrado"
                    message="No pudimos cargar este contenido. Vuelve al inicio o intenta con otro."
                />
            </div>
        )
    }

    const title = entry.media.titleSpanish || entry.media.titleRomaji || entry.media.titleEnglish || "Título Desconocido"
    const hasRelations = entry.media?.relations && entry.media.relations.length > 0
    const hasCharacters = entry.media?.characters?.edges && entry.media.characters.edges.length > 0
    const eraTheme = getSeriesEraTheme(entry.media?.tmdbId)
    const localTheme = !ts.themeEra ? eraTheme : undefined

    return (
        <div
            data-theme={localTheme || undefined}
            className="h-full w-full flex flex-col overflow-y-auto no-scrollbar text-on-surface pb-16"
        >

            <SeriesHero
                entry={entry}
                backdropUrl={heroBackdrop}
                sagaCount={sagas?.length ?? 0}
                onPlay={handlePlayDefault}
                onPlayHover={() => preloadPath(defaultTargetPath)}
            />
            <div className="w-full max-w-[1800px] mx-auto px-8 md:px-16 lg:px-20 xl:px-24 mt-8">
                <div className="flex border-b border-outline-variant pb-2 mb-6 gap-3 overflow-x-auto no-scrollbar">

                    {hasRelations && (
                        <SectionTab
                            active={activeTab === "relations"}
                            onClick={() => setSearchParams({ tab: "relations" })}
                            icon={<Icons.navigation.layers size={14} strokeWidth={2.5} />}
                            label="Relacionados"
                        />
                    )}
                    {hasCharacters && (
                        <SectionTab
                            active={activeTab === "characters"}
                            onClick={() => setSearchParams({ tab: "characters" })}
                            icon={<Icons.navigation.users size={14} strokeWidth={2.5} />}
                            label="Personajes"
                        />
                    )}
                </div>

                <div className="mt-4 min-h-[300px]">
                    <AnimatePresence mode="wait">
                        {activeTab === "episodes" && (
                            <motion.div
                                key="episodes"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="mt-8 flex flex-col lg:flex-row gap-10"
                            >
                                {sagas && sagas.length > 0 && (
                                    <div className="lg:w-80 flex-shrink-0 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-7rem)] h-full">
                                        <SagaSelector
                                            sagas={sagas}
                                            activeSagaId={activeSagaId}
                                            onSelectSaga={(sagaId) => {
                                                setSearchParams({ saga: sagaId, subSaga: "" })
                                                window.scrollTo({ top: 0, behavior: "smooth" })
                                            }}
                                            activeSubSagaId={activeSubSagaId}
                                            onSelectSubSaga={(subSagaId) => setSearchParams({ subSaga: subSagaId })}
                                        />
                                    </div>
                                )}

                                <div className="flex-grow flex flex-col min-w-0">
                                    <SagaLoreHeader 
                                        saga={sagas?.find(s => s.id === activeSagaId)}
                                        media={entry?.media}
                                        onSelectCharacter={setSelectedCharacterName}
                                    />

                                    <CharacterCarousel 
                                        characters={sagas?.find(s => s.id === activeSagaId)?.keyCharacters || []}
                                        onSelect={setSelectedCharacterName}
                                    />
                                    
                                    <PremiumEpisodeList 
                                        episodes={computedEpisodes
                                            .filter(ep => !sagas?.length ? true : ep.sagaId === activeSagaId)
                                            .map(ep => {
                                                const epNum = ep.absoluteEpisodeNumber || ep.episodeNumber;
                                                const lf = ep.localFile || entry.localFiles?.find(f => {
                                                    const fEp = f.metadata?.episode || f.parsedInfo?.episode;
                                                    const fSeason = f.parsedInfo?.season;
                                                    
                                                    if (ep.absoluteEpisodeNumber && Number(fEp) === ep.absoluteEpisodeNumber) {
                                                        return true;
                                                    }
                                                    if (fSeason != null && ep.seasonNumber != null) {
                                                        return Number(fEp) === ep.episodeNumber && Number(fSeason) === ep.seasonNumber;
                                                    }
                                                    return Number(fEp) === ep.episodeNumber;
                                                });
                                                
                                                const localizedTitle = getDragonBallSpanishTitle(entry.media?.tmdbId, epNum);
                                                const resolvedTitle = localizedTitle || ep.titleSpanish || ep.episodeMetadata?.title || ep.episodeTitle || ep.displayTitle || `Episodio ${epNum}`;
                                                
                                                return {
                                                    id: epNum.toString(),
                                                    title: resolvedTitle,
                                                    number: epNum,
                                                    description: ep.episodeMetadata?.summary || ep.episodeMetadata?.overview || "",
                                                    thumbnailUrl: ep.episodeMetadata?.image || heroBackdrop,
                                                    episodeType: lf?.metadata?.episodeType || "Canon",
                                                    isWatched: ep.watched,
                                                    resolution: lf?.technicalInfo?.videoStream?.height ? `${lf.technicalInfo.videoStream.height}p` : undefined,
                                                    videoCodec: lf?.technicalInfo?.videoStream?.codec,
                                                    audioCodec: lf?.technicalInfo?.audioStreams?.[0]?.codec,
                                                    localFilePath: lf?.path,
                                                    sagaId: ep.sagaId,
                                                    sagaName: sagas?.find(s => s.id === ep.sagaId)?.name
                                                }
                                            })}
                                        activeSubSagaStart={activeSubSaga?.startEp}
                                        activeSubSagaEnd={activeSubSaga?.endEp}
                                        onPlay={handlePlayByNumber}
                                        onPreload={(path) => preloadStream({ path, streamType: "direct", audioStreamIndex: 0, preferredAudioLang: "" })}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "relations" && (
                            <motion.div
                                key="relations"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="py-4"
                            >
                                <div className="glass-card p-6 md:p-8">
                                    <RelationsTab media={entry.media} />
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "characters" && (
                            <motion.div
                                key="characters"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="py-4"
                            >
                                <div className="glass-card p-6 md:p-8">
                                    <CharactersTab characters={entry.media?.characters?.edges || []} onSelectChar={setSelectedCharacterName} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {playTarget && (() => {
                const nextTitle = nextEp
                    ? (nextEp.titleSpanish || nextEp.episodeMetadata?.title || nextEp.episodeTitle || nextEp.displayTitle || `Episodio ${nextEp.absoluteEpisodeNumber || nextEp.episodeNumber}`)
                    : (nextSeriesTarget ? `Continuar con ${nextSeriesTarget.label}` : undefined);
                return (
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
                            mediaId={Number(seriesId)}
                            malId={playTarget.malId}
                            mediaFormat={entry.media?.format ?? null}
                            nextStreamUrl={nextLocalFile?.path}
                            nextStreamType={playTarget.streamType as Mediastream_StreamType}
                            nextEpisodeTitle={nextTitle}
                            nextEpisodeNumber={nextEp ? (nextEp.absoluteEpisodeNumber || nextEp.episodeNumber) : undefined}
                            nextEpisodeImage={nextEp?.episodeMetadata?.image || entry.media?.bannerImage || entry.media?.posterImage}
                            onNextEpisode={handleNextEpisode}
                            hasNextEpisode={hasNextEpisode}
                            onClose={() => {
                                startViewTransition(() => {
                                    setPlayTarget(null)
                                })
                                refetchContinuity()
                                queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key, String(seriesId)] })
                            }}
                        />
                    </React.Suspense>
                );
            })()}

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

function SectionTab({ active, onClick, icon, label }: {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
}) {
    return (
        <button
            onClick={onClick}
            aria-current={active ? "true" : undefined}
            className={cn(
                "inline-flex items-center gap-2 shrink-0 text-sm font-semibold px-4 py-2 rounded-pill",
                "transition-all duration-base ease-smooth-out active:scale-95",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent/70",
                active
                    ? "glass-liquid glass-active text-on-surface"
                    : "bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            )}
        >
            {icon}
            {label}
        </button>
    )
}

const SAGA_CHARACTER_MAPPING: Record<string, string[]> = {
    // DB Original (12609)
    "pilaf": ["Goku", "Bulma", "Yamcha", "Oolong", "Puar", "Roshi", "Pilaf"],
    "torneo-21": ["Goku", "Krilin", "Roshi", "Yamcha", "Bulma"],
    "red-ribbon": ["Goku", "Bulma", "Krilin", "Roshi", "Upa", "Tao Pai Pai", "General Blue", "Comandante Red"],
    "uranai-baba": ["Goku", "Krilin", "Yamcha", "Roshi", "Upa", "Uranai Baba", "Gohan"],
    "torneo-22": ["Goku", "Krilin", "Yamcha", "Roshi", "Tenshinhan", "Chaoz"],
    "piccolo": ["Goku", "Piccolo", "Krilin", "Roshi", "Tenshinhan", "Chaoz", "Yajirobe", "Kami"],
    "piccolo-jr": ["Goku", "Piccolo", "Krilin", "Yamcha", "Tenshinhan", "Chaoz", "Chichi"],

    // DB Z (12971)
    "saiyajin": ["Goku", "Gohan", "Piccolo", "Krilin", "Vegeta", "Nappa", "Raditz", "Yamcha", "Tenshinhan", "Chaoz"],
    "namek-freezer": ["Goku", "Gohan", "Krilin", "Bulma", "Vegeta", "Freezer", "Piccolo", "Dende", "Ginyu"],
    "garlic-jr": ["Gohan", "Krilin", "Piccolo", "Garlic Jr."],
    "androides": ["Goku", "Gohan", "Vegeta", "Trunks", "Piccolo", "Krilin", "Cell", "Androide 17", "Androide 18", "Androide 16"],
    "cell": ["Goku", "Gohan", "Vegeta", "Trunks", "Piccolo", "Krilin", "Cell", "Androide 17", "Androide 18", "Androide 16", "Satan"],
    "trunks-androides-cell": ["Goku", "Gohan", "Vegeta", "Trunks", "Piccolo", "Krilin", "Cell", "Androide 17", "Androide 18", "Androide 16", "Satan"],
    "torneo-otro-mundo": ["Goku", "Pikkon", "Korr"],
    "gran-saiyaman": ["Gohan", "Videl", "Goten", "Trunks", "Goku", "Vegeta"],
    "gran-saiyaman-torneo25": ["Gohan", "Videl", "Goten", "Trunks", "Goku", "Vegeta", "Satan"],
    "majin-buu": ["Goku", "Vegeta", "Gohan", "Goten", "Trunks", "Majin Buu", "Babidi", "Piccolo", "Vegetto", "Satan"],

    // DB GT (12697)
    "black-star": ["Goku", "Trunks", "Pan", "Giru"],
    "baby": ["Goku", "Vegeta", "Baby", "Gohan", "Goten", "Trunks", "Pan"],
    "super-17": ["Goku", "Androide 18", "Super 17", "Vegeta", "Gohan", "Trunks"],
    "shadow-dragons": ["Goku", "Pan", "Vegeta", "Syn Shenron", "Nuova Shenron", "Eis Shenron"],

    // DB Super (62715)
    "batalla-dioses": ["Goku", "Beerus", "Whis", "Vegeta", "Bulma"],
    "resurreccion-f": ["Goku", "Vegeta", "Freezer", "Jaco", "Roshi", "Gohan", "Krilin", "Piccolo"],
    "universo-6": ["Goku", "Vegeta", "Hit", "Cabba", "Champa", "Vados", "Beerus", "Whis"],
    "trunks-futuro": ["Goku", "Vegeta", "Trunks", "Goku Black", "Zamasu", "Mai"],
    "supervivencia-universal": ["Goku", "Jiren", "Vegeta", "Freezer", "Androide 17", "Gohan", "Piccolo", "Roshi", "Krilin", "Tenshinhan", "Hit", "Caulifla", "Kale", "Toppo"]
};

function getSagaCharacters(sagaId: string, charactersEdges: any[] | undefined | null) {
    if (!charactersEdges) return [];
    const allowedNames = SAGA_CHARACTER_MAPPING[sagaId] || [];
    if (!allowedNames.length) return [];

    return charactersEdges
        .filter(edge => {
            const fullName = edge.node?.name?.full?.toLowerCase() || "";
            return allowedNames.some(allowed => fullName.includes(allowed.toLowerCase()));
        })
        .map(edge => {
            const fullName = edge.node?.name?.full || "";
            const avatarUrl = edge.node?.image?.large || "";
            
            let roleTag = edge.role === "MAIN" ? "Protagonista" : "Secundario";
            const lowerName = fullName.toLowerCase();
            if (
                lowerName.includes("freezer") || 
                lowerName.includes("cell") || 
                lowerName.includes("buu") || 
                lowerName.includes("baby") ||
                lowerName.includes("goku black") ||
                lowerName.includes("zamasu") ||
                lowerName.includes("pilaf") ||
                (sagaId === "piccolo" && lowerName.includes("piccolo")) ||
                lowerName.includes("tao pai pai") ||
                lowerName.includes("jiren") ||
                lowerName.includes("raditz") ||
                lowerName.includes("nappa") ||
                lowerName.includes("garlic")
            ) {
                roleTag = "Antagonista";
            }
            
            return {
                name: fullName,
                avatarUrl,
                roleTag
            };
        });
}

const SAGA_LORE_MAPPING: Record<string, { antagonists: string[], keyEvents: string[] }> = {
    // DB Original
    "pilaf": {
        antagonists: ["Emperador Pilaf", "Mai", "Shu"],
        keyEvents: ["Goku conoce a Bulma", "Encuentro con Oolong y Yamcha", "Invocación de Shenlong", "Goku se transforma en Ozaru"]
    },
    "torneo-21": {
        antagonists: ["Jackie Chun", "Krilin (Rivalidad)"],
        keyEvents: ["Entrenamiento con el Maestro Roshi", "Goku y Krilin clasifican al Torneo", "Final épica: Goku vs Jackie Chun"]
    },
    "red-ribbon": {
        antagonists: ["General Blue", "Tao Pai Pai", "Comandante Red", "General Black"],
        keyEvents: ["Asalto a la Torre de la Fuerza", "Aventura en la Ciudad Pirata", "Tao Pai Pai derrota a Goku", "Entrenamiento en la Torre Karin"]
    },
    "uranai-baba": {
        antagonists: ["La Momia", "El Demonio Akkuman", "Gohan (Abuelo)"],
        keyEvents: ["Combate contra los 5 guerreros de la vidente", "Reencuentro emotivo con el Abuelo Gohan", "Localización de la última Esfera del Dragón"]
    },
    "torneo-22": {
        antagonists: ["Tenshinhan", "Chaoz", "Maestro Tsuru"],
        keyEvents: ["Aparición de la Escuela Grulla", "Krilin vs Chaoz", "Gran final: Goku vs Tenshinhan"]
    },
    "piccolo": {
        antagonists: ["Piccolo Daimaku", "Tambourine", "Cymbal", "Drum"],
        keyEvents: ["Muerte de Krilin, Roshi y Chaoz", "Goku bebe el Agua Ultra Sagrada", "Derrota de Piccolo Daimaku con el puño de Ozaru"]
    },
    "piccolo-jr": {
        antagonists: ["Piccolo Jr. (Ma Junior)"],
        keyEvents: ["Entrenamiento con Kami-sama", "Goku se casa con Chichi", "Batalla campal y victoria de Goku en el 23° Torneo"]
    },

    // DB Z
    "saiyajin": {
        antagonists: ["Vegeta", "Nappa", "Raditz"],
        keyEvents: ["Llegada de Raditz y muerte de Goku", "Entrenamiento con Kaio-sama", "Batalla en el desierto y choque de poderes"]
    },
    "namek-freezer": {
        antagonists: ["Freezer", "Fuerzas Especiales Ginyu", "Zarbon", "Dodoria"],
        keyEvents: ["Búsqueda de las Esferas de Namek", "Llegada de Goku y derrota de las Fuerzas Ginyu", "Muerte de Vegeta y Krilin", "Goku alcanza el Super Saiyajin"]
    },
    "garlic-jr": {
        antagonists: ["Garlic Jr.", "Los Cuatro Reyes de la Niebla"],
        keyEvents: ["Liberación de la Neblina del Mal", "Gohan, Krilin y Piccolo defienden el Templo de Kami", "Destrucción de la Zona Muerta"]
    },
    "androides": {
        antagonists: ["Androide 17", "Androide 18", "Androide 19", "Dr. Gero"],
        keyEvents: ["Advertencia de Trunks del Futuro", "Goku cae enfermo del corazón", "Vegeta se transforma en Super Saiyajin"]
    },
    "cell": {
        antagonists: ["Cell (Célula)"],
        keyEvents: ["Cell absorbe a los Androides y alcanza la forma Perfecta", "Entrenamiento en la Habitación del Tiempo", "Los Juegos de Cell", "Gohan alcanza el Super Saiyajin 2", "Sacrificio de Goku", "Kamehameha Padre e Hijo"]
    },
    "trunks-androides-cell": {
        antagonists: ["Cell", "Androide 17", "Androide 18", "Dr. Gero"],
        keyEvents: ["Llegada de Trunks del Futuro", "Vegeta alcanza el Super Saiyajin", "Habitación del Tiempo", "Gohan Super Saiyajin 2", "Kamehameha Padre e Hijo"]
    },
    "torneo-otro-mundo": {
        antagonists: ["Pikkon (Rival)"],
        keyEvents: ["Inicio del torneo en el Otro Mundo", "Enfrentamiento final: Goku vs Pikkon"]
    },
    "gran-saiyaman": {
        antagonists: ["Criminales locales"],
        keyEvents: ["Gohan asiste a la preparatoria Orange Star", "Debut del Gran Saiyaman", "Videl descubre el secreto de Gohan"]
    },
    "gran-saiyaman-torneo25": {
        antagonists: ["Spopovich", "Yamu"],
        keyEvents: ["Entrenamiento de Gohan, Goten y Videl", "Inicio del 25° Torneo Mundial", "Ataque a Gohan y robo de energía"]
    },
    "majin-buu": {
        antagonists: ["Majin Buu", "Babidi", "Dabura", "Majin Vegeta"],
        keyEvents: ["Despertar de Majin Buu", "Muerte de Dabura", "Sacrificio de Vegeta", "Goku muestra el Super Saiyajin 3", "Fusión: Gotenks y Vegetto", "Genuina Genkidama final"]
    },

    // DB GT
    "black-star": {
        antagonists: ["Don Kee", "Giru (Temporal)"],
        keyEvents: ["Deseo accidental de Pilaf y Goku niño", "Viaje espacial en la nave espacial", "Recolección de las esferas oscuras"]
    },
    "baby": {
        antagonists: ["Baby", "Guerreros Z poseídos"],
        keyEvents: ["Invasión de Baby a la Tierra", "Goku alcanza el Super Saiyajin 4", "Combate final y escape de los terrícolas al planeta Tsufuru"]
    },
    "super-17": {
        antagonists: ["Super Androide 17", "Dr. Myuu", "Dr. Gero"],
        keyEvents: ["Apertura del portal del Infierno", "Goku queda atrapado en el Otro Mundo", "Androide 18 y Goku derrotan a Super 17"]
    },
    "shadow-dragons": {
        antagonists: ["Omega Shenron (1★)", "Eis Shenron (3★)", "Rage Shenron (5★)"],
        keyEvents: ["Nacimiento de los Dragones Malignos", "Viaje de Goku y Pan", "Fusión en Gogeta Super Saiyajin 4", "Genkidama Universal y partida de Goku"]
    },

    // DB Super
    "batalla-dioses": {
        antagonists: ["Beerus (Bills)"],
        keyEvents: ["Beerus despierta y busca al Super Saiyajin Dios", "Ritual de las 6 almas Saiyajin", "Goku se transforma en Super Saiyajin Dios"]
    },
    "resurreccion-f": {
        antagonists: ["Freezer (Dorado)", "Sorbet"],
        keyEvents: ["Resurrección de Freezer en la Tierra", "Entrenamiento de Goku y Vegeta con Whis", "Super Saiyajin Blue", "Destrucción y rebobinado de la Tierra"]
    },
    "universo-6": {
        antagonists: ["Hit", "Cabba", "Frost"],
        keyEvents: ["Torneo de los destructores", "Goku combina el Super Saiyajin Blue con el Kaio-ken x10", "Derrota de Hit"]
    },
    "trunks-futuro": {
        antagonists: ["Goku Black", "Zamasu del Futuro", "Zamasu Fusionado"],
        keyEvents: ["Llegada de Trunks en la máquina del tiempo", "Viajes al futuro en ruinas", "Fusión en Vegito Blue", "Invocación de Zeno-sama"]
    },
    "supervivencia-universal": {
        antagonists: ["Jiren", "Toppo", "Dyspo", "Kefla"],
        keyEvents: ["Convocatoria al Torneo del Poder", "Despertar del Ultra Instinto Señal", "Sacrificio de Androide 17", "Goku alcanza el Ultra Instinto Completo", "Victoria compartida con Freezer y Androide 17"]
    }
};

interface SagaLoreHeaderProps {
    saga: SagaDTO | undefined
    media: any
    onSelectCharacter?: (name: string) => void
}

function SagaLoreHeader({ saga, media, onSelectCharacter }: SagaLoreHeaderProps) {
    if (!saga) return null

    // Get the localized synopsis tags and description
    const localSagas = media ? resolveSeriesSagas(media) : []
    const localSagaDef = localSagas.find(s => s.id === saga.id)
    const description = localSagaDef?.description || saga.description || ""
    const sagaImage = localSagaDef?.image

    const synopsisInfo = (sagaSynopsisTags as Record<string, any>)[saga.id]
    const dominantVibe = synopsisInfo?.dominantVibe
    const tags = synopsisInfo?.tags || []
    const suggestedSwimlane = synopsisInfo?.suggestedSwimlane

    const loreDef = SAGA_LORE_MAPPING[saga.id]
    const antagonists = loreDef?.antagonists || []
    const keyEvents = loreDef?.keyEvents || []

    const characters = getSagaCharacters(saga.id, media?.characters?.edges)

    return (
        <div className="glass-card p-6 md:p-8 mb-8 space-y-6 overflow-visible">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Text details */}
                <div className={cn(
                    "space-y-4 flex flex-col justify-between",
                    sagaImage ? "lg:col-span-8 col-span-12" : "col-span-12"
                )}>
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center text-label-sm text-brand-accent uppercase bg-brand-accent/10 border border-brand-accent/20 px-3 py-1 rounded-full font-bold">
                                Detalles del Arco
                            </span>
                            {saga.episodeRange && (
                                <span className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant bg-white/[0.04] border border-white/10 px-3 py-1 rounded-full">
                                    <Icons.status.tv size={12} className="text-brand-secondary" />
                                    Eps {saga.episodeRange}
                                </span>
                            )}
                            {saga.startEp != null && saga.endEp != null && (
                                <span className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant bg-white/[0.04] border border-white/10 px-3 py-1 rounded-full">
                                    <Icons.time.clock size={12} className="text-brand-success" />
                                    {saga.endEp - saga.startEp + 1} Episodios
                                </span>
                            )}
                            {dominantVibe && (
                                <span className={cn(
                                    "inline-flex items-center gap-1 text-label-sm uppercase border px-3 py-1 rounded-full",
                                    dominantVibe === "Aventura" 
                                        ? "bg-brand-magic/15 text-brand-magic border-brand-magic/25"
                                        : dominantVibe === "Tensión Absoluta" || dominantVibe === "Épico"
                                        ? "bg-brand-secondary/15 text-brand-secondary border-brand-secondary/25"
                                        : "bg-white/[0.04] border-white/10 text-on-surface-variant"
                                )}>
                                    <Icons.status.sparkles size={11} />
                                    {dominantVibe}
                                </span>
                            )}
                            {suggestedSwimlane && (
                                <span className="inline-flex items-center gap-1 text-label-sm uppercase bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary px-3 py-1 rounded-full">
                                    <Icons.navigation.library size={11} />
                                    {suggestedSwimlane}
                                </span>
                            )}
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                            <h2 className="text-h3 font-display text-on-surface uppercase leading-none">
                                {saga.name}
                            </h2>
                            {saga.canonStatus && (
                                <span className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-full text-label-sm uppercase border font-semibold",
                                    saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon"
                                        ? "bg-brand-success/15 text-brand-success border-brand-success/25"
                                        : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false"
                                        ? "bg-brand-destructive/15 text-brand-destructive border-brand-destructive/25"
                                        : "bg-brand-secondary/15 text-brand-secondary border-brand-secondary/25"
                                )}>
                                    {saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon" ? "Canon" : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false" ? "Relleno" : saga.canonStatus}
                                </span>
                            )}
                        </div>
                    </div>

                    {description && (
                        <div className="space-y-3">
                            <p className="text-body-md text-on-surface-variant leading-relaxed border-l-2 border-brand-accent/30 pl-4 py-1">
                                {description}
                            </p>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1 pl-4">
                                    {tags.map((tag: string, idx: number) => (
                                        <span key={idx} className="inline-flex items-center text-[10px] text-on-surface-variant/70 bg-white/[0.03] border border-white/5 px-2.5 py-0.5 rounded-full select-none uppercase tracking-wider font-semibold">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Banner image */}
                {sagaImage && (
                    <div className="lg:col-span-4 col-span-12 flex items-center justify-center">
                        <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 shadow-elevated group select-none bg-white/[0.02]">
                            <img 
                                src={sagaImage} 
                                alt={saga.name}
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-smooth-out"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                        </div>
                    </div>
                )}
            </div>

            {/* Antagonists and Key Events row */}
            {(antagonists.length > 0 || keyEvents.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-white/10">
                    {antagonists.length > 0 && (
                        <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl flex flex-col">
                            <span className="flex items-center gap-2 text-label-sm text-on-surface-variant/70 uppercase mb-3 pb-2 border-b border-white/5 font-black tracking-wider">
                                <Icons.status.skull size={14} className="text-brand-destructive" />
                                Antagonistas Principales
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {antagonists.map((ant: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center px-3 py-1 bg-brand-destructive/10 text-brand-destructive border border-brand-destructive/20 text-label-sm uppercase rounded-full font-medium transition-all hover:bg-brand-destructive/20 select-none">
                                        {ant}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {keyEvents.length > 0 && (
                        <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl flex flex-col">
                            <span className="flex items-center gap-2 text-label-sm text-on-surface-variant/70 uppercase mb-3 pb-2 border-b border-white/5 font-black tracking-wider">
                                <Icons.status.trophy size={14} className="text-brand-success" />
                                Hitos y Momentos Clave
                            </span>
                            <ul className="space-y-2 text-body-sm text-on-surface-variant">
                                {keyEvents.map((event: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 leading-relaxed group/event">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-accent/60 mt-1.5 shrink-0 group-hover/event:bg-brand-accent transition-colors" />
                                        <span className="text-on-surface-variant/80 group-hover/event:text-on-surface transition-colors">{event}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Key Characters */}
            {characters.length > 0 && (
                <div className="pt-5 border-t border-white/10 space-y-4">
                    <span className="flex items-center gap-2 text-label-sm text-on-surface-variant/70 uppercase font-black tracking-wider">
                        <Icons.navigation.users size={14} className="text-brand-accent" />
                        Personajes Clave del Arco
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                        {characters.map((char, idx) => (
                            <div
                                key={idx}
                                onClick={() => onSelectCharacter?.(char.name)}
                                className="flex flex-col items-center text-center gap-2 group cursor-pointer"
                                role="button"
                                tabIndex={0}
                                title={`Ver detalles de ${char.name}`}
                            >
                                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 group-hover:border-brand-accent/50 group-hover:shadow-[0_0_8px_hsl(var(--brand-accent)/0.3)] transition-all duration-300 relative shadow-md group-hover:-translate-y-1">
                                    <img
                                        src={char.avatarUrl}
                                        alt={char.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Icons.ui.info size={16} className="text-white" />
                                    </div>
                                </div>
                                <div className="flex flex-col w-full px-1">
                                    <span className="text-[11px] font-bold text-on-surface group-hover:text-brand-accent tracking-wide transition-colors line-clamp-1">
                                        {char.name}
                                    </span>
                                    <span className={cn(
                                        "text-[8px] font-black uppercase tracking-wider mt-0.5 select-none",
                                        char.roleTag === "Antagonista" 
                                            ? "text-brand-destructive" 
                                            : char.roleTag === "Protagonista"
                                            ? "text-brand-success"
                                            : "text-on-surface-variant/50"
                                    )}>
                                        {char.roleTag}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}