import { useState, useMemo, useCallback } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { cn } from "@/components/ui/core/styling"
import { useGetAnimeEntry, fetchAnimeEntry } from "@/api/hooks/anime_entries.hooks"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"
import { HardDrive, Star, ArrowLeft, Calendar, Clock, CheckCircle2, Circle, ChevronDown } from "lucide-react"
import { VideoPlayer } from "@/components/video/player"
import type { Mediastream_StreamType } from "@/api/generated/types"
import { toast } from "sonner"
import { ProgressBar } from "@/components/ui/progress-bar"
import { DeferredImage } from "@/components/shared/deferred-image"
import { startViewTransition } from "@/lib/helpers/transitions"

export const Route = createFileRoute("/series/$seriesId/$sagaId")({
    loader: ({ params: { seriesId }, context }) => {
        const qc = context.queryClient
        qc.prefetchQuery({
            queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key, seriesId],
            queryFn: () => fetchAnimeEntry(seriesId),
        })
        return { dehydrateState: dehydrate(qc) }
    },
    component: SagaDetailPage,
})

function SagaDetailPage() {
    const { dehydrateState } = Route.useLoaderData()
    return (
        <HydrationBoundary state={dehydrateState}>
            <DetailPage />
        </HydrationBoundary>
    )
}

import { resolveSeriesSagas, getDragonBallSpanishTitle } from "@/lib/config/dragonball.config"

interface Episode {
    id: string
    number: number
    title: string
    description: string
    duration: string
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={cn(
                        "w-4 h-4",
                        n <= Math.round(rating / 2)
                            ? "fill-white text-white"
                            : "fill-neutral-800 text-neutral-800",
                    )}
                />
            ))}
            <span className="text-neutral-500 text-xs ml-1 font-black">{rating.toFixed(1)}</span>
        </div>
    )
}

// ─── Left Panel ───────────────────────────────────────────────────────────────

interface LeftPanelProps {
    posterUrl: string
    title: string
    synopsis: string
    year: string
    episodesCount: number
    sagaTitle: string
    genres: string[]
    rating: number
    durationPerEp: string
    studios: string[]
    onBack: () => void
}

function LeftPanel({ posterUrl, title, synopsis, year, episodesCount, sagaTitle, genres, rating, durationPerEp, studios, onBack }: LeftPanelProps) {

    return (
        <aside className="w-full lg:w-[30%] lg:h-full bg-[#070a14]/40 backdrop-blur-md border-r border-white/5 flex flex-col overflow-y-auto shrink-0">
            {/* Back button */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 px-8 pt-8 pb-4 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.3em] group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                VOLVER
            </button>

            {/* Poster */}
            <div className="px-8 mt-4">
                <div className="relative w-full aspect-[2/3] bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <DeferredImage
                        src={posterUrl}
                        alt={title}
                        priority={true}
                        className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
            </div>

            {/* Metadata */}
            <div className="flex-1 px-8 pt-8 pb-12 flex flex-col gap-6">
                {/* Saga label */}
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
                    SAGA: {sagaTitle}
                </span>

                {/* Title */}
                <h1 className="text-white text-4xl font-display leading-[0.9] tracking-widest uppercase">
                    {title}
                </h1>

                {/* Rating */}
                <StarRating rating={rating} />

                {/* Quick stats row */}
                <div className="flex flex-wrap items-center gap-4 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {year}
                    </span>
                    <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {durationPerEp}
                    </span>
                    <span>{episodesCount} EPISODIOS</span>
                </div>

                {/* Genre tags */}
                <div className="flex flex-wrap gap-2">
                    {genres.slice(0, 4).map((g) => (
                        <span
                            key={g}
                            className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-brand-orange/10 text-brand-orange border border-brand-orange/20"
                        >
                            {g}
                        </span>
                    ))}
                </div>

                {/* Synopsis */}
                <p className="text-zinc-400 text-[13px] leading-relaxed font-bold uppercase tracking-wide">
                    {synopsis}
                </p>

                {/* Divider */}
                <div className="h-px bg-white/10 mt-auto mb-6" />

                {/* Studio info */}
                <div className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                    {studios.length > 0 && (
                        <>
                            <span className="text-zinc-700">ESTUDIO: </span>{studios.join(", ")}
                        </>
                    )}
                </div>
            </div>
        </aside>
    )
}

// ─── Episode Row ──────────────────────────────────────────────────────────────

interface EpisodeRowProps {
    episode: Episode
    isActive: boolean
    isWatched: boolean
    isDownloaded: boolean
    progress?: number // 0-100, progreso del episodio
    onSelect: () => void
}

function EpisodeRow({ episode, isActive, isWatched, isDownloaded, progress, onSelect }: EpisodeRowProps) {
    return (
        <button
            onClick={onSelect}
            className={cn(
                "w-full flex items-center gap-6 px-6 py-4 text-left group relative",
                "transition-all duration-300 rounded-xl",
                isActive
                    ? "bg-brand-orange text-white border-brand-orange shadow-[0_0_15px_rgba(255,110,58,0.4)]"
                    : "bg-transparent border-transparent hover:bg-white/5 text-zinc-500 hover:text-white",
                isWatched && "opacity-60",
            )}
        >
            {/* Episode number */}
            <div className="flex flex-col items-center w-8 shrink-0">
                <span
                    className={cn(
                        "text-xs font-black tracking-widest",
                        isActive ? "text-white" : "text-zinc-700 group-hover:text-zinc-400",
                    )}
                >
                    {episode?.number?.toString().padStart(2, '0') || "00"}
                </span>
                {isDownloaded && <HardDrive className={cn("w-3 h-3 mt-1", isActive ? "text-white/65" : "text-zinc-700")} />}
            </div>

            {/* Title */}
            <span className="flex-1 text-[11px] font-black uppercase tracking-widest truncate">
                {episode.title}
            </span>

            {/* Progress bar (cuando está a medias) */}
            {progress !== undefined && progress > 0 && progress < 100 && !isWatched && (
                <div className="w-20 shrink-0">
                    <ProgressBar
                        value={progress}
                        className="bg-zinc-900"
                        indicatorClass="bg-brand-orange"
                    />
                </div>
            )}

            {/* Duration */}
            <span className={cn("text-[10px] font-black tracking-widest shrink-0", isActive ? "text-white/75" : "text-zinc-700")}>
                {episode.duration.toUpperCase()}
            </span>

            {/* Watched indicator */}
            {isWatched
                ? <CheckCircle2 className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-green-500")} />
                : <Circle className="w-4 h-4 text-zinc-800 shrink-0 opacity-0 group-hover:opacity-100" />
            }
        </button>
    )
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

import type { Anime_Entry } from "@/api/generated/types"

interface RightPanelProps {
    episodes: Episode[]
    currentIndex: number
    onSelectEpisode: (idx: number) => void
    isWatched: (id: string) => boolean
    onMarkWatched: () => void
    currentWatched: boolean
    onPlayEpisode: (ep: Episode) => void
    downloadedEpisodes: Set<number>
    libraryEntry?: Anime_Entry | null
}

function RightPanel({
    episodes,
    currentIndex,
    onSelectEpisode,
    isWatched,
    onMarkWatched,
    currentWatched,
    onPlayEpisode,
    downloadedEpisodes,
    libraryEntry,
}: RightPanelProps) {
    const current = episodes[currentIndex]!
    const [episodesOpen, setEpisodesOpen] = useState(true)
    const isCurrentDownloaded = downloadedEpisodes.has(current.number)

    return (
        <main className="flex-1 min-h-0 flex flex-col bg-transparent overflow-y-auto">
            {/* ── Current episode info ────────────────────────── */}
            <div className="px-10 pt-12 pb-10 border-b border-white/10">
                <div className="flex items-start justify-between gap-12">
                    <div className="flex-1">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                            EPISODIO {current.number}
                        </p>
                        <h2 className="text-white text-4xl font-black leading-none uppercase tracking-tight mb-6">
                            {current.title}
                        </h2>
                        <p className="text-zinc-400 text-[14px] leading-relaxed font-bold uppercase tracking-wide max-w-3xl">
                            {current.description}
                        </p>
                    </div>

                    {/* Mark watched toggle */}
                    <button
                        onClick={onMarkWatched}
                        className={cn(
                            "shrink-0 flex items-center gap-3 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] border transition-all duration-300 rounded-xl",
                            currentWatched
                                ? "bg-brand-orange border-brand-orange text-white shadow-[0_0_15px_rgba(255,110,58,0.4)]"
                                : "bg-[#0a0e1a]/40 border-white/10 text-zinc-400 hover:text-brand-orange hover:border-brand-orange/30",
                        )}
                    >
                        {currentWatched
                            ? <CheckCircle2 className="w-4 h-4" />
                            : <Circle className="w-4 h-4" />
                        }
                        {currentWatched ? "VISTO" : "MARCAR"}
                    </button>
                </div>
            </div>

            {/* ── Play Button ───────────────────────────────── */}
            <section className="px-10 pt-10 pb-6">
                <button
                    onClick={() => onPlayEpisode(current)}
                    className={cn(
                        "w-full flex items-center justify-center gap-4 py-6 font-black text-[13px] uppercase tracking-[0.3em] transition-all duration-300 rounded-2xl shadow-[0_0_20px_rgba(255,110,58,0.3)] border",
                        isCurrentDownloaded
                            ? "bg-brand-orange border-brand-orange text-white hover:bg-brand-orange-hover hover:shadow-[0_0_30px_rgba(255,110,58,0.55)]"
                            : "bg-white/5 border-white/5 text-zinc-600 cursor-not-allowed"
                    )}
                    disabled={!isCurrentDownloaded}
                >
                    <HardDrive className="w-5 h-5" />
                    REPRODUCIR EPISODIO {current.number}
                </button>
            </section>

            {/* ── Episode selector ─────────────────────────────── */}
            <section className="px-10 pt-6 pb-20">
                {/* Collapsible header */}
                <button
                    onClick={() => setEpisodesOpen((v) => !v)}
                    className="w-full flex items-center gap-4 mb-6 group"
                >
                    <div className="h-px bg-white/10 flex-1" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 group-hover:text-white transition-colors">
                        EPISODIOS DE LA SAGA
                    </h3>
                    <ChevronDown
                        className={cn(
                            "w-4 h-4 text-zinc-700 group-hover:text-white transition-all duration-300",
                            episodesOpen ? "rotate-180" : "",
                        )}
                    />
                    <div className="h-px bg-white/10 flex-1" />
                </button>

                {/* Episode list */}
                <div
                    className={cn(
                        "flex flex-col gap-1 overflow-hidden transition-all duration-300",
                        episodesOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0",
                    )}
                >
                    {episodes.map((ep, idx) => {
                        const episodeProgress = libraryEntry?.episodes?.[idx]?.watched ? 100 : 0 /* 0-100 de progreso */
                        return (
                            <EpisodeRow
                                key={ep.id}
                                episode={ep}
                                isActive={idx === currentIndex}
                                isWatched={isWatched(ep.id)}
                                isDownloaded={downloadedEpisodes.has(ep.number)}
                                progress={episodeProgress}
                                onSelect={() => onSelectEpisode(idx)}
                            />
                        )
                    })}
                </div>
            </section>
        </main>
    )
}


// ─── Detail Page ──────────────────────────────────────────────────────────────

function DetailPage() {
    const { seriesId, sagaId } = Route.useParams()
    const navigate = useNavigate()
    const { isWatched, markWatched, unmarkWatched } = {
        isWatched: (_id: string) => false,
        markWatched: (_id: string) => { },
        unmarkWatched: (_id: string) => { },
    }

    const { data: libraryEntry } = useGetAnimeEntry(seriesId)

    // Match saga from our local mapping using the shared resolver
    const seriesSagas = resolveSeriesSagas(libraryEntry?.media)

    const rawSaga = seriesSagas.find((s) => s.id === sagaId)

    // Build the frontend standard format 
    const series = useMemo(() => {
        if (!libraryEntry?.media) return null
        const media = libraryEntry.media
        return {
            id: seriesId,
            title: media.titleRomaji || media.titleEnglish || "Serie",
            year: media.year?.toString() || "",
            episodesCount: media.totalEpisodes || 0,
            genres: (media.genres as unknown as string[]) || ["Anime"],
            rating: media.score || media.rating || 0,
            durationPerEp: "24 min / ep",
            studios: [] as string[],
        }
    }, [libraryEntry, seriesId])

    const saga = useMemo(() => {
        if (!rawSaga) return null

        // Find episodes physically available from standard GET
        const allEpisodes = libraryEntry?.episodes || []

        // Filter those belonging inside saga boundaries
        const arcEpisodes = allEpisodes
            .filter(ep => {
                const epNum = ep.absoluteEpisodeNumber || ep.episodeNumber
                return epNum >= rawSaga.startEp && epNum <= rawSaga.endEp
            })
            .sort((a, b) => (a.absoluteEpisodeNumber || a.episodeNumber) - (b.absoluteEpisodeNumber || b.episodeNumber))

        // Map to expected UI layout
        const mappedEpisodes: Episode[] = arcEpisodes.map(ep => {
            const epNum = ep.absoluteEpisodeNumber || ep.episodeNumber;
            const localizedTitle = getDragonBallSpanishTitle(libraryEntry?.media?.tmdbId, epNum);
            const resolvedTitle = localizedTitle || ep.titleSpanish || ep.episodeMetadata?.title || ep.episodeTitle || ep.displayTitle || `Episodio ${epNum}`;
            return {
                id: epNum.toString(),
                number: epNum,
                title: resolvedTitle,
                description: ep.episodeMetadata?.overview || ep.episodeMetadata?.summary || "Sin descripción disponible.",
                duration: ep.episodeMetadata?.length ? `${ep.episodeMetadata.length} min` : "24 min"
            }
        })

        // If the library returns fewer episodes than the saga needs, we generate mock ones so the user 
        // can still see Torrentio streams for them!
        const guaranteedLength = rawSaga.endEp - rawSaga.startEp + 1
        let finalEpisodes = mappedEpisodes
        if (mappedEpisodes.length < guaranteedLength) {
            const filler: Episode[] = []
            for (let i = rawSaga.startEp; i <= rawSaga.endEp; i++) {
                const exists = mappedEpisodes.find(m => m.number === i)
                if (exists) filler.push(exists)
                else filler.push({
                    id: `mock-${i}`,
                    number: i,
                    title: `Episodio ${i}`,
                    description: "Detalles no sincronizados localmente",
                    duration: "24 min"
                })
            }
            finalEpisodes = filler
        }

        return {
            ...rawSaga,
            episodes: finalEpisodes
        }
    }, [rawSaga, libraryEntry])

    const [currentIdx, setCurrentIdx] = useState(0)
    const [isPlayerOpen, setIsPlayerOpen] = useState(false)
    const [playTarget, setPlayTarget] = useState<{
        path: string
        streamType: Mediastream_StreamType
        episodeLabel: string
        episodeNumber: number
        seriesId: number
    } | null>(null)

    const downloadedEpisodes = useMemo(() => {
        const set = new Set<number>()
        libraryEntry?.episodes?.forEach(ep => {
            if (ep.isDownloaded) set.add(ep.episodeNumber)
        })
        return set
    }, [libraryEntry])

    const currentEpisode = saga?.episodes[currentIdx]

    const nextEp = useMemo(() => {
        if (!saga || currentIdx >= saga.episodes.length - 1) return null
        return saga.episodes[currentIdx + 1]
    }, [saga, currentIdx])

    const nextLocalFile = useMemo(() => {
        if (!nextEp) return null
        const fullEp = libraryEntry?.episodes?.find(e => e.episodeNumber === nextEp.number)
        return fullEp?.localFile
    }, [nextEp, libraryEntry])

    // When user clicks an episode → play if local
    const handleEpisodePlay = useCallback((ep: Episode) => {
        const fullEp = libraryEntry?.episodes?.find(e => e.episodeNumber === ep.number)
        const filePath = fullEp?.localFile?.path
        if (!filePath) {
            toast.error("Archivo local no disponible.")
            return
        }

        const targetType = "direct"

        startViewTransition(() => {
            setPlayTarget({
                path: filePath,
                streamType: targetType as Mediastream_StreamType,
                episodeLabel: ep.title,
                episodeNumber: ep.number,
                seriesId: Number(seriesId)
            })
            setIsPlayerOpen(true)
        })
    }, [libraryEntry, seriesId, setIsPlayerOpen, setPlayTarget])

    if (!series || !saga || saga.episodes.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-white bg-background">
                Contenido no encontrado
            </div>
        )
    }

    const handleMarkWatched = () => {
        if (!currentEpisode) return
        if (isWatched(currentEpisode.id)) unmarkWatched(currentEpisode.id)
        else markWatched(currentEpisode.id)
    }

    return (
        <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-background">
            {/* ── Left: Poster + Metadata (30%) ── */}
            <LeftPanel
                posterUrl={saga.image}
                title={series.title}
                synopsis={saga.description}
                year={series.year}
                episodesCount={series.episodesCount}
                sagaTitle={saga.title}
                genres={series.genres}
                rating={series.rating}
                durationPerEp={series.durationPerEp}
                studios={series.studios}
                onBack={() => navigate({ to: "/series/$seriesId", params: { seriesId: series.id } })}
            />

            {/* ── Right: Episodes (70%) ── */}
            <RightPanel
                episodes={saga.episodes}
                currentIndex={currentIdx}
                onSelectEpisode={setCurrentIdx}
                isWatched={isWatched}
                onMarkWatched={handleMarkWatched}
                currentWatched={currentEpisode ? isWatched(currentEpisode.id) : false}
                onPlayEpisode={handleEpisodePlay}
                downloadedEpisodes={downloadedEpisodes}
                libraryEntry={libraryEntry}
            />


            {/* ── Video Player Modal ── */}
            {isPlayerOpen && playTarget && (() => {
                const nextTitle = nextEp ? nextEp.title : undefined;
                return (
                    <VideoPlayer
                        streamUrl={playTarget.path}
                        streamType={playTarget.streamType as "local" | "online" | "direct" | undefined}
                        title={series.title}
                        episodeLabel={playTarget.episodeLabel}
                        mediaId={playTarget.seriesId}
                        episodeNumber={playTarget.episodeNumber}
                        isExternalStream={false}
                        nextStreamUrl={nextLocalFile?.path}
                        nextStreamType={playTarget.streamType as Mediastream_StreamType}
                        nextEpisodeTitle={nextTitle}
                        nextEpisodeNumber={nextEp?.number}
                        nextEpisodeImage={saga?.image}
                        onNextEpisode={() => {
                            if (currentIdx < saga.episodes.length - 1) {
                                const nextIdx = currentIdx + 1
                                setCurrentIdx(nextIdx)
                                const next = saga.episodes[nextIdx]
                                const fullEp = libraryEntry?.episodes?.find(e => e.episodeNumber === next.number)
                                const filePath = fullEp?.localFile?.path
                                if (filePath) {
                                    const targetType = "direct"
                                    setPlayTarget({
                                        path: filePath,
                                        streamType: targetType as Mediastream_StreamType,
                                        episodeLabel: next.title,
                                        episodeNumber: next.number,
                                        seriesId: Number(seriesId)
                                    })
                                }
                            }
                        }}
                        hasNextEpisode={currentIdx < saga.episodes.length - 1}
                        onClose={() => {
                            startViewTransition(() => {
                                setIsPlayerOpen(false)
                            })
                        }}
                    />
                );
            })()}
        </div>
    )
}

