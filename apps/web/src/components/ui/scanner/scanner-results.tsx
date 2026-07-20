import React, { useRef } from "react"
import { motion } from "framer-motion"
import { cn } from "@/components/ui/core/styling"
import { Link } from "@tanstack/react-router"
import { LucideChevronRight, LucideHistory, LucideRefreshCw } from "lucide-react"
import { type ScanEvent } from "@/lib/store"
import { type ScannerMessage } from "@/lib/server/ws-events"
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
            border: "border-white/5 hover:border-[#ff6e3a]/40", 
            bg: "bg-zinc-950/45 hover:bg-[#ff6e3a]/[0.01]", 
            glow: "hover:shadow-[0_0_35px_rgba(255,110,58,0.12)]", 
            text: "text-[#ff6e3a]",
            iconBg: "bg-white/5 border-white/5 group-hover:bg-[#ff6e3a]/10 group-hover:border-[#ff6e3a]/25"
        },
        zinc: { 
            border: "border-white/5 hover:border-white/15", 
            bg: "bg-zinc-950/45 hover:bg-white/[0.015]", 
            glow: "hover:shadow-[0_0_35px_rgba(255,255,255,0.03)]", 
            text: "text-zinc-400",
            iconBg: "bg-white/[0.01] border-white/5 group-hover:bg-white/[0.04] group-hover:border-white/10"
        },
    }
    const c = colors[accentColor]

    const baseClasses = cn(
        "group relative block p-7 rounded-[24px] border transition-all duration-500 text-left overflow-hidden backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)]",
        c.border, c.bg, c.glow,
        disabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"
    )

    const content = (
        <div className="relative z-10 space-y-6">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 shadow-inner", c.iconBg)}>
                    {loading ? <LucideRefreshCw size={20} className={cn("animate-spin", c.text)} /> : icon}
                </div>
                <LucideChevronRight size={18} className="text-zinc-650 group-hover:text-[#ff6e3a] group-hover:translate-x-1.5 transition-all duration-500" />
            </div>
            
            <div className="space-y-2 relative z-10">
                <p className="font-display text-4xl text-white tracking-wider uppercase leading-none">{label}</p>
                <p className="text-zinc-500 group-hover:text-zinc-400 text-[11px] leading-relaxed transition-colors duration-500 font-medium">{desc}</p>
            </div>
            
            {/* Background Gradient Pulse */}
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-[#ff6e3a]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
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
                <div className="flex bg-white/[0.02] border border-white/5 rounded-full p-1 self-start gap-1">
                    {["ALL", "START", "PROCESSING", "PRUNED", "FINISH"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setSelectedStatus(status)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300",
                                selectedStatus === status
                                    ? "bg-brand-orange text-white shadow-[0_2px_10px_rgba(255,110,58,0.3)]"
                                    : "text-zinc-500 hover:text-zinc-300"
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
                        className="bg-white/[0.02] border border-white/5 focus:border-brand-orange/40 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none w-full sm:w-56 font-mono transition-all duration-300 focus:shadow-[0_0_15px_rgba(255,110,58,0.08)]"
                    />
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border duration-300 active:scale-95",
                            isPaused
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                                : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                        )}
                    >
                        {isPaused ? "Reanudar" : "Pausar"}
                    </button>
                </div>
            </div>

            {/* Event List Container */}
            <div className="rounded-2xl liquid-glass-frosted relative">
                {isPaused && (
                    <div className="absolute top-3 right-4 z-20 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                        FROZEN FEED
                    </div>
                )}
                <div
                    ref={listRef}
                    className="max-h-80 overflow-y-auto divide-y divide-white/[0.02]"
                >
                    {visibleEvents.length === 0 ? (
                        <div className="p-12 text-center text-zinc-600 uppercase font-black tracking-widest text-[10px]">
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
                                    className="flex items-center gap-5 px-8 py-3.5 hover:bg-white/[0.005] transition-colors"
                                >
                                    <div 
                                        className={cn("w-1.5 h-1.5 rounded-full shrink-0")} 
                                        style={{ 
                                            backgroundColor: evt.status === "START" || evt.status === "FINISH" ? "rgb(255,110,58)" : evt.status === "PRUNED" ? "#f43f5e" : "#71717a",
                                            boxShadow: evt.status === "START" || evt.status === "FINISH" ? "0 0 6px rgb(255,110,58)" : "none"
                                        }}
                                    />
                                    <span className={cn("text-xs font-mono truncate flex-1 leading-normal", color)}>
                                        {getEventLabel(evt)}
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-600 shrink-0">
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
                        whileHover={{ y: -6, scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="bg-[#111113] border border-zinc-800/85 rounded-xl p-3 flex flex-col gap-3 shadow-2xl select-none group cursor-pointer relative overflow-hidden"
                    >
                        {/* Spine of the VHS Tape */}
                        <div className="w-full h-4 bg-[#0a0a0c] rounded border-b border-black/40 flex items-center justify-between px-2">
                            <span className="text-[7px] font-mono font-black text-zinc-700">KAME - VHS</span>
                            <div className="flex gap-0.5">
                                <div className="w-1.5 h-1.5 bg-zinc-800 rounded-full" />
                                <div className="w-1.5 h-1.5 bg-zinc-800 rounded-full" />
                            </div>
                        </div>

                        {/* Adhesive white sticker label */}
                        <div className="rounded bg-[#faf9f5] border border-zinc-300 p-4 flex flex-col justify-between h-36 text-zinc-900 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black font-mono text-black leading-none tracking-tight">
                                        {reportId}
                                    </span>
                                    <span className="text-[8px] font-bold text-zinc-400 mt-1.5 font-mono">
                                        {createdAt} · {timeAt}
                                    </span>
                                </div>
                                <span className={cn(
                                    "text-[8px] font-black font-mono px-2 py-0.5 rounded border leading-none",
                                    hasUnlinked
                                        ? "bg-orange-500/10 text-orange-700 border-orange-500/20"
                                        : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                )}>
                                    {hasUnlinked ? "UNLINKED" : "FINISH"}
                                </span>
                            </div>

                            <div className="flex justify-between items-end border-t border-zinc-200/85 pt-2">
                                <div className="flex flex-col min-w-0 pr-2">
                                    <span className="text-sm font-black font-display tracking-wide text-zinc-800 uppercase leading-none truncate group-hover:text-[#ff6e3a] transition-colors">
                                        {groups[0]?.mediaTitle || "Delta Scan Execution"}
                                    </span>
                                    <span className="text-[10px] font-bold text-zinc-500 font-mono mt-0.5 truncate">
                                        {files} files · {matched} match
                                    </span>
                                </div>
                                
                                {/* Simulated Barcode */}
                                <div className="flex items-end gap-[1.5px] h-6 opacity-75 shrink-0 pl-1">
                                    <div className="w-[1px] h-full bg-zinc-900" />
                                    <div className="w-[2px] h-full bg-zinc-900" />
                                    <div className="w-[1px] h-[75%] bg-zinc-900" />
                                    <div className="w-[3px] h-full bg-zinc-900" />
                                    <div className="w-[1px] h-full bg-zinc-900" />
                                    <div className="w-[2px] h-[60%] bg-zinc-900" />
                                    <div className="w-[1.5px] h-full bg-zinc-900" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )
            })}
        </div>
    )
}
