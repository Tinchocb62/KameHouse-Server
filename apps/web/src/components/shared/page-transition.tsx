"use no memo"

import { motion } from "framer-motion"
import React from "react"
import { cn } from "@/components/ui/core/styling"

interface PageTransitionProps {
    children: React.ReactNode
    transitionKey: string
    className?: string
}

export function PageTransition({ children, transitionKey, className }: PageTransitionProps) {
    return (
        <motion.div
            key={transitionKey}
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={cn("h-full w-full flex flex-col transform-gpu will-change-[transform,opacity]", className)}
        >
            {children}
        </motion.div>
    )
}
