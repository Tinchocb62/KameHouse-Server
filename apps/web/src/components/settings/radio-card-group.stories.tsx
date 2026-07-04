import type { Meta, StoryObj } from "@storybook/react"
import { RadioCardGroup } from "./radio-card-group"
import React from "react"

const meta: Meta<typeof RadioCardGroup> = {
    title: "Settings/RadioCardGroup",
    component: RadioCardGroup,
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div className="max-w-xl bg-surface-container rounded-container p-6">
                <Story />
            </div>
        ),
    ],
    args: {
        name: "example-group",
        options: [
            { value: "option1", label: "Primera Opción", desc: "Descripción detallada de la primera opción." },
            { value: "option2", label: "Segunda Opción", desc: "Descripción de la segunda opción.", badge: "Recomendado" },
            { value: "option3", label: "Tercera Opción" },
        ],
        value: "option1",
    },
}

export default meta
type Story = StoryObj<typeof RadioCardGroup>

export const Default: Story = {
    render: (args) => {
        const [value, setValue] = React.useState(args.value)
        return <RadioCardGroup {...args} value={value} onChange={setValue} />
    }
}
