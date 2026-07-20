import React from "react"
import { Icons } from "@/components/ui/icons"
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
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-brand-accent/10 rounded-xl border border-brand-accent/20 shrink-0">
                        <Icons.status.monitorSmartphone className="w-6 h-6 text-brand-accent" />
                    </div>
                    
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                            <h4 className="text-xl font-black text-white uppercase tracking-wider">{title}</h4>
                            <span className="text-caption font-black uppercase tracking-widest text-on-surface-variant/70 bg-surface-container border border-outline-variant px-2.5 py-1 rounded-md">
                                Este Dispositivo
                            </span>
                        </div>

                        <div className="space-y-1 relative">
                            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-outline-variant/30" />
                            {description && (
                                <p className="text-label-sm text-on-surface-variant/80 pl-5 leading-relaxed font-medium">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Card className="divide-y divide-outline-variant/3 border-dashed border-brand-secondary/25">
                {children}
            </Card>
        </section>
    )
}
