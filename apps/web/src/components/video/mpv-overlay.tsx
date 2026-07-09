import React from "react"
import { Icons } from "@/components/ui/icons"

interface MpvOverlayProps {
    title?: string
    episodeLabel?: string
    onStop: () => void
}

/**
 * Shown over the player while playback is handed off to an external mpv window.
 * Progress keeps syncing to the server via the mpv IPC bridge; closing mpv
 * (or pressing "Detener") closes the player.
 */
export function MpvOverlay({ title, episodeLabel, onStop }: MpvOverlayProps) {
    return (
        <div className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-[var(--blur-overlay-lg)] flex items-center justify-center">
            <div className="bg-zinc-950/40 backdrop-blur-[var(--blur-overlay-xl)] border border-white/10 rounded-3xl p-8 max-w-md w-full mx-6 flex flex-col items-center gap-6 text-center">
                <Icons.status.monitorPlay className="w-12 h-12 text-brand-primary" />
                <div className="flex flex-col gap-1">
                    <span className="text-on-surface-variant text-label-sm font-black uppercase tracking-widest font-mono">
                        Reproduciendo en mpv
                    </span>
                    <h2 className="text-on-surface text-h3 font-bold tracking-tight truncate max-w-full">
                        {episodeLabel || title || "Reproducción externa"}
                    </h2>
                    <p className="text-on-surface-variant text-body-md">
                        El progreso se sigue guardando automáticamente.
                    </p>
                </div>
                <button
                    onClick={onStop}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-button border border-white/10 bg-white/5 hover:bg-surface-variant text-on-surface font-black uppercase tracking-widest text-label-sm transition-all duration-base active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                    <Icons.media.stop className="w-4 h-4" />
                    Detener
                </button>
            </div>
        </div>
    )
}
