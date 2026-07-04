import { AnimatePresence, motion } from "framer-motion"
import { X, Sparkles } from "lucide-react"

interface CharacterDetailModalProps {
    characterName: string | null
    entry: any
    loreData: any
    onClose: () => void
}

export function CharacterDetailModal({ 
    characterName, 
    entry,
    loreData, 
    onClose 
}: CharacterDetailModalProps) {
    if (!characterName) return null

    // Find the character info in local lore data
    const charInfo = loreData?.characters_wiki?.find((c: any) => 
        c.name.toLowerCase().includes(characterName.toLowerCase()) || 
        characterName.toLowerCase().includes(c.name.toLowerCase())
    )

    if (!charInfo) return null

    // Resolve avatar image from entry characters list
    const charEdge = entry?.media?.characters?.edges?.find((e: any) => 
        e.node?.name?.full?.toLowerCase().includes(characterName.toLowerCase()) || 
        characterName.toLowerCase().includes(e.node?.name?.full?.toLowerCase())
    )
    const avatarUrl = charEdge?.node?.image?.large || ""

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-overlay-xl"
                    />

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-3xl max-h-[85vh] bg-surface-container border border-outline-variant rounded-corner-lg overflow-y-auto shadow-elevation-3 flex flex-col md:flex-row z-10 scrollbar-hide no-scrollbar"
                    >
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-surface-variant border border-outline text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all active:scale-95"
                        >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Left Column: Avatar & Quick Info */}
                    <div className="w-full md:w-1/3 p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-outline-variant/30 shrink-0 backdrop-blur-[var(--blur-overlay-sm)]" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 30%, transparent)" }}>
                        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-brand-orange shadow-brand-secondary mb-4 shrink-0">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={charInfo.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-surface-container flex items-center justify-center text-on-surface-variant font-bold uppercase">DB</div>
                            )}
                        </div>

                        <h3 className="text-xl font-black text-center text-white tracking-wide uppercase">{charInfo.name}</h3>
                        {charInfo.alias && charInfo.alias.length > 0 && (
                            <p className="text-xs text-zinc-500 text-center mt-1">Alias: {charInfo.alias.join(", ")}</p>
                        )}

                        <div className="w-full mt-6 space-y-3 font-mono text-[10px] text-on-surface-variant/60">
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
                    <div className="flex-grow p-6 md:p-8 space-y-6 overflow-y-auto max-h-[85vh] no-scrollbar">
                        <div>
                            <span className="text-[10px] font-black text-brand-orange uppercase tracking-[0.2em] mb-2 block">Biografía</span>
                            <p className="text-on-surface-variant/80 text-sm leading-relaxed">{charInfo.biography}</p>
                        </div>

                        {charInfo.personality && (
                            <div>
                                <span className="text-[10px] font-black text-brand-orange uppercase tracking-[0.2em] mb-2 block">Personalidad</span>
                                    <p className="text-on-surface-variant/60 text-xs leading-relaxed">{charInfo.personality}</p>
                            </div>
                        )}

                        {charInfo.techniques && charInfo.techniques.length > 0 && (
                            <div>
                                <span className="text-[10px] font-black text-brand-orange uppercase tracking-[0.2em] mb-2 block">Técnicas</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {charInfo.techniques.map((tech: string, i: number) => (
                                        <span key={i} className="px-2.5 py-1 bg-surface-variant border border-outline-variant text-on-surface text-[10px] rounded-lg font-bold">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {charInfo.transformations && charInfo.transformations.length > 0 && (
                            <div>
                                <span className="text-[10px] font-black text-brand-orange uppercase tracking-[0.2em] mb-3 block">Transformaciones / Estados</span>
                                <div className="space-y-3">
                                    {charInfo.transformations.map((trans: any, i: number) => (
                                        <div key={i} className="p-3 bg-surface-container-low border border-outline-variant rounded-xl flex flex-col gap-1">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="font-bold text-xs text-white uppercase flex items-center gap-1">
                                                    <Sparkles className="w-3.5 h-3.5 text-brand-orange" /> {trans.name}
                                                </span>
                                                {trans.multiplier && (
                                                    <span className="font-mono text-[9px] font-bold text-brand-orange px-2 py-0.5 bg-brand-orange/10 border border-brand-orange/20 rounded">
                                                        {trans.multiplier}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-on-surface-variant text-[11px] leading-relaxed">{trans.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
