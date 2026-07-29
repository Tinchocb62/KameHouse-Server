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
import { Icons } from "@/components/ui/icons"

function StatsOverlay({ show, data }: { show: boolean, data: PlayerStats }) {
    if (!show || !data) return null
    return (
        <div className="absolute top-24 left-10 z-[100] backdrop-blur-overlay-md p-6 rounded-corner-lg border border-outline-variant text-label-sm font-mono uppercase tracking-ultra text-on-surface-variant space-y-3 pointer-events-none shadow-elevation-3 min-w-[320px]" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 95%, transparent)" }}>
            <h4 className="text-on-surface font-black border-b border-outline-variant/50 pb-3 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                    DEEP INSIGHTS
                </span>
                <span className="text-caption opacity-40 font-mono tracking-tighter">V2.4.0</span>
            </h4>
            <div className="space-y-2">
                <div className="flex justify-between items-center"><span className="opacity-50">Timeline</span> <span className="text-on-surface font-bold">{data.currentTime} <span className="text-on-surface-variant/50">/</span> {data.duration}</span></div>
                <div className="flex justify-between items-center"><span className="opacity-50">Buffer Status</span> <span className="text-brand-success font-bold">{data.buffer}s</span></div>
                <div className="flex justify-between items-center"><span className="opacity-50">Output</span> <span className="text-on-surface font-bold">{data.resolution}</span></div>
                <div className="flex justify-between items-center"><span className="opacity-50">Rate</span> <span className="text-on-surface font-bold">{data.playbackRate}x</span></div>
                <div className="flex justify-between items-center"><span className="opacity-50">Volume</span> <span className="text-on-surface font-bold">{data.volume}%</span></div>
            </div>
            <div className="pt-3 opacity-20 max-w-full truncate font-sans lowercase tracking-normal italic border-t border-outline-variant/50 mt-4 text-caption">
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

    // Gestures for swipe-seek, volume, and brightness
    const [brightness, setBrightness] = React.useState(1.0)
    const [swipeIndicator, setSwipeIndicator] = React.useState<{
        type: "seek" | "volume" | "brightness"
        value: string
    } | null>(null)

    const touchStartRef = useRef<{ x: number, y: number } | null>(null)
    const isSwipingRef = useRef<boolean>(false)
    const swipeDirectionRef = useRef<"horizontal" | "vertical" | null>(null)
    const swipeSideRef = useRef<"left" | "right" | null>(null)
    const initialVolumeRef = useRef<number>(1.0)
    const initialBrightnessRef = useRef<number>(1.0)
    const initialTimeRef = useRef<number>(0)

    const formatTime = (secs: number) => {
        if (!secs || isNaN(secs)) return "00:00"
        const h = Math.floor(secs / 3600)
        const m = Math.floor((secs % 3600) / 60)
        const s = Math.floor(secs % 60)
        const mm = m.toString().padStart(2, '0')
        const ss = s.toString().padStart(2, '0')
        return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
    }

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0]
        if (!touch) return
        
        touchStartRef.current = { x: touch.clientX, y: touch.clientY }
        isSwipingRef.current = false
        swipeDirectionRef.current = null
        
        const video = localVideoRef.current
        if (video) {
            initialTimeRef.current = video.currentTime
            initialVolumeRef.current = video.volume
        }
        initialBrightnessRef.current = brightness
        
        // Determine touch side (left/right)
        const rect = e.currentTarget.getBoundingClientRect()
        const relativeX = touch.clientX - rect.left
        swipeSideRef.current = relativeX < rect.width / 2 ? "left" : "right"
        
        // Also trigger controls visibility
        actions.triggerControlsVisibility()
        
        // Trigger startHold for 2x speed if hold continues
        startHold()
    }

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!touchStartRef.current) return
        const touch = e.touches[0]
        if (!touch) return

        const deltaX = touch.clientX - touchStartRef.current.x
        const deltaY = touch.clientY - touchStartRef.current.y
        const absX = Math.abs(deltaX)
        const absY = Math.abs(deltaY)

        // Cancel speed hold if user moves their finger (swiping)
        if (absX > 15 || absY > 15) {
            if (holdTimeoutRef.current) {
                clearTimeout(holdTimeoutRef.current)
                holdTimeoutRef.current = null
            }
        }

        if (!isSwipingRef.current) {
            // Check if threshold is met
            if (absX > 15 || absY > 15) {
                isSwipingRef.current = true
                swipeDirectionRef.current = absX > absY ? "horizontal" : "vertical"
            }
        }

        if (isSwipingRef.current && swipeDirectionRef.current) {
            e.preventDefault()
            
            if (swipeDirectionRef.current === "horizontal") {
                // Seek gesture: 1px = 0.15s of video seek
                const seekMultiplier = 0.15
                const secondsDelta = deltaX * seekMultiplier
                const newTime = Math.max(0, Math.min(state.duration, initialTimeRef.current + secondsDelta))
                
                const timeDiff = newTime - initialTimeRef.current
                const prefix = timeDiff >= 0 ? ">>" : "<<"
                const formattedDiff = `${prefix} ${Math.abs(Math.round(timeDiff))}s`
                const formattedNewTime = formatTime(newTime)
                
                setSwipeIndicator({
                    type: "seek",
                    value: `[${formattedDiff}] ${formattedNewTime}`
                })
                
                const video = localVideoRef.current
                if (video) {
                    video.currentTime = newTime
                }
            } else {
                // Vertical swipe: volume on right side, brightness on left side
                const verticalMultiplier = -0.005
                const deltaValue = deltaY * verticalMultiplier
                
                if (swipeSideRef.current === "right") {
                    // Volume control
                    const newVolume = Math.max(0, Math.min(1, initialVolumeRef.current + deltaValue))
                    const video = localVideoRef.current
                    if (video) {
                        video.volume = newVolume
                        actions.handleVolume({ target: { value: String(newVolume) } } as unknown as React.ChangeEvent<HTMLInputElement>)
                    }
                    setSwipeIndicator({
                        type: "volume",
                        value: `VOL: ${(newVolume * 100).toFixed(0)}%`
                    })
                } else {
                    // Brightness control
                    const newBrightness = Math.max(0.2, Math.min(1.8, initialBrightnessRef.current + deltaValue))
                    setBrightness(newBrightness)
                    setSwipeIndicator({
                        type: "brightness",
                        value: `BRIG: ${(newBrightness * 100).toFixed(0)}%`
                    })
                }
            }
        }
    }

    const handleTouchEnd = () => {
        touchStartRef.current = null
        setSwipeIndicator(null)
        endHold()
        
        if (isSwipingRef.current) {
            isSwipingRef.current = false
            swipeDirectionRef.current = null
            // Swiped, do not trigger play/pause click
            wasHoldingRef.current = true
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
    // Bug 3 fix: split the bottom-bar animation into two targets:
    //   .player-bottom-bar  → fade only (autoAlpha), NO transform — the frosted-glass
    //                         background div lives here and a CSS transform on an ancestor
    //                         isolates its backdrop context, breaking backdrop-blur.
    //   .player-bar-fg      → y/scale slide (the cinematic entrance). No backdrop-filter
    //                         of its own, so having a transform is safe.
    useGSAP(() => {
        if (controlsVisible) {
            gsap.to(".player-top-bar", { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "power4.out", onComplete: () => gsap.set(".player-top-bar", { clearProps: "transform" }) })
            // Fade the whole wrapper (visibility/opacity only, no movement)
            gsap.to(".player-bottom-bar", { autoAlpha: 1, duration: 0.55, ease: "power4.out" })
            // Slide the foreground content layer
            gsap.to(".player-bar-fg", { y: 0, scale: 1, duration: 0.55, ease: "power4.out", onComplete: () => gsap.set(".player-bar-fg", { clearProps: "transform" }) })
        } else {
            gsap.to(".player-top-bar", { y: -15, scale: 0.97, autoAlpha: 0, duration: 0.35, ease: "power2.inOut" })
            gsap.to(".player-bottom-bar", { autoAlpha: 0, duration: 0.35, ease: "power2.inOut" })
            gsap.to(".player-bar-fg", { y: 15, scale: 0.97, duration: 0.35, ease: "power2.inOut" })
        }
    }, { dependencies: [controlsVisible], scope: domElements.containerElement })



    return (
        <div
            ref={domElements.containerElement}
            onMouseMove={actions.triggerControlsVisibility}
            onMouseLeave={() => {
                // Bug 2 fix: do not close the settings panel on mouse leave.
                // The panel renders inside .player-bottom-bar; closing it here
                // would dismiss settings whenever the cursor briefly leaves the
                // player container (e.g. moving to a sub-menu item).
                if (!state.isSettingsOpen) {
                    actions.setControlsVisible(false)
                }
            }}
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
                    objectFit: state.aspectRatio === "cover" ? "cover" : state.aspectRatio === "fill" ? "fill" : "contain",
                    filter: `brightness(${brightness})`
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
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onClick={handleInteractionClick}
                className={cn(
                    "absolute inset-0 z-[12] select-none",
                    !controlsVisible && state.isPlaying ? "cursor-none" : "cursor-pointer"
                )}
            />

            {/* Temporal Gesture Swipe Overlay Indicator */}
            {swipeIndicator && (
                <div className="absolute inset-0 z-[14] pointer-events-none flex items-center justify-center animate-in fade-in duration-100">
                    <div className="glass-liquid flex items-center gap-3 px-6 py-3.5 rounded-full border border-white/10 shadow-elevation-5 bg-zinc-950/80">
                        {swipeIndicator.type === "seek" && (
                            <Icons.media.play className="w-5 h-5 text-brand-secondary fill-current shrink-0" />
                        )}
                        {swipeIndicator.type === "volume" && (
                            <Icons.media.volume2 className="w-5 h-5 text-brand-secondary shrink-0" />
                        )}
                        {swipeIndicator.type === "brightness" && (
                            <Icons.ui.star className="w-5 h-5 text-brand-secondary shrink-0" />
                        )}
                        <span className="font-display text-lg tracking-wider text-on-surface uppercase">
                            {swipeIndicator.value}
                        </span>
                    </div>
                </div>
            )}

            {/* Skip animation indicator left */}
            <div
                className="skip-indicator-left absolute left-0 top-0 bottom-0 w-[30%] z-[13] pointer-events-none flex items-center justify-center bg-surface-container opacity-0"
                style={{ clipPath: "ellipse(70% 100% at 0% 50%)" }}
            >
                <div className="flex flex-col items-center text-white/95 px-6 py-4 rounded-xl backdrop-blur-[var(--blur-overlay-sm)] [&>*:not(:first-child)]:mt-1.5" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 30%, transparent)" }}>
                    <div className="flex [&>*:not(:first-child)]:ml-0.5">
                        <svg className="w-8 h-8 fill-current rotate-180" viewBox="0 0 24 24">
                            <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
                        </svg>
                    </div>
                    <span className="text-label-sm font-black uppercase tracking-cinema">-10s</span>
                </div>
            </div>

            {/* Skip animation indicator right */}
            <div
                className="skip-indicator-right absolute right-0 top-0 bottom-0 w-[30%] z-[13] pointer-events-none flex items-center justify-center bg-surface-container opacity-0"
                style={{ clipPath: "ellipse(70% 100% at 100% 50%)" }}
            >
                <div className="flex flex-col items-center text-white/95 px-6 py-4 rounded-xl backdrop-blur-[var(--blur-overlay-sm)] [&>*:not(:first-child)]:mt-1.5" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 30%, transparent)" }}>
                    <div className="flex [&>*:not(:first-child)]:ml-0.5">
                        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                            <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
                        </svg>
                    </div>
                    <span className="text-label-sm font-black uppercase tracking-cinema">+10s</span>
                </div>
            </div>

            {/* 2x Speed Hold Indicator */}
            {isHoldSpeedActive && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[31] pointer-events-none animate-in fade-in zoom-in-95 duration-base">
                    <div className="flex items-center px-5 py-2.5 rounded-full border border-white/10 backdrop-blur-[var(--blur-overlay-sm)] text-white shadow-xl [&>*:not(:first-child)]:ml-2" style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 60%, transparent)" }}>
                        <svg className="w-3.5 h-3.5 fill-current text-brand-accent animate-pulse" viewBox="0 0 24 24">
                            <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
                        </svg>
                        <span className="text-label-sm font-black uppercase tracking-ultra text-zinc-100">
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
                isStreamSwitching={state.isStreamSwitching}
                onClose={onClose}
            />


            <CenterPlayFlash flash={state.flash} />

            <StatsOverlay show={state.showStats} data={state.statsData!} />

            <SkipIntroOverlay
                show={state.skipMode !== null}
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
                    "player-top-bar absolute top-0 inset-x-0 z-30 pointer-events-none opacity-0"
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
                    "player-bottom-bar absolute bottom-0 inset-x-0 z-30 pointer-events-none opacity-0"
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
                    thumbRef={domElements.thumbElement}
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
                    skipStepSeconds={state.skipStepSeconds}
                    onSkipStepSecondsChange={actions.setSkipStepSeconds}
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
