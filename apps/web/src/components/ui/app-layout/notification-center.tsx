import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import { useResponsive } from "@/hooks/use-responsive"
import { useGetNotifications, useMarkNotificationsRead, useClearNotifications } from "@/api/hooks/notifications.hooks"
import type { Models_Notification } from "@/api/generated/types"

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    scanner: Icons.status.fileVideo,
    mediastream: Icons.status.cpu,
    system: Icons.ui.info,
}

function relativeTime(dateStr?: string): string {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const diffSec = Math.round((date.getTime() - Date.now()) / 1000)
    const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" })
    const abs = Math.abs(diffSec)
    if (abs < 60) return rtf.format(Math.round(diffSec), "second")
    if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute")
    if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour")
    return rtf.format(Math.round(diffSec / 86400), "day")
}

/**
 * Sidebar notification bell + dropdown panel. Shows the unread badge, and on
 * open marks everything as read. New notifications arrive via the WebSocket
 * provider, which invalidates the query this component reads.
 */
export function NotificationBell({ sidebarOpen }: { sidebarOpen: boolean }) {
    const { isMobile } = useResponsive()
    const [open, setOpen] = React.useState(false)

    const { data } = useGetNotifications()
    const { mutate: markRead } = useMarkNotificationsRead()
    const { mutate: clearAll } = useClearNotifications()

    const notifications = data?.notifications ?? []
    const unreadCount = data?.unreadCount ?? 0

    const handleToggle = () => {
        const next = !open
        setOpen(next)
        if (next && unreadCount > 0) {
            markRead({})
        }
    }

    return (
        <>
            <div className="gsap-sidebar-item w-full flex justify-center">
                <button
                    onClick={handleToggle}
                    title="Notificaciones"
                    className={cn(
                        "flex items-center h-14 rounded-2xl group px-4 relative border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 w-full",
                        "active:scale-95 font-bold",
                        sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-14 w-full md:px-0",
                        open
                            ? "text-on-surface bg-white/[0.08]"
                            : "text-on-surface-variant hover:text-on-surface bg-white/[0.03] hover:bg-white/[0.07]"
                    )}
                >
                    <span className={cn("shrink-0 z-10 relative group-hover:scale-110 transition-transform duration-300", open && "text-on-surface")}>
                        <Icons.ui.bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-2.5 -right-2.5 bg-on-surface text-surface text-[8px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center border border-surface px-[3px]">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </span>
                    <span className={cn(
                        "uppercase tracking-[0.2em] text-[10px] font-black z-10 text-left transition-colors whitespace-nowrap",
                        (sidebarOpen || isMobile) ? "block" : "hidden md:hidden",
                        open ? "text-on-surface" : "group-hover:text-on-surface"
                    )}>
                        Notificaciones
                    </span>
                </button>
            </div>

            {open && typeof document !== "undefined" && createPortal(
                <>
                    {/* Click-outside catcher */}
                    <div className="fixed inset-0 z-[68]" onClick={() => setOpen(false)} />
                    <div
                        className={cn(
                            "fixed z-[70] flex flex-col overflow-hidden",
                            "bg-zinc-950/40 backdrop-blur-[var(--blur-overlay-xl)] border border-white/10 rounded-3xl",
                            isMobile
                                ? "left-4 right-4 bottom-24 max-h-[60vh]"
                                : "left-24 bottom-6 w-[380px] max-h-[70vh]"
                        )}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <span className="text-on-surface text-label-sm font-black uppercase tracking-widest font-mono">
                                Notificaciones
                            </span>
                            {notifications.length > 0 && (
                                <button
                                    onClick={() => clearAll(undefined)}
                                    className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface text-label-sm uppercase tracking-widest font-black transition-colors duration-base focus-visible:ring-2 focus-visible:ring-primary rounded-button px-2 py-1"
                                >
                                    <Icons.ui.delete className="w-3.5 h-3.5" />
                                    Limpiar
                                </button>
                            )}
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 py-12 text-on-surface-variant">
                                    <Icons.ui.inbox className="w-8 h-8 opacity-60" />
                                    <span className="text-body-md">No hay notificaciones</span>
                                </div>
                            ) : (
                                notifications.map((n: Models_Notification) => {
                                    const TypeIcon = TYPE_ICONS[n.type] ?? Icons.ui.info
                                    return (
                                        <div
                                            key={n.id}
                                            className={cn(
                                                "flex items-start gap-3 px-5 py-4 border-b border-white/[0.06] last:border-b-0 transition-colors duration-base",
                                                !n.read && "bg-white/[0.04]"
                                            )}
                                        >
                                            <TypeIcon className="w-4 h-4 mt-0.5 shrink-0 text-brand-primary" />
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <span className="text-on-surface text-label-md font-bold truncate">{n.title}</span>
                                                <span className="text-on-surface-variant text-body-md break-words">{n.message}</span>
                                                <span className="text-on-surface-variant/70 text-label-sm font-mono">{relativeTime(n.createdAt)}</span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    )
}
