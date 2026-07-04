import React from "react"
import { Section, Card, PathList, OsToggle, OsSelect } from "../components"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"

interface LibraryTabProps {
    control: Control<SettingsFormValues>
}


export function LibraryTab({ control }: LibraryTabProps) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
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

            {/* 2. Escaneo de biblioteca */}
            <Section label="Escaneo de Biblioteca">
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

            {/* 5. Contenido */}
            <Section label="Contenido">
                <Card className="divide-y divide-outline-variant/4">
                    <Controller
                        control={control}
                        name="library.disableAnimeCardTrailers"
                        render={({ field }) => (
                            <OsToggle
                                label="Desactivar Trailers en Tarjetas de Anime"
                                description="Evita la reproducción automática de trailers al pasar el cursor sobre una tarjeta."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>

            {/* 6. Metadatos */}
            <Section label="Metadatos">
                <Card className="divide-y divide-outline-variant/4">
                    <Controller
                        control={control}
                        name="library.tmdbLanguage"
                        render={({ field }) => (
                            <OsSelect
                                label="Idioma de Metadatos"
                                description="Idioma preferido para descargar sinopsis, títulos y metadatos."
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
