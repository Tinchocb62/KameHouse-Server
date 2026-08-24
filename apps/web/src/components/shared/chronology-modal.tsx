"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useServerQuery } from "@/api/client/requests"
import { Icons } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"
import { cn } from "@/components/ui/core/styling"
import { ERA_COLOR_MAP, type EraId } from "@/components/ui/media-spotlight-helpers"

export interface TimelineMilestone {
    id: string
    order: number
    year: string
    title: string
    era: EraId
    mediaType: "MOVIE" | "SPECIAL" | "SHOW"
    mediaId: number
    tmdbId: number
    startEpisode?: number
    endEpisode?: number
    description: string
    canonStatus: "CANON" | "CANON_INTERPOLATED" | "SPECIAL" | "EXPANDED"
    importance: "CRUCIAL" | "RECOMMENDED" | "OPTIONAL"
    posterImage?: string
    backdropImage?: string
    isWatched?: boolean
    watchedPercent?: number
}

export interface ChronologyResponse {
    totalMilestones: number
    completedMilestones: number
    progressPercentage: number
    nextMilestone?: TimelineMilestone
    milestones: TimelineMilestone[]
}

interface ChronologyModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ChronologyModal({ isOpen, onClose }: ChronologyModalProps) {
    const [selectedEra, setSelectedEra] = useState<string>("all")

    const { data: chronology, isLoading } = useServerQuery<ChronologyResponse>({
        endpoint: "/api/v1/intelligence/chronology",
        method: "GET",
        queryKey: ["dragonball-chronology"],
        staleTime: 300000,
        enabled: isOpen,
        muteError: true,
    })

    if (!isOpen) return null

    const milestones = (chronology?.milestones || []).filter(m => {
        if (selectedEra === "all") return true
        return m.era === selectedEra
    })

    const nextMilestone = chronology?.nextMilestone || milestones[0]

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                {/* Modal Container */}
                <motion.div
                    role="dialog"
                    aria-modal="true"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-900/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <Icons.status.sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="font-display text-xl md:text-2xl text-zinc-100 uppercase tracking-wide">
                                    Línea Temporal Canónica
                                </h2>
                                <p className="text-xs text-zinc-400 font-medium">
                                    Orden histórico dentro del universo Dragon Ball (Año 737 al 889)
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                            <Icons.ui.close className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Progress Banner & Next CTA */}
                    {chronology && (
                        <div className="px-6 py-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tu Progreso Histórico:</span>
                                        <span className="text-xs font-black text-amber-400">{chronology.progressPercentage}%</span>
                                    </div>
                                    <div className="w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500" 
                                            style={{ width: `${chronology.progressPercentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {nextMilestone && (
                                <Link
                                    to={nextMilestone.mediaType === "MOVIE" ? "/movies/$movieId" : "/series/$seriesId"}
                                    params={nextMilestone.mediaType === "MOVIE" ? { movieId: String(nextMilestone.mediaId) } : { seriesId: String(nextMilestone.mediaId) }}
                                    onClick={onClose}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-transform hover:scale-105"
                                >
                                    <Icons.media.play className="w-4 h-4 fill-current" />
                                    <span>Continuar Historia: {nextMilestone.year}</span>
                                </Link>
                            )}
                        </div>
                    )}

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-800/60 bg-zinc-950 overflow-x-auto">
                        {[
                            { id: "all", label: "Toda la Historia" },
                            { id: "db", label: "Dragon Ball" },
                            { id: "dbz", label: "Dragon Ball Z" },
                            { id: "dbs", label: "Dragon Ball Super" },
                            { id: "dbdaima", label: "Daima" },
                            { id: "dbgt", label: "Dragon Ball GT" },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedEra(tab.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0",
                                    selectedEra === tab.id
                                        ? "bg-zinc-100 text-zinc-950"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Timeline List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4 text-zinc-500">
                                <Icons.ui.spinner className="w-8 h-8 animate-spin text-amber-500" />
                                <span className="text-xs uppercase tracking-widest">Cargando Cronología...</span>
                            </div>
                        ) : milestones.length === 0 ? (
                            <div className="py-20 text-center text-zinc-500">
                                <p className="text-sm">No se encontraron hitos para esta era.</p>
                            </div>
                        ) : (
                            <div className="relative pl-6 border-l-2 border-zinc-800 space-y-8">
                                {milestones.map((m) => {
                                    const colors = ERA_COLOR_MAP[m.era] || ERA_COLOR_MAP.dbz
                                    const isMovie = m.mediaType === "MOVIE"

                                    return (
                                        <div key={m.id} className="relative group">
                                            {/* Milestone Point */}
                                            <div 
                                                className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-zinc-950 transition-transform group-hover:scale-125"
                                                style={{ borderColor: colors.ambientGlow1 }}
                                            />

                                            {/* Milestone Content Card */}
                                            <div className="p-4 md:p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                                            {m.year}
                                                        </span>
                                                        <span className={cn("text-xs font-black uppercase tracking-widest", colors.textBrand)}>
                                                            {m.era.toUpperCase()}
                                                        </span>
                                                        <span className="text-xs text-zinc-500 font-bold uppercase">
                                                            Hito #{m.order}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {m.canonStatus === "CANON" && (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                CANON
                                                            </span>
                                                        )}
                                                        {m.canonStatus === "CANON_INTERPOLATED" && (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                                CANON OFICIAL
                                                            </span>
                                                        )}
                                                        {m.canonStatus === "SPECIAL" && (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                                ESPECIAL
                                                            </span>
                                                        )}
                                                        {m.canonStatus === "EXPANDED" && (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-zinc-700 text-zinc-300">
                                                                HISTORIA EXPANDIDA
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <h3 className="text-base md:text-lg font-bold text-zinc-100">
                                                    {m.title}
                                                </h3>

                                                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                                                    {m.description}
                                                </p>

                                                <div className="pt-2 flex items-center justify-between">
                                                    {m.startEpisode && m.endEpisode ? (
                                                        <span className="text-xs text-zinc-500 font-medium">
                                                            Episodios {m.startEpisode} al {m.endEpisode}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-zinc-500 font-medium">
                                                            Largometraje / Película
                                                        </span>
                                                    )}

                                                    <Link
                                                        to={isMovie ? "/movies/$movieId" : "/series/$seriesId"}
                                                        params={isMovie ? { movieId: String(m.mediaId) } : { seriesId: String(m.mediaId) }}
                                                        onClick={onClose}
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-wider"
                                                    >
                                                        <span>Ver Hito</span>
                                                        <Icons.navigation.chevronRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
