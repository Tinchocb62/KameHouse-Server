import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Icons } from "@/components/ui/icons"
import { getScouterKi } from "@/lib/config/dragonball-lore.config"

interface LoreTransformation {
    name: string
    multiplier?: string
    description?: string
}

interface LoreWikiCharacter {
    name: string
    alias?: string[]
    race?: string
    origin?: string
    height_cm?: number
    weight_kg?: number
    biography?: string
    personality?: string
    techniques?: string[]
    transformations?: LoreTransformation[]
    ki?: string
}

interface CharacterEdge {
    node?: {
        name?: { full?: string }
        image?: { large?: string }
    }
}

/** Forma del JSON servido por /api/v1/lore/dragonball (solo la parte que consume la UI). */
export interface DragonBallLoreData {
    characters_wiki?: LoreWikiCharacter[]
}

interface CharacterDetailModalProps {
    characterName: string | null
    entry: { media?: { characters?: { edges?: CharacterEdge[] } } } | null | undefined
    loreData: DragonBallLoreData | null | undefined
    onClose: () => void
}

export function CharacterDetailModal({ 
    characterName, 
    entry,
    loreData, 
    onClose 
}: CharacterDetailModalProps) {
    // Find the character info in local lore data if characterName is present
    const charInfo = React.useMemo(() => {
        if (!characterName || !loreData?.characters_wiki) return null
        return loreData.characters_wiki.find(c =>
            c.name.toLowerCase().includes(characterName.toLowerCase()) ||
            characterName.toLowerCase().includes(c.name.toLowerCase())
        )
    }, [characterName, loreData])

    // Resolve avatar image from entry characters list
    const avatarUrl = React.useMemo(() => {
        if (!characterName || !entry?.media?.characters?.edges) return ""
        const charEdge = entry.media.characters.edges.find(e =>
            e.node?.name?.full?.toLowerCase().includes(characterName.toLowerCase()) ||
            characterName.toLowerCase().includes(e.node?.name?.full?.toLowerCase() ?? "")
        )
        return charEdge?.node?.image?.large || ""
    }, [characterName, entry])

    const isOpen = Boolean(characterName && charInfo)

    return (
        <AnimatePresence>
            {isOpen && charInfo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-overlay-xl"
                    />

                    <motion.div 
                        role="dialog"
                        aria-modal="true"
                        initial={{ opacity: 0, scale: 0.94, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 16 }}
                        transition={{ type: "spring", damping: 26, stiffness: 320 }}
                        className="relative w-full max-w-3xl max-h-[90dvh] bg-surface-container border border-outline-variant rounded-corner-lg overflow-y-auto shadow-elevation-3 flex flex-col md:flex-row z-10 scrollbar-hide no-scrollbar transform-gpu"
                    >
                        <button 
                            onClick={onClose}
                            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 rounded-full bg-surface-variant border border-outline text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all active:scale-95"
                        >
                        <Icons.ui.close className="w-5 h-5" />
                    </button>

                    {/* Left Column: Avatar & Quick Info */}
                    <div className="w-full md:w-1/3 p-4 sm:p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-outline-variant/30 shrink-0 backdrop-blur-[var(--blur-overlay-sm)]" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 30%, transparent)" }}>
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-brand-accent shadow-brand-secondary mb-3 sm:mb-4 shrink-0">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={charInfo.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-surface-container flex items-center justify-center text-on-surface-variant font-bold uppercase">DB</div>
                            )}
                        </div>

                        <h3 className="text-lg sm:text-xl font-black text-center text-white tracking-wide uppercase">{charInfo.name}</h3>
                        {charInfo.alias && charInfo.alias.length > 0 && (
                            <p className="text-xs text-zinc-500 text-center mt-1">Alias: {charInfo.alias.join(", ")}</p>
                        )}

                        {/* Scouter Ki Level HUD */}
                        <div className="w-full mt-3 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 shadow-inner flex items-center justify-between text-[11px] font-mono text-emerald-400">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                <span className="font-bold tracking-wider uppercase text-[10px]">SCOUTER KI:</span>
                            </div>
                            <span className="font-black text-emerald-300 tracking-widest text-xs drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
                                {getScouterKi(charInfo.name, charInfo.ki)}
                            </span>
                        </div>

                        <div className="w-full mt-3 sm:mt-4 space-y-2 sm:space-y-3 font-mono text-label-sm text-on-surface-variant/60">
                            <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                                <span>Raza</span>
                                <span className="font-bold text-on-surface uppercase">{charInfo.race || "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                                <span>Origen</span>
                                <span className="font-bold text-on-surface uppercase">{charInfo.origin || "N/A"}</span>
                            </div>
                            {charInfo.height_cm && (
                                <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                                    <span>Altura</span>
                                    <span className="font-bold text-on-surface">{charInfo.height_cm} cm</span>
                                </div>
                            )}
                            {charInfo.weight_kg && (
                                <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                                    <span>Peso</span>
                                    <span className="font-bold text-on-surface">{charInfo.weight_kg} kg</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Bio, Techniques & Transformations */}
                    <div className="flex-grow p-4 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto max-h-[85dvh] no-scrollbar">
                        <div>
                            <span className="text-label-sm font-black text-brand-accent uppercase tracking-ultra mb-2 block">Biografía</span>
                            <p className="text-on-surface-variant/80 text-sm leading-relaxed">{charInfo.biography}</p>
                        </div>

                        {charInfo.personality && (
                            <div>
                                <span className="text-label-sm font-black text-brand-accent uppercase tracking-ultra mb-2 block">Personalidad</span>
                                    <p className="text-on-surface-variant/60 text-xs leading-relaxed">{charInfo.personality}</p>
                            </div>
                        )}

                        {charInfo.techniques && charInfo.techniques.length > 0 && (
                            <div>
                                <span className="text-label-sm font-black text-brand-accent uppercase tracking-ultra mb-2 block">Técnicas</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {charInfo.techniques.map((tech: string, i: number) => (
                                        <span key={i} className="px-2.5 py-1 bg-surface-variant border border-outline-variant text-on-surface text-label-sm rounded-md font-bold">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {charInfo.transformations && charInfo.transformations.length > 0 && (
                            <div>
                                <span className="text-label-sm font-black text-brand-accent uppercase tracking-ultra mb-3 block">Transformaciones / Estados</span>
                                <div className="space-y-3">
                                    {charInfo.transformations.map((trans, i) => (
                                        <div key={i} className="p-3 bg-surface-container-low border border-outline-variant rounded-xl flex flex-col gap-1">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="font-bold text-xs text-white uppercase flex items-center gap-1">
                                                    <Icons.status.sparkles className="w-3.5 h-3.5 text-brand-accent" /> {trans.name}
                                                </span>
                                                {trans.multiplier && (
                                                    <span className="font-mono text-label-sm font-bold text-brand-accent px-2 py-0.5 bg-brand-accent/10 border border-brand-accent/20 rounded-md">
                                                        {trans.multiplier}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-on-surface-variant text-label-sm leading-relaxed">{trans.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
            )}
        </AnimatePresence>
    )
}
