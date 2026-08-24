import { cva } from "class-variance-authority"
import * as React from "react"
import { cn, defineStyleAnatomy } from "../core/styling"

/* -------------------------------------------------------------------------------------------------
 * Anatomy
 * -----------------------------------------------------------------------------------------------*/

export const SkeletonAnatomy = defineStyleAnatomy({
    root: cva([
        "relative overflow-hidden rounded-[--radius-md] bg-zinc-900/50 w-full h-12 border border-white/5",
        // Shimmer effect
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent",
    ]),
})

/* -------------------------------------------------------------------------------------------------
 * Skeleton
 * -----------------------------------------------------------------------------------------------*/

export type SkeletonProps = React.ComponentPropsWithoutRef<"div">

const SKELETON_BASE_CLASS = SkeletonAnatomy.root()

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>((props, ref) => {
    const { className, ...rest } = props
    return (
        <div
            ref={ref}
            className={className ? cn(SKELETON_BASE_CLASS, className) : SKELETON_BASE_CLASS}
            {...rest}
        />
    )
})

Skeleton.displayName = "Skeleton"
