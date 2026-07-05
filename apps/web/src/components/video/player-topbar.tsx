import React from "react"
import { cleanMediaTitle } from "@/lib/helpers/media"
import { Icons } from "@/components/ui/icons"

interface PlayerTopBarProps {
    title?: string
    episodeLabel?: string
    episodeNumber?: number
    mediaFormat?: string | null
    onClose: () => void
}

export function PlayerTopBar({ title, episodeLabel, episodeNumber, mediaFormat, onClose }: PlayerTopBarProps) {
    const isMovie = React.useMemo(() => {
        const formatUpper = mediaFormat?.toUpperCase()
        if (formatUpper === "MOVIE" || formatUpper === "SPECIAL" || formatUpper === "OVA") {
            return true
        }
        const searchText = `${title || ""} ${episodeLabel || ""}`.toLowerCase()
        return searchText.includes("pelicula") || searchText.includes("película")
    }, [mediaFormat, title, episodeLabel])

    const cleanTitle = React.useMemo(() => cleanMediaTitle(title, isMovie), [title, isMovie])
    const cleanLabel = React.useMemo(() => cleanMediaTitle(episodeLabel, isMovie), [episodeLabel, isMovie])

    const displayTitle = React.useMemo(() => {
        if (isMovie) {
            return cleanTitle || cleanLabel || "Reproduciendo"
        }
        return cleanLabel || cleanTitle || "Reproduciendo"
    }, [isMovie, cleanTitle, cleanLabel])

return (
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-6 md:p-8 pointer-events-none z-[100] bg-gradient-to-b from-black/70 to-transparent backdrop-blur-[var(--blur-overlay-lg)]">
            <div className="flex flex-col ml-2 pointer-events-auto select-none [&>*:not(:first-child)]:mt-1">
                <span className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.25em]" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {isMovie ? "Película" : `Episodio ${episodeNumber ?? ""}`}
                </span>
                <h2 className="text-on-surface text-lg md:text-xl font-bold uppercase tracking-wider truncate max-w-[250px] sm:max-w-md md:max-w-xl lg:max-w-3xl">
                    {displayTitle}
                </h2>
            </div>
            <button
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                aria-label="Cerrar reproductor"
                className="flex items-center justify-center w-10 h-10 text-on-surface-variant bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_90%,transparent)] backdrop-blur-[var(--blur-overlay-xl)] hover:text-on-surface hover:bg-surface-container-high border border-outline-variant/50 rounded-full transition-all duration-200 active:scale-[0.95] group shrink-0 pointer-events-auto focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
                <Icons.ui.close className="w-5 h-5 group-hover:rotate-90 group-hover:scale-110 transition-transform duration-300" />
            </button>
        </div>
    )
}