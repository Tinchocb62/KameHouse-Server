import { createFileRoute } from "@tanstack/react-router"
import { motion } from "framer-motion"
import * as React from "react"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import { useScanLocalFiles } from "@/api/hooks/scan.hooks"

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
    return (
        <header className="relative z-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-4">
                    <div>
                        <h1 className="text-h2 font-display text-on-surface tracking-tight">Panel de Administración</h1>
                        <p className="text-body-md text-on-surface-variant/70 mt-2">Gestiona y monitorea tu instancia de KameHouse</p>
                    </div>
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto flex-wrap">
                        <button className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 h-10 border border-outline-variant text-on-surface-variant font-semibold text-sm rounded-button transition-all duration-fast hover:border-brand-accent hover:bg-brand-accent/10 active:scale-[0.97]">
                            <Icons.ui.download size={16} strokeWidth={2.5} />
                            Backup
                        </button>
                        <button className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 h-10 bg-brand-accent text-on-primary font-semibold text-sm rounded-button transition-all duration-fast active:scale-[0.97]">
                            <Icons.ui.refresh size={16} strokeWidth={2.5} />
                            Reiniciar Servicios
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}

function AdminStatsGrid() {
    const stats = [
        { label: "Series", value: "247", change: "+12", trend: "up", icon: Icons.navigation.tv, color: "var(--brand-primary)" },
        { label: "Películas", value: "89", change: "+3", trend: "up", icon: Icons.navigation.film, color: "var(--brand-secondary)" },
        { label: "Episodios", value: "12,847", change: "+456", trend: "up", icon: Icons.status.activity, color: "var(--brand-success)" },
        { label: "Espacio Usado", value: "2.4 TB", change: "156 GB libres", trend: "neutral", icon: Icons.status.hdd, color: "var(--brand-magic)" },
        { label: "Usuarios Activos", value: "1", change: "Admin", trend: "neutral", icon: Icons.navigation.user, color: "var(--md-sys-color-on-surface-variant)" },
        { label: "Salud del Servidor", value: "Óptimo", change: "99.9% uptime", trend: "up", icon: Icons.status.pulse, color: "var(--brand-success)" },
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
    const { mutate: scanLibrary } = useScanLocalFiles()

    const actions = [
        { label: "Escanear Biblioteca", desc: "Detectar nuevos archivos", icon: Icons.navigation.search, variant: "primary" as const, action: () => scanLibrary({ mode: "fast", skipLockedFiles: false, skipIgnoredFiles: false }) },
        { label: "Re-Scan Forzado", desc: "Ignorar cache y re-escanear todo", icon: Icons.ui.refresh, variant: "secondary" as const, action: () => scanLibrary({ mode: "deep", skipLockedFiles: false, skipIgnoredFiles: false }) },
        { label: "Match Manual", desc: "Resolver archivos no vinculados", icon: Icons.ui.link, variant: "outline" as const, action: () => {} },
        { label: "Limpiar Huérfanos", desc: "Eliminar entradas sin archivo", icon: Icons.ui.delete, variant: "destructive" as const, action: () => {} },
        { label: "Actualizar Metadatos", desc: "Refrescar info de TMDB/AniList", icon: Icons.status.database, variant: "outline" as const, action: () => {} },
        { label: "Generar Thumbnails", desc: "Crear previews de video", icon: Icons.status.image, variant: "outline" as const, action: () => {} },
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

function AdminSystemGrid() {
    const items = [
        { label: "Logs del Sistema", desc: "Ver eventos y errores recientes", icon: Icons.status.file, action: () => {} },
        { label: "Rendimiento", desc: "CPU, RAM, Disco, Red", icon: Icons.status.activity, action: () => {} },
        { label: "Configuración Avanzada", desc: "Variables de entorno y features", icon: Icons.ui.sliders, action: () => {} },
        { label: "Usuarios y Permisos", desc: "Gestionar accesos", icon: Icons.navigation.users, action: () => {} },
        { label: "Backup y Restore", desc: "Respaldos automáticos y manuales", icon: Icons.status.hdd, action: () => {} },
        { label: "Actualizaciones", desc: "Versión actual y disponible", icon: Icons.ui.refresh, action: () => {} },
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
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `hsl(${activity.color} / 0.12)`, color: `hsl(${activity.color})` }}>
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