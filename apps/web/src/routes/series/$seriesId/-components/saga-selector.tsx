import type { SagaDTO } from "@/api/types/series.types"
import { cn } from "@/components/ui/core/styling"

interface SagaSelectorProps {
  sagas: SagaDTO[]
  activeSagaId: string
  onSelectSaga: (sagaId: string) => void
  activeSubSagaId?: string
  onSelectSubSaga?: (subSagaId: string) => void
}

export function SagaSelector({ 
  sagas, 
  activeSagaId, 
  onSelectSaga,
  activeSubSagaId,
  onSelectSubSaga
}: SagaSelectorProps) {
  return (
    <div className="w-full h-full flex flex-col p-5 border border-white/5 bg-zinc-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
      <h3 className="font-display text-2xl tracking-[0.15em] text-white/95 mb-5 px-1 uppercase flex items-center justify-between flex-shrink-0">
        <span>Sagas</span>
        <span className="text-[10px] font-mono font-bold tracking-normal text-zinc-500 lowercase">
          {sagas.length} sagas
        </span>
      </h3>
      
      <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 no-scrollbar flex-1 min-h-0">
        {sagas.map((saga) => {
          const isActive = saga.id === activeSagaId
          
          return (
            <button
              key={saga.id}
              onClick={() => onSelectSaga(saga.id)}
              className={cn(
                "relative flex flex-col text-left p-4 rounded-xl transition-all duration-300 ease-out border select-none group/saga",
                isActive 
                  ? "bg-zinc-900/40 border-brand-orange/30 shadow-[0_8px_32px_rgba(0,0,0,0.4)]" 
                  : "bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5",
                saga.isFiller && !isActive && "opacity-50 hover:opacity-90"
              )}
            >
              {/* Active Indicator Line with shadow glow */}
              {isActive && (
                <div className="absolute left-[1px] top-4 bottom-4 w-[3px] bg-brand-orange rounded-r-full shadow-[0_0_8px_rgba(255,110,58,0.5)]" />
              )}
              
              <div className="flex justify-between items-start mb-1.5 w-full">
                <span className={cn(
                  "font-bold text-base leading-snug line-clamp-2 transition-colors duration-300 pr-2",
                  isActive 
                    ? "text-white" 
                    : "text-zinc-400 group-hover/saga:text-zinc-200"
                )}>
                  {saga.name}
                </span>
                {saga.isFiller && (
                  <span className="text-[8px] font-black tracking-widest uppercase bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5">
                    Relleno
                  </span>
                )}
              </div>
              
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                isActive 
                  ? "text-brand-orange" 
                  : "text-zinc-500 group-hover/saga:text-brand-orange/80"
              )}>
                Eps {saga.episodeRange}
              </span>
              
              {/* SubSagas Timeline list */}
              {isActive && saga.subSagas && saga.subSagas.length > 0 && (
                <div className="mt-4 w-full flex flex-col gap-3 pl-6 relative">
                  {/* Vertical connecting line */}
                  <div className="absolute left-2.5 top-1 bottom-3 w-[1.5px] bg-gradient-to-b from-brand-orange/30 via-brand-orange/15 to-transparent pointer-events-none" />
                  
                  {saga.subSagas.map(sub => {
                    const isSubActive = sub.id === activeSubSagaId
                    return (
                      <div
                        key={sub.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onSelectSubSaga) {
                            onSelectSubSaga(isSubActive ? "" : sub.id)
                          }
                          const el = document.getElementById(`episode-${sub.startEp}`)
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
                        }}
                        className="relative text-left flex items-start gap-3 py-0.5 group/subsaga cursor-pointer"
                      >
                        {/* Timeline circle node */}
                        <div className={cn(
                          "relative mt-1 flex items-center justify-center shrink-0 w-2.5 h-2.5 rounded-full border transition-all duration-300",
                          isSubActive 
                            ? "border-brand-orange bg-brand-orange shadow-[0_0_8px_rgba(255,110,58,0.7)]" 
                            : "border-white/20 bg-zinc-950 group-hover/subsaga:border-brand-orange group-hover/subsaga:scale-110"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                            isSubActive 
                              ? "bg-white" 
                              : "bg-transparent group-hover/subsaga:bg-brand-orange"
                          )} />
                        </div>
                        
                        {/* Texts */}
                        <div className="space-y-0.5">
                          <span className={cn(
                            "block text-xs font-bold transition-colors duration-300 leading-normal",
                            isSubActive ? "text-white" : "text-zinc-400 group-hover/subsaga:text-white"
                          )}>
                            {sub.name}
                          </span>
                          <span className={cn(
                            "block text-[8px] font-black tracking-widest transition-colors duration-300",
                            isSubActive ? "text-brand-orange" : "text-zinc-600 group-hover/subsaga:text-brand-orange/80"
                          )}>
                            Eps {sub.episodeRange}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
