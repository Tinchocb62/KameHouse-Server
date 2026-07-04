import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useGetMediaCollection, fetchMediaCollection } from "@/api/hooks/collections.hooks"
import { useGetLibraryCollection, fetchLibraryCollection } from "@/api/hooks/anime_collection.hooks"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"
import React, { useMemo, useRef } from "react"
import { EmptyState } from "@/components/shared/empty-state"
import { Play, Calendar, Tag, ChevronLeft, Star, CheckCircle2 } from "lucide-react"
import { cn } from "@/components/ui/core/styling"
import { useIntelligenceStore } from "@/hooks/use-home-intelligence"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { DeferredImage } from "@/components/shared/deferred-image"

export const Route = createFileRoute("/collections/$id")({
    loader: async ({ params: { id }, context }) => {
        const qc = context.queryClient
        const collId = Number(id)
        
        await Promise.all([
            qc.prefetchQuery({
                queryKey: ["collection-detail", collId],
                queryFn: () => fetchMediaCollection(collId),
            }),
            qc.prefetchQuery({
                queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key],
                queryFn: fetchLibraryCollection,
            })
        ])
        
        return { dehydrateState: dehydrate(qc) }
    },
    component: CollectionDetailPageWrapper,
})

function CollectionDetailPageWrapper() {
    const { dehydrateState } = Route.useLoaderData()
    return (
        <HydrationBoundary state={dehydrateState}>
            <CollectionDetailPage />
        </HydrationBoundary>
    )
}

function CollectionDetailPage() {
    const { id } = Route.useParams()
    const navigate = useNavigate()
    const { data: collection, isLoading, error } = useGetMediaCollection(Number(id))
    const { data: libraryCollection } = useGetLibraryCollection()
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl)

    const libraryEntries = useMemo(() => {
        if (!libraryCollection?.lists) return []
        return libraryCollection.lists.flatMap(list => list.entries || [])
    }, [libraryCollection])

    const containerRef = useRef<HTMLDivElement>(null)
    const timelineRef = useRef<HTMLDivElement>(null)

    // Set the global background backdrop when the collection loads
    React.useEffect(() => {
        if (collection?.backdropPath) {
            setBackdropUrl(collection.backdropPath)
        }
    }, [collection, setBackdropUrl])

    // Apply high-performance GSAP entrance animations to the timeline cards
    useGSAP(() => {
        if (!isLoading && collection?.parts?.length) {
            // Animate hero content
            gsap.fromTo(
                ".hero-content-anim",
                { opacity: 0, y: 40 },
                { opacity: 1, y: 0, duration: 1, ease: "power4.out", stagger: 0.15 }
            )

            // Animate timeline nodes
            gsap.fromTo(
                ".timeline-node-anim",
                { opacity: 0, scale: 0 },
                { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)", stagger: 0.1, delay: 0.5 }
            )

            // Animate timeline cards
            gsap.fromTo(
                ".timeline-card-anim",
                { opacity: 0, x: (i) => (i % 2 === 0 ? -50 : 50) },
                { opacity: 1, x: 0, duration: 0.8, ease: "power3.out", stagger: 0.12, delay: 0.3 }
            )
        }
    }, { scope: containerRef, dependencies: [isLoading, collection] })

    // Sort parts chronologically by release date
    const sortedParts = useMemo(() => {
        if (!collection?.parts) return []
        return [...collection.parts].sort((a, b) => {
            const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0
            const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0
            return dateA - dateB
        })
    }, [collection])

    if (isLoading && !collection) {
        return (
            <div className="min-h-screen bg-transparent text-on-surface flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-outline-variant/10 border-t-on-surface rounded-full animate-spin" />
                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-on-surface-variant/80">Cargando Cronología...</span>
                </div>
            </div>
        )
    }

    if (error || !collection) {
        return (
            <div className="min-h-screen bg-transparent text-on-surface flex items-center justify-center p-6">
                <EmptyState
                    title="Saga no encontrada"
                    message="No pudimos localizar los datos de la saga seleccionada. Intenta recargar o vuelve al catálogo de sagas."
                    action={
                        <button
                            onClick={() => navigate({ to: "/collections" })}
                            className="mt-6 flex items-center gap-2 px-6 py-3 bg-on-surface text-black font-black uppercase text-[11px] tracking-[0.2em] hover:bg-surface-container-high transition-colors"
                        >
                            <ChevronLeft /> Volver a Sagas
                        </button>
                    }
                />
            </div>
        )
    }

    const backdropUrl = collection.backdropPath || ""
    const posterUrl = collection.posterPath || ""
    const partCount = sortedParts.length

    return (
        <div ref={containerRef} className="min-h-screen bg-transparent text-on-surface flex flex-col w-full relative overflow-x-hidden pb-32">

            {/* Back Button */}
            <button
                onClick={() => navigate({ to: "/collections" })}
                className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 border border-outline-variant/10 backdrop-blur-overlay-md hover:border-on-surface text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 40%, transparent)" }}
            >
                <ChevronLeft /> Volver a Sagas
            </button>

            {/* Cinematic Hero Header */}
            <section className="relative min-h-[65vh] flex flex-col justify-end pt-32 pb-20 px-8 md:px-16 lg:px-24">
                {/* Backdrop with gradient and subtle motion blur */}
                {backdropUrl && (
                    <div className="absolute inset-0 z-0 overflow-hidden bg-surface-container">
                        <DeferredImage
                            src={backdropUrl}
                            alt={collection.name}
                            priority={true}
                            className="w-full h-full object-cover object-center opacity-25 grayscale select-none pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                    </div>
                )}

                <div className="relative z-10 flex flex-col lg:flex-row items-end gap-12 max-w-[1600px] mx-auto w-full">
                    {/* Big poster */}
                    {posterUrl && (
                        <div className="hero-content-anim hidden lg:block shrink-0 w-60 xl:w-72 border border-outline-variant/10 bg-surface-container group transition-all duration-500 hover:border-on-surface shadow-elevation-5">
                            <DeferredImage
                                src={posterUrl}
                                alt={collection.name}
                                priority={true}
                                className="w-full aspect-[2/3] object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                            />
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="flex-1 flex flex-col gap-6">
                        <div className="hero-content-anim flex items-center gap-4">
                            <div className="h-[2px] w-12 bg-on-surface" />
                            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-on-surface-variant/80">Cronología Unificada</span>
                        </div>

                        <h1 className="hero-content-anim font-bebas text-6xl md:text-8xl xl:text-[8.5rem] leading-[0.85] tracking-tight text-on-surface uppercase select-all">
                            {collection.name}
                        </h1>

                        <div className="hero-content-anim flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant">
                            <span>SAGA COMPLETA</span>
                            <span className="w-1.5 h-1.5 bg-on-surface/25 rounded-full" />
                            <span className="text-on-surface">{partCount} ENTREGAS</span>
                        </div>

                        {collection.overview && (
                            <p className="hero-content-anim max-w-4xl text-[14px] text-on-surface-variant leading-relaxed font-semibold uppercase tracking-wide">
                                {collection.overview}
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* Timeline Section */}
            <section className="relative z-10 px-8 md:pl-[120px] md:pr-16 lg:pl-[120px] lg:pr-24 max-w-[1400px] mx-auto w-full">
                <div className="space-y-1 border-b border-outline-variant/10 pb-8 mb-20 flex items-center justify-between">
                    <div>
                        <h2 className="text-4xl font-bebas tracking-widest text-on-surface uppercase">LINEA TEMPORAL</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">
                            Orden recomendado de visualización (Saga principal)
                        </p>
                    </div>
                </div>

                {/* Timeline Axis */}
                <div ref={timelineRef} className="relative flex flex-col gap-12 md:gap-24">
                    {/* Vertical Connecting Line */}
                    <div className="absolute left-6 md:left-1/2 top-4 bottom-4 w-[2px] bg-surface-container -translate-x-1/2 z-0 hidden md:block" />

                    {sortedParts.map((part, index) => {
                        const isEven = index % 2 === 0
                        const formattedDate = part.releaseDate
                            ? new Date(part.releaseDate).toLocaleDateString("es-ES", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                              })
                            : "Fecha Desconocida"

                        const libraryEntry = libraryEntries.find(e => e.mediaId === part.id)
                        const hasLocal = libraryEntry ? (libraryEntry.libraryData?.mainFileCount || 0) > 0 : false
                        const isCompleted = libraryEntry ? (libraryEntry.listData?.status === "COMPLETED" || (libraryEntry.listData?.progress || 0) >= (libraryEntry.media?.totalEpisodes || 0)) : false
                        const isCurrent = libraryEntry ? libraryEntry.listData?.status === "CURRENT" : false
                        const isPlanning = libraryEntry ? libraryEntry.listData?.status === "PLANNING" : false
                        const userScore = libraryEntry?.listData?.score || 0

                        const progress = libraryEntry?.listData?.progress || 0
                        const totalEp = libraryEntry?.media?.totalEpisodes || 1
                        const progressPercent = Math.min(100, Math.max(0, (progress / totalEp) * 100))

                        return (
                            <div
                                key={part.id}
                                className={cn(
                                    "relative flex flex-col md:flex-row items-stretch md:items-center w-full z-10 gap-8 md:gap-0"
                                )}
                            >
                                {/* Left Side (Even items get the Card, Odd items get Empty spacing) */}
                                <div className={cn("w-full md:w-1/2 flex justify-end md:pr-12", !isEven && "md:order-3 md:justify-start md:pl-12")}>
                                    <div
                                        className={cn(
                                            "timeline-card-anim w-full md:max-w-xl group relative border border-outline-variant/10 hover:border-on-surface bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_60%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_80%,transparent)] transition-all duration-300 p-6 md:p-8 flex flex-col md:flex-row gap-6 text-left"
                                        )}
                                    >
                                        {/* Entry Poster */}
                                        {part.posterPath && (
                                            <div className="shrink-0 w-28 md:w-32 bg-surface-container border border-outline-variant/5 group-hover:border-outline-variant/20 overflow-hidden transition-all duration-500 aspect-[2/3] relative">
                                                <DeferredImage
                                                    src={part.posterPath}
                                                    alt={part.title}
                                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-transform duration-500 group-hover:scale-105"
                                                />
                                                
                                                {/* LOC Badge */}
                                                {hasLocal && (
                                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded backdrop-blur-overlay-md border border-green-500/40 text-[7px] font-black text-green-400 tracking-wider shadow-[0_0_10px_rgba(34,197,94,0.2)]" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 75%, transparent)" }}>
                                                        LOC
                                                    </div>
                                                )}

                                                {/* Score Badge */}
                                                {userScore > 0 && (
                                                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded backdrop-blur-overlay-md border border-yellow-500/40 text-[7px] font-black text-yellow-500 tracking-wider flex items-center gap-1 shadow-elevation-2" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 75%, transparent)" }}>
                                                        <Star className="w-2 h-2" />
                                                        <span>{userScore}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Entry Info */}
                                        <div className="flex-1 flex flex-col justify-between gap-4">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-3 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/80">
                                                    <span className="flex items-center gap-1.5"><Calendar className="text-[8px]" /> {formattedDate}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1.5"><Tag className="text-[8px]" /> {part.format || "N/A"}</span>
                                                    {isCompleted && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1 text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 shadow-sm">
                                                                <CheckCircle2 className="text-[8px]" /> COMPLETADO
                                                            </span>
                                                        </>
                                                    )}
                                                    {isCurrent && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1 text-brand-secondary bg-brand-secondary/10 px-2 py-0.5 rounded border border-brand-secondary/20 shadow-sm animate-pulse">
                                                                VIENDO ({progress}/{totalEp})
                                                            </span>
                                                        </>
                                                    )}
                                                    {isPlanning && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1 text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded border border-[color:color-mix(in_srgb,var(--md-sys-color-surface-container-high)_30%,transparent)]">
                                                                PLANIFICADO
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <h3 className="text-xl md:text-2xl font-black text-on-surface leading-tight uppercase tracking-tight group-hover:text-yellow-500 transition-colors">
                                                    {part.title}
                                                </h3>
                                                {part.overview && (
                                                    <p className="text-[12px] text-on-surface-variant/80 group-hover:text-on-surface-variant font-bold uppercase tracking-wider leading-relaxed line-clamp-3">
                                                        {part.overview}
                                                    </p>
                                                )}

                                                {/* Watch progress bar for CURRENT */}
                                                {isCurrent && progressPercent > 0 && (
                                                    <div className="pt-2 space-y-1">
                                                        <div className="flex justify-between items-center text-[8px] font-bold tracking-widest text-on-surface-variant uppercase">
                                                            <span>PROGRESO VISTA</span>
                                                            <span>{Math.round(progressPercent)}%</span>
                                                        </div>
                                                        <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden border border-outline-variant/5">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-brand-secondary to-on-surface rounded-full transition-all duration-500" 
                                                                style={{ width: `${progressPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Button */}
                                            <button
                                                onClick={() => {
                                                    const isMovie = part.format === "MOVIE" || part.format === "SPECIAL" || part.format === "OVA" || libraryEntry?.media?.format === "MOVIE"
                                                    if (isMovie) {
                                                        navigate({
                                                            to: "/movies/$movieId",
                                                            params: { movieId: String(part.id) },
                                                        })
                                                    } else {
                                                        navigate({
                                                            to: "/series/$seriesId",
                                                            params: { seriesId: String(part.id) },
                                                        })
                                                    }
                                                }}
                                                className={cn(
                                                    "self-start flex items-center gap-2 py-2.5 px-5 bg-on-surface text-black text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-200",
                                                    isCurrent ? "bg-brand-secondary text-on-surface hover:bg-brand-secondary/80 shadow-[0_4px_20px_rgba(255,107,0,0.2)]" : "hover:bg-yellow-500"
                                                )}
                                            >
                                                <Play className="text-[8px]" /> {isCurrent ? "REANUDAR PELÍCULA" : "VER DETALLES"}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Center Node (Dynamic badge/dot) */}
                                <div className="absolute left-6 md:left-1/2 -translate-x-1/2 top-4 md:top-auto z-20 flex items-center justify-center md:order-2">
                                    <div className="timeline-node-anim flex items-center justify-center w-12 h-12 rounded-full bg-surface-container border border-outline-variant/20 group-hover:border-on-surface shadow-elevation-4 relative">
                                        <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-ping opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <span className="text-xs font-black text-on-surface tabular-nums">{index + 1}</span>
                                    </div>
                                </div>

                                {/* Right Side (Empty space spacer) */}
                                <div className={cn("hidden md:block w-1/2 md:order-1", !isEven && "md:order-4")} />
                            </div>
                        )
                    })}
                </div>
            </section>
        </div>
    )
}
