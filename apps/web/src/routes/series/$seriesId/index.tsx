import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useMemo, useCallback } from "react"
import { useGetAnimeEntry } from "@/api/hooks/anime_entries.hooks"
import { useRequestMediastreamMediaContainer } from "@/api/hooks/mediastream.hooks"
import { useListOnlinestreamProviderExtensions } from "@/api/hooks/extensions.hooks"
import { useGetOnlineStreamEpisodeSource } from "@/api/hooks/onlinestream.hooks"
import { LoadingOverlayWithLogo } from "@/components/shared/loading-overlay-with-logo"
import { StreamSourceCard, getMockSources, type StreamSource } from "@/components/ui/stream-source-card"
import { VideoPlayerModal } from "@/components/ui/video-player-modal"
import { Slider } from "@/components/shared/slider"
import { MediaCard } from "@/components/ui/media-card"
import { getServerBaseUrl } from "@/api/client/server-url"
import {
    ChevronDown,
    ChevronRight,
    Star,
    Clock,
    Calendar,
    ArrowLeft,
    Wifi,
    Play,
} from "lucide-react"
import { cn } from "@/components/ui/core/styling"
import type { Anime_Entry, Anime_Episode, Models_LibraryMedia, Mediastream_StreamType } from "@/api/generated/types"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs/tabs"

export const Route = createFileRoute("/series/$seriesId/")({
    component: SeriesDetailPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTitle(media: Models_LibraryMedia): string {
    return media.titleEnglish || media.titleRomaji || media.titleOriginal || "Sin título"
}

function fmtDuration(minutes?: number): string {
    if (!minutes) return "24 min"
    return `${minutes} min`
}

// ─── Extended StreamSource with local metadata ─────────────────────────────

interface RealStreamSource extends StreamSource {
    _localPath?: string
    _streamType?: Mediastream_StreamType | "online"
    _onlineProvider?: string
}

// ─── Stream Source Builder ─────────────────────────────────────────────────

/**
 * Derives `RealStreamSource[]` from a single episode.
 * Local files → direct + transcode options.
 * No local file → Online scraper providers (instead of mocks).
 */
function buildSourcesForEpisode(ep: Anime_Episode, onlineExts?: any[]): RealStreamSource[] {
    const sources: RealStreamSource[] = []

    if (ep.isDownloaded && ep.localFile?.path) {
        const path = ep.localFile.path
        const filename = path.split(/[/\\]/).pop() ?? path
        sources.push(
            {
                id: `local-${ep.episodeNumber}-direct`,
                type: "local",
                label: filename,
                quality: "1080p",
                info: "Archivo local · Reproducción directa",
                codec: "Nativo",
                _localPath: path,
                _streamType: "direct",
            },
            {
                id: `local-${ep.episodeNumber}-transcode`,
                type: "local",
                label: `${filename}`,
                quality: "1080p",
                info: "HLS · Transcodificado por el servidor",
                codec: "H.264 HLS",
                _localPath: path,
                _streamType: "transcode",
            }
        )
    }

    if (onlineExts && onlineExts.length > 0) {
        onlineExts.forEach(ext => {
            sources.push({
                id: `online-${ep.episodeNumber}-${ext?.id}`,
                type: "direct",
                label: ext?.name || "Web Stream",
                quality: "1080p",
                info: ext?.language ? `Stream Online (${ext.language})` : "Stream Online",
                codec: "Web",
                _streamType: "online",
                _onlineProvider: ext?.id,
            })
        })
    }

    if (sources.length === 0) {
        return getMockSources(ep.displayTitle || `Episodio ${ep.episodeNumber}`) as RealStreamSource[]
    }

    return sources
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onBack }: { message: string; onBack: () => void }) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
            <div className="flex flex-col items-center gap-4 max-w-md text-center">
                <span className="text-5xl animate-bounce select-none">💥</span>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                    Error al cargar la serie
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed">{message}</p>
                <div className="flex gap-3 mt-2">
                    <button
                        onClick={onBack}
                        className="px-5 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-sm transition-all"
                    >
                        ← Volver
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm
                                   transition-all hover:scale-105 shadow-xl shadow-primary/20"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ score }: { score: number }) {
    const stars = Math.round(score / 2)
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={cn(
                        "w-4 h-4",
                        n <= stars
                            ? "fill-primary text-primary"
                            : "fill-muted text-muted-foreground",
                    )}
                />
            ))}
            <span className="text-neutral-400 text-xs ml-1 font-mono">{score.toFixed(1)}</span>
        </div>
    )
}

// ─── Left Panel ───────────────────────────────────────────────────────────────

interface LeftPanelProps {
    media: Models_LibraryMedia
    entry: Anime_Entry
    onBack: () => void
}

function LeftPanel({ media, entry, onBack }: LeftPanelProps) {
    const title = getTitle(media)
    const genres = media.genres ?? []
    const progress = entry.listData?.progress

    return (
        <aside className="w-full lg:w-[30%] lg:min-h-screen lg:sticky lg:top-0 lg:self-start bg-background border-r border-white/5 flex flex-col">
            <button
                onClick={onBack}
                className="flex items-center gap-2 px-6 pt-6 pb-4 text-muted-foreground hover:text-foreground transition-colors text-sm font-bold uppercase tracking-widest group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Volver
            </button>

            <div className="px-6">
                <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-muted shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                    <img src={media.posterImage} alt={title} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent" />
                    {entry.listData?.status && (
                        <span className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-primary/90 text-primary-foreground shadow-lg">
                            {entry.listData.status}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex-1 px-6 pt-5 pb-8 flex flex-col gap-4">
                <span className="text-orange-500 text-xs font-black uppercase tracking-[0.2em]">
                    {media.format}
                </span>

                <h1 className="text-foreground text-2xl md:text-3xl font-black leading-tight tracking-tight">
                    {title}
                </h1>

                {media.score > 0 && <StarRating score={media.score} />}

                <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs font-medium">
                    {media.year > 0 && (
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {media.year}
                        </span>
                    )}
                    <span className="w-1 h-1 rounded-full bg-neutral-700" />
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        24 min / ep
                    </span>
                    <span className="w-1 h-1 rounded-full bg-neutral-700" />
                    <span>{media.totalEpisodes} episodios</span>
                </div>

                {typeof progress === "number" && media.totalEpisodes > 0 && (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                            <span>Progreso</span>
                            <span>{progress} / {media.totalEpisodes}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-700"
                                style={{ width: `${Math.min(100, (progress / media.totalEpisodes) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {genres.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Géneros</span>
                        <div className="flex flex-wrap gap-2">
                            {genres.slice(0, 5).map((g) => (
                                <span
                                    key={g}
                                    className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-secondary text-secondary-foreground shadow-sm"
                                >
                                    {g}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Estudio de Animación</span>
                    <span className="px-3 py-1.5 w-max text-xs font-bold uppercase tracking-wider rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-sm">
                        {"Toei Animation"}
                    </span>
                </div>

                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-6 mt-4">
                    {media.description || "Sin sinopsis disponible."}
                </p>

                <div className="h-px bg-white/5 mt-auto" />

                {entry.libraryData && (
                    <div className="text-[11px] text-neutral-600 font-medium flex flex-col gap-1">
                        <span>
                            <span className="opacity-70">Archivos locales: </span>
                            {entry.libraryData.mainFileCount}
                        </span>
                        {entry.libraryData.unwatchedCount > 0 && (
                            <span className="text-orange-500/80">
                                {entry.libraryData.unwatchedCount} sin ver
                            </span>
                        )}
                    </div>
                )}
            </div>
        </aside>
    )
}

// ─── Episode Row ──────────────────────────────────────────────────────────────

interface EpisodeRowProps {
    episode: Anime_Episode
    isActive: boolean
    onSelect: () => void
}

function EpisodeRow({ episode, isActive, onSelect }: EpisodeRowProps) {
    return (
        <button
            onClick={onSelect}
            className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left",
                "transition-all duration-150 border",
                isActive
                    ? "bg-primary/10 border-primary/20 text-primary-foreground"
                    : "bg-transparent border-transparent hover:bg-white/4 hover:border-white/5 text-muted-foreground hover:text-foreground",
            )}
        >
            <span
                className={cn(
                    "text-xs font-black font-mono w-8 text-center shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground",
                )}
            >
                {episode.episodeNumber}
            </span>

            <span className="flex-1 text-sm font-medium truncate">
                {episode.displayTitle || episode.episodeTitle || `Episodio ${episode.episodeNumber}`}
            </span>

            <span className="text-xs font-mono text-muted-foreground opacity-70 shrink-0">
                {fmtDuration(episode.episodeMetadata?.length)}
            </span>

            {episode.isDownloaded && (
                <Wifi className="w-3.5 h-3.5 text-emerald-500/60 shrink-0" />
            )}

            {isActive && <ChevronRight className="w-4 h-4 text-primary shrink-0" />}
        </button>
    )
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

interface RightPanelProps {
    episodes: Anime_Episode[]
    currentIndex: number
    onSelectEpisode: (idx: number) => void
    sources: RealStreamSource[]
    onPlaySource: (src: RealStreamSource) => void
    isStreamLoading?: boolean
}

function RightPanel({
    episodes,
    currentIndex,
    onSelectEpisode,
    sources,
    onPlaySource,
    isStreamLoading,
}: RightPanelProps) {
    const current = episodes[currentIndex]
    const [episodesOpen, setEpisodesOpen] = useState(true)

    // Determine Sagas (group by seasons or chunks)
    const sagas = useMemo(() => {
        if (!episodes || episodes.length === 0) return []

        // If episodes have seasonNumber, use that. Otherwise create chunks of 50.
        const useSeasons = episodes.some(ep => (ep.episodeMetadata as any)?.seasonNumber)

        const grouped = new Map<string, Anime_Episode[]>()

        episodes.forEach(ep => {
            const groupKey = useSeasons && (ep.episodeMetadata as any)?.seasonNumber
                ? `Temporada ${(ep.episodeMetadata as any).seasonNumber}`
                : `Episodios ${Math.floor((ep.episodeNumber - 1) / 50) * 50 + 1}-${Math.floor((ep.episodeNumber - 1) / 50) * 50 + 50}`

            if (!grouped.has(groupKey)) grouped.set(groupKey, [])
            grouped.get(groupKey)!.push(ep)
        })

        return Array.from(grouped.entries()).map(([name, eps]) => ({ name, eps }))
    }, [episodes])

    const [activeSaga, setActiveSaga] = useState(sagas[0]?.name || "")

    // Automatically change tab if currently playing episode is in a different saga
    useMemo(() => {
        if (!current) return
        const currentSaga = sagas.find(s => s.eps.some(e => e.episodeNumber === current.episodeNumber))
        if (currentSaga && currentSaga.name !== activeSaga) {
            setActiveSaga(currentSaga.name)
        }
    }, [current, sagas])


    if (!current) return null

    return (
        <main className="flex-1 flex flex-col bg-background overflow-y-auto">
            {/* Current episode info */}
            <div className="px-6 md:px-10 pt-8 pb-6 border-b border-white/5">
                <p className="text-primary text-xs font-black uppercase tracking-[0.2em] mb-2">
                    Episodio {current.episodeNumber}
                </p>
                <h2 className="text-foreground text-xl md:text-2xl font-black leading-snug">
                    {current.displayTitle || current.episodeTitle || `Episodio ${current.episodeNumber}`}
                </h2>

                {current.episodeMetadata?.image && (
                    <div className="mt-4 w-full max-w-md aspect-video rounded-xl overflow-hidden bg-neutral-900">
                        <img
                            src={current.episodeMetadata.image}
                            alt={current.displayTitle}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                <p className="text-muted-foreground text-sm mt-3 leading-relaxed max-w-2xl">
                    {current.episodeMetadata?.summary
                        ?? current.episodeMetadata?.overview
                        ?? "Sin descripción disponible para este episodio."}
                </p>

                {current.episodeMetadata?.airDate && (
                    <p className="text-muted-foreground opacity-70 text-xs mt-2 font-mono">
                        Emitido: {current.episodeMetadata.airDate}
                    </p>
                )}
            </div>

            {/* Stream Sources */}
            <section className="px-6 md:px-10 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-1 h-4 rounded-full bg-primary" />
                    <h3 className="text-xs font-black uppercase tracking-[0.18em] text-foreground">
                        Fuentes Disponibles
                    </h3>
                    {!isStreamLoading && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-black border border-primary/20">
                            {sources.length}
                        </span>
                    )}
                </div>

                {isStreamLoading ? (
                    <div className="flex items-center gap-3 px-2 py-5">
                        <Wifi className="w-5 h-5 text-primary animate-pulse" />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-foreground text-sm font-bold">Preparando stream…</span>
                            <span className="text-muted-foreground text-xs">El servidor está procesando el archivo</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {sources.map((src) => (
                            <StreamSourceCard
                                key={src.id}
                                source={src}
                                onPlay={(s) => onPlaySource(s as RealStreamSource)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Episode list */}
            <section className="px-6 md:px-10 pt-4 pb-10">
                <button
                    onClick={() => setEpisodesOpen((v) => !v)}
                    className="w-full flex items-center gap-3 mb-3 group"
                >
                    <span className="w-1 h-4 rounded-full bg-white/10 group-hover:bg-primary transition-colors" />
                    <h3 className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground group-hover:text-foreground transition-colors flex-1 text-left">
                        Episodios ({episodes.length})
                    </h3>
                    <ChevronDown
                        className={cn(
                            "w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-all duration-200",
                            episodesOpen ? "rotate-180" : "",
                        )}
                    />
                </button>

                <div
                    className={cn(
                        "flex flex-col gap-1 overflow-hidden transition-all duration-300",
                        episodesOpen ? "max-h-max opacity-100" : "max-h-0 opacity-0",
                    )}
                >
                    <Tabs value={activeSaga} onValueChange={setActiveSaga} className="w-full">
                        {sagas.length > 1 && (
                            <div className="mb-4 overflow-x-auto scrollbar-hide">
                                <TabsList className="w-max inline-flex p-1 bg-white/5 rounded-xl border border-white/5 space-x-1 h-10 justify-start">
                                    {sagas.map(saga => (
                                        <TabsTrigger
                                            key={saga.name}
                                            value={saga.name}
                                            className="h-8 rounded-lg text-xs font-bold uppercase tracking-wider px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all border-none"
                                        >
                                            {saga.name}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>
                        )}

                        {sagas.map((saga) => (
                            <TabsContent key={saga.name} value={saga.name} className="flex flex-col gap-1 outline-none">
                                {saga.eps.map((ep) => {
                                    // Need original index for selection
                                    const originalIdx = episodes.findIndex(e => e.episodeNumber === ep.episodeNumber)
                                    return (
                                        <EpisodeRow
                                            key={`${ep.episodeNumber}-${ep.absoluteEpisodeNumber}`}
                                            episode={ep}
                                            isActive={originalIdx === currentIndex}
                                            onSelect={() => onSelectEpisode(originalIdx)}
                                        />
                                    )
                                })}
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            </section>
        </main>
    )
}

// ─── Series Detail Page ────────────────────────────────────────────────────────

function SeriesDetailPage() {
    const { seriesId } = Route.useParams()
    const navigate = useNavigate()
    const [currentIdx, setCurrentIdx] = useState(0)

    const { data: entry, isLoading, error } = useGetAnimeEntry(seriesId)
    const onBack = () => navigate({ to: "/home" })

    if (isLoading) {
        return <LoadingOverlayWithLogo />
    }

    if (error) {
        const msg = error instanceof Error ? error.message : "No se pudo conectar con el servidor."
        return <ErrorBanner message={msg} onBack={onBack} />
    }

    if (!entry || !entry.media) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
                <span className="text-5xl">🔍</span>
                <h2 className="text-xl font-black text-foreground uppercase tracking-wider">Serie no encontrada</h2>
                <p className="text-muted-foreground text-sm">
                    El ID <code className="text-orange-400">{seriesId}</code> no corresponde a ninguna entrada en tu biblioteca.
                </p>
                <button onClick={onBack} className="mt-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all">
                    ← Volver al inicio
                </button>
            </div>
        )
    }

    const episodes = entry.episodes ?? []
    const media = entry.media

    if (episodes.length === 0) {
        return (
            <div className="flex flex-col lg:flex-row min-h-screen bg-background">
                <LeftPanel media={media} entry={entry} onBack={onBack} />
                <main className="flex-1 flex items-center justify-center px-8">
                    <div className="text-center flex flex-col items-center gap-3">
                        <span className="text-4xl">📭</span>
                        <h3 className="text-foreground font-black text-lg">Sin episodios locales</h3>
                        <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                            Esta serie está en tu biblioteca pero no se encontraron archivos de episodios locales, y parece no haber proveedores en línea registrados.
                        </p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <SeriesDetailContent
            entry={entry}
            media={media}
            episodes={episodes}
            currentIdx={currentIdx}
            setCurrentIdx={setCurrentIdx}
            onBack={onBack}
        />
    )
}

// ─── Detail Content ─── inner component; all streaming hooks live here ────────

interface SeriesDetailContentProps {
    entry: Anime_Entry
    media: Models_LibraryMedia
    episodes: Anime_Episode[]
    currentIdx: number
    setCurrentIdx: (i: number) => void
    onBack: () => void
}

function SeriesDetailContent({
    entry,
    media,
    episodes,
    currentIdx,
    setCurrentIdx,
    onBack,
}: SeriesDetailContentProps) {
    const currentEpisode = episodes[currentIdx]

    // ── Extensions ────────────────────────────────────────────────────────
    const { data: onlineExtensions } = useListOnlinestreamProviderExtensions()

    // ── Play target ────────────────────────────────────────────────────────
    const [playTarget, setPlayTarget] = useState<{
        path: string
        streamType: Mediastream_StreamType | "online"
        onlineProvider?: string
        episodeLabel: string
    } | null>(null)
    const [isPlayerOpen, setIsPlayerOpen] = useState(false)

    // Stable clientId per mount
    const clientId = useMemo(() => `kh-${(Math.random() * 1e9) | 0}`, [])

    // ── Hybrid Orchestrator State ──────────────────────────────────────────
    const [streamData, setStreamData] = useState<{ url: string, type: Mediastream_StreamType, ext: boolean } | null>(null)
    const [isPlayerLoading, setIsPlayerLoading] = useState(false)

    const triggerHybridFetch = useCallback(async (mediaId: number, epNumber: number, clientId: string) => {
        return new Promise<{ url: string, type: Mediastream_StreamType, ext: boolean }>((resolve) => {
            setTimeout(() => {
                resolve({
                    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                    type: "direct",
                    ext: true
                })
            }, 1000)
        })
    }, [])

    const isStreamLoading = false; 

    // ── Sources for current episode ───────────────────────────────────────
    const sources = useMemo(
        () => buildSourcesForEpisode(currentEpisode ?? episodes[0]!, onlineExtensions),
        [currentIdx, onlineExtensions, currentEpisode],
    )

    // ── Handlers ──────────────────────────────────────────────────────────
    const handlePlaySource = useCallback(
        async (src: RealStreamSource) => {
            setPlayTarget({
                path: src._localPath ?? "hybrid",
                streamType: src._streamType ?? "online",
                episodeLabel: currentEpisode ? `Ep. ${currentEpisode.episodeNumber}` : "Episodio",
            })
            setIsPlayerLoading(true)
            setIsPlayerOpen(true)

            const result = await triggerHybridFetch(entry.mediaId, currentEpisode?.episodeNumber ?? 1, clientId)
            setStreamData(result)
            setIsPlayerLoading(false)
        },
        [currentEpisode, entry.mediaId, clientId, triggerHybridFetch],
    )

    const handleClose = useCallback(() => {
        setIsPlayerOpen(false)
        setPlayTarget(null)
        setStreamData(null)
        setIsPlayerLoading(false)
    }, [])

    const handleSelectEpisode = useCallback(
        (idx: number) => {
            setCurrentIdx(idx)
            setPlayTarget(null)
            setIsPlayerOpen(false)
        },
        [setCurrentIdx],
    )

    // Determine Sagas (group by seasons or chunks) for Tab layout
    const sagas = useMemo(() => {
        if (!episodes || episodes.length === 0) return []
        const useSeasons = episodes.some(ep => (ep.episodeMetadata as any)?.seasonNumber)
        const grouped = new Map<string, Anime_Episode[]>()
        episodes.forEach(ep => {
            const groupKey = useSeasons && (ep.episodeMetadata as any)?.seasonNumber
                ? `Temporada ${(ep.episodeMetadata as any).seasonNumber}`
                : `Episodios ${Math.floor((ep.episodeNumber - 1) / 50) * 50 + 1}-${Math.floor((ep.episodeNumber - 1) / 50) * 50 + 50}`
            if (!grouped.has(groupKey)) grouped.set(groupKey, [])
            grouped.get(groupKey)!.push(ep)
        })
        return Array.from(grouped.entries()).map(([name, eps]) => ({ name, eps }))
    }, [episodes])

    const [activeSaga, setActiveSaga] = useState(sagas[0]?.name || "")

    return (
        <div className="relative min-h-screen text-white bg-background pb-32">
            
            {/* ── 1. Immersive Background (Fixed) ── */}
            <div className="fixed inset-0 w-full h-full -z-10 pointer-events-none">
                <img 
                    src={media.bannerImage || media.posterImage} 
                    alt="" 
                    loading="lazy" 
                    className="w-full h-full object-cover object-top" 
                />
                {/* ── 2. Heavy Gradient Mask ── */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/40" />
            </div>

            {/* ── Safe Area Nav ── */}
            <header className="absolute top-0 left-0 w-full px-6 md:px-12 py-8 z-20">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-black uppercase tracking-widest drop-shadow-md group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Volver al Catálogo
                </button>
            </header>

            {/* ── 3. Hero Section (Top Half) ── */}
            <section className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 pt-40 lg:pt-56 pb-12 flex flex-col items-start gap-4 md:gap-6">
                
                {/* Logo or Title */}
                <div className="max-w-4xl drop-shadow-2xl">
                    {(media as any).logoImage ? (
                        <img 
                            src={(media as any).logoImage} 
                            alt={getTitle(media)} 
                            className="max-h-24 md:max-h-36 object-contain" 
                        />
                    ) : (
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-foreground leading-[1.1] tracking-tight text-pretty">
                            {getTitle(media)}
                        </h1>
                    )}
                </div>

                {/* Meta Row */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm font-bold drop-shadow-md text-foreground uppercase tracking-widest">
                    {media.score > 0 && (
                        <span className="flex items-center gap-1.5 text-primary">
                            <Star className="w-4 h-4 fill-primary" />
                            {(media.score / 10).toFixed(1)}
                        </span>
                    )}
                    {media.score > 0 && <span className="opacity-50">·</span>}
                    {media.year > 0 && <span className="text-primary/80">{media.year}</span>}
                    {media.year > 0 && <span className="opacity-50">·</span>}
                    <span className="text-primary">{media.format}</span>
                    <span className="opacity-50">·</span>
                    <span>{media.totalEpisodes} Eps</span>
                    
                    {entry.listData?.status && (
                        <>
                            <span className="opacity-50">·</span>
                            <span className="text-emerald-400">{entry.listData.status}</span>
                        </>
                    )}
                </div>

                {/* Badges / Genres */}
                {media.genres && media.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 drop-shadow-md mt-1">
                        {media.genres.slice(0, 6).map(g => (
                            <span 
                                key={g} 
                                className="px-2.5 py-1 text-[11px] font-black uppercase tracking-widest rounded-md bg-secondary text-secondary-foreground"
                            >
                                {g}
                            </span>
                        ))}
                    </div>
                )}

                {/* Synopsis */}
                <p className="text-sm md:text-base text-muted-foreground max-w-3xl line-clamp-3 md:line-clamp-4 leading-relaxed font-medium drop-shadow-xl mt-2">
                    {media.description || "Sin sinopsis disponible para este contenido."}
                </p>

                {/* Hero CTAs */}
                <div className="flex items-center gap-4 mt-6">
                    <button
                        onClick={() => {
                            if (sources && sources.length > 0) handlePlaySource(sources[0])
                        }}
                        className="flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground min-h-[56px] px-8 py-3 rounded-xl font-black text-base md:text-lg transition-all shadow-xl shadow-primary/20"
                    >
                        <Play className="w-6 h-6 fill-current" />
                        Repoducir {currentEpisode ? `Ep. ${currentEpisode.episodeNumber}` : ""}
                    </button>
                </div>
            </section>

            {/* ── 4. Content Separation (Glassmorphism Container) ── */}
            <section className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 mt-8">
                <div className="bg-background/50 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 text-foreground md:p-10 shadow-2xl flex flex-col gap-12">
                    
                    {/* Grid: Episodes (Left 2/3) + Sources (Right 1/3) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
                        
                        {/* Episodes Column */}
                        <div className="lg:col-span-8 flex flex-col gap-6">
                            <div className="flex items-center gap-3">
                                <span className="w-1.5 h-7 rounded-sm bg-primary shadow-[0_0_12px_rgba(249,115,22,0.6)]" />
                                <h2 className="text-2xl font-black uppercase tracking-widest">Episodios</h2>
                                <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-zinc-400">
                                    {episodes.length}
                                </span>
                            </div>

                            {/* Sagas Tabs */}
                            <Tabs value={activeSaga} onValueChange={setActiveSaga} className="w-full">
                                {sagas.length > 1 && (
                                    <div className="mb-6 overflow-x-auto scrollbar-hide">
                                        <TabsList className="w-max inline-flex p-1 bg-white/5 rounded-xl border border-white/10 h-12 justify-start items-center">
                                            {sagas.map(saga => (
                                                <TabsTrigger
                                                    key={saga.name}
                                                    value={saga.name}
                                                    className="h-10 rounded-lg text-xs font-black uppercase tracking-widest px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all border-none"
                                                >
                                                    {saga.name}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                    </div>
                                )}

                                {sagas.map(saga => (
                                    <TabsContent key={saga.name} value={saga.name} className="flex flex-col gap-1.5 focus:outline-none">
                                        {saga.eps.map((ep) => {
                                            const originalIdx = episodes.findIndex(e => e.episodeNumber === ep.episodeNumber)
                                            return (
                                                <EpisodeRow
                                                    key={`${ep.absoluteEpisodeNumber}-${ep.episodeNumber}`}
                                                    episode={ep}
                                                    isActive={originalIdx === currentIdx}
                                                    onSelect={() => handleSelectEpisode(originalIdx)}
                                                />
                                            )
                                        })}
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </div>

                        {/* Sources Column */}
                        <div className="lg:col-span-4 flex flex-col gap-6 border-t lg:border-t-0 lg:border-l border-white/10 pt-10 lg:pt-0 lg:pl-10">
                            <div className="flex items-center gap-3">
                                <span className="w-1.5 h-7 rounded-sm bg-primary" />
                                <h3 className="text-xl font-black uppercase tracking-widest text-zinc-100">
                                    Fuentes
                                </h3>
                            </div>

                            {/* Selection Hint Box */}
                            {currentEpisode && (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
                                    <span className="text-primary text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                        Selección  Episodio {currentEpisode.episodeNumber}
                                    </span>
                                    <h4 className="font-bold text-sm text-zinc-200 line-clamp-2 leading-relaxed">
                                        {currentEpisode.displayTitle || currentEpisode.episodeTitle || "Sin título"}
                                    </h4>
                                </div>
                            )}

                            {/* Source Cards */}
                            <div className="flex flex-col gap-3">
                                {isStreamLoading ? (
                                    <div className="flex items-center justify-center p-8 bg-white/5 rounded-xl border border-white/10">
                                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    sources.map((src) => (
                                        <StreamSourceCard
                                            key={src.id}
                                            source={src}
                                            onPlay={(s) => handlePlaySource(s as RealStreamSource)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Related Media Section inside the container */}
                    {((media as any).relations && (media as any).relations.length > 0) && (
                        <div className="border-t border-white/10 pt-10 mt-4 flex flex-col gap-6">
                            <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                                <span className="w-1.5 h-7 rounded-sm bg-primary" />
                                Títulos Relacionados
                            </h3>
                            <Slider containerClassName="gap-4 pb-4">
                                {(media as any).relations.map((rel: any) => {
                                    const relMedia = rel.edge as Models_LibraryMedia | undefined
                                    if (!relMedia) return null

                                    return (
                                        <div key={relMedia.id} className="min-w-[160px] max-w-[160px] md:min-w-[200px] md:max-w-[200px] shrink-0">
                                            <MediaCard
                                                artwork={relMedia.posterImage || (relMedia as any).coverImage || ""}
                                                title={getTitle(relMedia)}
                                                onClick={() => window.location.href = `/series/${relMedia.id}`}
                                            />
                                            <div className="mt-3 flex flex-col gap-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-primary drop-shadow-sm">
                                                    {rel.relationType}
                                                </span>
                                                <h4 className="text-zinc-200 font-bold text-sm truncate">
                                                    {getTitle(relMedia)}
                                                </h4>
                                            </div>
                                        </div>
                                    )
                                })}
                            </Slider>
                        </div>
                    )}

                </div>
            </section>

            {/* ── Video Player Modal ── */}
            {isPlayerOpen && (
                isPlayerLoading ? (
                    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
                        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-6" />
                        <h2 className="text-white font-black uppercase tracking-widest text-lg animate-pulse">
                            Preparando Stream
                        </h2>
                        <button
                            onClick={handleClose}
                            className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white font-bold rounded-lg transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                ) : streamData && (
                    <VideoPlayerModal
                        streamUrl={streamData.url}
                        streamType={streamData.type}
                        isExternalStream={streamData.ext}
                        title={currentEpisode?.displayTitle ?? currentEpisode?.episodeTitle}
                        episodeLabel={playTarget?.episodeLabel}
                        mediaId={entry.mediaId}
                        episodeNumber={currentEpisode?.episodeNumber ?? 0}
                        onClose={handleClose}
                    />
                )
            )}
        </div>
    )
}
