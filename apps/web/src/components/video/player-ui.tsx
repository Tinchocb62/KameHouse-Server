/* eslint-disable react-hooks/refs */
import React, { useEffect, useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { cn } from "@/components/ui/core/styling"
import { PlayerTopBar } from "./player-topbar"
import { PlayerBottomBar } from "./player-bottombar"
import { LoadingErrorOverlay, CenterPlayFlash, SkipIntroOverlay, NextEpisodeOverlay, ResumeOverlay } from "./player-overlays"
import type { EpisodeSource } from "@/api/types/unified.types"
import { useGetVideoInsights } from "@/api/hooks/videocore.hooks"
import type { PlayerCore, PlayerStats } from "./player-core"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { PlayerEpisodesSidebar } from "./player-episodes-sidebar"
import { PlayerQueueSidebar } from "./player-queue-sidebar"
import { PlayerAmbientBackdrop } from "./player-ambient"
import { __isTV__ } from "@/types/constants"
import { useFocusNavigation } from "@/hooks/use-focus-navigation"

function StatsOverlay({ show, data }: { show: boolean, data: PlayerStats }) {
    if (!show || !data) return null
    return (
        <div className="absolute top-24 left-10 z-[100] backdrop-blur-overlay-md p-6 rounded-corner-lg border border-outline-variant text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant space-y-3 pointer-events-none shadow-elevation-3 min-w-[320px]" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 95%, transparent)" }}>
            <h4 className="text-on-surface font-black border-b border-outline-variant/50 pb-3 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    DEEP INSIGHTS
                </span>
                <span className="text-[9px] opacity-40 font-mono tracking-tighter">V2.4.0</span>
            </h4>
            <div className="space-y-2">
                <div className="flex justify-between items-center"><span className="opacity-50">Timeline</span> <span className="text-on-surface font-bold">{data.currentTime} <span className="text-on-surface-variant/50">/</span> {data.duration}</span></div>
                <div className="flex justify-between items-center"><span className="opacity-50">Buffer Status</span> <span className="text-brand-success font-bold">{data.buffer}s</span></div>
                <div className="flex justify-between items-center"><span className="opacity-50">Output</span> <span className="text-on-surface font-bold">{data.resolution}</span></div>
                <div className="flex justify-between items-center"><span className="opacity-50">Rate</span> <span className="text-on-surface font-bold">{data.playbackRate}x</span></div>
                <div className="flex justify-between items-center"><span className="opacity-50">Volume</span> <span className="text-on-surface font-bold">{data.volume}%</span></div>
            </div>
            <div className="pt-3 opacity-20 max-w-full truncate font-sans lowercase tracking-normal italic border-t border-outline-variant/50 mt-4 text-[9px]">
                {data.source}
            </div>
        </div>
    )
}

export interface PlayerUIProps {
    title?: string
    episodeLabel?: string
    onClose: () => void
    onNextEpisode?: () => void
    playableUrl: string
    streamType: "local" | "online" | "direct" | "transcode" | "optimized"
    episodeSources: EpisodeSource[]
    onSourceSwitch: (source: EpisodeSource) => void
    core: PlayerCore
    clientId: string
    mediaId?: number
    episodeNumber?: number
    malId?: number | null
    episodes?: {
        title?: string
        episodeNumber: number
        absoluteEpisodeNumber?: number
        thumbnail?: string
        watched?: boolean
    }[]
    onSelectEpisode?: (episodeNumber: number) => void
    mediaFormat?: string | null
    nextEpisodeTitle?: string
    nextEpisodeNumber?: number
    nextEpisodeImage?: string
    /** Presente solo en la app de escritorio con mpv disponible: hace handoff de la reproducción a mpv. */
    onOpenInMpv?: () => void
}

export function PlayerUI(props: PlayerUIProps) {
    const {
        title, episodeLabel, onClose, onNextEpisode, playableUrl,
        streamType, episodeSources, onSourceSwitch, core,
        mediaId, episodeNumber, malId,
        episodes, onSelectEpisode, mediaFormat,
        nextEpisodeTitle, nextEpisodeNumber, nextEpisodeImage,
        onOpenInMpv
    } = props

    const {
        domElements,
        state,
        actions
    } = core

    const localVideoRef = useRef<HTMLVideoElement | null>(null)

    useEffect(() => {
        localVideoRef.current = domElements.videoElement.current
    })

    const [isEpisodesSidebarOpen, setIsEpisodesSidebarOpen] = React.useState(false)
    const [isQueueSidebarOpen, setIsQueueSidebarOpen] = React.useState(false)

    // Gesture tracking for double tap to skip and hold for 2x speed
    const [isHoldSpeedActive, setIsHoldSpeedActive] = React.useState(false)
    const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isHoldingRef = useRef<boolean>(false)
    const wasHoldingRef = useRef<boolean>(false)
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastClickTimeRef = useRef<number>(0)

    const startHold = () => {
        wasHoldingRef.current = false
        if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current)
        holdTimeoutRef.current = setTimeout(() => {
            isHoldingRef.current = true
            wasHoldingRef.current = true
            const video = localVideoRef.current
            if (video) {
                video.playbackRate = 2.0
            }
            setIsHoldSpeedActive(true)
        }, 500)
    }

    const endHold = () => {
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current)
            holdTimeoutRef.current = null
        }
        if (isHoldingRef.current) {
            isHoldingRef.current = false
            setIsHoldSpeedActive(false)
            const video = localVideoRef.current
            if (video) {
                video.playbackRate = state.playbackRate
            }
            // Briefly delay resetting wasHoldingRef so it absorbs the trailing click event
            setTimeout(() => {
                wasHoldingRef.current = false
            }, 150)
        }
    }

    const playSkipAnimation = (side: "left" | "right") => {
        const target = side === "left" ? ".skip-indicator-left" : ".skip-indicator-right"
        gsap.killTweensOf(target)
        gsap.fromTo(target,
            { opacity: 0, scale: 0.9 },
            {
                opacity: 1,
                scale: 1,
                duration: 0.2,
                ease: "power2.out",
                onComplete: () => {
                    gsap.to(target, {
                        opacity: 0,
                        scale: 0.95,
                        duration: 0.25,
                        delay: 0.3,
                        ease: "power2.in"
                    })
                }
            }
        )
    }

    const handleInteractionClick = (e: React.MouseEvent<HTMLDivElement>) => {
        actions.triggerControlsVisibility()
        if (wasHoldingRef.current) {
            wasHoldingRef.current = false
            return
        }

        const rect = e.currentTarget.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const isLeftSide = clickX < rect.width / 2

        const now = Date.now()
        const DOUBLE_CLICK_DELAY = 300

        if (now - lastClickTimeRef.current < DOUBLE_CLICK_DELAY) {
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current)
                clickTimeoutRef.current = null
            }
            if (isLeftSide) {
                actions.skipTime(-10)
                playSkipAnimation("left")
            } else {
                actions.skipTime(10)
                playSkipAnimation("right")
            }
            lastClickTimeRef.current = 0
        } else {
            lastClickTimeRef.current = now
            if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
            clickTimeoutRef.current = setTimeout(() => {
                if (!isHoldingRef.current) {
                    actions.togglePlay()
                }
                clickTimeoutRef.current = null
            }, DOUBLE_CLICK_DELAY)
        }
    }

    useEffect(() => {
        const handleGlobalKeyDown = () => {
            actions.triggerControlsVisibility()
        }
        window.addEventListener("keydown", handleGlobalKeyDown, { capture: true })
        return () => {
            if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current)
            if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
            window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true })
        }
    }, [actions])

    const { playlistQueue, currentQueueIndex } = useAppStore(useShallow(state => ({
        playlistQueue: state.playlistQueue,
        currentQueueIndex: state.currentQueueIndex
    })))

    const controlsVisible = state.controlsVisible || isEpisodesSidebarOpen || isQueueSidebarOpen

    // Force controls visibility if sidebar is open
    useEffect(() => {
        if (isEpisodesSidebarOpen || isQueueSidebarOpen) {
            actions.setControlsVisible(true)
        }
    }, [isEpisodesSidebarOpen, isQueueSidebarOpen, actions])

    // D-pad navigation for TV remote control
    const handleEscape = React.useCallback(() => {
        if (isEpisodesSidebarOpen) {
            setIsEpisodesSidebarOpen(false)
        } else if (isQueueSidebarOpen) {
            setIsQueueSidebarOpen(false)
        } else if (state.isSettingsOpen) {
            actions.setIsSettingsOpen(false)
        } else if (state.isFullscreen) {
            actions.toggleFullscreen()
        } else {
            onClose()
        }
    }, [isEpisodesSidebarOpen, isQueueSidebarOpen, state.isSettingsOpen, state.isFullscreen, actions, onClose])

    useFocusNavigation({
        containerRef: domElements.containerElement,
        enabled: controlsVisible,
        onEscape: handleEscape,
    })

    // Auto-enter fullscreen on TV platforms
    React.useEffect(() => {
        if (__isTV__ && !state.isFullscreen) {
            // Small delay to ensure player is mounted
            const timer = setTimeout(() => {
                actions.toggleFullscreen()
            }, 500)
            return () => clearTimeout(timer)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch video insights (heatmap)
    const { data: insightsData } = useGetVideoInsights({
        episodeId: (mediaId && episodeNumber) ? `${mediaId}${episodeNumber}` : ""
    }, !!(mediaId && episodeNumber && state.duration > 0))

    const insights = insightsData || []

    // Cinematic Controls Animation Layer
    useGSAP(() => {
        if (controlsVisible) {
            gsap.to(".player-top-bar", { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "power4.out" })
            gsap.to(".player-bottom-bar", { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "power4.out" })
        } else {
            gsap.to(".player-top-bar", { y: -15, scale: 0.97, autoAlpha: 0, duration: 0.35, ease: "power2.inOut" })
            gsap.to(".player-bottom-bar", { y: 15, scale: 0.97, autoAlpha: 0, duration: 0.35, ease: "power2.inOut" })
        }
    }, { dependencies: [controlsVisible], scope: domElements.containerElement })



    return (
        <div
            ref={domElements.containerElement}
            onMouseMove={actions.triggerControlsVisibility}
            onMouseLeave={() => actions.setControlsVisible(false)}
            className={cn(
                "fixed inset-0 z-[10000] w-screen h-screen bg-black flex flex-col items-center justify-center overflow-hidden font-sans",
                !controlsVisible && state.isPlaying ? "cursor-none" : "cursor-default"
            )}
            style={{
                viewTransitionName: "video-player"
            } as React.CSSProperties}
        >

            <PlayerAmbientBackdrop 
                videoRef={localVideoRef} 
                enabled={state.ambientModeEnabled && !state.tvMode} // Usually ambient mode isn't great for TVs or we can just leave it enabled for both
            />

            <video
                ref={domElements.videoElement}
                onPlay={() => actions.setIsPlaying(true)}
                onPause={() => actions.setIsPlaying(false)}
                onDurationChange={(e) => actions.setDuration(e.currentTarget.duration)}
                onTimeUpdate={actions.handleTimeUpdate}
                onWaiting={() => actions.setIsBuffering(true)}
                onPlaying={() => { actions.setIsBuffering(false); actions.setIsSeeking(false) }}
                onSeeked={() => actions.setIsSeeking(false)}
                onEnded={() => {
                    actions.handleTimeUpdate()
                }}
                className="absolute inset-0 m-auto w-full h-full z-10"
                style={{
                    objectFit: state.aspectRatio === "cover" ? "cover" : state.aspectRatio === "fill" ? "fill" : "contain"
                }}
                crossOrigin="anonymous"
                playsInline
                preload="auto"
            />

            {/* Gesture Interaction Overlay */}
            <div
                onMouseDown={(e) => {
                    if (e.button === 0) startHold()
                }}
                onMouseUp={endHold}
                onMouseLeave={endHold}
                onTouchStart={startHold}
                onTouchEnd={endHold}
                onTouchCancel={endHold}
                onClick={handleInteractionClick}
                className={cn(
                    "absolute inset-0 z-[12] select-none",
                    !controlsVisible && state.isPlaying ? "cursor-none" : "cursor-pointer"
                )}
            />

            {/* Skip animation indicator left */}
            <div
                className="skip-indicator-left absolute left-0 top-0 bottom-0 w-[30%] z-[13] pointer-events-none flex items-center justify-center bg-surface-container opacity-0"
                style={{ clipPath: "ellipse(70% 100% at 0% 50%)" }}
            >
                <div className="flex flex-col items-center text-white/95 px-6 py-4 rounded-2xl backdrop-blur-[var(--blur-overlay-sm)] [&>*:not(:first-child)]:mt-1.5" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 30%, transparent)" }}>
                    <div className="flex [&>*:not(:first-child)]:ml-0.5">
                        <svg className="w-8 h-8 fill-current rotate-180" viewBox="0 0 24 24">
                            <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em]">-10s</span>
                </div>
            </div>

            {/* Skip animation indicator right */}
            <div
                className="skip-indicator-right absolute right-0 top-0 bottom-0 w-[30%] z-[13] pointer-events-none flex items-center justify-center bg-surface-container opacity-0"
                style={{ clipPath: "ellipse(70% 100% at 100% 50%)" }}
            >
                <div className="flex flex-col items-center text-white/95 px-6 py-4 rounded-2xl backdrop-blur-[var(--blur-overlay-sm)] [&>*:not(:first-child)]:mt-1.5" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 30%, transparent)" }}>
                    <div className="flex [&>*:not(:first-child)]:ml-0.5">
                        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                            <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em]">+10s</span>
                </div>
            </div>

            {/* 2x Speed Hold Indicator */}
            {isHoldSpeedActive && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[31] pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center px-5 py-2.5 rounded-full border border-white/10 backdrop-blur-[var(--blur-overlay-sm)] text-white shadow-xl [&>*:not(:first-child)]:ml-2" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 60%, transparent)" }}>
                        <svg className="w-3.5 h-3.5 fill-current text-brand-orange animate-pulse" viewBox="0 0 24 24">
                            <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
                        </svg>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-100">
                            2.0x Velocidad
                        </span>
                    </div>
                </div>
            )}

            <canvas
                ref={domElements.canvasElement}
                className={cn(
                    "absolute inset-0 w-full h-full pointer-events-none z-[11]",
                    state.isJassubActive ? "block" : "hidden"
                )}
            />


            <LoadingErrorOverlay
                status={state.status}
                errorMsg={state.errorMsg}
                streamType={streamType || "local"}
                isBuffering={state.isBuffering}
                isSeeking={state.isSeeking}
                onClose={onClose}
            />

            {/* Auto-Skip Toast */}
            {state.showAutoSkipToast && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
                    <div className="bg-[#121216] border border-white/15 px-6 py-3 shadow-2xl flex items-center rounded-xl [&>*:not(:first-child)]:ml-3">
                        <svg className="w-4 h-4 text-white animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
                        </svg>
                        <span className="text-[10px] font-black tracking-[0.25em] text-white uppercase">
                            {state.showAutoSkipToast === "intro"
                                ? "AUTO-SALTANDO INTRO"
                                : state.showAutoSkipToast === "outro"
                                    ? "AUTO-SALTANDO ENDING"
                                    : "AUTO-SALTANDO PAUSA/INTERMEDIO"}
                        </span>
                    </div>
                </div>
            )}

            <CenterPlayFlash flash={state.flash} />

            <StatsOverlay show={state.showStats} data={state.statsData!} />

            <SkipIntroOverlay
                show={state.skipMode !== null && controlsVisible}
                onSkip={actions.handleSkipIntro}
                skipMode={state.skipMode ?? "intro"}
                remainingSeconds={state.skipRemainingSeconds}
                segmentProgress={state.segmentProgress}
                shortcutKey="S"
            />

            <NextEpisodeOverlay
                show={state.showNextEpisode}
                tvMode={state.tvMode}
                marathonMode={state.marathonMode}
                showCountdown={state.showCountdown}
                countdownSeconds={state.countdownSeconds}
                nextEpisodeTitle={nextEpisodeTitle || "Siguiente Episodio"}
                nextEpisodeNumber={nextEpisodeNumber}
                nextEpisodeImage={nextEpisodeImage}
                onNext={onNextEpisode || (() => { })}
                duration={state.duration}
                remainingProgress={state.remainingProgress}
            />

            <ResumeOverlay
                show={state.showResume}
                time={state.resumeTime}
                onResume={actions.handleResume}
                onClose={() => actions.setShowResume(false)}
            />

            <div
                className={cn(
                    "player-top-bar absolute top-0 inset-x-0 z-30 pointer-events-none opacity-0 -translate-y-4"
                )}
            >
                <PlayerTopBar
                    title={title}
                    episodeLabel={episodeLabel}
                    episodeNumber={episodeNumber}
                    onClose={onClose}
                    mediaFormat={mediaFormat}
                    onOpenInMpv={onOpenInMpv}
                />
            </div>

            <div
                className={cn(
                    "player-bottom-bar absolute bottom-0 inset-x-0 z-30 pointer-events-none opacity-0 translate-y-4"
                )}
            >
                <PlayerBottomBar
                    title={title}
                    episodeNumber={episodeNumber}
                    episodeLabel={episodeLabel}
                    mediaFormat={mediaFormat}
                    duration={state.duration}
                    insights={insights}
                    progressBarRef={domElements.progressBarElement}
                    progressInputRef={domElements.progressInputElement}
                    handleSeek={actions.handleSeek}
                    handleSeekStart={actions.handleSeekStart}
                    handleSeekEnd={actions.handleSeekEnd}
                    isPlaying={state.isPlaying}
                    togglePlay={actions.togglePlay}
                    skipTime={actions.skipTime}
                    isMuted={state.isMuted}
                    toggleMute={actions.toggleMute}
                    volume={state.volume}
                    handleVolume={actions.handleVolume}
                    timeTextRef={domElements.timeTextElement}
                    audioTracks={state.audioTracks}
                    activeAudioIndex={state.activeAudioIndex}
                    onSelectAudio={actions.onSelectAudio}
                    subtitleTracks={state.subtitleTracks}
                    activeSubtitleIndex={state.activeSubtitleIndex}
                    onSelectSubtitle={actions.onSelectSubtitle}
                    isJassubLoading={state.isJassubLoading || state.isPgsLoading}
                    episodeSources={episodeSources || []}
                    activeStreamUrl={playableUrl}
                    handleSourceSwitch={onSourceSwitch || (() => { })}
                    isFullscreen={state.isFullscreen}
                    toggleFullscreen={actions.toggleFullscreen}
                    settingsOpen={state.isSettingsOpen}
                    onToggleSettings={(open?: boolean) => actions.setIsSettingsOpen(open !== undefined ? open : !state.isSettingsOpen)}
                    videoRef={localVideoRef}
                    malId={malId}
                    mediaId={mediaId}
                    onTakeScreenshot={actions.takeScreenshot}
                    onTogglePip={actions.togglePip}
                    playbackRate={state.playbackRate}
                    onPlaybackRateChange={actions.changePlaybackRate}
                    autoSkipIntro={state.autoSkipIntro}
                    onAutoSkipIntroChange={actions.setAutoSkipIntro}
                    autoSkipOutro={state.autoSkipOutro}
                    onAutoSkipOutroChange={actions.setAutoSkipOutro}
                    hlsLevels={state.hlsLevels}
                    activeHlsLevel={state.activeHlsLevel}
                    onHlsLevelChange={actions.setHlsLevel}
                    showHeatmap={state.showHeatmap}
                    onShowHeatmapChange={actions.setShowHeatmap}
                    aspectRatio={state.aspectRatio}
                    onAspectRatioChange={actions.setAspectRatio}
                    subtitleSize={state.subtitleSize}
                    onSubtitleSizeChange={actions.setSubtitleSize}
                    loopEnabled={state.loopEnabled}
                    onLoopEnabledChange={actions.setLoopEnabled}
                    autoDisableSubtitlesWhenDubbed={state.autoDisableSubtitlesWhenDubbed}
                    onAutoDisableSubtitlesWhenDubbedChange={actions.setAutoDisableSubtitlesWhenDubbed}
                    tvMode={state.tvMode}
                    onTvModeChange={actions.setTvMode}
                    ambientModeEnabled={state.ambientModeEnabled}
                    onAmbientModeEnabledChange={actions.setAmbientModeEnabled}
                    marathonMode={state.marathonMode}
                    onMarathonModeChange={actions.setMarathonMode}
                    onNextEpisode={onNextEpisode}
                    hasNextEpisode={state.hasNextEpisode}
                    skipTimesOp={state.skipTimesOp}
                    skipTimesEd={state.skipTimesEd}
                    chapters={state.chapters}
                    skipToNextChapter={actions.skipToNextChapter}
                    skipToPrevChapter={actions.skipToPrevChapter}
                    activeChapter={state.activeChapter}
                    isEpisodesSidebarOpen={isEpisodesSidebarOpen}
                    onToggleEpisodesSidebar={() => setIsEpisodesSidebarOpen(!isEpisodesSidebarOpen)}
                    hasEpisodes={Boolean(episodes && episodes.length > 0)}
                    isQueueSidebarOpen={isQueueSidebarOpen}
                    onToggleQueueSidebar={() => setIsQueueSidebarOpen(!isQueueSidebarOpen)}
                    hasQueue={playlistQueue.length > 0}
                    previewManager={state.previewManager}
                />
            </div>

            {/* Episodes Sidebar */}
            <PlayerEpisodesSidebar
                isOpen={isEpisodesSidebarOpen}
                onClose={() => setIsEpisodesSidebarOpen(false)}
                episodes={episodes || []}
                currentEpisodeNumber={episodeNumber}
                onSelectEpisode={onSelectEpisode}
                marathonMode={state.marathonMode}
                onMarathonModeChange={actions.setMarathonMode}
            />

            {/* Queue Sidebar */}
            <PlayerQueueSidebar
                isOpen={isQueueSidebarOpen}
                onClose={() => setIsQueueSidebarOpen(false)}
                playlistQueue={playlistQueue}
                currentQueueIndex={currentQueueIndex}
            />
        </div>
    )
}
