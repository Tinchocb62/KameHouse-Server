import type { SwimlaneItem } from "./swimlane"

// Definition of the 6 canonical Dragon Ball eras in chronological order
export const ERAS = [
    { id: "db", title: "Dragon Ball", subtitle: "Dragon Ball (Original)", year: 1986, tag: "Original", kanji: "亀", tagline: "La Gran Aventura Comienza", defaultSaga: "pilaf" },
    { id: "dbz", title: "Dragon Ball Z", subtitle: "Dragon Ball Z", year: 1989, tag: "Z", kanji: "悟", tagline: "La Leyenda de los Guerreros Z", defaultSaga: "saiyajin" },
    { id: "dbgt", title: "Dragon Ball GT", subtitle: "Dragon Ball GT", year: 1996, tag: "GT", kanji: "星", tagline: "El Gran Viaje por el Cosmos", defaultSaga: "black-star" },
    { id: "dbkai", title: "Dragon Ball Kai", subtitle: "Dragon Ball Z Kai", year: 2009, tag: "Kai", kanji: "改", tagline: "Remasterizado Sin Relleno", defaultSaga: "saiyajin" },
    { id: "dbs", title: "Dragon Ball Super", subtitle: "Dragon Ball Super", year: 2015, tag: "Super", kanji: "超", tagline: "El Despertar de los Dioses", defaultSaga: "batalla-dioses" },
    { id: "dbdaima", title: "Dragon Ball Daima", subtitle: "Dragon Ball Daima", year: 2024, tag: "Daima", kanji: "魔", tagline: "El Misterio del Reino Demoníaco", defaultSaga: "daima" },
] as const

export type EraId = typeof ERAS[number]["id"]

// Theme colors and glows for each era. Los colores viven en tokens
// --spotlight-*-vivid (colors.css); acá solo se referencian.
export const ERA_COLOR_MAP: Record<EraId, { glow: string; glowStrong: string; textBrand: string; ambientGlow1: string; ambientGlow2: string }> = {
    db: {
        glow: "var(--spotlight-glow-db)",
        glowStrong: "var(--spotlight-border-db)",
        textBrand: "text-[var(--spotlight-db-vivid)]",
        ambientGlow1: "var(--spotlight-db-vivid)",
        ambientGlow2: "var(--spotlight-db-vivid-2)"
    },
    dbz: {
        glow: "var(--spotlight-glow-dbz)",
        glowStrong: "var(--spotlight-border-dbz)",
        textBrand: "text-[var(--spotlight-dbz-vivid)]",
        ambientGlow1: "var(--spotlight-dbz-vivid)",
        ambientGlow2: "var(--spotlight-dbz-vivid-2)"
    },
    dbgt: {
        glow: "var(--spotlight-glow-dbgt)",
        glowStrong: "var(--spotlight-border-dbgt)",
        textBrand: "text-[var(--spotlight-dbgt-vivid)]",
        ambientGlow1: "var(--spotlight-dbgt-vivid)",
        ambientGlow2: "var(--spotlight-dbgt-vivid-2)"
    },
    dbkai: {
        glow: "var(--spotlight-glow-dbkai)",
        glowStrong: "var(--spotlight-border-dbkai)",
        textBrand: "text-[var(--spotlight-dbkai-vivid)]",
        ambientGlow1: "var(--spotlight-dbkai-vivid)",
        ambientGlow2: "var(--spotlight-dbkai-vivid-2)"
    },
    dbs: {
        glow: "var(--spotlight-glow-dbs)",
        glowStrong: "var(--spotlight-border-dbs)",
        textBrand: "text-[var(--spotlight-dbs-vivid)]",
        ambientGlow1: "var(--spotlight-dbs-vivid)",
        ambientGlow2: "var(--spotlight-dbs-vivid-2)"
    },
    dbdaima: {
        glow: "var(--spotlight-glow-daima)",
        glowStrong: "var(--spotlight-border-daima)",
        textBrand: "text-[var(--spotlight-daima-vivid)]",
        ambientGlow1: "var(--spotlight-daima-vivid)",
        ambientGlow2: "var(--spotlight-daima-vivid-2)"
    }
}

export interface EraDefaultInfo {
    title: string
    subtitle: string
    description: string
    backdropUrl: string
    posterUrl: string
    year: number
    episodes: string
}

export const ERA_DEFAULTS: Record<EraId, EraDefaultInfo> = {
    db: {
        title: "Dragon Ball",
        subtitle: "Dragon Ball (Original)",
        description: "Goku, un niño con cola de mono y una fuerza sobrehumana, conoce a Bulma y emprende un viaje legendario en busca de las siete Esferas del Dragón, entrenando con el Maestro Roshi y enfrentando villanos en torneos de artes marciales.",
        backdropUrl: "https://image.tmdb.org/t/p/original/onCLyCOgszTIyyVs2XKYSkKPOPG.jpg",
        posterUrl: "https://image.tmdb.org/t/p/w500/30L49n4Dhn7dzuGG50GV3ybMhC3.jpg",
        year: 1986,
        episodes: "153 Episodios",
    },
    dbz: {
        title: "Dragon Ball Z",
        subtitle: "Dragon Ball Z",
        description: "Cinco años después del final de Dragon Ball, Goku descubre su origen extraterrestre como guerrero Saiyajin. Junto a los Guerreros Z, defiende la Tierra y el universo de amenazas colosales como Vegeta, Freezer, Cell y Majin Buu.",
        backdropUrl: "https://image.tmdb.org/t/p/original/oQ5CnVj3TRifXl2bIOri6H6rfNe.jpg",
        posterUrl: "https://image.tmdb.org/t/p/w500/ydf1CeiBLfdxiyNTpskM0802TKl.jpg",
        year: 1989,
        episodes: "291 Episodios",
    },
    dbgt: {
        title: "Dragon Ball GT",
        subtitle: "Dragon Ball GT",
        description: "Tras un deseo accidental de las Esferas de la Estrella Negra, Goku vuelve a ser niño y viaja por el cosmos junto a Trunks y Pan para salvar la Tierra, enfrentando a Baby, Super 17 y los temibles 7 Dragones Malignos con el legendario Super Saiyajin 4.",
        backdropUrl: "https://image.tmdb.org/t/p/original/rLHhDpv6rrhuzBjNzaMRNv2fng.jpg",
        posterUrl: "https://image.tmdb.org/t/p/w500/aJOlYXjxb5IvnTsO4I1tmFpC7GH.jpg",
        year: 1996,
        episodes: "64 Episodios",
    },
    dbkai: {
        title: "Dragon Ball Kai",
        subtitle: "Dragon Ball Z Kai",
        description: "Versión remasterizada en alta definición de Dragon Ball Z, fiel al manga original de Akira Toriyama sin episodios de relleno, con edición dinámica y sonido renovado.",
        backdropUrl: "https://image.tmdb.org/t/p/original/ojsPI8fNwcecKLhVC4rB4ZZhFMc.jpg",
        posterUrl: "https://image.tmdb.org/t/p/w500/oz5zbMBKCUsb7hsbjdxvK8yagPD.jpg",
        year: 2009,
        episodes: "167 Episodios",
    },
    dbs: {
        title: "Dragon Ball Super",
        subtitle: "Dragon Ball Super",
        description: "Goku y Vegeta alcanzan el reino de los dioses enfrentando al Dios de la Destrucción Beerus, al renacido Freezer Dorado, a Goku Black y compitiendo en el Torneo del Poder entre universos con el poder del Ultra Instinto.",
        backdropUrl: "https://image.tmdb.org/t/p/original/qEUrbXJ2qt4Rg84Btlx4STOhgte.jpg",
        posterUrl: "https://image.tmdb.org/t/p/w500/qA2UwUQbj05aeBMCuC0mHSQ4loE.jpg",
        year: 2015,
        episodes: "131 Episodios",
    },
    dbdaima: {
        title: "Dragon Ball Daima",
        subtitle: "Dragon Ball Daima",
        description: "Debido a una misteriosa conspiración, Goku y sus amigos son transformados en niños pequeños. Para desentrañar el misterio y revertir la transformación, parten hacia el Reino Demoniaco en una nueva aventura llena de acción y magia.",
        backdropUrl: "https://image.tmdb.org/t/p/original/lMULbSFZNXUC87MqOZQ4SSV9DXI.jpg",
        posterUrl: "https://image.tmdb.org/t/p/w500/oUmWLyeko3kYdUr8DBLIsxwcugl.jpg",
        year: 2024,
        episodes: "20 Episodios",
    },
}

export const MEDIA_ID_TO_ERA: Record<number, EraId> = {
    // Kai (Dragon Ball Z Kai / Dragon Ball Kai)
    61709: "dbkai",
    1061709: "dbkai",
    60572: "dbkai",
    1060572: "dbkai",
    6033: "dbkai",
    20635: "dbkai",
    // DB (Dragon Ball Original)
    12609: "db",
    1033499: "db",
    1033500: "db",
    1033513: "db",
    
    // DB Movies
    116776: "db",   // Una aventura mística
    1116776: "db",
    39145: "db",    // La princesa durmiente del castillo embrujado
    1039145: "db",
    39144: "db",    // La leyenda de Shen Long
    1039144: "db",
    39148: "db",    // El camino hacia el poder
    1039148: "db",

    // DBZ (Dragon Ball Z)
    12971: "dbz",
    1015448: "dbz",
    1015449: "dbz",
    1015450: "dbz",
    1015451: "dbz",
    1015452: "dbz",
    1015453: "dbz",
    1015454: "dbz",
    1015455: "dbz",
    1015456: "dbz",
    1015457: "dbz",
    1015458: "dbz",
    1012704: "dbz",
    1015459: "dbz",
    1015460: "dbz",
    
    // DBZ Movies & Specials (TMDB IDs with and without 1,000,000 offset)
    28609: "dbz",   // ¡Devuélvanme a mi Gohan!
    1028609: "dbz",
    39100: "dbz",   // El hombre más fuerte de este mundo
    1039100: "dbz",
    39101: "dbz",   // La batalla más grande de este mundo está por comenzar
    1039101: "dbz",
    39102: "dbz",   // Goku es un Super Saiyajin
    1039102: "dbz",
    24752: "dbz",   // Los rivales más poderosos
    1024752: "dbz",
    39103: "dbz",   // Los guerreros más poderosos
    1039103: "dbz",
    39104: "dbz",   // La pelea de los tres Saiyajin
    1039104: "dbz",
    34433: "dbz",   // El poder invencible
    1034433: "dbz",
    39105: "dbz",   // La galaxia corre peligro
    1039105: "dbz",
    44251: "dbz",   // El regreso del guerrero legendario
    1044251: "dbz",
    39106: "dbz",   // El combate final
    1039106: "dbz",
    39107: "dbz",   // La fusión de Goku y Vegeta
    1039107: "dbz",
    39108: "dbz",   // El ataque del dragón
    1039108: "dbz",
    126963: "dbz",  // La batalla de los dioses
    1126963: "dbz",
    303857: "dbz",  // La resurrección de Freezer / F
    1303857: "dbz",
    39323: "dbz",   // La batalla de Freezer contra el padre de Goku
    1039323: "dbz",
    39324: "dbz",   // Los dos guerreros del futuro: Gohan y Trunks
    1039324: "dbz",
    38594: "dbz",   // Goku y sus amigos regresan
    1038594: "dbz",
    120475: "dbz",  // Bardock el legendario Super Saiyajin
    1120475: "dbz",

    // DBZ Specials & OVAs
    55127: "dbz",   // El plan para erradicar a los saiyajin
    1055127: "dbz",
    39321: "dbz",   // Cuerpo de bomberos
    1039321: "dbz",
    39322: "dbz",   // Seguridad vial
    1039322: "dbz",
    39325: "dbz",   // Atsumare Goku World
    1039325: "dbz",
    39326: "dbz",   // Looking Back at it All
    1039326: "dbz",
    105973: "dbz",  // Kyutai Panic
    1105973: "dbz",
    444390: "dbz",  // Dream 9 Crossover
    1444390: "dbz",

    // GT (Dragon Ball GT)
    12697: "dbgt",
    1012697: "dbgt",
    1039149: "dbgt",
    18095: "dbgt",  // La legendaria esfera de cuatro estrellas
    1018095: "dbgt",

    // Super (Dragon Ball Super)
    62715: "dbs",
    1062715: "dbs",
    503314: "dbs",  // Broly
    1503314: "dbs", // Broly
    610150: "dbs",  // Super Hero
    1610150: "dbs", // Super Hero

    // Daima (Dragon Ball Daima)
    236994: "dbdaima",
    1236994: "dbdaima",
}

// Helper to classify media into an era based on title matching
export function getEraFromTitle(title: string): EraId | null {
    if (!title) return null
    const t = title.toLowerCase().trim()

    // 1. Check Daima
    if (t.includes("daima") || t.includes("dbdaima")) return "dbdaima"

    // 2. Check Kai
    if (
        (t.includes("kai") && (t.includes("dragon") || t.includes("db") || t.includes("bola"))) ||
        t.includes("dbkai") ||
        t.includes("dbzkai") ||
        t.includes("dragon ball z kai") ||
        t.includes("dragon ball kai")
    ) {
        return "dbkai"
    }

    // 3. Check GT
    if (
        (t.includes("gt") && (t.includes("dragon") || t.includes("db") || t.includes("bola"))) ||
        t.includes("dbgt") ||
        t.includes("dragon ball gt") ||
        t.includes("100 años después") ||
        t.includes("100 anos despues") ||
        (t.includes("baby") && (t.includes("goku") || t.includes("saiyajin") || t.includes("dragon"))) ||
        (t.includes("super 17") && (t.includes("goku") || t.includes("dragon") || t.includes("db")))
    ) {
        return "dbgt"
    }

    // 4. Check Super (Movies & Series)
    const hasDbContext = t.includes("dragon") || t.includes("db") || t.includes("bola") || t.includes("goku")
    if (
        (t.includes("super") && hasDbContext) ||
        t.includes("dbs") ||
        t.includes("dragon ball super") ||
        (t.includes("super hero") && hasDbContext) ||
        (t.includes("broly") && (t.includes("super") || hasDbContext)) ||
        (t.includes("batalla de los dioses") && (hasDbContext || t.includes("dioses"))) ||
        (t.includes("resurrección de f") || t.includes("resurreccion de f"))
    ) {
        // Exclude DBZ Broly movies
        if (
            t.includes("estalla el duelo") ||
            t.includes("segunda venida") ||
            t.includes("combate definitivo") ||
            t.includes("regreso de broly") ||
            t.includes("poder invencible")
        ) {
            return "dbz"
        }
        return "dbs"
    }

    // 5. Check Dragon Ball Z (Series, Movies, OVAs)
    if (
        (t.includes(" z") && hasDbContext) ||
        t.includes("dbz") ||
        t.includes("dragon ball z") ||
        t.includes("garlick") ||
        t.includes("devuélvanme a mi gohan") ||
        t.includes("devuelvanme a mi gohan") ||
        t.includes("más fuerte del mundo") ||
        t.includes("mas fuerte del mundo") ||
        t.includes("súper batalla") ||
        t.includes("super batalla") ||
        t.includes("súper guerrero son goku") ||
        t.includes("super guerrero son goku") ||
        t.includes("mejores rivales") ||
        t.includes("los rivales más poderosos") ||
        t.includes("los guerreros más poderosos") ||
        t.includes("fuerza ilimitada") ||
        t.includes("tres grandes super") ||
        t.includes("estalla el duelo") ||
        t.includes("guerreros de plata") ||
        t.includes("la galaxia corre peligro") ||
        t.includes("el regreso de broly") ||
        t.includes("el regreso del guerrero legendario") ||
        t.includes("combate definitivo") ||
        t.includes("el combate final") ||
        t.includes("la fusión de goku") ||
        t.includes("la fusion de goku") ||
        t.includes("el ataque del dragón") ||
        t.includes("el ataque del dragon") ||
        t.includes("poder invencible") ||
        t.includes("padre de goku") ||
        t.includes("bardock") ||
        t.includes("dos guerreros del futuro") ||
        t.includes("gohan y trunks") ||
        t.includes("plan para erradicar a los saiyajin") ||
        t.includes("plan para erradicar los saiyajin") ||
        t.includes("goku y sus amigos regresan")
    ) {
        return "dbz"
    }

    // 6. Check Original Dragon Ball
    if (
        t.includes("dragon ball") ||
        t.includes("dragonball") ||
        t.includes("bola de drag") ||
        t.includes("la leyenda de shenlong") ||
        t.includes("la leyenda de shen long") ||
        t.includes("la princesa durmiente") ||
        t.includes("aventura mística") ||
        t.includes("aventura mistica") ||
        t.includes("camino hacia el poder") ||
        t.includes("camino al poder")
    ) {
        return "db"
    }

    return null
}

const eraCache = new Map<string, EraId | null>()

export function getEraFromItem(item: SwimlaneItem): EraId | null {
    const cached = eraCache.get(item.id)
    if (cached !== undefined) return cached

    // 1. Try mapping by tmdbId if provided
    if (item.tmdbId) {
        const rawId = item.tmdbId >= 1000000 ? item.tmdbId - 1000000 : item.tmdbId
        if (item.tmdbId in MEDIA_ID_TO_ERA) {
            const era = MEDIA_ID_TO_ERA[item.tmdbId]
            eraCache.set(item.id, era)
            return era
        }
        if (rawId in MEDIA_ID_TO_ERA) {
            const era = MEDIA_ID_TO_ERA[rawId]
            eraCache.set(item.id, era)
            return era
        }
    }

    // 2. Try mapping by mediaId if provided
    if (item.mediaId) {
        const rawId = item.mediaId >= 1000000 ? item.mediaId - 1000000 : item.mediaId
        if (item.mediaId in MEDIA_ID_TO_ERA) {
            const era = MEDIA_ID_TO_ERA[item.mediaId]
            eraCache.set(item.id, era)
            return era
        }
        if (rawId in MEDIA_ID_TO_ERA) {
            const era = MEDIA_ID_TO_ERA[rawId]
            eraCache.set(item.id, era)
            return era
        }
    }

    // 3. Try mapping by ID embedded in string
    const mediaId = Number(item.id.replace(/^(media|cw)-/, ""))
    if (!isNaN(mediaId)) {
        const rawId = mediaId >= 1000000 ? mediaId - 1000000 : mediaId
        if (mediaId in MEDIA_ID_TO_ERA) {
            const era = MEDIA_ID_TO_ERA[mediaId]
            eraCache.set(item.id, era)
            return era
        }
        if (rawId in MEDIA_ID_TO_ERA) {
            const era = MEDIA_ID_TO_ERA[rawId]
            eraCache.set(item.id, era)
            return era
        }
    }

    // 4. Fallback to title matching
    const era = getEraFromTitle(item.title)
    eraCache.set(item.id, era)
    return era
}

export const KNOWN_MOVIE_TMDB_IDS = new Set<number>([
    // DB
    116776, 39145, 39144, 39148, 33499, 33513, 1033499, 1033500, 1033513, 1039144, 1039145, 1116776, 1039148,
    // DBZ Movies
    28609, 39100, 39101, 39102, 24752, 39103, 39104, 34433, 39105, 44251, 39106, 39107, 39108, 126963, 303857, 177572, 15448, 15452, 15454,
    1028609, 1039100, 1039101, 1039102, 1024752, 1039103, 1039104, 1034433, 1039105, 1044251, 1039106, 1039107, 1039108, 1126963, 1303857, 1177572,
    // DBZ Specials / OVAs
    39323, 39324, 39325, 39326, 105973, 444390, 38594, 120475, 55127, 39321, 39322, 1259215, 109963,
    1039323, 1039324, 1039325, 1039326, 1105973, 1444390, 1038594, 1120475, 1055127, 1039321, 1039322,
    // GT Special
    18095, 39149, 1018095, 1039149,
    // Super Movies
    503314, 610150, 1503314, 1610150,
])

export function isMovieItem(item: SwimlaneItem): boolean {
    if (!item) return false

    // 1. Explicit badge check
    if (item.badge === "MOVIE" || item.badge === "SPECIAL" || item.badge === "OVA") {
        return true
    }

    // 2. ID check for Dragon Ball offset (>= 1,000,000)
    if (item.mediaId && item.mediaId >= 1_000_000) return true
    if (item.tmdbId && item.tmdbId >= 1_000_000) return true
    const parsedId = Number(item.id.replace(/^(media|cw)-/, ""))
    if (!isNaN(parsedId) && parsedId >= 1_000_000) return true

    // 3. Known Movie TMDB ID check
    const rawTmdbId = item.tmdbId ? (item.tmdbId >= 1_000_000 ? item.tmdbId - 1_000_000 : item.tmdbId) : undefined
    if (rawTmdbId && KNOWN_MOVIE_TMDB_IDS.has(rawTmdbId)) return true

    const rawMediaId = item.mediaId ? (item.mediaId >= 1_000_000 ? item.mediaId - 1_000_000 : item.mediaId) : undefined
    if (rawMediaId && KNOWN_MOVIE_TMDB_IDS.has(rawMediaId)) return true

    if (!isNaN(parsedId)) {
        const rawParsed = parsedId >= 1_000_000 ? parsedId - 1_000_000 : parsedId
        if (KNOWN_MOVIE_TMDB_IDS.has(rawParsed)) return true
    }

    // 4. Title keywords
    const titleLower = item.title.toLowerCase()
    if (
        titleLower.includes("pelicula") ||
        titleLower.includes("película") ||
        titleLower.includes("movie") ||
        titleLower.includes("especial") ||
        titleLower.includes("special") ||
        titleLower.includes("ova") ||
        titleLower.includes("roadshow") ||
        titleLower.includes("cinerama")
    ) {
        return true
    }

    return false
}

