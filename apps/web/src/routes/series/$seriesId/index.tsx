import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router"
import { HydrationBoundary, dehydrate, useQueryClient } from "@tanstack/react-query"
import React, { useMemo, useState, useCallback } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useSound } from "@/hooks/use-sound"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"

import { cn } from "@/components/ui/core/styling"
import { getHighResImage } from "@/lib/helpers/images"
import { fetchAnimeEntry, useGetAnimeEntry } from "@/api/hooks/anime_entries.hooks"
import { useCastPlay } from "@/api/hooks/cast.hooks"
import { useGetContinuityWatchHistoryItem } from "@/api/hooks/continuity.hooks"
import { useServerQuery } from "@/api/client/requests"
import { usePreloadMediastreamMediaContainer } from "@/api/hooks/mediastream.hooks"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { Anime_Episode, Anime_LocalFile, Mediastream_StreamType } from "@/api/generated/types"
import { EmptyState } from "@/components/shared/empty-state"

const VideoPlayer = React.lazy(() => import("@/components/video/player").then(m => ({ default: m.VideoPlayer })))
import { RelationsTab, CharactersTab } from "./-series-bento-tabs"
import { getDragonBallSpanishTitle, isDragonBallTmdbId, getSeriesEraTheme, resolveSeriesSagas } from "@/lib/config/dragonball.config"
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
import { CharacterDetailModal, type DragonBallLoreData } from "@/components/shared/character-detail-modal"
import { Vaul, VaulContent } from "@/components/vaul"
import { Icons } from "@/components/ui/icons"

import { SagaLoreHeader } from "./-components/saga-lore-header";
import { PlayerFallback } from "@/components/video/player-fallback";
import { WatchProgressBar } from "@/components/ui/watch-progress-bar";
import { Popover } from "@/components/ui/popover";

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
    // "stacked" pone el selector de sagas encima de la lista en vez de al costado.
    const isStackedLayout = ts.themeAnimeEntryScreenLayout === "stacked"

    const { mutate: preloadStream } = usePreloadMediastreamMediaContainer()
    // Paths already warmed this session (server preload is idempotent, but this
    // avoids spamming the mutation on every hover/re-render).
    const preloadedPathsRef = React.useRef<Set<string>>(new Set())
    const preloadPath = useCallback((path: string | undefined | null) => {
        if (!path || preloadedPathsRef.current.has(path)) return
        preloadedPathsRef.current.add(path)
        preloadStream({ path, streamType: "direct", audioStreamIndex: 0, preferredAudioLang: "" })
    }, [preloadStream])

    const { data: lore } = useServerQuery<DragonBallLoreData>({
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

    const { mutate: castPlay } = useCastPlay()

    const handleCastByNumber = useCallback((episodeNumber: number) => {
        // Usamos el id de la ruta (mismo con el que se consultó anime-entry):
        // es el espacio de ids que la TV también usa contra ese endpoint.
        const mediaId = Number(seriesId)
        if (!mediaId) return
        castPlay({
            mediaId,
            episodeNumber,
            title: entry?.media?.titleSpanish || entry?.media?.titleEnglish || entry?.media?.titleRomaji || "",
            episodeLabel: `Episodio ${episodeNumber}`,
        }, {
            onSuccess: () => {
                toast.success(`Episodio ${episodeNumber} enviado a la TV`)
            },
        })
    }, [seriesId, entry?.media, castPlay])

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
    const pageRef = React.useRef<HTMLDivElement>(null)

    // Entrance canónico de bloques de página (espejo de .movie-animate en movies).
    // Solo targets FUERA de AnimatePresence: barra de progreso y fila de tabs.
    useGSAP(() => {
        gsap.from(".series-animate", {
            y: 35,
            opacity: 0,
            duration: 1.2,
            stagger: 0.08,
            ease: "power4.out",
            delay: 0.15,
        })
    }, { scope: pageRef, dependencies: [seriesId] })

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
            ref={pageRef}
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
                <div className="series-animate w-full max-w-content mx-auto px-4 sm:px-8 md:px-16 lg:px-20 xl:px-24 mt-6 relative z-20">
                    <WatchProgressBar percent={progressPercent} size="hero" animateOnMount />
                </div>
            ) : null}
            <div ref={contentRef} className="w-full max-w-content mx-auto px-4 sm:px-8 md:px-16 lg:px-20 xl:px-24 mt-8">
                <div className="series-animate flex border-b border-outline-variant/30 pb-2 mb-6 gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar">
                    <SectionTab
                        active={activeTab === "episodes"}
                        onClick={() => setSearchParams({ tab: "episodes" })}
                        icon={<Icons.media.play size={14} strokeWidth={2.5} />}
                        label="Episodios"
                    />
                    {hasRelations && (
                        <Popover 
                            trigger={
                                <SectionTab
                                    active={false}
                                    icon={<Icons.navigation.layers size={14} strokeWidth={2.5} />}
                                    label="Relacionados"
                                />
                            }
                            className="w-[320px] max-w-[90vw] p-4 bg-ui-surface/95 backdrop-blur-overlay-md border-outline-variant shadow-elevated rounded-modal"
                            sideOffset={12}
                        >
                            <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                                <RelationsTab media={entry.media} />
                            </div>
                        </Popover>
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
                                className={cn(
                                    "mt-8 flex gap-10",
                                    // Settings → Apariencia → Layout de Página de Anime.
                                    // Lado a lado solo desde xl (1280px): en mobile y tablet
                                    // el selector de Sagas se apila verticalmente sobre los
                                    // episodios (drawer), no al costado.
                                    isStackedLayout ? "flex-col" : "flex-col xl:flex-row"
                                )}
                            >
                                {sagas && sagas.length > 0 && (
                                    <div className={cn(
                                        "flex-shrink-0 h-full flex flex-col gap-4",
                                        !isStackedLayout && "xl:w-80 xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-7rem)]"
                                    )}>
                                        <button
                                            onClick={() => setMobileSagasOpen(true)}
                                            className="xl:hidden w-full flex items-center justify-between px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-xl font-bold text-on-surface uppercase tracking-widest text-sm active:scale-95 transition-all"
                                        >
                                            <span>Sagas y Arcos</span>
                                            <span className="text-lg leading-none">+</span>
                                        </button>

                                        {/* Desktop static layout */}
                                        <div className="hidden xl:block h-full flex flex-col min-h-0">
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
                                        <div className="xl:hidden">
                                            <Vaul open={mobileSagasOpen} onOpenChange={setMobileSagasOpen}>
                                                <VaulContent className="bg-zinc-950/95 backdrop-blur-[var(--blur-overlay-xl)] border-t border-outline-variant/10 p-5 pb-8 flex flex-col focus:outline-none max-h-[85vh]">
                                                    <div className="flex justify-between items-center mb-4 px-1">
                                                        <h3 className="font-display text-2xl tracking-widest text-on-surface uppercase">
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
                                        onCast={handleCastByNumber}
                                        onPreload={(path) => preloadStream({ path, streamType: "direct", audioStreamIndex: 0, preferredAudioLang: "" })}
                                    />
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
                    <React.Suspense fallback={<PlayerFallback />}>
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

const SectionTab = React.forwardRef<HTMLButtonElement, {
    active: boolean
    onClick?: () => void
    icon: React.ReactNode
    label: string
}>(({ active, onClick, icon, label, ...props }, ref) => {
    return (
        <button
            ref={ref}
            onClick={onClick}
            aria-current={active ? "true" : undefined}
            className={cn(
                "inline-flex items-center gap-2 shrink-0 text-sm font-semibold px-4 py-2 min-h-[44px] md:min-h-0 rounded-pill",
                "transition-all duration-base ease-smooth-out active:scale-95",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent/70",
                active
                    ? "glass-liquid glass-active text-on-surface"
                    : "bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            )}
            {...props}
        >
            {icon}
            {label}
        </button>
    )
})
SectionTab.displayName = "SectionTab"
