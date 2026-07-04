import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/components/ui/core/styling"
import { DeferredImage } from "@/components/shared/deferred-image"

interface Episode {
    title?: string
    episodeNumber: number
    absoluteEpisodeNumber?: number
    thumbnail?: string
    watched?: boolean
}

interface PlayerEpisodesSidebarProps {
    isOpen: boolean
    onClose: () => void
    episodes: Episode[]
    currentEpisodeNumber?: number
    onSelectEpisode?: (episodeNumber: number) => void
    marathonMode?: boolean
    onMarathonModeChange?: (enabled: boolean) => void
}

export function PlayerEpisodesSidebar({
    isOpen,
    onClose,
    episodes,
    currentEpisodeNumber,
    onSelectEpisode,
    marathonMode = false,
    onMarathonModeChange,
}: PlayerEpisodesSidebarProps) {
    return (
        <AnimatePresence>
            {isOpen && episodes && episodes.length > 0 && (
                <>
                    {/* Backdrop overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 z-[150] bg-black/60 backdrop-blur-[var(--blur-overlay-sm)] pointer-events-auto"
                    />

                    {/* Sidebar Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="absolute right-0 top-0 bottom-0 w-full sm:w-[400px] z-[160] bg-surface-container border-l border-white/15 flex flex-col shadow-2xl pointer-events-auto select-none"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                            <h3 className="text-sm font-black tracking-[0.25em] text-white uppercase flex items-center ml-2 [&>*:not(:first-child)]:ml-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
                                EPISODIOS
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Marathon Mode Toggle */}
                        {onMarathonModeChange && (
                            <div className="px-6 py-3 border-b border-white/5">
                                <button
                                    onClick={() => onMarathonModeChange(!marathonMode)}
                                    className={cn(
                                        "flex items-center justify-between w-full p-3 rounded-xl border transition-all duration-300",
                                        marathonMode
                                            ? "bg-brand-orange/10 border-brand-orange/30 text-white"
                                            : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white"
                                    )}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest">Modo Maratón</span>
                                    <div className={cn(
                                        "w-8 h-4 rounded-full relative transition-all duration-300",
                                        marathonMode ? "bg-brand-orange" : "bg-surface-variant"
                                    )}>
                                        <div className={cn(
                                            "absolute top-[2px] w-2.5 h-2.5 rounded-full transition-all duration-300",
                                            marathonMode ? "left-[17px] bg-white" : "left-[3px] bg-zinc-400"
                                        )} />
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Episodes List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                            {episodes.map((ep) => {
                                const epNum = ep.absoluteEpisodeNumber ?? ep.episodeNumber
                                const isCurrent = epNum === currentEpisodeNumber

                                return (
                                    <button
                                        key={epNum}
                                        onClick={() => {
                                            if (onSelectEpisode) {
                                                onSelectEpisode(epNum)
                                            }
                                            onClose()
                                        }}
                                        className={cn(
                                            "w-full text-left flex p-3 rounded-xl border transition-all duration-300 group [&>*:not(:first-child)]:ml-4",
                                            isCurrent
                                                ? "bg-brand-orange/10 border-brand-orange/30 text-white shadow-[0_0_15px_rgba(255,110,58,0.1)]"
                                                : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.04] hover:border-white/10"
                                        )}
                                    >
                                        {/* Thumbnail / Image container */}
                                        <div className="relative w-28 aspect-video bg-zinc-900 border border-white/5 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                            {ep.thumbnail ? (
                                                <DeferredImage
                                                    src={ep.thumbnail}
                                                    alt={ep.title || `Episodio ${epNum}`}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    showSkeleton={false}
                                                />
                                            ) : (
                                                <span className="text-[10px] font-black text-zinc-700">SIN IMAGEN</span>
                                            )}

                                            {/* Dark overlay */}
                                            <div className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--md-sys-color-surface)_20%,transparent)] group-hover:bg-black/0 transition-colors duration-300" />

                                            {/* Play overlay for current or hover */}
                                            <div className={cn(
                                                "absolute inset-0 flex items-center justify-center transition-all duration-300",
                                                isCurrent ? "opacity-100 bg-brand-orange/10" : "opacity-0 group-hover:opacity-100 bg-black/40"
                                            )}>
                                                <svg className={cn(
                                                    "w-5 h-5 drop-shadow-md transition-transform duration-300",
                                                    isCurrent ? "text-brand-orange scale-110" : "text-white scale-90 group-hover:scale-100"
                                                )} fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Meta content */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-center mb-1 [&>*:not(:first-child)]:ml-2">
                                                <span className={cn(
                                                    "text-[9px] font-black tracking-widest",
                                                    isCurrent ? "text-brand-orange" : "text-zinc-500"
                                                )}>
                                                    EPISODIO {epNum}
                                                </span>

                                                {ep.watched && (
                                                    <span className="flex items-center justify-center w-3 h-3 rounded-full bg-green-500/20 text-green-500 border border-green-500/30">
                                                        <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className={cn(
                                                "text-[11px] font-black uppercase tracking-wider truncate leading-tight transition-colors",
                                                isCurrent ? "text-white" : "text-zinc-300 group-hover:text-white"
                                            )}>
                                                {ep.title || `Episodio ${epNum}`}
                                            </h4>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
