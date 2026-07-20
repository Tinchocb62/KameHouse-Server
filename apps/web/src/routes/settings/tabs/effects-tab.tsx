import React from "react"
import { Section, Card, OsToggle } from "../components"
import { LocalDeviceSection } from "@/components/settings/local-device-section"
import { type Control, Controller, useWatch } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { useAppStore } from "@/lib/store"
import { resolveThemeMode } from "@/lib/theme/theme-hooks"

interface EffectsTabProps {
    control: Control<SettingsFormValues>
}

export function EffectsTab({ control }: EffectsTabProps) {
    const themeEraValue = useWatch({ control, name: "theme.themeEra" })
    const themeModeValue = useWatch({ control, name: "theme.themeMode" })
    const blurEffectsValue = useWatch({ control, name: "theme.themeEnableBlurringEffects" })

    const uiMode = resolveThemeMode({
        themeMode: themeModeValue,
        themeEra: themeEraValue,
        themeEnableBlurringEffects: !!blurEffectsValue,
    })
    const isEraMode = uiMode === "era"

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            {isEraMode ? (
                <>
                    <Section label="Cristal y Resplandor" description="Efectos de vidrio traslúcido, iluminación ambiental y auras de color.">
                        <Card className="divide-y divide-outline-variant/3">
                            <Controller
                                control={control}
                                name="theme.themeEnableBlurringEffects"
                                render={({ field }) => (
                                    <OsToggle
                                        label="Blur y Vidrio Esmerilado"
                                        description="Habilita el efecto de cristal traslúcido y desenfoque de fondo en tarjetas y paneles."
                                        checked={!!field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="theme.themeEnableLiquidGlass"
                                render={({ field }) => (
                                    <OsToggle
                                        label="Efecto Cristal Líquido"
                                        description="Añade refracción especular y reflejos orgánicos sobre los paneles de cristal."
                                        checked={!!field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="theme.themeEnableSidebarGradient"
                                render={({ field }) => (
                                    <OsToggle
                                        label="Resplandor de Aura Saiyan"
                                        description="Intensifica el tinte de luz y resplandor de la era activa en el panel de navegación."
                                        checked={!!field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        </Card>
                    </Section>

                    <Section label="Atmósfera Cinemática y Retro" description="Filtros y texturas visuales para mayor inmersión estética.">
                        <Card className="divide-y divide-outline-variant/3">
                            <Controller
                                control={control}
                                name="theme.themeEnableCinematicGrain"
                                render={({ field }) => (
                                    <OsToggle
                                        label="Grano Cinematográfico 90s"
                                        description="Superpone una sutil textura de grano de película analógica sobre la interfaz."
                                        checked={!!field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        </Card>
                    </Section>

                    <LocalDeviceSectionAppearance />
                </>
            ) : (
                <div className="p-8 text-center border border-outline-variant/10 rounded-xl bg-surface-container-low text-on-surface-variant">
                    <p>Los efectos visuales avanzados están optimizados para el Modo Era.</p>
                </div>
            )}
        </div>
    )
}

function LocalDeviceSectionAppearance() {
    const {
        dynamicBackdropEnabled,
        setDynamicBackdropEnabled,
        dynamicBackdropMotionEnabled,
        setDynamicBackdropMotionEnabled,
    } = useAppStore()

    return (
        <LocalDeviceSection title="Movimiento y Partículas de Ki" description="Opciones de animación e iluminación dinámica guardadas localmente.">
            <OsToggle
                label="Partículas e Iluminación de Ki"
                description="Habilita las orbes de luz ambiental y partículas flotantes en el fondo."
                checked={dynamicBackdropEnabled}
                onChange={setDynamicBackdropEnabled}
            />
            {dynamicBackdropEnabled && (
                <OsToggle
                    label="Resplandor Interactivo al Mover el Ratón"
                    description="Permite que la iluminación ambiental reaccione al movimiento del cursor."
                    checked={dynamicBackdropMotionEnabled}
                    onChange={setDynamicBackdropMotionEnabled}
                />
            )}
        </LocalDeviceSection>
    )
}
