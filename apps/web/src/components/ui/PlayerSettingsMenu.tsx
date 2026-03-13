/**
 * PlayerSettingsMenu.tsx
 *
 * A floating settings panel that renders over the video player.
 * Provides audio track selection and subtitle track selection menus.
 *
 * ─── Rendering Architecture ──────────────────────────────────────────────────
 *
 *  ┌──────────────────────────────── video container (position: relative) ──┐
 *  │   <video>                                                               │
 *  │   <canvas id="jassub-canvas">   ← rendered by useJassub hook           │
 *  │   <PlayerSettingsMenu>          ← this component (absolute overlay)     │
 *  │       └─ Settings gear button (bottom-right of controls bar)            │
 *  │       └─ Floating panel (above the controls bar, anchored bottom-right) │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 * ─── Props vs parent state ───────────────────────────────────────────────────
 * This component is intentionally "dumb" — all track lists and selection
 * callbacks come from the parent (VideoPlayerModal) via props.  This keeps
 * jassub logic in the hook, HLS audio-switch logic in the parent, and this
 * component pure UI.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as React from "react"
import { cn } from "@/components/ui/core/styling"
import { IoSettingsSharp } from "react-icons/io5"
import { FaCheck, FaVolumeUp, FaClosedCaptioning } from "react-icons/fa"
import { MdSubtitles } from "react-icons/md"
import { Loader2, Folder, Zap, Layers } from "lucide-react"
import type { AudioTrack, SubtitleTrack } from "./track-types"
import type { EpisodeSource } from "@/api/types/unified.types"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerSettingsMenuProps {
    // ── Audio ──
    /** All audio tracks available for this stream. Empty → section hidden. */
    audioTracks: AudioTrack[]
    /** Index of the currently active audio track. */
    activeAudioIndex: number
    /** Called when the user picks an audio track. */
    onSelectAudio: (track: AudioTrack) => void

    // ── Subtitles ──
    /** All subtitle tracks available for this stream. Empty → section hidden. */
    subtitleTracks: SubtitleTrack[]
    /**
     * Index of the currently active subtitle track, or `null` when
     * subtitles are disabled ("Off").
     */
    activeSubtitleIndex: number | null
    /** Called when the user picks a subtitle track (or "Off"). */
    onSelectSubtitle: (track: SubtitleTrack | null) => void

    // ── Source Switcher ──
    /**
     * All resolved episode sources from `EpisodeSourcesResponse`.
     * When provided, a "Fuente / Calidad" section is rendered.
     */
    sources?: EpisodeSource[]
    /** URL of the currently active source — used to highlight the active row. */
    currentSourceUrl?: string
    /** Called when the user selects a different source. */
    onSourceChange?: (source: EpisodeSource) => void

    // ── Loading indicator ──
    /** True while a subtitle file is being fetched from the backend. */
    isLoadingSubtitle?: boolean

    /** Extra classes for the gear button. */
    className?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface SectionProps {
    icon: React.ReactNode
    title: string
    children: React.ReactNode
}

/** Collapsible section header inside the settings panel. */
function Section({ icon, title, children }: SectionProps) {
    return (
        <div>
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
                <span className="text-white">{icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {title}
                </span>
            </div>
            <div className="flex flex-col">{children}</div>
        </div>
    )
}

interface TrackRowProps {
    label: string
    sublabel?: string
    isActive: boolean
    onClick: () => void
}

/** A single selectable track row inside the settings panel. */
function TrackRow({ label, sublabel, isActive, onClick }: TrackRowProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "group flex items-center justify-between gap-3 w-full",
                "px-4 py-2.5 rounded-lg text-left",
                "transition-colors duration-150",
                isActive
                    ? "bg-white/15 text-white"
                    : "text-neutral-300 hover:bg-white/5 hover:text-white",
            )}
        >
            <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold leading-tight truncate">
                    {label}
                </span>
                {sublabel && (
                    <span className="text-[10px] text-neutral-500 font-mono mt-0.5">
                        {sublabel}
                    </span>
                )}
            </div>

            {/* ── Active tick ── */}
            <span
                className={cn(
                    "shrink-0 w-4 h-4 rounded-full flex items-center justify-center",
                    "transition-all duration-150",
                    isActive
                        ? "bg-white text-zinc-950 scale-100"
                        : "bg-white/10 scale-75 opacity-0 group-hover:opacity-40 group-hover:scale-90",
                )}
            >
                <FaCheck className="w-2 h-2" />
            </span>
        </button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PlayerSettingsMenu
 *
 * Renders a gear button; clicking it toggles a floating glassmorphism panel
 * listing audio tracks and subtitle tracks.  Clicking outside closes it.
 */
export function PlayerSettingsMenu({
    audioTracks,
    activeAudioIndex,
    onSelectAudio,
    subtitleTracks,
    activeSubtitleIndex,
    onSelectSubtitle,
    sources = [],
    currentSourceUrl,
    onSourceChange,
    isLoadingSubtitle = false,
    className,
}: PlayerSettingsMenuProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const panelRef = React.useRef<HTMLDivElement>(null)
    const buttonRef = React.useRef<HTMLButtonElement>(null)

    // ── Click-outside to close ────────────────────────────────────────────────
    React.useEffect(() => {
        if (!isOpen) return
        const onPointerDown = (e: PointerEvent) => {
            if (
                panelRef.current &&
                !panelRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false)
            }
        }
        document.addEventListener("pointerdown", onPointerDown)
        return () => document.removeEventListener("pointerdown", onPointerDown)
    }, [isOpen])

    // ── Keyboard: close on Escape ─────────────────────────────────────────────
    React.useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.stopPropagation(); setIsOpen(false) }
        }
        // Capture phase so we intercept before the parent's Escape-to-close-modal handler
        document.addEventListener("keydown", onKey, { capture: true })
        return () => document.removeEventListener("keydown", onKey, { capture: true })
    }, [isOpen])

    const hasAudio = audioTracks.length > 0
    const hasSubs = subtitleTracks.length > 0
    const hasSources = sources.length > 0
    const hasAnything = hasAudio || hasSubs || hasSources

    // Format a language code for display, e.g. "jpn" → "JPN"
    const langLabel = (lang: string) => lang.toUpperCase().slice(0, 3)

    return (
        <div className={cn("relative", className)}>
            {/* ─── Gear button ──────────────────────────────────── */}
            <button
                ref={buttonRef}
                type="button"
                aria-label="Configuración de pistas"
                aria-expanded={isOpen}
                onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v) }}
                className={cn(
                    "relative flex items-center justify-center w-12 h-12 rounded-full",
                    "text-white/70 hover:text-white",
                    "transition-all duration-200 hover:scale-110",
                    isOpen && "text-white rotate-45 bg-white/10",
                )}
            >
                <IoSettingsSharp className="w-6 h-6 transition-transform duration-300" />

                {/* Subtle orange glow ring when active */}
                {isOpen && (
                    <span
                        aria-hidden
                        className="absolute inset-0 rounded-full ring-1 ring-white/30 animate-pulse"
                    />
                )}

                {/* Spinner badge while subtitle is loading */}
                {isLoadingSubtitle && (
                    <span className="absolute -top-1 -right-1">
                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    </span>
                )}
            </button>

            {/* ─── Floating panel ───────────────────────────────── */}
            {isOpen && hasAnything && (
                <div
                    ref={panelRef}
                    // Stop click propagation so the video's showControlsTemporarily
                    // handler doesn't fire and auto-hide the controls after 3 s.
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        // Positioning: anchored bottom-right above the controls bar
                        "absolute bottom-12 right-0 z-50",
                        // Size
                        "w-72",
                        // Glassmorphism base
                        "bg-neutral-900/90 backdrop-blur-xl",
                        "border border-white/10 rounded-2xl",
                        "shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
                        "overflow-hidden",
                        // Entrance animation (Tailwind doesn't have keyframes built-in,
                        // so we use the subtle CSS animation below via inline style)
                    )}
                    style={{
                        animation: "settingsFadeUp 0.18s ease-out both",
                    }}
                >
                    {/* Panel header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                        <IoSettingsSharp className="w-4 h-4 text-neutral-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-neutral-400">
                            Configuración
                        </span>
                    </div>

                    <div className="p-2 flex flex-col gap-1 max-h-[50vh] overflow-y-auto
                                    scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

                        {/* ── Audio tracks ─────────────────────────── */}
                        {hasAudio && (
                            <Section
                                icon={<FaVolumeUp className="w-3.5 h-3.5" />}
                                title="Audio"
                            >
                                {audioTracks.map((track) => (
                                    <TrackRow
                                        key={track.index}
                                        label={track.title || langLabel(track.language)}
                                        sublabel={[
                                            track.codec,
                                            track.channels ? `${track.channels}ch` : undefined,
                                        ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                        isActive={track.index === activeAudioIndex}
                                        onClick={() => {
                                            onSelectAudio(track)
                                            // Keep panel open so user can still pick subtitles
                                        }}
                                    />
                                ))}
                            </Section>
                        )}

                        {hasAudio && hasSubs && (
                            <div className="mx-3 my-1 h-px bg-white/5" />
                        )}

                        {/* ── Subtitle tracks ──────────────────────── */}
                        {hasSubs && (
                            <Section
                                icon={<MdSubtitles className="w-3.5 h-3.5" />}
                                title="Subtítulos"
                            >
                                {/* "Off" option — always present */}
                                <TrackRow
                                    label="Desactivado"
                                    isActive={activeSubtitleIndex === null}
                                    onClick={() => {
                                        onSelectSubtitle(null)
                                        setIsOpen(false)
                                    }}
                                />

                                {subtitleTracks.map((track) => {
                                    const codecBadge = track.codec?.toUpperCase()
                                    const forcedBadge = track.forced ? "Forzado" : undefined
                                    const sublabel = [codecBadge, forcedBadge]
                                        .filter(Boolean)
                                        .join(" · ")

                                    return (
                                        <TrackRow
                                            key={track.index}
                                            label={track.title || langLabel(track.language)}
                                            sublabel={sublabel || undefined}
                                            isActive={track.index === activeSubtitleIndex}
                                            onClick={() => {
                                                onSelectSubtitle(track)
                                                setIsOpen(false)
                                            }}
                                        />
                                    )
                                })}
                            </Section>
                        )}

                        {/* ── Source / Quality switcher ───────────────────── */}
                        {hasSources && (
                            <>
                                {(hasAudio || hasSubs) && (
                                    <div className="mx-3 my-1 h-px bg-white/5" />
                                )}
                                <Section
                                    icon={<Layers className="w-3.5 h-3.5" />}
                                    title="Fuente / Calidad"
                                >
                                    {sources.map((src, idx) => {
                                        const isLocal = src.type === "local"
                                        const label = isLocal
                                            ? `Local\u2014${src.quality && src.quality !== "unknown" ? src.quality : "Original"}`
                                            : `Stream\u2014${src.quality !== "unknown" ? src.quality : src.title}`
                                        const sub = isLocal
                                            ? (src.path?.split(/[\\/\\\\]/).pop())
                                            : src.title
                                        const isActive = currentSourceUrl
                                            ? src.url === currentSourceUrl
                                            : idx === 0

                                        return (
                                            <TrackRow
                                                key={src.url || idx}
                                                label={label}
                                                sublabel={sub}
                                                isActive={isActive}
                                                onClick={() => {
                                                    onSourceChange?.(src)
                                                    setIsOpen(false)
                                                }}
                                            />
                                        )
                                    })}
                                </Section>
                            </>
                        )}
                    </div>

                    {/* Footer: loaded-subtitle status */}
                    {isLoadingSubtitle && (
                        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/5
                                        text-[11px] text-neutral-500">
                            <Loader2 className="w-3 h-3 animate-spin text-zinc-400 shrink-0" />
                            Cargando subtítulos ASS…
                        </div>
                    )}
                </div>
            )}

            {/*
             * Keyframe animation for the floating panel entrance.
             * Injected once via a <style> tag so we don't need a separate CSS file
             * (per the strict Tailwind-only rule — this is the minimal exception for
             * a keyframe that Tailwind can't express natively).
             */}
            <style>{`
                @keyframes settingsFadeUp {
                    from { opacity: 0; transform: translateY(8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }
            `}</style>
        </div>
    )
}
