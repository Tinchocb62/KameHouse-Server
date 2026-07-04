import React, { useCallback } from "react"
import { useScannerEvents } from "./hooks/use-scanner-events"
import { useScanLocalFiles } from "@/api/hooks/scan.hooks"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"
import { ScanButton, Card } from "@/routes/settings/components"
import { ProgressRing, PIPELINE_STAGES } from "./scanner-progress"

export function ScannerDashboard() {
    const { isScanning, scanProgress, scanningFile, activeStageIdx, lastFinish } = useScannerEvents()
    const { mutate: scan, isPending: scanPending } = useScanLocalFiles()

    const startMetadataImprovement = useCallback(() => {
        scan({ mode: "metadata", skipLockedFiles: false, skipIgnoredFiles: false })
    }, [scan])

    const startFastScan = useCallback(() => {
        scan({ mode: "fast", skipLockedFiles: false, skipIgnoredFiles: false })
    }, [scan])

    const startDeepScan = useCallback(() => {
        scan({ mode: "deep", skipLockedFiles: false, skipIgnoredFiles: false })
    }, [scan])

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ScanButton
                    title="Mejorar Metadatos"
                    description="Enriquecer sinopsis y portadas."
                    icon={Icons.status.sparkles}
                    onClick={startMetadataImprovement}
                    loading={isScanning && activeStageIdx < 5}
                />
                <ScanButton
                    title="Delta Scan"
                    description="Indexación incremental rápida."
                    icon={Icons.status.zap}
                    onClick={startFastScan}
                    loading={isScanning && activeStageIdx < 5}
                />
                <ScanButton
                    title="Deep Sync"
                    description="Reconstrucción de base de datos."
                    icon={Icons.ui.refresh}
                    onClick={startDeepScan}
                    loading={isScanning && activeStageIdx >= 5}
                    destructive={true}
                />
            </div>

            {/* Diagnostic Card */}
            <Card className="p-6">
                <div className="flex flex-col lg:flex-row items-center gap-6">
                    <div className="relative shrink-0 flex items-center justify-center p-1 bg-surface-container border border-outline-variant rounded-full shadow-elevation-1">
                        <ProgressRing progress={isScanning ? scanProgress : 0} size={80} stroke={4} />
                    </div>
                    
                    <div className="flex-1 space-y-2 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-2">
                            <Icons.status.flame className={cn("w-5 h-5", isScanning ? "text-brand-accent animate-pulse" : "text-on-surface-variant")} />
                            <span className="font-bebas text-xl text-on-surface uppercase tracking-wider">
                                {isScanning ? "Processing Pipeline" : "Standby del sistema"}
                            </span>
                        </div>
                        <p className="text-caption font-mono text-on-surface-variant max-w-sm truncate lg:max-w-md mx-auto lg:mx-0">
                            {isScanning ? (scanningFile || "Calibrando motor...") : "El sistema de indexación está listo para escaneo."}
                        </p>
                    </div>
                </div>

                {isScanning && (
                    <div className="mt-6 space-y-4">
                        <div className="flex justify-between items-center text-label-sm font-mono text-brand-accent px-1">
                            <span>{PIPELINE_STAGES[activeStageIdx]?.label || "Procesando"}</span>
                            <span>{Math.round(scanProgress)}%</span>
                        </div>
                        <div className="relative h-1.5 w-full bg-outline-variant/30 rounded-full overflow-hidden">
                            <div
                                className="absolute inset-y-0 left-0 bg-brand-accent transition-all duration-300"
                                style={{ width: `${scanProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}
