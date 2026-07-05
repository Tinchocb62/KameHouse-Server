import React from "react"
import { LucideMonitorSmartphone } from "lucide-react"
import { Card } from "@/routes/settings/components"

export interface LocalDeviceSectionProps {
    title?: string
    description?: string
    children: React.ReactNode
}

export function LocalDeviceSection({ title = "Preferencias de Este Dispositivo", description, children }: LocalDeviceSectionProps) {
    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-3 pl-1 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-4 rounded-full bg-brand-secondary/60" />
                        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-on-surface-variant font-mono flex items-center gap-2">
                            <LucideMonitorSmartphone className="w-3.5 h-3.5" />
                            {title}
                        </h2>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/70 bg-surface-container border border-outline-variant px-2.5 py-1 rounded-full">
                        Guardado instantáneo — no requiere Guardar
                    </span>
                </div>
                {description && (
                    <p className="text-[11px] text-on-surface-variant/80 pl-5 leading-relaxed font-medium">
                        {description}
                    </p>
                )}
            </div>
            <Card className="divide-y divide-outline-variant/3 border-dashed border-brand-secondary/25">
                {children}
            </Card>
        </section>
    )
}
