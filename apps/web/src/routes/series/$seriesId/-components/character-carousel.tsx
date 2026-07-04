import type { CharacterDTO } from "@/api/types/series.types"
import { motion, type Variants } from "framer-motion"

interface CharacterCarouselProps {
  characters: CharacterDTO[]
  onSelect?: (name: string) => void
}

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.94 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.2, 1, 0.2, 1] } },
}

export function CharacterCarousel({ characters, onSelect }: CharacterCarouselProps) {
  if (!characters || characters.length === 0) return null

  return (
    <div className="w-full py-6">
      <h3 className="font-bebas text-2xl tracking-widest text-on-surface/95 uppercase mb-4">Personajes Clave</h3>

      <motion.div
        key={characters[0]?.name ?? "characters"}
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x"
      >
        {characters.map((char, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            role="button"
            tabIndex={0}
            aria-label={`${char.name}, ${char.roleTag}`}
            onClick={() => onSelect?.(char.name)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onSelect?.(char.name)
              }
            }}
            className="flex flex-col items-center gap-3 snap-start min-w-[100px] group cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary/70 rounded-xl"
          >
            <div
              className="w-24 h-24 rounded-full overflow-hidden border border-white/10 group-hover:border-brand-accent/60 group-hover:shadow-brand-primary transition-all duration-slower ease-expo-out relative shadow-card group-hover:-translate-y-1 transform-gpu"
            >
              <img
                src={char.avatarUrl}
                alt={char.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slower ease-expo-out transform-gpu"
              />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-base" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 40%, transparent)" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-on-surface line-clamp-1">{char.name}</p>
              <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-widest mt-0.5">{char.roleTag}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
