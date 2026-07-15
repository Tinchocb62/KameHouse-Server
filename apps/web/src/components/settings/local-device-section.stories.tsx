import type { Meta, StoryObj } from "@storybook/react"
import { LocalDeviceSection } from "./local-device-section"
import { OsToggle } from "@/routes/settings/components"
import React from "react"

const meta: Meta<typeof LocalDeviceSection> = {
    title: "Settings/LocalDeviceSection",
    component: LocalDeviceSection,
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div className="max-w-3xl">
                <Story />
            </div>
        ),
    ],
    args: {
        title: "Preferencias de Este Dispositivo",
        children: <div className="p-4 text-sm text-on-surface-variant">Contenido de demostración</div>,
    },
}

export default meta
type Story = StoryObj<typeof LocalDeviceSection>

function LocalDeviceSectionWithToggles(args: React.ComponentProps<typeof LocalDeviceSection>) {
    const [autoplay, setAutoplay] = React.useState(true)
    const [theaterMode, setTheaterMode] = React.useState(false)

    return (
        <LocalDeviceSection {...args}>
            <OsToggle
                label="Reproducción Automática"
                description="Reproducir el siguiente video automáticamente."
                checked={autoplay}
                onChange={setAutoplay}
            />
            <OsToggle
                label="Modo Teatro"
                description="Oscurecer la pantalla durante la reproducción."
                checked={theaterMode}
                onChange={setTheaterMode}
            />
        </LocalDeviceSection>
    )
}

export const Default: Story = {
    render: (args) => <LocalDeviceSectionWithToggles {...args} />
}
