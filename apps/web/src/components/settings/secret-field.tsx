import React from "react"
import { EyeIcon, EyeOffIcon } from "@/routes/settings/components"

export interface SecretFieldProps {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    id?: string
}

export function SecretField({ label, value, onChange, placeholder, id }: SecretFieldProps) {
    const [show, setShow] = React.useState(false)
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">{label}</label>
            <div className="relative flex items-center">
                <input
                    id={id}
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 pr-11 text-xs text-on-surface-variant font-mono focus:outline-none focus:border-brand-accent/50 focus:shadow-[0_0_20px_var(--glow-primary)] transition-all"
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3.5 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                    {show ? <EyeOffIcon /> : <EyeIcon />}
                </button>
            </div>
        </div>
    )
}
