import * as React from "react"
import { cn } from "@/components/ui/core/styling"
import { Gauge, FastForward, Repeat, ChevronRight } from "lucide-react"

interface PlaybackSettingsProps {
    playbackRate: number
    onPlaybackRateChange: (rate: number) => void
    autoSkipIntro: boolean
    onAutoSkipIntroChange: (enabled: boolean) => void
    autoSkipOutro: boolean
    onAutoSkipOutroChange: (enabled: boolean) => void
    showHeatmap: boolean
    onShowHeatmapChange: (enabled: boolean) => void
    loopEnabled?: boolean
    onLoopEnabledChange?: (enabled: boolean) => void
    autoDisableSubtitlesWhenDubbed?: boolean
    onAutoDisableSubtitlesWhenDubbedChange?: (enabled: boolean) => void
    ambientModeEnabled?: boolean
    onAmbientModeEnabledChange?: (enabled: boolean) => void
    showSeparator?: boolean
    onAdjustSkipTimes?: () => void
    mediaFormat?: string | null
    tvMode?: boolean
    onTvModeChange?: (enabled: boolean) => void
    marathonMode?: boolean
    onMarathonModeChange?: (enabled: boolean) => void
}

function ToggleRow({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (v: boolean) => void }) {
    const handleToggle = () => {
        onChange(!enabled)
    }

    return (
        <button
            onClick={handleToggle}
            className={cn(
                "flex items-center justify-between w-full px-6 py-3 transition-all duration-300 ease-out group text-left relative overflow-hidden active:scale-[0.98]",
                enabled ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
        >
            {/* Hover visual accent indicator on the left edge */}
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 bg-brand-orange group-hover:h-1/2 transition-all duration-300 ease-out rounded-r-md" />

            <span className="text-[11px] font-black uppercase tracking-widest text-left group-hover:translate-x-1.5 transition-transform duration-300 ease-out">{label}</span>
            <div className={cn(
                "w-9 h-5 rounded-full relative transition-all duration-400 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] shrink-0 ml-4 border border-white/5",
                enabled ? "bg-brand-orange shadow-[0_0_12px_rgba(255,110,58,0.45)] border-brand-orange/30" : "bg-white/10"
            )}>
                <div className={cn(
                    "absolute top-[3px] w-3 h-3 rounded-full transition-all duration-400 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] shadow-sm",
                    enabled ? "left-[21px] bg-white scale-110" : "left-[3px] bg-zinc-400"
                )} />
            </div>
        </button>
    )
}

export function PlaybackSettings({
    playbackRate,
    onPlaybackRateChange,
    autoSkipIntro,
    onAutoSkipIntroChange,
    autoSkipOutro,
    onAutoSkipOutroChange,
    showHeatmap,
    onShowHeatmapChange,
    loopEnabled,
    onLoopEnabledChange,
    autoDisableSubtitlesWhenDubbed = true,
    onAutoDisableSubtitlesWhenDubbedChange = () => {},
    ambientModeEnabled = true,
    onAmbientModeEnabledChange = () => {},
    showSeparator = true,
    onAdjustSkipTimes,
    mediaFormat,
    tvMode,
    onTvModeChange,
    marathonMode,
    onMarathonModeChange,
}: PlaybackSettingsProps) {
    const isMovie = mediaFormat?.toUpperCase() === "MOVIE"

    return (
        <div className="py-4">
            {showSeparator && <div className="mx-6 h-px bg-white/10 mb-4" />}
            <ToggleRow label="Modo Ambiente (efecto de luz)" enabled={ambientModeEnabled} onChange={onAmbientModeEnabledChange} />
            <ToggleRow label="Mapa de Calor (timeline)" enabled={showHeatmap} onChange={onShowHeatmapChange} />
            {!isMovie && <ToggleRow label="Omitir Intro (automático)" enabled={autoSkipIntro} onChange={onAutoSkipIntroChange} />}
            {!isMovie && <ToggleRow label="Saltar Final (automático)" enabled={autoSkipOutro} onChange={onAutoSkipOutroChange} />}
            {onAdjustSkipTimes && (
                <button
                    onClick={onAdjustSkipTimes}
                    className="flex items-center justify-between w-full px-6 py-3 transition-all duration-300 ease-out group text-left relative overflow-hidden hover:bg-white/5 active:scale-[0.98] text-zinc-400 hover:text-white"
                >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 bg-brand-orange group-hover:h-1/2 transition-all duration-300 ease-out rounded-r-md" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-left group-hover:translate-x-1.5 transition-transform duration-300 ease-out">
                        Ajustar Skip Times
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors duration-300 mr-2" />
                </button>
            )}
        </div>
    )
}
