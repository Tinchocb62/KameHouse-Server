import { memo, useCallback, useMemo, useState, useRef, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { cn } from "@/components/ui/core/styling"
import { useSound } from "@/hooks/use-sound"
import { Vaul, VaulContent, VaulDescription } from "@/components/vaul"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Icons } from "@/components/ui/icons"
import {
    resolveArcs,
    LORE_ENTRIES,
    type LoreNode,
    type ResolvedArc,
    DRAGON_BALL_ARCS,
    DRAGON_BALL_GT_ARCS,
} from "@/lib/config/dragonball_arcs"
import type { StageCollectionEntry, ResolvedStageSaga } from "@/lib/config/dragonball_stages"
import type { Anime_LibraryCollection } from "@/api/generated/types"

export type SagaTimelineItem = {
    id: string
    type: "saga"
    arc: ResolvedArc
    saga: ResolvedStageSaga
    globalIndex: number
}

export type LoreTimelineItem = {
    id: string
    type: "lore"
    lore: LoreNode
    globalIndex: number
}

export type TimelineItem = SagaTimelineItem | LoreTimelineItem

const SLICE_ENTRY_STAGGER_MS = 60

/**
 * Vista "Arcos" del panorama: mapa de arcos históricos del Universo Dragon Ball.
 * Cada franja agrupa las sagas del arco narrativo. Al abrirla se despliegan las
 * sagas que la componen.
 */
export function ArcsPanorama({
    collection,
    isMobile,
}: {
    collection: Anime_LibraryCollection | undefined
    isMobile: boolean
}) {
    const { playSound } = useSound()
    const [activeId, setActiveId] = useState<string | null>(null)
    const [openId, setOpenId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<"canon" | "no-canon">("canon")
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const scrollLeft = useCallback(() => {
        if (scrollContainerRef.current) {
            playSound("hover", 0.1)
            scrollContainerRef.current.scrollBy({ left: -400, behavior: "smooth" })
        }
    }, [playSound])

    const scrollRight = useCallback(() => {
        if (scrollContainerRef.current) {
            playSound("hover", 0.1)
            scrollContainerRef.current.scrollBy({ left: 400, behavior: "smooth" })
        }
    }, [playSound])

    const scrollToStart = useCallback(() => {
        if (scrollContainerRef.current) {
            playSound("hover", 0.1)
            scrollContainerRef.current.scrollTo({ left: 0, behavior: "smooth" })
        }
    }, [playSound])

    const scrollToEnd = useCallback(() => {
        if (scrollContainerRef.current) {
            playSound("hover", 0.1)
            scrollContainerRef.current.scrollTo({ left: scrollContainerRef.current.scrollWidth, behavior: "smooth" })
        }
    }, [playSound])

    const resolvedArcs = useMemo<ResolvedArc[]>(() => {
        const entries = (collection?.lists || []).flatMap(l => l.entries || []) as StageCollectionEntry[]
        const arcsList = viewMode === "canon" ? DRAGON_BALL_ARCS : DRAGON_BALL_GT_ARCS
        return resolveArcs(entries, arcsList)
    }, [collection, viewMode])

    const timelineItems = useMemo<TimelineItem[]>(() => {
        let globalIndex = 0
        const items: TimelineItem[] = []
        
        resolvedArcs.forEach(rArc => {
            rArc.sagas.forEach(s => {
                items.push({
                    id: s.saga.id,
                    type: "saga",
                    arc: rArc,
                    saga: s,
                    globalIndex: globalIndex++
                })
            })
            if (LORE_ENTRIES[rArc.arc.id]) {
                items.push({
                    id: LORE_ENTRIES[rArc.arc.id].id,
                    type: "lore",
                    lore: LORE_ENTRIES[rArc.arc.id],
                    globalIndex: globalIndex++
                })
            }
        })
        return items
    }, [resolvedArcs])

    const effectiveActiveId =
        activeId ?? timelineItems.find(s => s.type === "saga" && s.saga.percent < 100)?.id ?? timelineItems[0]?.id ?? null

    const activeTimelineItem = useMemo(() => {
        return timelineItems.find(item => item.id === effectiveActiveId)
    }, [timelineItems, effectiveActiveId])
    const activeAuraColor = activeTimelineItem && activeTimelineItem.type === "saga" ? activeTimelineItem.arc.arc.colors[0] : null

    const openItem = timelineItems.find(a => a.id === openId && a.type === "saga") as SagaTimelineItem | null

    const handleFocus = useCallback(
        (id: string) => {
            setActiveId(prev => {
                if (prev !== id) playSound("hover", 0.08)
                return id
            })
        },
        [playSound],
    )

    const handleOpen = useCallback(
        (id: string) => {
            playSound("detail")
            setOpenId(id)
        },
        [playSound],
    )

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const idx = timelineItems.findIndex(a => a.id === effectiveActiveId)
            if (idx === -1) return
            let nextIdx: number | null = null
            if (e.key === "ArrowRight" || e.key === "ArrowDown") nextIdx = Math.min(idx + 1, timelineItems.length - 1)
            else if (e.key === "ArrowLeft" || e.key === "ArrowUp") nextIdx = Math.max(idx - 1, 0)
            else if (e.key === "Home") nextIdx = 0
            else if (e.key === "End") nextIdx = timelineItems.length - 1
            else if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                const current = timelineItems[idx]
                if (current && current.type === "saga") {
                    handleOpen(effectiveActiveId!)
                }
                return
            } else return

            e.preventDefault()
            const next = timelineItems[nextIdx]
            if (next) {
                handleFocus(next.id)
                document.getElementById(`saga-slice-${next.id}`)?.focus()
            }
        },
        [timelineItems, effectiveActiveId, handleFocus, handleOpen],
    )

    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container || isMobile) return

        let rafId: number | null = null
        let pendingId: string | null = null

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        pendingId = entry.target.id.replace("saga-slice-", "")
                        if (!rafId) {
                            rafId = requestAnimationFrame(() => {
                                if (pendingId) handleFocus(pendingId)
                                rafId = null
                            })
                        }
                    }
                })
            },
            {
                root: container,
                rootMargin: "0px -40% 0px -40%",
                threshold: 0.1,
            }
        )

        const timeoutId = setTimeout(() => {
            const nodes = container.querySelectorAll('[role="tab"]')
            nodes.forEach((node) => observer.observe(node))
        }, 100)

        return () => {
            clearTimeout(timeoutId)
            observer.disconnect()
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [timelineItems, handleFocus, isMobile])

    // Interacciones de Mouse (Scroll Horizontal y Edge Panning)
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container || isMobile) return

        // 1. Mouse Wheel -> Horizontal Scroll
        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                container.scrollLeft += e.deltaY
            }
        }

        // 2. Edge Panning
        let animationFrameId: number | null = null
        let isPanning = false
        let panDirection = 0
        const PAN_SPEED = 12
        const EDGE_THRESHOLD = 150

        const panLoop = () => {
            if (isPanning && scrollContainerRef.current) {
                scrollContainerRef.current.scrollBy({ left: panDirection * PAN_SPEED, behavior: "auto" })
                animationFrameId = requestAnimationFrame(panLoop)
            } else {
                animationFrameId = null
            }
        }

        const startPanning = (direction: number) => {
            panDirection = direction
            if (!isPanning) {
                isPanning = true
                if (animationFrameId === null) {
                    animationFrameId = requestAnimationFrame(panLoop)
                }
            }
        }

        const stopPanning = () => {
            isPanning = false
            panDirection = 0
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId)
                animationFrameId = null
            }
        }

        const onMouseMove = (e: MouseEvent) => {
            const { clientX } = e
            const { innerWidth } = window
            
            if (clientX < EDGE_THRESHOLD) {
                startPanning(-1)
            } else if (clientX > innerWidth - EDGE_THRESHOLD) {
                startPanning(1)
            } else {
                stopPanning()
            }
        }

        const onMouseLeave = () => {
            stopPanning()
        }

        container.addEventListener("wheel", onWheel, { passive: true })
        container.addEventListener("mousemove", onMouseMove, { passive: true })
        container.addEventListener("mouseleave", onMouseLeave, { passive: true })

        return () => {
            container.removeEventListener("wheel", onWheel)
            container.removeEventListener("mousemove", onMouseMove)
            container.removeEventListener("mouseleave", onMouseLeave)
            if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
        }
    }, [isMobile])

    return (
        <div className="relative w-full h-full bg-ui-background overflow-hidden">
            {/* Efecto de Aura de Fondo con Crossfade */}
            {!isMobile && activeAuraColor && (
                <div
                    key={`aura-${effectiveActiveId}`}
                    className="absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-none opacity-35"
                    style={{
                        background: `radial-gradient(ellipse at center, ${activeAuraColor} 0%, transparent 80%)`
                    }}
                />
            )}

            {/* Switch Mode (Global Top Right) */}
            <div className="absolute top-4 right-4 lg:top-8 lg:right-8 flex items-center gap-3 bg-zinc-950/80 backdrop-blur-md p-2 rounded-full border border-white/10 z-[100] shadow-xl">
                <span className={cn("text-xs font-mono tracking-widest uppercase transition-colors", viewMode === "canon" ? "text-brand-accent" : "text-white/40")}>Canon</span>
                <button
                    onClick={() => {
                        setViewMode(prev => prev === "canon" ? "no-canon" : "canon")
                        setActiveId(null)
                        scrollToStart()
                    }}
                    className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-zinc-950",
                        viewMode === "no-canon" ? "bg-indigo-500" : "bg-zinc-700"
                    )}
                >
                    <span className="sr-only">Toggle view mode</span>
                    <span
                        className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            viewMode === "no-canon" ? "translate-x-6" : "translate-x-1"
                        )}
                    />
                </button>
                <span className={cn("text-xs font-mono tracking-widest uppercase transition-colors", viewMode === "no-canon" ? "text-indigo-400" : "text-white/40")}>No Canon</span>
            </div>

            {/* Contenedor principal con efecto de profundidad cinematográfico cuando se abre el cajón */}
            <div className={cn(
                "relative z-10 w-full h-full p-2 sm:p-4 overflow-y-auto no-scrollbar lg:flex lg:flex-col lg:justify-center",
                "transition-all duration-700 ease-out origin-bottom",
                openItem ? "scale-[0.96] opacity-30 pointer-events-none" : "scale-100 opacity-100"
            )}>
                {/* Header (Título de la Página) */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center w-full py-10 lg:py-0 lg:mb-16">
                    <div className="inline-flex flex-col items-center mb-6">
                        <div className="flex items-center gap-2.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-brand-accent" />
                            <span className="text-label-sm tracking-widest text-on-surface-variant uppercase font-mono">Etapas</span>
                        </div>
                        <h1 className="font-display text-4xl tracking-wider text-on-surface select-none leading-none">SAGAS ÉPICAS</h1>
                        
                        {/* Deslizadores (Navegación Desktop) */}
                        <div className="hidden md:flex items-center gap-2 bg-zinc-950/50 backdrop-blur-md p-1.5 rounded-full border border-white/10 mt-6 z-50 shadow-xl">
                            <button
                                onClick={scrollToStart}
                                aria-label="Volver al inicio"
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <Icons.media.skipPrevious className="w-5 h-5" />
                            </button>
                            <button
                                onClick={scrollLeft}
                                aria-label="Desplazar hacia la izquierda"
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <Icons.navigation.chevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={scrollRight}
                                aria-label="Desplazar hacia la derecha"
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <Icons.navigation.chevronRight className="w-6 h-6" />
                            </button>
                            <button
                                onClick={scrollToEnd}
                                aria-label="Ir al final"
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <Icons.media.skipNext className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

            {isMobile ? (
                <div className="relative z-10 flex flex-col gap-4 pb-24 w-full max-w-content mx-auto">
                    {timelineItems.map(item => (
                        item.type === "saga" && (
                        <MobileSagaCard
                            key={item.id}
                            item={item}
                            onOpen={handleOpen}
                        />
                        )
                    ))}
                </div>
            ) : (
                <div className="relative z-10 w-full flex-1 min-h-[500px] group/timeline">
                    <div
                        ref={scrollContainerRef}
                        role="tablist"
                        aria-orientation="horizontal"
                        aria-label="Arcos Históricos de Dragon Ball"
                        onKeyDown={handleKeyDown}
                        className="arc-panorama absolute inset-0 flex items-center overflow-x-auto overflow-y-hidden no-scrollbar px-[calc(50vw-160px)] snap-x snap-mandatory scroll-smooth"
                    >
                        {timelineItems.map((item) => (
                            item.type === "saga" ? (
                                <SagaTimelineNode
                                    key={item.id}
                                    item={item}
                                    isActive={effectiveActiveId === item.id}
                                    onFocus={handleFocus}
                                    onOpen={handleOpen}
                                    entryDelayMs={item.globalIndex * SLICE_ENTRY_STAGGER_MS}
                                    position={item.globalIndex % 2 === 0 ? "top" : "bottom"}
                                />
                            ) : (
                                <LoreTimelineNode
                                    key={item.id}
                                    item={item}
                                    isActive={effectiveActiveId === item.id}
                                    onFocus={handleFocus}
                                />
                            )
                        ))}
                    </div>

                </div>
            )}
            </div>

            <SagaDetailDrawer
                item={openItem}
                open={!!openItem}
                onOpenChange={open => { if (!open) setOpenId(null) }}
            />

            <style>{`
                @keyframes arc-slice-enter {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .arc-panorama > article {
                    animation: arc-slice-enter 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                
                @keyframes saga-row-enter {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes timeline-draw {
                    from { transform: scaleY(0); }
                    to { transform: scaleY(1); }
                }
                
                .drawer-open .saga-row-item {
                    animation: saga-row-enter 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .drawer-open .drawer-timeline-line {
                    transform-origin: top;
                    animation: timeline-draw 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
                }

                @keyframes pulse-ki {
                    0% { transform: scale(1); opacity: 0.8; filter: brightness(1) drop-shadow(0 0 8px currentColor); }
                    50% { transform: scale(1.02); opacity: 1; filter: brightness(1.2) drop-shadow(0 0 16px currentColor); }
                    100% { transform: scale(1); opacity: 0.8; filter: brightness(1) drop-shadow(0 0 8px currentColor); }
                }
                .pulse-ki-active {
                    animation: pulse-ki 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}

// ─── Franja de Arco (acordeón desktop) ─────────────────────────────────────

/** Tarjeta de nodo de Saga en la línea de tiempo (Desktop) */
const SagaTimelineNode = memo(function SagaTimelineNode({
    item,
    isActive,
    onFocus,
    onOpen,
    entryDelayMs,
    position,
}: {
    item: SagaTimelineItem
    isActive: boolean
    onFocus: (id: string) => void
    onOpen: (id: string) => void
    entryDelayMs: number
    position: "top" | "bottom"
}) {
    const { arc, saga } = item
    const [auraFrom, auraTo] = arc.arc.colors
    const isComplete = saga.isComplete
    const isTop = position === "top"

    return (
        <article
            id={`saga-slice-${saga.saga.id}`}
            role="tab"
            aria-selected={isActive}
            aria-label={`Saga ${saga.saga.title} — ${saga.percent}% completado`}
            tabIndex={isActive ? 0 : -1}
            onMouseEnter={() => onFocus(saga.saga.id)}
            onFocus={() => onFocus(saga.saga.id)}
            onClick={() => onOpen(saga.saga.id)}
            className="relative flex flex-col justify-center shrink-0 group cursor-pointer snap-center outline-none px-4 md:px-6 w-[280px] xl:w-[340px] h-full"
            style={{ animationDelay: `${entryDelayMs}ms` }}
        >
            {/* Segmento de línea horizontal que se conecta con los demás nodos */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/10 -z-10" />

            {/* Contenedor de Información de la Saga (con mini portada) */}
            <div className={cn(
                "absolute inset-x-4 md:inset-x-6 flex flex-col transition-all duration-500 ease-out",
                isTop ? "bottom-[calc(50%+1rem)]" : "top-[calc(50%+1rem)]",
                isActive ? "opacity-100 scale-105" : "opacity-40 scale-95 group-hover:opacity-100 group-hover:scale-100"
            )}>
                {/* Cuadro con Mini Portada y Texto */}
                <div className={cn(
                    "relative overflow-hidden rounded-2xl border bg-zinc-950/80 backdrop-blur-md transition-all duration-500",
                    isActive ? "border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.1)] ring-1 ring-white/10" : "border-white/10 group-hover:border-white/20"
                )}>
                    {/* Mini Portada (Fondo difuminado o portada superior) */}
                    <div className="relative h-28 xl:h-32 w-full overflow-hidden border-b border-white/10">
                        <img 
                            src={saga.saga.image} 
                            alt="" 
                            className={cn(
                                "w-full h-full object-cover transition-all duration-700",
                                isActive ? "scale-105 saturate-110" : "scale-100 saturate-50"
                            )} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                        {isComplete && (
                            <div className="absolute top-3 right-3">
                                <Icons.ui.checkCircle2 className="w-5 h-5 text-brand-success drop-shadow-md" />
                            </div>
                        )}
                        <span className="absolute bottom-3 left-4 font-mono text-[10px] xl:text-xs uppercase tracking-widest font-bold drop-shadow-md" style={{ color: auraFrom }}>
                            {arc.arc.name}
                        </span>
                    </div>

                    {/* Texto Inferior */}
                    <div className="p-3 xl:p-4 flex flex-col gap-2">
                        <h3 className="font-display text-base xl:text-lg text-white uppercase leading-tight drop-shadow-md">
                            {saga.saga.title}
                        </h3>

                        <div className="flex flex-col gap-1.5 mt-2">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                                {saga.totalEps} Episodios
                            </span>
                            
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden relative">
                                    <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out" 
                                         style={{ width: `${saga.percent}%`, background: `linear-gradient(to right, ${auraFrom}, ${auraTo})` }} />
                                </div>
                                <span className="font-mono text-xs font-bold text-white tabular-nums">{saga.percent}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Línea conector vertical hacia el nodo principal */}
                <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 w-[2px] h-4 bg-gradient-to-b from-white/20 to-transparent",
                    isTop ? "top-full" : "bottom-full rotate-180"
                )} />
            </div>

            {/* Nodo central en la línea de tiempo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-500",
                    isActive ? "scale-[1.8] shadow-[0_0_20px_currentColor]" : "scale-100 opacity-50 group-hover:opacity-100 group-hover:scale-125"
                )} style={{ borderColor: auraTo, backgroundColor: isActive ? auraFrom : "zinc-950", color: auraFrom }} />
            </div>
        </article>
    )
})

/** Tarjeta apilada de saga para mobile/tablet. */
const MobileSagaCard = memo(function MobileSagaCard({
    item,
    onOpen,
}: {
    item: SagaTimelineItem
    onOpen: (id: string) => void
}) {
    const { arc, saga } = item
    const [auraFrom, auraTo] = arc.arc.colors
    const isComplete = saga.percent >= 100

    return (
        <button
            onClick={() => onOpen(item.id)}
            aria-label={`Saga: ${saga.saga.title} — ${saga.percent}% completado`}
            className={cn(
                "relative w-full h-36 overflow-hidden text-left rounded-card border border-white/15",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent shadow-lg",
                "transition-all duration-300 active:scale-[0.98]"
            )}
        >
            <img src={saga.saga.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: `linear-gradient(to right, ${auraTo}E6 0%, ${auraFrom}80 50%, transparent 95%)` }}
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

            <div className="relative z-10 h-full flex flex-col justify-center gap-1 p-5">
                <span className="font-mono text-label-sm uppercase tracking-widest text-white/90 drop-shadow-sm">
                    {arc.arc.name}
                </span>
                <h3 className="font-display text-h3 leading-none uppercase tracking-tight text-white drop-shadow-md">
                    {saga.saga.title}
                </h3>
                <div className="flex items-center gap-3 mt-2 max-w-[75%]">
                    <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden backdrop-blur-sm">
                        <div
                            className="h-full rounded-full shadow-[0_0_8px_currentColor]"
                            style={{ width: `${saga.percent}%`, background: `linear-gradient(to right, ${auraFrom}, ${auraTo})`, color: auraFrom }}
                        />
                    </div>
                    <span className="font-mono text-label-sm text-white drop-shadow-md font-bold tabular-nums">
                        {saga.percent}%
                    </span>
                </div>
            </div>

            {isComplete && (
                <Icons.ui.checkCircle2 className="absolute top-4 right-4 w-5 h-5 text-brand-success drop-shadow-md" />
            )}
        </button>
    )
})

// ─── Drawer de Detalles de la Saga ──────────────────────────────────────────────

function SagaDetailDrawer({
    item,
    open,
    onOpenChange,
}: {
    item: SagaTimelineItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const navigate = useNavigate()
    const { playSound } = useSound()

    const goToEpisode = useCallback(
        (mediaId: number, episodeNumber: number) => {
            onOpenChange(false)
            navigate({
                to: "/series/$seriesId",
                params: { seriesId: String(mediaId) },
                search: { tab: "episodes", saga: "", subSaga: "", autoplay: String(episodeNumber) },
            })
        },
        [navigate, onOpenChange],
    )

    const goToSeries = useCallback(
        (mediaId: number | null, sagaId: string) => {
            if (!mediaId) return
            onOpenChange(false)
            navigate({
                to: "/series/$seriesId",
                params: { seriesId: String(mediaId) },
                search: { tab: "episodes", saga: sagaId, subSaga: "", autoplay: undefined },
            })
        },
        [navigate, onOpenChange],
    )

    if (!item) return null

    const { arc, saga } = item
    const [auraFrom, auraTo] = arc.arc.colors

    // Calculate continue target (first unwatched episode)
    let continueEp: number | null = null
    if (saga.watchedEps < saga.totalEps) {
        continueEp = saga.startEp + saga.watchedEps
    }

    const handleContinue = () => {
        if (!continueEp || !saga.mediaId) return
        playSound("detail")
        goToEpisode(saga.mediaId, continueEp)
    }

    return (
        <Vaul open={open} onOpenChange={onOpenChange}>
            <VaulContent
                data-theme={arc.arc.eraTheme}
                className="bg-zinc-950/95 backdrop-blur-[var(--blur-overlay-xl)] border-t border-outline-variant/20 max-h-[90dvh] flex flex-col focus:outline-none"
            >
                <VisuallyHidden>
                    <VaulDescription>
                        Detalles de la saga {saga.saga.title}.
                    </VaulDescription>
                </VisuallyHidden>

                {/* Header con aura del arco de fondo */}
                <div className="relative overflow-hidden shrink-0">
                    <div
                        aria-hidden
                        className="absolute inset-0 opacity-15"
                        style={{ background: `linear-gradient(135deg, ${auraFrom} 0%, ${auraTo} 70%, transparent 100%)` }}
                    />
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/90" />
                    
                    <div className="relative z-10 px-5 pt-6 pb-5 md:px-8">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <span className="font-mono text-label-sm uppercase tracking-widest text-on-surface-variant font-semibold" style={{ color: auraFrom }}>
                                    {arc.arc.name}
                                </span>
                                <h2 className="font-display text-h1 leading-none uppercase tracking-tight text-white mt-1 drop-shadow-md">
                                    {saga.saga.title}
                                </h2>
                                <p className="text-body-md text-white/80 mt-3 max-w-3xl leading-relaxed drop-shadow-sm">
                                    {saga.saga.description}
                                </p>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                aria-label="Cerrar"
                                className="p-2 rounded-full bg-white/5 text-white/70 hover:text-white hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent transition-all"
                            >
                                <Icons.ui.close className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mt-6">
                            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden shadow-inner">
                                <div
                                    className="h-full rounded-full transition-[width] duration-slower ease-smooth-out shadow-[0_0_10px_currentColor]"
                                    style={{ width: `${saga.percent}%`, background: `linear-gradient(to right, ${auraFrom}, ${auraTo})`, color: auraFrom }}
                                />
                            </div>
                            <span className="font-mono text-label-sm text-white tabular-nums shrink-0 font-bold">
                                {saga.percent}% completado
                            </span>
                        </div>
                        <p className="text-label-sm font-mono uppercase tracking-widest text-white/60 mt-2">
                            {saga.watchedEps} / {saga.totalEps} episodios de la saga vistos
                        </p>

                        <div className="flex flex-wrap gap-4 mt-5">
                            {continueEp && saga.mediaId && (
                                <button
                                    onClick={handleContinue}
                                    className={cn(
                                        "inline-flex items-center gap-2 px-6 py-3 rounded-2xl",
                                        "bg-gradient-to-r from-[var(--era-btn-from)] to-[var(--era-btn-to)]",
                                        "hover:from-[var(--era-btn-hover-from)] hover:to-[var(--era-btn-hover-to)]",
                                        "text-white font-black uppercase tracking-wider text-label-md shadow-lg",
                                        "transition-all duration-base active:scale-[0.98]",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                                    )}
                                >
                                    <Icons.media.play className="w-5 h-5 fill-current" />
                                    Continuar · Ep. {continueEp}
                                </button>
                            )}
                            
                            {saga.mediaId && (
                                <button
                                    onClick={() => goToSeries(saga.mediaId, saga.saga.id)}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-label-md shadow-lg transition-all duration-base active:scale-[0.98]"
                                >
                                    <Icons.media.clapperboard className="w-5 h-5" />
                                    Abrir Serie
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sub-Sagas (si tiene) */}
                {saga.saga.subSagas && saga.saga.subSagas.length > 0 && (
                    <div className={cn(
                        "flex-1 min-h-0 overflow-y-auto px-5 md:px-8 py-4 flex flex-col gap-6 pb-12 relative saga-list-container",
                        open ? "drawer-open" : ""
                    )}>
                        <h3 className="font-display text-h3 text-white uppercase tracking-wider flex items-center gap-2 relative z-10">
                            <Icons.media.queue className="w-5 h-5 text-brand-accent drop-shadow-md" />
                            Arcos Argumentales Menores
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {saga.saga.subSagas.map((sub) => (
                                <div key={sub.id} className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-2">
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                                        Episodios {sub.startEp} - {sub.endEp}
                                    </span>
                                    <h4 className="font-display text-lg text-white uppercase leading-tight drop-shadow-sm">
                                        {sub.title}
                                    </h4>
                                    {sub.description && (
                                        <p className="text-body-sm text-white/70 line-clamp-3">
                                            {sub.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </VaulContent>
        </Vaul>
    )
}

/** Tarjeta de Lore intermedia en la línea de tiempo (Diamante / Tooltip) */
const LoreTimelineNode = memo(function LoreTimelineNode({
    item,
    isActive,
    onFocus,
}: {
    item: LoreTimelineItem
    isActive: boolean
    onFocus: (id: string) => void
}) {
    const { lore } = item

    return (
        <article
            id={`saga-slice-${lore.id}`}
            role="tab"
            aria-selected={isActive}
            aria-label={`Historia: ${lore.title}`}
            tabIndex={isActive ? 0 : -1}
            onMouseEnter={() => onFocus(lore.id)}
            onFocus={() => onFocus(lore.id)}
            className="relative flex flex-col justify-center items-center shrink-0 group cursor-pointer snap-center outline-none px-2 w-[160px] h-full"
        >
            <div className="absolute inset-x-0 h-[1px] bg-white/20 top-1/2" />
            
            <div className="relative z-10 group/lore">
                {/* Diamante central */}
                <div className={cn(
                    "w-6 h-6 rotate-45 border-2 transition-all duration-300 bg-ui-background flex items-center justify-center",
                    isActive ? "border-brand-accent shadow-[0_0_15px_rgba(var(--brand-accent),0.5)] scale-110" : "border-white/30 group-hover:border-white/70"
                )}>
                    <div className={cn(
                        "w-2 h-2 bg-white transition-opacity",
                        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                    )} />
                </div>

                {/* Tooltip con título y descripción */}
                <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 mt-6 w-64 p-4 rounded-xl bg-zinc-950/90 backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-300 pointer-events-none text-center",
                    isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-zinc-950 border-l border-t border-white/10" />
                    <h4 className="font-display text-sm text-brand-accent uppercase mb-2">
                        {lore.title}
                    </h4>
                    <p className="text-xs text-white/70 leading-relaxed font-sans">
                        {lore.description}
                    </p>
                </div>
            </div>
        </article>
    )
})
