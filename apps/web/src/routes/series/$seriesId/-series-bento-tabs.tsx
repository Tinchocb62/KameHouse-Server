import React from "react"
import { Models_LibraryMedia } from "@/api/generated/types"
import { useNavigate } from "@tanstack/react-router"
import { DeferredImage } from "@/components/shared/deferred-image"
import { EmptyState } from "@/components/shared/empty-state"
import { Icons } from "@/components/ui/icons"
import { motion } from "framer-motion"
import { staggerList, staggerItem, staggerAvatar } from "@/components/ui/core/motion"
import { CharacterAvatar } from "./-components/character-avatar"

// ─── RELATIONS TAB ─────────────────────────────────────────────────────────────

export const RelationsTab = React.memo(function RelationsTab({ media }: { media?: Models_LibraryMedia }) {
    const navigate = useNavigate()

    if (!media || !media.relations || media.relations.length === 0) {
        return (
            <div className="py-12">
                <EmptyState
                    title="SIN RELACIONES"
                    message="NO HAY SECUELAS O PRECUELAS DETECTADAS"
                    icon={<Icons.navigation.layers className="w-12 h-12 text-on-surface-variant/20" />}
                />
            </div>
        )
    }

    return (
        <motion.div
            variants={staggerList}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
            {media.relations.map((relation, idx) => (
                <motion.div
                    key={idx}
                    variants={staggerItem}
                    onClick={() => {
                        if (relation.media?.id) {
                            navigate({
                                to: "/series/$seriesId",
                                params: { seriesId: String(relation.media.id) }
                            })
                        }
                    }}
                    className="bg-[var(--glass-bg)] backdrop-blur-[var(--blur-overlay-md)] border border-[var(--glass-border)] rounded-container hover:bg-[var(--glass-hover)] hover:border-[var(--glass-strong)] transition-all duration-base p-4 flex gap-4 group cursor-pointer"
                >
                    <div className="w-16 h-24 shrink-0 bg-surface-container overflow-hidden relative rounded-lg border border-outline-variant/10 group-hover:border-brand-secondary/30 transition-colors duration-slower">
                        {(relation.media?.coverImage?.large || relation.media?.coverImage?.medium) && (
                            <DeferredImage
                                src={relation.media.coverImage?.large || relation.media.coverImage?.medium || ""}
                                alt={relation.media.title?.romaji || "Relacion"}
                                showSkeleton={false}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slower"
                            />
                        )}
                    </div>
                    <div className="flex flex-col flex-1 justify-center">
                        <span className="text-xs font-black text-brand-secondary tracking-widest uppercase mb-1">{relation.relationType}</span>
                        <h4 className="text-sm font-bold leading-tight line-clamp-2 text-on-surface group-hover:text-brand-secondary transition-colors duration-base">{relation.media?.title?.spanish || relation.media?.title?.romaji || relation.media?.title?.english}</h4>
                        <span className="text-label-sm font-black text-on-surface/30 mt-2 tracking-widest uppercase">{relation.media?.format}</span>
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
            <div className="py-12">
                <EmptyState 
                    title="SIN PERSONAJES" 
                    message="NO HAY PERSONAJES DETECTADOS" 
                    icon={<Icons.navigation.users className="w-12 h-12 text-on-surface-variant/20" />}
                />
            </div>
        )
    }

    return (
        <motion.div
            variants={staggerList}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap justify-center gap-6"
        >
            {characters.slice(0, 24).map((char, idx) => (
                <motion.div key={idx} variants={staggerAvatar} className="w-28">
                    <CharacterAvatar
                        name={char.node?.name?.full || "Personaje"}
                        avatarUrl={char.node?.image?.large}
                        roleTag={char.role}
                        onSelect={(name) => onSelectChar?.(name)}
                    />
                </motion.div>
            ))}
        </motion.div>
    )
})


