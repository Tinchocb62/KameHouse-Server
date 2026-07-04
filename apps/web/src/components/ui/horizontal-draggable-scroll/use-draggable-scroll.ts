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
            layoutState.current.isScrollableAlongX =
                window.getComputedStyle(ref.current).overflowX === "scroll"
            layoutState.current.isScrollableAlongY =
                window.getComputedStyle(ref.current).overflowY === "scroll"

            layoutState.current.maxHorizontalScroll = ref.current.scrollWidth - ref.current.clientWidth
            layoutState.current.maxVerticalScroll = ref.current.scrollHeight - ref.current.clientHeight

            layoutState.current.cursorStyleOfWrapperElement = window.getComputedStyle(ref.current).cursor

            layoutState.current.cursorStyleOfChildElements = []
            layoutState.current.transformStyleOfChildElements = []
            layoutState.current.transitionStyleOfChildElements = [];

            (ref.current.childNodes as NodeListOf<HTMLOptionElement>).forEach(
                (child: HTMLElement) => {
                    layoutState.current.cursorStyleOfChildElements.push(
                        window.getComputedStyle(child).cursor,
                    )

                    layoutState.current.transformStyleOfChildElements.push(
                        window.getComputedStyle(child).transform === "none"
                            ? ""
                            : window.getComputedStyle(child).transform,
                    )

                    layoutState.current.transitionStyleOfChildElements.push(
                        window.getComputedStyle(child).transition === "none"
                            ? ""
                            : window.getComputedStyle(child).transition,
                    )
                },
            )
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
    const keepMovingX = useRef<NodeJS.Timeout | null>(null)
    const keepMovingY = useRef<NodeJS.Timeout | null>(null)

    const callbackMomentum = () => {
        const minimumSpeedToTriggerMomentum = 0.05

        keepMovingX.current = setInterval(() => {
            const lastScrollSpeedX = internalState.current.scrollSpeedX
            const newScrollSpeedX = lastScrollSpeedX * decayRate
            internalState.current.scrollSpeedX = newScrollSpeedX

            const isAtLeft = ref.current.scrollLeft <= 0
            const isAtRight = ref.current.scrollLeft >= layoutState.current.maxHorizontalScroll
            const hasReachedHorizontalEdges = isAtLeft || isAtRight

            runScroll()

            if (
                Math.abs(newScrollSpeedX) < minimumSpeedToTriggerMomentum ||
                internalState.current.isMouseDown ||
                hasReachedHorizontalEdges
            ) {
                internalState.current.scrollSpeedX = 0
                if (keepMovingX.current) {
                    clearInterval(keepMovingX.current)
                    keepMovingX.current = null
                }
            }
        }, timing)

        keepMovingY.current = setInterval(() => {
            const lastScrollSpeedY = internalState.current.scrollSpeedY
            const newScrollSpeedY = lastScrollSpeedY * decayRate
            internalState.current.scrollSpeedY = newScrollSpeedY

            const isAtTop = ref.current.scrollTop <= 0
            const isAtBottom = ref.current.scrollTop >= layoutState.current.maxVerticalScroll
            const hasReachedVerticalEdges = isAtTop || isAtBottom

            runScroll()

            if (
                Math.abs(newScrollSpeedY) < minimumSpeedToTriggerMomentum ||
                internalState.current.isMouseDown ||
                hasReachedVerticalEdges
            ) {
                internalState.current.scrollSpeedY = 0
                if (keepMovingY.current) {
                    clearInterval(keepMovingY.current)
                    keepMovingY.current = null
                }
            }
        }, timing)

        internalState.current.isDraggingX = false
        internalState.current.isDraggingY = false

        if (applyRubberBandEffect) {
            const transitionDurationInMilliseconds = 250;

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

    const onMouseDown = (e: React.MouseEvent<HTMLElement>) => {
        const isMouseActive = getIsMousePressActive(e.buttons)
        if (!isMouseActive) {
            return
        }

        internalState.current.isMouseDown = true
        internalState.current.lastMouseX = e.clientX
        internalState.current.lastMouseY = e.clientY
        internalState.current.initialMouseX = e.clientX
        internalState.current.initialMouseY = e.clientY
    }

    const onMouseUp = (e: MouseEvent) => {
        const isDragging =
            internalState.current.isDraggingX || internalState.current.isDraggingY

        const dx = internalState.current.initialMouseX - e.clientX
        const dy = internalState.current.initialMouseY - e.clientY

        const isMotionIntentional =
            Math.abs(dx) > safeDisplacement || Math.abs(dy) > safeDisplacement

        const isDraggingConfirmed = isDragging && isMotionIntentional

        if (isDraggingConfirmed) {
            ref.current.childNodes.forEach((child) => {
                child.addEventListener("click", preventClick)
            })
        } else {
            ref.current.childNodes.forEach((child) => {
                child.removeEventListener("click", preventClick)
            })
        }

        internalState.current.isMouseDown = false
        internalState.current.lastMouseX = 0
        internalState.current.lastMouseY = 0

        updateCursor(ref.current, layoutState.current.cursorStyleOfWrapperElement)
        updateChildrenCursors(ref.current, layoutState.current.cursorStyleOfChildElements)

        if (isDraggingConfirmed) {
            callbackMomentum()
        }
    }

    const rafId = useRef<number | null>(null)

    const onMouseMove = (e: MouseEvent) => {
        if (!internalState.current.isMouseDown) {
            return
        }

        e.preventDefault()

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
            updateChildrenCursors(ref.current, "grabbing")

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

    const handleResize = () => {
        layoutState.current.maxHorizontalScroll = ref.current.scrollWidth - ref.current.clientWidth
        layoutState.current.maxVerticalScroll = ref.current.scrollHeight - ref.current.clientHeight
    }

    const onMouseUpRef = useRef(onMouseUp)
    const onMouseMoveRef = useRef(onMouseMove)
    const handleResizeRef = useRef(handleResize)

    useEffect(() => {
        onMouseUpRef.current = onMouseUp
        onMouseMoveRef.current = onMouseMove
        handleResizeRef.current = handleResize
    })

    useEffect(() => {
        const handleMouseUp = (e: MouseEvent) => onMouseUpRef.current(e)
        const handleMouseMove = (e: MouseEvent) => onMouseMoveRef.current(e)
        const handleResizeEvent = () => handleResizeRef.current()

        if (isMounted) {
            window.addEventListener("mouseup", handleMouseUp)
            window.addEventListener("mousemove", handleMouseMove)
            window.addEventListener("resize", handleResizeEvent)
        }
        return () => {
            window.removeEventListener("mouseup", handleMouseUp)
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("resize", handleResizeEvent)

            if (keepMovingX.current) clearInterval(keepMovingX.current)
            if (keepMovingY.current) clearInterval(keepMovingY.current)
            if (rubberBandAnimationTimer.current) clearTimeout(rubberBandAnimationTimer.current)
        }
    }, [isMounted])

    return {
        events: {
            onMouseDown,
        },
    }
}
