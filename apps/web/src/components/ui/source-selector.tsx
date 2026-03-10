import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/components/ui/core/styling"
import {
    FaPlay,
    FaHdd,
    FaGlobe,
    FaSeedling,
} from "react-icons/fa"
import {
    HiSparkles,
    HiOutlineAdjustmentsHorizontal,
} from "react-icons/hi2"
import { MdSignalCellularAlt } from "react-icons/md"
import { TbDatabaseSearch } from "react-icons/tb"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type StreamSourceType = "local" | "torrentio" | "direct"

/**
 * Quality tiers used for badge colouring and sort ordering.
 * Extend this union if you add a new quality group.
 */
export type StreamQuality =
    | "4K HDR"
    | "4K"
    | "1080p"
    | "720p"
    | "480p"
    | "360p"
    | "Auto"
    | "unknown"

/**
 * Canonical stream source — passed in from the parent page.
 *
 * For **local** sources, populate `size`, `codec`, and `audio`.
 * For **torrentio** sources, populate `seeders` and `releaseGroup`.
 */
export interface StreamSource {
    /** Unique key for React reconciliation. */
    id: string
    /** Where the stream originates. */
    type: StreamSourceType
    /**
     * Human-readable label.
     * Local  → filename,  e.g. "SubsPlease - Bleach - 01 (1080p).mkv"
     * Torrentio → title,  e.g. "SubsPlease | Bleach TYBW - 01 [1080p]"
     */
    label: string
    /** Parsed quality tier. */
    quality: StreamQuality
    /** File size string, e.g. "1.4 GB" (local / torrentio). */
    size?: string
    /** Audio language / track note, e.g. "Japonés + Sub ES". */
    audio?: string
    /** Video codec hint, e.g. "HEVC", "x264", "AV1". */
    codec?: string
    /**
     * Number of active seeders (torrentio only).
     * Use –1 to indicate "unknown".
     */
    seeders?: number
    /**
     * Release group name, e.g. "SubsPlease", "Erai-raws" (torrentio).
     * For local files this is usually omitted.
     */
    releaseGroup?: string
    /**
     * Ready-to-use magnet URI (torrentio only).
     * Passed as-is to the player / torrent client.
     */
    magnetUri?: string
    /**
     * Torrent infoHash (torrentio only).
     * Alternative to magnetUri for clients that build their own magnets.
     */
    infoHash?: string
    /**
     * File index inside the torrent batch (torrentio only).
     * Pass to the torrent client together with infoHash.
     */
    fileIdx?: number
}

export interface SourceSelectorProps {
    /** All available sources for the current episode. */
    sources: StreamSource[]
    /** Called when the user picks a source. */
    onSelectSource: (source: StreamSource) => void
    /**
     * Optional controlled state: which source (by id) is currently active.
     * If provided, the active card receives a distinct highlighted style.
     */
    activeSourceId?: string
    /** Extra classes for the outermost container. */
    className?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal look-up tables
// ─────────────────────────────────────────────────────────────────────────────

/** Tailwind classes for each quality badge. */
const qualityBadge: Record<StreamQuality, string> = {
    "4K HDR": "bg-amber-800/50 text-amber-300 ring-1 ring-amber-500/30",
    "4K":     "bg-orange-900/50 text-orange-400 ring-1 ring-orange-500/30",
    "1080p":  "bg-blue-900/50   text-blue-300   ring-1 ring-blue-500/30",
    "720p":   "bg-sky-900/50    text-sky-300    ring-1 ring-sky-500/20",
    "480p":   "bg-neutral-700   text-neutral-300",
    "360p":   "bg-neutral-800   text-neutral-400",
    "Auto":   "bg-purple-900/50 text-purple-300 ring-1 ring-purple-500/20",
    "unknown":"bg-neutral-800   text-neutral-500",
}

/** Sort rank — lower = displayed first. */
const qualityRank: Record<StreamQuality, number> = {
    "4K HDR": 0,
    "4K":     1,
    "1080p":  2,
    "720p":   3,
    "480p":   4,
    "360p":   5,
    "Auto":   6,
    "unknown":7,
}

type SourceConfig = {
    icon: React.ReactNode
    label: string
    accent: string
    /** Left border gradient shown on the active card. */
    activeBorder: string
    /** Glow applied to the card on hover / active. */
    glowClass: string
    /** Background tint of the icon bubble. */
    iconBg: string
    /** Play button colour set. */
    playBtn: string
}

const sourceConfig: Record<StreamSourceType, SourceConfig> = {
    local: {
        icon: <FaHdd className="w-[18px] h-[18px]" />,
        label: "Archivo Local",
        accent: "text-emerald-400",
        activeBorder: "border-l-emerald-500",
        glowClass: "hover:shadow-emerald-500/10",
        iconBg: "bg-emerald-500/10 group-hover:bg-emerald-500/15",
        playBtn:
            "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white",
    },
    torrentio: {
        icon: <FaGlobe className="w-[18px] h-[18px]" />,
        label: "Torrentio",
        accent: "text-orange-400",
        activeBorder: "border-l-orange-500",
        glowClass: "hover:shadow-orange-500/10",
        iconBg: "bg-orange-500/10 group-hover:bg-orange-500/15",
        playBtn:
            "bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white",
    },
    direct: {
        icon: <MdSignalCellularAlt className="w-[18px] h-[18px]" />,
        label: "Directo",
        accent: "text-sky-400",
        activeBorder: "border-l-sky-500",
        glowClass: "hover:shadow-sky-500/10",
        iconBg: "bg-sky-500/10 group-hover:bg-sky-500/15",
        playBtn:
            "bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white",
    },
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter types
// ─────────────────────────────────────────────────────────────────────────────

type FilterTab = "all" | StreamSourceType

const filterTabs: { id: FilterTab; label: string }[] = [
    { id: "all",        label: "Todas" },
    { id: "local",      label: "Local" },
    { id: "torrentio",  label: "Torrentio" },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helper: seeder colour
// ─────────────────────────────────────────────────────────────────────────────

function seederColor(n: number): string {
    if (n >= 100) return "text-emerald-400"
    if (n >= 30)  return "text-yellow-400"
    if (n >= 5)   return "text-orange-400"
    return "text-red-400"
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual card
// ─────────────────────────────────────────────────────────────────────────────

interface SourceCardProps {
    source: StreamSource
    isActive: boolean
    onSelect: (source: StreamSource) => void
    index: number
}

function SourceCard({ source, isActive, onSelect, index }: SourceCardProps) {
    const cfg = sourceConfig[source.type]

    return (
        <motion.div
            key={source.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
            onClick={() => onSelect(source)}
            className={cn(
                // Base layout
                "group relative flex items-center gap-4 p-4 cursor-pointer",
                "rounded-xl border-l-2 border-t border-r border-b",
                "border-t-white/5 border-r-white/5 border-b-white/5",
                // Glassmorphism background
                "bg-neutral-900/60 backdrop-blur-sm",
                // Hover
                "hover:bg-neutral-800/70 hover:border-t-white/10",
                "hover:shadow-lg",
                cfg.glowClass,
                "transition-all duration-200",
                // Active state
                isActive
                    ? cn(
                          cfg.activeBorder,
                          "bg-neutral-800/80 shadow-lg",
                          "border-t-white/10 border-r-white/10 border-b-white/10",
                      )
                    : "border-l-transparent",
            )}
        >
            {/* Active glow strip */}
            {isActive && (
                <motion.div
                    layoutId="active-strip"
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-current opacity-80"
                    style={{ color: "inherit" }}
                />
            )}

            {/* Source type icon bubble */}
            <div
                className={cn(
                    "relative shrink-0 flex items-center justify-center",
                    "w-11 h-11 rounded-xl",
                    "transition-colors duration-200",
                    cfg.iconBg,
                    cfg.accent,
                )}
            >
                {cfg.icon}
                {source.type === "torrentio" && source.quality.startsWith("4K") && (
                    <span className="absolute -top-1 -right-1 text-amber-400">
                        <HiSparkles className="w-3.5 h-3.5" />
                    </span>
                )}
            </div>

            {/* ── Main content ── */}
            <div className="flex-1 min-w-0">
                {/* Row 1: source type + quality badge */}
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                        className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            cfg.accent,
                        )}
                    >
                        {cfg.label}
                    </span>

                    {/* Release group pill */}
                    {source.releaseGroup && (
                        <span className="text-[10px] font-semibold text-neutral-400 bg-white/5 px-1.5 py-0.5 rounded">
                            {source.releaseGroup}
                        </span>
                    )}

                    {/* Quality badge */}
                    <span
                        className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                            qualityBadge[source.quality] ?? qualityBadge.unknown,
                        )}
                    >
                        {source.quality}
                    </span>
                </div>

                {/* Row 2: label / filename */}
                <p className="text-sm font-medium text-neutral-200 truncate leading-tight">
                    {source.label}
                </p>

                {/* Row 3: metadata pills */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {/* File size */}
                    {source.size && (
                        <span className="flex items-center gap-1 text-[11px] text-neutral-500 font-medium">
                            <TbDatabaseSearch className="w-3 h-3" />
                            {source.size}
                        </span>
                    )}

                    {/* Codec */}
                    {source.codec && (
                        <>
                            <span className="text-neutral-700 text-[10px]">•</span>
                            <span className="text-[11px] text-neutral-600 font-mono">
                                {source.codec}
                            </span>
                        </>
                    )}

                    {/* Audio */}
                    {source.audio && (
                        <>
                            <span className="text-neutral-700 text-[10px]">•</span>
                            <span className="text-[11px] text-neutral-500">{source.audio}</span>
                        </>
                    )}

                    {/* Seeders (torrentio) */}
                    {source.type === "torrentio" &&
                        source.seeders !== undefined &&
                        source.seeders >= 0 && (
                            <>
                                <span className="text-neutral-700 text-[10px]">•</span>
                                <span
                                    className={cn(
                                        "flex items-center gap-1 text-[11px] font-semibold",
                                        seederColor(source.seeders),
                                    )}
                                >
                                    <FaSeedling className="w-2.5 h-2.5" />
                                    {source.seeders}
                                </span>
                            </>
                        )}
                </div>
            </div>

            {/* ── Play button ── */}
            <button
                type="button"
                aria-label={`Reproducir ${source.label}`}
                className={cn(
                    "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl",
                    "text-xs font-black uppercase tracking-wider",
                    "transition-all duration-200",
                    "group-hover:scale-105 active:scale-95",
                    cfg.playBtn,
                )}
                onClick={(e) => {
                    e.stopPropagation()
                    onSelect(source)
                }}
            >
                <FaPlay className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Reproducir</span>
            </button>
        </motion.div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section header (Local / Torrentio)
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
    type: StreamSourceType
    count: number
}

function SectionHeader({ type, count }: SectionHeaderProps) {
    const cfg = sourceConfig[type]
    return (
        <div className="flex items-center gap-2 mb-2 mt-1">
            <span className={cn("w-4 h-4 shrink-0", cfg.accent)}>{cfg.icon}</span>
            <span className={cn("text-xs font-black uppercase tracking-widest", cfg.accent)}>
                {cfg.label}
            </span>
            <span className="text-xs text-neutral-600 font-medium">({count})</span>
            <div className="flex-1 h-px bg-white/5" />
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 py-14 text-center"
        >
            <TbDatabaseSearch className="w-10 h-10 text-neutral-700" />
            <p className="text-sm text-neutral-500 font-medium">
                No hay fuentes disponibles para este episodio.
            </p>
            <p className="text-xs text-neutral-600">
                Intenta cambiar el filtro o recargar la página.
            </p>
        </motion.div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SourceSelector — main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SourceSelector
 *
 * Displays all available stream sources for an episode grouped by type
 * (Local Files first, then Torrentio streams).
 *
 * Features:
 * • Glassmorphism cards with smooth framer-motion enter/exit animations
 * • Filter tabs: All / Local / Torrentio
 * • Quality-sorted within each group (4K HDR → 4K → 1080p → …)
 * • Active source highlighted with a coloured left border accent
 * • Seeder count colour-coded: green (100+), yellow (30–99), orange (5–29), red (<5)
 * • Responsive play button: icon-only on mobile, icon+label on sm+
 *
 * @example
 * ```tsx
 * <SourceSelector
 *   sources={episodeSources}
 *   onSelectSource={(src) => startStream(src)}
 *   activeSourceId={currentSource?.id}
 * />
 * ```
 */
export function SourceSelector({
    sources,
    onSelectSource,
    activeSourceId,
    className,
}: SourceSelectorProps) {
    const [activeFilter, setActiveFilter] = React.useState<FilterTab>("all")

    // Derive visible sources from the active filter
    const filtered = React.useMemo(() => {
        const base =
            activeFilter === "all"
                ? sources
                : sources.filter((s) => s.type === activeFilter)

        // Sort within each type: by quality rank, then by seeders desc
        return [...base].sort((a, b) => {
            const qA = qualityRank[a.quality] ?? 99
            const qB = qualityRank[b.quality] ?? 99
            if (qA !== qB) return qA - qB
            // secondary: higher seeders first (torrentio)
            return (b.seeders ?? 0) - (a.seeders ?? 0)
        })
    }, [sources, activeFilter])

    // Group for section headers
    const localSources     = filtered.filter((s) => s.type === "local")
    const torrentioSources = filtered.filter((s) => s.type === "torrentio")
    const directSources    = filtered.filter((s) => s.type === "direct")
    const showGroups       = activeFilter === "all"

    // Count helpers for filter labels
    const countForTab = (tab: FilterTab) =>
        tab === "all"
            ? sources.length
            : sources.filter((s) => s.type === tab).length

    return (
        <div className={cn("flex flex-col gap-4", className)}>
            {/* ── Header row ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <HiOutlineAdjustmentsHorizontal className="w-5 h-5 text-neutral-400" />
                    <h2 className="text-sm font-bold text-white tracking-wide">
                        Seleccionar Fuente
                    </h2>
                    <span className="text-xs text-neutral-500 font-medium">
                        ({sources.length})
                    </span>
                </div>

                {/* ── Filter tabs ─── */}
                <div
                    role="tablist"
                    aria-label="Filtrar fuentes"
                    className="flex items-center gap-1 bg-white/5 p-1 rounded-lg"
                >
                    {filterTabs.map((tab) => {
                        const count = countForTab(tab.id)
                        if (count === 0 && tab.id !== "all") return null
                        const isActive = activeFilter === tab.id
                        return (
                            <motion.button
                                key={tab.id}
                                role="tab"
                                aria-selected={isActive}
                                type="button"
                                layout
                                onClick={() => setActiveFilter(tab.id)}
                                className={cn(
                                    "relative px-3 py-1 text-[11px] font-black uppercase tracking-widest",
                                    "rounded-md transition-colors duration-150",
                                    isActive
                                        ? "text-white"
                                        : "text-neutral-500 hover:text-neutral-300",
                                )}
                            >
                                {isActive && (
                                    <motion.span
                                        layoutId="filter-pill"
                                        className="absolute inset-0 rounded-md bg-white/10"
                                        transition={{ type: "spring", bounce: 0.25, duration: 0.35 }}
                                    />
                                )}
                                <span className="relative z-10">
                                    {tab.label}
                                    <span
                                        className={cn(
                                            "ml-1.5 text-[9px] font-bold",
                                            isActive ? "text-neutral-400" : "text-neutral-600",
                                        )}
                                    >
                                        {count}
                                    </span>
                                </span>
                            </motion.button>
                        )
                    })}
                </div>
            </div>

            {/* ── Source list ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-2">
                <AnimatePresence mode="wait">
                    {filtered.length === 0 ? (
                        <EmptyState key="empty" />
                    ) : (
                        <motion.div
                            key={activeFilter}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col gap-2"
                        >
                            {/* Local group */}
                            {showGroups && localSources.length > 0 && (
                                <SectionHeader type="local" count={localSources.length} />
                            )}
                            {(showGroups ? localSources : filtered.filter((s) => s.type === "local")).map(
                                (src, i) => (
                                    <SourceCard
                                        key={src.id}
                                        source={src}
                                        isActive={src.id === activeSourceId}
                                        onSelect={onSelectSource}
                                        index={i}
                                    />
                                ),
                            )}

                            {/* Direct group */}
                            {showGroups && directSources.length > 0 && (
                                <>
                                    <SectionHeader type="direct" count={directSources.length} />
                                    {directSources.map((src, i) => (
                                        <SourceCard
                                            key={src.id}
                                            source={src}
                                            isActive={src.id === activeSourceId}
                                            onSelect={onSelectSource}
                                            index={localSources.length + i}
                                        />
                                    ))}
                                </>
                            )}

                            {/* Torrentio group */}
                            {showGroups && torrentioSources.length > 0 && (
                                <SectionHeader type="torrentio" count={torrentioSources.length} />
                            )}
                            {(showGroups
                                ? torrentioSources
                                : filtered.filter((s) => s.type === "torrentio")
                            ).map((src, i) => (
                                <SourceCard
                                    key={src.id}
                                    source={src}
                                    isActive={src.id === activeSourceId}
                                    onSelect={onSelectSource}
                                    index={localSources.length + directSources.length + i}
                                />
                            ))}

                            {/* Non-grouped pass-through for active filter ≠ all */}
                            {!showGroups &&
                                filtered
                                    .filter(
                                        (s) =>
                                            s.type !== "local" &&
                                            s.type !== "torrentio" &&
                                            s.type !== "direct",
                                    )
                                    .map((src, i) => (
                                        <SourceCard
                                            key={src.id}
                                            source={src}
                                            isActive={src.id === activeSourceId}
                                            onSelect={onSelectSource}
                                            index={i}
                                        />
                                    ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

