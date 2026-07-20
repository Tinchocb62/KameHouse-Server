import { cva, VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn, defineStyleAnatomy } from "../core/styling"

/* -------------------------------------------------------------------------------------------------
 * Anatomy
 * -----------------------------------------------------------------------------------------------*/

export const ButtonAnatomy = defineStyleAnatomy({
    root: cva([
        "UI-Button_root",
        "shadow-sm whitespace-nowrap font-medium transition-colors",
        "inline-flex items-center transition-all ease-standard duration-base active:scale-[0.98] text-center text-sm justify-center",
        "focus-visible:outline-none focus-visible:ring-2 ring-brand-accent ring-offset-background ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
    ], {
        variants: {
            intent: {
                /* ─── MD3 Filled (Primary) ──────────────────────────────────────── */
                "primary": "bg-brand-accent text-primary-foreground hover:bg-brand-accent/90 active:bg-brand-accent shadow-elevation-1",

                /* ─── MD3 Tonal (Secondary) ─────────────────────────────────────── */
                "secondary": "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90 active:bg-secondary-container shadow-elevation-1",

                /* ─── MD3 Outlined ──────────────────────────────────────────────── */
                "outlined": "border border-outline bg-transparent text-brand-accent hover:bg-brand-accent/10 active:bg-brand-accent/10 shadow-none",

                /* ─── MD3 Text (Tertiary) ───────────────────────────────────────── */
                "text": "bg-transparent text-brand-accent hover:bg-brand-accent/10 active:bg-brand-accent/10 shadow-none",

                /* ─── Legacy / Special ──────────────────────────────────────────── */
                "destructive": "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive shadow-elevation-1",
                "ghost": "bg-transparent text-muted-foreground hover:bg-accent active:bg-accent/50 shadow-none",
                "link": "bg-transparent text-brand-accent underline-offset-4 hover:underline shadow-none",

                /* ─── Glass variants (DEPRECATED - para migración gradual) ───────── */
                "primary-glass": "text-white border border-white/10 bg-white/5 backdrop-blur-[var(--blur-overlay-sm)] hover:bg-white/10 shadow-elevation-1",
                "gray-glass": "text-zinc-400 border border-zinc-800 bg-black/40 backdrop-blur-[var(--blur-overlay-md)] hover:bg-white/10 shadow-elevation-1",

                /* Brand variants */
                "brand-primary": "bg-brand-accent text-on-primary hover:bg-brand-accent/90 active:bg-brand-accent shadow-[0_0_20px_var(--glow-primary)]",
                "brand-secondary": "bg-brand-secondary text-on-secondary hover:bg-brand-secondary/90 active:bg-brand-secondary shadow-[0_0_20px_var(--glow-secondary)]",
                "brand-destructive": "bg-brand-destructive text-white hover:bg-brand-destructive/90 active:bg-brand-destructive shadow-[0_0_20px_var(--glow-destructive)]",
                "brand-success": "bg-brand-success text-white hover:bg-brand-success/90 active:bg-brand-success shadow-[0_0_20px_var(--glow-success)]",
                "brand-magic": "bg-brand-magic text-white hover:bg-brand-magic/90 active:bg-brand-magic shadow-[0_0_20px_var(--glow-magic)]",

                /* Legacy variants (compat) */
                "gray": "bg-zinc-800 text-white hover:bg-zinc-700",
                "gray-outline": "text-zinc-400 border border-zinc-800 bg-transparent hover:bg-zinc-900 hover:text-white",
                "gray-subtle": "text-zinc-400 border border-transparent bg-zinc-900 hover:bg-zinc-800",
                "gray-basic": "shadow-none text-zinc-400 border-transparent bg-transparent hover:bg-zinc-900 hover:text-white",
                "gray-link": "shadow-none text-zinc-400 border-transparent bg-transparent hover:underline",
                "white": "text-black bg-white hover:bg-zinc-200 active:bg-zinc-300",
                "white-outline": "text-white border border-white bg-transparent hover:bg-white/10",
                "primary-basic": "shadow-none text-white border-transparent bg-transparent hover:bg-white/10 active:bg-white/20",
                "primary-outline": "text-white border border-white bg-transparent hover:bg-white/10 active:bg-white/20",
                "primary-glow": "bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.3)]",
                "alert": "bg-status-error text-white hover:brightness-110",
                "alert-outline": "text-status-error border border-status-error bg-transparent hover:bg-status-error/10",
                "alert-subtle": "bg-status-error/10 text-status-error border border-status-error/30 hover:bg-status-error/20",
            },
            size: {
                xs: "text-label-sm h-8 px-2 uppercase font-black tracking-widest rounded-pill",
                sm: "text-label-sm h-10 px-3 uppercase font-black tracking-widest rounded-pill",
                md: "text-xs h-12 px-4 uppercase font-black tracking-widest rounded-pill",
                lg: "text-sm h-14 px-6 uppercase font-black tracking-widest rounded-pill",
                xl: "text-base h-16 px-8 uppercase font-black tracking-widest rounded-pill",
                icon: "h-10 w-10 rounded-full p-0",
                "icon-sm": "h-8 w-8 rounded-full p-0",
                "icon-lg": "h-12 w-12 rounded-full p-0",
            },
        },
        defaultVariants: {
            intent: "primary",
            size: "md",
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
    VariantProps<typeof ButtonAnatomy.root> & {
        loading?: boolean,
        leftIcon?: React.ReactNode
        rightIcon?: React.ReactNode
        iconSpacing?: React.CSSProperties["marginInline"]
        hideTextOnSmallScreen?: boolean
        iconClass?: string
    }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {

    const {
        children,
        size,
        className,
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