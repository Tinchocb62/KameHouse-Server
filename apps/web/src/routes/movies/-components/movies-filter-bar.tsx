import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Search, X, ArrowDownUp } from "lucide-react"
import { cn } from "@/components/ui/core/styling"
import { ERA_TABS, EraTab } from "../-MovieCard"
import type { Anime_LibraryCollectionEntry } from "@/api/generated/types"
import { SortOption, SORT_OPTIONS } from "./movies-utils"

interface MoviesFilterBarProps {
    allMovies: (Anime_LibraryCollectionEntry & { era: EraTab; startedAtTimestamp: number })[]
    activeEra: EraTab
    setActiveEra: (era: EraTab) => void
    searchQuery: string
    setSearchQuery: (query: string) => void
    sortBy: SortOption
    setSortBy: (sort: SortOption) => void
    sortOpen: boolean
    setSortOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function MoviesFilterBar({
    allMovies,
    activeEra,
    setActiveEra,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOpen,
    setSortOpen,
}: MoviesFilterBarProps) {
    return (
        <div className="w-full flex flex-col p-6 liquid-glass-frosted rounded-2xl overflow-visible gap-6">
            <h3 className="font-display text-2xl tracking-[0.15em] text-white/90 uppercase flex items-center justify-between flex-shrink-0">
                <span>Filtrar</span>
                <span className="text-[10px] font-mono font-bold tracking-normal text-zinc-400 lowercase px-2.5 py-0.5 bg-white/5 rounded-full">
                    {allMovies.length} películas
                </span>
            </h3>

            {/* Search Input */}
            <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-orange transition-colors" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar Películas..."
                    className="w-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl pl-11 pr-10 py-3 text-[12px] font-sans font-medium tracking-wide text-white placeholder-zinc-400 focus:outline-none focus:border-brand-orange/40 focus:bg-brand-orange/5 focus:ring-4 focus:ring-brand-orange/10 transition-all duration-300"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Sort Section */}
            <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Ordenar por</span>
                <div className="relative w-full">
                    <button
                        onClick={() => setSortOpen((o) => !o)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-[11px] font-sans font-bold uppercase tracking-wider text-zinc-200 hover:text-white hover:border-white/20 transition-all duration-300"
                    >
                        <div className="flex items-center gap-2">
                            <ArrowDownUp className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{SORT_OPTIONS.find((s) => s.value === sortBy)?.label}</span>
                        </div>
                        <motion.span animate={{ rotate: sortOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                        </motion.span>
                    </button>

                    <AnimatePresence>
                        {sortOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="absolute left-0 right-0 top-[calc(100%+6px)] bg-[#0f0f13]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden p-1.5"
                                onMouseLeave={() => setSortOpen(false)}
                            >
                                {SORT_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => {
                                            setSortBy(opt.value)
                                            setSortOpen(false)
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[11px] font-sans font-bold tracking-wide transition-all duration-200",
                                            sortBy === opt.value
                                                ? "text-brand-orange bg-brand-orange/10"
                                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <span>{opt.label}</span>
                                        {sortBy === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Eras Section */}
            <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Eras</span>
                <div className="flex flex-col gap-2">
                    {ERA_TABS.map((tab) => {
                        const count =
                            tab.value === "all"
                                ? allMovies.length
                                : allMovies.filter((m) => m.era === tab.value).length
                        const isActive = activeEra === tab.value

                        return (
                            <motion.button
                                key={tab.value}
                                onClick={() => setActiveEra(tab.value)}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                    "relative flex items-center justify-between h-11 pl-9 pr-4 text-[11px] font-sans font-bold tracking-wider uppercase rounded-xl transition-all duration-300 overflow-hidden select-none border w-full text-left",
                                    isActive
                                        ? "text-white border-transparent"
                                        : "text-zinc-400 border-white/5 bg-white/[0.02] hover:text-white hover:border-white/10 hover:bg-white/[0.05]"
                                )}
                                style={isActive ? {
                                    backgroundColor: tab.color + "15",
                                    borderColor: tab.color + "30",
                                    boxShadow: `0 0 15px ${tab.color}08`,
                                } : {}}
                            >
                                {isActive && (
                                    <div 
                                        className="absolute left-3.5 top-[15px] bottom-[15px] w-1 rounded-full shadow-[0_0_12px_rgba(255,110,58,0.8)]"
                                        style={{ backgroundColor: tab.color }}
                                    />
                                )}
                                
                                <span className="relative z-10 transition-transform duration-300" style={isActive ? { color: tab.color } : {}}>
                                    {tab.label}
                                </span>
                                
                                <span 
                                    className="relative z-10 text-[9px] font-black px-2 py-0.5 rounded-md transition-colors duration-300 flex items-center justify-center min-w-[20px]"
                                    style={{
                                        backgroundColor: isActive ? tab.color + "30" : "rgba(255,255,255,0.06)",
                                        color: isActive ? "#fff" : "rgba(255,255,255,0.6)"
                                    }}
                                >
                                    {count}
                                </span>
                            </motion.button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
