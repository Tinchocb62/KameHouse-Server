import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { motion } from "framer-motion"
import * as React from "react"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import { useScanLocalFiles } from "@/api/hooks/scan.hooks"
import { useGetLibraryStats, useGetTranscodeStats } from "@/api/hooks/admin.hooks"
import { useBackupDatabase } from "@/api/hooks/system.hooks"
import { toast } from "sonner"

export const Route = createFileRoute("/admin/")({
    component: AdminPage,
})

function AdminPage() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen bg-surface text-on-surface overflow-x-hidden"
        >
            <div className="container-fluid py-8 md:py-12 lg:py-16">
                <AdminHeader />

                <main className="mt-8 md:mt-12 space-y-8 md:space-y-10">
                    <AdminStatsGrid />

                    <AdminSection title="Gestión de Biblioteca" subtitle="Escaneo y sincronización">
                        <AdminActionsGrid />
                    </AdminSection>

                    <AdminSection title="Transcodificación" subtitle="Motor de streaming, CPU, RAM y GPU en tiempo real">
                        <AdminTranscodePanel />
                    </AdminSection>

                    <AdminSection title="Servicios Externos" subtitle="TMDB, AniList, Trakt, etc.">
                        <AdminServicesGrid />
                    </AdminSection>

                    <AdminSection title="Sistema" subtitle="Configuración y monitoreo">
                        <AdminSystemGrid />
                    </AdminSection>

                    <AdminRecentActivity />
                </main>
            </div>
        </motion.div>
    )
}

function AdminHeader() {
    const { mutate: backupDb, isPending: isBackingUp } = useBackupDatabase()

    const handleBackup = () => {
        backupDb(undefined, {
            onSuccess: () => {
                toast.success("Respaldo de base de datos generado con éxito")
            },
            onError: () => {
                toast.error("Error al generar el respaldo")
            }
        })
    }

    return (
        <header className="relative z-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-4">
                    <div>
                        <h1 className="text-h2 font-display text-on-surface tracking-tight">Panel de Administración</h1>
                        <p className="text-body-md text-on-surface-variant/70 mt-2">Gestiona y monitorea tu instancia de KameHouse</p>
                    </div>
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto flex-wrap">
                        <button
                            onClick={handleBackup}
                            disabled={isBackingUp}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 h-10 border border-outline-variant text-on-surface-variant font-semibold text-sm rounded-button transition-all duration-fast hover:border-brand-accent hover:bg-brand-accent/10 active:scale-[0.97] disabled:opacity-50"
                        >
                            <Icons.ui.download size={16} strokeWidth={2.5} />
                            {isBackingUp ? "Creando..." : "Backup"}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}

function AdminStatsGrid() {
    const { data: libStats } = useGetLibraryStats()
    const { data: trStats } = useGetTranscodeStats()

    const cpuPercent = trStats?.system.cpuPercent?.toFixed(1) || "0.0"
    const memoryTotal = trStats?.system.memoryTotal ? (trStats.system.memoryTotal / 1024 / 1024 / 1024).toFixed(1) : "0.0"
    const memoryUsed = trStats?.system.memoryUsed ? (trStats.system.memoryUsed / 1024 / 1024 / 1024).toFixed(1) : "0.0"

    const stats = [
        { label: "Medios", value: libStats?.totalMedia?.toString() || "0", change: "Series y Películas", trend: "neutral", icon: Icons.navigation.tv, color: "var(--brand-primary)" },
        { label: "Archivos", value: libStats?.totalLocalFiles?.toString() || "0", change: "Ficheros indexados", trend: "neutral", icon: Icons.navigation.film, color: "var(--brand-secondary)" },
        { label: "CPU", value: `${cpuPercent}%`, change: "Uso del sistema", trend: "neutral", icon: Icons.status.activity, color: "var(--brand-success)" },
        { label: "Memoria", value: `${memoryUsed} GB`, change: `De ${memoryTotal} GB totales`, trend: "neutral", icon: Icons.status.hdd, color: "var(--brand-magic)" },
        { label: "Transcoder NVENC", value: trStats?.transcoderInitialized && trStats.governor ? `${trStats.governor.activeNvenc} / ${trStats.governor.nvencCap}` : "Inactivo", change: "Sesiones GPU activas", trend: "neutral", icon: Icons.navigation.tv, color: "var(--md-sys-color-on-surface-variant)" },
        { label: "Pre-Transcode", value: trStats?.preTranscodeQueue?.toString() || "0", change: "En cola", trend: "neutral", icon: Icons.status.pulse, color: "var(--brand-success)" },
    ]

    return (
        <section aria-labelledby="stats-title" className="mb-4">
            <h2 id="stats-title" className="sr-only">Estadísticas Generales</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-surface-container shadow-elevation-3 rounded-container p-6 backdrop-blur-overlay-md border border-outline-variant relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-on-surface/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-start justify-between">
                            <stat.icon size={28} className="text-on-surface-variant group-hover:text-on-surface transition-colors" style={{ color: stat.color }} />
                            <span className="text-caption text-on-surface-variant/70 uppercase tracking-wider">{stat.trend === "up" ? "↑" : stat.trend === "down" ? "↓" : "—"}</span>
                        </div>
                        <div className="text-h3 font-display text-on-surface font-extrabold tracking-tight mt-4" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {stat.value}
                        </div>
                        <div className="text-label-md mt-1">
                            <span className="text-on-surface-variant">{stat.label}</span>
                            <span className="text-on-surface-variant/70 ml-2">{stat.change}</span>
                        </div>
                        </div>
                ))}
            </div>
        </section>
    )
}

function AdminSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <section className="mb-8 md:mb-10" aria-labelledby={title.toLowerCase().replace(/\s+/g, '-')}>
            <div className="flex items-end justify-between gap-4 mb-6">
                <div>
                    <h2 id={title.toLowerCase().replace(/\s+/g, '-')} className="text-h3 font-display text-on-surface uppercase tracking-wide">
                        {title}
                    </h2>
                    {subtitle && <p className="text-body-sm text-on-surface-variant/70 mt-1">{subtitle}</p>}
                </div>
            </div>
            {children}
        </section>
    )
}

function AdminActionsGrid() {
    const navigate = useNavigate()
    const { mutate: scanLibrary } = useScanLocalFiles()

    const actions = [
        { label: "Escanear Biblioteca", desc: "Detectar nuevos archivos", icon: Icons.navigation.search, variant: "primary" as const, action: () => scanLibrary({ mode: "fast", skipLockedFiles: false, skipIgnoredFiles: false }) },
        { label: "Re-Scan Forzado", desc: "Ignorar cache y re-escanear todo", icon: Icons.ui.refresh, variant: "secondary" as const, action: () => scanLibrary({ mode: "deep", skipLockedFiles: false, skipIgnoredFiles: false }) },
        { label: "Match Manual", desc: "Resolver archivos no vinculados", icon: Icons.ui.link, variant: "outline" as const, action: () => navigate({ to: "/settings", search: { tab: "library" } }) },
        { label: "Limpiar Huérfanos", desc: "Eliminar entradas sin archivo", icon: Icons.ui.delete, variant: "destructive" as const, action: () => navigate({ to: "/settings", search: { tab: "library" } }) },
        { label: "Actualizar Metadatos", desc: "Refrescar info de TMDB/AniList", icon: Icons.status.database, variant: "outline" as const, action: () => navigate({ to: "/settings", search: { tab: "library" } }) },
        { label: "Configurar Pre-Transcode", desc: "Gestionar caché y perfiles", icon: Icons.status.image, variant: "outline" as const, action: () => navigate({ to: "/settings", search: { tab: "performance" } }) },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actions.map((action, i) => (
                <div key={i} onClick={action.action} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); action.action(); } }} className="bg-surface-container shadow-elevation-3 rounded-container p-6 backdrop-blur-overlay-md border border-outline-variant cursor-pointer transition-all duration-base hover:shadow-elevation-4 active:scale-[0.98] group">
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform",
                            action.variant === "primary" && "bg-brand-accent/20 text-brand-accent",
                            action.variant === "secondary" && "bg-brand-secondary/20 text-brand-secondary",
                            action.variant === "destructive" && "bg-brand-destructive/20 text-brand-destructive",
                            action.variant === "outline" && "bg-surface-container border border-outline-variant text-on-surface-variant",
                            (action.variant as string) === "magic" && "bg-brand-magic/20 text-brand-magic",
                        )}>
                            <action.icon size={24} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-h6 font-display text-on-surface tracking-wide">{action.label}</h3>
                            <p className="text-body-sm text-on-surface-variant/70 mt-1">{action.desc}</p>
                        </div>
                        <Icons.arrow.right size={20} className="text-on-surface-variant/70 group-hover:text-brand-accent transition-colors shrink-0 mt-1" />
                    </div>
                </div>
            ))}
        </div>
    )
}

function AdminServicesGrid() {
    const services = [
        { name: "TMDB", status: "connected", desc: "Metadatos de películas/series", lastSync: "Hace 2 min", icon: Icons.status.cloud },
        { name: "AniList", status: "connected", desc: "Metadatos de anime/manga", lastSync: "Hace 5 min", icon: Icons.status.database },
        { name: "Trakt", status: "disconnected", desc: "Sincronización de progreso", lastSync: "Nunca", icon: Icons.status.server },
        { name: "Fanart.tv", status: "connected", desc: "Arte y fondos de alta calidad", lastSync: "Hace 1 hora", icon: Icons.status.image },
        { name: "OMDb", status: "error", desc: "Datos complementarios", lastSync: "Error API", icon: Icons.ui.alert },
        { name: "OpenSubtitles", status: "connected", desc: "Subtítulos automáticos", lastSync: "Hace 30 min", icon: Icons.ui.message },
    ]

    const getStatusConfig = (status: string) => {
        switch (status) {
            case "connected": return { color: "var(--brand-success)", label: "Conectado", icon: Icons.ui.checkCircle }
            case "disconnected": return { color: "var(--md-sys-color-on-surface-variant)", label: "Desconectado", icon: Icons.ui.xCircle }
            case "error": return { color: "var(--brand-destructive)", label: "Error", icon: Icons.ui.alertCircle }
            default: return { color: "var(--md-sys-color-on-surface-variant)", label: "Desconocido", icon: Icons.ui.helpCircle }
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, i) => {
                const status = getStatusConfig(service.status)
                return (
                    <div key={i} className="bg-surface-container shadow-elevation-3 rounded-container p-6 backdrop-blur-overlay-md border border-outline-variant">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center">
                                    <service.icon size={24} className="text-on-surface-variant/80" />
                                </div>
                                <div>
                                    <h3 className="text-h6 font-display text-on-surface tracking-wide">{service.name}</h3>
                                    <p className="text-body-sm text-on-surface-variant/70 mt-1">{service.desc}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <status.icon size={16} className="shrink-0" style={{ color: status.color }} />
                                <span className="text-caption font-bold uppercase tracking-wider" style={{ color: status.color }}>{status.label}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
                            <span className="text-caption text-on-surface-variant/70">Última sync: </span>
                            <span className="text-caption text-on-surface-variant font-mono">{service.lastSync}</span>
                            <button onClick={() => {}} className="inline-flex items-center justify-center gap-1.5 px-3 h-7 text-on-surface-variant font-semibold text-xs rounded-button transition-all duration-fast hover:bg-surface-container active:scale-[0.97]">
                                {service.status === "connected" ? "Desconectar" : "Conectar"}
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function StatBar({ label, value, max, display, color }: { label: string; value: number; max: number; display: string; color?: string }) {
    const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">
                <span>{label}</span>
                <span className="font-mono normal-case tracking-normal" style={{ fontVariantNumeric: "tabular-nums" }}>{display}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden border border-white/5">
                <div
                    className="h-full rounded-full transition-all duration-base ease-smooth-out"
                    style={{ width: `${percent}%`, background: color || "var(--brand-accent)" }}
                />
            </div>
        </div>
    )
}

function formatGb(bytes: number | undefined): string {
    return ((bytes || 0) / 1024 / 1024 / 1024).toFixed(1)
}

function AdminTranscodePanel() {
    const { data: stats, isLoading } = useGetTranscodeStats()

    const governor = stats?.governor
    const system = stats?.system
    const gpu = stats?.gpu

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Motor de transcodificación */}
            <div className="bg-surface-container shadow-elevation-3 rounded-container p-6 border border-outline-variant flex flex-col gap-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-h6 font-display text-on-surface tracking-wide">Motor de Streaming</h3>
                    <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-bold uppercase tracking-widest border",
                        stats?.transcoderInitialized
                            ? "bg-brand-success/15 border-brand-success/30 text-brand-success"
                            : "bg-white/5 border-white/10 text-on-surface-variant"
                    )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", stats?.transcoderInitialized ? "bg-brand-success animate-pulse" : "bg-on-surface-variant/50")} />
                        {stats?.transcoderInitialized ? "Activo" : "En reposo"}
                    </span>
                </div>
                {governor ? (
                    <>
                        <StatBar
                            label="Procesos ffmpeg"
                            value={governor.activeProcesses}
                            max={governor.maxConcurrency}
                            display={`${governor.activeProcesses} / ${governor.maxConcurrency}`}
                        />
                        <StatBar
                            label="Sesiones NVENC"
                            value={governor.activeNvenc}
                            max={governor.nvencCap}
                            display={`${governor.activeNvenc} / ${governor.nvencCap}`}
                            color="var(--brand-success)"
                        />
                        <div className="flex items-center justify-between text-body-sm text-on-surface-variant/70 mt-auto pt-4 border-t border-outline-variant">
                            <span>Lanzados: <span className="font-mono text-on-surface-variant">{governor.totalLaunched}</span></span>
                            <span>Completados: <span className="font-mono text-on-surface-variant">{governor.totalCompleted}</span></span>
                        </div>
                    </>
                ) : (
                    <p className="text-body-sm text-on-surface-variant/70 my-auto">
                        {isLoading ? "Cargando…" : "El transcoder está dormido. Se despierta al reproducir un stream que lo necesite."}
                    </p>
                )}
                <div className="flex items-center justify-between text-body-sm text-on-surface-variant/70">
                    <span>Cola de pre-transcode</span>
                    <span className="font-mono text-on-surface-variant">{stats?.preTranscodeQueue ?? 0}</span>
                </div>
            </div>

            {/* Sistema */}
            <div className="bg-surface-container shadow-elevation-3 rounded-container p-6 border border-outline-variant flex flex-col gap-5">
                <h3 className="text-h6 font-display text-on-surface tracking-wide">Sistema</h3>
                <StatBar
                    label="CPU"
                    value={system?.cpuPercent || 0}
                    max={100}
                    display={`${(system?.cpuPercent || 0).toFixed(1)}%`}
                />
                <StatBar
                    label="Memoria RAM"
                    value={system?.memoryUsed || 0}
                    max={system?.memoryTotal || 1}
                    display={`${formatGb(system?.memoryUsed)} / ${formatGb(system?.memoryTotal)} GB`}
                    color="var(--brand-secondary)"
                />
            </div>

            {/* GPU (solo si nvidia-smi respondió) */}
            <div className="bg-surface-container shadow-elevation-3 rounded-container p-6 border border-outline-variant flex flex-col gap-5">
                <h3 className="text-h6 font-display text-on-surface tracking-wide">GPU · NVIDIA</h3>
                {gpu ? (
                    <>
                        <StatBar label="Uso de GPU" value={gpu.utilization} max={100} display={`${gpu.utilization}%`} />
                        <StatBar label="Encoder NVENC" value={gpu.encoder} max={100} display={`${gpu.encoder}%`} color="var(--brand-success)" />
                        <StatBar
                            label="VRAM"
                            value={gpu.memoryUsed}
                            max={gpu.memoryTotal || 1}
                            display={`${gpu.memoryUsed} / ${gpu.memoryTotal} MB`}
                            color="var(--brand-magic)"
                        />
                    </>
                ) : (
                    <p className="text-body-sm text-on-surface-variant/70 my-auto">
                        {isLoading ? "Cargando…" : "No se detectó nvidia-smi en el servidor."}
                    </p>
                )}
            </div>
        </div>
    )
}

function AdminSystemGrid() {
    const navigate = useNavigate()

    const items = [
        { label: "Logs y Diagnóstico", desc: "Ver reportes y eventos del sistema", icon: Icons.status.file, action: () => navigate({ to: "/settings", search: { tab: "system" } }) },
        { label: "Configuración Avanzada", desc: "Ajustes de rendimiento y hardware", icon: Icons.ui.sliders, action: () => navigate({ to: "/settings", search: { tab: "performance" } }) },
        { label: "Rutas de Biblioteca", desc: "Gestionar carpetas de series y películas", icon: Icons.navigation.users, action: () => navigate({ to: "/settings", search: { tab: "library" } }) },
        { label: "Backup y Base de Datos", desc: "Respaldos y mantenimiento de SQLite", icon: Icons.status.hdd, action: () => navigate({ to: "/settings", search: { tab: "system" } }) },
        { label: "Apariencia y Temas", desc: "Personalización visual y eras", icon: Icons.ui.refresh, action: () => navigate({ to: "/settings", search: { tab: "appearance" } }) },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, i) => (
                <div key={i} onClick={item.action} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); item.action(); } }} className="bg-surface-container shadow-elevation-3 rounded-container p-6 backdrop-blur-overlay-md border border-outline-variant cursor-pointer transition-all duration-base hover:shadow-elevation-4 active:scale-[0.98] group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center group-hover:bg-surface-container-high transition-colors">
                            <item.icon size={24} className="text-on-surface-variant/80" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-h6 font-display text-on-surface tracking-wide">{item.label}</h3>
                            <p className="text-body-sm text-on-surface-variant/70 mt-1">{item.desc}</p>
                        </div>
                        <Icons.arrow.right size={20} className="text-on-surface-variant/70 group-hover:text-brand-accent transition-colors shrink-0 mt-1" />
                    </div>
                </div>
            ))}
        </div>
    )
}

function AdminRecentActivity() {
    const activities = [
        { time: "Hace 5 min", type: "scan", message: "Escaneo completado: 12 series, 3 películas nuevas", icon: Icons.ui.checkCircle, color: "var(--brand-success)" },
        { time: "Hace 15 min", type: "match", message: "Match manual: Dragon Ball GT vinculado correctamente", icon: Icons.ui.link, color: "var(--brand-primary)" },
        { time: "Hace 1 hora", type: "sync", message: "Sincronización TMDB completada: 247 items actualizados", icon: Icons.status.cloud, color: "var(--brand-secondary)" },
        { time: "Hace 3 horas", type: "error", message: "Error en Trakt API: Rate limit exceeded", icon: Icons.ui.alertCircle, color: "var(--brand-destructive)" },
        { time: "Hace 6 horas", type: "backup", message: "Backup automático completado: 2.1 GB", icon: Icons.status.hdd, color: "var(--brand-magic)" },
        { time: "Ayer", type: "scan", message: "Escaneo programado: 0 nuevos items", icon: Icons.navigation.search, color: "var(--muted-foreground)" },
    ]

    return (
        <section aria-labelledby="activity-title" className="mb-4">
            <h2 id="activity-title" className="sr-only">Actividad Reciente</h2>
            <div className="bg-surface-container shadow-elevation-3 rounded-container p-6 backdrop-blur-overlay-md border border-outline-variant">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-h5 font-display text-on-surface uppercase tracking-wide">Actividad Reciente</h3>
                    <button className="inline-flex items-center justify-center gap-2 px-4 h-9 text-on-surface-variant font-semibold text-xs rounded-button transition-all duration-fast hover:bg-surface-container active:scale-[0.97]">
                        Ver Todo
                        <Icons.arrow.right size={14} strokeWidth={2.5} className="ml-1" />
                    </button>
                </div>
                <div className="space-y-4">
                    {activities.map((activity, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-container-high transition-colors">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${activity.color} 12%, transparent)`, color: activity.color }}>
                                <activity.icon size={20} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-body-md text-on-surface">{activity.message}</p>
                                <p className="text-caption text-on-surface-variant/70 mt-1">{activity.time}</p>
                            </div>
                            <span className="text-caption text-on-surface-variant/70 uppercase tracking-wider shrink-0 mt-1">{activity.type}</span>
                        </div>
                    ))}
                </div>
                </div>
        </section>
    )
}