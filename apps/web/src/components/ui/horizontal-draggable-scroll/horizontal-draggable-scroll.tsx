import { cva } from "class-variance-authority"
import * as React from "react"
import { useIsomorphicLayoutEffect, useUpdateEffect } from "../core/hooks"
import { cn, ComponentAnatomy, defineStyleAnatomy } from "../core/styling"
import { useDraggableScroll } from "./use-draggable-scroll"

/* -------------------------------------------------------------------------------------------------
 * Anatomy
 * -----------------------------------------------------------------------------------------------*/

const HorizontalDraggableScrollAnatomy = defineStyleAnatomy({
    root: cva([
        "UI-HorizontalDraggableScroll__root",
        "relative flex items-center lg:[&>*:not(:first-child)]:ml-2",
    ]),
    container: cva([
        "UI-HorizontalDraggableScroll__container",
        "flex max-w-full w-full overflow-x-scroll scrollbar-hide scroll select-none",
    ]),
    chevronOverlay: cva([
        "flex flex-none items-center justify-center cursor-pointer absolute z-40 group/chevron",
        "h-full w-24 opacity-90 hover:opacity-100 transition-all duration-500",
        "data-[state=hidden]:opacity-0 data-[state=hidden]:pointer-events-none",
        "data-[state=visible]:animate-in data-[state=hidden]:animate-out",
        "data-[state=visible]:fade-in-0 data-[state=hidden]:fade-out-0",
        "data-[state=visible]:duration-600 data-[state=hidden]:duration-600",
        "hidden md:flex",
    ], {
        variants: {
            side: {
                left: "left-0 bg-gradient-to-r from-background via-background/60 to-transparent rounded-none",
                right: "right-0 bg-gradient-to-l from-background via-background/60 to-transparent rounded-none",
            },
        },
    }),
    scrollContainer: cva([
        "flex max-w-full w-full space-x-3 overflow-x-scroll scrollbar-hide scroll select-none",
    ]),
    chevronIcon: cva([
        "w-12 h-12 stroke-[2.5px] p-3 rounded-full bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_70%,transparent)] text-white/80 border border-white/10 shadow-lg",
        "backdrop-blur-[var(--blur-overlay-md)] transition-all duration-300",
        "group-hover/chevron:bg-brand-orange group-hover/chevron:text-white group-hover/chevron:border-brand-orange group-hover/chevron:scale-110 group-hover/chevron:shadow-[0_0_15px_rgba(255,110,58,0.4)]",
    ]),

})

/* -------------------------------------------------------------------------------------------------
 * HorizontalDraggableScroll
 * -----------------------------------------------------------------------------------------------*/

export type HorizontalDraggableScrollProps = ComponentAnatomy<typeof HorizontalDraggableScrollAnatomy> & {
    className?: string
    children?: React.ReactNode
    /**
     * Callback fired when the slider has reached the end
     */
    onSlideEnd?: () => void
    /**
     * The amount of pixels to scroll when the chevron is clicked
     * @default 500
     */
    scrollAmount?: number
    /**
     * Decay rate of the inertial effect by using an optional parameter.
     * A value of 0.95 means that at the speed will decay 5% of its current value at every 1/60 seconds.
     */
    decayRate?: number
    /**
     * Control drag sensitivity by specifying the minimum distance in order to distinguish an intentional drag movement from an unwanted one.
     */
    safeDisplacement?: number
    /**
     * Whether to apply a rubber band effect when the slider reaches the end
     */
    applyRubberBandEffect?: boolean
    /**
     * Ambient auto-scroll: slowly scrolls right and loops back to the start.
     * Pauses on hover/drag/focus so it never fights the user.
     * @default false
     */
    autoScroll?: boolean
    /**
     * Auto-scroll speed in pixels per second.
     * @default 30
     */
    autoScrollSpeed?: number
}

export const HorizontalDraggableScroll = React.forwardRef<HTMLDivElement, HorizontalDraggableScrollProps>((props, forwadedRef) => {

    const {
        children,
        onSlideEnd,
        className,
        containerClass,
        scrollContainerClass: _scrollContainerClass,
        chevronIconClass,
        chevronOverlayClass,
        decayRate = 0.95,
        safeDisplacement = 20,
        applyRubberBandEffect = true,
        scrollAmount = 500,
        autoScroll = false,
        autoScrollSpeed = 30,
        ...rest
    } = props

    const ref = React.useRef<HTMLDivElement>(null) as React.MutableRefObject<HTMLDivElement>
    const { events } = useDraggableScroll(ref, {
        decayRate,
        safeDisplacement,
        applyRubberBandEffect,
    })

    const [isScrolledToLeft, setIsScrolledToLeft] = React.useState(true)
    const [isScrolledToRight, setIsScrolledToRight] = React.useState(false)
    const [showChevronRight, setShowRightChevron] = React.useState(false)

    const handleScroll = React.useCallback(() => {
        const div = ref.current

        if (div) {
            const scrolledToLeft = div.scrollLeft === 0
            const scrolledToRight = div.scrollLeft + div.clientWidth === div.scrollWidth

            setIsScrolledToLeft(scrolledToLeft)
            setIsScrolledToRight(scrolledToRight)
        }
    }, [])

    useUpdateEffect(() => {
        if (!isScrolledToLeft && isScrolledToRight) {
            onSlideEnd?.()
            const t = setTimeout(() => {
                const div = ref.current
                if (div) {
                    div.scrollTo({
                        left: div.scrollLeft + scrollAmount,
                        behavior: "smooth",
                    })
                }
            }, 1000)
            return () => clearTimeout(t)
        }
    }, [isScrolledToLeft, isScrolledToRight])

    const slideLeft = React.useCallback(() => {
        const div = ref.current
        if (div) {
            div.scrollTo({
                left: div.scrollLeft - scrollAmount,
                behavior: "smooth",
            })
        }
    }, [scrollAmount])

    const slideRight = React.useCallback(() => {
        const div = ref.current
        if (div) {
            div.scrollTo({
                left: div.scrollLeft + scrollAmount,
                behavior: "smooth",
            })
        }
    }, [scrollAmount])

    useIsomorphicLayoutEffect(() => {
        if (ref.current.clientWidth < ref.current.scrollWidth) {
            setShowRightChevron(true)
        } else {
            setShowRightChevron(false)
        }
    }, [])

    // Ambient auto-scroll — pauses while the user hovers, drags, or focuses the lane.
    const isPausedRef = React.useRef(false)
    React.useEffect(() => {
        if (!autoScroll) return
        const div = ref.current
        if (!div) return

        let rafId: number
        let lastTime: number | null = null

        const tick = (time: number) => {
            if (lastTime === null) lastTime = time
            const dt = (time - lastTime) / 1000
            lastTime = time

            if (!isPausedRef.current && document.visibilityState === "visible") {
                const maxScroll = div.scrollWidth - div.clientWidth
                if (maxScroll > 0) {
                    const next = div.scrollLeft + autoScrollSpeed * dt
                    div.scrollLeft = next >= maxScroll ? 0 : next
                }
            }
            rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)

        const pause = () => { isPausedRef.current = true }
        const resume = () => { isPausedRef.current = false }
        div.addEventListener("pointerenter", pause)
        div.addEventListener("pointerleave", resume)
        div.addEventListener("pointerdown", pause)
        div.addEventListener("focusin", pause)
        div.addEventListener("focusout", resume)

        return () => {
            cancelAnimationFrame(rafId)
            div.removeEventListener("pointerenter", pause)
            div.removeEventListener("pointerleave", resume)
            div.removeEventListener("pointerdown", pause)
            div.removeEventListener("focusin", pause)
            div.removeEventListener("focusout", resume)
        }
    }, [autoScroll, autoScrollSpeed])

    return (
        <div ref={forwadedRef} className={cn(HorizontalDraggableScrollAnatomy.root(), className)} {...rest}>
            <div
                onClick={slideLeft}
                className={cn(HorizontalDraggableScrollAnatomy.chevronOverlay({ side: "left" }), chevronOverlayClass)}
                data-state={isScrolledToLeft ? "hidden" : "visible"}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(HorizontalDraggableScrollAnatomy.chevronIcon(), chevronIconClass)}
                >
                    <path d="m15 18-6-6 6-6" />
                </svg>
            </div>
            <div
                onScroll={handleScroll}
                className={cn(HorizontalDraggableScrollAnatomy.container(), containerClass)}
                {...events}
                ref={ref}
            >
                {children}
            </div>
            <div
                onClick={slideRight}
                className={cn(HorizontalDraggableScrollAnatomy.chevronOverlay({ side: "right" }), chevronOverlayClass)}
                data-state={!isScrolledToRight && showChevronRight ? "visible" : "hidden"}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(HorizontalDraggableScrollAnatomy.chevronIcon(), chevronIconClass)}
                >
                    <path d="m9 18 6-6-6-6" />
                </svg>
            </div>
        </div>
    )
})

HorizontalDraggableScroll.displayName = "HorizontalDraggableScroll"
