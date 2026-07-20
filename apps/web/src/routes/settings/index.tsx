import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useForm, type SubmitHandler, type FieldValues, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { LoadingOverlayWithLogo } from "@/components/shared/loading-overlay-with-logo"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs/tabs"

import { useGetSettings, useSaveSettings } from "@/api/hooks/settings.hooks"
import {
    LucideHardDrive, LucideSettings, LucideRadar, LucideCloud, LucidePlay
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

// ─── Schema ───────────────────────────────────────────────────────────────────

const settingsSchema = z.object({
    library: z.object({
        seriesPaths: z.array(z.string()).nullish().transform(v => v ?? []),
        moviePaths: z.array(z.string()).nullish().transform(v => v ?? []),
        autoUpdateProgress: z.boolean().default(false),
        autoScan: z.boolean().default(false),
        enableOnlinestream: z.boolean().default(false),
        includeOnlineStreamingInLibrary: z.boolean().default(false),
        disableAnimeCardTrailers: z.boolean().default(false),
        dohProvider: z.string().default(""),
        openWebURLOnStart: z.boolean().default(false),
        refreshLibraryOnStart: z.boolean().default(false),
        autoPlayNextEpisode: z.boolean().default(true),
        enableWatchContinuity: z.boolean().default(false),
        autoSyncOfflineLocalData: z.boolean().default(false),
        scannerMatchingThreshold: z.number().default(0),
        scannerMatchingAlgorithm: z.string().default(""),
        autoSyncToLocalAccount: z.boolean().default(false),
        autoSaveCurrentMediaOffline: z.boolean().default(false),
        useFallbackMetadataProvider: z.boolean().default(false),
        tmdbApiKey: z.string().default(""),
        tmdbLanguage: z.string().default("es-MX"),
        scannerUseLegacyMatching: z.boolean().default(false),
        scannerConfig: z.string().default(""),
        scannerStrictStructure: z.boolean().default(false),
        scannerProvider: z.string().default(""),
        disableLocalScanning: z.boolean().default(false),
        disableDebridService: z.boolean().default(false),
        primaryMetadataProvider: z.string().default("tmdb"),
        fanartApiKey: z.string().default(""),
        omdbApiKey: z.string().default(""),
        openSubsApiKey: z.string().default(""),
    }).default({}),
    mediaPlayer: z.object({
        defaultPlayer: z.string().default(""),
        host: z.string().default(""),
        vlcUsername: z.string().default(""),
        vlcPassword: z.string().default(""),
        vlcPort: z.number().default(0),
        vlcPath: z.string().default(""),
        mpcPort: z.number().default(0),
        mpcPath: z.string().default(""),
        mpvSocket: z.string().default(""),
        mpvPath: z.string().default(""),
        mpvArgs: z.string().default(""),
        iinaSocket: z.string().default(""),
        iinaPath: z.string().default(""),
        iinaArgs: z.string().default(""),
        vcTranslate: z.boolean().default(false),
        vcTranslateTargetLanguage: z.string().default(""),
        vcTranslateProvider: z.string().default(""),
        vcTranslateApiKey: z.string().default(""),
    }).default({}),
    mediastream: z.object({
        transcodeEnabled: z.boolean().default(false),
        transcodeHwAccel: z.string().default(""),
        transcodeThreads: z.number().default(0),
        transcodePreset: z.string().default(""),
        disableAutoSwitchToDirectPlay: z.boolean().default(false),
        directPlayOnly: z.boolean().default(false),
        preTranscodeEnabled: z.boolean().default(false),
        ffmpegPath: z.string().default(""),
        ffprobePath: z.string().default(""),
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

const NAV_ITEMS = [
    { id: "system",       label: "Configuración",  icon: LucideSettings },
    { id: "library",      label: "Archivos",      icon: LucideHardDrive },
    { id: "player",       label: "Reproductor", icon: LucidePlay },
    { id: "scanner",      label: "Escáner",   icon: LucideRadar },
    { id: "integrations", label: "Integraciones",  icon: LucideCloud },
]

function SettingsPage() {
    const { data: serverSettings, isLoading } = useGetSettings()
    const { mutateAsync: saveSettings, isPending: isSaving } = useSaveSettings()
    const [activeTab, setActiveTab] = useState<string>("system")
    const [sidebarSpotlight, setSidebarSpotlight] = useState<React.CSSProperties>({
        opacity: 0,
    })

    const handleSidebarMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setSidebarSpotlight({
            opacity: 1,
            background: `radial-gradient(180px circle at ${x}px ${y}px, rgba(255, 110, 58, 0.08), transparent 80%)`,
        })
    }

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

    if (isLoading && !serverSettings) return <LoadingOverlayWithLogo />

    return (
        <div className="flex flex-col h-full w-full pt-12 md:pt-20 px-6 md:pl-[120px] md:pr-12 lg:pl-[120px] lg:pr-16 bg-transparent text-zinc-300 selection:bg-[#ff6e3a]/30 overflow-y-auto relative no-scrollbar">
            {/* Ambient Background Light Orbs */}
            <div className="absolute top-0 left-1/3 w-[800px] h-[800px] bg-[#ff6e3a]/5 rounded-full blur-[240px] -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-red-500/[0.02] rounded-full blur-[200px] pointer-events-none" />

            <div className="w-full flex flex-col min-h-full relative z-10 max-w-[1500px] mx-auto">
                <header className="mb-12 flex flex-col gap-3 relative z-10">
                    <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-[#ff6e3a] shadow-[0_0_8px_#ff6e3a] animate-pulse" />
                        <span className="text-[10px] font-black tracking-[0.3em] text-zinc-500 uppercase font-mono">PANEL DE CONTROL</span>
                    </div>
                    <h1 className="font-display text-5xl md:text-7xl tracking-wider text-white select-none">
                        CONFIGURACIÓN <span className="text-zinc-650">GENERAL</span>
                    </h1>
                    <div className="h-[2px] w-16 bg-gradient-to-r from-[#ff6e3a] to-transparent rounded-full shadow-[0_0_8px_rgba(255,110,58,0.5)]" />
                </header>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col md:flex-row gap-8 lg:gap-12 pb-32">
                    {/* ── Immersive Sidebar Nav ─────────────────────────────── */}
                    <aside 
                        onMouseMove={handleSidebarMouseMove}
                        onMouseLeave={() => setSidebarSpotlight({ opacity: 0 })}
                        className="w-full md:w-64 shrink-0 bg-zinc-950/45 border border-white/5 rounded-[28px] p-5 h-fit relative overflow-hidden backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] group/sidebar"
                    >
                        {/* Cursor spotlight overlay */}
                        <div 
                            className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300"
                            style={sidebarSpotlight}
                        />

                        <TabsList className="bg-transparent border-0 flex flex-col items-stretch h-auto p-0 gap-2 relative z-10">
                            {NAV_ITEMS.map((item) => {
                                const isActive = activeTab === item.id
                                return (
                                    <TabsTrigger
                                        key={item.id}
                                        value={item.id}
                                        className={cn(
                                            "w-full flex items-center justify-start gap-4 px-4.5 py-3.5 rounded-xl text-left font-black text-[10px] uppercase tracking-widest transition-all duration-300 relative group outline-none border border-transparent settings-nav-btn select-none active:scale-[0.98]",
                                            isActive 
                                                ? "active bg-gradient-to-r from-[#ff6e3a]/15 to-[#ff6e3a]/2 border-[#ff6e3a]/30 border-l-[3px] border-l-[#ff6e3a] text-white shadow-[0_8px_25px_rgba(255,110,58,0.12)] data-[state=active]:border-y-[#ff6e3a]/15 data-[state=active]:border-r-[#ff6e3a]/15 data-[state=active]:border-l-[#ff6e3a] data-[state=active]:text-white" 
                                                : "text-zinc-500 hover:text-zinc-350 hover:bg-white/[0.02] hover:translate-x-1"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "w-4 h-4 relative z-10 transition-all duration-300", 
                                            isActive ? "text-[#ff6e3a] scale-110 drop-shadow-[0_0_8px_rgba(255,110,58,0.5)]" : "text-zinc-500 group-hover:text-zinc-350"
                                        )} />
                                        <div className="flex flex-col text-left">
                                            <span className="relative z-10 leading-none">{item.label}</span>
                                        </div>
                                    </TabsTrigger>
                                )
                            })}
                        </TabsList>
                    </aside>

                    {/* ── Main content ─────────────────────────────────────────── */}
                    <div className="flex-1 min-w-0 md:pl-2">
                        <form
                            id="settings-form"
                            onSubmit={handleSubmit(onSubmit as unknown as SubmitHandler<FieldValues>)}
                            className="w-full relative z-10"
                        >
                            {activeTab === "library"      && <LibraryTab control={control} />}
                            {activeTab === "scanner"      && <ScannerTab control={control} />}
                            {activeTab === "integrations" && <IntegrationsTab control={control} />}
                            {activeTab === "system"       && <SystemTab control={control} />}
                            {activeTab === "player"       && <PlayerTab control={control} />}
                        </form>
                    </div>

                    {/* ── Floating Save Bar ────────────────────────────────────── */}
                    <AnimatePresence>
                        {isDirty && (
                            <motion.div
                                initial={{ opacity: 0, y: 50, x: "-50%" }}
                                animate={{ opacity: 1, y: 0, x: "-50%" }}
                                exit={{ opacity: 0, y: 50, x: "-50%" }}
                                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                                className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-10 bg-zinc-950/80 border border-white/10 backdrop-blur-2xl rounded-2xl px-8 py-5 shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
                            >
                                <div className="flex items-center gap-3.5 pl-1.5">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6e3a] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff6e3a] shadow-[0_0_8px_#ff6e3a]"></span>
                                    </span>
                                    <span className="text-[10px] font-black font-mono text-zinc-400 uppercase tracking-widest">Cambios sin guardar detectados</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => reset()}
                                        className="text-xs font-bold text-zinc-400 hover:text-white transition-all mr-2 px-3 py-1.5 hover:bg-white/5 rounded-lg active:scale-95"
                                    >
                                        Descartar
                                    </button>
                                    <button
                                        type="submit"
                                        form="settings-form"
                                        disabled={isSaving}
                                        className="bg-[#ff6e3a] hover:bg-[#ff7d4b] text-zinc-950 px-6 py-3.5 rounded-xl text-xs font-black transition-all duration-300 disabled:opacity-50 uppercase tracking-widest active:scale-95 shadow-xl shadow-orange-500/20"
                                    >
                                        {isSaving ? "Guardando..." : "Guardar Cambios"}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Tabs>
            </div>
        </div>
    )
}
