import * as React from "react"
import { motion } from "framer-motion"
import { Icons } from "@/components/ui/icons"

interface SettingsLayoutProps {
    title: string
    onBack?: () => void
    onClose: () => void
    children: React.ReactNode
}

export function SettingsLayout({ title, onBack, onClose, children }: SettingsLayoutProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full max-w-80 bg-black/60 backdrop-blur-md border border-white/10 rounded-modal shadow-[var(--shadow-glass-liquid)] overflow-hidden flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center ml-2 [&>*:not(:first-child)]:ml-2">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 md:p-1 hover:bg-white/10 active:scale-90 rounded-full transition-all duration-base text-zinc-400 hover:text-white"
                        >
                            <Icons.navigation.chevronLeft className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                    )}
                    <span className="text-label-sm font-black uppercase tracking-ultra text-white/70">
                        {title}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 md:p-1 hover:bg-white/10 active:scale-90 rounded-full transition-all duration-base text-zinc-500 hover:text-white"
                >
                    <Icons.ui.close className="w-5 h-5 md:w-4 md:h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto scrollbar-none py-2">
                {children}
            </div>
        </motion.div>
    )
}

interface MenuButtonProps {
    icon: React.ReactNode
    label: string
    value?: string
    onClick: () => void
    rightElement?: React.ReactNode
}

export function MenuButton({ icon, label, value, onClick, rightElement }: MenuButtonProps) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between px-4 py-3 md:py-3 hover:bg-white/5 transition-all duration-base ease-out group text-left relative overflow-hidden"
        >
            {/* Hover visual accent indicator on the left edge */}
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 bg-brand-accent group-hover:h-1/2 transition-all duration-base ease-out rounded-r-md" />
            
            <div className="flex items-center ml-3 group-hover:translate-x-1.5 transition-transform duration-base ease-out [&>*:not(:first-child)]:ml-3">
                <div className="text-zinc-500 group-hover:text-brand-accent transition-colors duration-base">
                    {icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors duration-base">
                        {label}
                    </span>
                    {value && (
                        <span className="text-label-sm font-medium text-zinc-500 group-hover:text-zinc-400 transition-colors duration-base">
                            {value}
                        </span>
                    )}
                </div>
            </div>
            
            <div className="group-hover:-translate-x-0.5 transition-transform duration-base ease-out">
                {rightElement || (
                    <Icons.navigation.chevronLeft className="w-4 h-4 rotate-180 text-zinc-600 group-hover:text-zinc-400 transition-colors duration-base" />
                )}
            </div>
        </button>
    )
}
