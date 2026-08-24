import React, { useId } from "react"
import { cn } from "@/components/ui/core/styling"

// Helper to compute SVG polygon points for a standard 5-point star
function getStarPoints(cx: number, cy: number, r: number): string {
    const points: string[] = []
    const innerR = r * 0.42
    for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5
        const rad = i % 2 === 0 ? r : innerR
        const x = cx + rad * Math.cos(angle)
        const y = cy + rad * Math.sin(angle)
        points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
    }
    return points.join(" ")
}

// Configuración canónica de posiciones de estrellas (1 a 7 estrellas) dentro de un viewBox 0 0 100 100
const STAR_CONFIGS: Record<number, Array<{ cx: number; cy: number; r: number }>> = {
    // 1 Estrella (Centro)
    1: [{ cx: 50, cy: 50, r: 12 }],
    // 2 Estrellas (Diagonal)
    2: [
        { cx: 37, cy: 37, r: 8.8 },
        { cx: 63, cy: 63, r: 8.8 },
    ],
    // 3 Estrellas (Triángulo)
    3: [
        { cx: 50, cy: 35, r: 8.2 },
        { cx: 36, cy: 62, r: 8.2 },
        { cx: 64, cy: 62, r: 8.2 },
    ],
    // 4 Estrellas (Rombo / Diamante canónico de la esfera de Goku)
    4: [
        { cx: 50, cy: 33, r: 8.2 },
        { cx: 33, cy: 50, r: 8.2 },
        { cx: 67, cy: 50, r: 8.2 },
        { cx: 50, cy: 67, r: 8.2 },
    ],
    // 5 Estrellas (Cruz / Quincunce)
    5: [
        { cx: 50, cy: 50, r: 7.6 },
        { cx: 35, cy: 35, r: 7.6 },
        { cx: 65, cy: 35, r: 7.6 },
        { cx: 35, cy: 65, r: 7.6 },
        { cx: 65, cy: 65, r: 7.6 },
    ],
    // 6 Estrellas (Hexágono)
    6: [
        { cx: 37, cy: 33, r: 7.2 },
        { cx: 63, cy: 33, r: 7.2 },
        { cx: 33, cy: 50, r: 7.2 },
        { cx: 67, cy: 50, r: 7.2 },
        { cx: 37, cy: 67, r: 7.2 },
        { cx: 63, cy: 67, r: 7.2 },
    ],
    // 7 Estrellas (1 central + 6 en círculo)
    7: [
        { cx: 50, cy: 50, r: 6.8 },
        { cx: 50, cy: 29, r: 6.8 },
        { cx: 68, cy: 39, r: 6.8 },
        { cx: 68, cy: 61, r: 6.8 },
        { cx: 50, cy: 71, r: 6.8 },
        { cx: 32, cy: 61, r: 6.8 },
        { cx: 32, cy: 39, r: 6.8 },
    ],
}

export function DragonBallSphere({
    starCount = 4,
    size = 32,
    className,
    glow = true,
}: {
    starCount?: number
    size?: number
    className?: string
    glow?: boolean
}) {
    const rawId = useId()
    const id = rawId.replace(/:/g, "-")
    const stars = STAR_CONFIGS[starCount] || STAR_CONFIGS[4]

    return (
        <div
            className={cn(
                "relative rounded-full select-none transform-gpu shrink-0 transition-transform duration-300",
                glow && "shadow-[0_0_14px_rgba(255,160,0,0.6),0_0_28px_rgba(230,81,0,0.3)]",
                className
            )}
            style={{ width: size, height: size }}
        >
            <svg
                viewBox="0 0 100 100"
                width={size}
                height={size}
                className="w-full h-full block overflow-visible drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
            >
                <defs>
                    {/* Gradiente 3D esférico ámbar principal */}
                    <radialGradient id={`db-sphere-${id}`} cx="35%" cy="30%" r="68%">
                        <stop offset="0%" stopColor="#fff9e6" />
                        <stop offset="14%" stopColor="#ffca28" />
                        <stop offset="38%" stopColor="#ff9800" />
                        <stop offset="68%" stopColor="#f57c00" />
                        <stop offset="88%" stopColor="#d84315" />
                        <stop offset="100%" stopColor="#4e0d00" />
                    </radialGradient>

                    {/* Rebote de luz ambiente inferior derecho */}
                    <radialGradient id={`db-rim-${id}`} cx="70%" cy="78%" r="45%">
                        <stop offset="0%" stopColor="#ffe082" stopOpacity="0.45" />
                        <stop offset="50%" stopColor="#ff9800" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#d84315" stopOpacity="0" />
                    </radialGradient>

                    {/* Brillo especular de cristal (reflejo superior izquierdo) */}
                    <radialGradient id={`db-gloss-${id}`} cx="35%" cy="25%" r="35%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                        <stop offset="35%" stopColor="#ffffff" stopOpacity="0.35" />
                        <stop offset="80%" stopColor="#ffffff" stopOpacity="0" />
                    </radialGradient>

                    {/* Sombra y relieve de las estrellas de rubí suspendidas */}
                    <filter id={`db-star-shadow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="1" stdDeviation="0.7" floodColor="#380400" floodOpacity="0.9" />
                    </filter>
                </defs>

                {/* 1. Cuerpo esférico translúcido */}
                <circle cx="50" cy="50" r="47" fill={`url(#db-sphere-${id})`} />

                {/* 2. Resplandor interno de borde */}
                <circle cx="50" cy="50" r="47" fill={`url(#db-rim-${id})`} />

                {/* 3. Estrellas de rubí internas con sombra */}
                <g filter={`url(#db-star-shadow-${id})`}>
                    {stars.map((star, i) => (
                        <polygon
                            key={i}
                            points={getStarPoints(star.cx, star.cy, star.r)}
                            fill="#c62828"
                            stroke="#8e0000"
                            strokeWidth="0.5"
                        />
                    ))}
                </g>

                {/* 4. Brillo especular de superficie de cristal (lente 3D) */}
                <ellipse
                    cx="38"
                    cy="26"
                    rx="20"
                    ry="10"
                    transform="rotate(-28 38 26)"
                    fill={`url(#db-gloss-${id})`}
                />
                {/* 5. Reflejo secundario sutil en el borde opuesto */}
                <ellipse
                    cx="65"
                    cy="75"
                    rx="11"
                    ry="4.5"
                    transform="rotate(-28 65 75)"
                    fill="#ffffff"
                    opacity="0.18"
                />
            </svg>
        </div>
    )
}

export function DragonBallSpinner({
    size = 220,
    ballSize = 30,
    className,
}: {
    size?: number
    ballSize?: number
    className?: string
}) {
    const radius = size * 0.38
    // Las 6 esferas que orbitarán en orden numérico armónico alrededor de la esfera de 4 estrellas
    const orbitingStars = [1, 2, 3, 5, 6, 7]

    return (
        <div
            className={cn("relative flex items-center justify-center select-none transform-gpu", className)}
            style={{ width: size, height: size }}
        >
            {/* Campo de Aura Ki resplandeciente de fondo */}
            <div className="absolute inset-0 rounded-full bg-radial from-amber-500/20 via-orange-500/10 to-transparent blur-md animate-pulse" />

            {/* Anillo de órbita místico con brillo tenue */}
            <div
                className="absolute rounded-full border border-amber-500/20 shadow-[0_0_12px_rgba(255,160,0,0.12)] animate-[spin_30s_linear_infinite]"
                style={{
                    width: radius * 2,
                    height: radius * 2,
                }}
            />

            {/* Esferas en órbita fluida de 60fps */}
            <div className="absolute inset-0 animate-[spin_7s_linear_infinite]">
                {orbitingStars.map((starNum, i) => {
                    const angleDeg = i * (360 / orbitingStars.length)
                    return (
                        <div
                            key={starNum}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                            style={{
                                transform: `rotate(${angleDeg}deg) translate(${radius}px)`,
                            }}
                        >
                            {/* Contragiro para mantener las estrellas erguidas y con animación de flotación */}
                            <div className="animate-[spin_7s_linear_infinite_reverse]">
                                <div
                                    className="animate-pulse"
                                    style={{ animationDelay: `${i * 200}ms` }}
                                >
                                    <DragonBallSphere
                                        starCount={starNum}
                                        size={ballSize}
                                        className="hover:scale-110 transition-transform duration-200"
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Centro: Esfera emblemática de 4 Estrellas con Ki radiante */}
            <div className="relative flex items-center justify-center z-10">
                {/* Doble resplandor de energía Ki */}
                <div className="absolute w-16 h-16 rounded-full bg-amber-400/25 blur-xl animate-pulse" />
                <div className="absolute w-10 h-10 rounded-full bg-orange-500/30 blur-md animate-ping" />
                
                <DragonBallSphere
                    starCount={4}
                    size={ballSize * 1.38}
                    className="shadow-[0_0_25px_rgba(255,170,0,0.9),0_0_55px_rgba(230,81,0,0.6),0_0_80px_rgba(255,140,0,0.35)] animate-[pulse_3s_ease-in-out_infinite]"
                />
            </div>
        </div>
    )
}
