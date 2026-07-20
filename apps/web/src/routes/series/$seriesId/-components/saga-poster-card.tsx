import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icons } from "@/components/ui/icons";

export function SagaPosterCard({ src, alt }: { src: string; alt: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div className="w-full max-w-[320px]">
                <div 
                    onClick={() => setIsOpen(true)}
                    className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-elevated group cursor-pointer select-none bg-ui-surface transition-all duration-base hover:-translate-y-1 hover:shadow-modal hover:border-brand-accent/50"
                >
                    <img 
                        src={src} 
                        alt={alt}
                        className="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow ease-smooth-out"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 z-20 bg-gradient-to-t from-scrim/80 via-transparent to-transparent pointer-events-none opacity-60" />

                    {/* Glare Reflex — receta canónica del spotlight (media-spotlight.tsx) */}
                    <div className="absolute inset-0 z-30 overflow-hidden pointer-events-none rounded-xl">
                        <div className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform [transition-duration:1.6s] ease-smooth-out" />
                    </div>
                    
                    {/* Hover Badge */}
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface-container/40 opacity-0 group-hover:opacity-100 transition-opacity duration-base">
                        <span className="text-label-sm uppercase bg-brand-accent text-on-brand-accent font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                            <Icons.ui.info size={12} />
                            Ampliar
                        </span>
                    </div>
                </div>
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-surface-container/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 cursor-zoom-out"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative max-w-[95vw] max-h-[85vh] rounded-container overflow-hidden border border-white/10 shadow-2xl bg-surface-container flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Blurred Background */}
                            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                                <img 
                                    src={src} 
                                    alt=""
                                    className="w-full h-full object-cover blur-2xl scale-110 opacity-50"
                                />
                                <div className="absolute inset-0 bg-surface-container/50" />
                            </div>

                            <img 
                                src={src} 
                                alt={alt} 
                                className="relative z-10 max-w-full max-h-[85vh] object-contain rounded-[inherit]"
                            />
                            
                            {/* Close Button */}
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-surface-container/60 hover:bg-surface-container/80 border border-white/10 flex items-center justify-center text-on-surface transition-colors cursor-pointer"
                                aria-label="Cerrar"
                            >
                                <Icons.ui.close size={20} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}