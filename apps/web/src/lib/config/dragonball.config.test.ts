import { describe, it, expect } from "vitest"
import { resolveSeriesSagas, DRAGON_BALL_SERIES } from "./dragonball.config"

describe("resolveSeriesSagas", () => {
    it("should resolve by TMDB ID", () => {
        const result = resolveSeriesSagas({ tmdbId: DRAGON_BALL_SERIES.Z })
        expect(result).toBeDefined()
        expect(result.length).toBeGreaterThan(0)
        expect(result[0].title).toBe("Saga Saiyajin")
    })

    it("should resolve by title (DBZ)", () => {
        const result = resolveSeriesSagas({ titleRomaji: "Dragon Ball Z" })
        expect(result[0].title).toBe("Saga Saiyajin")
    })

    it("should resolve by title (DB Super)", () => {
        const result = resolveSeriesSagas({ titleEnglish: "Dragon Ball Super" })
        expect(result[0].title).toBe("Saga La Batalla de los Dioses")
    })

    it("should fallback to Original DB for 'Dragon Ball'", () => {
        const result = resolveSeriesSagas({ titleRomaji: "Dragon Ball" })
        expect(result[0].title).toBe("Saga del Emperador Pilaf")
    })

    it("should return empty for non-Dragon Ball series", () => {
        const result = resolveSeriesSagas({ titleRomaji: "Naruto" })
        expect(result).toEqual([])
    })

    it("should return empty for movies", () => {
        const result = resolveSeriesSagas({ 
            titleRomaji: "Dragon Ball Z Movie 01",
            format: "MOVIE"
        })
        expect(result).toEqual([])
    })

    it("should handle null/undefined", () => {
        expect(resolveSeriesSagas(null)).toEqual([])
        expect(resolveSeriesSagas(undefined)).toEqual([])
    })
})
