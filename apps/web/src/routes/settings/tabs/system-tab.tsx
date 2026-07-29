import React from "react"
import { Section, Card, OsToggle } from "../components"
import { DangerZone } from "@/components/settings/danger-zone"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { toast } from "sonner"
import { useBackupDatabase } from "@/api/hooks/system.hooks"
import { getServerBaseUrl } from "@/api/client/server-url"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
interface SystemTabProps {
    control: Control<SettingsFormValues>
}

const HardDriveIcon = () => (
    <svg className="w-[18px] h-[18px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="6" y1="14" x2="6.01" y2="14" />
        <line x1="10" y1="14" x2="10.01" y2="14" />
    </svg>
)

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function SystemTab({ control }: SystemTabProps) {
    const { mutate: backupDb, isPending: isBackingUp } = useBackupDatabase()

    const handleBackup = () => {
        backupDb(undefined, {
            onSuccess: (data) => {
                if (data) {
                    toast.success(`Respaldo generado con éxito (${formatBytes(data.sizeBytes)})`)
                } else {
                    toast.success(`Respaldo generado con éxito`)
                }
            }
        })
    }

    const handleGenerateReport = async () => {
        toast.loading("Generando reporte...", { id: "report-toast" })
        try {
            const url = `${getServerBaseUrl() || window.location.origin}${API_ENDPOINTS.SYSTEM.GetDiagnosticsReport.endpoint}`
            const res = await fetch(url)
            if (!res.ok) throw new Error("Error fetching report")
            
            const blob = await res.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            
            const contentDisposition = res.headers.get("content-disposition")
            let filename = "kamehouse-diagnostics.zip"
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/)
                if (match && match[1]) filename = match[1]
            }

            const a = document.createElement("a")
            a.href = downloadUrl
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(downloadUrl)
            a.remove()
            toast.success("Reporte descargado", { id: "report-toast" })
        } catch {
            toast.error("Error al generar el reporte", { id: "report-toast" })
        }
    }

    const handleClearCache = async () => {
        if (!("caches" in window)) {
            toast.error("Este navegador no soporta la API de cachés")
            return
        }
        try {
            const keys = await caches.keys()
            await Promise.all(keys.map((k) => caches.delete(k)))
            if (keys.length > 0) {
                toast.success(`${keys.length} caché(s) locales eliminadas — recargá la página para regenerarlas`)
            } else {
                toast.info("No había cachés locales que limpiar")
            }
        } catch {
            toast.error("No se pudo limpiar la caché local")
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            {/* Aplicación & Core DB Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {/* Aplicación */}
                <div className="bg-surface-container rounded-container p-6 shadow-elevation-1 md:col-span-2 space-y-5 divide-y divide-outline-variant/3">
                    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Aplicación</h4>
                    <Controller
                        control={control}
                        name="library.openWebURLOnStart"
                        render={({ field }) => (
                            <OsToggle
                                label="Abrir Interfaz Web al Iniciar"
                                description="Abre automáticamente el navegador con KameHouse al arrancar el servidor."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="Platform.hideAudienceScore"
                        render={({ field }) => (
                            <OsToggle
                                label="Ocultar Puntuación de Audiencia"
                                description="No mostrar la puntuación de la comunidad en las tarjetas de media."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </div>

                {/* Base de Datos Core */}
                <div className="bg-surface-container rounded-container p-6 shadow-elevation-1 flex flex-col justify-between">
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                            <HardDriveIcon /> Base de Datos Core
                        </h4>
                        <span className="text-label-sm font-mono text-on-surface-variant block">Engine: SQLite 3</span>
                    </div>
                    <div className="pt-5 flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={handleBackup}
                            disabled={isBackingUp}
                            className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-label-sm font-bold uppercase tracking-widest text-on-surface-variant rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isBackingUp ? "Respaldando..." : "Respaldar DB"}
                        </button>
                        <button
                            type="button"
                            onClick={handleGenerateReport}
                            className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-label-sm font-bold uppercase tracking-widest text-on-surface-variant rounded-xl transition-all active:scale-[0.98]"
                        >
                            Generar Reporte
                        </button>
                        <button
                            type="button"
                            onClick={handleClearCache}
                            className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-label-sm font-bold uppercase tracking-widest text-on-surface-variant rounded-xl transition-all active:scale-[0.98]"
                        >
                            Limpiar Caché Local
                        </button>
                    </div>
                </div>
            </div>

            {/* Zona de Peligro */}
            <Section label="Zona de Peligro">
                <Card>
                    <DangerZone
                        title="Zona de Riesgo Crítico"
                        description="Operaciones destructivas que alteran permanentemente los datos del servidor KameHouse."
                    />
                </Card>
            </Section>
        </div>
    )
}
