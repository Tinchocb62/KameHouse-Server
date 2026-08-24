import React from "react"
import { EpisodeBadge } from "@/components/ui/episode-badge"
import { Icons } from "@/components/ui/icons"
import type { PremiumEpisode } from "@/api/types/series.types"
import { cn } from "@/components/ui/core/styling"
import { useHoverPreload } from "@/hooks/use-hover-preload"
import { useThemeSettings } from "@/lib/theme/theme-hooks"
import { useVirtualizer } from "@tanstack/react-virtual"
import { DeferredImage } from "@/components/shared/deferred-image"

// Alto del `pb-4` de cada fila, que estimateSize tiene que contar junto con la tarjeta.
const ROW_GAP_PX = 16

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
    if (!el) return null
    // Fast path: find scrollable container without reading scrollHeight/clientHeight to prevent forced layout reflow
    const closest = el.closest<HTMLElement>(".overflow-y-auto, .overflow-auto")
    if (closest) return closest
    return document.documentElement
}



interface PremiumEpisodeListProps {
  episodes: PremiumEpisode[]
  activeSagaId?: string
  activeSubSagaStart?: number
  activeSubSagaEnd?: number
  scrollToEp?: number
  onPlay?: (episodeNumber: number) => void
  onCast?: (episodeNumber: number) => void
  onPreload?: (filePath: string) => void
}

export const PremiumEpisodeList = React.memo(function PremiumEpisodeList({
  episodes,
  activeSagaId,
  activeSubSagaStart,
  activeSubSagaEnd,
  scrollToEp,
  onPlay,
  onCast,
  onPreload
}: PremiumEpisodeListProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<"all" | "canon" | "filler" | "unwatched">("all")
  const ts = useThemeSettings()

  const { onMouseEnter, onMouseLeave } = useHoverPreload({
    delay: 300,
    onPreload: (epId) => {
      const ep = episodes.find(e => e.id === epId)
      if (ep?.localFilePath && onPreload) onPreload(ep.localFilePath)
    },
  })

  const filteredEpisodes = React.useMemo(() => {
    let result = episodes
    if (typeFilter === "canon") result = result.filter(ep => ep.episodeType !== "Filler")
    if (typeFilter === "filler") result = result.filter(ep => ep.episodeType === "Filler")
    if (typeFilter === "unwatched") result = result.filter(ep => !ep.isWatched)

    if (!searchQuery.trim()) return result
    const query = searchQuery.toLowerCase().trim()
    return result.filter(ep => {
      const matchesNumber = ep.number.toString().includes(query)
      const matchesTitle = ep.title.toLowerCase().includes(query)
      return matchesNumber || matchesTitle
    })
  }, [episodes, searchQuery, typeFilter])

  return (
    <div className="flex flex-col gap-4 mt-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Icons.navigation.search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Buscar episodio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-10 pr-10 py-2.5 rounded-full text-sm",
              "bg-white/[0.05] border border-white/10 backdrop-blur-[var(--blur-overlay-sm)] text-on-surface placeholder-on-surface-variant/60",
              "focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent/30",
              "transition-all duration-base ease-smooth-out"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <Icons.ui.close className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <div className="flex bg-white/[0.05] border border-white/10 rounded-full p-1 backdrop-blur-[var(--blur-overlay-sm)] overflow-x-auto hide-scrollbar shrink-0">
          {[
            { id: "all" as const, label: "Todos" },
            { id: "canon" as const, label: "Canon" },
            { id: "filler" as const, label: "Relleno" },
            { id: "unwatched" as const, label: "No vistos" }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap",
                typeFilter === f.id
                  ? "bg-brand-accent/20 text-brand-accent-light"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-white/[0.05]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {searchQuery && (
        <div className="text-label-sm text-on-surface-variant px-1">
          {filteredEpisodes.length} de {episodes.length} episodios
        </div>
      )}

      {/* Episode List */}
      {filteredEpisodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
          <Icons.navigation.search className="w-8 h-8 mb-3 opacity-50" />
          <p className="text-sm font-medium">No se encontraron episodios</p>
          <p className="text-xs text-on-surface-variant/70 mt-1">Intenta con otro término de búsqueda</p>
        </div>
      ) : (
        <EpisodeVirtualList
            filteredEpisodes={filteredEpisodes}
            activeSagaId={activeSagaId}
            activeSubSagaStart={activeSubSagaStart}
            activeSubSagaEnd={activeSubSagaEnd}
            scrollToEp={scrollToEp}
            searchActive={!!searchQuery.trim()}
            ts={ts}
            onPlay={onPlay}
            _onCast={onCast}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        />
      )}
    </div>
  )
}
)

PremiumEpisodeList.displayName = "PremiumEpisodeList"

function EpisodeVirtualList({
    filteredEpisodes, activeSagaId, activeSubSagaStart, activeSubSagaEnd, scrollToEp, searchActive, ts, onPlay, _onCast, onMouseEnter, onMouseLeave
}: {
    filteredEpisodes: PremiumEpisode[]
    activeSagaId?: string
    activeSubSagaStart?: number
    activeSubSagaEnd?: number
    scrollToEp?: number
    searchActive: boolean
    ts: ReturnType<typeof useThemeSettings>
    onPlay?: (episodeNumber: number) => void
    _onCast?: (episodeNumber: number) => void
    onMouseEnter: (id: string) => void
    onMouseLeave: (id: string) => void
}) {
    const listRef = React.useRef<HTMLDivElement>(null)
    const scrollerRef = React.useRef<HTMLElement | null>(null)
    const [scrollMargin, setScrollMargin] = React.useState(() => {
        if (typeof window === "undefined") return 0
        return window.innerWidth < 768 ? 550 : 700
    })

    const getScrollElement = React.useCallback(() => {
        if (!scrollerRef.current && listRef.current) {
            scrollerRef.current = findScrollParent(listRef.current)
        }
        return scrollerRef.current
    }, [])

    React.useLayoutEffect(() => {
        const el = listRef.current
        if (!el) return

        const scroller = findScrollParent(el)
        scrollerRef.current = scroller

        // Distancia entre el tope de la lista y el tope del contenido scrolleable (sin forzar reflow).
        const updateOffset = () => {
            if (!listRef.current) return
            let top = 0
            let node: HTMLElement | null = listRef.current
            const targetScroller = scrollerRef.current
            while (node && node !== targetScroller && node !== document.body) {
                top += node.offsetTop
                node = node.offsetParent as HTMLElement | null
            }
            if (top > 0) {
                setScrollMargin(prev => (Math.abs(prev - top) <= 1 ? prev : top))
            }
        }
        updateOffset()

        window.addEventListener("resize", updateOffset, { passive: true })
        return () => {
            window.removeEventListener("resize", updateOffset)
        }
    }, [activeSagaId])

    const virtualizer = useVirtualizer({
        count: filteredEpisodes.length,
        getScrollElement,
        estimateSize: () => {
            if (ts.themeUseLegacyEpisodeCard) return 96 + ROW_GAP_PX
            if (typeof window !== "undefined") {
                if (window.innerWidth < 640) return 90 + ROW_GAP_PX
                if (window.innerWidth < 768) return 134 + ROW_GAP_PX
                return 164 + ROW_GAP_PX
            }
            return 164 + ROW_GAP_PX
        },
        initialRect: {
            width: typeof window !== "undefined" ? window.innerWidth : 1280,
            height: typeof window !== "undefined" ? window.innerHeight : 800,
        },
        overscan: 2,
        scrollMargin,
        useFlushSync: false,
    })

    // Al cambiar de saga o sub-saga, scrollear al primer episodio correspondiente.
    // No se puede usar getElementById + scrollIntoView porque la lista está
    // virtualizada (el episodio destino puede no estar montado) y scrollea dentro de
    // un contenedor propio, no la ventana. El virtualizer.scrollToIndex maneja ambas
    // cosas (conta scrollMargin y monta la fila destino). Se saltea el primer render
    // (mount inicial) para no robar el scroll del hero al abrir la serie, y se ignora
    // mientras hay una búsqueda activa.
    const didMountRef = React.useRef(false)
    React.useEffect(() => {
        const scroller = scrollerRef.current || (listRef.current ? findScrollParent(listRef.current) : null)
        if (!scroller) return
        if (!didMountRef.current) {
            didMountRef.current = true
            return
        }
        if (searchActive) return
        
        let targetIndex = -1
        if (scrollToEp != null) {
            const idx = filteredEpisodes.findIndex((e: PremiumEpisode) => e.number === scrollToEp)
            if (idx >= 0) targetIndex = idx
        } else if (activeSubSagaStart != null) {
            const idx = filteredEpisodes.findIndex((e: PremiumEpisode) => e.number === activeSubSagaStart)
            if (idx >= 0) targetIndex = idx
        }

        if (targetIndex >= 0) {
            // rAF: dejar que el layoutEffect actualice scrollMargin (la altura del header)
            const raf = requestAnimationFrame(() => virtualizer.scrollToIndex(targetIndex, { align: "start" }))
            return () => cancelAnimationFrame(raf)
        }
    }, [activeSagaId, activeSubSagaStart, scrollToEp, virtualizer, filteredEpisodes, searchActive])

    return (
        <div ref={listRef} className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
                const ep = filteredEpisodes[virtualRow.index]
                const isHighlighted = activeSubSagaStart != null &&
                                    activeSubSagaEnd != null &&
                                    ep.number >= activeSubSagaStart &&
                                    ep.number <= activeSubSagaEnd;

                return (
                    <div
                        key={ep.id}
                        className="absolute top-0 left-0 w-full pb-4"
                        style={{
                            transform: `translate3d(0, ${virtualRow.start - (virtualizer.options.scrollMargin || 0)}px, 0)`,
                            contain: "layout style paint",
                        }}
                    >
                    <div className="h-full">
                        <div
                            id={`episode-${ep.number}`}
                            role="button"
                            tabIndex={0}
                            aria-label={`Episodio ${ep.number}, ${ep.title}${ep.isWatched ? ", visto" : ""}`}
                            onClick={() => onPlay?.(ep.number)}
                            onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                onPlay?.(ep.number)
                            }
                            }}
                            onMouseEnter={() => onMouseEnter(ep.id)}
                            onMouseLeave={() => onMouseLeave(ep.id)}
                            className={cn(
                            "h-full group flex gap-2.5 sm:gap-4 rounded-xl cursor-pointer transition-[background-color,border-color,transform,box-shadow] duration-base ease-smooth-out active:scale-[0.98]",
                            ts.themeUseLegacyEpisodeCard ? "p-2 items-center" : "p-2.5 sm:p-3",
                            "border border-white/[0.06]",
                            !ts.themeUseLegacyEpisodeCard && "shadow-card hover:shadow-elevated hover:-translate-y-0.5",
                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent/70",
                            isHighlighted
                                ? "bg-brand-accent/[0.08] border-l-[3px] border-l-brand-accent"
                                : "bg-surface-container-low hover:bg-surface-container",
                            )}
                        >
                            {/* Left Thumbnail (Desktop) / Minimalist Icon (Mobile) */}
                            <div className="relative aspect-[16/10] w-28 sm:w-44 md:w-56 shrink-0 rounded-lg overflow-hidden bg-surface-container-highest flex items-center justify-center">
                                {ep.thumbnailUrl ? (
                                    <DeferredImage
                                        src={ep.thumbnailUrl}
                                        alt={ep.title}
                                        priority={true}
                                        className="w-full h-full"
                                        imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow ease-smooth-out"
                                        showSkeleton={true}
                                        fallback={
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-highest text-on-surface-variant/40">
                                                <Icons.status.imageOff className="w-6 h-6 mb-1 opacity-50" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">EP {ep.number}</span>
                                            </div>
                                        }
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-highest text-on-surface-variant/40">
                                        <Icons.status.imageOff className="w-6 h-6 mb-1 opacity-50" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">EP {ep.number}</span>
                                    </div>
                                )}

                                {/* Play Overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-base flex items-center justify-center backdrop-blur-xs pointer-events-none">
                                    <div className="w-10 h-10 rounded-full bg-brand-accent text-on-accent flex items-center justify-center shadow-lg transform group-hover:scale-110 active:scale-95 transition-transform">
                                        <Icons.media.play className="w-5 h-5 ml-0.5 fill-current" />
                                    </div>
                                </div>
                            </div>

                            {/* Episode Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-label-sm font-black text-brand-accent tracking-wider uppercase">
                                        EP {ep.number}
                                    </span>
                                    <span className="text-on-surface-variant text-xs">•</span>
                                    <span className="text-xs text-on-surface-variant font-medium">
                                        {ep.duration ? `${ep.duration} min` : "24 min"}
                                    </span>

                                    {/* Type Badge */}
                                    {ep.episodeType === 'Filler' && (
                                    <EpisodeBadge variant="filler">Relleno</EpisodeBadge>
                                    )}
                                    {ep.episodeType === 'Hyped' && (
                                    <EpisodeBadge variant="premium" className="shadow-brand-secondary">Premium</EpisodeBadge>
                                    )}

                                    {ep.resolution && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/[0.06] text-on-surface-variant border border-white/5 uppercase">
                                            {ep.resolution}
                                        </span>
                                    )}
                                    {ep.videoCodec && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/[0.04] text-on-surface-variant/80 border border-white/5 uppercase">
                                            {ep.videoCodec}
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-sm sm:text-base text-on-surface group-hover:text-brand-accent transition-colors truncate">
                                    {ep.title}
                                </h3>

                                {!ts.themeUseLegacyEpisodeCard && !ts.themeHideEpisodeCardDescription && (
                                <p className="text-sm text-on-surface-variant line-clamp-2 mb-2 leading-relaxed">
                                    {ep.description}
                                </p>
                                )}

                                {!ts.themeHideDownloadedEpisodeCardFilename && ep.localFilePath && (
                                <p className="text-label-sm font-mono text-on-surface-variant/50 truncate mb-1">
                                    {ep.localFilePath.split(/[\\/]/).pop()}
                                </p>
                                )}
                            </div>
                        </div>
                    </div>
                    </div>
                )
            })}
        </div>
    )
}
