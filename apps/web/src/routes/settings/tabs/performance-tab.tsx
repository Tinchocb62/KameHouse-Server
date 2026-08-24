import React, { useEffect } from "react"
import { type Control, Controller, useFormContext, useWatch } from "react-hook-form"
import { motion } from "framer-motion"
import { type SettingsFormValues } from "../index"
import { usePerformanceStore, type PerformanceProfile } from "@/lib/hardware/performance-store"
import { useShallow } from "zustand/react/shallow"
import { useGetFFmpegStatus, useInstallFFmpeg } from "@/api/hooks/mediastream.hooks"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"
import { toast } from "sonner"
import { RadioCardGroup } from "@/components/settings/radio-card-group"
import { SettingsSection, SettingsCard, OsToggle, OsSelect, OsInput } from "../components"

interface PerformanceTabProps {
    control: Control<SettingsFormValues>
    searchQuery?: string
}

const PROFILES: { id: PerformanceProfile; label: string; desc: string; icon: React.ElementType; badge: string }[] = [
    { id: "auto", label: "Auto Inteligente", desc: "Asigna el perfil óptimo según tu hardware en tiempo real.", icon: Icons.status.sparkles, badge: "AUTO" },
    { id: "ultra", label: "Ultra / Alto Rendimiento", desc: "Efectos visuales completos, Liquid Glass y GPU-Next.", icon: Icons.status.zap, badge: "ULTRA" },
    { id: "balanced", label: "Equilibrado", desc: "Balance óptimo entre estética y 60 FPS estables.", icon: Icons.status.activity, badge: "BALANCED" },
    { id: "eco", label: "Ahorro / PC Modesta", desc: "Fondos acelerados sin blurs pesados, menor uso de RAM/batería.", icon: Icons.ui.shield, badge: "ECO" },
]

const HW_ACCEL_OPTIONS = [
    { value: "auto", label: "Automático (Recomendado)", desc: "Detecta NVENC, QuickSync, VAAPI, AMF", badge: "AUTO" },
    { value: "nvenc", label: "NVIDIA NVENC", desc: "GeForce GTX / RTX series", badge: "NVENC" },
    { value: "qsv", label: "Intel QuickSync (QSV)", desc: "Gráficos Intel (6th gen+)", badge: "QSV" },
    { value: "amf", label: "AMD AMF", desc: "AMD Radeon (RDNA / RX series)", badge: "AMF" },
    { value: "videotoolbox", label: "VideoToolbox (macOS)", desc: "Apple Silicon (M1/M2/M3/M4)", badge: "APPLE" },
    { value: "none", label: "Desactivado (CPU)", desc: "Renderizado y transcodificación por software", badge: "CPU" },
]

const PRESET_OPTIONS = [
    { value: "ultrafast", label: "Ultra Rápido (Mínimo consumo de CPU)" },
    { value: "fast", label: "Rápido (Recomendado - Balance Óptimo)" },
    { value: "medium", label: "Medio (Calidad Estándar)" },
    { value: "slow", label: "Lento (Máxima Compresión)" },
]

type PlaybackPolicy = "auto" | "direct-only" | "transcode-strict"

const POLICY_OPTIONS: { value: PlaybackPolicy; label: string; desc: string; badge: string }[] = [
    { value: "auto", label: "Automático (Recomendado)", desc: "Direct Play nativo; transcodifica solo si el cliente no soporta el codec original.", badge: "AUTO" },
    { value: "direct-only", label: "Solo Direct Play", desc: "Siempre transmite sin convertir. Falla si el navegador no soporta el video.", badge: "DIR" },
    { value: "transcode-strict", label: "Transcodificación Estricta", desc: "Fuerza la conversión a H.264 para compatibilidad universal.", badge: "TC" },
]

type MediastreamValues = SettingsFormValues["mediastream"] | undefined

function policyOf(m: MediastreamValues): PlaybackPolicy {
    if (m?.directPlayOnly) return "direct-only"
    if (m?.transcodeEnabled && m?.disableAutoSwitchToDirectPlay) return "transcode-strict"
    return "auto"
}

export function PerformanceTab({ control, searchQuery }: PerformanceTabProps) {
    const transcodeHwAccel = useWatch({ control, name: "mediastream.transcodeHwAccel" })
    const {
        hardwareSpecs,
        isDetecting,
        detectHardware,
        performanceProfile,
        setPerformanceProfile,
        autoGovernorEnabled,
        setAutoGovernorEnabled,
        getEffectiveTier,
    } = usePerformanceStore(
        useShallow((state) => ({
            hardwareSpecs: state.hardwareSpecs,
            isDetecting: state.isDetecting,
            detectHardware: state.detectHardware,
            performanceProfile: state.performanceProfile,
            setPerformanceProfile: state.setPerformanceProfile,
            autoGovernorEnabled: state.autoGovernorEnabled,
            setAutoGovernorEnabled: state.setAutoGovernorEnabled,
            getEffectiveTier: state.getEffectiveTier,
        }))
    )

    useEffect(() => {
        if (!hardwareSpecs) {
            detectHardware().catch(() => {})
        }
    }, [hardwareSpecs, detectHardware])

    const handleRefreshHardware = async () => {
        toast.loading("Analizando componentes de hardware...", { id: "hw-probe" })
        try {
            const specs = await detectHardware(true)
            toast.success(`Hardware analizado: ${specs.isDedicatedGpu ? "GPU Dedicada detectada" : "GPU Integrada detectada"}`, { id: "hw-probe" })
        } catch {
            toast.error("No se pudo completar el análisis de hardware", { id: "hw-probe" })
        }
    }

    const effectiveTier = getEffectiveTier()

    return (
        <div className="w-full space-y-7 animate-in fade-in duration-base pb-8">

            {/* ═══════════════════════════════════════════════════════════════════
                1. DIAGNÓSTICO DE HARDWARE Y PERFIL PRINCIPAL
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Perfil de Rendimiento y Hardware"
                description="Equilibrio entre fidelidad visual y consumo de recursos en tu equipo."
                icon={Icons.status.zap}
                badge={
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25">
                            TIER: {effectiveTier.toUpperCase()}
                        </span>
                        <button
                            type="button"
                            onClick={handleRefreshHardware}
                            disabled={isDetecting}
                            className="text-xs font-mono text-on-surface-variant/80 hover:text-brand-accent flex items-center gap-1.5 transition-colors"
                        >
                            <Icons.ui.refresh className={cn("w-3.5 h-3.5", isDetecting && "animate-spin text-brand-accent")} />
                            <span className="hidden sm:inline">Re-analizar</span>
                        </button>
                    </div>
                }
            >
                <SettingsCard divide={false} className="p-5 md:p-6 space-y-5">
                    {/* Tarjetas de Telemetría */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-0.5">
                            <span className="text-[10px] font-mono uppercase text-on-surface-variant/60 block">GPU</span>
                            <p className="text-xs font-bold text-on-surface truncate" title={hardwareSpecs?.gpuRenderer || "GPU"}>
                                {hardwareSpecs?.gpuRenderer || "Predeterminada"}
                            </p>
                            <span className="text-[9px] font-mono text-emerald-400">
                                {hardwareSpecs?.isDedicatedGpu ? "Dedicada" : "Integrada"}
                            </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-0.5">
                            <span className="text-[10px] font-mono uppercase text-on-surface-variant/60 block">CPU</span>
                            <p className="text-xs font-bold text-on-surface truncate">
                                {hardwareSpecs?.cpuCores ? `${hardwareSpecs.cpuCores} Núcleos` : "Compatible"}
                            </p>
                            <span className="text-[9px] font-mono text-cyan-400">Hilos: Auto</span>
                        </div>

                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-0.5">
                            <span className="text-[10px] font-mono uppercase text-on-surface-variant/60 block">RAM</span>
                            <p className="text-xs font-bold text-on-surface truncate">
                                {hardwareSpecs?.deviceMemoryGB ? `${hardwareSpecs.deviceMemoryGB} GB` : "RAM OK"}
                            </p>
                            <span className="text-[9px] font-mono text-purple-400">Buffer Dinámico</span>
                        </div>

                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-0.5">
                            <span className="text-[10px] font-mono uppercase text-on-surface-variant/60 block">Modo Activo</span>
                            <p className="text-xs font-bold text-on-surface uppercase truncate">
                                {performanceProfile}
                            </p>
                            <span className="text-[9px] font-mono text-amber-400">Acelerado</span>
                        </div>
                    </div>

                    {/* Selector de Perfiles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                        {PROFILES.map((p) => {
                            const isSelected = performanceProfile === p.id
                            const ProfileIcon = p.icon
                            return (
                                <motion.button
                                    key={p.id}
                                    type="button"
                                    whileHover={{ scale: 1.025, y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                    onClick={() => setPerformanceProfile(p.id)}
                                    className={cn(
                                        "flex flex-col p-3.5 rounded-xl border text-left transition-colors duration-200",
                                        isSelected
                                            ? "bg-brand-accent/10 border-brand-accent shadow-[0_0_16px_hsl(var(--brand-accent)/0.25)] ring-1 ring-brand-accent/40"
                                            : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center border transition-all",
                                            isSelected ? "bg-brand-accent/20 border-brand-accent/40 text-brand-accent shadow-[0_0_8px_hsl(var(--brand-accent)/0.3)]" : "bg-white/5 border-white/10 text-on-surface-variant"
                                        )}>
                                            <ProfileIcon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-on-surface-variant border border-white/10">{p.badge}</span>
                                    </div>
                                    <span className={cn("text-xs font-bold truncate", isSelected ? "text-brand-accent" : "text-on-surface")}>
                                        {p.label}
                                    </span>
                                    <span className="text-[10px] text-on-surface-variant/70 line-clamp-2 mt-0.5 leading-tight">{p.desc}</span>
                                </motion.button>
                            )
                        })}
                    </div>

                    <div className="pt-2 border-t border-white/[0.05]">
                        <OsToggle
                            label="Gobernador Térmico Inteligente (Auto-Throttle)"
                            description="Reduce automáticamente los efectos pesados si detecta caídas de frames o sobrecalentamiento."
                            checked={autoGovernorEnabled}
                            onChange={setAutoGovernorEnabled}
                        />
                    </div>
                </SettingsCard>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                2. MOTOR DE VIDEO Y TRANSCODIFICACIÓN GPU
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Motor de Video y Aceleración GPU"
                description="Aceleración por hardware dedicada para reproducción y conversión de video."
                icon={Icons.status.sparkles}
                badge={
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {transcodeHwAccel?.toUpperCase() || "AUTO"}
                    </span>
                }
            >
                <SettingsCard divide={false} className="p-5 md:p-6 space-y-5">
                    <Controller
                        control={control}
                        name="mediastream.transcodeHwAccel"
                        render={({ field }) => (
                            <RadioCardGroup
                                name="transcodeHwAccel"
                                options={HW_ACCEL_OPTIONS}
                                value={field.value || "auto"}
                                onChange={field.onChange}
                            />
                        )}
                    />

                    <div className="pt-2 border-t border-white/[0.05]">
                        <Controller
                            control={control}
                            name="mediastream.transcodePreset"
                            render={({ field }) => (
                                <OsSelect
                                    value={field.value || "fast"}
                                    onChange={field.onChange}
                                    options={PRESET_OPTIONS}
                                    label="Preset de Transcodificación"
                                    description="Rápido ofrece balance óptimo; lento produce mayor compresión."
                                />
                            )}
                        />
                    </div>
                </SettingsCard>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                3. POLÍTICA DE REPRODUCCIÓN Y DIRECT PLAY
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Política de Reproducción y Transmisión"
                description="Decisión de transmisión nativa directa vs transcodificación sobre la marcha."
                icon={Icons.media.play}
            >
                <SettingsCard divide={false} className="p-5 md:p-6">
                    <PlaybackPolicyPicker control={control} />
                </SettingsCard>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                4. BINARIOS DEL SISTEMA (FFMPEG)
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Binarios del Motor (FFmpeg)"
                description="Herramientas de decodificación de video del servidor."
                icon={Icons.status.server}
                collapsible
                defaultOpen={false}
                searchQuery={searchQuery}
            >
                <SettingsCard divide={false} className="p-5 space-y-4">
                    <FFmpegStatusSection />

                    <div className="divide-y divide-white/[0.04] rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden">
                        <Controller
                            control={control}
                            name="mediastream.ffmpegPath"
                            render={({ field }) => (
                                <OsInput
                                    label="Ruta Personalizada FFmpeg"
                                    description="Opcional. Deja vacío para usar el binario incluido con KameHouse."
                                    placeholder="Ej. C:\ffmpeg\bin\ffmpeg.exe o /usr/bin/ffmpeg"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    isMono
                                />
                            )}
                        />
                    </div>
                </SettingsCard>
            </SettingsSection>

        </div>
    )
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

        setValue("mediastream.transcodeEnabled", flags.transcodeEnabled, { shouldDirty: true })
        setValue("mediastream.directPlayOnly", flags.directPlayOnly, { shouldDirty: true })
        setValue("mediastream.disableAutoSwitchToDirectPlay", flags.disableAutoSwitchToDirectPlay, { shouldDirty: true })
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {POLICY_OPTIONS.map((opt) => {
                const isSelected = current === opt.value
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPolicy(opt.value)}
                        className={cn(
                            "flex flex-col p-4 rounded-xl border text-left transition-all active:scale-[0.99]",
                            isSelected
                                ? "bg-brand-accent/10 border-brand-accent shadow-[0_0_15px_hsl(var(--brand-accent)/0.2)] ring-1 ring-brand-accent/40"
                                : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                        )}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-on-surface">{opt.label}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-on-surface-variant border border-white/10">
                                {opt.badge}
                            </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant/80 line-clamp-3 leading-snug">{opt.desc}</p>
                    </button>
                )
            })}
        </div>
    )
}

function FFmpegStatusSection() {
    const { data: ffmpegStatus, isLoading, refetch } = useGetFFmpegStatus()
    const { mutate: installFFmpeg, isPending: isInstalling } = useInstallFFmpeg()

    const handleInstall = () => {
        installFFmpeg(undefined, {
            onSuccess: (data) => {
                if (data?.started) {
                    toast.success("Descarga e instalación de FFmpeg iniciada...")
                    refetch()
                } else {
                    toast.error("No se pudo iniciar la instalación")
                }
            },
            onError: (err) => {
                toast.error(err instanceof Error ? err.message : "Error al descargar e instalar FFmpeg")
            }
        })
    }

    if (isLoading) {
        return (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center gap-3">
                <Icons.ui.spinner className="w-4 h-4 animate-spin text-brand-accent" />
                <span className="text-xs text-on-surface-variant">Verificando binarios de FFmpeg...</span>
            </div>
        )
    }

    const isInstalled = ffmpegStatus?.ffmpegAvailable ?? false

    return (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-on-surface">Estado de FFmpeg</span>
                    {isInstalled ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Detectado
                        </span>
                    ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                            No instalado
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-on-surface-variant font-mono">
                    {ffmpegStatus?.ffmpegPath || "Ubicación del binario gestionada automáticamente"}
                </p>
            </div>
            {!isInstalled && (
                <button
                    type="button"
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="shrink-0 px-3.5 py-2 rounded-lg bg-brand-accent text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                >
                    {isInstalling ? <Icons.ui.spinner className="w-3.5 h-3.5 animate-spin" /> : <Icons.ui.download className="w-3.5 h-3.5" />}
                    <span>{isInstalling ? "Instalando..." : "Descargar e Instalar FFmpeg"}</span>
                </button>
            )}
        </div>
    )
}

