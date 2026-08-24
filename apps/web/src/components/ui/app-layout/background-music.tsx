"use client"

import * as React from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"
import { getServerBaseUrl } from "@/api/client/server-url"


import { resolveSeriesSoundtrackPlaylist, SERIES_SOUNDTRACKS, getSeriesEraKey } from "@/lib/config/series_soundtracks"

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

// ═══════════════════════════════════════════════════════════════════════════
// CRITICAL AUDIO ARCHITECTURE - NO MODIFICAR ESTA LÓGICA
// 1. Singleton Global: Garantiza una única instancia de HTMLAudioElement en window.
//    Previene "audios huérfanos / zombies" que sigan sonando en dev (HMR) o cuando
//    el Sidebar se monta dos veces (desktop aside + mobile drawer).
// 2. Control Síncrono: Zustand sincroniza el estado en 0ms y pausa inmediatamente
//    la instancia global sin esperar ciclos de re-render de React.
// ═══════════════════════════════════════════════════════════════════════════

function getGlobalBgAudio(): HTMLAudioElement | null {
    if (typeof window === "undefined") return null
    const win = window as any
    if (!win.__kamehouse_bg_audio) {
        const audio = new Audio()
        win.__kamehouse_bg_audio = audio
    }
    return win.__kamehouse_bg_audio
}

// Limpieza proactiva en dev / HMR: si la música está deshabilitada en el store,
// pausamos y limpiamos el audio inmediatamente al cargar el módulo.
if (typeof window !== "undefined") {
    const win = window as any
    if (win.__kamehouse_bg_audio && !useAppStore.getState().bgMusicEnabled) {
        try {
            win.__kamehouse_bg_audio.pause()
            win.__kamehouse_bg_audio.src = ""
        } catch {}
    }
}

export function BackgroundMusicPlayer() {
    const {
        bgMusicEnabled,
        setBgMusicEnabled,
        uiSoundsEnabled,
        setUiSoundsEnabled,
        bgMusicVolume,
        bgMusicDir,
        bgMusicTracks,
        isVideoActive,
        sidebarOpen,
        eraOpeningPlaying,
        activeSeriesContext,
        seriesSoundtrackMode,
    } = useAppStore(
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
            activeSeriesContext: state.activeSeriesContext,
            seriesSoundtrackMode: state.seriesSoundtrackMode,
        }))
    )

    // El botón de la sidebar es el interruptor MAESTRO de audio: agrupa la
    // música de fondo y los efectos de UI, igual que el switch de audio global
    // en Ajustes → Audio. Está "encendido" si cualquiera de los dos suena.
    const audioMasterOn = bgMusicEnabled || uiSoundsEnabled

    // Serie activa detectada
    const activeEraKey = React.useMemo(() => getSeriesEraKey(activeSeriesContext), [activeSeriesContext])
    const activeSeriesInfo = activeEraKey ? SERIES_SOUNDTRACKS[activeEraKey] : null

    // La playlist activa: si hay una serie activa y el modo soundtrack está encendido,
    // se resuelve la banda sonora correspondiente a esa serie; si no, la playlist global.
    const PLAYLIST = React.useMemo(() => {
        if (seriesSoundtrackMode && activeSeriesContext) {
            const seriesTracks = resolveSeriesSoundtrackPlaylist(activeSeriesContext, bgMusicTracks, bgMusicDir)
            if (seriesTracks.length > 0) {
                return seriesTracks.map(t => t.url)
            }
        }

        if (bgMusicDir && bgMusicTracks.length > 0) {
            return bgMusicTracks.map((t) => buildTrackUrl(bgMusicDir, t.file))
        }
        return DEFAULT_PLAYLIST
    }, [bgMusicDir, bgMusicTracks, activeSeriesContext, seriesSoundtrackMode])

    const [, setIsPlaying] = React.useState(false)
    const [isAnyVideoPlaying, setIsAnyVideoPlaying] = React.useState(false)
    const [currentTrackIndex, setCurrentTrackIndex] = React.useState(0)
    const fadeTimerRef = React.useRef<NodeJS.Timeout | null>(null)

    // Si la serie cambia, reseteamos al primer track y realizamos transición suave (fade-out / fade-in)
    React.useEffect(() => {
        setCurrentTrackIndex(0)
        const audio = getGlobalBgAudio()
        if (audio && bgMusicEnabled && !isVideoActive && !eraOpeningPlaying) {
            // Suave fade out antes de cambiar la fuente
            const targetVolume = Math.pow(bgMusicVolume, 2)
            audio.volume = targetVolume * 0.2
            if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
            fadeTimerRef.current = setTimeout(() => {
                const a = getGlobalBgAudio()
                if (a) {
                    a.volume = targetVolume
                }
            }, 350)
        }
    }, [activeSeriesContext, bgMusicEnabled, isVideoActive, eraOpeningPlaying, bgMusicVolume])

    // Si el índice actual queda fuera de rango, lo reiniciamos a 0
    React.useEffect(() => {
        if (currentTrackIndex >= PLAYLIST.length) {
            const timer = setTimeout(() => setCurrentTrackIndex(0), 0)
            return () => clearTimeout(timer)
        }
    }, [PLAYLIST, currentTrackIndex])

    // Sync volume when bgMusicVolume changes (NO incluir bgMusicVolume en el hook
    // de reproducción para evitar que cambiar el volumen reinicie o corte la música).
    React.useEffect(() => {
        const audio = getGlobalBgAudio()
        if (audio) {
            audio.volume = Math.pow(bgMusicVolume, 2)
        }
    }, [bgMusicVolume])

    // Sincronización del estado de reproducción con las preferencias del store
    React.useEffect(() => {
        const audio = getGlobalBgAudio()
        if (!audio) return

        // Corte inmediato si la música está apagada, un video está activo,
        // o suena un opening de saga.
        if (!bgMusicEnabled || isVideoActive || isAnyVideoPlaying || eraOpeningPlaying) {
            audio.pause()
            setIsPlaying(false)
            return
        }

        // Carga de la pista esperada si cambió
        const expectedSrc = PLAYLIST[currentTrackIndex]
        if (expectedSrc) {
            const expectedAbsolute = new URL(expectedSrc, window.location.origin).href
            if (audio.src !== expectedAbsolute) {
                audio.src = expectedSrc
                audio.load()
            }
        }
        audio.volume = Math.pow(bgMusicVolume, 2)

        // Manejo de bucle / siguiente pista al terminar
        const handleEnded = () => {
            setCurrentTrackIndex((prev) => (prev + 1) % PLAYLIST.length)
        }
        audio.addEventListener("ended", handleEnded)

        audio.play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
                console.warn("Could not autoplay background music:", err)
                setIsPlaying(false)
            })

        return () => {
            audio.removeEventListener("ended", handleEnded)
        }
    }, [bgMusicEnabled, isVideoActive, currentTrackIndex, isAnyVideoPlaying, PLAYLIST, eraOpeningPlaying])

    // Detectar si se reproduce un video en la página para pausar la música automáticamente
    React.useEffect(() => {
        const updateMediaState = () => {
            const mediaElements = document.querySelectorAll("video")
            let playing = false
            mediaElements.forEach((el) => {
                const media = el as HTMLMediaElement
                if (!media.paused && !media.ended) {
                    playing = true
                }
            })
            setIsAnyVideoPlaying(playing)
        }

        document.addEventListener("play", updateMediaState, true)
        document.addEventListener("playing", updateMediaState, true)
        document.addEventListener("pause", updateMediaState, true)
        document.addEventListener("ended", updateMediaState, true)

        // Verificación inicial
        updateMediaState()

        return () => {
            document.removeEventListener("play", updateMediaState, true)
            document.removeEventListener("playing", updateMediaState, true)
            document.removeEventListener("pause", updateMediaState, true)
            document.removeEventListener("ended", updateMediaState, true)
        }
    }, [])

    const togglePlayback = () => {
        // Interruptor maestro de audio: activa / desactiva música de fondo y efectos de UI a la vez.
        // NOTA CRÍTICA: Llamar a audio.play() directamente dentro del click del usuario
        // garantiza el cumplimiento estricto de las políticas de autoplay del navegador.
        const next = !audioMasterOn
        setBgMusicEnabled(next)
        setUiSoundsEnabled(next)

        const audio = getGlobalBgAudio()
        if (!next) {
            if (audio) {
                audio.pause()
            }
            setIsPlaying(false)
        } else {
            if (audio && !isVideoActive && !eraOpeningPlaying && !isAnyVideoPlaying) {
                const expectedSrc = PLAYLIST[currentTrackIndex]
                if (expectedSrc) {
                    const expectedAbsolute = new URL(expectedSrc, window.location.origin).href
                    if (audio.src !== expectedAbsolute) {
                        audio.src = expectedSrc
                        audio.load()
                    }
                }
                audio.volume = Math.pow(bgMusicVolume, 2)
                audio.play()
                    .then(() => setIsPlaying(true))
                    .catch((err) => {
                        console.warn("Could not start background music on click:", err)
                    })
            }
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

                <div className={cn(
                    "flex flex-col text-left transition-colors whitespace-nowrap min-w-0 flex-1",
                    (sidebarOpen) ? "block" : "hidden md:hidden",
                )}>
                    <span className={cn(
                        "uppercase tracking-ultra text-label-sm font-black z-10",
                        audioMasterOn ? "text-on-surface" : "group-hover:text-on-surface"
                    )}>
                        Audio {audioMasterOn ? "(ON)" : "(OFF)"}
                    </span>
                    {activeSeriesInfo && audioMasterOn && (
                        <span className="text-[10px] text-brand-accent font-mono truncate font-medium">
                            {activeSeriesInfo.shortName} OST
                        </span>
                    )}
                </div>
            </button>
        </div>
    )
}
