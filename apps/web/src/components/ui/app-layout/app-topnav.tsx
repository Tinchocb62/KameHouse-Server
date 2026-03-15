"use client"

import { useAppStore } from "@/lib/store"
import { Link } from "@tanstack/react-router"
import * as React from "react"
import { FaBook, FaCog, FaHome, FaSearch, FaUserCircle, FaFilm, FaTv } from "react-icons/fa"
import { cn } from "../core/styling"

interface NavItem {
    to: string
    label: string
    icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
    { to: "/home", label: "Inicio", icon: <FaHome className="w-5 h-5 flex-shrink-0" /> },
    { to: "/library", label: "Biblioteca", icon: <FaBook className="w-5 h-5 flex-shrink-0" /> },
    { to: "/series", label: "Series", icon: <FaTv className="w-5 h-5 flex-shrink-0" /> },
    { to: "/movies", label: "Películas", icon: <FaFilm className="w-5 h-5 flex-shrink-0" /> },
]

const BOTTOM_ITEMS: NavItem[] = [
    { to: "/settings", label: "Ajustes", icon: <FaCog className="w-5 h-5 flex-shrink-0" /> },
]

export interface AppTopNavProps extends React.ComponentPropsWithoutRef<"header"> {
    breadcrumbs?: React.ReactNode
    actionButtons?: React.ReactNode
}

export const AppTopNav = React.forwardRef<HTMLElement, AppTopNavProps>((props, ref) => {
    const { className, breadcrumbs, actionButtons, ...rest } = props
    
    // UI Zustand Selectors
    const setSidebarOpen = useAppStore(state => state.setSidebarOpen)
    const activeTheme = useAppStore(state => state.activeTheme)
    const setActiveTheme = useAppStore(state => state.setActiveTheme)

    // Example handler for Theme toggle
    const handleThemeToggle = () => {
        setActiveTheme(activeTheme === "dark" ? "light" : "dark")
    }

    return (
        <header
            ref={ref}
            className={cn(
                "fixed top-0 left-0 w-full z-50 transition-all duration-300 pointer-events-auto",
                "h-20 md:h-24 flex flex-col justify-center",
                "bg-black/40 backdrop-blur-2xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]",
                className
            )}
            {...rest}
        >
            <div className="flex items-center justify-between px-6 md:px-10 h-full w-full mx-auto max-w-[2000px]">
                {/* Logo - Left */}
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3">
                        <img src="/kamehouse-logo.png" alt="KameHouse" className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                        <span className="hidden lg:block text-sm font-black uppercase tracking-[0.24em] text-white">
                            KameHouse
                        </span>
                    </div>
                    {breadcrumbs && (
                        <div className="hidden md:flex items-center pl-4 border-l border-white/10 text-zinc-400">
                            {breadcrumbs}
                        </div>
                    )}
                </div>

                {/* Nav Tabs - Center - Hidden on Mobile */}
                <nav className="hidden sm:flex flex-1 items-center justify-center gap-6 md:gap-8" aria-label="Navegación principal">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            activeProps={{
                                className: "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
                            }}
                            inactiveProps={{
                                className: "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
                            }}
                            className={cn(
                                "flex items-center gap-3 px-6 py-2.5 rounded-full",
                                "transition-all duration-200 ease-out active:scale-95"
                            )}
                        >
                            <span className="hidden md:block opacity-60">{item.icon}</span>
                            <span className="text-sm font-bold tracking-wide">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* User / Actions - Right */}
                <div className="flex items-center justify-end gap-5 flex-1">
                    {actionButtons ? actionButtons : (
                        <>
                            <button 
                                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))} // Trigger CommandPalette
                                className="text-zinc-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                            >
                                <FaSearch className="w-5 h-5" />
                            </button>
                            <Link 
                                to="/settings"
                                className="text-zinc-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                            >
                                <FaCog className="w-5 h-5" />
                            </Link>
                            <button 
                                onClick={() => setSidebarOpen(true)}
                                className="text-zinc-300 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                            >
                                <FaUserCircle className="w-8 h-8" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
})

AppTopNav.displayName = "AppTopNav"

export function AppBottomNav() {
    return (
        <nav
            className={cn(
                "fixed inset-x-0 bottom-0 z-50 flex items-center justify-around sm:hidden",
                "border-t border-white/5 bg-black/80 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]",
                "h-[calc(4.5rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]",
            )}
        >
            {[...NAV_ITEMS, ...BOTTOM_ITEMS].map((item) => (
                <Link
                    key={item.to}
                    to={item.to}
                    activeProps={{
                        className: "text-orange-400",
                    }}
                    inactiveProps={{
                        className: "text-zinc-500 hover:text-zinc-300",
                    }}
                    className="flex h-full w-full flex-col items-center justify-center gap-1.5 pb-2 transition-colors duration-200"
                >
                    <div className="shrink-0">{item.icon}</div>
                    <span className="text-[10px] font-bold tracking-wider uppercase">{item.label}</span>
                </Link>
            ))}
        </nav>
    )
}
