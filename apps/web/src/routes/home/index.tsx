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

export const Route = createFileRoute("/home/")({
    loader: async ({ context }) => {
        const qc = context.queryClient
        await qc.prefetchQuery({
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
                <div className="relative pt-0 pb-6">
                    {spotlightItems.length > 0 && (
                        <MediaSpotlight
                            items={spotlightItems}
                            onNavigate={handleSpotlightNavigate}
                        />
                    )}
                </div>

                <div id="scroll-sentinel" className="absolute top-0 left-0 w-full h-1 pointer-events-none" />

            </div>
        </motion.div>
    )
}

/**
 * Mirrors the MediaSpotlight layout: hero + details + era selector, then the movie poster grid.
 */
function HomeSkeleton() {
    return (
        <div className="min-h-[100dvh] bg-surface pt-20 md:pt-28 pb-16 overflow-hidden animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch page-px max-w-content mx-auto w-full">
                {/* Hero + details */}
                <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    <Skeleton className="md:col-span-7 w-full aspect-[4/3] md:aspect-[16/10] rounded-hero bg-surface-container border border-white/10" />
                    <div className="md:col-span-5 flex flex-col justify-center space-y-4 px-1">
                        <div className="flex gap-1.5">
                            <Skeleton className="h-6 w-16 bg-surface-container rounded-sm" />
                            <Skeleton className="h-6 w-14 bg-surface-container rounded-sm" />
                        </div>
                        <Skeleton className="h-12 w-3/4 bg-surface-container rounded-lg" />
                        <Skeleton className="h-16 w-full max-w-sm bg-surface-container rounded-lg" />
                        <div className="flex gap-3 mt-2">
                            <Skeleton className="h-11 w-40 bg-surface-container rounded-xl" />
                            <Skeleton className="h-11 w-32 bg-surface-container rounded-xl" />
                        </div>
                    </div>
                </div>
                {/* Era selector panel */}
                <div className="hidden lg:flex flex-col lg:col-span-3 justify-center">
                    <div className="rounded-hero border border-white/10 p-5 xl:p-6 space-y-2" style={{ background: "var(--glass-panel-bg)" }}>
                        <Skeleton className="h-3 w-24 bg-surface-container rounded mb-4" />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-14 w-full bg-surface-container rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
            {/* Movie poster grid */}
            <div className="mt-14 space-y-4 page-px max-w-content mx-auto w-full">
                <Skeleton className="h-6 w-72 bg-surface-container rounded" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="w-full aspect-[2/3] bg-surface-container rounded-xl" />
                    ))}
                </div>
            </div>
        </div>
    )
}
