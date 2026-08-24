import React, { useState } from "react"
import { type Control, Controller } from "react-hook-form"
import { motion } from "framer-motion"
import { type SettingsFormValues } from "../index"
import { useAppStore, type BackgroundMusicTrack } from "@/lib/store"
import { buildSeaQuery } from "@/api/client/requests"
import { useWebSocket } from "@/hooks/use-websocket"
import { getApiWebSocketUrl } from "@/api/client/server-url"
import { WSEvents, type WebSocketMessage } from "@/lib/server/ws-events"
import { toast } from "sonner"
import { RangeSlider } from "@/components/settings/range-slider"
import { DirectorySelector } from "@/components/shared/directory-selector"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/components/ui/core/styling"
import { SettingsSection, SettingsCard, OsToggle } from "../components"
import { useShallow } from "zustand/react/shallow"

interface PlaybackTabProps {
    control: Control<SettingsFormValues>
    searchQuery?: string
}

const BATCH_SCAN_MEDIA_ID = -1

function LibrarySkipScanRow() {
    const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle")
    const [message, setMessage] = useState("")
    const [percent, setPercent] = useState(0)

    const wsUrl = React.useMemo(() => getApiWebSocketUrl(), [])
    useWebSocket(wsUrl, React.useCallback((data: WebSocketMessage) => {
        if (data?.type !== WSEvents.SKIP_SCAN_STATUS) return
        const p = data.payload
        if (!p || p.mediaId !== BATCH_SCAN_MEDIA_ID) return
        setMessage(p.message ?? "")
        if (typeof p.percent === "number") setPercent(p.percent)
        if (p.status === "done") setStatus("done")
        else if (p.status === "error") setStatus("error")
        else setStatus("running")
    }, []))

    const handleScan = async () => {
        if (status === "running") return
        setStatus("running")
        setMessage("Iniciando escaneo de biblioteca...")
        setPercent(0)
        try {
            await buildSeaQuery<unknown>({
                endpoint: "/api/v1/mediastream/skip-times/scan-all",
                method: "POST",
            })
        } catch {
            setStatus("error")
            setMessage("No se pudo iniciar el escaneo.")
        }
    }

    const running = status === "running"

    return (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 max-w-lg">
                    <p className="text-xs font-bold text-on-surface">Escanear marcas de Skip en toda la biblioteca</p>
                    <p className={cn("text-[11px] leading-tight", status === "error" ? "text-red-400" : "text-on-surface-variant/70")}>
                        {status === "idle"
                            ? "Analiza todas las series locales para detectar marcas de Openings y Endings automáticamente."
                            : (message || "Detectando marcas de skip...")}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleScan}
                    disabled={running}
                    className={cn(
                        "shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all",
                        running
                            ? "bg-brand-accent/10 border border-brand-accent/20 text-brand-accent cursor-not-allowed"
                            : "bg-brand-accent hover:brightness-110 text-white shadow-sm active:scale-95"
                    )}
                >
                    {running ? <Icons.ui.spinner className="w-3.5 h-3.5 animate-spin" /> : <Icons.media.wand className="w-3.5 h-3.5" />}
                    <span>{running ? "ESCANEANDO..." : "ESCANEAR AHORA"}</span>
                </button>
            </div>
            {running && (
                <div className="w-full h-1.5 bg-white/10 rounded-full relative overflow-hidden">
                    <div
                        className="absolute left-0 h-full bg-brand-accent rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                    />
                </div>
            )}
        </div>
    )
}

const AUDIO_PROFILES = [
    { id: "latino" as const, flag: "🇲🇽", title: "Español Latino", desc: "Mario Castañeda, René García, etc." },
    { id: "castellano" as const, flag: "🇪🇸", title: "Castellano", desc: "Doblaje oficial de España." },
    { id: "japanese" as const, flag: "🇯🇵", title: "Japonés (Original)", desc: "Pistas con subtítulos automáticos." },
    { id: "english" as const, flag: "🇺🇸", title: "Inglés", desc: "Funimation / Crunchyroll." },
]

export function PlaybackTab({ control }: PlaybackTabProps) {
    const {
        preferredAudioProfile,
        setPreferredAudioProfile,
        autoSkipIntro,
        setAutoSkipIntro,
        autoSkipOutro,
        setAutoSkipOutro,
        autoSkipFiller,
        setAutoSkipFiller,
        autoDisableSubtitlesWhenDubbed,
        setAutoDisableSubtitlesWhenDubbed,
        bgMusicEnabled,
        setBgMusicEnabled,
        bgMusicVolume,
        setBgMusicVolume,
        bgMusicDir,
        setBgMusicDir,
        setBgMusicTracks,
        seriesSoundtrackMode,
        setSeriesSoundtrackMode,
        uiSoundsEnabled,
        setUiSoundsEnabled,
        uiSoundsVolume,
        setUiSoundsVolume,
        marathonMode,
        setMarathonMode,
        tvMode,
        setTvMode,
    } = useAppStore(
        useShallow(s => ({
            preferredAudioProfile: s.preferredAudioProfile,
            setPreferredAudioProfile: s.setPreferredAudioProfile,
            autoSkipIntro: s.autoSkipIntro,
            setAutoSkipIntro: s.setAutoSkipIntro,
            autoSkipOutro: s.autoSkipOutro,
            setAutoSkipOutro: s.setAutoSkipOutro,
            autoSkipFiller: s.autoSkipFiller,
            setAutoSkipFiller: s.setAutoSkipFiller,
            autoDisableSubtitlesWhenDubbed: s.autoDisableSubtitlesWhenDubbed,
            setAutoDisableSubtitlesWhenDubbed: s.setAutoDisableSubtitlesWhenDubbed,
            bgMusicEnabled: s.bgMusicEnabled,
            setBgMusicEnabled: s.setBgMusicEnabled,
            bgMusicVolume: s.bgMusicVolume,
            setBgMusicVolume: s.setBgMusicVolume,
            bgMusicDir: s.bgMusicDir,
            setBgMusicDir: s.setBgMusicDir,
            setBgMusicTracks: s.setBgMusicTracks,
            seriesSoundtrackMode: s.seriesSoundtrackMode,
            setSeriesSoundtrackMode: s.setSeriesSoundtrackMode,
            uiSoundsEnabled: s.uiSoundsEnabled,
            setUiSoundsEnabled: s.setUiSoundsEnabled,
            uiSoundsVolume: s.uiSoundsVolume,
            setUiSoundsVolume: s.setUiSoundsVolume,
            marathonMode: s.marathonMode,
            setMarathonMode: s.setMarathonMode,
            tvMode: s.tvMode,
            setTvMode: s.setTvMode,
        }))
    )

    const [musicDirInput, setMusicDirInput] = useState(bgMusicDir)
    const [isScanningMusic, setIsScanningMusic] = useState(false)

    const handleScanMusic = async () => {
        const dir = musicDirInput.trim()
        if (!dir) {
            toast.error("Selecciona una carpeta primero")
            return
        }
        setIsScanningMusic(true)
        try {
            type MusicScanPayload = { data?: { tracks?: BackgroundMusicTrack[] }; tracks?: BackgroundMusicTrack[] }
            const payload = await buildSeaQuery<MusicScanPayload, { dir: string }>({
                endpoint: "/api/v1/music/scan",
                method: "GET",
                params: { dir },
            })
            const tracks = payload?.data?.tracks ?? payload?.tracks ?? []
            if (!tracks.length) {
                toast.error("No se encontraron archivos de audio en esa carpeta")
                setBgMusicTracks([])
                setBgMusicDir(dir)
                return
            }
            setBgMusicDir(dir)
            setBgMusicTracks(tracks)
            toast.success(`${tracks.length} pista(s) de música encontradas`)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al escanear la carpeta de música")
        } finally {
            setIsScanningMusic(false)
        }
    }

    return (
        <div className="w-full space-y-7 animate-in fade-in duration-base pb-8">

            {/* ═══════════════════════════════════════════════════════════════════
                1. DOBLAJE Y PERFIL DE AUDIO
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Doblaje e Idioma Principal"
                description="Preferencia automática de pista de audio en archivos con doblajes múltiples."
                icon={Icons.status.headphones}
            >
                <SettingsCard divide={false} className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {AUDIO_PROFILES.map((p) => {
                            const isSelected = preferredAudioProfile === p.id
                            return (
                                <motion.button
                                    key={p.id}
                                    type="button"
                                    whileHover={{ scale: 1.025, y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                    onClick={() => setPreferredAudioProfile(p.id)}
                                    className={cn(
                                        "flex flex-col p-3.5 rounded-xl border text-left transition-colors duration-200",
                                        isSelected
                                            ? "bg-brand-accent/10 border-brand-accent shadow-[0_0_16px_hsl(var(--brand-accent)/0.25)] ring-1 ring-brand-accent/40"
                                            : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xl select-none">{p.flag}</span>
                                        {isSelected && <span className="w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_8px_hsl(var(--brand-accent))]" />}
                                    </div>
                                    <span className={cn("text-xs font-bold truncate", isSelected ? "text-brand-accent" : "text-on-surface")}>
                                        {p.title}
                                    </span>
                                    <span className="text-[10px] text-on-surface-variant/70 line-clamp-1 mt-0.5">{p.desc}</span>
                                </motion.button>
                            )
                        })}
                    </div>

                    <div className="pt-2 border-t border-white/[0.05]">
                        <OsToggle
                            label="Ocultar subtítulos si el audio está doblado"
                            description="Desactiva subtítulos automáticamente al reproducir en Español Latino o Castellano."
                            checked={autoDisableSubtitlesWhenDubbed}
                            onChange={setAutoDisableSubtitlesWhenDubbed}
                        />
                    </div>
                </SettingsCard>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                2. SALTO INTELIGENTE (SMART SKIP)
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Salto Inteligente (Smart Skip)"
                description="Omisión de openings, endings, episodios de relleno y detección acústica en segundo plano."
                icon={Icons.media.skipNext}
                badge={
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/25">
                        {[autoSkipIntro, autoSkipOutro, autoSkipFiller].filter(Boolean).length} activos
                    </span>
                }
            >
                <SettingsCard>
                    <OsToggle
                        label="Saltar Opening (Intro) automáticamente"
                        description="Omite canciones iniciales (Cha-La Head-Cha-La, Dan Dan, etc.) sin presionar botones."
                        checked={autoSkipIntro}
                        onChange={setAutoSkipIntro}
                    />
                    <OsToggle
                        label="Saltar Ending (Créditos) automáticamente"
                        description="Pasa directamente al siguiente episodio al iniciar los créditos finales."
                        checked={autoSkipOutro}
                        onChange={setAutoSkipOutro}
                    />
                    <OsToggle
                        label="Saltar episodios de relleno automáticamente"
                        description="Omite arcos no canónicos (Garlic Jr., Namek falso) para una experiencia fiel al manga."
                        checked={autoSkipFiller}
                        onChange={setAutoSkipFiller}
                    />
                    <Controller
                        control={control}
                        name="library.autoDetectSkipTimes"
                        render={({ field }) => (
                            <OsToggle
                                label="Detectar marcas Skip en segundo plano"
                                description="Analiza huellas acústicas y subtítulos para ubicar intros y outros automáticamente."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <div className="p-5">
                        <LibrarySkipScanRow />
                    </div>
                </SettingsCard>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                3. CONTINUIDAD Y COLA DE REPRODUCCIÓN
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Continuidad y Cola de Reproducción"
                description="Comportamiento al terminar un episodio y sincronización de progreso."
                icon={Icons.media.queue}
            >
                <SettingsCard>
                    <Controller
                        control={control}
                        name="library.autoPlayNextEpisode"
                        render={({ field }) => (
                            <OsToggle
                                label="Reproducción Continua (Autoplay)"
                                description="Inicia automáticamente el siguiente capítulo al concluir el actual."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="library.enableWatchContinuity"
                        render={({ field }) => (
                            <OsToggle
                                label="Guardar Progreso en la Nube / Base de Datos"
                                description="Recuerda el segundo exacto para continuar donde lo dejaste en cualquier dispositivo."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </SettingsCard>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                4. AUDIO DE INTERFAZ Y MÚSICA AMBIENTAL
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Audio de Interfaz y Música Ambiental"
                description="Efectos de sonido de menú y banda sonora de fondo mientras exploras."
                icon={Icons.status.music}
                badge={
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                        Local
                    </span>
                }
            >
                <SettingsCard>
                    <OsToggle
                        label="Efectos de Sonido en la Interfaz"
                        description="Sonidos sutiles retro al hacer clics, abrir menús o seleccionar opciones."
                        checked={uiSoundsEnabled}
                        onChange={setUiSoundsEnabled}
                    />
                    {uiSoundsEnabled && (
                        <div className="p-5 bg-white/[0.01]">
                            <RangeSlider
                                label="Volumen de Efectos"
                                min={0}
                                max={1}
                                step={0.05}
                                value={uiSoundsVolume}
                                onChange={setUiSoundsVolume}
                                formatValue={(v) => `${Math.round(v * 100)}%`}
                            />
                        </div>
                    )}

                    <OsToggle
                        label="Música Ambiental de Fondo"
                        description="Reproduce pistas de audio ambiental mientras navegas por la plataforma."
                        checked={bgMusicEnabled}
                        onChange={setBgMusicEnabled}
                    />
                    {bgMusicEnabled && (
                        <>
                            <OsToggle
                                label="Soundtrack Contextual por Serie"
                                description="Reproduce automáticamente los temas oficiales de cada serie (DB, DBZ, GT, Super, Daima) al explorar su catálogo."
                                checked={seriesSoundtrackMode}
                                onChange={setSeriesSoundtrackMode}
                            />
                            <div className="p-5 space-y-4 bg-white/[0.01]">
                                <RangeSlider
                                    label="Volumen de Música Ambiental"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={bgMusicVolume}
                                    onChange={setBgMusicVolume}
                                    formatValue={(v) => `${Math.round(v * 100)}%`}
                                />
                                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/10 space-y-2.5">
                                    <p className="text-xs font-bold text-on-surface uppercase tracking-wider">Carpeta de Música Local</p>
                                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                                        <div className="flex-1">
                                            <DirectorySelector
                                                value={musicDirInput}
                                                onSelect={setMusicDirInput}
                                                onChange={(e) => setMusicDirInput(e.target.value)}
                                                placeholder="Ruta con archivos MP3 / FLAC / OGG"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={handleScanMusic}
                                            disabled={isScanningMusic}
                                            className="bg-brand-accent text-white shrink-0 font-bold text-xs"
                                        >
                                            {isScanningMusic ? <Icons.ui.spinner className="w-3.5 h-3.5 animate-spin" /> : <Icons.media.volume2 className="w-3.5 h-3.5" />}
                                            <span>{isScanningMusic ? "Escaneando..." : "Escanear Pistas"}</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </SettingsCard>
            </SettingsSection>

            {/* ═══════════════════════════════════════════════════════════════════
                5. MODOS DE EXPERIENCIA (MARATÓN Y TV)
               ═══════════════════════════════════════════════════════════════════ */}
            <SettingsSection
                label="Modos de Experiencia (Maratón y TV)"
                description="Configuraciones ergonómicas para maratones intensos y televisores."
                icon={Icons.status.tv}
            >
                <SettingsCard>
                    <OsToggle
                        label="Modo Maratón"
                        description="Encadena episodios sin pantallas de confirmación intermedias ni pausas."
                        checked={marathonMode}
                        onChange={setMarathonMode}
                    />
                    <OsToggle
                        label="Modo TV (Interfaz Leanback)"
                        description="Aumenta los tamaños táctiles y optimiza para control remoto o teclado a distancia."
                        checked={tvMode}
                        onChange={setTvMode}
                    />
                </SettingsCard>
            </SettingsSection>

        </div>
    )
}

