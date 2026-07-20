import React from "react"
import { Section, Card, OsToggle } from "../components"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"

interface PlayerTabProps {
    control: Control<SettingsFormValues>
}


export function PlayerTab({ control }: PlayerTabProps) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">

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
                    <Controller
                        control={control}
                        name="library.autoDetectSkipTimes"
                        render={({ field }) => (
                            <OsToggle
                                label="Detectar Intro/Outro automáticamente"
                                description="Analiza los episodios en segundo plano (AnimeThemes, huella de audio y subtítulos) para ubicar OP y ED. La detección manual desde el reproductor funciona igual con esto apagado."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />

                </Card>
            </Section>


        </div>
    )
}
