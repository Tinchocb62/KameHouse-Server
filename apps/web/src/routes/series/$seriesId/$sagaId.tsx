import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { dbzData, type Episode } from "@/lib/dbz-data"
import { useProgressStore } from "@/lib/store"
import { useState, useMemo } from "react"
import { StreamSourceCard, type StreamSource } from "@/components/ui/stream-source-card"
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Star, Clock, Calendar, ArrowLeft } from "lucide-react"
import { cn } from "@/components/ui/core/styling"

export const Route = createFileRoute("/series/$seriesId/$sagaId")({
    component: DetailPage,
})

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
                            ? "fill-orange-400 text-orange-400"
                            : "fill-neutral-700 text-neutral-700",
                    )}
                />
            ))}
            <span className="text-neutral-400 text-xs ml-1 font-mono">{rating.toFixed(1)}</span>
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
    onBack: () => void
}

function LeftPanel({ posterUrl, title, synopsis, year, episodesCount, sagaTitle, onBack }: LeftPanelProps) {
    // Mock rating – in production would come from TMDB/AniList
    const rating = 8.6

    return (
        <aside className="w-full lg:w-[30%] lg:min-h-screen lg:sticky lg:top-0 lg:self-start bg-neutral-950 border-r border-white/5 flex flex-col">
            {/* Back button */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 px-6 pt-6 pb-4 text-neutral-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Volver
            </button>

            {/* Poster */}
            <div className="px-6">
                <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-neutral-900 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                    <img
                        src={posterUrl}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                    {/* Subtle gradient overlay at bottom of poster */}
                    <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
            </div>

            {/* Metadata */}
            <div className="flex-1 px-6 pt-5 pb-8 flex flex-col gap-4">
                {/* Saga label */}
                <span className="text-orange-500 text-xs font-black uppercase tracking-[0.2em]">
                    {sagaTitle}
                </span>

                {/* Title */}
                <h1 className="text-white text-2xl md:text-3xl font-black leading-tight tracking-tight">
                    {title}
                </h1>

                {/* Rating */}
                <StarRating rating={rating} />

                {/* Quick stats row */}
                <div className="flex flex-wrap items-center gap-3 text-neutral-400 text-xs font-medium">
                    <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                        {year}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-neutral-700" />
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-neutral-600" />
                        24 min / ep
                    </span>
                    <span className="w-1 h-1 rounded-full bg-neutral-700" />
                    <span>{episodesCount} episodios</span>
                </div>

                {/* Genre tags */}
                <div className="flex flex-wrap gap-2">
                    {["Acción", "Aventura", "Anime"].map((g) => (
                        <span
                            key={g}
                            className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-white/5 text-neutral-400 border border-white/5"
                        >
                            {g}
                        </span>
                    ))}
                </div>

                {/* Synopsis */}
                <p className="text-neutral-400 text-sm leading-relaxed">
                    {synopsis}
                </p>

                {/* Divider */}
                <div className="h-px bg-white/5 mt-auto" />

                {/* Studio info */}
                <div className="text-[11px] text-neutral-600 font-medium">
                    <span className="text-neutral-500">Estudio: </span>Toei Animation
                    <span className="mx-2 text-neutral-700">•</span>
                    <span className="text-neutral-500">Red: </span>Fuji TV
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
    onSelect: () => void
}

function EpisodeRow({ episode, isActive, isWatched, onSelect }: EpisodeRowProps) {
    return (
        <button
            onClick={onSelect}
            className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left",
                "transition-all duration-150 border",
                isActive
                    ? "bg-orange-500/10 border-orange-500/20 text-white"
                    : "bg-transparent border-transparent hover:bg-white/4 hover:border-white/5 text-neutral-400 hover:text-white",
            )}
        >
            {/* Episode number */}
            <span
                className={cn(
                    "text-xs font-black font-mono w-8 text-center shrink-0",
                    isActive ? "text-orange-400" : "text-neutral-600",
                )}
            >
                {episode.number}
            </span>

            {/* Title */}
            <span className="flex-1 text-sm font-medium truncate">
                {episode.title}
            </span>

            {/* Duration */}
            <span className="text-xs font-mono text-neutral-600 shrink-0">
                {episode.duration}
            </span>

            {/* Watched indicator */}
            {isWatched
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500/60 shrink-0" />
                : <Circle className="w-4 h-4 text-neutral-700 shrink-0 opacity-0 group-hover:opacity-100" />
            }

            {/* Active chevron */}
            {isActive && (
                <ChevronRight className="w-4 h-4 text-orange-400 shrink-0" />
            )}
        </button>
    )
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

interface RightPanelProps {
    episodes: Episode[]
    currentIndex: number
    onSelectEpisode: (idx: number) => void
    isWatched: (id: string) => boolean
    onMarkWatched: () => void
    currentWatched: boolean
    sources: StreamSource[]
    onPlaySource: (src: StreamSource) => void
}

function RightPanel({
    episodes,
    currentIndex,
    onSelectEpisode,
    isWatched,
    onMarkWatched,
    currentWatched,
    sources,
    onPlaySource,
}: RightPanelProps) {
    const current = episodes[currentIndex]!
    const [episodesOpen, setEpisodesOpen] = useState(true)

    return (
        <main className="flex-1 flex flex-col bg-neutral-950 overflow-y-auto">
            {/* ── Current episode info ────────────────────────── */}
            <div className="px-6 md:px-10 pt-8 pb-6 border-b border-white/5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-orange-500 text-xs font-black uppercase tracking-[0.2em] mb-2">
                            Episodio {current.number}
                        </p>
                        <h2 className="text-white text-xl md:text-2xl font-black leading-snug">
                            {current.title}
                        </h2>
                        <p className="text-neutral-400 text-sm mt-2 leading-relaxed max-w-2xl">
                            {current.description}
                        </p>
                    </div>

                    {/* Mark watched toggle */}
                    <button
                        onClick={onMarkWatched}
                        className={cn(
                            "shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all duration-200",
                            currentWatched
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:border-white/10",
                        )}
                    >
                        {currentWatched
                            ? <CheckCircle2 className="w-3.5 h-3.5" />
                            : <Circle className="w-3.5 h-3.5" />
                        }
                        {currentWatched ? "Visto" : "Marcar"}
                    </button>
                </div>
            </div>

            {/* ── Stream Sources ───────────────────────────────── */}
            <section className="px-6 md:px-10 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-1 h-4 rounded-full bg-orange-500" />
                    <h3 className="text-xs font-black uppercase tracking-[0.18em] text-neutral-300">
                        Fuentes Disponibles
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-black border border-orange-500/20">
                        {sources.length}
                    </span>
                </div>

                <div className="flex flex-col gap-2">
                    {sources.map((src) => (
                        <StreamSourceCard
                            key={src.id}
                            source={src}
                            onPlay={onPlaySource}
                        />
                    ))}
                </div>
            </section>

            {/* ── Episode selector ─────────────────────────────── */}
            <section className="px-6 md:px-10 pt-4 pb-10">
                {/* Collapsible header */}
                <button
                    onClick={() => setEpisodesOpen((v) => !v)}
                    className="w-full flex items-center gap-3 mb-3 group"
                >
                    <span className="w-1 h-4 rounded-full bg-white/10 group-hover:bg-orange-500 transition-colors" />
                    <h3 className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500 group-hover:text-neutral-300 transition-colors flex-1 text-left">
                        Episodios de la Saga
                    </h3>
                    <ChevronDown
                        className={cn(
                            "w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-all duration-200",
                            episodesOpen ? "rotate-180" : "",
                        )}
                    />
                </button>

                {/* Episode list */}
                <div
                    className={cn(
                        "flex flex-col gap-1 overflow-hidden transition-all duration-300",
                        episodesOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0",
                    )}
                >
                    {episodes.map((ep, idx) => (
                        <EpisodeRow
                            key={ep.id}
                            episode={ep}
                            isActive={idx === currentIndex}
                            isWatched={isWatched(ep.id)}
                            onSelect={() => onSelectEpisode(idx)}
                        />
                    ))}
                </div>
            </section>
        </main>
    )
}

// ─── Detail Page ──────────────────────────────────────────────────────────────

function DetailPage() {
    const { seriesId, sagaId } = Route.useParams()
    const navigate = useNavigate()
    const { isWatched, markWatched, unmarkWatched } = useProgressStore((s: any) => s)

    const series = dbzData.find((s) => s.id === seriesId)
    const saga = series?.sagas.find((s) => s.id === sagaId)

    const [currentIdx, setCurrentIdx] = useState(0)

    const currentEpisode = saga?.episodes[currentIdx]

    const sources = useMemo(
        () => [] as StreamSource[],
        [currentEpisode?.id],
    )

    if (!series || !saga || saga.episodes.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white bg-neutral-950">
                Contenido no encontrado
            </div>
        )
    }

    const handlePlaySource = (src: StreamSource) => {
        // TODO: trigger actual player with source URL
        console.info("[KameHouse] Play", src)
    }

    const handleMarkWatched = () => {
        if (!currentEpisode) return
        if (isWatched(currentEpisode.id)) unmarkWatched(currentEpisode.id)
        else markWatched(currentEpisode.id)
    }

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-neutral-950">
            {/* ── Left: Poster + Metadata (30%) ── */}
            <LeftPanel
                posterUrl={saga.image}
                title={series.title}
                synopsis={saga.description}
                year={series.year}
                episodesCount={series.episodesCount}
                sagaTitle={saga.title}
                onBack={() => navigate({ to: "/series/$seriesId", params: { seriesId: series.id } })}
            />

            {/* ── Right: Episodes + Streams (70%) ── */}
            <RightPanel
                episodes={saga.episodes}
                currentIndex={currentIdx}
                onSelectEpisode={setCurrentIdx}
                isWatched={isWatched}
                onMarkWatched={handleMarkWatched}
                currentWatched={currentEpisode ? isWatched(currentEpisode.id) : false}
                sources={sources}
                onPlaySource={handlePlaySource}
            />
        </div>
    )
}
