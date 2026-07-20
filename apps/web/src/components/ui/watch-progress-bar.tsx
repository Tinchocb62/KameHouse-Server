import React from "react";
import { cn } from "./core/styling";

interface WatchProgressBarProps {
    percent: number;
    className?: string;
    animateOnMount?: boolean;
    size?: "hero" | "panel";
}

export function WatchProgressBar({ percent, className, animateOnMount = false, size = "hero" }: WatchProgressBarProps) {
    // hero = original large bar outside cards
    // panel = smaller bar used inside cards/lore header
    
    return (
        <div className={cn(
            "w-full rounded-full overflow-hidden relative z-10",
            size === "hero" ? "h-[5px]" : "h-2 bg-white/10 border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]",
            className
        )}
        // El modo panel usa la utilidad `bg-white/10` (arriba). El modo hero
        // necesita teñir con surface-container a 20% de alpha; como el token ya
        // incluye su propio alpha en un color-mix, el modificador `/20` de
        // Tailwind no aplica, así que se resuelve con color-mix inline.
        style={size === "hero" ? { background: "color-mix(in srgb, var(--md-sys-color-surface-container) 20%, transparent)" } : undefined}>
            <div 
                className={cn(
                    "h-full",
                    size === "hero" ? "bg-brand-secondary" : "bg-gradient-to-r from-brand-secondary via-brand-accent to-brand-accent shadow-[0_0_8px_hsl(var(--brand-accent)/0.6)]",
                    animateOnMount && "duration-slower ease-expo-out transition-all"
                )} 
                style={{ width: `${percent}%` }}
            />
        </div>
    );
}
