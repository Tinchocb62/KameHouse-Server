import { Icons } from "@/components/ui/icons"
import { hiddenInputStyles } from "@/components/ui/input"
import { Popover } from "@/components/ui/popover"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cva, VariantProps } from "class-variance-authority"
import * as React from "react"

import { BasicField, BasicFieldOptions, extractBasicFieldProps } from "../basic-field"
import { cn, ComponentAnatomy, defineStyleAnatomy } from "../core/styling"

/* -------------------------------------------------------------------------------------------------
 * Anatomy
 * -----------------------------------------------------------------------------------------------*/
export const SwitchAnatomy = defineStyleAnatomy({
    root: cva([
        "UI-Switch__root",
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border border-outline-variant transition-colors",
        "disabled:cursor-not-allowed data-[disabled=true]:opacity-50",
        "outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-1",
        "data-[state=unchecked]:bg-surface-container", // Unchecked
        "data-[state=unchecked]:hover:bg-surface-container-high", // Unchecked hover
        "data-[state=checked]:bg-brand-accent", // Checked
        "data-[error=true]:border-brand-destructive", // Checked
    ], {
        variants: {
            size: {
                sm: "h-5 w-9",
                md: "h-6 w-11",
                lg: "h-7 w-14",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }),
    container: cva([
        "UI-Switch__container",
        "inline-flex gap-2 items-center",
    ], {
        variants: {
            side: {
                left: "",
                right: "w-full flex-row-reverse",
            },
        },
        defaultVariants: {
            side: "left",
        },
    }),
    thumb: cva([
        "UI-Switch__thumb",
        "pointer-events-none block rounded-full data-[state=checked]:bg-white shadow-lg ring-0 transition-transform",
        "data-[state=unchecked]:translate-x-1 data-[state=unchecked]:bg-white/50",
    ], {
        variants: {
            size: {
                sm: "h-3 w-4 data-[state=checked]:translate-x-[0.95rem]",
                md: "h-4 w-5 data-[state=checked]:translate-x-[1.2rem]",
                lg: "h-5 w-5 data-[state=checked]:translate-x-[1.9rem]",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }),
    label: cva([
        "UI-Switch__label",
        "relative font-normal",
        "data-[disabled=true]:text-on-surface-variant/50 cursor-pointer user-select-none select-none",
    ]),
})

/* -------------------------------------------------------------------------------------------------
 * Switch
 * -----------------------------------------------------------------------------------------------*/

export type SwitchProps = BasicFieldOptions &
    ComponentAnatomy<typeof SwitchAnatomy> &
    VariantProps<typeof SwitchAnatomy.root> &
    VariantProps<typeof SwitchAnatomy.container> &
    Omit<React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
        "value" | "checked" | "disabled" | "required" | "defaultValue" | "defaultChecked" | "onCheckedChange"> & {
    size?: "xs" | "sm" | "md" | "lg" | "xl"
    side?: "left" | "right"
    value?: boolean
    onValueChange?: (value: boolean) => void
    defaultValue?: boolean
    inputRef?: React.Ref<HTMLInputElement>
    className?: string
    moreHelp?: React.ReactNode
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>((props, ref) => {

    const [{
        size,
        value: controlledValue,
        className,
        onValueChange,
        labelClass,
        containerClass,
        thumbClass,
        defaultValue,
        inputRef,
        side,
        moreHelp,
        ...rest
    }, { label, ...basicFieldProps }] = extractBasicFieldProps(props, React.useId())

    const isFirst = React.useRef(true)

    const buttonRef = React.useRef<HTMLButtonElement>(null)

    const [_value, _setValue] = React.useState<boolean | undefined>(controlledValue ?? defaultValue ?? false)

    const handleOnValueChange = (value: boolean) => {
        _setValue(value)
        onValueChange?.(value)
    }

    React.useEffect(() => {
        if (!defaultValue || !isFirst.current) {
            _setValue(controlledValue)
        }
        isFirst.current = false
    }, [controlledValue, defaultValue])

    const setRefs = React.useCallback((node: HTMLButtonElement | null) => {
        (buttonRef as React.MutableRefObject<HTMLButtonElement | null>).current = node
        if (typeof ref === "function") {
            ref(node)
        } else if (ref) {
            (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
        }
    }, [ref])

    return (
        <BasicField
            {...basicFieldProps}
            id={basicFieldProps.id}
            fieldClass={cn(
                "w-fit",
                side === "right" && "w-full group/switch transition-all duration-base hover:bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_50%,transparent)] rounded-[--radius] p-2 w-[calc(100%_+_1rem)] -ml-2 border border-transparent hover:border-outline-variant",
                basicFieldProps.fieldClass,
            )}
            fieldHelpTextClass={cn("")}
        >
            <div className={cn(SwitchAnatomy.container({ side }), containerClass)}>
                <SwitchPrimitive.Root
                    ref={setRefs}
                    id={basicFieldProps.id}
                    className={cn(SwitchAnatomy.root({ size }), className)}
                    disabled={basicFieldProps.disabled || basicFieldProps.readonly}
                    data-disabled={basicFieldProps.disabled}
                    data-readonly={basicFieldProps.readonly}
                    data-error={!!basicFieldProps.error}
                    checked={_value}
                    onCheckedChange={handleOnValueChange}
                    defaultChecked={defaultValue}
                    {...rest}
                >
                    <SwitchPrimitive.Thumb className={cn(SwitchAnatomy.thumb({ size }), thumbClass)} />
                </SwitchPrimitive.Root>
                <div className="flex flex-1"></div>
                {!!label && <div className="flex items-center gap-1">
                    <label
                        className={cn(
                            SwitchAnatomy.label(),
                            labelClass,
                            side === "right" && "font-semibold transition-transform __group-hover/switch:-translate-y-0.5",
                        )}
                        htmlFor={basicFieldProps.id}
                        data-disabled={basicFieldProps.disabled}
                    >
                        {label}
                    </label>
                    {moreHelp && <Popover
                        className="text-sm"
                        trigger={<span><Icons.ui.alertCircle className="transition-opacity opacity-45 hover:opacity-90" /></span>}
                    >
                        {moreHelp}
                    </Popover>}
                </div>}

                <input
                    ref={inputRef}
                    type="checkbox"
                    name={basicFieldProps.name}
                    className={hiddenInputStyles}
                    value={_value ? "on" : "off"}
                    checked={basicFieldProps.required ? _value : true}
                    aria-hidden="true"
                    required={controlledValue === undefined && basicFieldProps.required}
                    tabIndex={-1}
                    onChange={() => {}}
                    onFocusCapture={() => buttonRef.current?.focus()}
                />
            </div>
        </BasicField>
    )

})

Switch.displayName = "Switch"
