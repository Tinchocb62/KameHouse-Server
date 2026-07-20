import { Icons } from "@/components/ui/icons"
import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "./button"


const meta: Meta<typeof Button> = {
    title: "UI/Button",
    component: Button,
    tags: ["autodocs"],
    argTypes: {
        intent: {
            control: "select",
            options: [
                "primary", "secondary", "outlined", "text", "destructive", "ghost", "link",
                "primary-glass", "gray-glass",
                "brand-primary", "brand-secondary", "brand-destructive", "brand-success", "brand-magic",
                "gray", "gray-outline", "gray-subtle", "gray-basic", "gray-link",
                "white", "white-outline", "primary-basic", "primary-outline", "primary-glow",
                "alert", "alert-outline", "alert-subtle",
            ],
        },
        size: {
            control: "select",
            options: ["xs", "sm", "md", "lg", "xl", "icon", "icon-sm", "icon-lg"],
        },
        loading: { control: "boolean" },
        disabled: { control: "boolean" },
        hideTextOnSmallScreen: { control: "boolean" },
    },
    args: {
        children: "Button",
        intent: "primary",
        size: "md",
    },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
    args: {
        children: "Primary Button",
        intent: "primary",
    },
}

export const Secondary: Story = {
    args: {
        children: "Secondary Button",
        intent: "secondary",
    },
}

export const Outlined: Story = {
    args: {
        children: "Outlined Button",
        intent: "outlined",
    },
}

export const Text: Story = {
    args: {
        children: "Text Button",
        intent: "text",
    },
}

export const Ghost: Story = {
    args: {
        children: "Ghost Button",
        intent: "ghost",
    },
}

export const Glass: Story = {
    args: {
        children: "Glass Effect",
        intent: "primary-glass",
    },
}

export const GrayGlass: Story = {
    args: {
        children: "Gray Glass",
        intent: "gray-glass",
    },
}

export const WithIcons: Story = {
    args: {
        children: "Send Email",
        leftIcon: <Icons.ui.mail size={16} />,
        intent: "primary",
    },
}

export const OnlyIcon: Story = {
    args: {
        children: null,
        leftIcon: <Icons.navigation.search size={16} />,
        intent: "secondary",
        size: "icon",
    },
}

export const Loading: Story = {
    args: {
        children: "Processing",
        loading: true,
        intent: "primary",
    },
}

export const Danger: Story = {
    args: {
        children: "Delete Item",
        intent: "destructive",
    },
}

export const Sizes: Story = {
    render: (args) => (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <Button {...args} size="xs">XS Button</Button>
                <Button {...args} size="sm">SM Button</Button>
                <Button {...args} size="md">MD Button</Button>
                <Button {...args} size="lg">LG Button</Button>
                <Button {...args} size="xl">XL Button</Button>
            </div>
        </div>
    ),
}