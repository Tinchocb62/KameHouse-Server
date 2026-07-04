import type { SagaDTO } from "@/api/types/series.types"
import { cn } from "@/components/ui/core/styling"
import { SubSagaTimeline } from "./sub-saga-timeline"
import { motion, AnimatePresence, type Variants } from "framer-motion"

interface SagaSelectorProps {
  sagas: SagaDTO[]
  activeSagaId?: string
  onSelectSaga: (sagaId: string) => void
  activeSubSagaId?: string
  onSelectSubSaga?: (subSagaId: string) => void
}

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.2, 1, 0.2, 1] } },
}

export function SagaSelector({
  sagas,
  activeSagaId,
  onSelectSaga,
  activeSubSagaId,
  onSelectSubSaga
}: SagaSelectorProps) {
  return (
    <div className="w-full h-full flex flex-col p-5 glass-card overflow-hidden">
      <h3 className="font-bebas text-2xl tracking-widest text-on-surface/95 mb-5 px-1 uppercase flex items-center justify-between flex-shrink-0">
        <span>Sagas</span>
        <span className="text-[10px] font-mono font-bold tracking-normal text-on-surface-variant lowercase">
          {sagas.length} sagas
        </span>
      </h3>

      <motion.div
        key={sagas[0]?.id ?? "sagas"}
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-2.5 overflow-y-auto pr-1 no-scrollbar flex-1 min-h-0"
      >
        {sagas.map((saga) => {
          const isActive = saga.id === activeSagaId

          return (
            <motion.button
              key={saga.id}
              variants={itemVariants}
              onClick={() => onSelectSaga(saga.id)}
              aria-label={`${saga.name}, episodios ${saga.episodeRange}${saga.isFiller ? ", relleno" : ""}`}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "relative flex flex-col text-left p-5 rounded-2xl transition-all duration-base ease-smooth-out select-none group/saga active:scale-[0.98]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent/70",
                isActive
                  ? "glass-liquid"
                  : "bg-transparent hover:bg-white/[0.05]",
                saga.isFiller && !isActive && "opacity-50 hover:opacity-90"
              )}
            >
              {/* Active Indicator Line with shadow glow */}
              {isActive && (
                <div className="absolute left-[1px] top-4 bottom-4 w-[3px] bg-brand-accent rounded-r-full shadow-[0_0_8px_hsl(var(--brand-accent)/0.5)]" />
              )}
              
              <div className="flex justify-between items-start mb-1.5 w-full">
                <span className={cn(
                  "font-bold text-base leading-snug line-clamp-2 transition-colors duration-300 pr-2",
                  isActive 
                    ? "text-on-surface" 
                    : "text-on-surface-variant group-hover/saga:text-on-surface"
                )}>
                  {saga.name}
                </span>
                {saga.isFiller && (
                  <span className="inline-flex items-center text-label-sm uppercase bg-brand-destructive/15 border border-brand-destructive/25 text-brand-destructive px-3 py-1 rounded-full whitespace-nowrap mt-0.5">
                    Relleno
                  </span>
                )}
              </div>
              
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                isActive
                  ? "text-brand-accent"
                  : "text-on-surface-variant group-hover/saga:text-brand-accent/80"
              )}>
                Eps {saga.episodeRange}
              </span>

              {/* SubSagas Timeline list */}
              <AnimatePresence initial={false}>
              {isActive && saga.subSagas && saga.subSagas.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.2, 1, 0.2, 1] }}
                  className="mt-4 overflow-hidden"
                >
                  <SubSagaTimeline
                    activeId={activeSubSagaId}
                    items={saga.subSagas.map(sub => ({
                      id: sub.id,
                      title: sub.name,
                      episodeRange: `Eps ${sub.episodeRange}`,
                    }))}
                    onSelect={(subId) => {
                      const sub = saga.subSagas?.find(s => s.id === subId)
                      if (!sub) return
                      const isSubActive = subId === activeSubSagaId
                      if (onSelectSubSaga) {
                        onSelectSubSaga(isSubActive ? "" : subId)
                      }
                      const el = document.getElementById(`episode-${sub.startEp}`)
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
                    }}
                  />
                </motion.div>
              )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
