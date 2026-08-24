import * as React from "react"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"
import { useLocation } from "@tanstack/react-router"
import { useAppStore } from "@/lib/store"
import { useThemeSettings } from "@/lib/theme/theme-hooks"
import { usePerformanceStore, selectEffectiveTier } from "@/lib/hardware/performance-store"

/**
 * DynamicBackdrop — Cinematic Minimalist backdrop for KameHouse v3
 * - Subtle gradient orbs animated via CSS keyframes (GPU-accelerated)
 * - Cross-fade between artwork images
 * - Film grain + vignette overlays
 * - Mouse parallax (optional, respects reduced motion and performance tier)
 */
export function DynamicBackdrop() {
    const location = useLocation()
    const isHomePage =
        location.pathname === "/home" ||
        location.pathname === "/home/"
    // Listing/section pages: no big hero image of their own, so the global
    // backdrop needs to stay visible (with blur) behind them for the
    // glassmorphic chrome (sidebar, panels) to have something to blur.
    const isListingPage =
        location.pathname === "/movies" ||
        location.pathname === "/movies/" ||
        location.pathname === "/series" ||
        location.pathname === "/series/" ||
        location.pathname.startsWith("/settings")
    
    const isDetailPage = Boolean(location.pathname.match(/\/(movies|series)\/\d+/))

    const isEnabled = useAppStore(state => state.dynamicBackdropEnabled)
    const isMotionEnabled = useAppStore(state => state.dynamicBackdropMotionEnabled)
    const currentBackdropUrl = useIntelligenceStore(s => s.currentBackdropUrl)
    const activeBackdropUrl = currentBackdropUrl
    
    const ts = useThemeSettings()
    const tvMode = useAppStore(state => state.tvMode)

    const effectiveTier = usePerformanceStore(selectEffectiveTier)
    const autoThrottleActive = usePerformanceStore(state => state.autoThrottleActive)
    const isEcoMode = effectiveTier === "low_power" || autoThrottleActive
    const isFlat = !ts.themeEnableBlurringEffects || tvMode || isEcoMode
    
    const baseOpacity = (isHomePage
        ? 0.65
        : isListingPage
            ? 0.55
            : isDetailPage
                ? 0.45
                : 0.24) * (isFlat ? 0.75 : 1)

    const [displayedUrl, setDisplayedUrl] = React.useState<string | null>(null)
    const [nextUrl, setNextUrl] = React.useState<string | null>(null)
    const [isCrossFading, setIsCrossFading] = React.useState(false)

    const currentLayerRef = React.useRef<HTMLDivElement>(null)
    const nextLayerRef = React.useRef<HTMLDivElement>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const backdropWrapperRef = React.useRef<HTMLDivElement>(null)

    // Mouse parallax (GPU-accelerated, disabled in TV or Eco mode)
    React.useEffect(() => {
        if (!isEnabled || !isMotionEnabled || tvMode || isEcoMode) return
        let rafId: number | null = null
        let targetX = 0
        let targetY = 0
        let currentX = 0
        let currentY = 0
        let paused = document.visibilityState === "hidden"

        const updatePosition = () => {
            if (paused) {
                rafId = null
                return
            }
            const dx = targetX - currentX
            const dy = targetY - currentY

            if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
                currentX += dx * 0.05
                currentY += dy * 0.05
                if (backdropWrapperRef.current) {
                    backdropWrapperRef.current.style.transform = `translate3d(${currentX * 0.1}px, ${currentY * 0.1}px, 0)`
                }
                rafId = requestAnimationFrame(updatePosition)
            } else {
                rafId = null
            }
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (paused) return
            const { clientX, clientY } = e
            targetX = (clientX / window.innerWidth - 0.5) * 100
            targetY = (clientY / window.innerHeight - 0.5) * 100

            if (!rafId) {
                rafId = requestAnimationFrame(updatePosition)
            }
        }

        const handleVisibility = () => {
            paused = document.visibilityState === "hidden"
            if (paused && rafId) {
                cancelAnimationFrame(rafId)
                rafId = null
            }
        }

        window.addEventListener("mousemove", handleMouseMove, { passive: true })
        document.addEventListener("visibilitychange", handleVisibility)
        rafId = requestAnimationFrame(updatePosition)

        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("visibilitychange", handleVisibility)
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [isEnabled, isMotionEnabled, tvMode, isEcoMode])

    // Cross-fade orchestration
    React.useEffect(() => {
        if (!isEnabled) return
        if (!activeBackdropUrl || activeBackdropUrl === displayedUrl) return

        if (!displayedUrl) {
            const initialTimer = setTimeout(() => {
                setDisplayedUrl(activeBackdropUrl)
            }, 0)
            return () => clearTimeout(initialTimer)
        }

        const fadeTimer = setTimeout(() => {
            setNextUrl(activeBackdropUrl)
            setIsCrossFading(true)
        }, 0)

        const finishTimer = setTimeout(() => {
            setDisplayedUrl(activeBackdropUrl)
            setNextUrl(null)
            setIsCrossFading(false)
        }, 1200)

        return () => {
            clearTimeout(fadeTimer)
            clearTimeout(finishTimer)
        }
    }, [activeBackdropUrl, displayedUrl, isEnabled])

    const filterClass = (isFlat || isEcoMode)
        ? ""
        : isHomePage
            ? "blur-[var(--filter-blur-ambient-xl)]"
            : isListingPage || isDetailPage
                ? "blur-[var(--filter-blur-ambient-lg)]"
                : "blur-[var(--filter-blur-ambient-md)]"

    if (!isEnabled) return null

    // Los orbes solo se renderizan en modo Era con tema activo; en Clásico el fondo es minimalista sin animaciones
    const showAnimatedOrbs = !tvMode && !isEcoMode && ts.effectiveMode === "era" && ts.hasEraTheme

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--bg-primary)]"
        >
            {/* Cinematic Gradient Orbs (Omitted in TV / Eco / Classic Mode) */}
            {showAnimatedOrbs && (
                <div className="absolute inset-0 overflow-hidden">
                    {/* Era Universe gradient layer */}
                    <div className="era-universe-layer absolute inset-0 transition-opacity duration-slow opacity-0" />
                    <div className="absolute top-[10%] left-[8%] w-[clamp(220px,35vw,550px)] h-[clamp(220px,35vw,550px)] rounded-full animate-float-blur"
                        style={{
                            background: "radial-gradient(circle at 30% 30%, var(--glow-color-1) 0%, transparent 80%)",
                            opacity: (isListingPage || isDetailPage) && !activeBackdropUrl ? 0.60 : 0.35,
                        }}
                    />
                    <div className="absolute bottom-[8%] right-[6%] w-[clamp(200px,30vw,500px)] h-[clamp(200px,30vw,500px)] rounded-full animate-float-blur-reverse"
                        style={{
                            background: "radial-gradient(circle at 70% 70%, var(--glow-color-2) 0%, transparent 80%)",
                            opacity: (isListingPage || isDetailPage) && !activeBackdropUrl ? 0.50 : 0.30,
                        }}
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[clamp(240px,38vw,580px)] h-[clamp(240px,38vw,580px)] rounded-full animate-pulse-glow"
                        style={{
                            background: "radial-gradient(circle at 50% 50%, var(--glow-color-3) 0%, transparent 70%)",
                            opacity: (isListingPage || isDetailPage) && !activeBackdropUrl ? 0.40 : 0.20,
                        }}
                    />
                </div>
            )}

            {/* Wrapper for backdrop layers with mouse parallax */}
            <div
                ref={backdropWrapperRef}
                className="absolute inset-0 transform-gpu"
                style={{
                    transform: "translate3d(0px, 0px, 0px)",
                }}
            >
                {/* Current backdrop */}
                {!isHomePage && displayedUrl && (
                    <div
                        ref={currentLayerRef}
                        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transform-gpu ${filterClass}`}
                        style={{
                            backgroundImage: `url(${displayedUrl})`,
                            opacity: isCrossFading ? 0 : baseOpacity,
                            transform: "scale(1.15)",
                            transition: "opacity 1000ms cubic-bezier(0.25, 0.8, 0.25, 1)",
                        }}
                    />
                )}

                {/* Incoming backdrop */}
                {!isHomePage && nextUrl && (
                    <div
                        ref={nextLayerRef}
                        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transform-gpu ${filterClass}`}
                        style={{
                            backgroundImage: `url(${nextUrl})`,
                            opacity: isCrossFading ? baseOpacity : 0,
                            transform: "scale(1.15)",
                            transition: "opacity 1000ms cubic-bezier(0.25, 0.8, 0.25, 1)",
                        }}
                    />
                )}
            </div>

            {/* Film Grain Overlay */}
            {!tvMode && !isFlat && <div className="grain-overlay z-10" />}

            {/* Vignette Stack — very subtle for KameHouse to keep image visible */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,var(--glass-border-bottom),transparent_60%)]" />
            <div
                className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-primary)]/10 to-transparent transition-opacity duration-slow"
                style={{ opacity: isHomePage ? 0.08 : isListingPage ? 0.28 : isDetailPage ? 0.40 : 0.65 }}
            />
            <div
                className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent transition-opacity duration-slow"
                style={{ opacity: isHomePage ? 0.1 : isListingPage ? 0.32 : isDetailPage ? 0.48 : 0.70 }}
            />
        </div>
    )
}