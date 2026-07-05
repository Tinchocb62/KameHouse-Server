import React, { useEffect, useRef } from "react"

interface PlayerAmbientBackdropProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    enabled: boolean
}

export function PlayerAmbientBackdrop({ videoRef, enabled }: PlayerAmbientBackdropProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!enabled) return
        
        let animationFrameId: number
        const canvas = canvasRef.current
        // willReadFrequently: false because we only write to it, not read pixels back.
        const ctx = canvas?.getContext("2d", { alpha: false, willReadFrequently: false })
        
        if (!canvas || !ctx) return

        let lastDrawTime = 0
        const fpsLimit = 15 // Limitar a 15fps para reducir carga de GPU, el blur difumina el salto.
        const frameTime = 1000 / fpsLimit

        const drawLoop = (time: number) => {
            animationFrameId = requestAnimationFrame(drawLoop)
            
            const video = videoRef.current
            // No dibujar si el video está pausado, o no tiene data lista.
            if (!video || video.paused || video.ended || video.readyState < 2) return

            if (time - lastDrawTime >= frameTime) {
                // Usamos una resolución minúscula para que el fillRate de la GPU al hacer drawImage sea casi 0.
                // El navegador se encarga del upscale con hardware acceleration.
                if (canvas.width !== 64) {
                    canvas.width = 64
                    canvas.height = 36 
                }
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                lastDrawTime = time
            }
        }

        animationFrameId = requestAnimationFrame(drawLoop)

        return () => {
            cancelAnimationFrame(animationFrameId)
        }
    }, [enabled, videoRef])

    if (!enabled) return null

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-70"
            style={{
                objectFit: "fill",
                filter: "blur(100px) saturate(250%) contrast(1.1)",
                transform: "scale(1.15)", // Escalar para evitar bordes nítidos de la imagen del canvas
                transition: "opacity 1s ease-in-out"
            }}
            aria-hidden="true"
        />
    )
}
