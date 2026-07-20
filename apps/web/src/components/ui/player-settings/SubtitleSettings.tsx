import * as React from "react"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import type { SubtitleTrack } from "../track-types"

interface SubtitleSettingsProps {
    subtitleTracks: SubtitleTrack[]
    activeSubtitleIndex: number | null
    onSelectSubtitle: (track: SubtitleTrack | null, opts?: { auto?: boolean }) => void
    subtitleSize?: number
    onSubtitleSizeChange?: (size: number) => void
    getFriendlyLanguage: (lang: string) => string
}

export function SubtitleSettings({
    subtitleTracks,
    activeSubtitleIndex,
    onSelectSubtitle,
    subtitleSize = 100,
    onSubtitleSizeChange,
    getFriendlyLanguage,
}: SubtitleSettingsProps) {

    return (
        <div className="flex flex-col">
            {/* Subtitle size control */}
            {onSubtitleSizeChange && (
                <div className="px-4 py-3 border-b border-white/5 mb-1">
                    <div className="text-label-sm font-black text-zinc-500 uppercase tracking-widest mb-3">Tamaño de subtítulos</div>
                    <div className="flex items-center justify-between gap-3">
                        <button
                            onClick={() => onSubtitleSizeChange(Math.max(50, subtitleSize - 10))}
                            disabled={subtitleSize <= 50}
                            className="flex items-center justify-center w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-all"
                        >
                            <Icons.ui.minus className="w-4 h-4" />
                        </button>
                        <div className="flex-1 flex flex-col items-center gap-1.5">
                            <span className="text-sm font-bold text-white tabular-nums">{subtitleSize}%</span>
                            <div className="w-full h-1.5 bg-white/10 rounded-full relative">
                                <div
                                    className="absolute left-0 h-full bg-white rounded-full transition-all"
                                    style={{ width: `${((subtitleSize - 50) / 150) * 100}%` }}
                                />
                                <input
                                    type="range" min={50} max={200} step={10}
                                    value={subtitleSize}
                                    onChange={(e) => onSubtitleSizeChange(Number(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => onSubtitleSizeChange(Math.min(200, subtitleSize + 10))}
                            disabled={subtitleSize >= 200}
                            className="flex items-center justify-center w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-all"
                        >
                            <Icons.ui.plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Track list */}
            <button
                onClick={() => onSelectSubtitle(null)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-3 transition-all duration-base ease-out group text-left relative overflow-hidden",
                    activeSubtitleIndex === null ? "bg-white/[0.04] text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                )}
            >
                {/* Hover/Active left-edge accent indicator */}
                <span className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] transition-all duration-base ease-out rounded-r-md",
                    activeSubtitleIndex === null ? "h-1/2 bg-brand-accent" : "h-0 bg-zinc-500 group-hover:h-1/3"
                )} />

                <span className={cn(
                    "text-xs font-bold uppercase tracking-widest transition-colors duration-base group-hover:translate-x-1.5",
                    activeSubtitleIndex === null ? "text-brand-accent" : "text-zinc-300 group-hover:text-white"
                )}>
                    Desactivado
                </span>
                {activeSubtitleIndex === null && <Icons.ui.check className="w-4 h-4 text-brand-accent" />}
            </button>

            {subtitleTracks.map((track) => {
                const isActive = track.index === activeSubtitleIndex
                return (
                    <button
                        key={track.index}
                        onClick={() => onSelectSubtitle(track)}
                        className={cn(
                            "w-full flex items-center justify-between px-4 py-3 transition-all duration-base ease-out group text-left relative overflow-hidden",
                            isActive ? "bg-white/[0.04] text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        {/* Hover/Active left-edge accent indicator */}
                        <span className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] transition-all duration-base ease-out rounded-r-md",
                            isActive ? "h-1/2 bg-brand-accent" : "h-0 bg-zinc-500 group-hover:h-1/3"
                        )} />

                        <div className="flex flex-col group-hover:translate-x-1.5 transition-transform duration-base ease-out">
                            <span className={cn(
                                "text-xs font-bold leading-none transition-colors duration-base",
                                isActive ? "text-brand-accent" : "text-zinc-300 group-hover:text-white"
                            )}>
                                {track.title || getFriendlyLanguage(track.language)}
                            </span>
                            <span className={cn(
                                "text-label-sm font-bold mt-1.5 uppercase transition-colors duration-base",
                                isActive ? "text-white/60" : "text-zinc-500 group-hover:text-zinc-400"
                            )}>
                                {[track.codec?.toUpperCase(), track.forced ? "FORZADO" : undefined].filter(Boolean).join(" // ")}
                            </span>
                        </div>
                        {isActive && <Icons.ui.check className="w-4 h-4 text-brand-accent" />}
                    </button>
                )
            })}
        </div>
    )
}
