import * as React from "react"
import { useMemo } from "react"
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
}

export function SeriesHero({
  entry,
  backdropUrl,
  onPlay,
  onPlayHover,
  sagaCount,
  hasProgress,
  resumeEpisodeNumber,
  resumeEpisodeTitle,
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

  const addToQueue = useAppStore(state => state.addToQueue)

  const castList = useMemo(() => {
    if (!media?.characters?.edges) return []
    return media.characters.edges
      .map((edge: { node?: { name?: { full?: string; userPreferred?: string } } }) => edge.node?.name?.full || edge.node?.name?.userPreferred)
      .filter(Boolean)
      .slice(0, 5)
  }, [media])

  const genres = useMemo(() => {
    return (media?.genres as string[]) || []
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

  const titleNode = (
    <div className="space-y-2">
      {romajiTitle && (
        <h2 className="font-bold uppercase tracking-widest text-xs md:text-sm animate-ki-shimmer bg-clip-text text-transparent select-none drop-shadow-[0_2px_8px_var(--glow-secondary)]" style={{ backgroundImage: "linear-gradient(to right, var(--era-shimmer-1), var(--era-shimmer-2), var(--era-shimmer-3))" }}>
          {romajiTitle}
        </h2>
      )}
      <h1 onClick={onPlay} className={cn(MEDIA_HERO_TITLE_CLASS, "cursor-pointer hover:text-brand-secondary transition-colors duration-slow")} style={{ fontSize: "max(2.5rem, min(5.5vw, 4.5rem))" }}>
        {title}
      </h1>
    </div>
  )

  const metadataRow = (
    <div className="flex flex-wrap items-center text-on-surface-variant text-xs font-semibold tracking-wide gap-y-1.5">
      {rating && (
        <span className="flex items-center gap-1">
          <Icons.ui.star size={12} fill="currentColor" className="text-brand-secondary stroke-none" />
          {rating.toFixed(1)} Ki
        </span>
      )}
      {year && (
        <>
          {rating && <span className="text-on-surface-variant/50 mx-2 select-none">|</span>}
          <span>{year}</span>
        </>
      )}
      {ageRating && (
        <>
          {(rating || year) && <span className="text-on-surface-variant/50 mx-2 select-none">|</span>}
          <span>{ageRating}</span>
        </>
      )}
      {sagaCount !== undefined && (
        <>
          {(rating || year || ageRating) && <span className="text-on-surface-variant/50 mx-2 select-none">|</span>}
          <span>{sagaCount} {sagaCount === 1 ? "Saga" : "Sagas"}</span>
        </>
      )}
      <span className="text-brand-secondary font-bold flex items-center gap-1.5">
        {(rating || year || ageRating || sagaCount !== undefined) && <span className="text-on-surface-variant/50 mr-2 select-none">|</span>}
        SERIE
      </span>
      {genres.length > 0 && (
        <>
          <span className="text-on-surface-variant/50 mx-2 select-none">|</span>
          <span className="text-on-surface-variant">{genres.join(" | ")}</span>
        </>
      )}
    </div>
  )

  

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

      {entry?.localFiles && entry.localFiles.length > 0 && (
        <GlassIconButton
          onClick={handleAddToQueue}
          icon={<Icons.ui.listPlus className="w-5 h-5" />}
          title="Añadir a la cola"
        />
      )}
    </>
  )

  const footerText = castList.length > 0 ? castList.join(", ") : undefined

  return (
    <MediaHero
      backdropUrl={backdropUrl}
      posterUrl={posterUrl}
      hasBannerImage={hasBannerImage}
      showPosterColumn={true}
      title={titleNode}
      
      metadataRow={metadataRow}
      synopsis={synopsis}
      footerText={footerText}
      actionButtons={actionButtons}
      onBackdropClick={onPlay}
      className="py-8 md:py-10"
    />
  )
}
