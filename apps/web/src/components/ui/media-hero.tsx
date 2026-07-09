import * as React from "react"
import { useRef, useEffect } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { DeferredImage } from "@/components/shared/deferred-image"
import { getLowResImage } from "@/lib/helpers/images"
import { cn } from "@/components/ui/core/styling"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"
import { useThemeSettings } from "@/lib/theme/theme-hooks"

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
    
    className?: string

    /** Eventos opcionales */
    onBackdropClick?: () => void
    onTitleClick?: () => void
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
    className,
    onBackdropClick,
    onTitleClick
}: MediaHeroProps) {
    const heroRef = useRef<HTMLDivElement>(null)
    const backdropRef = useRef<HTMLDivElement>(null)
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl)
    const ts = useThemeSettings()
    const isSmallBanner = ts.themeMediaPageBannerSize === "small"

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
        const handleScroll = (e: Event) => {
            const target = e.target
            if (!backdropRef.current || !heroRef.current) return

            // Dependiendo de si la página usa el window o un scrollContainerRef
            if (scrollContainerRef?.current) {
                if (target === scrollContainerRef.current) {
                    backdropRef.current.style.transform = `translate3d(0, ${scrollContainerRef.current.scrollTop * 0.35}px, 0)`
                }
            } else {
                if (target === document || target === window) {
                    const scrolled = window.scrollY || document.documentElement.scrollTop
                    backdropRef.current.style.transform = `translate3d(0, ${scrolled * 0.35}px, 0)`
                } else if (target instanceof HTMLElement && target.contains(heroRef.current)) {
                    backdropRef.current.style.transform = `translate3d(0, ${target.scrollTop * 0.35}px, 0)`
                }
            }
        }
        window.addEventListener("scroll", handleScroll, { capture: true, passive: true })
        return () => window.removeEventListener("scroll", handleScroll, { capture: true })
    }, [scrollContainerRef])

    useGSAP(() => {
        gsap.from(".media-hero-animate", {
            y: 35,
            opacity: 0,
            duration: 1.2,
            stagger: 0.08,
            ease: "power4.out",
            delay: 0.15
        })
    }, { scope: heroRef, dependencies: [typeof title === "string" ? title : null] })

    return (
        <section
            ref={heroRef}
            className={cn(
                "relative w-full flex flex-col justify-end overflow-hidden pb-16 pt-32 shrink-0 select-none",
                isSmallBanner ? "min-h-[60vh] md:min-h-[260px]" : "min-h-[100vh]",
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
            <div className="absolute inset-0 z-0">
                {backdropUrl && (
                    hasBannerImage ? (
                        <div
                            ref={backdropRef}
                            onClick={onBackdropClick}
                            className={cn(
                                "absolute right-0 top-0 h-full w-full overflow-hidden z-0 will-change-transform group/backdrop",
                                onBackdropClick && "cursor-pointer"
                            )}
                        >
                            <DeferredImage
                                src={backdropUrl}
                                alt="Backdrop"
                                priority={true}
                                className="w-full h-full object-cover object-[center_20%] opacity-85 animate-ken-burns"
                            />
                        </div>
                    ) : (
                        <div
                            ref={backdropRef}
                            onClick={onBackdropClick}
                            className={cn(
                                "absolute right-0 top-0 h-full w-auto overflow-hidden z-0 will-change-transform group/backdrop",
                                onBackdropClick && "cursor-pointer"
                            )}
                        >
                            <DeferredImage
                                src={backdropUrl}
                                alt="Backdrop"
                                priority={true}
                                className="h-full w-auto opacity-[0.65] animate-ken-burns"
                                imgClassName="!w-auto !h-full !object-contain !object-right-top"
                            />
                        </div>
                    )
                )}
            </div>

            {/* Scrims cinematográficos (tokenizados) */}
            <div className="absolute inset-0 z-10 pointer-events-none scrim-hero-left" />
            <div className="absolute inset-x-0 bottom-0 h-64 z-10 pointer-events-none scrim-hero-bottom" />
            <div className="absolute inset-x-0 top-0 h-32 z-10 pointer-events-none scrim-hero-top" />

            {/* Content Container */}
            <div className={cn(
                "relative z-20 w-full max-w-[1800px] mx-auto px-8 md:px-16 lg:px-20 xl:px-24 flex",
                showPosterColumn ? "flex-col lg:flex-row items-center lg:items-end gap-10 lg:gap-14" : "flex-col pointer-events-none"
            )}>
                {showPosterColumn && posterUrl && (
                    <div className="media-hero-animate w-56 md:w-64 shrink-0 aspect-[2/3] rounded-container overflow-hidden border border-white/10 bg-surface-container shadow-elevation-5 pointer-events-auto">
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
                    !showPosterColumn && "max-w-3xl space-y-5 md:space-y-6"
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
                                    "font-sans font-extrabold leading-[1.05] tracking-tight text-on-surface drop-shadow-[0_4px_25px_rgba(0,0,0,0.85)] uppercase",
                                    onTitleClick && "cursor-pointer hover:text-brand-secondary transition-colors duration-slow"
                                )} 
                                style={{ fontSize: "max(2.5rem, min(5.5vw, 4.5rem))" }}
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
