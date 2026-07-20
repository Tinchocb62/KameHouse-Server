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
    "/sounds/music/the-meteor.flac"
    //aca agrego mas musica
]

export function BackgroundMusicPlayer() {
    const { bgMusicEnabled, setBgMusicEnabled, bgMusicVolume, isVideoActive, uiSoundsEnabled, setUiSoundsEnabled } = useAppStore(
        useShallow((state) => ({
            bgMusicEnabled: state.bgMusicEnabled,
            setBgMusicEnabled: state.setBgMusicEnabled,
            bgMusicVolume: state.bgMusicVolume,
            isVideoActive: state.isVideoActive,
            uiSoundsEnabled: state.uiSoundsEnabled,
            setUiSoundsEnabled: state.setUiSoundsEnabled,
        }))
    )
    
    const audioRef = React.useRef<HTMLAudioElement | null>(null)
    const [isPlaying, setIsPlaying] = React.useState(false)
    const [isAnyVideoPlaying, setIsAnyVideoPlaying] = React.useState(false)
    const [currentTrackIndex, setCurrentTrackIndex] = React.useState(() => {
        // Start with a random track
        return Math.floor(Math.random() * PLAYLIST.length)
    })

    // El effect principal lee el volumen desde este ref al crear/cambiar de pista, para no
    // depender reactivamente de bgMusicVolume (reiniciaría la música en cada ajuste del slider).
    const bgMusicVolumeRef = React.useRef(bgMusicVolume)

    // Sync volume when bgMusicVolume changes (using quadratic curve for natural logarithmic hearing)
    React.useEffect(() => {
        bgMusicVolumeRef.current = bgMusicVolume
        if (audioRef.current) {
            audioRef.current.volume = Math.pow(bgMusicVolume, 2)
        }
    }, [bgMusicVolume])

    // Sync audio state with store preferences, video active state, and current track
    React.useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio(PLAYLIST[currentTrackIndex])
            audioRef.current.volume = Math.pow(bgMusicVolumeRef.current, 2)
        } else {
            // Update source if track changed
            const currentSrc = audioRef.current.src
            const expectedSrc = PLAYLIST[currentTrackIndex]
            if (!currentSrc.endsWith(encodeURI(expectedSrc))) {
                audioRef.current.src = expectedSrc
                audioRef.current.load()
                audioRef.current.volume = Math.pow(bgMusicVolumeRef.current, 2)
            }
        }

        const audio = audioRef.current

        // Handle track ending to automatically switch to the next one
        const handleEnded = () => {
            setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % PLAYLIST.length)
        }

        audio.addEventListener("ended", handleEnded)

        const playAudio = () => {
            audio.play()
                .then(() => {
                    setIsPlaying(true)
                })
                .catch((err) => {
                    console.warn("Autoplay blocked or playback interrupted:", err)
                    setIsPlaying(false)
                })
        }

        const pauseAudio = () => {
            audio.pause()
            setIsPlaying(false)
        }

        let playTimeout: NodeJS.Timeout | null = null

        // If enabled and no video is playing, start background music with a debounce to prevent pops during transitions
        if (bgMusicEnabled && !isVideoActive && !isAnyVideoPlaying) {
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
    }, [bgMusicEnabled, isVideoActive, isAnyVideoPlaying, currentTrackIndex])

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
        const nextState = !bgMusicEnabled
        setBgMusicEnabled(nextState)
        
        // Immediate toggle feedback
        if (audioRef.current) {
            if (nextState && !isVideoActive) {
                audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(() => setIsPlaying(false))
            } else {
                audioRef.current.pause()
                setIsPlaying(false)
            }
        }
    }

    return (
        <div className="relative flex items-center justify-center">
            {/* Custom keyframes injected locally */}
            <style>{`
                @keyframes soundwave {
                    0%, 100% { height: 4px; }
                    50% { height: 16px; }
                }
                .animate-soundwave-1 { animation: soundwave 0.8s ease-in-out infinite; }
                .animate-soundwave-2 { animation: soundwave 0.5s ease-in-out infinite 0.15s; }
                .animate-soundwave-3 { animation: soundwave 0.7s ease-in-out infinite 0.3s; }
                .animate-soundwave-4 { animation: soundwave 0.6s ease-in-out infinite 0.45s; }
            `}</style>

            <motion.button
                id="bg-music-toggle-btn"
                onClick={togglePlayback}
                title={bgMusicEnabled ? "Silenciar música de fondo" : "Activar música de fondo"}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-500 group relative overflow-hidden liquid-glass-frosted-subtle",
                    bgMusicEnabled && isPlaying && !isVideoActive
                        ? "!border-brand-orange/30 !bg-brand-orange/[0.08] text-brand-orange shadow-[0_0_25px_rgba(255,110,58,0.15)]"
                        : "text-zinc-500 hover:text-white hover:!border-white/15"
                )}
            >
                <AnimatePresence mode="wait">
                    {bgMusicEnabled && isPlaying && !isVideoActive ? (
                        <motion.div
                            key="playing"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-end gap-[2px] h-4 z-10"
                        >
                            <div className="w-[2px] bg-brand-orange rounded-full animate-soundwave-1" />
                            <div className="w-[2px] bg-brand-orange rounded-full animate-soundwave-2" />
                            <div className="w-[2px] bg-brand-orange rounded-full animate-soundwave-3" />
                            <div className="w-[2px] bg-brand-orange rounded-full animate-soundwave-4" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="paused"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="z-10"
                        >
                            {bgMusicEnabled ? (
                                <Music className="w-4 h-4 text-zinc-400 animate-pulse" />
                            ) : (
                                <VolumeX className="w-5 h-5 text-zinc-500" />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Aura overlay */}
                {bgMusicEnabled && isPlaying && !isVideoActive && (
                    <div className="absolute inset-0 bg-brand-orange/5 animate-pulse pointer-events-none" />
                )}
            </motion.button>
        </div>
    )
}
