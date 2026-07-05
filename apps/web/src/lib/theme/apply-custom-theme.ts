import * as React from "react"
import { useThemeSettings } from "./theme-hooks"
import { useDominantColors } from "@/hooks/use-dominant-colors"

/** Converts a "#rrggbb" hex color into the "H S% L%" triplet format used by
 *  this design system's HSL custom properties (consumed as hsl(var(--x))). */
export function hexToHslTriplet(hex: string): string | null {
    const clean = hex.replace("#", "").trim()
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null

    const r = parseInt(clean.slice(0, 2), 16) / 255
    const g = parseInt(clean.slice(2, 4), 16) / 255
    const b = parseInt(clean.slice(4, 6), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
        }
        h /= 6
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/**
 * Applies the user's custom color palette (Settings → Apariencia → Paleta de
 * Colores) as CSS custom property overrides on the document root, when
 * enabled. Falls back to the design system defaults otherwise.
 */
export function useApplyCustomTheme() {
    const ts = useThemeSettings()
    const dominantColors = useDominantColors(
        ts.themeEra === "era-universe" ? "/casa-kame-de-dragon-ball-3963.webp" : undefined,
        5
    )

    React.useEffect(() => {
        const root = document.documentElement.style
        const html = document.documentElement

        // 1. Flat mode vs Vidrio
        if (ts.themeEnableBlurringEffects === false) {
            html.dataset.flat = "true"
        } else {
            delete html.dataset.flat
        }

        // 2. Sidebar gradient
        if (ts.themeEnableSidebarGradient === true) {
            html.dataset.sidebarGradient = "true"
        } else {
            delete html.dataset.sidebarGradient
        }

        // 3. Era, fondo y acento personalizados — cada uno gated de forma
        // independiente por enableColorSettings + su propio campo no vacío,
        // para permitir activarlos por separado en la UI.
        const eraOn = ts.enableColorSettings && ts.hasEraTheme
        const bgOn = ts.enableColorSettings && ts.hasCustomBackground
        const accentOn = ts.enableColorSettings && ts.hasCustomAccentColor

        if (eraOn) {
            html.dataset.theme = ts.themeEra
            
            if (ts.themeEra === "era-universe" && dominantColors.length >= 5) {
                const [c1, c2, c3, c4, c5] = dominantColors
                root.setProperty("--glow-color-1", c1)
                root.setProperty("--glow-color-2", c2)
                root.setProperty("--glow-color-3", c3)
                root.setProperty("--glow-color-4", c4)
                root.setProperty("--glow-color-5", c5)
                root.setProperty("--sidebar-active-gradient", `linear-gradient(135deg, ${c1} 0%, ${c2} 25%, ${c3} 50%, ${c4} 75%, ${c5} 100%)`)
                root.setProperty("--sidebar-active-bg-gradient", `linear-gradient(135deg, color-mix(in srgb, ${c1} 12%, transparent) 0%, color-mix(in srgb, ${c2} 12%, transparent) 25%, color-mix(in srgb, ${c3} 12%, transparent) 50%, color-mix(in srgb, ${c4} 12%, transparent) 75%, color-mix(in srgb, ${c5} 12%, transparent) 100%)`)
            } else if (ts.themeEra !== "era-universe") {
                root.removeProperty("--glow-color-1")
                root.removeProperty("--glow-color-2")
                root.removeProperty("--glow-color-3")
                root.removeProperty("--glow-color-4")
                root.removeProperty("--glow-color-5")
                root.removeProperty("--sidebar-active-gradient")
                root.removeProperty("--sidebar-active-bg-gradient")
            }
        } else {
            delete html.dataset.theme
            root.removeProperty("--glow-color-1")
            root.removeProperty("--glow-color-2")
            root.removeProperty("--glow-color-3")
            root.removeProperty("--glow-color-4")
            root.removeProperty("--glow-color-5")
            root.removeProperty("--sidebar-active-gradient")
            root.removeProperty("--sidebar-active-bg-gradient")
        }

        if (bgOn) {
            root.setProperty("--bg-primary", ts.backgroundColor)
        } else {
            root.removeProperty("--bg-primary")
        }

        if (accentOn) {
            const hsl = hexToHslTriplet(ts.accentColor)
            if (hsl) {
                root.setProperty("--brand-accent", hsl)
                root.setProperty("--brand-accent-hex", ts.accentColor)
            }
        } else {
            root.removeProperty("--brand-accent")
            root.removeProperty("--brand-accent-hex")
        }

        return () => {
            delete html.dataset.flat
            delete html.dataset.sidebarGradient
            delete html.dataset.theme
            root.removeProperty("--bg-primary")
            root.removeProperty("--brand-accent")
            root.removeProperty("--brand-accent-hex")
            root.removeProperty("--glow-color-1")
            root.removeProperty("--glow-color-2")
            root.removeProperty("--glow-color-3")
            root.removeProperty("--glow-color-4")
            root.removeProperty("--glow-color-5")
            root.removeProperty("--sidebar-active-gradient")
            root.removeProperty("--sidebar-active-bg-gradient")
        }
    }, [
        ts.themeEra,
        ts.themeEnableBlurringEffects,
        ts.themeEnableSidebarGradient,
        ts.enableColorSettings,
        ts.hasEraTheme,
        ts.hasCustomBackground,
        ts.hasCustomAccentColor,
        ts.backgroundColor,
        ts.accentColor,
        dominantColors.join(","), // add colors to dependency array
    ])
}

/** Strips constructs that could exfiltrate data or break out of the <style>
 *  context from user-provided custom CSS: @import rules and javascript: URLs. */
export function sanitizeCustomCss(css: string): string {
    return css
        .slice(0, 20000)
        .replace(/@import[^;]*;?/gi, "")
        .replace(/url\(\s*["']?\s*javascript:[^)]*\)/gi, "url()")
}

/**
 * Renders the user's custom global CSS (Settings → Apariencia → CSS
 * Personalizado) as a live <style> tag. Mount once near the app root.
 */
export function CustomThemeStyles() {
    const ts = useThemeSettings()
    const css = [ts.themeCustomCSS, ts.themeMobileCustomCSS].filter(Boolean).join("\n\n")
    if (!css) return null
    return React.createElement("style", { id: "kamehouse-custom-css" }, sanitizeCustomCss(css))
}
