"use client"

import { useAppStore } from "@/lib/store"
import { Vaul, VaulContent } from "@/components/vaul"
import { Link, useRouterState } from "@tanstack/react-router"
import { AnimatePresence } from "framer-motion"
import * as React from "react"
import { Settings, Home, Film, Tv, Layers, Rocket, Menu } from "lucide-react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { cn } from "../core/styling"
import { RandomPlayButton } from "./random-play-button"
import { useSound } from "@/hooks/use-sound"
import { useResponsive } from "@/hooks/use-responsive"
import { BackgroundMusicPlayer } from "./background-music"
import { useGetLibraryCollection } from "@/api/hooks/anime_collection.hooks"
import { toast } from "sonner"
import { useThemeSettings } from "@/lib/theme/theme-hooks"

const VideoPlayer = React.lazy(() =>
    import("@/components/video/player").then((m) => ({ default: m.VideoPlayer }))
)

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
        icon: <Home className="w-5 h-5" />,
        activeColorClass: "text-on-surface",
        hoverColorClass: "group-hover:text-on-surface",
        activeBgClass: "glass-liquid"
    },
    {
        id: "series",
        to: "/series",
        label: "Series",
        icon: <Tv className="w-5 h-5" />,
        activeColorClass: "text-on-surface",
        hoverColorClass: "group-hover:text-on-surface",
        activeBgClass: "glass-liquid"
    },
    {
        id: "movies",
        to: "/movies",
        label: "Películas",
        icon: <Film className="w-5 h-5" />,
        activeColorClass: "text-on-surface",
        hoverColorClass: "group-hover:text-on-surface",
        activeBgClass: "glass-liquid"
    },
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

    if (isFullscreen || tvMode) return null

    // Sidebar is "glass" (translucent + blurred) when cinematic effects are enabled globally.
    const isGlass = ts.themeEnableBlurringEffects
    const sidebarBgStyle = ts.enableColorSettings && ts.sidebarBackgroundColor ? { backgroundColor: ts.sidebarBackgroundColor } : undefined

    // Temporary expand-on-hover for the collapsed desktop sidebar (does not
    // touch the persisted sidebarOpen preference — collapses back on leave).
    const canHoverExpand = ts.themeExpandSidebarOnHover && !sidebarOpen && !isMobile
    const [hoverExpanded, setHoverExpanded] = React.useState(false)
    const isExpanded = sidebarOpen || (canHoverExpand && hoverExpanded)

    return (
        <>
            {/* Desktop Side Flap Sidebar */}
            <aside
                onMouseEnter={() => canHoverExpand && setHoverExpanded(true)}
                onMouseLeave={() => canHoverExpand && setHoverExpanded(false)}
                className={cn(
                    "hidden md:flex flex-col fixed left-0 top-0 bottom-0 h-screen border-r border-outline-variant z-50 overflow-visible transition-all duration-300 ease-in-out sidebar-gradient",
                    isGlass
                        ? "bg-[color:color-mix(in_srgb,var(--md-sys-color-surface)_70%,transparent)] backdrop-blur-[var(--blur-sidebar)] backdrop-saturate-[var(--glass-saturate)]"
                        : "bg-surface",
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
                            "md:hidden fixed inset-y-0 left-0 z-50 flex h-full w-[280px] flex-col border-r border-outline-variant !border-y-0 !border-l-0 !rounded-none sidebar-gradient",
                            isGlass
                                ? "bg-[color:color-mix(in_srgb,var(--md-sys-color-surface)_80%,transparent)] backdrop-blur-[var(--blur-sidebar)] backdrop-saturate-[var(--glass-saturate)]"
                                : "bg-surface"
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
    const isVideoActive = useAppStore(state => state.isVideoActive)
    const { isMobile } = useResponsive()

    const containerRef = React.useRef<HTMLDivElement>(null)
    const navRef = React.useRef<HTMLDivElement>(null)

    const routerState = useRouterState()
    const currentPath = routerState.location.pathname

    const playChangeSound = () => {
        playSound("category", 0.4)
    }

    const { data: collection } = useGetLibraryCollection()

    const allEntries = React.useMemo(() => {
        if (!collection?.lists) return []
        return collection.lists.flatMap(list => list.entries ?? [])
    }, [collection])

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
            "flex flex-col h-full py-8 w-full items-center bg-transparent transition-all duration-300",
            sidebarOpen ? "px-4" : "px-4 md:px-0"
        )}>
            {/* Header / Logo */}
            <div className={cn(
                "mb-10 w-full flex items-center gsap-sidebar-item transition-all duration-300",
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
                            className="h-9 w-9 shrink-0 object-contain group-hover:scale-110 transition-transform duration-500"
                        />
                    </div>
                    {sidebarOpen && (
                        <span className="font-bebas text-xl text-on-surface tracking-wider whitespace-nowrap">
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
                                className={cn("w-full flex justify-center", isActive && "active-sidebar-link")}
                            >
                                <div className={cn(
                                    "flex items-center h-14 rounded-2xl group px-4 relative transition-all duration-300 w-full",
                                    "active:scale-95 font-bold",
                                    sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-14 w-full md:px-0",
                                    isActive
                                        ? item.activeBgClass
                                        : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] text-on-surface-variant hover:text-on-surface"
                                )}>
                                    {/* Static Indicator Dot */}
                                    <div className={cn(
                                        "absolute left-0 w-1 h-6 rounded-r-full transition-all duration-500 hidden md:block",
                                        item.activeColorClass.replace("text-", "bg-"),
                                        isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                                    )} />

                                    <span className={cn("shrink-0 z-10 group-hover:scale-110 transition-transform duration-300", isActive && item.activeColorClass)}>
                                        {item.icon}
                                    </span>
                                    <span className={cn(
                                        "uppercase tracking-[0.2em] text-[10px] font-black z-10 text-left transition-colors whitespace-nowrap",
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
                                "flex items-center h-14 rounded-2xl group px-4 relative border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 w-full",
                                "active:scale-95 font-bold",
                                sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-14 w-full md:px-0",
                                globalQueueOpen
                                    ? "text-on-surface bg-white/[0.08]"
                                    : "text-on-surface-variant hover:text-on-surface bg-white/[0.03] hover:bg-white/[0.07]"
                            )}
                        >
                            {/* Active Indicator Dot */}
                            <div className={cn(
                                "absolute left-0 w-1 h-6 bg-on-surface rounded-r-full transition-all duration-500 hidden md:block",
                                globalQueueOpen ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                            )} />

                            <span className={cn("shrink-0 z-10 relative group-hover:scale-110 transition-transform duration-300", globalQueueOpen && "text-on-surface")}>
                                <Layers className="w-5 h-5" />
                                {/* Badge count */}
                                <span className="absolute -top-2.5 -right-2.5 bg-on-surface text-surface text-[8px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center border border-surface px-[3px]">
                                    {playlistQueue.length}
                                </span>
                            </span>
                            <span className={cn(
                                "uppercase tracking-[0.2em] text-[10px] font-black z-10 text-left transition-colors whitespace-nowrap",
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
                            "flex items-center h-14 rounded-2xl group px-4 relative border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 w-full",
                            "active:scale-95 font-bold",
                            sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-14 w-full md:px-0",
                            marathonMode
                                ? "text-on-surface bg-white/[0.08]"
                                : "text-on-surface-variant hover:text-on-surface bg-white/[0.03] hover:bg-white/[0.07]"
                        )}
                    >
                        <div className={cn(
                            "absolute left-0 w-1 h-6 bg-on-surface rounded-r-full transition-all duration-500 hidden md:block",
                            marathonMode ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                        )} />
                        <span className={cn("shrink-0 z-10 group-hover:scale-110 transition-transform duration-300", marathonMode && "text-on-surface")}>
                            <Rocket className="w-5 h-5" />
                        </span>
                        <span className={cn(
                            "uppercase tracking-[0.2em] text-[10px] font-black z-10 text-left transition-colors whitespace-nowrap",
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
                <div className={cn(
                    "flex gsap-sidebar-item transition-all duration-300 w-full justify-center items-center",
                    sidebarOpen ? "flex-row gap-4 px-4" : "flex-col gap-6"
                )}>
                    <BackgroundMusicPlayer />
                    <RandomPlayButton />
                </div>

                {/* Settings (Always at the bottom) */}
                <div className="gsap-sidebar-item w-full flex justify-center">
                    <Link
                        to="/settings"
                        title="Configuración"
                        onClick={() => { if (isMobile) setSidebarOpen(false); playChangeSound(); }}
                        className={cn("w-full flex justify-center", currentPath === "/settings" && "active-sidebar-link")}
                    >
                        <div className={cn(
                            "flex items-center h-14 rounded-2xl group px-4 relative border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 w-full",
                            "active:scale-95 font-bold",
                            sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-14 w-full md:px-0",
                            currentPath === "/settings"
                                ? "text-on-surface bg-white/[0.08]"
                                : "text-on-surface-variant hover:text-on-surface bg-white/[0.03] hover:bg-white/[0.07]"
                        )}>
                            <span className={cn("shrink-0 z-10 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-500", currentPath === "/settings" && "text-on-surface")}>
                                <Settings className="w-5 h-5" />
                            </span>
                            <span className={cn(
                                "uppercase tracking-[0.2em] text-[10px] font-black z-10 text-left transition-colors whitespace-nowrap",
                                (sidebarOpen || isMobile) ? "block" : "hidden md:hidden",
                                currentPath === "/settings" ? "text-on-surface" : "group-hover:text-on-surface"
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

function Magnetic({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={cn("w-full flex justify-center", className)}>
            {children}
        </div>
    )
}
