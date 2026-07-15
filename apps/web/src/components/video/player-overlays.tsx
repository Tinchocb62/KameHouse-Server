import React, { useState, useEffect, useRef } from "react"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"

export function LoadingErrorOverlay({
    status,
    errorMsg,
    streamType,
    isBuffering,
    isSeeking,
    isStreamSwitching,
    onClose
}: {
    status: "loading" | "ready" | "error"
    errorMsg: string
    streamType: string
    isBuffering: boolean
    isSeeking?: boolean
    /** true cuando el loading es un cambio de stream mid-playback (ej. switch de pista de audio).
     *  En ese caso se muestra fondo semitransparente en vez de negro sólido. */
    isStreamSwitching?: boolean
    onClose: () => void
}) {
    // Debounce buffering spinner on seek: wait 500ms before showing it
    const [showBuffering, setShowBuffering] = useState(false)
    const bufferingTimerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (isBuffering && isSeeking) {
            if (bufferingTimerRef.current) clearTimeout(bufferingTimerRef.current)
            bufferingTimerRef.current = setTimeout(() => setShowBuffering(true), 500)
        } else if (isBuffering) {
            setShowBuffering(true)
        } else {
            if (bufferingTimerRef.current) clearTimeout(bufferingTimerRef.current)
            setShowBuffering(false)
        }
        return () => {
            if (bufferingTimerRef.current) clearTimeout(bufferingTimerRef.current)
        }
    }, [isBuffering, isSeeking])

    if (status === "loading") {
        // Cambio de stream mid-playback (ej. cambio de pista de audio direct→transcode):
        // el video sigue renderizado detrás del overlay, así que usamos fondo semitransparente
        // con blur para que la imagen congelada sea visible y la transición sea fluida.
        if (isStreamSwitching) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-30 text-white"
                    style={{ backdropFilter: "blur(var(--blur-overlay-sm))", background: "color-mix(in srgb, black 55%, transparent)" }}>
                    <div className="flex flex-col items-center gap-5 px-8 py-6 rounded-2xl border border-white/10"
                        style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 60%, transparent)" }}>
                        <Icons.ui.spinner className="w-10 h-10 text-white animate-spin" />
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/90">
                                Cambiando pista de audio
                            </span>
                            <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/40">
                                Iniciando transcodificación…
                            </span>
                        </div>
                    </div>
                </div>
            )
        }
        // Carga inicial del player: fondo negro sólido.
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 text-white bg-black">
                <Icons.ui.spinner className="w-16 h-16 text-white animate-spin" />
            </div>
        )
    }

    if (showBuffering && status === "ready") {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 text-white pointer-events-none" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 20%, transparent)" }}>
                <Icons.ui.spinner className="w-16 h-16 text-white animate-spin" />
                {isSeeking && (
                    <p className="mt-4 font-black tracking-[0.4em] uppercase text-[10px] opacity-50">
                        Buscando...
                    </p>
                )}
            </div>
        )
    }

    if (status === "error") {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 px-8 text-center text-white backdrop-blur-[var(--blur-overlay-lg)] [&>*:not(:first-child)]:mt-6" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 85%, transparent)" }}>
                <Icons.ui.alert className="w-16 h-16 text-brand-orange animate-pulse" />
                <h3 className="font-bebas text-3xl tracking-[0.2em] uppercase">TRANSMISIÓN CAÍDA</h3>
                <p className="text-zinc-400 max-w-md text-sm font-medium uppercase tracking-wide leading-relaxed">{errorMsg}</p>
                <button
                    onClick={onClose}
                    className="mt-6 px-10 py-3.5 bg-brand-orange hover:brightness-110 text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all rounded-xl active:scale-95"
                >
                    REGRESAR
                </button>
            </div>
        )
    }

    return null
}

export function ResumeOverlay({ show, time, onResume, onClose }: { show: boolean, time: number, onResume: () => void, onClose: () => void }) {
    if (!show) return null

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60)
        const s = Math.floor(secs % 60)
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div className="absolute bottom-20 left-4 sm:bottom-32 sm:left-10 z-50 pointer-events-auto animate-in slide-in-from-left-4 duration-500">
            <div className="bg-[var(--bg-secondary)] border border-[var(--glass-strong)] rounded-[22px] shadow-[var(--shadow-modal)] p-5 flex flex-col min-w-[240px] sm:min-w-[280px] [&>*:not(:first-child)]:mt-4">
                <div className="flex items-center justify-between ml-8">
                    <div className="flex flex-col [&>*:not(:first-child)]:mt-0.5">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Continuar viendo</span>
                        <span className="text-white font-bold text-sm">Desde {formatTime(time)}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-zinc-500 hover:text-white"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex [&>*:not(:first-child)]:ml-2">
                    <button
                        tabIndex={0}
                        onClick={onResume}
                        className="flex-1 py-3 bg-brand-orange hover:brightness-110 text-white font-black text-[9px] uppercase tracking-widest transition-all rounded-xl active:scale-95 flex items-center justify-center [&>*:not(:first-child)]:ml-2 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-orange"
                    >
                        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        REANUDAR
                    </button>
                    <button
                        tabIndex={0}
                        onClick={onClose}
                        className="flex-1 py-3 bg-surface-container border border-white/5 text-zinc-300 font-black text-[9px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all rounded-xl active:scale-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    >
                        IGNORAR
                    </button>
                </div>
            </div>
        </div>
    )
}

export function CenterPlayFlash({ flash }: { flash: "play" | "pause" | null }) {
    if (!flash) return null
    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="flex items-center justify-center w-24 h-24 bg-white/10 border border-white/20 animate-[ping_0.4s_ease-out_forwards]">
                {flash === "play"
                    ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white ml-1"><path d="M8 5v14l11-7z" /></svg>
                    : <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                }
            </div>
        </div>
    )
}

export function SkipIntroOverlay({
    show,
    onSkip,
    skipMode = "intro",
    remainingSeconds,
    segmentProgress = 0,
    shortcutKey = "S",
}: {
    show: boolean
    onSkip: () => void
    /** "intro" for opening, "outro" for ending — controls label and accent color */
    skipMode?: "intro" | "outro"
    remainingSeconds?: number
    /** 0-100: how much of the current skip segment has elapsed (drives the fill bar) */
    segmentProgress?: number
    shortcutKey?: string
}) {
    const isOutro = skipMode === "outro"
    const label = isOutro ? "SALTAR OUTRO" : "SALTAR INTRO"
    // Progress left = how much is remaining (inverted from elapsed)
    const fillProgress = 100 - segmentProgress

    return (
        <div className={cn(
            "absolute bottom-20 left-4 sm:bottom-24 sm:left-10 md:left-12 z-30 transition-all duration-300 pointer-events-auto",
            show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
            <button
                id="skip-intro-btn"
                tabIndex={0}
                aria-label={isOutro ? "Saltar Outro / Ending" : "Saltar Intro / Opening"}
                onClick={(e) => {
                    e.stopPropagation()
                    onSkip()
                }}
                className={cn(
                    "relative flex items-center px-6 py-3 overflow-hidden text-white backdrop-blur-[var(--blur-overlay-lg)]",
                    "bg-black/60 border border-[var(--glass-strong)] rounded-[22px] shadow-[var(--shadow-modal)]",
                    isOutro
                        ? "border-brand-secondary/30 hover:border-brand-secondary/60 hover:bg-brand-secondary/15"
                        : "border-white/10 hover:border-brand-accent/40 hover:bg-brand-accent/15",
                    "text-[10px] font-black uppercase tracking-[0.3em]",
                    "transition-all duration-300",
                    "active:scale-95",
                    "group",
                    "[&>*:not(:first-child)]:ml-3",
                    "focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                )}
            >
                {/* Animated segment countdown fill — shrinks from full to empty */}
                <div
                    className={cn(
                        "absolute bottom-0 left-0 h-[2px] transition-all duration-1000 ease-linear",
                        isOutro ? "bg-brand-secondary" : "bg-brand-accent"
                    )}
                    style={{ width: `${fillProgress}%` }}
                />

                {/* Skip icon */}
                <svg viewBox="0 0 24 24" fill="currentColor" className={cn(
                    "w-4 h-4 transition-colors shrink-0",
                    isOutro ? "text-brand-secondary group-hover:brightness-110" : "text-brand-accent group-hover:brightness-110"
                )}>
                    <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
                </svg>

                <span className="text-white">{label}</span>

                {/* Remaining seconds badge */}
                {remainingSeconds !== undefined && remainingSeconds > 0 && (
                    <span className={cn(
                        "text-[9px] font-mono tabular-nums tracking-widest",
                        "px-2 py-0.5 rounded",
                        isOutro
                            ? "bg-brand-secondary/20 text-brand-secondary group-hover:bg-white/20 group-hover:text-white"
                            : "bg-white/10 group-hover:bg-white/20 group-hover:text-white text-zinc-300"
                    )}>
                        {remainingSeconds}s
                    </span>
                )}

                <span className="text-white/30 text-[9px] font-black ml-1 hidden sm:inline group-hover:text-white/40">
                    [{shortcutKey}]
                </span>
            </button>
        </div>
    )
}

export function AutoSkipToastOverlay({
    showType,
    onUndo
}: {
    showType: "intro" | "outro" | "pause" | null
    onUndo: () => void
}) {
    const label = showType === "outro"
        ? "Outro saltado"
        : showType === "pause"
            ? "Reproducción pausada"
            : "Intro saltada"

    return (
        <div className={cn(
            "absolute bottom-20 left-4 sm:bottom-24 sm:left-10 md:left-12 z-30 transition-all duration-300 pointer-events-auto",
            showType ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
            <div className={cn(
                "flex items-center px-5 py-3 text-white backdrop-blur-[var(--blur-overlay-lg)]",
                "bg-black/60 border border-white/10 rounded-[22px] shadow-[var(--shadow-modal)]",
                "text-[10px] font-black uppercase tracking-[0.3em]",
                "[&>*:not(:first-child)]:ml-3"
            )}>
                <span className="text-white">{label}</span>

                <button
                    tabIndex={showType ? 0 : -1}
                    aria-label="Deshacer salto"
                    onClick={(e) => {
                        e.stopPropagation()
                        onUndo()
                    }}
                    className={cn(
                        "text-brand-accent hover:brightness-125 transition-all duration-300 active:scale-95",
                        "text-[10px] font-black uppercase tracking-[0.3em]",
                        "focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded"
                    )}
                >
                    Deshacer
                </button>
            </div>
        </div>
    )
}

export function NextEpisodeOverlay({
    show,
    tvMode: _tvMode,
    marathonMode: _marathonMode = false,
    showCountdown,
    countdownSeconds,
    nextEpisodeTitle,
    nextEpisodeImage,
    nextEpisodeNumber,
    onNext,
    duration: _duration,
    remainingProgress
}: {
    show: boolean
    tvMode: boolean
    marathonMode?: boolean
    showCountdown: boolean
    countdownSeconds: number
    nextEpisodeTitle?: string
    nextEpisodeImage?: string
    nextEpisodeNumber?: number
    onNext: () => void
    duration: number
    remainingProgress: number // 0 to 100
}) {
    return (
        <div className={cn(
            "absolute bottom-20 right-4 sm:bottom-32 sm:right-8 md:right-12 z-30 transition-all duration-300 pointer-events-auto",
            show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
        )}>
            <div className={cn(
                "flex flex-col w-64 sm:w-72 bg-[var(--glass-panel-bg-strong)] backdrop-blur-[var(--blur-overlay-md)] border border-white/[0.08]",
                "shadow-player overflow-hidden rounded-2xl",
                "[&>*:not(:first-child)]:mt-4"
            )}>
                {/* Thumbnail */}
                {nextEpisodeImage && (
                    <div className="relative w-full aspect-video bg-zinc-900 overflow-hidden">
                        <img
                            src={nextEpisodeImage}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        {showCountdown && (
                            <div className="absolute top-3 right-3 bg-black/70 text-[9px] font-black uppercase tracking-widest text-white px-2 py-1 rounded">
                                AUTO: {countdownSeconds}S
                            </div>
                        )}
                        {/* Play icon overlay hint */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Icons.media.play className="w-10 h-10 text-white/80 fill-white/80" />
                        </div>
                    </div>
                )}

                <div className="flex flex-col px-5 pb-5 pt-2 [&>*:not(:first-child)]:mt-3">
                    {/* Label */}
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em]">
                            {nextEpisodeNumber ? `EPISODIO ${nextEpisodeNumber}` : "SIGUIENTE"}
                        </span>
                        {!nextEpisodeImage && showCountdown && (
                            <span className="text-white text-[10px] font-black tabular-nums tracking-widest">
                                AUTO: {countdownSeconds}S
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    {nextEpisodeTitle && (
                        <p className="text-white text-sm font-black leading-tight uppercase tracking-tight line-clamp-2">
                            {nextEpisodeTitle}
                        </p>
                    )}

                    {/* Auto transition progress bar */}
                    {showCountdown && (
                        <div className="w-full h-1 bg-surface-container overflow-hidden rounded-full">
                            <div
                                className="h-full bg-brand-orange transition-all duration-1000 ease-linear"
                                style={{ width: `${remainingProgress}%` }}
                            />
                        </div>
                    )}

                    {/* Button */}
                    <button
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation()
                            onNext()
                        }}
                        className={cn(
                            "w-full py-3 text-[10px] font-black uppercase tracking-[0.3em] rounded-xl",
                            "bg-brand-orange text-white hover:brightness-110",
                            "transition-all duration-300 active:scale-95",
                            "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-orange"
                        )}
                    >
                        SIGUIENTE →
                    </button>
                </div>
            </div>
        </div>
    )
}
