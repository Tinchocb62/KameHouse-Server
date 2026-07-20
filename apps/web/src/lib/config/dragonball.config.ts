import dbTitles from './db_titles.json'
import { DRAGON_BALL_SERIES, DRAGON_BALL_SAGAS, SagaDefinition } from './dragonball_sagas'
import { TMDB_TO_LORE_MOVIE_MAP, DRAGON_BALL_MOVIES_LORE } from './dragonball_movies_lore'

export * from "./dragonball_sagas"
export * from "./dragonball_movies_lore"

// ─── Resolución de Sagas ─────────────────────────────────────────────────────

export interface MediaForSagaResolution {
    tmdbId?: number | null
    titleRomaji?: string | null
    titleEnglish?: string | null
    titleOriginal?: string | null
    format?: string | null
}

/**
 * Resolves which Dragon Ball saga definitions apply to a given media entry.
 * Priority: TMDB ID → title substring matching → fallback to Original DB.
 * Returns empty array for movies and non-Dragon Ball series.
 */
export function resolveSeriesSagas(media: MediaForSagaResolution | null | undefined): SagaDefinition[] {
    if (!media) return []

    const tmdbId = media.tmdbId || 0
    const title = media.titleRomaji || media.titleEnglish || media.titleOriginal || ""
    const searchTitle = title.toLowerCase().replace(/\s+/g, "")

    const isMovie = media.format === "MOVIE"
        || searchTitle.includes("movie")
        || searchTitle.includes("pelicula")
        || searchTitle.includes("aventura")

    if (isMovie) return []

    // 1. Try exact match by TMDB ID
    if (tmdbId && DRAGON_BALL_SAGAS[tmdbId]) {
        return DRAGON_BALL_SAGAS[tmdbId]
    }

    // 2. Fallback: match by title substring
    let resolved: SagaDefinition[] = []

    if (searchTitle.includes("dragonballz") || searchTitle === "dbz") {
        resolved = DRAGON_BALL_SAGAS[DRAGON_BALL_SERIES.Z]
    } else if (searchTitle.includes("dragonballgt")) {
        resolved = DRAGON_BALL_SAGAS[DRAGON_BALL_SERIES.GT]
    } else if (searchTitle.includes("dragonballsuper")) {
        resolved = DRAGON_BALL_SAGAS[DRAGON_BALL_SERIES.SUPER]
    } else if (searchTitle.includes("dragonballdaima")) {
        resolved = DRAGON_BALL_SAGAS[DRAGON_BALL_SERIES.DAIMA]
    } else if (searchTitle === "dragonball") {
        resolved = DRAGON_BALL_SAGAS[DRAGON_BALL_SERIES.ORIGINAL]
    }

    // 3. Final safety net: if it contains "dragonball" but no specific suffix,
    //    default to Original DB.
    if ((!resolved || resolved.length === 0) && searchTitle.includes("dragonball")) {
        resolved = DRAGON_BALL_SAGAS[DRAGON_BALL_SERIES.ORIGINAL]
    }

    return resolved || []
}

/**
 * Gets the localized Latin Spanish title for a Dragon Ball episode.
 */
export function getDragonBallSpanishTitle(tmdbId: number | undefined | null, episodeNum: number): string | null {
    if (!tmdbId) return null;
    
    let seriesKey: keyof typeof dbTitles | null = null;
    
    switch (tmdbId) {
        case DRAGON_BALL_SERIES.ORIGINAL: seriesKey = "original"; break;
        case DRAGON_BALL_SERIES.Z: seriesKey = "z"; break;
        case DRAGON_BALL_SERIES.GT: seriesKey = "gt"; break;
        case DRAGON_BALL_SERIES.SUPER: seriesKey = "super"; break;
        case DRAGON_BALL_SERIES.DAIMA: seriesKey = "daima"; break;
    }
    
    if (!seriesKey) return null;
    
    const titlesArray = dbTitles[seriesKey] as { num: number; title: string }[] | undefined;
    if (!titlesArray || !Array.isArray(titlesArray)) return null;
    
    const ep = titlesArray.find((t) => t.num === episodeNum);
    return ep ? ep.title : null;
}

/**
 * Whether a TMDB ID belongs to the Dragon Ball franchise (series or movie).
 * Used to gate Dragon Ball-only requests (e.g. the character lore endpoint).
 */
export function isDragonBallTmdbId(tmdbId: number | undefined | null): boolean {
    if (!tmdbId) return false;
    return tmdbId in DRAGON_BALL_SAGAS || tmdbId in TMDB_TO_LORE_MOVIE_MAP;
}

/**
 * Maps a Dragon Ball series TMDB ID to its era theme token, matching the
 * `[data-theme="era-*"]` selectors defined in styles/tokens/colors.css.
 * Returns null for non-Dragon Ball media (caller should fall back to the
 * default brand theme).
 */
export function getSeriesEraTheme(tmdbId: number | undefined | null): string | null {
    if (!tmdbId) return null

    switch (tmdbId) {
        case DRAGON_BALL_SERIES.ORIGINAL: return "era-db"
        case DRAGON_BALL_SERIES.Z: return "era-dbz"
        case DRAGON_BALL_SERIES.GT: return "era-dbgt"
        case DRAGON_BALL_SERIES.SUPER: return "era-dbs"
        case DRAGON_BALL_SERIES.DAIMA: return "era-daima"
    }

    if (tmdbId in TMDB_TO_LORE_MOVIE_MAP) {
        const loreId = TMDB_TO_LORE_MOVIE_MAP[tmdbId as number];
        const movieLore = DRAGON_BALL_MOVIES_LORE[loreId];
        if (movieLore?.seriesContext) {
            switch (movieLore.seriesContext) {
                case "original": return "era-db";
                case "z": return "era-dbz";
                case "gt": return "era-dbgt";
                case "super": return "era-dbs";
                case "daima": return "era-daima";
            }
        }
    }

    return null
}

