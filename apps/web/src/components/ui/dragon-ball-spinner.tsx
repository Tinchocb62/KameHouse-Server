import React from "react"
import { cn } from "@/components/ui/core/styling"

// Configuración de posiciones de estrellas (1 a 7 estrellas)
const STAR_LAYOUTS: Array<Array<{ x: number; y: number }>> = [
    // 1 Estrella
    [{ x: 0, y: 0 }],
    // 2 Estrellas
    [{ x: -2.5, y: 0 }, { x: 2.5, y: 0 }],
    // 3 Estrellas
    [{ x: 0, y: -2.5 }, { x: -2.5, y: 2 }, { x: 2.5, y: 2 }],
    // 4 Estrellas
    [{ x: -2.2, y: -2.2 }, { x: 2.2, y: -2.2 }, { x: -2.2, y: 2.2 }, { x: 2.2, y: 2.2 }],
    // 5 Estrellas
    [{ x: 0, y: 0 }, { x: -2.6, y: -2.6 }, { x: 2.6, y: -2.6 }, { x: -2.6, y: 2.6 }, { x: 2.6, y: 2.6 }],
    // 6 Estrellas
    [{ x: -2.5, y: -2.8 }, { x: 2.5, y: -2.8 }, { x: -3.2, y: 0 }, { x: 3.2, y: 0 }, { x: -2.5, y: 2.8 }, { x: 2.5, y: 2.8 }],
    // 7 Estrellas
    [{ x: 0, y: 0 }, { x: 0, y: -3.2 }, { x: -3, y: -1.2 }, { x: 3, y: -1.2 }, { x: -2.8, y: 2.2 }, { x: 2.8, y: 2.2 }, { x: 0, y: 3.2 }],
]

export function DragonBallSphere({
    starCount = 4,
    size = 28,
    className,
}: {
    starCount?: number
    size?: number
    className?: string
}) {
    // Definimos las posiciones del sprite para cada esfera (del 1 al 7)
    // Usamos una cuadrícula de 3x3 donde backgroundSize es 300%.
    const spritePositions: Record<number, { x: string, y: string }> = {
        7: { x: "50%", y: "0%" },     // Arriba Centro
        5: { x: "0%", y: "50%" },     // Medio Izquierda
        1: { x: "50%", y: "50%" },    // Medio Centro
        2: { x: "100%", y: "50%" },   // Medio Derecha
        6: { x: "0%", y: "100%" },    // Abajo Izquierda
        4: { x: "50%", y: "100%" },   // Abajo Centro
        3: { x: "100%", y: "100%" },  // Abajo Derecha
    }

    const pos = spritePositions[starCount] || spritePositions[4]

    return (
        <div
            className={cn(
                "relative rounded-full shrink-0 select-none transform-gpu transition-all duration-300",
                "shadow-[0_0_15px_rgba(255,160,0,0.6)]",
                className
            )}
            style={{
                width: size,
                height: size,
                backgroundImage: "url('/dragon-balls.png')",
                backgroundSize: "300%", 
                backgroundPosition: `${pos.x} ${pos.y}`,
                backgroundRepeat: "no-repeat"
            }}
        />
    )
}

export function DragonBallSpinner({
    size = 220,
    ballSize = 28,
    className,
}: {
    size?: number
    ballSize?: number
    className?: string
}) {
    const radius = size * 0.38
    
    // Las 6 esferas que orbitarán (excluimos la de 4 estrellas que va al centro)
    const orbitingStars = [1, 2, 3, 5, 6, 7]

    return (
        <div
            className={cn("relative flex items-center justify-center select-none transform-gpu", className)}
            style={{ width: size, height: size }}
        >
            {/* Anillo de aura Ki de fondo */}
            <div className="absolute inset-4 rounded-full border border-amber-500/20 bg-radial from-amber-500/10 via-amber-500/5 to-transparent blur-md animate-pulse" />

            {/* Esferas en órbita */}
            <div className="absolute inset-0 animate-[spin_5s_linear_infinite] will-change-transform">
                {orbitingStars.map((starNum, i) => {
                    const angleDeg = i * (360 / orbitingStars.length)
                    return (
                        <div
                            key={starNum}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"
                            style={{
                                transform: `rotate(${angleDeg}deg) translate(${radius}px) rotate(-${angleDeg}deg)`,
                                animationDelay: `${i * 180}ms`,
                            }}
                        >
                            <DragonBallSphere starCount={starNum} size={ballSize} />
                        </div>
                    )
                })}
            </div>

            {/* Centro: Esfera de 4 Estrellas emblemática resplandeciente */}
            <div className="relative flex items-center justify-center z-10">
                <div className="absolute w-12 h-12 rounded-full bg-amber-400/30 blur-xl animate-ping" />
                <DragonBallSphere starCount={4} size={ballSize * 1.35} className="shadow-[0_0_25px_rgba(255,160,0,1),0_0_50px_rgba(230,81,0,0.8)]" />
            </div>
        </div>
    )
}
