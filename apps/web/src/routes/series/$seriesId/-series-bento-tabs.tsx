import React from "react"
import { Models_LibraryMedia } from "@/api/generated/types"
import { useNavigate } from "@tanstack/react-router"
import { DeferredImage } from "@/components/shared/deferred-image"
import { motion, type Variants } from "framer-motion"

const gridVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.2, 1, 0.2, 1] } },
}

const avatarVariants: Variants = {
    hidden: { opacity: 0, y: 14, scale: 0.94 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.2, 1, 0.2, 1] } },
}

// ─── RELATIONS TAB ─────────────────────────────────────────────────────────────

export const RelationsTab = React.memo(function RelationsTab({ media }: { media?: Models_LibraryMedia }) {
    const navigate = useNavigate()

    if (!media || !media.relations || media.relations.length === 0) {
        return (
            <div className="py-24 text-center">
                <p className="text-on-surface-variant font-bebas text-4xl tracking-widest">SIN RELACIONES</p>
                <p className="text-on-surface-variant text-xs font-black uppercase tracking-widest mt-2">NO HAY SECUELAS O PRECUELAS DETECTADAS</p>
            </div>
        )
    }

    return (
        <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
            {media.relations.map((relation, idx) => (
                <motion.div
                    key={idx}
                    variants={cardVariants}
                    onClick={() => {
                        if (relation.media?.id) {
                            navigate({
                                to: "/series/$seriesId",
                                params: { seriesId: String(relation.media.id) }
                            })
                        }
                    }}
                    className="bg-[var(--glass-bg)] backdrop-blur-[var(--blur-overlay-md)] border border-[var(--glass-border)] rounded-container hover:bg-[var(--glass-hover)] hover:border-[var(--glass-strong)] transition-all duration-300 p-4 flex gap-4 group cursor-pointer"
                >
                    <div className="w-16 h-24 shrink-0 bg-surface-container overflow-hidden relative rounded-lg border border-outline-variant/10 group-hover:border-brand-secondary/30 transition-colors duration-700">
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
                        <span className="text-[8px] font-black text-brand-secondary tracking-widest uppercase mb-1">{relation.relationType}</span>
                        <h4 className="text-sm font-bold leading-tight line-clamp-2 text-on-surface group-hover:text-brand-secondary transition-colors duration-300">{relation.media?.title?.spanish || relation.media?.title?.romaji || relation.media?.title?.english}</h4>
                        <span className="text-[9px] font-black text-on-surface/30 mt-2 tracking-widest uppercase">{relation.media?.format}</span>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    )
})

// ─── CHARACTERS TAB ────────────────────────────────────────────────────────────

export const CharactersTab = React.memo(function CharactersTab({ characters, onSelectChar }: { characters: NonNullable<Models_LibraryMedia["characters"]>["edges"], onSelectChar?: (name: string) => void }) {
    if (!characters || characters.length === 0) {
        return (
            <div className="py-24 text-center">
                <p className="text-on-surface-variant font-bebas text-4xl tracking-widest">SIN PERSONAJES</p>
                <p className="text-on-surface-variant text-xs font-black uppercase tracking-widest mt-2">NO HAY PERSONAJES DETECTADOS</p>
            </div>
        )
    }

    return (
        <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap justify-center gap-6"
        >
            {characters.slice(0, 24).map((char, idx) => (
                <motion.div
                    key={idx}
                    variants={avatarVariants}
                    onClick={() => onSelectChar?.(char.node?.name?.full || "")}
                    className="flex flex-col items-center text-center gap-3 group cursor-pointer w-28"
                >
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-outline-variant/5 group-hover:border-brand-secondary/60 group-hover:shadow-brand-secondary transition-all duration-700 shadow-elevation-4" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 40%, transparent)" }}>
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
                        <span className="text-xs font-bold text-on-surface group-hover:text-brand-secondary uppercase tracking-widest transition-colors duration-300 line-clamp-2 leading-snug">{char.node?.name?.full}</span>
                        <span className="text-[9px] font-black text-on-surface/35 tracking-widest uppercase mt-1 group-hover:text-brand-secondary/60 transition-colors duration-300">{char.role}</span>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    )
})


