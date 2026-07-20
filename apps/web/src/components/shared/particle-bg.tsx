import React, { useEffect, useRef } from "react"

interface ParticleBackgroundProps {
    className?: string;
    quantity?: number;
    staticity?: number;
    ease?: number;
    size?: number;
    refresh?: boolean;
    color?: string;
    vx?: number;
    vy?: number;
}

/** Simple throttle — limits function calls to at most once per `ms` milliseconds. */
function throttle<T extends (...args: Parameters<T>) => void>(fn: T, ms: number): T {
    let lastCall = 0
    return function (...args: Parameters<T>) {
        const now = Date.now()
        if (now - lastCall >= ms) {
            lastCall = now
            fn(...args)
        }
    } as T
}

function hexToRgb(hex: string): number[] {
    hex = hex.replace("#", "")

    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((char) => char + char)
            .join("")
    }

    const hexInt = parseInt(hex, 16)
    const red = (hexInt >> 16) & 255
    const green = (hexInt >> 8) & 255
    const blue = hexInt & 255
    return [red, green, blue]
}

type Circle = {
    x: number;
    y: number;
    translateX: number;
    translateY: number;
    size: number;
    alpha: number;
    targetAlpha: number;
    dx: number;
    dy: number;
    magnetism: number;
};

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
    className = "",
    quantity = 200,
    staticity = 50,
    ease = 50,
    size = 0.4,
    refresh = false,
    color = "#ffffff",
    vx = 0,
    vy = 0,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasContainerRef = useRef<HTMLDivElement>(null)
    const context = useRef<CanvasRenderingContext2D | null>(null)
    const circles = useRef<Circle[]>([])
    const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
    const canvasSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 1.5) : 1
    const rafId = useRef<number | null>(null)
    const isVisible = useRef(true)

    // Stable refs for animation props — avoids re-creating the RAF loop on every prop change
    const easeRef = useRef(ease)
    const staticityRef = useRef(staticity)
    const vxRef = useRef(vx)
    const vyRef = useRef(vy)
    const sizeRef = useRef(size)
    const colorRef = useRef(color)
    const quantityRef = useRef(quantity)

    useEffect(() => { easeRef.current = ease }, [ease])
    useEffect(() => { staticityRef.current = staticity }, [staticity])
    useEffect(() => { vxRef.current = vx }, [vx])
    useEffect(() => { vyRef.current = vy }, [vy])
    useEffect(() => { sizeRef.current = size }, [size])
    useEffect(() => { colorRef.current = color }, [color])
    useEffect(() => { quantityRef.current = quantity }, [quantity])

    const clearContext = React.useCallback(() => {
        if (context.current) {
            context.current.clearRect(
                0,
                0,
                canvasSize.current.w,
                canvasSize.current.h,
            )
        }
    }, [])

    const circleParams = React.useCallback((): Circle => {
        const x = Math.floor(Math.random() * canvasSize.current.w)
        const y = Math.floor(Math.random() * canvasSize.current.h)
        const translateX = 0
        const translateY = 0
        const pSize = Math.floor(Math.random() * 2) + sizeRef.current
        const alpha = 0
        const targetAlpha = parseFloat((Math.random() * 0.6 + 0.1).toFixed(1))
        const dx = (Math.random() - 0.5) * 0.1
        const dy = (Math.random() - 0.5) * 0.1
        const magnetism = 0.1 + Math.random() * 4
        return {
            x,
            y,
            translateX,
            translateY,
            size: pSize,
            alpha,
            targetAlpha,
            dx,
            dy,
            magnetism,
        }
    }, [])

    const rgb = React.useMemo(() => hexToRgb(color), [color])
    const rgbString = React.useMemo(() => rgb.join(", "), [rgb])
    const rgbStringRef = useRef(rgbString)
    useEffect(() => { rgbStringRef.current = rgbString }, [rgbString])

    const resetCircle = React.useCallback((circle: Circle) => {
        circle.x = Math.floor(Math.random() * canvasSize.current.w)
        circle.y = Math.floor(Math.random() * canvasSize.current.h)
        circle.translateX = 0
        circle.translateY = 0
        circle.size = Math.floor(Math.random() * 2) + sizeRef.current
        circle.alpha = 0
        circle.targetAlpha = parseFloat((Math.random() * 0.6 + 0.1).toFixed(1))
        circle.dx = (Math.random() - 0.5) * 0.1
        circle.dy = (Math.random() - 0.5) * 0.1
        circle.magnetism = 0.1 + Math.random() * 4
    }, [])

    const drawCircle = React.useCallback((circle: Circle) => {
        if (context.current) {
            const { x, y, translateX, translateY, size, alpha } = circle
            context.current.beginPath()
            context.current.arc(x + translateX, y + translateY, size, 0, 2 * Math.PI)
            context.current.fillStyle = `rgba(${rgbStringRef.current}, ${alpha})`
            context.current.fill()
        }
    }, [])

    const resizeCanvas = React.useCallback(() => {
        if (canvasRef.current && context.current) {
            circles.current.length = 0
            canvasSize.current.w = canvasContainerRef.current?.offsetWidth || window.innerWidth
            canvasSize.current.h = canvasContainerRef.current?.offsetHeight || window.innerHeight
            canvasRef.current.width = canvasSize.current.w * dpr
            canvasRef.current.height = canvasSize.current.h * dpr
            canvasRef.current.style.width = `${canvasSize.current.w}px`
            canvasRef.current.style.height = `${canvasSize.current.h}px`
            context.current.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
    }, [dpr])

    const drawParticleBackground = React.useCallback(() => {
        clearContext()
        const particleCount = quantityRef.current
        circles.current = []
        for (let i = 0; i < particleCount; i++) {
            const circle = circleParams()
            circles.current.push(circle)
            drawCircle(circle)
        }
    }, [clearContext, circleParams, drawCircle])

    const initCanvas = React.useCallback(() => {
        resizeCanvas()
        drawParticleBackground()
    }, [resizeCanvas, drawParticleBackground])

    const animate = React.useCallback(function animateFn() {
        if (!isVisible.current) return
        clearContext()
        circles.current.forEach((circle: Circle) => {
            const edge0 = circle.x + circle.translateX - circle.size
            const edge1 = canvasSize.current.w - circle.x - circle.translateX - circle.size
            const edge2 = circle.y + circle.translateY - circle.size
            const edge3 = canvasSize.current.h - circle.y - circle.translateY - circle.size

            const closestEdge = Math.min(edge0, edge1, edge2, edge3)
            const remapClosestEdge = closestEdge > 0 ? closestEdge / 20 : 0

            if (remapClosestEdge > 1) {
                circle.alpha += 0.02
                if (circle.alpha > circle.targetAlpha) {
                    circle.alpha = circle.targetAlpha
                }
            } else {
                circle.alpha = circle.targetAlpha * remapClosestEdge
            }
            circle.x += circle.dx + vxRef.current
            circle.y += circle.dy + vyRef.current
            circle.translateX +=
                (mouse.current.x / (staticityRef.current / circle.magnetism) - circle.translateX) /
                easeRef.current
            circle.translateY +=
                (mouse.current.y / (staticityRef.current / circle.magnetism) - circle.translateY) /
                easeRef.current

            drawCircle(circle)

            if (
                circle.x < -circle.size ||
                circle.x > canvasSize.current.w + circle.size ||
                circle.y < -circle.size ||
                circle.y > canvasSize.current.h + circle.size
            ) {
                resetCircle(circle)
            }
        })
        rafId.current = window.requestAnimationFrame(animateFn)
    }, [clearContext, drawCircle, resetCircle])

    useEffect(() => {
        if (canvasRef.current) {
            context.current = canvasRef.current.getContext("2d")
        }
        initCanvas()
        const throttledResize = throttle(initCanvas, 250)
        window.addEventListener("resize", throttledResize)

        const observer = new IntersectionObserver(
            ([entry]) => {
                isVisible.current = entry.isIntersecting
                if (entry.isIntersecting) {
                    if (!rafId.current) {
                        animate()
                    }
                } else {
                    if (rafId.current) {
                        cancelAnimationFrame(rafId.current)
                        rafId.current = null
                    }
                }
            },
            { threshold: 0 }
        )

        if (canvasContainerRef.current) {
            observer.observe(canvasContainerRef.current)
        }

        return () => {
            window.removeEventListener("resize", throttledResize)
            observer.disconnect()
            if (rafId.current) {
                cancelAnimationFrame(rafId.current)
                rafId.current = null
            }
        }
    }, [initCanvas, animate])

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect()
                const { w, h } = canvasSize.current
                const x = event.clientX - rect.left - w / 2
                const y = event.clientY - rect.top - h / 2
                const inside = x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2
                if (inside) {
                    mouse.current.x = x
                    mouse.current.y = y
                }
            }
        }

        window.addEventListener("mousemove", handleMouseMove)
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
        }
    }, [])

    useEffect(() => {
        drawParticleBackground()
    }, [quantity, size, color, refresh, drawParticleBackground])

    return (
        <div className={className} ref={canvasContainerRef} aria-hidden="true">
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    )
}
