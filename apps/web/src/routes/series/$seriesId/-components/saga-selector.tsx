import type { SagaDTO } from "@/api/types/series.types"
import { cn } from "@/components/ui/core/styling"
import { SubSagaTimeline } from "./sub-saga-timeline"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const SCROLL_END_THRESHOLD = 4

function useScrollFadeMask() {
  const ref = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(false)

  const checkPosition = useCallback(() => {
    const el = ref.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_END_THRESHOLD
    setIsAtBottom(atBottom)
  }, [])

  useEffect(() => {
    checkPosition()
  }, [checkPosition])

  return { ref, isAtBottom, checkPosition }
}

interface SagaSelectorProps {
  sagas: SagaDTO[]
  localSagas?: any[]
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
  localSagas,
  activeSagaId,
  onSelectSaga,
  activeSubSagaId,
  onSelectSubSaga
}: SagaSelectorProps) {
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(() => {
    return !!activeSubSagaId
  })
  const activeSaga = sagas.find(s => s.id === activeSagaId)
  const hasSubSagas = activeSaga?.subSagas && activeSaga.subSagas.length > 0

  const mainList = useScrollFadeMask()
  const subList = useScrollFadeMask()

  useEffect(() => {
    if (activeSubSagaId) {
      setIsSubMenuOpen(true)
    }
  }, [activeSubSagaId])

  useEffect(() => {
    mainList.checkPosition()
  }, [sagas, mainList.checkPosition])

  useEffect(() => {
    if (isSubMenuOpen) {
      subList.checkPosition()
    }
  }, [isSubMenuOpen, activeSagaId, subList.checkPosition])

  return (
    <div className="w-full h-full flex flex-col p-5 glass-card overflow-hidden relative">
      <AnimatePresence mode="wait" initial={false}>
        {!isSubMenuOpen || !hasSubSagas ? (
          <motion.div
            key="main-menu"
            initial={{ x: -15, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -15, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full h-full flex flex-col min-h-0"
          >
            <h3 className="font-bebas text-2xl tracking-widest text-on-surface/95 mb-5 px-1 uppercase flex items-center justify-between flex-shrink-0">
              <span>Sagas</span>
              <span className="text-[10px] font-mono font-bold tracking-normal text-on-surface-variant lowercase">
                {sagas.length} sagas
              </span>
            </h3>

            <div className="relative flex-grow min-h-0 flex flex-col overflow-hidden">
              <motion.div
                ref={mainList.ref}
                onScroll={mainList.checkPosition}
                key={sagas[0]?.id ?? "sagas"}
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className={cn(
                  "flex flex-col gap-2.5 overflow-y-auto pr-1 no-scrollbar flex-grow min-h-0 pb-8",
                  !mainList.isAtBottom && "[-webkit-mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]"
                )}
              >
                {sagas.map((saga) => {
                  const isActive = saga.id === activeSagaId

                  return (
                    <motion.button
                      key={saga.id}
                      variants={itemVariants}
                      onClick={() => {
                        if (isActive && saga.subSagas && saga.subSagas.length > 0) {
                          setIsSubMenuOpen(true)
                        } else {
                          onSelectSaga(saga.id)
                        }
                      }}
                      onDoubleClick={() => {
                        if (saga.subSagas && saga.subSagas.length > 0) {
                          setIsSubMenuOpen(true)
                        }
                      }}
                      aria-label={`${saga.name}, episodios ${saga.episodeRange}${saga.isFiller ? ", relleno" : ""}`}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent/70",
                        "relative flex flex-col text-left p-5 rounded-2xl transition-all duration-base ease-smooth-out select-none group/saga active:scale-[0.98]",
                        isActive
                          ? "bg-brand-accent/[0.08] border border-brand-accent/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_20px_rgba(0,0,0,0.15)]"
                          : "bg-transparent hover:bg-white/[0.05] border border-transparent",
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
                        <div className="flex items-center gap-2">
                          {saga.isFiller && (
                            <span className="inline-flex items-center text-label-sm uppercase bg-brand-destructive/15 border border-brand-destructive/25 text-brand-destructive px-3 py-1 rounded-full whitespace-nowrap mt-0.5">
                              Relleno
                            </span>
                          )}
                          {isActive && saga.subSagas && saga.subSagas.length > 0 && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsSubMenuOpen(true);
                              }}
                              className="p-3 -m-2 rounded-full bg-white/5 hover:bg-white/15 text-brand-accent transition-colors cursor-pointer mt-0.5"
                            >
                              <ChevronRight size={16} />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                        isActive
                          ? "text-brand-accent"
                          : "text-on-surface-variant group-hover/saga:text-brand-accent/80"
                      )}>
                        Eps {saga.episodeRange}
                      </span>
                    </motion.button>
                  )
                })}
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="sub-menu"
            initial={{ x: 15, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 15, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full h-full flex flex-col min-h-0"
          >
            <div className="flex items-center gap-3 mb-5 flex-shrink-0">
              <button 
                onClick={() => {
                  setIsSubMenuOpen(false)
                  if (onSelectSubSaga && activeSubSagaId) {
                    onSelectSubSaga("")
                  }
                }}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-on-surface-variant hover:text-on-surface"
              >
                <ChevronLeft size={20} />
              </button>
              <h3 className="font-bebas text-xl tracking-widest text-on-surface/95 uppercase line-clamp-1">
                {activeSaga?.name}
              </h3>
            </div>
            
            <div className="flex-grow min-h-0 flex flex-col overflow-hidden relative">
              <div
                ref={subList.ref}
                onScroll={subList.checkPosition}
                className={cn(
                  "flex-grow overflow-y-auto pr-1 no-scrollbar pb-8",
                  !subList.isAtBottom && "[-webkit-mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]"
                )}
              >
                <SubSagaTimeline
                  activeId={activeSubSagaId}
                  items={(activeSaga?.subSagas || []).map(sub => {
                    const localSub = localSagas?.find(s => s.id === activeSaga?.id)?.subSagas?.find((ss: any) => ss.id === sub.id)
                    return {
                      id: sub.id,
                      title: localSub?.title || sub.name,
                      episodeRange: `Eps ${sub.episodeRange || (sub.startEp + '-' + sub.endEp)}`,
                      image: localSub?.image || sub.image,
                    }
                  })}
                  onSelect={(subId) => {
                    const sub = activeSaga.subSagas?.find(s => s.id === subId)
                    if (!sub) return
                    const isSubActive = subId === activeSubSagaId
                    if (onSelectSubSaga) {
                      onSelectSubSaga(isSubActive ? "" : subId)
                    }
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
