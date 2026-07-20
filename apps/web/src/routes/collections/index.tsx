import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useMemo, memo } from "react"
import { Icons } from "@/components/ui/icons"
import { EmptyState } from "@/components/shared/empty-state"
import { useGetMediaCollections, fetchMediaCollections } from "@/api/hooks/collections.hooks"
import { useGetLibraryCollection, fetchLibraryCollection } from "@/api/hooks/anime_collection.hooks"
import { cn } from "@/components/ui/core/styling"
import { DeferredImage } from "@/components/shared/deferred-image"
import { HeroSection } from "@/components/shared/hero-section"
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { getMediumResImage } from "@/lib/helpers/images"

export const Route = createFileRoute("/collections/")({
    loader: ({ context }) => {
        const qc = context.queryClient
        Promise.all([
            qc.prefetchQuery({
                queryKey: ["collections-list"],
                queryFn: fetchMediaCollections,
            }),
            qc.prefetchQuery({
                queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key],
                queryFn: fetchLibraryCollection,
            })
        ])
        return { dehydrateState: dehydrate(qc) }
    },
    component: CollectionsPageWrapper,
})

function CollectionsPageWrapper() {
    const { dehydrateState } = Route.useLoaderData()
    return (
        <HydrationBoundary state={dehydrateState}>
            <CollectionsPage />
        </HydrationBoundary>
    )
}

const SPINE_W = 52
const CASSETTE_W = 220
const CASSETTE_H = 330
const OVERLAP = 80

function CollectionsPage() {
    const [search, setSearch] = useState("")
    const navigate = useNavigate()
    const { data: collections = [], isLoading } = useGetMediaCollections()
    const { data: library } = useGetLibraryCollection()

    const libraryEntries = useMemo(() => {
        if (!library?.lists) return []
        return library.lists.flatMap(list => list.entries || [])
    }, [library])

    const filtered = useMemo(() => {
        return collections.filter(c => {
            const matchesSearch = search
                ? c.name.toLowerCase().includes(search.toLowerCase()) ||
                  (c.overview || "").toLowerCase().includes(search.toLowerCase())
                : true
            return matchesSearch
        })
    }, [collections, search])

    const enrichedCollections = useMemo(() => {
        if (!filtered.length) return []
        
        // Build a fast lookup map of mediaId to its library stats
        const libraryMap = new Map<number, { isLocal: boolean; isWatched: boolean }>()
        libraryEntries.forEach(entry => {
            if (entry.mediaId) {
                const isLocal = (entry.libraryData?.mainFileCount || 0) > 0
                const isWatched = !!(entry.media?.watched || (entry.listData?.progress || 0) >= (entry.media?.totalEpisodes || 0))
                libraryMap.set(entry.mediaId, { isLocal, isWatched })
            }
        })

        return filtered.map(c => {
            const memberIds = c.memberIds || []
            const totalMembers = memberIds.length
            let localMembers = 0
            let watchedMembers = 0
            
            memberIds.forEach(mId => {
                const stats = libraryMap.get(mId)
                if (stats) {
                    if (stats.isLocal) localMembers++
                    if (stats.isWatched) watchedMembers++
                }
            })

            return {
                ...c,
                totalMembers,
                localMembers,
                watchedMembers,
            }
        })
    }, [filtered, libraryEntries])

    const handleNavigate = (id: number) => {
        navigate({ to: "/collections/$id", params: { id: String(id) } })
    }

    return (
        <div className="flex-1 w-full min-h-screen bg-transparent text-on-surface overflow-hidden font-sans selection:bg-brand-accent/30">
            {/* Page Header */}
            <HeroSection
                title={<>SAGAS<br /><span className="text-transparent stroke-text opacity-20">UNIFICADAS</span></>}
                subtitle="Universos cinematográficos y cronologías completas unificadas en un solo archivo."
                decorationTag="Cronologías Maestras"
                verticalTag="UNIVERSOS · SAGAS · CRONOLOGÍAS"
                count={isLoading ? "..." : collections.length}
                countLabel="Sagas"
            />

            {/* Controls */}
            <div className="sticky top-0 z-30 border-b border-outline-variant/5 backdrop-blur-overlay-2xl" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 60%, transparent)" }}>
                <div className="px-4 sm:px-8 md:px-16 py-3 flex flex-wrap gap-4 items-center justify-between">
                    {/* Search */}
                    <div className="relative group w-full sm:w-auto">
                        <Icons.navigation.search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-on-surface transition-colors text-xs" />
                        <input
                            // text-base en mobile: iOS Safari hace zoom al enfocar cualquier
                            // input por debajo de 16px. El tamaño de desktop no cambia.
                            className="pl-10 pr-4 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant/10 focus:border-on-surface rounded-none text-base md:text-sm outline-none transition-all duration-base placeholder:text-on-surface-variant/40 w-full max-w-xs sm:w-64"
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="BUSCAR FRANQUICIAS..."
                        />
                    </div>
                </div>
            </div>

            {/* Cassette Shelf */}
            <div className="relative w-full overflow-hidden min-h-[450px] flex items-center justify-center">
                {isLoading && collections.length === 0 ? (
                    <ShelfSkeleton />
                ) : enrichedCollections.length === 0 ? (
                    <div className="px-4 sm:px-16 py-24 w-full">
                        <EmptyState
                            title="No hay colecciones"
                            message={search ? "No hemos encontrado colecciones que coincidan con tu búsqueda." : "Aún no se han descubierto colecciones cinematográficas. Escanea películas en tu biblioteca para poblarlas."}
                            illustration={<Icons.navigation.layers className="w-20 h-20 text-on-surface-variant/20" />}
                        />
                    </div>
                ) : (
                    <div
                        className="flex flex-nowrap items-end overflow-x-auto no-scrollbar py-12 sm:py-20 px-4 sm:px-16 w-full justify-start md:justify-center"
                        style={{ perspective: "2400px" }}
                    >
                        {enrichedCollections.map((coll, idx) => (
                            <CollectionCassette
                                key={coll.id}
                                coll={coll}
                                idx={idx}
                                onNavigate={handleNavigate}
                            />
                        ))}
                        {/* Spacer to allow scrolling */}
                        <div className="shrink-0 w-32" />
                    </div>
                )}
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}

interface CollectionCassetteProps {
    coll: {
        id: number
        tmdbCollectionId: number
        name: string
        overview?: string
        posterPath?: string
        backdropPath?: string
        memberIds?: number[]
        totalMembers: number
        localMembers: number
        watchedMembers: number
    }
    idx: number
    onNavigate: (id: number) => void
}

const CollectionCassette = memo(function CollectionCassette({
    coll, idx, onNavigate
}: CollectionCassetteProps) {
    const count = coll.memberIds?.length || 0
    const { totalMembers, localMembers, watchedMembers } = coll

    const isFullyWatched = totalMembers > 0 && watchedMembers === totalMembers
    const isFullyLocal = totalMembers > 0 && localMembers === totalMembers

    const accentStripeClass = cn(
        "absolute left-0 inset-y-0 w-1 transition-[background-color,box-shadow] duration-base",
        isFullyWatched
            ? "bg-brand-success shadow-[0_0_8px_hsl(var(--era-dbs-hsl)/0.6)]"
            : isFullyLocal
                ? "bg-brand-secondary shadow-[0_0_8px_hsl(var(--era-dbz-hsl)/0.6)]"
                : "bg-brand-accent"
    )

    const stateColorClass = isFullyWatched
        ? "text-brand-success"
        : isFullyLocal
            ? "text-brand-secondary"
            : "text-brand-accent"

    return (
        <div
            className={cn(
                "group/item relative shrink-0 hover:z-[9999]"
            )}
            style={{
                marginLeft: idx !== 0 ? -OVERLAP : 0,
                zIndex: idx,
            }}
        >
            {/* 3D wrapper */}
            <div
                className="relative [transform-style:preserve-3d] [transform:rotateY(35deg)] group-hover/item:[transform:rotateY(0deg)_translateZ(80px)_translateY(-30px)]"
                style={{
                    width: CASSETTE_W + SPINE_W,
                    height: CASSETTE_H,
                    willChange: "transform",
                    transition: "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
            >
                {/* Spine */}
                <div
                    className="absolute inset-y-0 left-0 flex flex-col justify-between overflow-hidden border border-outline-variant/20 bg-surface-container"
                    style={{
                        width: SPINE_W,
                    }}
                >
                    {/* Accent stripe */}
                    <div className={accentStripeClass} />
                    
                    {/* Size badge */}
                    <div className="mt-4 ml-4 flex items-center gap-1">
                        <Icons.navigation.layers className={cn("text-xs transition-colors", stateColorClass)} />
                        <span className="text-caption font-black tabular-nums text-on-surface-variant">{count} PARTES</span>
                    </div>

                    {/* Title rotated */}
                    <span
                        className="flex-1 text-label-sm font-black text-on-surface-variant/80 tracking-widest whitespace-nowrap px-2 py-4 uppercase"
                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", textOverflow: "ellipsis", overflow: "hidden" }}
                    >
                        {coll.name}
                    </span>

                    {/* Footer decoration */}
                    <div className="mb-3 ml-3 flex items-center justify-center">
                        <span className="text-xs font-black text-on-surface-variant/40 tracking-wider">SAGA</span>
                    </div>
                </div>

                {/* Cover */}
                <div
                    className="absolute inset-y-0 right-0 overflow-hidden border border-outline-variant/20 cursor-pointer bg-surface-container"
                    style={{ left: SPINE_W }}
                    onClick={() => onNavigate(coll.tmdbCollectionId)}
                >
                    {/* Poster */}
                    <DeferredImage
                        src={getMediumResImage(coll.posterPath || "")}
                        alt={coll.name}
                        className="w-full h-full object-cover grayscale group-hover/item:grayscale-0"
                        style={{
                            transition: "filter 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                            willChange: "filter",
                        }}
                    />

                    {/* Dark gradient base */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

                    {/* Hover info overlay */}
                    <div 
                        className="absolute inset-0 flex flex-col justify-end p-5 opacity-0 group-hover/item:opacity-100"
                        style={{
                            background: "color-mix(in srgb, var(--md-sys-color-surface-container) 95%, transparent)",
                            transition: "opacity 500ms cubic-bezier(0.16, 1, 0.3, 1)",
                            willChange: "opacity",
                        }}
                    >
                        
                        {/* Sello Retro SAGA COMPLETADA */}
                        {isFullyWatched && (
                            <div className="absolute top-5 right-5 z-20 pointer-events-none select-none transition-all duration-slow rotate-[-12deg] scale-100">
                                <span className="block px-2 py-1 border border-brand-success/50 text-brand-success text-label-sm font-black uppercase tracking-widest rounded bg-brand-success/5 backdrop-blur-overlay-sm shadow-[0_4px_10px_hsl(var(--era-dbs-hsl)/0.15)]">
                                    COMPLETADA
                                </span>
                            </div>
                        )}

                        {/* Play CTA */}
                        <button
                            onClick={() => onNavigate(coll.tmdbCollectionId)}
                            className="mb-6 w-full flex items-center justify-center gap-2 py-3 font-black text-caption uppercase tracking-ultra text-on-primary bg-brand-accent hover:brightness-110 transition-all duration-base"
                        >
                            <Icons.media.play className="w-3.5 h-3.5" />
                            Explorar saga
                        </button>

                        {/* Title */}
                        <h3 className="text-base font-black text-on-surface leading-tight mb-3 uppercase tracking-tight line-clamp-2">
                            {coll.name}
                        </h3>

                        {/* Library Stats */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            <span className="flex items-center gap-1 text-label-sm font-black px-2 py-1 bg-surface-container text-on-surface-variant/80 uppercase tracking-widest border border-outline-variant/5">
                                <Icons.navigation.list className="w-3 h-3" /> {count} PARTES
                            </span>
                            {localMembers > 0 && (
                                <span className={cn(
                                    "flex items-center gap-1 text-label-sm font-black px-2 py-1 uppercase tracking-widest border transition-all duration-base",
                                    isFullyLocal
                                        ? "bg-brand-secondary/10 text-brand-secondary border-brand-secondary/30 shadow-[0_0_8px_hsl(var(--era-dbz-hsl)/0.15)]"
                                        : "bg-surface-container-low text-on-surface-variant border-outline-variant/5"
                                )}>
                                    {localMembers}/{totalMembers} LOCAL
                                </span>
                            )}
                            {watchedMembers > 0 && (
                                <span className={cn(
                                    "flex items-center gap-1 text-label-sm font-black px-2 py-1 uppercase tracking-widest border transition-all duration-base",
                                    isFullyWatched
                                        ? "bg-brand-success/10 text-brand-success border-brand-success/30 shadow-[0_0_8px_hsl(var(--era-dbs-hsl)/0.15)]"
                                        : "bg-surface-container-low text-on-surface-variant border-outline-variant/5"
                                )}>
                                    {watchedMembers}/{totalMembers} VISTAS
                                </span>
                            )}
                        </div>

                        {/* Description */}
                        {coll.overview && (
                            <p className="text-caption text-on-surface-variant leading-relaxed line-clamp-4 font-medium">
                                {coll.overview}
                            </p>
                        )}
                    </div>

                    {/* Always visible bottom title strip */}
                    <div 
                        className="absolute bottom-0 left-0 right-0 px-3 py-3 group-hover/item:opacity-0 transition-opacity duration-slow ease-out"
                    >
                        <p className="text-caption font-black text-on-surface uppercase tracking-wider line-clamp-1">
                            {coll.name}
                        </p>
                    </div>
                </div>

                {/* Drop shadow beneath cassette */}
                <div
                    className="absolute -bottom-6 left-4 right-4 h-6 opacity-0 group-hover/item:opacity-100 blur-xl bg-on-surface/10 transition-opacity duration-slower ease-out"
                />
            </div>
        </div>
    )
})

function ShelfSkeleton() {
    return (
        <div className="flex flex-nowrap items-end py-20 px-16 gap-0 overflow-hidden w-full justify-center">
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className="shrink-0 rounded-none animate-pulse border border-outline-variant/5"
                    style={{
                        background: "color-mix(in srgb, var(--md-sys-color-surface-container) 5%, transparent)",
                        width: CASSETTE_W,
                        height: CASSETTE_H + ((i * 7) % 21),
                        marginLeft: i !== 0 ? -OVERLAP : 0,
                    }}
                />
            ))}
        </div>
    )
}
