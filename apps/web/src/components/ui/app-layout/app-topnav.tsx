import { useAppStore } from "@/lib/store"
import { Link } from "@tanstack/react-router"
import { Menu } from "lucide-react"
import { useState } from "react"
import { useLocation } from "@tanstack/react-router"

interface TopNavProps {
    title?: string
}

export const AppTopNav = ({ title }: TopNavProps) => {
    const { setSidebarOpen } = useAppStore()
    const isFullscreen = useAppStore(state => state.isFullscreen)

    if (isFullscreen) return null

    return (
        <header className="fixed top-0 left-0 right-0 z-[40] backdrop-blur-[var(--blur-overlay-xl)] border-b border-outline-variant/50 shadow-elevation-1" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 70%, transparent)" }}>
            <div className="flex items-center justify-between h-20 px-6 md:px-10">
                <div className="flex items-center ml-6 [&>*:not(:first-child)]:ml-6">
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="md:hidden p-3 rounded-full bg-surface-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all active:scale-[0.95]"
                        aria-label="Abrir menú"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {title && (
                        <h1 className="text-2xl font-bebas tracking-[0.1em] text-on-surface uppercase hidden md:block">
                            {title}
                        </h1>
                    )}
                </div>
            </div>
        </header>
    )
}

export const AppBottomNav = () => {
    const isFullscreen = useAppStore(state => state.isFullscreen)

    if (isFullscreen) return null

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 backdrop-blur-[var(--blur-overlay-xl)] border-t border-outline-variant/50 shadow-elevation-3 z-[40] flex items-center justify-around px-8 safe-area-pb" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 90%, transparent)" }}>
            <Link 
                to="/home" 
                activeProps={{ className: "text-primary scale-110" }}
                inactiveProps={{ className: "text-on-surface-variant" }}
                className="flex flex-col items-center transition-all duration-300 [&>*:not(:first-child)]:mt-1.5"
            >
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Inicio</span>
                <div className="w-1 h-1 rounded-full bg-current opacity-0 group-[.active]:opacity-100 transition-opacity" />
            </Link>
            <Link 
                to="/series" 
                activeProps={{ className: "text-primary scale-110" }}
                inactiveProps={{ className: "text-on-surface-variant" }}
                className="flex flex-col items-center transition-all duration-300 [&>*:not(:first-child)]:mt-1.5"
            >
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Series</span>
            </Link>
            <Link 
                to="/movies" 
                activeProps={{ className: "text-primary scale-110" }}
                inactiveProps={{ className: "text-on-surface-variant" }}
                className="flex flex-col items-center transition-all duration-300 [&>*:not(:first-child)]:mt-1.5"
            >
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Películas</span>
            </Link>
        </nav>
    )
}