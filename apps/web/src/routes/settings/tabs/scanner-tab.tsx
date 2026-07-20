import React from "react"
import { Section, Card, OsToggle, OsSelect, ScanButton } from "../components"
import { RangeSlider } from "@/components/settings/range-slider"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { useScanLocalFiles } from "@/api/hooks/scan.hooks"

interface ScannerTabProps {
    control: Control<SettingsFormValues>
}

export function ScannerTab({ control }: ScannerTabProps) {
    const { mutate: scanLibrary, isPending } = useScanLocalFiles()

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            <Section label="Motor de Emparejamiento">
                <Card className="divide-y divide-outline-variant/4">
                    <Controller
                        control={control}
                        name="library.scannerMatchingThreshold"
                        render={({ field }) => (
                            <RangeSlider
                                label="Umbral de Sensibilidad (Scoring Threshold)"
                                description="Valores altos evitan falsos positivos pero requieren nombres de archivos limpios."
                                min={50}
                                max={95}
                                value={field.value || 82}
                                onChange={field.onChange}
                                formatValue={(v) => `${(v / 100).toFixed(2)} (Dice)`}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="library.scannerProvider"
                        render={({ field }) => {
                            const isTmdb = field.value === "tmdb"
                            return (
                                <OsSelect
                                    label="Proveedor del Escáner"
                                    description="Fuente de metadatos usada durante el escaneo automático de la biblioteca."
                                    options={[
                                        { value: "tmdb", label: "TMDB — series y películas" },
                                        { value: "anidb", label: "Jikan + AniDB — anime, fallback" },
                                    ]}
                                    value={isTmdb ? "tmdb" : "anidb"}
                                    onChange={field.onChange}
                                />
                            )
                        }}
                    />
                    <Controller
                        control={control}
                        name="library.scannerUseLegacyMatching"
                        render={({ field }) => (
                            <OsToggle
                                label="Matching Legacy"
                                description="Desactiva el motor de emparejamiento bayesiano y usa el algoritmo anterior."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="library.scannerStrictStructure"
                        render={({ field }) => (
                            <OsToggle
                                label="Estructura Estricta de Carpetas"
                                description="Exige que los archivos sigan una estructura de carpetas predecible para ser indexados."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>

            <Section label="Acciones de escaneo" description="Inicia un escaneo manual de los directorios de tu biblioteca local.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <ScanButton
                        title="Escanear Biblioteca"
                        description="Busca nuevos episodios y películas en las carpetas de origen."
                        onClick={() => scanLibrary({ mode: "fast", skipLockedFiles: false, skipIgnoredFiles: false })}
                        loading={isPending}
                    />
                    <ScanButton
                        title="Re-Scan Forzado"
                        description="Vuelve a analizar toda la biblioteca desde cero ignorando la caché."
                        onClick={() => scanLibrary({ mode: "deep", skipLockedFiles: false, skipIgnoredFiles: false })}
                        loading={isPending}
                        destructive
                    />
                </div>
            </Section>
        </div>
    )
}
