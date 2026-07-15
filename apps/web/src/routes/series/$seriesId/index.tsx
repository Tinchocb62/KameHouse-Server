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
import { Vaul, VaulContent } from "@/components/vaul"
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

// Un episodio sin sagaId no coincide con ninguna pestaña y desaparece de la interfaz, así
// que cuando el número cae fuera de todos los rangos (episodios extra, specials mal
// numerados, rangos desactualizados) lo adjuntamos a la saga más cercana en vez de
// dejarlo huérfano.
function resolveSagaId(epNum: number, sagas: SagaDTO[] | undefined): string | undefined {
    if (!sagas || !sagas.length) return undefined;

    const exactMatch = sagas.find(s => epNum >= s.startEp && epNum <= s.endEp);
    if (exactMatch) return exactMatch.id;

    let fallbackSaga: SagaDTO | undefined;
    for (const saga of sagas) {
        if (saga.startEp <= epNum) {
            if (!fallbackSaga || saga.endEp > fallbackSaga.endEp) {
                fallbackSaga = saga;
            }
        }
    }
    // Por debajo del inicio de la primera saga: cae en la primera.
    return (fallbackSaga ?? sagas[0]).id;
}

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
    const [mobileSagasOpen, setMobileSagasOpen] = useState(false)
    const [scrollToEpisode, setScrollToEpisode] = useState<number | undefined>(undefined)

    React.useEffect(() => {
        setScrollToEpisode(undefined)
    }, [activeSagaId, activeSubSagaId])

    const setSearchParams = useCallback((updates: Partial<SagaDetailSearchParams>) => {
        const newSearch = new URLSearchParams(window.location.search)
        for (const [key, value] of Object.entries(updates)) {
            if (value) {
                newSearch.set(key, value)
            } else {
                newSearch.delete(key)
            }
        }
        navigate({ to: "/series/$seriesId", params: { seriesId }, search: Object.fromEntries(newSearch) as SagaDetailSearchParams, resetScroll: false })
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
                    const epNum = ep.absoluteEpisodeNumber || ep.episodeNumber;
                    const sagaId = resolveSagaId(epNum, sagas);
                    return sagaId ? { ...ep, sagaId } : ep;
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
                    const sagaId = resolveSagaId(epNum, sagas);

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

    // Progreso de continuidad para la card "Continuar viendo": porcentaje visto y
    // episodio resuelto a reanudar (mismo criterio que handlePlayDefault).
    const progressPercent = continuityData?.item?.duration
        ? (continuityData.item.currentTime / continuityData.item.duration) * 100
        : 0

    const resumeInfo = useMemo(() => {
        if (!continuityData?.item?.currentTime) return null
        const epNum = continuityData.item.episodeNumber
        const resumeEp = computedEpisodes.find(ep => (ep.absoluteEpisodeNumber || ep.episodeNumber) === epNum)
        const number = resumeEp ? (resumeEp.absoluteEpisodeNumber || resumeEp.episodeNumber) : epNum
        const localizedTitle = getDragonBallSpanishTitle(entry?.media?.tmdbId, number)
        const title = localizedTitle || resumeEp?.titleSpanish || resumeEp?.episodeMetadata?.title || resumeEp?.episodeTitle || resumeEp?.displayTitle || `Episodio ${number}`
        return { number, title }
    }, [continuityData, computedEpisodes, entry?.media?.tmdbId])

    const heroBackdrop = useMemo(
        () => getHighResImage(entry?.media?.bannerImage || entry?.media?.posterImage || ""),
        [entry?.media?.bannerImage, entry?.media?.posterImage]
    )

    const sagaEpisodes = useMemo(() => {
        if (!computedEpisodes || !activeSagaId) return []
        return computedEpisodes.filter(ep => ep.sagaId === activeSagaId)
    }, [computedEpisodes, activeSagaId])

    const sagaProgress = useMemo(() => {
        if (sagaEpisodes.length === 0) return { watched: 0, total: 0, percent: 0 }
        const watched = sagaEpisodes.filter(ep => ep.watched).length
        const total = sagaEpisodes.length
        return {
            watched,
            total,
            percent: Math.round((watched / total) * 100)
        }
    }, [sagaEpisodes])

    const fillerStats = useMemo(() => {
        if (sagaEpisodes.length === 0) return { filler: 0, total: 0, percent: 0 }
        let fillerCount = 0
        sagaEpisodes.forEach(ep => {
            const lf = resolveLocalFileForEpisode(ep, entry?.localFiles)
            const type = lf?.metadata?.episodeType || "Canon"
            if (type === "Filler") {
                fillerCount++
            }
        })
        const total = sagaEpisodes.length
        return {
            filler: fillerCount,
            total,
            percent: Math.round((fillerCount / total) * 100)
        }
    }, [sagaEpisodes, entry?.localFiles])

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
        // Último episodio — o episodio no mapeado en la lista (idx === -1): en ambos
        // casos handleNextEpisode encadena con la siguiente serie del timeline, así
        // que esto debe reflejarlo. Si no coinciden, el marathon nunca avanza (el
        // auto-skip de outro, el salto a 3s del final y el panel "a continuación"
        // están todos condicionados por hasNextEpisode).
        return !!nextSeriesTarget
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

    const contentRef = React.useRef<HTMLDivElement>(null)
    const loreHeaderRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        if (!isLoading && entry && sagas && sagas.length > 0) {
            const timer = setTimeout(() => {
                contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }, 150)
            return () => clearTimeout(timer)
        }
    }, [seriesId, isLoading, entry, sagas])

    // Al cambiar de saga/arco, posicionar la vista en los detalles del arco
    // (SagaLoreHeader). La navegación usa resetScroll:false, así que sin esto el
    // viewport queda donde estaba — típicamente sobre el buscador de episodios.
    // Se ignora la selección inicial (auto-select de la primera saga al entrar):
    // ahí manda el scroll al hero/contentRef.
    const prevSagaKeyRef = React.useRef<string | null>(null)
    React.useEffect(() => {
        const key = activeSagaId ? `${activeSagaId}|${activeSubSagaId || ""}` : null
        const prev = prevSagaKeyRef.current
        prevSagaKeyRef.current = key
        if (!key || prev === null || prev === key) return
        const timer = setTimeout(() => {
            // "instant" a propósito: un smooth scroll largo sobre la lista
            // virtualizada se interrumpe por los re-renders del virtualizer
            // (verificado en runtime) y termina no llegando al destino.
            loreHeaderRef.current?.scrollIntoView({ behavior: "instant", block: "start" })
        }, 100)
        return () => clearTimeout(timer)
    }, [activeSagaId, activeSubSagaId])

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
                hasProgress={!!continuityData?.item?.currentTime}
                resumeEpisodeNumber={resumeInfo?.number}
                resumeEpisodeTitle={resumeInfo?.title}
            />

            {/* Barra de progreso "Continuar viendo" (espeja movies/$movieId.tsx) */}
            {continuityData?.item?.currentTime && continuityData.item.duration ? (
                <div className="w-full max-w-content mx-auto px-8 md:px-16 lg:px-20 xl:px-24 mt-6 relative z-20">
                    <div className="w-full h-[5px] rounded-full overflow-hidden relative z-10" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 20%, transparent)" }}>
                        <div className="h-full bg-brand-secondary" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>
            ) : null}
            <div ref={contentRef} className="w-full max-w-content mx-auto px-8 md:px-16 lg:px-20 xl:px-24 mt-8">
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
                                    <div className="lg:w-80 flex-shrink-0 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-7rem)] h-full flex flex-col gap-4">
                                        <button
                                            onClick={() => setMobileSagasOpen(true)}
                                            className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-xl font-bold text-on-surface uppercase tracking-widest text-sm active:scale-95 transition-all"
                                        >
                                            <span>Sagas y Arcos</span>
                                            <span className="text-lg leading-none">+</span>
                                        </button>

                                        {/* Desktop static layout */}
                                        <div className="hidden lg:block h-full flex flex-col min-h-0">
                                            <SagaSelector
                                                sagas={sagas}
                                                localSagas={entry?.media ? resolveSeriesSagas(entry.media) : []}
                                                activeSagaId={activeSagaId}
                                                onSelectSaga={(sagaId) => {
                                                    setSearchParams({ saga: sagaId, subSaga: "" })
                                                }}
                                                activeSubSagaId={activeSubSagaId}
                                                onSelectSubSaga={(subSagaId) => setSearchParams({ subSaga: subSagaId })}
                                            />
                                        </div>

                                        {/* Mobile Vaul drawer */}
                                        <div className="lg:hidden">
                                            <Vaul open={mobileSagasOpen} onOpenChange={setMobileSagasOpen}>
                                                <VaulContent className="bg-zinc-950/95 backdrop-blur-[var(--blur-overlay-xl)] border-t border-outline-variant/10 p-5 pb-8 flex flex-col focus:outline-none max-h-[85vh]">
                                                    <div className="flex justify-between items-center mb-4 px-1">
                                                        <h3 className="font-bebas text-2xl tracking-widest text-on-surface uppercase">
                                                            Sagas y Arcos
                                                        </h3>
                                                        <button 
                                                            onClick={() => setMobileSagasOpen(false)}
                                                            className="p-1.5 rounded-full text-on-surface-variant hover:text-on-surface active:scale-95"
                                                        >
                                                            <Icons.ui.close className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="overflow-y-auto flex-grow min-h-0 pb-4">
                                                        <SagaSelector
                                                            sagas={sagas}
                                                            localSagas={entry?.media ? resolveSeriesSagas(entry.media) : []}
                                                            activeSagaId={activeSagaId}
                                                            onSelectSaga={(sagaId) => {
                                                                setSearchParams({ saga: sagaId, subSaga: "" })
                                                                const saga = sagas.find(s => s.id === sagaId)
                                                                if (!saga?.subSagas?.length) {
                                                                    setMobileSagasOpen(false)
                                                                }
                                                            }}
                                                            activeSubSagaId={activeSubSagaId}
                                                            onSelectSubSaga={(subSagaId) => {
                                                                setSearchParams({ subSaga: subSagaId })
                                                                setMobileSagasOpen(false)
                                                            }}
                                                        />
                                                    </div>
                                                </VaulContent>
                                            </Vaul>
                                        </div>
                                    </div>
                                )}

                                <div className="flex-grow flex flex-col min-w-0">
                                    <div ref={loreHeaderRef} className="scroll-mt-6" />
                                    <SagaLoreHeader
                                        saga={sagas?.find(s => s.id === activeSagaId)}
                                        subSaga={activeSubSaga}
                                        media={entry?.media}
                                        onSelectCharacter={setSelectedCharacterName}
                                        onSelectEpisode={setScrollToEpisode}
                                        progress={sagaProgress}
                                        fillerStats={fillerStats}
                                    />

                                    <CharacterCarousel 
                                        characters={sagas?.find(s => s.id === activeSagaId)?.keyCharacters || []}
                                        onSelect={setSelectedCharacterName}
                                    />
                                    
                                    <PremiumEpisodeList
                                        activeSagaId={activeSagaId}
                                        scrollToEp={scrollToEpisode}
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
                        <div className="fixed inset-0 bg-black flex flex-col justify-center items-center z-50">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-secondary"></div>
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
    "torneo-otro-mundo": ["Goku", "Pikkon", "Korr"],
    "gran-saiyaman": ["Gohan", "Videl", "Goten", "Trunks", "Goku", "Vegeta"],
    "gran-saiyaman-torneo25": ["Gohan", "Videl", "Goten", "Trunks", "Goku", "Vegeta", "Satan"],
    "babidi": ["Goku", "Vegeta", "Gohan", "Goten", "Trunks", "Babidi", "Dabura", "Shin"],
    "majin-buu": ["Goku", "Vegeta", "Gohan", "Goten", "Trunks", "Majin Buu", "Babidi", "Piccolo", "Satan"],
    "fusion": ["Goku", "Vegeta", "Goten", "Trunks", "Piccolo", "Super Buu", "Gohan", "Vegetto", "Gotenks"],
    "kid-buu": ["Goku", "Vegeta", "Satan", "Majin Buu (Gordo)", "Kid Buu"],

    // DB GT (12697)
    "black-star": ["Goku", "Trunks", "Pan", "Giru"],
    "baby": ["Goku", "Vegeta", "Baby", "Gohan", "Goten", "Trunks", "Pan"],
    "super-17": ["Goku", "Androide 18", "Super 17", "Vegeta", "Gohan", "Trunks"],
    "shadow-dragons": ["Goku", "Pan", "Vegeta", "Syn Shenron", "Nuova Shenron", "Eis Shenron"],

    // DB Super (62715)
    "batalla-dioses": ["Goku", "Beerus", "Whis", "Vegeta", "Bulma"],
    "resurreccion-f": ["Goku", "Vegeta", "Freezer", "Jaco", "Roshi", "Gohan", "Krilin", "Piccolo"],
    "universo-6": ["Goku", "Vegeta", "Hit", "Cabba", "Champa", "Vados", "Beerus", "Whis"],
    "copy-vegeta": ["Goku", "Vegeta", "Goten", "Trunks", "Jaco", "Monaka"],
    "trunks-futuro": ["Goku", "Vegeta", "Trunks", "Goku Black", "Zamasu", "Mai"],
    "exhibicion-zen": ["Goku", "Gohan", "Majin Buu", "Bergamo", "Basil", "Lavender", "Toppo", "Zeno-sama"],
    "reclutamiento-u7": ["Goku", "Gohan", "Piccolo", "Roshi", "Tenshinhan", "Krilin", "Androide 17", "Androide 18", "Freezer"],
    "torneo-poder": ["Goku", "Jiren", "Vegeta", "Freezer", "Androide 17", "Gohan", "Piccolo", "Roshi", "Krilin", "Tenshinhan", "Hit", "Caulifla", "Kale", "Toppo", "Dyspo", "Kefla"]
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
        keyEvents: ["Goku conoce a Bulma (Eps 1-2)", "Encuentro con Oolong y Yamcha (Eps 3-7)", "Invocación de Shenlong (Eps 8-11)", "Goku se transforma en Ozaru (Eps 12-13)"]
    },
    "torneo-21": {
        antagonists: ["Jackie Chun", "Krilin (Rivalidad)"],
        keyEvents: ["Entrenamiento con el Maestro Roshi (Eps 14-20)", "Goku y Krilin clasifican al Torneo (Eps 21-23)", "Final épica: Goku vs Jackie Chun (Eps 24-28)"]
    },
    "red-ribbon": {
        antagonists: ["General Blue", "Tao Pai Pai", "Comandante Red", "General Black"],
        keyEvents: ["Asalto a la Torre de la Fuerza (Eps 34-45)", "Aventura en la Ciudad Pirata (Eps 46-57)", "Tao Pai Pai derrota a Goku (Eps 58-64)", "Entrenamiento en la Torre Karin (Eps 65-68)"]
    },
    "uranai-baba": {
        antagonists: ["La Momia", "El Demonio Akkuman", "Gohan (Abuelo)"],
        keyEvents: ["Combate contra los 5 guerreros de la vidente (Eps 69-76)", "Reencuentro emotivo con el Abuelo Gohan (Eps 77-82)", "Localización de la última Esfera del Dragón (Ep 82)"]
    },
    "torneo-22": {
        antagonists: ["Tenshinhan", "Chaoz", "Maestro Tsuru"],
        keyEvents: ["Aparición de la Escuela Grulla (Eps 83-85)", "Krilin vs Chaoz (Ep 91)", "Gran final: Goku vs Tenshinhan (Eps 92-101)"]
    },
    "piccolo": {
        antagonists: ["Piccolo Daimaku", "Tambourine", "Cymbal", "Drum"],
        keyEvents: ["Muerte de Krilin, Roshi y Chaoz (Eps 102-105)", "Goku bebe el Agua Ultra Sagrada (Eps 106-116)", "Derrota de Piccolo Daimaku con el puño de Ozaru (Eps 117-122)"]
    },
    "piccolo-jr": {
        antagonists: ["Piccolo Jr. (Ma Junior)"],
        keyEvents: ["Entrenamiento con Kami-sama (Eps 123-132)", "Batalla campal y victoria de Goku en el 23° Torneo (Eps 133-152)", "Goku se casa con Chichi (Ep 153)"]
    },

    // DB Z
    "saiyajin": {
        antagonists: ["Vegeta", "Nappa", "Raditz"],
        keyEvents: ["Llegada de Raditz y muerte de Goku (Eps 1-6)", "Entrenamiento con Kaio-sama (Eps 7-20)", "Batalla en el desierto y choque de poderes (Eps 21-35)"]
    },
    "namek-freezer": {
        antagonists: ["Freezer", "Fuerzas Especiales Ginyu", "Zarbon", "Dodoria"],
        keyEvents: ["Búsqueda de las Esferas de Namek (Eps 36-67)", "Llegada de Goku y derrota de las Fuerzas Ginyu (Eps 68-74)", "Muerte de Vegeta y Krilin (Eps 75-95)", "Goku alcanza el Super Saiyajin (Eps 96-107)"]
    },
    "garlic-jr": {
        antagonists: ["Garlic Jr.", "Los Cuatro Reyes de la Niebla"],
        keyEvents: ["Liberación de la Neblina del Mal (Eps 108-111)", "Gohan, Krilin y Piccolo defienden el Templo de Kami (Eps 112-115)", "Destrucción de la Zona Muerta (Eps 116-117)"]
    },
    "androides": {
        antagonists: ["Androide 17", "Androide 18", "Androide 19", "Dr. Gero"],
        keyEvents: ["Advertencia de Trunks del Futuro (Eps 118-125)", "Goku cae enfermo del corazón (Eps 126-128)", "Vegeta se transforma en Super Saiyajin (Eps 129-139)"]
    },
    "cell": {
        antagonists: ["Cell (Célula)"],
        keyEvents: ["Cell absorbe a los Androides y alcanza la forma Perfecta (Eps 140-165)", "Entrenamiento en la Habitación del Tiempo (Eps 166-168)", "Los Juegos de Cell (Eps 169-183)", "Gohan alcanza el Super Saiyajin 2 (Eps 184-187)", "Sacrificio de Goku (Eps 188-190)", "Kamehameha Padre e Hijo (Eps 191-194)"]
    },
    "torneo-otro-mundo": {
        antagonists: ["Pikkon (Rival)"],
        keyEvents: ["Inicio del torneo en el Otro Mundo (Eps 195-197)", "Enfrentamiento final: Goku vs Pikkon (Eps 198-199)"]
    },
    "gran-saiyaman": {
        antagonists: ["Criminales locales"],
        keyEvents: ["Gohan asiste a la preparatoria Orange Star (Eps 200-202)", "Debut del Gran Saiyaman (Eps 203-205)", "Videl descubre el secreto de Gohan (Eps 206-207)"]
    },
    "gran-saiyaman-torneo25": {
        antagonists: ["Spopovich", "Yamu"],
        keyEvents: ["Entrenamiento de Gohan, Goten y Videl (Eps 208-211)", "Inicio del 25° Torneo Mundial (Eps 212-216)", "Ataque a Gohan y robo de energía (Eps 217-219)"]
    },
    "babidi": {
        antagonists: ["Babidi", "Dabura", "Majin Vegeta"],
        keyEvents: ["Torneo de las Artes Marciales 25 (Eps 220-224)", "Vegeta se deja controlar por Babidi (Eps 225-227)", "Batalla Goku vs Majin Vegeta (Eps 228-232)"]
    },
    "majin-buu": {
        antagonists: ["Majin Buu (Gordo)", "Babidi"],
        keyEvents: ["Despertar de Majin Buu (Eps 233-236)", "Sacrificio de Vegeta (Eps 237-240)", "Goku alcanza el Super Saiyajin 3 (Eps 241-253)"]
    },
    "fusion": {
        antagonists: ["Super Buu"],
        keyEvents: ["Fusión Gotenks (Eps 254-262)", "Gohan Definitivo (Eps 263-267)", "Fusión Vegetto (Eps 268-275)"]
    },
    "kid-buu": {
        antagonists: ["Kid Buu"],
        keyEvents: ["Destrucción de la Tierra (Eps 276-277)", "Batalla en el Planeta Supremo (Eps 278-285)", "Genkidama final (Eps 286-291)"]
    },

    // DB GT
    "black-star": {
        antagonists: ["Don Kee", "Giru (Temporal)"],
        keyEvents: ["Deseo accidental de Pilaf y Goku niño (Eps 1-3)", "Viaje espacial en la nave espacial (Eps 4-10)", "Recolección de las esferas oscuras (Eps 11-16)"]
    },
    "baby": {
        antagonists: ["Baby", "Guerreros Z poseídos"],
        keyEvents: ["Invasión de Baby a la Tierra (Eps 17-27)", "Goku alcanza el Super Saiyajin 4 (Eps 28-34)", "Combate final y escape de los terrícolas al planeta Tsufuru (Eps 35-40)"]
    },
    "super-17": {
        antagonists: ["Super Androide 17", "Dr. Myuu", "Dr. Gero"],
        keyEvents: ["Apertura del portal del Infierno (Eps 41-43)", "Goku queda atrapado en el Otro Mundo (Eps 44-45)", "Androide 18 y Goku derrotan a Super 17 (Eps 46-47)"]
    },
    "shadow-dragons": {
        antagonists: ["Omega Shenron (1★)", "Eis Shenron (3★)", "Rage Shenron (5★)"],
        keyEvents: ["Nacimiento de los Dragones Malignos (Eps 48-52)", "Viaje de Goku y Pan (Eps 53-57)", "Fusión en Gogeta Super Saiyajin 4 (Eps 58-61)", "Genkidama Universal y partida de Goku (Eps 62-64)"]
    },

    // DB Super
    "batalla-dioses": {
        antagonists: ["Beerus (Bills)"],
        keyEvents: ["Beerus despierta y busca al Super Saiyajin Dios (Eps 1-5)", "Ritual de las 6 almas Saiyajin (Eps 6-9)", "Goku se transforma en Super Saiyajin Dios (Eps 10-14)"]
    },
    "resurreccion-f": {
        antagonists: ["Freezer (Dorado)", "Sorbet"],
        keyEvents: ["Resurrección de Freezer en la Tierra (Eps 15-18)", "Entrenamiento de Goku y Vegeta con Whis (Eps 19-22)", "Super Saiyajin Blue (Eps 23-27)"]
    },
    "universo-6": {
        antagonists: ["Hit", "Cabba", "Frost"],
        keyEvents: ["Torneo de los destructores (Eps 28-38)", "Goku combines el Super Saiyajin Blue con el Kaio-ken x10 (Eps 39-40)", "Derrota de Hit (Ep 41)"]
    },
    "copy-vegeta": {
        antagonists: ["Vegeta Falso", "Gryll"],
        keyEvents: ["Viaje a Potaufeu (Eps 42-43)", "Vegeta pierde sus poderes (Ep 44)", "Combate de Goku vs Copia de Vegeta (Eps 45-46)"]
    },
    "trunks-futuro": {
        antagonists: ["Goku Black", "Zamasu del Futuro", "Zamasu Fusionado"],
        keyEvents: ["Llegada de Trunks en la máquina del tiempo (Eps 47-52)", "Viajes al futuro en ruinas (Eps 53-64)", "Fusión en Vegito Blue (Eps 65-66)", "Invocación de Zeno-sama (Ep 67)"]
    },
    "exhibicion-zen": {
        antagonists: ["Trio De Dangers (Universo 9)", "Toppo (Universo 11)"],
        keyEvents: ["Anuncio del Torneo del Poder (Eps 68-76)", "Combates de Exhibición (Eps 77-79)", "Pelea amistosa de Goku y Toppo (Eps 80-81)"]
    },
    "reclutamiento-u7": {
        antagonists: ["Asesinos del Universo 9"],
        keyEvents: ["Búsqueda contrarreloj de 10 guerreros (Eps 82-87)", "Reclutamiento de Androide 17 (Eps 88-91)", "Goku recluta a Freezer desde el Infierno (Eps 92-96)"]
    },
    "torneo-poder": {
        antagonists: ["Jiren", "Toppo", "Dyspo", "Kefla", "Anilaza"],
        keyEvents: ["Inicio del Torneo del Poder con 80 guerreros (Eps 97-109)", "Despertar del Ultra Instinto Señal (Eps 110-116)", "Sacrificio de Androide 17 (Eps 117-127)", "Goku alcanza el Ultra Instinto Completo (Eps 128-129)", "Victoria compartida con Freezer y Androide 17 (Eps 130-131)", "Resurrección de todos los Universos (Ep 131)"]
    }
};

interface SagaLoreHeaderProps {
    saga: SagaDTO | undefined
    subSaga?: any
    media: any
    onSelectCharacter?: (name: string) => void
    onSelectEpisode?: (episodeNumber: number) => void
    progress?: { watched: number; total: number; percent: number }
    fillerStats?: { filler: number; total: number; percent: number }
}

function SagaLoreHeader({ 
    saga, 
    subSaga, 
    media, 
    onSelectCharacter, 
    onSelectEpisode,
    progress,
    fillerStats
}: SagaLoreHeaderProps) {
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem("kamehouse-saga-header-expanded")
        return saved === null ? true : saved === "true"
    })

    const handleToggleExpand = useCallback(() => {
        setIsExpanded(prev => {
            const next = !prev
            localStorage.setItem("kamehouse-saga-header-expanded", String(next))
            return next
        })
    }, [])

    if (!saga) return null

    // Get the localized synopsis tags and description
    const localSagas = media ? resolveSeriesSagas(media) : []
    const localSagaDef = localSagas.find(s => s.id === saga.id)
    const localSubSagaDef = localSagaDef?.subSagas?.find(ss => ss.id === subSaga?.id)
    
    const description = localSubSagaDef?.description || subSaga?.description || localSagaDef?.description || saga.description || ""
    const sagaImage = localSubSagaDef?.image || subSaga?.image || localSagaDef?.image
    const displayTitle = localSubSagaDef?.title || subSaga?.title || saga.name

    const synopsisInfo = (sagaSynopsisTags as Record<string, any>)[saga.id]
    const dominantVibe = synopsisInfo?.dominantVibe
    const tags = synopsisInfo?.tags || []
    const suggestedSwimlane = synopsisInfo?.suggestedSwimlane

    const loreDef = SAGA_LORE_MAPPING[saga.id]
    const antagonists = loreDef?.antagonists || []
    const keyEvents = loreDef?.keyEvents || []

    const characters = getSagaCharacters(saga.id, media?.characters?.edges)

    return (
        <div className="glass-card mb-8 overflow-visible relative group/card transition-all duration-300 hover:shadow-glass hover:border-white/15 !bg-black/75 !backdrop-blur-2xl">
            {/* Ambient background glows */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent/5 to-transparent rounded-[16px] pointer-events-none opacity-40 group-hover/card:opacity-75 transition-opacity duration-500" />
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-brand-accent/[0.04] rounded-full blur-3xl pointer-events-none" />

            {/* Header that is always visible and clickable */}
            <div 
                className="p-6 md:p-8 flex items-start justify-between cursor-pointer relative z-10 select-none"
                onClick={handleToggleExpand}
            >
                <div className="flex-1 flex flex-col min-w-0 pr-4">
                    <div className="flex items-center gap-4 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-badge text-brand-accent uppercase bg-brand-accent/10 border border-brand-accent/20 px-3 py-1 rounded-full shadow-sm shadow-brand-accent/5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                            Detalles del Arco
                        </span>
                        
                        {saga.canonStatus && (
                            <span className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-badge uppercase border hidden sm:inline-flex",
                                saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon"
                                    ? "bg-brand-success/15 text-brand-success border-brand-success/25"
                                    : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false"
                                    ? "bg-brand-destructive/15 text-brand-destructive border-brand-destructive/25"
                                    : "bg-brand-secondary/15 text-brand-secondary border-brand-secondary/25"
                            )}>
                                <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon"
                                        ? "bg-brand-success animate-pulse"
                                        : "bg-brand-destructive animate-pulse"
                                )} />
                                {saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon" ? "Canon" : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false" ? "Relleno" : saga.canonStatus}
                            </span>
                        )}
                    </div>
                    
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display bg-clip-text text-transparent bg-gradient-to-r from-on-surface via-on-surface to-on-surface/85 uppercase tracking-tight leading-[1.1] mb-5 line-clamp-2 drop-shadow-md">
                        {displayTitle}
                    </h2>
                    
                    {subSaga && (
                        <span className="inline-flex items-center text-badge text-on-surface-variant uppercase mb-5 block">
                            Parte de {saga.name}
                        </span>
                    )}

                    <div className="flex flex-wrap items-center gap-2.5">
                        {saga.episodeRange && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant bg-surface-container-high/50 border border-white/5 px-3 py-1.5 rounded-lg shadow-sm">
                                <Icons.status.tv size={14} className="text-brand-secondary" />
                                Eps {saga.episodeRange}
                            </span>
                        )}
                        {saga.startEp != null && saga.endEp != null && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant bg-surface-container-high/50 border border-white/5 px-3 py-1.5 rounded-lg shadow-sm">
                                <Icons.time.clock size={14} className="text-brand-success" />
                                {saga.endEp - saga.startEp + 1} Episodios
                            </span>
                        )}
                        {dominantVibe && (
                            <span className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1.5 rounded-lg shadow-sm",
                                dominantVibe === "Aventura" 
                                    ? "bg-brand-magic/15 text-brand-magic border border-brand-magic/25"
                                    : dominantVibe === "Tensión Absoluta" || dominantVibe === "Épico"
                                    ? "bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/25"
                                    : "bg-surface-container-high/50 border border-white/5 text-on-surface-variant"
                            )}>
                                <Icons.status.sparkles size={14} />
                                {dominantVibe}
                            </span>
                        )}
                        {suggestedSwimlane && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary px-3 py-1.5 rounded-lg shadow-sm">
                                <Icons.navigation.library size={14} />
                                <span className="line-clamp-1">{suggestedSwimlane}</span>
                            </span>
                        )}
                    </div>
                    {progress && progress.total > 0 && (
                        <div className="mt-5 w-full max-w-md flex flex-col gap-2 relative z-25" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                <span>Progreso del Arco</span>
                                <span>{progress.watched} / {progress.total} eps ({progress.percent}%)</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                                <div 
                                    className="h-full bg-gradient-to-r from-brand-secondary via-brand-accent to-brand-accent shadow-[0_0_8px_hsl(var(--brand-accent)/0.6)] transition-all duration-500 ease-out" 
                                    style={{ width: `${progress.percent}%` }}
                                />
                            </div>
                            {fillerStats && fillerStats.filler > 0 && (
                                <div className="text-[10px] font-bold text-brand-destructive/80 uppercase tracking-widest mt-0.5">
                                    Contiene {fillerStats.filler} episodios de relleno ({fillerStats.percent}%)
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Right side area: Collapsed character avatars & Chevron button */}
                <div className="flex items-center gap-5 shrink-0 self-end sm:self-center relative z-20">
                    {!isExpanded && characters.length > 0 && (
                        <div className="flex items-center gap-2 pr-2 border-r border-white/5 h-10 hidden sm:flex">
                            <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest mr-1 font-bold hidden md:inline-block">
                                Reparto:
                            </span>
                            <div className="flex -space-x-2.5 overflow-hidden">
                                {characters.slice(0, 5).map((char, idx) => (
                                    <div 
                                        key={idx}
                                        className="inline-block h-8 w-8 rounded-xl border border-white/10 ring-2 ring-ui-surface overflow-hidden relative group/avatar cursor-pointer shadow-md hover:z-20 transition-all hover:scale-105 active:scale-95"
                                        title={char.name}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectCharacter?.(char.name);
                                        }}
                                    >
                                        <img 
                                            className="h-full w-full object-cover group-hover/avatar:scale-110 transition-transform duration-300"
                                            src={char.avatarUrl} 
                                            alt={char.name} 
                                        />
                                        <div className="absolute inset-0 bg-brand-accent/20 opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                                {characters.length > 5 && (
                                    <div className="flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 ring-2 ring-ui-surface bg-surface-container-high text-[9px] font-black text-on-surface-variant font-mono shadow-md">
                                        +{characters.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Chevron icon & Mobile Canon */}
                    <div className="flex flex-col items-end justify-center min-h-[3rem]">
                        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-surface-container/60 hover:bg-surface-container transition-all duration-300 border border-white/10 hover:border-brand-accent/40 shrink-0 shadow-lg group-hover:scale-105 active:scale-95 hover:shadow-[0_0_12px_hsl(var(--brand-accent)/0.25)]">
                            <Icons.navigation.chevronDown 
                                size={22} 
                                className={cn("transition-transform duration-500 text-on-surface", isExpanded && "rotate-180")} 
                            />
                        </div>
                        {/* Move canon pill here on mobile */}
                        {saga.canonStatus && (
                            <span className={cn(
                                "inline-flex sm:hidden mt-2 items-center gap-1 px-2.5 py-1 rounded text-badge uppercase border",
                                saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon"
                                    ? "bg-brand-success/15 text-brand-success border-brand-success/25"
                                    : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false"
                                    ? "bg-brand-destructive/15 text-brand-destructive border-brand-destructive/25"
                                    : "bg-brand-secondary/15 text-brand-secondary border-brand-secondary/25"
                            )}>
                                <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon"
                                        ? "bg-brand-success animate-pulse"
                                        : "bg-brand-destructive animate-pulse"
                                )} />
                                {saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon" ? "Canon" : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false" ? "Relleno" : saga.canonStatus}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="p-6 md:p-8 pt-0 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Text details */}
                                <div className={cn(
                                    "flex flex-col justify-start",
                                    sagaImage ? "lg:col-span-8 xl:col-span-9 col-span-12" : "col-span-12"
                                )}>
                                    {description && (
                                        <div className="space-y-5">
                                            <div className="relative pl-6 py-1">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-accent/60 via-brand-accent/20 to-transparent rounded-full shadow-[0_0_8px_hsl(var(--brand-accent)/0.3)]" />
                                                <p className="text-base md:text-lg text-on-surface/90 leading-relaxed font-medium">
                                                    {description}
                                                </p>
                                            </div>
                                            {tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2.5 pt-2 pl-6">
                                                    {tags.map((tag: string, idx: number) => (
                                                        <span 
                                                            key={idx} 
                                                            className="inline-flex items-center text-xs text-brand-accent/90 bg-brand-accent/10 border border-brand-accent/20 px-3 py-1.5 rounded-lg select-none uppercase tracking-widest font-bold shadow-sm hover:bg-brand-accent/15 hover:border-brand-accent/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-default"
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Poster image card */}
                                {sagaImage && (
                                    <div className="lg:col-span-4 xl:col-span-3 col-span-12 flex items-start justify-center lg:justify-end">
                                        <SagaPosterCard src={sagaImage} alt={saga.name} />
                                    </div>
                                )}
                            </div>

            {/* Antagonists and Key Events row */}
            {(antagonists.length > 0 || keyEvents.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10 mt-6 relative z-10">
                    {antagonists.length > 0 && (
                        <div className="relative overflow-hidden bg-gradient-to-br from-brand-destructive/[0.02] to-transparent bg-black/45 border border-white/10 p-5 md:p-6 rounded-2xl flex flex-col shadow-md hover:border-brand-destructive/20 hover:bg-black/55 transition-all duration-300 backdrop-blur-md">
                            {/* Decorative aura glow */}
                            <div className="absolute -top-12 -left-12 w-24 h-24 bg-brand-destructive/5 rounded-full blur-2xl pointer-events-none" />
                            
                            <h3 className="flex items-center gap-2.5 text-sm text-brand-destructive uppercase mb-5 pb-3 border-b border-white/5 font-black tracking-widest relative z-10">
                                <Icons.status.skull size={18} className="drop-shadow-[0_0_6px_rgba(239,68,68,0.5)] animate-pulse" />
                                Antagonistas Principales
                            </h3>
                            <div className="flex flex-wrap gap-2.5 relative z-10">
                                {antagonists.map((ant: string, idx: number) => {
                                    const matchedChar = characters.find(c => c.name.toLowerCase().includes(ant.toLowerCase()))
                                    return (
                                        <span 
                                            key={idx} 
                                            onClick={() => matchedChar && onSelectCharacter?.(matchedChar.name)}
                                            className={cn(
                                                "inline-flex items-center gap-2 px-3 py-1.5 bg-brand-destructive/[0.08] hover:bg-brand-destructive/[0.14] border border-brand-destructive/20 hover:border-brand-destructive/40 text-brand-destructive text-xs uppercase rounded-xl font-bold shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_4px_12px_rgba(239,68,68,0.12)] select-none",
                                                matchedChar && "cursor-pointer"
                                            )}
                                        >
                                            {matchedChar?.avatarUrl ? (
                                                <img 
                                                    src={matchedChar.avatarUrl} 
                                                    alt={ant} 
                                                    className="w-5 h-5 rounded-full object-cover border border-brand-destructive/30" 
                                                />
                                            ) : (
                                                <Icons.status.skull size={12} className="shrink-0 text-brand-destructive/70" />
                                            )}
                                            {ant}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {keyEvents.length > 0 && (
                        <div className="relative overflow-hidden bg-gradient-to-br from-brand-success/[0.02] to-transparent bg-black/45 border border-white/10 p-5 md:p-6 rounded-2xl flex flex-col shadow-md hover:border-brand-success/20 hover:bg-black/55 transition-all duration-300 backdrop-blur-md">
                            {/* Decorative timeline aura glow */}
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand-success/5 rounded-full blur-2xl pointer-events-none" />

                            <h3 className="flex items-center gap-2.5 text-sm text-brand-success uppercase mb-5 pb-3 border-b border-white/5 font-black tracking-widest relative z-10">
                                <Icons.status.trophy size={18} className="drop-shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
                                Hitos y Momentos Clave
                            </h3>
                            
                            <div className="relative pl-6 space-y-5 relative z-10">
                                {/* Vertical connection axis line */}
                                <div className="absolute left-[5px] top-2.5 bottom-2.5 w-[2px] bg-gradient-to-b from-brand-success/40 via-brand-success/15 to-transparent" />
                                
                                {keyEvents.map((event: string, idx: number) => {
                                    // Extract episode numbers like (Ep 12) or (Eps 12-15)
                                    const epMatch = event.match(/\(Eps?\s*(\d+)/i)
                                    const epRangeMatch = event.match(/\(Eps?\s*([0-9\-]+)\)/i)
                                    const targetEp = epMatch ? parseInt(epMatch[1], 10) : null
                                    const epLabel = epRangeMatch ? epRangeMatch[1] : null
                                    
                                    // Remove the (Eps ...) part from description
                                    const cleanEventText = event.replace(/\s*\(Eps?\s*\d+.*?\)/i, '')

                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => targetEp && onSelectEpisode?.(targetEp)}
                                            className={cn(
                                                "relative pl-6 group/event",
                                                targetEp && "cursor-pointer"
                                            )}
                                        >
                                            {/* Interactive node dot */}
                                            <div className={cn(
                                                "absolute left-[-26px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-brand-success/60 bg-ui-surface transition-all duration-300 flex items-center justify-center",
                                                targetEp && "group-hover/event:border-brand-success group-hover/event:bg-brand-success/20 group-hover/event:scale-125"
                                            )}>
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full bg-brand-success transition-transform duration-300",
                                                    targetEp ? "scale-0 group-hover/event:scale-100" : "scale-100"
                                                )} />
                                            </div>
                                            <span className={cn(
                                                "text-sm text-on-surface-variant/90 font-medium transition-colors duration-250 block leading-relaxed",
                                                targetEp && "group-hover/event:text-on-surface"
                                            )}>
                                                {cleanEventText}
                                                {epLabel && (
                                                    <span className="ml-2 text-[10px] bg-brand-success/15 border border-brand-success/35 text-brand-success font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                        Ep {epLabel}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Key Characters */}
            {characters.length > 0 && (
                <div className="pt-6 border-t border-white/10 space-y-5 mt-6 relative z-10">
                    <h3 className="flex items-center gap-2.5 text-sm text-brand-accent uppercase font-black tracking-widest mb-4">
                        <Icons.navigation.users size={18} className="drop-shadow-[0_0_4px_hsl(var(--brand-accent)/0.4)]" />
                        Personajes Clave del Arco
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-5">
                        {characters.map((char, idx) => (
                            <div
                                key={idx}
                                onClick={() => onSelectCharacter?.(char.name)}
                                className="flex flex-col items-center text-center gap-2.5 group cursor-pointer"
                                role="button"
                                tabIndex={0}
                                title={`Ver detalles de ${char.name}`}
                            >
                                <div className="w-24 h-24 sm:w-26 sm:h-26 rounded-2xl overflow-hidden border border-white/10 group-hover:border-brand-accent/40 group-hover:shadow-[0_4px_16px_hsl(var(--brand-accent)/0.25)] transition-all duration-300 relative shadow-md group-hover:-translate-y-1 bg-surface-container-low">
                                    <img
                                        src={char.avatarUrl}
                                        alt={char.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-smooth-out"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
                                        <Icons.ui.info size={14} className="text-white drop-shadow-md" />
                                    </div>
                                </div>
                                <div className="flex flex-col w-full px-1">
                                    <span className="text-xs font-bold text-on-surface group-hover:text-brand-accent uppercase tracking-wide transition-colors duration-200 line-clamp-1">
                                        {char.name}
                                    </span>
                                    <span className={cn(
                                        "inline-flex items-center justify-center px-2 py-0.5 rounded-[6px] text-[9px] uppercase font-black tracking-widest mt-1 select-none w-max mx-auto border transition-all duration-200",
                                        char.roleTag === "Antagonista" 
                                            ? "bg-brand-destructive/10 text-brand-destructive border-brand-destructive/20 group-hover:bg-brand-destructive/15" 
                                            : char.roleTag === "Protagonista"
                                            ? "bg-brand-success/10 text-brand-success border-brand-success/20 group-hover:bg-brand-success/15"
                                            : "bg-surface-container-high text-on-surface-variant/70 border-white/5"
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function SagaPosterCard({ src, alt }: { src: string; alt: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div className="w-full max-w-[320px]">
                <div 
                    onClick={() => setIsOpen(true)}
                    className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-elevated group cursor-pointer select-none bg-black transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.5)] hover:border-brand-accent/50"
                >
                    <img 
                        src={src} 
                        alt={alt}
                        className="relative z-10 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-smooth-out"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none opacity-60" />
                    
                    {/* Hover Badge */}
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-label-sm uppercase bg-brand-accent text-on-brand-accent font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                            <Icons.ui.info size={12} />
                            Ampliar
                        </span>
                    </div>
                </div>
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 cursor-zoom-out"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative max-w-[95vw] max-h-[85vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-surface-container flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Blurred Background */}
                            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                                <img 
                                    src={src} 
                                    alt=""
                                    className="w-full h-full object-cover blur-2xl scale-110 opacity-50"
                                />
                                <div className="absolute inset-0 bg-black/50" />
                            </div>

                            <img 
                                src={src} 
                                alt={alt} 
                                className="relative z-10 max-w-full max-h-[85vh] object-contain rounded-[inherit]"
                            />
                            
                            {/* Close Button */}
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
                                aria-label="Cerrar"
                            >
                                <Icons.ui.close size={20} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}