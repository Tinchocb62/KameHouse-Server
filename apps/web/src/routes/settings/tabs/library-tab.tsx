import React from "react"
import { TabsContent } from "@/components/ui/tabs/tabs"
import { Section, Card, PathList, OsToggle, OsSelect } from "../components"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"

interface LibraryTabProps {
    control: Control<SettingsFormValues>
}

export function LibraryTab({ control }: LibraryTabProps) {
    return (
        <TabsContent value="library" className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
            {/* Header */}
            <header className="space-y-3 pt-2">
                <div className="flex items-center gap-3 mb-1">
                    <div className="flex items-center justify-center p-1 rounded bg-[#ff6e3a]/10 border border-[#ff6e3a]/15">
                        <svg className="h-3.5 w-3.5 text-[#ff6e3a]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-650 font-mono">ALMACENAMIENTO · LOCAL PATHS</span>
                </div>
                <h1 className="text-5xl font-display tracking-wider text-white leading-none">
                    DIRECTORIOS DE <span className="text-zinc-650">BIBLIOTECA</span>
                </h1>
                <div className="h-[2px] w-12 bg-gradient-to-r from-[#ff6e3a]/50 to-transparent rounded-full" />
                <p className="text-zinc-550 text-sm font-medium leading-relaxed max-w-2xl">
                    Define los puntos de montaje locales en tu disco rígido. KameHouse lee estos directorios nativamente para indexar contenidos.
                </p>
            </header>

            {/* 1. Directorios de Almacenamiento */}
            <Section label="Directorios locales">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <Card>
                        <Controller
                            control={control}
                            name="library.seriesPaths"
                            render={({ field }) => (
                                <PathList
                                    label="Directorio de Series / Anime"
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
                                    placeholder="Ej. D:\Media\KameHouse\Animes o /media/anime"
                                />
                            )}
                        />
                    </Card>

                    <Card>
                        <Controller
                            control={control}
                            name="library.moviePaths"
                            render={({ field }) => (
                                <PathList
                                    label="Directorio de Películas"
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
                                    placeholder="Ej. D:\Media\KameHouse\Movies o /media/movies"
                                />
                            )}
                        />
                    </Card>
                </div>
            </Section>

            {/* 2. Escáner y Metadatos */}
            <Section label="Escáner y Metadatos">
                <Card className="divide-y divide-white/[0.03]">
                    <Controller
                        control={control}
                        name="library.autoScan"
                        render={({ field }) => (
                            <OsToggle
                                label="Escaneo Automático"
                                description="Escanear la biblioteca automáticamente cuando se detecten cambios en las carpetas de origen."
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
                                label="Escanear al Iniciar"
                                description="Realizar un escaneo automático de las carpetas de biblioteca al arrancar la aplicación."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="library.disableLocalScanning"
                        render={({ field }) => (
                            <OsToggle
                                label="Desactivar Escaneo Local"
                                description="Pausa temporalmente el escaneo de directorios locales si utilizas únicamente streaming externo."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="library.tmdbLanguage"
                        render={({ field }) => (
                            <OsSelect
                                label="Idioma de Metadatos"
                                description="Idioma preferido para descargar sinopsis, títulos y metadatos desde TMDB."
                                options={[
                                    { value: "es-MX", label: "Español Latino (Intertrack)" },
                                    { value: "ja-JP", label: "Japonés" },
                                    { value: "en-US", label: "Inglés" }
                                ]}
                                value={field.value || "es-MX"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>
        </TabsContent>
    )
}
