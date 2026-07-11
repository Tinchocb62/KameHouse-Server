import { cn } from "@/components/ui/core/styling"

export interface SubSagaTimelineItem {
  id: string
  title: string
  episodeRange: string
  image?: string
}

interface SubSagaTimelineProps {
  items: SubSagaTimelineItem[]
  activeId?: string
  onSelect: (id: string) => void
}

/**
 * Vertical dot timeline for sub-sagas, nested inside SagaSelector's active saga.
 */
export function SubSagaTimeline({ items, activeId, onSelect }: SubSagaTimelineProps) {
  if (items.length === 0) return null

  return (
    <div className="w-full flex flex-col gap-3 pl-6 relative">
      <div className="absolute left-2.5 top-1 bottom-3 w-[1.5px] bg-gradient-to-b from-brand-accent/30 via-brand-accent/15 to-transparent pointer-events-none" />

      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(item.id)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                e.stopPropagation()
                onSelect(item.id)
              }
            }}
            aria-label={`${item.title}, ${item.episodeRange}`}
            aria-current={isActive ? "true" : undefined}
            className="relative text-left flex items-start gap-3 py-0.5 group/subsaga cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent/70 rounded-md"
          >
            <div className={cn(
              "relative mt-1 flex items-center justify-center shrink-0 w-2.5 h-2.5 rounded-full border transition-all duration-300",
              isActive
                ? "border-brand-accent bg-brand-accent shadow-[0_0_8px_hsl(var(--brand-accent)/0.5)]"
                : "border-outline-variant/20 bg-surface-container group-hover/subsaga:border-brand-accent group-hover/subsaga:scale-110"
            )}>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                isActive ? "bg-on-surface" : "bg-transparent group-hover/subsaga:bg-brand-accent"
              )} />
            </div>

            <div className="flex-1 space-y-0.5 pb-1">
              <span className={cn(
                "block text-xs font-bold transition-colors duration-300 leading-normal",
                isActive ? "text-on-surface" : "text-on-surface-variant group-hover/subsaga:text-on-surface"
              )}>
                {item.title}
              </span>
              <span className={cn(
                "block text-[8px] font-black tracking-widest transition-colors duration-300",
                isActive ? "text-brand-accent" : "text-on-surface-variant group-hover/subsaga:text-brand-accent/80"
              )}>
                {item.episodeRange}
              </span>
              
              {isActive && item.image && (
                <div className="pt-2">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full aspect-video object-cover rounded-md border border-outline-variant/10 shadow-md"
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
