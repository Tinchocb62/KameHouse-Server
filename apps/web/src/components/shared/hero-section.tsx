import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/components/ui/core/styling"

interface HeroSectionProps {
    title: React.ReactNode // Usually "MI<br/><span...>...</span>"
    subtitle?: string
    decorationTag?: string
    verticalTag?: string
    count?: number | string
    countLabel?: string
    children?: React.ReactNode // Extra content like stats or buttons
    className?: string
    maxWidth?: string
}

export function HeroSection({
    title,
    subtitle,
    decorationTag = "Colección Premium",
    verticalTag = "BIBLIOTECA · COLECCIÓN · ARCHIVOS",
    count,
    countLabel = "Títulos",
    children,
    className,
    maxWidth = "max-w-none"
}: HeroSectionProps) {
    return (
        <div className={cn("relative overflow-hidden pt-20 sm:pt-24 pb-10 sm:pb-14 px-4 sm:px-6 md:px-14", className)}>
            {/* Cinematic Glow & Decorations */}
            <div className="absolute top-[-160px] left-[-80px] w-[640px] h-[520px] rounded-full bg-gradient-to-br from-brand-accent to-brand-secondary opacity-[0.08] blur-[120px] pointer-events-none" />
            <SpeedLines opacity={0.03} />
            <HalftoneDots />
            
            {/* Vertical Decoration */}
            <div className="hidden sm:block absolute right-6 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] font-black text-label-sm tracking-cinema-xl text-on-surface-variant/30 uppercase pointer-events-none select-none">
                {verticalTag}
            </div>

            <div className={cn("relative z-10 mx-auto", maxWidth)}>
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3 mb-4"
                >
                    <div className="h-[2px] w-8 bg-brand-accent shadow-[0_0_15px_hsl(var(--brand-accent)/0.5)]" />
                    <p className="text-label-sm font-black uppercase tracking-cinema-lg text-brand-accent/90">{decorationTag}</p>
                </motion.div>
                
                <motion.h1 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="font-display text-3xl sm:text-6xl md:text-8xl lg:text-9xl leading-[0.9] sm:leading-[0.8] tracking-wide text-white"
                >
                    {title}
                </motion.h1>

                {subtitle && (
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="font-display text-xl sm:text-3xl md:text-5xl tracking-widest text-white mt-4 uppercase"
                    >
                        {subtitle}
                    </motion.p>
                )}
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-12"
                >
                    {count !== undefined && (
                        <div className="inline-block px-4 py-2 bg-surface-container border border-outline-variant">
                            <p className="text-label-md font-black text-on-surface tabular-nums uppercase tracking-widest">
                                {count} <span className="text-label-sm font-black text-on-surface-variant/60 uppercase ml-2 tracking-widest">{countLabel}</span>
                            </p>
                        </div>
                    )}
                    {children}
                </motion.div>
            </div>
            
            <style>{`
                .stroke-text {
                    -webkit-text-stroke: 1.5px white;
                }
            `}</style>
        </div>
    )
}

// ─── Shared Cinematic Decorations ───────────────────────

function SpeedLines({ opacity = 0.04 }: { opacity?: number }) {
    return (
        <svg
            aria-hidden
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity }}
            viewBox="0 0 900 320"
            preserveAspectRatio="xMidYMid slice"
        >
            {Array.from({ length: 32 }).map((_, i) => {
                const angle = (i / 32) * 360
                const rad = (angle * Math.PI) / 180
                return (
                    <line
                        key={i}
                        x1="450" y1="160"
                        x2={450 + Math.cos(rad) * 1400}
                        y2={160 + Math.sin(rad) * 1400}
                        stroke="white"
                        strokeWidth={i % 4 === 0 ? "1.5" : "0.6"}
                    />
                )
            })}
        </svg>
    )
}

function HalftoneDots() {
    return (
        <svg
            aria-hidden
            className="absolute inset-0 w-full h-full opacity-[0.025] pointer-events-none"
        >
            <defs>
                <pattern id="dots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                    <circle cx="6" cy="6" r="1.5" fill="white" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
    )
}