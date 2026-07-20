import type { CharacterDTO } from "@/api/types/series.types"
import { motion } from "framer-motion"
import { staggerList, staggerAvatar } from "@/components/ui/core/motion"
import { CharacterAvatar } from "./character-avatar"

interface CharacterCarouselProps {
  characters: CharacterDTO[]
  onSelect?: (name: string) => void
}

export function CharacterCarousel({ characters, onSelect }: CharacterCarouselProps) {
  if (!characters || characters.length === 0) return null

  return (
    <div className="w-full py-6">
      <h3 className="font-display text-2xl tracking-widest text-on-surface/95 uppercase mb-4">Personajes Clave</h3>

      <motion.div
        key={characters[0]?.name ?? "characters"}
        variants={staggerList}
        initial="hidden"
        animate="visible"
        className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x"
      >
        {characters.map((char, idx) => (
          <motion.div key={idx} variants={staggerAvatar} className="snap-start min-w-[100px]">
            <CharacterAvatar
              name={char.name}
              avatarUrl={char.avatarUrl}
              roleTag={char.roleTag}
              onSelect={onSelect}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
