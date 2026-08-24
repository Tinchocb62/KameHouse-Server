import * as React from "react"
import { useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { useAppStore } from "@/lib/store"
import type { Anime_Entry } from "@/api/generated/types"
import { Icons } from "@/components/ui/icons"
import { getHighResImage, getMediumResImage } from "@/lib/helpers/images"
import { MediaHero, MEDIA_HERO_TITLE_CLASS } from "@/components/ui/media-hero"
import { PlayCta } from "@/components/ui/play-cta"
import { GlassIconButton } from "@/components/ui/glass-icon-button"
import { cn } from "@/components/ui/core/styling"

interface SeriesHeroProps {
  entry: Anime_Entry | undefined
  backdropUrl: string
  onPlay?: () => void
  /** Fired on hover/focus intent so the backend can warm the media container ahead of the click. */
  onPlayHover?: () => void
  sagaCount?: number
  /** Cuando hay progreso de continuidad el CTA cambia a "Reanudar". */
  hasProgress?: boolean
  resumeEpisodeNumber?: number
  resumeEpisodeTitle?: string
  /** Panel de selección de sagas/eras — se renderiza como overlay glassmorphic en desktop. */
  sagaPanel?: React.ReactNode
  /** Callback para abrir la vista de detalles */
  onDetails?: () => void
}

// ── Metadata chip ─────────────────────────────────────────────────────────────

function MetaChip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-white/[0.07] border border-white/10 text-[11px] font-mono font-bold uppercase tracking-ultra text-on-surface-variant whitespace-nowrap select-none">
      {icon}
      {children}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export const SeriesHero = React.memo(function SeriesHero({
  entry,
  backdropUrl,
  onPlay,
  onPlayHover,
  sagaCount,
  hasProgress,
  resumeEpisodeNumber,
  resumeEpisodeTitle,
  sagaPanel,
  onDetails,
}: SeriesHeroProps) {
  const media = entry?.media
  const title = media?.titleSpanish || media?.titleRomaji || media?.titleEnglish || "Título Desconocido"
  const romajiTitle = media?.titleRomaji
  const rating = media?.score ? media.score / 10 : undefined
  const year = media?.year
  const ageRating = media?.isNsfw ? "18+" : undefined
  const synopsis = media?.description ? media.description.replace(/<[^>]*>/g, "") : ""
  const hasBannerImage = !!media?.bannerImage
  const posterUrl = getHighResImage(media?.posterImage || "")
  const totalEpisodes = entry?.localFiles?.length ?? undefined

  const addToQueue = useAppStore(state => state.addToQueue)

  const castList = useMemo(() => {
    if (!media?.characters?.edges) return []
    return media.characters.edges
      .map((edge: { node?: { name?: { full?: string; userPreferred?: string } } }) => edge.node?.name?.full || edge.node?.name?.userPreferred)
      .filter(Boolean)
      .slice(0, 5)
  }, [media])

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (entry?.localFiles && entry.localFiles.length > 0) {
      const localFile = entry.localFiles[0]
      const epNum = localFile.parsedInfo?.episode || localFile.metadata?.episode || 1

      addToQueue({
        id: entry.mediaId!,
        title: title,
        playableUrl: localFile.path || "",
        thumbnail: getMediumResImage(media?.posterImage || ""),
        mediaId: entry.mediaId!,
        episodeNumber: Number(epNum),
        malId: media?.idMal ?? null,
        mediaFormat: media?.format ?? "TV"
      })
      toast.success("Añadido a la cola de reproducción")
    } else {
      toast.error("No hay archivos locales disponibles para reproducir.")
    }
  }

  // ── Title node ──────────────────────────────────────────────────────────────

  const titleNode = (
    <div className="space-y-2">
      {romajiTitle && (
        <div className="flex items-center gap-3">
          {/* Línea decorativa era-accent */}
          <span className="block w-6 h-px shrink-0 bg-brand-accent opacity-80" />
          <h2
            className="font-bold uppercase tracking-cinema text-xs md:text-[11px] animate-ki-shimmer bg-clip-text text-transparent select-none"
            style={{ backgroundImage: "linear-gradient(to right, var(--era-shimmer-1), var(--era-shimmer-2), var(--era-shimmer-3))" }}
          >
            {romajiTitle}
          </h2>
        </div>
      )}
      <h1
        onClick={onPlay}
        className={cn(MEDIA_HERO_TITLE_CLASS, "cursor-pointer hover:text-brand-secondary transition-colors duration-slow")}
        style={{ fontSize: "max(2.5rem, min(5.5vw, 4.5rem))" }}
      >
        {title}
      </h1>
    </div>
  )

  // ── Metadata row — chips pill ───────────────────────────────────────────────

  const metadataRow = (
    <div className="flex flex-wrap items-center gap-2">
      <MetaChip icon={<Icons.navigation.tv size={10} strokeWidth={2.5} className="opacity-70" />}>
        Serie TV
      </MetaChip>

      {year && <MetaChip>{year}</MetaChip>}

      {totalEpisodes && (
        <MetaChip>{totalEpisodes} Episodios</MetaChip>
      )}

      {sagaCount !== undefined && sagaCount > 0 && (
        <MetaChip>{sagaCount} {sagaCount === 1 ? "Saga" : "Sagas"}</MetaChip>
      )}

      {ageRating && <MetaChip>{ageRating}</MetaChip>}

      {/* Rating — chip independiente con color brand */}
      {rating && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-brand-accent/10 border border-brand-accent/25 text-[11px] font-mono font-bold tracking-ultra text-brand-accent whitespace-nowrap select-none">
          <Icons.ui.star size={10} fill="currentColor" className="stroke-none" />
          {rating.toFixed(1)} Ki
        </span>
      )}
    </div>
  )

  // ── Action buttons ──────────────────────────────────────────────────────────

  const actionButtons = (
    <>
      <PlayCta
        onClick={onPlay || (() => {})}
        onHoverIntent={onPlayHover}
        title={hasProgress && resumeEpisodeTitle ? resumeEpisodeTitle : undefined}
        label={hasProgress ? "Reanudar" : "Reproducir"}
        sublabel={hasProgress
          ? (resumeEpisodeNumber != null ? `Continuar · Ep ${resumeEpisodeNumber}` : "Continuar viendo")
          : "Comenzar episodio"}
        className="w-full md:w-auto"
      />

      {/* Botón Detalles — glass secundario */}
      {onDetails && (
        <motion.button
          onClick={onDetails}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2.5 px-5 py-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 text-on-surface font-bold text-sm uppercase tracking-widest transition-colors duration-base backdrop-blur-[var(--blur-overlay-sm)] shrink-0 select-none"
        >
          <Icons.ui.info className="w-4 h-4 opacity-70" />
          Detalles
        </motion.button>
      )}

      {entry?.localFiles && entry.localFiles.length > 0 && (
        <GlassIconButton
          onClick={handleAddToQueue}
          icon={<Icons.ui.listPlus className="w-5 h-5" />}
          title="Añadir a la cola"
        />
      )}
    </>
  )

  // ── Poster con glow ambiental ───────────────────────────────────────────────

  const posterNode = (
    <motion.div
      className="media-hero-animate shrink-0 aspect-[2/3] rounded-container overflow-hidden bg-surface-container pointer-events-auto"
      style={{
        width: "clamp(140px, 14vw, 240px)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.10), 0 8px 32px -8px rgba(0,0,0,0.8)",
        filter: "drop-shadow(0 0 28px hsl(var(--brand-accent) / 0.35))",
      }}
      whileHover={{ scale: 1.03, rotateY: 3 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {posterUrl && (
        <img
          src={posterUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="eager"
        />
      )}
    </motion.div>
  )

  const footerText = castList.length > 0 ? castList.join(", ") : undefined

  return (
    <MediaHero
      backdropUrl={backdropUrl}
      posterUrl={posterUrl}
      hasBannerImage={hasBannerImage}
      showPosterColumn={false}
      title={
        <div className="flex items-end gap-6 md:gap-10 lg:gap-14 w-full">
          {/* Poster con glow — inline en el content area para coexistir con sidePanel */}
          {posterUrl && posterNode}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {metadataRow}
            {titleNode}
            {synopsis && (
              <p className="media-hero-animate text-on-surface-variant text-sm md:text-base leading-relaxed line-clamp-2 drop-shadow-md font-medium max-w-xl border-l-2 border-brand-accent/30 pl-4 py-0.5">
                {synopsis}
              </p>
            )}
            {footerText && (
              <p className="media-hero-animate text-on-surface-variant text-xs font-semibold tracking-wide drop-shadow-sm">
                {footerText}
              </p>
            )}
            <div className="media-hero-animate flex flex-wrap items-center gap-3 pt-1">
              {actionButtons}
            </div>
          </div>
        </div>
      }
      sidePanel={sagaPanel}
      onBackdropClick={onPlay}
      className="py-8 md:py-10"
    />
  )
})
