"use no memo"

import { motion, type HTMLMotionProps, type Variants } from "framer-motion"
import React from "react"
import { cn } from "@/components/ui/core/styling"

interface StaggerContainerProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode
    staggerDelay?: number
    delayChildren?: number
    className?: string
}

export const containerVariants = (staggerDelay = 0.05, delayChildren = 0): Variants => ({
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: staggerDelay,
            delayChildren: delayChildren,
        },
    },
})

export const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
        },
    },
}

export function StaggerContainer({
    children,
    staggerDelay = 0.05,
    delayChildren = 0,
    className,
    ...props
}: StaggerContainerProps) {
    return (
        <motion.div
            variants={containerVariants(staggerDelay, delayChildren)}
            initial="hidden"
            animate="show"
            className={cn("w-full transform-gpu", className)}
            {...props}
        >
            {children}
        </motion.div>
    )
}

export function StaggerItem({ children, className, ...props }: HTMLMotionProps<"div">) {
    return (
        <motion.div variants={itemVariants} className={cn("transform-gpu will-change-[transform,opacity]", className)} {...props}>
            {children}
        </motion.div>
    )
}
