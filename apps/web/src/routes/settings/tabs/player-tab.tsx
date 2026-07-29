import React from "react"
import { Section, Card, OsToggle } from "../components"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import { buildSeaQuery } from "@/api/client/requests"
import { useWebSocket } from "@/hooks/use-websocket"
import { getApiWebSocketUrl } from "@/api/client/server-url"
import { WSEvents, type WebSocketMessage } from "@/lib/server/ws-events"

/** mediaId sentinela con el que el server emite el progreso del scan de
 * biblioteca completa (los ids reales son siempre positivos). */
const BATCH_SCAN_MEDIA_ID = -1

/** Fila que dispara la detección de OP/ED sobre TODAS las series con archivos
 * locales y muestra el progreso vía SKIP_SCAN_STATUS (mediaId -1). El scan corre
 * en el server serie por serie; las marcas manuales nunca se pisan. */
function LibrarySkipScanRow() {
    const [status, setStatus] = React.useState<"idle" | "running" | "done" | "error">("idle")
    const [message, setMessage] = React.useState("")
    const [percent, setPercent] = React.useState(0)

    const wsUrl = React.useMemo(() => getApiWebSocketUrl(), [])
    useWebSocket(wsUrl, React.useCallback((data: WebSocketMessage) => {
        if (data?.type !== WSEvents.SKIP_SCAN_STATUS) return
        const p = data.payload
        if (!p || p.mediaId !== BATCH_SCAN_MEDIA_ID) return
        setMessage(p.message ?? "")
        if (typeof p.percent === "number") setPercent(p.percent)
        if (p.status === "done") setStatus("done")
        else if (p.status === "error") setStatus("error")
        else setStatus("running")
    }, []))

    const handleScan = async () => {
        if (status === "running") return
        setStatus("running")
        setMessage("Iniciando escaneo de biblioteca...")
        setPercent(0)
        try {
            await buildSeaQuery<unknown>({
                endpoint: "/api/v1/mediastream/skip-times/scan-all",
                method: "POST",
            })
        } catch {
            setStatus("error")
            setMessage("No se pudo iniciar el escaneo.")
        }
    }

    const running = status === "running"

    return (
        <div className="px-6 py-5 border-b border-outline-variant/4 last:border-0 hover:bg-surface-variant/[0.01] transition-all duration-base group/scanall">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-1 flex-1 max-w-xl">
                    <p className="text-sm font-semibold text-on-surface-variant group-hover/scanall:text-on-surface transition-colors tracking-tight">
                        Escanear toda la biblioteca ahora
                    </p>
                    <p className={cn(
                        "text-caption transition-colors duration-base",
                        status === "error" ? "text-brand-destructive" : "text-on-surface-variant"
                    )}>
                        {status === "idle"
                            ? "Corre la detección de OP/ED sobre todas las series con archivos locales, serie por serie. Las marcas manuales no se tocan."
                            : (message || "Detectando marcas de skip...")}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleScan}
                    disabled={running}
                    className={cn(
                        "shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-button-sm transition-all",
                        running
                            ? "bg-brand-accent/10 border border-brand-accent/20 text-brand-accent cursor-not-allowed"
                            : "bg-brand-accent hover:brightness-110 text-on-primary shadow-elevation-2 active:scale-95"
                    )}
                >
                    {running
                        ? <Icons.ui.spinner className="w-4 h-4 animate-spin" />
                        : <Icons.media.wand className="w-4 h-4" />}
                    {running ? "ESCANEANDO..." : "ESCANEAR"}
                </button>
            </div>
            {running && (
                <div className="w-full h-1 bg-surface-container-high rounded-full relative mt-3 overflow-hidden">
                    <div
                        className="absolute left-0 h-full bg-brand-accent rounded-full transition-all duration-slow"
                        style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                    />
                </div>
            )}
        </div>
    )
}

interface PlayerTabProps {
    control: Control<SettingsFormValues>
}


export function PlayerTab({ control }: PlayerTabProps) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">

            {/* Reproducción */}
            <Section label="Comportamiento de Reproducción">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="library.autoPlayNextEpisode"
                        render={({ field }) => (
                            <OsToggle
                                label="Reproducción Continua"
                                description="Inicia automáticamente el siguiente episodio de la cola al finalizar el actual."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="library.enableWatchContinuity"
                        render={({ field }) => (
                            <OsToggle
                                label="Habilitar Continuidad de Reproducción"
                                description="Guarda el progreso en segundo plano para continuar viendo desde donde lo dejaste."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="library.autoDetectSkipTimes"
                        render={({ field }) => (
                            <OsToggle
                                label="Detectar Intro/Outro automáticamente"
                                description="Analiza los episodios en segundo plano (AnimeThemes, huella de audio y subtítulos) para ubicar OP y ED. La detección manual desde el reproductor funciona igual con esto apagado."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <LibrarySkipScanRow />

                </Card>
            </Section>


        </div>
    )
}
