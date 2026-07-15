import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Zap, FastForward, Check, Monitor, Settings, Volume2, Subtitles } from "lucide-react"
import { cn } from "@/components/ui/core/styling"
import { Vaul, VaulContent } from "@/components/vaul"

import type { PlayerSettingsMenuProps } from "./track-types"
import { SettingsLayout, MenuButton } from "./player-settings/SettingsLayout"
import { AudioSettings } from "./player-settings/AudioSettings"
import { SubtitleSettings } from "./player-settings/SubtitleSettings"
import { QualitySettings } from "./player-settings/QualitySettings"
import { PlaybackSettings } from "./player-settings/PlaybackSettings"

type SettingsView = "main" | "audio" | "subtitles" | "quality" | "playback" | "image"

const ASPECT_RATIO_LABELS: Record<string, string> = {
    contain: "Ajustado",
    cover: "Recortar",
    fill: "Estirar",
}

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
    open,
    onOpenChange,
    playbackRate = 1,
    onPlaybackRateChange,
    autoSkipIntro = false,
    onAutoSkipIntroChange,
    autoSkipOutro = false,
    onAutoSkipOutroChange,
    skipStepSeconds = 85,
    onSkipStepSecondsChange,
    showHeatmap = true,
    onShowHeatmapChange,
    hlsLevels = [],
    activeHlsLevel = -1,
    onHlsLevelChange,
    aspectRatio = "contain",
    onAspectRatioChange,
    subtitleSize = 100,
    onSubtitleSizeChange,
    autoDisableSubtitlesWhenDubbed = true,
    onAutoDisableSubtitlesWhenDubbedChange,
    tvMode = false,
    onTvModeChange,
    marathonMode = false,
    onMarathonModeChange,
    videoRef,
    malId,
    mediaId,
    duration,
    episodeNumber,
    mediaFormat,
    ambientModeEnabled = true,
    onAmbientModeEnabledChange,
}: PlayerSettingsMenuProps) {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const [view, setView] = React.useState<SettingsView>("main")

    const isControlled = open !== undefined
    const isOpen = isControlled ? open : internalOpen

    const setIsOpen = React.useCallback((v: boolean) => {
        if (isControlled) {
            onOpenChange?.(v)
        } else {
            setInternalOpen(v)
        }
    }, [isControlled, onOpenChange])

    React.useEffect(() => {
        if (!isOpen) {
            const t = setTimeout(() => setView("main"), 200)
            return () => clearTimeout(t)
        }
    }, [isOpen])

    const panelRef = React.useRef<HTMLDivElement>(null)
    const buttonRef = React.useRef<HTMLButtonElement>(null)

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
    }, [isOpen, setIsOpen])

    React.useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation()
                setIsOpen(false)
            }
        }
        document.addEventListener("keydown", onKey, { capture: true })
        return () => document.removeEventListener("keydown", onKey, { capture: true })
    }, [isOpen, setIsOpen])

    const getFriendlyLanguage = (lang: string) => {
        const lower = lang.toLowerCase()
        if (lower.startsWith("spa") || lower === "es") return "Español"
        if (lower.startsWith("jpn") || lower === "ja") return "Japonés"
        if (lower.startsWith("eng") || lower === "en") return "Inglés"
        if (lower.startsWith("fra") || lower === "fr") return "Francés"
        if (lower.startsWith("ger") || lower === "de") return "Alemán"
        if (lower.startsWith("ita") || lower === "it") return "Italiano"
        if (lower.startsWith("por") || lower === "pt") return "Portugués"
        if (lower === "und") return "Desconocido"
        return lang.toUpperCase()
    }

    const langLabel = (lang: string) => getFriendlyLanguage(lang)

    const activeAudio = audioTracks.find(t => t.index === activeAudioIndex)
    const activeSubtitle = activeSubtitleIndex !== null
        ? subtitleTracks.find(t => t.index === activeSubtitleIndex)
        : null

    const hlsQuality = activeHlsLevel === -1
        ? "Auto"
        : hlsLevels.find(l => l.index === activeHlsLevel)?.label || "Auto"

    const activeQuality = hlsLevels.length > 0
        ? hlsQuality
        : (sources.find(s => s.url === currentSourceUrl)?.quality || "Original")

    const autoSkipLabel = [
        autoSkipIntro ? "Intro" : null,
        autoSkipOutro ? "Outro" : null,
    ].filter(Boolean).join("+") || "Apagado"

    const renderContent = () => (
        <>
            {/* ── MAIN MENU ───────────────────────────────── */}
            {view === "main" && (
                <SettingsLayout title="Configuración" onClose={() => setIsOpen(false)}>
                    <MenuButton
                        icon={<Volume2 className="w-4 h-4" />}
                        label="Audio"
                        value={activeAudio ? (activeAudio.title || langLabel(activeAudio.language)) : "Desconocido"}
                        onClick={() => setView("audio")}
                    />
                    <MenuButton
                        icon={<Subtitles className="w-4 h-4" />}
                        label="Subtítulos"
                        value={activeSubtitle ? (activeSubtitle.title || langLabel(activeSubtitle.language)) : "Desactivado"}
                        onClick={() => setView("subtitles")}
                    />
                    
                    <MenuButton
                        icon={<Monitor className="w-4 h-4" />}
                        label="Imagen"
                        value={ASPECT_RATIO_LABELS[aspectRatio] || "Ajustado"}
                        onClick={() => setView("image")}
                    />
                    <MenuButton
                        icon={<FastForward className="w-4 h-4" />}
                        label="Reproducción"
                        value={`Skip ${autoSkipLabel}`}
                        onClick={() => setView("playback")}
                    />
                </SettingsLayout>
            )}

            {/* ── AUDIO ──────────────────────────────────── */}
            {view === "audio" && (
                <SettingsLayout
                    title="Audio"
                    onBack={() => setView("main")}
                    onClose={() => setIsOpen(false)}
                >
                    <AudioSettings
                        audioTracks={audioTracks}
                        activeAudioIndex={activeAudioIndex}
                        onSelectAudio={onSelectAudio}
                        getFriendlyLanguage={getFriendlyLanguage}
                    />
                </SettingsLayout>
            )}

            {/* ── SUBTÍTULOS ─────────────────────────────── */}
            {view === "subtitles" && (
                <SettingsLayout
                    title="Subtítulos"
                    onBack={() => setView("main")}
                    onClose={() => setIsOpen(false)}
                >
                    <SubtitleSettings
                        subtitleTracks={subtitleTracks}
                        activeSubtitleIndex={activeSubtitleIndex}
                        onSelectSubtitle={(track) => {
                            onSelectSubtitle(track)
                            setIsOpen(false)
                        }}
                        subtitleSize={subtitleSize}
                        onSubtitleSizeChange={onSubtitleSizeChange}
                        getFriendlyLanguage={getFriendlyLanguage}
                    />
                </SettingsLayout>
            )}

            {/* ── CALIDAD / FUENTE ───────────────────────── */}
            {view === "quality" && (
                <SettingsLayout
                    title="Calidad / Fuente"
                    onBack={() => setView("main")}
                    onClose={() => setIsOpen(false)}
                >
                    {hlsLevels.length > 0 && (
                        <div className="flex flex-col border-b border-white/5 pb-2 mb-2">
                            <div className="px-4 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Resolución HLS</div>
                            <button
                                onClick={() => { onHlsLevelChange?.(-1); setIsOpen(false) }}
                                className={cn(
                                    "flex items-center justify-between px-4 py-3 transition-all",
                                    activeHlsLevel === -1 ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <span className="text-xs font-bold">Auto</span>
                                {activeHlsLevel === -1 && <Check className="w-3.5 h-3.5" />}
                            </button>
                            {hlsLevels.map((level) => (
                                <button
                                    key={level.index}
                                    onClick={() => { onHlsLevelChange?.(level.index); setIsOpen(false) }}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-3 transition-all",
                                        activeHlsLevel === level.index ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <span className="text-xs font-bold">{level.label}</span>
                                    {activeHlsLevel === level.index && <Check className="w-3.5 h-3.5" />}
                                </button>
                            ))}
                        </div>
                    )}

                    {sources.length > 0 && (
                        <>
                            {hlsLevels.length > 0 && <div className="px-4 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fuentes</div>}
                            <QualitySettings
                                sources={sources}
                                currentSourceUrl={currentSourceUrl}
                                onSourceChange={(source) => {
                                    onSourceChange?.(source)
                                    setIsOpen(false)
                                }}
                            />
                        </>
                    )}
                </SettingsLayout>
            )}

            {/* ── IMAGEN ─────────────────────────────────── */}
            {view === "image" && (
                <SettingsLayout
                    title="Imagen"
                    onBack={() => setView("main")}
                    onClose={() => setIsOpen(false)}
                >
                    <div className="px-4 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Relación de aspecto</div>
                    {(["contain", "cover", "fill"] as const).map((ratio) => (
                        <button
                            key={ratio}
                            onClick={() => onAspectRatioChange?.(ratio)}
                            className={cn(
                                "flex items-center justify-between w-full px-4 py-3 transition-all",
                                aspectRatio === ratio ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold">{ASPECT_RATIO_LABELS[ratio]}</span>
                                <span className="text-[9px] text-zinc-600 mt-0.5">
                                    {ratio === "contain" && "Barras negras · conserva proporción"}
                                    {ratio === "cover" && "Rellena y recorta bordes"}
                                    {ratio === "fill" && "Estira la imagen sin recortar"}
                                </span>
                            </div>
                            {aspectRatio === ratio && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                    ))}
                </SettingsLayout>
            )}

            {/* ── REPRODUCCIÓN ───────────────────────────── */}
            {view === "playback" && (
                <SettingsLayout
                    title="Reproducción"
                    onBack={() => setView("main")}
                    onClose={() => setIsOpen(false)}
                >
                    <PlaybackSettings
                        playbackRate={playbackRate}
                        onPlaybackRateChange={onPlaybackRateChange ?? (() => {})}
                        autoSkipIntro={autoSkipIntro}
                        onAutoSkipIntroChange={onAutoSkipIntroChange ?? (() => {})}
                        autoSkipOutro={autoSkipOutro}
                        onAutoSkipOutroChange={onAutoSkipOutroChange ?? (() => {})}
                        skipStepSeconds={skipStepSeconds}
                        onSkipStepSecondsChange={onSkipStepSecondsChange ?? (() => {})}
                        showHeatmap={showHeatmap}
                        onShowHeatmapChange={onShowHeatmapChange ?? (() => {})}
                        autoDisableSubtitlesWhenDubbed={autoDisableSubtitlesWhenDubbed}
                        onAutoDisableSubtitlesWhenDubbedChange={onAutoDisableSubtitlesWhenDubbedChange ?? (() => {})}
                        tvMode={tvMode}
                        onTvModeChange={onTvModeChange}
                        ambientModeEnabled={ambientModeEnabled}
                        onAmbientModeEnabledChange={onAmbientModeEnabledChange ?? (() => {})}
                        marathonMode={marathonMode}
                        onMarathonModeChange={onMarathonModeChange}
                        showSeparator={false}
                        mediaFormat={mediaFormat}
                    />
                </SettingsLayout>
            )}
        </>
    )

    return (
        <div className={cn("relative", className)}>
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }}
                aria-label="Configuración [O]"
                title="Configuración [O]"
                className={cn(
                    "relative flex items-center justify-center w-11 h-11 md:w-7 md:h-7",
                    "text-zinc-500 hover:text-white",
                    "transition-all duration-200",
                    isOpen && "text-white"
                )}
            >
                <Settings className={cn("w-4 h-4 md:w-3.5 md:h-3.5 transition-transform duration-300", isOpen && "rotate-90")} />
                {isLoadingSubtitle && (
                    <span className="absolute -top-0.5 -right-0.5">
                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                    </span>
                )}
            </button>

            {/* Desktop panel */}
            <div ref={panelRef} className="hidden md:block absolute bottom-16 right-0 z-50 pointer-events-auto">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                        >
                            {renderContent()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile bottom-sheet */}
            <div className="md:hidden">
                <Vaul open={isOpen} onOpenChange={setIsOpen}>
                    <VaulContent className="bg-zinc-950/95 backdrop-blur-[var(--blur-overlay-xl)] border-t border-outline-variant/10 p-5 pb-8 focus:outline-none max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h3 className="font-bebas text-2xl tracking-widest text-on-surface uppercase">
                                Ajustes
                            </h3>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-full text-on-surface-variant hover:text-on-surface active:scale-95"
                            >
                                <Settings className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
                            </button>
                        </div>
                        {renderContent()}
                    </VaulContent>
                </Vaul>
            </div>
        </div>
    )
}
