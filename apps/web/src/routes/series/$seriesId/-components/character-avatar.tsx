import React from "react"
import { cn } from "@/components/ui/core/styling"

// Tratamiento único de "personaje" para toda la ruta de series.
// Receta canónica: la tile del CharacterCarousel (rounded-xl, hover con glow de
// era vía brand-accent). Reemplaza las tres variantes que había (carousel,
// "Personajes Clave del Arco" del lore header y CharactersTab).

interface CharacterAvatarProps {
    name: string
    avatarUrl?: string | null
    roleTag?: string | null
    size?: "sm" | "md"
    className?: string
    onSelect?: (name: string) => void
}

function roleToneClass(roleTag?: string | null): string {
    if (!roleTag) return "text-on-surface-variant"
    const lower = roleTag.toLowerCase()
    if (lower.includes("antagonista") || lower.includes("antagonist")) return "text-brand-destructive"
    if (lower.includes("protagonista") || lower === "main") return "text-brand-success"
    return "text-on-surface-variant"
}

export function CharacterAvatar({ name, avatarUrl, roleTag, size = "md", className, onSelect }: CharacterAvatarProps) {
    const handleSelect = () => onSelect?.(name)

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={roleTag ? `${name}, ${roleTag}` : name}
            title={`Ver detalles de ${name}`}
            onClick={handleSelect}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleSelect()
                }
            }}
            className={cn(
                "flex flex-col items-center text-center gap-2.5 group cursor-pointer rounded-xl",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent/70",
                className
            )}
        >
            <div
                className={cn(
                    "rounded-xl overflow-hidden border border-white/10 relative shadow-card bg-surface-container-low transform-gpu",
                    "group-hover:border-brand-accent/60 group-hover:shadow-brand-accent group-hover:-translate-y-1",
                    "transition-all duration-slower ease-expo-out",
                    size === "md" ? "w-24 h-24" : "w-20 h-20"
                )}
            >
                {avatarUrl && (
                    <img
                        src={avatarUrl}
                        alt={name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slower ease-expo-out transform-gpu"
                    />
                )}
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-base"
                    style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 40%, transparent)" }}
                />
            </div>
            <div className="flex flex-col w-full px-1">
                <p className="text-sm font-bold text-on-surface group-hover:text-brand-accent transition-colors duration-base line-clamp-1">
                    {name}
                </p>
                {roleTag && (
                    <p className={cn(
                        "text-badge font-medium uppercase tracking-widest mt-0.5 transition-colors duration-base",
                        roleToneClass(roleTag)
                    )}>
                        {roleTag}
                    </p>
                )}
            </div>
        </div>
    )
}
