import { memo, useState } from "react"
import { Play, ListPlus } from "lucide-react"
import { cn } from "@/components/ui/core/styling"
import { DeferredImage } from "@/components/shared/deferred-image"
import { useSound } from "@/hooks/use-sound"
import { getHighResImage, getMediumResImage } from "@/lib/helpers/images"
import { fetchAnimeEntry } from "@/api/hooks/anime_entries.hooks"
import { useAppStore } from "@/lib/store"
import type { Anime_LibraryCollectionEntry, Continuity_WatchHistoryItem } from "@/api/generated/types"

export type EraTab = "all" | "Dragon Ball" | "Dragon Ball Z" | "Dragon Ball Super" | "Dragon Ball GT" | "Especiales y OVAs"

export const ERA_TABS: { value: EraTab; label: string; shortLabel: string; color: string; glow: string }[] = [
    { value: "all", label: "Todas", shortLabel: "Todas", color: "#ff6b00", glow: "rgba(255,107,0,0.3)" },
    { value: "Dragon Ball", label: "Dragon Ball", shortLabel: "DB", color: "#e07030", glow: "rgba(224,112,48,0.3)" },
    { value: "Dragon Ball Z", label: "Dragon Ball Z", shortLabel: "Z", color: "#e74c3c", glow: "rgba(231,76,60,0.3)" },
    { value: "Dragon Ball GT", label: "Dragon Ball GT", shortLabel: "GT", color: "#3498db", glow: "rgba(52,152,219,0.3)" },
    { value: "Dragon Ball Super", label: "Dragon Ball Super", shortLabel: "Super", color: "#9b59b6", glow: "rgba(155,89,182,0.3)" },
    { value: "Especiales y OVAs", label: "Especiales y OVAs", shortLabel: "Esp/OVAs", color: "#1abc9c", glow: "rgba(26,188,156,0.3)" },
]

export function cleanMovieTitle(title: string): string {
    if (!title) return ""
    return title.replace(/^(dragon\s+ball(\s+z|\s+gt|\s+super)?)\s*(:|-)\s*/i, "").trim()
}

export const MovieCard = memo(function MovieCard({
    entry,
    era,
    watchHistoryItem,
    onClick,
    onHoverCard,
}: {
    entry: Anime_LibraryCollectionEntry
    era: EraTab
    watchHistoryItem?: Continuity_WatchHistoryItem | null
    onClick: (id: number) => void
    onHoverCard: (entry: (Anime_LibraryCollectionEntry & { era: EraTab; startedAtTimestamp: number }) | null) => void
}) {
    const { playSound } = useSound()
    const [isHovered, setIsHovered] = useState(false)
    const movie = entry.media
    if (!movie || !entry.mediaId) return null
 
    const handleCardClick = () => {
        onClick(entry.mediaId!)
    }
 
    const eraConfig = ERA_TABS.find(t => t.value === era) || ERA_TABS[0]
    const title = cleanMovieTitle(movie.titleSpanish || movie.titleEnglish || movie.titleRomaji || "Sin título")
    const hasLocalFiles = (entry.libraryData?.mainFileCount || 0) > 0
    const isCompleted = movie.watched || (entry.listData?.progress || 0) >= (movie.totalEpisodes || 1)
 
    const progressTime = watchHistoryItem?.currentTime || 0
    const totalDuration = watchHistoryItem?.duration || 0
    const hasProgress = progressTime > 30 && totalDuration > 0 && progressTime < totalDuration
    const progressPercent = hasProgress ? Math.min(100, (progressTime / totalDuration) * 100) : 0
 
    // Use medium resolution images for grid/card performance
    const posterUrl = getMediumResImage(movie.posterImage || "")
 
    return (
        <div
            className="group relative cursor-pointer flex flex-col transition-all duration-300"
            onClick={handleCardClick}
            onMouseEnter={() => {
                setIsHovered(true)
                onHoverCard({ ...entry, era, startedAtTimestamp: entry.listData?.startedAt ? new Date(entry.listData.startedAt).getTime() : 0 })
                playSound("hover", 0.15)
            }}
            onMouseLeave={() => {
                setIsHovered(false)
                onHoverCard(null)
            }}
        >
            {/* Poster Wrap (Flat style) */}
            <div 
                className={cn(
                    "relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-900 border transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-transform",
                    "group-hover:scale-[1.03] group-hover:-translate-y-1",
                    !hasLocalFiles && "grayscale opacity-45 group-hover:grayscale-0 group-hover:opacity-100",
                )}
                style={{
                    borderColor: isHovered ? eraConfig.color : "rgba(255,255,255,0.06)",
                    boxShadow: isHovered 
                        ? `0 20px 35px -10px rgba(0,0,0,0.85), 0 0 25px ${eraConfig.glow}` 
                        : "0 10px 25px -10px rgba(0,0,0,0.6)",
                }}
            >
                <DeferredImage
                    src={posterUrl}
                    alt={title}
                    className="w-full h-full object-cover transform-gpu transition-transform duration-700 ease-out group-hover:scale-105"
                    showSkeleton={false}
                    fallback={
                        <div
                            className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center"
                            style={{ background: `linear-gradient(135deg, ${eraConfig.color}20, #09090b)` }}
                        >
                            <span className="font-display text-lg tracking-widest text-white/80 line-clamp-3 leading-tight">
                                {title}
                            </span>
                        </div>
                    }
                />
 
                {/* Wear and analog glare textures */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent)] z-20 pointer-events-none" />

                {/* Glass sheen sweep */}
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[inherit]">
                    <div 
                        className={cn(
                            "w-[150%] h-[150%] bg-gradient-to-tr from-transparent via-white/10 to-transparent -rotate-12 absolute -top-[25%] -left-[100%] transition-transform duration-1000 ease-out",
                            isHovered && "translate-x-[150%] translate-y-[10%]"
                        )}
                    />
                </div>
 
                {/* Action buttons (neon play / add queue) */}
                <div 
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 z-30"
                    style={{
                        transition: "opacity 400ms cubic-bezier(0.16, 1, 0.3, 1), transform 400ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                >
                    <div
                        onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                        className="w-11 h-11 rounded-full flex items-center justify-center shadow-2xl active:scale-[0.93] transform-gpu border bg-white text-black border-white cursor-pointer hover:scale-110 transition-transform"
                        style={{ 
                            boxShadow: `0 0 20px ${eraConfig.glow}`,
                        }}
                    >
                        <Play className="size-[18px] fill-current ml-0.5 text-black" />
                    </div>
 
                    {hasLocalFiles && (
                        <div
                            onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                    const fullEntry = await fetchAnimeEntry(String(entry.mediaId));
                                    const localFile = fullEntry?.localFiles?.[0];
                                    if (localFile && localFile.path) {
                                        const epNum = localFile.parsedInfo?.episode || localFile.metadata?.episode || 1;
                                        useAppStore.getState().addToQueue({
                                            id: entry.mediaId!,
                                            title: title,
                                            playableUrl: localFile.path,
                                            thumbnail: getHighResImage(movie.posterImage || ""),
                                            mediaId: entry.mediaId!,
                                            episodeNumber: Number(epNum),
                                            malId: movie.idMal ?? null,
                                            mediaFormat: movie.format ?? "MOVIE"
                                        });
                                        const { toast } = await import("sonner");
                                        toast.success("Añadido a la cola de reproducción");
                                    } else {
                                        const { toast } = await import("sonner");
                                        toast.error("No hay archivos locales.");
                                    }
                                } catch (err) {
                                    console.error(err);
                                }
                            }}
                            className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-white hover:text-black border border-white/10 flex items-center gap-1.5 shadow-2xl text-[8px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer"
                        >
                            <ListPlus className="w-2.5 h-2.5" />
                            <span>Cola</span>
                        </div>
                    )}
                </div>
 
                {/* Sticker de Categoría de Videoclub */}
                <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1 items-start">
                    <span 
                        className="text-[7.5px] font-mono font-black uppercase px-2 py-0.5 rounded shadow-md border bg-black/85 backdrop-blur-sm" 
                        style={{ borderColor: `${eraConfig.color}40`, color: eraConfig.color }}
                    >
                        {eraConfig.shortLabel}
                    </span>
                </div>
 
                {/* Status badges */}
                <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1 z-10">
                    {isCompleted && (
                        <div className="px-1.5 py-0.5 rounded bg-green-500 text-[6.5px] font-black text-white uppercase tracking-wider leading-none shadow-sm">
                            visto
                        </div>
                    )}
                    {!isCompleted && hasProgress && (
                        <div className="px-1.5 py-0.5 rounded bg-brand-orange text-[6.5px] font-black text-white uppercase tracking-wider leading-none shadow-sm">
                            {Math.round(progressPercent)}%
                        </div>
                    )}
                    {!hasLocalFiles && (
                        <div className="px-1.5 py-0.5 rounded bg-zinc-900 text-[6.5px] font-black text-zinc-500 uppercase tracking-wider leading-none shadow-sm border border-white/5">
                            NO LOCAL
                        </div>
                    )}
                </div>
 
                {/* Progress bar */}
                {hasProgress && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-black/40">
                        <div
                            className="h-full transition-all duration-500"
                            style={{ width: `${progressPercent}%`, backgroundColor: eraConfig.color }}
                        />
                    </div>
                )}
            </div>
 
            {/* Title / Info block */}
            <div className="mt-3.5 space-y-1.5 px-1">
                {/* Fixed height and line-clamp-2 keeps titles aligned without shifting layout */}
                <div className="h-9 min-h-[36px] flex flex-col justify-start">
                    <h3 className="font-sans text-[11px] font-bold text-zinc-200 line-clamp-2 uppercase tracking-wide leading-tight group-hover:text-white transition-colors duration-300">
                        {title}
                    </h3>
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 font-medium">
                    <span>AÑO {movie.year || "----"}</span>
                    {movie.runtime && <span className="text-zinc-500/80">{movie.runtime} MIN</span>}
                </div>
            </div>
        </div>
    )
})
MovieCard.displayName = "MovieCard"
