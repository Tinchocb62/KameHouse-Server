/**
 * EpisodeList — Saga/Season navigation + episode grid for the Media Details page.
 *
 * ─── Component hierarchy ──────────────────────────────────────────────────────
 *
 *  <EpisodeList>
 *    ├─ <SagaTabs>          horizontal pill tabs, one per Saga
 *    └─ <EpisodeGrid>       responsive episode cards for the active Saga
 *         └─ <EpisodeCard>  thumbnail + number + title + synopsis + runtime
 *
 * ─── Data contract ────────────────────────────────────────────────────────────
 *
 *  interface Saga     { id, title, episodes[] }
 *  interface Episode  { id, number, title, synopsis, durationMin, thumbnailUrl? }
 *
 * ─── Design ───────────────────────────────────────────────────────────────────
 * • Strictly dark-mode zinc palette — no orange.
 * • Stremio/Netflix-style horizontal list of episode rows.
 * • Active saga: white pill underline (same active style as the sidebar).
 * • Hover row: bg-zinc-800/70, subtle scale on thumbnail.
 * • Thumbnail fallback: zinc placeholder with episode number.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as React from "react"
import { cn } from "@/components/ui/core/styling"
import { FaPlay } from "react-icons/fa"
import { BsClock } from "react-icons/bs"
import { Star, Folder, Zap, Layers } from "lucide-react"
import { useEpisodeSources, usePrefetchEpisodeSources } from "@/api/hooks/useEpisodeSources"
import { useWindowVirtualizer } from "@tanstack/react-virtual"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Episode {
    /** Unique identifier (used as React key and for callbacks). */
    id: string | number
    /** 1-based episode number within the saga. */
    number: number
    /** Display title, e.g. "The Arrival". */
    title: string
    /** Short synopsis — clamped to 2 lines in the UI. */
    synopsis?: string
    /** Runtime in minutes, e.g. 24. */
    durationMin?: number
    /**
     * Absolute URL of the episode thumbnail/still frame.
     * Falls back to a zinc placeholder with the episode number when absent or broken.
     */
    thumbnailUrl?: string
    /**
     * Optional: air date string, e.g. "2024-01-13".
     * Displayed as subtitle next to the runtime when present.
     */
    airDate?: string
    /** True when the user has fully watched this episode. */
    watched?: boolean
    /** True if this is an epic or highly rated episode. */
    isEpic?: boolean
    /** True if this episode is filler content. */
    isFiller?: boolean
    /** True if a local media file is available. False implies cloud/stremio. */
    hasLocalFile?: boolean
    /**
     * AniList media ID — required to resolve sources from the unified engine.
     * When provided, the card fetches `EpisodeSourcesResponse` and renders
     * dynamic source badges (LOCAL / STREAM / LOCAL+STREAM).
     */
    mediaId?: number
}

export interface Saga {
    /** Unique identifier used as a React key and tab value. */
    id: string | number
    /**
     * Display name, e.g. "Saga del Agente del Miedo" or "Temporada 1".
     */
    title: string
    episodes: Episode[]
}

export interface EpisodeListProps {
    sagas: Saga[]
    /**
     * Optional: id of the saga that should be shown on first render.
     * Defaults to the first saga.
     */
    defaultSagaId?: string | number
    /**
     * Called when the user clicks the play button on an episode card.
     */
    onPlayEpisode?: (episode: Episode, saga: Saga) => void
    /** Extra classes for the root container. */
    className?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// EpisodeThumbnail — image with zinc fallback
// ─────────────────────────────────────────────────────────────────────────────

interface EpisodeThumbnailProps {
    url?: string
    episodeNumber: number
    title: string
}

function EpisodeThumbnail({ url, episodeNumber, title }: EpisodeThumbnailProps) {
    const [broken, setBroken] = React.useState(false)
    const showFallback = !url || broken

    return (
        <div
            className={cn(
                "relative shrink-0 overflow-hidden rounded-xl border border-white/5",
                // Extra-wide 16:9 for a true cinematic row experience
                "w-[160px] h-[90px] md:w-[220px] md:h-[124px] lg:w-[260px] lg:h-[146px]",
                "bg-zinc-900",
            )}
        >
            {showFallback ? (
                // ── Zinc placeholder ──
                <div className="w-full h-full flex items-center justify-center">
                    <span className="text-zinc-500 text-xl font-black tabular-nums select-none">
                        {episodeNumber}
                    </span>
                </div>
            ) : (
                <img
                    src={url}
                    alt={title}
                    loading="lazy"
                    draggable={false}
                    onError={() => setBroken(true)}
                    className={cn(
                        "w-full h-full object-cover select-none",
                        "transition-transform duration-300 ease-out",
                        "group-hover:scale-105",
                    )}
                />
            )}

            {/*
             * Subtle dark vignette on the thumbnail so the number badge
             * is always readable regardless of the image content.
             */}
            {!showFallback && (
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/50 to-transparent" />
            )}

            {/* Play icon — appears on row hover */}
            <div
                className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    "opacity-0 group-hover:opacity-100",
                    "transition-opacity duration-200",
                )}
            >
                <div
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        "bg-white/10 backdrop-blur-md border border-white/20",
                        "shadow-[0_0_20px_rgba(0,0,0,0.5)]",
                        "scale-75 group-hover:scale-100",
                        "transition-all duration-300 ease-out",
                    )}
                >
                    <FaPlay className="w-3 h-3 text-white ml-1" />
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SourceBadge — dynamic source availability indicator
// ─────────────────────────────────────────────────────────────────────────────

interface SourceBadgeProps {
    hasLocal: boolean
    hasStream: boolean
}

/**
 * Renders one of three badge variants based on resolved source availability:
 * ● Both local + stream → amber "LOCAL + STREAM"
 * ● Only local         → green  "LOCAL"
 * ● Only stream        → blue   "STREAM"
 * ● Neither            → null
 */
function SourceBadge({ hasLocal, hasStream }: SourceBadgeProps) {
    if (!hasLocal && !hasStream) return null

    if (hasLocal && hasStream) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-wide bg-amber-500/10 text-amber-400">
                <Layers className="w-3 h-3" />
                <span>LOCAL + STREAM</span>
            </div>
        )
    }

    if (hasLocal) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-wide bg-green-500/10 text-green-400">
                <Folder className="w-3 h-3" />
                <span>LOCAL</span>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-wide bg-blue-500/10 text-blue-400">
            <Zap className="w-3 h-3 fill-current" />
            <span>STREAM</span>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// EpisodeGrid — windowed episode list using window scroll
// ─────────────────────────────────────────────────────────────────────────────

interface EpisodeGridProps {
    episodes: Episode[]
    saga: Saga
    onPlay?: (episode: Episode, saga: Saga) => void
}

function EpisodeGrid({ episodes, saga, onPlay }: EpisodeGridProps) {
    const listRef = React.useRef<HTMLUListElement>(null)

    const virtualizer = useWindowVirtualizer({
        count: episodes.length,
        // Estimated row height: lg thumbnail height (146px) + padding. 
        // Auto-corrects via measureElement.
        estimateSize: () => 148,
        overscan: 5,
        scrollMargin: listRef.current?.offsetTop ?? 0,
    })

    const items = virtualizer.getVirtualItems()

    return (
        <ul
            ref={listRef}
            role="list"
            aria-label={`Episodios de ${saga.title}`}
            style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: "relative",
                width: "100%",
            }}
        >
            {items.map((virtualRow) => {
                const episode = episodes[virtualRow.index]
                if (!episode) return null

                return (
                    <li
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${
                                virtualRow.start - virtualizer.options.scrollMargin
                            }px)`,
                            contentVisibility: "auto",
                            containIntrinsicSize: "auto 148px",
                            paddingBottom: "4px"
                        }}
                    >
                        <EpisodeCardContent
                            episode={episode}
                            saga={saga}
                            onPlay={onPlay}
                        />
                    </li>
                )
            })}
        </ul>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// EpisodeCardContent — visual content for a virtualized row
// ─────────────────────────────────────────────────────────────────────────────

interface EpisodeCardProps {
    episode: Episode
    saga: Saga
    onPlay?: (episode: Episode, saga: Saga) => void
}

function EpisodeCardContent({ episode, saga, onPlay }: EpisodeCardProps) {
    const { isEpic, isFiller } = episode
    const prefetch = usePrefetchEpisodeSources()

    const { data: sourcesData } = useEpisodeSources(
        episode.mediaId ? { mediaId: episode.mediaId, epNum: episode.number } : null,
    )

    const { hasLocal, hasStream } = React.useMemo(() => {
        if (sourcesData) {
            return {
                hasLocal: sourcesData.sources.some((s) => s.type === "local"),
                hasStream: sourcesData.sources.some((s) => s.type === "torrentio"),
            }
        }
        return { hasLocal: !!episode.hasLocalFile, hasStream: !episode.hasLocalFile && episode.hasLocalFile !== undefined }
    }, [sourcesData, episode.hasLocalFile])

    const handleMouseEnter = React.useCallback(() => {
        if (episode.mediaId) {
            prefetch({ mediaId: episode.mediaId, epNum: episode.number })
        }
    }, [episode.mediaId, episode.number, prefetch])

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onPlay?.(episode, saga)}
            onKeyDown={(e) => e.key === "Enter" && onPlay?.(episode, saga)}
            onMouseEnter={handleMouseEnter}
            className={cn(
                "group flex items-start lg:items-center gap-4 md:gap-6 p-3 lg:p-4 rounded-2xl cursor-pointer",
                "transition-all duration-300 active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                "hover:bg-zinc-800/40 hover:backdrop-blur-xl border border-transparent hover:border-white/5",
                "hover:shadow-2xl hover:-translate-y-0.5",
                isEpic && "border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.05)] hover:shadow-[0_0_30px_rgba(234,179,8,0.15)]",
                isFiller && "opacity-50 grayscale hover:grayscale-0 hover:opacity-100",
                !isEpic && "active:bg-zinc-800/60"
            )}
        >
            <EpisodeThumbnail
                url={episode.thumbnailUrl}
                episodeNumber={episode.number}
                title={episode.title}
            />

            <div className="flex flex-col gap-1 min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline gap-2 flex-wrap pb-1">
                    <span className={cn(
                        "text-xs font-black tabular-nums shrink-0",
                        isEpic ? "text-yellow-500" : "text-zinc-500"
                    )}>
                        {episode.number}.
                    </span>
                    <h3 className={cn(
                        "text-sm md:text-base font-semibold leading-snug line-clamp-1 transition-colors",
                        isEpic ? "text-yellow-100 group-hover:text-yellow-50" : "text-zinc-200 group-hover:text-white"
                    )}>
                        {episode.title}
                    </h3>

                    {isEpic && (
                        <span className="inline-flex items-center text-yellow-500 shrink-0 ml-1" title="Episodio Épico">
                            <Star className="w-3.5 h-3.5 fill-current" />
                        </span>
                    )}
                    {isFiller && (
                        <span className="inline-flex items-center text-zinc-400 shrink-0 ml-1" title="Episodio de Relleno">
                            (Relleno)
                        </span>
                    )}
                </div>

                {episode.synopsis && (
                    <p className="text-zinc-400 text-xs md:text-sm leading-relaxed line-clamp-2 mt-1">
                        {episode.synopsis}
                    </p>
                )}

                {(episode.durationMin !== undefined || episode.airDate) && (
                    <div className="flex items-center gap-2 mt-0.5">
                        {episode.durationMin !== undefined && (
                            <span className="flex items-center gap-1 text-zinc-500 text-xs font-medium">
                                <BsClock className="w-2.5 h-2.5" />
                                {episode.durationMin}m
                            </span>
                        )}
                        {episode.airDate && episode.durationMin !== undefined && (
                            <span className="text-zinc-700 text-[10px]">·</span>
                        )}
                        {episode.airDate && (
                            <span className="text-zinc-600 text-xs">{episode.airDate}</span>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between mt-2">
                    <div>
                        {episode.watched && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-white/10 text-zinc-400">
                                Visto
                            </span>
                        )}
                    </div>
                    <SourceBadge hasLocal={hasLocal} hasStream={hasStream} />
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SagaTabs — horizontal saga selector
// ─────────────────────────────────────────────────────────────────────────────

interface SagaTabsProps {
    sagas: Saga[]
    activeSagaId: string | number
    onSelect: (id: string | number) => void
}

function SagaTabs({ sagas, activeSagaId, onSelect }: SagaTabsProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null)

    return (
        <div
            ref={scrollRef}
            role="tablist"
            aria-label="Seleccionar Saga"
            className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1"
        >
            {sagas.map((saga) => {
                const isActive = saga.id === activeSagaId
                return (
                    <button
                        key={saga.id}
                        role="tab"
                        type="button"
                        aria-selected={isActive}
                        onClick={() => onSelect(saga.id)}
                        className={cn(
                            "relative shrink-0 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap",
                            "transition-all duration-200 ease-out",
                            isActive
                                ? "text-white bg-zinc-800"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                        )}
                    >
                        {isActive && (
                            <span
                                aria-hidden
                                className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-white"
                            />
                        )}
                        {saga.title}
                        <span
                            className={cn(
                                "ml-1.5 text-[10px] font-bold tabular-nums",
                                isActive ? "text-zinc-400" : "text-zinc-600",
                            )}
                        >
                            {saga.episodes.length}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// EpisodeList — main export
// ─────────────────────────────────────────────────────────────────────────────

export function EpisodeList({
    sagas,
    defaultSagaId,
    onPlayEpisode,
    className,
}: EpisodeListProps) {
    const [activeSagaId, setActiveSagaId] = React.useState<string | number>(
        defaultSagaId ?? sagas[0]?.id ?? "",
    )

    const activeSaga = sagas.find((s) => s.id === activeSagaId) ?? sagas[0]

    if (!sagas.length) {
        return (
            <div className={cn("flex items-center justify-center py-16 text-zinc-600 text-sm", className)}>
                No hay episodios disponibles.
            </div>
        )
    }

    return (
        <div className={cn("flex flex-col gap-4", className)}>
            {sagas.length > 1 && (
                <SagaTabs
                    sagas={sagas}
                    activeSagaId={activeSagaId}
                    onSelect={(id) => {
                        window.scrollTo({ top: 0, behavior: "instant" })
                        setActiveSagaId(id)
                    }}
                />
            )}

            <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">
                    {activeSaga?.title}
                </h2>
                <span className="text-zinc-600 text-xs font-medium">
                    {activeSaga?.episodes.length ?? 0} episodios
                </span>
            </div>

            {activeSaga && (
                <EpisodeGrid
                    key={activeSaga.id}
                    episodes={activeSaga.episodes}
                    saga={activeSaga}
                    onPlay={onPlayEpisode}
                />
            )}
        </div>
    )
}

