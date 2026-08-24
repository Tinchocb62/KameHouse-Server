import React from "react"
import { useNavigate } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"
import type { Anime_LibraryCollectionEntry } from "@/api/generated/types"
import { cleanMovieTitle } from "../-MovieCard"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"
import { fetchAnimeEntry } from "@/api/hooks/anime_entries.hooks"

export interface MarathonDefinition {
    id: string
    title: string
    subtitle: string
    badge: string
    description: string
    gradient: string
    accentColor: string
    tmdbIds: number[]
    bannerImage: string
}

export const DRAGON_BALL_MARATHONS: MarathonDefinition[] = [
    {
        id: "broly_trilogy",
        title: "Trilogía del Guerrero Legendario",
        subtitle: "Saga de Broly",
        badge: "3 Películas",
        description: "Desde la devastación de Nuevo Vegeta hasta el terror biotécnico en la Tierra.",
        gradient: "from-emerald-950/80 via-teal-900/60 to-emerald-950/90",
        accentColor: "#10b981",
        tmdbIds: [34433, 44251, 39106],
        bannerImage: "https://image.tmdb.org/t/p/w1280/6OTRzP0V6eB5lH4m0vO4bZz2PzR.jpg",
    },
    {
        id: "cooler_duology",
        title: "Duelo de Emperadores",
        subtitle: "Saga de Cooler",
        badge: "2 Películas",
        description: "La venganza del hermano mayor de Freezer y la pesadilla de Metal Cooler en Nuevo Namek.",
        gradient: "from-cyan-950/80 via-blue-900/60 to-cyan-950/90",
        accentColor: "#06b6d4",
        tmdbIds: [24752, 39103],
        bannerImage: "https://image.tmdb.org/t/p/w1280/z0u4r8VKSsIlIhUyDJbMm2IQMRM.jpg",
    },
    {
        id: "timeline_specials",
        title: "Especiales del Pasado y Futuro",
        subtitle: "Líneas Temporales Alternativas",
        badge: "3 Especiales",
        description: "El último combate de Bardock y la resistencia apocalíptica de Gohan y Trunks.",
        gradient: "from-red-950/80 via-rose-900/60 to-amber-950/90",
        accentColor: "#f43f5e",
        tmdbIds: [39323, 39324, 120475],
        bannerImage: "https://image.tmdb.org/t/p/w1280/nxA3EBXQ6gJkMEm9KDRnuEd0IUOJ.jpg",
    },
    {
        id: "super_modern_era",
        title: "Era Moderna de los Dioses",
        subtitle: "Dragon Ball Super",
        badge: "4 Películas",
        description: "La Batalla de los Dioses, la Resurrección de F, Broly y Super Hero.",
        gradient: "from-purple-950/80 via-indigo-900/60 to-violet-950/90",
        accentColor: "#a855f7",
        tmdbIds: [126963, 303857, 503314, 610150],
        bannerImage: "https://image.tmdb.org/t/p/w1280/e8GCbv7JRx9aYkJLn6OTNPQm5IQ.jpg",
    },
    {
        id: "classic_origins",
        title: "Aventuras de las Siete Esferas",
        subtitle: "Dragon Ball Clásico",
        badge: "4 Películas",
        description: "Las cuatro películas legendarias de la infancia y juventud de Son Goku.",
        gradient: "from-amber-950/80 via-orange-900/60 to-red-950/90",
        accentColor: "#f59e0b",
        tmdbIds: [39144, 39145, 116776, 39148],
        bannerImage: "https://image.tmdb.org/t/p/w1280/dJODzGsqM92Z2rP0Z8dI1iPz8N0.jpg",
    },
]

interface MoviesMarathonCarouselProps {
    allMovies: (Anime_LibraryCollectionEntry & { era: string })[]
}

export function MoviesMarathonCarousel({ allMovies }: MoviesMarathonCarouselProps) {
    const navigate = useNavigate()
    const addToQueue = useAppStore(s => s.addToQueue)
    const clearQueue = useAppStore(s => s.clearQueue)
    const setCurrentQueueIndex = useAppStore(s => s.setCurrentQueueIndex)
    const [selectedMarathon, setSelectedMarathon] = React.useState<string | null>(null)

    // Map movies in library by their raw or offset tmdbId
    const moviesByTmdbId = React.useMemo(() => {
        const map = new Map<number, Anime_LibraryCollectionEntry>()
        for (const entry of allMovies) {
            const tmdb = entry.media?.tmdbId || 0
            const mediaId = entry.mediaId || 0
            const realTmdb = tmdb >= 1000000 ? tmdb - 1000000 : tmdb
            const realMediaId = mediaId >= 1000000 ? mediaId - 1000000 : mediaId
            if (realTmdb > 0) map.set(realTmdb, entry)
            if (realMediaId > 0) map.set(realMediaId, entry)
            if (tmdb > 0) map.set(tmdb, entry)
            if (mediaId > 0) map.set(mediaId, entry)
        }
        return map
    }, [allMovies])

    const handleStartMarathon = async (m: MarathonDefinition) => {
        const availableInMarathon = m.tmdbIds
            .map(id => moviesByTmdbId.get(id))
            .filter(Boolean) as Anime_LibraryCollectionEntry[]

        if (availableInMarathon.length === 0) {
            toast.error("No se encontraron estas películas en tus carpetas locales.")
            return
        }

        const toastId = toast.loading(`Preparando maratón: ${m.title}…`)

        try {
            // Obtener el path real de cada película via fetchAnimeEntry
            const entries = await Promise.all(
                availableInMarathon.map(entry => fetchAnimeEntry(String(entry.mediaId)))
            )

            clearQueue()
            entries.forEach((fullEntry, idx) => {
                if (!fullEntry) return
                const baseEntry = availableInMarathon[idx]
                const title = cleanMovieTitle(
                    fullEntry.media?.titleSpanish || fullEntry.media?.titleEnglish || fullEntry.media?.titleRomaji || "Película"
                )
                const playableUrl = fullEntry.localFiles?.[0]?.path || ""
                addToQueue({
                    id: fullEntry.mediaId ?? baseEntry.mediaId,
                    title,
                    subtitle: m.title,
                    playableUrl,
                    mediaId: fullEntry.mediaId ?? baseEntry.mediaId,
                    episodeNumber: 1,
                    malId: fullEntry.media?.idMal ?? null,
                    mediaFormat: "MOVIE",
                })
            })

            setCurrentQueueIndex(0)
            toast.success(`Maratón iniciado: ${m.title} (${entries.filter(Boolean).length} películas)`, { id: toastId })
            navigate({
                to: "/movies/$movieId",
                params: { movieId: String(availableInMarathon[0].mediaId) },
            })
        } catch (err) {
            console.error("[Marathon] Error al preparar el maratón:", err)
            toast.error("Error al preparar el maratón. Intenta de nuevo.", { id: toastId })
        }
    }

    return (
        <section className="space-y-4 my-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Icons.media.play className="w-5 h-5 text-brand-accent animate-pulse" />
                        <h2 className="text-xl font-bold tracking-tight text-white font-display">
                            Maratones y Trilogías Legendarias
                        </h2>
                    </div>
                    <p className="text-xs text-neutral-400">
                        Reproducción continua en orden cronológico para disfrutar de sagas completas sin interrupciones.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DRAGON_BALL_MARATHONS.map((m) => {
                    const availableCount = m.tmdbIds.filter(id => moviesByTmdbId.has(id)).length
                    const totalCount = m.tmdbIds.length
                    const isExpanded = selectedMarathon === m.id

                    return (
                        <motion.div
                            key={m.id}
                            layout
                            className={cn(
                                "relative overflow-hidden rounded-2xl border transition-all duration-300",
                                "bg-gradient-to-br border-white/10 hover:border-white/20 shadow-elevation-2",
                                m.gradient
                            )}
                        >
                            {/* Ambient banner background */}
                            <div
                                className="absolute inset-0 opacity-15 grayscale bg-cover bg-center pointer-events-none"
                                style={{ backgroundImage: `url(${m.bannerImage})` }}
                            />

                            <div className="relative p-5 flex flex-col justify-between h-full min-h-[200px] z-10 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-white/10 text-white/90 backdrop-blur-sm border border-white/10">
                                            {m.badge}
                                        </span>
                                        <span className={cn(
                                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                                            availableCount > 0 ? "text-emerald-400 bg-emerald-950/60 border border-emerald-500/20" : "text-neutral-400 bg-black/40"
                                        )}>
                                            {availableCount}/{totalCount} en biblioteca
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold text-brand-accent tracking-wide uppercase">
                                            {m.subtitle}
                                        </p>
                                        <h3 className="text-lg font-bold text-white tracking-tight drop-shadow-md">
                                            {m.title}
                                        </h3>
                                    </div>

                                    <p className="text-xs text-neutral-300/80 line-clamp-2 leading-relaxed">
                                        {m.description}
                                    </p>
                                </div>

                                <div className="pt-2 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleStartMarathon(m)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-accent hover:brightness-110 active:scale-95 text-white font-semibold text-xs transition-all shadow-lg shadow-brand-accent/20"
                                    >
                                        <Icons.media.play className="w-4 h-4 fill-white" />
                                        <span>Iniciar Maratón</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedMarathon(isExpanded ? null : m.id)}
                                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
                                        title={isExpanded ? "Ocultar películas" : "Ver lista de películas"}
                                    >
                                        <Icons.navigation.chevronDown className={cn(
                                            "w-4 h-4 transition-transform duration-300",
                                            isExpanded && "rotate-180"
                                        )} />
                                    </button>
                                </div>

                                {/* Expanded movie list */}
                                {isExpanded && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="pt-3 border-t border-white/10 space-y-2"
                                    >
                                        <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                                            Películas de esta saga:
                                        </p>
                                        <div className="space-y-1.5">
                                            {m.tmdbIds.map((id, idx) => {
                                                const movieEntry = moviesByTmdbId.get(id)
                                                const title = movieEntry
                                                    ? cleanMovieTitle(movieEntry.media?.titleSpanish || movieEntry.media?.titleEnglish || "Película")
                                                    : `Película ${idx + 1}`

                                                return (
                                                    <div
                                                        key={id}
                                                        onClick={() => {
                                                            if (movieEntry) {
                                                                navigate({
                                                                    to: "/movies/$movieId",
                                                                    params: { movieId: String(movieEntry.mediaId) },
                                                                })
                                                            }
                                                        }}
                                                        className={cn(
                                                            "flex items-center justify-between p-2 rounded-lg text-xs transition-all",
                                                            movieEntry
                                                                ? "bg-white/5 hover:bg-white/15 cursor-pointer text-white"
                                                                : "bg-black/20 text-neutral-500 cursor-not-allowed opacity-60"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="truncate font-medium">{title}</span>
                                                        </div>
                                                        {movieEntry ? (
                                                            <span className="text-[10px] text-emerald-400 font-semibold shrink-0 ml-2">Disponible</span>
                                                        ) : (
                                                            <span className="text-[10px] text-neutral-500 shrink-0 ml-2">No escaneada</span>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </section>
    )
}
