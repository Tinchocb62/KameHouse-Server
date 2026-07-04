import * as React from "react"
import { AlertTriangle, FolderOpen, RefreshCcw, Database, Settings } from "lucide-react"
import { EmptyState as SharedEmptyState } from "@/components/shared/empty-state"
import { useNavigate } from "@tanstack/react-router"
export { ErrorBoundary } from "@/components/shared/app-error-boundary"

/**
 * Banner shown when a library error occurs.
 */
export function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="flex min-h-[100dvh] items-center justify-center -mt-20">
            <SharedEmptyState
                title="CONEXIÓN INTERRUMPIDA"
                message={message}
                illustration={<AlertTriangle className="w-16 h-16 text-on-surface-variant" />}
                action={
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-3 px-8 py-3 rounded-full bg-primary text-on-primary font-bebas tracking-widest active:scale-95"
                        aria-label="Reintentar conexión"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        REINTENTAR ACCESO
                    </button>
                }
            />
        </div>
    )
}

/**
 * Shown when the library is empty.
 */
export function EmptyState() {
    const navigate = useNavigate()
    return (
        <div className="flex min-h-[100dvh] items-center justify-center -mt-20 px-4">
            <SharedEmptyState
                title="BÓVEDA VACÍA"
                message="Aún no hay contenido listo para mostrar. Escanea tus rutas desde configuración para iniciar la sincronización."
                illustration={
                    <div className="relative flex justify-center items-center w-24 h-24 mx-auto mb-2">
                        {/* Database icon */}
                        <Database className="relative w-12 h-12 text-on-surface-variant" />
                    </div>
                }
                action={
                    <button
                        type="button"
                        onClick={() => navigate({ to: "/settings" })}
                        className="flex items-center gap-3 px-8 py-3.5 rounded-full bg-primary text-on-primary font-bebas tracking-widest text-sm active:scale-95"
                        aria-label="Ir a Configuración"
                    >
                        <Settings className="w-4 h-4" />
                        CONFIGURAR RUTAS
                    </button>
                }
            />
        </div>
    )
}
