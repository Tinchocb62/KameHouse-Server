"use client"

import { useAppStore } from "@/lib/store"
import { Vaul, VaulContent } from "@/components/vaul"
import { Link, useRouterState } from "@tanstack/react-router"
import * as React from "react"
import { Icons } from "@/components/ui/icons"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { cn } from "../core/styling"
import { RandomPlayButton } from "./random-play-button"
import { useSound } from "@/hooks/use-sound"
import { useResponsive } from "@/hooks/use-responsive"
import { BackgroundMusicPlayer } from "./background-music"
import { NotificationBell } from "./notification-center"
import { useThemeSettings } from "@/lib/theme/theme-hooks"

interface SidebarItem {
    id: string
    to: string
    label: string
    icon: React.ReactNode
    activeColorClass: string
    hoverColorClass: string
    activeBgClass: string
}

const SIDEBAR_ITEMS: SidebarItem[] = [
    {
        id: "home",
        to: "/home",
        label: "Inicio",
        icon: <Icons.navigation.home className="w-5 h-5" />,
        activeColorClass: "text-on-surface",
        hoverColorClass: "group-hover:text-on-surface",
        activeBgClass: "glass-liquid glass-active glass-refract"
    },
    {
        id: "series",
        to: "/series",
        label: "Series",
        icon: <Icons.navigation.tv className="w-5 h-5" />,
        activeColorClass: "text-on-surface",
        hoverColorClass: "group-hover:text-on-surface",
        activeBgClass: "glass-liquid glass-active glass-refract"
    },
    {
        id: "movies",
        to: "/movies",
        label: "Películas",
        icon: <Icons.navigation.film className="w-5 h-5" />,
        activeColorClass: "text-on-surface",
        hoverColorClass: "group-hover:text-on-surface",
        activeBgClass: "glass-liquid glass-active glass-refract"
    },
    {
        id: "collections",
        to: "/collections",
        label: "Colecciones",
        icon: <Icons.navigation.layers className="w-5 h-5" />,
        activeColorClass: "text-on-surface",
        hoverColorClass: "group-hover:text-on-surface",
        activeBgClass: "glass-liquid glass-active glass-refract"
    }
]

// Lightweight id/label pairs for consumers (e.g. Settings → Apariencia) that
// only need to render the pinnable menu items, without the icon/route JSX.
export const SIDEBAR_ITEM_DEFS: { id: string; label: string }[] = SIDEBAR_ITEMS.map(({ id, label }) => ({ id, label }))

export function AppSidebar() {
    const sidebarOpen = useAppStore(state => state.sidebarOpen)
    const setSidebarOpen = useAppStore(state => state.setSidebarOpen)
    const isFullscreen = useAppStore(state => state.isFullscreen)
    const { isMobile } = useResponsive()
    const ts = useThemeSettings()

    const tvMode = useAppStore(state => state.tvMode)

    const [hoverExpanded, setHoverExpanded] = React.useState(false)

    if (isFullscreen || tvMode) return null

    // Sidebar is "glass" (translucent + blurred) when cinematic effects are enabled globally.
    const isGlass = ts.themeEnableBlurringEffects
    const sidebarBgStyle = ts.effectiveMode === "era" && ts.sidebarBackgroundColor ? { backgroundColor: ts.sidebarBackgroundColor } : undefined

    // Temporary expand-on-hover for the collapsed desktop sidebar (does not
    // touch the persisted sidebarOpen preference — collapses back on leave).
    const canHoverExpand = ts.themeExpandSidebarOnHover && !sidebarOpen && !isMobile
    const isExpanded = sidebarOpen || (canHoverExpand && hoverExpanded)

    return (
        <>
            {/* Desktop Side Flap Sidebar */}
            <aside
                onMouseEnter={() => canHoverExpand && setHoverExpanded(true)}
                onMouseLeave={() => canHoverExpand && setHoverExpanded(false)}
                className={cn(
                    "hidden md:flex flex-col fixed left-0 top-0 bottom-0 h-screen border-r border-[color:var(--sidebar-active-border)] z-50 overflow-visible transition-all duration-base ease-in-out sidebar-gradient",
                    isGlass
                        ? "backdrop-blur-[var(--blur-sidebar)] backdrop-saturate-[var(--glass-saturate)]"
                        : "",
                    isExpanded ? "w-[260px]" : "w-20"
                )}
                style={sidebarBgStyle}
            >
                <SidebarContent setSidebarOpen={setSidebarOpen} forceOpen={canHoverExpand && hoverExpanded} />
            </aside>

            {/* Mobile Drawer */}
            {isMobile && (
                <Vaul open={sidebarOpen} onOpenChange={setSidebarOpen} direction="left">
                    <VaulContent
                        className={cn(
                            "md:hidden fixed inset-y-0 left-0 z-50 flex h-full w-[280px] flex-col border-r border-[color:var(--sidebar-active-border)] !border-y-0 !border-l-0 !rounded-none !mt-0 sidebar-gradient",
                            isGlass
                                ? "backdrop-blur-[var(--blur-sidebar)] backdrop-saturate-[var(--glass-saturate)]"
                                : ""
                        )}
                        style={sidebarBgStyle}
                        overlayClass={cn("md:hidden bg-scrim/60", ts.themeEnableBlurringEffects && "backdrop-blur-[var(--blur-overlay-sm)]")}
                    >
                        <SidebarContent setSidebarOpen={setSidebarOpen} />
                    </VaulContent>
                </Vaul>
            )}
        </>
    )
}

function SidebarContent({ setSidebarOpen, forceOpen }: { setSidebarOpen: (open: boolean) => void, forceOpen?: boolean }) {
    const { playSound } = useSound()
    const storeSidebarOpen = useAppStore(state => state.sidebarOpen)
    const sidebarOpen = storeSidebarOpen || !!forceOpen
    const playlistQueue = useAppStore(state => state.playlistQueue)
    const globalQueueOpen = useAppStore(state => state.globalQueueOpen)
    const setGlobalQueueOpen = useAppStore(state => state.setGlobalQueueOpen)
    const marathonMode = useAppStore(state => state.marathonMode)
    const setMarathonMode = useAppStore(state => state.setMarathonMode)
    const ts = useThemeSettings()
    const visibleItems = React.useMemo(
        () => SIDEBAR_ITEMS.filter(item => !ts.themeUnpinnedMenuItems?.includes(item.id)),
        [ts.themeUnpinnedMenuItems]
    )
    const { isMobile } = useResponsive()

    const containerRef = React.useRef<HTMLDivElement>(null)
    const navRef = React.useRef<HTMLDivElement>(null)

    const routerState = useRouterState()
    const currentPath = routerState.location.pathname

    const playChangeSound = () => {
        playSound("category", 0.4)
    }

    // Staggered entrance for nav items/buttons on mount
    useGSAP(() => {
        const items = containerRef.current?.querySelectorAll(".gsap-sidebar-item")
        if (items && items.length > 0) {
            gsap.fromTo(items,
                { opacity: 0, x: -16, scale: 0.95 },
                { opacity: 1, x: 0, scale: 1, duration: 0.5, stagger: 0.06, ease: "power3.out" }
            )
        }
    }, { scope: containerRef })

    return (
        <div ref={containerRef} className={cn(
            "flex flex-col h-full py-8 w-full items-center bg-transparent transition-all duration-base",
            sidebarOpen ? "px-4" : "px-4 md:px-0"
        )}>
            {/* Header / Logo */}
            <div className={cn(
                "mb-10 w-full flex items-center gsap-sidebar-item transition-all duration-base",
                sidebarOpen ? "justify-between px-2" : "justify-center"
            )}>
                <Link
                    to="/home"
                    onClick={() => { if (isMobile) setSidebarOpen(false); playChangeSound(); }}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="relative flex items-center justify-center">
                        <img
                            src="/kamehouse-logo.png"
                            alt="KameHouse"
                            className="h-9 w-9 shrink-0 object-contain group-hover:scale-110 transition-transform duration-slow"
                        />
                    </div>
                    {sidebarOpen && (
                        <span className="font-display text-xl text-on-surface tracking-wider whitespace-nowrap">
                            KAMEHOUSE
                        </span>
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <div ref={navRef} className="flex-1 space-y-4 w-full flex flex-col items-center relative">
                {visibleItems.map((item) => {
                    const isActive = currentPath === item.to
                    return (
                        <div key={item.to} className="gsap-sidebar-item w-full flex justify-center">
                            <Link
                                to={item.to}
                                title={item.label}
                                onClick={() => { if (isMobile) setSidebarOpen(false); playChangeSound(); }}
                                className={cn("w-full flex justify-center")}
                            >
                                <div className={cn(
                                    "flex items-center h-14 rounded-xl group px-4 relative transition-all duration-base w-full",
                                    "active:scale-95 font-bold",
                                    sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-14 w-full md:px-0",
                                    isActive
                                        ? item.activeBgClass
                                        : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] text-on-surface-variant hover:text-on-surface"
                                )}>
                                    {/* Static Indicator Dot */}
                                    <div className={cn(
                                        "absolute left-0 w-1 h-6 rounded-r-full transition-all duration-slow hidden md:block",
                                        item.activeColorClass.replace("text-", "bg-"),
                                        isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                                    )} />

                                    <span className={cn("shrink-0 z-10 group-hover:scale-110 transition-transform duration-base", isActive && item.activeColorClass)}>
                                        {item.icon}
                                    </span>
                                    <span className={cn(
                                        "uppercase tracking-ultra text-label-sm font-black z-10 text-left transition-colors whitespace-nowrap",
                                        (sidebarOpen || isMobile) ? "block" : "hidden md:hidden",
                                        isActive ? item.activeColorClass : item.hoverColorClass
                                    )}>
                                        {item.label}
                                    </span>
                                </div>
                            </Link>
                        </div>
                    )
                })}

                {/* Queue Toggle Button - Shown conditionally */}
                {playlistQueue.length > 0 && (
                    <div className="gsap-sidebar-item w-full flex justify-center">
                        <button
                            onClick={() => {
                                setGlobalQueueOpen(!globalQueueOpen)
                                if (isMobile) setSidebarOpen(false)
                                playChangeSound()
                            }}
                            title="Cola de Reproducción"
                            className={cn(
                                "flex items-center h-14 rounded-xl group px-4 relative border border-white/[0.06] hover:border-white/[0.12] transition-all duration-base w-full",
                                "active:scale-95 font-bold",
                                sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-14 w-full md:px-0",
                                globalQueueOpen
                                    ? "text-on-surface bg-white/[0.08]"
                                    : "text-on-surface-variant hover:text-on-surface bg-white/[0.03] hover:bg-white/[0.07]"
                            )}
                        >
                            {/* Active Indicator Dot */}
                            <div className={cn(
                                "absolute left-0 w-1 h-6 bg-on-surface rounded-r-full transition-all duration-slow hidden md:block",
                                globalQueueOpen ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                            )} />

                            <span className={cn("shrink-0 z-10 relative group-hover:scale-110 transition-transform duration-base", globalQueueOpen && "text-on-surface")}>
                                <Icons.navigation.layers className="w-5 h-5" />
                                {/* Badge count */}
                                <span className="absolute -top-2.5 -right-2.5 bg-on-surface text-surface text-label-sm font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center border border-surface px-[3px]">
                                    {playlistQueue.length}
                                </span>
                            </span>
                            <span className={cn(
                                "uppercase tracking-ultra text-label-sm font-black z-10 text-left transition-colors whitespace-nowrap",
                                (sidebarOpen || isMobile) ? "block" : "hidden md:hidden",
                                globalQueueOpen ? "text-on-surface" : "group-hover:text-on-surface"
                            )}>
                                Cola ({playlistQueue.length})
                            </span>
                        </button>
                    </div>
                )}

                {/* Marathon Mode Toggle Button */}
                <div className="gsap-sidebar-item w-full flex justify-center">
                    <button
                        onClick={() => { setMarathonMode(!marathonMode); playChangeSound() }}
                        title={marathonMode ? "Desactivar Modo Maratón" : "Activar Modo Maratón"}
                        className={cn(
                            "flex items-center h-14 rounded-xl group px-4 relative border border-white/[0.06] hover:border-white/[0.12] transition-all duration-base w-full",
                            "active:scale-95 font-bold",
                            sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-14 w-full md:px-0",
                            marathonMode
                                ? "text-on-surface bg-white/[0.08]"
                                : "text-on-surface-variant hover:text-on-surface bg-white/[0.03] hover:bg-white/[0.07]"
                        )}
                    >
                        <div className={cn(
                            "absolute left-0 w-1 h-6 bg-on-surface rounded-r-full transition-all duration-slow hidden md:block",
                            marathonMode ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                        )} />
                        <span className={cn("shrink-0 z-10 group-hover:scale-110 transition-transform duration-base", marathonMode && "text-on-surface")}>
                            <Icons.navigation.rocket className="w-5 h-5" />
                        </span>
                        <span className={cn(
                            "uppercase tracking-ultra text-label-sm font-black z-10 text-left transition-colors whitespace-nowrap",
                            (sidebarOpen || isMobile) ? "block" : "hidden md:hidden",
                            marathonMode ? "text-on-surface" : "group-hover:text-on-surface"
                        )}>
                            Maratón {marathonMode ? "(ON)" : ""}
                        </span>
                    </button>
                </div>
            </div>

            {/* Footer / Info */}
            <div className="mt-auto pb-6 w-full flex flex-col items-center gap-6 pt-8">
                {/* Background Music and Random Play buttons */}
                {/* Apilados también en modo expandido: dos botones w-full con labels
                    nowrap en una misma fila desbordan el drawer de 280px */}
                <div className={cn(
                    "flex gsap-sidebar-item transition-all duration-base w-full justify-center items-center flex-col",
                    sidebarOpen ? "gap-4 px-4" : "gap-6"
                )}>
                    <BackgroundMusicPlayer />
                    <RandomPlayButton />
                </div>

                <NotificationBell sidebarOpen={sidebarOpen || isMobile} />

                {/* Settings (Always at the bottom) */}
                <div className="gsap-sidebar-item w-full flex justify-center">
                    <Link
                        to="/settings"
                        title="Configuración"
                        onClick={() => { if (isMobile) setSidebarOpen(false); playChangeSound(); }}
                        className={cn("w-full flex justify-center")}
                    >
                        <div className={cn(
                            "flex items-center h-14 rounded-xl group px-4 relative transition-all duration-base w-full",
                            "active:scale-95 font-bold",
                            sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-14 w-full md:px-0",
                            currentPath.startsWith("/settings")
                                ? "glass-liquid glass-active glass-refract text-on-surface"
                                : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] text-on-surface-variant hover:text-on-surface"
                        )}>
                            {/* Active Indicator Dot */}
                            <div className={cn(
                                "absolute left-0 w-1 h-6 bg-on-surface rounded-r-full transition-all duration-slow hidden md:block",
                                currentPath.startsWith("/settings") ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                            )} />
                            <span className={cn("shrink-0 z-10 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-slow", currentPath.startsWith("/settings") && "text-on-surface")}>
                                <Icons.navigation.settings className="w-5 h-5" />
                            </span>
                            <span className={cn(
                                "uppercase tracking-ultra text-label-sm font-black z-10 text-left transition-colors whitespace-nowrap",
                                (sidebarOpen || isMobile) ? "block" : "hidden md:hidden",
                                currentPath.startsWith("/settings") ? "text-on-surface" : "group-hover:text-on-surface"
                            )}>
                                Configuración
                            </span>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}
