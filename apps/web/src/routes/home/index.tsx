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
                <div className="relative pt-0 pb-12">
                    {spotlightItems.length > 0 && (
                        <MediaSpotlight
                            items={spotlightItems}
                            onNavigate={handleSpotlightNavigate}
                        />
                    )}
                    

                </div>
            </div>
        </motion.div>
    )
}

function HomeSkeleton() {
    return (
        <div className="min-h-screen bg-surface flex flex-col gap-8 p-6 md:p-12 lg:p-24 overflow-hidden animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch min-h-[500px]">
                {/* Left side details skeleton */}
                <div className="lg:col-span-8 rounded-3xl min-h-[400px] p-8 flex flex-col justify-end space-y-4" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 40%, transparent)" }}>
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
            
        </div>
    )
}
