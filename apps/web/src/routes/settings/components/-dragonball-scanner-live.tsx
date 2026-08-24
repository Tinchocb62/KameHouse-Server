import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    RefreshCw,
    CheckCircle2,
    FolderSearch,
    Zap,
    X,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useScanLocalFiles } from "@/api/hooks/scan.hooks"
import { useGetLibraryCollection } from "@/api/hooks/anime_collection.hooks"
import { cn } from "@/components/ui/core/styling"

import {
    DRAGON_BALL_SCANNER_SERIES as DRAGON_BALL_SERIES,
    type DBFranchiseSeries,
} from "@/lib/config/dragonball_scanner_series"

export function DragonBallScannerLive() {
    const { mutate: scanLibrary, isPending } = useScanLocalFiles()
    const { data: collection } = useGetLibraryCollection()
    const [selectedSeries, setSelectedSeries] = useState<DBFranchiseSeries | null>(null)
    const [modalTab, setModalTab] = useState<"sagas" | "movies">("sagas")
    const [showLiveLog, setShowLiveLog] = useState(false)

    // Store state
    const isScanningStore = useAppStore((state) => state.isScanning)
    const scanProgressStore = useAppStore((state) => state.scanProgress)
    const currentFileStore = useAppStore((state) => state.currentScanningFile)
    const scanEvents = useAppStore((state) => state.events)

    const isScanning = isScanningStore || isPending
    const scanProgress = isScanning ? Math.round(scanProgressStore || 5) : 100

    // Map collection entries by TMDB ID and track movies
    const { collectionMap, movieDetailsMap, detectedMovieIds, totalMoviesDetected } = useMemo(() => {
        const map = new Map<number, { count: number; poster?: string; banner?: string; title?: string }>()
        const movieMap = new Map<number, { title: string; year?: number; poster?: string; banner?: string }>()
        const detectedIds = new Set<number>()

        if (!collection?.lists) return { collectionMap: map, movieDetailsMap: movieMap, detectedMovieIds: detectedIds, totalMoviesDetected: 0 }

        let movieCount = 0

        for (const list of collection.lists) {
            if (!list.entries) continue
            for (const entry of list.entries) {
                const rawId = entry.media?.tmdbId || entry.mediaId
                const count = entry.libraryData?.mainFileCount || 0
                const poster = entry.media?.posterImage
                const banner = entry.media?.bannerImage
                const title = entry.media?.titleSpanish || entry.media?.titleEnglish || entry.media?.titleRomaji || "Sin título"
                const format = entry.media?.format
                const isMovie = format === "MOVIE" || format === "SPECIAL" || format === "OVA" || entry.media?.type === "MOVIE" || (rawId && rawId >= 1000000)

                const normalizedTmdbId = rawId ? (rawId >= 1000000 ? rawId - 1000000 : rawId) : 0

                if (isMovie && normalizedTmdbId > 0) {
                    if (!detectedIds.has(normalizedTmdbId)) {
                        movieCount++
                    }
                    detectedIds.add(normalizedTmdbId)
                    detectedIds.add(normalizedTmdbId + 1000000)
                    movieMap.set(normalizedTmdbId, {
                        title,
                        year: entry.media?.year,
                        poster,
                        banner,
                    })
                }

                if (rawId) {
                    const existing = map.get(rawId)
                    map.set(rawId, {
                        count: (existing?.count || 0) + count,
                        poster: poster || existing?.poster,
                        banner: banner || existing?.banner,
                        title: title || existing?.title,
                    })
                    if (normalizedTmdbId > 0 && normalizedTmdbId !== rawId) {
                        map.set(normalizedTmdbId, {
                            count: (existing?.count || 0) + count,
                            poster: poster || existing?.poster,
                            banner: banner || existing?.banner,
                            title: title || existing?.title,
                        })
                    }
                }
            }
        }

        if (movieCount > 0) {
            map.set(999999, { count: movieCount })
        }

        return { collectionMap: map, movieDetailsMap: movieMap, detectedMovieIds: detectedIds, totalMoviesDetected: movieCount }
    }, [collection])

    // Compute metrics
    const metrics = useMemo(() => {
        let totalDetectedEps = 0
        let totalOfficialEps = 0
        let seriesFoundCount = 0

        for (const series of DRAGON_BALL_SERIES) {
            if (series.type === "MOVIES") continue
            const entry = collectionMap.get(series.tmdbId)
            const count = entry?.count || 0
            totalDetectedEps += count
            totalOfficialEps += series.totalEpisodes
            if (count > 0) seriesFoundCount++
        }

        const matchRatio = totalOfficialEps > 0 ? Math.min(100, Math.round((totalDetectedEps / totalOfficialEps) * 100)) : 0

        return {
            totalDetectedEps,
            totalOfficialEps,
            seriesFoundCount,
            totalMoviesDetected,
            matchRatio,
        }
    }, [collectionMap, totalMoviesDetected])

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* ── 1. HERO RADAR DE ESCANEO ─────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/10 p-5 sm:p-6 shadow-elevation-1 backdrop-blur-md">
                {/* Background Ki Aura Ambient Light */}
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none transform-gpu" />
                <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none transform-gpu" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                    {/* Left: Orb + Status */}
                    <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left w-full lg:w-auto">
                        {/* Radial Progress Orb */}
                        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                            {/* Outer spinning ring */}
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    className="stroke-white/10"
                                    strokeWidth="7"
                                    fill="none"
                                />
                                <motion.circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    className="stroke-brand-accent"
                                    strokeWidth="7"
                                    strokeDasharray="251"
                                    initial={{ strokeDashoffset: 251 }}
                                    animate={{
                                        strokeDashoffset: 251 - (251 * (isScanning ? scanProgress : metrics.matchRatio)) / 100,
                                    }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    strokeLinecap="round"
                                    fill="none"
                                />
                            </svg>

                            {/* Inner Orb Content */}
                            <div className="absolute inset-1.5 rounded-full bg-zinc-950/80 border border-white/10 flex flex-col items-center justify-center shadow-inner">
                                <span className="text-lg font-black tracking-tight text-white font-mono">
                                    {isScanning ? `${scanProgress}%` : `${metrics.matchRatio}%`}
                                </span>
                                <span className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant/70">
                                    {isScanning ? "Escaneo" : "Series"}
                                </span>
                            </div>
                        </div>

                        {/* Status Text & Current File */}
                        <div className="space-y-1.5 max-w-md">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                        isScanning
                                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    )}
                                >
                                    {isScanning ? (
                                        <>
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                            Escaneando en Vivo
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-3 h-3" />
                                            Radar Listo
                                        </>
                                    )}
                                </span>

                                <span className="text-[11px] font-mono text-on-surface-variant/70">
                                    Motor Dragon Ball
                                </span>
                            </div>

                            <h3 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                                {isScanning ? "Indexando archivos locales..." : "Biblioteca Dragon Ball"}
                            </h3>

                            <p className="text-[11px] text-on-surface-variant/70 truncate font-mono">
                                {isScanning && currentFileStore
                                    ? currentFileStore
                                    : `${metrics.totalDetectedEps} episodios • ${metrics.totalMoviesDetected} películas y especiales`}
                            </p>
                        </div>
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-end shrink-0">
                        <button
                            type="button"
                            onClick={() => scanLibrary({ mode: "fast", skipLockedFiles: false, skipIgnoredFiles: false })}
                            disabled={isScanning}
                            className={cn(
                                "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-sm",
                                isScanning
                                    ? "bg-brand-accent/20 text-brand-accent/60 cursor-not-allowed border border-brand-accent/20"
                                    : "bg-brand-accent hover:brightness-110 text-white active:scale-95"
                            )}
                        >
                            <Zap className={cn("w-3.5 h-3.5", isScanning && "animate-spin")} />
                            <span>{isScanning ? "Escaneando..." : "Escanear Ahora"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => scanLibrary({ mode: "deep", skipLockedFiles: false, skipIgnoredFiles: false })}
                            disabled={isScanning}
                            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs text-on-surface bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all active:scale-95"
                            title="Re-analizar toda la biblioteca ignorando la caché"
                        >
                            <RefreshCw className="w-3.5 h-3.5 text-on-surface-variant" />
                            <span>Re-Scan</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowLiveLog(!showLiveLog)}
                            className={cn(
                                "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs border transition-all active:scale-95",
                                showLiveLog
                                    ? "bg-brand-accent/20 text-brand-accent border-brand-accent/40"
                                    : "bg-white/[0.04] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.08] border-white/10"
                            )}
                        >
                            <FolderSearch className="w-3.5 h-3.5" />
                            <span>Logs</span>
                        </button>
                    </div>
                </div>

                {/* Metrics Ticker Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-5 border-t border-white/[0.06]">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                        <span className="text-[10px] font-mono text-on-surface-variant/70 uppercase tracking-wider block">Episodios Series</span>
                        <div className="text-sm font-bold text-white font-mono flex items-baseline gap-1">
                            {metrics.totalDetectedEps}
                            <span className="text-[11px] font-normal text-on-surface-variant/60">/ {metrics.totalOfficialEps}</span>
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                        <span className="text-[10px] font-mono text-on-surface-variant/70 uppercase tracking-wider block">Películas & OVAs</span>
                        <div className="text-sm font-bold text-amber-400 font-mono flex items-baseline gap-1">
                            {metrics.totalMoviesDetected}
                            <span className="text-[11px] font-normal text-on-surface-variant/60">/ 27 títulos</span>
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                        <span className="text-[10px] font-mono text-on-surface-variant/70 uppercase tracking-wider block">Series DB</span>
                        <div className="text-sm font-bold text-cyan-400 font-mono flex items-baseline gap-1">
                            {metrics.seriesFoundCount}
                            <span className="text-[11px] font-normal text-on-surface-variant/60">/ 6 oficiales</span>
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                        <span className="text-[10px] font-mono text-on-surface-variant/70 uppercase tracking-wider block">Detección Total</span>
                        <div className="text-sm font-bold text-emerald-400 font-mono">
                            100% Preciso
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2. FEED HOLOGRÁFICO EN VIVO (LOGS DE ACTIVIDAD) ───────────────── */}
            <AnimatePresence>
                {showLiveLog && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden rounded-2xl bg-surface-container-lowest border border-amber-500/20 font-mono text-xs shadow-xl"
                    >
                        <div className="flex items-center justify-between px-4 py-3 bg-surface-container-high/60 border-b border-outline-variant/30">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                <span className="font-bold text-on-surface text-xs uppercase tracking-wider">
                                    Terminal de Escaneo en Vivo
                                </span>
                            </div>
                            <span className="text-[11px] text-on-surface-variant">
                                {scanEvents.length} eventos registrados
                            </span>
                        </div>

                        <div className="p-4 max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-amber-500/20">
                            {scanEvents.length === 0 ? (
                                <p className="text-on-surface-variant italic py-4 text-center">
                                    Inicia un escaneo para observar la detección de archivos y matches en tiempo real...
                                </p>
                            ) : (
                                scanEvents.slice(0, 30).map((evt, idx) => (
                                    <div key={evt.id || idx} className="flex items-start gap-2 text-on-surface-variant">
                                        <span className="text-amber-400 font-bold shrink-0">
                                            [{new Date(evt.timestamp).toLocaleTimeString()}]
                                        </span>
                                        <span className="text-emerald-400 font-semibold shrink-0">
                                            {evt.status}:
                                        </span>
                                        <span className="text-on-surface line-clamp-1 break-all">
                                            {evt.file || "Procesando..."}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── 3. CUADRÍCULA DE PORTADAS OFICIALES EN TIEMPO REAL ────────────────── */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                            Colección Dragon Ball & Universo Cinematográfico
                        </h4>
                        <p className="text-[11px] text-on-surface-variant/70">
                            Toca cualquier portada para ver el desglose en vivo de episodios y películas detectadas
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                    {DRAGON_BALL_SERIES.map((series) => {
                        const colData = collectionMap.get(series.tmdbId)
                        const count = colData?.count || 0
                        const poster = colData?.poster || series.officialPoster
                        const isComplete = count >= series.totalEpisodes
                        const isPartial = count > 0 && !isComplete
                        const percentage = Math.min(100, Math.round((count / series.totalEpisodes) * 100))

                        const seriesMovies = series.movies || []
                        const detectedMoviesInSeries = seriesMovies.filter(m => detectedMovieIds.has(m.tmdbId)).length

                        return (
                            <motion.div
                                key={series.id}
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                onClick={() => {
                                    setSelectedSeries(series)
                                    setModalTab(series.type === "MOVIES" ? "movies" : "sagas")
                                }}
                                className={cn(
                                    "group relative flex flex-col rounded-xl overflow-hidden cursor-pointer border transition-all duration-200 bg-white/[0.02]",
                                    (count > 0 || detectedMoviesInSeries > 0)
                                        ? "border-white/15 hover:border-brand-accent/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_14px_hsl(var(--brand-accent)/0.2)]"
                                        : "border-white/10 opacity-75 hover:opacity-100 hover:border-white/20"
                                )}
                            >
                                {/* Poster Image Container (2:3 Aspect Ratio) */}
                                <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
                                    <img
                                        src={poster}
                                        alt={series.title}
                                        onError={(e) => {
                                            if (e.currentTarget.src !== series.officialPoster) {
                                                e.currentTarget.src = series.officialPoster
                                            }
                                        }}
                                        className={cn(
                                            "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105",
                                            count === 0 && detectedMoviesInSeries === 0 && "grayscale-[40%] opacity-80"
                                        )}
                                        loading="lazy"
                                    />

                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

                                    {/* Top Right Status Pill */}
                                    <div className="absolute top-1.5 right-1.5 z-10 flex flex-col items-end gap-1">
                                        {isComplete && (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider bg-emerald-500/90 text-white shadow-sm backdrop-blur-sm">
                                                <CheckCircle2 className="w-2.5 h-2.5" /> 100%
                                            </span>
                                        )}
                                        {isPartial && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider bg-amber-500/90 text-black shadow-sm backdrop-blur-sm">
                                                {percentage}%
                                            </span>
                                        )}
                                        {seriesMovies.length > 0 && (
                                            <span className={cn(
                                                "inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold font-mono uppercase tracking-wider backdrop-blur-sm shadow-sm",
                                                detectedMoviesInSeries === seriesMovies.length
                                                    ? "bg-emerald-950/90 text-emerald-300 border border-emerald-500/40"
                                                    : detectedMoviesInSeries > 0
                                                    ? "bg-amber-950/90 text-amber-300 border border-amber-500/40"
                                                    : "bg-black/70 text-zinc-400 border border-white/10"
                                            )}>
                                                🎬 {detectedMoviesInSeries}/{seriesMovies.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Bottom Info on Poster */}
                                    <div className="absolute bottom-2 left-2 right-2 z-10">
                                        <h4 className="text-[11px] font-bold text-white leading-tight line-clamp-1 group-hover:text-brand-accent transition-colors">
                                            {series.title}
                                        </h4>
                                        <p className="text-[9px] font-mono text-on-surface-variant/80 mt-0.5 truncate">
                                            {series.subtitle}
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bar & Episode Count Footer */}
                                <div className="p-2 bg-white/[0.02] border-t border-white/5 space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                        <span className="text-on-surface-variant/60 truncate">
                                            {series.type === "MOVIES" ? "Películas" : "Episodios"}
                                        </span>
                                        <span className={cn("font-bold shrink-0", count > 0 ? "text-white" : "text-on-surface-variant/50")}>
                                            {count}<span className="text-on-surface-variant/40 font-normal">/{series.totalEpisodes}</span>
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-300 rounded-full",
                                                isComplete
                                                    ? "bg-emerald-400"
                                                    : count > 0
                                                    ? "bg-brand-accent"
                                                    : "bg-transparent"
                                            )}
                                            style={{ width: `${Math.max(count > 0 ? 5 : 0, percentage)}%` }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {/* ── 4. MODAL / DRAWER VISUAL DE SAGAS Y PELÍCULAS ──────────────────── */}
            <AnimatePresence>
                {selectedSeries && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl bg-zinc-950 border border-white/15 shadow-2xl overflow-hidden"
                        >
                            {/* Header with Official Poster Banner */}
                            <div className="relative p-5 bg-white/[0.02] border-b border-white/10 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={selectedSeries.officialPoster}
                                        alt={selectedSeries.title}
                                        className="w-14 h-20 object-cover rounded-xl shadow-md border border-white/10 shrink-0"
                                    />
                                    <div>
                                        <span className="text-[10px] font-mono font-bold text-brand-accent uppercase tracking-wider block">
                                            Inspector de Escaneo
                                        </span>
                                        <h3 className="text-lg font-bold text-white tracking-tight">
                                            {selectedSeries.title}
                                        </h3>
                                        <p className="text-xs text-on-surface-variant/80 font-mono mt-0.5">
                                            {selectedSeries.subtitle} • {selectedSeries.totalEpisodes} {selectedSeries.type === "MOVIES" ? "películas" : "episodios"}
                                            {selectedSeries.movies && selectedSeries.movies.length > 0 && (
                                                <span> • {selectedSeries.movies.length} películas asociadas</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedSeries(null)}
                                    className="p-1.5 rounded-xl hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Tab Switcher (Sagas vs Movies) if series has both */}
                            {selectedSeries.sagas && selectedSeries.sagas.length > 0 && selectedSeries.movies && selectedSeries.movies.length > 0 && (
                                <div className="flex items-center gap-2 px-5 pt-3 pb-1 border-b border-white/5 bg-zinc-900/50">
                                    <button
                                        type="button"
                                        onClick={() => setModalTab("sagas")}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all",
                                            modalTab === "sagas"
                                                ? "bg-white/15 text-white shadow-sm"
                                                : "text-zinc-400 hover:text-zinc-200"
                                        )}
                                    >
                                        Sagas & Episodios ({collectionMap.get(selectedSeries.tmdbId)?.count || 0}/{selectedSeries.totalEpisodes})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalTab("movies")}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all",
                                            modalTab === "movies"
                                                ? "bg-white/15 text-white shadow-sm"
                                                : "text-zinc-400 hover:text-zinc-200"
                                        )}
                                    >
                                        Películas ({selectedSeries.movies.filter(m => detectedMovieIds.has(m.tmdbId)).length}/{selectedSeries.movies.length})
                                    </button>
                                </div>
                            )}

                            {/* Content List: Sagas or Movies */}
                            <div className="p-5 overflow-y-auto space-y-2.5 max-h-[60vh]">
                                {modalTab === "sagas" && selectedSeries.sagas && selectedSeries.sagas.length > 0 ? (
                                    selectedSeries.sagas.map((saga) => {
                                        const sagaTotal = saga.endEp - saga.startEp + 1
                                        const colCount = collectionMap.get(selectedSeries.tmdbId)?.count || 0
                                        const sagaCompleted = colCount >= saga.endEp

                                        return (
                                            <div
                                                key={saga.id}
                                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all gap-4 overflow-hidden"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {/* Saga Artwork Thumbnail */}
                                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0">
                                                        <img
                                                            src={saga.image}
                                                            alt={saga.name}
                                                            onError={(e) => {
                                                                e.currentTarget.src = selectedSeries.officialPoster
                                                            }}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <h5 className="text-xs font-bold text-white truncate">
                                                            {saga.name}
                                                        </h5>
                                                        <span className="text-[11px] font-mono text-on-surface-variant/70">
                                                            Eps {saga.startEp} - {saga.endEp} ({sagaTotal} caps)
                                                        </span>
                                                    </div>
                                                </div>

                                                <span
                                                    className={cn(
                                                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider shrink-0",
                                                        sagaCompleted
                                                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                                            : colCount >= saga.startEp
                                                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                                            : "bg-white/5 text-on-surface-variant/60"
                                                    )}
                                                >
                                                    {sagaCompleted ? "COMPLETA" : colCount >= saga.startEp ? "EN PROGRESO" : "PENDIENTE"}
                                                </span>
                                            </div>
                                        )
                                    })
                                ) : (modalTab === "movies" || selectedSeries.type === "MOVIES") && selectedSeries.movies && selectedSeries.movies.length > 0 ? (
                                    selectedSeries.movies.map((movie) => {
                                        const isDetected = detectedMovieIds.has(movie.tmdbId)
                                        const movieDetails = movieDetailsMap.get(movie.tmdbId)

                                        return (
                                            <div
                                                key={movie.id}
                                                className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all gap-4 overflow-hidden",
                                                    isDetected
                                                        ? "bg-white/[0.03] border-white/15"
                                                        : "bg-white/[0.01] border-white/5 opacity-60"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-black/50 border border-white/10 shrink-0">
                                                        <img
                                                            src={movieDetails?.poster || selectedSeries.officialPoster}
                                                            alt={movie.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 uppercase">
                                                                {movie.type}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-zinc-400">
                                                                {movie.year}
                                                            </span>
                                                        </div>
                                                        <h5 className="text-xs font-bold text-white truncate mt-0.5">
                                                            {movie.title}
                                                        </h5>
                                                    </div>
                                                </div>

                                                <span
                                                    className={cn(
                                                        "px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider shrink-0 flex items-center gap-1",
                                                        isDetected
                                                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                                            : "bg-zinc-900 text-zinc-500 border border-white/5"
                                                    )}
                                                >
                                                    {isDetected ? (
                                                        <>
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                            DETECTADA
                                                        </>
                                                    ) : (
                                                        "NO DETECTADA"
                                                    )}
                                                </span>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <p className="text-center text-on-surface-variant/60 py-8 text-xs font-mono">
                                        No hay información disponible para esta sección.
                                    </p>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-3.5 bg-white/[0.02] border-t border-white/10 flex items-center justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSelectedSeries(null)}
                                    className="px-4 py-1.5 rounded-xl font-bold text-xs bg-white/10 text-white hover:bg-white/15 transition-colors cursor-pointer"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
