import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { cva, VariantProps } from "class-variance-authority"
import * as React from "react"
import { BasicField, BasicFieldOptions, extractBasicFieldProps } from "../basic-field"
import { cn, ComponentAnatomy, defineStyleAnatomy } from "../core/styling"
import { hiddenInputStyles } from "../input"

/* -------------------------------------------------------------------------------------------------
 * Anatomy
 * -----------------------------------------------------------------------------------------------*/

export const RadioGroupAnatomy = defineStyleAnatomy({
    root: cva([
        "UI-RadioGroup__root",
    ]),
    item: cva([
        "UI-RadioGroup__item",
        "block aspect-square rounded-full border text-brand-accent ring-offset-1 ring-offset-[hsl(var(--background))]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed data-[disabled=true]:opacity-50 data-[readonly=true]:cursor-not-allowed",
        "border-outline-variant",
        "data-[state=unchecked]:bg-surface-container", // Unchecked
        "data-[state=unchecked]:hover:bg-surface-container-high", // Unchecked hover
        "data-[state=checked]:bg-brand-accent data-[state=checked]:border-transparent", // Checked
        "data-[error=true]:border-brand-destructive data-[error=true]:data-[state=checked]:border-brand-destructive", // Error
    ], {
        variants: {
            size: {
                sm: "h-4 w-4",
                md: "h-5 w-5",
                lg: "h-6 w-6",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }),
    itemIndicator: cva([
        "UI-RadioGroup__itemIndicator",
        "flex items-center justify-center",
    ]),
    itemLabel: cva([
        "UI-Checkbox_itemLabel",
        "font-normal block",
        "data-[disabled=true]:opacity-50",
    ], {
        variants: {
            size: {
                md: "text-md",
                lg: "text-lg",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }),
    itemContainer: cva([
        "UI-RadioGroup__itemContainer",
        "flex gap-2 items-center relative",
    ]),
    itemCheckIcon: cva([
        "UI-RadioGroup__itemCheckIcon",
        "text-white",
    ], {
        variants: {
            size: {
                sm: "h-4 w-4",
                md: "h-4 w-4",
                lg: "h-5 w-5",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }),
})

/* -------------------------------------------------------------------------------------------------
 * RadioGroup
 * -----------------------------------------------------------------------------------------------*/

export type RadioGroupOption = { value: string, label?: React.ReactNode, disabled?: boolean, readonly?: boolean }

export type RadioGroupProps = BasicFieldOptions &
    ComponentAnatomy<typeof RadioGroupAnatomy> &
    VariantProps<typeof RadioGroupAnatomy.item> & {
    size?: "xs" | "sm" | "md" | "lg" | "xl"
    value?: string | undefined
    defaultValue?: string | undefined
    onValueChange?: (value: string) => void
    options: RadioGroupOption[]
    /**
     * Replaces the default check icon
     */
    itemCheckIcon?: React.ReactNode
    /**
     * Ref to the input element
     */
    inputRef?: React.Ref<HTMLInputElement>
    /**
     * Stack div class
     */
    stackClass?: string
    /**
     * Item div class
     */
    className?: string
}

export const RadioGroup = React.forwardRef<HTMLButtonElement, RadioGroupProps>((props, ref) => {
    const id = React.useId()
    const [{
        size,
        className,
        stackClass,
        value: controlledValue,
        onValueChange,
        options,
        inputRef,
        defaultValue,
        /**/
        itemClass,
        itemIndicatorClass,
        itemLabelClass,
        itemContainerClass,
        itemCheckIcon,
        itemCheckIconClass,
    }, basicFieldProps] = extractBasicFieldProps<RadioGroupProps>(props, id)

    const isFirst = React.useRef(true)

    const buttonRef = React.useRef<HTMLButtonElement | null>(null)

    const mergedRef = React.useCallback(
        (node: HTMLButtonElement | null) => {
            buttonRef.current = node
            if (typeof ref === "function") {
                ref(node)
            } else if (ref && typeof ref === "object") {
                (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
            }
        },
        [ref],
    )

    const [_value, _setValue] = React.useState<string | undefined>(controlledValue ?? defaultValue)

    const handleOnValueChange = (value: string) => {
        _setValue(value)
        onValueChange?.(value)
    }

    React.useEffect(() => {
        if (!defaultValue || !isFirst.current) {
            _setValue(controlledValue)
        }
        isFirst.current = false
    }, [controlledValue, defaultValue])

    return (
        <BasicField{...basicFieldProps}>
            <RadioGroupPrimitive.Root
                value={_value}
                onValueChange={handleOnValueChange}
                defaultValue={defaultValue}
                className={cn(RadioGroupAnatomy.root(), className)}
                disabled={basicFieldProps.disabled || basicFieldProps.readonly}
                data-error={!!basicFieldProps.error}
                data-disabled={basicFieldProps.disabled}
                data-readonly={basicFieldProps.readonly}
                aria-readonly={basicFieldProps.readonly}
                loop
            >
                <div className={cn("UI-RadioGroup__stack space-y-1", stackClass)}>

                    {options.map(option => {
                        return (
                            <label
                                key={option.value}
                                className={cn(RadioGroupAnatomy.itemContainer(), itemContainerClass)}
                                htmlFor={id + option.value}
                                data-error={!!basicFieldProps.error}
                                data-disabled={basicFieldProps.disabled || option.disabled}
                                data-readonly={basicFieldProps.readonly || option.readonly}
                                data-state={_value === option.value ? "checked" : "unchecked"}
                            >
                                <RadioGroupPrimitive.Item
                                    ref={mergedRef}
                                    id={id + option.value}
                                    key={option.value}
                                    value={option.value}
                                    disabled={basicFieldProps.disabled || basicFieldProps.readonly || option.disabled || option.readonly}
                                    data-error={!!basicFieldProps.error}
                                    data-disabled={basicFieldProps.disabled || option.disabled}
                                    data-readonly={basicFieldProps.readonly || option.readonly}
                                    className={cn(RadioGroupAnatomy.item({ size }), itemClass)}
                                >
                                    <RadioGroupPrimitive.Indicator
                                        className={cn(
                                            RadioGroupAnatomy.itemIndicator(),
                                            itemIndicatorClass,
                                        )}
                                        data-error={!!basicFieldProps.error}
                                        data-disabled={basicFieldProps.disabled || option.disabled}
                                        data-readonly={basicFieldProps.readonly || option.readonly}
                                    >
                                        {itemCheckIcon ? itemCheckIcon : <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            stroke="currentColor"
                                            fill="currentColor"
                                            className={cn(RadioGroupAnatomy.itemCheckIcon({ size }), itemCheckIconClass)}
                                        >
                                            <path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"></path>
                                        </svg>}
                                    </RadioGroupPrimitive.Indicator>
                                </RadioGroupPrimitive.Item>
                                <label
                                    className={cn(RadioGroupAnatomy.itemLabel(), itemLabelClass)}
                                    htmlFor={id + option.value}
                                    aria-disabled={option.disabled}
                                    data-error={!!basicFieldProps.error}
                                    data-disabled={basicFieldProps.disabled || option.disabled || option.disabled}
                                    data-readonly={basicFieldProps.readonly || option.readonly}
                                    data-state={_value === option.value ? "checked" : "unchecked"}
                                >
                                    {option.label ?? option.value}
                                </label>
                            </label>
                        )
                    })}
                </div>
            </RadioGroupPrimitive.Root>

            <input
                ref={inputRef}
                type="radio"
                name={basicFieldProps.name}
                className={hiddenInputStyles}
                value={_value ?? ""}
                checked={!!_value}
                aria-hidden="true"
                required={basicFieldProps.required}
                tabIndex={-1}
                onChange={() => {}}
                onFocusCapture={() => buttonRef.current?.focus()}
            />
        </BasicField>
    )
})

RadioGroup.displayName = "RadioGroup"
