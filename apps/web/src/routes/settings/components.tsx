import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"

// ─── SettingsSection ──────────────────────────────────────────────────────────

export interface SettingsSectionProps {
    id?: string
    label: string
    description?: string
    icon?: React.ElementType
    badge?: React.ReactNode
    children: React.ReactNode
    className?: string
    collapsible?: boolean
    defaultOpen?: boolean
    searchQuery?: string
}

export function SettingsSection({
    id,
    label,
    description,
    icon: Icon,
    badge,
    children,
    className,
    collapsible = false,
    defaultOpen = true,
    searchQuery,
}: SettingsSectionProps) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)
    const isSearching = !!searchQuery && searchQuery.trim().length > 0

    if (!collapsible) {
        return (
            <div id={id} className={cn("space-y-3.5 scroll-mt-28", className)}>
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div className="w-8 h-8 rounded-xl bg-brand-accent/10 border border-brand-accent/25 flex items-center justify-center text-brand-accent shrink-0 shadow-[0_0_12px_hsl(var(--brand-accent)/0.15)]">
                                <Icon className="w-4 h-4" />
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs font-black uppercase tracking-wider text-on-surface font-mono">
                                    {label}
                                </h3>
                                {badge}
                            </div>
                            {description && (
                                <p className="text-[11px] text-on-surface-variant/70 leading-normal font-medium mt-0.5">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                {children}
            </div>
        )
    }

    const showContent = isOpen || isSearching

    return (
        <div id={id} className={cn("rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden scroll-mt-28 transition-all duration-base", className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors group select-none"
            >
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    {Icon ? (
                        <div className="w-8 h-8 rounded-xl bg-brand-accent/10 border border-brand-accent/25 flex items-center justify-center text-brand-accent shrink-0 group-hover:scale-105 transition-all shadow-[0_0_12px_hsl(var(--brand-accent)/0.15)]">
                            <Icon className="w-4 h-4" />
                        </div>
                    ) : (
                        <div className="w-1.5 h-5 rounded-full bg-brand-accent shrink-0" />
                    )}
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-on-surface font-mono group-hover:text-brand-accent transition-colors truncate">
                                {label}
                            </h3>
                            {badge}
                        </div>
                        {description && (
                            <p className="text-[11px] text-on-surface-variant/70 leading-normal font-medium line-clamp-1 mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                <div className={cn(
                    "w-7 h-7 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-on-surface-variant group-hover:text-on-surface group-hover:bg-white/[0.08] transition-all shrink-0",
                    showContent && "rotate-180 text-brand-accent bg-brand-accent/10 border-brand-accent/30"
                )}>
                    <Icons.navigation.chevronDown className="w-4 h-4 transition-transform duration-base" />
                </div>
            </button>

            <AnimatePresence initial={false}>
                {showContent && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden border-t border-white/[0.06]"
                    >
                        <div className="p-5 space-y-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── SettingsCard ─────────────────────────────────────────────────────────────

export function SettingsCard({
    children,
    className,
    divide = true,
}: {
    children: React.ReactNode
    className?: string
    divide?: boolean
}) {
    return (
        <div className={cn(
            "rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-elevation-1 backdrop-blur-sm transition-all duration-base overflow-hidden",
            divide && "divide-y divide-white/[0.04]",
            className
        )}>
            {children}
        </div>
    )
}

// Legacy aliases for backward compatibility
export const Card = SettingsCard
export const Section = SettingsSection

// ─── Gooey Toggle Component ───────────────────────────────────────────────────

const gooeyStyles = {
  switch: `relative block cursor-pointer h-7 w-[46px] shrink-0
    [--c-active:hsl(var(--brand-accent))]
    [--c-success:#10B981]
    [--c-warning:#F59E0B]
    [--c-danger:#EF4444]
    [--c-active-inner:#FFFFFF]
    [--c-default:rgba(255,255,255,0.14)]
    [--c-default-dark:rgba(255,255,255,0.22)]
    [--c-black:#1B1B22]
    [transform:translateZ(0)]
    [-webkit-transform:translateZ(0)]
    [backface-visibility:hidden]
    [-webkit-backface-visibility:hidden]
    [perspective:1000]
    [-webkit-perspective:1000]`,
  input: `h-full w-full cursor-pointer appearance-none rounded-full
    bg-[--c-default] outline-none transition-colors duration-500
    hover:bg-[--c-default-dark]
    border border-white/10
    [background-image:none] checked:bg-none checked:[background-image:none]
    [transform:translate3d(0,0,0)]
    [-webkit-transform:translate3d(0,0,0)]
    data-[checked=true]:bg-[--c-background] data-[checked=true]:border-brand-accent/50
    data-[checked=true]:shadow-[0_0_16px_hsl(var(--brand-accent)/0.4)]`,
  svg: `pointer-events-none absolute inset-0 fill-white
    [transform:translate3d(0,0,0)]
    [-webkit-transform:translate3d(0,0,0)]`,
  circle: `transform-gpu transition-transform duration-500
    [transform:translate3d(0,0,0)]
    [-webkit-transform:translate3d(0,0,0)]
    [backface-visibility:hidden]
    [-webkit-backface-visibility:hidden]`,
  dropCircle: `transform-gpu transition-transform duration-700
    [transform:translate3d(0,0,0)]
    [-webkit-transform:translate3d(0,0,0)]`
};

const variantStyles = {
  default: '[--c-background:var(--c-active)]',
  success: '[--c-background:var(--c-success)]',
  warning: '[--c-background:var(--c-warning)]',
  danger: '[--c-background:var(--c-danger)]',
};

export interface ToggleProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
}

export function Toggle({ 
  checked = false, 
  onCheckedChange, 
  className,
  variant = 'default',
  disabled = false,
}: ToggleProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onCheckedChange?.(e.target.checked);
  };

  return (
    <label className={cn(gooeyStyles.switch, disabled && "opacity-40 cursor-not-allowed", className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        data-checked={checked}
        className={cn(gooeyStyles.input, variantStyles[variant])}
      />
      <svg
        viewBox="0 0 52 32"
        filter="url(#goo)"
        className={gooeyStyles.svg}
      >
        <circle
          className={gooeyStyles.circle}
          cx="16"
          cy="16"
          r="10"
          style={{
            transformOrigin: '16px 16px',
            transform: `translateX(${checked ? '12px' : '0px'}) scale(${checked ? '0' : '1'})`,
          }}
        />
        <circle
          className={gooeyStyles.circle}
          cx="36"
          cy="16"
          r="10"
          style={{
            transformOrigin: '36px 16px',
            transform: `translateX(${checked ? '0px' : '-12px'}) scale(${checked ? '1' : '0'})`,
          }}
        />
        {checked && (
          <circle
            className={gooeyStyles.dropCircle}
            cx="35"
            cy="-1"
            r="2.5"
          />
        )}
      </svg>
    </label>
  );
}

export function GooeyFilter() {
  return (
    <svg className="fixed w-0 h-0 pointer-events-none opacity-0 overflow-hidden" aria-hidden="true">
      <defs>
        <filter id="goo">
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="2"
            result="blur"
          />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feComposite
            in="SourceGraphic"
            in2="goo"
            operator="atop"
          />
        </filter>
      </defs>
    </svg>
  );
}

// ─── OsToggle ─────────────────────────────────────────────────────────────────

export interface OsToggleProps {
    label: string
    description?: string
    checked: boolean
    onChange: (value: boolean) => void
    disabled?: boolean
    icon?: React.ElementType
    className?: string
    variant?: 'default' | 'success' | 'warning' | 'danger'
}

export function OsToggle({
    label,
    description,
    checked,
    onChange,
    disabled = false,
    icon: Icon,
    className,
    variant = 'default',
}: OsToggleProps) {
    const handleToggle = () => {
        if (!disabled) {
            onChange(!checked)
        }
    }

    return (
        <div
            role="switch"
            aria-checked={checked}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                    e.preventDefault()
                    handleToggle()
                }
            }}
            onClick={handleToggle}
            className={cn(
                "flex items-center justify-between px-5 py-4 transition-all duration-200 gap-4 select-none group",
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05]",
                className
            )}
        >
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                {Icon && (
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-on-surface-variant shrink-0 mt-0.5 group-hover:border-white/20 transition-colors">
                        <Icon className="w-3.5 h-3.5" />
                    </div>
                )}
                <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-xs font-bold text-on-surface tracking-tight leading-snug group-hover:text-white transition-colors">
                        {label}
                    </p>
                    {description && (
                        <p className="text-[11px] text-on-surface-variant/70 leading-relaxed font-medium">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            <Toggle
                checked={checked}
                onCheckedChange={onChange}
                disabled={disabled}
                variant={variant}
                className="pointer-events-none"
            />
        </div>
    )
}

// ─── OsSelect ─────────────────────────────────────────────────────────────────

export interface OsSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string
    description?: string
    options: { value: string; label: string }[]
    icon?: React.ElementType
}

export const OsSelect = React.forwardRef<HTMLSelectElement, OsSelectProps>(({
    label,
    description,
    options,
    icon: Icon,
    className,
    ...props
}, ref) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 gap-4 hover:bg-white/[0.02] transition-colors">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                {Icon && (
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-on-surface-variant shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5" />
                    </div>
                )}
                <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-xs font-bold text-on-surface tracking-tight leading-snug">{label}</p>
                    {description && <p className="text-[11px] text-on-surface-variant/70 leading-relaxed font-medium">{description}</p>}
                </div>
            </div>

            <div className={cn(
                "relative flex items-center bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 w-full sm:w-auto sm:min-w-[240px] sm:max-w-md transition-all cursor-pointer shrink-0",
                "focus-within:border-brand-accent/50 focus-within:shadow-[0_0_12px_hsl(var(--brand-accent)/0.2)] focus-within:bg-white/[0.07] hover:border-white/20",
                className
            )}>
                <select
                    ref={ref}
                    className="w-full bg-transparent text-on-surface text-xs font-medium focus:outline-none appearance-none cursor-pointer pr-7 truncate [background-image:none] border-none p-0 outline-none ring-0 [&>option]:bg-zinc-950 [&>option]:text-white"
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-zinc-950 text-white py-1">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3.5 pointer-events-none text-on-surface-variant/70 transition-colors">
                    <Icons.navigation.chevronDown className="w-4 h-4" />
                </div>
            </div>
        </div>
    )
})

OsSelect.displayName = "OsSelect"

// ─── OsInput ──────────────────────────────────────────────────────────────────

export interface OsInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string
    description?: string
    isSecure?: boolean
    isMono?: boolean
    icon?: React.ElementType
}

export const OsInput = React.forwardRef<HTMLInputElement, OsInputProps>(({
    label,
    description,
    placeholder,
    isSecure = false,
    isMono = false,
    type = "text",
    icon: Icon,
    className,
    ...props
}, ref) => {
    const [showSecure, setShowSecure] = React.useState(false)

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 gap-3.5 hover:bg-white/[0.02] transition-colors">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                {Icon && (
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-on-surface-variant shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5" />
                    </div>
                )}
                <div className="space-y-0.5 min-w-0 max-w-xl">
                    <p className="text-xs font-bold text-on-surface tracking-tight leading-snug">{label}</p>
                    {description && <p className="text-[11px] text-on-surface-variant/70 leading-relaxed font-medium">{description}</p>}
                </div>
            </div>

            <div className={cn(
                "flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 w-full sm:w-72 lg:w-80 transition-all relative",
                "focus-within:border-brand-accent/50 focus-within:shadow-[0_0_12px_hsl(var(--brand-accent)/0.2)] focus-within:bg-white/[0.07] hover:border-white/20",
                className
            )}>
                <input
                    ref={ref}
                    type={isSecure ? (showSecure ? "text" : "password") : type}
                    placeholder={placeholder}
                    className={cn(
                        "flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant/40 text-xs focus:outline-none",
                        isSecure && "pr-6",
                        isMono && "font-mono text-[11px]"
                    )}
                    {...props}
                />
                {isSecure && (
                    <button
                        type="button"
                        onClick={() => setShowSecure(!showSecure)}
                        className="absolute right-3 text-on-surface-variant/70 hover:text-on-surface transition-colors p-1"
                    >
                        {showSecure ? <Icons.ui.eyeOff className="w-3.5 h-3.5" /> : <Icons.ui.eye className="w-3.5 h-3.5" />}
                    </button>
                )}
            </div>
        </div>
    )
})

OsInput.displayName = "OsInput"

// ─── PathList ─────────────────────────────────────────────────────────────────

export interface PathListProps {
    label: string
    directories: string[]
    onAdd: (path: string) => void
    onRemove: (path: string) => void
    placeholder?: string
    icon?: React.ElementType
    className?: string
}

export function PathList({ label, directories, onAdd, onRemove, placeholder, icon: Icon, className }: PathListProps) {
    const [inputValue, setInputValue] = React.useState("")

    const handleAdd = () => {
        if (inputValue.trim()) {
            onAdd(inputValue.trim())
            setInputValue("")
        }
    }

    return (
        <div className={cn("p-5 space-y-4 h-full flex flex-col justify-between", className)}>
            <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2 min-h-[26px]">
                    <div className="flex items-center gap-2 min-w-0">
                        {Icon && <Icon className="w-4 h-4 text-brand-accent shrink-0" />}
                        <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider truncate">{label}</h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-on-surface-variant border border-white/10 shrink-0">
                        {directories.length} {directories.length === 1 ? "ruta" : "rutas"}
                    </span>
                </div>

                {directories.length > 0 ? (
                    <div className="space-y-2">
                        {directories.map((dir) => (
                            <div key={dir} className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2 group/path hover:border-white/20 transition-all">
                                <span className="text-xs text-on-surface-variant font-mono truncate mr-3">{dir}</span>
                                <button
                                    type="button"
                                    onClick={() => onRemove(dir)}
                                    className="text-on-surface-variant/70 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10 shrink-0"
                                    title="Eliminar ruta"
                                >
                                    <Icons.ui.delete className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-3 rounded-xl border border-dashed border-white/10 text-center">
                        <p className="text-[11px] text-on-surface-variant/50 font-medium">
                            Sin carpetas añadidas
                        </p>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl p-1.5 focus-within:border-brand-accent/50 hover:border-white/20 transition-all mt-3">
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
                    placeholder={placeholder}
                    className="flex-1 min-w-0 bg-transparent px-2.5 py-1 text-on-surface placeholder:text-on-surface-variant/40 text-xs font-mono focus:outline-none"
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    className="bg-brand-accent hover:brightness-110 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                    <Icons.ui.plus className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                </button>
            </div>
        </div>
    )
}

// ─── ScanButton ────────────────────────────────────────────────────────────────

export function ScanButton({
    title,
    description,
    icon: Icon,
    onClick,
    loading,
    destructive
}: {
    title: string
    description: string
    icon?: React.ElementType
    onClick: () => void
    loading?: boolean
    destructive?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className={cn(
                "flex-1 flex items-center justify-between p-4 rounded-xl transition-all duration-base border text-left active:scale-[0.99]",
                loading
                    ? (destructive ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-brand-accent/10 border-brand-accent/20 text-brand-accent")
                    : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04] text-on-surface",
                loading && "opacity-50 cursor-not-allowed"
            )}
        >
            <div className="space-y-0.5 pr-3">
                <p className="text-xs font-bold text-on-surface tracking-wide">
                    {title}
                </p>
                <p className="text-[11px] font-medium text-on-surface-variant/70">
                    {description}
                </p>
            </div>
            <div className={cn(
                "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-all",
                destructive
                    ? "bg-red-500/15 border-red-500/30 text-red-400"
                    : "bg-brand-accent/15 border-brand-accent/30 text-brand-accent"
            )}>
                {Icon ? (
                    <Icon className={cn("w-4 h-4", loading ? "animate-spin" : "")} />
                ) : (
                    <Icons.ui.refresh className={cn("w-4 h-4", loading ? "animate-spin" : "")} />
                )}
            </div>
        </button>
    )
}
