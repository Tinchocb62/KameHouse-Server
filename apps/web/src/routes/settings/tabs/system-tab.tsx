import React from "react"
import { type Control, Controller, useWatch } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { toast } from "sonner"
import { useBackupDatabase } from "@/api/hooks/system.hooks"
import { buildSeaQuery } from "@/api/client/requests"
import { SecretField } from "@/components/settings/secret-field"
import { DangerZone } from "@/components/settings/danger-zone"
import { Icons } from "@/components/ui/icons"
import { SettingsSection, SettingsCard, OsToggle } from "../components"

interface SystemTabProps {
    control: Control<SettingsFormValues>
    onOpenWizard?: () => void
    searchQuery?: string
}

function ApiKeyCard({ name, description, connected, children }: { name: string; description: string; connected: boolean; children: React.ReactNode }) {
    return (
        <div className="bg-white/[0.02] rounded-xl p-4 space-y-3 border border-white/10">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <div>
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">{name}</h4>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">{description}</p>
                </div>
                {connected ? (
                    <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full shrink-0">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Conectado</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_hsl(var(--brand-success))]" />
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full shrink-0">
                        <span className="text-[10px] font-mono text-on-surface-variant uppercase">Sin configurar</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    </div>
                )}
            </div>
            {children}
        </div>
    )
}

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function SystemTab({ control, searchQuery }: SystemTabProps) {
    const { mutate: backupDb, isPending: isBackingUp } = useBackupDatabase()

    const tmdbApiKey = useWatch({ control, name: "library.tmdbApiKey" })

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

    const handleClearCache = async () => {
        toast.loading("Limpiando caché del sistema...", { id: "cache-toast" })
        try {
            await buildSeaQuery({
                endpoint: "/api/v1/system/cache/clear",
                method: "POST",
            })
            toast.success("Caché liberada correctamente", { id: "cache-toast" })
        } catch {
            toast.error("No se pudo limpiar la caché", { id: "cache-toast" })
        }
    }

    const connectedApiCount = tmdbApiKey ? 1 : 0

    return (
        <div className="w-full space-y-7 animate-in fade-in duration-base pb-8">

            {/* ═══════════════════════════════════════════════════════════════════
                1. PROVEEDORES Y CLAVES DE API
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Proveedores de Metadatos y APIs"
                description="Claves para enriquecer sinopsis, afiches en alta resolución y calificaciones oficiales."
                icon={Icons.ui.key}
                badge={
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {connectedApiCount} vinculada
                    </span>
                }
            >
                <SettingsCard divide={false} className="p-5 space-y-4">
                    <ApiKeyCard
                        name="The Movie Database (TMDB)"
                        description="Permite buscar automáticamente afiches oficiales, sinopsis de sagas y fechas de emisión."
                        connected={!!tmdbApiKey}
                    >
                        <Controller
                            control={control}
                            name="library.tmdbApiKey"
                            render={({ field }) => (
                                <SecretField
                                    label="API Key de TMDB v3"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    placeholder="Ingresa tu API Key de TMDB"
                                />
                            )}
                        />
                    </ApiKeyCard>
                </SettingsCard>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                2. MANTENIMIENTO Y NOTIFICACIONES
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Mantenimiento y Notificaciones"
                description="Respaldos de base de datos, limpieza de caché y avisos de sistema."
                icon={Icons.ui.rotate}
            >
                <SettingsCard>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/[0.01]">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold text-on-surface">Copia de Seguridad SQLite</p>
                                <p className="text-[11px] text-on-surface-variant">Genera un dump seguro de tu progreso.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleBackup}
                                disabled={isBackingUp}
                                className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-accent text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                {isBackingUp ? <Icons.ui.spinner className="w-3.5 h-3.5 animate-spin" /> : <Icons.status.archive className="w-3.5 h-3.5" />}
                                <span>{isBackingUp ? "Creando..." : "Crear Copia"}</span>
                            </button>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold text-on-surface">Limpieza de Caché</p>
                                <p className="text-[11px] text-on-surface-variant">Libera miniaturas y temporales.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleClearCache}
                                className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all active:scale-95"
                            >
                                <Icons.ui.trash className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Limpiar</span>
                            </button>
                        </div>
                    </div>

                    <Controller
                        control={control}
                        name="notifications.disableNotifications"
                        render={({ field }) => (
                            <OsToggle
                                label="Desactivar Todas las Notificaciones"
                                description="Silencia avisos flotantes de sistema en el navegador."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="notifications.disableAutoScannerNotifications"
                        render={({ field }) => (
                            <OsToggle
                                label="Silenciar Avisos del Escáner Automático"
                                description="No muestra alertas cuando el indexador añade episodios en segundo plano."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </SettingsCard>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                3. ZONA DE PELIGRO (CRÍTICO - COLAPSABLE)
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Zona de Peligro"
                description="Restablecer ajustes de fábrica o reiniciar el servidor."
                icon={Icons.ui.alert}
                collapsible
                defaultOpen={false}
                searchQuery={searchQuery}
                badge={
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        Crítico
                    </span>
                }
            >
                <div className="rounded-2xl border border-red-500/20 bg-red-950/[0.05] p-5">
                    <DangerZone
                        title="Restablecimiento y Zona de Peligro"
                        description="Acciones de mantenimiento que pueden restablecer la configuración de fábrica de KameHouse."
                    />
                </div>
            </SettingsSection>

        </div>
    )
}

