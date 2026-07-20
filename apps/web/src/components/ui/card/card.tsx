import { cva, VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn, defineStyleAnatomy } from "../core/styling"

/* -------------------------------------------------------------------------------------------------
 * Anatomy
 * -----------------------------------------------------------------------------------------------*/

export const CardAnatomy = defineStyleAnatomy({
    root: cva([
        "UI-Card__root bg-surface border border-outline-variant rounded-container shadow-elevation-1 transition-all duration-base ease-standard",
    ], {
        variants: {
            variant: {
                elevated: "shadow-elevation-2 bg-surface-container",
                outlined: "border-2 border-outline bg-transparent shadow-none hover:bg-surface-container-low",
                filled: "bg-surface-container-highest border-none shadow-none hover:bg-surface-container-high",
                tonal: "bg-secondary-container border-none shadow-none",
            },
            interactive: {
                true: "hover:shadow-elevation-2 hover:-translate-y-0.5 cursor-pointer",
                false: "",
            },
            padded: {
                true: "p-6",
                false: "",
            },
        },
        defaultVariants: {
            variant: "elevated",
            interactive: true,
            padded: false,
        },
    }),
    header: cva([
        "UI-Card__header",
        "flex flex-col space-y-1.5 p-6 pt-6 pb-2",
    ]),
    title: cva([
        "UI-Card__title",
        "text-xl font-semibold leading-tight tracking-tight",
    ]),
    description: cva([
        "UI-Card__description",
        "text-sm text-on-surface-variant",
    ]),
    content: cva([
        "UI-Card__content",
        "p-6 pt-0",
    ]),
    footer: cva([
        "UI-Card__footer",
        "flex items-center p-6 pt-0 gap-3",
    ]),
})

/* -------------------------------------------------------------------------------------------------
 * Card
 * -----------------------------------------------------------------------------------------------*/

export type CardProps = React.ComponentPropsWithoutRef<"div"> & VariantProps<typeof CardAnatomy.root>

export const Card = React.forwardRef<HTMLDivElement, CardProps>((props, ref) => {
    const { className, variant, interactive, padded, ...rest } = props
    return (
        <div
            ref={ref}
            className={cn(CardAnatomy.root({ variant, interactive, padded }), className)}
            {...rest}
        />
    )
})
Card.displayName = "Card"

/* -------------------------------------------------------------------------------------------------
 * CardHeader
 * -----------------------------------------------------------------------------------------------*/

export type CardHeaderProps = React.ComponentPropsWithoutRef<"div">

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>((props, ref) => {
    const { className, ...rest } = props
    return (
        <div
            ref={ref}
            className={cn(CardAnatomy.header(), className)}
            {...rest}
        />
    )
})
CardHeader.displayName = "CardHeader"

/* -------------------------------------------------------------------------------------------------
 * CardTitle
 * -----------------------------------------------------------------------------------------------*/

export type CardTitleProps = React.ComponentPropsWithoutRef<"h3">

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>((props, ref) => {
    const { className, ...rest } = props
    return (
        <h3
            ref={ref}
            className={cn(CardAnatomy.title(), className)}
            {...rest}
        />
    )
})
CardTitle.displayName = "CardTitle"

/* -------------------------------------------------------------------------------------------------
 * CardDescription
 * -----------------------------------------------------------------------------------------------*/

export type CardDescriptionProps = React.ComponentPropsWithoutRef<"p">

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>((props, ref) => {
    const { className, ...rest } = props
    return (
        <p
            ref={ref}
            className={cn(CardAnatomy.description(), className)}
            {...rest}
        />
    )
})
CardDescription.displayName = "CardDescription"

/* -------------------------------------------------------------------------------------------------
 * CardContent
 * -----------------------------------------------------------------------------------------------*/

export type CardContentProps = React.ComponentPropsWithoutRef<"div">

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>((props, ref) => {
    const { className, ...rest } = props
    return (
        <div
            ref={ref}
            className={cn(CardAnatomy.content(), className)}
            {...rest}
        />
    )
})
CardContent.displayName = "CardContent"

/* -------------------------------------------------------------------------------------------------
 * CardFooter
 * -----------------------------------------------------------------------------------------------*/

export type CardFooterProps = React.ComponentPropsWithoutRef<"div">

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>((props, ref) => {
    const { className, ...rest } = props
    return (
        <div
            ref={ref}
            className={cn(CardAnatomy.footer(), className)}
            {...rest}
        />
    )
})
CardFooter.displayName = "CardFooter"