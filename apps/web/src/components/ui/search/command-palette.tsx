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
                    className: "glass-liquid glass-refract rounded-corner-lg overflow-hidden"
                }}
            >
                <div className="p-4 border-b border-outline-variant/50" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-variant) 30%, transparent)" }}>
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--glow-primary)] animate-pulse" />
                        <CommandInput
                            placeholder="DESCUBRE TU PRÓXIMA SERIE..."
                            className="h-14 font-bebas text-3xl tracking-[0.1em] placeholder:text-on-surface-variant bg-transparent border-none focus:ring-0 text-on-surface"
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
                            <span className="font-bebas text-lg tracking-[0.4em] text-zinc-700 uppercase">Sincronizando Bóveda</span>
                        </div>
                    ) : (
                        <>
                            <CommandEmpty className="py-20 text-center animate-in fade-in zoom-in-95 duration-500">
                                <p className="font-bebas text-2xl tracking-[0.15em] text-zinc-700 uppercase">Sin coincidencias detectadas</p>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-800 mt-4 px-10 leading-relaxed">Verifica los términos técnicos o expande los criterios de búsqueda</p>
                            </CommandEmpty>
                            <CommandGroup 
heading={isSearchActive ? "RESULTADOS ENCONTRADOS" : "TENDENCIAS GLOBALES"}
                                className="text-[10px] font-black tracking-[0.3em] text-on-surface-variant px-2 pt-2 pb-4 uppercase"
                            >
                                <div className="grid gap-3 mt-2">
                                    {results?.map((res) => {
                                        const result = res as SearchResultItem
                                        const media = result.media
                                        const title = media?.titleRomaji || media?.titleEnglish || `Desconocido (${result.mediaId})`
                                        
                                        return (
                                            <CommandItem
                                                key={String(result.mediaId)}
                                                value={`${title}-${result.mediaId}`}
                                                onSelect={() => {
                                                    setOpen(false)
                                                    if (result.isUnlinked) {
                                                        setPlayTarget({ path: result.path, title })
                                                    }
                                                }}
                                                className="rounded-container border border-outline-variant/50 bg-surface hover:border-outline hover:bg-surface-container transition-all duration-300 p-0 overflow-hidden group"
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
                                                        <div className="h-20 w-14 flex-shrink-0 rounded-lg shadow-elevation-1 border border-outline-variant/50 group-hover:scale-105 transition-transform duration-300 bg-primary/10 flex items-center justify-center overflow-hidden relative">
                                                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            <FileVideo className="h-7 w-7 text-primary group-hover:scale-110 transition-transform duration-300 z-10" />
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden text-left py-1 min-w-0">
                                                            <span className="truncate text-lg font-bold text-on-surface group-hover:text-primary transition-colors leading-tight" title={title}>
                                                                {title}
                                                            </span>
                                                            <div className="flex items-center gap-3 mt-2">
                                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                                                                    HUÉRFANO
                                                                </span>
                                                                <span className="text-[10px] font-medium text-on-surface-variant uppercase truncate tracking-wide">
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
                                                                    className="h-20 w-14 flex-shrink-0 rounded-lg bg-cover bg-center shadow-elevation-1 border border-outline-variant/50 group-hover:scale-105 transition-transform duration-300 bg-surface-variant flex items-center justify-center overflow-hidden relative"
                                                                    style={media?.posterImage ? { backgroundImage: `url(${media.posterImage})` } : {}}
                                                                >
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    {!media?.posterImage && <span className="text-[8px] font-black opacity-20 uppercase tracking-tighter">NO COVER</span>}
                                                                </div>
                                                                <div className="flex flex-col overflow-hidden text-left py-1">
                                                                    <span className="truncate text-lg font-bold text-on-surface group-hover:text-primary transition-colors leading-tight" title={title}>
                                                                        {title}
                                                                    </span>
                                                                    <div className="flex items-center gap-3 mt-2">
                                                                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface-variant">
                                                                            {media?.year || "N/A"}
                                                                        </span>
                                                                        <div className="w-1 h-1 rounded-full bg-outline-variant/50" />
                                                                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface-variant">
                                                                            {media?.format || "LOCAL"}
                                                                        </span>
                                                                        {media && media.score !== undefined && media.score > 0 && (
                                                                            <>
                                                                                <div className="w-1 h-1 rounded-full bg-outline-variant/50" />
                                                                                <span className="text-[10px] font-black text-primary tracking-wider">
                                                                                    ★ {(media.score > 10 ? media.score / 10 : media.score).toFixed(1)}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                        {result.vibes?.map((vibe) => (
                                                                            <span key={vibe} className="text-[8px] font-black tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-full border border-outline-variant/50 bg-surface-variant text-on-surface-variant group-hover:text-on-surface transition-colors">
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

