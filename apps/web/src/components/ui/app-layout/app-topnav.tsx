import { useAppStore } from "@/lib/store"
import { Link, useLocation } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { cn } from "../core/styling"
import { Icons } from "@/components/ui/icons"
import { NotificationBell } from "./notification-center"

interface TopNavProps {
    title?: string
}

export const AppTopNav = ({ title }: TopNavProps) => {
    const { setSidebarOpen } = useAppStore()
    const isFullscreen = useAppStore(state => state.isFullscreen)
    const [isScrolled, setIsScrolled] = useState(false)
    const location = useLocation()
    const pathname = location.pathname

    useEffect(() => {
        setIsScrolled(false)
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsScrolled(!entry.isIntersecting)
            },
            { threshold: [0], root: null }
        )
        const sentinel = document.getElementById("scroll-sentinel")
        if (sentinel) {
            observer.observe(sentinel)
        }
        return () => {
            observer.disconnect()
        }
    }, [pathname])

    if (isFullscreen) return null

    return (
        <header 
            className={cn(
                "md:hidden fixed top-0 left-0 right-0 z-[40] h-16 px-4 flex items-center justify-between border-b transition-all duration-300",
                isScrolled 
                    ? "backdrop-blur-[var(--blur-overlay-xl)] border-outline-variant/30 shadow-elevation-1 bg-zinc-950/80" 
                    : "bg-transparent border-transparent"
            )}
        >
            <div className="flex items-center gap-2.5">
                <img
                    src="/kamehouse-logo.png"
                    alt="KameHouse"
                    className="h-7 w-7 object-contain"
                />
                <span className="font-bebas text-lg text-on-surface tracking-wider uppercase">
                    {title || "KAMEHOUSE"}
                </span>
            </div>

            <div className="flex items-center gap-1">
                <button 
                    onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
                    className="p-2.5 rounded-full text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
                    aria-label="Buscar"
                >
                    <Icons.navigation.search className="w-5 h-5" />
                </button>

                <NotificationBell sidebarOpen={true} />

                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="p-2.5 rounded-full text-on-surface-variant hover:text-on-surface active:scale-[0.95] transition-all"
                    aria-label="Abrir menú"
                >
                    <Icons.navigation.menu className="w-5 h-5" />
                </button>
            </div>
        </header>
    )
}

export const AppBottomNav = () => {
    const isFullscreen = useAppStore(state => state.isFullscreen)

    if (isFullscreen) return null

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 backdrop-blur-[var(--blur-overlay-xl)] border-t border-outline-variant/30 shadow-elevation-3 z-[40] flex items-center justify-around px-4 safe-area-pb bg-zinc-950/80">
            <Link 
                to="/home" 
                activeProps={{ className: "text-primary bg-primary/15" }}
                inactiveProps={{ className: "text-on-surface-variant" }}
                className="flex flex-col items-center justify-center gap-1 px-4 py-1 rounded-xl transition-all duration-300 min-h-[44px]"
            >
                <Icons.navigation.home className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Inicio</span>
            </Link>
            <Link 
                to="/series" 
                activeProps={{ className: "text-primary bg-primary/15" }}
                inactiveProps={{ className: "text-on-surface-variant" }}
                className="flex flex-col items-center justify-center gap-1 px-4 py-1 rounded-xl transition-all duration-300 min-h-[44px]"
            >
                <Icons.navigation.tv className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Series</span>
            </Link>
            <Link 
                to="/movies" 
                activeProps={{ className: "text-primary bg-primary/15" }}
                inactiveProps={{ className: "text-on-surface-variant" }}
                className="flex flex-col items-center justify-center gap-1 px-4 py-1 rounded-xl transition-all duration-300 min-h-[44px]"
            >
                <Icons.navigation.film className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Películas</span>
            </Link>
        </nav>
    )
}