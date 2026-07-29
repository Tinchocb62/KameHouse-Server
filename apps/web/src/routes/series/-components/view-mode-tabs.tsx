import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"

export type SeriesViewMode = "shelf" | "etapas"

const MODES: Array<{ id: SeriesViewMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "shelf", label: "Estantería", icon: Icons.navigation.library },
    { id: "etapas", label: "Sagas", icon: Icons.media.clapperboard },
]

/**
 * Conmutador segmentado entre las vistas de /series (estantería VHS de series vs
 * mapa de arcos icónicos). El modo activo vive en la URL (?view=etapas, nombre
 * legacy) para permitir deep-linking; este componente solo notifica el cambio.
 */
export function ViewModeTabs({
    mode,
    onChange,
    className,
}: {
    mode: SeriesViewMode
    onChange: (mode: SeriesViewMode) => void
    className?: string
}) {
    return (
        <div
            role="tablist"
            aria-label="Modo de vista de series"
            className={cn(
                "inline-flex items-center gap-1 p-1 rounded-full",
                "bg-zinc-950/85 backdrop-blur-xl border border-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.6)]",
                className,
            )}
        >
            {MODES.map(({ id, label, icon: Icon }) => {
                const isActive = id === mode
                return (
                    <button
                        key={id}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded-full select-none transition-all duration-300",
                            "text-xs uppercase tracking-wider font-extrabold font-mono",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                            isActive
                                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-zinc-950 shadow-[0_0_14px_rgba(245,158,11,0.5)]"
                                : "text-white/70 hover:text-white hover:bg-white/10",
                        )}
                    >
                        <Icon className={cn("w-3.5 h-3.5", isActive ? "stroke-[2.5]" : "opacity-80")} />
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                )
            })}
        </div>
    )
}
