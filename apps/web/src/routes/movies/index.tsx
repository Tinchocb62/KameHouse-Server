import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useMemo, memo } from "react"
import { FaPlay, FaSearch, FaFilter } from "react-icons/fa"
import { dbzMovies, type DbzMovie } from "@/lib/dbz-movies"
import { EmptyState } from "@/components/shared/empty-state"

export const Route = createFileRoute("/movies/")({
    component: MoviesPage,
})

// ─── Sagas available for filtering ───────────────────────────────────────────

const ALL_SAGAS = Array.from(new Set(dbzMovies.map((m) => m.saga))).sort()

// ─── Page ─────────────────────────────────────────────────────────────────────

function MoviesPage() {
    const [search, setSearch] = useState("")
    const [activeSaga, setActiveSaga] = useState<string | null>(null)

    const filtered = useMemo(() => {
        return dbzMovies.filter((m) => {
            const matchesSaga = activeSaga ? m.saga === activeSaga : true
            const matchesSearch = search
                ? m.title.toLowerCase().includes(search.toLowerCase()) ||
                m.description.toLowerCase().includes(search.toLowerCase())
                : true
            return matchesSaga && matchesSearch
        })
    }, [search, activeSaga])

    return (
        <div className="flex-1 w-full flex flex-col min-h-screen bg-[#0B0B0F] text-white overflow-y-auto pb-24">

            {/* ── Hero header ── */}
            <div className="relative w-full overflow-hidden pt-24 pb-12 px-6 md:px-14">
                {/* Glow blob */}
                <div
                    className="absolute -top-40 -left-20 w-[600px] h-[500px] rounded-full opacity-10 blur-[120px] pointer-events-none"
                    style={{ background: "radial-gradient(circle, #f97316 0%, #dc2626 100%)" }}
                />
                <div className="relative z-10 max-w-7xl mx-auto">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500 mb-3">
                        Colección
                    </p>
                    <h1 className="text-5xl md:text-6xl font-black leading-none text-white mb-4">
                        PELÍCULAS
                        <span className="block text-orange-500 text-3xl md:text-4xl mt-1">Universo Dragon Ball </span>
                    </h1>
                    <p className="text-gray-400 max-w-xl text-base font-medium">
                        {dbzMovies.length} películas · Desde 1987 hasta 2022
                    </p>
                </div>
            </div>

            {/* ── Controls bar ── */}
            <div className="sticky top-[80px] md:top-[96px] z-30 bg-[#0B0B0F]/90 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 md:px-14 py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">

                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            id="movies-search"
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar película..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                        />
                    </div>

                    {/* Saga filter pills */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <FaFilter className="text-gray-500 w-4 h-4 flex-shrink-0" />
                        <FilterPill
                            label="Todo"
                            active={activeSaga === null}
                            onClick={() => setActiveSaga(null)}
                        />
                        {ALL_SAGAS.map((s) => (
                            <FilterPill
                                key={s}
                                label={s}
                                active={activeSaga === s}
                                onClick={() => setActiveSaga(activeSaga === s ? null : s)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Grid ── */}
            <div className="max-w-7xl mx-auto px-6 md:px-14 pt-10">
                {filtered.length === 0 ? (
                    <EmptyState
                        title="Sin resultados"
                        message="Intenta con otro filtro o búsqueda"
                    />
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                        {filtered.map((movie) => (
                            <MovieCard key={movie.id} movie={movie} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

const FilterPill = memo(function FilterPill({
    label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide border transition-all duration-200 min-h-[36px] ${active
                ? "bg-orange-500 text-white border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                : "bg-white/5 text-gray-400 border-white/10 hover:border-orange-500/40 hover:text-orange-400"
                }`}
        >
            {label.replace("Dragon Ball ", "DB ")}
        </button>
    )
})

// ─── Movie card ───────────────────────────────────────────────────────────────

const MovieCard = memo(function MovieCard({ movie }: { movie: DbzMovie }) {
    const navigate = useNavigate()
    const [imgError, setImgError] = useState(false)

    const handlePlay = () => {
        // Future: navigate({ to: "/player", search: { movieId: movie.id } })
        navigate({ to: "/series" })
    }

    return (
        <div
            id={`movie-card-${movie.id}`}
            className="group relative flex flex-col cursor-pointer"
            onClick={handlePlay}
        >
            {/* Poster */}
            <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-white/5 shadow-lg">
                {!imgError ? (
                    <img
                        src={movie.image}
                        alt={movie.title}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full bg-[#1C1C28]">
                        <span className="text-5xl">🎬</span>
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
                    <div className="w-14 h-14 rounded-full bg-orange-500/90 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.6)]">
                        <FaPlay className="w-5 h-5 text-white ml-1" />
                    </div>
                </div>

                {/* Duration badge */}
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-xs font-bold text-white">
                    {movie.duration}
                </div>

                {/* Year badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-orange-500/80 backdrop-blur-sm rounded text-xs font-black text-white">
                    {movie.year}
                </div>
            </div>

            {/* Info */}
            <div className="mt-2.5 px-0.5">
                <p className="text-white font-bold text-sm leading-tight line-clamp-2 group-hover:text-orange-400 transition-colors duration-200">
                    {movie.title}
                </p>
                <p className="text-xs text-orange-500/70 font-semibold mt-1 truncate">
                    {movie.saga}
                </p>
            </div>
        </div>
    )
})
