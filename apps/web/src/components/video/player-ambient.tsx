import React, { useEffect, useRef } from "react"

interface PlayerAmbientBackdropProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    enabled: boolean
}

export function PlayerAmbientBackdrop({ videoRef, enabled }: PlayerAmbientBackdropProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!enabled) return

        let animationFrameId: number | null = null
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d", { alpha: false, willReadFrequently: false })

        if (!canvas || !ctx) return

        if (canvas.width !== 32) {
            canvas.width = 32
            canvas.height = 18
        }

        let lastDrawTime = 0
        const fpsLimit = 15
        const frameTime = 1000 / fpsLimit
        let isRunning = false

        const drawFrame = (time: number) => {
            if (!isRunning) return
            animationFrameId = requestAnimationFrame(drawFrame)

            if (document.visibilityState === "hidden") return

            const video = videoRef.current
            if (!video || video.paused || video.ended || video.readyState < 2) {
                stopLoop()
                return
            }

            if (time - lastDrawTime >= frameTime) {
                ctx.drawImage(video, 0, 0, 32, 18)
                lastDrawTime = time
            }
        }

        const startLoop = () => {
            if (isRunning) return
            isRunning = true
            animationFrameId = requestAnimationFrame(drawFrame)
        }

        const stopLoop = () => {
            isRunning = false
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId)
                animationFrameId = null
            }
        }

        const video = videoRef.current
        if (video) {
            video.addEventListener("play", startLoop)
            video.addEventListener("playing", startLoop)
            video.addEventListener("pause", stopLoop)
            video.addEventListener("ended", stopLoop)
            if (!video.paused && video.readyState >= 2) {
                startLoop()
            }
        }

        const handleVisibility = () => {
            if (document.visibilityState === "hidden") {
                stopLoop()
            } else if (video && !video.paused) {
                startLoop()
            }
        }
        document.addEventListener("visibilitychange", handleVisibility)

        return () => {
            stopLoop()
            document.removeEventListener("visibilitychange", handleVisibility)
            if (video) {
                video.removeEventListener("play", startLoop)
                video.removeEventListener("playing", startLoop)
                video.removeEventListener("pause", stopLoop)
                video.removeEventListener("ended", stopLoop)
            }
        }
    }, [enabled, videoRef])

    if (!enabled) return null

    return (
        /*
         * Wrapper con overflow:hidden para recortar los bordes del canvas escalado.
         * El canvas se escala al 200% para garantizar que NO queden bordes negros
         * sin importar la relación de aspecto del contenedor — exactamente como
         * lo hace YouTube con su modo cinemático.
         */
        <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{
                    // scale(2): garantiza que el canvas cubra todo el área aunque la relación
                    // de aspecto del contenedor no coincida con la del video (16:9).
                    // overflow:hidden en el padre recorta lo que sobresale → sin bordes negros.
                    transform: "scale(2)",
                    transformOrigin: "center center",
                    // Blur moderado para difuminar los bloques de píxeles del canvas pequeño.
                    // saturate alto para que los colores sean vibrantes como en YouTube.
                    filter: "blur(36px) saturate(180%) brightness(0.9)",
                    opacity: 0.85,
                    // Evitar que el canvas renderice bordes pixelados al escalar
                    imageRendering: "auto",
                }}
            />
        </div>
    )
}
