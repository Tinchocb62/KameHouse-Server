import type { Meta, StoryObj } from "@storybook/react"
import { RangeSlider } from "./range-slider"
import React from "react"

const meta: Meta<typeof RangeSlider> = {
    title: "Settings/RangeSlider",
    component: RangeSlider,
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div className="max-w-2xl bg-surface-container rounded-container">
                <Story />
            </div>
        ),
    ],
    argTypes: {
        min: { control: "number" },
        max: { control: "number" },
        step: { control: "number" },
        value: { control: "number" },
    },
    args: {
        label: "Opacidad del Fondo",
        description: "10 = Apenas visible, 100 = Opaco",
        min: 0,
        max: 100,
        step: 1,
        value: 50,
    },
}

export default meta
type Story = StoryObj<typeof RangeSlider>

function ControlledRangeSlider(args: React.ComponentProps<typeof RangeSlider>) {
    const [value, setValue] = React.useState(args.value)
    return <RangeSlider {...args} value={value} onChange={setValue} />
}

export const Default: Story = {
    render: (args) => <ControlledRangeSlider {...args} />
}

export const WithFormatting: Story = {
    render: (args) => <ControlledRangeSlider {...args} formatValue={(v) => `${v}%`} />
}
