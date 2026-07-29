import React from "react"
import { Section, Card, OsToggle } from "../components"
import { type Control, Controller, useWatch } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"

interface NavigationTabProps {
    control: Control<SettingsFormValues>
}

const MENU_ITEMS = [
    { id: "home", label: "Inicio", icon: Icons.navigation.home, description: "Pantalla principal y descubrimientos" },
    { id: "series", label: "Series", icon: Icons.navigation.tv, description: "Explorador de series y sagas" },
    { id: "movies", label: "Películas", icon: Icons.navigation.film, description: "Películas y largometrajes" },
]

export function NavigationTab({ control }: NavigationTabProps) {
    const themeExpandSidebarOnHover = useWatch({ control, name: "theme.themeExpandSidebarOnHover" })

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            {/* Comportamiento y Estilo del Menú */}
            <Section label="Comportamiento del Menú" description="Ajustes de la barra lateral de navegación y estilo visual.">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="theme.themeExpandSidebarOnHover"
                        render={({ field }) => (
                            <OsToggle
                                label="Expandir al Pasar Ratón"
                                description="Expande la barra lateral automáticamente al acercar el cursor en la versión de escritorio."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeDisableSidebarTransparency"
                        render={({ field }) => (
                            <OsToggle
                                label="Desactivar Transparencia"
                                description="Hace que la barra lateral sea completamente opaca."
                                checked={!!field.value}
                                onChange={field.onChange}
                                disabled={themeExpandSidebarOnHover}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeEnableSidebarGradient"
                        render={({ field }) => (
                            <OsToggle
                                label="Gradiente en Barra Lateral"
                                description="Aplica un efecto de gradiente suave en el fondo del menú de navegación."
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
                                label="Contadores de No Vistos"
                                description="Muestra insignias numéricas con la cantidad de episodios pendientes en los accesos del menú."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>

            {/* Elementos Fijados */}
            <Section label="Elementos Fijados" description="Selecciona qué accesos directos deseas ver en el menú lateral principal.">
                <Card className="p-6">
                    <Controller
                        control={control}
                        name="theme.themeUnpinnedMenuItems"
                        render={({ field }) => {
                            const unpinned = Array.isArray(field.value) ? field.value : []
                            return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {MENU_ITEMS.map((item) => {
                                        const isPinned = !unpinned.includes(item.id)
                                        const ItemIcon = item.icon
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    const newUnpinned = isPinned
                                                        ? [...unpinned, item.id]
                                                        : unpinned.filter(id => id !== item.id)
                                                    field.onChange(newUnpinned)
                                                }}
                                                className={cn(
                                                    "group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-base text-left active:scale-[0.98]",
                                                    isPinned
                                                        ? "border-brand-accent/40 bg-brand-accent/[0.07] shadow-sm shadow-brand-accent/10"
                                                        : "border-outline-variant/20 bg-surface-container-low/60 hover:border-outline-variant/40 hover:bg-surface-container-low"
                                                )}
                                            >
                                                <div className={cn(
                                                    "p-2.5 rounded-lg transition-colors shrink-0 mt-0.5",
                                                    isPinned
                                                        ? "bg-brand-accent/15 text-brand-accent"
                                                        : "bg-surface-container-high text-on-surface-variant/60 group-hover:text-on-surface-variant"
                                                )}>
                                                    <ItemIcon className="w-5 h-5" />
                                                </div>

                                                <div className="flex-1 min-w-0 pr-6">
                                                    <span className={cn(
                                                        "text-sm font-bold block transition-colors",
                                                        isPinned ? "text-on-surface" : "text-on-surface-variant"
                                                    )}>
                                                        {item.label}
                                                    </span>
                                                    <span className="text-xs text-on-surface-variant/70 block mt-0.5 line-clamp-1">
                                                        {item.description}
                                                    </span>
                                                </div>

                                                <div className={cn(
                                                    "absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-base",
                                                    isPinned
                                                        ? "border-brand-accent bg-brand-accent text-on-primary scale-100 shadow-sm shadow-brand-accent/30"
                                                        : "border-outline-variant/40 bg-transparent text-transparent scale-90"
                                                )}>
                                                    <Icons.ui.check className="w-3.5 h-3.5 stroke-[3]" />
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )
                        }}
                    />
                </Card>
            </Section>
        </div>
    )
}
