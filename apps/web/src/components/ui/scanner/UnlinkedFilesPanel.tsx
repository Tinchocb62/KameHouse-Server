import React, { useState } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
    LucideLink, LucideSearch,
    LucideCheck, LucideChevronDown, LucideChevronUp,
    LucideLoader2, LucideFileVideo,
} from "lucide-react"
import { cn } from "@/components/ui/core/styling"
import { useGetUnlinkedFiles, useResolveUnlinkedFile } from "@/api/hooks/unlinked.hooks"
import { useTMDBSearch, TMDBResult } from "@/api/hooks/tmdb.hooks"

interface GhostFile {
    id: number
    path: string
    originalTitle: string
    algorithmScore: number
    targetMediaId: number
    userResolved: boolean
    ghostMatchCount: number
}

function useUnlinkedFilesData() {
    const query = useGetUnlinkedFiles()
    return {
        ...query,
        data: query.data as GhostFile[] | undefined,
    }
}

function useResolveUnlinkedFileAction() {
    const mutation = useResolveUnlinkedFile()
    return {
        ...mutation,
        mutate: (variables: { path: string; targetMediaId: number }) => {
            mutation.mutate(variables, {
                onSuccess: () => {
                    toast.success("Archivo vinculado correctamente. Se aplicará en el próximo escaneo.")
                },
                onError: () => {
                    toast.error("Error al vincular el archivo")
                },
            })
        },
    }
}

// ── Components ────────────────────────────────────────────────────────────────

const FileCard = React.forwardRef<HTMLDivElement, { file: GhostFile }>(function FileCard({ file }, ref) {
    const [expanded, setExpanded] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchType, setSearchType] = useState<"multi" | "tv" | "movie">("multi")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null)
    const { data: results = [], isFetching } = useTMDBSearch(debouncedQuery, searchType)
    const resolve = useResolveUnlinkedFileAction()

    const filename = file.path.split(/[\\/]/).pop() ?? file.path
    const confidence = Math.round(file.algorithmScore * 100)

    const handleSearch = (v: string) => {
        setSearchQuery(v)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => setDebouncedQuery(v), 450)
    }

    const handleLink = (result: TMDBResult) => {
        resolve.mutate({ path: file.path, targetMediaId: result.id })
        setExpanded(false)
    }

    if (file.userResolved) return null

    return (
        <motion.div
            ref={ref}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="liquid-glass-frosted liquid-glass-frosted-interactive rounded-2xl overflow-hidden group"
        >
            {/* ─── Header row ─── */}
            <button
                type="button"
                onClick={() => {
                    setExpanded(e => !e)
                    if (!expanded && !debouncedQuery) {
                        const base = filename.replace(/\.[^.]+$/, "").split(/\s+\(?\d{4}\)?/)[0]
                        setSearchQuery(base)
                        setDebouncedQuery(base)
                    }
                }}
                className="w-full flex items-center gap-6 px-8 py-6 text-left hover:bg-white/[0.01] transition-all"
            >
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                    <LucideFileVideo size={20} className="text-zinc-400 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-base font-bold text-zinc-100 truncate group-hover:text-white transition-colors">{filename}</p>
                    <p className="text-xs font-mono text-zinc-500 truncate">{file.path}</p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Confianza</span>
                        <span className={cn(
                            "text-xs font-black px-2.5 py-0.5 border font-mono rounded-lg",
                            confidence >= 70 ? "border-[#ff6b00]/30 bg-[#ff6b00]/10 text-[#ff6b00]" : "border-white/5 bg-white/5 text-zinc-400"
                        )}>
                            {confidence}%
                        </span>
                    </div>
                    <div className="w-10 h-10 flex items-center justify-center border border-white/5 rounded-xl group-hover:border-white/20 transition-all">
                        {expanded ? <LucideChevronUp size={18} className="text-zinc-400" /> : <LucideChevronDown size={18} className="text-zinc-400" />}
                    </div>
                </div>
            </button>

            {/* ─── Expanded search ─── */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden border-t border-white/[0.04] bg-black/20"
                    >
                        <div className="p-8 space-y-6">
                            {/* Search bar & Type Toggles */}
                            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                                <div className="relative flex-1">
                                    <LucideSearch size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => handleSearch(e.target.value)}
                                        placeholder="Buscar en TMDB..."
                                        className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-14 pr-12 py-3.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-white/20 focus:bg-white/[0.04] transition-all font-bold uppercase tracking-wider"
                                    />
                                    {isFetching && (
                                        <LucideLoader2 size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin" />
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {([
                                        { id: "multi", label: "TODO" },
                                        { id: "tv", label: "SERIES" },
                                        { id: "movie", label: "PELÍCULAS" }
                                    ] as const).map((type) => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setSearchType(type.id)}
                                            className={`px-4 py-2 text-[10px] font-black tracking-[0.1em] transition-all border rounded-xl ${
                                                searchType === type.id 
                                                ? "bg-white text-black border-white" 
                                                : "bg-transparent text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300"
                                            }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Results */}
                            {results.length > 0 && (
                                <div className="grid grid-cols-1 gap-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                    {results.slice(0, 10).map(r => {
                                        const year = (r.release_date ?? r.first_air_date ?? "").slice(0, 4)
                                        return (
                                            <button
                                                key={r.id}
                                                type="button"
                                                disabled={resolve.isPending}
                                                onClick={() => handleLink(r)}
                                                className="w-full flex items-center gap-6 p-4 rounded-2xl liquid-glass-frosted-subtle hover:bg-white/[0.04] hover:border-white/12 transition-all text-left group/result relative overflow-hidden"
                                            >
                                                <div className="relative w-16 h-24 shrink-0 overflow-hidden rounded-xl bg-black/40 border border-white/5 group-hover/result:border-white/20 transition-colors">
                                                    {r.poster_path ? (
                                                        <img
                                                            src={`https://image.tmdb.org/t/p/w185${r.poster_path}`}
                                                            alt=""
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover/result:scale-110"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <LucideFileVideo size={20} className="text-zinc-700" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <p className="text-[15px] font-black text-zinc-100 group-hover/result:text-white tracking-wide uppercase truncate max-w-[400px]">
                                                            {r.title ?? r.name}
                                                        </p>
                                                        {r.vote_average !== undefined && r.vote_average > 0 && (
                                                            <span className="px-1.5 py-0.5 rounded bg-[#ff6b00] text-black text-[9px] font-black leading-none">
                                                                ★ {r.vote_average.toFixed(1)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#ff6b00] flex items-center gap-2">
                                                        <span>{r.media_type === "movie" ? "🎬 Película" : "📺 Serie"}</span>
                                                        {year && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                                <span className="text-zinc-500">{year}</span>
                                                            </>
                                                        )}
                                                    </p>
                                                    {r.overview && (
                                                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed font-normal antialiased">
                                                            {r.overview}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="w-10 h-10 rounded-xl border border-white/5 flex items-center justify-center opacity-0 group-hover/result:opacity-100 transition-all shrink-0 hover:bg-white hover:text-black">
                                                    <LucideLink size={16} />
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {debouncedQuery && !isFetching && results.length === 0 && (
                                <div className="py-12 text-center space-y-3">
                                    <LucideSearch size={32} className="text-zinc-800 mx-auto" />
                                    <p className="text-sm text-zinc-600">No se encontraron resultados para &quot;{debouncedQuery}&quot;</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
})

export function UnlinkedFilesPanel() {
    const { data: files = [], isLoading, refetch } = useUnlinkedFilesData()
    const unresolved = files.filter(f => !f.userResolved)

    if (isLoading) return null

    if (unresolved.length === 0) return (
        <div className="flex items-center gap-6 p-8 rounded-3xl liquid-glass-frosted">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
                <LucideCheck size={24} />
            </div>
            <div className="space-y-1">
                <p className="text-lg font-bold text-white tracking-tight uppercase">Librería Impecable</p>
                <p className="text-xs text-zinc-500 font-medium">Todos los archivos han sido identificados y vinculados correctamente al catálogo.</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-8">
            {/* ─── Header Bento ─── */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 rounded-3xl liquid-glass-frosted relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#ff6e3a]/5 rounded-full blur-[60px] pointer-events-none" />
                
                <div className="flex items-center gap-6">
                    <div className="font-display text-7xl text-[#ff6e3a] leading-none select-none tracking-wider shrink-0 bg-[#ff6e3a]/5 border border-[#ff6e3a]/20 px-5 py-2.5 rounded-2xl shadow-[0_0_15px_rgba(255,110,58,0.1)] font-bold">
                        {unresolved.length}
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white tracking-tight uppercase font-display flex items-center gap-2">
                            <span>VINCULACIÓN PENDIENTE</span>
                            <span className="w-2 h-2 rounded-full bg-[#ff6e3a] animate-pulse shadow-[0_0_6px_#ff6e3a]" />
                        </p>
                        <p className="text-zinc-500 text-xs font-mono max-w-md mt-1 leading-relaxed">
                            El motor de KameHouse no pudo emparejar automáticamente {unresolved.length === 1 ? "este archivo huérfano" : "estos archivos huérfanos"}. Requieren resolución manual.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white px-6 py-4 rounded-xl transition-all active:scale-[0.98] shrink-0 self-stretch md:self-auto flex items-center justify-center gap-2"
                >
                    Refrescar Lista
                </button>
            </div>

            {/* ─── File list ─── */}
            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                    {unresolved.map(f => <FileCard key={f.path} file={f} />)}
                </AnimatePresence>
            </div>
        </div>
    )
}
