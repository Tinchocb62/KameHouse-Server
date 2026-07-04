import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/components/ui/core/styling"
import {
    LucideActivity, LucideCheck,
    LucideClipboardList, LucideDatabase,
    LucideScissors, LucideSearch, LucideShield,
} from "lucide-react"

export interface PipelineStage {
    id: string
    label: string
    shortLabel: string
    description: string
    icon: React.ReactNode
}

export const PIPELINE_STAGES: PipelineStage[] = [
    {
        id: "walk",
        label: "Descubrimiento",
        shortLabel: "Walk",
        description: "Recorre el sistema de archivos buscando videos",
        icon: <LucideSearch size={18} />,
    },
    {
        id: "parse",
        label: "Parseo Títulos",
        shortLabel: "Parse",
        description: "Extrae metadata de nombre de archivo y carpetas",
        icon: <LucideClipboardList size={18} />,
    },
    {
        id: "resolve",
        label: "Identificación Bayesiana",
        shortLabel: "Bayesian",
        description: "Motor Bayesiano con scoring Dice-coefficient",
        icon: <LucideShield size={18} />,
    },
    {
        id: "probe",
        label: "Análisis Técnico",
        shortLabel: "FFprobe",
        description: "FFprobe + detección de subtítulos externos",
        icon: <LucideActivity size={18} />,
    },
    {
        id: "persist",
        label: "Persistencia",
        shortLabel: "Persist",
        description: "Guarda snapshot JSON en la base de datos",
        icon: <LucideDatabase size={18} />,
    },
    {
        id: "prune",
        label: "Limpieza DB",
        shortLabel: "Prune",
        description: "Elimina archivos borrados del disco de la DB",
        icon: <LucideScissors size={18} />,
    },
]

export function PipelineStageCard({ stage, isActive, isDone }: {
    stage: PipelineStage
    isActive: boolean
    isDone: boolean
}) {
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            animate={isActive ? {
                boxShadow: [
                    "0 0 0 transparent",
                    "0 0 30px var(--glow-secondary)",
                    "0 0 0 transparent"
                ],
            } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
                "relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-500 overflow-hidden group backdrop-blur-[var(--blur-overlay-lg)]",
                isActive
                    ? "border-[#ff6e3a]/50 bg-[#ff6e3a]/[0.03] shadow-brand-secondary"
                    : isDone
                        ? "border-emerald-500/25 bg-emerald-500/[0.02]"
                        : "border-white/5 bg-zinc-950/30 hover:border-white/10 hover:bg-white/[0.015]"
            )}
        >
            {/* Ambient Background Gradient */}
            <div 
                className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none",
                    "bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.03),transparent_70%)]"
                )}
            />

            <div className="relative space-y-3.5">
                <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500 shadow-inner",
                    isActive
                        ? "text-[#ff6e3a] border-[#ff6e3a]/30 bg-[#ff6e3a]/10 shadow-brand-secondary"
                        : isDone
                            ? "text-[#34d399] border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_10px_rgba(52,211,153,0.15)]"
                            : "text-zinc-500 border-white/5 bg-white/[0.01] group-hover:border-zinc-700"
                )}>
                    {isDone && !isActive ? <LucideCheck size={16} strokeWidth={3} /> : React.cloneElement(stage.icon as React.ReactElement<any>, { size: 16 })}
                </div>

                <div className="min-w-0">
                    <p className={cn(
                        "text-[9px] font-black uppercase tracking-[0.25em] transition-colors duration-500 font-mono",
                        isActive ? "text-[#ff6e3a]" : isDone ? "text-emerald-500/60" : "text-zinc-500"
                    )}>
                        {stage.shortLabel}
                    </p>
                    <p className="text-[11px] font-bold text-white mt-1 tracking-tight leading-snug break-words">{stage.label}</p>
                </div>

                {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
                        <motion.div 
                            className="h-full bg-[#ff6e3a] shadow-brand-secondary"
                            animate={{ 
                                x: ["-100%", "200%"],
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </div>
                )}
            </div>
        </motion.div>
    )
}

export function ProgressRing({ progress, size, stroke }: { progress: number; size: number; stroke: number }) {
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (progress / 100) * circumference
    const center = size / 2

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="shrink-0 -rotate-90">
                {/* Background Shadow Ring */}
                <circle cx={center} cy={center} r={radius}
                    stroke="rgba(0,0,0,0.5)" strokeWidth={stroke + 2} fill="none" />
                
                {/* Track */}
                <circle cx={center} cy={center} r={radius}
                    stroke="rgba(255,255,255,0.03)" strokeWidth={stroke} fill="none" />
                
                {/* Progress */}
                <motion.circle
                    cx={center} cy={center} r={radius}
                    stroke="#ff6e3a"
                    strokeWidth={stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ type: "spring", stiffness: 40, damping: 15 }}
                    style={{ filter: "drop-shadow(0 0 8px var(--glow-secondary))" }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-bebas text-5xl text-white leading-none">{Math.round(progress)}</span>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">%</span>
            </div>
        </div>
    )
}
