import React from "react"
import { cn } from "@/components/ui/core/styling"
import { ImageOff } from "lucide-react"

interface EmptyStateProps {
    title?: string
    message?: string
    icon?: React.ReactNode
    action?: React.ReactNode
    className?: string
}

/**
 * Global friendly empty state with a subtle glassmorphic card.
 */
export function EmptyState({
    title = "Sin resultados",
    message = "Intenta ajustar tus filtros o vuelve a cargar la biblioteca.",
    icon,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center text-center",
            "rounded-3xl border border-white/10 bg-white/5 px-6 py-12 md:py-16",
            "shadow-[0_10px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl",
            className,
        )}>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white/70">
                {icon ?? <ImageOff className="h-7 w-7" />}
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="mt-2 max-w-xl text-sm text-white/70">{message}</p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    )
}
