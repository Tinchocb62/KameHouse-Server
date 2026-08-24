import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/components/ui/core/styling";
import { Icons } from "@/components/ui/icons";
import { SagaPosterCard } from "./saga-poster-card";
import sagaSynopsisTags from "@/lib/config/saga_synopsis_tags.json";
import { resolveSeriesSagas } from "@/lib/config/dragonball.config";
import type { SagaDTO } from "@/api/types/series.types";
import { SAGA_LORE_MAPPING, getSagaCharacters, type SagaCharacterEdge } from "@/lib/config/dragonball-lore.config";
import type { MediaForSagaResolution } from "@/lib/config/dragonball.config";
import { EpisodeBadge, canonStatusToVariant } from "@/components/ui/episode-badge";
import { CharacterAvatar } from "./character-avatar";
import { EraOpeningPlayer } from "./era-opening-player";

export interface SagaLoreHeaderProps {
    saga: SagaDTO | undefined
    subSaga?: { id?: string; title?: string; description?: string; image?: string } | null
    media: (MediaForSagaResolution & { id?: number; characters?: { edges?: SagaCharacterEdge[] } }) | null | undefined
    onSelectCharacter?: (name: string) => void
    onSelectEpisode?: (episodeNumber: number) => void
    onUpdateProgress?: (mediaId: number, progress: number) => void
    progress?: { watched: number; total: number; percent: number }
    fillerStats?: { filler: number; total: number; percent: number }
}

export const SagaLoreHeader = React.memo(function SagaLoreHeader({ 
    saga, 
    subSaga, 
    media, 
    onSelectCharacter,
    onSelectEpisode,
    onUpdateProgress,
    progress,
    fillerStats
}: SagaLoreHeaderProps) {
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem("kamehouse-saga-header-expanded")
        return saved === null ? true : saved === "true"
    })

    const handleToggleExpand = useCallback(() => {
        setIsExpanded(prev => {
            const next = !prev
            localStorage.setItem("kamehouse-saga-header-expanded", String(next))
            return next
        })
    }, [])

    if (!saga) return null

    // Get the localized synopsis tags and description
    const localSagas = media ? resolveSeriesSagas(media) : []
    const localSagaDef = localSagas.find(s => s.id === saga.id)
    const localSubSagaDef = localSagaDef?.subSagas?.find(ss => ss.id === subSaga?.id)
    
    const description = localSubSagaDef?.description || subSaga?.description || localSagaDef?.description || saga.description || ""
    const sagaImage = localSubSagaDef?.image || subSaga?.image || localSagaDef?.image
    const displayTitle = localSubSagaDef?.title || subSaga?.title || saga.name

    const synopsisInfo = (sagaSynopsisTags as Record<string, { dominantVibe?: string; tags?: string[]; suggestedSwimlane?: string }>)[saga.id]
    const dominantVibe = synopsisInfo?.dominantVibe
    const tags = synopsisInfo?.tags || []
    const suggestedSwimlane = synopsisInfo?.suggestedSwimlane

    const loreDef = SAGA_LORE_MAPPING[saga.id]
    const antagonists = loreDef?.antagonists || []
    const keyEvents = loreDef?.keyEvents || []

    const characters = getSagaCharacters(saga.id, media?.characters?.edges)

    return (
        <div className="glass-card mb-8 overflow-visible relative group/card transition-all duration-base hover:shadow-glass hover:border-white/15 !bg-surface-container/75">
            {/* Ambient background glows */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent/5 to-transparent rounded-card pointer-events-none opacity-40 group-hover/card:opacity-75 transition-opacity duration-slow" />
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-brand-accent/[0.04] rounded-full blur-3xl pointer-events-none" />

            {/* Header that is always visible and clickable */}
            <div 
                className="p-6 md:p-8 flex items-start justify-between cursor-pointer relative z-10 select-none"
                onClick={handleToggleExpand}
            >
                <div className="flex-1 flex flex-col min-w-0 pr-4">
                    <div className="flex items-center gap-4 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-badge text-brand-accent uppercase bg-brand-accent/10 border border-brand-accent/20 px-3 py-1 rounded-full shadow-sm shadow-brand-accent/5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                            Detalles del Arco
                        </span>
                        
                        {saga.canonStatus && (
                            <EpisodeBadge 
                                variant={canonStatusToVariant(saga.canonStatus)} 
                                dot 
                                className="hidden sm:inline-flex px-3 py-1 text-badge uppercase"
                            >
                                {saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon" ? "Canon" : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false" ? "Relleno" : saga.canonStatus}
                            </EpisodeBadge>
                        )}
                    </div>
                    
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display bg-clip-text text-transparent bg-gradient-to-r from-on-surface via-on-surface to-on-surface/85 uppercase tracking-tight leading-[1.1] mb-5 line-clamp-2 drop-shadow-md">
                        {displayTitle}
                    </h2>
                    
                    {subSaga && (
                        <span className="inline-flex items-center text-badge text-on-surface-variant uppercase mb-5 block">
                            Parte de {saga.name}
                        </span>
                    )}

                    <div className="flex flex-wrap items-center gap-2.5">
                        {saga.episodeRange && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant bg-surface-container-high/50 border border-white/5 px-3 py-1.5 rounded-lg shadow-sm">
                                <Icons.status.tv size={14} className="text-brand-secondary" />
                                Eps {saga.episodeRange}
                            </span>
                        )}
                        {saga.startEp != null && saga.endEp != null && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant bg-surface-container-high/50 border border-white/5 px-3 py-1.5 rounded-lg shadow-sm">
                                <Icons.time.clock size={14} className="text-brand-success" />
                                {saga.endEp - saga.startEp + 1} Episodios
                            </span>
                        )}
                        {dominantVibe && (
                            <span className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1.5 rounded-lg shadow-sm",
                                dominantVibe === "Aventura" 
                                    ? "bg-brand-magic/15 text-brand-magic border border-brand-magic/25"
                                    : dominantVibe === "Tensión Absoluta" || dominantVibe === "Épico"
                                    ? "bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/25"
                                    : "bg-surface-container-high/50 border border-white/5 text-on-surface-variant"
                            )}>
                                <Icons.status.sparkles size={14} />
                                {dominantVibe}
                            </span>
                        )}
                        {suggestedSwimlane && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary px-3 py-1.5 rounded-lg shadow-sm">
                                <Icons.navigation.library size={14} />
                                <span className="line-clamp-1">{suggestedSwimlane}</span>
                            </span>
                        )}
                        <EraOpeningPlayer sagaId={saga.id} />
                    </div>
                    {progress && progress.total > 0 && (
                        <div className="mt-5 w-full max-w-md flex flex-col gap-2 relative z-25" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                <span>Progreso del Arco</span>
                                <span>{progress.watched} / {progress.total} eps ({progress.percent}%)</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                                <div 
                                    className="h-full bg-gradient-to-r from-brand-secondary via-brand-accent to-brand-accent shadow-[0_0_8px_hsl(var(--brand-accent)/0.6)] transition-all duration-slow ease-out" 
                                    style={{ width: `${progress.percent}%` }}
                                />
                            </div>
                            <div className="flex flex-wrap justify-between items-center mt-0.5 gap-2">
                                {fillerStats && fillerStats.filler > 0 ? (
                                    <div className="text-label-sm font-bold text-brand-destructive/80 uppercase tracking-widest">
                                        Contiene {fillerStats.filler} episodios de relleno ({fillerStats.percent}%)
                                    </div>
                                ) : <div />}

                                {saga.endEp && media?.id != null && onUpdateProgress && (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (media?.id != null) onUpdateProgress(media.id, saga.endEp!)
                                            }}
                                            disabled={progress.watched >= progress.total}
                                            className={cn(
                                                "text-label-sm font-bold uppercase tracking-widest transition-colors select-none",
                                                progress.watched >= progress.total
                                                    ? "text-on-surface-variant/50 cursor-not-allowed"
                                                    : "text-brand-success hover:text-brand-success-light cursor-pointer"
                                            )}
                                        >
                                            Marcar vistos 1-{saga.endEp}
                                        </button>
                                        {saga.startEp != null && progress.watched > 0 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (media?.id != null) onUpdateProgress(media.id, Math.max(0, saga.startEp! - 1))
                                                }}
                                                title={`Vuelve el progreso al episodio ${Math.max(0, saga.startEp! - 1)}`}
                                                className="text-label-sm font-bold uppercase tracking-widest transition-colors select-none text-on-surface-variant hover:text-brand-destructive cursor-pointer"
                                            >
                                                Reiniciar progreso
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Right side area: Collapsed character avatars & Chevron button */}
                <div className="flex items-center gap-5 shrink-0 self-end sm:self-center relative z-20">
                    {!isExpanded && characters.length > 0 && (
                        <div className="flex items-center gap-2 pr-2 border-r border-white/5 h-10 hidden sm:flex">
                            <span className="text-label-sm text-on-surface-variant/40 uppercase tracking-widest mr-1 font-bold hidden md:inline-block">
                                Reparto:
                            </span>
                            <div className="flex -space-x-2.5 overflow-hidden">
                                {characters.slice(0, 5).map((char, idx) => (
                                    <div 
                                        key={idx}
                                        className="inline-block h-8 w-8 rounded-xl border border-white/10 ring-2 ring-ui-surface overflow-hidden relative group/avatar cursor-pointer shadow-md hover:z-20 transition-all hover:scale-105 active:scale-95"
                                        title={char.name}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectCharacter?.(char.name);
                                        }}
                                    >
                                        <img 
                                            className="h-full w-full object-cover group-hover/avatar:scale-110 transition-transform duration-base"
                                            src={char.avatarUrl} 
                                            alt={char.name} 
                                        />
                                        <div className="absolute inset-0 bg-brand-accent/20 opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                                {characters.length > 5 && (
                                    <div className="flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 ring-2 ring-ui-surface bg-surface-container-high text-label-sm font-black text-on-surface-variant font-mono shadow-md">
                                        +{characters.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Chevron icon & Mobile Canon */}
                    <div className="flex flex-col items-end justify-center min-h-[3rem]">
                        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-surface-container/60 hover:bg-surface-container transition-all duration-base border border-white/10 hover:border-brand-accent/40 shrink-0 shadow-card group-hover:scale-105 active:scale-95 hover:shadow-[0_0_12px_hsl(var(--brand-accent)/0.25)]">
                            <Icons.navigation.chevronDown 
                                size={22} 
                                className={cn("transition-transform duration-slow text-on-surface", isExpanded && "rotate-180")} 
                            />
                        </div>
                        {/* Move canon pill here on mobile */}
                        {saga.canonStatus && (
                            <EpisodeBadge 
                                variant={canonStatusToVariant(saga.canonStatus)} 
                                dot 
                                className="sm:hidden mt-2 px-2.5 py-1 text-badge uppercase"
                            >
                                {saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon" ? "Canon" : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false" ? "Relleno" : saga.canonStatus}
                            </EpisodeBadge>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="p-6 md:p-8 pt-0 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Text details */}
                                <div className={cn(
                                    "flex flex-col justify-start",
                                    sagaImage ? "lg:col-span-8 xl:col-span-9 col-span-12" : "col-span-12"
                                )}>
                                    {description && (
                                        <div className="space-y-5">
                                            <div className="relative pl-6 py-1">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-accent/60 via-brand-accent/20 to-transparent rounded-full shadow-[0_0_8px_hsl(var(--brand-accent)/0.3)]" />
                                                <p className="text-base md:text-lg text-on-surface/90 leading-relaxed font-medium">
                                                    {description}
                                                </p>
                                            </div>
                                            {tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2.5 pt-2 pl-6">
                                                    {tags.map((tag: string, idx: number) => (
                                                        <span 
                                                            key={idx} 
                                                            className="inline-flex items-center text-xs text-brand-accent/90 bg-brand-accent/10 border border-brand-accent/20 px-3 py-1.5 rounded-lg select-none uppercase tracking-widest font-bold shadow-sm hover:bg-brand-accent/15 hover:border-brand-accent/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-base cursor-default"
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Poster image card */}
                                {sagaImage && (
                                    <div className="lg:col-span-4 xl:col-span-3 col-span-12 flex items-start justify-center lg:justify-end">
                                        <SagaPosterCard src={sagaImage} alt={saga.name} />
                                    </div>
                                )}
                            </div>

            {/* Antagonists and Key Events row */}
            {(antagonists.length > 0 || keyEvents.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10 mt-6 relative z-10">
                    {antagonists.length > 0 && (
                        <div className="relative overflow-hidden bg-gradient-to-br from-brand-destructive/[0.02] to-transparent bg-surface-container/45 border border-white/10 p-5 md:p-6 rounded-xl flex flex-col shadow-md hover:border-brand-destructive/20 hover:bg-surface-container/55 transition-all duration-base backdrop-blur-md">
                            {/* Decorative aura glow */}
                            <div className="absolute -top-12 -left-12 w-24 h-24 bg-brand-destructive/5 rounded-full blur-2xl pointer-events-none" />
                            
                            <h3 className="flex items-center gap-2.5 text-sm text-brand-destructive uppercase mb-5 pb-3 border-b border-white/5 font-black tracking-widest relative z-10">
                                <Icons.status.skull size={18} className="drop-shadow-[0_0_6px_hsl(var(--brand-destructive)/0.5)] animate-pulse" />
                                Antagonistas Principales
                            </h3>
                            <div className="flex flex-wrap gap-2.5 relative z-10">
                                {antagonists.map((ant: string, idx: number) => {
                                    const matchedChar = characters.find(c => c.name.toLowerCase().includes(ant.toLowerCase()))
                                    return (
                                        <span 
                                            key={idx} 
                                            onClick={() => matchedChar && onSelectCharacter?.(matchedChar.name)}
                                            className={cn(
                                                "inline-flex items-center gap-2 px-3 py-1.5 bg-brand-destructive/[0.08] hover:bg-brand-destructive/[0.14] border border-brand-destructive/20 hover:border-brand-destructive/40 text-brand-destructive text-xs uppercase rounded-lg font-bold shadow-sm transition-all duration-base hover:scale-[1.03] hover:shadow-[0_4px_12px_hsl(var(--brand-destructive)/0.12)] select-none",
                                                matchedChar && "cursor-pointer"
                                            )}
                                        >
                                            {matchedChar?.avatarUrl ? (
                                                <img 
                                                    src={matchedChar.avatarUrl} 
                                                    alt={ant} 
                                                    className="w-5 h-5 rounded-full object-cover border border-brand-destructive/30" 
                                                />
                                            ) : (
                                                <Icons.status.skull size={12} className="shrink-0 text-brand-destructive/70" />
                                            )}
                                            {ant}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {keyEvents.length > 0 && (
                        <div className="relative overflow-hidden bg-gradient-to-br from-brand-success/[0.02] to-transparent bg-surface-container/45 border border-white/10 p-5 md:p-6 rounded-xl flex flex-col shadow-md hover:border-brand-success/20 hover:bg-surface-container/55 transition-all duration-base backdrop-blur-md">
                            {/* Decorative timeline aura glow */}
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand-success/5 rounded-full blur-2xl pointer-events-none" />

                            <h3 className="flex items-center gap-2.5 text-sm text-brand-success uppercase mb-5 pb-3 border-b border-white/5 font-black tracking-widest relative z-10">
                                <Icons.status.trophy size={18} className="drop-shadow-[0_0_6px_hsl(var(--brand-success)/0.5)]" />
                                Hitos y Momentos Clave
                            </h3>
                            
                            <div className="relative pl-6 space-y-5 relative z-10">
                                {/* Vertical connection axis line */}
                                <div className="absolute left-[5px] top-2.5 bottom-2.5 w-[2px] bg-gradient-to-b from-brand-success/40 via-brand-success/15 to-transparent" />
                                
                                {keyEvents.map((event: string, idx: number) => {
                                    // Extract episode numbers like (Ep 12) or (Eps 12-15)
                                    const epMatch = event.match(/\(Eps?\s*(\d+)/i)
                                    const epRangeMatch = event.match(/\(Eps?\s*([0-9\-]+)\)/i)
                                    const targetEp = epMatch ? parseInt(epMatch[1], 10) : null
                                    const epLabel = epRangeMatch ? epRangeMatch[1] : null
                                    
                                    // Remove the (Eps ...) part from description
                                    const cleanEventText = event.replace(/\s*\(Eps?\s*\d+.*?\)/i, '')

                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => targetEp && onSelectEpisode?.(targetEp)}
                                            className={cn(
                                                "relative pl-6 group/event",
                                                targetEp && "cursor-pointer"
                                            )}
                                        >
                                            {/* Interactive node dot */}
                                            <div className={cn(
                                                "absolute left-[-26px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-brand-success/60 bg-ui-surface transition-all duration-base flex items-center justify-center",
                                                targetEp && "group-hover/event:border-brand-success group-hover/event:bg-brand-success/20 group-hover/event:scale-125"
                                            )}>
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full bg-brand-success transition-transform duration-base",
                                                    targetEp ? "scale-0 group-hover/event:scale-100" : "scale-100"
                                                )} />
                                            </div>
                                            <span className={cn(
                                                "text-sm text-on-surface-variant/90 font-medium transition-colors duration-250 block leading-relaxed",
                                                targetEp && "group-hover/event:text-on-surface"
                                            )}>
                                                {cleanEventText}
                                                {epLabel && (
                                                    <span className="ml-2 text-label-sm bg-brand-success/15 border border-brand-success/35 text-brand-success font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                        Ep {epLabel}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Key Characters */}
            {characters.length > 0 && (
                <div className="pt-6 border-t border-white/10 space-y-5 mt-6 relative z-10">
                    <h3 className="flex items-center gap-2.5 text-sm text-brand-accent uppercase font-black tracking-widest mb-4">
                        <Icons.navigation.users size={18} className="drop-shadow-[0_0_4px_hsl(var(--brand-accent)/0.4)]" />
                        Personajes Clave del Arco
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-5">
                        {characters.map((char, idx) => (
                            <CharacterAvatar
                                key={idx}
                                name={char.name}
                                avatarUrl={char.avatarUrl}
                                roleTag={char.roleTag}
                                onSelect={(name) => onSelectCharacter?.(name)}
                            />
                        ))}
                    </div>
                </div>
            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
})