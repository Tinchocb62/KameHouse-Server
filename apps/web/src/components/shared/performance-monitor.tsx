import React, { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LucideActivity, LucideCpu, LucideX, LucideInfo, LucideTrash2, LucideCheckCircle, LucideAlertTriangle } from "lucide-react"
import { useRouterState } from "@tanstack/react-router"

// Custom global event to toggle performance monitor from sidebar/settings
export const TOGGLE_PERF_MONITOR_EVENT = "kamehouse:toggle-perf-monitor"

export function PerformanceMonitor() {
    const [isOpen, setIsOpen] = useState(() => localStorage.getItem("kamehouse:perf-monitor-enabled") === "true")
    const [fps, setFps] = useState(60)
    const [droppedFrames, setDroppedFrames] = useState(0)
    const [totalFrames, setTotalFrames] = useState(0)
    const [smoothFrames, setSmoothFrames] = useState(0)
    const [memory, setMemory] = useState<{ used: number; total: number } | null>(null)
    const [routeLatency, setRouteLatency] = useState<number | null>(null)

    const routerState = useRouterState()
    const rafIdRef = useRef<number | null>(null)
    const lastFrameTimeRef = useRef<number>(0)
    const fpsTicksRef = useRef<number[]>([])
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const fpsHistoryRef = useRef<number[]>([])
    const routeStartTimeRef = useRef<number>(0)

    // Accumulators in refs to avoid React re-renders on every frame tick
    const totalFramesRef = useRef(0)
    const smoothFramesRef = useRef(0)
    const droppedFramesRef = useRef(0)
    const lastUpdateRef = useRef<number>(0)

    // Toggle visibility with keyboard shortcut (Ctrl + Shift + F)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
                e.preventDefault()
                setIsOpen(prev => !prev)
            }
        }

        const handleCustomToggle = () => {
            setIsOpen(prev => !prev)
        }

        window.addEventListener("keydown", handleKeyDown)
        window.addEventListener(TOGGLE_PERF_MONITOR_EVENT, handleCustomToggle)
        
        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            window.removeEventListener(TOGGLE_PERF_MONITOR_EVENT, handleCustomToggle)
        }
    }, [])

    // Track route change transition latency
    useEffect(() => {
        routeStartTimeRef.current = performance.now()
        
        // Measure time taken to render/layout after path updates
        const timer = requestAnimationFrame(() => {
            if (routeStartTimeRef.current > 0) {
                const latency = performance.now() - routeStartTimeRef.current
                setRouteLatency(Math.round(latency))
                routeStartTimeRef.current = 0
            }
        })

        return () => cancelAnimationFrame(timer)
    }, [routerState.location.pathname])

    // Performance loop (RAF)
    useEffect(() => {
        if (!isOpen) {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = null
            }
            return
        }

        lastFrameTimeRef.current = performance.now()
        lastUpdateRef.current = performance.now()
        
        const loop = (now: number) => {
            const delta = now - lastFrameTimeRef.current
            lastFrameTimeRef.current = now

            totalFramesRef.current += 1

            // Detect dropped frame (if frame took longer than 24ms, which drops a frame on 60Hz)
            if (delta > 24) {
                droppedFramesRef.current += 1
            } else {
                smoothFramesRef.current += 1
            }

            // Calculate FPS
            fpsTicksRef.current.push(now)
            const oneSecondAgo = now - 1000
            fpsTicksRef.current = fpsTicksRef.current.filter(t => t > oneSecondAgo)
            
            const currentFps = fpsTicksRef.current.length

            // Throttle React state updates to 500ms to avoid 60fps Virtual DOM overhead
            if (now - lastUpdateRef.current >= 500) {
                lastUpdateRef.current = now
                setFps(currentFps)
                setDroppedFrames(droppedFramesRef.current)
                setTotalFrames(totalFramesRef.current)
                setSmoothFrames(smoothFramesRef.current)

                // Update memory info (Chromium only)
                const perfMemory = (performance as any).memory
                if (perfMemory) {
                    setMemory({
                        used: Math.round(perfMemory.usedJSHeapSize / (1024 * 1024)),
                        total: Math.round(perfMemory.jsHeapLimit / (1024 * 1024))
                    })
                }
            }

            // Draw to graph canvas
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext("2d")
                if (ctx) {
                    fpsHistoryRef.current.push(currentFps)
                    if (fpsHistoryRef.current.length > 100) {
                        fpsHistoryRef.current.shift()
                    }

                    const width = canvasRef.current.width
                    const height = canvasRef.current.height

                    ctx.clearRect(0, 0, width, height)

                    // Draw grid lines
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
                    ctx.lineWidth = 1
                    // 60fps line
                    ctx.beginPath()
                    ctx.moveTo(0, height - (60 / 75) * height)
                    ctx.lineTo(width, height - (60 / 75) * height)
                    ctx.stroke()
                    // 30fps line
                    ctx.beginPath()
                    ctx.moveTo(0, height - (30 / 75) * height)
                    ctx.lineTo(width, height - (30 / 75) * height)
                    ctx.stroke()

                    // Draw FPS path
                    ctx.strokeStyle = currentFps >= 50 ? "#10b981" : currentFps >= 35 ? "#f59e0b" : "#ef4444"
                    ctx.lineWidth = 1.5
                    ctx.beginPath()
                    
                    fpsHistoryRef.current.forEach((val, index) => {
                        const x = (index / 100) * width
                        const y = height - (Math.min(75, val) / 75) * height
                        if (index === 0) {
                            ctx.moveTo(x, y)
                        } else {
                            ctx.lineTo(x, y)
                        }
                    })
                    ctx.stroke()

                    // Fill gradient area below path
                    ctx.fillStyle = currentFps >= 50 
                        ? "rgba(16, 185, 129, 0.05)" 
                        : currentFps >= 35 
                            ? "rgba(245, 158, 11, 0.05)" 
                            : "rgba(239, 68, 68, 0.05)"
                    ctx.beginPath()
                    ctx.moveTo(0, height)
                    fpsHistoryRef.current.forEach((val, index) => {
                        const x = (index / 100) * width
                        const y = height - (Math.min(75, val) / 75) * height
                        ctx.lineTo(x, y)
                    })
                    ctx.lineTo(width, height)
                    ctx.closePath()
                    ctx.fill()
                }
            }

            rafIdRef.current = requestAnimationFrame(loop)
        }

        rafIdRef.current = requestAnimationFrame(loop)

        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = null
            }
        }
    }, [isOpen])

    const handleClearStats = () => {
        totalFramesRef.current = 0
        smoothFramesRef.current = 0
        droppedFramesRef.current = 0
        setDroppedFrames(0)
        setTotalFrames(0)
        setSmoothFrames(0)
        fpsHistoryRef.current = []
    }

    const smoothnessIndex = totalFrames > 0 
        ? Math.round((smoothFrames / totalFrames) * 100) 
        : 100

    const getFpsColor = (val: number) => {
        if (val >= 50) return "text-emerald-400"
        if (val >= 35) return "text-amber-500"
        return "text-red-500"
    }

    const getSmoothnessColor = (val: number) => {
        if (val >= 90) return "text-emerald-400"
        if (val >= 75) return "text-amber-500"
        return "text-red-500"
    }

    // Optimization tips engine based on actual statistics
    const optimizationTips = React.useMemo(() => {
        const tips: { id: string; text: string; level: "info" | "warning" }[] = []

        if (fps < 45) {
            tips.push({
                id: "fps-low",
                text: "Rendimiento bajo: Tu máquina está luchando por renderizar a 60 FPS. Se recomienda desactivar efectos en segundo plano.",
                level: "warning"
            })
        }

        if (droppedFrames > 20 && smoothnessIndex < 85) {
            tips.push({
                id: "stuttering",
                text: "Micro-tirones detectados: El movimiento del ratón en fondos difuminados dinámicos (DynamicBackdrop) puede estar sobrecargando la GPU.",
                level: "warning"
            })
        }

        if (memory && memory.used > 450) {
            tips.push({
                id: "memory-high",
                text: "Consumo de memoria elevado: Considera recargar la aplicación para limpiar la caché de imágenes.",
                level: "info"
            })
        }

        // General suggestions
        tips.push({
            id: "judder-tip",
            text: "Consejo visual: Gran parte del lag aparente al reproducir anime se debe a la disparidad 24fps vs Hz de tu monitor. Pon tu pantalla en múltiplos de 24Hz (e.g. 72Hz, 120Hz) para paneos suaves.",
            level: "info"
        })

        return tips
    }, [fps, droppedFrames, smoothnessIndex, memory])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                    className="fixed top-6 right-6 z-[9999] w-[350px] bg-zinc-950/85 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-5 select-none font-sans text-white"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <LucideActivity className="text-brand-orange animate-pulse w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                Diagnóstico de Rendimiento
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleClearStats}
                                className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                                title="Reiniciar estadísticas"
                            >
                                <LucideTrash2 size={13} />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                            >
                                <LucideX size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {/* Live FPS */}
                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex flex-col items-start">
                            <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500">FPS Actual</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className={`text-3xl font-display tracking-wide ${getFpsColor(fps)}`}>
                                    {fps}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-600">FPS</span>
                            </div>
                        </div>

                        {/* Stability Index */}
                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex flex-col items-start">
                            <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500">Estabilidad UI</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className={`text-3xl font-display tracking-wide ${getSmoothnessColor(smoothnessIndex)}`}>
                                    {smoothnessIndex}%
                                </span>
                                <span className="text-[10px] font-bold text-zinc-600">INDEX</span>
                            </div>
                        </div>

                        {/* Dropped Frames */}
                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex flex-col items-start">
                            <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500">Cuadros Perdidos</span>
                            <span className="text-xl font-bold text-red-400 mt-2 font-mono tabular-nums">
                                {droppedFrames}
                            </span>
                        </div>

                        {/* JS Memory */}
                        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex flex-col items-start">
                            <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500">Memoria Heap JS</span>
                            {memory ? (
                                <div className="flex items-baseline gap-0.5 mt-2">
                                    <span className="text-xl font-bold text-white font-mono tabular-nums">{memory.used}</span>
                                    <span className="text-[8px] font-bold text-zinc-500">/{memory.total}MB</span>
                                </div>
                            ) : (
                                <span className="text-xs text-zinc-600 font-bold mt-2">N/A (No Chrome)</span>
                            )}
                        </div>
                    </div>

                    {/* Chart Canvas */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-2 relative h-16 w-full flex items-center justify-center">
                        <canvas ref={canvasRef} width={300} height={48} className="w-full h-full block" />
                        <span className="absolute bottom-1 right-2 text-[7px] text-zinc-600 font-black tracking-widest uppercase pointer-events-none">HISTORIAL 10s</span>
                    </div>

                    {/* Page transition latency info */}
                    <div className="mt-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                            <LucideCpu size={12} className="text-brand-orange" />
                            Latencia Carga Ruta
                        </span>
                        <span className="text-xs font-bold text-zinc-300 font-mono">
                            {routeLatency !== null ? `${routeLatency} ms` : "---"}
                        </span>
                    </div>

                    {/* Tips and Solutions */}
                    <div className="mt-4 border-t border-white/5 pt-4 space-y-2.5 max-h-[140px] overflow-y-auto no-scrollbar">
                        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-1">
                            Diagnóstico y Solución
                        </p>
                        {optimizationTips.map((tip) => (
                            <div key={tip.id} className="flex items-start gap-2.5 bg-white/[0.01] p-2.5 border border-white/[0.03] rounded-lg">
                                {tip.level === "warning" ? (
                                    <LucideAlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                ) : (
                                    <LucideCheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                                )}
                                <span className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                                    {tip.text}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[7px] text-zinc-600 font-black tracking-widest uppercase">
                        <span>ATAJO: CTRL + SHIFT + F</span>
                        <span>KAMEHOUSE ENGINE</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
