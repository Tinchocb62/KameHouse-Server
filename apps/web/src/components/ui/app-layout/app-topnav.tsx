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
        <header className="fixed top-0 left-0 right-0 z-[40] bg-zinc-950/60 backdrop-blur-2xl border-b border-white/[0.03]">
            <div className="flex items-center justify-between h-20 px-6 md:px-10">
                <div className="flex items-center ml-6 [&>*:not(:first-child)]:ml-6">
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="md:hidden p-3 rounded-xl bg-white/5 text-white/50 hover:text-white transition-all active:scale-90"
                        aria-label="Abrir menú"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {title && (
                        <h1 className="text-2xl font-display tracking-[0.1em] text-white uppercase hidden md:block">
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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-zinc-950/80 backdrop-blur-3xl border-t border-white/[0.05] z-[40] flex items-center justify-around px-8 safe-area-pb">
            <Link 
                to="/home" 
                activeProps={{ className: "text-brand-orange scale-110" }}
                inactiveProps={{ className: "text-zinc-600" }}
                className="flex flex-col items-center transition-all duration-300 [&>*:not(:first-child)]:mt-1.5"
            >
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Inicio</span>
                <div className="w-1 h-1 rounded-full bg-current opacity-0 group-[.active]:opacity-100 transition-opacity" />
            </Link>
            <Link 
                to="/series" 
                activeProps={{ className: "text-brand-orange scale-110" }}
                inactiveProps={{ className: "text-zinc-600" }}
                className="flex flex-col items-center transition-all duration-300 [&>*:not(:first-child)]:mt-1.5"
            >
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Series</span>
            </Link>
            <Link 
                to="/movies" 
                activeProps={{ className: "text-brand-orange scale-110" }}
                inactiveProps={{ className: "text-zinc-600" }}
                className="flex flex-col items-center transition-all duration-300 [&>*:not(:first-child)]:mt-1.5"
            >
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Películas</span>
            </Link>
        </nav>
    )
}
