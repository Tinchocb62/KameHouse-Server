import React from "react"
import { Section, Card, OsToggle, OsSelect, OsInput } from "../components"
import { RangeSlider } from "@/components/settings/range-slider"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"

interface ViewsTabProps {
    control: Control<SettingsFormValues>
}

function normalizeInfoBoxSize(val: string | undefined | null) {
    if (!val || val === "default") return "fluid"
    return val
}

export function ViewsTab({ control }: ViewsTabProps) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            <Section label="Pantalla de Biblioteca" description="Ajustes visuales exclusivos para la sección general de tu biblioteca de medios.">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="theme.themeLibraryScreenBannerType"
                        render={({ field }) => (
                            <OsSelect
                                label="Tipo de Banner Superior"
                                description="Qué mostrar en el encabezado de la biblioteca."
                                options={[
                                    { value: "dynamic", label: "Dinámico (Últimos añadidos)" },
                                    { value: "static", label: "Estático (Fondo del sistema)" },
                                    { value: "custom", label: "Personalizado" },
                                    { value: "none", label: "Oculto" },
                                ]}
                                value={field.value || "dynamic"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeLibraryScreenCustomBannerImage"
                        render={({ field }) => (
                            <OsInput
                                label="Imagen de Banner Personalizado"
                                description="URL o ruta local. Solo se aplica si el tipo de banner es Personalizado."
                                placeholder="https://ejemplo.com/banner.jpg"
                                value={field.value || ""}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeLibraryScreenCustomBannerPosition"
                        render={({ field }) => (
                            <OsSelect
                                label="Posición del Banner"
                                description="Alineación de la imagen en el encabezado."
                                options={[
                                    { value: "50% 50%", label: "Centro (50% 50%)" },
                                    { value: "50% 0%", label: "Arriba (50% 0%)" },
                                    { value: "50% 100%", label: "Abajo (50% 100%)" },
                                    { value: "0% 50%", label: "Izquierda (0% 50%)" },
                                    { value: "100% 50%", label: "Derecha (100% 50%)" },
                                ]}
                                value={field.value || "50% 50%"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeLibraryScreenCustomBannerOpacity"
                        render={({ field }) => (
                            <RangeSlider
                                label="Opacidad del Banner"
                                description="0 = Transparente, 100 = Opaco"
                                min={0}
                                max={100}
                                value={field.value ?? 10}
                                onChange={field.onChange}
                                formatValue={(v: number) => `${v}%`}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeDisableLibraryScreenGenreSelector"
                        render={({ field }) => (
                            <OsToggle
                                label="Ocultar Selector de Géneros"
                                description="Elimina el filtro de géneros superior."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeLibraryScreenCustomBackgroundImage"
                        render={({ field }) => (
                            <OsInput
                                label="Fondo Personalizado (Global)"
                                description="URL o ruta local para usar como fondo en la biblioteca."
                                placeholder="https://ejemplo.com/fondo.jpg"
                                value={field.value || ""}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeLibraryScreenCustomBackgroundBlur"
                        render={({ field }) => (
                            <OsSelect
                                label="Desenfoque del Fondo"
                                description="Cantidad de blur a aplicar al fondo de biblioteca."
                                options={[
                                    { value: "none", label: "Ninguno" },
                                    { value: "sm", label: "Ligero" },
                                    { value: "md", label: "Medio" },
                                    { value: "lg", label: "Fuerte" },
                                ]}
                                value={field.value || "none"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeLibraryScreenCustomBackgroundOpacity"
                        render={({ field }) => (
                            <RangeSlider
                                label="Opacidad del Fondo"
                                description="10 = Apenas visible, 100 = Opaco"
                                min={0}
                                max={100}
                                value={field.value ?? 10}
                                onChange={field.onChange}
                                formatValue={(v: number) => `${v}%`}
                            />
                        )}
                    />
                </Card>
            </Section>

            <Section label="Página de Detalle (Media)" description="Configura cómo se presenta la información, banners y carátulas cuando entras a ver una serie o película.">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="theme.themeMediaPageBannerType"
                        render={({ field }) => (
                            <OsSelect
                                label="Tipo de Banner Principal"
                                description="Comportamiento del banner superior en los detalles."
                                options={[
                                    { value: "default", label: "Por Defecto (usa portada si falta)" },
                                    { value: "blur-when-unavailable", label: "Difuminar si falta" },
                                    { value: "dim-when-unavailable", label: "Atenuar si falta" },
                                    { value: "hide-when-unavailable", label: "Ocultar si falta" },
                                    { value: "dim", label: "Atenuar siempre" },
                                    { value: "blur", label: "Difuminar siempre" },
                                    { value: "hide", label: "Ocultar siempre" },
                                ]}
                                value={field.value || "default"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeMediaPageBannerSize"
                        render={({ field }) => (
                            <OsSelect
                                label="Tamaño del Banner"
                                description="Altura del banner en la página de detalle."
                                options={[
                                    { value: "default", label: "Normal (Recomendado)" },
                                    { value: "small", label: "Pequeño" },
                                ]}
                                value={field.value || "default"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeMediaPageBannerInfoBoxSize"
                        render={({ field }) => (
                            <OsSelect
                                label="Caja de Información"
                                description="La sinopsis y los metadatos sobre el banner directamente, o sobre un panel de vidrio."
                                options={[
                                    { value: "fluid", label: "Fluida" },
                                    { value: "boxed", label: "En Caja" },
                                ]}
                                value={normalizeInfoBoxSize(field.value)}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeEnableMediaPageBlurredBackground"
                        render={({ field }) => (
                            <OsToggle
                                label="Fondo Difuminado con la Portada"
                                description="Extrae los colores de la carátula de la serie y los expande por todo el fondo."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeAnimeEntryScreenLayout"
                        render={({ field }) => (
                            <OsSelect
                                label="Diseño de Layout de la Página"
                                description="Estructura general de la pantalla de detalle."
                                options={[
                                    { value: "default", label: "Por Defecto" },
                                    { value: "modern", label: "Moderno" },
                                    { value: "compact", label: "Compacto" },
                                    { value: "tv", label: "Interfaz de TV" },
                                ]}
                                value={field.value || "default"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>

            <Section label="Ordenación y Listado" description="Establece el criterio por defecto para ordenar tu contenido.">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="theme.themeAnimeLibraryCollectionDefaultSorting"
                        render={({ field }) => (
                            <OsSelect
                                label="Orden Biblioteca"
                                description="Orden por defecto en la vista de colección de series."
                                options={[
                                    { value: "TITLE_ASC", label: "Título A-Z" },
                                    { value: "TITLE_DESC", label: "Título Z-A" },
                                    { value: "SCORE_DESC", label: "Puntuación Alta-Baja" },
                                    { value: "YEAR_DESC", label: "Año Nuevo-Viejo" },
                                ]}
                                value={field.value || "TITLE_ASC"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>
        </div>
    )
}
