import { Status } from "@/api/generated/types"
import { useGettingStarted } from "@/api/hooks/settings.hooks"
import { GlowingEffect } from "@/components/shared/glowing-effect"
import { LoadingOverlayWithLogo } from "@/components/shared/loading-overlay-with-logo"
import { Button } from "@/components/ui/button"
import { Card, CardProps } from "@/components/ui/card"
import { cn } from "@/components/ui/core/styling"
import { Field, Form } from "@/components/ui/form"
import { useAppStore } from "@/lib/store"
import {
    getDefaultIinaSocket,
    getDefaultMpvSocket,
    getDefaultSettings,
    gettingStartedSchema,
} from "@/lib/server/settings"
import { AnimatePresence, motion } from "framer-motion"
import React from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { ChevronLeft, ChevronRight, Folder, Rocket, Sparkles } from "lucide-react"

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
    exit: {
        opacity: 0,
        transition: {
            staggerChildren: 0.03,
            staggerDirection: -1,
        },
    },
}

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
}

const stepVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 40 : -40,
        opacity: 0,
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 40 : -40,
        opacity: 0,
    }),
}

const STEPS = [
    {
        id: "library",
        title: "Local Anime Library",
        description: "Choose your anime library folders",
        icon: Folder,
        gradient: "from-blue-500 to-cyan-500",
    },
    {
        id: "features",
        title: "KameHouse Features",
        description: "Configure visual settings",
        icon: Sparkles,
        gradient: "from-teal-500 to-blue-500",
    },
]

function StepIndicator({ currentStep, totalSteps, onStepClick }: { currentStep: number; totalSteps: number; onStepClick: (step: number) => void }) {
    return (
        <div className="mb-12">
            <div className="flex items-center justify-center mb-6">
                <div className="relative mx-auto w-24 h-24">
                    <motion.img
                        src="/kamehouse-logo.png"
                        alt="KameHouse Logo"
                        className="w-full h-full object-contain"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            <div className="text-center mb-8">
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-[0.25em]">
                    Estos ajustes se pueden cambiar más tarde
                </p>
            </div>

            <div className="flex items-start justify-center gap-12 max-w-4xl mx-auto px-4 rounded-xl relative">
                {STEPS.map((step, i) => (
                    <div
                        key={step.id}
                        onClick={() => onStepClick(i)}
                        className="flex flex-col items-center relative group transition-all duration-200 focus:outline-none rounded-lg p-2 w-36 cursor-pointer"
                    >
                        <motion.div
                            className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-200 border",
                                i <= currentStep
                                    ? "bg-brand-orange/20 border-brand-orange/40 text-brand-orange shadow-[0_0_15px_rgba(251,146,60,0.2)]"
                                    : "bg-zinc-900/50 border-white/5 text-zinc-500",
                            )}
                            initial={{ scale: 0.9 }}
                            animate={{ scale: i === currentStep ? 1.05 : 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            <step.icon className="w-6 h-6" />
                        </motion.div>

                        <div className="text-center">
                            <h3
                                className={cn(
                                    "text-xs font-semibold uppercase tracking-wider transition-colors duration-200",
                                    i <= currentStep ? "text-white" : "text-zinc-500",
                                    "group-hover:text-brand-orange",
                                )}
                            >
                                {step.title}
                            </h3>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function StepCard({ children, className }: CardProps) {
    return (
        <motion.div
            variants={itemVariants}
            className={cn(
                "relative rounded-2xl bg-zinc-900/40 backdrop-blur-2xl border border-white/5 shadow-2xl overflow-hidden",
                className,
            )}
        >
            <Card className="bg-transparent border-none shadow-none p-8">
                {children}
            </Card>
        </motion.div>
    )
}

function LibraryStep() {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-8"
        >
            <motion.div variants={itemVariants} className="text-center space-y-3">
                <h2 className="text-3xl font-display tracking-wide text-white uppercase">Biblioteca local de Anime</h2>
                <p className="text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
                    Configura las carpetas de Series y Películas. KameHouse escaneará estas rutas para organizar tu colección local.
                </p>
            </motion.div>

            <StepCard className="max-w-2xl mx-auto">
                <motion.div variants={itemVariants} className="space-y-6">
                    <Field.MultiDirectorySelector
                        name="library.seriesPaths"
                        label="Rutas de Series de Anime"
                        help="Carpetas que contienen tus series organizadas en temporadas o carpetas."
                        shouldExist
                    />

                    <div className="h-[1px] bg-white/5" />

                    <Field.MultiDirectorySelector
                        name="library.moviePaths"
                        label="Rutas de Películas de Anime"
                        help="Carpetas que contienen tus películas individuales o OVAs."
                        shouldExist
                    />
                </motion.div>
            </StepCard>
        </motion.div>
    )
}

function FeaturesStep({ kamehouseFeatures, setKamehouseFeatures }: { 
    kamehouseFeatures: { dynamicBackdrop: boolean },
    setKamehouseFeatures: React.Dispatch<React.SetStateAction<{ dynamicBackdrop: boolean }>>
}) {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-8"
        >
            <motion.div variants={itemVariants} className="text-center space-y-3">
                <h2 className="text-3xl font-display tracking-wide text-white uppercase">Características Visuales</h2>
                <p className="text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
                    Elige qué características visuales quieres habilitar en tu experiencia inicial de KameHouse.
                </p>
            </motion.div>

            {/* KameHouse unique features section */}
            <div className="max-w-2xl mx-auto pt-6">
                {/* Dynamic Backdrop */}
                <div 
                    onClick={() => setKamehouseFeatures(prev => ({ ...prev, dynamicBackdrop: !prev.dynamicBackdrop }))}
                    className={cn(
                        "cursor-pointer p-6 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/40 border transition-all duration-200 text-left flex items-start space-x-5",
                        kamehouseFeatures.dynamicBackdrop ? "bg-zinc-900/80 border-brand-orange/40" : "border-white/5"
                    )}
                >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-white">Fondo Dinámico Animado</h4>
                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                            Efecto ambiental inmersivo en el fondo con animación de respiración orgánica basado en la portada del anime activo.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

export function GettingStarted({ status }: { status: Status }) {
    const { mutate, isPending } = useGettingStarted()

    const [currentStep, setCurrentStep] = React.useState(0)
    const [direction, setDirection] = React.useState(0)

    // Local states for KameHouse special features (perfMonitor removed)
    const [kamehouseFeatures, setKamehouseFeatures] = React.useState({
        dynamicBackdrop: true,
    })

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

    if (isPending) return <LoadingOverlayWithLogo />

    return (
        <div className="min-h-screen bg-zinc-950 relative flex items-center justify-center py-12 px-4 select-none">
            {/* Cinematic animated background gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-brand-orange/5 blur-[120px] mix-blend-screen animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-indigo-900/10 blur-[100px] mix-blend-screen" />
            </div>

            <div className="w-full max-w-6xl relative z-10">
                <Form
                    schema={gettingStartedSchema}
                    onSubmit={data => {
                        if (currentStep === STEPS.length - 1) {
                            // Apply KameHouse features
                            localStorage.setItem("kamehouse:perf-monitor-enabled", "false")
                            localStorage.setItem("kamehouse:dynamic-backdrop-enabled", kamehouseFeatures.dynamicBackdrop ? "true" : "false")

                            // Submit to server endpoint
                            const payload = getDefaultSettings(data)
                            mutate(payload)
                        } else {
                            nextStep()
                        }
                    }}
                    defaultValues={{
                        mediaPlayer: {
                            host: "127.0.0.1",
                            vlcPort: 8080,
                            mpcPort: 13579,
                            defaultPlayer: "web",
                            vlcPath: "",
                            mpcPath: "C:/Program Files/MPC-HC/mpc-hc64.exe",
                            mpvSocket: "",
                            iinaSocket: "",
                        },
                        library: {
                            enableOnlinestream: false,
                            enableRichPresence: false,
                            enableWatchContinuity: true,
                            seriesPaths: [],
                            moviePaths: [],
                            disableLocalScanning: false,
                            tmdbApiKey: "",
                            scannerProvider: "tmdb",
                            primaryMetadataProvider: "tmdb",
                        },
                        enableTranscode: false,
                        debridProvider: "none",
                        debridApiKey: "",
                        notifications: {
                            disableNotifications: false,
                            disableAutoDownloaderNotifications: false,
                            disableAutoScannerNotifications: false,
                        }
                    }}
                >
                    {(f) => (
                        <div className="space-y-8">
                            <StepIndicator currentStep={currentStep} totalSteps={STEPS.length} onStepClick={goToStep} />

                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={currentStep}
                                    custom={direction}
                                    variants={stepVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{
                                        x: { duration: 0.3, ease: "easeInOut" },
                                        opacity: { duration: 0.2 },
                                    }}
                                    className="min-h-[350px]"
                                >
                                    {currentStep === 0 && <LibraryStep />}
                                    {currentStep === 1 && <FeaturesStep kamehouseFeatures={kamehouseFeatures} setKamehouseFeatures={setKamehouseFeatures} />}
                                </motion.div>
                            </AnimatePresence>

                            <motion.div
                                className="flex justify-between items-center max-w-2xl mx-auto pt-6 border-t border-white/5"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Button
                                    type="button"
                                    intent="gray-outline"
                                    onClick={e => {
                                        e.preventDefault()
                                        prevStep()
                                    }}
                                    disabled={currentStep === 0}
                                    className="flex items-center space-x-2 rounded-xl"
                                    leftIcon={<ChevronLeft className="text-xl" />}
                                >
                                    Anterior
                                </Button>

                                {currentStep === STEPS.length - 1 ? (
                                    <Button
                                        type="submit"
                                        className="flex items-center bg-gradient-to-r from-brand-orange to-red-600 hover:ring-2 ring-brand-orange text-white rounded-xl font-bold uppercase tracking-wider px-6"
                                        loading={isPending}
                                        rightIcon={<Rocket className="size-5" />}
                                    >
                                        <span>Iniciar KameHouse</span>
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        intent="gray-glass"
                                        onClick={e => {
                                            e.preventDefault()
                                            nextStep()
                                        }}
                                        className="flex items-center space-x-2 rounded-xl"
                                        rightIcon={<ChevronRight className="text-xl" />}
                                    >
                                        Siguiente
                                    </Button>
                                )}
                            </motion.div>
                        </div>
                    )}
                </Form>
            </div>
        </div>
    )
}
