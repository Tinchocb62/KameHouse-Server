import { createFileRoute } from "@tanstack/react-router"
import React, { useEffect, useState, useMemo, Suspense } from "react"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"
import { useForm, FormProvider, type SubmitHandler, type FieldValues, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { LoadingOverlayWithLogo } from "@/components/shared/loading-overlay-with-logo"
import { useGetSettings, useSaveSettings } from "@/api/hooks/settings.hooks"
import { useAppStore } from "@/lib/store"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import type { SaveSettings_Variables } from "@/api/generated/endpoint.types"

import { useDebounce } from "use-debounce"
import { GooeyFilter } from "./components"

// Consolidación de los 5 Pilares de Configuración con lazy loading y prewarming
const tabLoaders = {
    appearance: () => import("./tabs/appearance-tab"),
    playback: () => import("./tabs/playback-tab"),
    library: () => import("./tabs/library-tab"),
    performance: () => import("./tabs/performance-tab"),
    system: () => import("./tabs/system-tab"),
}

const AppearanceTab = React.lazy(() => tabLoaders.appearance().then(m => ({ default: m.AppearanceTab })))
const PlaybackTab = React.lazy(() => tabLoaders.playback().then(m => ({ default: m.PlaybackTab })))
const LibraryTab = React.lazy(() => tabLoaders.library().then(m => ({ default: m.LibraryTab })))
const PerformanceTab = React.lazy(() => tabLoaders.performance().then(m => ({ default: m.PerformanceTab })))
const SystemTab = React.lazy(() => tabLoaders.system().then(m => ({ default: m.SystemTab })))

// ─── Schema ───────────────────────────────────────────────────────────────────
// Matches backend Models_Settings exactly

const settingsSchema = z.object({
    library: z.object({
        seriesPaths: z.array(z.string()).nullish().transform(v => v ?? []),
        moviePaths: z.array(z.string()).nullish().transform(v => v ?? []),
        autoScan: z.boolean().default(false),
        refreshLibraryOnStart: z.boolean().default(false),
        autoPlayNextEpisode: z.boolean().default(true),
        autoDetectSkipTimes: z.boolean().default(true),
        enableWatchContinuity: z.boolean().default(false),
        scannerMatchingThreshold: z.number().default(0),
        tmdbApiKey: z.string().default(""),
        tmdbLanguage: z.string().default("es-MX"),
        scannerUseLegacyMatching: z.boolean().default(false),
        scannerStrictStructure: z.boolean().default(false),
        scannerProvider: z.string().default(""),
        disableLocalScanning: z.boolean().default(false),
        primaryMetadataProvider: z.string().default("tmdb"),
        lastScanAt: z.any().optional(),
    }).passthrough().default({}),
    mediaPlayer: z.object({}).passthrough().default({}),
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
    }).passthrough().default({}),
    theme: z.object({
        enableColorSettings: z.boolean().default(false),
        backgroundColor: z.string().default("#050506"),
        accentColor: z.string().default("#C8102E"),
        themeEra: z.string().default(""),
        themeMode: z.string().default(""),
        themeEnableLiquidGlass: z.boolean().default(false),
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
    }).passthrough().default({}),

    notifications: z.object({
        disableNotifications: z.boolean().default(false),
        disableAutoScannerNotifications: z.boolean().default(false),
    }).passthrough().default({}),
    Platform: z.object({
        hideAudienceScore: z.boolean().default(false),
    }).passthrough().default({}),
}).passthrough()

export type SettingsFormValues = z.infer<typeof settingsSchema>

export const Route = createFileRoute("/settings/")(({
    component: SettingsPage,
}))

export const SETTINGS_PILLARS = [
    {
        id: "appearance",
        label: "Apariencia y Diseño",
        shortLabel: "Apariencia",
        icon: Icons.ui.palette,
        desc: "Temas por era, modo AMOLED y efectos visuales",
        keywords: ["tema", "era", "vidrio", "blur", "liquid glass", "fondo", "diseño", "orden", "dragon ball", "amoled"]
    },
    {
        id: "playback",
        label: "Reproducción y Audio",
        shortLabel: "Reproducción",
        icon: Icons.media.play,
        desc: "Doblaje, auto-skip, música de fondo y modos",
        keywords: ["audio", "doblaje", "latino", "skip", "intro", "outro", "relleno", "música", "volumen", "maratón", "tv"]
    },
    {
        id: "library",
        label: "Biblioteca y Escáner",
        shortLabel: "Biblioteca",
        icon: Icons.navigation.library,
        desc: "Carpetas, escáner en vivo y metadatos",
        keywords: ["carpetas", "directorios", "series", "peliculas", "escaner", "dragonball", "live", "tmdb", "anilist", "jikan", "scan"]
    },
    {
        id: "performance",
        label: "Rendimiento y Hardware",
        shortLabel: "Rendimiento",
        icon: Icons.status.zap,
        desc: "Telemetría de hardware, perfiles y aceleración GPU",
        keywords: ["hardware", "gpu", "nvenc", "qsv", "amf", "apple", "cpu", "ram", "transcode", "ffmpeg", "ultra", "eco", "rendimiento"]
    },
    {
        id: "system",
        label: "Sistema e Integraciones",
        shortLabel: "Sistema",
        icon: Icons.ui.settings,
        desc: "Claves de API, respaldo SQLite, caché y reseteo",
        keywords: ["sistema", "tmdb", "omdb", "api", "database", "sqlite", "backup", "cache", "notificaciones", "peligro"]
    },
]

function SettingsPage() {
    const { data: serverSettings, isLoading } = useGetSettings()
    const { mutateAsync: saveSettings, isPending: isSaving } = useSaveSettings()
    const setShowInitialSetup = useAppStore(state => state.setShowInitialSetup)
    const [activeTab, setActiveTab] = useState<string>("appearance")
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [debouncedSearchQuery] = useDebounce(searchQuery, 150)

    // Pre-warm all lazy settings tabs in background during idle time (eliminates 400ms chunk stall)
    useEffect(() => {
        const prewarmTabs = () => {
            const loaders: Array<() => Promise<unknown>> = Object.values(tabLoaders)
            loaders.forEach(loader => {
                loader().catch(() => {})
            })
        }
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
            const handle = (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(prewarmTabs, { timeout: 1500 })
            return () => {
                if ("cancelIdleCallback" in window) {
                    (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle)
                }
            }
        } else {
            const timer = setTimeout(prewarmTabs, 200)
            return () => clearTimeout(timer)
        }
    }, [])

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
        shouldUnregister: false,
    })

    const { control, handleSubmit, formState: { isDirty }, reset } = form

    useEffect(() => {
        if (serverSettings && !isDirty) {
            reset(serverSettings as unknown as SettingsFormValues)
        }
    }, [serverSettings, reset, isDirty])

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

    const activePillar = useMemo(() => {
        return SETTINGS_PILLARS.find(p => p.id === activeTab) || SETTINGS_PILLARS[0]
    }, [activeTab])

    if (isLoading && !serverSettings) return <LoadingOverlayWithLogo />

    return (
        <div className="flex flex-col md:flex-row h-full w-full pt-16 md:pt-0 text-on-surface-variant selection:bg-brand-accent/30 overflow-hidden relative bg-transparent">
            <GooeyFilter />
            {/* ── Mobile Segmented Tab Bar ────────────────────────────────────────── */}
            <nav className="md:hidden shrink-0 w-full flex flex-row overflow-x-auto no-scrollbar border-b border-outline-variant/20 bg-zinc-950/90 backdrop-blur-md px-3 py-2.5 gap-2 z-20">
                {SETTINGS_PILLARS.map((item) => {
                    const isActive = activeTab === item.id
                    const Icon = item.icon
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onMouseEnter={() => tabLoaders[item.id as keyof typeof tabLoaders]?.()}
                            onFocus={() => tabLoaders[item.id as keyof typeof tabLoaders]?.()}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all duration-200 active:scale-95",
                                isActive ? "text-white" : "text-on-surface-variant hover:text-on-surface"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeMobileTabIndicator"
                                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                    className="absolute inset-0 bg-brand-accent/25 border border-brand-accent/60 rounded-xl shadow-[0_0_14px_hsl(var(--brand-accent)/0.35)]"
                                />
                            )}
                            <Icon className={cn("w-4 h-4 shrink-0 relative z-10", isActive ? "text-brand-accent" : "text-on-surface-variant")} />
                            <span className="relative z-10">{item.shortLabel}</span>
                        </button>
                    )
                })}
            </nav>

            {/* ── Left Sidebar Nav for Desktop (5 Clean Pillars) ─────────────────── */}
            <nav
                className="hidden md:flex relative md:w-60 lg:w-[280px] xl:w-[290px] shrink-0 h-full flex-col border-r border-outline-variant/20 backdrop-blur-md overflow-y-auto overflow-x-hidden no-scrollbar"
                style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container-lowest) 85%, transparent)" }}
            >
                {/* Sidebar header */}
                <div className="relative z-10 px-6 pt-8 pb-5 border-b border-outline-variant/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-on-surface tracking-tight select-none">
                                AJUSTES
                            </h1>
                            <p className="text-[11px] font-mono text-on-surface-variant/70 uppercase tracking-widest mt-0.5">
                                Panel de Control
                            </p>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-accent/80 shadow-[0_0_10px_hsl(var(--brand-accent)/0.8)] animate-pulse" />
                    </div>
                </div>

                {/* 5 Pillars list */}
                <div className="relative z-10 flex-1 px-4 py-5 flex flex-col space-y-2 w-full">
                    {SETTINGS_PILLARS.map((pillar) => {
                        const isActive = activeTab === pillar.id
                        const Icon = pillar.icon
                        return (
                            <motion.button
                                key={pillar.id}
                                type="button"
                                whileHover={{ scale: 1.015, x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                onMouseEnter={() => tabLoaders[pillar.id as keyof typeof tabLoaders]?.()}
                                onFocus={() => tabLoaders[pillar.id as keyof typeof tabLoaders]?.()}
                                onClick={() => setActiveTab(pillar.id)}
                                className={cn(
                                    "w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left transition-colors duration-200 group relative shrink-0 overflow-hidden",
                                    isActive
                                        ? "text-on-surface"
                                        : "text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04]"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeDesktopPillarIndicator"
                                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                        className="absolute inset-0 bg-brand-accent/15 border border-brand-accent/50 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.3),0_0_16px_hsl(var(--brand-accent)/0.25)]"
                                    />
                                )}
                                <div className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 relative z-10",
                                    isActive
                                        ? "bg-brand-accent/20 border-brand-accent/40 text-brand-accent shadow-[0_0_12px_hsl(var(--brand-accent)/0.35)]"
                                        : "bg-white/5 border-white/10 text-on-surface-variant group-hover:text-on-surface group-hover:bg-white/10"
                                )}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0 relative z-10">
                                    <span className={cn(
                                        "text-sm block leading-snug transition-colors duration-200",
                                        isActive ? "font-bold text-on-surface" : "font-medium text-on-surface-variant group-hover:text-on-surface"
                                    )}>
                                        {pillar.label}
                                    </span>
                                    <span className={cn(
                                        "text-[11px] block mt-0.5 font-normal truncate transition-colors duration-200",
                                        isActive ? "text-on-surface-variant font-medium" : "text-on-surface-variant/60 group-hover:text-on-surface-variant/80"
                                    )}>
                                        {pillar.desc}
                                    </span>
                                </div>
                            </motion.button>
                        )
                    })}
                </div>

                {/* Sidebar footer badge */}
                <div className="p-4 border-t border-outline-variant/10 text-center">
                    <span className="text-[10px] font-mono text-on-surface-variant/50 uppercase tracking-widest">
                        KameHouse Server v1.0
                    </span>
                </div>
            </nav>

            {/* ── Main Content Area ────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Content header with Quick Search */}
                <header className="shrink-0 px-6 sm:px-8 lg:px-10 py-5 border-b border-white/[0.06] bg-zinc-950/40 backdrop-blur-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-7 h-7 rounded-lg bg-surface-container border border-outline-variant/30 flex items-center justify-center">
                                    {React.createElement(activePillar.icon, { className: "h-3.5 w-3.5 text-brand-accent" })}
                                </div>
                                <span className="text-label-sm uppercase tracking-widest text-on-surface-variant font-mono">
                                    {activePillar.shortLabel}
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-display tracking-wider text-on-surface leading-tight uppercase">
                                {activePillar.label}
                            </h2>
                        </div>

                        {/* Quick Search */}
                        <div className="relative w-full sm:w-72">
                            <Icons.navigation.search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar en ajustes..."
                                className={cn(
                                    "w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium",
                                    "bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.08]",
                                    "border border-white/10 hover:border-white/20 focus:border-brand-accent/50",
                                    "text-on-surface placeholder:text-on-surface-variant/50",
                                    "focus:outline-none focus:ring-1 focus:ring-brand-accent/30 transition-all duration-base shadow-sm"
                                )}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70 hover:text-on-surface transition-colors p-1"
                                >
                                    <Icons.ui.close className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="h-[2px] w-12 bg-gradient-to-r from-brand-accent to-transparent rounded-full mt-3" />
                </header>

                {/* Scrollable form content */}
                <div className="flex-1 overflow-y-auto no-scrollbar transform-gpu [contain:paint]">
                    <FormProvider {...form}>
                        <form
                            id="settings-form"
                            onSubmit={handleSubmit(onSubmit as unknown as SubmitHandler<FieldValues>, onFormError)}
                            className="w-full max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-7 pb-32 space-y-9 min-h-full"
                        >
                            <Suspense fallback={<div className="flex items-center justify-center w-full h-64"><div className="w-8 h-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" /></div>}>
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                        exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        {activeTab === "appearance"  && <AppearanceTab control={control} searchQuery={debouncedSearchQuery} />}
                                        {activeTab === "playback"    && <PlaybackTab control={control} searchQuery={debouncedSearchQuery} />}
                                        {activeTab === "library"     && <LibraryTab control={control} searchQuery={debouncedSearchQuery} />}
                                        {activeTab === "performance" && <PerformanceTab control={control} searchQuery={debouncedSearchQuery} />}
                                        {activeTab === "system"      && <SystemTab control={control} onOpenWizard={() => setShowInitialSetup(true)} searchQuery={debouncedSearchQuery} />}
                                    </motion.div>
                                </AnimatePresence>
                            </Suspense>
                        </form>
                    </FormProvider>
                </div>
            </main>

            {/* ── Floating Save Bar ────────────────────────────────────────────── */}
            <AnimatePresence>
                {isDirty && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 50, x: "-50%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col md:flex-row items-center gap-3 md:gap-8 backdrop-blur-overlay-md border border-outline-variant rounded-container px-4 md:px-6 py-3 md:py-4 shadow-elevation-3 max-w-[calc(100vw-2rem)] w-max"
                        style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 85%, transparent)" }}
                    >
                        <div className="flex items-center gap-3 pl-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent" />
                            </span>
                            <span className="text-label-sm font-mono text-on-surface uppercase tracking-widest">Cambios sin guardar</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => reset()}
                                className="text-xs font-bold text-on-surface-variant hover:text-on-surface transition-all px-3.5 py-1.5 hover:bg-surface-container-high rounded-lg active:scale-95"
                            >
                                Descartar
                            </button>
                            <button
                                type="submit"
                                form="settings-form"
                                disabled={isSaving}
                                className="bg-brand-accent hover:brightness-110 text-on-primary px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-base disabled:opacity-50 uppercase tracking-widest active:scale-95 shadow-[var(--shadow-brand-primary)]"
                            >
                                {isSaving ? "Guardando..." : "Guardar Ajustes"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
