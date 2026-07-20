import React from "react"
import { cn } from "@/components/ui/core/styling"
import { Switch } from "@/components/ui/switch"

// ─── Inline SVGs ──────────────────────────────────────────────────────────────

export const RefreshIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
    </svg>
)

export const PlusIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
    </svg>
)

export const TrashIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
)

export const FolderIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
)

export const EyeIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
)

export const EyeOffIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
)

export const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m6 9 6 6 6-6" />
    </svg>
)

export const CheckIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 6 9 17l-5-5" />
    </svg>
)

export const WifiIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
        <path d="M12 20h.01" />
        <path d="M8.5 16.5a5 5 0 0 1 7 0" />
        <path d="M5 13a10 10 0 0 1 14 0" />
        <path d="M1.5 9.5a15 15 0 0 1 21 0" />
    </svg>
)

export const WifiOffIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
        <path d="M1 1l22 22" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 13" />
        <path d="M5 13a10.94 10.94 0 0 1 5.83-2.84" />
        <path d="M12 20h.01" />
        <path d="M8.5 16.5a5 5 0 0 1 7 0" />
        <path d="M21.3 4.7a15 15 0 0 0-18.6 0" />
    </svg>
)

// ─── ScanButton ────────────────────────────────────────────────────────────────

export function ScanButton({ variant, onClick, loading }: { variant: "delta" | "full", onClick: () => void, loading?: boolean }) {
    const isDelta = variant === "delta"
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className={cn(
                "flex-1 flex items-center justify-between p-6 rounded-2xl border transition-all duration-500 relative overflow-hidden group/scanbtn",
                isDelta
                    ? "bg-cyan-500/5 border-cyan-500/15 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.03)]"
                    : "bg-white/[0.01] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/15 text-white",
                loading && "opacity-50 cursor-not-allowed"
            )}
        >
            {isDelta && (
                <div className="absolute inset-0 opacity-0 group-hover/scanbtn:opacity-100 transition-opacity duration-700 bg-[radial-gradient(ellipse_at_left_bottom,rgba(6,182,212,0.06),transparent_60%)] pointer-events-none" />
            )}
            <div className="text-left relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-40 mb-1 group-hover/scanbtn:opacity-70 transition-opacity">
                    {isDelta ? "Rápido" : "Profundo"}
                </p>
                <p className="text-xl font-display tracking-wider uppercase">{isDelta ? "Escaneo Delta" : "Escaneo Completo"}</p>
            </div>
            <div className={cn(
                "w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300",
                isDelta
                    ? "bg-cyan-500/10 border-cyan-500/20 group-hover/scanbtn:bg-cyan-500/20"
                    : "bg-white/[0.02] border-white/5 group-hover/scanbtn:bg-white/[0.06]"
            )}>
                <RefreshIcon
                    className={cn(
                        "transition-all duration-700",
                        isDelta ? "text-cyan-400" : "text-white/75 group-hover/scanbtn:text-white",
                        loading ? "animate-spin" : "group-hover/scanbtn:rotate-180"
                    )}
                />
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
            "p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group/intcard",
            disabled
                ? "opacity-30 grayscale liquid-glass-frosted-subtle border-white/5"
                : connected
                    ? "liquid-glass-frosted liquid-glass-frosted-interactive border-white/10"
                    : "liquid-glass-frosted-subtle hover:bg-white/[0.04] hover:border-white/12"
        )}>
            {connected && (
                <div
                    className="absolute inset-0 opacity-0 group-hover/intcard:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at left, ${color}08, transparent 60%)` }}
                />
            )}

            <div
                className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-300 group-hover/intcard:scale-105"
                style={{
                    background: `${color}10`,
                    borderColor: `${color}25`,
                    boxShadow: connected ? `0 0 20px ${color}15` : "none"
                }}
            >
                {connected
                    ? <WifiIcon style={{ color }} />
                    : <WifiOffIcon className="text-zinc-550" />
                }
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-display text-xl tracking-wider uppercase text-white/90 group-hover/intcard:text-white transition-colors leading-none">{name}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-550 mt-0.5">{status}</p>
            </div>

            {connected && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-black tracking-widest uppercase text-emerald-400">OK</span>
                </div>
            )}

            {!connected && !disabled && (
                <span className="text-[9px] font-black tracking-widest uppercase text-zinc-550 border border-zinc-800 px-2.5 py-1 rounded-full group-hover/intcard:border-zinc-700 group-hover/intcard:text-zinc-400 transition-colors shrink-0">
                    DISPONIBLE
                </span>
            )}

            {disabled && (
                <span className="text-[9px] font-black tracking-widest uppercase text-zinc-650 border border-zinc-900 px-2.5 py-1 rounded-full shrink-0">
                    PRONTO
                </span>
            )}
        </div>
    )
}

// ─── StatusCard ───────────────────────────────────────────────────────────────

export function StatusCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
    return (
        <div className="p-5 liquid-glass-frosted liquid-glass-frosted-interactive rounded-2xl flex items-center gap-4 group/statuscard relative overflow-hidden">
            <div className="absolute inset-0 opacity-0 group-hover/statuscard:opacity-100 transition-opacity duration-700 bg-[radial-gradient(ellipse_at_left,rgba(6,182,212,0.04),transparent_70%)] pointer-events-none" />
            <div className="w-11 h-11 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center text-cyan-400/60 group-hover/statuscard:text-cyan-400 group-hover/statuscard:bg-cyan-500/10 transition-all duration-300 relative z-10">
                <Icon className="w-[18px] h-[18px]" />
            </div>
            <div className="relative z-10">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-550 mb-0.5">{label}</p>
                <p className="text-xl font-display tracking-wider uppercase text-white/90 group-hover/statuscard:text-white transition-colors leading-tight">{value}</p>
            </div>
        </div>
    )
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function Section({ label, children, right }: { label: string; children: React.ReactNode; right?: React.ReactNode }) {
    return (
        <div className="space-y-6 w-full group/sec transition-all duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 w-full">
                    <div className="h-[2px] w-6 bg-gradient-to-r from-[#ff6e3a] to-transparent rounded-full shadow-[0_0_8px_rgba(255,110,58,0.6)] transition-all duration-500 group-hover/sec:w-10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 group-hover/sec:text-[#ff6e3a] transition-colors duration-300 font-mono select-none">{label}</p>
                    <div className="h-[1px] flex-grow bg-gradient-to-r from-white/10 to-transparent min-w-[40px] ml-3" />
                </div>
                {right}
            </div>
            <div className="w-full">
                {children}
            </div>
        </div>
    )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn(
            "bg-zinc-950/45 border border-white/5 hover:border-white/10 rounded-[24px] overflow-hidden divide-y divide-white/[0.03] backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-300 relative",
            className
        )}>
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}

// ─── OsToggle ─────────────────────────────────────────────────────────────────

export interface OsToggleProps {
    name?: string
    label: string
    description?: string
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
}

export function OsToggle({ label, description, checked, onChange, disabled }: OsToggleProps) {
    return (
        <div className={cn(
            "flex items-center justify-between p-6 transition-all duration-300 cursor-pointer group/toggle relative overflow-hidden",
            checked ? "bg-[#ff6e3a]/[0.01]" : "",
            disabled ? "opacity-30 cursor-not-allowed pointer-events-none" : "hover:bg-white/[0.015]"
        )}
            onClick={() => {
                if (disabled) return
                onChange(!checked)
            }}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-[#ff6e3a]/[0.015] to-transparent opacity-0 group-hover/toggle:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300",
                checked ? "h-8 bg-[#ff6e3a] shadow-[0_0_12px_rgba(255,110,58,0.8)]" : "h-0 bg-transparent"
            )} />

            <div className="space-y-1 flex-1 pl-4 relative z-10 pr-4">
                <p className={cn(
                    "text-sm font-semibold tracking-tight transition-colors duration-300",
                    checked ? "text-white" : "text-zinc-350 group-hover/toggle:text-white"
                )}>{label}</p>
                {description && <p className="text-[11px] text-zinc-500 leading-relaxed font-medium group-hover/toggle:text-zinc-400 transition-colors duration-300">{description}</p>}
            </div>
            
            <div className="relative z-10 scale-[0.9] hover:scale-[0.93] transition-all shrink-0">
                <Switch
                    value={checked}
                    onValueChange={(v: boolean) => {
                        if (disabled) return
                        onChange(v)
                    }}
                    disabled={disabled}
                    className="data-[state=checked]:bg-[#ff6e3a] data-[state=checked]:shadow-[0_0_10px_rgba(255,110,58,0.4)] shrink-0"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>
    )
}

// ─── PathList ─────────────────────────────────────────────────────────────────

export interface PathListProps {
    directories: string[]
    onAdd: (path: string) => void
    onRemove: (path: string) => void
    label: string
    placeholder?: string
}

export function PathList({ directories = [], onAdd, onRemove, label, placeholder }: PathListProps) {
    const [inputValue, setInputValue] = React.useState("")

    const handleAdd = () => {
        if (inputValue.trim() && !directories.includes(inputValue.trim())) {
            onAdd(inputValue.trim())
            setInputValue("")
        }
    }

    return (
        <div className="bg-zinc-950/45 border border-white/5 rounded-[24px] overflow-hidden p-6 space-y-6 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-white/10 group/pathlist">
            <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#ff6e3a]/5 border border-[#ff6e3a]/15 flex items-center justify-center shadow-[0_0_15px_rgba(255,110,58,0.05)] transition-all duration-300 group-hover/pathlist:border-[#ff6e3a]/30">
                        <FolderIcon className="text-[#ff6e3a]" />
                    </div>
                    <p className="text-sm font-bold tracking-tight text-white uppercase">{label}</p>
                </div>
                <p className="text-[11px] text-zinc-500 font-medium leading-relaxed max-w-xl pl-11">
                    Directorios locales vinculados a este motor. El escáner analizará estos directorios de forma recursiva.
                </p>
            </div>

            <div className="space-y-2.5">
                {directories.length === 0 ? (
                    <div className="border border-dashed border-white/10 bg-black/20 p-8 rounded-xl text-center space-y-1.5 transition-all">
                        <FolderIcon className="mx-auto mb-2 text-zinc-650 animate-pulse" />
                        <p className="text-zinc-500 text-xs font-semibold">No hay directorios configurados</p>
                        <p className="text-zinc-650 text-[9px] uppercase tracking-wider font-mono">Agrega uno utilizando el campo de abajo</p>
                    </div>
                ) : (
                    directories.map((path, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-black/40 border border-white/5 px-4.5 py-3 rounded-xl transition-all duration-300 hover:border-white/10 hover:bg-[#ff6e3a]/[0.01] group/pathitem">
                            <div className="flex items-center gap-3 min-w-0">
                                <CheckIcon className="text-[#ff6e3a] shrink-0" />
                                <span className="font-mono text-xs text-zinc-400 truncate group-hover/pathitem:text-white transition-colors">{path}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemove(path)}
                                className="text-zinc-600 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/15 transition-all ml-3 shrink-0"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="flex gap-2 bg-[#050507]/60 border border-white/5 focus-within:border-[#ff6e3a]/40 focus-within:shadow-[0_0_20px_rgba(255,110,58,0.12)] rounded-xl p-1.5 transition-all duration-300">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault()
                            handleAdd()
                        }
                    }}
                    placeholder={placeholder || "Ej. C:\\Media\\Peliculas"}
                    className="flex-1 bg-transparent px-3 py-2 text-white placeholder-zinc-700 text-xs font-mono focus:outline-none"
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    className="bg-[#ff6e3a] hover:bg-[#ff7e4e] text-zinc-950 px-5.5 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all shrink-0 flex items-center gap-1.5 active:scale-95 shadow-lg shadow-orange-500/15"
                >
                    <PlusIcon />
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
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.005] transition-all duration-200 gap-5 group/input">
            <div className="space-y-1 flex-1 max-w-xl">
                <p className="text-sm font-semibold text-zinc-300 group-hover/input:text-white transition-colors tracking-tight">{label}</p>
                {description && <p className="text-[11px] text-zinc-500 leading-relaxed font-medium group-hover/input:text-zinc-400 transition-colors duration-300">{description}</p>}
            </div>
            <div className={cn(
                "flex items-center gap-2.5 bg-black/40 border border-white/5 rounded-xl px-4 py-3 w-full md:w-72 transition-all relative",
                "focus-within:border-[#ff6e3a]/40 focus-within:shadow-[0_0_20px_rgba(255,110,58,0.12)] hover:border-white/10",
                className
            )}>
                <input
                    ref={ref}
                    type={isSecure ? (showSecure ? "text" : "password") : type}
                    placeholder={placeholder}
                    className={cn(
                        "flex-1 bg-transparent text-white placeholder-zinc-700 text-xs focus:outline-none pr-5",
                        isMono && "font-mono text-[11px] tracking-tight"
                    )}
                    {...props}
                />
                {isSecure && (
                    <button
                        type="button"
                        onClick={() => setShowSecure(!showSecure)}
                        className="absolute right-3.5 text-zinc-600 hover:text-zinc-350 transition-colors"
                    >
                        {showSecure ? <EyeOffIcon /> : <EyeIcon />}
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
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.005] transition-all duration-200 gap-5 group/select">
            <div className="space-y-1 flex-1 max-w-xl">
                <p className="text-sm font-semibold text-zinc-300 group-hover/select:text-white transition-colors tracking-tight">{label}</p>
                {description && <p className="text-[11px] text-zinc-500 leading-relaxed font-medium group-hover/select:text-zinc-400 transition-colors duration-300">{description}</p>}
            </div>
            <div className={cn(
                "flex items-center bg-black/40 border border-white/5 rounded-xl px-4 py-3 w-full md:w-72 transition-all relative cursor-pointer",
                "focus-within:border-[#ff6e3a]/40 focus-within:shadow-[0_0_20px_rgba(255,110,58,0.12)] hover:border-white/10",
                className
            )}>
                <select
                    ref={ref}
                    className="flex-1 bg-transparent text-white text-xs focus:outline-none appearance-none cursor-pointer pr-6 font-medium [&>option]:bg-[#0c0c0e] [&>option]:text-white"
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3.5 pointer-events-none text-zinc-600 group-hover/select:text-zinc-300 transition-colors">
                    <ChevronDownIcon />
                </div>
            </div>
        </div>
    )
})

OsSelect.displayName = "OsSelect"
