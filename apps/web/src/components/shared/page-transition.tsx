import React from "react"
import { cn } from "@/components/ui/core/styling"

interface PageTransitionProps {
    children: React.ReactNode
    transitionKey: string
    className?: string
}

export function PageTransition({ children, transitionKey, className }: PageTransitionProps) {
    return (
        <div
            key={transitionKey}
            className={cn("h-full w-full flex flex-col animate-in fade-in duration-200", className)}
        >
            {children}
        </div>
    )
}
