import { motion } from "motion/react"
import React from "react"
import { cn } from "@/components/ui/core/styling"

export const PAGE_TRANSITION = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: {
        type: "spring",
        damping: 20,
        stiffness: 100,
    },
}

interface PageTransitionProps {
    children: React.ReactNode
    transitionKey: string
    className?: string
}

export function PageTransition({ children, transitionKey, className }: PageTransitionProps) {
    return (
        <motion.div
            key={transitionKey}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={cn("h-full w-full", className)}
        >
            {children}
        </motion.div>
    )
}
