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
        const ctx = canvas?.getContext("2d", { alpha: false, willReadFrequently: false })

        if (!canvas || !ctx) return

        let lastDrawTime = 0
        const fpsLimit = 24
        const frameTime = 1000 / fpsLimit

        const drawLoop = (time: number) => {
            animationFrameId = requestAnimationFrame(drawLoop)

            const video = videoRef.current
            if (!video || video.paused || video.ended || video.readyState < 2) return

            if (time - lastDrawTime >= frameTime) {
                // Resolución ultra-baja: el browser promedía los píxeles (dominant color sampling)
                // El upscale + blur CSS hace el resto, igual que YouTube
                if (canvas.width !== 32) {
                    canvas.width = 32
                    canvas.height = 18
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
                    // Fuerte blur para difuminar los bloques de píxeles del canvas pequeño.
                    // saturate alto para que los colores sean vibrantes como en YouTube.
                    filter: "blur(80px) saturate(200%) brightness(0.9)",
                    opacity: 0.85,
                    // Evitar que el canvas renderice bordes pixelados al escalar
                    imageRendering: "auto",
                }}
            />
        </div>
    )
}
