import { useQueryClient } from "@tanstack/react-query"
import { useLocation, useRouter } from "@tanstack/react-router"
import React from "react"
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary"

interface AppErrorBoundaryProps {
    error: unknown
    resetErrorBoundary?: () => void
}

export function AppErrorBoundary({ error, resetErrorBoundary }: AppErrorBoundaryProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const location = useLocation()

    const initialPathname = React.useRef(location.pathname)

    React.useEffect(() => {
        console.error("AppErrorBoundary caught error:", error);
    }, [error])

    React.useEffect(() => {
        if (location.pathname !== initialPathname.current && resetErrorBoundary) {
            resetErrorBoundary()
        }
    }, [location.pathname, resetErrorBoundary])

    const handleReset = () => {
        if (resetErrorBoundary) {
            resetErrorBoundary()
        }
        
        // Detect chunk loading errors (Failed to fetch dynamically imported module)
        const err = error as Error | undefined;
        const isChunkLoadError = err?.name === "ChunkLoadError" ||
                                 err?.message?.toLowerCase().includes("failed to fetch dynamically imported module") ||
                                 err?.message?.toLowerCase().includes("dynamically imported module");
        
        if (isChunkLoadError) {
            window.location.reload();
            return;
        }

        router.invalidate()
        queryClient.invalidateQueries()
    }

    const err = error as Error | undefined;
    const isChunkLoadError = err?.name === "ChunkLoadError" ||
                             err?.message?.toLowerCase().includes("failed to fetch dynamically imported module") ||
                             err?.message?.toLowerCase().includes("dynamically imported module");

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-black border border-zinc-800">
            <h2 className="text-2xl font-display tracking-widest text-white mb-4 uppercase">
                {isChunkLoadError ? "Actualización disponible" : "Error en el cliente"}
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed text-sm max-w-md">
                {isChunkLoadError 
                    ? "La aplicación ha sido actualizada. Haz click para recargar y obtener la última versión." 
                    : "Ha ocurrido un error inesperado en la interfaz que impidió cargar el módulo."}
            </p>
            {!isChunkLoadError && (
                <div className="mb-8 p-4 bg-zinc-900 border border-zinc-800 text-left overflow-hidden w-full max-w-md">
                    <p className="text-status-error font-mono text-xs break-all">
                        {(error as Error)?.message || "Unknown Error"}
                    </p>
                </div>
            )}
            <button
                onClick={handleReset}
                className="px-8 py-3 bg-white text-black font-black text-xs uppercase tracking-ultra hover:bg-zinc-200 transition-colors"
            >
                {isChunkLoadError ? "RECARGAR AHORA" : "REINTENTAR ACCESO"}
            </button>
        </div>
    )
}

interface ErrorBoundaryWrapperProps {
    children: React.ReactNode
    className?: string
    onReset?: (...args: unknown[]) => void
    resetKeys?: unknown[]
}

export function ErrorBoundary({ children, className, ...props }: ErrorBoundaryWrapperProps) {
    return (
        <div className={className}>
            <ReactErrorBoundary
                FallbackComponent={AppErrorBoundary}
                {...props}
            >
                {children}
            </ReactErrorBoundary>
        </div>
    )
}
