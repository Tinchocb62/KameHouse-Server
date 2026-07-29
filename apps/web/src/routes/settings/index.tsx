import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"
import { useForm, FormProvider, type SubmitHandler, type FieldValues, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { LoadingOverlayWithLogo } from "@/components/shared/loading-overlay-with-logo"

import { useGetSettings, useSaveSettings } from "@/api/hooks/settings.hooks"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import type { SaveSettings_Variables } from "@/api/generated/endpoint.types"

import React, { Suspense } from "react"
// Import extracted tabs with lazy loading
const ThemeTab = React.lazy(() => import("./tabs/theme-tab").then(m => ({ default: m.ThemeTab })))
const EffectsTab = React.lazy(() => import("./tabs/effects-tab").then(m => ({ default: m.EffectsTab })))
const NavigationTab = React.lazy(() => import("./tabs/navigation-tab").then(m => ({ default: m.NavigationTab })))
const CardsTab = React.lazy(() => import("./tabs/cards-tab").then(m => ({ default: m.CardsTab })))
const ViewsTab = React.lazy(() => import("./tabs/views-tab").then(m => ({ default: m.ViewsTab })))
const AudioTab = React.lazy(() => import("./tabs/audio-tab").then(m => ({ default: m.AudioTab })))
const NotificationsTab = React.lazy(() => import("./tabs/notifications-tab").then(m => ({ default: m.NotificationsTab })))
const PlayerTab = React.lazy(() => import("./tabs/player-tab").then(m => ({ default: m.PlayerTab })))
const DeviceModesTab = React.lazy(() => import("./tabs/device-modes-tab").then(m => ({ default: m.DeviceModesTab })))
const StreamingTab = React.lazy(() => import("./tabs/streaming-tab").then(m => ({ default: m.StreamingTab })))
const DirectoriesTab = React.lazy(() => import("./tabs/directories-tab").then(m => ({ default: m.DirectoriesTab })))
const ScannerTab = React.lazy(() => import("./tabs/scanner-tab").then(m => ({ default: m.ScannerTab })))
const IntegrationsTab = React.lazy(() => import("./tabs/integrations-tab").then(m => ({ default: m.IntegrationsTab })))
const SystemTab = React.lazy(() => import("./tabs/system-tab").then(m => ({ default: m.SystemTab })))

// ─── Schema ───────────────────────────────────────────────────────────────────
// Matches backend Models_Settings exactly

const settingsSchema = z.object({
    library: z.object({
        seriesPaths: z.array(z.string()).nullish().transform(v => v ?? []),
        moviePaths: z.array(z.string()).nullish().transform(v => v ?? []),
        autoScan: z.boolean().default(false),
        openWebURLOnStart: z.boolean().default(false),
        refreshLibraryOnStart: z.boolean().default(false),
        autoPlayNextEpisode: z.boolean().default(true),
        autoDetectSkipTimes: z.boolean().default(true),
        enableWatchContinuity: z.boolean().default(false),
        scannerMatchingThreshold: z.number().default(0),
        scannerMatchingAlgorithm: z.string().default(""),
        useFallbackMetadataProvider: z.boolean().default(false),
        tmdbApiKey: z.string().default(""),
        tmdbLanguage: z.string().default("es-MX"),
        scannerUseLegacyMatching: z.boolean().default(false),
        scannerConfig: z.string().default(""),
        scannerStrictStructure: z.boolean().default(false),
        scannerProvider: z.string().default(""),
        disableLocalScanning: z.boolean().default(false),
        primaryMetadataProvider: z.string().default("tmdb"),
        fanartApiKey: z.string().default(""),
        omdbApiKey: z.string().default(""),
        lastScanAt: z.string().optional(),
    }).default({}),
    mediaPlayer: z.object({}).default({}),
    mediastream: z.object({
        transcodeEnabled: z.boolean().default(false),
        transcodeHwAccel: z.string().default("auto"),
        transcodeThreads: z.number().default(0),
        transcodePreset: z.string().default(""),
        disableAutoSwitchToDirectPlay: z.boolean().default(false),
        directPlayOnly: z.boolean().default(false),
        preTranscodeEnabled: z.boolean().default(false),
        preTranscodeLibraryDir: z.string().default(""),
        transcodeHwAccelCustomSettings: z.string().default(""),
        ffmpegPath: z.string().default(""),
        ffprobePath: z.string().default(""),
    }).default({}),
    theme: z.object({
        enableColorSettings: z.boolean().default(false),
        backgroundColor: z.string().default("#050506"),
        accentColor: z.string().default("#C8102E"),
        sidebarBackgroundColor: z.string().default(""),
        themeEra: z.string().default(""),
        themeMode: z.string().default(""),
        themeEnableLiquidGlass: z.boolean().default(false),
        homeItems: z.array(z.string()).nullish().transform(v => v ?? []),
        themeAnimeEntryScreenLayout: z.string().default(""),
        themeSmallerEpisodeCarouselSize: z.boolean().default(false),
        themeExpandSidebarOnHover: z.boolean().default(false),
        themeLibraryScreenBannerType: z.string().default("dynamic"),
        themeLibraryScreenCustomBannerImage: z.string().default(""),
        themeLibraryScreenCustomBannerPosition: z.string().default("50% 50%"),
        themeLibraryScreenCustomBannerOpacity: z.number().default(10),
        themeLibraryScreenCustomBackgroundImage: z.string().default(""),
        themeLibraryScreenCustomBackgroundOpacity: z.number().default(10),
        themeLibraryScreenCustomBackgroundBlur: z.string().default("none"),
        themeEnableMediaPageBlurredBackground: z.boolean().default(false),
        themeDisableSidebarTransparency: z.boolean().default(false),
        themeDisableLibraryScreenGenreSelector: z.boolean().default(false),
        themeUseLegacyEpisodeCard: z.boolean().default(false),
        themeDisableCarouselAutoScroll: z.boolean().default(false),
        themeMediaPageBannerType: z.string().default("default"),
        themeMediaPageBannerSize: z.string().default("default"),
        themeMediaPageBannerInfoBoxSize: z.string().default("default"),
        themeShowEpisodeCardAnimeInfo: z.boolean().default(true),
        themeAnimeLibraryCollectionDefaultSorting: z.string().default("TITLE_ASC"),
        themeShowAnimeUnwatchedCount: z.boolean().default(true),
        themeHideEpisodeCardDescription: z.boolean().default(false),
        themeHideDownloadedEpisodeCardFilename: z.boolean().default(false),
        themeCustomCSS: z.string().max(20000).default(""),
        themeMobileCustomCSS: z.string().max(20000).default(""),
        themeUnpinnedMenuItems: z.array(z.string()).nullish().transform(v => v ?? []),
        themeEnableSidebarGradient: z.boolean().default(false),
        themeEnableBlurringEffects: z.boolean().default(false),
        themeEnableCinematicGrain: z.boolean().default(false),
    }).default({}),

    notifications: z.object({
        disableNotifications: z.boolean().default(false),
        disableAutoScannerNotifications: z.boolean().default(false),
    }).default({}),
    Platform: z.object({
        hideAudienceScore: z.boolean().default(false),
    }).default({}),
})

export type SettingsFormValues = z.infer<typeof settingsSchema>

export const Route = createFileRoute("/settings/")(({
    component: SettingsPage,
}))

const NAV_GROUPS = [
    {
        groupLabel: "PERSONALIZACIÓN Y TEMAS",
        items: [
            { id: "theme", label: "Temas y Colores", icon: Icons.ui.palette, desc: "Paleta visual y skins" },
            { id: "effects", label: "Efectos Visuales", icon: Icons.status.sparkles, desc: "Blur, líquidos y grano" },
        ]
    },
    {
        groupLabel: "INTERFAZ Y VISTAS",
        items: [
            { id: "navigation", label: "Navegación", icon: Icons.navigation.menu, desc: "Menú lateral y layouts" },
            { id: "cards", label: "Tarjetas", icon: Icons.navigation.grid, desc: "Tamaños y visibilidad" },
            { id: "views", label: "Pantallas", icon: Icons.navigation.layers, desc: "Biblioteca y detalles" },
        ]
    },
    {
        groupLabel: "SONIDO Y NOTIFICACIONES",
        items: [
            { id: "audio", label: "Audio y Música", icon: Icons.media.volume2, desc: "Música y UI" },
            { id: "notifications", label: "Notificaciones", icon: Icons.ui.bell, desc: "Alertas globales" },
        ]
    },
    {
        groupLabel: "REPRODUCCIÓN",
        items: [
            { id: "player", label: "Reproductor Web", icon: Icons.media.play, desc: "Autoplay y progreso" },
            { id: "device-modes", label: "Modos Locales", icon: Icons.status.monitor, desc: "TV y Maratón" },
            { id: "streaming", label: "Streaming", icon: Icons.media.cast, desc: "Transcodificación" },
        ]
    },
    {
        groupLabel: "CONTENIDO Y BIBLIOTECA",
        items: [
            { id: "directories", label: "Directorios", icon: Icons.navigation.library, desc: "Carpetas de medios" },
            { id: "scanner", label: "Escáner", icon: Icons.status.radar, desc: "Motor de análisis" },
        ]
    },
    {
        groupLabel: "SERVICIOS Y SISTEMA",
        items: [
            { id: "integrations", label: "Integraciones", icon: Icons.status.cloud, desc: "APIs y servicios" },
            { id: "system", label: "Mantenimiento", icon: Icons.ui.settings, desc: "Arranque y base de datos" },
        ]
    }
]

function SettingsPage() {
    const { data: serverSettings, isLoading } = useGetSettings()
    const { mutateAsync: saveSettings, isPending: isSaving } = useSaveSettings()
    const initialActiveTab = "theme"
    const [activeTab, setActiveTab] = useState<string>(initialActiveTab)
    const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>(() => {
        const initialIndex = NAV_GROUPS.findIndex(g => g.items.some(i => i.id === initialActiveTab))
        return { [initialIndex !== -1 ? initialIndex : 0]: true }
    })

    const toggleGroup = (idx: number) => {
        setExpandedGroups(prev => {
            const isCurrentlyExpanded = !!prev[idx]
            return isCurrentlyExpanded ? {} : { [idx]: true }
        })
    }

    // KameHouse backdrop for settings
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl)
    useEffect(() => {
        setBackdropUrl(null)
        return () => { setBackdropUrl(null) }
    }, [setBackdropUrl])

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema) as unknown as Resolver<SettingsFormValues>,
        defaultValues: (serverSettings || {}) as unknown as SettingsFormValues,
        mode: "onTouched",
    })

    const { control, handleSubmit, formState: { isDirty }, reset } = form

    useEffect(() => {
        if (serverSettings) {
            reset(serverSettings as unknown as SettingsFormValues)
        }
    }, [serverSettings, reset])

    const onSubmit: SubmitHandler<SettingsFormValues> = async (data) => {
        try {
            await saveSettings(data as unknown as SaveSettings_Variables)
            toast.success("Ajustes guardados con éxito")
            reset(data)
        } catch {
            toast.error("Error al guardar los ajustes")
        }
    }

    const onFormError = (errors: import("react-hook-form").FieldErrors<SettingsFormValues>) => {
        console.error("Form Validation Errors:", errors)
        const failedFields: string[] = []
        const extractErrors = (obj: Record<string, unknown> | undefined | null, prefix = "") => {
            if (!obj) return
            for (const key of Object.keys(obj)) {
                const errorObj = obj[key] as Record<string, unknown> | undefined
                if (errorObj && errorObj.message) {
                    failedFields.push(`${prefix}${key}: ${errorObj.message}`)
                } else if (errorObj && typeof errorObj === "object") {
                    extractErrors(errorObj, `${prefix}${key}.`)
                }
            }
        }
        extractErrors(errors)
        const errorMsg = failedFields.length > 0 
            ? `Errores de validación: ${failedFields.join(", ")}` 
            : "Hay errores de validación en el formulario"
        toast.error(errorMsg)
    }

    if (isLoading && !serverSettings) return <LoadingOverlayWithLogo />

    return (
        // pt-16 en mobile: despeja el AppTopNav fijo (h-16); en desktop no hay top nav
        <div className="flex flex-col md:flex-row h-full w-full pt-16 md:pt-0 text-on-surface-variant selection:bg-brand-accent/30 overflow-hidden relative bg-transparent">
            {/* ── Mobile Tab Bar (Chips horizontal) ─────────────────────────────────── */}
            <nav className="md:hidden shrink-0 w-full flex flex-row overflow-x-auto no-scrollbar border-b border-outline-variant/20 bg-zinc-950/80 backdrop-blur-md px-3 py-2.5 gap-2">
                {NAV_GROUPS.flatMap(g => g.items).map((item) => {
                    const isActive = activeTab === item.id
                    const Icon = item.icon
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all duration-base border active:scale-95",
                                isActive
                                    ? "bg-brand-accent/20 border-brand-accent/50 text-on-surface shadow-[0_0_12px_hsl(var(--brand-accent)/0.3)]"
                                    : "bg-white/[0.04] border-white/10 text-on-surface-variant hover:text-on-surface hover:bg-white/[0.08]"
                            )}
                        >
                            <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-brand-accent" : "text-on-surface-variant")} />
                            <span>{item.label}</span>
                        </button>
                    )
                })}
            </nav>

            {/* ── Left Sidebar Nav for Desktop (Linear / Vercel Minimalist) ─ */}
            <nav
                className="hidden md:flex relative w-[280px] shrink-0 h-full flex-col border-r border-outline-variant/20 backdrop-blur-md overflow-y-auto overflow-x-hidden no-scrollbar"
                style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container-lowest) 80%, transparent)" }}
            >
                {/* Sidebar header */}
                <div className="relative z-10 px-6 pt-8 pb-5 border-b border-outline-variant/10">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-on-surface tracking-tight select-none">
                            AJUSTES
                        </h1>
                        <span className="w-2 h-2 rounded-full bg-brand-accent/80 shadow-[0_0_8px_hsl(var(--brand-accent)/0.6)]" />
                    </div>
                </div>

                {/* Nav items */}
                <div className="relative z-10 flex-1 px-4 py-5 flex flex-col space-y-3 w-full">
                    {NAV_GROUPS.map((group, groupIdx) => {
                        const isExpanded = expandedGroups[groupIdx]
                        const hasActiveItem = group.items.some(item => item.id === activeTab)
                        return (
                            <div key={groupIdx} className="flex flex-col space-y-1">
                                {/* Group Header */}
                                <button 
                                    type="button"
                                    onClick={() => toggleGroup(groupIdx)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-5 py-3.5 my-0.5 cursor-pointer rounded-2xl backdrop-blur-md transition-all duration-base group/header border select-none relative overflow-hidden",
                                        isExpanded ? "bg-white/[0.08]" : "bg-white/[0.03] hover:bg-white/[0.07]",
                                        hasActiveItem
                                            ? "border-brand-accent/40 text-on-surface shadow-[0_4px_20px_rgba(0,0,0,0.25),0_0_15px_hsl(var(--brand-accent)/0.2)]"
                                            : "border-white/10 text-on-surface-variant hover:text-on-surface hover:border-white/20"
                                    )}
                                >
                                    {hasActiveItem && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/15 via-transparent to-transparent pointer-events-none" />
                                    )}
                                    <div className="flex items-center gap-3 relative z-10">
                                        <span className={cn(
                                            "w-2.5 h-2.5 rounded-full transition-all duration-base shrink-0",
                                            hasActiveItem 
                                                ? "bg-brand-accent shadow-[0_0_10px_hsl(var(--brand-accent)/0.9)] scale-110" 
                                                : "bg-white/20 group-hover/header:bg-white/50"
                                        )} />
                                        <span className="text-xs font-bold uppercase tracking-widest">{group.groupLabel}</span>
                                    </div>
                                    <div className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-base shrink-0 relative z-10 border",
                                        hasActiveItem 
                                            ? "bg-brand-accent/20 border-brand-accent/30 text-brand-accent shadow-[0_0_8px_hsl(var(--brand-accent)/0.4)]" 
                                            : "bg-white/5 border-white/10 text-on-surface-variant/60 group-hover/header:bg-white/10 group-hover/header:text-on-surface"
                                    )}>
                                        <Icons.navigation.chevronDown className={cn("w-4 h-4 transition-transform duration-base", isExpanded ? "rotate-180" : "")} />
                                    </div>
                                </button>
                                
                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            key="accordion-content"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                            className="overflow-hidden flex flex-col space-y-2 pt-1 pb-1"
                                        >
                                            {group.items.map((item) => {
                                                const isActive = activeTab === item.id
                                                return (
                                                    <motion.button
                                                        key={item.id}
                                                        type="button"
                                                        whileHover={{ scale: 1.01, x: 3 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => setActiveTab(item.id)}
                                                        className={cn(
                                                            "w-full flex items-center gap-4 px-5 py-3.5 rounded-lg text-left transition-all duration-base group relative shrink-0 overflow-hidden backdrop-blur-sm",
                                                            isActive
                                                                ? "bg-brand-accent/15 border border-brand-accent/40 text-on-surface shadow-[0_2px_14px_hsl(var(--brand-accent)/0.2)]"
                                                                : "bg-white/[0.02] border border-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/[0.06] hover:border-white/15"
                                                        )}
                                                    >
                                                        <item.icon className={cn(
                                                            "w-5 h-5 shrink-0 transition-colors duration-base",
                                                            isActive ? "text-brand-accent" : "text-on-surface-variant/70 group-hover:text-on-surface"
                                                        )} />
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <span className={cn(
                                                                "text-sm block leading-snug transition-colors duration-base",
                                                                isActive ? "font-bold text-on-surface" : "font-medium text-on-surface-variant group-hover:text-on-surface"
                                                            )}>
                                                                {item.label}
                                                            </span>
                                                            {item.desc && (
                                                                <span className={cn(
                                                                    "text-xs block mt-0.5 font-normal truncate transition-colors duration-base",
                                                                    isActive ? "text-on-surface-variant" : "text-on-surface-variant/60 group-hover:text-on-surface-variant/80"
                                                                )}>
                                                                    {item.desc}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </motion.button>
                                                )
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    })}
                </div>
            </nav>

            {/* ── Main Content Area ────────────────────────────────────── */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Content header */}
                <header className="shrink-0 page-px pt-8 pb-6 border-b border-outline-variant">
                    <div className="flex items-center gap-2 mb-2">
                        {(() => {
                            const nav = NAV_GROUPS.flatMap(g => g.items).find(n => n.id === activeTab)
                            if (!nav) return null
                            const Icon = nav.icon
                            return (
                                <>
                                    <div className="w-8 h-8 rounded-lg bg-surface-container border border-outline-variant/30 flex items-center justify-center">
                                        <Icon className="h-4 w-4 text-on-surface-variant" />
                                    </div>
                                    <span className="text-label-sm uppercase tracking-widest text-on-surface-variant font-mono">
                                        {nav.label}
                                    </span>
                                </>
                            )
                        })()}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-display tracking-wider text-on-surface leading-none">
                        {NAV_GROUPS.find(g => g.items.some(i => i.id === activeTab))?.groupLabel || "CONFIGURACIÓN"}
                    </h2>
                    <div className="h-[2px] w-10 bg-gradient-to-r from-brand-accent/60 to-transparent rounded-full mt-3" />
                </header>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <FormProvider {...form}>
                        <form
                            id="settings-form"
                            onSubmit={handleSubmit(onSubmit as unknown as SubmitHandler<FieldValues>, onFormError)}
                            className="page-px py-8 pb-32 md:pb-32 space-y-10 min-h-full"
                        >
                            <Suspense fallback={<div className="flex items-center justify-center w-full h-64"><div className="w-8 h-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" /></div>}>
                                {activeTab === "theme"         && <ThemeTab control={control} />}
                                {activeTab === "effects"       && <EffectsTab control={control} />}
                                {activeTab === "navigation"    && <NavigationTab control={control} />}
                                {activeTab === "cards"         && <CardsTab control={control} />}
                                {activeTab === "views"         && <ViewsTab control={control} />}
                                {activeTab === "audio"         && <AudioTab control={control} />}
                                {activeTab === "notifications" && <NotificationsTab control={control} />}
                                {activeTab === "player"        && <PlayerTab control={control} />}
                                {activeTab === "device-modes"  && <DeviceModesTab />}
                                {activeTab === "streaming"     && <StreamingTab control={control} />}
                                {activeTab === "directories"   && <DirectoriesTab control={control} />}
                                {activeTab === "scanner"       && <ScannerTab control={control} />}
                                {activeTab === "integrations"  && <IntegrationsTab control={control} />}
                                {activeTab === "system"        && <SystemTab control={control} />}
                            </Suspense>
                        </form>
                    </FormProvider>
                </div>
            </main>

            {/* ── Floating Save Bar ────────────────────────────────────── */}
            <AnimatePresence>
                {isDirty && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 50, x: "-50%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col md:flex-row items-center gap-3 md:gap-8 backdrop-blur-overlay-md border border-outline-variant rounded-container px-4 md:px-6 py-3 md:py-4 shadow-elevation-3 max-w-[calc(100vw-2rem)] w-max"
                        style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 80%, transparent)" }}
                    >
                        <div className="flex items-center gap-3 pl-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent" />
                            </span>
                            <span className="text-label-sm font-mono text-on-surface-variant uppercase tracking-widest">Cambios sin guardar</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => reset()}
                                className="text-xs font-bold text-on-surface-variant hover:text-on-surface transition-all px-3 py-1.5 hover:bg-surface-container-high rounded-lg active:scale-95"
                            >
                                Descartar
                            </button>
                            <button
                                type="submit"
                                form="settings-form"
                                disabled={isSaving}
                                className="bg-brand-accent hover:brightness-110 text-on-primary px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-base disabled:opacity-50 uppercase tracking-widest active:scale-95 shadow-[var(--shadow-brand-primary)]"
                            >
                                {isSaving ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
