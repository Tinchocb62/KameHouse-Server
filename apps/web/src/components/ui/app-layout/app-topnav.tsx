import { useAppStore } from "@/lib/store"
import { Link } from "@tanstack/react-router"
import { Icons } from "@/components/ui/icons"
import { NotificationBell } from "./notification-center"

interface TopNavProps {
    title?: string
}

export const AppTopNav = ({ title }: TopNavProps) => {
    const { setSidebarOpen } = useAppStore()
    const isFullscreen = useAppStore(state => state.isFullscreen)

    if (isFullscreen) return null

    // Siempre glass, como AppBottomNav: el estado "transparente hasta scrollear"
    // dependía de un #scroll-sentinel que solo existía en el home, así que en el
    // resto de las rutas el contenido pasaba por debajo de un header invisible.
    return (
        <header
            className="md:hidden fixed top-0 left-0 right-0 z-[40] h-16 px-4 flex items-center justify-between border-b backdrop-blur-[var(--blur-overlay-xl)] border-outline-variant/30 shadow-elevation-1 bg-zinc-950/80"
        >
            {/* min-w-0 + truncate: sin esto un título largo empuja los botones fuera de la pantalla */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                    src="/kamehouse-logo.png"
                    alt="KameHouse"
                    className="h-7 w-7 object-contain shrink-0"
                />
                <span className="font-display text-lg text-on-surface tracking-wider uppercase truncate">
                    {title || "KAMEHOUSE"}
                </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                <button 
                    onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
                    className="p-2.5 rounded-full text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
                    aria-label="Buscar"
                >
                    <Icons.navigation.search className="w-5 h-5" />
                </button>

                <NotificationBell sidebarOpen={false} compact />

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
                activeProps={{ className: "text-brand-accent bg-brand-accent/15" }}
                inactiveProps={{ className: "text-on-surface-variant" }}
                className="flex flex-col items-center justify-center gap-1 px-4 py-1 rounded-xl transition-all duration-base min-h-[44px]"
            >
                <Icons.navigation.home className="w-5 h-5" />
                <span className="text-label-sm font-bold uppercase tracking-wider">Inicio</span>
            </Link>
            <Link 
                to="/series" 
                activeProps={{ className: "text-brand-accent bg-brand-accent/15" }}
                inactiveProps={{ className: "text-on-surface-variant" }}
                className="flex flex-col items-center justify-center gap-1 px-4 py-1 rounded-xl transition-all duration-base min-h-[44px]"
            >
                <Icons.navigation.tv className="w-5 h-5" />
                <span className="text-label-sm font-bold uppercase tracking-wider">Series</span>
            </Link>
            <Link 
                to="/movies" 
                activeProps={{ className: "text-brand-accent bg-brand-accent/15" }}
                inactiveProps={{ className: "text-on-surface-variant" }}
                className="flex flex-col items-center justify-center gap-1 px-4 py-1 rounded-xl transition-all duration-base min-h-[44px]"
            >
                <Icons.navigation.film className="w-5 h-5" />
                <span className="text-label-sm font-bold uppercase tracking-wider">Películas</span>
            </Link>
        </nav>
    )
}