import { useThemeSettings } from "@/lib/theme/theme-hooks"
import { getLargeResImage } from "@/lib/helpers/images"

/**
 * Non-"dynamic" alternatives to the auto-rotating MoviesHero, driven by
 * Settings → Apariencia → Pantalla de Biblioteca → Tipo de Banner.
 * "dynamic" (the default) keeps using <MoviesHero /> directly — this
 * component only renders for custom/solid/gradient/none.
 */
export function LibraryBanner() {
    const ts = useThemeSettings()
    const type = ts.themeLibraryScreenBannerType
    const opacity = (ts.themeLibraryScreenCustomBannerOpacity ?? 10) / 100

    if (type === "none") return null

    if (type === "custom" && ts.themeLibraryScreenCustomBannerImage) {
        return (
            <section className="relative w-full h-[38vh] min-h-[280px] overflow-hidden">
                <img
                    src={getLargeResImage(ts.themeLibraryScreenCustomBannerImage)}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        objectPosition: ts.themeLibraryScreenCustomBannerPosition || "50% 50%",
                        opacity,
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/40 to-transparent" />
            </section>
        )
    }

    if (type === "solid") {
        return (
            <section
                className="relative w-full h-24"
                style={{ backgroundColor: `hsl(var(--brand-accent) / 0.12)` }}
            />
        )
    }

    if (type === "gradient") {
        return (
            <section
                className="relative w-full h-40"
                style={{ background: "linear-gradient(180deg, hsl(var(--brand-accent) / 0.20) 0%, transparent 100%)" }}
            />
        )
    }

    return null
}
