import { Status } from "@/api/generated/types"
import { useGettingStarted } from "@/api/hooks/settings.hooks"
import { useGetFFmpegStatus, useInstallFFmpeg } from "@/api/hooks/mediastream.hooks"
import { LoadingOverlayWithLogo } from "@/components/shared/loading-overlay-with-logo"
import { Button } from "@/components/ui/button"
import { Card, CardProps } from "@/components/ui/card"
import { cn } from "@/components/ui/core/styling"
import { Field, Form } from "@/components/ui/form"
import { getDefaultSettings, gettingStartedSchema } from "@/lib/server/settings"
import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import type { Variants } from "framer-motion"
import { AnimatePresence, motion } from "framer-motion"
import React from "react"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"
import { useNavigate } from "@tanstack/react-router"

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.04,
            delayChildren: 0.02,
        },
    },
    exit: {
        opacity: 0,
        transition: {
            staggerChildren: 0.02,
            staggerDirection: -1,
        },
    },
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.3, type: "spring", damping: 25, stiffness: 200 },
    },
    exit: {
        opacity: 0,
        y: -8,
        scale: 0.98,
        transition: { duration: 0.15 },
    },
}

const stepVariants: Variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 30 : -30,
        opacity: 0,
        filter: "blur(3px)",
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        filter: "blur(0px)",
        transition: {
            x: { duration: 0.3, type: "spring", damping: 25, stiffness: 220 },
            opacity: { duration: 0.25 },
            filter: { duration: 0.25 },
        },
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 30 : -30,
        opacity: 0,
        filter: "blur(3px)",
        transition: {
            x: { duration: 0.2 },
            opacity: { duration: 0.15 },
            filter: { duration: 0.15 },
        },
    }),
}

const STEPS = [
    {
        id: "library",
        stepNumber: "1",
        title: "Biblioteca",
        subtitle: "Rutas de carpetas",
        icon: Icons.status.folder,
    },
    {
        id: "engine",
        stepNumber: "2",
        title: "Motor de Video",
        subtitle: "FFmpeg & FFprobe",
        icon: Icons.status.zap,
    },
    {
        id: "playback",
        stepNumber: "3",
        title: "Reproducción",
        subtitle: "Auto-skip y maratón",
        icon: Icons.media.play,
    },
    {
        id: "language",
        stepNumber: "4",
        title: "Idioma",
        subtitle: "Metadatos y títulos",
        icon: Icons.ui.settings,
    },
]

function StepIndicator({ currentStep, onStepClick }: { currentStep: number; onStepClick: (step: number) => void }) {
    return (
        <div className="w-full mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl mx-auto">
                {STEPS.map((step, i) => {
                    const isActive = i === currentStep
                    const isCompleted = i < currentStep
                    return (
                        <motion.button
                            type="button"
                            key={step.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onStepClick(i)}
                            className={cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-200 text-left relative overflow-hidden cursor-pointer",
                                isActive
                                    ? "bg-brand-accent/15 border-brand-accent/50 text-white shadow-lg shadow-brand-accent/15"
                                    : isCompleted
                                        ? "bg-zinc-900/70 border-white/10 text-zinc-300 hover:border-white/20"
                                        : "bg-zinc-900/40 border-white/5 text-zinc-500 hover:border-white/10"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="step-active-indicator"
                                    className="absolute inset-0 bg-brand-accent/10 pointer-events-none rounded-xl"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                />
                            )}
                            <div
                                className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-all duration-200",
                                    isActive
                                        ? "bg-brand-accent text-white shadow-md shadow-brand-accent/30"
                                        : isCompleted
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            : "bg-zinc-800 text-zinc-400"
                                )}
                            >
                                {isCompleted ? <Icons.ui.check className="w-3.5 h-3.5" /> : step.stepNumber}
                            </div>
                            <div className="min-w-0">
                                <p className={cn("text-xs font-bold tracking-tight truncate", isActive ? "text-white" : "text-zinc-400")}>
                                    {step.title}
                                </p>
                                <p className="text-[10px] text-zinc-500 truncate">
                                    {step.subtitle}
                                </p>
                            </div>
                        </motion.button>
                    )
                })}
            </div>
        </div>
    )
}

function StepCard({ children, className }: CardProps) {
    return (
        <motion.div
            variants={itemVariants}
            className={cn(
                "relative rounded-2xl bg-zinc-900/70 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden",
                className,
            )}
        >
            <Card className="bg-transparent border-none shadow-none p-4 sm:p-5">
                {children}
            </Card>
        </motion.div>
    )
}

/* ---------------- STEP 1: BIBLIOTECA ---------------- */
function LibraryStep() {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4 max-w-2xl mx-auto"
        >
            <motion.div variants={itemVariants} className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-display tracking-wide text-white uppercase">
                    1. Biblioteca y Rutas de Archivos
                </h2>
                <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                    Indica las carpetas de tu equipo donde guardas tus animes. KameHouse escaneará y organizará automáticamente los episodios y sagas.
                </p>
            </motion.div>

            <StepCard>
                <motion.div variants={itemVariants} className="space-y-4">
                    <Field.MultiDirectorySelector
                        name="library.seriesPaths"
                        label="Carpetas de Series de Anime"
                        help="Ubicaciones con episodios organizados por series, sagas o temporadas."
                        shouldExist
                    />

                    <div className="h-[1px] bg-white/5" />

                    <Field.MultiDirectorySelector
                        name="library.moviePaths"
                        label="Carpetas de Películas y OVAs"
                        help="Ubicaciones que contienen películas individuales, especiales o películas animadas."
                        shouldExist
                    />
                </motion.div>
            </StepCard>
        </motion.div>
    )
}

/* ---------------- STEP 2: MOTOR MULTIMEDIA (FFMPEG / FFPROBE) ---------------- */
function MediaEngineStep() {
    const { data: status, isLoading } = useGetFFmpegStatus()
    const { mutate: installFFmpeg, isPending: isInstalling } = useInstallFFmpeg()

    const isDownloading = status?.isDownloading || isInstalling
    const isBothAvailable = !!status?.ffmpegAvailable && !!status?.ffprobeAvailable

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4 max-w-2xl mx-auto"
        >
            <motion.div variants={itemVariants} className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-display tracking-wide text-white uppercase">
                    2. Motor de Video (FFmpeg)
                </h2>
                <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                    KameHouse utiliza FFmpeg y FFprobe para leer códecs, pistas de audio, subtítulos integrados y generar miniaturas.
                </p>
            </motion.div>

            <StepCard>
                <motion.div variants={itemVariants} className="space-y-4">
                    {/* Status Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950/60 border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                                isBothAvailable
                                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                    : isDownloading
                                        ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                        : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                            )}>
                                {isDownloading ? (
                                    <Icons.ui.spinner className="w-5 h-5 animate-spin" />
                                ) : isBothAvailable ? (
                                    <Icons.ui.checkCircle className="w-5 h-5" />
                                ) : (
                                    <Icons.ui.alert className="w-5 h-5" />
                                )}
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-xs sm:text-sm text-white">
                                        Estado de FFmpeg / FFprobe
                                    </h4>
                                    {isLoading ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">Verificando...</span>
                                    ) : isBothAvailable ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                            Listo
                                        </span>
                                    ) : isDownloading ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                            Instalando ({status?.downloadProgress ?? 0}%)
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                            No instalado
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-zinc-400 truncate">
                                    {isBothAvailable
                                        ? "Los binarios necesarios están correctamente instalados y listos."
                                        : isDownloading
                                            ? (status?.downloadStatus || "Descargando binarios portables...")
                                            : "Puedes instalarlos automáticamente con 1 clic sin salir del asistente."}
                                </p>
                            </div>
                        </div>

                        {!isBothAvailable && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={() => installFFmpeg()}
                                disabled={isDownloading}
                                className={cn(
                                    "px-4 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shrink-0",
                                    "bg-brand-accent text-white hover:bg-brand-accent/90 shadow-md shadow-brand-accent/20",
                                    isDownloading && "opacity-60 cursor-not-allowed"
                                )}
                            >
                                {isDownloading ? (
                                    <>
                                        <Icons.ui.spinner className="w-3.5 h-3.5 animate-spin" />
                                        <span>Descargando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icons.ui.download className="w-3.5 h-3.5" />
                                        <span>Instalar Automáticamente</span>
                                    </>
                                )}
                            </motion.button>
                        )}
                    </div>

                    {/* Progress bar if downloading */}
                    {isDownloading && (
                        <div className="space-y-1.5 p-3 rounded-xl bg-zinc-950/40 border border-white/5">
                            <div className="flex justify-between text-xs text-zinc-400 font-medium">
                                <span>{status?.downloadStatus || "Descargando paquetes..."}</span>
                                <span>{status?.downloadProgress ?? 0}%</span>
                            </div>
                            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-accent transition-all duration-300 rounded-full"
                                    style={{ width: `${Math.max(5, status?.downloadProgress ?? 0)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Binaries grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-zinc-950/40 border border-white/5 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-white">ffprobe</span>
                                <span className={status?.ffprobeAvailable ? "text-emerald-400 font-medium text-[11px]" : "text-rose-400 text-[11px]"}>
                                    {status?.ffprobeAvailable ? "Detectado" : "Faltante"}
                                </span>
                            </div>
                            <span className="font-mono text-[10px] text-zinc-400 truncate" title={status?.ffprobePath}>
                                {status?.ffprobePath || "No configurado"}
                            </span>
                            {status?.ffprobeVersion && (
                                <span className="text-[10px] text-zinc-500 truncate" title={status?.ffprobeVersion}>
                                    {status?.ffprobeVersion}
                                </span>
                            )}
                        </div>

                        <div className="p-3 rounded-xl bg-zinc-950/40 border border-white/5 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-white">ffmpeg</span>
                                <span className={status?.ffmpegAvailable ? "text-emerald-400 font-medium text-[11px]" : "text-rose-400 text-[11px]"}>
                                    {status?.ffmpegAvailable ? "Detectado" : "Faltante"}
                                </span>
                            </div>
                            <span className="font-mono text-[10px] text-zinc-400 truncate" title={status?.ffmpegPath}>
                                {status?.ffmpegPath || "No configurado"}
                            </span>
                            {status?.ffmpegVersion && (
                                <span className="text-[10px] text-zinc-500 truncate" title={status?.ffmpegVersion}>
                                    {status?.ffmpegVersion}
                                </span>
                            )}
                        </div>
                    </div>
                </motion.div>
            </StepCard>
        </motion.div>
    )
}

/* ---------------- STEP 3: REPRODUCCIÓN ---------------- */
function PlaybackStep({
    features,
    setFeatures,
}: {
    features: {
        autoDetectSkipTimes: boolean
        autoPlayNextEpisode: boolean
        enableWatchContinuity: boolean
        autoScan: boolean
    }
    setFeatures: React.Dispatch<React.SetStateAction<{
        autoDetectSkipTimes: boolean
        autoPlayNextEpisode: boolean
        enableWatchContinuity: boolean
        autoScan: boolean
    }>>
}) {
    const list = [
        {
            key: "autoDetectSkipTimes" as const,
            title: "Salto Automático de Openings/Endings",
            description: "Detección inteligente de intros, rellenos y endings para saltearlos con un clic o automáticamente.",
            icon: Icons.media.skipNext,
            color: "from-amber-500 to-orange-500",
        },
        {
            key: "autoPlayNextEpisode" as const,
            title: "Reproducción Continua (Maratón)",
            description: "Inicia el siguiente capítulo al terminar el actual sin tener que volver al menú.",
            icon: Icons.media.play,
            color: "from-purple-500 to-pink-500",
        },
        {
            key: "enableWatchContinuity" as const,
            title: "Continuidad de Reproducción",
            description: "Recuerda el segundo exacto donde dejaste cada episodio para reanudar al instante.",
            icon: Icons.time.clock,
            color: "from-blue-500 to-cyan-500",
        },
        {
            key: "autoScan" as const,
            title: "Auto-Escaneo en Segundo Plano",
            description: "Detecta automáticamente nuevos capítulos añadidos a tus carpetas sin escanear a mano.",
            icon: Icons.navigation.library,
            color: "from-emerald-500 to-teal-500",
        },
    ]

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4 max-w-2xl mx-auto"
        >
            <motion.div variants={itemVariants} className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-display tracking-wide text-white uppercase">
                    3. Automatizaciones de Reproducción
                </h2>
                <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                    Activa las funciones inteligentes para maratonear y disfrutar sin interrupciones ni adelantos manuales.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {list.map(item => {
                    const isEnabled = features[item.key]
                    return (
                        <motion.div
                            key={item.key}
                            whileHover={{ scale: 1.015, y: -2 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => setFeatures(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                            className={cn(
                                "cursor-pointer p-4 rounded-xl border transition-all duration-200 text-left flex items-start space-x-3 select-none",
                                isEnabled
                                    ? "bg-zinc-900/90 border-brand-accent/50 shadow-md shadow-brand-accent/10"
                                    : "bg-zinc-900/40 border-white/5 hover:border-white/15 opacity-70 hover:opacity-100"
                            )}
                        >
                            <div className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br transition-all duration-200 shadow-md",
                                item.color,
                                isEnabled ? "opacity-100 scale-100" : "opacity-40 scale-95"
                            )}>
                                <item.icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="font-semibold text-xs sm:text-sm text-white truncate">
                                        {item.title}
                                    </h4>
                                    <div
                                        className={cn(
                                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[10px] transition-colors duration-200",
                                            isEnabled ? "bg-brand-accent border-brand-accent text-white" : "border-white/20"
                                        )}
                                    >
                                        {isEnabled && "✓"}
                                    </div>
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                                    {item.description}
                                </p>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </motion.div>
    )
}

/* ---------------- STEP 3: IDIOMA Y METADATOS ---------------- */
function LanguageStep({
    selectedLanguage,
    setSelectedLanguage,
    flexibleMatching,
    setFlexibleMatching,
}: {
    selectedLanguage: string
    setSelectedLanguage: (lang: string) => void
    flexibleMatching: boolean
    setFlexibleMatching: React.Dispatch<React.SetStateAction<boolean>>
}) {
    const languages = [
        {
            code: "es-MX",
            label: "Español Latino",
            region: "Latinoamérica (Recomendado)",
            flag: "🇲🇽",
        },
        {
            code: "es-ES",
            label: "Español Castellano",
            region: "España",
            flag: "🇪🇸",
        },
        {
            code: "ja-JP",
            label: "Japonés Original",
            region: "Nombres y títulos oficiales en Japonés",
            flag: "🇯🇵",
        },
        {
            code: "en-US",
            label: "Inglés",
            region: "English Titles & Overviews",
            flag: "🇺🇸",
        },
    ]

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4 max-w-2xl mx-auto"
        >
            <motion.div variants={itemVariants} className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-display tracking-wide text-white uppercase">
                    4. Idioma y Metadatos
                </h2>
                <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                    Configura el idioma preferido para los títulos de episodios, carteleras, sinopsis y reconocimiento de archivos.
                </p>
            </motion.div>

            <StepCard>
                <div className="space-y-3">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                        Idioma de Sinopsis y Títulos de Capítulos
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {languages.map(lang => {
                            const isSelected = selectedLanguage === lang.code
                            return (
                                <motion.div
                                    key={lang.code}
                                    whileHover={{ scale: 1.015 }}
                                    whileTap={{ scale: 0.985 }}
                                    onClick={() => setSelectedLanguage(lang.code)}
                                    className={cn(
                                        "cursor-pointer p-3 rounded-xl border transition-all duration-200 flex items-center justify-between select-none",
                                        isSelected
                                            ? "bg-brand-accent/20 border-brand-accent text-white shadow-md shadow-brand-accent/15"
                                            : "bg-zinc-900/50 border-white/5 hover:border-white/15 text-zinc-300"
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-xl shrink-0">{lang.flag}</span>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-xs sm:text-sm truncate">{lang.label}</p>
                                            <p className="text-[10px] text-zinc-500 truncate">{lang.region}</p>
                                        </div>
                                    </div>
                                    <div
                                        className={cn(
                                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[10px] ml-2",
                                            isSelected ? "bg-brand-accent border-brand-accent text-white" : "border-white/20"
                                        )}
                                    >
                                        {isSelected && "✓"}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>

                <div className="h-[1px] bg-white/5 my-4" />

                {/* Reconocimiento flexible de archivos de fansub */}
                <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setFlexibleMatching(prev => !prev)}
                    className={cn(
                        "cursor-pointer p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between select-none",
                        flexibleMatching
                            ? "bg-zinc-900/90 border-brand-accent/40"
                            : "bg-zinc-900/40 border-white/5 opacity-75"
                    )}
                >
                    <div className="space-y-0.5 pr-2">
                        <p className="text-xs font-semibold text-white">
                            Detección Flexible de Fansubs
                        </p>
                        <p className="text-[11px] text-zinc-400">
                            Reconoce nombres complejos como <span className="text-zinc-300 font-mono text-[10px]">[Fansub] DBZ - 001 [1080p].mkv</span> sin obligarte a renombrar archivos.
                        </p>
                    </div>
                    <div
                        className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[10px]",
                            flexibleMatching ? "bg-brand-accent border-brand-accent text-white" : "border-white/20"
                        )}
                    >
                        {flexibleMatching && "✓"}
                    </div>
                </motion.div>
            </StepCard>
        </motion.div>
    )
}

/* ---------------- MAIN COMPONENT: GETTING STARTED ---------------- */
export function GettingStarted({
    status,
    onClose,
    isModal = false,
    embedded = false,
}: {
    status: Status
    onClose?: () => void
    isModal?: boolean
    embedded?: boolean
}) {
    const { mutate: mutateStart, isPending: isPendingStart } = useGettingStarted()
    const navigate = useNavigate()

    const [currentStep, setCurrentStep] = React.useState(0)
    const [direction, setDirection] = React.useState(0)

    const formRef = React.useRef<UseFormReturn<z.infer<typeof gettingStartedSchema>> | null>(null)
    const currentSettings = status?.settings

    // States for the 3 Essential Steps pre-filled from existing server settings
    const [playbackFeatures, setPlaybackFeatures] = React.useState({
        autoDetectSkipTimes: currentSettings?.library?.autoDetectSkipTimes ?? true,
        autoPlayNextEpisode: currentSettings?.library?.autoPlayNextEpisode ?? true,
        enableWatchContinuity: currentSettings?.library?.enableWatchContinuity ?? true,
        autoScan: currentSettings?.library?.autoScan ?? false,
    })

    const [selectedLanguage, setSelectedLanguage] = React.useState(
        currentSettings?.library?.tmdbLanguage || "es-MX"
    )
    const [flexibleMatching, setFlexibleMatching] = React.useState(
        !currentSettings?.library?.scannerStrictStructure
    )

    const handleGoToHome = () => {
        if (onClose) {
            onClose()
        }
        navigate({ to: "/home" })
        if (window.location.pathname !== "/home") {
            window.location.href = "/home"
        }
    }

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setDirection(1)
            setCurrentStep(currentStep + 1)
        }
    }

    const prevStep = () => {
        if (currentStep > 0) {
            setDirection(-1)
            setCurrentStep(currentStep - 1)
        }
    }

    const goToStep = (step: number) => {
        if (step >= 0 && step < STEPS.length) {
            setDirection(step > currentStep ? 1 : -1)
            setCurrentStep(step)
        }
    }

    const isPending = isPendingStart
    if (isPending) return <LoadingOverlayWithLogo />

    const initialSeriesPaths = currentSettings?.library?.seriesPaths && currentSettings.library.seriesPaths.length > 0
        ? currentSettings.library.seriesPaths
        : []

    const initialMoviePaths = currentSettings?.library?.moviePaths && currentSettings.library.moviePaths.length > 0
        ? currentSettings.library.moviePaths
        : []

    return (
        <div className={cn(
            "w-full bg-zinc-950 relative flex flex-col justify-between select-none overflow-hidden",
            embedded ? "rounded-2xl border border-white/5 p-4 sm:p-6" : isModal ? "p-4 sm:p-6" : "min-h-[100dvh] h-[100dvh]"
        )}>
            {/* Cinematic animated background gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-zinc-950/70 z-[1]" />
                <div className="absolute inset-0 opacity-[0.22] blur-[140px] mix-blend-screen">
                    <div 
                        className="absolute top-[10%] left-[10%] w-[40vw] h-[40vw] rounded-full animate-float-blur"
                        style={{ background: "radial-gradient(circle, var(--era-db-hex, #1e40af) 0%, transparent 70%)" }}
                    />
                    <div 
                        className="absolute top-[5%] right-[10%] w-[35vw] h-[35vw] rounded-full animate-float-blur-reverse"
                        style={{ background: "radial-gradient(circle, var(--era-dbz-hex, #ea580c) 0%, transparent 70%)", animationDelay: "-4s" }}
                    />
                    <div 
                        className="absolute bottom-[10%] right-[15%] w-[40vw] h-[40vw] rounded-full animate-float-blur"
                        style={{ background: "radial-gradient(circle, var(--era-dbgt-hex, #dc2626) 0%, transparent 70%)", animationDelay: "-8s" }}
                    />
                </div>
            </div>

            {/* Top header bar */}
            {!isModal && !embedded && (
                <div className="w-full relative z-10 px-4 sm:px-8 pt-4 sm:pt-6 flex justify-between items-center border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="font-display tracking-widest text-lg sm:text-xl font-bold text-white uppercase">
                            KAMEHOUSE
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent border border-brand-accent/30">
                            Configuración
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            intent="gray-outline"
                            onClick={handleGoToHome}
                            leftIcon={<Icons.navigation.home className="w-3.5 h-3.5" />}
                            className="rounded-xl text-xs text-zinc-300 hover:text-white"
                        >
                            Ir al Inicio
                        </Button>
                    </div>
                </div>
            )}

            {/* Middle scrollable content */}
            <div className="w-full flex-1 overflow-y-auto relative z-10 px-4 sm:px-8 py-3 sm:py-5 flex flex-col justify-center items-center">
                <div className="w-full max-w-2xl">
                    <Form
                        schema={gettingStartedSchema}
                        onSubmit={data => {
                            if (currentStep === STEPS.length - 1) {
                                const payload = getDefaultSettings(data, currentSettings)
                                if (payload.library) {
                                    payload.library.autoDetectSkipTimes = playbackFeatures.autoDetectSkipTimes
                                    payload.library.autoPlayNextEpisode = playbackFeatures.autoPlayNextEpisode
                                    payload.library.enableWatchContinuity = playbackFeatures.enableWatchContinuity
                                    payload.library.autoScan = playbackFeatures.autoScan
                                    payload.library.tmdbLanguage = selectedLanguage
                                    payload.library.scannerStrictStructure = !flexibleMatching
                                }

                                mutateStart(payload, {
                                    onSuccess: () => {
                                        toast.success("Configuración de KameHouse guardada con éxito")
                                        handleGoToHome()
                                    },
                                    onError: () => {
                                        toast.error("Error al guardar la configuración")
                                    }
                                })
                            } else {
                                nextStep()
                            }
                        }}
                        defaultValues={{
                            mediaPlayer: currentSettings?.mediaPlayer || {},
                            library: {
                                enableRichPresence: false,
                                enableWatchContinuity: playbackFeatures.enableWatchContinuity,
                                seriesPaths: initialSeriesPaths,
                                moviePaths: initialMoviePaths,
                                disableLocalScanning: currentSettings?.library?.disableLocalScanning ?? false,
                                tmdbApiKey: currentSettings?.library?.tmdbApiKey || "",
                                scannerProvider: currentSettings?.library?.scannerProvider || "tmdb",
                                primaryMetadataProvider: currentSettings?.library?.primaryMetadataProvider || "tmdb",
                                tmdbLanguage: selectedLanguage,
                            },
                            enableTranscode: currentSettings?.mediastream?.transcodeEnabled ?? false,
                            debridProvider: "none",
                            debridApiKey: "",
                            notifications: {
                                disableNotifications: currentSettings?.notifications?.disableNotifications ?? false,
                                disableAutoScannerNotifications: currentSettings?.notifications?.disableAutoScannerNotifications ?? false,
                            }
                        }}
                    >
                        {(formMethods) => {
                            formRef.current = formMethods
                            return (
                                <div className="space-y-4">
                                    <StepIndicator currentStep={currentStep} onStepClick={goToStep} />

                                    <AnimatePresence mode="wait" custom={direction}>
                                        <motion.div
                                            key={currentStep}
                                            custom={direction}
                                            variants={stepVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            className="min-h-[300px]"
                                        >
                                            {currentStep === 0 && (
                                                <LibraryStep />
                                            )}
                                            {currentStep === 1 && (
                                                <MediaEngineStep />
                                            )}
                                            {currentStep === 2 && (
                                                <PlaybackStep
                                                    features={playbackFeatures}
                                                    setFeatures={setPlaybackFeatures}
                                                />
                                            )}
                                            {currentStep === 3 && (
                                                <LanguageStep
                                                    selectedLanguage={selectedLanguage}
                                                    setSelectedLanguage={setSelectedLanguage}
                                                    flexibleMatching={flexibleMatching}
                                                    setFlexibleMatching={setFlexibleMatching}
                                                />
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            )
                        }}
                    </Form>
                </div>
            </div>

            {/* Bottom sticky action bar */}
            <div className="w-full relative z-20 bg-zinc-950/90 backdrop-blur-xl border-t border-white/10 px-4 sm:px-8 py-3.5 flex justify-between items-center max-w-3xl mx-auto rounded-t-2xl shadow-xl mt-2">
                <div className="flex items-center gap-2">
                    {currentStep > 0 && (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                                type="button"
                                intent="gray-outline"
                                size="sm"
                                onClick={e => {
                                    e.preventDefault()
                                    prevStep()
                                }}
                                className="rounded-xl text-xs sm:text-sm px-4 h-10 border-white/10 hover:border-white/25 hover:bg-white/5 text-zinc-300 hover:text-white transition-all cursor-pointer"
                                leftIcon={<Icons.navigation.chevronLeft className="w-4 h-4" />}
                            >
                                Anterior
                            </Button>
                        </motion.div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {currentStep === STEPS.length - 1 ? (
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Button
                                type="button"
                                intent="primary"
                                size="sm"
                                onClick={() => {
                                    if (formRef.current) {
                                        formRef.current.handleSubmit((data) => {
                                            const payload = getDefaultSettings(data, currentSettings)
                                            if (payload.library) {
                                                payload.library.autoDetectSkipTimes = playbackFeatures.autoDetectSkipTimes
                                                payload.library.autoPlayNextEpisode = playbackFeatures.autoPlayNextEpisode
                                                payload.library.enableWatchContinuity = playbackFeatures.enableWatchContinuity
                                                payload.library.autoScan = playbackFeatures.autoScan
                                                payload.library.tmdbLanguage = selectedLanguage
                                                payload.library.scannerStrictStructure = !flexibleMatching
                                            }
                                            mutateStart(payload, {
                                                onSuccess: () => {
                                                    toast.success("Configuración actualizada con éxito")
                                                    handleGoToHome()
                                                },
                                                onError: () => {
                                                    toast.error("Error al guardar la configuración")
                                                }
                                            })
                                        })()
                                    }
                                }}
                                className="rounded-xl font-bold uppercase tracking-wider px-6 h-10 text-xs sm:text-sm shadow-lg shadow-brand-accent/30 bg-gradient-to-r from-brand-accent to-red-600 hover:brightness-110 text-white cursor-pointer border-none"
                                loading={isPending}
                                rightIcon={<Icons.navigation.rocket className="w-4 h-4" />}
                            >
                                Guardar y Comenzar
                            </Button>
                        </motion.div>
                    ) : (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                                type="button"
                                intent="primary"
                                size="sm"
                                onClick={e => {
                                    e.preventDefault()
                                    nextStep()
                                }}
                                className="rounded-xl font-bold uppercase tracking-wider px-5 h-10 text-xs sm:text-sm bg-brand-accent text-white hover:bg-brand-accent/90 shadow-md shadow-brand-accent/25 cursor-pointer"
                                rightIcon={<Icons.navigation.chevronRight className="w-4 h-4" />}
                            >
                                Siguiente
                            </Button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}
