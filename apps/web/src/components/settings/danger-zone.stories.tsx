import type { Meta, StoryObj } from "@storybook/react"
import { DangerZone } from "./danger-zone"

const meta: Meta<typeof DangerZone> = {
    title: "Settings/DangerZone",
    component: DangerZone,
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div className="max-w-2xl">
                <Story />
            </div>
        ),
    ],
    args: {
        title: "Eliminar Cuenta",
        description: "Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, asegúrate de estar seguro.",
    },
}

export default meta
type Story = StoryObj<typeof DangerZone>

export const Default: Story = {
    args: {
        actions: (
            <button className="text-xs font-bold text-brand-destructive hover:brightness-110 transition-all px-4 py-2 rounded-lg border border-brand-destructive/25 bg-brand-destructive/8 hover:bg-brand-destructive/15 active:scale-95">
                Eliminar Ahora
            </button>
        )
    }
}
