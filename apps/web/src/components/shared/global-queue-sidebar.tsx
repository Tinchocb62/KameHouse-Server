import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Icons } from "@/components/ui/icons"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { cn } from "@/components/ui/core/styling"
import { DeferredImage } from "@/components/shared/deferred-image"

export const GlobalQueueSidebar = () => {
    const {
        playlistQueue,
        currentQueueIndex,
        globalQueueOpen,
        setGlobalQueueOpen,
        removeFromQueue,
        clearQueue,
        setCurrentQueueIndex,
    } = useAppStore(useShallow(state => ({
        playlistQueue: state.playlistQueue,
        currentQueueIndex: state.currentQueueIndex,
        globalQueueOpen: state.globalQueueOpen,
        setGlobalQueueOpen: state.setGlobalQueueOpen,
        removeFromQueue: state.removeFromQueue,
        clearQueue: state.clearQueue,
        setCurrentQueueIndex: state.setCurrentQueueIndex,
    })))

    return (
        <AnimatePresence>
            {globalQueueOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setGlobalQueueOpen(false)}
                        className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-overlay-sm pointer-events-auto"
                    />

                    {/* Sidebar Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] z-[9995] backdrop-blur-overlay-xl border-l border-outline-variant flex flex-col shadow-elevation-4 pointer-events-auto select-none"
                        style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 90%, transparent)" }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-outline-variant/30 shrink-0">
                            <h3 className="text-sm font-black tracking-cinema text-on-surface uppercase flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                                Cola de Reproducción ({playlistQueue.length})
                            </h3>
                            <button
                                onClick={() => setGlobalQueueOpen(false)}
                                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-all duration-base"
                            >
                                <Icons.ui.close className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Queue Items List */}
                        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 no-scrollbar">
                            {playlistQueue.slice(0, Math.max(50, currentQueueIndex + 10)).map((item, idx) => {
                                const isCurrent = idx === currentQueueIndex
                                const isHistory = idx < currentQueueIndex

                                return (
                                    <div
                                        key={`${item.id}_${idx}`}
                                        className={cn(
                                            "w-full text-left flex gap-2.5 sm:gap-4 p-2.5 sm:p-3 rounded-xl border transition-all duration-base group relative items-center",
                                            isCurrent
                                                ? "bg-brand-accent/10 border-brand-accent/30 text-on-surface shadow-elevation-1"
                                                : isHistory
                                                    ? "bg-surface-container-low border-outline-variant/20 opacity-50 hover:opacity-80"
                                                    : "bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container hover:border-outline-variant"
                                        )}
                                    >
                                        {/* Clickable Area to play */}
                                        <div
                                            onClick={() => {
                                                setCurrentQueueIndex(idx)
                                            }}
                                            className="flex-1 flex gap-2.5 sm:gap-4 cursor-pointer min-w-0 items-center"
                                        >
                                            {/* Thumbnail */}
                                            <div className="relative w-20 sm:w-28 aspect-video bg-surface border border-outline-variant/30 rounded-lg sm:rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                                                {item.thumbnail ? (
                                                    <DeferredImage
                                                        src={item.thumbnail}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow"
                                                        showSkeleton={false}
                                                    />
                                                ) : (
                                                    <span className="text-label-sm font-black text-on-surface-variant/40">SIN IMAGEN</span>
                                                )}

                                                {/* Play overlay */}
                                                <div className={cn(
                                                    "absolute inset-0 flex items-center justify-center transition-all duration-base",
                                                    isCurrent 
                                                        ? "opacity-100 bg-brand-accent/10" 
                                                        : "opacity-0 group-hover:opacity-100 bg-black/50"
                                                )}>
                                                    {isCurrent ? (
                                                        <div className="flex gap-1 items-end h-4">
                                                            <div className="w-1 bg-brand-accent h-3 animate-[pulse_0.8s_infinite_alternate]" />
                                                            <div className="w-1 bg-brand-accent h-4 animate-[pulse_0.6s_infinite_alternate_0.2s]" />
                                                            <div className="w-1 bg-brand-accent h-2.5 animate-[pulse_1s_infinite_alternate_0.1s]" />
                                                        </div>
                                                    ) : (
                                                        <Icons.media.play className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Meta content */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                {item.subtitle && (
                                                    <span className={cn(
                                                        "text-label-sm font-black tracking-widest mb-0.5 truncate",
                                                        isCurrent ? "text-brand-accent" : "text-on-surface-variant"
                                                    )}>
                                                        {item.subtitle.toUpperCase()}
                                                    </span>
                                                )}
                                                <h4 className={cn(
                                                    "text-caption font-bold tracking-wide truncate leading-tight transition-colors",
                                                    isCurrent ? "text-on-surface" : "text-on-surface-variant/80 group-hover:text-on-surface"
                                                )}>
                                                    {item.title}
                                                </h4>
                                            </div>
                                        </div>

                                        {/* Remove button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                removeFromQueue(idx)
                                            }}
                                            className="p-2 text-on-surface-variant hover:text-status-error self-center hover:bg-surface-container rounded-xl transition-all duration-base z-10"
                                            title="Eliminar de la cola"
                                        >
                                            <Icons.ui.trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                )
                            })}

                            {playlistQueue.length === 0 && (
                                <div className="py-24 flex flex-col items-center justify-center text-center gap-4">
                                    <div className="p-4 rounded-full bg-surface-container-low border border-outline-variant/30 text-on-surface-variant/60 animate-pulse">
                                        <Icons.navigation.film className="w-8 h-8" />
                                    </div>
                                    <p className="text-caption text-on-surface-variant uppercase tracking-widest font-black">
                                        La cola está vacía
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {playlistQueue.length > 0 && (
                            <div className="p-6 border-t border-outline-variant/30 shrink-0 flex justify-between gap-4">
                                <button
                                    onClick={() => {
                                        clearQueue()
                                        setGlobalQueueOpen(false)
                                    }}
                                    className="w-full py-3.5 border border-outline-variant hover:border-destructive/30 hover:bg-destructive/10 text-on-surface-variant hover:text-destructive font-black text-label-sm uppercase tracking-widest rounded-pill transition-all duration-base"
                                >
                                    Vaciar Cola
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
