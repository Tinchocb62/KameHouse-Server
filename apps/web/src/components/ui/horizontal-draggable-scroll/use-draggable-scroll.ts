'use no memo'
/* -------------------------------------------------------------------------------------------------
 * @author rfmiotto
 * @link https://www.npmjs.com/package/react-use-draggable-scroll/v/0.4.7
 * -----------------------------------------------------------------------------------------------*/
import React, { MutableRefObject, useEffect, useRef, useLayoutEffect } from "react"
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

type OptionsType = {
    decayRate?: number
    safeDisplacement?: number
    applyRubberBandEffect?: boolean
    activeMouseButton?: "Left" | "Middle" | "Right"
    isMounted?: boolean
}

type ReturnType = {
    events: {
        onMouseDown: (e: React.MouseEvent<HTMLElement>) => void
        onClickCapture: (e: React.MouseEvent) => void
    }
}

function updateCursor(element: HTMLElement | null, cursor: string) {
    if (element) {
        element.style.cursor = cursor
    }
}

function updateChildrenCursors(parent: HTMLElement | null, cursors: string[] | string) {
    if (!parent) return
    const children = parent.childNodes as NodeListOf<HTMLElement>
    children.forEach((child, i) => {
        if (child && child.style) {
            child.style.cursor = typeof cursors === 'string' ? cursors : cursors[i] || ""
        }
    })
}

function setScrollPosition(element: HTMLElement | null, scrollLeft: number, scrollTop: number) {
    if (element) {
        element.scrollLeft = scrollLeft
        element.scrollTop = scrollTop
    }
}

function setChildrenTransformAndTransition(
    parent: HTMLElement | null,
    transform: string[] | string,
    transition: string[] | string
) {
    if (!parent) return
    const children = parent.childNodes as NodeListOf<HTMLElement>
    children.forEach((child, i) => {
        if (child && child.style) {
            child.style.transform = typeof transform === 'string' ? transform : transform[i] || ""
            child.style.transition = typeof transition === 'string' ? transition : transition[i] || ""
        }
    })
}

// @react-compiler-skip
export function useDraggableScroll(
    ref: MutableRefObject<HTMLElement>,
    {
        decayRate = 0.95,
        safeDisplacement = 10,
        applyRubberBandEffect = false,
        activeMouseButton = "Left",
        isMounted = true,
    }: OptionsType = {},
): ReturnType {
    const internalState = useRef({
        isMouseDown: false,
        isDraggingX: false,
        isDraggingY: false,
        initialMouseX: 0,
        initialMouseY: 0,
        lastMouseX: 0,
        lastMouseY: 0,
        scrollSpeedX: 0,
        scrollSpeedY: 0,
        lastScrollX: 0,
        lastScrollY: 0,
    })

    const layoutState = useRef({
        isScrollableAlongX: false,
        isScrollableAlongY: false,
        maxHorizontalScroll: 0,
        maxVerticalScroll: 0,
        cursorStyleOfWrapperElement: "",
        cursorStyleOfChildElements: [] as string[],
        transformStyleOfChildElements: [] as string[],
        transitionStyleOfChildElements: [] as string[],
    })

    const timing = (1 / 60) * 1000 // period of most monitors (60fps)

    useIsomorphicLayoutEffect(() => {
        if (isMounted && ref.current) {
            const el = ref.current
            layoutState.current.isScrollableAlongX = el.scrollWidth > el.clientWidth
            layoutState.current.isScrollableAlongY = el.scrollHeight > el.clientHeight
            layoutState.current.maxHorizontalScroll = el.scrollWidth - el.clientWidth
            layoutState.current.maxVerticalScroll = el.scrollHeight - el.clientHeight
            layoutState.current.cursorStyleOfWrapperElement = el.style.cursor || ""
        }
    }, [isMounted])

    const runScroll = () => {
        const dx = internalState.current.scrollSpeedX * timing
        const dy = internalState.current.scrollSpeedY * timing
        const offsetX = ref.current.scrollLeft + dx
        const offsetY = ref.current.scrollTop + dy

        setScrollPosition(ref.current, offsetX, offsetY)
        internalState.current.lastScrollX = offsetX
        internalState.current.lastScrollY = offsetY
    }

    const rubberBandCallback = (e: MouseEvent) => {
        const dx = e.clientX - internalState.current.initialMouseX
        const dy = e.clientY - internalState.current.initialMouseY

        const { clientWidth, clientHeight } = ref.current

        let displacementX = 0
        let displacementY = 0

        if (layoutState.current.isScrollableAlongX && layoutState.current.isScrollableAlongY) {
            displacementX =
                0.3 *
                clientWidth *
                Math.sign(dx) *
                Math.log10(1.0 + (0.5 * Math.abs(dx)) / clientWidth)
            displacementY =
                0.3 *
                clientHeight *
                Math.sign(dy) *
                Math.log10(1.0 + (0.5 * Math.abs(dy)) / clientHeight)
        } else if (layoutState.current.isScrollableAlongX) {
            displacementX =
                0.3 *
                clientWidth *
                Math.sign(dx) *
                Math.log10(1.0 + (0.5 * Math.abs(dx)) / clientWidth)
        } else if (layoutState.current.isScrollableAlongY) {
            displacementY =
                0.3 *
                clientHeight *
                Math.sign(dy) *
                Math.log10(1.0 + (0.5 * Math.abs(dy)) / clientHeight)
        }

        setChildrenTransformAndTransition(
            ref.current,
            `translate3d(${displacementX}px, ${displacementY}px, 0px)`,
            "transform 0ms"
        )
    }

    const recoverChildStyle = () => {
        setChildrenTransformAndTransition(
            ref.current,
            layoutState.current.transformStyleOfChildElements,
            layoutState.current.transitionStyleOfChildElements
        )
    }

    const rubberBandAnimationTimer = useRef<NodeJS.Timeout | null>(null)
    const momentumRafId = useRef<number | null>(null)

    const callbackMomentum = () => {
        const minimumSpeedToTriggerMomentum = 0.05
        if (momentumRafId.current) {
            cancelAnimationFrame(momentumRafId.current)
            momentumRafId.current = null
        }

        const stepMomentum = () => {
            let continueX = false
            let continueY = false

            if (Math.abs(internalState.current.scrollSpeedX) >= minimumSpeedToTriggerMomentum && !internalState.current.isMouseDown) {
                internalState.current.scrollSpeedX *= decayRate
                const isAtLeft = ref.current.scrollLeft <= 0
                const isAtRight = ref.current.scrollLeft >= layoutState.current.maxHorizontalScroll
                if (!isAtLeft && !isAtRight) {
                    continueX = true
                }
            } else {
                internalState.current.scrollSpeedX = 0
            }

            if (Math.abs(internalState.current.scrollSpeedY) >= minimumSpeedToTriggerMomentum && !internalState.current.isMouseDown) {
                internalState.current.scrollSpeedY *= decayRate
                const isAtTop = ref.current.scrollTop <= 0
                const isAtBottom = ref.current.scrollTop >= layoutState.current.maxVerticalScroll
                if (!isAtTop && !isAtBottom) {
                    continueY = true
                }
            } else {
                internalState.current.scrollSpeedY = 0
            }

            runScroll()

            if (continueX || continueY) {
                momentumRafId.current = requestAnimationFrame(stepMomentum)
            } else {
                momentumRafId.current = null
            }
        }

        momentumRafId.current = requestAnimationFrame(stepMomentum)

        internalState.current.isDraggingX = false
        internalState.current.isDraggingY = false

        if (applyRubberBandEffect) {
            const transitionDurationInMilliseconds = 250

            setChildrenTransformAndTransition(
                ref.current,
                "translate3d(0px, 0px, 0px)",
                `transform ${transitionDurationInMilliseconds}ms`
            )

            rubberBandAnimationTimer.current = setTimeout(
                recoverChildStyle,
                transitionDurationInMilliseconds,
            )
        }
    }

    const preventClick = (e: Event) => {
        e.preventDefault()
        e.stopImmediatePropagation()
    }

    const getIsMousePressActive = (buttonsCode: number) => {
        return (
            (activeMouseButton === "Left" && buttonsCode === 1) ||
            (activeMouseButton === "Middle" && buttonsCode === 4) ||
            (activeMouseButton === "Right" && buttonsCode === 2)
        )
    }

    const rafId = useRef<number | null>(null)

    const isDraggingConfirmedRef = useRef(false)

    const handleCaptureClick = React.useCallback((e: React.MouseEvent) => {
        if (isDraggingConfirmedRef.current) {
            e.preventDefault()
            e.stopPropagation()
            isDraggingConfirmedRef.current = false
        }
    }, [])

    const onMouseMove = (e: MouseEvent) => {
        if (!internalState.current.isMouseDown) {
            return
        }

        if (rafId.current) cancelAnimationFrame(rafId.current)
        rafId.current = requestAnimationFrame(() => {
            const dx = internalState.current.lastMouseX - e.clientX
            internalState.current.lastMouseX = e.clientX

            internalState.current.scrollSpeedX = dx / timing
            internalState.current.isDraggingX = true

            const dy = internalState.current.lastMouseY - e.clientY
            internalState.current.lastMouseY = e.clientY

            internalState.current.scrollSpeedY = dy / timing
            internalState.current.isDraggingY = true

            updateCursor(ref.current, "grabbing")

            const isAtLeft = ref.current.scrollLeft <= 0 && layoutState.current.isScrollableAlongX
            const isAtRight =
                ref.current.scrollLeft >= layoutState.current.maxHorizontalScroll && layoutState.current.isScrollableAlongX
            const isAtTop = ref.current.scrollTop <= 0 && layoutState.current.isScrollableAlongY
            const isAtBottom =
                ref.current.scrollTop >= layoutState.current.maxVerticalScroll && layoutState.current.isScrollableAlongY
            const isAtAnEdge = isAtLeft || isAtRight || isAtTop || isAtBottom

            if (isAtAnEdge && applyRubberBandEffect) {
                rubberBandCallback(e)
            }

            runScroll()
        })
    }

    const onMouseUp = (e: MouseEvent) => {
        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mouseup", onMouseUp)

        const isDragging =
            internalState.current.isDraggingX || internalState.current.isDraggingY

        const dx = internalState.current.initialMouseX - e.clientX
        const dy = internalState.current.initialMouseY - e.clientY

        const isMotionIntentional =
            Math.abs(dx) > safeDisplacement || Math.abs(dy) > safeDisplacement

        const isDraggingConfirmed = isDragging && isMotionIntentional
        isDraggingConfirmedRef.current = isDraggingConfirmed

        internalState.current.isMouseDown = false
        internalState.current.lastMouseX = 0
        internalState.current.lastMouseY = 0

        if (ref.current) {
            ref.current.style.willChange = ""
        }

        updateCursor(ref.current, layoutState.current.cursorStyleOfWrapperElement)
        updateChildrenCursors(ref.current, layoutState.current.cursorStyleOfChildElements)

        if (isDraggingConfirmed) {
            callbackMomentum()
        }
    }

    const onMouseDown = (e: React.MouseEvent<HTMLElement>) => {
        const isMouseActive = getIsMousePressActive(e.buttons)
        if (!isMouseActive) {
            return
        }

        if (momentumRafId.current) {
            cancelAnimationFrame(momentumRafId.current)
            momentumRafId.current = null
        }

        internalState.current.isMouseDown = true
        internalState.current.lastMouseX = e.clientX
        internalState.current.lastMouseY = e.clientY
        internalState.current.initialMouseX = e.clientX
        internalState.current.initialMouseY = e.clientY

        if (ref.current) {
            ref.current.style.willChange = "scroll-position"
        }

        // Attach listeners on demand only while dragging with passive listeners
        window.addEventListener("mousemove", onMouseMove, { passive: true })
        window.addEventListener("mouseup", onMouseUp, { passive: true })
    }

    const handleResize = () => {
        if (!ref.current) return
        layoutState.current.maxHorizontalScroll = ref.current.scrollWidth - ref.current.clientWidth
        layoutState.current.maxVerticalScroll = ref.current.scrollHeight - ref.current.clientHeight
    }

    const onMouseMoveRef = useRef(onMouseMove)
    const onMouseUpRef = useRef(onMouseUp)
    const handleResizeRef = useRef(handleResize)
    useEffect(() => {
        onMouseMoveRef.current = onMouseMove
        onMouseUpRef.current = onMouseUp
        handleResizeRef.current = handleResize
    })

    useEffect(() => {
        const handleResizeEvent = () => handleResizeRef.current()

        if (isMounted) {
            window.addEventListener("resize", handleResizeEvent, { passive: true })
        }
        return () => {
            window.removeEventListener("mousemove", onMouseMoveRef.current)
            window.removeEventListener("mouseup", onMouseUpRef.current)
            window.removeEventListener("resize", handleResizeEvent)

            if (momentumRafId.current) cancelAnimationFrame(momentumRafId.current)
            if (rafId.current) cancelAnimationFrame(rafId.current)
            if (rubberBandAnimationTimer.current) clearTimeout(rubberBandAnimationTimer.current)
        }
    }, [isMounted])

    return {
        events: {
            onMouseDown,
            onClickCapture: handleCaptureClick,
        },
    }
}
