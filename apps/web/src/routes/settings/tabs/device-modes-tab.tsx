import React from "react"
import { OsToggle } from "../components"
import { LocalDeviceSection } from "@/components/settings/local-device-section"
import { useAppStore } from "@/lib/store"

export function DeviceModesTab() {
    const { marathonMode, setMarathonMode, tvMode, setTvMode } = useAppStore()
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            <LocalDeviceSection title="Modos de Dispositivo" description="Configuraciones exclusivas para la visualización en este navegador/dispositivo específico.">
                <OsToggle
                    label="Modo Maratón"
                    description="Encadena episodios sin pantallas de confirmación intermedias y omite introducciones automáticamente."
                    checked={marathonMode}
                    onChange={setMarathonMode}
                />
                <OsToggle
                    label="Modo TV (Interfaz Leanback)"
                    description="Optimiza la interfaz con navegación por teclado/control remoto y un diseño adaptado para pantallas de televisión."
                    checked={tvMode}
                    onChange={setTvMode}
                />
            </LocalDeviceSection>
        </div>
    )
}
