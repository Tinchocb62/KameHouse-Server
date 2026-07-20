import React from "react"
import { cn } from "@/components/ui/core/styling"

export interface RadioCardOption {
    value: string
    label: string
    desc?: string
    badge?: string
}

export interface RadioCardGroupProps {
    name: string
    options: RadioCardOption[]
    value: string
    onChange: (value: string) => void
}

export function RadioCardGroup({ name, options, value, onChange }: RadioCardGroupProps) {
    return (
        <div className="space-y-3">
            {options.map((opt) => {
                const isActive = value === opt.value || (!value && opt.value === "")
                return (
                    <div
                        key={opt.value || "default"}
                        className={cn(
                            "flex items-start gap-4 p-4 rounded-xl border transition-all duration-base cursor-pointer group",
                            isActive
                                ? "border-brand-accent/30 bg-brand-accent/[0.03] bg-[radial-gradient(ellipse_at_left,hsl(var(--brand-accent)/0.04),transparent_70%)]"
                                : "border-outline-variant hover:border-outline-variant hover:bg-surface-container-high"
                        )}
                        onClick={() => onChange(opt.value)}
                    >
                        <input
                            id={`${name}-radio-${opt.value || "default"}`}
                            type="radio"
                            name={name}
                            value={opt.value}
                            checked={isActive}
                            onChange={() => onChange(opt.value)}
                            className="mt-1 accent-brand-accent"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 -mt-0.5">
                            <label
                                htmlFor={`${name}-radio-${opt.value || "default"}`}
                                className="text-xs font-bold text-on-surface block tracking-tight cursor-pointer"
                            >
                                {opt.label}
                            </label>
                            {opt.desc && <span className="text-caption text-on-surface-variant block mt-0.5">{opt.desc}</span>}
                        </div>
                        {opt.badge && (
                            <div className={cn(
                                "h-8 px-3 rounded-lg flex items-center justify-center text-label-sm font-black uppercase tracking-wider shrink-0",
                                isActive
                                    ? "bg-brand-accent/20 text-brand-accent border border-brand-accent/30"
                                    : "bg-surface-container text-on-surface-variant border border-outline-variant"
                            )}>
                                {opt.badge}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
