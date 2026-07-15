import { motion, AnimatePresence } from "framer-motion"
import { useRef, useEffect } from "react"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"
import { ERA_TABS, EraTab } from "../-MovieCard"
import type { Anime_LibraryCollectionEntry } from "@/api/generated/types"
import { SortOption, SORT_OPTIONS } from "./movies-utils"
import { useThemeSettings } from "@/lib/theme/theme-hooks"

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
    const ts = useThemeSettings()
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!sortOpen) return
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setSortOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [sortOpen, setSortOpen])
    return (
        <div className="w-full flex flex-col p-6 bg-[var(--glass-bg)] backdrop-blur-overlay-md border border-[var(--glass-border)] rounded-container overflow-visible gap-6">
            <h3 className="font-bebas text-2xl tracking-widest text-on-surface/90 uppercase flex items-center justify-between flex-shrink-0">
                <span>Filtrar</span>
                <span className="text-[10px] font-mono font-bold tracking-normal text-on-surface-variant lowercase px-2.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 5%, transparent)" }}>
                    {allMovies.length} películas
                </span>
            </h3>

            {/* Search Input */}
            <div className="relative w-full group">
                <Icons.navigation.search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-brand-secondary transition-colors" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar Películas..."
                    className="w-full bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_5%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_8%,transparent)] border border-outline-variant/10 rounded-xl pl-11 pr-10 py-3 text-[12px] font-sans font-medium tracking-wide text-on-surface placeholder-zinc-400 focus:outline-none focus:border-brand-secondary/40 focus:bg-brand-secondary/5 focus:ring-4 focus:ring-brand-orange/10 transition-all duration-300"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface hover:bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_10%,transparent)] rounded-full transition-colors"
                    >
                        <Icons.ui.close className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Sort Section */}
            <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Ordenar por</span>
                <div ref={dropdownRef} className="relative w-full">
                    <button
                        onClick={() => setSortOpen((o) => !o)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_5%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_8%,transparent)] border border-outline-variant/10 text-[11px] font-sans font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface hover:border-outline-variant/20 transition-all duration-300"
                    >
                        <div className="flex items-center gap-2">
                            <Icons.arrow.downUp className="w-3.5 h-3.5 text-on-surface-variant" />
                            <span>{SORT_OPTIONS.find((s) => s.value === sortBy)?.label}</span>
                        </div>
                        <motion.span animate={{ rotate: sortOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <Icons.navigation.chevronDown className="w-3.5 h-3.5 text-on-surface-variant" />
                        </motion.span>
                    </button>

                    <AnimatePresence>
                        {sortOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="absolute left-0 right-0 top-[calc(100%+6px)] backdrop-blur-overlay-xl border border-outline-variant/10 rounded-xl shadow-elevation-5 z-50 overflow-hidden p-1.5"
                                style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 95%, transparent)" }}
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
                                                ? "text-brand-secondary bg-brand-secondary/10"
                                                : "text-on-surface-variant hover:text-on-surface hover:bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_5%,transparent)]"
                                        )}
                                    >
                                        <span>{opt.label}</span>
                                        {sortBy === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-brand-secondary" />}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Eras Section */}
            {!ts.themeDisableLibraryScreenGenreSelector && (
            <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Eras</span>
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
                                        ? "text-on-surface border-transparent"
                                        : "text-on-surface-variant border-outline-variant/5 bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_2%,transparent)] hover:text-on-surface hover:border-outline-variant/10 hover:bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_5%,transparent)]"
                                )}
                                style={isActive ? {
                                    backgroundColor: `color-mix(in srgb, ${tab.color} 8%, transparent)`,
                                    borderColor: `color-mix(in srgb, ${tab.color} 19%, transparent)`,
                                    boxShadow: `0 0 15px color-mix(in srgb, ${tab.color} 3%, transparent)`,
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
                                        backgroundColor: isActive ? `color-mix(in srgb, ${tab.color} 19%, transparent)` : "var(--glass-border-side)",
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
            )}
        </div>
    )
}
