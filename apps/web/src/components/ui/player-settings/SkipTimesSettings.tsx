import * as React from "react"
import { cn } from "@/components/ui/core/styling"
import { useSkipTimesStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Play, Save, Trash2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useWebSocket } from "@/hooks/use-websocket"
import { getApiWebSocketUrl } from "@/api/client/server-url"
import { WSEvents } from "@/lib/server/ws-events"
import { useAniSkipTimes } from "@/api/hooks/aniskip.hooks"
import { buildSeaQuery } from "@/api/client/requests"

interface SkipTimesSettingsProps {
    videoRef?: React.RefObject<HTMLVideoElement | null>
    malId?: number | null
    duration?: number
    mediaId?: number
    episodeNumber?: number
    onClose: () => void
}

function TimeInputBlock({
    label,
    value,
    onChange,
    onTest,
    themeColor,
    isEpisodeEnd,
    onToggleEpisodeEnd
}: {
    label: string
    value: number | null
    onChange: (val: number | null) => void
    onTest: (val: number | null) => void
    themeColor: "orange" | "purple"
    isEpisodeEnd?: boolean
    onToggleEpisodeEnd?: () => void
}) {
    const handleMinChange = (valStr: string) => {
        const cleanVal = valStr.replace(/\D/g, "")
        if (cleanVal === "") {
            const currentSec = value !== null ? value % 60 : null
            if (currentSec === null || currentSec === 0) {
                onChange(null)
            } else {
                onChange(currentSec)
            }
        } else {
            const min = Math.max(0, parseInt(cleanVal) || 0)
            const currentSec = value !== null ? value % 60 : 0
            onChange(min * 60 + currentSec)
        }
    }

    const handleSecChange = (valStr: string) => {
        const cleanVal = valStr.replace(/\D/g, "")
        if (cleanVal === "") {
            const currentMin = value !== null ? Math.floor(value / 60) : null
            if (currentMin === null || currentMin === 0) {
                onChange(null)
            } else {
                onChange(currentMin * 60)
            }
        } else {
            let sec = Math.max(0, parseInt(cleanVal) || 0)
            if (sec > 59) sec = 59
            const currentMin = value !== null ? Math.floor(value / 60) : 0
            onChange(currentMin * 60 + sec)
        }
    }

    const adjustTime = (amount: number) => {
        if (value === null) return
        onChange(Math.max(0, value + amount))
    }

    const isOrange = themeColor === "orange"
    const textThemeClass = isOrange ? "text-brand-orange" : "text-purple-400"
    const borderThemeClass = isOrange ? "focus:border-brand-orange/50" : "focus:border-purple-500/50"
    const btnBgClass = isOrange 
        ? "bg-brand-orange/10 hover:bg-brand-orange/20 border-brand-orange/20 text-brand-orange" 
        : "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 text-purple-400"

    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold">
                <span className="uppercase tracking-wider">{label}</span>
                {isEpisodeEnd ? (
                    <span className={`text-[9px] ${textThemeClass} font-bold uppercase`}>Final del episodio</span>
                ) : (
                    value === null && <span className="text-[9px] text-zinc-600 font-bold uppercase">No asignado</span>
                )}
            </div>

            {isEpisodeEnd ? (
                onToggleEpisodeEnd && (
                    <button
                        onClick={onToggleEpisodeEnd}
                        className={`flex items-center gap-1.5 text-[9px] text-zinc-500 hover:${textThemeClass} transition-colors py-1 w-fit`}
                    >
                        <span className="text-[9px] text-zinc-400 font-bold">Final del episodio</span>
                        <span className="text-zinc-600">—</span>
                        <span className="underline decoration-dotted font-medium">Fijar hora específica</span>
                    </button>
                )
            ) : (
                <>
                    <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="MM"
                                value={value !== null ? Math.floor(value / 60) : ""}
                                onChange={(e) => handleMinChange(e.target.value)}
                                className={`w-12 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-center font-mono text-xs ${textThemeClass} font-bold focus:outline-none ${borderThemeClass} focus:bg-white/10 transition-colors`}
                            />
                            <span className="text-zinc-600 font-bold">:</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="SS"
                                value={value !== null ? Math.floor(value % 60) : ""}
                                onChange={(e) => handleSecChange(e.target.value)}
                                className={`w-12 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-center font-mono text-xs ${textThemeClass} font-bold focus:outline-none ${borderThemeClass} focus:bg-white/10 transition-colors`}
                            />
                            {onToggleEpisodeEnd && (
                                <button
                                    onClick={onToggleEpisodeEnd}
                                    className={`ml-2 text-[9px] text-zinc-500 hover:${textThemeClass} underline decoration-dotted transition-colors font-bold`}
                                    title="Saltar al final del episodio"
                                >
                                    Final
                                </button>
                            )}
                        </div>

                        {value !== null && (
                            <button
                                onClick={() => onTest(value)}
                                className={`px-2 py-0.5 border rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 ${btnBgClass}`}
                            >
                                <Play className="w-2.5 h-2.5 fill-current" /> Probar
                            </button>
                        )}
                    </div>

                    {value !== null && (
                        <div className="flex gap-1 w-full mt-1">
                            <button onClick={() => adjustTime(-5)} className="flex-1 py-0.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] text-zinc-400 font-bold transition-all">-5s</button>
                            <button onClick={() => adjustTime(-1)} className="flex-1 py-0.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] text-zinc-400 font-bold transition-all">-1s</button>
                            <button onClick={() => adjustTime(1)} className="flex-1 py-0.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] text-zinc-400 font-bold transition-all">+1s</button>
                            <button onClick={() => adjustTime(5)} className="flex-1 py-0.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] text-zinc-400 font-bold transition-all">+5s</button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}


export function SkipTimesSettings({
    videoRef,
    malId,
    duration,
    mediaId,
    episodeNumber,
    onClose,
}: SkipTimesSettingsProps) {
    const queryClient = useQueryClient()
    const { seriesSkipTimes, saveSeriesSkipTimes } = useSkipTimesStore(
        useShallow((state) => ({
            seriesSkipTimes: state.seriesSkipTimes,
            saveSeriesSkipTimes: state.saveSeriesSkipTimes,
        }))
    )

    const [opStart, setOpStart] = React.useState<number | null>(null)
    const [opEnd, setOpEnd] = React.useState<number | null>(null)
    const [edStart, setEdStart] = React.useState<number | null>(null)
    const [edEnd, setEdEnd] = React.useState<number | null>(null)
    const [edEndIsEpisodeEnd, setEdEndIsEpisodeEnd] = React.useState<boolean>(true)
    const [sourceName, setSourceName] = React.useState<string | undefined>(undefined)

    // Sync initial data once loaded
    React.useEffect(() => {
        let mounted = true
        async function loadTimes() {
            try {
                const data = await buildSeaQuery<any, any>({
                    endpoint: "/api/v1/mediastream/skip-times",
                    method: "GET",
                    params: { mediaId: mediaId || undefined, malId: malId || undefined, episodeNumber }
                })
                if (mounted && data && (data.opEnd > 0 || data.edOffset > 0)) {
                    setOpStart(data.opStart > 0 ? data.opStart : null)
                    setOpEnd(data.opEnd > 0 ? data.opEnd : null)
                    setEdStart(data.edOffset > 0 ? data.edOffset : null)
                    setEdEnd(data.edEnd > 0 ? data.edEnd : null)
                    setEdEndIsEpisodeEnd(!data.edEnd)
                    setSourceName(data.source)
                    return
                }
            } catch (err) {
                // Ignore and fallback
            }
            if (mounted) {
                const storeKey = malId || mediaId
                if (storeKey) {
                    const cached = seriesSkipTimes[String(storeKey)]
                    if (cached) {
                        setOpStart(cached.opStart && cached.opStart > 0 ? cached.opStart : null)
                        setOpEnd(cached.opEnd && cached.opEnd > 0 ? cached.opEnd : null)
                        setEdStart(cached.edOffset && cached.edOffset > 0 ? cached.edOffset : null)
                        setEdEnd(cached.edEnd && cached.edEnd > 0 ? cached.edEnd : null)
                        setEdEndIsEpisodeEnd(!cached.edEnd)
                        setSourceName("propagated")
                    }
                }
            }
        }
        if ((mediaId || malId) && episodeNumber) {
            loadTimes()
        }
    }, [mediaId, malId, episodeNumber])

    const formatSource = (source?: string) => {
        if (!source) return null
        if (source === "manual") return <span className="px-1.5 py-0.5 bg-brand-orange/20 text-brand-orange text-[8px] font-black uppercase rounded tracking-wider">Manual</span>
        if (source === "aniskip") return <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase rounded tracking-wider">AniSkip</span>
        if (source === "chapters") return <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[8px] font-black uppercase rounded tracking-wider">Capítulos</span>
        if (source === "fingerprint") return <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[8px] font-black uppercase rounded tracking-wider">Auto-Scan</span>
        if (source === "heuristic") return <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 text-[8px] font-black uppercase rounded tracking-wider">Estimado</span>
        return <span className="px-1.5 py-0.5 bg-white/10 text-zinc-400 text-[8px] font-black uppercase rounded tracking-wider">{source}</span>
    }

    const [activeTab, setActiveTab] = React.useState<"intro" | "outro">("intro")
    const [applyToSeason, setApplyToSeason] = React.useState(true)
    const [isSaving, setIsSaving] = React.useState(false)

    const [scanStatus, setScanStatus] = React.useState<{
        status: "idle" | "initializing" | "fingerprinting" | "matching" | "done" | "error"
        percent?: number
        message?: string
    }>({ status: "idle" })

    const wsUrl = React.useMemo(() => getApiWebSocketUrl(), [])
    useWebSocket(wsUrl, (msg) => {
        if (msg.type === WSEvents.SKIP_SCAN_STATUS && msg.payload) {
            const payload = msg.payload
            if (payload.mediaId === mediaId) {
                setScanStatus({
                    status: payload.status,
                    percent: payload.percent,
                    message: payload.message,
                })
                if (payload.status === "done") {
                    queryClient.invalidateQueries({ queryKey: ["aniskip"] })
                    // Reset back to idle after a few seconds
                    setTimeout(() => {
                        setScanStatus({ status: "idle" })
                    }, 4000)
                }
            }
        }
    })

    const handleAutoScan = async () => {
        if (!mediaId) return
        try {
            setScanStatus({ status: "initializing", message: "Iniciando..." })
            await buildSeaQuery({
                endpoint: "/api/v1/mediastream/skip-times/scan",
                method: "POST",
                data: {
                    mediaId,
                }
            })
        } catch (err) {
            console.error("Failed to trigger skip times scan:", err)
            setScanStatus({ status: "error", message: "Error al iniciar escaneo" })
        }
    }

    const handleMarkOpStart = () => {
        if (videoRef?.current) {
            setOpStart(Math.round(videoRef.current.currentTime * 100) / 100)
        }
    }

    const handleMarkOpEnd = () => {
        if (videoRef?.current) {
            setOpEnd(Math.round(videoRef.current.currentTime * 100) / 100)
        }
    }

    const handleMarkEdStart = () => {
        if (videoRef?.current) {
            setEdStart(Math.round(videoRef.current.currentTime * 100) / 100)
        }
    }

    const handleMarkEdEnd = () => {
        if (videoRef?.current) {
            const time = Math.round(videoRef.current.currentTime * 100) / 100
            setEdEnd(time)
            setEdEndIsEpisodeEnd(false)
        }
    }

    const testTime = (time: number | null) => {
        if (time !== null && videoRef?.current) {
            videoRef.current.currentTime = time
            videoRef.current.play().catch(() => {})
        }
    }

    const handleSave = async () => {
        if ((!malId && !mediaId) || !episodeNumber) return
        setIsSaving(true)

        const resolvedOpStart = opStart ?? 0
        const resolvedOpEnd = opEnd ?? 0
        
        let resolvedEdOffset = 0
        let resolvedEdEnd = 0
        if (edStart !== null) {
            resolvedEdOffset = edStart
            if (edEndIsEpisodeEnd && duration && duration > 0) {
                resolvedEdEnd = duration
            } else if (edEnd !== null && edEnd > 0) {
                resolvedEdEnd = edEnd
            }
        }

        try {
            // 1. Save to local Zustand store
            const storeKey = malId || mediaId
            if (storeKey) {
                saveSeriesSkipTimes(storeKey, resolvedOpStart, resolvedOpEnd, resolvedEdOffset, resolvedEdEnd)
            }

            // 2. Save to KameHouse server database
            await buildSeaQuery({
                endpoint: "/api/v1/mediastream/skip-times",
                method: "POST",
                data: {
                    mediaId: mediaId || undefined,
                    malId: malId || undefined,
                    episodeNumber,
                    opStart: resolvedOpStart,
                    opEnd: resolvedOpEnd,
                    edOffset: resolvedEdOffset,
                    edEnd: resolvedEdEnd,
                    applyToSeason,
                    source: "manual",
                    confidence: 1.0,
                }
            })

            // 3. Invalidate React Query cache to instantly redraw timeline and skip-flags
            queryClient.invalidateQueries({ queryKey: ["aniskip"] })
            
            onClose()
        } catch (err) {
            console.error("Failed to save skip times to server:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleClear = async () => {
        if ((!malId && !mediaId) || !episodeNumber) return
        setIsSaving(true)

        setOpStart(null)
        setOpEnd(null)
        setEdStart(null)
        setEdEnd(null)
        setEdEndIsEpisodeEnd(true)

        try {
            // 1. Clear local Zustand store
            const storeKey = malId || mediaId
            if (storeKey) {
                saveSeriesSkipTimes(storeKey, 0, 0, 0, 0)
            }

            // 2. Clear on KameHouse server database
            await buildSeaQuery({
                endpoint: "/api/v1/mediastream/skip-times",
                method: "POST",
                data: {
                    mediaId: mediaId || undefined,
                    malId: malId || undefined,
                    episodeNumber,
                    opStart: 0,
                    opEnd: 0,
                    edOffset: 0,
                    edEnd: 0,
                    applyToSeason: false,
                    source: "manual",
                    confidence: 1.0,
                }
            })

            // 3. Invalidate query cache
            queryClient.invalidateQueries({ queryKey: ["aniskip"] })
        } catch (err) {
            console.error("Failed to clear skip times on server:", err)
        } finally {
            setIsSaving(false)
        }
    }

    if (!malId && !mediaId) {
        return (
            <div className="px-6 py-8 text-center text-zinc-500 text-[11px] font-black uppercase tracking-widest">
                No disponible para este video
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 px-4 py-2">
            {/* Automatic Scan Button */}
            <div className="flex flex-col gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">Detección Automática</span>
                        <span className="text-[8px] text-zinc-500">Escanea la serie con huellas de audio localmente</span>
                    </div>
                    <button
                        onClick={handleAutoScan}
                        disabled={isSaving || (scanStatus.status !== "idle" && scanStatus.status !== "done" && scanStatus.status !== "error")}
                        className={cn(
                            "py-1.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1",
                            scanStatus.status === "idle" || scanStatus.status === "done" || scanStatus.status === "error"
                                ? "bg-white/5 hover:bg-brand-orange hover:text-white border border-white/5 text-zinc-300"
                                : "bg-brand-orange/20 text-brand-orange cursor-default"
                        )}
                    >
                        {scanStatus.status === "idle" || scanStatus.status === "done" || scanStatus.status === "error"
                            ? "Escanear"
                            : "Escaneando..."}
                    </button>
                </div>
                {scanStatus.status !== "idle" && (
                    <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex justify-between text-[8px] font-bold text-zinc-400 font-mono">
                            <span className="truncate max-w-[180px]">{scanStatus.message}</span>
                            {scanStatus.percent !== undefined && <span>{scanStatus.percent}%</span>}
                        </div>
                        {scanStatus.percent !== undefined && (
                            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                <div
                                    className="bg-brand-orange h-full transition-all duration-300"
                                    style={{ width: `${scanStatus.percent}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex bg-white/5 p-1 rounded-xl gap-1">
                <button
                    onClick={() => setActiveTab("intro")}
                    className={cn(
                        "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95",
                        activeTab === "intro" ? "bg-brand-orange text-white" : "text-zinc-400 hover:text-white"
                    )}
                >
                    Intro (OP)
                </button>
                <button
                    onClick={() => setActiveTab("outro")}
                    className={cn(
                        "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95",
                        activeTab === "outro" ? "bg-purple-500 text-white" : "text-zinc-400 hover:text-white"
                    )}
                >
                    Outro (ED)
                </button>
            </div>

            {/* Config Panel */}
            <div className="flex flex-col gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                {activeTab === "intro" ? (
                    <>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Marcas de la Intro</span>
                                {formatSource(sourceName)}
                            </div>
                            <div className="flex flex-col gap-4 bg-white/5 p-3 rounded-lg border border-white/5">
                                <TimeInputBlock
                                    label="Inicio:"
                                    value={opStart}
                                    onChange={setOpStart}
                                    onTest={testTime}
                                    themeColor="orange"
                                />
                                <div className="h-px bg-white/5 w-full" />
                                <TimeInputBlock
                                    label="Fin:"
                                    value={opEnd}
                                    onChange={setOpEnd}
                                    onTest={testTime}
                                    themeColor="orange"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={handleMarkOpStart}
                                className="flex-1 py-3 px-2 bg-white/5 border border-white/5 hover:border-brand-orange/30 hover:bg-brand-orange/10 hover:text-brand-orange text-zinc-300 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl active:scale-95 flex items-center justify-center gap-1.5"
                            >
                                <Play className="w-3 h-3 fill-current rotate-90" />
                                Fijar Inicio
                            </button>
                            <button
                                onClick={handleMarkOpEnd}
                                className="flex-1 py-3 px-2 bg-white/5 border border-white/5 hover:border-brand-orange/30 hover:bg-brand-orange/10 hover:text-brand-orange text-zinc-300 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl active:scale-95 flex items-center justify-center gap-1.5"
                            >
                                <Play className="w-3 h-3 fill-current" />
                                Fijar Fin
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Marcas de la Outro / Ending</span>
                                {formatSource(sourceName)}
                            </div>
                            <div className="flex flex-col gap-4 bg-white/5 p-3 rounded-lg border border-white/5">
                                <TimeInputBlock
                                    label="Inicio:"
                                    value={edStart}
                                    onChange={setEdStart}
                                    onTest={testTime}
                                    themeColor="purple"
                                />
                                <div className="h-px bg-white/5 w-full" />
                                <TimeInputBlock
                                    label="Fin:"
                                    value={edEnd}
                                    onChange={setEdEnd}
                                    onTest={testTime}
                                    themeColor="purple"
                                    isEpisodeEnd={edEndIsEpisodeEnd}
                                    onToggleEpisodeEnd={() => setEdEndIsEpisodeEnd(!edEndIsEpisodeEnd)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={handleMarkEdStart}
                                className="flex-1 py-3 px-2 bg-white/5 border border-white/5 hover:border-purple-400/30 hover:bg-purple-500/10 hover:text-purple-400 text-zinc-300 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl active:scale-95 flex items-center justify-center gap-1.5"
                            >
                                <Play className="w-3 h-3 fill-current rotate-90" />
                                Fijar Inicio
                            </button>
                            <button
                                onClick={handleMarkEdEnd}
                                className="flex-1 py-3 px-2 bg-white/5 border border-white/5 hover:border-purple-400/30 hover:bg-purple-500/10 hover:text-purple-400 text-zinc-300 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl active:scale-95 flex items-center justify-center gap-1.5"
                            >
                                <Play className="w-3 h-3 fill-current" />
                                Fijar Fin
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Propagate to season checkbox toggle */}
            <button
                onClick={() => setApplyToSeason(!applyToSeason)}
                className="flex items-center justify-between w-full px-2 py-1 text-left active:scale-[0.98] transition-transform"
            >
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">
                        Aplicar a toda la temporada
                    </span>
                    <span className="text-[8px] text-zinc-500">
                        Propaga marcas a otros episodios
                    </span>
                </div>
                <div className={cn(
                    "w-8 h-4 rounded-full relative transition-all duration-300 border border-white/5",
                    applyToSeason ? "bg-brand-orange border-brand-orange/30 shadow-[0_0_8px_rgba(255,110,58,0.3)]" : "bg-white/10"
                )}>
                    <div className={cn(
                        "absolute top-[2px] w-2.5 h-2.5 rounded-full transition-all duration-300",
                        applyToSeason ? "left-[17px] bg-white" : "left-[3px] bg-zinc-400"
                    )} />
                </div>
            </button>

            {/* Bottom Actions */}
            <div className="flex gap-2 mt-2 border-t border-white/5 pt-4">
                <button
                    onClick={handleClear}
                    disabled={isSaving}
                    title="Restablecer marcas"
                    className="p-3 bg-white/5 border border-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/25 transition-all rounded-xl active:scale-95 disabled:opacity-40"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 py-3 bg-brand-orange hover:brightness-110 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-xl active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? "Guardando..." : "Guardar y Aplicar"}
                </button>
            </div>
        </div>
    )
}
