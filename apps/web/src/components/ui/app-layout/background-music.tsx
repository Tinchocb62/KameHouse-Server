"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Music, VolumeX } from "lucide-react"
import { cn } from "@/components/ui/core/styling"


const PLAYLIST = [
    "/sounds/music/Dragon ball dvd.m4a",
    "/sounds/music/Dragon ball dvd 2.m4a",
    "/sounds/music/the-meteor.m4a"
    //aca agrego mas musica
]

export function BackgroundMusicPlayer() {
    const { bgMusicEnabled, setBgMusicEnabled, bgMusicVolume, isVideoActive, isGlobalMuted, sidebarOpen } = useAppStore(
        useShallow((state) => ({
            bgMusicEnabled: state.bgMusicEnabled,
            setBgMusicEnabled: state.setBgMusicEnabled,
            bgMusicVolume: state.bgMusicVolume,
            isVideoActive: state.isVideoActive,
            isGlobalMuted: state.isGlobalMuted,
            sidebarOpen: state.sidebarOpen,
        }))
    )

    const audioRef = React.useRef<HTMLAudioElement | null>(null)
    const [isPlaying, setIsPlaying] = React.useState(false)
    const [isAnyVideoPlaying, setIsAnyVideoPlaying] = React.useState(false)
    const [currentTrackIndex, setCurrentTrackIndex] = React.useState(() => {
        // Start with a random track
        return Math.floor(Math.random() * PLAYLIST.length)
    })

    // Sync volume when bgMusicVolume changes (using quadratic curve for natural logarithmic hearing)
    React.useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = Math.pow(bgMusicVolume, 2)
        }
    }, [bgMusicVolume])

    // Sync audio state with store preferences, video active state, and current track
    React.useEffect(() => {
        let playTimeout: NodeJS.Timeout

        const playAudio = () => {
            if (audioRef.current && !isGlobalMuted) {
                audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch((err) => {
                        console.warn("Could not autoplay background music:", err)
                        setIsPlaying(false)
                    })
            }
        }

        const pauseAudio = () => {
            if (audioRef.current) {
                audioRef.current.pause()
                setIsPlaying(false)
            }
        }

        // Initialize audio instance if it doesn't exist
        if (!audioRef.current) {
            audioRef.current = new Audio(PLAYLIST[currentTrackIndex])
            audioRef.current.volume = Math.pow(bgMusicVolume, 2)
        } else {
            // Update source if track changed
            const currentSrc = audioRef.current.src
            const expectedSrc = PLAYLIST[currentTrackIndex]
            if (!currentSrc.endsWith(encodeURI(expectedSrc))) {
                audioRef.current.src = expectedSrc
                audioRef.current.load()
                audioRef.current.volume = Math.pow(bgMusicVolume, 2)
            }
        }

        // Loop handling
        const audio = audioRef.current
        const handleEnded = () => {
            setCurrentTrackIndex((prev) => (prev + 1) % PLAYLIST.length)
        }
        audio.addEventListener("ended", handleEnded)

        // If enabled, not globally muted, and no video is playing, start background music with a debounce to prevent pops during transitions
        if (bgMusicEnabled && !isGlobalMuted && !isVideoActive && !isAnyVideoPlaying) {
            playTimeout = setTimeout(() => {
                playAudio()
            }, 1000)
        } else {
            pauseAudio()
        }

        // Clean up on unmount or track change
        return () => {
            if (playTimeout) clearTimeout(playTimeout)
            audio.removeEventListener("ended", handleEnded)
            audio.pause()
        }
    }, [bgMusicEnabled, isGlobalMuted, isVideoActive, currentTrackIndex, isAnyVideoPlaying, bgMusicVolume])

    // Listen to any other video/audio playing on the page to automatically pause background music
    React.useEffect(() => {
        const updateMediaState = () => {
            const mediaElements = document.querySelectorAll("video, audio")
            let playing = false
            mediaElements.forEach((el) => {
                const media = el as HTMLMediaElement
                if (media !== audioRef.current && !media.paused && !media.ended) {
                    playing = true
                }
            })
            setIsAnyVideoPlaying(playing)
        }

        document.addEventListener("play", updateMediaState, true)
        document.addEventListener("playing", updateMediaState, true)
        document.addEventListener("pause", updateMediaState, true)
        document.addEventListener("ended", updateMediaState, true)

        // Initial check
        updateMediaState()

        return () => {
            document.removeEventListener("play", updateMediaState, true)
            document.removeEventListener("playing", updateMediaState, true)
            document.removeEventListener("pause", updateMediaState, true)
            document.removeEventListener("ended", updateMediaState, true)
        }
    }, [])

    // Handle user interaction click to override browser autoplay blocks
    React.useEffect(() => {
        if (!bgMusicEnabled || isVideoActive) return

        const handleFirstInteraction = () => {
            if (audioRef.current && audioRef.current.paused) {
                audioRef.current.play()
                    .then(() => {
                        setIsPlaying(true)
                        removeInteractionListeners()
                    })
                    .catch(() => {})
            }
        }

        const removeInteractionListeners = () => {
            window.removeEventListener("click", handleFirstInteraction)
            window.removeEventListener("keydown", handleFirstInteraction)
        }

        window.addEventListener("click", handleFirstInteraction, { passive: true })
        window.addEventListener("keydown", handleFirstInteraction, { passive: true })

        return () => {
            removeInteractionListeners()
        }
    }, [bgMusicEnabled, isVideoActive])

    const togglePlayback = () => {
        // Direct mute/unmute of the background OST. This mirrors the music toggle
        // in Settings (both drive `bgMusicEnabled`). Volume is left untouched.
        // We don't call play() here: flipping `bgMusicEnabled` lets the main effect
        // start/stop playback with the correct, up-to-date gating (avoids the
        // play-then-immediately-pause flicker).
        if (bgMusicEnabled) {
            setBgMusicEnabled(false)
            if (audioRef.current) {
                audioRef.current.pause()
                setIsPlaying(false)
            }
        } else {
            setBgMusicEnabled(true)
        }
    }

    return (
        <div className="w-full flex justify-center gsap-sidebar-item">
            <button
                id="bg-music-toggle-btn"
                onClick={togglePlayback}
                title={bgMusicEnabled ? "Silenciar música" : "Activar música"}
                className={cn(
                    "flex items-center h-14 rounded-2xl group px-4 relative transition-all duration-300 w-full",
                    "active:scale-95 font-bold",
                    sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-14 w-full md:px-0",
                    bgMusicEnabled
                        ? "text-on-surface bg-white/[0.08]"
                        : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] text-on-surface-variant hover:text-on-surface"
                )}
            >
                {/* Active Indicator Line */}
                <div className={cn(
                    "absolute left-0 w-1 h-6 bg-on-surface rounded-r-full transition-all duration-500 hidden md:block",
                    bgMusicEnabled ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                )} />

                <span className={cn(
                    "shrink-0 z-10 group-hover:scale-110 transition-transform duration-300 relative",
                    bgMusicEnabled && "text-on-surface"
                )}>
                    {/* Audio playing waves overlay */}
                    {bgMusicEnabled && isPlaying && !isVideoActive && !isGlobalMuted && (
                        <div className="absolute inset-0 z-0 pointer-events-none -m-1">
                            {/* We can put subtle visual feedback here if needed, or just let the icon speak for itself */}
                        </div>
                    )}
                    {bgMusicEnabled ? (
                        <Music className="w-5 h-5 relative z-10" />
                    ) : (
                        <VolumeX className="w-5 h-5 relative z-10" />
                    )}
                </span>

                <span className={cn(
                    "uppercase tracking-[0.2em] text-[10px] font-black z-10 text-left transition-colors whitespace-nowrap",
                    (sidebarOpen) ? "block" : "hidden md:hidden",
                    bgMusicEnabled ? "text-on-surface" : "group-hover:text-on-surface"
                )}>
                    Música {bgMusicEnabled ? "(ON)" : "(OFF)"}
                </span>
            </button>
        </div>
    )
}
