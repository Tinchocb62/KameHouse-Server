import React from "react"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { Icons } from "@/components/ui/icons"
import type { PremiumEpisode } from "@/api/types/series.types"
import { cn } from "@/components/ui/core/styling"
import { useHoverPreload } from "@/hooks/use-hover-preload"
import { useThemeSettings } from "@/lib/theme/theme-hooks"

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.2, 1, 0.2, 1] } },
}

interface PremiumEpisodeListProps {
  episodes: PremiumEpisode[]
  activeSubSagaStart?: number
  activeSubSagaEnd?: number
  onPlay?: (episodeNumber: number) => void
  onPreload?: (filePath: string) => void
}

export function PremiumEpisodeList({
  episodes,
  activeSubSagaStart,
  activeSubSagaEnd,
  onPlay,
  onPreload
}: PremiumEpisodeListProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const ts = useThemeSettings()

  const { onMouseEnter, onMouseLeave } = useHoverPreload({
    delay: 300,
    onPreload: (epId) => {
      const ep = episodes.find(e => e.id === epId)
      if (ep?.localFilePath && onPreload) onPreload(ep.localFilePath)
    },
  })

  const filteredEpisodes = React.useMemo(() => {
    if (!searchQuery.trim()) return episodes
    const query = searchQuery.toLowerCase().trim()
    return episodes.filter(ep => {
      const matchesNumber = ep.number.toString().includes(query)
      const matchesTitle = ep.title.toLowerCase().includes(query)
      return matchesNumber || matchesTitle
    })
  }, [episodes, searchQuery])

  return (
    <div className="flex flex-col gap-4 mt-6">
      {/* Search Input */}
      <div className="relative">
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
        <motion.div
          key={episodes[0]?.id ?? "episode-list"}
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-4"
        >
        <AnimatePresence initial={false}>
        {filteredEpisodes.map((ep) => {
        const isHighlighted = activeSubSagaStart != null &&
                            activeSubSagaEnd != null &&
                            ep.number >= activeSubSagaStart &&
                            ep.number <= activeSubSagaEnd;
        return (
          <motion.div
            key={ep.id}
            layout
            variants={itemVariants}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
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
              "group flex gap-4 rounded-2xl cursor-pointer transition-all duration-base ease-smooth-out active:scale-[0.98]",
              ts.themeUseLegacyEpisodeCard ? "p-2 items-center" : "p-3",
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
            ts.themeUseLegacyEpisodeCard ? "w-28" : "w-48 md:w-56 shadow-card"
          )}>
            <img
              src={ep.thumbnailUrl}
              alt={ep.title}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-slow ease-smooth-out"
            />
            {/* Play Overlay */}
            {!ts.themeUseLegacyEpisodeCard && (
              <div className="absolute inset-0 bg-scrim/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-base cursor-pointer">
                <div className="w-12 h-12 rounded-full glass-liquid flex items-center justify-center">
                  <Icons.media.play className="w-6 h-6 text-white ml-1" fill="currentColor" />
                </div>
              </div>
            )}

            {/* Progress/Watched Indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-container-high">
              {ep.isWatched && <div className="h-full bg-brand-success w-full" />}
            </div>
          </div>

            {/* Details */}
          <div className="flex flex-col justify-center flex-grow min-w-0 py-0.5">
            <div className="flex justify-between items-start mb-0.5">
              <h4 className="text-sm font-bold text-on-surface truncate">
                <span className="text-on-surface-variant mr-1.5">{ep.number}.</span>
                {ep.title}
              </h4>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Saga Badge */}
                {ep.sagaName && (
                  <span className="inline-flex items-center text-label-sm uppercase bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-3 py-1 rounded-full">
                    {ep.sagaName}
                  </span>
                )}
                {/* Type Badge */}
                {ep.episodeType === 'Filler' && (
                  <span className="inline-flex items-center text-label-sm uppercase bg-brand-destructive/15 text-brand-destructive border border-brand-destructive/25 px-3 py-1 rounded-full">
                    Relleno
                  </span>
                )}
                {ep.episodeType === 'Hyped' && (
                  <span className="inline-flex items-center text-label-sm uppercase bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/25 px-3 py-1 rounded-full shadow-[0_0_8px_hsl(var(--brand-secondary)/0.2)]">
                    Premium
                  </span>
                )}
              </div>
            </div>

            {!ts.themeUseLegacyEpisodeCard && !ts.themeHideEpisodeCardDescription && (
              <p className="text-xs text-on-surface-variant line-clamp-2 mb-2 leading-relaxed">
                {ep.description}
              </p>
            )}

            {!ts.themeHideDownloadedEpisodeCardFilename && ep.localFilePath && (
              <p className="text-[9px] font-mono text-on-surface-variant/50 truncate mb-1">
                {ep.localFilePath.split(/[\\/]/).pop()}
              </p>
            )}

            {/* Technical Pills & Status */}
            {!ts.themeUseLegacyEpisodeCard && (
              <div className="flex items-center justify-between mt-auto">
                {ts.themeShowEpisodeCardAnimeInfo && (
                  <div className="flex items-center gap-1.5">
                    {[ep.resolution, ep.videoCodec, ep.audioCodec].filter(Boolean).map((spec) => (
                      <span key={spec as string} className="text-[10px] font-mono font-medium bg-white/[0.06] border border-white/[0.06] text-on-surface-variant px-2 py-0.5 rounded-md uppercase">
                        {spec}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-outline-variant group-hover:border-outline-variant/70 transition-colors ml-auto">
                  {ep.isWatched && <Icons.ui.check className="w-3.5 h-3.5 text-brand-success" strokeWidth={3} />}
                </div>
              </div>
            )}
          </div>
        </motion.div>
        )
      })}
        </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
