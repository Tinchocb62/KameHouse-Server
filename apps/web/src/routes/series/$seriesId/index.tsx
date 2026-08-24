import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"
import React, { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useSound } from "@/hooks/use-sound"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"

import { cn } from "@/components/ui/core/styling"
import { fetchAnimeEntry, useGetAnimeEntry, useUpdateAnimeEntryProgress } from "@/api/hooks/anime_entries.hooks"
import { useGetContinuityWatchHistoryItem } from "@/api/hooks/continuity.hooks"
import { useServerQuery } from "@/api/client/requests"
import { usePreloadMediastreamMediaContainer } from "@/api/hooks/mediastream.hooks"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { EXTRA_ENDPOINTS } from "@/api/client/endpoints.extra"
import { EmptyState } from "@/components/shared/empty-state"
import { useAppStore } from "@/lib/store"

const VideoPlayer = React.lazy(() =>
    import("@/components/video/player").then(m => ({ default: m.VideoPlayer }))
)
import { RelationsTab, CharactersTab } from "./-series-bento-tabs"
import { isDragonBallTmdbId, getSeriesEraTheme, resolveSeriesSagas } from "@/lib/config/dragonball.config"
import { useGetLibraryCollection } from "@/api/hooks/anime_collection.hooks"
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

import { SagaLoreHeader } from "./-components/saga-lore-header"
import { PlayerFallback } from "@/components/video/player-fallback"
import { WatchProgressBar } from "@/components/ui/watch-progress-bar"
import { Popover } from "@/components/ui/popover"

// ── Custom hooks ──────────────────────────────────────────────────────────────
import { useSeriesData } from "./-hooks/use-series-data"
import { useSeriesPlayback } from "./-hooks/use-series-playback"

export const Route = createFileRoute("/series/$seriesId/")(
    {
        validateSearch: (search: Record<string, unknown>): SagaDetailSearchParams => ({
            tab: (search.tab as SagaDetailSearchParams["tab"]) || "episodes",
            saga: (search.saga as string) ?? "",
            subSaga: (search.subSaga as string) ?? "",
            autoplay: (search.autoplay as string) || undefined,
        }),
        loader: async ({ params: { seriesId }, context }) => {
            const qc = context.queryClient
            await qc.prefetchQuery({
                queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key, seriesId],
                queryFn: () => fetchAnimeEntry(seriesId),
                staleTime: 60000,
            })
            return { dehydrateState: dehydrate(qc) }
        },
        component: SeriesDetailPage,
    }
)

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
    const navigate = useNavigate()
    const {
        tab: activeTab,
        saga: activeSagaId,
        subSaga: activeSubSagaId,
        autoplay: autoplayEp,
    } = Route.useSearch()
    const { data: entry, isLoading } = useGetAnimeEntry(seriesId)
    const { data: libraryCollection } = useGetLibraryCollection()
    const { data: continuityData, refetch: refetchContinuity } =
        useGetContinuityWatchHistoryItem(Number(seriesId))
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl)
    const ts = useThemeSettings()
    // El selector de sagas se ubica al costado en pantallas de escritorio (side-by-side layout)
    const isStackedLayout = false

    const { data: lore } = useServerQuery<DragonBallLoreData>({
        endpoint: EXTRA_ENDPOINTS.DRAGONBALL.Lore.endpoint,
        method: "GET",
        queryKey: [EXTRA_ENDPOINTS.DRAGONBALL.Lore.key],
        staleTime: 300000,
        enabled: isDragonBallTmdbId(entry?.media?.tmdbId),
        muteError: true,
    })

    const [selectedCharacterName, setSelectedCharacterName] = useState<string | null>(null)
    const [mobileSagasOpen, setMobileSagasOpen] = useState(false)
    const [scrollToEpisode, setScrollToEpisode] = useState<number | undefined>(undefined)
    
    const setActiveSeriesContext = useAppStore(s => s.setActiveSeriesContext)
    React.useEffect(() => {
        const contextKey = entry?.media?.tmdbId || seriesId
        setActiveSeriesContext(String(contextKey))
        return () => {
            setActiveSeriesContext(null)
        }
    }, [seriesId, entry?.media?.tmdbId, setActiveSeriesContext])

    // Reset scroll target when saga/subsaga changes
    const [prevSagaParams, setPrevSagaParams] = useState({ saga: activeSagaId, subSaga: activeSubSagaId })
    if (activeSagaId !== prevSagaParams.saga || activeSubSagaId !== prevSagaParams.subSaga) {
        setPrevSagaParams({ saga: activeSagaId, subSaga: activeSubSagaId })
        setScrollToEpisode(undefined)
    }

    const { mutate: updateProgress } = useUpdateAnimeEntryProgress(seriesId, 0, false)

    const handleUpdateProgress = useCallback((mediaId: number, progress: number) => {
        updateProgress({ mediaId, progress })
    }, [updateProgress])

    const setSearchParams = useCallback(
        (updates: Partial<SagaDetailSearchParams>) => {
            const newSearch = new URLSearchParams(window.location.search)
            for (const [key, value] of Object.entries(updates)) {
                if (value) {
                    newSearch.set(key, value)
                } else {
                    newSearch.delete(key)
                }
            }
            navigate({
                to: "/series/$seriesId",
                params: { seriesId },
                search: Object.fromEntries(newSearch) as SagaDetailSearchParams,
                resetScroll: false,
            })
        },
        [navigate, seriesId]
    )

    React.useEffect(() => {
        if (entry?.media?.id) {
            playSound("detail", 0.4)
        }
    }, [entry?.media?.id, playSound])

    const { data: sagas } = useServerQuery<SagaDTO[]>({
        endpoint: `/api/v1/library/anime-entry/${seriesId}/sagas`,
        method: "GET",
        queryKey: [`series-sagas-${seriesId}`],
        staleTime: 600000,
    })

    React.useEffect(() => {
        if (sagas && sagas.length > 0 && !activeSagaId) {
            setSearchParams({ saga: sagas[0].id })
        }
    }, [sagas, activeSagaId, setSearchParams])

    // ── Data derivation ───────────────────────────────────────────────────────
    const {
        computedEpisodes,
        activeSubSaga,
        nextSeriesTarget,
        heroBackdrop,
        resumeInfo,
        sagaProgress,
        fillerStats,
        episodeViewModels,
    } = useSeriesData({
        entry,
        sagas,
        activeSagaId,
        activeSubSagaId,
        continuityData,
        libraryCollection,
    })

    // ── Playback logic ────────────────────────────────────────────────────────
    const {
        playTarget,
        preloadPath,
        defaultTargetPath,
        nextEp,
        nextLocalFile,
        hasNextEpisode,
        handlePlayDefault,
        handlePlayByNumber,
        handleCastByNumber,
        handleNextEpisode,
        handlePlayerClose,
    } = useSeriesPlayback({
        entry,
        computedEpisodes,
        seriesId,
        navigate,
        nextSeriesTarget,
        continuityData,
        refetchContinuity,
        autoplayEp,
        setSearchParams,
    })

    // Stable onPreload for PremiumEpisodeList (was an inline arrow before)
    const { mutate: preloadStream } = usePreloadMediastreamMediaContainer()
    const handleEpisodePreload = useCallback(
        (path: string) => preloadStream({ path, streamType: "direct", audioStreamIndex: 0, preferredAudioLang: "" }),
        [preloadStream]
    )

    const activeSaga = React.useMemo(() => {
        return sagas?.find(s => s.id === activeSagaId)
    }, [sagas, activeSagaId])

    const handlePlayHover = React.useCallback(() => {
        preloadPath(defaultTargetPath)
    }, [preloadPath, defaultTargetPath])

    // ── Backdrop sync ─────────────────────────────────────────────────────────
    React.useEffect(() => {
        if (heroBackdrop) {
            setBackdropUrl(heroBackdrop)
        }
    }, [heroBackdrop, setBackdropUrl])

    // ── Continuity progress ───────────────────────────────────────────────────
    const progressPercent = continuityData?.item?.duration
        ? (continuityData.item.currentTime / continuityData.item.duration) * 100
        : 0

    // ── DOM refs & scroll ─────────────────────────────────────────────────────
    const contentRef = React.useRef<HTMLDivElement>(null)
    const loreHeaderRef = React.useRef<HTMLDivElement>(null)
    const pageRef = React.useRef<HTMLDivElement>(null)

    // Entrance canónico de bloques de página (espejo de .movie-animate en movies).
    // Solo targets FUERA de AnimatePresence: barra de progreso y fila de tabs.
    useGSAP(
        () => {
            gsap.from(".series-animate", {
                y: 20,
                opacity: 0,
                duration: 0.4,
                stagger: 0.04,
                ease: "power2.out",
                delay: 0.05,
            })
        },
        { scope: pageRef, dependencies: [seriesId] }
    )

    // Scroll inicial controlado al top del contenedor en lugar de salto brusco
    React.useEffect(() => {
        if (pageRef.current) {
            pageRef.current.scrollTop = 0
        }
    }, [seriesId])

    // Al cambiar de saga/arco, posicionar la vista en el SagaLoreHeader.
    // La navegación usa resetScroll:false, así que sin esto el viewport queda
    // donde estaba — típicamente sobre el buscador de episodios.
    // Se ignora la selección inicial (auto-select de la primera saga al entrar):
    // ahí manda el scroll al hero/contentRef.
    // NOTA: este efecto sólo reacciona a cambios de SAGA (arco), NO de subsaga.
    // El scroll al primer episodio de la subsaga lo maneja premium-episode-list
    // vía virtualizer.scrollToIndex — sin competencia con este setTimeout.
    const prevSagaIdRef = React.useRef<string | null>(null)
    React.useEffect(() => {
        const prev = prevSagaIdRef.current
        prevSagaIdRef.current = activeSagaId ?? null
        if (!activeSagaId || prev === null || prev === activeSagaId) return
        const timer = setTimeout(() => {
            // "instant" a propósito: un smooth scroll largo sobre la lista
            // virtualizada se interrumpe por los re-renders del virtualizer
            // (verificado en runtime) y termina no llegando al destino.
            loreHeaderRef.current?.scrollIntoView({ behavior: "instant", block: "start" })
        }, 100)
        return () => clearTimeout(timer)
    }, [activeSagaId])

    // ── Early returns ─────────────────────────────────────────────────────────
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

    const title =
        entry.media.titleSpanish ||
        entry.media.titleRomaji ||
        entry.media.titleEnglish ||
        "Título Desconocido"
    const hasRelations = entry.media?.relations && entry.media.relations.length > 0
    const hasCharacters =
        entry.media?.characters?.edges && entry.media.characters.edges.length > 0
    const eraTheme = getSeriesEraTheme(entry.media?.tmdbId)
    const localTheme = !ts.themeEra ? eraTheme : undefined

    // ── Render ────────────────────────────────────────────────────────────────
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
                onPlayHover={handlePlayHover}
                hasProgress={!!continuityData?.item?.currentTime}
                resumeEpisodeNumber={resumeInfo?.number}
                resumeEpisodeTitle={resumeInfo?.title}
                sagaPanel={sagas && sagas.length > 0 ? (
                    <SagaSelector
                        sagas={sagas}
                        localSagas={entry?.media ? resolveSeriesSagas(entry.media) : []}
                        activeSagaId={activeSagaId}
                        onSelectSaga={sagaId => {
                            setSearchParams({ saga: sagaId, subSaga: "" })
                        }}
                        activeSubSagaId={activeSubSagaId}
                        onSelectSubSaga={subSagaId =>
                            setSearchParams({ subSaga: subSagaId })
                        }
                    />
                ) : undefined}
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
                    <SectionTab
                        active={activeTab === "details"}
                        onClick={() => setSearchParams({ tab: "details" })}
                        icon={<Icons.ui.info size={14} strokeWidth={2.5} />}
                        label="Detalles"
                    />
                </div>

                <div className="mt-4 min-h-[300px]">
                    <AnimatePresence mode="wait" initial={false}>
                        {activeTab === "episodes" && (
                            <motion.div
                                key="episodes"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className={cn(
                                    "mt-8 flex gap-10",
                                    // Settings → Apariencia → Layout de Página de Anime.
                                    // Lado a lado solo desde lg (1024px): en mobile y tablet
                                    // el selector de Sagas se apila verticalmente sobre los
                                    // episodios (drawer), no al costado.
                                    isStackedLayout ? "flex-col" : "flex-col lg:flex-row"
                                )}
                            >
                                {sagas && sagas.length > 0 && (
                                    <div
                                        className={cn(
                                            "flex-shrink-0 flex flex-col gap-4 lg:hidden",
                                        )}
                                    >
                                        <button
                                            onClick={() => setMobileSagasOpen(true)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-xl font-bold text-on-surface uppercase tracking-widest text-sm active:scale-95 transition-all"
                                        >
                                            <span>Sagas y Arcos</span>
                                            <span className="text-lg leading-none">+</span>
                                        </button>

                                        {/* Mobile Vaul drawer */}
                                        <div>
                                            <Vaul
                                                open={mobileSagasOpen}
                                                onOpenChange={setMobileSagasOpen}
                                            >
                                                <VaulContent className="bg-zinc-950/95 backdrop-blur-[var(--blur-overlay-xl)] border-t border-outline-variant/10 p-5 pb-8 flex flex-col focus:outline-none max-h-[85vh]">
                                                    <div className="flex justify-between items-center mb-4 px-1">
                                                        <h3 className="font-display text-2xl tracking-widest text-on-surface uppercase">
                                                            Sagas y Arcos
                                                        </h3>
                                                        <button
                                                            onClick={() =>
                                                                setMobileSagasOpen(false)
                                                            }
                                                            className="p-1.5 rounded-full text-on-surface-variant hover:text-on-surface active:scale-95"
                                                        >
                                                            <Icons.ui.close className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="overflow-y-auto flex-grow min-h-0 pb-4">
                                                        <SagaSelector
                                                            sagas={sagas}
                                                            localSagas={
                                                                entry?.media
                                                                    ? resolveSeriesSagas(
                                                                          entry.media
                                                                      )
                                                                    : []
                                                            }
                                                            activeSagaId={activeSagaId}
                                                            onSelectSaga={sagaId => {
                                                                setSearchParams({
                                                                    saga: sagaId,
                                                                    subSaga: "",
                                                                })
                                                                const saga = sagas.find(
                                                                    s => s.id === sagaId
                                                                )
                                                                if (!saga?.subSagas?.length) {
                                                                    setMobileSagasOpen(false)
                                                                }
                                                            }}
                                                            activeSubSagaId={activeSubSagaId}
                                                            onSelectSubSaga={subSagaId => {
                                                                setSearchParams({
                                                                    subSaga: subSagaId,
                                                                })
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
                                        saga={activeSaga}
                                        subSaga={activeSubSaga}
                                        media={entry?.media}
                                        onSelectCharacter={setSelectedCharacterName}
                                        onSelectEpisode={setScrollToEpisode}
                                        onUpdateProgress={handleUpdateProgress}
                                        progress={sagaProgress}
                                        fillerStats={fillerStats}
                                    />

                                    <CharacterCarousel
                                        characters={activeSaga?.keyCharacters || []}
                                        onSelect={setSelectedCharacterName}
                                    />

                                    <PremiumEpisodeList
                                        activeSagaId={activeSagaId}
                                        scrollToEp={scrollToEpisode}
                                        episodes={episodeViewModels}
                                        activeSubSagaStart={activeSubSaga?.startEp}
                                        activeSubSagaEnd={activeSubSaga?.endEp}
                                        onPlay={handlePlayByNumber}
                                        onCast={handleCastByNumber}
                                        onPreload={handleEpisodePreload}
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
                                    <CharactersTab
                                        characters={entry.media?.characters?.edges || []}
                                        onSelectChar={setSelectedCharacterName}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "details" && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="py-4"
                            >
                                <div className="glass-card p-6 md:p-8 flex flex-col gap-6 bg-surface-container/30 border border-outline-variant/30 rounded-2xl">
                                    <h3 className="font-display text-2xl text-on-surface uppercase tracking-wider flex items-center gap-2">
                                        <Icons.ui.info className="text-brand-accent w-6 h-6" /> Detalles de la Serie
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="col-span-2 space-y-4">
                                            <h4 className="text-label-lg font-bold text-on-surface-variant uppercase tracking-widest">Sinopsis</h4>
                                            <p className="text-body-lg text-on-surface/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: entry.media?.description || "Sin descripción" }} />
                                        </div>
                                        
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">Información</h4>
                                                <ul className="space-y-2 text-body-md text-on-surface/80">
                                                    <li><strong className="text-on-surface">Formato:</strong> {entry.media?.format || "-"}</li>
                                                    <li><strong className="text-on-surface">Estado:</strong> {entry.media?.status || "-"}</li>
                                                    <li><strong className="text-on-surface">Episodios:</strong> {entry.media?.totalEpisodes || "-"}</li>
                                                    <li><strong className="text-on-surface">Duración:</strong> {entry.media?.runtime ? `${entry.media.runtime} min` : (entry.media as { duration?: number })?.duration ? `${(entry.media as { duration?: number }).duration} min` : "-"}</li>
                                                    <li><strong className="text-on-surface">Año:</strong> {entry.media?.year || "-"}</li>
                                                </ul>
                                            </div>
                                            
                                            {(entry.media as { studios?: string[] })?.studios && ((entry.media as { studios?: string[] }).studios?.length ?? 0) > 0 && (
                                                <div>
                                                    <h4 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-widest mb-2">Estudios</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(entry.media as { studios?: string[] }).studios?.map((studio: string) => (
                                                            <span key={studio} className="px-3 py-1 bg-surface-container border border-outline-variant/20 rounded-full text-label-sm font-semibold text-on-surface">
                                                                {studio}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {entry.media?.genres && (Array.isArray(entry.media.genres) ? entry.media.genres.length > 0 : Object.keys(entry.media.genres).length > 0) && (
                                                <div>
                                                    <h4 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-widest mb-2">Géneros</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(Array.isArray(entry.media.genres) ? entry.media.genres : Object.values(entry.media.genres)).map((genre: unknown) => (
                                                            <span key={String(genre)} className="px-3 py-1 bg-surface-container border border-outline-variant/20 rounded-full text-label-sm font-semibold text-on-surface">
                                                                {String(genre)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {playTarget &&
                (() => {
                    const nextTitle = nextEp
                        ? nextEp.titleSpanish ||
                          nextEp.episodeMetadata?.title ||
                          nextEp.episodeTitle ||
                          nextEp.displayTitle ||
                          `Episodio ${nextEp.absoluteEpisodeNumber || nextEp.episodeNumber}`
                        : nextSeriesTarget
                          ? `Continuar con ${nextSeriesTarget.label}`
                          : undefined
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
                                nextStreamType={playTarget.streamType}
                                nextEpisodeTitle={nextTitle}
                                nextEpisodeNumber={
                                    nextEp
                                        ? nextEp.absoluteEpisodeNumber || nextEp.episodeNumber
                                        : undefined
                                }
                                nextEpisodeImage={
                                    nextEp?.episodeMetadata?.image ||
                                    entry.media?.bannerImage ||
                                    entry.media?.posterImage
                                }
                                onNextEpisode={handleNextEpisode}
                                hasNextEpisode={hasNextEpisode}
                                onClose={handlePlayerClose}
                            />
                        </React.Suspense>
                    )
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

const SectionTab = React.forwardRef<
    HTMLButtonElement,
    {
        active: boolean
        onClick?: () => void
        icon: React.ReactNode
        label: string
    }
>(({ active, onClick, icon, label, ...props }, ref) => {
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
