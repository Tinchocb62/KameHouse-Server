import React from "react"
import { cn } from "@/components/ui/core/styling"

export interface RangeSliderProps {
    label: string
    description?: string
    min: number
    max: number
    step?: number
    value: number
    onChange: (value: number) => void
    formatValue?: (value: number) => string
    className?: string
}

export function RangeSlider({ label, description, min, max, step = 1, value, onChange, formatValue, className }: RangeSliderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-outline-variant/4 last:border-0 hover:bg-surface-variant/[0.01] transition-all duration-base gap-5 group/slider">
            <div className="space-y-1 flex-1 max-w-xl">
                <p className="text-sm font-semibold text-on-surface-variant group-hover/slider:text-on-surface transition-colors tracking-tight">{label}</p>
                {description && <p className="text-caption text-on-surface-variant leading-relaxed font-medium">{description}</p>}
            </div>
            <div className={cn("flex items-center gap-3 w-full md:w-72", className)}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full accent-brand-secondary bg-surface-container h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs font-mono text-on-surface-variant text-right shrink-0 min-w-[3rem]">
                    {formatValue ? formatValue(value) : value}
                </span>
            </div>
        </div>
    )
}
