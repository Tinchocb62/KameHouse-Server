export interface MediaForSeriesId {
    tmdbId?: number | null
    titleRomaji?: string | null
    titleEnglish?: string | null
    titleOriginal?: string | null
    titleSpanish?: string | null
}

export const TMDB_SERIES_MAP: Record<number, string> = {
    12609: "dragon_ball",
    12971: "dragon_ball_z",
    12697: "dragon_ball_gt",
    61709: "dragon_ball_kai",
    42705: "dragon_ball_kai",
    62715: "dragon_ball_super",
    236994: "dragon_ball_daima",
}

export const DRAGON_BALL_SERIES_ORDER: Record<string, number> = {
    "dragon_ball": 1,
    "dragon_ball_z": 2,
    "dragon_ball_gt": 3,
    "dragon_ball_kai": 4,
    "dragon_ball_super": 5,
    "dragon_ball_daima": 6,
}

export const DRAGON_BALL_SERIES_INFO: Record<string, {
    year: number
    title: string
    episodes: number
    description: string
    poster: string
    banner: string
}> = {
    "dragon_ball": {
        year: 1986,
        title: "Dragon Ball",
        episodes: 153,
        description: "Las legendarias aventuras de Son Goku desde su niñez, entrenando con el Maestro Roshi y buscando las siete Esferas del Dragón.",
        poster: "",
        banner: "",
    },
    "dragon_ball_z": {
        year: 1989,
        title: "Dragon Ball Z",
        episodes: 291,
        description: "Goku descubre sus orígenes Saiyajin y junto a los Guerreros Z defiende la Tierra contra amenazas cósmicas como Vegeta, Freezer, Cell y Majin Buu.",
        poster: "",
        banner: "",
    },
    "dragon_ball_gt": {
        year: 1996,
        title: "Dragon Ball GT",
        episodes: 64,
        description: "Tras convertirse de nuevo en niño debido a las Esferas del Dragón de Estrella Negra, Goku viaja por el cosmos junto a Trunks y Pan.",
        poster: "",
        banner: "",
    },
    "dragon_ball_kai": {
        year: 2009,
        title: "Dragon Ball Kai",
        episodes: 167,
        description: "Versión remasterizada y sin relleno de Dragon Ball Z, fiel al manga original de Akira Toriyama con sonido y animación digital renovada.",
        poster: "",
        banner: "",
    },
    "dragon_ball_super": {
        year: 2015,
        title: "Dragon Ball Super",
        episodes: 131,
        description: "Tras la derrota de Majin Buu, Goku y sus amigos despiertan los poderes de los dioses enfrentando a Bills, Goku Black y el Torneo del Poder.",
        poster: "",
        banner: "",
    },
    "dragon_ball_daima": {
        year: 2024,
        title: "Dragon Ball Daima",
        episodes: 20,
        description: "Debido a una conspiración en el Reino Demonio, Goku y sus amigos se transforman en niños y viajan a un mundo desconocido para revertir el hechizo.",
        poster: "",
        banner: "",
    },
}

/**
 * Maps a media object to a Dragon Ball series ID string.
 * Used for spine config, lore, and character images.
 */
export const getSeriesIdFromMedia = (media: MediaForSeriesId | null | undefined, fallbackTitle?: string): string => {
    if (!media && !fallbackTitle) return ""
    const rawId = media?.tmdbId || 0
    const tmdbId = rawId >= 1000000 ? rawId - 1000000 : rawId

    if (tmdbId > 0 && TMDB_SERIES_MAP[tmdbId]) return TMDB_SERIES_MAP[tmdbId]

    const allTitles = [
        media?.titleSpanish,
        media?.titleEnglish,
        media?.titleRomaji,
        media?.titleOriginal,
        fallbackTitle,
    ].filter(Boolean).join(" ").toLowerCase()

    if (allTitles.includes("daima")) return "dragon_ball_daima"
    if (allTitles.includes("super") || allTitles.includes("dbs")) return "dragon_ball_super"
    if (allTitles.includes("gt") || allTitles.includes("dbgt")) return "dragon_ball_gt"
    if (allTitles.includes("kai") || allTitles.includes("dbkai")) return "dragon_ball_kai"
    if (allTitles.includes("dbz") || allTitles.includes("dragon ball z") || /\bz\b/.test(allTitles)) return "dragon_ball_z"
    if (allTitles.includes("dragon ball") || allTitles.includes("dragonball") || allTitles.includes("db")) return "dragon_ball"

    return ""
}

/**
 * Resolves the release year for a Dragon Ball series.
 * Uses canonical database info first, then hardcoded values for known series, then API data.
 */
export const getSeriesYear = (title: string, mediaYear?: number, startDate?: string, seriesId?: string): number | string => {
    if (seriesId && DRAGON_BALL_SERIES_INFO[seriesId]) {
        return DRAGON_BALL_SERIES_INFO[seriesId].year
    }

    const titleLower = title.toLowerCase()

    if (titleLower.includes('daima')) return 2024
    if (titleLower.includes('super')) return 2015
    if (titleLower.includes('kai') || titleLower.includes('seldion')) return 2009
    if (titleLower.includes('gt')) return 1996
    if (titleLower.includes('dbz') || (titleLower.includes('dragon ball') && titleLower.match(/\bz\b/))) return 1989
    if (titleLower.includes('dragon ball') || titleLower.includes('original')) {
        if (!titleLower.includes('daima') && !titleLower.includes('super') && !titleLower.includes('gt') && !titleLower.includes('kai') && !titleLower.match(/\bz\b/)) {
            return 1986
        }
    }

    if (startDate) {
        const match = startDate.match(/^(\d{4})/)
        if (match) {
            const parsed = parseInt(match[1], 10)
            if (!isNaN(parsed) && parsed > 1900) {
                return parsed
            }
        }
    }

    if (mediaYear && mediaYear > 0) {
        return mediaYear
    }

    return 'N/A'
}
