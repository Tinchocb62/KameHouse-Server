import * as React from "react"
import { cn } from "@/components/ui/core/styling"

export interface MediaBentoItem {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}

export interface MediaBentoSpecsProps {
  title: string
  items: (MediaBentoItem | null | undefined)[]
  className?: string
}

export function MediaBentoSpecs({ title, items, className }: MediaBentoSpecsProps) {
  const validItems = items.filter(Boolean) as MediaBentoItem[]

  if (validItems.length === 0) return null

  return (
    <div className={cn("bg-surface-container border border-outline-variant rounded-2xl p-5", className)}>
      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant mb-4 px-1">
        {title}
      </h4>

      <div className="flex flex-col gap-4">
        {validItems.map((item, idx) => {
          const Icon = item.icon
          return (
            <div key={idx} className="flex items-start justify-between px-2 gap-4">
              <div className="flex items-center gap-3 text-on-surface-variant mt-0.5 shrink-0">
                <Icon className="w-4 h-4 text-on-surface-variant" />
                <span className="text-xs uppercase tracking-wider font-bold">{item.label}</span>
              </div>
              <span className="text-sm font-medium font-mono text-on-surface tracking-wide text-right max-w-[180px] truncate-2-lines break-words">
                {item.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
