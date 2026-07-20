import React from "react"
import { Section, Card, PathList, OsToggle, OsSelect } from "../components"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"

interface DirectoriesTabProps {
    control: Control<SettingsFormValues>
}

export function DirectoriesTab({ control }: DirectoriesTabProps) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            {/* Directorios de Almacenamiento */}
            <Section label="Directorios locales" description="Carpetas donde KameHouse buscará tus medios.">
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

            {/* Escaneo de biblioteca (automático) */}
            <Section label="Comportamiento del Escáner">
                <Card className="divide-y divide-outline-variant/4">
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
                </Card>
            </Section>

            {/* Metadatos */}
            <Section label="Metadatos">
                <Card className="divide-y divide-outline-variant/4">
                    <Controller
                        control={control}
                        name="library.tmdbLanguage"
                        render={({ field }) => (
                            <OsSelect
                                label="Idioma de Metadatos"
                                description="Idioma preferido para descargar sinopsis, títulos y metadatos de TMDB/OMDB."
                                options={[
                                    { value: "es-MX", label: "Español Latino" },
                                    { value: "es-ES", label: "Español (España)" },
                                    { value: "en-US", label: "Inglés" },
                                    { value: "ja-JP", label: "Japonés" },
                                ]}
                                value={field.value || "es-MX"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>
        </div>
    )
}
