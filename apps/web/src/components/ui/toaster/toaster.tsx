import { cva } from "class-variance-authority"
import * as React from "react"
import { Toaster as Sonner } from "sonner"
import { cn, defineStyleAnatomy } from "../core/styling"

/* -------------------------------------------------------------------------------------------------
 * Anatomy
 * -----------------------------------------------------------------------------------------------*/

export const ToasterAnatomy = defineStyleAnatomy({
    toaster: cva(["group toaster z-[150]"]),
    toast: cva([
        "group/toast",
        "select-none cursor-default",
        "group-[.toaster]:py-4 group-[.toaster]:px-5 group-[.toaster]:gap-3",
        "group-[.toaster]:text-sm group-[.toaster]:font-medium",
        "group-[.toaster]:rounded-corner-lg group-[.toaster]:border group-[.toaster]:shadow-elevation-3",
        "group-[.toaster]:bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_90%,transparent)] group-[.toaster]:backdrop-blur-[var(--blur-overlay-sm)] group-[.toaster]:border-outline-variant",
        "group-[.toaster]:text-on-surface",
        "group-[.toaster]:transition-all group-[.toaster]:duration-base",
        // Success
        "group-[.toaster]:data-[type=success]:bg-success-bg group-[.toaster]:data-[type=success]:border-success-border group-[.toaster]:data-[type=success]:text-success-bg",
        // Warning
        "group-[.toaster]:data-[type=warning]:bg-warning-bg group-[.toaster]:data-[type=warning]:border-warning-border group-[.toaster]:data-[type=warning]:text-warning-bg",
        // Error
        "group-[.toaster]:data-[type=error]:bg-error-bg group-[.toaster]:data-[type=error]:border-error-border group-[.toaster]:data-[type=error]:text-error-bg",
        // Info
        "group-[.toaster]:data-[type=info]:bg-brand-accent/15 group-[.toaster]:data-[type=info]:border-brand-accent/30 group-[.toaster]:data-[type=info]:text-brand-accent",
    ]),
    description: cva([
        "group/toast:text-xs group/toast:font-normal group/toast:mt-1",
        "group/toast:opacity-80",
        "group/toast:text-on-surface-variant",
        "cursor-default",
    ]),
    actionButton: cva([
        "group/toast:bg-surface-variant group/toast:text-on-surface-variant",
        "group/toast:rounded-full group/toast:px-3 group/toast:py-1.5",
        "group/toast:text-xs group/toast:font-medium",
        "group/toast:transition-colors group/toast:hover:bg-surface-container-high",
        "group/toast:border group/toast:border-outline-variant",
    ]),
    cancelButton: cva([
        "group/toast:bg-transparent group/toast:text-on-surface-variant",
        "group/toast:rounded-full group/toast:px-3 group/toast:py-1.5",
        "group/toast:text-xs group/toast:font-medium",
        "group/toast:transition-colors group/toast:hover:bg-surface-variant",
    ]),
})

/* -------------------------------------------------------------------------------------------------
 * Toaster
 * -----------------------------------------------------------------------------------------------*/

export type ToasterProps = React.ComponentProps<typeof Sonner>

export const Toaster = ({ position = "top-center", ...props }: ToasterProps) => {

    const allProps = React.useMemo(() => ({
        position,
        visibleToasts: 4,
        className: cn(ToasterAnatomy.toaster()),
        toastOptions: {
            classNames: {
                toast: cn(ToasterAnatomy.toast()),
                description: cn(ToasterAnatomy.description()),
                actionButton: cn(ToasterAnatomy.actionButton()),
                cancelButton: cn(ToasterAnatomy.cancelButton()),
            },
        },
        ...props,
    } as ToasterProps), [position, props])

    return (
        <>
            <Sonner theme="dark" {...allProps} />
        </>
    )
}

Toaster.displayName = "Toaster"