import * as React from "react"
import { useRef, useEffect } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { DeferredImage } from "@/components/shared/deferred-image"
import { getLowResImage } from "@/lib/helpers/images"
import { cn } from "@/components/ui/core/styling"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"
import { useThemeSettings } from "@/lib/theme/theme-hooks"

export const MEDIA_HERO_TITLE_CLASS = "font-sans font-extrabold leading-[1.05] tracking-tight text-on-surface drop-shadow-[0_4px_25px_rgba(0,0,0,0.85)] uppercase";

export interface MediaHeroProps {
    /** El contenedor principal (`div`) para aplicar parallax al hacer scroll */
    scrollContainerRef?: React.RefObject<HTMLElement | HTMLDivElement | null>

    backdropUrl: string | null
    posterUrl?: string | null
    hasBannerImage: boolean
    
    /** El título puede ser un string (se formateará por defecto) o un ReactNode (para custom shimmer etc.) */
    title: string | React.ReactNode

    /** Contenido opcional por encima del título (e.g. Era badge) */
    topBadge?: React.ReactNode
    
    /** Contenido opcional intercalado o para Series (metadataRow y topBadge pueden estar en el mismo lugar) */
    metadataRow?: React.ReactNode
    
    synopsis?: string | null

    /** Cast, directores u otros textos al final de la sinopsis */
    footerText?: React.ReactNode

    actionButtons?: React.ReactNode

    /** Muestra el póster a la izquierda en desktop (como en películas) */
    showPosterColumn?: boolean

    /**
     * Panel lateral flotante (e.g. SagaSelector) que se renderiza como overlay
     * glassmorphic a la derecha del backdrop en pantallas `lg+`. En mobile se oculta.
     */
    sidePanel?: React.ReactNode
    
    className?: string

    /** Eventos opcionales */
    onBackdropClick?: () => void
    onTitleClick?: () => void
}

/**
 * Backdrop treatment derived from Settings → Apariencia → Página de Detalle →
 * Tipo de Banner. The "-when-unavailable" variants only kick in for media with
 * no real banner art, where the fallback image tends to look poor behind text.
 */
export type BackdropTreatment = "show" | "blur" | "dim" | "hide"

export function resolveBackdropTreatment(bannerType: string, hasBannerImage: boolean): BackdropTreatment {
    switch (bannerType) {
        case "blur": return "blur"
        case "dim": return "dim"
        case "hide": return "hide"
        case "blur-when-unavailable": return hasBannerImage ? "show" : "blur"
        case "dim-when-unavailable": return hasBannerImage ? "show" : "dim"
        case "hide-when-unavailable": return hasBannerImage ? "show" : "hide"
        default: return "show"
    }
}

export function MediaHero({
    scrollContainerRef,
    backdropUrl,
    posterUrl,
    hasBannerImage,
    title,
    topBadge,
    metadataRow,
    synopsis,
    footerText,
    actionButtons,
    showPosterColumn = false,
    sidePanel,
    className,
    onBackdropClick,
    onTitleClick
}: MediaHeroProps) {
    const heroRef = useRef<HTMLDivElement>(null)
    const backdropRef = useRef<HTMLDivElement>(null)
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl)
    const ts = useThemeSettings()
    const isSmallBanner = ts.themeMediaPageBannerSize === "small"
    const backdropTreatment = resolveBackdropTreatment(ts.themeMediaPageBannerType, hasBannerImage)
    const isBoxedInfo = ts.themeMediaPageBannerInfoBoxSize === "boxed"

    // Sync current backdrop with global DynamicBackdrop blur background
    useEffect(() => {
        if (backdropUrl) {
            setBackdropUrl(backdropUrl)
        }
        return () => {
            setBackdropUrl(null)
        }
    }, [backdropUrl, setBackdropUrl])

    // Smooth Parallax capture scroll listener
    useEffect(() => {
        let rafId: number | null = null
        const handleScroll = (e: Event) => {
            if (rafId) return
            rafId = requestAnimationFrame(() => {
                rafId = null
                if (!backdropRef.current) return
                const target = e.target
                if (target === document || target === window) {
                    backdropRef.current.style.transform = `translate3d(0, ${window.scrollY * 0.35}px, 0)`
                } else if (target instanceof HTMLElement && target.scrollTop > 0) {
                    backdropRef.current.style.transform = `translate3d(0, ${target.scrollTop * 0.35}px, 0)`
                }
            })
        }
        window.addEventListener("scroll", handleScroll, { capture: true, passive: true })
        return () => {
            window.removeEventListener("scroll", handleScroll, { capture: true })
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [scrollContainerRef])

    useGSAP(() => {
        gsap.from(".media-hero-animate", {
            y: 20,
            opacity: 0,
            duration: 0.4,
            stagger: 0.04,
            ease: "power2.out",
            delay: 0.05
        })
    }, { scope: heroRef, dependencies: [typeof title === "string" ? title : null] })

    return (
        <section
            ref={heroRef}
            className={cn(
                "relative w-full flex flex-col justify-end overflow-hidden pb-16 pt-20 md:pt-32 shrink-0 select-none",
                isSmallBanner ? "min-h-[60dvh] md:min-h-[260px]" : "min-h-[70dvh] md:min-h-[100vh]",
                className
            )}
        >
            {/* Cinematic Grain Overlay */}
            <div className="grain-overlay z-20" />

            {/* Ambient Blur Background */}
            {ts.themeEnableMediaPageBlurredBackground && (
                <div className="absolute inset-0 overflow-hidden bg-transparent z-0">
                    {backdropUrl && (
                        <div
                            className="absolute inset-0 opacity-100"
                            style={{
                                backgroundImage: `url(${getLowResImage(backdropUrl)})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center 20%",
                                filter: "blur(var(--filter-blur-hero)) brightness(0.8) saturate(110%)",
                            }}
                        />
                    )}
                </div>
            )}

            {/* High Res Parallax Backdrop */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                {backdropUrl && backdropTreatment !== "hide" && (
                    <div
                        ref={backdropRef}
                        onClick={onBackdropClick}
                        className={cn(
                            "absolute inset-0 h-full w-full overflow-hidden z-0 will-change-transform group/backdrop",
                            onBackdropClick && "cursor-pointer"
                        )}
                    >
                        <DeferredImage
                            src={backdropUrl}
                            alt="Backdrop"
                            priority={true}
                            className="w-full h-full"
                            imgClassName={cn(
                                "w-full h-full transition-all duration-700",
                                hasBannerImage
                                    ? "object-cover object-[center_20%] animate-ken-burns"
                                    : "object-cover object-center blur-2xl scale-125",
                                backdropTreatment === "dim" ? "opacity-35" : hasBannerImage ? "opacity-85" : "opacity-45",
                                backdropTreatment === "blur" && "blur-[var(--filter-blur-hero)] scale-110"
                            )}
                        />
                    </div>
                )}
            </div>

            {/* Scrims cinematográficos (tokenizados) */}
            <div className="absolute inset-0 z-10 pointer-events-none scrim-hero-left" />
            <div className="absolute inset-x-0 bottom-0 h-64 z-10 pointer-events-none scrim-hero-bottom" />
            <div className="absolute inset-x-0 top-0 h-32 z-10 pointer-events-none scrim-hero-top" />

            {/* Side Panel Overlay — visible solo en desktop (lg+) */}
            {sidePanel && (
                <div className="hidden lg:flex absolute right-0 top-0 bottom-0 z-30 w-72 xl:w-80 pointer-events-auto">
                    {/* Gradiente de fusión lateral: difumina el panel hacia el backdrop */}
                    <div className="absolute inset-y-0 -left-16 w-16 bg-gradient-to-r from-transparent to-black/60 pointer-events-none z-10" />
                    <div className="flex-1 bg-zinc-950/70 backdrop-blur-[var(--blur-overlay-xl)] border-l border-white/[0.07] overflow-hidden flex flex-col">
                        {sidePanel}
                    </div>
                </div>
            )}

            {/* Content Container */}
            <div className={cn(
                "relative z-20 w-full max-w-content mx-auto page-px flex",
                showPosterColumn ? "flex-col lg:flex-row items-center lg:items-end gap-6 md:gap-10 lg:gap-14" : "flex-col pointer-events-none"
            )}>
                {showPosterColumn && posterUrl && (
                    <div className="media-hero-animate w-40 sm:w-44 md:w-56 lg:w-64 shrink-0 aspect-[2/3] rounded-container overflow-hidden border border-white/10 bg-surface-container shadow-elevation-5 pointer-events-auto">
                        <DeferredImage
                            src={posterUrl}
                            alt="Poster"
                            className="w-full h-full block"
                            imgClassName="!w-full !h-full !object-cover"
                        />
                    </div>
                )}

                <div className={cn(
                    "flex-1 flex flex-col gap-6 text-left w-full",
                    !showPosterColumn && typeof title === "string" && "max-w-3xl space-y-5 md:space-y-6",
                    // "boxed" lifts the copy off the backdrop onto a glass panel, so it
                    // stays readable over busy art; "fluid" (default) sits directly on it.
                    isBoxedInfo && "pointer-events-auto bg-zinc-950/40 backdrop-blur-[var(--blur-overlay-xl)] border border-white/10 rounded-container p-6 md:p-8"
                )}>
                    {topBadge && (
                        <div className="media-hero-animate pointer-events-auto">
                            {topBadge}
                        </div>
                    )}

                    {metadataRow && (
                        <div className="media-hero-animate pointer-events-auto">
                            {metadataRow}
                        </div>
                    )}

                    <div className="media-hero-animate space-y-2 pointer-events-auto flex items-start justify-start flex-col">
                        {typeof title === "string" ? (
                            <h1 
                                onClick={onTitleClick}
                                className={cn(
                                    MEDIA_HERO_TITLE_CLASS,
                                    onTitleClick && "cursor-pointer hover:text-brand-secondary transition-colors duration-slow"
                                )} 
                                style={{ fontSize: "max(1.75rem, min(5.5vw, 4.5rem))" }}
                            >
                                {title}
                            </h1>
                        ) : title}
                    </div>

                    {synopsis && (
                        <p className="media-hero-animate text-on-surface-variant text-sm md:text-base leading-relaxed line-clamp-3 drop-shadow-md font-medium max-w-3xl border-l-2 border-brand-secondary/30 pl-4 py-0.5 pointer-events-auto">
                            {synopsis}
                        </p>
                    )}

                    {footerText && (
                        <p className="media-hero-animate text-on-surface-variant text-xs font-semibold tracking-wide drop-shadow-sm pointer-events-auto">
                            {footerText}
                        </p>
                    )}

                    {actionButtons && (
                        <div className="media-hero-animate flex flex-wrap items-center gap-4 pt-2 pointer-events-auto">
                            {actionButtons}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
