import { cva, VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn, ComponentAnatomy, defineStyleAnatomy } from "../core/styling"

/* -------------------------------------------------------------------------------------------------
 * Anatomy
 * -----------------------------------------------------------------------------------------------*/

export const ButtonAnatomy = defineStyleAnatomy({
    root: cva([
        "UI-Button_root",
        "shadow-sm whitespace-nowrap font-medium transition-colors",
        "inline-flex items-center text-white transition-all ease-in-out duration-150 active:scale-[0.98] text-center text-sm justify-center",
        "focus-visible:outline-none focus-visible:ring-2 ring-primary ring-offset-background ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
    ], {
        variants: {
            intent: {
                "primary": "bg-primary text-primary-foreground hover:bg-primary/90",
                "primary-outline": "text-primary border border-primary/50 bg-transparent hover:bg-primary/10 active:bg-primary/20",
                "primary-subtle": "text-primary border border-transparent bg-primary/10 hover:bg-primary/20 active:bg-primary/30",
                "primary-glass": "text-primary-foreground border border-white/10 bg-black/40 backdrop-blur-md hover:bg-white/10 hover:border-white/30",
                "primary-link": "shadow-none text-primary border-transparent bg-transparent hover:underline",
                "primary-basic": "shadow-none text-primary border-transparent bg-transparent hover:bg-primary/10 active:bg-primary/20",

                "warning": "text-primary-foreground bg-orange-500 hover:bg-orange-600 active:bg-orange-700",
                "warning-outline": "text-orange-500 border border-orange-500/50 bg-transparent hover:bg-orange-500/10",
                "warning-subtle": "text-orange-400 border border-transparent bg-orange-500/10 hover:bg-orange-500/20",
                "warning-glass": "text-orange-400 border border-orange-500/20 bg-orange-500/10 backdrop-blur-md hover:bg-orange-500/20",
                "warning-link": "shadow-none text-orange-400 border-transparent bg-transparent hover:underline",
                "warning-basic": "shadow-none text-orange-400 border-transparent bg-transparent hover:bg-orange-500/10",

                "success": "text-primary-foreground bg-green-500 hover:bg-green-600 active:bg-green-700",
                "success-outline": "text-green-500 border border-green-500/50 bg-transparent hover:bg-green-500/10",
                "success-subtle": "text-green-400 border border-transparent bg-green-500/10 hover:bg-green-500/20",
                "success-glass": "text-green-400 border border-green-500/20 bg-green-500/10 backdrop-blur-md hover:bg-green-500/20",
                "success-link": "shadow-none text-green-400 border-transparent bg-transparent hover:underline",
                "success-basic": "shadow-none text-green-400 border-transparent bg-transparent hover:bg-green-500/10",

                "alert": "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                "alert-outline": "text-destructive border border-destructive/50 bg-transparent hover:bg-destructive/10",
                "alert-subtle": "text-destructive border border-transparent bg-destructive/10 hover:bg-destructive/20",
                "alert-glass": "text-destructive border border-destructive/20 bg-destructive/10 backdrop-blur-md hover:bg-destructive/20",
                "alert-link": "shadow-none text-destructive border-transparent bg-transparent hover:underline",
                "alert-basic": "shadow-none text-destructive border-transparent bg-transparent hover:bg-destructive/10",

                "gray": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                "gray-outline": "text-muted-foreground border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
                "gray-subtle": "text-muted-foreground border border-transparent bg-muted hover:bg-muted/80",
                "gray-glass": "text-muted-foreground border border-border bg-black/40 backdrop-blur-xl hover:bg-white/10",
                "gray-link": "shadow-none text-muted-foreground border-transparent bg-transparent hover:underline",
                "gray-basic": "shadow-none text-muted-foreground border-transparent bg-transparent hover:bg-accent hover:text-accent-foreground",

                "white": "text-black bg-white hover:bg-gray-200 active:bg-gray-300",
                "white-outline": "text-white border border-white/20 bg-transparent hover:bg-white/10",
                "white-subtle": "text-white border border-transparent bg-white/10 hover:bg-white/20",
                "white-glass": "text-white border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10",
                "white-basic": "shadow-none text-white border-transparent bg-transparent hover:bg-white/10",
            },
            rounded: {
                true: "rounded-full",
                false: "rounded-md", // Default to slightly rounded instead of lg if explicitly false
            },
            contentWidth: {
                true: "w-fit",
                false: null,
            },
            size: {
                xs: "text-sm h-12 min-w-12 px-2 md:min-h-0 md:min-w-0 md:h-6 md:w-auto", // 48px touch target minimum for mobile
                sm: "text-sm h-12 min-w-12 px-3 md:min-h-0 md:min-w-0 md:h-8 md:w-auto",
                md: "text-sm h-12 min-w-12 px-4 md:min-h-0 md:min-w-0 md:h-10 md:w-auto",
                lg: "text-lg h-14 min-w-14 px-6 md:h-12 md:px-6 md:w-auto",
                xl: "text-2xl h-16 min-w-16 px-8 md:h-14 md:px-8",
            },
        },
        defaultVariants: {
            intent: "primary",
            size: "md",
            rounded: true, // Make pill buttons the default
        },
    }),
    icon: cva([
        "UI-Button__icon",
        "inline-flex self-center flex-shrink-0",
    ]),
})

/* -------------------------------------------------------------------------------------------------
 * Button
 * -----------------------------------------------------------------------------------------------*/


export type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
    VariantProps<typeof ButtonAnatomy.root> &
    ComponentAnatomy<typeof ButtonAnatomy> & {
        loading?: boolean,
        leftIcon?: React.ReactNode
        rightIcon?: React.ReactNode
        iconSpacing?: React.CSSProperties["marginInline"]
        hideTextOnSmallScreen?: boolean
    }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {

    const {
        children,
        size,
        className,
        rounded = false,
        contentWidth = false,
        intent,
        leftIcon,
        rightIcon,
        iconSpacing = "0.5rem",
        loading,
        iconClass,
        disabled,
        hideTextOnSmallScreen,
        ...rest
    } = props

    return (
        <button
            type="button"
            className={cn(
                ButtonAnatomy.root({
                    size,
                    intent,
                    rounded,
                    contentWidth,
                }),
                className,
            )}
            disabled={disabled || loading}
            aria-disabled={disabled}
            {...rest}
            ref={ref}
        >
            {loading ? (
                <>
                    <svg
                        width="15"
                        height="15"
                        fill="currentColor"
                        className="animate-spin"
                        viewBox="0 0 1792 1792"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ marginInlineEnd: !hideTextOnSmallScreen ? iconSpacing : 0 }}
                    >
                        <path
                            d="M526 1394q0 53-37.5 90.5t-90.5 37.5q-52 0-90-38t-38-90q0-53 37.5-90.5t90.5-37.5 90.5 37.5 37.5 90.5zm498 206q0 53-37.5 90.5t-90.5 37.5-90.5-37.5-37.5-90.5 37.5-90.5 90.5-37.5 90.5 37.5 37.5 90.5zm-704-704q0 53-37.5 90.5t-90.5 37.5-90.5-37.5-37.5-90.5 37.5-90.5 90.5-37.5 90.5 37.5 37.5 90.5zm1202 498q0 52-38 90t-90 38q-53 0-90.5-37.5t-37.5-90.5 37.5-90.5 90.5-37.5 90.5 37.5 37.5 90.5zm-964-996q0 66-47 113t-113 47-113-47-47-113 47-113 113-47 113 47 47 113zm1170 498q0 53-37.5 90.5t-90.5 37.5-90.5-37.5-37.5-90.5 37.5-90.5 90.5-37.5 90.5 37.5 37.5 90.5zm-640-704q0 80-56 136t-136 56-136-56-56-136 56-136 136-56 136 56 56 136zm530 206q0 93-66 158.5t-158 65.5q-93 0-158.5-65.5t-65.5-158.5q0-92 65.5-158t158.5-66q92 0 158 66t66 158z"
                        >
                        </path>
                    </svg>
                    {children}
                </>
            ) : <>
                {leftIcon &&
                    <span
                        className={cn(ButtonAnatomy.icon(), iconClass)}
                        style={{ marginInlineEnd: !hideTextOnSmallScreen ? iconSpacing : 0 }}
                    >
                        {leftIcon}
                    </span>}
                <span
                    className={cn(
                        hideTextOnSmallScreen && cn(
                            "hidden",
                            leftIcon && "pl-[0.5rem]",
                            rightIcon && "pr-[0.5rem]",
                        ),
                        "md:inline-block",
                    )}
                >
                    {children}
                </span>
                {rightIcon &&
                    <span
                        className={cn(ButtonAnatomy.icon(), iconClass)}
                        style={{ marginInlineStart: !hideTextOnSmallScreen ? iconSpacing : 0 }}
                    >
                        {rightIcon}
                    </span>}
            </>}
        </button>
    )

})

Button.displayName = "Button"
