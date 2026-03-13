import { LuffyError } from "@/components/shared/luffy-error"
import { useQueryClient } from "@tanstack/react-query"
import { useLocation, useRouter } from "@tanstack/react-router"
import React from "react"

interface AppErrorBoundaryProps {
    error: any
    reset?: () => void
    resetErrorBoundary?: () => void
}

export function AppErrorBoundary({ error, reset, resetErrorBoundary }: AppErrorBoundaryProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const location = useLocation()

    React.useEffect(() => {
        if (resetErrorBoundary) {
            resetErrorBoundary()
        }
        if (reset) {
            reset()
        }
    }, [location.pathname])

    const handleReset = () => {
        if (resetErrorBoundary) {
            resetErrorBoundary()
        }
        if (reset) {
            reset()
        }
        
        // Detect chunk loading errors (Failed to fetch dynamically imported module)
        const isChunkLoadError = error?.message?.toLowerCase().includes("failed to fetch dynamically imported module") || 
                                 error?.name === "ChunkLoadError" ||
                                 error?.message?.toLowerCase().includes("import");
        
        if (isChunkLoadError) {
            window.location.reload();
            return;
        }

        router.invalidate()
        queryClient.invalidateQueries()
    }

    const isChunkLoadError = error?.message?.toLowerCase().includes("failed to fetch dynamically imported module") || 
                             error?.name === "ChunkLoadError" ||
                             error?.message?.toLowerCase().includes("import");

    return (
        <LuffyError
            title={isChunkLoadError ? "Actualización disponible" : "Error en el cliente"}
            reset={handleReset}
        >
            <p className="text-[#a1a1aa] mb-2 leading-relaxed text-sm">
                {isChunkLoadError 
                    ? "La aplicación ha sido actualizada. Haz click para recargar y obtener la última versión." 
                    : "Ha ocurrido un error inesperado en la interfaz que impidió cargar el módulo."}
            </p>
            {!isChunkLoadError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-left overflow-hidden">
                    <p className="text-red-400 font-mono text-xs truncate max-w-sm">
                        {(error as Error)?.message || "Unknown Error"}
                    </p>
                </div>
            )}
        </LuffyError>
    )
}
