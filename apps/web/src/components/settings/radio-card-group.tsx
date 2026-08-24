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
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "flex items-start gap-4 p-4 rounded-xl border transition-all duration-base cursor-pointer group select-none",
                            isActive
                                ? "border-brand-accent/50 bg-brand-accent/[0.06] shadow-[0_0_12px_hsl(var(--brand-accent)/0.15)]"
                                : "border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05]"
                        )}
                    >
                        <div className="mt-1 shrink-0 pointer-events-none">
                            <input
                                type="radio"
                                name={name}
                                value={opt.value}
                                checked={isActive}
                                readOnly
                                className="accent-brand-accent pointer-events-none"
                            />
                        </div>
                        <div className="flex-1 -mt-0.5">
                            <span className="text-xs font-bold text-on-surface block tracking-tight">
                                {opt.label}
                            </span>
                            {opt.desc && <span className="text-caption text-on-surface-variant block mt-0.5">{opt.desc}</span>}
                        </div>
                        {opt.badge && (
                            <div className={cn(
                                "h-8 px-3 rounded-lg flex items-center justify-center text-label-sm font-black uppercase tracking-wider shrink-0",
                                isActive
                                    ? "bg-brand-accent/20 text-brand-accent border border-brand-accent/30"
                                    : "bg-white/[0.04] text-on-surface-variant border border-white/10"
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
