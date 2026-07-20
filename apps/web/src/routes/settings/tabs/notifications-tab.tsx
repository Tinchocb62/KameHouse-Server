import React from "react"
import { Section, Card, OsToggle } from "../components"
import { type Control, Controller } from "react-hook-form"
import { type SettingsFormValues } from "../index"

interface NotificationsTabProps {
    control: Control<SettingsFormValues>
}

export function NotificationsTab({ control }: NotificationsTabProps) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            <Section label="Notificaciones de la Aplicación" description="Controla qué tipos de alertas se muestran en el sistema.">
                <Card className="divide-y divide-outline-variant/3">
                    <Controller
                        control={control}
                        name="notifications.disableNotifications"
                        render={({ field }) => (
                            <OsToggle
                                label="Desactivar Notificaciones Globales"
                                description="Evita que se muestren alertas toast de eventos del sistema (errores, éxitos)."
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
                </Card>
            </Section>
        </div>
    )
}
