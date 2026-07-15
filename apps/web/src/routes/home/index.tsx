import { useGetLibraryCollection, fetchLibraryCollection } from "@/api/hooks/anime_collection.hooks"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { motion } from "framer-motion"
import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"

import {
    mapLibraryEntryToMediaCard
} from "./home.mappers"
import { ErrorBanner, EmptyState } from "./home.components"
import { MediaSpotlight } from "@/components/ui/media-spotlight"
import { isTmdbId } from "@/lib/helpers/type-guards"
import { Swimlane, SwimlaneSkeleton } from "@/components/ui/swimlane"
import { useGetContinuityWatchHistory } from "@/api/hooks/continuity.hooks"
import { getEntryEra } from "../movies/-components/movies-utils"

export const Route = createFileRoute("/home/")({
    loader: ({ context }) => {
        const qc = context.queryClient
        qc.prefetchQuery({
            queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key],
            queryFn: fetchLibraryCollection,
        })
        return { dehydrateState: dehydrate(qc) }
    },
    component: HomePage,
})

function HomePage() {
    const { dehydrateState } = Route.useLoaderData()
    return (
        <HydrationBoundary state={dehydrateState}>
            <HomeClient />
        </HydrationBoundary>
    )
}

function HomeClient() {
    const navigate = useNavigate()
    const { data: collection, isLoading, error } = useGetLibraryCollection()

    // ── Data Processing ────────────────────────────────────────────────────────

    const allEntries = React.useMemo(() => {
        if (!collection?.lists) return []
        return collection.lists.flatMap(list => list.entries ?? [])
    }, [collection])

    const handleNavigate = React.useCallback(
        (mediaId: number) => {
            const entry = allEntries.find(e => e.mediaId === mediaId)
            const isMovie = entry?.media?.format === "MOVIE" || entry?.media?.format === "SPECIAL" || entry?.media?.format === "OVA" || isTmdbId(entry?.mediaId)
            if (isMovie) {
                navigate({ to: "/movies/$movieId", params: { movieId: String(mediaId) } })
            } else {
                navigate({ to: "/series/$seriesId", params: { seriesId: String(mediaId) } })
            }
        },
        [navigate, allEntries],
    )

    const handleSpotlightNavigate = React.useCallback(
        (item: { id: string }) => {
            const numericId = Number(item.id.replace("media-", ""))
            handleNavigate(numericId)
        },
        [handleNavigate],
    )

    const spotlightItems = React.useMemo(() => {
        if (!allEntries.length) return []

        const seen = new Set<number>()
        const uniqueEntries = allEntries.filter(entry => {
            if (!entry || !entry.media) return false
            if (seen.has(entry.media.id)) return false
            seen.add(entry.media.id)
            return true
        })

        uniqueEntries.sort((a, b) => (b.media?.score || 0) - (a.media?.score || 0))

        return uniqueEntries.map(entry => mapLibraryEntryToMediaCard(entry, handleNavigate))
    }, [allEntries, handleNavigate])

    const { data: watchHistory } = useGetContinuityWatchHistory()

    const continueWatchingItems = React.useMemo(() => {
        if (!watchHistory) return []
        const items = Object.values(watchHistory)
        items.sort((a, b) => {
            const timeA = a.timeUpdated ? new Date(a.timeUpdated).getTime() : 0
            const timeB = b.timeUpdated ? new Date(b.timeUpdated).getTime() : 0
            return timeB - timeA
        })

        return items
            .map(item => {
                const entry = allEntries.find(e => e.mediaId === item.mediaId)
                if (!entry || !entry.media) return null

                const progress = item.duration > 0 ? (item.currentTime / item.duration) * 100 : 0
                if (progress > 95 || progress < 1) return null

                const title = entry.media.titleSpanish || entry.media.titleEnglish || entry.media.titleRomaji || "Sin título"
                const subtitle = item.episodeNumber > 0 ? `Ep. ${item.episodeNumber}` : "Película"

                return {
                    id: `cw-${item.mediaId}-${item.episodeNumber}`,
                    title: title,
                    image: entry.media.bannerImage || entry.media.posterImage || "",
                    subtitle: subtitle,
                    progress: progress,
                    aspect: "wide" as const,
                    onClick: () => handleNavigate(item.mediaId)
                }
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
    }, [watchHistory, allEntries, handleNavigate])

    const seriesItems = React.useMemo(() => {
        const ids = [12609, 12971, 12697, 62715, 236994]
        return ids.map(id => {
            const entry = allEntries.find(e => e.mediaId === id)
            if (entry) {
                return {
                    id: `series-${id}`,
                    title: entry.media?.titleEnglish || entry.media?.titleRomaji || "Dragon Ball",
                    image: entry.media?.bannerImage || entry.media?.posterImage || "",
                    subtitle: `${entry.media?.totalEpisodes || 0} Episodios`,
                    aspect: "wide" as const,
                    onClick: () => navigate({ to: "/series/$seriesId", params: { seriesId: String(id) } })
                }
            }
            const staticTitles: Record<number, string> = {
                12609: "Dragon Ball",
                12971: "Dragon Ball Z",
                12697: "Dragon Ball GT",
                62715: "Dragon Ball Super",
                236994: "Dragon Ball Daima",
            }
            const staticBanners: Record<number, string> = {
                12609: "https://artworks.thetvdb.com/artworks/posters/76662-3.jpg",
                12971: "https://artworks.thetvdb.com/artworks/posters/72453-7.jpg",
                12697: "https://artworks.thetvdb.com/artworks/posters/78523-2.jpg",
                62715: "https://artworks.thetvdb.com/artworks/posters/295068-7.jpg",
                236994: "https://artworks.thetvdb.com/artworks/posters/440536-1.jpg",
            }
            return {
                id: `series-${id}`,
                title: staticTitles[id],
                image: staticBanners[id] || "",
                subtitle: "Saga Completa",
                aspect: "wide" as const,
                onClick: () => navigate({ to: "/series/$seriesId", params: { seriesId: String(id) } })
            }
        })
    }, [allEntries, navigate])

    const moviesByEra = React.useMemo(() => {
        const movies = allEntries.filter(e => {
            const fmt = e.media?.format
            const type = e.media?.type
            return fmt === "MOVIE" || fmt === "OVA" || fmt === "SPECIAL" || type?.toUpperCase() === "MOVIE" || isTmdbId(e.mediaId)
        })
        
        const eras = [
            { value: "Dragon Ball", label: "Películas: Dragon Ball Clásico" },
            { value: "Dragon Ball Z", label: "Películas: Era Dragon Ball Z" },
            { value: "Dragon Ball GT", label: "Películas: Era Dragon Ball GT" },
            { value: "Dragon Ball Super", label: "Películas: Era Dragon Ball Super" },
            { value: "Especiales y OVAs", label: "Especiales, OVAs y Películas Especiales" },
        ]
        
        return eras.map(era => {
            const eraMovies = movies.filter(m => getEntryEra(m) === era.value)
            return {
                title: era.label,
                items: eraMovies.map(m => {
                    const title = m.media?.titleSpanish || m.media?.titleEnglish || m.media?.titleRomaji || "Sin título"
                    const cleanTitle = title
                        .replace(/Dragon Ball (Z|GT|Super)?\s*[:-]?\s*/i, "")
                        .replace(/La película/i, "")
                        .trim()
                    return {
                        id: `movie-${m.mediaId}`,
                        title: cleanTitle,
                        image: m.media?.posterImage || m.media?.bannerImage || "",
                        subtitle: m.media?.startDate ? m.media.startDate.split("-")[0] : "",
                        aspect: "poster" as const,
                        onClick: () => navigate({ to: "/movies/$movieId", params: { movieId: String(m.mediaId) } })
                    }
                })
            }
        }).filter(lane => lane.items.length > 0)
    }, [allEntries, navigate])

    // ── Render Helpers ─────────────────────────────────────────────────────────

    if (error && !collection) return <ErrorBanner message="Hubo un problema al cargar tu biblioteca." />
    if (isLoading && !collection) return <HomeSkeleton />
    if (allEntries.length === 0) return <EmptyState />

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative min-h-screen text-on-surface overflow-x-hidden"
        >


            <div className="relative z-10 flex flex-col">
                <div className="relative pt-0 pb-6">
                    {spotlightItems.length > 0 && (
                        <MediaSpotlight
                            items={spotlightItems}
                            onNavigate={handleSpotlightNavigate}
                        />
                    )}
                </div>

                <div id="scroll-sentinel" className="absolute top-0 left-0 w-full h-1 pointer-events-none" />

                <div className="flex flex-col gap-10 pb-32 -mt-8 md:mt-0 relative z-20 w-full">
                    {continueWatchingItems.length > 0 && (
                        <Swimlane 
                            title="Continuar Viendo" 
                            items={continueWatchingItems} 
                        />
                    )}

                    {seriesItems.length > 0 && (
                        <Swimlane 
                            title="Sagas y Series" 
                            items={seriesItems} 
                        />
                    )}

                    {moviesByEra.map((lane, index) => (
                        <Swimlane 
                            key={index}
                            title={lane.title}
                            items={lane.items}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    )
}

function HomeSkeleton() {
    return (
        <div className="min-h-[100dvh] bg-surface flex flex-col gap-8 page-px pt-24 pb-12 overflow-hidden animate-pulse max-w-content mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch min-h-[60dvh] lg:min-h-[500px]">
                {/* Left side details skeleton */}
                <div className="lg:col-span-8 rounded-2xl lg:rounded-3xl min-h-[300px] lg:min-h-[400px] p-6 lg:p-8 flex flex-col justify-end space-y-4" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 40%, transparent)" }}>
                    <Skeleton className="h-6 w-32 bg-surface-container rounded-full" />
                    <Skeleton className="h-16 w-3/4 bg-surface-container rounded-lg" />
                    <Skeleton className="h-4 w-1/2 bg-surface-container rounded-lg" />
                    <Skeleton className="h-20 w-full bg-surface-container rounded-lg" />
                    <div className="flex gap-4">
                        <Skeleton className="h-10 w-32 bg-surface-container rounded-full" />
                        <Skeleton className="h-10 w-32 bg-surface-container rounded-full" />
                    </div>
                </div>
                {/* Right side list skeleton */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-2xl border border-outline-variant/30" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 20%, transparent)" }}>
                            <Skeleton className="h-16 w-24 bg-surface-container rounded-lg shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-2/3 bg-surface-container rounded" />
                                <Skeleton className="h-3 w-1/2 bg-surface-container rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Rieles Skeletons */}
            <div className="flex flex-col gap-10 mt-6">
                <SwimlaneSkeleton aspect="wide" itemCount={4} />
                <SwimlaneSkeleton aspect="poster" itemCount={5} />
            </div>
        </div>
    )
}
