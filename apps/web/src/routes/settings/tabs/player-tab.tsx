import React from "react"
import { Section, Card, OsToggle, OsInput } from "../components"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"
import { useAppStore } from "@/lib/store"
import { LocalDeviceSection } from "@/components/settings/local-device-section"

interface PlayerTabProps {
    control: Control<SettingsFormValues>
}


export function PlayerTab({ control }: PlayerTabProps) {
    const { marathonMode, setMarathonMode } = useAppStore()
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">

            {/* Reproducción */}
            <Section label="Comportamiento de Reproducción">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="library.autoPlayNextEpisode"
                        render={({ field }) => (
                            <OsToggle
                                label="Reproducción Continua"
                                description="Inicia automáticamente el siguiente episodio de la cola al finalizar el actual."
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
                                label="Habilitar Continuidad de Reproducción"
                                description="Guarda el progreso en segundo plano para continuar viendo desde donde lo dejaste."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />

                </Card>
            </Section>


            {/* Preferencia local: modo maratón */}
            <LocalDeviceSection title="Reproducción en Este Dispositivo">
                <OsToggle
                    label="Modo Maratón"
                    description="Encadena episodios sin pantallas de confirmación intermedias en este dispositivo."
                    checked={marathonMode}
                    onChange={setMarathonMode}
                />
            </LocalDeviceSection>
        </div>
    )
}
