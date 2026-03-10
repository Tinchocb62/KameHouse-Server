"use client"

import React, { useRef, useState, useEffect } from "react"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { MediaCard } from "@/components/ui/media-card"
import { Anime_LibraryCollectionEntry, Models_LibraryMedia } from "@/api/generated/types"

function getTitle(media: Models_LibraryMedia | null | undefined): string {
    return media?.titleEnglish || media?.titleRomaji || media?.titleOriginal || "Desconocido"
}

interface VirtualizedMediaGridProps {
    entries: Anime_LibraryCollectionEntry[]
    emptyMessage: string
}

// Memoized MediaCard wrapper for strict 60fps performance 
const MemoizedCard = React.memo(({ entry }: { entry: Anime_LibraryCollectionEntry }) => {
    const media = entry?.media
    if (!media) return null

    let progress = 0
    if (entry.listData?.progress && media.totalEpisodes && media.totalEpisodes > 0) {
        progress = (entry.listData.progress / media.totalEpisodes) * 100
    }

    return (
        <div className="w-full flex justify-center px-2 md:px-3">
            <MediaCard
                title={getTitle(media)}
                artwork={media.posterImage || media.bannerImage || "https://placehold.co/220x330/1A1A1A/FFFFFF?text=Sin+Poster"}
                badge={media.format || undefined}
                aspect="poster"
                progress={progress > 0 ? progress : undefined}
                className="w-full max-w-[220px]"
                onClick={() => window.location.href = `/series/${media.id}`}
            />
        </div>
    )
})
MemoizedCard.displayName = "MemoizedCard"

export function VirtualizedMediaGrid({ entries, emptyMessage }: VirtualizedMediaGridProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [columns, setColumns] = useState(1)

    // Calculate columns dynamically based on container width
    useEffect(() => {
        if (!containerRef.current) return

        const observer = new ResizeObserver((entriesObserver) => {
            const width = entriesObserver[0]?.contentRect.width || 0
            // md breakpoint roughly: minmax(220px, 1fr). + gaps.
            const newCols = Math.max(1, Math.floor(width / (width < 768 ? 160 : 250)))
            if (newCols !== columns) setColumns(newCols)
        })

        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [columns])

    if (!entries || entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
                <span className="text-5xl mb-4 opacity-50">📭</span>
                <h3 className="text-xl font-bold text-zinc-300">{emptyMessage}</h3>
            </div>
        )
    }

    const rowCount = Math.ceil(entries.length / columns)

    // Using Window virtualizer since AppLayoutContent handles the scrolling of the body
    const virtualizer = useWindowVirtualizer({
        count: rowCount,
        estimateSize: () => (window.innerWidth < 768 ? 260 : 360), // Fixed height estimations
        overscan: 4,
    })

    return (
        <div ref={containerRef} className="w-full pt-6 pb-12">
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                }}
            >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    return (
                        <div
                            key={virtualRow.key}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className="flex justify-start"
                        >
                            {/* Render items in this row */}
                            {Array.from({ length: columns }).map((_, colIndex) => {
                                const index = virtualRow.index * columns + colIndex
                                const entry = entries[index]
                                
                                if (!entry) return <div key={colIndex} style={{ width: `${100 / columns}%` }} />

                                return (
                                    <div key={entry.media?.id || index} style={{ width: `${100 / columns}%` }}>
                                        <MemoizedCard entry={entry} />
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
