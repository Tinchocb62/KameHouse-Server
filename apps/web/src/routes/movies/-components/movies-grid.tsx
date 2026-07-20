import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { useVirtualizer } from "@tanstack/react-virtual"
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

const CARD_WIDTH = 180
const CARD_GAP = 24

/**
 * Columns for a given container width. Two posters is the floor: on a ~384px
 * phone three columns leave ~104px posters, and anything narrower is unreadable.
 */
function columnsForWidth(width: number): number {
    if (width < 480) return 2
    if (width < 768) return 3
    return Math.max(1, Math.floor((width + CARD_GAP) / (CARD_WIDTH + CARD_GAP)))
}

export function MoviesGrid({
    filteredSorted,
    isLoading,
    allMoviesLength,
    watchHistory,
    handleMovieClick,
    handleHoverCard,
}: MoviesGridProps) {
    const gridRef = useRef<HTMLDivElement | null>(null)
    const observerRef = useRef<ResizeObserver | null>(null)

    // Seeded from the viewport rather than a fixed desktop guess: the old
    // useState(5) rendered five hairline columns on a phone until a ResizeObserver
    // callback corrected it, so the first paint was wrong on every mobile load —
    // and stayed wrong wherever that callback didn't land.
    const initialWidth = typeof window === "undefined" ? 1200 : window.innerWidth
    const [columns, setColumns] = useState(() => columnsForWidth(initialWidth))
    const [gridWidth, setGridWidth] = useState(initialWidth)
    const [scrollMargin, setScrollMargin] = useState(500)
    // La página scrollea dentro del div raíz de /movies (overflow-x-hidden fuerza
    // overflow-y:auto), no en window: el virtualizador debe escuchar a ese elemento.
    const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null)

    // Callback ref, not a mount effect: the grid mounts only once data arrives
    // (the skeleton renders first), so an effect with [] deps would find a null
    // ref, bail, and never re-run.
    const attachGrid = useCallback((node: HTMLDivElement | null) => {
        observerRef.current?.disconnect()
        gridRef.current = node
        if (!node) {
            observerRef.current = null
            return
        }

        let scroller: HTMLElement | null = node.parentElement
        while (scroller) {
            const { overflowY } = getComputedStyle(scroller)
            if (overflowY === "auto" || overflowY === "scroll") break
            scroller = scroller.parentElement
        }
        setScrollEl(scroller)

        const measure = (width: number) => {
            setGridWidth(width)
            setColumns(columnsForWidth(width))
            setScrollMargin(
                scroller
                    ? node.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
                    : node.offsetTop,
            )
        }

        measure(node.getBoundingClientRect().width)

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) measure(entry.contentRect.width)
        })
        observer.observe(node)
        observerRef.current = observer
    }, [])

    useEffect(() => () => observerRef.current?.disconnect(), [])

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

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollEl,
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
                    ref={attachGrid}
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
