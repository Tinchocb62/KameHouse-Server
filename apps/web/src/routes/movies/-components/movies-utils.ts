import type { Models_LibraryMedia } from "@/api/generated/types"
import { isTmdbId } from "@/lib/helpers/type-guards"
import { EraTab } from "../-MovieCard"

export type SortOption = "year_asc" | "year_desc" | "alpha"

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "year_asc", label: "Año: Antiguos" },
    { value: "year_desc", label: "Año: Recientes" },
    { value: "alpha", label: "Alfabético" },
]

export const specialsTmdbIds = new Set([39323, 39324, 38594, 47734, 15461, 1259215, 109963])
export const classicTmdbIds = new Set([39144, 33499, 39145, 116776, 33513, 39148])
export const zTmdbIds = new Set([28609, 15448, 39100, 39101, 39102, 24752, 15452, 39103, 39104, 15454, 34433, 39105, 44251, 39106, 39107, 39108, 177572, 120475, 1120475])
export const gtTmdbIds = new Set([18095, 39149])
export const superTmdbIds = new Set([126963, 303857, 503314, 610150])
export const zKeywords = ["z ", " z:", "kai", "改", "freezer", "frieza", "cooler", "androide", "android", "bojack", "janemba", "tapion", "bardock", "trunks", "broly", "slug", "turles", "dead zone", "fusion", "bio-broly", "gohan", "vegeta"]

export function getEntryEra(entry: { media?: Models_LibraryMedia | null; mediaId?: number | null }): EraTab {
    const media = entry.media
    const tmdbId = media?.tmdbId || (entry.mediaId && isTmdbId(entry.mediaId) ? entry.mediaId : 0) || 0
    const rawTmdbId = tmdbId >= 1000000 ? tmdbId - 1000000 : tmdbId

    if (rawTmdbId > 0) {
        if (specialsTmdbIds.has(rawTmdbId)) return "Especiales y OVAs"
        if (classicTmdbIds.has(rawTmdbId)) return "Dragon Ball"
        if (zTmdbIds.has(rawTmdbId)) return "Dragon Ball Z"
        if (gtTmdbIds.has(rawTmdbId)) return "Dragon Ball GT"
        if (superTmdbIds.has(rawTmdbId)) return "Dragon Ball Super"
    }

    if (!media) return "Especiales y OVAs"

    const allTitles = [media.titleRomaji, media.titleEnglish, media.titleOriginal, media.titleSpanish]
        .filter(Boolean).join(" ").toLowerCase()
    if (!allTitles.includes("dragon ball")) return "Especiales y OVAs"
    if (allTitles.includes("special") || allTitles.includes("especial") || allTitles.includes("ova") || media.format === "SPECIAL" || media.format === "OVA") return "Especiales y OVAs"
    const hasSuper = allTitles.includes("dragon ball super") || 
        allTitles.includes("db super") || 
        allTitles.includes("dbs") ||
        (allTitles.includes("dragon ball") && (allTitles.includes("super hero") || allTitles.includes("superhero") || allTitles.includes("super-hero")))
    if (hasSuper) return "Dragon Ball Super"
    if (allTitles.includes(" gt") || allTitles.includes("gt ")) return "Dragon Ball GT"
    if (zKeywords.some(k => allTitles.includes(k))) return "Dragon Ball Z"
    return "Dragon Ball"
}

export function getReleaseDateTimestamp(entry: { media?: Models_LibraryMedia | null; mediaId?: number | null }): number {
    const media = entry.media
    if (!media) return 0
    if (media.startDate) {
        const parsed = Date.parse(media.startDate)
        if (!isNaN(parsed) && parsed > 0) {
            return parsed
        }
    }
    if (media.year) {
        return new Date(media.year, 0, 1).getTime()
    }
    return 0
}


