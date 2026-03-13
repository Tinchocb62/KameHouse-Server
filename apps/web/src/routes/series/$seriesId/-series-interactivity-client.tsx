"use client"

import React from "react"
import { FaPlay } from "react-icons/fa"
import { ManualMatchModal } from "@/components/shared/manual-match-modal"
import { Anime_Entry, Anime_Episode } from "@/api/generated/types"
import { DeferredImage } from "@/components/shared/deferred-image"

export const MediaActionButtons = React.memo(({ 
    seriesId, 
    directoryPath 
}: { 
    seriesId: string
    directoryPath: string 
}) => {
    const [isMatchModalOpen, setIsMatchModalOpen] = React.useState(false)

    return (
        <>
            <div className="flex flex-wrap items-center gap-3 pt-2">
                <button className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-bold uppercase tracking-[0.22em] text-white shadow-[0_10px_30px_rgba(249,115,22,0.4)] transition hover:translate-y-[-1px] hover:shadow-[0_15px_40px_rgba(249,115,22,0.5)]">
                    <FaPlay className="h-4 w-4" /> Reproducir
                </button>
                <button className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-white/40 hover:text-white">
                    Agregar a lista
                </button>
                <button 
                    onClick={() => setIsMatchModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/50 transition hover:border-white/20 hover:text-white"
                >
                    Corregir Metadatos
                </button>
            </div>

            <ManualMatchModal
                isOpen={isMatchModalOpen}
                onClose={() => setIsMatchModalOpen(false)}
                currentMediaId={parseInt(seriesId)}
                directoryPath={directoryPath}
            />
        </>
    )
})

export const EpisodeClientCard = React.memo(({
    episode,
    seriesTitle,
    fallbackThumb,
}: {
    episode: Anime_Episode
    seriesTitle: string
    fallbackThumb: string
}) => {
    const thumb = episode.episodeMetadata?.image || fallbackThumb
    const length = episode.episodeMetadata?.length || 24

    return (
        <article
            className="group overflow-hidden rounded-2xl border border-white/8 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            title={episode.localFile?.path}
        >
            <div className="relative aspect-video overflow-hidden">
                <DeferredImage
                    src={thumb}
                    alt={`${seriesTitle} episodio ${episode.episodeNumber}`}
                    className="h-full w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-70" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_45%)] opacity-60" />
                <div className="absolute top-2 left-2 rounded-full border border-white/20 bg-black/70 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/90">
                    E{episode.episodeNumber}
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                    <span className="rounded-full bg-white/10 px-2 py-1">{episode.isDownloaded ? "Local" : "Online"}</span>
                    {episode.fileMetadata?.aniDBEpisode && <span className="rounded-full bg-white/10 px-2 py-1">AniDB: {episode.fileMetadata.aniDBEpisode}</span>}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-300/70 bg-orange-500/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(249,115,22,0.35)] scale-95 group-hover:scale-100 transition-transform duration-300 cursor-pointer">
                        <FaPlay className="h-4 w-4 text-white ml-0.5" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                    {episode.displayTitle || `Episodio ${episode.episodeNumber}`}
                </p>
                <h3 className="text-base font-bold leading-tight line-clamp-2 text-white">
                    {episode.episodeTitle || "Sin título"}
                </h3>
                {episode.episodeMetadata?.summary && (
                    <p className="text-sm text-white/70 line-clamp-2" dangerouslySetInnerHTML={{ __html: episode.episodeMetadata.summary }}></p>
                )}
                <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    <span>{length} min</span>
                    <button className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80 transition hover:border-orange-400 hover:text-orange-200">
                        Visualizar
                    </button>
                </div>
            </div>
        </article>
    )
})
