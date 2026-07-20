import React from "react"
import { Models_LibraryMedia } from "@/api/generated/types"
import { useNavigate } from "@tanstack/react-router"
import { DeferredImage } from "@/components/shared/deferred-image"



// ─── RELATIONS TAB ─────────────────────────────────────────────────────────────

export const RelationsTab = React.memo(function RelationsTab({ media }: { media?: Models_LibraryMedia }) {
    const navigate = useNavigate()

    if (!media || !media.relations || media.relations.length === 0) {
        return (
            <div className="py-24 text-center">
                <p className="text-zinc-600 font-display text-4xl tracking-widest">SIN RELACIONES</p>
                <p className="text-zinc-700 text-xs font-black uppercase tracking-[0.3em] mt-2">NO HAY SECUELAS O PRECUELAS DETECTADAS</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {media.relations.map((relation, idx) => (
                <div 
                    key={idx} 
                    onClick={() => {
                        if (relation.media?.id) {
                            navigate({
                                to: "/series/$seriesId",
                                params: { seriesId: String(relation.media.id) }
                            })
                        }
                    }}
                    className="liquid-glass-frosted liquid-glass-frosted-interactive rounded-xl p-4 flex gap-4 group cursor-pointer"
                >
                    <div className="w-16 h-24 shrink-0 bg-zinc-950 overflow-hidden relative rounded-lg border border-white/10 group-hover:border-brand-orange/30 transition-colors duration-500">
                        {(relation.media?.coverImage?.large || relation.media?.coverImage?.medium) && (
                            <DeferredImage
                                src={relation.media.coverImage?.large || relation.media.coverImage?.medium || ""}
                                alt={relation.media.title?.romaji || "Relacion"}
                                showSkeleton={false}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                        )}
                    </div>
                    <div className="flex flex-col flex-1 justify-center">
                        <span className="text-[8px] font-black text-brand-orange tracking-[0.18em] uppercase mb-1">{relation.relationType}</span>
                        <h4 className="text-sm font-bold leading-tight line-clamp-2 text-white group-hover:text-brand-orange transition-colors duration-300">{relation.media?.title?.spanish || relation.media?.title?.romaji || relation.media?.title?.english}</h4>
                        <span className="text-[9px] font-black text-white/30 mt-2 tracking-[0.2em] uppercase">{relation.media?.format}</span>
                    </div>
                </div>
            ))}
        </div>
    )
})

// ─── CHARACTERS TAB ────────────────────────────────────────────────────────────

export const CharactersTab = React.memo(function CharactersTab({ characters, onSelectChar }: { characters: NonNullable<Models_LibraryMedia["characters"]>["edges"], onSelectChar?: (name: string) => void }) {
    if (!characters || characters.length === 0) {
        return (
            <div className="py-24 text-center">
                <p className="text-zinc-600 font-display text-4xl tracking-widest">SIN PERSONAJES</p>
                <p className="text-zinc-700 text-xs font-black uppercase tracking-[0.3em] mt-2">NO HAY PERSONAJES DETECTADOS</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {characters.slice(0, 24).map((char, idx) => (
                <div 
                    key={idx} 
                    onClick={() => onSelectChar?.(char.node?.name?.full || "")}
                    className="flex flex-col items-center text-center gap-3 group cursor-pointer"
                >
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-950/40 border-2 border-white/5 group-hover:border-brand-orange/60 group-hover:shadow-[0_0_20px_rgba(255,110,58,0.25)] transition-all duration-500 shadow-xl">
                        {char.node?.image?.large && (
                            <DeferredImage
                                src={char.node.image.large}
                                alt={char.node.name?.full || "Character"}
                                showSkeleton={false}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white group-hover:text-brand-orange uppercase tracking-wider transition-colors duration-300">{char.node?.name?.full}</span>
                        <span className="text-[9px] font-black text-white/35 tracking-[0.15em] uppercase mt-1 group-hover:text-brand-orange/60 transition-colors duration-300">{char.role}</span>
                    </div>
                </div>
            ))}
        </div>
    )
})


