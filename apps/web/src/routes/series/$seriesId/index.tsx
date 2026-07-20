import { createFileRoute, useNavigate } from "@tanstack/react-router"
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
import { resolveSeriesSagas, getDragonBallSpanishTitle } from "@/lib/config/dragonball.config"
import { startViewTransition } from "@/lib/helpers/transitions"
import { Trophy, Skull } from "lucide-react"
import { getSeriesIdFromMedia } from "@/lib/helpers/series"

// Modular Components
import { FloatingMatchFlap } from "@/components/shared/floating-match-flap"
import { SeriesHero } from "./-components/series-hero"
import { SagaSelector } from "./-components/saga-selector"
import { CharacterCarousel } from "./-components/character-carousel"
import { PremiumEpisodeList } from "./-components/premium-episode-list"
import type { SagaDTO, CharacterRole } from "@/api/types/series.types"
import { BentoDetailsSkeleton } from "@/components/ui/shimmer-skeleton"
import { CharacterDetailModal } from "@/components/shared/character-detail-modal"

export const Route = createFileRoute("/series/$seriesId/")({
    loader: ({ params: { seriesId }, context }) => {
        const qc = context.queryClient
        qc.prefetchQuery({
            queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key, seriesId],
            queryFn: () => fetchAnimeEntry(seriesId),
        })
        return { dehydrateState: dehydrate(qc) }
    },
    component: SeriesDetailPage,
})

function SeriesDetailPage() {
    const { seriesId } = Route.useParams()
    const { dehydrateState } = Route.useLoaderData()

    return (
        <HydrationBoundary state={dehydrateState}>
            <SeriesDetailClient key={seriesId} seriesId={seriesId} />
        </HydrationBoundary>
    )
}

const parseEpisodeRange = (rangeStr: string) => {
    if (!rangeStr) return { startEp: 1, endEp: 1 }
    const parts = rangeStr.split("-")
    const startEp = parseInt(parts[0], 10) || 1
    const endEp = parseInt(parts[1], 10) || startEp
    return { startEp, endEp }
}

export function SeriesDetailClient({ seriesId }: { seriesId: string }) {
    const { playSound } = useSound()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const { data: entry, isLoading } = useGetAnimeEntry(seriesId)
    const { data: continuityData, refetch: refetchContinuity } = useGetContinuityWatchHistoryItem(Number(seriesId))
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl)

    const { mutate: preloadStream } = usePreloadMediastreamMediaContainer()

    // Load rich Dragon Ball lore database
    const { data: lore } = useServerQuery<any>({
        endpoint: "/api/v1/lore/dragonball",
        method: "GET",
        queryKey: ["dragonball-lore"],
        staleTime: 300000,
    })

    const [selectedCharacterName, setSelectedCharacterName] = useState<string | null>(null)

    const isMovie = React.useMemo(() => {
        if (!entry?.media) return false
        return entry.media.format === "MOVIE" || entry.media.format === "SPECIAL" || entry.media.format === "OVA"
    }, [entry])

    React.useEffect(() => {
        if (isMovie) {
            navigate({ to: "/movies/$movieId", params: { movieId: String(seriesId) }, replace: true })
        }
    }, [isMovie, seriesId, navigate])

    React.useEffect(() => {
        if (entry?.media?.id && !isMovie) {
            playSound("detail", 0.4)
        }
    }, [entry?.media?.id, isMovie, playSound])

    const [playTarget, setPlayTarget] = useState<{
        path: string
        streamType: Mediastream_StreamType
        episodeLabel: string
        episodeNumber: number
        malId?: number | null
    } | null>(null)

    const [activeTab, setActiveTab] = useState<"episodes" | "movie" | "relations" | "characters">("episodes")
    const [prevEntryId, setPrevEntryId] = useState<number | null>(null)
    const [activeSagaId, setActiveSagaId] = useState<string>("")
    const [activeSubSagaId, setActiveSubSagaId] = useState<string>("")

    // Reset al cambiar de serie, durante el render (patrón "adjusting state when a prop
    // changes"): evita el re-render en cascada de hacerlo en un effect.
    if (entry?.media && entry.media.id !== prevEntryId) {
        setPrevEntryId(entry.media.id)
        setActiveTab("episodes")
        setActiveSagaId("")
        setActiveSubSagaId("")
    }

    const baseSagas = useMemo(() => entry?.media ? resolveSeriesSagas(entry.media) : [], [entry])

    // Convert config sagas to DTO format and enrich with wiki data
    const sagas = useMemo(() => {
        const allChars = (entry?.media?.characters?.edges || [])
            .filter(edge => edge.node?.image?.large)
            .map(edge => ({
                name: edge.node?.name?.full || "Unknown",
                roleTag: (edge.role === "MAIN" ? "Protagonist" : "Supporting") as CharacterRole,
                avatarUrl: edge.node?.image?.large || ""
            }));

        const seriesIdKey = getSeriesIdFromMedia(entry?.media)
        const wikiSeries = lore?.sagas_wiki?.find((s: any) => s.series_id === seriesIdKey)

        return baseSagas.map((s) => {
            let richDesc = s.description || ""
            let antagonists: string[] = []
            let keyEvents: string[] = []
            let newCharacters: string[] = []
            let canonStatus: string | boolean = true

            if (wikiSeries?.sagas) {
                const matchingWiki = wikiSeries.sagas.find((ws: any) => {
                    const { startEp, endEp } = parseEpisodeRange(ws.episodes)
                    return (s.startEp >= startEp && s.startEp <= endEp) || (startEp >= s.startEp && startEp <= s.endEp)
                })
                if (matchingWiki) {
                    richDesc = matchingWiki.description || richDesc
                    antagonists = matchingWiki.antagonists || []
                    keyEvents = matchingWiki.key_events || []
                    newCharacters = matchingWiki.new_characters || []
                    canonStatus = matchingWiki.canon
                }
            }

            return {
                id: s.id,
                name: s.title,
                episodeRange: `${s.startEp}-${s.endEp}`,
                description: richDesc,
                isFiller: s.title.toLowerCase().includes("filler") || s.title.toLowerCase().includes("relleno") || canonStatus === false || String(canonStatus).toLowerCase() === "relleno",
                canonStatus: String(canonStatus),
                antagonists,
                keyEvents,
                newCharacters,
                keyCharacters: allChars.slice(0, 15),
                subSagas: s.subSagas?.map(ss => ({
                    id: ss.id,
                    name: ss.title,
                    episodeRange: `${ss.startEp}-${ss.endEp}`,
                    startEp: ss.startEp,
                    endEp: ss.endEp
                })) || []
            }
        })
    }, [baseSagas, entry, lore])

    const activeSubSaga = useMemo(() => {
        if (!activeSagaId || !activeSubSagaId) return null
        const currentSaga = sagas.find(s => s.id === activeSagaId)
        return currentSaga?.subSagas?.find(ss => ss.id === activeSubSagaId) || null
    }, [sagas, activeSagaId, activeSubSagaId])

    // Sync activeSagaId when sagas change, durante el render (evita el re-render en
    // cascada de hacerlo en un effect).
    const [prevSagas, setPrevSagas] = useState<SagaDTO[]>([])
    if (sagas !== prevSagas) {
        setPrevSagas(sagas)
        if (sagas.length > 0 && !sagas.find(s => s.id === activeSagaId)) {
            setActiveSagaId(sagas[0].id)
        }
    } else if (sagas.length > 0 && !activeSagaId) {
        setActiveSagaId(sagas[0].id)
    }
    const computedEpisodes = useMemo(() => {
        if (!entry) return []
        if (entry.episodes && entry.episodes.length > 0) {
            const eps = entry.episodes.filter(ep => ep && typeof ep.episodeNumber === 'number');
            eps.forEach(ep => {
                if (sagas.length > 0) {
                    const epNum = ep.absoluteEpisodeNumber || ep.episodeNumber;
                    const matchingSaga = baseSagas.find(s => epNum >= s.startEp && epNum <= s.endEp);
                    if (matchingSaga) {
                        ep.sagaId = matchingSaga.id;
                    }
                }
            });
            return eps;
        }
        
        if (entry.localFiles && entry.localFiles.length > 0) {
            const epMap = new Map<number, Anime_Episode>();
            
            entry.localFiles.forEach(lf => {
                const parsedEp = lf.parsedInfo?.episode || lf.metadata?.episode;
                const epNum = Number(parsedEp);
                if (!epNum || isNaN(epNum)) return;
                
                if (!epMap.has(epNum)) {
                    let sagaId: string | undefined = undefined;
                    if (sagas) {
                        const matchingSaga = baseSagas.find(s => epNum >= s.startEp && epNum <= s.endEp);
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
    }, [entry, sagas, baseSagas]);

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
        
        // Try to find the matching episode in computedEpisodes to resolve absoluteEpisodeNumber
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
        
        // Find resume episode or first unwatched episode
        let targetEp = computedEpisodes.find(ep => !ep.watched) || computedEpisodes[0]
        if (continuityData?.item) {
            const resumeEp = computedEpisodes.find(ep => (ep.absoluteEpisodeNumber || ep.episodeNumber) === continuityData.item?.episodeNumber)
            if (resumeEp) {
                targetEp = resumeEp
            }
        }
        
        const lf = targetEp.localFile || (entry?.localFiles || []).find(f => {
            const fEp = f.metadata?.episode || f.parsedInfo?.episode
            const fSeason = f.parsedInfo?.season
            if (fEp == null) return false
            if (Number(fEp) === targetEp.absoluteEpisodeNumber) {
                return true
            }
            if (typeof targetEp.seasonNumber === 'number' && fSeason != null) {
                return Number(fEp) === targetEp.episodeNumber && Number(fSeason) === targetEp.seasonNumber
            }
            return Number(fEp) === targetEp.episodeNumber
        })
        
        if (lf) {
            handlePlayEpisode(lf, targetEp)
        } else if (entry?.localFiles && entry.localFiles.length > 0) {
            // If no metadata match, just play first available local file
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
        const lf = targetEp.localFile || (entry?.localFiles || []).find(f => {
            const fEp = f.metadata?.episode || f.parsedInfo?.episode
            const fSeason = f.parsedInfo?.season
            if (fEp == null) return false
            if (Number(fEp) === targetEp.absoluteEpisodeNumber) {
                return true
            }
            if (typeof targetEp.seasonNumber === 'number' && fSeason != null) {
                return Number(fEp) === targetEp.episodeNumber && Number(fSeason) === targetEp.seasonNumber
            }
            return Number(fEp) === targetEp.episodeNumber
        })
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
        const lf = nextEp.localFile || (entry?.localFiles || []).find(f => {
            const fEp = f.metadata?.episode || f.parsedInfo?.episode
            const fSeason = f.parsedInfo?.season
            if (fEp == null) return false
            if (Number(fEp) === nextEp.absoluteEpisodeNumber) {
                return true
            }
            if (typeof nextEp.seasonNumber === 'number' && fSeason != null) {
                return Number(fEp) === nextEp.episodeNumber && Number(fSeason) === nextEp.seasonNumber
            }
            return Number(fEp) === nextEp.episodeNumber
        })
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
        return nextEp.localFile || (entry?.localFiles || []).find(f => {
            const fEp = f.metadata?.episode || f.parsedInfo?.episode
            const fSeason = f.parsedInfo?.season
            if (fEp == null) return false
            if (Number(fEp) === nextEp.absoluteEpisodeNumber) {
                return true
            }
            if (typeof nextEp.seasonNumber === 'number' && fSeason != null) {
                return Number(fEp) === nextEp.episodeNumber && Number(fSeason) === nextEp.seasonNumber
            }
            return Number(fEp) === nextEp.episodeNumber
        })
    }, [nextEp, entry?.localFiles])

    if ((isLoading && !entry) || (entry && isMovie)) {
        if (isMovie) {
            return (
                <div className="h-full w-full bg-[#09090b] text-white flex items-center justify-center">
                    <div className="flex flex-col items-center gap-5">
                        <div className="w-10 h-10 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-zinc-500 animate-pulse">
                            Redirigiendo a Película...
                        </span>
                    </div>
                </div>
            )
        }
        return (
            <div className="h-full w-full bg-[#050506]/35 backdrop-blur-[64px] text-white pb-16 overflow-y-auto">
                <BentoDetailsSkeleton />
            </div>
        )
    }


    if (!entry || !entry.media) {
        return (
            <div className="h-full w-full bg-[#09090b] text-white flex items-center justify-center px-6">
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

    return (
        <div className="h-full w-full flex flex-col overflow-y-auto no-scrollbar bg-[#050506]/35 backdrop-blur-[64px] text-white pb-16">
            <FloatingMatchFlap
                directoryPath={entry.libraryData?.sharedPath || ""}
                mediaId={entry.mediaId}
            />
            <SeriesHero
                entry={entry}
                backdropUrl={heroBackdrop}
                sagaCount={sagas.length}
                onPlay={handlePlayDefault}
            />
            <div className="w-full max-w-[1800px] mx-auto px-6 md:pl-[120px] md:pr-12 mt-12">
                {/* Custom Glassmorphic Tabs Navigation for Series/Shows */}
                <div className="flex border-b border-white/5 pb-2 mb-8 gap-8 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab("episodes")}
                        className={cn(
                            "text-sm uppercase tracking-[0.2em] font-black pb-3 transition-all relative shrink-0",
                            activeTab === "episodes" ? "text-brand-orange" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        Episodios
                        {activeTab === "episodes" && (
                            <motion.div layoutId="detailActiveLine" className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-orange" />
                        )}
                    </button>

                    {hasRelations && (
                        <button
                            onClick={() => setActiveTab("relations")}
                            className={cn(
                                "text-sm uppercase tracking-[0.2em] font-black pb-3 transition-all relative shrink-0",
                                activeTab === "relations" ? "text-brand-orange" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Relacionados
                            {activeTab === "relations" && (
                                <motion.div layoutId="detailActiveLine" className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-orange" />
                            )}
                        </button>
                    )}

                    {hasCharacters && (
                        <button
                            onClick={() => setActiveTab("characters")}
                            className={cn(
                                "text-sm uppercase tracking-[0.2em] font-black pb-3 transition-all relative shrink-0",
                                activeTab === "characters" ? "text-brand-orange" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Personajes
                            {activeTab === "characters" && (
                                <motion.div layoutId="detailActiveLine" className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-orange" />
                            )}
                        </button>
                    )}


                </div>

                <div className="mt-8 min-h-[300px]">
                    <AnimatePresence mode="wait">
                        {activeTab === "episodes" && (
                            <motion.div
                                key="episodes"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="mt-8 flex flex-col lg:flex-row gap-8"
                            >
                                {/* Left Column: Saga Selector */}
                                {sagas.length > 0 && (
                                    <div className="lg:w-80 flex-shrink-0 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-7rem)]">
                                        <SagaSelector 
                                            sagas={sagas}
                                            activeSagaId={activeSagaId}
                                            onSelectSaga={(sagaId) => {
                                                setActiveSagaId(sagaId)
                                                setActiveSubSagaId("")
                                                window.scrollTo({ top: 0, behavior: "smooth" })
                                            }}
                                            activeSubSagaId={activeSubSagaId}
                                            onSelectSubSaga={setActiveSubSagaId}
                                        />
                                    </div>
                                )}

                                {/* Right Column: Characters & Episodes */}
                                <div className="flex-grow flex flex-col min-w-0">
                                    {/* Saga Lore Info Card */}
                                    <SagaLoreHeader saga={sagas.find(s => s.id === activeSagaId)} />

                                    {/* Mapped Characters from active saga */}
                                    <CharacterCarousel 
                                        characters={sagas.find(s => s.id === activeSagaId)?.keyCharacters || []}
                                        onSelect={setSelectedCharacterName}
                                    />
                                    
                                    {/* Mapped Premium Episodes */}
                                    <PremiumEpisodeList 
                                        episodes={computedEpisodes
                                            .filter(ep => sagas.length === 0 ? true : ep.sagaId === activeSagaId)
                                            .map(ep => {
                                                const epNum = ep.absoluteEpisodeNumber || ep.episodeNumber;
                                                const lf = ep.localFile || entry.localFiles?.find(f => {
                                                    const fEp = f.metadata?.episode || f.parsedInfo?.episode;
                                                    const fSeason = f.parsedInfo?.season;
                                                    
                                                    // Prioritize absolute episode number match
                                                    if (ep.absoluteEpisodeNumber && Number(fEp) === ep.absoluteEpisodeNumber) {
                                                        return true;
                                                    }
                                                    // Otherwise, match episode number and season if available
                                                    if (fSeason != null && ep.seasonNumber != null) {
                                                        return Number(fEp) === ep.episodeNumber && Number(fSeason) === ep.seasonNumber;
                                                    }
                                                    // Fallback to simple episode number match
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
                                                    resolution: lf?.technicalInfo?.videoStream?.height ? `${lf.technicalInfo.videoStream.height}p` : "1080p",
                                                    videoCodec: lf?.technicalInfo?.videoStream?.codec || "H264",
                                                    audioCodec: lf?.technicalInfo?.audioStreams?.[0]?.codec || "AAC",
                                                    localFilePath: lf?.path,
                                                    sagaId: ep.sagaId,
                                                    sagaName: sagas.find(s => s.id === ep.sagaId)?.name
                                                }
                                            })}
                                        activeSubSagaStart={activeSubSaga?.startEp}
                                        activeSubSagaEnd={activeSubSaga?.endEp}
                                        onPlay={handlePlayByNumber}
                                        onPreload={(path) => preloadStream({ path, streamType: "direct", audioStreamIndex: 0 })}
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
                                <RelationsTab media={entry.media} />
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
                                <CharactersTab characters={entry.media?.characters?.edges || []} onSelectChar={setSelectedCharacterName} />
                            </motion.div>
                        )}


                    </AnimatePresence>
                </div>
            </div>

            {playTarget && (() => {
                const nextTitle = nextEp ? (nextEp.titleSpanish || nextEp.episodeMetadata?.title || nextEp.episodeTitle || nextEp.displayTitle || `Episodio ${nextEp.absoluteEpisodeNumber || nextEp.episodeNumber}`) : undefined;
                return (
                    <React.Suspense fallback={
                        <div className="fixed inset-0 bg-[#07070a]/90 backdrop-blur-xl flex flex-col justify-center items-center z-50">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-orange mb-4"></div>
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-[0.2em]">Cargando reproductor...</p>
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

// ─── LORE UI COMPONENTS ──────────────────────────────────────────────────────

function SagaLoreHeader({ saga }: { saga: SagaDTO | undefined }) {
    if (!saga) return null

    const hasRichDetails = saga.antagonists?.length > 0 || saga.keyEvents?.length > 0 || saga.newCharacters?.length > 0

    return (
        <div className="p-8 liquid-glass-frosted rounded-2xl mb-8 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                    <span className="text-[9px] font-black text-brand-orange uppercase tracking-[0.25em] bg-brand-orange/10 border border-brand-orange/20 px-2.5 py-0.5 rounded">Detalles del Arco</span>
                    <h2 className="text-3xl font-black text-white tracking-wide uppercase mt-1.5">{saga.name}</h2>
                </div>
                {saga.canonStatus && (
                    <span className={cn(
                        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] shadow-sm",
                        saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    )}>
                        {saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon" ? "Canon" : saga.canonStatus.toLowerCase() === "relleno" ? "Relleno" : saga.canonStatus}
                    </span>
                )}
            </div>

            <p className="text-zinc-300 text-sm md:text-base leading-relaxed border-l-2 border-brand-orange/30 pl-4 py-1">{saga.description}</p>

            {hasRichDetails && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5 mt-2">
                    {saga.antagonists?.length > 0 && (
                        <div className="p-5 liquid-glass-frosted-subtle rounded-xl shadow-inner">
                            <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b border-white/5">
                                <Skull className="w-3.5 h-3.5 text-red-400" /> Antagonistas
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {saga.antagonists.map((ant: string, idx: number) => (
                                    <span key={idx} className="px-2.5 py-1 bg-red-950/20 text-red-300 border border-red-500/10 text-[10px] rounded-lg font-bold">
                                        {ant}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {saga.keyEvents?.length > 0 && (
                        <div className="md:col-span-2 p-5 liquid-glass-frosted-subtle rounded-xl shadow-inner">
                            <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b border-white/5">
                                <Trophy className="w-3.5 h-3.5 text-amber-400" /> Hitos Clave
                            </span>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-400">
                                {saga.keyEvents.map((event: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-orange/60 mt-1.5 shrink-0" />
                                        <span className="text-zinc-300">{event}</span>
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


