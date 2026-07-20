import React from "react"
import { OsToggle } from "../components"
import { LocalDeviceSection } from "@/components/settings/local-device-section"
import { RangeSlider } from "@/components/settings/range-slider"
import { type Control } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { useAppStore, type BackgroundMusicTrack } from "@/lib/store"
import { toast } from "sonner"
import { getServerBaseUrl } from "@/api/client/server-url"
import { DirectorySelector } from "@/components/shared/directory-selector"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"

interface AudioTabProps {
    control: Control<SettingsFormValues>
}

export function AudioTab({ control }: AudioTabProps) {
    const {
        bgMusicEnabled,
        setBgMusicEnabled,
        bgMusicVolume,
        setBgMusicVolume,
        bgMusicDir,
        setBgMusicDir,
        bgMusicTracks,
        setBgMusicTracks,
        uiSoundsEnabled,
        setUiSoundsEnabled,
        uiSoundsVolume,
        setUiSoundsVolume,
    } = useAppStore()

    // Interruptor maestro de audio: activo cuando la música o los efectos están
    // sonando. Al encenderlo se habilitan ambos (cada uno con su volumen); al
    // apagarlo se silencian los dos de una sola vez.
    const audioMasterOn = bgMusicEnabled || uiSoundsEnabled
    const setAudioMaster = (on: boolean) => {
        setBgMusicEnabled(on)
        setUiSoundsEnabled(on)
    }

    const [musicDirInput, setMusicDirInput] = React.useState(bgMusicDir)
    const [isScanningMusic, setIsScanningMusic] = React.useState(false)

    const handleScanMusic = async () => {
        const dir = musicDirInput.trim()
        if (!dir) {
            toast.error("Selecciona una carpeta primero")
            return
        }
        setIsScanningMusic(true)
        try {
            const base = getServerBaseUrl() || window.location.origin
            const url = `${base}/api/v1/music/scan?dir=${encodeURIComponent(dir)}`
            const res = await fetch(url, { credentials: "include" })
            if (!res.ok) {
                const body = await res.json().catch(() => null) as { error?: string; message?: string } | null
                throw new Error(body?.error || body?.message || "No se pudo leer la carpeta")
            }
            type MusicScanPayload = { data?: { tracks?: BackgroundMusicTrack[] }; tracks?: BackgroundMusicTrack[] }
            const payload = await res.json() as MusicScanPayload | null
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
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            <LocalDeviceSection title="Audio y Efectos" description="Opciones de audio locales guardadas exclusivamente para este dispositivo.">
                <OsToggle
                    label="Efectos de Sonido"
                    description="Habilita los sonidos de interacción al pasar el cursor o hacer clic sobre tarjetas y menús."
                    checked={uiSoundsEnabled}
                    onChange={setUiSoundsEnabled}
                />
                {uiSoundsEnabled && (
                    <RangeSlider
                        label="Volumen de los Efectos"
                        description="Ajusta el volumen general de los efectos de sonido de la interfaz."
                        min={0}
                        max={1}
                        step={0.05}
                        value={uiSoundsVolume}
                        onChange={setUiSoundsVolume}
                        formatValue={(v) => `${Math.round(v * 100)}%`}
                    />
                )}
                <OsToggle
                    label="Música de Fondo"
                    description="Habilita la reproducción de música ambiental de fondo mientras navegas por KameHouse."
                    checked={bgMusicEnabled}
                    onChange={setBgMusicEnabled}
                />
                {bgMusicEnabled && (
                    <RangeSlider
                        label="Volumen de la Música"
                        description="Ajusta el volumen general de la música de fondo."
                        min={0}
                        max={1}
                        step={0.05}
                        value={bgMusicVolume}
                        onChange={setBgMusicVolume}
                        formatValue={(v) => `${Math.round(v * 100)}%`}
                    />
                )}
                {bgMusicEnabled && (
                    <div className="px-6 py-5 border-b border-outline-variant/4 last:border-0 space-y-4">
                        <div className="space-y-1 max-w-xl">
                            <p className="text-sm font-semibold text-on-surface-variant tracking-tight">Carpeta de Música Personalizada</p>
                            <p className="text-caption text-on-surface-variant">
                                Selecciona una carpeta y escanéala: toda la música que agregues ahí se reproducirá de fondo.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                            <div className="flex-1">
                                <DirectorySelector
                                    value={musicDirInput}
                                    onSelect={(path) => setMusicDirInput(path)}
                                    shouldExist
                                    placeholder="Ej: D:\\Musica\\KameHouse"
                                />
                            </div>
                            <Button
                                type="button"
                                intent="primary"
                                onClick={handleScanMusic}
                                loading={isScanningMusic}
                                leftIcon={<Icons.status.music className="w-4 h-4" />}
                            >
                                Escanear
                            </Button>
                        </div>
                        {bgMusicDir && bgMusicTracks.length > 0 && (
                            <p className="text-caption text-on-surface-variant">
                                {bgMusicTracks.length} pista(s) activas desde <span className="font-mono text-on-surface">{bgMusicDir}</span>
                            </p>
                        )}
                    </div>
                )}
            </LocalDeviceSection>
        </div>
    )
}
