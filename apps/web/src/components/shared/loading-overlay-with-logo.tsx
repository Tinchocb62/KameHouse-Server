import { Button } from "@/components/ui/button"
import { LoadingOverlay } from "@/components/ui/loading-spinner"
import { __isDesktop__ } from "@/types/constants"
import React, { useEffect, useState } from "react"
import { Settings, RefreshCw } from "lucide-react"

const CONNECTION_TIMEOUT_MS = 15000 // 15 seconds

export function LoadingOverlayWithLogo({ refetch, title, isError }: { refetch?: () => void, title?: string, isError?: boolean }) {
    const [timedOut, setTimedOut] = useState(false)

    const [prevIsError, setPrevIsError] = useState(isError)
    if (isError !== prevIsError) {
        setPrevIsError(isError)
        if (isError) {
            setTimedOut(true)
        }
    }

    useEffect(() => {
        if (isError) return
        const timer = setTimeout(() => {
            setTimedOut(true)
        }, CONNECTION_TIMEOUT_MS)
        return () => clearTimeout(timer)
    }, [isError])

    return (
        <LoadingOverlay showSpinner={false} className="bg-zinc-950 flex flex-col justify-center items-center">
            <div className="relative flex items-center justify-center w-48 h-48">
                {/* 7 Dragon Balls Orbiting - Pure CSS */}
                <div className="absolute w-full h-full animate-[spin_4s_linear_infinite] will-change-transform">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-3 h-3 bg-brand-orange rounded-full shadow-[0_0_10px_hsl(var(--brand-orange)/0.8)]"
                            style={{
                                top: "50%",
                                left: "50%",
                                transform: `rotate(${i * (360 / 7)}deg) translate(70px) rotate(-${i * (360 / 7)}deg)`,
                            }}
                        />
                    ))}
                </div>

                {/* Simple text or pulse inside the orbit */}
                <div className="w-4 h-4 bg-brand-orange/20 rounded-full animate-ping" />
            </div>

            {timedOut ? (
                <div className="flex flex-col items-center gap-4 mt-8 z-[1] animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest text-center max-w-xs">
                        Error de conexión<br />
                        <span className="opacity-50 mt-1 block font-light">El servidor no responde</span>
                    </p>
                    <div className="flex gap-4">
                        <Button
                            onClick={() => window.location.reload()}
                            intent="gray"
                            size="sm"
                            className="rounded-xl border-zinc-800 uppercase tracking-widest text-[10px]"
                            leftIcon={<RefreshCw />}
                        >
                            Reintentar
                        </Button>
                        <Button
                            onClick={() => { window.location.href = "/settings" }}
                            intent="white"
                            size="sm"
                            className="rounded-xl uppercase tracking-widest text-[10px]"
                            leftIcon={<Settings />}
                        >
                            Configuración
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mt-8 flex flex-col items-center gap-2 z-[1]">
                    <h1 className="text-white text-4xl font-bebas tracking-[0.3em] uppercase leading-none">
                        {title ?? "KAMEHOUSE"}
                    </h1>
                </div>
            )}

            {(__isDesktop__ && !!refetch) && (
                <Button
                    onClick={() => window.location.reload()}
                    className="mt-8 z-[1] rounded-none border-zinc-800"
                    intent="gray"
                    size="sm"
                    leftIcon={<RefreshCw />}
                >
                    Recargar página
                </Button>
            )}
        </LoadingOverlay>
    )
}
