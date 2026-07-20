import * as React from "react"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import type { EpisodeSource } from "@/api/types/unified.types"

interface QualitySettingsProps {
    sources: EpisodeSource[]
    currentSourceUrl?: string
    onSourceChange: (source: EpisodeSource) => void
}

export function QualitySettings({
    sources,
    currentSourceUrl,
    onSourceChange,
}: QualitySettingsProps) {
    return (
        <div className="flex flex-col">
            {sources.map((source, idx) => {
                const isActive = source.url === currentSourceUrl
                return (
                    <button
                        key={idx}
                        onClick={() => onSourceChange(source)}
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
                                {source.quality || "Original"}
                            </span>
                            <span className={cn(
                                "text-label-sm font-bold mt-1.5 uppercase transition-colors duration-base",
                                isActive ? "text-white/60" : "text-zinc-500 group-hover:text-zinc-400"
                            )}>
                                {source.type === 'local' ? "Local" : "Provider"}
                            </span>
                        </div>
                        {isActive && <Icons.ui.check className="w-3.5 h-3.5 text-brand-accent" />}
                    </button>
                )
            })}
        </div>
    )
}
