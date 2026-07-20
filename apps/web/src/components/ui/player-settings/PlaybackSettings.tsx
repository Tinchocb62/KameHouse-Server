import * as React from "react"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import { buildSeaQuery } from "@/api/client/requests"
import { useWebSocket } from "@/hooks/use-websocket"
import { getApiWebSocketUrl } from "@/api/client/server-url"
import { WSEvents, type WebSocketMessage } from "@/lib/server/ws-events"

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
    mediaId?: number | null
}

/** Botón que dispara la detección automática de OP/ED en el servidor y muestra el
 * progreso vía el evento websocket SKIP_SCAN_STATUS. La detección corre la cadena
 * AnimeThemes → cross-episodio → subtítulos y persiste las marcas; el player las
 * recoge en el siguiente refetch (el server emite invalidate-queries al terminar). */
function AutoDetectRow({ mediaId }: { mediaId: number }) {
    const [status, setStatus] = React.useState<"idle" | "running" | "done" | "error">("idle")
    const [message, setMessage] = React.useState<string>("")
    const [percent, setPercent] = React.useState<number>(0)

    const wsUrl = React.useMemo(() => getApiWebSocketUrl(), [])
    useWebSocket(wsUrl, React.useCallback((data: WebSocketMessage) => {
        if (data?.type !== WSEvents.SKIP_SCAN_STATUS) return
        const p = data.payload
        if (!p || p.mediaId !== mediaId) return
        setMessage(p.message ?? "")
        if (typeof p.percent === "number") setPercent(p.percent)
        if (p.status === "done") setStatus("done")
        else if (p.status === "error") setStatus("error")
        else setStatus("running")
    }, [mediaId]))

    const handleScan = async () => {
        if (status === "running") return
        setStatus("running")
        setMessage("Iniciando detección...")
        setPercent(0)
        try {
            await buildSeaQuery<unknown, { mediaId: number }>({
                endpoint: "/api/v1/mediastream/skip-times/scan",
                method: "POST",
                data: { mediaId },
            })
        } catch {
            setStatus("error")
            setMessage("No se pudo iniciar la detección.")
        }
    }

    const running = status === "running"

    return (
        <div className="px-6 py-3 border-t border-white/5 my-1">
            <button
                onClick={handleScan}
                disabled={running}
                className={cn(
                    "flex items-center justify-between w-full transition-all duration-base ease-out group text-left",
                    running ? "text-white cursor-default" : "text-zinc-400 hover:text-white active:scale-[0.98]"
                )}
            >
                <div className="flex flex-col">
                    <span className="text-label-sm font-black uppercase tracking-widest">Detectar Intro/Outro (automático)</span>
                    <span className="text-label-sm text-zinc-500 font-medium mt-0.5">
                        {status === "idle" && "Analiza los episodios para ubicar OP y ED"}
                        {running && (message || "Detectando...")}
                        {status === "done" && (message || "Detección completada")}
                        {status === "error" && (message || "Error en la detección")}
                    </span>
                </div>
                {running
                    ? <Icons.ui.spinner className="w-4 h-4 shrink-0 ml-4 animate-spin text-brand-accent" />
                    : <Icons.media.wand className="w-4 h-4 shrink-0 ml-4 group-hover:text-brand-accent transition-colors" />}
            </button>
            {running && (
                <div className="w-full h-1 bg-white/10 rounded-full relative mt-2 overflow-hidden">
                    <div className="absolute left-0 h-full bg-brand-accent rounded-full transition-all duration-slow" style={{ width: `${Math.min(100, Math.max(4, percent))}%` }} />
                </div>
            )}
        </div>
    )
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
                "flex items-center justify-between w-full px-6 py-3 transition-all duration-base ease-out group text-left relative overflow-hidden",
                !disabled && "active:scale-[0.98]",
                enabled ? "text-white" : "text-zinc-500 hover:text-zinc-300",
                disabled && "opacity-60 cursor-default hover:text-white"
            )}
        >
            {/* Hover visual accent indicator on the left edge */}
            {!disabled && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 bg-brand-accent group-hover:h-1/2 transition-all duration-base ease-out rounded-r-md" />}

            <div className="flex flex-col">
                <span className={cn("text-label-sm font-black uppercase tracking-widest text-left transition-transform duration-base ease-out", !disabled && "group-hover:translate-x-1.5")}>{label}</span>
                {subtext && <span className="text-label-sm text-zinc-500 font-medium lowercase first-letter:uppercase mt-0.5">{subtext}</span>}
            </div>
            
            <div className={cn(
                "w-9 h-5 rounded-full relative transition-all duration-base [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] shrink-0 ml-4 border border-white/5",
                enabled ? (disabled ? "bg-brand-accent/50 border-brand-accent/20" : "bg-brand-accent shadow-[0_0_12px_hsl(var(--brand-accent)/0.45)] border-brand-accent/30") : "bg-white/10"
            )}>
                <div className={cn(
                    "absolute top-[3px] w-3 h-3 rounded-full transition-all duration-base [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] shadow-sm",
                    enabled ? (disabled ? "left-[21px] bg-white/70 scale-110" : "left-[21px] bg-white scale-110") : "left-[3px] bg-zinc-400"
                )} />
            </div>
        </button>
    )
}

export function PlaybackSettings({
    autoSkipIntro,
    onAutoSkipIntroChange,
    autoSkipOutro,
    onAutoSkipOutroChange,
    skipStepSeconds,
    onSkipStepSecondsChange,
    showHeatmap,
    onShowHeatmapChange,
    ambientModeEnabled = true,
    onAmbientModeEnabledChange = () => {},
    showSeparator = true,
    mediaFormat,
    marathonMode,
    mediaId,
}: PlaybackSettingsProps) {
    const isMovie = mediaFormat?.toUpperCase() === "MOVIE"

    return (
        <div className="py-4">
            {showSeparator && <div className="mx-6 h-px bg-white/10 mb-4" />}
            <ToggleRow label="Modo Ambiente (efecto de luz)" enabled={ambientModeEnabled} onChange={onAmbientModeEnabledChange} />
            <ToggleRow label="Mapa de Calor (timeline)" enabled={showHeatmap} onChange={onShowHeatmapChange} />
            {!isMovie && <ToggleRow label="Omitir Intro (automático)" enabled={marathonMode ? true : autoSkipIntro} onChange={onAutoSkipIntroChange} disabled={marathonMode} subtext={marathonMode ? "(controlado por Maratón)" : undefined} />}
            {!isMovie && <ToggleRow label="Saltar Final (automático)" enabled={marathonMode ? true : autoSkipOutro} onChange={onAutoSkipOutroChange} disabled={marathonMode} subtext={marathonMode ? "(controlado por Maratón)" : undefined} />}
            {!isMovie && typeof mediaId === "number" && mediaId > 0 && <AutoDetectRow mediaId={mediaId} />}

            {/* Skip step seconds control */}
            {!isMovie && (
                <div className="px-6 py-3 border-t border-white/5 my-1">
                    <div className="text-label-sm font-black text-zinc-500 uppercase tracking-widest mb-3">Tiempo de salto manual (S)</div>
                    <div className="flex items-center justify-between gap-3">
                        <button
                            onClick={() => onSkipStepSecondsChange(Math.max(5, skipStepSeconds - 5))}
                            disabled={skipStepSeconds <= 5}
                            className="flex items-center justify-center w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-all"
                        >
                            <Icons.ui.minus className="w-3 h-3" />
                        </button>
                        <div className="flex-1 flex flex-col items-center gap-1.5">
                            <span className="text-sm font-bold text-white tabular-nums">{skipStepSeconds}s</span>
                            <div className="w-full h-1.5 bg-white/10 rounded-full relative">
                                <div
                                    className="absolute left-0 h-full bg-brand-accent rounded-full transition-all"
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
                            <Icons.ui.plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
