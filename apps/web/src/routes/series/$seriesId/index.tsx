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
import { getDragonBallSpanishTitle, isDragonBallTmdbId, getSeriesEraTheme } from "@/lib/config/dragonball.config"
import { startViewTransition } from "@/lib/helpers/transitions"
import { useThemeSettings } from "@/lib/theme/theme-hooks"

// New Design System Components
import { FloatingMatchFlap } from "@/components/shared/floating-match-flap"
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
    const { tab: activeTab, saga: activeSagaId, subSaga: activeSubSagaId } = Route.useSearch()
    const { data: entry, isLoading } = useGetAnimeEntry(seriesId)
    const { data: continuityData, refetch: refetchContinuity } = useGetContinuityWatchHistoryItem(Number(seriesId))
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl)
    const ts = useThemeSettings()

    const { mutate: preloadStream } = usePreloadMediastreamMediaContainer()

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
                });
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

    const handleNextEpisode = () => {
        if (!computedEpisodes || !playTarget) return
        const currentEpIdx = computedEpisodes.findIndex(ep => (ep.absoluteEpisodeNumber || ep.episodeNumber) === playTarget.episodeNumber)
        if (currentEpIdx === -1 || currentEpIdx >= computedEpisodes.length - 1) {
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
        return idx >= 0 && idx < computedEpisodes.length - 1
    }, [computedEpisodes, playTarget])

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
            <FloatingMatchFlap
                directoryPath={entry.libraryData?.sharedPath || ""}
                mediaId={entry.mediaId}
            />
            <SeriesHero
                entry={entry}
                backdropUrl={heroBackdrop}
                sagaCount={sagas?.length ?? 0}
                onPlay={handlePlayDefault}
            />
            <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 mt-8">
                <div className="flex border-b border-outline-variant pb-2 mb-6 gap-3 overflow-x-auto no-scrollbar">
                    <SectionTab
                        active={activeTab === "episodes"}
                        onClick={() => setSearchParams({ tab: "episodes" })}
                        icon={<Icons.navigation.film size={14} strokeWidth={2.5} />}
                        label="Episodios"
                    />
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
                                    <SagaLoreHeader saga={sagas?.find(s => s.id === activeSagaId)} />

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
                const nextTitle = nextEp ? (nextEp.titleSpanish || nextEp.episodeMetadata?.title || nextEp.episodeTitle || nextEp.displayTitle || `Episodio ${nextEp.absoluteEpisodeNumber || nextEp.episodeNumber}`) : undefined;
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
                    ? "glass-liquid text-on-surface"
                    : "bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            )}
        >
            {icon}
            {label}
        </button>
    )
}

function SagaLoreHeader({ saga }: { saga: SagaDTO | undefined }) {
    if (!saga) return null

    const hasRichDetails = saga.antagonists?.length > 0 || saga.keyEvents?.length > 0 || saga.newCharacters?.length > 0

    return (
        <div className="glass-card p-6 md:p-8 mb-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                    <span className="inline-flex items-center text-label-sm text-brand-accent uppercase bg-brand-accent/10 border border-brand-accent/20 px-3 py-1 rounded-full">
                        Detalles del Arco
                    </span>
                    <h2 className="text-h3 font-display text-on-surface uppercase mt-1.5">
                        {saga.name}
                    </h2>
                </div>
                {saga.canonStatus && (
                    <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-label-sm uppercase border",
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

            {saga.description && (
                <p className="text-body-md text-on-surface-variant leading-relaxed border-l-2 border-brand-accent/30 pl-4 py-1">
                    {saga.description}
                </p>
            )}

            {hasRichDetails && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10 mt-2">
                    {saga.antagonists?.length > 0 && (
                        <div className="bg-white/[0.04] border border-white/10 p-5 rounded-2xl">
                            <span className="flex items-center gap-2 text-label-sm text-on-surface-variant/70 uppercase mb-3 pb-2 border-b border-white/10">
                                <Icons.status.skull size={14} className="text-brand-destructive" />
                                Antagonistas
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {saga.antagonists.map((ant: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center px-3 py-1 bg-brand-destructive/15 text-brand-destructive border border-brand-destructive/25 text-label-sm uppercase rounded-full">
                                        {ant}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {saga.keyEvents?.length > 0 && (
                        <div className="bg-white/[0.04] border border-white/10 p-5 rounded-2xl md:col-span-2">
                            <span className="flex items-center gap-2 text-label-sm text-on-surface-variant/70 uppercase mb-3 pb-2 border-b border-white/10">
                                <Icons.status.trophy size={14} className="text-brand-secondary" />
                                Hitos Clave
                            </span>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm text-on-surface-variant">
                                {saga.keyEvents.map((event: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-accent/60 mt-1.5 shrink-0" />
                                        <span className="text-on-surface-variant/70">{event}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}