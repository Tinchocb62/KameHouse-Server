import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"
import { useForm, FormProvider, type SubmitHandler, type FieldValues, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { LoadingOverlayWithLogo } from "@/components/shared/loading-overlay-with-logo"

import { useGetSettings, useSaveSettings } from "@/api/hooks/settings.hooks"
import {
    LucideHardDrive, LucideSettings, LucideRadar, LucideCloud, LucidePlay, LucideTv, LucidePalette
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/components/ui/core/styling"
import type { SaveSettings_Variables } from "@/api/generated/endpoint.types"

// Import extracted tabs
import { LibraryTab } from "./tabs/library-tab"
import { ScannerTab } from "./tabs/scanner-tab"
import { IntegrationsTab } from "./tabs/integrations-tab"
import { SystemTab } from "./tabs/system-tab"
import { PlayerTab } from "./tabs/player-tab"
import { StreamingTab } from "./tabs/streaming-tab"
import { AppearanceTab } from "./tabs/appearance-tab"

// ─── Schema ───────────────────────────────────────────────────────────────────
// Matches backend Models_Settings exactly

const settingsSchema = z.object({
    library: z.object({
        seriesPaths: z.array(z.string()).nullish().transform(v => v ?? []),
        moviePaths: z.array(z.string()).nullish().transform(v => v ?? []),
        autoScan: z.boolean().default(false),
        disableAnimeCardTrailers: z.boolean().default(false),
        openWebURLOnStart: z.boolean().default(false),
        refreshLibraryOnStart: z.boolean().default(false),
        autoPlayNextEpisode: z.boolean().default(true),
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
        transcodeHwAccel: z.string().default(""),
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
        themeContinueWatchingDefaultSorting: z.string().default("LAST_WATCHED_DESC"),
        themeAnimeLibraryCollectionDefaultSorting: z.string().default("TITLE_ASC"),
        themeShowAnimeUnwatchedCount: z.boolean().default(true),
        themeHideEpisodeCardDescription: z.boolean().default(false),
        themeHideDownloadedEpisodeCardFilename: z.boolean().default(false),
        themeCustomCSS: z.string().max(20000).default(""),
        themeMobileCustomCSS: z.string().max(20000).default(""),
        themeUnpinnedMenuItems: z.array(z.string()).nullish().transform(v => v ?? []),
        themeEnableSidebarGradient: z.boolean().default(false),
        themeEnableBlurringEffects: z.boolean().default(false),
    }).default({}),

    notifications: z.object({
        disableNotifications: z.boolean().default(false),
        disableAutoDownloaderNotifications: z.boolean().default(false),
        disableAutoScannerNotifications: z.boolean().default(false),
    }).default({}),
    Platform: z.object({
        hideAudienceScore: z.boolean().default(false),
        disableCacheLayer: z.boolean().default(false),
    }).default({}),
})

export type SettingsFormValues = z.infer<typeof settingsSchema>

export const Route = createFileRoute("/settings/")(({
    component: SettingsPage,
}))

const NAV_ITEMS: { id: string; label: string; icon: React.ElementType; desc?: string }[] = [
    { id: "general",      label: "General",         icon: LucideSettings },
    { id: "appearance",   label: "Apariencia",    icon: LucidePalette },
    { id: "library",      label: "Biblioteca",    icon: LucideHardDrive },
    { id: "scanner",      label: "Escáner",       icon: LucideRadar },
    { id: "player",       label: "Reproductor",   icon: LucidePlay },
    { id: "streaming",    label: "Streaming",     icon: LucideTv },
    { id: "integrations", label: "Integraciones", icon: LucideCloud },

]

const SECTION_LABELS: Record<string, string> = {
    general:      "CONFIGURACIÓN DEL SISTEMA",
    library:      "DIRECTORIOS DE BIBLIOTECA",
    player:       "MOTOR DE REPRODUCCIÓN",
    scanner:      "MOTOR ESCÁNER",
    streaming:    "MEDIASTREAM ENGINE",
    integrations: "SERVICIOS EXTERNOS",
    appearance:   "PERSONALIZACIÓN VISUAL",
}

function SettingsPage() {
    const { data: serverSettings, isLoading } = useGetSettings()
    const { mutateAsync: saveSettings, isPending: isSaving } = useSaveSettings()
    const [activeTab, setActiveTab] = useState<string>("general")

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
        <div className="flex h-full w-full text-on-surface-variant selection:bg-brand-accent/30 overflow-hidden relative bg-transparent">
            {/* ── Left Sidebar Nav ─────────────────────────────────────── */}
            <nav
                className="relative w-[260px] shrink-0 h-full flex flex-col border-r border-outline-variant/30 backdrop-blur-overlay-xl overflow-y-auto no-scrollbar"
                style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container-low) 40%, transparent)" }}
            >

                {/* Sidebar header */}
                <div className="relative z-10 px-6 pt-8 pb-6">
                    <div className="flex items-center gap-2.5 mb-3">
                        <span className="w-2 h-2 rounded-full bg-brand-accent" />
                        <span className="text-label-sm tracking-[0.3em] text-on-surface-variant uppercase font-mono">PANEL DE CONTROL</span>
                    </div>
                    <h1 className="font-bebas text-4xl tracking-wider text-on-surface select-none leading-none">
                        AJUSTES
                    </h1>
                    <div className="h-[2px] w-10 bg-gradient-to-r from-brand-accent to-transparent rounded-full mt-3" />
                </div>

                {/* Nav items */}
                <div className="relative z-10 flex-1 px-3 pb-4 space-y-0.5">
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-white/[0.06]"
                                        : "hover:bg-surface-container-high"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute inset-0 rounded-xl bg-white/[0.06] border border-white/10"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <div className={cn(
                                    "relative z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0",
                                    isActive
                                        ? "bg-brand-accent/20 text-brand-accent"
                                        : "bg-surface-container text-on-surface-variant group-hover:text-on-surface group-hover:bg-surface-container-high"
                                )}>
                                    <item.icon className="w-4 h-4" />
                                </div>
                                <div className="relative z-10 flex-1 min-w-0">
                                    <span className={cn(
                                        "text-caption font-bold uppercase tracking-wider block transition-colors duration-200",
                                        isActive ? "text-on-surface" : "text-on-surface-variant group-hover:text-on-surface"
                                    )}>
                                        {item.label}
                                    </span>
                                    {item.desc && (
                                        <span className={cn(
                                            "text-label-sm block mt-0.5 font-mono truncate transition-colors duration-200",
                                            isActive ? "text-on-surface-variant" : "text-on-surface-variant/60 group-hover:text-on-surface-variant"
                                        )}>{item.desc}</span>
                                    )}
                                </div>
                                {isActive && (
                                    <div className="relative z-10 w-1.5 h-1.5 rounded-full bg-brand-accent shrink-0" />
                                )}
                            </button>
                        )
                    })}
                </div>


            </nav>

            {/* ── Main Content Area ────────────────────────────────────── */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Content header */}
                <header className="shrink-0 px-8 md:px-12 lg:px-16 pt-8 pb-6 border-b border-outline-variant">
                    <div className="flex items-center gap-2 mb-2">
                        {(() => {
                            const nav = NAV_ITEMS.find(n => n.id === activeTab)
                            if (!nav) return null
                            const Icon = nav.icon
                            return (
                                <>
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                        <Icon className="h-4 w-4 text-white/70" />
                                    </div>
                                    <span className="text-label-sm uppercase tracking-[0.35em] text-on-surface-variant font-mono">
                                        {nav.label}
                                    </span>
                                </>
                            )
                        })()}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bebas tracking-wider text-on-surface leading-none">
                        {SECTION_LABELS[activeTab] || "CONFIGURACIÓN"}
                    </h2>
                    <div className="h-[2px] w-10 bg-gradient-to-r from-brand-accent/60 to-transparent rounded-full mt-3" />
                </header>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <FormProvider {...form}>
                        <form
                            id="settings-form"
                            onSubmit={handleSubmit(onSubmit as unknown as SubmitHandler<FieldValues>, onFormError)}
                            className="px-8 md:px-12 lg:px-16 py-8 pb-32 space-y-10 min-h-full"
                        >
                            {activeTab === "general"      && <SystemTab control={control} />}
                            {activeTab === "library"      && <LibraryTab control={control} />}
                            {activeTab === "player"       && <PlayerTab control={control} />}
                            {activeTab === "scanner"      && <ScannerTab control={control} />}
                            {activeTab === "streaming"    && <StreamingTab control={control} />}
                            {activeTab === "integrations" && <IntegrationsTab control={control} />}
                            {activeTab === "appearance"   && <AppearanceTab control={control} />}
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
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-8 backdrop-blur-overlay-md border border-outline-variant rounded-container px-6 py-4 shadow-elevation-3"
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
                                className="bg-brand-accent hover:brightness-110 text-zinc-950 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 disabled:opacity-50 uppercase tracking-widest active:scale-95 shadow-[var(--shadow-brand-primary)]"
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
