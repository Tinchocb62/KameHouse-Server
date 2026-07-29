"use client"

import * as React from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"
import { getServerBaseUrl } from "@/api/client/server-url"


// Playlist por defecto (bundleada con la app) que se usa cuando el usuario
// todavía no ha escaneado una carpeta de música propia.
const DEFAULT_PLAYLIST = [
    "/sounds/music/Dragon ball dvd.m4a",
    "/sounds/music/Dragon ball dvd 2.m4a",
    "/sounds/music/the-meteor.m4a"
]

// Construye la URL de streaming para un track escaneado del servidor.
function buildTrackUrl(dir: string, file: string): string {
    const base = getServerBaseUrl() || window.location.origin
    const params = new URLSearchParams({ dir, file })
    return `${base}/api/v1/music/stream?${params.toString()}`
}

export function BackgroundMusicPlayer() {
    const { bgMusicEnabled, setBgMusicEnabled, uiSoundsEnabled, setUiSoundsEnabled, bgMusicVolume, bgMusicDir, bgMusicTracks, isVideoActive, sidebarOpen, eraOpeningPlaying } = useAppStore(
        useShallow((state) => ({
            bgMusicEnabled: state.bgMusicEnabled,
            setBgMusicEnabled: state.setBgMusicEnabled,
            uiSoundsEnabled: state.uiSoundsEnabled,
            setUiSoundsEnabled: state.setUiSoundsEnabled,
            bgMusicVolume: state.bgMusicVolume,
            bgMusicDir: state.bgMusicDir,
            bgMusicTracks: state.bgMusicTracks,
            isVideoActive: state.isVideoActive,
            sidebarOpen: state.sidebarOpen,
            eraOpeningPlaying: state.eraOpeningPlaying,
        }))
    )

    // El botón de la sidebar es el interruptor MAESTRO de audio: agrupa la
    // música de fondo y los efectos de UI, igual que el switch de audio global
    // en Ajustes → Audio. Está "encendido" si cualquiera de los dos suena.
    const audioMasterOn = bgMusicEnabled || uiSoundsEnabled

    // La playlist activa: los tracks escaneados por el usuario tienen prioridad;
    // si no hay ninguno, se usa la playlist por defecto empaquetada con la app.
    const PLAYLIST = React.useMemo(() => {
        if (bgMusicDir && bgMusicTracks.length > 0) {
            return bgMusicTracks.map((t) => buildTrackUrl(bgMusicDir, t.file))
        }
        return DEFAULT_PLAYLIST
    }, [bgMusicDir, bgMusicTracks])

    const audioRef = React.useRef<HTMLAudioElement | null>(null)
    const [, setIsPlaying] = React.useState(false)
    const [isAnyVideoPlaying, setIsAnyVideoPlaying] = React.useState(false)
    const [currentTrackIndex, setCurrentTrackIndex] = React.useState(() => {
        // Start with a random track
        return Math.floor(Math.random() * DEFAULT_PLAYLIST.length)
    })

    // Si la playlist cambia (el usuario re-escanea otra carpeta) y el índice
    // actual queda fuera de rango, lo reiniciamos a una pista aleatoria válida.
    React.useEffect(() => {
        setCurrentTrackIndex((prev) => {
            if (prev >= PLAYLIST.length) {
                return PLAYLIST.length > 0 ? Math.floor(Math.random() * PLAYLIST.length) : 0
            }
            return prev
        })
    }, [PLAYLIST])

    // Ciclo de vida del elemento <audio>: se crea UNA sola vez al montar y se
    // destruye por completo al desmontar. Esto es crítico en dev: cada Fast
    // Refresh de Vite remonta el componente, y si el Audio anterior no se libera
    // del todo (pause + src="" + load + soltar el ref) queda una instancia
    // huérfana sonando en paralelo — el origen del "audio doble" y del "sigue
    // sonando aunque lo apague" (el toggle sólo controla el ref vivo, no la
    // huérfana).
    React.useEffect(() => {
        const audio = new Audio()
        audio.volume = Math.pow(useAppStore.getState().bgMusicVolume, 2)
        audioRef.current = audio
        return () => {
            audio.pause()
            audio.src = ""
            audio.load() // aborta el buffering y libera el recurso de red
            audioRef.current = null
        }
    }, [])

    // Sync volume when bgMusicVolume changes (using quadratic curve for natural logarithmic hearing)
    React.useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = Math.pow(bgMusicVolume, 2)
        }
    }, [bgMusicVolume])

    // Sync audio state with store preferences, video active state, and current track
    React.useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        let playTimeout: NodeJS.Timeout

        const playAudio = () => {
            audio.play()
                .then(() => setIsPlaying(true))
                .catch((err) => {
                    console.warn("Could not autoplay background music:", err)
                    setIsPlaying(false)
                })
        }

        const pauseAudio = () => {
            audio.pause()
            setIsPlaying(false)
        }

        // Update source if track changed. Resolve both to absolute URLs so the
        // comparison is uniform for relative default tracks and absolute
        // server-streamed tracks (scanned folder).
        const expectedSrc = PLAYLIST[currentTrackIndex]
        const expectedAbsolute = new URL(expectedSrc, window.location.origin).href
        if (audio.src !== expectedAbsolute) {
            audio.src = expectedSrc
            audio.load()
            audio.volume = Math.pow(bgMusicVolume, 2)
        }

        // Loop handling
        const handleEnded = () => {
            setCurrentTrackIndex((prev) => (prev + 1) % PLAYLIST.length)
        }
        audio.addEventListener("ended", handleEnded)

        // If enabled and no video is playing, start background music with a debounce to prevent pops during transitions
        if (bgMusicEnabled && !isVideoActive && !isAnyVideoPlaying && !eraOpeningPlaying) {
            playTimeout = setTimeout(() => {
                playAudio()
            }, 1000)
        } else {
            pauseAudio()
        }

        // Clean up on effect re-run: cancelamos el arranque diferido y quitamos
        // el listener. NO destruimos el Audio acá (eso lo hace el effect de
        // ciclo de vida al desmontar); pausamos para no solapar pistas al
        // cambiar de track.
        return () => {
            if (playTimeout) clearTimeout(playTimeout)
            audio.removeEventListener("ended", handleEnded)
            audio.pause()
        }
    }, [bgMusicEnabled, isVideoActive, currentTrackIndex, isAnyVideoPlaying, bgMusicVolume, PLAYLIST, eraOpeningPlaying])

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

    // Handle user interaction click to override browser autoplay blocks.
    // Respeta bgMusicEnabled: si el usuario apagó la música (directamente o vía
    // el interruptor de audio global), no la reanudamos con el próximo click.
    React.useEffect(() => {
        if (!bgMusicEnabled || isVideoActive) return

        const handleFirstInteraction = (e: Event) => {
            // Ignorá el click que viene del propio botón de música: ese ya lo
            // maneja togglePlayback. Si no, este listener (registrado con el
            // bgMusicEnabled anterior) reproduciría de nuevo el audio que el
            // toggle acaba de pausar, haciendo que el botón "switchee solo".
            const target = e.target as HTMLElement | null
            if (target?.closest("#bg-music-toggle-btn")) return

            // Releé el estado vivo del store (zustand es síncrono) en vez de
            // confiar en el closure, que puede haber quedado obsoleto dentro
            // del mismo ciclo de despacho del evento.
            const { bgMusicEnabled: liveEnabled, isVideoActive: liveVideoActive } = useAppStore.getState()
            if (!liveEnabled || liveVideoActive) {
                removeInteractionListeners()
                return
            }

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
        // Interruptor maestro de audio: enciende/apaga música de fondo y efectos
        // de UI a la vez (espeja el switch de audio global de Ajustes). No
        // llamamos play() acá: al cambiar `bgMusicEnabled` el efecto principal
        // arranca/para la reproducción con el gating correcto (evita el flicker
        // de play-inmediatamente-pause).
        const next = !audioMasterOn
        setBgMusicEnabled(next)
        setUiSoundsEnabled(next)
        if (!next && audioRef.current) {
            audioRef.current.pause()
            setIsPlaying(false)
        }
    }

    return (
        <div className="w-full flex justify-center gsap-sidebar-item">
            <button
                id="bg-music-toggle-btn"
                onClick={togglePlayback}
                title={audioMasterOn ? "Silenciar audio" : "Activar audio"}
                className={cn(
                    "flex items-center h-14 rounded-xl group px-4 relative transition-all duration-base w-full",
                    "active:scale-95 font-bold",
                    sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-14 w-full md:px-0",
                    audioMasterOn
                        ? "text-on-surface bg-white/[0.08]"
                        : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] text-on-surface-variant hover:text-on-surface"
                )}
            >
                {/* Active Indicator Line */}
                <div className={cn(
                    "absolute left-0 w-1 h-6 bg-on-surface rounded-r-full transition-all duration-slow hidden md:block",
                    audioMasterOn ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                )} />

                <span className={cn(
                    "shrink-0 z-10 group-hover:scale-110 transition-transform duration-base relative",
                    audioMasterOn && "text-on-surface"
                )}>
                    {audioMasterOn ? (
                        <Icons.status.music className="w-5 h-5 text-on-surface" />
                    ) : (
                        <Icons.status.musicOff className="w-5 h-5 relative z-10" />
                    )}
                </span>

                <span className={cn(
                    "uppercase tracking-ultra text-label-sm font-black z-10 text-left transition-colors whitespace-nowrap",
                    (sidebarOpen) ? "block" : "hidden md:hidden",
                    audioMasterOn ? "text-on-surface" : "group-hover:text-on-surface"
                )}>
                    Audio {audioMasterOn ? "(ON)" : "(OFF)"}
                </span>
            </button>
        </div>
    )
}
