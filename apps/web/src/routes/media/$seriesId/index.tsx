import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useMemo, useCallback, useRef } from "react"
import { Virtuoso } from "react-virtuoso"
import { useGetAnimeEntry } from "@/api/hooks/anime_entries.hooks"
import { useListOnlinestreamProviderExtensions } from "@/api/hooks/extensions.hooks"
import { LoadingOverlayWithLogo } from "@/components/shared/loading-overlay-with-logo"
import { SourcePicker } from "@/components/shared/source-picker"
import { VideoPlayer } from "@/components/video/player"
import { type StreamSource } from "@/components/ui/stream-source-card"
import {
    ArrowLeft,
    Star,
    Play,
    HardDrive,
    Zap,
    Cpu,
    MonitorPlay,
    Clock,
    Calendar,
    Settings2,
    Users,
    Film,
    CheckCircle2,
    SkipForward
} from "lucide-react"
import { cn } from "@/components/ui/core/styling"
import type { Anime_Entry, Anime_Episode, Models_LibraryMedia, Mediastream_StreamType } from "@/api/generated/types"

export const Route = createFileRoute("/media/$seriesId/")({
    component: MediaDetailPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTitle(media: Models_LibraryMedia): string {
    return media.titleEnglish || media.titleRomaji || media.titleOriginal || "Sin título"
}

function fmtDuration(minutes?: number): string {
    if (!minutes) return "24 min"
    return `${minutes} min`
}

// ─── Extended StreamSource with local metadata ─────────────────────────────
interface RealStreamSource extends StreamSource {
    _localPath?: string
    _streamType?: Mediastream_StreamType | "online"
    _onlineProvider?: string
}

function buildSourcesForEpisode(ep: Anime_Episode, onlineExts?: any[]): RealStreamSource[] {
    const sources: RealStreamSource[] = []

    if (ep.isDownloaded && ep.localFile?.path) {
        const path = ep.localFile.path
        const filename = path.split(/[/\\]/).pop() ?? path
        sources.push(
            {
                id: `local-${ep.episodeNumber}-direct`,
                type: "local",
                label: filename,
                quality: "1080p",
                info: "Archivo local · Reproducción directa",
                codec: "Nativo",
                _localPath: path,
                _streamType: "direct",
            },
            {
                id: `local-${ep.episodeNumber}-transcode`,
                type: "local",
                label: `${filename}`,
                quality: "1080p",
                info: "HLS · Transcodificado por el servidor",
                codec: "H.264 HLS",
                _localPath: path,
                _streamType: "transcode",
            }
        )
    }

    if (onlineExts && onlineExts.length > 0) {
        onlineExts.forEach(ext => {
            sources.push({
                id: `online-${ep.episodeNumber}-${ext?.id}`,
                type: "direct",
                label: ext?.name || "Web Stream",
                quality: "1080p",
                info: ext?.language ? `Stream Online (${ext.language})` : "Stream Online",
                codec: "Web",
                _streamType: "online",
                _onlineProvider: ext?.id,
            })
        })
    }

    if (sources.length === 0) {
        return []
    }

    return sources
}

// ─── Error Banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ message, onBack }: { message: string; onBack: () => void }) {
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
            <div className="flex flex-col items-center gap-4 max-w-md text-center">
                <span className="text-5xl animate-bounce select-none">💥</span>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                    Error al cargar el contenido
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed">{message}</p>
                <div className="flex gap-3 mt-2">
                    <button
                        onClick={onBack}
                        className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all"
                    >
                        ← Volver
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm
                                   transition-all active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function MediaDetailPage() {
    const { seriesId } = Route.useParams() as any
    const navigate = useNavigate()

    const { data: entry, isLoading, error } = useGetAnimeEntry(seriesId)
    const { data: onlineExtensions } = useListOnlinestreamProviderExtensions()

    const onBack = () => navigate({ to: "/home" })

    // Orchestrator State
    const [marathonSettings, setMarathonSettings] = useState({
        enabled: false,
        skipIntros: true,
        autoPlayNext: true,
        skipFillers: false
    })
    const [isPlayerOpen, setIsPlayerOpen] = useState(false)
    const [playTarget, setPlayTarget] = useState<{
        path: string
        streamType: Mediastream_StreamType | "online"
        onlineProvider?: string
        episodeLabel: string
        episodeNumber: number
        seriesId: number
    } | null>(null)

    // SourcePicker Modal State
    const [sourcePickerEp, setSourcePickerEp] = useState<Anime_Episode | null>(null)
    const sourcePickerSources = useMemo(
        () => sourcePickerEp ? buildSourcesForEpisode(sourcePickerEp, onlineExtensions) : [],
        [sourcePickerEp, onlineExtensions]
    )

    // Playback Logic
    const handlePlayEpisode = useCallback((ep: Anime_Episode, preferredSource?: RealStreamSource) => {
        const sources = preferredSource ? [preferredSource] : buildSourcesForEpisode(ep, onlineExtensions)
        const src = sources[0]
        if (!src) return

        setPlayTarget({
            path: src._localPath ?? "hybrid",
            streamType: src._streamType ?? "online",
            onlineProvider: src._onlineProvider,
            episodeLabel: ep.displayTitle || ep.episodeTitle || `Ep. ${ep.episodeNumber}`,
            episodeNumber: ep.episodeNumber,
            seriesId: Number(seriesId)
        })
        setIsPlayerOpen(true)
    }, [onlineExtensions, seriesId])

    const handleEpisodeClick = useCallback((ep: Anime_Episode) => {
        const sources = buildSourcesForEpisode(ep, onlineExtensions)
        if (sources.length > 1) {
            setSourcePickerEp(ep)
        } else if (sources.length === 1) {
            handlePlayEpisode(ep, sources[0])
        }
    }, [onlineExtensions, handlePlayEpisode])

    const handleNextEpisode = useCallback(() => {
        if (!entry || !entry.episodes || !playTarget) return
        const nextEp = entry.episodes.find(e => e.episodeNumber === playTarget.episodeNumber + 1)
        if (nextEp) handlePlayEpisode(nextEp)
        else setIsPlayerOpen(false) // Series finished
    }, [entry, playTarget, handlePlayEpisode])


    if (isLoading) return <LoadingOverlayWithLogo />
    if (error) return <ErrorBanner message={error instanceof Error ? error.message : "Error"} onBack={onBack} />
    if (!entry || !entry.media) return <ErrorBanner message="Contenido no encontrado" onBack={onBack} />

    const episodes = entry.episodes ?? []
    const media = entry.media

    // Compute Smart Status (% Local vs Remote)
    const downloadedCount = episodes.filter(e => e.isDownloaded).length
    const downloadPercent = episodes.length > 0 ? Math.round((downloadedCount / episodes.length) * 100) : 0
    
    const watchProgress = entry.listData?.progress || 0
    const maxEpisodes = media.totalEpisodes || episodes.length || 1
    const watchPercent = Math.min(100, Math.round((watchProgress / maxEpisodes) * 100))
    
    // Find Next Episode to Resume
    const resumeEp = typeof watchProgress === 'number' && watchProgress < maxEpisodes 
        ? episodes.find(e => e.episodeNumber === watchProgress + 1) || episodes[0]
        : episodes[0]

    return (
        <div className="relative min-h-screen bg-zinc-950 text-white selection:bg-orange-500/30 font-sans">
            
            {/* ── 1. Cinematic Hero Header ── */}
            <div className="absolute top-0 inset-x-0 h-[85vh] -z-10 pointer-events-none">
                <img 
                    src={media.bannerImage || media.posterImage} 
                    alt="" 
                    className="w-full h-full object-cover opacity-60 mix-blend-screen"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/40 to-transparent" />
            </div>

            <header className="px-6 md:px-12 py-8 relative z-20">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest drop-shadow-md group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Volver a Inicio
                </button>
            </header>

            <main className="px-6 md:px-12 lg:px-20 pt-10 pb-32 max-w-[1600px] mx-auto">
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
                    
                    {/* Left Meta Column */}
                    <div className="flex-1 max-w-2xl flex flex-col gap-5">
                        <div className="flex flex-col gap-1">
                            <span className="text-orange-500 text-xs font-black uppercase tracking-[0.2em] drop-shadow-md">
                                {media.format}
                            </span>
                            <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tight text-pretty drop-shadow-xl">
                                {getTitle(media)}
                            </h1>
                            
                            {/* Global Progress */}
                            {maxEpisodes > 1 && (
                                <div className="flex items-center gap-3 mt-4 max-w-md">
                                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
                                        <div className="h-full bg-orange-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${watchPercent}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-zinc-400 whitespace-nowrap">{watchProgress} / {maxEpisodes} eps vistos</span>
                                </div>
                            )}
                        </div>

                        {/* Badges / Meta row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-zinc-300">
                            {media.score > 0 && (
                                <span className="flex items-center gap-1.5 text-amber-400">
                                    <Star className="w-4 h-4 fill-amber-400" />
                                    {(media.score / 10).toFixed(1)}
                                </span>
                            )}
                            {media.year > 0 && <span>{media.year}</span>}
                            <span>{media.totalEpisodes} Eps</span>
                            {/* Smart Status Pill */}
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                                {downloadPercent === 100 ? (
                                    <><HardDrive className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400 text-xs">100% Local</span></>
                                ) : (
                                    <><Zap className="w-3.5 h-3.5 text-amber-400" /> <span className="text-amber-400 text-xs">{downloadPercent}% Local</span></>
                                )}
                            </span>
                        </div>

                        {/* Genres */}
                        {media.genres && media.genres.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                                {media.genres.map(g => (
                                    <span key={g} className="px-3 py-1 text-[11px] font-bold uppercase tracking-widest rounded-md bg-zinc-900/60 backdrop-blur-md text-zinc-300 border border-white/5">
                                        {g}
                                    </span>
                                ))}
                            </div>
                        )}

                        <p className="text-zinc-400 text-sm md:text-base leading-relaxed mt-2 max-w-xl">
                            {media.description || "Sin descripción disponible."}
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-wrap items-center gap-4 mt-4">
                            <button
                                onClick={() => resumeEp && handleEpisodeClick(resumeEp)}
                                className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white min-h-[52px] px-8 rounded-xl font-bold text-sm transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)] active:scale-95"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                {watchProgress > 0 && watchProgress < maxEpisodes ? `Continuar (Ep. ${resumeEp?.episodeNumber})` : "Reproducir"}
                            </button>
                        </div>

                        {/* Marathon Control Center */}
                        <div className="mt-6 p-4 rounded-xl bg-zinc-900/60 border border-white/5 backdrop-blur-md flex flex-col gap-4 max-w-xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <MonitorPlay className="w-4 h-4 text-amber-500" />
                                    Marathon Control Center
                                </h3>
                                <button
                                    onClick={() => setMarathonSettings(s => ({ ...s, enabled: !s.enabled }))}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-xs font-bold transition-all",
                                        marathonSettings.enabled ? "bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-white/10 text-zinc-400 hover:bg-white/20"
                                    )}
                                >
                                    {marathonSettings.enabled ? "ON" : "OFF"}
                                </button>
                            </div>
                            {marathonSettings.enabled && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-white/5">
                                    {[
                                        { key: 'skipIntros', label: 'Saltar Intros', icon: <SkipForward className="w-3 h-3" /> },
                                        { key: 'autoPlayNext', label: 'Auto-Play', icon: <Play className="w-3 h-3" /> },
                                        { key: 'skipFillers', label: 'Saltar Relleno', icon: <CheckCircle2 className="w-3 h-3" /> }
                                    ].map((opt) => (
                                        <button
                                            key={opt.key}
                                            onClick={() => setMarathonSettings(s => ({ ...s, [opt.key]: !(s as any)[opt.key] }))}
                                            className={cn(
                                                "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border",
                                                (marathonSettings as any)[opt.key] ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-zinc-800/50 border-white/5 text-zinc-500 hover:bg-zinc-800"
                                            )}
                                        >
                                            {opt.icon}
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Tech Specs Panel */}
                    <aside className="w-full lg:w-72 flex flex-col gap-4">
                        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-md flex flex-col gap-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <Settings2 className="w-4 h-4" />
                                Especificaciones
                            </h3>
                            
                            <div className="flex flex-col gap-2 border-b border-white/5 pb-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">Library Health</span>
                                    <span className={cn("font-bold text-xs", downloadPercent === 100 ? "text-emerald-400" : downloadPercent > 50 ? "text-amber-400" : "text-zinc-500")}>
                                        {downloadPercent}% Local
                                    </span>
                                </div>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full transition-all", downloadPercent === 100 ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${downloadPercent}%` }} />
                                </div>
                            </div>
                            
                            {((media as any).studios?.nodes && (media as any).studios.nodes.length > 0) && (
                                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                                    <span className="text-zinc-400">Estudio</span>
                                    <span className="font-bold text-zinc-200 text-right max-w-[120px] truncate" title={(media as any).studios.nodes[0].name}>
                                        {(media as any).studios.nodes[0].name}
                                    </span>
                                </div>
                            )}
                            
                            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                                <span className="text-zinc-400">Origen</span>
                                <span className="font-bold text-orange-400">{downloadPercent > 50 ? "HDD Local" : "Torrentio"}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                                <span className="text-zinc-400">Calidad Max</span>
                                <span className="font-bold text-zinc-200">1080p BD</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                                <span className="text-zinc-400">Video</span>
                                <span className="font-bold text-zinc-200">H264/HEVC</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400">Audio Tracks</span>
                                <span className="font-bold text-zinc-200">JPN / ENG</span>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* ── 2. Unified Episode Grid (Virtualized) ── */}
                <div className="mt-20 flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <span className="w-1 h-5 rounded-full bg-orange-500" />
                        <h2 className="text-xl font-black text-white tracking-tight">Episodios</h2>
                        <span className="text-xs font-bold text-zinc-500 ml-2 px-2 py-0.5 rounded-md bg-zinc-900">
                            {episodes.length} Totales
                        </span>
                    </div>

                    <div className="w-full h-[600px] border border-white/5 rounded-2xl bg-zinc-900/20 backdrop-blur-md overflow-hidden relative">
                        {/* 
                            Used Virtuoso instead of mapping over 100s of elements directly.
                            ItemContent expects (index, itemData). 
                        */}
                        <Virtuoso
                            style={{ height: '100%', width: '100%' }}
                            // The margin right is required for the scrollbar visually in windows
                            className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-2"
                            data={episodes}
                            itemContent={(_, ep) => {
                                // Intelligence Styling
                                const intel = (ep.episodeMetadata as any)?.Intel
                                const isEpic = intel?.Tag === "EPIC"
                                const isFiller = intel?.Tag === "FILLER"
                                
                                return (
                                    <div className="px-4 py-2">
                                        <div 
                                            className={cn(
                                                "group flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-3 rounded-xl transition-all cursor-pointer relative overflow-hidden",
                                                "bg-zinc-900/40 hover:bg-zinc-800/80 border",
                                                isEpic ? "border-amber-500/50 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "border-white/5",
                                                isFiller ? "grayscale opacity-50 hover:opacity-100 transition-opacity" : ""
                                            )}
                                            onClick={() => handleEpisodeClick(ep)}
                                        >
                                            {/* Thumbnail */}
                                            <div className="relative w-full sm:w-48 aspect-video shrink-0 rounded-lg overflow-hidden bg-zinc-950">
                                                {ep.episodeMetadata?.image ? (
                                                    <img src={ep.episodeMetadata.image} alt={ep.displayTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                                                        <MonitorPlay className="w-6 h-6" />
                                                    </div>
                                                )}
                                                
                                                {isFiller && (
                                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-black/80 text-zinc-400 border border-white/10 backdrop-blur-md shadow-md z-10">
                                                        Relleno
                                                    </div>
                                                )}
                                                
                                                {/* Play Overlay */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/40">
                                                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                                    </div>
                                                </div>

                                                {/* Hybrid Badge */}
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    {isEpic && (
                                                        <span className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                                                            <Star className="w-3 h-3 fill-current" />
                                                        </span>
                                                    )}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setSourcePickerEp(ep); }}
                                                        className="w-5 h-5 rounded-md bg-zinc-900/80 backdrop-blur text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                                                        title={ep.isDownloaded ? "Archivo Local" : "Streaming Remoto"}
                                                    >
                                                        {ep.isDownloaded ? <HardDrive className="w-3 h-3" /> : <Zap className="w-3 h-3 text-amber-400" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 flex flex-col justify-center gap-1.5 py-1 min-w-0">
                                                <div className="flex items-center justify-between gap-4">
                                                    <h4 className={cn(
                                                        "text-sm font-bold truncate",
                                                        isEpic ? "text-amber-400" : "text-zinc-200"
                                                    )}>
                                                        {ep.episodeNumber}. {ep.displayTitle || ep.episodeTitle || `Episodio ${ep.episodeNumber}`}
                                                    </h4>
                                                    <span className="text-[10px] font-mono text-zinc-500 shrink-0 tabular-nums">
                                                        {fmtDuration(ep.episodeMetadata?.length)}
                                                    </span>
                                                </div>
                                                
                                                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed max-w-2xl">
                                                    {ep.episodeMetadata?.summary || ep.episodeMetadata?.overview || "No hay sinopsis."}
                                                </p>
                                                
                                                {/* Intelligence Tags */}
                                                <div className="flex items-center gap-2 mt-auto pt-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                                                        {(ep.episodeMetadata as any)?.Intel?.ArcName || "Canon"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }}
                        />
                    </div>
                </div>
            </main>

            {/* ── Source Picker Modal ── */}
            {sourcePickerEp && (
                <SourcePicker 
                    response={{ 
                        id: String(media.id),
                        title: getTitle(media),
                        availabilityType: "hybrid",
                        sources: sourcePickerSources as any 
                    } as any}
                    onSelect={(src: any) => {
                        setSourcePickerEp(null)
                        handlePlayEpisode(sourcePickerEp, src)
                    }}
                    onClose={() => setSourcePickerEp(null)}
                />
            )}

            {/* ── Video Player Modal ── */}
            {isPlayerOpen && playTarget && (
                <VideoPlayer
                    streamUrl={playTarget.path}
                    streamType={playTarget.streamType === "online" ? "direct" : playTarget.streamType as Mediastream_StreamType}
                    title={getTitle(media)}
                    episodeLabel={playTarget.episodeLabel}
                    mediaId={Number(playTarget.seriesId)}
                    episodeNumber={playTarget.episodeNumber}
                    isExternalStream={playTarget.streamType === "online"}
                    marathonMode={marathonSettings.enabled && marathonSettings.autoPlayNext}
                    onNextEpisode={handleNextEpisode}
                    onClose={() => setIsPlayerOpen(false)}
                />
            )}
        </div>
    )
}
