import type { Meta, StoryObj } from "@storybook/react"
import { SecretField } from "./secret-field"
import React from "react"

const meta: Meta<typeof SecretField> = {
    title: "Settings/SecretField",
    component: SecretField,
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div className="max-w-md bg-surface-container rounded-container p-6">
                <Story />
            </div>
        ),
    ],
    args: {
        label: "Contraseña de API",
        placeholder: "Ingresa tu contraseña...",
        value: "",
    },
}

export default meta
type Story = StoryObj<typeof SecretField>

function ControlledSecretField({ id, ...args }: React.ComponentProps<typeof SecretField>) {
    const [value, setValue] = React.useState(args.value)
    return <SecretField {...args} value={value} onChange={setValue} id={id} />
}

export const Default: Story = {
    render: (args) => <ControlledSecretField {...args} id="demo-secret" />
}

export const WithValue: Story = {
    args: { value: "super-secret-password-123" },
    render: (args) => <ControlledSecretField {...args} id="demo-secret-filled" />
}
