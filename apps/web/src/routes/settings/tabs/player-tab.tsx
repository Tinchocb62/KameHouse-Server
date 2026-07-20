import React from "react"
import { TabsContent } from "@/components/ui/tabs/tabs"
import { Section, Card, OsToggle } from "../components"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { useAppStore } from "@/lib/store"

interface PlayerTabProps {
    control: Control<SettingsFormValues>
}

export function PlayerTab({ control }: PlayerTabProps) {
    const { marathonMode, setMarathonMode } = useAppStore()
    return (
        <TabsContent value="player" className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
            {/* Header */}
            <header className="space-y-3 pt-2">
                <div className="flex items-center gap-3 mb-1">
                    <div className="flex items-center justify-center p-1 rounded bg-[#ff6e3a]/10 border border-[#ff6e3a]/15">
                        <svg className="h-3.5 w-3.5 text-[#ff6e3a]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-650 font-mono">STREAMING ENGINE · CASSETTE HLS</span>
                </div>
                <h1 className="text-5xl font-display tracking-wider text-white leading-none">
                    CASSETTE <span className="text-zinc-650">VIDEO ENGINE</span>
                </h1>
                <div className="h-[2px] w-12 bg-gradient-to-r from-[#ff6e3a]/50 to-transparent rounded-full" />
                <p className="text-zinc-550 text-sm font-medium leading-relaxed max-w-2xl">
                    Ajusta la decodificación por hardware GPU, el búfer de streaming HLS y la optimización de subtítulos.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hardware Transcoding */}
                <div className="liquid-glass-frosted rounded-3xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-[#ff6e3a] uppercase tracking-wide">Transcodificación por Hardware</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        Asigna el procesamiento de codecs pesados (como HEVC 10-bit x265) directo al chip de video de tu tarjeta gráfica.
                    </p>

                    <Controller
                        control={control}
                        name="mediastream.transcodeHwAccel"
                        render={({ field }) => (
                            <div className="space-y-3 pt-2">
                                {[
                                    { id: "auto", label: "Detección Automática (Recomendado)", desc: "Detecta y usa de forma automática Nvidia NVENC, Intel QuickSync o VAAPI" },
                                    { id: "nvidia", label: "NVIDIA NVENC", desc: "Optimizado para tarjetas gráficas GeForce GTX/RTX" },
                                    { id: "qsv", label: "Intel QuickSync (QSV)", desc: "Procesamiento vía Gráficos Integrados Intel" },
                                    { id: "none", label: "Desactivado (CPU)", desc: "Usa el procesador para transcodificación de software" }
                                ].map((gpu) => (
                                    <div
                                        key={gpu.id}
                                        className={`flex items-start gap-4 p-4 bg-[#050507]/45 rounded-xl border transition-all duration-300 cursor-pointer ${
                                            (field.value === gpu.id || (!field.value && gpu.id === "none"))
                                                ? "border-[#ff6e3a]/30 bg-[#ff6e3a]/[0.01]"
                                                : "border-white/[0.04] hover:border-white/10"
                                        }`}
                                        onClick={() => field.onChange(gpu.id)}
                                    >
                                        <input
                                            id={`hw-accel-radio-${gpu.id}`}
                                            type="radio"
                                            name="transcodeHwAccel"
                                            value={gpu.id}
                                            checked={field.value === gpu.id || (!field.value && gpu.id === "none")}
                                            onChange={() => field.onChange(gpu.id)}
                                            className="mt-1 accent-[#ff6e3a]"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="-mt-0.5">
                                            <label
                                                htmlFor={`hw-accel-radio-${gpu.id}`}
                                                className="text-xs font-bold text-white block tracking-tight cursor-pointer"
                                            >
                                                {gpu.label}
                                            </label>
                                            <span className="text-[10px] text-zinc-550 block mt-0.5">{gpu.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    />
                </div>

                {/* Buffer Settings and direct play */}
                <div className="liquid-glass-frosted rounded-3xl p-6 space-y-6 flex flex-col justify-between">
                    <div className="space-y-5">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">Búfer y Reproducción</h3>
                        
                        <Controller
                            control={control}
                            name="mediastream.transcodeThreads"
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-mono font-bold text-zinc-550">
                                        <span>Pre-carga de segmentos HLS</span>
                                        <span className="text-[#ff6e3a]">{field.value || 4} segmentos</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="2"
                                        max="16"
                                        value={field.value || 4}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#ff6e3a]"
                                    />
                                </div>
                            )}
                        />

                        <div className="border-t border-white/5 pt-4 space-y-4">
                            <Controller
                                control={control}
                                name="mediastream.transcodeEnabled"
                                render={({ field }) => (
                                    <OsToggle
                                        label="WebGL Subtitle Direct Play"
                                        description="Renderiza estilos de subtítulos avanzados (.ASS) al vuelo sin requerir transcodificación."
                                        checked={!!field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />

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
                        </div>
                    </div>
                </div>
            </div>

            {/* FFMPEG / FFPROBE Paths */}
            <Section label="Parámetros del Sistema">
                <Card className="divide-y divide-white/[0.03]">
                    <Controller
                        control={control}
                        name="mediastream.ffmpegPath"
                        render={({ field }) => (
                            <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 hover:bg-white/[0.015] transition-all duration-205 gap-5 group/input">
                                <div className="space-y-0.5 flex-1 max-w-xl">
                                    <label htmlFor="ffmpeg-path-input" className="text-sm font-semibold text-zinc-200 group-hover/input:text-white transition-colors tracking-tight cursor-pointer">Ruta Ejecutable FFmpeg</label>
                                    <p className="text-xs text-zinc-550 leading-relaxed font-medium">Ubicación del binario ffmpeg en el sistema local.</p>
                                </div>
                                <input
                                    id="ffmpeg-path-input"
                                    type="text"
                                    placeholder="Ej. /usr/bin/ffmpeg o C:\ffmpeg\ffmpeg.exe"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 w-full md:w-72 text-white placeholder-zinc-700 text-xs focus:outline-none focus:border-[#ff6e3a]/30 font-mono"
                                />
                            </div>
                        )}
                    />
                    <Controller
                        control={control}
                        name="mediastream.ffprobePath"
                        render={({ field }) => (
                            <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 hover:bg-white/[0.015] transition-all duration-205 gap-5 group/input">
                                <div className="space-y-0.5 flex-1 max-w-xl">
                                    <label htmlFor="ffprobe-path-input" className="text-sm font-semibold text-zinc-200 group-hover/input:text-white transition-colors tracking-tight cursor-pointer">Ruta Ejecutable FFprobe</label>
                                    <p className="text-xs text-zinc-550 leading-relaxed font-medium">Ubicación del binario ffprobe en el sistema local.</p>
                                </div>
                                <input
                                    id="ffprobe-path-input"
                                    type="text"
                                    placeholder="Ej. /usr/bin/ffprobe o C:\ffmpeg\ffprobe.exe"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 w-full md:w-72 text-white placeholder-zinc-700 text-xs focus:outline-none focus:border-[#ff6e3a]/30 font-mono"
                                />
                            </div>
                        )}
                    />
                </Card>
            </Section>
        </TabsContent>
    )
}
