import React from "react"
import { useShallow } from "zustand/react/shallow"
import { useAppStore } from "@/lib/store"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"
import { getEraOpening, ERA_OPENINGS_SUBDIR } from "@/lib/config/era_openings"
import { getServerBaseUrl } from "@/api/client/server-url"

export interface EraOpeningPlayerProps {
    sagaId: string
    className?: string
}

const BAR_HEIGHTS = ["55%", "90%", "70%", "100%"]

export function EraOpeningPlayer({ sagaId, className }: EraOpeningPlayerProps) {
    const opening = getEraOpening(sagaId)
    // useShallow: el selector devuelve un objeto nuevo en cada render; sin
    // igualdad shallow useSyncExternalStore entra en loop infinito de re-renders.
    const { bgMusicDir, isVideoActive, setEraOpeningPlaying, uiSoundsVolume } = useAppStore(useShallow((state) => ({
        bgMusicDir: state.bgMusicDir,
        isVideoActive: state.isVideoActive,
        setEraOpeningPlaying: state.setEraOpeningPlaying,
        uiSoundsVolume: state.uiSoundsVolume
    })))

    const audioRef = React.useRef<HTMLAudioElement | null>(null)
    const [isPlaying, setIsPlaying] = React.useState(false)
    // El archivo no existe en <bgMusicDir>/openings/ → ocultamos el pill.
    const [unavailable, setUnavailable] = React.useState(false)

    // Detener y liberar el audio si cambiamos de saga o se desmonta
    React.useEffect(() => {
        const timer = setTimeout(() => setUnavailable(false), 0)
        return () => {
            clearTimeout(timer)
            const audio = audioRef.current
            if (audio) {
                audio.pause()
                audio.src = ""
                audio.load()
                audioRef.current = null
            }
            setEraOpeningPlaying(false)
        }
    }, [sagaId, setEraOpeningPlaying])

    // Update the app store state when isPlaying changes
    React.useEffect(() => {
        setEraOpeningPlaying(isPlaying)
    }, [isPlaying, setEraOpeningPlaying])

    // Si arranca un video, el opening se calla
    React.useEffect(() => {
        if (isVideoActive && audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause()
        }
    }, [isVideoActive])

    // El volumen se sincroniza acá y no en el handler: mutar audioRef fuera de un
    // effect rompe react-hooks/immutability (el ref ya es dependencia de effects).
    React.useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = Math.pow(uiSoundsVolume, 2)
        }
    }, [uiSoundsVolume])

    if (!opening || !bgMusicDir || unavailable) return null

    const base = getServerBaseUrl() || window.location.origin
    // /api/v1/music/stream rechaza separadores en `file`; la subcarpeta va en `dir`.
    const openingsDir = `${bgMusicDir.replace(/[\\/]+$/, "")}/${ERA_OPENINGS_SUBDIR}`
    const streamUrl = `${base}/api/v1/music/stream?dir=${encodeURIComponent(openingsDir)}&file=${encodeURIComponent(opening.file)}`

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation()

        let audio = audioRef.current
        if (!audio) {
            audio = new Audio(streamUrl)
            audio.volume = Math.pow(uiSoundsVolume, 2)
            audio.addEventListener("ended", () => setIsPlaying(false))
            audio.addEventListener("pause", () => setIsPlaying(false))
            audio.addEventListener("play", () => setIsPlaying(true))
            audio.addEventListener("error", () => {
                setIsPlaying(false)
                setUnavailable(true)
            })
            audioRef.current = audio
        }

        if (isPlaying) {
            audio.pause()
        } else {
            audio.play().catch(() => setUnavailable(true))
        }
    }

    return (
        <button
            onClick={togglePlay}
            className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all duration-base group",
                isPlaying
                    ? "bg-brand-accent/15 border-brand-accent/30 text-brand-accent"
                    : "bg-surface-container-high/50 border-white/5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
                className
            )}
            title={`Tema de la saga — ${opening.title}`}
        >
            {isPlaying ? (
                <Icons.media.pause size={14} className="shrink-0" />
            ) : (
                <Icons.media.play size={14} className="shrink-0 ml-0.5 group-hover:text-brand-accent transition-colors" />
            )}

            <span className="text-xs font-bold uppercase tracking-wider">
                {opening.title}
            </span>

            {isPlaying && (
                <div className="flex items-end gap-[2px] h-3 ml-1">
                    {BAR_HEIGHTS.map((height, i) => (
                        <div
                            key={i}
                            className="w-[2px] bg-brand-accent rounded-full animate-music-bars"
                            style={{
                                animationDelay: `${i * 0.15}s`,
                                height
                            }}
                        />
                    ))}
                </div>
            )}
        </button>
    )
}
