import { describe, expect, it } from "vitest"
import { resolveBackdropTreatment } from "./media-hero"

/**
 * Settings → Apariencia → Página de Detalle → Tipo de Banner.
 *
 * The "-when-unavailable" branch can't be exercised against a library whose
 * media all have banner art, so the full matrix is pinned here.
 */
describe("resolveBackdropTreatment", () => {
    it("leaves the backdrop alone by default", () => {
        expect(resolveBackdropTreatment("default", true)).toBe("show")
        expect(resolveBackdropTreatment("default", false)).toBe("show")
    })

    it("applies the unconditional treatments regardless of banner art", () => {
        expect(resolveBackdropTreatment("blur", true)).toBe("blur")
        expect(resolveBackdropTreatment("blur", false)).toBe("blur")
        expect(resolveBackdropTreatment("dim", true)).toBe("dim")
        expect(resolveBackdropTreatment("dim", false)).toBe("dim")
        expect(resolveBackdropTreatment("hide", true)).toBe("hide")
        expect(resolveBackdropTreatment("hide", false)).toBe("hide")
    })

    it("only treats media that lack banner art for the -when-unavailable variants", () => {
        // With real banner art, these must be no-ops.
        expect(resolveBackdropTreatment("blur-when-unavailable", true)).toBe("show")
        expect(resolveBackdropTreatment("dim-when-unavailable", true)).toBe("show")
        expect(resolveBackdropTreatment("hide-when-unavailable", true)).toBe("show")

        // Without it, the fallback image gets the treatment.
        expect(resolveBackdropTreatment("blur-when-unavailable", false)).toBe("blur")
        expect(resolveBackdropTreatment("dim-when-unavailable", false)).toBe("dim")
        expect(resolveBackdropTreatment("hide-when-unavailable", false)).toBe("hide")
    })

    it("falls back to showing the backdrop for unknown or empty values", () => {
        // Legacy/unset values must not blank out someone's hero.
        expect(resolveBackdropTreatment("", true)).toBe("show")
        expect(resolveBackdropTreatment("garbage", false)).toBe("show")
    })
})
