import React from "react"
import { type Control, Controller, useFormContext, useWatch } from "react-hook-form"
import { motion, AnimatePresence } from "framer-motion"
import { type SettingsFormValues } from "../index"
import { useSound } from "@/hooks/use-sound"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import { resolveThemeMode, type ThemeMode } from "@/lib/theme/theme-hooks"
import { SettingsSection, SettingsCard, OsSelect, OsToggle } from "../components"

interface AppearanceTabProps {
    control: Control<SettingsFormValues>
    searchQuery?: string
}

// ── Modos Principales ─────────────────────────────────────────────────────────
const UI_MODES = [
    {
        id: "classic" as const,
        name: "Modo Clásico",
        tag: "AMOLED / Pro",
        desc: "Negros profundos (#000000), escalas de grises neutras y blanco nítido sin tintes de color.",
        icon: Icons.status.monitor,
    },
    {
        id: "era" as const,
        name: "Modo por Era",
        tag: "Dragon Ball",
        desc: "Paletas inmersivas basadas en las sagas de la franquicia Dragon Ball.",
        icon: Icons.status.sparkles,
    },
]

// ── Presets por Era ────────────────────────────────────────────────────────────
const THEME_PRESETS = [
    { id: "era-universe", themeEra: "era-universe", name: "Universo DB", subtitle: "Todas las Eras", desc: "Rosa, Rojo, Verde y Azul combinados", accent: "#EC4899", bg: "from-pink-950/40 to-purple-950/20" },
    { id: "era-db", themeEra: "era-db", name: "Dragon Ball", subtitle: "1986 Original", desc: "Naranja terracota cálido de la primera aventura", accent: "#CF7430", bg: "from-amber-950/40 to-orange-950/20" },
    { id: "era-dbz", themeEra: "era-dbz", name: "Dragon Ball Z", subtitle: "1989 Era Dorada", desc: "Azul VHS profundo y dorado Super Saiyan", accent: "#3D6CA8", bg: "from-blue-950/40 to-yellow-950/20" },
    { id: "era-dbgt", themeEra: "era-dbgt", name: "Dragon Ball GT", subtitle: "1996 Grand Tour", desc: "Violeta cósmico y atmósfera espacial", accent: "#8E4B9E", bg: "from-purple-950/40 to-fuchsia-950/20" },
    { id: "era-dbkai", themeEra: "era-dbkai", name: "Dragon Ball Kai", subtitle: "2009 HD Manga", desc: "Azul eléctrico de alta definición", accent: "#0284C7", bg: "from-sky-950/40 to-blue-950/20" },
    { id: "era-dbs", themeEra: "era-dbs", name: "Dragon Ball Super", subtitle: "2015 Divino", desc: "Cian divino y azul Ultra Instinto", accent: "#4193C4", bg: "from-cyan-950/40 to-blue-950/20" },
    { id: "era-daima", themeEra: "era-daima", name: "Dragon Ball Daima", subtitle: "2024 Demoníaco", desc: "Verde místico del Reino Demoníaco", accent: "#3FAE74", bg: "from-emerald-950/40 to-teal-950/20" },
]

export function AppearanceTab({ control }: AppearanceTabProps) {
    const { playSound } = useSound()
    const { setValue, getValues } = useFormContext<SettingsFormValues>()

    // Watchers
    const themeEraValue = useWatch({ control, name: "theme.themeEra" })
    const themeModeValue = useWatch({ control, name: "theme.themeMode" })
    const blurEffectsValue = useWatch({ control, name: "theme.themeEnableBlurringEffects" })

    const uiMode: ThemeMode = resolveThemeMode({
        themeMode: themeModeValue,
        themeEra: themeEraValue,
        themeEnableBlurringEffects: !!blurEffectsValue,
    })
    const isEraMode = uiMode === "era"
    const activePresetObj = THEME_PRESETS.find(p => p.themeEra === themeEraValue) || THEME_PRESETS[0]

    const handlePresetClick = (preset: typeof THEME_PRESETS[number]) => {
        playSound("category")
        setValue("theme.themeEra", preset.themeEra, { shouldValidate: true, shouldDirty: true })
        setValue("theme.enableColorSettings", true, { shouldDirty: true })
    }

    const setMode = (mode: ThemeMode) => {
        playSound("category")
        setValue("theme.themeMode", mode, { shouldDirty: true })
        if (mode === "era") {
            const currentEra = getValues("theme.themeEra")
            if (!currentEra || !currentEra.startsWith("era-")) {
                setValue("theme.themeEra", "era-universe", { shouldDirty: true })
            }
            setValue("theme.enableColorSettings", true, { shouldDirty: true })
        }
    }

    return (
        <div className="w-full space-y-7 animate-in fade-in duration-base pb-8">

            {/* ═══════════════════════════════════════════════════════════════════
                1. PERSONALIZACIÓN Y SELECCIÓN DE TEMA
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Tema y Filosofía Visual"
                description="Selecciona la estética visual general del sistema."
                icon={Icons.ui.palette}
                badge={
                    <span className="text-[10px] font-mono font-bold text-brand-accent px-2 py-0.5 rounded-full bg-brand-accent/10 border border-brand-accent/25">
                        {isEraMode ? activePresetObj.name : "Clásico AMOLED"}
                    </span>
                }
            >
                <SettingsCard divide={false} className="p-5 md:p-6 space-y-5">
                    {/* Selector de Modos Principales */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {UI_MODES.map((mode) => {
                            const isActive = uiMode === mode.id
                            const ModeIcon = mode.icon
                            return (
                                <motion.button
                                    key={mode.id}
                                    type="button"
                                    whileHover={{ scale: 1.015, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                    onClick={() => setMode(mode.id)}
                                    className={cn(
                                        "flex items-center gap-3.5 p-4 rounded-xl border text-left transition-colors duration-200",
                                        isActive
                                            ? "bg-brand-accent/10 border-brand-accent shadow-[0_0_20px_hsl(var(--brand-accent)/0.2)] ring-1 ring-brand-accent/40"
                                            : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                                    )}
                                >
                                    <div className={cn(
                                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                                        isActive
                                            ? "bg-brand-accent/20 border-brand-accent/40 text-brand-accent shadow-[0_0_10px_hsl(var(--brand-accent)/0.3)]"
                                            : "bg-white/5 border-white/10 text-on-surface-variant"
                                    )}>
                                        <ModeIcon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-xs font-bold text-on-surface">{mode.name}</p>
                                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-on-surface-variant">
                                                {mode.tag}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5 line-clamp-1">{mode.desc}</p>
                                    </div>
                                </motion.button>
                            )
                        })}
                    </div>

                    {/* Paletas por Era (Se muestra al estar en modo Era) */}
                    <AnimatePresence initial={false}>
                        {isEraMode && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                className="overflow-hidden pt-2 border-t border-white/[0.06]"
                            >
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                                            Paletas de la Franquicia Dragon Ball
                                        </span>
                                        <span className="text-[10px] font-mono text-on-surface-variant/60">Toca para aplicar</span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                        {THEME_PRESETS.map((preset) => {
                                            const isActive = activePresetObj.id === preset.id
                                            return (
                                                <motion.button
                                                    key={preset.id}
                                                    type="button"
                                                    whileHover={{ scale: 1.03, y: -2 }}
                                                    whileTap={{ scale: 0.96 }}
                                                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                                    onClick={() => handlePresetClick(preset)}
                                                    className={cn(
                                                        "relative flex flex-col p-3 rounded-xl border text-left transition-colors duration-200 bg-gradient-to-br",
                                                        preset.bg,
                                                        isActive
                                                            ? "border-brand-accent bg-white/[0.08] shadow-[0_0_15px_hsl(var(--brand-accent)/0.35)] ring-1 ring-brand-accent/50"
                                                            : "border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: preset.accent }} />
                                                        {isActive && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_hsl(var(--brand-accent))]" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-bold text-on-surface truncate">{preset.name}</p>
                                                    <p className="text-[10px] text-on-surface-variant/70 truncate">{preset.subtitle}</p>
                                                </motion.button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </SettingsCard>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                2. EFECTOS Y AMBIENTACIÓN
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Efectos y Ambientación"
                description="Control de efectos de cristal, auras y fondos ambientales dinámicos."
                icon={Icons.status.sparkles}
            >
                <SettingsCard>
                    <Controller
                        control={control}
                        name="theme.themeEnableBlurringEffects"
                        render={({ field }) => (
                            <OsToggle
                                label="Desenfoque y Vidrio Esmerilado (Glassmorphism)"
                                description="Translucidez dinámica sobre tarjetas, paneles y barras de navegación."
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
                                label="Cristal Líquido (Liquid Glass)"
                                description="Refracción y reflejos orgánicos con aceleración por GPU."
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
                                label="Fondo Ambiental en Ficha de Medios"
                                description="Ilumina el fondo de series y películas con el afiche oficial de fondo."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </SettingsCard>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                3. ORGANIZACIÓN DEL CATÁLOGO
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Organización del Catálogo"
                description="Criterio predeterminado para ordenar la colección de series y películas."
                icon={Icons.navigation.film}
            >
                <SettingsCard>
                    <Controller
                        control={control}
                        name="theme.themeAnimeLibraryCollectionDefaultSorting"
                        render={({ field }) => (
                            <OsSelect
                                label="Criterio de Ordenación Inicial"
                                description="Cómo se ordenan los títulos al ingresar a la colección."
                                options={[
                                    { value: "TITLE_ASC", label: "Alfabético (A - Z)" },
                                    { value: "TITLE_DESC", label: "Alfabético (Z - A)" },
                                    { value: "YEAR_DESC", label: "Año de Emisión (Más recientes)" },
                                    { value: "YEAR_ASC", label: "Año de Emisión (Más antiguos)" },
                                    { value: "RATING_DESC", label: "Mejor Valorados" },
                                ]}
                                value={field.value || "TITLE_ASC"}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </SettingsCard>
            </SettingsSection>

        </div>
    )
}
