import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useGlobalSearch } from "@/hooks/use-global-search"
import { Link } from "@tanstack/react-router"
import { Loader2, FileVideo } from "lucide-react"
import { useEffect, useState } from "react"
import { VideoPlayer } from "@/components/video/player"
import type { IntelligentEntry } from "@/api/types/intelligence.types"

export interface SyntheticUnlinkedEntry {
    mediaId: string
    isUnlinked: true
    path: string
    media: {
        titleRomaji: string
        titleEnglish: string
        titleOriginal: string
        year: string | number
        format: string
        posterImage: string
        score?: number
    }
    vibes?: string[]
}

type SearchResultItem = (IntelligentEntry & { isUnlinked?: false; path?: string }) | SyntheticUnlinkedEntry

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const { query, setQuery, results, isLoading, isSearchActive } = useGlobalSearch()
    const [playTarget, setPlayTarget] = useState<{ path: string; title: string } | null>(null)

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    return (
        <>
            <CommandDialog 
                open={open} 
                onOpenChange={setOpen} 
                commandProps={{ 
                    label: "Search Command Palette",
                    className: "bg-zinc-950/60 backdrop-blur-3xl border-white/5 shadow-[0_32px_128px_rgba(0,0,0,0.8)] rounded-[2rem] overflow-hidden"
                }}
            >
                <div className="p-4 border-b border-white/[0.03] bg-white/[0.01]">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-2 h-2 rounded-full bg-brand-orange shadow-[0_0_8px_rgba(255,110,58,0.5)] animate-pulse" />
                        <CommandInput
                            placeholder="DESCUBRE TU PRÓXIMA SERIE..."
                            className="h-14 font-display text-3xl tracking-[0.1em] placeholder:text-zinc-800 bg-transparent border-none focus:ring-0 text-white"
                            value={query}
                            onValueChange={setQuery}
                        />
                    </div>
                </div>
                <CommandList className="max-h-[60vh] md:max-h-[500px] p-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex h-64 flex-col items-center justify-center gap-6 animate-in fade-in duration-700">
                            <div className="relative">
                                <Loader2 className="h-12 w-12 animate-spin text-brand-orange opacity-50" />
                                <div className="absolute inset-0 h-12 w-12 blur-2xl bg-brand-orange/20" />
                            </div>
                            <span className="font-display text-lg tracking-[0.4em] text-zinc-700 uppercase">Sincronizando Bóveda</span>
                        </div>
                    ) : (
                        <>
                            <CommandEmpty className="py-20 text-center animate-in fade-in zoom-in-95 duration-500">
                                <p className="font-display text-2xl tracking-[0.15em] text-zinc-700 uppercase">Sin coincidencias detectadas</p>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-800 mt-4 px-10 leading-relaxed">Verifica los términos técnicos o expande los criterios de búsqueda</p>
                            </CommandEmpty>
                            <CommandGroup 
                                heading={isSearchActive ? "RESULTADOS ENCONTRADOS" : "TENDENCIAS GLOBALES"}
                                className="text-[10px] font-black tracking-[0.3em] text-zinc-600 px-2 pt-2 pb-4 uppercase"
                            >
                                <div className="grid gap-3 mt-2">
                                    {results?.map((res) => {
                                        const result = res as SearchResultItem
                                        const media = result.media
                                        const title = media?.titleRomaji || media?.titleEnglish || `Desconocido (${result.mediaId})`
                                        
                                        return (
                                            <CommandItem 
                                                key={String(result.mediaId)} 
                                                value={title} 
                                                onSelect={() => {
                                                    setOpen(false)
                                                    if (result.isUnlinked) {
                                                        setPlayTarget({ path: result.path, title })
                                                    }
                                                }}
                                                className="rounded-2xl border border-white/[0.02] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.05] transition-all duration-500 p-0 overflow-hidden group"
                                            >
                                                {result.isUnlinked ? (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            setOpen(false)
                                                            setPlayTarget({ path: result.path, title })
                                                        }}
                                                        className="flex w-full items-center gap-5 p-3 text-left"
                                                    >
                                                        <div className="h-20 w-14 flex-shrink-0 rounded-xl shadow-2xl border border-white/5 group-hover:scale-105 transition-transform duration-500 bg-brand-orange/5 flex items-center justify-center overflow-hidden relative">
                                                            <div className="absolute inset-0 bg-gradient-to-tr from-brand-orange/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            <FileVideo className="h-7 w-7 text-brand-orange group-hover:scale-110 transition-transform duration-500 z-10" />
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden text-left py-1 min-w-0">
                                                            <span className="truncate text-lg font-bold text-zinc-200 group-hover:text-white transition-colors leading-tight" title={title}>
                                                                {title}
                                                            </span>
                                                            <div className="flex items-center gap-3 mt-2">
                                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-md shrink-0">
                                                                    HUÉRFANO
                                                                </span>
                                                                <span className="text-[10px] font-medium text-zinc-600 uppercase truncate tracking-wide">
                                                                    {result.path}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ) : (() => {
                                                        const isMovie = media?.format === "MOVIE" || media?.format === "SPECIAL" || media?.format === "OVA"
                                                        const linkProps = isMovie 
                                                            ? { to: "/movies/$movieId" as const, params: { movieId: result?.mediaId?.toString() || "0" } }
                                                            : { to: "/series/$seriesId" as const, params: { seriesId: result?.mediaId?.toString() || "0" } }

                                                        return (
                                                            <Link {...linkProps} className="flex w-full items-center gap-5 p-3" onClick={() => setOpen(false)}>
                                                                <div
                                                                    className="h-20 w-14 flex-shrink-0 rounded-xl bg-cover bg-center shadow-2xl border border-white/5 group-hover:scale-105 transition-transform duration-500 bg-zinc-900 flex items-center justify-center overflow-hidden relative"
                                                                    style={media?.posterImage ? { backgroundImage: `url(${media.posterImage})` } : {}}
                                                                >
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    {!media?.posterImage && <span className="text-[8px] font-black opacity-20 uppercase tracking-tighter">NO COVER</span>}
                                                                </div>
                                                                <div className="flex flex-col overflow-hidden text-left py-1">
                                                                    <span className="truncate text-lg font-bold text-zinc-200 group-hover:text-white transition-colors leading-tight" title={title}>
                                                                        {title}
                                                                    </span>
                                                                    <div className="flex items-center gap-3 mt-2">
                                                                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                                                                            {media?.year || "N/A"}
                                                                        </span>
                                                                        <div className="w-1 h-1 rounded-full bg-white/10" />
                                                                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-600">
                                                                            {media?.format || "LOCAL"}
                                                                        </span>
                                                                        {media && media.score !== undefined && media.score > 0 && (
                                                                            <>
                                                                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                                                                <span className="text-[10px] font-black text-brand-orange tracking-wider">
                                                                                    ★ {(media.score > 10 ? media.score / 10 : media.score).toFixed(1)}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                        {result.vibes?.map((vibe) => (
                                                                            <span key={vibe} className="text-[8px] font-black tracking-[0.1em] uppercase px-1.5 py-0.5 rounded border border-white/5 bg-white/5 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                                                                {vibe}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        )
                                                    })()}
                                            </CommandItem>
                                        )
                                    })}
                                </div>
                            </CommandGroup>
                        </>
                    )}
                </CommandList>
            </CommandDialog>

            {playTarget && (
                <VideoPlayer
                    streamUrl={playTarget.path}
                    streamType="direct"
                    episodeLabel={playTarget.title}
                    onClose={() => setPlayTarget(null)}
                />
            )}
        </>
    )
}

