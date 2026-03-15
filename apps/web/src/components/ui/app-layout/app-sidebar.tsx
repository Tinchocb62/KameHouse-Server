"use client"

import { useAppStore } from "@/lib/store"
import { Vaul, VaulContent } from "@/components/vaul"
import { Link } from "@tanstack/react-router"
import * as React from "react"
import { FaBook, FaCog, FaHome, FaFilm, FaTv, FaCalendarAlt, FaMoon } from "react-icons/fa"
import { cn } from "../core/styling"

interface SidebarItem {
    to: string
    label: string
    icon: React.ReactNode
}

const SIDEBAR_ITEMS: SidebarItem[] = [
    { to: "/home", label: "Inicio", icon: <FaHome className="w-5 h-5" /> },
    { to: "/series", label: "Series", icon: <FaTv className="w-5 h-5" /> },
    { to: "/movies", label: "Películas", icon: <FaFilm className="w-5 h-5" /> },
    { to: "/library", label: "Biblioteca", icon: <FaBook className="w-5 h-5" /> },
    { to: "/calendar", label: "Calendario", icon: <FaCalendarAlt className="w-5 h-5" /> },
    { to: "/settings", label: "Configuraciones", icon: <FaCog className="w-5 h-5" /> },
]

export function AppSidebar() {
    const sidebarOpen = useAppStore(state => state.sidebarOpen)
    const setSidebarOpen = useAppStore(state => state.setSidebarOpen)

    return (
        <Vaul open={sidebarOpen} onOpenChange={setSidebarOpen} direction="right">
            <VaulContent 
                className="fixed inset-y-0 right-0 z-50 flex h-full w-[300px] flex-col border-l border-white/10 bg-zinc-950/95 backdrop-blur-2xl shadow-2xl"
                overlayClass="bg-black/60 backdrop-blur-sm"
            >
                <div className="flex flex-col h-full py-10 px-6">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-12 px-2">
                        <img src="/kamehouse-logo.png" alt="KameHouse" className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                        <span className="text-sm font-black uppercase tracking-[0.24em] text-white">
                            KameHouse
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2">
                        {SIDEBAR_ITEMS.map((item) => (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setSidebarOpen(false)}
                                activeProps={{
                                    className: "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.1)]",
                                }}
                                inactiveProps={{
                                    className: "text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent",
                                }}
                                className={cn(
                                    "flex items-center gap-4 px-5 py-4 rounded-2xl",
                                    "transition-all duration-300 ease-out active:scale-95 group font-bold tracking-wide"
                                )}
                            >
                                <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Footer / Info */}
                    <div className="mt-auto pt-8 border-t border-white/5 px-2 flex flex-col gap-4">
                        <button 
                            onClick={() => {
                                const activeTheme = useAppStore.getState().activeTheme
                                useAppStore.getState().setActiveTheme(activeTheme === "dark" ? "light" : "dark")
                            }}
                            className="flex items-center gap-4 px-5 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white transition-all font-bold"
                        >
                            <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                                <FaMoon className="w-5 h-5" />
                            </span>
                            <span>Cambiar Tema</span>
                        </button>

                        <div>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-bold mb-1">Versión 2.0</p>
                            <p className="text-xs text-zinc-500 font-medium">KameHouse Media Platform</p>
                        </div>
                    </div>
                </div>
            </VaulContent>
        </Vaul>
    )
}
