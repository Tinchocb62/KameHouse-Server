import type { Config } from "tailwindcss"

import typography from "@tailwindcss/typography"
import forms from "@tailwindcss/forms"
import scrollbarHide from "tailwind-scrollbar-hide"
import animate from "tailwindcss-animate"

// @ts-expect-error - tailwindcss does not provide types for this utility
import flattenColorPalette from "tailwindcss/lib/util/flattenColorPalette"


const config: Config = {
    darkMode: "class",
    content: [
        "./index.html",
        "./src/**/*.{ts,tsx,mdx}",
    ],
    safelist: [],
    theme: {
        container: {
            center: true,
            padding: {
                DEFAULT: "1rem",
                sm: "2rem",
                lg: "4rem",
                xl: "5rem",
                "2xl": "6rem",
            },
            screens: {
                "2xl": "1400px",
                "3xl": "1600px",
                "4xl": "1800px",
                "5xl": "2000px",
                "6xl": "2200px",
                "7xl": "2400px",
            },
        },
        data: {
            checked: "checked",
            selected: "selected",
            disabled: "disabled",
            highlighted: "highlighted",
        },
        extend: {
            fontFamily: {
                sans: ["Inter Variable", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue",
                    "Arial", "sans-serif"],
                bebas: ["Bebas Neue", "cursive"],
                mono: ["Space Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
            },
            animationDuration: {
                DEFAULT: "0.2s",
                short: "100ms",
                medium: "200ms",
                long: "300ms",
            },
            transitionDuration: {
                "50": "50ms",
                "100": "100ms",
                "150": "150ms",
                "200": "200ms",
                "250": "250ms",
                "300": "300ms",
                "400": "400ms",
                "500": "500ms",
                // Tokens del design system (animation.css) — duration-base es el default del sistema
                fast: "150ms",
                base: "250ms",
                slow: "400ms",
                slower: "600ms",
            },
            transitionTimingFunction: {
                DEFAULT: "cubic-bezier(0.2, 0, 0.38, 0.9)",
                standard: "cubic-bezier(0.2, 0, 0.38, 0.9)",
                emphasized: "cubic-bezier(0.2, 0, 0, 1)",
                decelerated: "cubic-bezier(0.05, 0.7, 0.1, 1)",
                "bounce-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
                "image-zoom": "cubic-bezier(0.2, 1, 0.2, 1)",
                // Tokens del design system (animation.css)
                "smooth-out": "cubic-bezier(0.2, 1, 0.2, 1)",
                "expo-out": "cubic-bezier(0.16, 1, 0.3, 1)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "slide-down": {
                    from: { transform: "translateY(-1rem)", opacity: "0" },
                    to: { transform: "translateY(0)", opacity: "1" },
                },
                "slide-up": {
                    from: { transform: "translateY(0)", opacity: "1" },
                    to: { transform: "translateY(-1rem)", opacity: "0" },
                },
                "indeterminate-progress": {
                    "0%": { transform: " translateX(0) scaleX(0)" },
                    "40%": { transform: "translateX(0) scaleX(0.4)" },
                    "100%": { transform: "translateX(100%) scaleX(0.5)" },
                },
                "shimmer": {
                    "100%": { transform: "translateX(100%)" },
                },
                "scale-x": {
                    "0%, 100%": { transform: "scaleX(0.5)", opacity: "0.3" },
                    "50%": { transform: "scaleX(1.5)", opacity: "1" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.15s linear",
                "accordion-up": "accordion-up 0.15s linear",
                "slide-down": "slide-down 0.15s ease-in-out",
                "slide-up": "slide-up 0.15s ease-in-out",
                "indeterminate-progress": "indeterminate-progress 1s infinite ease-out",
                "shimmer": "shimmer 2s infinite",
                "spin-slow": "spin 8s linear infinite",
                "scale-x": "scale-x 2s ease-in-out infinite",
            },
            transformOrigin: {
                "left-right": "0% 100%",
            },
            boxShadow: {
                "md": "0 1px 3px 0 rgba(0, 0, 0, 0.1),0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                "glass": "0 20px 40px -15px rgba(0,0,0,0.7)",
                "elevation-1": "var(--elevation-1)",
                "elevation-2": "var(--elevation-2)",
                "elevation-3": "var(--elevation-3)",
                "elevation-4": "var(--elevation-4)",
                "elevation-5": "var(--elevation-5)",
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                pill: "9999px",
                container: "16px",
                "corner-lg": "28px",
            },
            backdropBlur: {
                "overlay-sm": "var(--blur-overlay-sm)",
                "overlay-md": "var(--blur-overlay-md)",
                "overlay-lg": "var(--blur-overlay-lg)",
                "overlay-xl": "var(--blur-overlay-xl)",
                "overlay-2xl": "var(--blur-overlay-2xl)",
            },
            blur: {
                sm: "var(--filter-blur-sm, 4px)",
                DEFAULT: "var(--filter-blur-default, 8px)",
                md: "var(--filter-blur-md, 12px)",
                lg: "var(--filter-blur-lg, 16px)",
                xl: "var(--filter-blur-xl, 24px)",
                "2xl": "var(--filter-blur-2xl, 40px)",
                "3xl": "var(--filter-blur-3xl, 64px)",
            },
            colors: {
                border: "hsl(var(--border) / <alpha-value>)",
                input: "hsl(var(--input) / <alpha-value>)",
                ring: "hsl(var(--ring) / <alpha-value>)",
                background: "hsl(var(--background) / <alpha-value>)",
                foreground: "hsl(var(--foreground) / <alpha-value>)",
                primary: {
                    DEFAULT: "hsl(var(--primary) / <alpha-value>)",
                    foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
                    foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
                    foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted) / <alpha-value>)",
                    foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent) / <alpha-value>)",
                    foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover) / <alpha-value>)",
                    foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
                },
                card: {
                    DEFAULT: "hsl(var(--card) / <alpha-value>)",
                    foreground: "hsl(var(--card-foreground) / <alpha-value>)",
                },
            overlay: "hsl(var(--overlay) / <alpha-value>)",
            "border-subtle": "hsl(var(--border-subtle) / <alpha-value>)",
            "border-strong": "hsl(var(--border-strong) / <alpha-value>)",
            "on-surface": "rgba(var(--on-surface-rgb), <alpha-value>)",
            "on-surface-variant": "rgba(var(--on-surface-variant-rgb), <alpha-value>)",
            "on-primary": "rgba(var(--on-primary-rgb), <alpha-value>)",
            "on-secondary-container": "hsl(var(--era-dbz-hsl) / <alpha-value>)",
            "brand-accent": "hsl(var(--brand-accent) / <alpha-value>)",
            "brand-orange": "hsl(var(--brand-orange) / <alpha-value>)",
            "brand-primary": "hsl(var(--era-db-hsl) / <alpha-value>)",
            "brand-secondary": "hsl(var(--era-dbz-hsl) / <alpha-value>)",
            "brand-destructive": "hsl(var(--era-dbgt-hsl) / <alpha-value>)",
            "brand-success": "hsl(var(--era-dbs-hsl) / <alpha-value>)",
            "brand-magic": "hsl(var(--era-daima-hsl) / <alpha-value>)",
            color: {
                db: "hsl(var(--era-db-hsl) / <alpha-value>)",
                dbz: "hsl(var(--era-dbz-hsl) / <alpha-value>)",
                dbgt: "hsl(var(--era-dbgt-hsl) / <alpha-value>)",
                dbs: "hsl(var(--era-dbs-hsl) / <alpha-value>)",
                daima: "hsl(var(--era-daima-hsl) / <alpha-value>)",
            },
            bg: {
                primary: "var(--bg-primary)",
                secondary: "var(--bg-secondary)",
                tertiary: "var(--bg-tertiary)",
                quaternary: "var(--bg-quaternary)",
            },
            surface: {
                DEFAULT: "var(--md-sys-color-surface)",
                container: "var(--md-sys-color-surface-container)",
                "container-low": "var(--md-sys-color-surface-container-low)",
                "container-high": "var(--md-sys-color-surface-container-high)",
                "container-highest": "var(--md-sys-color-surface-container-highest)",
                variant: "var(--md-sys-color-surface-variant)",
            },
            outline: "var(--md-sys-color-outline)",
            "outline-variant": "var(--md-sys-color-outline-variant)",
            scrim: "var(--md-sys-color-scrim)",
            glass: {
                bg: "var(--glass-bg)",
                border: "var(--glass-border)",
                hover: "var(--glass-hover)",
                strong: "var(--glass-strong)",
            },
                brand: {
                    50: "#ffffff",
                    100: "#f4f4f5",
                    200: "#e4e4e7",
                    300: "#d4d4d8",
                    400: "#a1a1aa",
                    500: "#71717a",
                    600: "#52525b",
                    700: "#3f3f46",
                    800: "#27272a",
                    900: "#18181b",
                    950: "#09090b",
                    DEFAULT: "#ffffff",
                },
                gray: {
                    50: "#f9fafb",
                    100: "#f3f4f6",
                    200: "#e5e7eb",
                    300: "#d1d5db",
                    400: "#9ca3af",
                    500: "#6b7280",
                    600: "#4b5563",
                    700: "#374151",
                    800: "#1f2937",
                    900: "#141419",
                    950: "#0B0B0F",
                    DEFAULT: "#6b7280",
                },
                ui: {
                    background: "#000000",
                    surface: "#0D0D0D",
                    hover: "#141414"
                },
                audienceScore: {
                    300: "#b45d5d",
                    500: "#9d8741",
                    600: "#a0b974",
                    700: "#57a181",
                },
            },
        },
    },
    plugins: [
        typography,
        forms,
        scrollbarHide,
        animate,
        addVariablesForColors,
        function ({ addVariant }: { addVariant: (variant: string, selector: string) => void }) {
            addVariant("firefox", ":-moz-any(&)")
        },
    ],
}
export default config


function addVariablesForColors({ addBase, theme }: { addBase: any; theme: any }) {
    const allColors = flattenColorPalette(theme("colors"))
    // Skip values that already reference a CSS variable (e.g. "hsl(var(--brand-accent) / <alpha-value>)").
    // Re-declaring them under the same --key would shadow the real variable from colors.css
    // with a self-referential, invalid value.
    const newVars = Object.fromEntries(
        Object.entries(allColors)
            .filter(([, val]) => typeof val === "string" && !val.includes("var("))
            .map(([key, val]) => [`--${key}`, val]),
    )

    addBase({
        ":root": newVars,
    })
}
