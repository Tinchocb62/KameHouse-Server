import React from "react"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { SettingsSection, SettingsCard, PathList, OsToggle, OsSelect } from "../components"
import { DragonBallScannerLive } from "../components/-dragonball-scanner-live"
import { Icons } from "@/components/ui/icons"

interface LibraryTabProps {
    control: Control<SettingsFormValues>
    searchQuery?: string
}

export function LibraryTab({ control }: LibraryTabProps) {
    return (
        <div className="w-full space-y-7 animate-in fade-in duration-base pb-8">

            {/* ═══════════════════════════════════════════════════════════════════
                1. DIRECTORIOS DE MEDIOS
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Directorios de Medios y Carpetas"
                description="Rutas del sistema de archivos donde se alojan tus series, anime y películas."
                icon={Icons.status.folder}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsCard divide={false} className="h-full">
                        <Controller
                            control={control}
                            name="library.seriesPaths"
                            render={({ field }) => (
                                <PathList
                                    label="Series & Anime"
                                    icon={Icons.navigation.tv}
                                    directories={field.value || []}
                                    onAdd={(newPath) => {
                                        const current = field.value || []
                                        if (!current.includes(newPath)) {
                                            field.onChange([...current, newPath])
                                        }
                                    }}
                                    onRemove={(removedPath) => {
                                        const current = field.value || []
                                        field.onChange(current.filter((p) => p !== removedPath))
                                    }}
                                    placeholder="Ej. D:\Media\Anime"
                                />
                            )}
                        />
                    </SettingsCard>

                    <SettingsCard divide={false} className="h-full">
                        <Controller
                            control={control}
                            name="library.moviePaths"
                            render={({ field }) => (
                                <PathList
                                    label="Películas & OVAs"
                                    icon={Icons.navigation.film}
                                    directories={field.value || []}
                                    onAdd={(newPath) => {
                                        const current = field.value || []
                                        if (!current.includes(newPath)) {
                                            field.onChange([...current, newPath])
                                        }
                                    }}
                                    onRemove={(removedPath) => {
                                        const current = field.value || []
                                        field.onChange(current.filter((p) => p !== removedPath))
                                    }}
                                    placeholder="Ej. D:\Media\Movies"
                                />
                            )}
                        />
                    </SettingsCard>
                </div>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                2. AUTOMATIZACIÓN DEL ESCÁNER
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Automatización del Escáner y Metadatos"
                description="Detección de cambios de archivos, sincronización al arrancar y proveedores de datos."
                icon={Icons.status.radar}
            >
                <SettingsCard>
                    <Controller
                        control={control}
                        name="library.autoScan"
                        render={({ field }) => (
                            <OsToggle
                                label="Escaneo Automático por Cambios"
                                description="Detecta archivos añadidos o borrados en tiempo real y actualiza la biblioteca."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="library.refreshLibraryOnStart"
                        render={({ field }) => (
                            <OsToggle
                                label="Escanear al Arrancar el Servidor"
                                description="Realiza una pasada de verificación rápida al encender KameHouse."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="library.scannerProvider"
                        render={({ field }) => (
                            <OsSelect
                                label="Proveedor de Metadatos y Escaneo"
                                description="Base de datos de metadatos prioritaria para indexar series, películas y episodios."
                                options={[
                                    { value: "anilist", label: "AniList (Recomendado — Banners HD)" },
                                    { value: "jikan", label: "Jikan (MyAnimeList — Sagas Canónicas)" },
                                    { value: "tmdb", label: "TMDB (The Movie Database)" },
                                ]}
                                value={field.value || "anilist"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="library.tmdbLanguage"
                        render={({ field }) => (
                            <OsSelect
                                label="Idioma Predeterminado de Metadatos"
                                description="Idioma para sinopsis, títulos de episodios y afiches oficiales."
                                options={[
                                    { value: "es-MX", label: "Español Latino (es-MX)" },
                                    { value: "es-ES", label: "Español España (es-ES)" },
                                    { value: "en-US", label: "Inglés (en-US)" },
                                    { value: "ja-JP", label: "Japonés (ja-JP)" },
                                ]}
                                value={field.value || "es-MX"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </SettingsCard>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                3. INSPECTOR EN VIVO
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Inspector de Escaneo en Vivo"
                description="Diagnóstico y métricas en tiempo real de la indexación de sagas Dragon Ball."
                icon={Icons.status.zap}
                badge={
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/25">
                        Radar Activo
                    </span>
                }
            >
                <DragonBallScannerLive />
            </SettingsSection>

        </div>
    )
}
