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
    const eraCounts: Record<string, number> = { all: allMovies.length }
    for (let i = 0; i < allMovies.length; i++) {
        const era = allMovies[i].era
        eraCounts[era] = (eraCounts[era] || 0) + 1
    }

    return (
        <div className="w-full flex flex-col p-6 bg-[var(--glass-bg)] backdrop-blur-overlay-md border border-[var(--glass-border)] rounded-container overflow-visible gap-6">
            <h3 className="font-display text-2xl tracking-widest text-on-surface/90 uppercase flex items-center justify-center flex-shrink-0">
                <span>Filtrar</span>
            </h3>

            {/* Search Input */}
            <div className="relative w-full group">
                <Icons.navigation.search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-brand-secondary transition-colors" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar Películas..."
                    // text-base en mobile: iOS Safari hace zoom al enfocar cualquier
                    // input por debajo de 16px. El tamaño de desktop no cambia.
                    className="w-full bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_5%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_8%,transparent)] border border-outline-variant/10 rounded-input pl-11 pr-10 py-3 text-base md:text-caption font-sans font-medium tracking-wide text-on-surface placeholder-zinc-400 focus:outline-none focus:border-brand-secondary/40 focus:bg-brand-secondary/5 focus:ring-4 focus:ring-brand-accent/10 transition-all duration-base"
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
                <span className="text-label-sm font-black uppercase tracking-wider text-on-surface-variant">Ordenar por</span>
                <div ref={dropdownRef} className="relative w-full">
                    <button
                        onClick={() => setSortOpen((o) => !o)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-input bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_5%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_8%,transparent)] border border-outline-variant/10 text-caption font-sans font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface hover:border-outline-variant/20 transition-all duration-base"
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
                                className="absolute left-0 right-0 top-[calc(100%+6px)] backdrop-blur-[var(--blur-overlay-md)] border border-outline-variant/10 rounded-container shadow-elevation-5 z-50 overflow-hidden p-1.5"
                                style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 80%, transparent)" }}
                            >
                                {SORT_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => {
                                            setSortBy(opt.value)
                                            setSortOpen(false)
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-caption font-sans font-bold tracking-wide transition-all duration-base",
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
                <span className="text-label-sm font-black uppercase tracking-wider text-on-surface-variant">Eras</span>
                <div className="flex flex-col gap-2">
                    {ERA_TABS.map((tab) => {
                        const count = eraCounts[tab.value] || 0
                        const isActive = activeEra === tab.value

                        return (
                            <motion.button
                                key={tab.value}
                                onClick={() => setActiveEra(tab.value)}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                    "relative flex items-center justify-between h-11 pl-9 pr-4 text-caption font-sans font-bold tracking-wider uppercase rounded-xl transition-all duration-base overflow-hidden select-none border w-full text-left group",
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
                                        className="absolute left-3.5 top-[14px] bottom-[14px] w-[3px] rounded-full"
                                        style={{ 
                                            backgroundColor: tab.color,
                                            boxShadow: `0 0 10px ${tab.color}`
                                        }}
                                    />
                                )}
                                
                                <span className={cn(
                                    "relative z-10 transition-transform duration-base",
                                    !isActive && "group-hover:translate-x-1"
                                )} style={isActive ? { color: tab.color } : {}}>
                                    {tab.label}
                                </span>
                                
                                <span 
                                    className="relative z-10 text-label-sm font-black px-2 py-0.5 rounded-full transition-colors duration-base flex items-center justify-center min-w-[20px]"
                                    style={{
                                        backgroundColor: isActive ? `color-mix(in srgb, ${tab.color} 19%, transparent)` : "rgba(255,255,255,0.05)",
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
