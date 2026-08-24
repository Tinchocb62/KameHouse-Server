import type { BackgroundMusicTrack } from "@/lib/store"
import { getServerBaseUrl } from "@/api/client/server-url"

export type SeriesEraKey = "db" | "dbz" | "dbkai" | "dbgt" | "dbs" | "dbdaima"

export interface SeriesSoundtrackInfo {
    id: SeriesEraKey
    name: string
    shortName: string
    color: string
    tmdbIds: number[]
    keywords: string[]
    defaultTracks: {
        title: string
        file: string
    }[]
}

export const SERIES_SOUNDTRACKS: Record<SeriesEraKey, SeriesSoundtrackInfo> = {
    db: {
        id: "db",
        name: "Dragon Ball (Original)",
        shortName: "Dragon Ball",
        color: "#eab308", // Yellow
        tmdbIds: [12609, 1033499, 1033500, 1033513, 116776, 39145, 39144, 39148],
        keywords: ["dragon ball", "makafushigi", "kikuchi", "romantic ageru yo", "mezase tenkaichi"],
        defaultTracks: [
            { title: "Makafushigi Adventure!", file: "/sounds/music/Dragon ball dvd.m4a" },
            { title: "Dragon Ball Classic BGM", file: "/sounds/music/Dragon ball dvd 2.m4a" },
        ],
    },
    dbz: {
        id: "dbz",
        name: "Dragon Ball Z",
        shortName: "Dragon Ball Z",
        color: "#f97316", // Orange
        tmdbIds: [12971, 1015448, 1015449, 1015450, 1015451, 1015452, 1015453, 1015454, 1015455, 1015456, 1015457, 1015458, 1012704, 1015459, 1015460, 28609, 39100, 39101, 39102, 24752, 39103, 39104, 34433, 39105, 44251, 39106, 39107, 39108, 126963, 303857, 39323, 39324, 38594, 120475, 55127],
        keywords: ["dragon ball z", "dbz", "cha-la", "chala", "head-cha-la", "we gotta power", "faulconer", "kikuchi", "solid state", "tamashii", "meteor"],
        defaultTracks: [
            { title: "The Meteor (DBZ OST)", file: "/sounds/music/the-meteor.m4a" },
            { title: "Cha-La Head-Cha-La", file: "/sounds/music/Dragon ball dvd 2.m4a" },
        ],
    },
    dbkai: {
        id: "dbkai",
        name: "Dragon Ball Kai",
        shortName: "DBZ Kai",
        color: "#06b6d4", // Cyan
        tmdbIds: [61709, 1061709, 60572, 1060572, 6033, 20635],
        keywords: ["kai", "dbkai", "dragon soul", "kuu-zen-zetsu-go", "sumitomo", "break care break"],
        defaultTracks: [
            { title: "Dragon Soul (Kai)", file: "/sounds/music/the-meteor.m4a" },
        ],
    },
    dbgt: {
        id: "dbgt",
        name: "Dragon Ball GT",
        shortName: "Dragon Ball GT",
        color: "#ec4899", // Pink/Magenta
        tmdbIds: [12697, 1012697, 1039149, 18095],
        keywords: ["dragon ball gt", "dbgt", "gt", "dan dan", "hitori ja nai", "tokunaga", "blue velvet", "don't you see"],
        defaultTracks: [
            { title: "Dan Dan Kokoro Hikareteku", file: "/sounds/music/Dragon ball dvd.m4a" },
        ],
    },
    dbs: {
        id: "dbs",
        name: "Dragon Ball Super",
        shortName: "Dragon Ball Super",
        color: "#3b82f6", // Blue
        tmdbIds: [62715, 1062715, 503314, 1503314, 610150, 1610150],
        keywords: ["dragon ball super", "dbs", "super", "chouzetsu", "limit break", "kachi daze", "ultimate battle", "sumitomo", "genki dama"],
        defaultTracks: [
            { title: "Limit Break x Survivor", file: "/sounds/music/the-meteor.m4a" },
        ],
    },
    dbdaima: {
        id: "dbdaima",
        name: "Dragon Ball Daima",
        shortName: "Dragon Ball Daima",
        color: "#a855f7", // Purple
        tmdbIds: [236994, 1236994],
        keywords: ["daima", "dbdaima", "jaka jaan", "zedd", "nakama"],
        defaultTracks: [
            { title: "Jaka Jaan (Daima Theme)", file: "/sounds/music/the-meteor.m4a" },
        ],
    },
}

/**
 * Normaliza un identificador de serie, TMDB ID o string de Era a una clave de serie canónica.
 */
export function getSeriesEraKey(seriesIdOrEra: string | number | null | undefined): SeriesEraKey | null {
    if (!seriesIdOrEra) return null

    const str = String(seriesIdOrEra).toLowerCase().trim()
    const num = Number(seriesIdOrEra)

    // Check direct era keys
    if (str === "db" || str === "dragonball") return "db"
    if (str === "dbz" || str === "dragonballz") return "dbz"
    if (str === "dbkai" || str === "kai") return "dbkai"
    if (str === "dbgt" || str === "gt" || str === "dragonballgt") return "dbgt"
    if (str === "dbs" || str === "super" || str === "dragonballsuper") return "dbs"
    if (str === "dbdaima" || str === "daima" || str === "dragonballdaima") return "dbdaima"

    // Check TMDB ID match
    if (!isNaN(num)) {
        for (const [key, info] of Object.entries(SERIES_SOUNDTRACKS) as [SeriesEraKey, SeriesSoundtrackInfo][]) {
            if (info.tmdbIds.includes(num)) {
                return key
            }
        }
    }

    // Title / substring matching
    if (str.includes("daima")) return "dbdaima"
    if (str.includes("super")) return "dbs"
    if (str.includes("gt")) return "dbgt"
    if (str.includes("kai")) return "dbkai"
    if (str.includes("dbz") || str.includes("dragon ball z")) return "dbz"
    if (str.includes("dragon ball")) return "db"

    return null
}

export interface ResolvedSoundtrackTrack {
    title: string
    url: string
    seriesKey: SeriesEraKey
    isLocal: boolean
}

/**
 * Resuelve la lista de reproducción para una serie específica, priorizando pistas
 * escaneadas localmente por el usuario que contengan palabras clave de la serie.
 */
export function resolveSeriesSoundtrackPlaylist(
    seriesIdOrEra: string | number | null | undefined,
    localTracks: BackgroundMusicTrack[] = [],
    bgMusicDir?: string
): ResolvedSoundtrackTrack[] {
    const eraKey = getSeriesEraKey(seriesIdOrEra)
    if (!eraKey) return []

    const info = SERIES_SOUNDTRACKS[eraKey]
    const results: ResolvedSoundtrackTrack[] = []

    // 1. Filtrar pistas locales que coincidan con las palabras clave de la serie
    if (bgMusicDir && localTracks.length > 0) {
        const base = getServerBaseUrl() || window.location.origin
        const matchingLocal = localTracks.filter(track => {
            const fileName = track.file.toLowerCase()
            const name = (track.name || "").toLowerCase()
            return info.keywords.some(kw => fileName.includes(kw) || name.includes(kw))
        })

        for (const track of matchingLocal) {
            const params = new URLSearchParams({ dir: bgMusicDir, file: track.file })
            results.push({
                title: track.name || track.file.replace(/\.[^/.]+$/, ""),
                url: `${base}/api/v1/music/stream?${params.toString()}`,
                seriesKey: eraKey,
                isLocal: true,
            })
        }
    }

    // 2. Si no hay pistas locales específicas, usar el repertorio curado por defecto
    if (results.length === 0) {
        for (const defaultTrack of info.defaultTracks) {
            results.push({
                title: defaultTrack.title,
                url: defaultTrack.file,
                seriesKey: eraKey,
                isLocal: false,
            })
        }
    }

    return results
}
