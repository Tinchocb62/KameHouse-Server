import * as React from "react"
import { cn } from "@/components/ui/core/styling"
import { FaPlay, FaHdd, FaGlobe } from "react-icons/fa"
import { HiSparkles } from "react-icons/hi2"
import { MdSignalCellularAlt } from "react-icons/md"

// ─── Types ────────────────────────────────────────────────────────────────────

export type StreamSourceType = "local" | "torrentio" | "direct"

export type StreamQuality = "Auto" | "480p" | "720p" | "1080p" | "4K" | "4K HDR"

export interface StreamSource {
    id: string
    type: StreamSourceType
    label: string
    quality: StreamQuality
    /** Size or extra info, e.g. "2.4 GB", "Seeders: 142" */
    info?: string
    /** Audio/language note */
    audio?: string
    /** Codec hint, e.g. "AV1", "HEVC", "x264" */
    codec?: string
}

interface StreamSourceCardProps {
    source: StreamSource
    onPlay?: (source: StreamSource) => void
    className?: string
}

// ─── Quality badge colors ─────────────────────────────────────────────────────

const qualityColor: Record<StreamQuality, string> = {
    "Auto": "bg-purple-900/60 text-purple-300",
    "480p": "bg-neutral-700 text-neutral-300",
    "720p": "bg-sky-900/60 text-sky-300",
    "1080p": "bg-blue-900/60 text-blue-300",
    "4K": "bg-orange-900/60 text-orange-400",
    "4K HDR": "bg-amber-800/60 text-amber-300",
}

// ─── Source icon + colors ─────────────────────────────────────────────────────

const sourceConfig: Record<
    StreamSourceType,
    { icon: React.ReactNode; accent: string; label: string }
> = {
    local: {
        icon: <FaHdd className="w-4 h-4" />,
        accent: "text-emerald-400",
        label: "Local",
    },
    torrentio: {
        icon: <FaGlobe className="w-4 h-4" />,
        accent: "text-orange-400",
        label: "Torrentio",
    },
    direct: {
        icon: <MdSignalCellularAlt className="w-4 h-4" />,
        accent: "text-sky-400",
        label: "Directo",
    },
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * StreamSourceCard
 *
 * A single selectable stream source row in the Stremio-style right panel.
 * Shows source type icon, quality badge, file info and an action button.
 */
export function StreamSourceCard({ source, onPlay, className }: StreamSourceCardProps) {
    const cfg = sourceConfig[source.type]

    return (
        <div
            className={cn(
                // Base
                "group relative flex items-center gap-4 p-4",
                "rounded-xl border border-white/5 bg-neutral-900",
                // Hover
                "hover:border-white/10 hover:bg-neutral-800",
                "hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
                "transition-all duration-200 cursor-pointer",
                className,
            )}
            onClick={() => onPlay?.(source)}
        >
            {/* Source type icon */}
            <div
                className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                    "bg-white/5 group-hover:bg-white/8 transition-colors",
                    cfg.accent,
                )}
            >
                {cfg.icon}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
                {/* Top row: source label + quality badge */}
                <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn("text-xs font-black uppercase tracking-wider", cfg.accent)}>
                        {cfg.label}
                    </span>
                    <span
                        className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                            qualityColor[source.quality],
                        )}
                    >
                        {source.quality}
                    </span>
                    {source.quality.startsWith("4K") && (
                        <HiSparkles className="w-3 h-3 text-amber-400" />
                    )}
                </div>

                {/* Label (filename / source name) */}
                <p className="text-sm font-medium text-neutral-200 truncate leading-tight">
                    {source.label}
                </p>

                {/* Info row */}
                <div className="flex items-center gap-2 mt-0.5">
                    {source.info && (
                        <span className="text-[11px] text-neutral-500 font-medium">
                            {source.info}
                        </span>
                    )}
                    {source.audio && (
                        <>
                            <span className="text-neutral-700 text-[10px]">•</span>
                            <span className="text-[11px] text-neutral-500">{source.audio}</span>
                        </>
                    )}
                    {source.codec && (
                        <>
                            <span className="text-neutral-700 text-[10px]">•</span>
                            <span className="text-[11px] text-neutral-600 font-mono">{source.codec}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Play button (right side) */}
            <button
                className={cn(
                    "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg",
                    "text-xs font-black uppercase tracking-wider",
                    "transition-all duration-200",
                    source.type === "local"
                        ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                        : "bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white",
                    "group-hover:scale-105",
                )}
                onClick={(e) => {
                    e.stopPropagation()
                    onPlay?.(source)
                }}
            >
                <FaPlay className="w-2.5 h-2.5" />
                Reproducir
            </button>
        </div>
    )
}

