import { useState } from "react"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import { getMediumResImage } from "@/lib/helpers/images"
import type { ResolvedStageSaga } from "@/lib/config/dragonball_stages"

/**
 * Fila de saga (Nodo de Timeline): thumbnail expandido como fondo, título, rango y progreso.
 * Click abre la serie en la saga o despliega detalles (descripción y sub-sagas).
 */
export function SagaRow({
    item,
    onPlay,
    onOpenSeries,
    auraFrom = "#FF8C00",
    auraTo = "#FFD700"
}: {
    item: ResolvedStageSaga
    onPlay: (mediaId: number, episodeNumber: number) => void
    onOpenSeries: (saga: ResolvedStageSaga) => void
    auraFrom?: string
    auraTo?: string
}) {
    const { saga, mediaId, totalEps, watchedEps, startEp, endEp } = item
    const percent = totalEps > 0 ? Math.round((watchedEps / totalEps) * 100) : 0
    const isComplete = percent >= 100
    const inLibrary = mediaId != null
    const [isExpanded, setIsExpanded] = useState(false)
    const hasSubSagas = saga.subSagas && saga.subSagas.length > 0

    const handleRowClick = () => {
        if (!inLibrary) return
        if (hasSubSagas || saga.description) {
            setIsExpanded(!isExpanded)
        } else {
            onOpenSeries(item)
        }
    }

    return (
        <div className="relative group">
            {/* Nodo de la línea de tiempo */}
            <div 
                className="absolute top-6 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 z-20 transition-all duration-300 ease-out shadow-[0_0_10px_currentColor] -left-[calc(1.5rem+7px)] md:-left-[calc(2.5rem+7px)]"
                style={{ 
                    background: isComplete ? auraTo : auraFrom, 
                    color: auraFrom,
                    boxShadow: inLibrary ? `0 0 12px ${auraFrom}` : 'none'
                }}
            />

            <div
                className={cn(
                    "flex flex-col gap-0 rounded-2xl border border-white/10 overflow-hidden relative",
                    "transition-all duration-500 ease-out shadow-lg",
                    inLibrary ? "hover:border-white/30 hover:shadow-2xl cursor-pointer" : "opacity-50",
                    isExpanded ? "ring-1 ring-white/20" : ""
                )}
                role={inLibrary ? "button" : undefined}
                tabIndex={inLibrary ? 0 : undefined}
                onClick={handleRowClick}
                onKeyDown={e => {
                    if (inLibrary && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        handleRowClick()
                    }
                }}
            >
                {/* Imagen de fondo (Blur) */}
                <div className="absolute inset-0 z-0 overflow-hidden bg-zinc-900">
                    <img
                        src={getMediumResImage(saga.image)}
                        alt=""
                        loading="lazy"
                        className={cn(
                            "w-full h-full object-cover grayscale contrast-125 transition-all duration-700 ease-out",
                            isExpanded ? "scale-110 opacity-70" : "scale-105 opacity-40 group-hover:scale-110 group-hover:opacity-60"
                        )}
                    />
                    <div 
                        className="absolute inset-0 opacity-20" 
                        style={{ background: `linear-gradient(to right, ${auraFrom}, ${auraTo})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 to-transparent" />
                </div>

                <div className="flex items-center gap-4 p-4 relative z-10">
                    <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                        <div className="flex items-center justify-between gap-4">
                            <h4 className="text-h4 font-display font-semibold text-white truncate drop-shadow-md tracking-wide">
                                {saga.title}
                            </h4>
                            {(hasSubSagas || saga.description) && (
                                <div className={cn(
                                    "p-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300",
                                    isExpanded ? "bg-white/20 border-white/30" : "group-hover:bg-white/10"
                                )}>
                                    <Icons.navigation.chevronDown 
                                        className={cn(
                                            "w-4 h-4 text-white shrink-0 transition-transform duration-300", 
                                            isExpanded && "rotate-180"
                                        )} 
                                    />
                                </div>
                            )}
                        </div>
                        <p className="text-label-sm font-mono uppercase tracking-widest text-white/70 mt-1.5 drop-shadow-sm flex items-center gap-2">
                            <span>Ep. {startEp}–{endEp}</span>
                            <span className="w-1 h-1 rounded-full bg-white/30" />
                            <span>{watchedEps}/{totalEps} vistos</span>
                        </p>
                        
                        {/* Progress Bar Temática */}
                        <div className="flex items-center gap-3 mt-3 max-w-[300px]">
                            <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden backdrop-blur-md shadow-inner">
                                <div 
                                    className="h-full rounded-full shadow-[0_0_8px_currentColor] transition-all duration-1000 ease-out" 
                                    style={{ width: `${percent}%`, background: `linear-gradient(to right, ${auraFrom}, ${auraTo})`, color: auraFrom }} 
                                />
                            </div>
                            {isComplete && (
                                <Icons.ui.checkCircle2 className="w-4 h-4 text-brand-success drop-shadow-sm shrink-0" />
                            )}
                        </div>
                    </div>

                    {inLibrary && !isComplete && (
                        <button
                            onClick={e => {
                                e.stopPropagation()
                                onPlay(mediaId!, startEp + watchedEps)
                            }}
                            title={`Reproducir episodio ${startEp + watchedEps}`}
                            className={cn(
                                "shrink-0 w-12 h-12 flex items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/25",
                                "text-white transition-all duration-300 ease-out hover:scale-110 active:scale-95 backdrop-blur-md",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent shadow-lg",
                            )}
                        >
                            <Icons.media.play className="w-5 h-5 fill-current ml-1" />
                        </button>
                    )}
                </div>

                {/* Expanded Section (Sub-sagas) */}
                <div 
                    className={cn(
                        "grid transition-all duration-500 ease-in-out relative z-10",
                        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                >
                    <div className="overflow-hidden min-h-0">
                        <div className="p-5 pt-2 bg-zinc-950/40 backdrop-blur-xl border-t border-white/10">
                            {saga.description && (
                                <p className="text-body-md text-white/80 leading-relaxed mb-5 font-medium drop-shadow-sm">
                                    {saga.description}
                                </p>
                            )}
                            
                            {hasSubSagas && (
                                <div className="flex flex-col gap-3 mb-5 pl-4 border-l-2 border-white/10 ml-2 relative">
                                    <h5 className="text-label-sm font-mono uppercase tracking-widest text-white/50 mb-2 pl-2">
                                        Arcos Argumentales
                                    </h5>
                                    {saga.subSagas!.map(sub => (
                                        <div key={sub.id} className="relative flex gap-4 items-start p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group/sub">
                                            {/* Mini nodo de timeline conectando la sub-saga */}
                                            <div 
                                                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white/30 bg-zinc-900 group-hover/sub:bg-white transition-colors duration-300"
                                                style={{ left: "-1.1rem" }}
                                            />
                                            {sub.image && (
                                                <img 
                                                    src={getMediumResImage(sub.image)} 
                                                    alt={sub.title} 
                                                    className="w-20 h-12 object-cover rounded-md shrink-0 shadow-md group-hover/sub:scale-105 transition-transform duration-300" 
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline gap-2">
                                                    <h6 className="text-label-lg font-bold text-white/95 truncate drop-shadow-sm">{sub.title}</h6>
                                                    <span className="text-label-sm font-mono text-white/50 shrink-0 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">Ep. {sub.startEp}–{sub.endEp}</span>
                                                </div>
                                                {sub.description && (
                                                    <p className="text-body-sm text-white/70 mt-1.5 line-clamp-2 leading-snug">
                                                        {sub.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenSeries(item);
                                    }}
                                    className={cn(
                                        "px-5 py-2.5 text-label-sm font-bold uppercase tracking-wider",
                                        "bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300",
                                        "border border-white/10 hover:border-white/30 hover:shadow-lg active:scale-95"
                                    )}
                                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                                >
                                    Abrir Saga Completa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
