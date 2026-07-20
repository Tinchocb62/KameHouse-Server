import React from "react"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"

interface EmptyStateProps {
    title?: string
    message?: string
    icon?: React.ReactNode
    illustration?: React.ReactNode
    action?: React.ReactNode
    className?: string
}

/**
 * Global friendly empty state with a premium glassmorphic feel.
 */
export function EmptyState({
    title = "No results found",
    message = "Try adjusting your filters or reloading the library.",
    icon,
    illustration,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn(
            "relative flex flex-col items-center justify-center text-center",
            "glass-card px-12 py-16 md:py-24",
            "max-w-2xl mx-auto overflow-hidden shadow-2xl",
            className,
        )}>
            {/* Diffused series colors inside the empty state card */}
            <div className="absolute inset-0 -z-10 overflow-hidden opacity-30 pointer-events-none">
                <div className="absolute top-[-30%] left-[-30%] w-[80%] h-[80%] rounded-full bg-brand-accent/20 blur-[50px]" />
                <div className="absolute bottom-[-30%] right-[-30%] w-[80%] h-[80%] rounded-full bg-indigo-500/20 blur-[50px]" />
            </div>

            {illustration ? (
                <div className="mb-8 opacity-90">{illustration}</div>
            ) : (
                <div className="mb-8 flex h-20 w-20 items-center justify-center border border-white/5 text-white rounded-container" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 50%, transparent)" }}>
                    {icon ?? <Icons.status.ghost className="h-10 w-10 text-brand-accent animate-pulse-slow" />}
                </div>
            )}
            
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">{title}</h3>
            <p className="mt-4 max-w-md text-sm md:text-base text-zinc-400 leading-relaxed mx-auto tracking-wide font-medium">
                {message}
            </p>
            
            {action && (
                <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-slow">
                    {action}
                </div>
            )}
        </div>
    )
}
