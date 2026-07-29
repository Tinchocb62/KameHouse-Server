import React from "react"
import { motion } from "framer-motion"
import { staggerList, staggerItem } from "@/components/ui/core/motion"
import { EpisodeBadge } from "@/components/ui/episode-badge"
import { Icons } from "@/components/ui/icons"
import type { PremiumEpisode } from "@/api/types/series.types"
import { cn } from "@/components/ui/core/styling"
import { useHoverPreload } from "@/hooks/use-hover-preload"
import { useThemeSettings } from "@/lib/theme/theme-hooks"
import { useVirtualizer } from "@tanstack/react-virtual"

// Alto del `pb-4` de cada fila, que estimateSize tiene que contar junto con la tarjeta.
const ROW_GAP_PX = 16

function findScrollParent(el: HTMLElement): HTMLElement | null {
    let node = el.parentElement
    while (node) {
        const overflowY = getComputedStyle(node).overflowY
        if (overflowY === "auto" || overflowY === "scroll") return node
        node = node.parentElement
    }
    return null
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
            { id: "all", label: "Todos" },
            { id: "canon", label: "Canon" },
            { id: "filler", label: "Relleno" },
            { id: "unwatched", label: "No vistos" }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id as any)}
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
            onCast={onCast}
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
    filteredEpisodes, activeSagaId, activeSubSagaStart, activeSubSagaEnd, scrollToEp, searchActive, ts, onPlay, onCast, onMouseEnter, onMouseLeave
}: {
    filteredEpisodes: PremiumEpisode[]
    activeSagaId?: string
    activeSubSagaStart?: number
    activeSubSagaEnd?: number
    scrollToEp?: number
    searchActive: boolean
    ts: ReturnType<typeof useThemeSettings>
    onPlay?: (episodeNumber: number) => void
    onCast?: (episodeNumber: number) => void
    onMouseEnter: (id: string) => void
    onMouseLeave: (id: string) => void
}) {
    const listRef = React.useRef<HTMLDivElement>(null)
    // El detalle de serie scrollea dentro de su propio contenedor, no con la ventana, así
    // que hay que virtualizar contra ese elemento: window.scrollY nunca cambia.
    const [scrollEl, setScrollEl] = React.useState<HTMLElement | null>(null)
    const [scrollMargin, setScrollMargin] = React.useState(0)

    React.useLayoutEffect(() => {
        const el = listRef.current
        if (!el) return

        const scroller = findScrollParent(el)
        setScrollEl(scroller)

        // Distancia entre el tope de la lista y el tope del contenido scrolleable.
        const updateOffset = () => {
            if (!listRef.current) return
            const listTop = listRef.current.getBoundingClientRect().top
            if (scroller) {
                setScrollMargin(listTop - scroller.getBoundingClientRect().top + scroller.scrollTop)
            } else {
                setScrollMargin(listTop + window.scrollY)
            }
        }
        updateOffset()

        // La altura de lo que está arriba (SagaLoreHeader, carrusel) cambia por saga y al
        // cargar las imágenes.
        const observer = new ResizeObserver(updateOffset)
        observer.observe(scroller ?? document.body)
        return () => observer.disconnect()
    }, [filteredEpisodes.length])

    const virtualizer = useVirtualizer({
        count: filteredEpisodes.length,
        getScrollElement: () => scrollEl,
        estimateSize: () => {
            if (ts.themeUseLegacyEpisodeCard) return 96 + ROW_GAP_PX;
            const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
            return (isSmallScreen ? 110 : 220) + ROW_GAP_PX;
        },
        overscan: 5,
        scrollMargin,
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
        if (!scrollEl) return
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
            // rAF: dejar que el layoutEffect actualice scrollMargin (la altura del header
            // de saga cambia por saga) antes de calcular el offset del scroll.
            const raf = requestAnimationFrame(() => virtualizer.scrollToIndex(targetIndex, { align: "start" }))
            return () => cancelAnimationFrame(raf)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSagaId, activeSubSagaStart, scrollToEp, scrollEl])

    return (
        <motion.div ref={listRef} variants={staggerList} initial="hidden" animate="visible" className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
                const ep = filteredEpisodes[virtualRow.index]
                const isHighlighted = activeSubSagaStart != null &&
                                    activeSubSagaEnd != null &&
                                    ep.number >= activeSubSagaStart &&
                                    ep.number <= activeSubSagaEnd;

                return (
                    // El wrapper posicional tiene que ser un div plano: si fuera motion.div,
                    // framer deja `transform: none` al terminar la animación y pisa el
                    // translateY del virtualizer (todas las filas quedan superpuestas).
                    <div
                        key={ep.id}
                        className="absolute top-0 left-0 w-full pb-4"
                        style={{
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start - (virtualizer.options.scrollMargin || 0)}px)`,
                        }}
                    >
                    <motion.div variants={staggerItem} className="h-full">
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
                            "h-full group flex gap-2.5 sm:gap-4 rounded-xl cursor-pointer transition-all duration-base ease-smooth-out active:scale-[0.98]",
                            ts.themeUseLegacyEpisodeCard ? "p-2 items-center" : "p-2.5 sm:p-3",
                            "border border-white/[0.06]",
                            !ts.themeUseLegacyEpisodeCard && "shadow-card hover:shadow-elevated hover:-translate-y-0.5",
                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent/70",
                            isHighlighted
                                ? "bg-brand-accent/[0.08] border-l-[3px] border-l-brand-accent"
                                : "bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/[0.12]"
                            )}
                        >
                            {/* Thumbnail */}
                            <div className={cn(
                                "relative aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-surface-container",
                                ts.themeUseLegacyEpisodeCard ? "w-24 sm:w-28" : "w-28 sm:w-36 md:w-52 lg:w-64 shadow-card"
                            )}>
                                <img
                                src={ep.thumbnailUrl}
                                alt={ep.title}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-slow ease-smooth-out"
                                />
                                {/* Play Overlay */}
                                {!ts.themeUseLegacyEpisodeCard && (
                                <div className="absolute inset-0 bg-scrim/20 md:bg-scrim/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center transition-opacity duration-base cursor-pointer">
                                    <div className="w-9 h-9 md:w-12 md:h-12 rounded-full glass-liquid flex items-center justify-center">
                                    <Icons.media.play className="w-4 h-4 md:w-6 md:h-6 text-on-surface ml-0.5 md:ml-1" fill="currentColor" />
                                    </div>
                                </div>
                                )}

                                {/* Progress/Watched Indicator */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-container-high">
                                {ep.isWatched && <motion.div variants={staggerItem} className="h-full bg-brand-success w-full" />}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="flex flex-col justify-center flex-grow min-w-0 py-0.5">
                                <div className="flex justify-between items-start mb-0.5">
                                <h4 className="text-base font-bold text-on-surface truncate">
                                    <span className="text-on-surface-variant mr-1.5">{ep.number}.</span>
                                    {ep.title}
                                </h4>

                                <div className="flex items-center gap-1.5 shrink-0">

                                    {/* Enviar a TV */}
                                    {onCast && (
                                    <button
                                        type="button"
                                        title="Enviar a TV"
                                        aria-label={`Enviar episodio ${ep.number} a la TV`}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onCast(ep.number)
                                        }}
                                        className={cn(
                                            "flex items-center justify-center w-7 h-7 rounded-full",
                                            "border border-white/10 bg-white/5 hover:bg-surface-variant text-on-surface-variant hover:text-on-surface",
                                            "transition-all duration-base ease-smooth-out",
                                            "opacity-100 md:opacity-0 md:group-hover:opacity-100",
                                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent/70 focus-visible:opacity-100"
                                        )}
                                    >
                                        <Icons.media.cast className="w-3.5 h-3.5" />
                                    </button>
                                    )}

                                    {/* Type Badge */}
                                    {ep.episodeType === 'Filler' && (
                                    <EpisodeBadge variant="filler">Relleno</EpisodeBadge>
                                    )}
                                    {ep.episodeType === 'Hyped' && (
                                    <EpisodeBadge variant="premium" className="shadow-brand-secondary">Premium</EpisodeBadge>
                                    )}
                                </div>
                                </div>

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

                                {/* Technical Pills & Status */}
                                {!ts.themeUseLegacyEpisodeCard && (
                                <div className="flex items-center justify-end mt-auto">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-outline-variant group-hover:border-outline-variant/70 transition-colors ml-auto">
                                    {ep.isWatched && <Icons.ui.check className="w-3.5 h-3.5 text-brand-success" strokeWidth={3} />}
                                    </div>
                                </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                    </div>
                )
            })}
        </motion.div>
    )
}
