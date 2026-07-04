import React from "react"

const AlertIcon = () => (
    <svg className="w-[18px] h-[18px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
)

export interface DangerZoneProps {
    title: string
    description: string
    actions?: React.ReactNode
}

export function DangerZone({ title, description, actions }: DangerZoneProps) {
    return (
        <div className="border border-outline-variant rounded-container p-6 space-y-6 relative overflow-hidden group/danger hover:border-brand-destructive/20 transition-colors">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-destructive/10 border border-brand-destructive/20 flex items-center justify-center text-brand-destructive shrink-0">
                    <AlertIcon />
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-bold text-brand-destructive tracking-tight">{title}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed font-medium">{description}</p>
                </div>
            </div>
            {actions && <div className="pl-14">{actions}</div>}
        </div>
    )
}
