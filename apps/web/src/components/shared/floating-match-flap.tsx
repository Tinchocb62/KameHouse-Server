import * as React from "react"
import { Settings2 } from "lucide-react"
import { cn } from "@/components/ui/core/styling"
import { ManualMatchModal } from "./manual-match-modal"

interface FloatingMatchFlapProps {
    directoryPath?: string
    mediaId?: number
}

export function FloatingMatchFlap({ directoryPath, mediaId }: FloatingMatchFlapProps) {
    const [isMatchModalOpen, setIsMatchModalOpen] = React.useState(false)

    if (!directoryPath || !mediaId) return null

    return (
        <>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    setIsMatchModalOpen(true)
                }}
                className={cn(
                    "fixed left-0 md:left-[80px] top-[40%] z-[49] flex items-center justify-center p-3.5 rounded-r-corner-lg backdrop-blur-overlay-xl border-y border-r border-outline-variant text-on-surface-variant hover:text-brand-orange transition-all duration-300 shadow-elevation-3 hover:pl-5 hover:scale-110 active:scale-95 group cursor-pointer"
                )}
                style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 80%, transparent)" }}
                title="Corregir Vinculación"
            >
                <Settings2 className="w-5 h-5 transition-transform duration-700 group-hover:rotate-90" />
            </button>

            <ManualMatchModal
                isOpen={isMatchModalOpen}
                onClose={() => setIsMatchModalOpen(false)}
                directoryPath={directoryPath}
                currentMediaId={mediaId}
            />
        </>
    )
}
