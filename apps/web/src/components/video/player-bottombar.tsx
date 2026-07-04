import React from "react"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"

import { TimelineHeatmap, type InsightNode } from "@/components/ui/timeline-heatmap"
import { PlayerSettingsMenu } from "@/components/ui/PlayerSettingsMenu"
import type { AudioTrack, SubtitleTrack } from "@/components/ui/track-types"
import type { EpisodeSource } from "@/api/types/unified.types"
import { cleanMediaTitle } from "@/lib/helpers/media"

export interface Chapter {
    startTime: number
    endTime: number
    name: string
    type?: string
}

const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "00:00"
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = Math.floor(secs % 60)
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export interface PlayerBottomBarProps {
    title?: string
    episodeNumber?: number
    episodeLabel?: string
    mediaFormat?: string | null
    duration: number
    insights: InsightNode[]
    progressBarRef: React.RefObject<HTMLDivElement>
    progressInputRef: React.RefObject<HTMLInputElement>
    handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void
    handleSeekStart?: () => void
    handleSeekEnd?: (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => void
    isPlaying: boolean
    togglePlay: () => void
    skipTime: (amount: number) => void
    isMuted: boolean
    toggleMute: () => void
    volume: number
    handleVolume: (e: React.ChangeEvent<HTMLInputElement>) => void
    timeTextRef: React.RefObject<HTMLSpanElement>

    // settings menu
    audioTracks: AudioTrack[]
    activeAudioIndex: number
    onSelectAudio: (track: AudioTrack) => void
    subtitleTracks: SubtitleTrack[]
    activeSubtitleIndex: number | null
    onSelectSubtitle: (track: SubtitleTrack | null) => void
    isJassubLoading: boolean
    episodeSources: EpisodeSource[]
    activeStreamUrl: string
    handleSourceSwitch: (source: EpisodeSource) => void

    isFullscreen: boolean
    toggleFullscreen: () => void
    settingsOpen?: boolean
    onToggleSettings?: (open?: boolean) => void

    // Seanime features
    onTakeScreenshot?: () => void
    onTogglePip?: () => void
    playbackRate?: number
    onPlaybackRateChange?: (rate: number) => void
    autoSkipIntro?: boolean
    onAutoSkipIntroChange?: (enabled: boolean) => void
    autoSkipOutro?: boolean
    onAutoSkipOutroChange?: (enabled: boolean) => void

    onNextEpisode?: () => void
    hasNextEpisode?: boolean

    hlsLevels?: { index: number; label: string; height: number }[]
    activeHlsLevel?: number
    onHlsLevelChange?: (level: number) => void

    showHeatmap?: boolean
    onShowHeatmapChange?: (show: boolean) => void

    aspectRatio?: "contain" | "fill" | "cover" | "16/9"
    onAspectRatioChange?: (ratio: "contain" | "fill" | "cover" | "16/9") => void

    subtitleSize?: number
    onSubtitleSizeChange?: (size: number) => void

    loopEnabled?: boolean
    onLoopEnabledChange?: (enabled: boolean) => void

    autoDisableSubtitlesWhenDubbed?: boolean
    onAutoDisableSubtitlesWhenDubbedChange?: (enabled: boolean) => void

    marathonMode?: boolean
    onMarathonModeChange?: (enabled: boolean) => void
    tvMode?: boolean
    onTvModeChange?: (enabled: boolean) => void

    /** AniSkip intervals for rendering visual markers on the timeline */
    skipTimesOp?: { startTime: number; endTime: number }
    skipTimesEd?: { startTime: number; endTime: number }

    // Chapters
    chapters?: Chapter[]
    skipToNextChapter?: () => void
    skipToPrevChapter?: () => void
    activeChapter?: string | null

    // Episode Selector
    isEpisodesSidebarOpen?: boolean
    onToggleEpisodesSidebar?: () => void
    hasEpisodes?: boolean

    // Queue Selector
    isQueueSidebarOpen?: boolean
    onToggleQueueSidebar?: () => void
    hasQueue?: boolean

    videoRef?: React.RefObject<HTMLVideoElement | null>
    malId?: number | null
    mediaId?: number
}

function getSeriesName(fullTitle?: string): string {
    if (!fullTitle) return ""
    if (fullTitle.includes(":")) {
        return fullTitle.split(":")[0].trim()
    }
    const match = fullTitle.match(/^(dragon\s*ball\s*(z|gt|super|kai)?)/i)
    if (match) {
        return match[1].trim()
    }
    return fullTitle
}

const SkipNextChapterIcon = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="fill-current">
        <polygon points="5 4 15 12 5 20 5 4" fill="currentColor"/>
        <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
)

export const PlayerBottomBar = React.memo(function PlayerBottomBar({
    title, episodeNumber, episodeLabel, mediaFormat,
    duration, insights, progressBarRef, progressInputRef, handleSeek, handleSeekStart, handleSeekEnd,
    isPlaying, togglePlay, skipTime: _skipTime,
    isMuted, toggleMute, volume, handleVolume,
    timeTextRef,
    audioTracks, activeAudioIndex, onSelectAudio,
    subtitleTracks, activeSubtitleIndex, onSelectSubtitle,
    isJassubLoading, episodeSources, activeStreamUrl, handleSourceSwitch,
    isFullscreen, toggleFullscreen,
    settingsOpen, onToggleSettings,
    onTakeScreenshot: _onTakeScreenshot, onTogglePip: _onTogglePip,
    playbackRate = 1, onPlaybackRateChange,
    autoSkipIntro = false, onAutoSkipIntroChange,
    autoSkipOutro = false, onAutoSkipOutroChange,
    onNextEpisode,
    hasNextEpisode,
    hlsLevels = [], activeHlsLevel = -1, onHlsLevelChange,
    showHeatmap = true, onShowHeatmapChange,
    aspectRatio = "contain", onAspectRatioChange,
    subtitleSize = 100, onSubtitleSizeChange,
    loopEnabled = false, onLoopEnabledChange,
    autoDisableSubtitlesWhenDubbed = true, onAutoDisableSubtitlesWhenDubbedChange,
    marathonMode = false, onMarathonModeChange,
    tvMode = false, onTvModeChange,
    skipTimesOp,
    skipTimesEd,
    chapters = [],
    skipToNextChapter,
    skipToPrevChapter,
    activeChapter,
    isEpisodesSidebarOpen: _isEpisodesSidebarOpen,
    onToggleEpisodesSidebar: _onToggleEpisodesSidebar,
    hasEpisodes: _hasEpisodes,
    isQueueSidebarOpen,
    onToggleQueueSidebar,
    hasQueue,
    videoRef,
    malId,
    mediaId,
}: PlayerBottomBarProps) {
    const isMovie = React.useMemo(() => {
        const formatUpper = mediaFormat?.toUpperCase()
        return formatUpper === "MOVIE" || formatUpper === "SPECIAL" || formatUpper === "OVA"
    }, [mediaFormat])

    return (
        <div className={cn(
            "absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl flex flex-col pointer-events-auto select-none",
            "bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_85%,transparent)] backdrop-blur-[var(--blur-overlay-xl)] border border-outline-variant rounded-full shadow-elevation-4 px-6 py-3 z-30",
        )}>

            {/* Progress Timeline */}
            <div className="relative flex items-center h-3 md:h-3 cursor-pointer w-full mb-2 py-2.5 md:py-0 -my-2.5 md:my-0">
                {showHeatmap && (
                    <TimelineHeatmap
                        duration={duration}
                        insights={insights}
                        className="absolute bottom-0 inset-x-0 w-full h-3 opacity-15 pointer-events-none transition-all duration-300"
                    />
                )}
                {/* Track background */}
                <div className="w-full h-[4px] bg-outline-variant/50 rounded-full relative flex items-center">

                    {/* Skip segment markers — rendered behind the playback bar */}
                    {duration > 0 && skipTimesOp && (
                        <div
                            className="absolute top-0 bottom-0 bg-brand-accent/25 pointer-events-none rounded-sm"
                            title={`Intro: ${Math.round(skipTimesOp.startTime)}s – ${Math.round(skipTimesOp.endTime)}s`}
                            style={{
                                left: `${(skipTimesOp.startTime / duration) * 100}%`,
                                width: `${((skipTimesOp.endTime - skipTimesOp.startTime) / duration) * 100}%`,
                            }}
                        />
                    )}
                    {duration > 0 && skipTimesEd && (
                        <div
                            className="absolute top-0 bottom-0 bg-brand-secondary/25 pointer-events-none rounded-sm"
                            title={`Outro: ${Math.round(skipTimesEd.startTime)}s – ${Math.round(skipTimesEd.endTime)}s`}
                            style={{
                                left: `${(skipTimesEd.startTime / duration) * 100}%`,
                                width: `${((skipTimesEd.endTime - skipTimesEd.startTime) / duration) * 100}%`,
                            }}
                        />
                    )}

                    {/* Chapter tick markers */}
                    {duration > 0 && !isMovie && chapters && chapters.map((chapter, idx) => {
                        if (chapter.startTime <= 0 || chapter.startTime >= duration) return null;
                        return (
                            <div
                                key={idx}
                                className="absolute top-0 bottom-0 w-[2px] bg-surface pointer-events-none z-20"
                                style={{
                                    left: `${(chapter.startTime / duration) * 100}%`,
                                }}
                                title={chapter.name}
                            />
                        )
                    })}

                    <div 
                        ref={progressBarRef}
                        className="h-full bg-brand-accent rounded-full transition-all duration-100 relative"
                        style={{ width: '0%' }}
                    >
                        {/* Thumb indicator - always visible but subtle */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-primary border-2 border-white opacity-60 scale-90 transition-all duration-200 shadow-md ring-2 ring-zinc-950/40 pointer-events-none" />
                    </div>
                </div>
                <input
                    ref={progressInputRef}
                    type="range"
                    min={0}
                    max={duration || 0}
                    step="any"
                    onChange={handleSeek}
                    onMouseDown={handleSeekStart}
                    onTouchStart={handleSeekStart}
                    onKeyDown={handleSeekStart}
                    onMouseUp={handleSeekEnd}
                    onTouchEnd={handleSeekEnd}
                    onKeyUp={handleSeekEnd}
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0 z-10"
                />
            </div>

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between w-full">

                {/* Left Wing */}
                <div className="flex items-center ml-2.5 [&>*:not(:first-child)]:ml-2.5">

                    {/* Play/Pause */}
                    <button
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        aria-label={isPlaying ? "Pausar" : "Reproducir"}
                        className="text-white hover:text-primary transition-all duration-200 flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-full bg-surface-variant hover:bg-surface-container active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
                        {isPlaying
                            ? <Icons.media.pause className="w-4 h-4 md:w-3.5 md:h-3.5 fill-current" />
                            : <Icons.media.play className="w-4 h-4 md:w-3.5 md:h-3.5 fill-current ml-0.5" />
                        }
                    </button>



                    {/* Chapter Prev/Next navigation */}
                    {!isMovie && chapters && chapters.length > 0 && (
                        <div className="flex items-center border-l border-outline-variant pl-2 ml-1 [&>*:not(:first-child)]:ml-0.5">
                            <button
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); skipToPrevChapter?.(); }}
                                aria-label="Capítulo anterior"
                                title="Capítulo anterior [[ ]"
                                className="text-on-surface-variant hover:text-on-surface transition-all flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-full hover:bg-surface-container active:scale-[0.95] duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
                                <Icons.media.skipPrevious className="w-4 h-4 md:w-3.5 md:h-3.5 fill-current" />
                            </button>
                            <button
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); skipToNextChapter?.(); }}
                                aria-label="Siguiente capítulo"
                                title="Siguiente capítulo [ ] ]"
                                className="text-on-surface-variant hover:text-on-surface transition-all flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-full hover:bg-surface-container active:scale-[0.95] duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
                                <SkipNextChapterIcon />
                            </button>
                        </div>
                    )}

                    {/* Volume Control */}
                    <div className="hidden md:flex items-center ml-1 group/volume [&>*:not(:first-child)]:ml-1">
                        <button
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                            aria-label={isMuted || volume === 0 ? "Activar sonido" : "Silenciar"}
                            className="text-on-surface-variant hover:text-on-surface transition-all flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container active:scale-[0.95] duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
                            {isMuted || volume === 0 ? <Icons.media.volumeX className="w-3.5 h-3.5" /> : <Icons.media.volume2 className="w-3.5 h-3.5" />}
                        </button>
                        <div className={cn(
                            "w-0 overflow-hidden transition-all duration-300 flex items-center h-5 pl-1",
                            tvMode ? "w-16" : "group-hover/volume:w-16"
                        )}>
                            <div className="w-full h-[3px] bg-outline-variant/50 relative rounded-full flex items-center">
                                <div
                                    className="absolute left-0 h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                                />
                                <input
                                    type="range"
                                    min={0} max={1} step={0.02}
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => { e.stopPropagation(); handleVolume(e); }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Time indicator */}
                    <div className="flex items-center ml-1.5 text-xs font-medium tracking-wide tabular-nums text-on-surface-variant font-sans [&>*:not(:first-child)]:ml-1.5">
                        <span ref={timeTextRef} className="text-on-surface">00:00</span>
                        <span className="text-on-surface-variant/50">/</span>
                        <span className="text-on-surface-variant">{formatTime(duration)}</span>
                        {!isMovie && activeChapter && (
                            <>
                                <span className="text-on-surface-variant/50 ml-1">•</span>
                                <span className="text-primary font-bold uppercase tracking-wider text-[10px] ml-1 truncate max-w-[150px] md:max-w-[240px]" title={activeChapter}>
                                    {activeChapter}
                                </span>
                            </>
                        )}
                    </div>
                </div>



                {/* Right Wing */}
                <div className="flex items-center ml-0.5 [&>*:not(:first-child)]:ml-0.5">

                    {/* Queue Button */}
                    {hasQueue && (
                        <button
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); onToggleQueueSidebar?.(); }}
                            aria-label="Ver cola de reproducción"
                            title="Ver cola de reproducción"
                            className={cn(
                                "transition-all duration-300 flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-full active:scale-90 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                                isQueueSidebarOpen
                                    ? "text-brand-orange bg-brand-orange/10 shadow-[0_0_12px_hsl(var(--brand-orange)/0.4)] animate-pulse"
                                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icons.media.queue className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </button>
                    )}

                    {/* Next episode */}
                    {onNextEpisode && hasNextEpisode && (
                        <button
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); onNextEpisode(); }}
                            aria-label="Siguiente episodio [N]"
                            title="Siguiente episodio [N]"
                            className="text-zinc-500 hover:text-white transition-all flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-lg hover:bg-white/5 active:scale-90 duration-300 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
                            <Icons.media.skipNext className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </button>
                    )}

                    {/* Marathon Mode Toggle */}
                    {!isMovie && <button
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation()
                            onMarathonModeChange?.(!marathonMode)
                        }}
                        aria-label={marathonMode ? "Desactivar Modo Maratón" : "Activar Modo Maratón"}
                        title={marathonMode ? "Desactivar Modo Maratón" : "Activar Modo Maratón"}
                        className={cn(
                            "transition-all duration-300 flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-lg active:scale-90 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                            marathonMode
                                ? "text-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20"
                                : "text-zinc-500 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Icons.navigation.rocket className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    </button>}
                    

                    {/* Settings gear */}
                    <PlayerSettingsMenu
                        audioTracks={audioTracks}
                        activeAudioIndex={activeAudioIndex}
                        onSelectAudio={onSelectAudio}
                        subtitleTracks={subtitleTracks}
                        activeSubtitleIndex={activeSubtitleIndex}
                        onSelectSubtitle={onSelectSubtitle}
                        isLoadingSubtitle={isJassubLoading}
                        sources={episodeSources}
                        currentSourceUrl={activeStreamUrl}
                        onSourceChange={handleSourceSwitch}
                        open={settingsOpen}
                        onOpenChange={onToggleSettings}
                        playbackRate={playbackRate}
                        onPlaybackRateChange={onPlaybackRateChange}
                        autoSkipIntro={autoSkipIntro}
                        onAutoSkipIntroChange={onAutoSkipIntroChange}
                        autoSkipOutro={autoSkipOutro}
                        onAutoSkipOutroChange={onAutoSkipOutroChange}
                        hlsLevels={hlsLevels}
                        activeHlsLevel={activeHlsLevel}
                        onHlsLevelChange={onHlsLevelChange}
                        showHeatmap={showHeatmap}
                        onShowHeatmapChange={onShowHeatmapChange}
                        aspectRatio={aspectRatio}
                        onAspectRatioChange={onAspectRatioChange}
                        subtitleSize={subtitleSize}
                        onSubtitleSizeChange={onSubtitleSizeChange}
                        loopEnabled={loopEnabled}
                        onLoopEnabledChange={onLoopEnabledChange}
                        autoDisableSubtitlesWhenDubbed={autoDisableSubtitlesWhenDubbed}
                        onAutoDisableSubtitlesWhenDubbedChange={onAutoDisableSubtitlesWhenDubbedChange}
                        marathonMode={marathonMode}
                        onMarathonModeChange={onMarathonModeChange}
                        tvMode={tvMode}
                        onTvModeChange={onTvModeChange}
                        videoRef={videoRef}
                        malId={malId}
                        mediaId={mediaId}
                        episodeNumber={episodeNumber}
                        duration={duration}
                        mediaFormat={mediaFormat}
                    />

                    {/* Fullscreen */}
                    <button
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                        aria-label={isFullscreen ? "Salir de pantalla completa [F]" : "Pantalla completa [F]"}
                        title={isFullscreen ? "Salir de pantalla completa [F]" : "Pantalla completa [F]"}
                        className="text-zinc-500 hover:text-white transition-all flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-lg hover:bg-white/5 active:scale-90 duration-300 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
                        {isFullscreen ? <Icons.media.minimize className="w-4 h-4 md:w-3.5 md:h-3.5" /> : <Icons.media.maximize className="w-4 h-4 md:w-3.5 md:h-3.5" />}
                    </button>
                </div>
            </div>
        </div>
    )
})
PlayerBottomBar.displayName = "PlayerBottomBar"
