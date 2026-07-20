import React from "react"
import { cn } from "@/components/ui/core/styling"
import { useThemeSettings } from "@/lib/theme/theme-hooks"
import { Icons } from "@/components/ui/icons"

// ─── ScanButton ────────────────────────────────────────────────────────────────

export function ScanButton({ title, description, icon: Icon, onClick, loading, destructive }: { title: string; description: string; icon?: React.ElementType; onClick: () => void; loading?: boolean; destructive?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className={cn(
                "flex-1 flex items-center justify-between p-6 rounded-container transition-all duration-base relative overflow-hidden group/scanbtn",
                loading
                    ? (destructive ? "bg-brand-destructive/10 text-brand-destructive border border-brand-destructive/20" : "bg-brand-accent/8 border border-brand-accent/20 text-brand-accent")
                    : "bg-surface-container border border-outline-variant hover:bg-surface-container-high hover:border-outline-variant text-on-surface",
                loading && "opacity-50 cursor-not-allowed"
            )}
        >
            <div className="text-left relative z-10 flex flex-col gap-1">
                <p className="text-sm font-bold text-on-surface tracking-wide">
                    {title}
                </p>
                <p className="text-xs font-medium text-on-surface-variant opacity-70 group-hover/scanbtn:opacity-100 transition-opacity">
                    {description}
                </p>
            </div>
            <div className={cn(
                "w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-base",
                destructive
                    ? "bg-brand-destructive/15 border-brand-destructive/25 group-hover/scanbtn:bg-brand-destructive/25"
                    : "bg-brand-secondary/15 border-brand-secondary/25 group-hover/scanbtn:bg-brand-secondary/25"
            )}>
                {Icon ? (
                    <Icon
                        className={cn(
                            "w-5 h-5 transition-all duration-slower",
                            destructive ? "text-brand-destructive" : "text-on-surface/80 group-hover/scanbtn:text-on-surface",
                            loading ? "animate-spin" : "group-hover/scanbtn:scale-110"
                        )}
                    />
                ) : (
                    <Icons.ui.refresh
                        className={cn(
                            "transition-all duration-slower",
                            destructive ? "text-brand-destructive" : "text-on-surface/80 group-hover/scanbtn:text-on-surface",
                            loading ? "animate-spin" : "group-hover/scanbtn:rotate-180"
                        )}
                    />
                )}
            </div>
        </button>
    )
}

// ─── IntegrationCard ──────────────────────────────────────────────────────────

const SERVICE_COLORS: Record<string, string> = {
    TMDB: "#01B4E4",
}

export function IntegrationCard({ name, status, connected, disabled }: { name: string; status: string; connected: boolean; disabled?: boolean }) {
    const color = SERVICE_COLORS[name] || "#ffffff"

    return (
        <div className={cn(
            "p-5 rounded-container flex items-center gap-4 relative overflow-hidden group/intcard transition-all duration-base",
            disabled
                ? "opacity-40 bg-surface-container border border-outline-variant rounded-container"
                : connected
                    ? "bg-surface-container border border-outline-variant rounded-container hover:border-outline-variant"
                    : "bg-surface-container border border-outline-variant rounded-container hover:bg-surface-container-high hover:border-outline-variant"
        )}>
            {connected && (
                <div
                    className="absolute inset-0 opacity-0 group-hover/intcard:opacity-100 transition-opacity duration-slower pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at left, ${color}10, transparent 60%)` }}
                />
            )}

            <div
                className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-base group-hover/intcard:scale-105"
                style={{
                    background: `${color}15`,
                    borderColor: `${color}30`,
                    boxShadow: connected ? `0 0 24px ${color}20` : "none"
                }}
            >
                {connected
                    ? <Icons.status.wifi style={{ color }} />
                    : <Icons.status.wifiOff className="text-on-surface-variant" />
                }
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-display text-xl tracking-wider uppercase text-on-surface/90 group-hover/intcard:text-on-surface transition-colors leading-none">{name}</p>
                <p className="text-label-sm text-on-surface-variant mt-0.5">{status}</p>
            </div>

            {connected && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-success/15 border border-brand-success/25">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-success"></span>
                    </span>
                    <span className="text-badge text-brand-success">OK</span>
                </div>
            )}

            {!connected && !disabled && (
                <span className="text-badge text-on-surface-variant border border-outline-variant/50 px-2.5 py-1 rounded-full group-hover/intcard:border-outline-variant group-hover/intcard:text-on-surface transition-colors shrink-0">
                    DISPONIBLE
                </span>
            )}

            {disabled && (
                <span className="text-badge text-on-surface-variant/60 border border-outline-variant/50 px-2.5 py-1 rounded-full shrink-0">
                    PRONTO
                </span>
            )}
        </div>
    )
}

// ─── StatusCard ───────────────────────────────────────────────────────────────

export function StatusCard({ label, value, icon: Icon, hint, tone = "ok" }: { label: string; value: string; icon?: React.ElementType; hint?: string; tone?: "ok" | "off" }) {
    return (
        <div className={cn(
            "p-6 bg-surface-container border border-outline-variant rounded-container flex items-center gap-4 group/statuscard relative overflow-hidden transition-all duration-base",
            tone === "ok" ? "hover:border-brand-accent/30" : "opacity-70"
        )}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,hsl(var(--brand-accent)/0.08),transparent_70%)] opacity-0 group-hover/statuscard:opacity-100 transition-opacity duration-slow pointer-events-none" />
            {Icon && (
                <div className={cn(
                    "w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-base relative z-10 shrink-0",
                    tone === "ok" ? "bg-brand-accent/10 border-brand-accent/20 text-brand-accent group-hover/statuscard:bg-brand-accent/15" : "bg-surface-container-high border-outline-variant text-on-surface-variant"
                )}>
                    <Icon className="w-5 h-5" />
                </div>
            )}
            <div className="relative z-10 min-w-0">
                <p className="text-label-sm text-on-surface-variant mb-0.5 font-mono">{label}</p>
                <p className="text-xl font-display tracking-wider uppercase text-on-surface/95 group-hover/statuscard:text-on-surface transition-colors leading-tight">{value}</p>
                {hint && <p className="text-caption text-on-surface-variant mt-1 truncate">{hint}</p>}
            </div>
        </div>
    )
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function Section({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <div className="flex items-center gap-3 pl-1">
                    <div className="w-1 h-4 rounded-full bg-on-surface-variant/30" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant font-mono">
                        {label}
                    </h2>
                </div>
                {description && (
                    <p className="text-caption text-on-surface-variant/80 pl-5 leading-relaxed font-medium">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </section>
    )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    const ts = useThemeSettings()
    return (
        <div className={cn(
            "border border-white/[0.06] rounded-container shadow-elevation-1",
            ts.themeEnableBlurringEffects
                ? "bg-[color:color-mix(in_srgb,var(--md-sys-color-surface-container)_60%,transparent)] backdrop-blur-[var(--blur-overlay-md)] backdrop-saturate-[var(--glass-saturate)]"
                : "bg-surface-container",
            className
        )}>
            {children}
        </div>
    )
}

// ─── PathList ─────────────────────────────────────────────────────────────────

export interface PathListProps {
    label: string
    directories: string[]
    onAdd: (path: string) => void
    onRemove: (path: string) => void
    placeholder?: string
}

export function PathList({ label, directories, onAdd, onRemove, placeholder }: PathListProps) {
    const [inputValue, setInputValue] = React.useState("")

    const handleAdd = () => {
        if (inputValue.trim()) {
            onAdd(inputValue.trim())
            setInputValue("")
        }
    }

    return (
        <div className="p-6 space-y-4">
            <div className="space-y-1">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</h4>
            </div>

            {directories.length > 0 && (
                <div className="space-y-2">
                    {directories.map((dir) => (
                        <div key={dir} className="flex items-center justify-between bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5">
                            <span className="text-xs text-on-surface-variant font-mono truncate mr-4">{dir}</span>
                            <button
                                type="button"
                                onClick={() => onRemove(dir)}
                                className="text-on-surface-variant hover:text-brand-destructive transition-colors duration-base p-1 rounded-lg hover:bg-surface-container-high"
                            >
                                <Icons.ui.delete className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2.5 bg-surface-container border border-outline-variant rounded-xl pl-1 pr-1.5 py-1 focus-within:border-brand-accent/40 transition-all">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder}
                    // text-base en mobile: iOS Safari hace zoom al enfocar cualquier
                    // input por debajo de 16px. El tamaño de desktop no cambia.
                    className="flex-1 min-w-0 bg-transparent px-3 py-2 text-on-surface placeholder:text-on-surface-variant/60 text-base md:text-xs font-mono focus:outline-none"
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    className="bg-brand-accent hover:brightness-110 text-on-primary px-5 py-2.5 rounded-lg text-button-sm transition-all shrink-0 flex items-center gap-1.5 active:scale-95 shadow-elevation-2"
                >
                    <Icons.ui.plus className="w-4 h-4" />
                    AGREGAR
                </button>
            </div>
        </div>
    )
}

// ─── OsInput ─────────────────────────────────────────────────────────────────

export interface OsInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string
    description?: string
    isSecure?: boolean
    isMono?: boolean
}

export const OsInput = React.forwardRef<HTMLInputElement, OsInputProps>(({
    label,
    description,
    placeholder,
    isSecure = false,
    isMono = false,
    type = "text",
    className,
    ...props
}, ref) => {
    const [showSecure, setShowSecure] = React.useState(false)

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-outline-variant/4 last:border-0 hover:bg-surface-variant/[0.01] transition-all duration-base gap-5 group/input">
            <div className="space-y-1 flex-1 max-w-xl">
                <p className="text-sm font-semibold text-on-surface-variant group-hover/input:text-on-surface transition-colors tracking-tight">{label}</p>
                {description && <p className="text-caption text-on-surface-variant group-hover/input:text-on-surface-variant transition-colors duration-base">{description}</p>}
            </div>
            <div className={cn(
                "flex items-center gap-2.5 bg-surface-container border border-outline-variant rounded-input px-4 py-3 w-full md:w-72 transition-all relative",
                "focus-within:border-brand-accent/50 focus-within:shadow-brand-focus focus-within:bg-surface-container-high hover:border-outline-variant/15",
                className
            )}>
                <input
                    ref={ref}
                    type={isSecure ? (showSecure ? "text" : "password") : type}
                    placeholder={placeholder}
                    // text-base en mobile: iOS Safari hace zoom al enfocar cualquier
                    // input por debajo de 16px. El tamaño de desktop no cambia.
                    className={cn(
                        "flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant/60 text-base md:text-xs focus:outline-none pr-5",
                        isMono && "font-mono md:text-label-sm tracking-tight"
                    )}
                    {...props}
                />
                {isSecure && (
                    <button
                        type="button"
                        onClick={() => setShowSecure(!showSecure)}
                        className="absolute right-3.5 text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                        {showSecure ? <Icons.ui.eyeOff className="w-4 h-4" /> : <Icons.ui.eye className="w-4 h-4" />}
                    </button>
                )}
            </div>
        </div>
    )
})

OsInput.displayName = "OsInput"

// ─── OsSelect ─────────────────────────────────────────────────────────────────

export interface OsSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string
    description?: string
    options: { value: string; label: string }[]
}

export const OsSelect = React.forwardRef<HTMLSelectElement, OsSelectProps>(({
    label,
    description,
    options,
    className,
    ...props
}, ref) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-outline-variant/4 last:border-0 hover:bg-surface-variant/[0.01] transition-all duration-base gap-5 group/select">
            <div className="space-y-1 flex-1 max-w-xl">
                <p className="text-sm font-semibold text-on-surface-variant group-hover/select:text-on-surface transition-colors tracking-tight">{label}</p>
                {description && <p className="text-caption text-on-surface-variant group-hover/select:text-on-surface-variant transition-colors duration-base">{description}</p>}
            </div>
            <div className={cn(
                "flex items-center bg-surface-container border border-outline-variant rounded-input px-4 py-3 w-full md:w-72 transition-all relative cursor-pointer",
                "focus-within:border-brand-accent/50 focus-within:shadow-brand-focus focus-within:bg-surface-container-high hover:border-outline-variant/15",
                className
            )}>
                <select
                    ref={ref}
                    // text-base en mobile: iOS Safari hace zoom al abrir un select
                    // por debajo de 16px. El tamaño de desktop no cambia.
                    className="flex-1 bg-transparent text-on-surface text-base md:text-xs focus:outline-none appearance-none cursor-pointer pr-6 font-medium [&>option]:bg-surface-container-high [&>option]:text-on-surface"
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3.5 pointer-events-none text-on-surface-variant group-hover/select:text-on-surface transition-colors">
                    <Icons.navigation.chevronDown className="w-4 h-4" />
                </div>
            </div>
        </div>
    )
})

OsSelect.displayName = "OsSelect"

// ─── OsToggle ─────────────────────────────────────────────────────────────────

export interface OsToggleProps {
    label: string
    description?: string
    checked: boolean
    onChange: (value: boolean) => void
    disabled?: boolean
}

export function OsToggle({ label, description, checked, onChange, disabled }: OsToggleProps) {
    return (
        <div
            className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-outline-variant/4 last:border-0 hover:bg-surface-variant/[0.01] transition-all duration-base gap-5 group/toggle cursor-pointer"
            onClick={() => !disabled && onChange(!checked)}
        >
            <div className="space-y-1 flex-1 max-w-xl">
                <p className="text-sm font-semibold text-on-surface-variant group-hover/toggle:text-on-surface transition-colors tracking-tight">{label}</p>
                {description && <p className="text-caption text-on-surface-variant group-hover/toggle:text-on-surface-variant transition-colors duration-base">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
                className={cn(
                    "relative shrink-0 w-10 h-[22px] rounded-full border transition-all duration-base focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50",
                    checked
                        ? "bg-brand-accent border-brand-accent shadow-[0_0_16px_hsl(var(--brand-accent)/0.4)]"
                        : "bg-surface-container border-outline-variant hover:border-outline-variant/25 hover:bg-surface-container-high",
                    disabled && "opacity-40 cursor-not-allowed"
                )}
            >
                <span className={cn(
                    "absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-elevation-1 transition-transform duration-base",
                    checked && "translate-x-[18px]"
                )} />
            </button>
        </div>
    )
}
