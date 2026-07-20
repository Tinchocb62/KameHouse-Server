import React from "react";
import { cn } from "./core/styling";

export type EpisodeBadgeVariant = "filler" | "canon" | "premium" | "neutral";

interface EpisodeBadgeProps {
    variant: EpisodeBadgeVariant;
    dot?: boolean;
    children?: React.ReactNode;
    className?: string;
}

export function canonStatusToVariant(status: string | null | undefined): EpisodeBadgeVariant {
    if (!status) return "neutral";
    const lower = status.toLowerCase();
    if (lower === "true" || lower === "canon") return "canon";
    if (lower === "false" || lower === "relleno") return "filler";
    return "neutral";
}

const variantClassMap: Record<EpisodeBadgeVariant, string> = {
    canon: "badge-success",
    filler: "badge-destructive",
    premium: "badge-primary",
    neutral: "badge-muted",
};

export function EpisodeBadge({ variant, dot = false, children, className }: EpisodeBadgeProps) {
    return (
        <span className={cn("badge", variantClassMap[variant], className)}>
            {dot && (
                <span className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    variant === "canon" ? "bg-brand-success" : 
                    variant === "filler" ? "bg-brand-destructive" : 
                    variant === "premium" ? "bg-brand-accent" : 
                    "bg-on-surface-variant"
                )} />
            )}
            {children}
        </span>
    );
}
