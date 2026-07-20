import { cn } from "@/components/ui/core/styling";
import * as React from "react";

export type BadgeVariant = "primary" | "secondary" | "success" | "magic" | "muted" | "destructive" | "outline";
export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  /* MD3 Filled variants */
  primary: "bg-brand-accent text-on-primary border-transparent",
  secondary: "bg-secondary-container text-on-secondary-container border-transparent",
  success: "bg-brand-success/15 text-brand-success border-brand-success/30",
  magic: "bg-brand-magic/15 text-brand-magic border-brand-magic/30",
  
  /* MD3 Outlined variant */
  outline: "bg-transparent text-brand-accent border-outline",
  
  /* MD3 Muted - using surface variant */
  muted: "bg-surface-variant text-on-surface-variant border-outline-variant",
  destructive: "bg-brand-destructive/15 text-brand-destructive border-brand-destructive/30",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-label-sm px-2 py-0.5 gap-1",
  md: "text-badge px-2.5 py-1 gap-1.5",
  lg: "text-caption px-3 py-1.5 gap-2",
};

const dotStyles: Record<BadgeVariant, string> = {
  primary: "bg-brand-accent",
  secondary: "bg-on-secondary-container",
  success: "bg-brand-success",
  magic: "bg-brand-magic",
  outline: "bg-brand-accent",
  muted: "bg-on-surface-variant",
  destructive: "bg-brand-destructive",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "muted", size = "md", dot = false, className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-bold uppercase tracking-widest border",
          "rounded-full",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotStyles[variant])} />}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";