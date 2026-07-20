import React from "react";
import { cn } from "./core/styling";

interface GlassIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
    title: string;
    isActive?: boolean;
    activeTone?: "success" | "destructive" | "primary" | "secondary";
    className?: string;
}

export function GlassIconButton({
    icon,
    title,
    isActive = false,
    activeTone = "success",
    className,
    ...props
}: GlassIconButtonProps) {
    const toneMap = {
        success: "text-brand-success",
        destructive: "text-brand-destructive",
        primary: "text-brand-accent",
        secondary: "text-brand-secondary",
    };

    return (
        <button
            title={title}
            className={cn(
                "group flex items-center justify-center p-4 rounded-xl glass-liquid transition-all duration-base hover:scale-[1.03] active:scale-95 min-h-[44px]",
                isActive ? toneMap[activeTone] : "text-on-surface/70 hover:text-on-surface",
                className
            )}
            {...props}
        >
            <div className={cn("transition-transform group-hover:-translate-y-0.5", isActive && "scale-110")}>
                {icon}
            </div>
        </button>
    );
}
