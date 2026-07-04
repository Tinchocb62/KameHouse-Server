import React, { useRef } from "react"
import { motion } from "framer-motion"
import { cn } from "@/components/ui/core/styling"
import { Link } from "@tanstack/react-router"
import { type ScanEvent } from "@/lib/store"
import { type ScannerMessage } from "@/lib/server/ws-events"
import { Icons } from "@/components/ui/icons"
import { Summary_ScanSummaryItem, Summary_ScanSummaryGroup, Summary_ScanSummaryFile } from "@/api/generated/types"

export function SectionHeader({ label, icon }: { label: string; icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-5">
            <div className="flex items-center gap-3 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
                <span className="text-primary">{icon}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
                    {label}
                </span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        </div>
    )
}

export function ScanActionCard({
    label, desc, icon, onClick, disabled, loading, to, accentColor
}: {
    label: string
    desc: string
    icon: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    loading?: boolean
    to?: string
    accentColor: "white" | "zinc"
}) {
    const cardRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null)

    const colors: Record<string, { border: string; bg: string; glow: string; text: string; iconBg: string }> = {
        white: { 
            border: "border-outline-variant hover:border-brand-accent/40", 
            bg: "bg-surface-container hover:bg-surface-container-high", 
            glow: "hover:shadow-elevation-2 hover:shadow-brand-accent/10", 
            text: "text-brand-accent",
            iconBg: "bg-surface-container-high border-outline-variant group-hover:bg-brand-accent/10 group-hover:border-brand-accent/25"
        },
        zinc: { 
            border: "border-outline-variant hover:border-outline", 
            bg: "bg-surface-container hover:bg-surface-container-high", 
            glow: "hover:shadow-elevation-1", 
            text: "text-on-surface-variant",
            iconBg: "bg-surface-container-high border-outline-variant group-hover:bg-surface-container-highest group-hover:border-outline"
        },
    }
    const c = colors[accentColor]

    const baseClasses = cn(
        "group relative block p-7 rounded-[24px] border transition-all duration-500 text-left overflow-hidden",
        c.border, c.bg, c.glow,
        disabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"
    )

    const content = (
        <div className="relative z-10 space-y-6">
            <div className="absolute inset-0 bg-gradient-to-b from-brand-accent/[0.01] to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 shadow-inner", c.iconBg)}>
                    {loading ? <Icons.ui.refresh size={20} className={cn("animate-spin", c.text)} /> : icon}
                </div>
                <Icons.navigation.chevronRight size={18} className="text-on-surface-variant group-hover:text-brand-accent group-hover:translate-x-1.5 transition-all duration-500" />
            </div>
            
            <div className="space-y-2 relative z-10">
                <p className="font-bebas text-4xl text-on-surface tracking-wider uppercase leading-none">{label}</p>
                <p className="text-on-surface-variant group-hover:text-on-surface text-caption leading-relaxed transition-colors duration-500 font-medium">{desc}</p>
            </div>
            
            {/* Background Gradient Pulse */}
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-brand-accent/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
        </div>
    )

    if (to) {
        return (
            <Link to={to as "/home"} className={baseClasses}>
                {content}
            </Link>
        )
    }

    return (
        <button
            ref={cardRef as React.RefObject<HTMLButtonElement>}
            onClick={onClick}
            disabled={disabled}
            type="button"
            className={baseClasses}
        >
            {content}
        </button>
    )
}

export function EventFeed({ events }: { events: ScanEvent[] }) {
    const listRef = useRef<HTMLDivElement>(null)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL")
    const [isPaused, setIsPaused] = React.useState(false)
    const [frozenEvents, setFrozenEvents] = React.useState<ScanEvent[]>([])

    // Sync or freeze events
    React.useEffect(() => {
        if (!isPaused) {
            const timer = setTimeout(() => {
                setFrozenEvents(events)
            }, 0)
            return () => clearTimeout(timer)
        }
    }, [events, isPaused])

    const getEventColor = (status: ScannerMessage["status"]) => {
        switch (status) {
            case "START": return "text-blue-400"
            case "PROCESSING": return "text-zinc-400"
            case "PRUNED": return "text-rose-400"
            case "FINISH": return "text-emerald-400"
            default: return "text-zinc-500"
        }
    }

    const getEventLabel = (evt: ScanEvent) => {
        switch (evt.status) {
            case "START": return "Escaneo iniciado"
            case "PROCESSING":
                return evt.file
                    ? `Procesando: ${evt.file}`
                    : `Archivo ${evt.current ?? "?"} de ${evt.total ?? "?"}`
            case "PRUNED":
                return `Purgados ${evt.removed ?? 0} archivos de la DB`
            case "FINISH":
                return evt.total_processed
                    ? `Completado — ${evt.total_processed} archivos en ${(evt.duration_seconds ?? 0).toFixed(1)}s`
                    : "Completado sin cambios"
            default: return evt.status
        }
    }

    const filteredEvents = React.useMemo(() => {
        return frozenEvents.filter(evt => {
            const label = getEventLabel(evt).toLowerCase()
            const matchesSearch = label.includes(searchQuery.toLowerCase())
            const matchesStatus = selectedStatus === "ALL" || evt.status === selectedStatus
            return matchesSearch && matchesStatus
        })
    }, [frozenEvents, searchQuery, selectedStatus])

    const visibleEvents = filteredEvents.slice(0, 100)

    return (
        <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                {/* macOS style Pill Selector */}
                <div className="flex bg-surface-container-high border border-outline-variant/30 rounded-full p-1 self-start gap-1">
                    {["ALL", "START", "PROCESSING", "PRUNED", "FINISH"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setSelectedStatus(status)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300",
                                selectedStatus === status
                                    ? "bg-brand-accent text-zinc-950 shadow-elevation-1"
                                    : "text-on-surface-variant hover:text-on-surface"
                            )}
                        >
                            {status === "ALL" ? "Todos" : status}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar en logs..."
                        className="bg-surface-container-high border border-outline-variant/30 focus:border-brand-accent/40 rounded-xl px-4 py-2 text-xs text-on-surface placeholder-on-surface-variant focus:outline-none w-full sm:w-56 font-mono transition-all duration-300 focus:shadow-[var(--shadow-brand-accent)]"
                    />
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border duration-300 active:scale-95",
                            isPaused
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-elevation-1"
                                : "bg-surface-container-high border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                        )}
                    >
                        {isPaused ? "Reanudar" : "Pausar"}
                    </button>
                </div>
            </div>

            {/* Event List Container */}
            <div className="rounded-2xl bg-surface-container border border-outline-variant relative">
                {isPaused && (
                    <div className="absolute top-3 right-4 z-20 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                        FROZEN FEED
                    </div>
                )}
                <div
                    ref={listRef}
                    className="max-h-80 overflow-y-auto divide-y divide-outline-variant/10"
                >
                    {visibleEvents.length === 0 ? (
                        <div className="p-12 text-center text-on-surface-variant/60 uppercase font-black tracking-widest text-[10px]">
                            No se encontraron logs coincidentes
                        </div>
                    ) : (
                        visibleEvents.map((evt: ScanEvent & { id?: string; timestamp: number }) => {
                            const color = getEventColor(evt.status)
                            return (
                                <motion.div
                                    key={evt.id || `${evt.timestamp}`}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-5 px-8 py-3.5 hover:bg-surface-container-high transition-colors"
                                >
                                    <div 
                                        className={cn("w-1.5 h-1.5 rounded-full shrink-0")} 
                                        style={{ 
                                            backgroundColor: evt.status === "START" || evt.status === "FINISH" ? "hsl(var(--brand-accent))" : evt.status === "PRUNED" ? "hsl(var(--brand-destructive))" : "hsl(var(--md-sys-color-outline))",
                                            boxShadow: evt.status === "START" || evt.status === "FINISH" ? "var(--shadow-brand-accent)" : "none"
                                        }}
                                    />
                                    <span className={cn("text-xs font-mono truncate flex-1 leading-normal", color)}>
                                        {getEventLabel(evt)}
                                    </span>
                                    <span className="text-[10px] font-mono text-on-surface-variant shrink-0">
                                        {new Date(evt.timestamp).toLocaleTimeString()}
                                    </span>
                                </motion.div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}

export function ScanHistory({ summaries }: { summaries: Summary_ScanSummaryItem[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {summaries.map((s, idx) => {
                const groups: Summary_ScanSummaryGroup[] = s.scanSummary?.groups ?? []
                const unmatched: Summary_ScanSummaryFile[] = s.scanSummary?.unmatchedFiles ?? []
                const matchedCount = groups.reduce((acc: number, g: Summary_ScanSummaryGroup) => acc + (g.files?.length ?? 0), 0)
                const totalCount = matchedCount + unmatched.length

                const files = totalCount > 0 ? totalCount : "?"
                const matched = matchedCount > 0 || totalCount > 0 ? matchedCount : "?"

                const createdAt = s.createdAt ? new Date(s.createdAt).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }) : "—"
                
                const timeAt = s.createdAt ? new Date(s.createdAt).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                }) : ""

                const hasUnlinked = unmatched.length > 0
                const reportId = `REP_${hasUnlinked ? "FAST" : "FULL"}_${(summaries.length - idx).toString().padStart(3, '0')}`

                return (
                    <motion.div 
                        key={idx} 
                        whileHover={{ y: -2 }}
                        className="bg-surface-container border border-outline-variant hover:border-outline-variant/80 rounded-xl p-4 flex flex-col gap-4 shadow-elevation-1 hover:shadow-elevation-2 select-none group cursor-pointer transition-all"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <span className="text-label-sm font-black font-mono text-on-surface leading-none tracking-tight">
                                    {reportId}
                                </span>
                                <span className="text-caption font-bold text-on-surface-variant mt-1.5 font-mono">
                                    {createdAt} · {timeAt}
                                </span>
                            </div>
                            <span className={cn(
                                "text-[9px] font-black font-mono px-2 py-0.5 rounded border leading-none tracking-widest uppercase",
                                hasUnlinked
                                    ? "bg-brand-destructive/10 text-brand-destructive border-brand-destructive/20"
                                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            )}>
                                {hasUnlinked ? "UNLINKED" : "FINISH"}
                            </span>
                        </div>

                        <div className="flex flex-col border-t border-outline-variant/30 pt-3 mt-1">
                            <span className="text-sm font-black font-bebas tracking-wide text-on-surface uppercase leading-none truncate group-hover:text-brand-accent transition-colors">
                                {groups[0]?.mediaTitle || "Delta Scan Execution"}
                            </span>
                            <span className="text-caption font-bold text-on-surface-variant font-mono mt-1.5 truncate">
                                {files} files · {matched} match
                            </span>
                        </div>
                    </motion.div>
                )
            })}
        </div>
    )
}
