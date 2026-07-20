import { Icons } from "@/components/ui/icons"

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
                    <Icons.ui.alert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-bold text-brand-destructive tracking-tight">{title}</h3>
                    <p className="text-caption text-on-surface-variant leading-relaxed font-medium">{description}</p>
                </div>
            </div>
            {actions && <div className="pl-14">{actions}</div>}
        </div>
    )
}
