import React from "react"
import { Icons } from "@/components/ui/icons"

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
            <label htmlFor={id} className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider font-mono">{label}</label>
            <div className="relative flex items-center">
                <input
                    id={id}
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    // text-base en mobile: iOS Safari hace zoom al enfocar cualquier
                    // input por debajo de 16px. El tamaño de desktop no cambia.
                    className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.08] border border-white/10 hover:border-white/20 focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/30 rounded-xl px-4 py-2.5 pr-11 text-base md:text-xs text-on-surface placeholder:text-on-surface-variant/40 font-mono focus:outline-none transition-all shadow-sm"
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3.5 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                    {show ? <Icons.ui.eyeOff className="w-4 h-4" /> : <Icons.ui.eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    )
}
