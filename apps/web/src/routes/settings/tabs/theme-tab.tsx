import React from "react"
import { Section } from "../components"
import { type Control, useFormContext, useWatch } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { useSound } from "@/hooks/use-sound"
import { cn } from "@/components/ui/core/styling"
import { resolveThemeMode, type ThemeMode } from "@/lib/theme/theme-hooks"

interface ThemeTabProps {
    control: Control<SettingsFormValues>
}

// Modos de interfaz
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

const THEME_PRESETS = [
    { id: "era-universe", name: "Universo Dragon Ball", desc: "Todas las eras: rosa, rojo, verde y azul", background: "#140e15", accent: "#EC4899", sidebar: "#060407", themeEra: "era-universe" },
    { id: "era-db", name: "Dragon Ball", desc: "Naranja terracota, la aventura original", background: "#1C1712", accent: "#CF7430", sidebar: "#0C0A08", themeEra: "era-db" },
    { id: "era-dbz", name: "Dragon Ball Z", desc: "Azul VHS y dorado Super Saiyan", background: "#15161F", accent: "#3D6CA8", sidebar: "#090A0E", themeEra: "era-dbz" },
    { id: "era-dbgt", name: "Dragon Ball GT", desc: "Violeta espacial, la era space-age", background: "#14141E", accent: "#8E4B9E", sidebar: "#09090D", themeEra: "era-dbgt" },
    { id: "era-dbs", name: "Dragon Ball Super", desc: "Azul digital, la era de los dioses", background: "#10151F", accent: "#4193C4", sidebar: "#07090D", themeEra: "era-dbs" },
    { id: "era-daima", name: "Dragon Ball Daima", desc: "Verde mágico del Reino Demoníaco", background: "#191122", accent: "#3FAE74", sidebar: "#0B080F", themeEra: "era-daima" }
]

export function ThemeTab({ control }: ThemeTabProps) {
    const { playSound } = useSound()
    const { setValue, getValues } = useFormContext<SettingsFormValues>()
    const themeEraValue = useWatch({ control, name: "theme.themeEra" })
    const themeModeValue = useWatch({ control, name: "theme.themeMode" })
    const blurEffectsValue = useWatch({ control, name: "theme.themeEnableBlurringEffects" })

    const uiMode: ThemeMode = resolveThemeMode({
        themeMode: themeModeValue,
        themeEra: themeEraValue,
        themeEnableBlurringEffects: !!blurEffectsValue,
    })
    const isEraMode = uiMode === "era"
    const activePreset = THEME_PRESETS.find(p => p.themeEra === themeEraValue)?.id ?? THEME_PRESETS[0].id

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
                setValue("theme.themeEra", "era-daima", { shouldDirty: true })
            }
            setValue("theme.enableColorSettings", true, { shouldDirty: true })
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            <Section label="Modo de Interfaz" description="Elige la filosofía visual de toda la aplicación: sobriedad premium o temática por era.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {UI_MODES.map((mode) => {
                        const isActive = uiMode === mode.id
                        return (
                            <button key={mode.id} type="button" onClick={() => setMode(mode.id)} className={cn("relative flex flex-col p-5 rounded-container border transition-all duration-base group active:scale-95 overflow-hidden min-h-[140px] text-left", isActive ? "border-brand-accent bg-white/[0.06] shadow-[0_8px_30px_var(--glow-primary)]" : "glass-card border-outline-variant/30 hover:border-outline-variant/50 hover:bg-white/[0.04]")}>
                                <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ background: mode.gradient }} />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-on-surface uppercase tracking-widest">{mode.name}</span>
                                        <div className="flex gap-1">
                                            {mode.accents.map((c) => (<div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />))}
                                        </div>
                                    </div>
                                    <p className="text-label-sm text-on-surface-variant leading-relaxed font-medium flex-1">{mode.desc}</p>
                                </div>
                                {isActive && <div className="absolute inset-0 border-2 border-brand-accent rounded-container pointer-events-none" />}
                            </button>
                        )
                    })}
                </div>
            </Section>

            {isEraMode && (
                <>
                    <Section label="Presets de Tema" description="Selecciona una paleta de colores predefinida basada en las diferentes eras de Dragon Ball.">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {THEME_PRESETS.map((preset) => {
                                const isActive = activePreset === preset.id
                                const isCustom = preset.id === "custom"
                                return (
                                    <button key={preset.id} type="button" onClick={() => handlePresetClick(preset)} className={cn("relative flex flex-col p-5 rounded-container border transition-all duration-base group active:scale-95 overflow-hidden min-h-[160px]", isActive ? "border-brand-accent shadow-[0_8px_30px_var(--glow-primary)]" : "glass-card border-outline-variant/30 hover:border-outline-variant/50 hover:bg-white/[0.04]")} style={!isCustom && preset.background ? { background: `linear-gradient(135deg, ${preset.background} 0%, ${preset.sidebar || preset.background} 100%)` } : undefined}>
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-slower pointer-events-none bg-gradient-to-b from-transparent to-black/60" />
                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-bold text-on-surface uppercase tracking-widest">{preset.name}</span>
                                                <div className="flex gap-1">
                                                    <div className="w-3 h-3 rounded-full border border-outline-variant/10" style={{ background: preset.background }} />
                                                    <div className="w-3 h-3 rounded-full" style={{ background: preset.accent }} />
                                                </div>
                                            </div>
                                            <p className="text-label-sm text-on-surface-variant leading-relaxed font-medium flex-1">{preset.desc}</p>
                                            {isActive && <div className="absolute inset-0 border-2 border-brand-accent rounded-container pointer-events-none" />}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </Section>
                </>
            )}
        </div>
    )
}
