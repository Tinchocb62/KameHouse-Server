import * as React from "react"
import { cn } from "../core/styling"

export interface PageHeaderProps {
    title?: React.ReactNode
    breadcrumbs?: React.ReactNode
    actions?: React.ReactNode
    className?: string
}

const PageHeaderBase = React.forwardRef<HTMLDivElement, PageHeaderProps>((props, ref) => {
    const { title, breadcrumbs, actions, className, ...rest } = props

    return (
        <header
            ref={ref}
            className={cn(
                "flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border",
                className
            )}
            {...rest}
        >
            <div className="flex items-center">
                {breadcrumbs ? (
                    breadcrumbs
                ) : title ? (
                    <h1 className="text-lg font-semibold text-white">{title}</h1>
                ) : null}
            </div>

            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </header>
    )
})

PageHeaderBase.displayName = "PageHeader"

export const PageHeader = React.memo(PageHeaderBase)
