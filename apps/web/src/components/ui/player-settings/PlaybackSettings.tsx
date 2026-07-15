import * as React from "react"
import { cn } from "@/components/ui/core/styling"
import { Gauge, FastForward, Repeat, Minus, Plus } from "lucide-react"

interface PlaybackSettingsProps {
    playbackRate: number
    onPlaybackRateChange: (rate: number) => void
    autoSkipIntro: boolean
    onAutoSkipIntroChange: (enabled: boolean) => void
    autoSkipOutro: boolean
    onAutoSkipOutroChange: (enabled: boolean) => void
    skipStepSeconds: number
    onSkipStepSecondsChange: (seconds: number) => void
    showHeatmap: boolean
    onShowHeatmapChange: (enabled: boolean) => void
    loopEnabled?: boolean
    onLoopEnabledChange?: (enabled: boolean) => void
    autoDisableSubtitlesWhenDubbed?: boolean
    onAutoDisableSubtitlesWhenDubbedChange?: (enabled: boolean) => void
    ambientModeEnabled?: boolean
    onAmbientModeEnabledChange?: (enabled: boolean) => void
    showSeparator?: boolean
    mediaFormat?: string | null
    tvMode?: boolean
    onTvModeChange?: (enabled: boolean) => void
    marathonMode?: boolean
    onMarathonModeChange?: (enabled: boolean) => void
}

function ToggleRow({ label, enabled, onChange, disabled = false, subtext }: { label: string; enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean; subtext?: string }) {
    const handleToggle = () => {
        if (disabled) return
        onChange(!enabled)
    }

    return (
        <button
            onClick={handleToggle}
            disabled={disabled}
            className={cn(
                "flex items-center justify-between w-full px-6 py-3 transition-all duration-300 ease-out group text-left relative overflow-hidden",
                !disabled && "active:scale-[0.98]",
                enabled ? "text-white" : "text-zinc-500 hover:text-zinc-300",
                disabled && "opacity-60 cursor-default hover:text-white"
            )}
        >
            {/* Hover visual accent indicator on the left edge */}
            {!disabled && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 bg-brand-orange group-hover:h-1/2 transition-all duration-300 ease-out rounded-r-md" />}

            <div className="flex flex-col">
                <span className={cn("text-[11px] font-black uppercase tracking-widest text-left transition-transform duration-300 ease-out", !disabled && "group-hover:translate-x-1.5")}>{label}</span>
                {subtext && <span className="text-[10px] text-zinc-500 font-medium lowercase first-letter:uppercase mt-0.5">{subtext}</span>}
            </div>
            
            <div className={cn(
                "w-9 h-5 rounded-full relative transition-all duration-400 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] shrink-0 ml-4 border border-white/5",
                enabled ? (disabled ? "bg-brand-orange/50 border-brand-orange/20" : "bg-brand-orange shadow-[0_0_12px_rgba(255,110,58,0.45)] border-brand-orange/30") : "bg-white/10"
            )}>
                <div className={cn(
                    "absolute top-[3px] w-3 h-3 rounded-full transition-all duration-400 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] shadow-sm",
                    enabled ? (disabled ? "left-[21px] bg-white/70 scale-110" : "left-[21px] bg-white scale-110") : "left-[3px] bg-zinc-400"
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
    skipStepSeconds,
    onSkipStepSecondsChange,
    showHeatmap,
    onShowHeatmapChange,
    loopEnabled,
    onLoopEnabledChange,
    autoDisableSubtitlesWhenDubbed = true,
    onAutoDisableSubtitlesWhenDubbedChange = () => {},
    ambientModeEnabled = true,
    onAmbientModeEnabledChange = () => {},
    showSeparator = true,
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
            {!isMovie && <ToggleRow label="Omitir Intro (automático)" enabled={marathonMode ? true : autoSkipIntro} onChange={onAutoSkipIntroChange} disabled={marathonMode} subtext={marathonMode ? "(controlado por Maratón)" : undefined} />}
            {!isMovie && <ToggleRow label="Saltar Final (automático)" enabled={marathonMode ? true : autoSkipOutro} onChange={onAutoSkipOutroChange} disabled={marathonMode} subtext={marathonMode ? "(controlado por Maratón)" : undefined} />}
            
            {/* Skip step seconds control */}
            {!isMovie && (
                <div className="px-6 py-3 border-t border-white/5 my-1">
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Tiempo de salto manual (S)</div>
                    <div className="flex items-center justify-between gap-3">
                        <button
                            onClick={() => onSkipStepSecondsChange(Math.max(5, skipStepSeconds - 5))}
                            disabled={skipStepSeconds <= 5}
                            className="flex items-center justify-center w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-all"
                        >
                            <Minus className="w-3 h-3" />
                        </button>
                        <div className="flex-1 flex flex-col items-center gap-1.5">
                            <span className="text-sm font-bold text-white tabular-nums">{skipStepSeconds}s</span>
                            <div className="w-full h-1.5 bg-white/10 rounded-full relative">
                                <div
                                    className="absolute left-0 h-full bg-brand-orange rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.max(0, ((skipStepSeconds - 5) / 175) * 100))}%` }}
                                />
                                <input
                                    type="range" min={5} max={180} step={5}
                                    value={skipStepSeconds}
                                    onChange={(e) => onSkipStepSecondsChange(Number(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => onSkipStepSecondsChange(Math.min(180, skipStepSeconds + 5))}
                            disabled={skipStepSeconds >= 180}
                            className="flex items-center justify-center w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-all"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
