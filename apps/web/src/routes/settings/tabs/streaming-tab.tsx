import React from "react"
import { Section, Card, OsToggle, OsSelect, OsInput, StatusCard } from "../components"
import { RadioCardGroup } from "@/components/settings/radio-card-group"
import { RangeSlider } from "@/components/settings/range-slider"
import { type Control, Controller, useFormContext, useWatch } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { Icons } from "@/components/ui/icons"
import { useCancelPreTranscode, useGetPreTranscodeJobs } from "@/api/hooks/mediastream.hooks"
import { cn } from "@/components/ui/core/styling"

interface StreamingTabProps {
    control: Control<SettingsFormValues>
}

const HW_ACCEL_OPTIONS = [
    { value: "auto", label: "Automático (Recomendado)", desc: "Detecta Nvidia NVENC, Intel QuickSync, VAAPI, AMD AMF", badge: "AUTO" },
    { value: "nvenc", label: "NVIDIA NVENC", desc: "Tarjetas GeForce GTX/RTX series", badge: "NVEN" },
    { value: "qsv", label: "Intel QuickSync (QSV)", desc: "Gráficos integrados Intel (6th gen+)", badge: "QSV" },
    { value: "qsv-low-power", label: "Intel QuickSync (Low Power)", desc: "Menor consumo de energía (QSV)", badge: "QSV-LP" },
    { value: "vaapi", label: "VAAPI (AMD/Intel)", desc: "Linux: AMD Radeon, Intel integrado", badge: "VAAP" },
    { value: "amf", label: "AMD AMF", desc: "Tarjetas AMD Radeon (RDNA/RDNA2)", badge: "AMF" },
    { value: "videotoolbox", label: "VideoToolbox (macOS)", desc: "Apple Silicon / macOS nativo", badge: "VTB" },
    { value: "cuda", label: "CUDA (NVIDIA)", desc: "Decode/Encode via CUDA cores", badge: "CUDA" },
    { value: "none", label: "Desactivado (CPU)", desc: "Solo software, mayor uso de CPU", badge: "CPU" },
]

const PRESET_OPTIONS = [
    { value: "ultrafast", label: "Ultrafast", desc: "Máxima velocidad, menor compresión" },
    { value: "superfast", label: "Superfast" },
    { value: "veryfast", label: "Veryfast" },
    { value: "faster", label: "Faster" },
    { value: "fast", label: "Fast (Recomendado)", desc: "Balance velocidad/calidad" },
    { value: "medium", label: "Medium", desc: "Default FFmpeg" },
    { value: "slow", label: "Slow", desc: "Mejor compresión" },
    { value: "slower", label: "Slower" },
    { value: "veryslow", label: "Veryslow", desc: "Mejor calidad, muy lento" },
]

function hwAccelLabel(value: string) {
    return HW_ACCEL_OPTIONS.find((o) => o.value === value)?.label ?? "Automático"
}

export function StreamingTab({ control }: StreamingTabProps) {
    const mediastream = useWatch({ control, name: "mediastream" })

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            {/* Transcodificación por Hardware */}
            <Section label="Transcodificación por Hardware (GPU)">
                <Card className="space-y-6 p-6">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-brand-accent uppercase tracking-widest">Aceleración por Hardware</h3>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                            Asigna el procesamiento de codecs pesados (HEVC 10-bit, AV1, VP9) directo al chip de video de tu GPU.
                        </p>
                    </div>

                    <Controller
                        control={control}
                        name="mediastream.transcodeHwAccel"
                        render={({ field }) => (
                            <RadioCardGroup
                                name="transcodeHwAccel"
                                options={HW_ACCEL_OPTIONS}
                                // El backend usa "auto" como valor canónico de automático
                                // (y normaliza "" → "auto"). Mapear vacío/legacy a "auto"
                                // para que la tarjeta "Automático" quede marcada por defecto
                                // en vez de aparecer desmarcada.
                                value={field.value || "auto"}
                                onChange={field.onChange}
                            />
                        )}
                    />

                    <hr className="border-outline-variant my-2" />

                    {/* Preset de calidad */}
                    <Controller
                        control={control}
                        name="mediastream.transcodePreset"
                        render={({ field }) => (
                            <OsSelect
                                value={field.value || "fast"}
                                onChange={field.onChange}
                                options={PRESET_OPTIONS}
                                label="Preset de Transcodificación"
                                description="Presets más lentos = mejor calidad y menor tamaño, pero mayor uso de CPU/GPU"
                            />
                        )}
                    />

                    {/* Threads */}
                    <Controller
                        control={control}
                        name="mediastream.transcodeThreads"
                        render={({ field }) => (
                            <RangeSlider
                                label="Procesos de transcodificación máximos"
                                description="0 = automático. Limita cuántos procesos ffmpeg corren en paralelo. Con GPU habilitada, los procesos extra usan CPU (libx264) automáticamente."
                                min={0}
                                max={16}
                                value={field.value || 0}
                                onChange={field.onChange}
                                formatValue={(v) => (v === 0 ? "0 (auto)" : String(v))}
                            />
                        )}
                    />

                    {/* Configuración personalizada HW Accel */}
                    <Controller
                        control={control}
                        name="mediastream.transcodeHwAccelCustomSettings"
                        render={({ field }) => (
                            <OsInput
                                label="Parámetros Personalizados (Avanzado)"
                                description="Parámetros extra pasados al encoder de hardware (solo para usuarios avanzados)."
                                placeholder="Ej: -preset p4 -tune hq -rc vbr"
                                value={field.value || ""}
                                onChange={field.onChange}
                                isMono
                            />
                        )}
                    />
                </Card>
            </Section>

            {/* Pre-transcodificación */}
            <Section label="Pre-Transcodificación (Background)">
                <Card className="divide-y divide-outline-variant/4">
                    <Controller
                        control={control}
                        name="mediastream.preTranscodeEnabled"
                        render={({ field }) => (
                            <OsToggle
                                label="Habilitar Pre-Transcodificación"
                                description="Cuando un episodio necesita transcodificarse, lo convierte entero en segundo plano al precargarlo. La próxima reproducción arranca al instante y no consume CPU/GPU. Requiere espacio en disco."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    {!!mediastream?.preTranscodeEnabled && (
                        <Controller
                            control={control}
                            name="mediastream.preTranscodeLibraryDir"
                            render={({ field }) => (
                                <OsInput
                                    label="Directorio de Pre-Transcodificación"
                                    description="Carpeta donde se guardan los archivos pre-transcodificados. Vacío = junto al resto de la caché."
                                    placeholder="Ej. /mnt/cache/pretranscode o D:\Cache\Pretranscode"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    isMono
                                />
                            )}
                        />
                    )}
                </Card>
                {!!mediastream?.preTranscodeEnabled && <PreTranscodeQueue />}
            </Section>

            {/* Política de reproducción */}
            <Section label="Política de Reproducción">
                <Card className="space-y-6 p-6">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-brand-accent uppercase tracking-widest">Cómo decide el servidor</h3>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                            Direct Play envía el archivo tal cual (sin costo de CPU). Transcodificar lo reencoda al vuelo
                            para dispositivos que no soportan el codec.
                        </p>
                    </div>

                    <PlaybackPolicyPicker control={control} />
                </Card>
            </Section>

            {/* Rutas FFmpeg/FFprobe */}
            <Section label="Binarios del Sistema">
                <Card className="divide-y divide-outline-variant/4">
                    <Controller
                        control={control}
                        name="mediastream.ffmpegPath"
                        render={({ field }) => (
                            <OsInput
                                label="Ruta Ejecutable FFmpeg"
                                description="Ubicación del binario ffmpeg (requerido para transcodificación)."
                                placeholder="Ej. /usr/bin/ffmpeg o C:\ffmpeg\ffmpeg.exe"
                                value={field.value || ""}
                                onChange={field.onChange}
                                isMono
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="mediastream.ffprobePath"
                        render={({ field }) => (
                            <OsInput
                                label="Ruta Ejecutable FFprobe"
                                description="Ubicación del binario ffprobe (análisis de metadatos de video)."
                                placeholder="Ej. /usr/bin/ffprobe o C:\ffmpeg\ffprobe.exe"
                                value={field.value || ""}
                                onChange={field.onChange}
                                isMono
                            />
                        )}
                    />
                </Card>
            </Section>

            {/* Estado del Motor de Streaming — refleja la configuración del form en vivo */}
            <Section label="Estado del Motor">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatusCard
                        icon={Icons.status.zap}
                        label="Transcodificación"
                        value={mediastream?.transcodeEnabled ? "ACTIVO" : "INACTIVO"}
                        tone={mediastream?.transcodeEnabled ? "ok" : "off"}
                        hint={`HW: ${hwAccelLabel(mediastream?.transcodeHwAccel || "auto")} · ${mediastream?.transcodeThreads || 0 || "auto"} threads · ${mediastream?.transcodePreset || "fast"}`}
                    />
                    <PreTranscodeStatusCard enabled={!!mediastream?.preTranscodeEnabled} />
                    <StatusCard
                        icon={Icons.media.play}
                        label="Política"
                        value={policyLabel(mediastream)}
                        tone="ok"
                        hint={POLICY_OPTIONS.find(o => o.value === policyOf(mediastream))?.desc ?? ""}
                    />
                </div>
                <p className="text-label-sm text-on-surface-variant mt-3 px-1">
                    Transcodificación y Política reflejan el formulario (sin verificar en runtime);
                    Pre-Transcodificación muestra la cola real del servidor.
                </p>
            </Section>
        </div>
    )
}

// ─── Política de reproducción ─────────────────────────────────────────────────
// Los tres flags del backend (transcodeEnabled / directPlayOnly /
// disableAutoSwitchToDirectPlay) describen una sola decisión y admiten
// combinaciones contradictorias. La UI expone los modos válidos y deriva los
// flags, en vez de pedirle al usuario que los combine a mano.

type PlaybackPolicy = "auto" | "direct-only" | "transcode-strict"

const POLICY_OPTIONS: { value: PlaybackPolicy; label: string; desc: string; badge: string }[] = [
    {
        value: "auto",
        label: "Automático (Recomendado)",
        desc: "Direct Play cuando el dispositivo soporta el archivo; transcodifica solo si hace falta.",
        badge: "AUTO",
    },
    {
        value: "direct-only",
        label: "Solo Direct Play",
        desc: "Nunca transcodifica. Falla si el dispositivo no soporta el codec.",
        badge: "DIR",
    },
    {
        value: "transcode-strict",
        label: "Transcodificación estricta",
        desc: "Siempre transcodifica, incluso si el dispositivo podría reproducir el archivo nativamente.",
        badge: "TC",
    },
]

type MediastreamValues = SettingsFormValues["mediastream"] | undefined

function policyOf(m: MediastreamValues): PlaybackPolicy {
    if (m?.directPlayOnly) return "direct-only"
    if (m?.transcodeEnabled && m?.disableAutoSwitchToDirectPlay) return "transcode-strict"
    return "auto"
}

function policyLabel(m: MediastreamValues): string {
    switch (policyOf(m)) {
        case "direct-only": return "SOLO DIRECT"
        case "transcode-strict": return "TRANSCODE"
        default: return "AUTOMÁTICO"
    }
}

function PlaybackPolicyPicker({ control }: { control: Control<SettingsFormValues> }) {
    const { setValue } = useFormContext<SettingsFormValues>()
    const mediastream = useWatch({ control, name: "mediastream" })
    const current = policyOf(mediastream)

    const setPolicy = (policy: PlaybackPolicy) => {
        const flags = {
            "auto": { transcodeEnabled: true, directPlayOnly: false, disableAutoSwitchToDirectPlay: false },
            "direct-only": { transcodeEnabled: false, directPlayOnly: true, disableAutoSwitchToDirectPlay: false },
            "transcode-strict": { transcodeEnabled: true, directPlayOnly: false, disableAutoSwitchToDirectPlay: true },
        }[policy]

        for (const [key, value] of Object.entries(flags)) {
            setValue(`mediastream.${key}` as never, value as never, { shouldDirty: true })
        }
    }

    return (
        <RadioCardGroup
            name="playbackPolicy"
            options={POLICY_OPTIONS}
            value={current}
            onChange={(v) => setPolicy(v as PlaybackPolicy)}
        />
    )
}

// ─── Cola de pre-transcodificación ────────────────────────────────────────────

const JOB_TONE: Record<string, string> = {
    running: "text-brand-accent",
    completed: "text-brand-success",
    failed: "text-brand-destructive",
    queued: "text-on-surface-variant",
}

const JOB_LABEL: Record<string, string> = {
    running: "Procesando",
    completed: "Listo",
    failed: "Falló",
    queued: "En cola",
}

function PreTranscodeStatusCard({ enabled }: { enabled: boolean }) {
    const { data: jobs } = useGetPreTranscodeJobs(enabled)
    const active = jobs?.filter(j => j.status === "queued" || j.status === "running").length ?? 0
    const done = jobs?.filter(j => j.status === "completed").length ?? 0

    return (
        <StatusCard
            icon={Icons.status.cpu}
            label="Pre-Transcodificación"
            value={enabled ? (active > 0 ? `${active} EN COLA` : "EN ESPERA") : "INACTIVO"}
            tone={enabled ? "ok" : "off"}
            hint={enabled ? `${done} archivo(s) listos` : "Desactivada"}
        />
    )
}

function PreTranscodeQueue() {
    const { data: jobs } = useGetPreTranscodeJobs(true)
    const { mutate: cancel, isPending } = useCancelPreTranscode()

    if (!jobs?.length) {
        return (
            <Card className="p-6 mt-4">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                    No hay trabajos todavía. Los episodios se encolan solos cuando el reproductor los precarga
                    y necesitan transcodificarse.
                </p>
            </Card>
        )
    }

    return (
        <Card className="mt-4 divide-y divide-outline-variant/4">
            {jobs.map(job => (
                <div key={job.hash} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xs font-mono text-on-surface truncate" title={job.filePath}>
                            {job.filePath.split(/[\\/]/).pop()}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className={cn("text-label-sm font-bold uppercase tracking-widest", JOB_TONE[job.status])}>
                                {JOB_LABEL[job.status] ?? job.status}
                            </span>
                            {job.status === "running" && (
                                <span className="text-label-sm font-mono text-on-surface-variant">
                                    {job.progress.toFixed(0)}%
                                </span>
                            )}
                            {job.error && job.error !== "cancelled" && (
                                <span className="text-label-sm text-brand-destructive truncate" title={job.error}>
                                    {job.error}
                                </span>
                            )}
                        </div>
                        {job.status === "running" && (
                            <div className="h-1 w-full rounded-full bg-surface-container-high overflow-hidden">
                                <div
                                    className="h-full bg-brand-accent transition-all duration-base"
                                    style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
                                />
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => cancel({ hash: job.hash })}
                        disabled={isPending}
                        className="shrink-0 text-label-sm font-bold uppercase tracking-widest text-on-surface-variant hover:text-brand-destructive transition-colors px-3 py-1.5 rounded-lg border border-outline-variant hover:border-brand-destructive/30 active:scale-95 disabled:opacity-50"
                    >
                        {job.status === "completed" ? "Borrar" : "Cancelar"}
                    </button>
                </div>
            ))}
        </Card>
    )
}
