import { Modal } from "@/components/ui/modal"
import { useTMDBSearch } from "@/api/hooks/tmdb.hooks"
import { useAnimeEntryManualMatch } from "@/api/hooks/anime_entries.hooks"
import { useState, useEffect } from "react"
import { Icons } from "@/components/ui/icons"

interface ManualMatchModalProps {
    isOpen: boolean
    onClose: () => void
    directoryPath?: string
    currentMediaId?: number
}

export function ManualMatchModal({ isOpen, onClose, directoryPath }: ManualMatchModalProps) {
    const [query, setQuery] = useState("")
    const [searchType, setSearchType] = useState<"multi" | "tv" | "movie">("multi")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 500)
        return () => clearTimeout(t)
    }, [query])
    
    const { data: results, isLoading } = useTMDBSearch(debouncedQuery, searchType)
    const { mutateAsync: manualMatch, isPending } = useAnimeEntryManualMatch()
    const [selectedId, setSelectedId] = useState<number | null>(null)

    // El backend solo lee mediaId/paths (ver HandleAnimeEntryManualMatch); el tipo de media
    // se infiere del lado del server, por eso no viaja en el payload.
    const handleMatch = async (mediaId: number) => {
        if (!directoryPath) return
        setSelectedId(mediaId)
        try {
            await manualMatch({
                paths: [directoryPath],
                mediaId,
            })
            onClose()
        } catch (error) {
            console.error("Failed to match", error)
        } finally {
            setSelectedId(null)
        }
    }

    const isSearchActive = debouncedQuery.length >= 2

    return (
        <Modal 
            open={isOpen} 
            onOpenChange={onClose} 
            title="Fix Match" 
            description="Search for the correct series or movie to link it to your local files."
            contentClass="max-w-2xl bg-surface-container text-on-surface border-outline-variant"
        >
            <div className="mt-4 space-y-4">
                <div className="relative">
                    <Icons.navigation.search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60" />
                    <input
                        type="text"
                        placeholder="Buscar metadatos en TMDB..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        // text-base en mobile: iOS Safari hace zoom al enfocar cualquier
                        // input por debajo de 16px. El tamaño de desktop no cambia.
                        className="w-full bg-surface border border-outline-variant pl-12 pr-4 py-4 text-base md:text-sm focus:border-brand-accent/50 focus:outline-none focus:ring-0 transition-all placeholder:text-on-surface-variant/40 font-bold uppercase tracking-widest text-on-surface"
                    />
                </div>

                <div className="flex gap-2 pb-2 border-b border-outline-variant/30">
                    {[
                        { id: "multi", label: "TODO", icon: Icons.navigation.search },
                        { id: "tv", label: "SERIES", icon: Icons.navigation.tv },
                        { id: "movie", label: "PELÍCULAS", icon: Icons.navigation.film }
                    ].map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setSearchType(type.id as "multi" | "tv" | "movie")}
                            className={`flex items-center gap-2 px-4 py-2 text-label-sm font-black tracking-widest transition-all border rounded-pill ${
                                searchType === type.id 
                                ? "bg-brand-accent text-on-primary border-brand-accent" 
                                : "bg-transparent text-on-surface-variant border-outline-variant/50 hover:border-outline-variant"
                            }`}
                        >
                            <type.icon className="w-3 h-3" />
                            {type.label}
                        </button>
                    ))}
                </div>

                    <div className="max-h-96 flex flex-col gap-2 overflow-y-auto px-1 py-1">
                        {isLoading ? (
                            <div className="flex h-32 items-center justify-center">
                                <Icons.ui.spinner className="h-6 w-6 animate-spin text-brand-accent" />
                            </div>
                        ) : isSearchActive && (!results || results.length === 0) ? (
                            <div className="flex h-32 items-center justify-center text-on-surface-variant/50">
                                No se encontraron resultados.
                            </div>
                        ) : (
                            results?.map((result) => (
                                <div
                                    key={`${result.media_type}-${result.id}`}
                                    className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 bg-surface-container-low border border-outline-variant/50 hover:border-brand-accent/30 transition-all duration-base rounded-container"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-24 h-36 shrink-0 bg-surface overflow-hidden border border-outline-variant/50 group-hover:border-brand-accent/30 transition-colors shadow-elevation-2">
                                        {result.poster_path ? (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w185${result.poster_path}`}
                                                alt={result.title || result.name}
                                                className="h-full w-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-slow scale-105 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-20">
                                                <Icons.navigation.search className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Info */}
                                    <div className="flex-1 flex flex-col min-w-0 py-1">
                                        <div className="flex items-center flex-wrap gap-3 mb-2">
                                            <h4 className="text-sm font-black text-on-surface uppercase tracking-widest truncate max-w-[300px]">
                                                {result.title || result.name}
                                            </h4>
                                            {result.vote_average !== undefined && result.vote_average > 0 && (
                                                <div className="px-1.5 py-0.5 bg-brand-accent text-on-primary text-label-sm font-black rounded-md flex items-center gap-1">
                                                    <span className="text-caption leading-none">★</span>
                                                    {result.vote_average.toFixed(1)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-label-sm font-black text-on-surface-variant uppercase tracking-ultra mb-3">
                                            <span className="text-on-surface-variant/80">
                                                {result.release_date?.split("-")[0] || result.first_air_date?.split("-")[0] || "????"}
                                            </span>
                                            <span className="w-1 h-1 bg-outline-variant rounded-full" />
                                            <div className="flex items-center gap-2">
                                                {result.media_type === "movie" ? <Icons.navigation.film className="w-3 h-3 text-brand-accent" /> : <Icons.navigation.tv className="w-3 h-3 text-brand-accent" />}
                                                <span className="text-on-surface-variant">
                                                    {result.media_type === "movie" ? "Película" : "Serie"}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-caption text-on-surface-variant/60 line-clamp-2 leading-relaxed font-medium italic opacity-80 group-hover:opacity-100 transition-opacity">
                                            {result.overview || "No synopsis available for this title."}
                                        </p>
                                    </div>

                                    {/* Action */}
                                    <button
                                        onClick={() => handleMatch(result.id)}
                                        disabled={isPending || !directoryPath}
                                        className="w-full sm:w-auto mt-4 sm:mt-0 bg-brand-accent px-8 py-3 text-label-sm font-black uppercase tracking-cinema text-on-primary transition-all hover:brightness-110 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 rounded-pill"
                                    >
                                        {isPending && selectedId === result.id ? (
                                            <Icons.ui.spinner className="h-4 w-4 animate-spin" />
                                        ) : (
                                            "VINCULAR"
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
        </Modal>
    )
}
