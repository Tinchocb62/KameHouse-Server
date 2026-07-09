import React from "react"
import { Section, Card, OsToggle, OsSelect, OsInput } from "../components"
import { RangeSlider } from "@/components/settings/range-slider"
import { LocalDeviceSection } from "@/components/settings/local-device-section"
import { DangerZone } from "@/components/settings/danger-zone"
import { type Control, Controller, useFormContext, useWatch } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { useSound } from "@/hooks/use-sound"
import { cn } from "@/components/ui/core/styling"
import { toast } from "sonner"
import { useAppStore } from "@/lib/store"
import { resolveThemeMode, THEME_DEFAULT_VALUES, ThemeLibraryScreenBannerType, type ThemeMode } from "@/lib/theme/theme-hooks"
import { SIDEBAR_ITEM_DEFS } from "@/components/ui/app-layout/app-sidebar"
import { hexToHslTriplet } from "@/lib/theme/apply-custom-theme"

interface AppearanceTabProps {
    control: Control<SettingsFormValues>
}

// Modos de interfaz — cada uno con su filosofía visual propia.
const UI_MODES = [
    {
        id: "classic" as const,
        name: "Clásico",
        desc: "Premium y sobrio: monocromo puro — negros profundos, grises y blanco. Sin colores. Vidrio sutil solo en overlays.",
        gradient: "linear-gradient(135deg, #050506 0%, #141417 60%, #1e1e22 100%)",
        accents: ["#D4D4D4", "#8C8C8C"],
    },

    {
        id: "era" as const,
        name: "Por Era",
        desc: "Tonalidades de cada era de Dragon Ball, con vidrio líquido y efectos activables a gusto.",
        gradient: "linear-gradient(135deg, #1E9BE0 0%, #FF6D00 25%, #E0202A 50%, #1FB6E6 75%, #C21FDE 100%)",
        accents: ["#1E9BE0", "#FF6D00", "#C21FDE"],
    },
]

// Presets por era Dragon Ball — colores característicos de cada saga,
// no colores de plataformas de streaming.
const THEME_PRESETS = [
    {
        id: "era-universe",
        name: "Universo Dragon Ball",
        desc: "Todas las eras: rosa, rojo, verde y azul",
        background: "#140e15",
        accent: "#EC4899",
        sidebar: "#060407",
        themeEra: "era-universe",
    },
    {
        id: "era-db",
        name: "Dragon Ball",
        desc: "Azul Kame clásico, la aventura original",
        background: "#0d141f",
        accent: "#1E9BE0",
        sidebar: "#030609",
        themeEra: "era-db",
    },
    {
        id: "era-dbz",
        name: "Dragon Ball Z",
        desc: "Naranja Saiyajin, el gi de Goku",
        background: "#1a110a",
        accent: "#FF6D00",
        sidebar: "#070503",
        themeEra: "era-dbz",
    },
    {
        id: "era-dbgt",
        name: "Dragon Ball GT",
        desc: "Rojo Super Saiyajin 4, la transformación definitiva",
        background: "#1b0c0f",
        accent: "#E0202A",
        sidebar: "#070304",
        themeEra: "era-dbgt",
    },
    {
        id: "era-dbs",
        name: "Dragon Ball Super",
        desc: "Celeste Ultra Instinto, el poder de los dioses",
        background: "#0a1620",
        accent: "#1FB6E6",
        sidebar: "#030709",
        themeEra: "era-dbs",
    },
    {
        id: "era-daima",
        name: "Dragon Ball Daima",
        desc: "Violeta Reino Demoníaco, la nueva era",
        background: "#150c20",
        accent: "#C21FDE",
        sidebar: "#060309",
        themeEra: "era-daima",
    },
    {
        id: "custom",
        name: "Personalizado",
        desc: "Tus colores, tu estilo",
        background: "",
        accent: "",
        sidebar: "",
        themeEra: "",
    }
    
]

const BANNER_POSITIONS = [
    { value: "50% 0%", label: "Arriba" },
    { value: "50% 25%", label: "Arriba-Centro" },
    { value: "50% 50%", label: "Centro" },
    { value: "50% 75%", label: "Abajo-Centro" },
    { value: "50% 100%", label: "Abajo" },
]

export function AppearanceTab({ control }: AppearanceTabProps) {
    const { playSound } = useSound()
    const { setValue, getValues } = useFormContext<SettingsFormValues>()
    const themeEraValue = useWatch({ control, name: "theme.themeEra" })
    const backgroundColorValue = useWatch({ control, name: "theme.backgroundColor" })
    const accentColorValue = useWatch({ control, name: "theme.accentColor" })
    const unpinnedItems = useWatch({ control, name: "theme.themeUnpinnedMenuItems" }) || []

    const setDynamicBackdropEnabled = useAppStore(s => s.setDynamicBackdropEnabled)
    const themeModeValue = useWatch({ control, name: "theme.themeMode" })
    const blurEffectsValue = useWatch({ control, name: "theme.themeEnableBlurringEffects" })
    const sidebarGradientValue = useWatch({ control, name: "theme.themeEnableSidebarGradient" })
    const uiMode: ThemeMode = resolveThemeMode({
        themeMode: themeModeValue,
        themeEra: themeEraValue,
        themeEnableBlurringEffects: !!blurEffectsValue,
    })
    const isEraMode = uiMode === "era"
    const activePreset = THEME_PRESETS.find(p => p.themeEra === themeEraValue)?.id ?? "custom"

    // Remembers the last non-empty value of a color field so re-enabling its
    // toggle restores it instead of resetting to the design system default.
    const lastValues = React.useRef<{ themeEra: string; backgroundColor: string; accentColor: string }>({
        themeEra: "",
        backgroundColor: "",
        accentColor: "",
    })

    const syncEnableColorSettings = () => {
        const v = getValues("theme")
        const on = !!v.themeEra || !!v.backgroundColor || !!v.accentColor
        setValue("theme.enableColorSettings", on, { shouldDirty: true })
    }

    const handleColorToggle = (field: "themeEra" | "backgroundColor" | "accentColor", checked: boolean, defaultValue: string) => {
        const current = getValues(`theme.${field}`) as string
        if (checked) {
            const restore = lastValues.current[field] || defaultValue
            setValue(`theme.${field}`, restore, { shouldDirty: true })
        } else {
            lastValues.current[field] = current
            setValue(`theme.${field}`, "", { shouldDirty: true })
        }
        syncEnableColorSettings()
    }

    const handlePresetClick = (preset: typeof THEME_PRESETS[number]) => {
        playSound("category")
        setValue("theme.themeEra", preset.themeEra, { shouldValidate: true, shouldDirty: true })
        syncEnableColorSettings()
    }

    const setMode = (mode: ThemeMode) => {
        playSound("category")
        setValue("theme.themeMode", mode, { shouldDirty: true })

        if (mode === "era") {
            // Al entrar a Por Era sin una era guardada, arrancar con una paleta visible.
            const currentEra = getValues("theme.themeEra")
            if (!currentEra || !currentEra.startsWith("era-")) {
                setValue("theme.themeEra", "era-daima", { shouldDirty: true })
            }
            setValue("theme.enableColorSettings", true, { shouldDirty: true })
        }
    }

    const toggleUnpinned = (id: string, pinned: boolean) => {
        const current: string[] = getValues("theme.themeUnpinnedMenuItems") || []
        const next = pinned
            ? current.filter((x) => x !== id)
            : [...new Set([...current, id])]
        setValue("theme.themeUnpinnedMenuItems", next, { shouldDirty: true })
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
            <AppearancePreview
                mode={uiMode}
                blurEffects={!!blurEffectsValue}
                sidebarGradient={isEraMode && !!sidebarGradientValue}
                themeEra={getValues("theme.themeEra") || ""}
                backgroundColor={getValues("theme.backgroundColor") || ""}
                accentColor={getValues("theme.accentColor") || ""}
                sidebarBackgroundColor={getValues("theme.sidebarBackgroundColor") || ""}
                enableColorSettings={!!getValues("theme.enableColorSettings")}
            />

            <Section label="Modo de Interfaz" description="Elige la filosofía visual de toda la aplicación: sobriedad premium o temática por era.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {UI_MODES.map((mode) => {
                        const isActive = uiMode === mode.id
                        return (
                            <button
                                key={mode.id}
                                type="button"
                                onClick={() => setMode(mode.id)}
                                className={cn(
                                    "relative flex flex-col p-5 rounded-container border transition-all duration-300 group active:scale-95 overflow-hidden min-h-[140px] text-left",
                                    isActive
                                        ? "border-brand-accent shadow-[0_8px_30px_var(--glow-primary)]"
                                        : "border-outline-variant hover:border-outline-variant/12"
                                )}
                            >
                                <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ background: mode.gradient }} />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-on-surface uppercase tracking-wider">{mode.name}</span>
                                        <div className="flex gap-1">
                                            {mode.accents.map((c) => (
                                                <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium flex-1">{mode.desc}</p>
                                </div>
                                {isActive && (
                                    <div className="absolute inset-0 border-2 border-brand-accent rounded-container pointer-events-none" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </Section>



            {isEraMode && (
                <>
                    {/* Theme Presets Grid */}
                    <Section label="Presets de Tema" description="Selecciona una paleta de colores predefinida basada en las diferentes eras de Dragon Ball.">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {THEME_PRESETS.map((preset) => {
                                const isActive = activePreset === preset.id
                                const isCustom = preset.id === "custom"
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => handlePresetClick(preset)}
                                        className={cn(
                                            "relative flex flex-col p-5 rounded-container border transition-all duration-300 group active:scale-95 overflow-hidden min-h-[160px]",
                                            isActive
                                                ? "border-brand-accent bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-variant)_30%,transparent)] shadow-[0_8px_30px_var(--glow-primary)]"
                                                : "bg-surface-container border border-outline-variant rounded-container hover:bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-variant)_40%,transparent)] hover:border-outline-variant/12"
                                        )}
                                        style={
                                            !isCustom && preset.background
                                                ? { background: `linear-gradient(135deg, ${preset.background} 0%, ${preset.sidebar || preset.background} 100%)` }
                                                : undefined
                                        }
                                    >
                                        {isCustom ? (
                                            <div className="flex items-center justify-center h-full min-h-[120px] border-2 border-dashed border-outline-variant/10 rounded-xl">
                                                <div className="text-center">
                                                    <svg className="w-10 h-10 mx-auto text-on-surface-variant/60 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    <p className="text-xs font-bold text-on-surface uppercase tracking-wider">Crear Tema</p>
                                                    <p className="text-[10px] text-on-surface-variant mt-1">Diseña tu propia paleta</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-b from-transparent to-black/60" />
                                                <div className="relative z-10 flex flex-col h-full">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-xs font-bold text-on-surface uppercase tracking-wider">{preset.name}</span>
                                                        <div className="flex gap-1">
                                                            <div className="w-3 h-3 rounded-full border border-outline-variant/10" style={{ background: preset.background }} />
                                                            <div className="w-3 h-3 rounded-full" style={{ background: preset.accent }} />
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium flex-1">{preset.desc}</p>
                                                    {isActive && (
                                                        <div className="absolute inset-0 border-2 border-brand-accent rounded-container pointer-events-none" />
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </Section>

                    {/* Efectos — opt-in sobre la paleta de era */}
                    <Section label="Efectos Visuales" description="Activa efectos individuales sobre la paleta de la era elegida.">
                        <Card className="divide-y divide-outline-variant/3">
                            <Controller
                                control={control}
                                name="theme.themeEnableBlurringEffects"
                                render={({ field }) => (
                                    <OsToggle
                                        label="Efectos de Vidrio (Blur)"
                                        description="Superficies translúcidas con desenfoque en overlays. Desactivado = superficies sólidas (modo plano)."
                                        checked={!!field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                            {!!blurEffectsValue && (
                                <Controller
                                    control={control}
                                    name="theme.themeEnableLiquidGlass"
                                    render={({ field }) => (
                                        <OsToggle
                                            label="Vidrio Líquido (Refracción)"
                                            description="Efecto de refracción líquida sobre el vidrio (solo navegadores Chromium)."
                                            checked={!!field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                            )}
                            <Controller
                                control={control}
                                name="theme.themeEnableSidebarGradient"
                                render={({ field }) => (
                                    <OsToggle
                                        label="Degradado del Sidebar"
                                        description="Intensifica el degradado con los colores de la era sobre la barra lateral (siempre hay un tinte sutil)."
                                        checked={!!field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="theme.themeEnableMediaPageBlurredBackground"
                                render={({ field }) => (
                                    <OsToggle
                                        label="Fondo Difuminado en Página de Detalle"
                                        description="Usa el arte del anime como fondo ambiental difuminado en las páginas de detalle."
                                        checked={!!field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        </Card>
                    </Section>

                    {/* Color Customization — subgrupo avanzado */}
                    <Section label="Colores Personalizados" description="Define tus propios colores principales y de fondo para crear un estilo único.">
                        <Card className="divide-y divide-outline-variant/3">
                            <div className="transition-opacity">
                                <div className="flex items-center justify-between px-6 pt-5">
                                    <OsToggle
                                        label="Fondo Personalizado"
                                        description="Sobrescribe el color de fondo base de toda la aplicación."
                                        checked={!!backgroundColorValue}
                                        onChange={(checked) => handleColorToggle("backgroundColor", checked, THEME_DEFAULT_VALUES.backgroundColor)}
                                    />
                                </div>
                            </div>
                    {!!backgroundColorValue && (
                        <Controller
                            control={control}
                            name="theme.backgroundColor"
                            render={({ field }) => (
                                <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-outline-variant/2 hover:bg-surface-variant/[0.005] transition-all duration-200 gap-5 group/input">
                                    <div className="space-y-0.5 flex-1 max-w-xl">
                                        <label htmlFor="bg-color" className="text-sm font-semibold text-on-surface tracking-tight cursor-pointer">Color de Fondo Principal</label>
                                        <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium">Color base de toda la aplicación</p>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <input
                                            id="bg-color"
                                            type="color"
                                            value={field.value || THEME_DEFAULT_VALUES.backgroundColor}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            className="w-10 h-10 rounded-lg border border-outline-variant/10 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={field.value || ""}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            className="bg-surface-container border border-outline-variant/5 rounded-xl px-4 py-2.5 w-36 text-on-surface placeholder:text-on-surface-variant/70 text-xs font-mono focus:outline-none focus:border-brand-accent/40"
                                            placeholder="#000000"
                                        />
                                    </div>
                                </div>
                            )}
                        />
                    )}
                    <div className="flex items-center justify-between px-6 pt-5">
                        <OsToggle
                            label="Acento Personalizado"
                            description="Sobrescribe el color principal usado en botones, enlaces y estados activos."
                            checked={!!accentColorValue}
                            onChange={(checked) => handleColorToggle("accentColor", checked, THEME_DEFAULT_VALUES.accentColor)}
                        />
                    </div>
                    {!!accentColorValue && (
                        <Controller
                            control={control}
                            name="theme.accentColor"
                            render={({ field }) => (
                                <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-outline-variant/2 hover:bg-surface-variant/[0.005] transition-all duration-200 gap-5 group/input">
                                    <div className="space-y-0.5 flex-1 max-w-xl">
                                        <label htmlFor="accent-color" className="text-sm font-semibold text-on-surface tracking-tight cursor-pointer">Color de Acento</label>
                                        <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium">Color principal para botones, enlaces, estados activos</p>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <input
                                            id="accent-color"
                                            type="color"
                                            value={field.value || THEME_DEFAULT_VALUES.accentColor}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            className="w-10 h-10 rounded-lg border border-outline-variant/10 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={field.value || ""}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            className="bg-surface-container border border-outline-variant/5 rounded-xl px-4 py-2.5 w-36 text-on-surface placeholder:text-on-surface-variant/70 text-xs font-mono focus:outline-none focus:border-brand-accent/40"
                                            placeholder="#ff6e3a"
                                        />
                                    </div>
                                </div>
                            )}
                        />
                    )}
                    {!!backgroundColorValue && (
                        <Controller
                            control={control}
                            name="theme.sidebarBackgroundColor"
                            render={({ field }) => (
                                <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-outline-variant/2 hover:bg-surface-variant/[0.005] transition-all duration-200 gap-5 group/input">
                                    <div className="space-y-0.5 flex-1 max-w-xl">
                                        <label htmlFor="sidebar-color" className="text-sm font-semibold text-on-surface tracking-tight cursor-pointer">Color Sidebar</label>
                                        <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium">Fondo del panel lateral (vacío = usa fondo principal)</p>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <input
                                            id="sidebar-color"
                                            type="color"
                                            value={field.value || "#0b0f19"}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            className="w-10 h-10 rounded-lg border border-outline-variant/10 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={field.value || ""}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            className="bg-surface-container border border-outline-variant/5 rounded-xl px-4 py-2.5 w-36 text-on-surface placeholder:text-on-surface-variant/70 text-xs font-mono focus:outline-none focus:border-brand-accent/40"
                                            placeholder="#0b0f19"
                                        />
                                    </div>
                                </div>
                            )}
                        />
                    )}
                </Card>
            </Section>
            </>)}

            {/* Layout & Behavior */}
            <Section label="Diseño y Comportamiento" description="Ajusta cómo se muestran los elementos de la interfaz y su comportamiento interactivo.">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="theme.themeSmallerEpisodeCarouselSize"
                        render={({ field }) => (
                            <OsToggle
                                label="Carruseles Compactos"
                                description="Reduce el tamaño de las tarjetas en carruseles para mostrar más contenido."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeExpandSidebarOnHover"
                        render={({ field }) => (
                            <OsToggle
                                label="Expandir Sidebar al Pasar Ratón"
                                description="La barra lateral se expande automáticamente al pasar el cursor."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="theme.themeDisableCarouselAutoScroll"
                        render={({ field }) => (
                            <OsToggle
                                label="Desactivar Auto-Scroll en Carruseles"
                                description="Evita que los carruseles se desplacen automáticamente."
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
                                label="Tarjeta de Episodio Legacy"
                                description="Usa el diseño clásico de tarjetas de episodios (menos info visual)."
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
                                label="Ocultar Descripción de Episodios"
                                description="No muestra la sinopsis en las tarjetas de episodio para ahorrar espacio."
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
                                description="Oculta el nombre de archivo real en episodios descargados."
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
                                description="Muestra el número de episodios sin ver sobre las tarjetas de anime."
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
                                label="Layout de Página de Anime"
                                description="Disposición de la información en la pantalla de detalle de cada anime."
                                options={[
                                    { value: "stacked", label: "Apilado (Recomendado)" },
                                    { value: "side-by-side", label: "Lado a Lado" },
                                ]}
                                value={field.value || "stacked"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>

            {/* Menú Lateral */}
            <Section label="Elementos Fijados del Menú" description="Personaliza qué accesos directos aparecen de forma permanente en la barra de navegación lateral.">
                <Card className="p-6 space-y-3">
                    <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium">
                        Desactiva un elemento para ocultarlo de la barra lateral.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {SIDEBAR_ITEM_DEFS.map((item) => {
                            const isPinned = !unpinnedItems.includes(item.id)
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => toggleUnpinned(item.id, isPinned)}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all active:scale-95",
                                        isPinned
                                            ? "bg-brand-accent/15 border-brand-accent/30 text-brand-accent"
                                            : "bg-surface-container border-outline-variant text-on-surface-variant/60"
                                    )}
                                >
                                    {item.label}
                                </button>
                            )
                        })}
                    </div>
                </Card>
            </Section>

            {/* Library Screen Customization */}
            <Section label="Pantalla de Biblioteca" description="Modifica la apariencia, los fondos y la presentación visual del catálogo principal de contenido.">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="theme.themeLibraryScreenBannerType"
                        render={({ field }) => (
                            <OsSelect
                                label="Tipo de Banner"
                                description="Estilo del banner superior en la pantalla de biblioteca."
                                options={[
                                    { value: ThemeLibraryScreenBannerType.Dynamic as string, label: "Dinámico (Arte del anime actual)" },
                                    { value: ThemeLibraryScreenBannerType.Custom as string, label: "Imagen Personalizada" },
                                ]}
                                value={field.value || ThemeLibraryScreenBannerType.Dynamic}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeLibraryScreenCustomBannerImage"
                        render={({ field }) => (
                            <OsInput
                                label="Imagen de Banner Personalizada"
                                description="URL o ruta local de la imagen para el banner (si tipo = custom)."
                                placeholder="https://ejemplo.com/banner.jpg"
                                value={field.value || ""}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeLibraryScreenCustomBannerPosition"
                        render={({ field }) => {
                            const isKnown = BANNER_POSITIONS.some((o) => o.value === field.value)
                            return (
                                <OsSelect
                                    label="Posición del Banner"
                                    description="Punto de enfoque de la imagen dentro del contenedor del banner."
                                    options={[
                                        ...BANNER_POSITIONS,
                                        ...(field.value && !isKnown ? [{ value: field.value, label: `Valor actual: ${field.value}` }] : []),
                                    ]}
                                    value={field.value || "50% 50%"}
                                    onChange={field.onChange}
                                />
                            )
                        }}
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
                                formatValue={(v) => `${v}%`}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeDisableLibraryScreenGenreSelector"
                        render={({ field }) => (
                            <OsToggle
                                label="Ocultar Selector de Géneros"
                                description="Elimina el filtro de géneros en la pantalla de biblioteca."
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
                                description="URL o ruta local de una imagen para usar como fondo en la biblioteca."
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
                                description="Cantidad de blur a aplicar a la imagen de fondo."
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
                                formatValue={(v) => `${v}%`}
                            />
                        )}
                    />
                </Card>
            </Section>

            {/* Media Page Customization */}
            <Section label="Página de Detalle" description="Configura cómo se presenta la información, banners y carátulas cuando entras a ver una serie o película.">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="theme.themeMediaPageBannerType"
                        render={({ field }) => (
                            <OsSelect
                                label="Tipo de Banner"
                                description="Comportamiento del banner cuando no hay imagen disponible."
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
                        name="theme.themeShowEpisodeCardAnimeInfo"
                        render={({ field }) => (
                            <OsToggle
                                label="Mostrar Info de Anime en Tarjetas"
                                description="Muestra puntuación, año, estado en las tarjetas de episodios."
                                checked={!!field.value}
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
                                description="Tamaño de la caja de sinopsis y metadatos."
                                options={[
                                    { value: "fluid", label: "Fluida" },
                                    { value: "boxed", label: "En Caja" },
                                ]}
                                value={field.value || "fluid"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>

            {/* Sorting & Lists */}
            <Section label="Ordenación y Listas" description="Establece el criterio por defecto para ordenar tu contenido (alfabético, fecha, puntuación).">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="theme.themeContinueWatchingDefaultSorting"
                        render={({ field }) => (
                            <OsSelect
                                label="Orden 'Continuar Viendo'"
                                description="Orden por defecto en la sección Continuar Viendo."
                                options={[
                                    { value: "LAST_WATCHED_DESC", label: "Más Reciente Primero" },
                                    { value: "LAST_WATCHED_ASC", label: "Más Antiguo Primero" },
                                    { value: "TITLE_ASC", label: "Título A-Z" },
                                ]}
                                value={field.value || "LAST_WATCHED_DESC"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeAnimeLibraryCollectionDefaultSorting"
                        render={({ field }) => (
                            <OsSelect
                                label="Orden Biblioteca de Anime"
                                description="Orden por defecto en la vista de colección."
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

            {/* Advanced: Custom CSS */}
            <Section label="CSS Personalizado" description="Opciones para usuarios avanzados: inyecta tu propio código CSS para modificar cualquier parte de la interfaz.">
                <Card className="p-6 space-y-4">
                    <Controller
                        control={control}
                        name="theme.themeCustomCSS"
                        render={({ field }) => (
                            <div className="relative">
                                <label htmlFor="themeCustomCSS" className="text-xs font-bold text-on-surface-variant uppercase tracking-wide block mb-2">CSS Global</label>
                                <textarea
                                    id="themeCustomCSS"
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    placeholder="/* Tu CSS personalizado aqui */"
                                    className="w-full h-48 bg-surface-container border border-outline-variant/5 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/70 text-[11px] font-mono focus:outline-none focus:border-brand-accent/40 resize-y"
                                />
                                <div className="absolute bottom-2 right-2 text-[9px] font-mono text-on-surface-variant/60">
                                    {(field.value || "").length} / 20000 chars — se sanitizan @import y url(javascript:...)
                                </div>
                            </div>
                        )}
                    />
                    <Controller
                        control={control}
                        name="theme.themeMobileCustomCSS"
                        render={({ field }) => (
                            <div className="relative pt-4 border-t border-outline-variant/5">
                                <label htmlFor="themeMobileCustomCSS" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono mb-2 block">CSS Solo Móvil</label>
                                <textarea
                                    id="themeMobileCustomCSS"
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    placeholder="@media (max-width: 768px) { ... }"
                                    className="w-full h-32 bg-surface-container border border-outline-variant/5 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/70 text-[11px] font-mono focus:outline-none focus:border-brand-accent/40 resize-y"
                                />
                            </div>
                        )}
                    />
                </Card>
            </Section>

            {/* Rendimiento Gráfico — preferencia local del dispositivo */}
            <LocalDeviceSectionAppearance />

            {/* Reset */}
            <Section label="Acciones" description="Restablece toda la configuración de apariencia a sus valores predeterminados de fábrica.">
                <DangerZone
                    title="Restablecer a Defecto"
                    description="Vuelve al tema KameHouse Original en este servidor."
                    actions={
                        <button
                            type="button"
                            onClick={() => {
                                if (!confirm("¿Restablecer toda la configuración de apariencia a valores por defecto?")) return
                                Object.entries(THEME_DEFAULT_VALUES).forEach(([key, value]) => {
                                    setValue(`theme.${key}` as never, value as never, { shouldDirty: true })
                                })
                                // El default de fábrica es el modo Clásico explícito.
                                setValue("theme.themeMode", "classic", { shouldDirty: true })
                                // El fondo dinámico vive en el store (localStorage), fuera del form:
                                // apagarlo también para dejar la apariencia realmente en modo plano.
                                setDynamicBackdropEnabled(false)
                                toast.success("Apariencia restablecida")
                            }}
                            className="text-xs font-bold text-brand-destructive hover:brightness-110 transition-all px-4 py-2 rounded-lg border border-brand-destructive/25 bg-brand-destructive/8 hover:bg-brand-destructive/15 active:scale-95"
                        >
                            Restablecer Ahora
                        </button>
                    }
                />
            </Section>
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
        <LocalDeviceSection title="Rendimiento Gráfico" description="Opciones de rendimiento que se guardan localmente en este dispositivo para optimizar la fluidez.">
            <OsToggle
                label="Fondo Animado"
                description="Habilita las orbes y el movimiento sutil de fondo."
                checked={dynamicBackdropEnabled}
                onChange={setDynamicBackdropEnabled}
            />
            {dynamicBackdropEnabled && (
                <OsToggle
                    label="Efecto de Movimiento del Ratón"
                    description="Permite que el fondo y las orbes se desplacen sutilmente al mover el cursor en la pantalla."
                    checked={dynamicBackdropMotionEnabled}
                    onChange={setDynamicBackdropMotionEnabled}
                />
            )}
        </LocalDeviceSection>
    )
}

function AppearancePreview({
    mode,
    blurEffects,
    sidebarGradient,
    themeEra,
    backgroundColor,
    accentColor,
    sidebarBackgroundColor,
    enableColorSettings
}: {
    mode: ThemeMode
    blurEffects: boolean
    sidebarGradient: boolean
    themeEra: string
    backgroundColor: string
    accentColor: string
    sidebarBackgroundColor: string
    enableColorSettings: boolean
}) {
    const isEra = mode === "era"
    const style: React.CSSProperties & Record<string, string> = {}
    if (isEra && enableColorSettings && backgroundColor) {
        style["--bg-primary"] = backgroundColor
    }
    if (isEra && enableColorSettings && accentColor) {
        const hsl = hexToHslTriplet(accentColor)
        if (hsl) {
            style["--brand-accent"] = hsl
            style["--brand-accent-hex"] = accentColor
        }
    }
    const sidebarBg = (isEra && enableColorSettings && sidebarBackgroundColor) ? sidebarBackgroundColor : undefined

    // Espeja la tabla de gating de useApplyCustomTheme() a escala del preview.
    const previewTheme = mode === "classic" ? "classic"
        : isEra && enableColorSettings && themeEra ? themeEra
        : undefined
    const previewFlat = isEra && !blurEffects
    const previewSidebarGradient = (isEra && sidebarGradient)

    return (
        <Section label="Previsualización en Vivo">
            <div
                className="w-full h-56 border border-outline-variant/20 rounded-xl overflow-hidden flex relative select-none"
                data-mode={mode}
                data-flat={previewFlat ? "true" : undefined}
                data-theme={previewTheme}
                data-sidebar-gradient={previewSidebarGradient ? "true" : undefined}
                style={style}
            >
                {/* Contenedor base - bg-primary de la app */}
                <div className="absolute inset-0 bg-[var(--bg-primary)] transition-colors duration-500 z-[-2]" />
                
                {/* Simulación del fondo dinámico */}
                <div className="absolute inset-0 opacity-50 transition-opacity duration-500 z-[-1]" style={{ background: "radial-gradient(circle at 20% 20%, var(--glow-color-1) 0%, transparent 60%), radial-gradient(circle at 80% 80%, var(--glow-color-2) 0%, transparent 60%), linear-gradient(135deg, transparent, hsl(var(--brand-accent)/0.1))" }} />

                {/* Sidebar */}
                <div 
                    className="w-16 h-full flex flex-col items-center py-4 border-r border-outline-variant/10 relative z-10 transition-colors duration-500"
                    style={{ backgroundColor: sidebarBg }}
                >
                    <div className={cn("absolute inset-0 sidebar-gradient", sidebarBg ? "opacity-0" : "opacity-100")} />
                    <div className="relative z-10 w-8 h-8 rounded-lg bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center mb-6">
                        <div className="w-4 h-4 rounded bg-brand-accent" />
                    </div>
                    <div className="relative z-10 w-8 h-8 rounded-lg bg-surface-variant/50 mb-2" />
                    <div className="relative z-10 w-8 h-8 rounded-lg bg-surface-variant/50" />
                </div>

                {/* Contenido principal simulado */}
                <div className="flex-1 p-6 flex flex-col gap-4 relative z-10 text-on-surface">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-full bg-brand-accent/15 text-brand-accent border border-brand-accent/30 text-[10px] font-bold uppercase tracking-wider">
                            Badge
                        </div>
                        <div className="glass-liquid glass-refract px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider">
                            Liquid Glass
                        </div>
                        <div className="h-4 w-16 rounded bg-on-surface-variant/20" />
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1 max-w-[160px] h-24 rounded-xl bg-surface-container border border-[var(--glass-border)] backdrop-blur-[var(--blur-overlay-md)] shadow-sm transition-colors duration-500 flex flex-col p-3">
                             <div className="w-1/2 h-2 rounded bg-on-surface/30 mb-2" />
                             <div className="w-3/4 h-2 rounded bg-on-surface-variant/30" />
                        </div>
                        <div className="flex-1 max-w-[160px] h-24 rounded-xl bg-surface-container border border-[var(--glass-border)] backdrop-blur-[var(--blur-overlay-md)] shadow-sm transition-colors duration-500 flex flex-col p-3">
                             <div className="w-1/2 h-2 rounded bg-on-surface/30 mb-2" />
                             <div className="w-3/4 h-2 rounded bg-on-surface-variant/30" />
                        </div>
                    </div>

                    <div className="mt-auto flex items-center justify-end border-t border-outline-variant/5 pt-3">
                        <button className="px-5 py-2 rounded-lg bg-brand-accent text-zinc-950 text-xs font-bold transition-all duration-300 shadow-md hover:shadow-lg active:scale-95">
                            Botón Principal
                        </button>
                    </div>
                </div>
            </div>
        </Section>
    )
}
