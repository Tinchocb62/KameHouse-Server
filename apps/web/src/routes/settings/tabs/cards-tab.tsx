import React from "react"
import { Section, Card, OsToggle } from "../components"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"

interface CardsTabProps {
    control: Control<SettingsFormValues>
}

export function CardsTab({ control }: CardsTabProps) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            <Section label="Tarjetas de Medios" description="Configura la apariencia de las tarjetas de series y películas.">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="Platform.hideAudienceScore"
                        render={({ field }) => (
                            <OsToggle
                                label="Ocultar Puntuación de Audiencia"
                                description="No muestra las estrellas ni el porcentaje de puntuación en las portadas."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeShowAnimeUnwatchedCount"
                        render={({ field }) => (
                            <OsToggle
                                label="Mostrar Contador de No Vistos"
                                description="Muestra un indicador rojo con la cantidad de episodios no vistos en las portadas."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>

            <Section label="Tarjetas de Episodios" description="Personaliza las tarjetas de los episodios individuales.">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="theme.themeSmallerEpisodeCarouselSize"
                        render={({ field }) => (
                            <OsToggle
                                label="Carrusel Compacto"
                                description="Reduce el tamaño de las tarjetas en los carruseles de episodios."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeUseLegacyEpisodeCard"
                        render={({ field }) => (
                            <OsToggle
                                label="Estilo Clásico de Tarjeta"
                                description="Usa el diseño tradicional en lugar del diseño moderno."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeHideEpisodeCardDescription"
                        render={({ field }) => (
                            <OsToggle
                                label="Ocultar Descripción"
                                description="No muestra la sinopsis del episodio en las tarjetas."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeShowEpisodeCardAnimeInfo"
                        render={({ field }) => (
                            <OsToggle
                                label="Mostrar Info de Anime"
                                description="Muestra puntuación, año, estado en las tarjetas de episodios (si aplica)."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeHideDownloadedEpisodeCardFilename"
                        render={({ field }) => (
                            <OsToggle
                                label="Ocultar Nombre de Archivo"
                                description="Oculta la ruta del archivo cuando no hay un título disponible."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>

            <Section label="Comportamiento del Carrusel" description="Ajustes de movimiento y control de los carruseles.">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="theme.themeDisableCarouselAutoScroll"
                        render={({ field }) => (
                            <OsToggle
                                label="Desactivar Auto-Scroll"
                                description="Los carruseles no se desplazarán automáticamente al cargar la página."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>
        </div>
    )
}
