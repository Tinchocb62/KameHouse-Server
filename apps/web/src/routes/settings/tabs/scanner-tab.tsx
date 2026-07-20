import React from "react"
import { TabsContent } from "@/components/ui/tabs/tabs"
import { ScannerDashboard } from "@/components/ui/scanner/ScannerDashboard"
import { Section, OsToggle } from "../components"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"

interface ScannerTabProps {
    control: Control<SettingsFormValues>
}

export function ScannerTab({ control }: ScannerTabProps) {
    return (
        <TabsContent value="scanner" className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
            {/* Header */}
            <header className="space-y-3 pt-2">
                <div className="flex items-center gap-3 mb-1">
                    <div className="flex items-center justify-center p-1 rounded bg-[#ff6e3a]/10 border border-[#ff6e3a]/15">
                        <svg className="h-3.5 w-3.5 text-[#ff6e3a]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                        </svg>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-650 font-mono">SCOUTER ENGINE · INDEXACIÓN INTELIGENTE</span>
                </div>
                <h1 className="text-5xl font-display tracking-wider text-white leading-none">
                    SCOUTER <span className="text-zinc-655">ENGINE SETTINGS</span>
                </h1>
                <div className="h-[2px] w-12 bg-gradient-to-r from-[#ff6e3a]/50 to-transparent rounded-full" />
                <p className="text-zinc-550 text-sm font-medium leading-relaxed max-w-2xl">
                    Calibración fina del motor de inteligencia bayesiana y emparejamiento con coeficiente Dice.
                </p>
            </header>

            {/* Scouter engine parameters */}
            <div className="liquid-glass-frosted rounded-3xl p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Range slider for scoring threshold */}
                    <Controller
                        control={control}
                        name="library.scannerMatchingThreshold"
                        render={({ field }) => (
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-[11px] font-mono font-bold text-zinc-400">
                                    <span>Umbral de Sensibilidad (Scoring Threshold)</span>
                                    <span className="text-[#ff6e3a] font-bold">{(field.value || 82) / 100} (Dice)</span>
                                </div>
                                <input
                                    type="range"
                                    min="50"
                                    max="95"
                                    value={field.value || 82}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#ff6e3a] mt-2"
                                />
                                <p className="text-[10px] text-zinc-500 mt-1">Valores altos evitan falsos positivos pero requieren nombres de archivos limpios.</p>
                            </div>
                        )}
                    />

                    {/* Scan Frequency */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="scan-frequency-select" className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Frecuencia del Escáner en segundo plano</label>
                        <Controller
                            control={control}
                            name="library.scannerProvider"
                            render={({ field }) => (
                                <select
                                    id="scan-frequency-select"
                                    value={field.value || "manual"}
                                    onChange={field.onChange}
                                    className="w-full bg-black/40 ring-1 ring-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-350 focus:outline-none focus:ring-[#ff6e3a]/40 focus:border-transparent transition-all cursor-pointer [&>option]:bg-zinc-950 [&>option]:text-white mt-1.5"
                                >
                                    <option value="manual">Solo manual o por Debouncer en tiempo real</option>
                                    <option value="6h">Cada 6 horas</option>
                                    <option value="24h">Cada 24 horas</option>
                                </select>
                            )}
                        />
                    </div>
                </div>

                <hr className="border-white/5" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Matching Algorithm */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="matching-algorithm-select" className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Algoritmo de Emparejamiento</label>
                        <Controller
                            control={control}
                            name="library.scannerMatchingAlgorithm"
                            render={({ field }) => (
                                <select
                                    id="matching-algorithm-select"
                                    value={field.value || "dice"}
                                    onChange={field.onChange}
                                    className="w-full bg-black/40 ring-1 ring-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-350 focus:outline-none focus:ring-[#ff6e3a]/40 focus:border-transparent transition-all cursor-pointer [&>option]:bg-zinc-950 [&>option]:text-white mt-1.5"
                                >
                                    <option value="dice">Coeficiente Dice (Recomendado)</option>
                                    <option value="levenshtein">Distancia de Levenshtein</option>
                                    <option value="stringMatch">Coincidencia de Cadenas Simple</option>
                                </select>
                            )}
                        />
                    </div>

                    {/* Fallback Metadata */}
                    <div className="flex flex-col justify-center pt-2">
                        <Controller
                            control={control}
                            name="library.useFallbackMetadataProvider"
                            render={({ field }) => (
                                <OsToggle
                                    label="Proveedor de Metadatos de Respaldo"
                                    description="Habilita fuentes de metadatos secundarias si falla la consulta del servidor principal."
                                    checked={!!field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Scanner Bento Dashboard */}
            <Section label="Diagnóstico en Vivo">
                <div className="pt-2">
                    <ScannerDashboard />
                </div>
            </Section>
        </TabsContent>
    )
}
