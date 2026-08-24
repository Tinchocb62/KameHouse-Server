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

    const allEntriesRef = React.useRef(allEntries)
    allEntriesRef.current = allEntries

    const handleNavigate = React.useCallback(
        (mediaId: number) => {
            const entry = allEntriesRef.current.find(e =>
                e.mediaId === mediaId ||
                e.media?.id === mediaId ||
                e.media?.tmdbId === mediaId
            )
            const resolvedId = entry?.mediaId || entry?.media?.tmdbId || entry?.media?.id || mediaId
            const format = entry?.media?.format
            const isMovie = format === "MOVIE" || format === "SPECIAL" || format === "OVA" || isTmdbId(resolvedId) || isTmdbId(entry?.mediaId)
            if (isMovie) {
                navigate({ to: "/movies/$movieId", params: { movieId: String(resolvedId) } })
            } else {
                navigate({ to: "/series/$seriesId", params: { seriesId: String(resolvedId) } })
            }
        },
        [navigate],
    )

    const handleNavigateRef = React.useRef(handleNavigate)
    handleNavigateRef.current = handleNavigate

    const handleSpotlightNavigate = React.useCallback(
        (item: { id: string }) => {
            const numericId = Number(item.id.replace("media-", ""))
            handleNavigateRef.current(numericId)
        },
        [],
    )

    const spotlightItems = React.useMemo(() => {
        if (!allEntries.length) return []

        const seen = new Set<number>()
        const uniqueEntries = allEntries.filter(entry => {
            if (!entry || !entry.media) return false
            const resolvedId = entry.mediaId || entry.media.tmdbId || entry.media.id
            if (!resolvedId || seen.has(resolvedId)) return false
            seen.add(resolvedId)
            return true
        })

        return uniqueEntries.map(entry => mapLibraryEntryToMediaCard(entry, (id) => handleNavigateRef.current(id)))
    }, [allEntries])

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
 * Mirrors the MediaSpotlight layout: artwork card + info column + era selector, then the movie poster grid.
 */
function HomeSkeleton() {
    return (
        <div className="min-h-[100dvh] bg-surface pt-4 pb-16 overflow-hidden animate-pulse px-4 sm:px-6 md:px-8 xl:px-10 max-w-[1800px] mx-auto space-y-6">
            {/* Top Horizontal Era Bar Skeleton */}
            <div className="flex items-center justify-between gap-3 bg-zinc-950/75 border border-white/10 rounded-2xl p-2.5">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-10 w-28 sm:w-36 bg-surface-container rounded-xl shrink-0" />
                    ))}
                </div>
                <Skeleton className="h-9 w-24 bg-surface-container rounded-xl shrink-0" />
            </div>

            {/* Full-width Hero Banner Skeleton */}
            <Skeleton className="w-full aspect-[16/9] max-h-[520px] rounded-3xl bg-surface-container border border-white/10" />

            {/* Catalog Grid Skeleton */}
            <div className="space-y-4 pt-2">
                <Skeleton className="h-6 w-64 bg-surface-container rounded" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="w-full aspect-[2/3] bg-surface-container rounded-2xl" />
                    ))}
                </div>
            </div>
        </div>
    )
}
