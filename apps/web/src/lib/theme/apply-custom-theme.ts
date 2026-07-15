import * as React from "react"
import { useThemeSettings } from "./theme-hooks"
import { useAppStore } from "@/lib/store"

function supportsLiquidRefraction(): boolean {
    const brands = (navigator as any).userAgentData?.brands
    if (brands?.some((b: any) => /Chromium/i.test(b.brand))) return true
    const ua = navigator.userAgent
    return /Chrome\/\d{2,}/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
}

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
    const tvMode = useAppStore(state => state.tvMode)

    const isFirstMount = React.useRef(true)

    React.useLayoutEffect(() => {
        const root = document.documentElement.style
        const html = document.documentElement

        const applyDOMChanges = () => {
            const mode = ts.effectiveMode
            html.dataset.mode = mode

            // 1. Efectos por modo — Clásico: glass sutil (tokens de [data-mode="classic"]),
            // sin liquid ni gradiente. Por Era: según toggles.
            const flatOn = tvMode || (mode === "era" && ts.themeEnableBlurringEffects === false)
            const liquidOn =
                (mode === "era" && ts.themeEnableLiquidGlass) &&
                supportsLiquidRefraction()
            const sidebarGradientOn = mode === "era" && ts.themeEnableSidebarGradient === true

            if (flatOn) html.dataset.flat = "true"
            else delete html.dataset.flat

            if (liquidOn && !flatOn) html.dataset.liquid = "true"
            else delete html.dataset.liquid

            if (sidebarGradientOn) html.dataset.sidebarGradient = "true"
            else delete html.dataset.sidebarGradient

            if (ts.themeEnableCinematicGrain) html.dataset.grain = "true"
            else delete html.dataset.grain

            // 2. Paleta — Clásico es paleta fija (los colores custom se
            // ignoran); Por Era aplica la era elegida + overrides del preset Personalizado.
            const eraOn = mode === "era" && ts.hasEraTheme
            const bgOn = mode === "era" && ts.enableColorSettings && ts.hasCustomBackground
            const accentOn = mode === "era" && ts.enableColorSettings && ts.hasCustomAccentColor

            if (mode === "classic") {
                html.dataset.theme = "classic"
            }

            if (eraOn) {
                html.dataset.theme = ts.themeEra

                // Universe usa la paleta curada de todas las series (rosa/rojo/
                // verde/azul/violeta) definida en colors.css — no se extraen
                // colores dominantes de imágenes. Se limpian posibles inline
                // overrides previos para que gane la cascada CSS.
                root.removeProperty("--glow-color-1")
                root.removeProperty("--glow-color-2")
                root.removeProperty("--glow-color-3")
                root.removeProperty("--glow-color-4")
                root.removeProperty("--glow-color-5")
            } else {
                if (mode === "era") delete html.dataset.theme
                root.removeProperty("--glow-color-1")
                root.removeProperty("--glow-color-2")
                root.removeProperty("--glow-color-3")
                root.removeProperty("--glow-color-4")
                root.removeProperty("--glow-color-5")
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
        }

        if (isFirstMount.current || !document.startViewTransition) {
            applyDOMChanges()
            isFirstMount.current = false
        } else {
            const transition = document.startViewTransition(() => {
                applyDOMChanges()
            })
            // Interrumpida por otra transición = final normal; sin catch queda
            // como unhandled rejection en consola (InvalidStateError).
            transition.finished.catch(() => {})
            transition.ready.catch(() => {})
        }

        return () => {
            delete html.dataset.mode
            delete html.dataset.flat
            delete html.dataset.liquid
            delete html.dataset.sidebarGradient
            delete html.dataset.theme
            delete html.dataset.grain
            root.removeProperty("--bg-primary")
            root.removeProperty("--brand-accent")
            root.removeProperty("--brand-accent-hex")
            root.removeProperty("--glow-color-1")
            root.removeProperty("--glow-color-2")
            root.removeProperty("--glow-color-3")
            root.removeProperty("--glow-color-4")
            root.removeProperty("--glow-color-5")
        }
    }, [
        ts.effectiveMode,
        ts.themeEra,
        ts.themeEnableBlurringEffects,
        ts.themeEnableLiquidGlass,
        ts.themeEnableSidebarGradient,
        ts.themeEnableCinematicGrain,
        ts.enableColorSettings,
        ts.hasEraTheme,
        ts.hasCustomBackground,
        ts.hasCustomAccentColor,
        ts.backgroundColor,
        ts.accentColor,
        tvMode,
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
