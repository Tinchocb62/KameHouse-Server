"use client"

import { Link, useRouterState } from "@tanstack/react-router"
import { Home, Tv, Film, Settings } from "lucide-react"
import { cn } from "../core/styling"

const TV_NAV_ITEMS = [
    { to: "/home",     label: "Inicio",     Icon: Home },
    { to: "/series",   label: "Series",     Icon: Tv },
    { to: "/movies",   label: "Películas",  Icon: Film },
    { to: "/settings", label: "Ajustes",    Icon: Settings },
]

export function TvNavBar() {
    const { location } = useRouterState()

    return (
        <nav className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-3 px-8 py-4 backdrop-blur-[var(--blur-overlay-xl)] border-t border-outline-variant/50 shadow-elevation-3" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 95%, transparent)" }}>
            {TV_NAV_ITEMS.map(({ to, label, Icon }) => {
                const isActive = location.pathname === to || location.pathname.startsWith(to + "/")
                return (
                    <Link
                        key={to}
                        to={to}
                        className={cn(
                            "flex flex-col items-center gap-1.5 px-10 py-3 rounded-full transition-all duration-150",
                            "focus:outline-none focus-visible:outline-none",
                            "tv-focusable",
                            isActive
                                ? "bg-primary/15 text-primary"
                                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                        )}
                    >
                        <Icon className="w-6 h-6 shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">{label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}