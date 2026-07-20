import { motion, AnimatePresence } from "framer-motion"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"
import { DeferredImage } from "@/components/shared/deferred-image"
import { useAppStore, type PlaylistItem } from "@/lib/store"

interface PlayerQueueSidebarProps {
    isOpen: boolean
    onClose: () => void
    playlistQueue: PlaylistItem[]
    currentQueueIndex: number
}

export function PlayerQueueSidebar({
    isOpen,
    onClose,
    playlistQueue,
    currentQueueIndex,
}: PlayerQueueSidebarProps) {
    return (
        <AnimatePresence>
            {isOpen && (
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
                            <h3 className="text-sm font-black tracking-cinema text-white uppercase flex items-center ml-2 [&>*:not(:first-child)]:ml-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                                COLA DE REPRODUCCIÓN
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                            >
                                <Icons.ui.close className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Queue Items List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                            {playlistQueue.map((item, idx) => {
                                const isCurrent = idx === currentQueueIndex

                                return (
                                    <div
                                        key={`${item.id}_${idx}`}
                                        className={cn(
                                            "w-full text-left flex p-3 rounded-xl border transition-all duration-base group relative [&>*:not(:first-child)]:ml-4",
                                            isCurrent
                                                ? "bg-brand-accent/10 border-brand-accent/30 text-white shadow-[0_0_15px_hsl(var(--brand-accent)/0.1)]"
                                                : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.04] hover:border-white/10"
                                        )}
                                    >
                                        {/* Clickable Area to play */}
                                        <div
                                            onClick={() => {
                                                useAppStore.getState().setCurrentQueueIndex(idx)
                                            }}
                                            className="flex-1 flex cursor-pointer [&>*:not(:first-child)]:ml-4"
                                        >
                                            {/* Thumbnail */}
                                            <div className="relative w-28 aspect-video bg-zinc-900 border border-white/5 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                                {item.thumbnail ? (
                                                    <DeferredImage
                                                        src={item.thumbnail}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow"
                                                        showSkeleton={false}
                                                    />
                                                ) : (
                                                    <span className="text-label-sm font-black text-zinc-700">SIN IMAGEN</span>
                                                )}

                                                {/* Dark overlay */}
                                                <div className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--md-sys-color-surface)_20%,transparent)] group-hover:bg-black/0 transition-colors duration-base" />

                                                {/* Play overlay for current or hover */}
                                                <div className={cn(
                                                    "absolute inset-0 flex items-center justify-center transition-all duration-base",
                                                    isCurrent ? "opacity-100 bg-brand-accent/10" : "opacity-0 group-hover:opacity-100 bg-black/40"
                                                )}>
                                                    <svg className={cn(
                                                        "w-5 h-5 drop-shadow-md transition-transform duration-base",
                                                        isCurrent ? "text-brand-accent scale-110" : "text-white scale-90 group-hover:scale-100"
                                                    )} fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* Meta content */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                {item.subtitle && (
                                                    <span className={cn(
                                                        "text-label-sm font-black tracking-widest mb-0.5",
                                                        isCurrent ? "text-brand-accent" : "text-zinc-500"
                                                    )}>
                                                        {item.subtitle.toUpperCase()}
                                                    </span>
                                                )}
                                                <h4 className={cn(
                                                    "text-label-md font-black uppercase tracking-wider truncate leading-tight transition-colors",
                                                    isCurrent ? "text-white" : "text-zinc-300 group-hover:text-white"
                                                )}>
                                                    {item.title}
                                                </h4>
                                            </div>
                                        </div>

                                        {/* Remove button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                useAppStore.getState().removeFromQueue(idx)
                                            }}
                                            className="p-1.5 text-zinc-500 hover:text-status-error self-center hover:bg-white/5 rounded-full transition-all duration-base z-10"
                                            title="Eliminar de la cola"
                                        >
                                            <Icons.ui.close className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )
                            })}

                            {playlistQueue.length === 0 && (
                                <div className="py-20 flex flex-col items-center justify-center text-center [&>*:not(:first-child)]:mt-3">
                                    <p className="text-label-sm text-zinc-500 font-sans tracking-normal uppercase font-bold">
                                        La cola está vacía
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer / Actions */}
                        {playlistQueue.length > 0 && (
                            <div className="p-6 border-t border-white/5 shrink-0 flex justify-between">
                                <button
                                    onClick={() => {
                                        useAppStore.getState().clearQueue()
                                        onClose()
                                    }}
                                    className="w-full py-3 border border-white/10 hover:border-status-error/30 hover:bg-status-error/10 text-zinc-500 hover:text-status-error font-black text-label-sm uppercase tracking-widest rounded-xl transition-all duration-base"
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
