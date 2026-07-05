import React from "react"
import { Section, Card, OsToggle, OsSelect, OsInput, StatusCard } from "../components"
import { RadioCardGroup } from "@/components/settings/radio-card-group"
import { RangeSlider } from "@/components/settings/range-slider"
import { type Control, Controller, useWatch } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { LucideCpu, LucideZap, LucidePlay } from "lucide-react"

interface StreamingTabProps {
    control: Control<SettingsFormValues>
}

const HW_ACCEL_OPTIONS = [
    { value: "", label: "Automático (Recomendado)", desc: "Detecta Nvidia NVENC, Intel QuickSync, VAAPI, AMD AMF", badge: "AUTO" },
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
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
            {/* Transcodificación por Hardware */}
            <Section label="Transcodificación por Hardware (GPU)">
                <Card className="space-y-6 p-6">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-brand-accent uppercase tracking-wide">Aceleración por Hardware</h3>
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
                                value={field.value}
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
                                label="Hilos de Transcodificación (Threads)"
                                description="0 = automático (usa todos los núcleos lógicos disponibles)."
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
                                description="Transcodifica media en segundo plano para reproducción instantánea. Requiere espacio en disco."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="mediastream.preTranscodeLibraryDir"
                        render={({ field }) => (
                            <OsInput
                                label="Directorio de Pre-Transcodificación"
                                description="Carpeta donde se guardan los archivos pre-transcodificados."
                                placeholder="Ej. /mnt/cache/pretranscode o D:\Cache\Pretranscode"
                                value={field.value || ""}
                                onChange={field.onChange}
                                isMono
                            />
                        )}
                    />
                </Card>
            </Section>

            {/* Configuración General de Streaming */}
            <Section label="Configuración General">
                <Card className="divide-y divide-outline-variant/4">
                    <Controller
                        control={control}
                        name="mediastream.transcodeEnabled"
                        render={({ field }) => (
                            <OsToggle
                                label="Habilitar Transcodificación"
                                description="Permite al servidor transcodificar video/audio cuando el cliente no soporta el codec nativo."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="mediastream.directPlayOnly"
                        render={({ field }) => (
                            <OsToggle
                                label="Solo Reproducción Directa (Direct Play)"
                                description="Fuerza reproducción nativa sin transcodificar. Fallará si el dispositivo no soporta el codec."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="mediastream.disableAutoSwitchToDirectPlay"
                        render={({ field }) => (
                            <OsToggle
                                label="Desactivar Cambio Automático a Direct Play"
                                description="Evita que el servidor intente cambiar a reproducción directa si la transcodificación falla."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
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
                        icon={LucideZap}
                        label="Transcodificación"
                        value={mediastream?.transcodeEnabled ? "ACTIVO" : "INACTIVO"}
                        tone={mediastream?.transcodeEnabled ? "ok" : "off"}
                        hint={`HW: ${hwAccelLabel(mediastream?.transcodeHwAccel || "")} · ${mediastream?.transcodeThreads || 0 || "auto"} threads · ${mediastream?.transcodePreset || "fast"}`}
                    />
                    <StatusCard
                        icon={LucideCpu}
                        label="Pre-Transcodificación"
                        value={mediastream?.preTranscodeEnabled ? "ACTIVO" : "INACTIVO"}
                        tone={mediastream?.preTranscodeEnabled ? "ok" : "off"}
                        hint={mediastream?.preTranscodeLibraryDir || "Directorio no configurado"}
                    />
                    <StatusCard
                        icon={LucidePlay}
                        label="Direct Play"
                        value={mediastream?.directPlayOnly ? "FORZADO" : "AUTOMÁTICO"}
                        tone="ok"
                        hint={mediastream?.disableAutoSwitchToDirectPlay ? "Sin fallback automático" : "Con fallback automático"}
                    />
                </div>
                <p className="text-[10px] text-on-surface-variant mt-3 px-1">
                    Según configuración actual del formulario (sin verificar en runtime).
                </p>
            </Section>
        </div>
    )
}
