import { useState, useRef, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import type { Anime_LibraryCollectionEntry, Continuity_WatchHistory } from "@/api/generated/types"
import { EmptyState } from "@/components/shared/empty-state"
import { MovieCard, EraTab } from "../-MovieCard"
import { PosterGridSkeleton } from "@/components/ui/shimmer-skeleton"

interface MoviesGridProps {
    filteredSorted: (Anime_LibraryCollectionEntry & { era: EraTab; startedAtTimestamp: number })[]
    isLoading: boolean
    allMoviesLength: number
    watchHistory: Continuity_WatchHistory | undefined
    handleMovieClick: (mediaId: number) => void
    handleHoverCard: (entry: (Anime_LibraryCollectionEntry & { era: EraTab; startedAtTimestamp: number }) | null) => void
}

export function MoviesGrid({
    filteredSorted,
    isLoading,
    allMoviesLength,
    watchHistory,
    handleMovieClick,
    handleHoverCard,
}: MoviesGridProps) {
    // Responsive grid columns measuring
    const gridRef = useRef<HTMLDivElement>(null)
    const [columns, setColumns] = useState(5)
    const [gridWidth, setGridWidth] = useState(1200)
    const [scrollMargin, setScrollMargin] = useState(500)

    useEffect(() => {
        if (!gridRef.current) return
        setScrollMargin(gridRef.current.offsetTop)
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width
                setGridWidth(width)
                if (width < 768) {
                    setColumns(3)
                } else {
                    const colCount = Math.floor((width + 24) / (180 + 24))
                    setColumns(Math.max(1, colCount))
                }
            }
            if (gridRef.current) {
                setScrollMargin(gridRef.current.offsetTop)
            }
        })
        observer.observe(gridRef.current)
        return () => observer.disconnect()
    }, [])

    const rows = useMemo(() => {
        const r = []
        for (let i = 0; i < filteredSorted.length; i += columns) {
            r.push(filteredSorted.slice(i, i + columns))
        }
        return r
    }, [filteredSorted, columns])

    const rowHeight = useMemo(() => {
        const gapSize = gridWidth < 768 ? 12 : 24
        const cardWidth = Math.max(80, (gridWidth - (columns - 1) * gapSize) / columns)
        const posterHeight = cardWidth * 1.5
        return Math.ceil(posterHeight + 64 + 40)
    }, [gridWidth, columns])

    const virtualizer = useWindowVirtualizer({
        count: rows.length,
        estimateSize: () => rowHeight,
        overscan: 2,
        scrollMargin: scrollMargin,
    })

    return (
        <div className="w-full relative pb-32 max-w-content mx-auto">
            {isLoading && allMoviesLength === 0 ? (
                <PosterGridSkeleton count={18} />
            ) : filteredSorted.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32">
                    <EmptyState
                        title="Sin películas"
                        message="No hay películas que coincidan con este filtro."
                    />
                </motion.div>
            ) : (
                <div
                    ref={gridRef}
                    className="relative w-full"
                    style={{ height: `${virtualizer.getTotalSize()}px` }}
                >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const rowItems = rows[virtualRow.index]
                        if (!rowItems) return null
                        return (
                            <div
                                key={virtualRow.index}
                                className="absolute left-0 top-0 w-full grid gap-x-3 md:gap-x-6 pb-10"
                                style={{
                                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                                }}
                            >
                                {rowItems.map((entry) => (
                                    <motion.div
                                        key={entry.mediaId}
                                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.94, y: 12 }}
                                        transition={{ type: "spring", stiffness: 100, damping: 15 }}
                                    >
                                        <MovieCard
                                            entry={entry}
                                            era={entry.era}
                                            watchHistoryItem={watchHistory?.[entry.mediaId!]}
                                            onClick={handleMovieClick}
                                            onHoverCard={handleHoverCard}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
