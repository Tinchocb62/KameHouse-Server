import React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { dbzData, type Series } from "@/lib/dbz-data"
import { DeferredImage } from "@/components/shared/deferred-image"
import { FaPlay } from "react-icons/fa"
import { EmptyState } from "@/components/shared/empty-state"
import { ManualMatchModal } from "@/components/shared/manual-match-modal"

type SeriesWithVisuals = Series & {
    bannerImage?: string
    backdropUrl?: string
    coverImage?: string
    genres?: string[]
}

export const Route = createFileRoute("/series/$seriesId/")({
    component: SeriesDetailPage,
})

function SeriesDetailPage() {
    const { seriesId } = Route.useParams()
    const series = dbzData.find((item) => item.id === seriesId) as SeriesWithVisuals | undefined

    if (!series) {
        return (
            <div className="min-h-screen bg-[#0B0B0F] text-white flex items-center justify-center px-6">
                <EmptyState
                    title="Serie no encontrada"
                    message="No pudimos cargar esta serie. Vuelve al inicio o intenta con otra."
                />
            </div>
        )
    }

    const heroBackdrop = series.bannerImage ?? series.backdropUrl ?? series.image
    const coverImage = series.coverImage ?? series.image
    const genres = series.genres ?? ["Shonen", "Action", "Adventure"]

    const [isMatchModalOpen, setIsMatchModalOpen] = React.useState(false)

    return (
        <div className="min-h-screen bg-[#0B0B0F] text-white pb-16">
            <HeroSection
                backdropUrl={heroBackdrop}
                coverUrl={coverImage}
                title={series.title}
                year={series.year}
                genres={genres}
                synopsis={series.description}
                episodesCount={series.episodesCount}
                onFixMatchClick={() => setIsMatchModalOpen(true)}
            />

            <EpisodesSection seriesTitle={series.title} fallbackThumb={heroBackdrop} sagas={series.sagas} />

            <ManualMatchModal
                isOpen={isMatchModalOpen}
                onClose={() => setIsMatchModalOpen(false)}
                currentMediaId={parseInt(series.id)}
                directoryPath={`/mock/path/${series.id}`} // En un caso real esto vendria de la metadata de Anime_Entry
            />
        </div>
    )
}

interface HeroSectionProps {
    backdropUrl: string
    coverUrl: string
    title: string
    year: string
    genres: string[]
    synopsis: string
    episodesCount: number
    onFixMatchClick?: () => void
}

function HeroSection({ backdropUrl, coverUrl, title, year, genres, synopsis, episodesCount, onFixMatchClick }: HeroSectionProps) {
    return (
        <section className="relative isolate overflow-hidden">
            <div className="absolute inset-0">
                <img
                    src={backdropUrl}
                    alt={title}
                    className="h-full w-full object-cover blur-[2px] scale-105"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-[#05050a]/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#05050a] via-[#05050a]/65 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
            </div>

            <div className="relative px-6 sm:px-10 lg:px-16 pt-24 pb-18 lg:pb-24">
                <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-end">
                    <div className="mx-auto w-40 sm:w-48 md:w-60 lg:mx-0">
                        <img
                            src={coverUrl}
                            alt={`${title} cover`}
                            loading="lazy"
                            className="aspect-[2/3] w-full rounded-3xl border border-white/10 object-cover shadow-[0_25px_80px_rgba(0,0,0,0.6)]"
                        />
                    </div>

                    <div className="flex flex-1 flex-col gap-5 pb-4">
                        <div className="flex flex-wrap items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/80">
                            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{year}</span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{episodesCount} episodios</span>
                            <span className="rounded-full border border-orange-500/40 bg-orange-500/15 px-3 py-1 text-orange-200">HDR</span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight drop-shadow-[0_10px_40px_rgba(0,0,0,0.65)]">
                            {title}
                        </h1>

                        <div className="flex flex-wrap gap-2">
                            {genres.map((genre) => (
                                <span
                                    key={genre}
                                    className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/80 backdrop-blur-sm"
                                >
                                    {genre}
                                </span>
                            ))}
                        </div>

                        <p className="max-w-4xl text-base sm:text-lg text-white/85 leading-relaxed line-clamp-4">
                            {synopsis}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-bold uppercase tracking-[0.22em] text-white shadow-[0_10px_30px_rgba(249,115,22,0.4)] transition hover:translate-y-[-1px] hover:shadow-[0_15px_40px_rgba(249,115,22,0.5)]">
                                <FaPlay className="h-4 w-4" /> Reproducir
                            </button>
                            <button className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-white/40 hover:text-white">
                                Agregar a lista
                            </button>
                            <button 
                                onClick={onFixMatchClick}
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/50 transition hover:border-white/20 hover:text-white"
                            >
                                Fix Match
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

interface EpisodesSectionProps {
    seriesTitle: string
    fallbackThumb: string
    sagas: Series["sagas"]
}

function EpisodesSection({ seriesTitle, fallbackThumb, sagas }: EpisodesSectionProps) {
    return (
        <section className="relative z-[1] -mt-10 space-y-10 px-6 sm:px-10 lg:px-16">
            {sagas.map((saga) => (
                <div key={saga.id} className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.22em] text-white/60">Saga</p>
                            <h2 className="text-2xl font-black">{saga.title}</h2>
                            <p className="text-sm text-white/60 max-w-2xl">{saga.description}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                            {saga.episodes.length} episodios
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {saga.episodes.map((episode) => {
                            const thumb = (episode as { thumbnailUrl?: string }).thumbnailUrl ?? saga.image ?? fallbackThumb
                            return (
                                <article
                                    key={episode.id}
                                    className="group overflow-hidden rounded-2xl border border-white/8 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
                                >
                                    <div className="relative aspect-video overflow-hidden">
                                        <DeferredImage
                                            src={thumb}
                                            alt={`${seriesTitle} episodio ${episode.number}`}
                                            className="h-full w-full"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-70" />
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_45%)] opacity-60" />
                                        <div className="absolute top-2 left-2 rounded-full border border-white/20 bg-black/70 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/90">
                                            E{episode.number}
                                        </div>
                                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                                            <span className="rounded-full bg-white/10 px-2 py-1">HD</span>
                                            <span className="rounded-full bg-white/10 px-2 py-1">Sub â€¢ Latam</span>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-300/70 bg-orange-500/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(249,115,22,0.35)] scale-95 group-hover:scale-100 transition-transform duration-300">
                                                <FaPlay className="h-4 w-4 text-white ml-0.5" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                                            Episodio {episode.number}
                                        </p>
                                        <h3 className="text-base font-bold leading-tight line-clamp-2 text-white">
                                            {episode.title}
                                        </h3>
                                        {episode.description && (
                                            <p className="text-sm text-white/70 line-clamp-2">
                                                {episode.description}
                                            </p>
                                        )}
                                        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                                            <span>24 min</span>
                                            <button className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80 transition hover:border-orange-400 hover:text-orange-200">
                                                Reproducir
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                </div>
            ))}
        </section>
    )
}
