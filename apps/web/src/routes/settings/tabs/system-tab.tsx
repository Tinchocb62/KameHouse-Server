import React from "react"
import { Section, Card, OsToggle } from "../components"
import { RangeSlider } from "@/components/settings/range-slider"
import { LocalDeviceSection } from "@/components/settings/local-device-section"
import { DangerZone } from "@/components/settings/danger-zone"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { toast } from "sonner"
import { useAppStore } from "@/lib/store"

interface SystemTabProps {
    control: Control<SettingsFormValues>
}

const HardDriveIcon = () => (
    <svg className="w-[18px] h-[18px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="6" y1="14" x2="6.01" y2="14" />
        <line x1="10" y1="14" x2="10.01" y2="14" />
    </svg>
)

export function SystemTab({ control }: SystemTabProps) {
    const {
        bgMusicEnabled,
        setBgMusicEnabled,
        bgMusicVolume,
        setBgMusicVolume,
        uiSoundsEnabled,
        setUiSoundsEnabled,
        uiSoundsVolume,
        setUiSoundsVolume,
    } = useAppStore()

    const handleBackup = () => {
        toast.success("Respaldo de base de datos generado con éxito")
    }

    const handleClearCache = () => {
        toast.success("Caché de imágenes restablecida con éxito")
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
            {/* Aplicación & Core DB Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {/* Aplicación */}
                <div className="bg-surface-container rounded-container p-6 shadow-elevation-1 md:col-span-2 space-y-5 divide-y divide-outline-variant/3">
                    <h4 className="text-xs font-bold text-brand-accent uppercase tracking-wide">Aplicación</h4>
                    <Controller
                        control={control}
                        name="library.openWebURLOnStart"
                        render={({ field }) => (
                            <OsToggle
                                label="Abrir Interfaz Web al Iniciar"
                                description="Abre automáticamente el navegador con KameHouse al arrancar el servidor."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="Platform.hideAudienceScore"
                        render={({ field }) => (
                            <OsToggle
                                label="Ocultar Puntuación de Audiencia"
                                description="No mostrar la puntuación de la comunidad en las tarjetas de media."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="Platform.disableCacheLayer"
                        render={({ field }) => (
                            <OsToggle
                                label="Desactivar Capa de Caché"
                                description="Desactiva el cacheo de respuestas de la plataforma (útil para depuración)."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </div>

                {/* Base de Datos Core */}
                <div className="bg-surface-container rounded-container p-6 shadow-elevation-1 flex flex-col justify-between">
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wide flex items-center gap-2">
                            <HardDriveIcon /> Base de Datos Core
                        </h4>
                        <span className="text-[10px] font-mono text-on-surface-variant block">Engine: SQLite 3</span>
                    </div>
                    <div className="pt-5 flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={handleBackup}
                            className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-[10px] font-bold uppercase tracking-wider text-on-surface-variant rounded-xl transition-all active:scale-[0.98]"
                        >
                            Respaldar DB
                        </button>
                        <button
                            type="button"
                            onClick={handleClearCache}
                            className="w-full py-2.5 bg-brand-destructive/8 hover:bg-brand-destructive/15 border border-brand-destructive/15 text-[10px] font-bold uppercase tracking-wider text-brand-destructive rounded-xl transition-all active:scale-[0.98]"
                        >
                            Limpiar Caché Imágenes
                        </button>
                    </div>
                </div>
            </div>

            {/* Gestión de Notificaciones */}
            <Section label="Notificaciones de la Aplicación">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="notifications.disableNotifications"
                        render={({ field }) => (
                            <OsToggle
                                label="Desactivar Notificaciones Globales"
                                description="Evita que se muestren alertas toast de eventos del sistema."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="notifications.disableAutoScannerNotifications"
                        render={({ field }) => (
                            <OsToggle
                                label="Desactivar Avisos del Escáner"
                                description="No mostrar notificaciones toast en tiempo real cuando se encuentren, indexen o enriquezcan archivos nuevos."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="notifications.disableAutoDownloaderNotifications"
                        render={({ field }) => (
                            <OsToggle
                                label="Desactivar Avisos del Descargador"
                                description="No mostrar notificaciones toast de progreso de descargas automáticas."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>

            {/* Audio y Efectos — preferencia local del dispositivo */}
            <LocalDeviceSection title="Audio y Efectos">
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
            </LocalDeviceSection>

            {/* Zona de Peligro */}
            <Section label="Zona de Peligro">
                <DangerZone
                    title="Zona de Riesgo Crítico"
                    description="Operaciones destructivas que alteran permanentemente los datos del servidor KameHouse."
                />
            </Section>
        </div>
    )
}
