import * as React from "react"
import { useMemo } from "react"
import { toast } from "sonner"
import { useAppStore } from "@/lib/store"
import type { Anime_Entry } from "@/api/generated/types"
import { Icons } from "@/components/ui/icons"
import { getHighResImage, getMediumResImage } from "@/lib/helpers/images"
import { MediaHero } from "@/components/ui/media-hero"

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

  // Technical details from files
  const tech = entry?.localFiles?.[0]?.technicalInfo

  const qualityBadge = useMemo(() => {
    if (!tech?.videoStream) return null
    const w = tech.videoStream.width
    if (w === undefined) return null
    if (w >= 3840) return "4K UHD"
    if (w >= 1920) return "1080P FHD"
    if (w >= 1280) return "720P HD"
    return null
  }, [tech])




  const addToQueue = useAppStore(state => state.addToQueue)

  const castList = useMemo(() => {
    if (!media?.characters?.edges) return []
    return media.characters.edges
      .map((edge: any) => edge.node?.name?.full || edge.node?.name?.userPreferred)
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
      <h1 onClick={onPlay} className="font-sans font-extrabold leading-[1.05] tracking-tight text-on-surface drop-shadow-[0_4px_25px_rgba(0,0,0,0.85)] cursor-pointer hover:text-brand-secondary transition-colors duration-slow uppercase" style={{ fontSize: "max(2.5rem, min(5.5vw, 4.5rem))" }}>
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
      <button
        onClick={onPlay}
        onPointerEnter={onPlayHover}
        onFocus={onPlayHover}
        title={hasProgress && resumeEpisodeTitle ? resumeEpisodeTitle : undefined}
        className="group/play relative flex items-center gap-4 px-8 py-4 text-zinc-950 rounded-2xl overflow-hidden shadow-brand-primary transition-all duration-300 hover:scale-[1.03] active:scale-95"
        style={{ background: `linear-gradient(to right, var(--era-btn-from), var(--era-btn-to))` }}
      >
        <div className="absolute inset-0 transition-opacity duration-300 opacity-0 group-hover/play:opacity-100 z-0" style={{ background: `linear-gradient(to right, var(--era-btn-hover-from), var(--era-btn-hover-to))` }} />
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-0 group-hover/play:opacity-100 transition-opacity duration-slow ease-smooth-out z-0" />

        <div className="p-3 bg-black/15 backdrop-blur-[var(--blur-overlay-sm)] rounded-xl text-zinc-950 group-hover/play:bg-zinc-950 group-hover/play:text-zinc-50 transition-all duration-300 z-10 shrink-0">
          <Icons.media.play className="w-4 h-4 fill-current" />
        </div>

        <div className="flex flex-col items-start z-10 select-none text-left">
          <span className="font-sans text-button-md tracking-wider font-black uppercase text-zinc-950 transition-colors whitespace-nowrap">
            {hasProgress ? "Reanudar" : "Reproducir"}
          </span>
          <span className="text-label-sm font-black text-zinc-950/70 tracking-widest uppercase transition-colors mt-0.5 whitespace-nowrap">
            {hasProgress
              ? (resumeEpisodeNumber != null ? `Continuar · Ep ${resumeEpisodeNumber}` : "Continuar viendo")
              : "Comenzar episodio"}
          </span>
        </div>
      </button>

      {entry?.localFiles && entry.localFiles.length > 0 && (
        <button
          onClick={handleAddToQueue}
          className="group/queue flex items-center justify-center p-4 rounded-2xl glass-liquid transition-all duration-300 text-on-surface/70 hover:text-on-surface hover:scale-[1.03] active:scale-95"
          title="Añadir a la cola"
        >
          <Icons.ui.listPlus className="w-5 h-5 transition-transform group-hover/queue:-translate-y-0.5" />
        </button>
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
