import type { SwimlaneItem } from "./swimlane"

// Definition of the 5 canonical Dragon Ball eras in chronological order
export const ERAS = [
    { id: "db", title: "Dragon Ball", subtitle: "Dragon Ball (Original)", year: 1986 },
    { id: "dbz", title: "Dragon Ball Z", subtitle: "Dragon Ball Z", year: 1989 },
    { id: "dbgt", title: "Dragon Ball GT", subtitle: "Dragon Ball GT", year: 1996 },
    { id: "dbs", title: "Dragon Ball Super", subtitle: "Dragon Ball Super", year: 2015 },
    { id: "dbdaima", title: "Dragon Ball Daima", subtitle: "Dragon Ball Daima", year: 2024 },
] as const

export type EraId = typeof ERAS[number]["id"]

// Theme colors and glows for each era
export const ERA_COLOR_MAP: Record<EraId, { primary: string; glow: string; glowStrong: string; textBrand: string; borderActive: string; ambientGlow1: string; ambientGlow2: string }> = {
    db: {
        primary: "from-[#ff6e3a] to-[#ff8c3a]",
        glow: "var(--spotlight-glow-db)",
        glowStrong: "var(--spotlight-border-db)",
        textBrand: "text-[#ff6e3a]",
        borderActive: "border-[#ff6e3a]/40",
        ambientGlow1: "#ff6e3a",
        ambientGlow2: "#ff8c3a"
    },
    dbz: {
        primary: "from-[#f59e0b] to-[#d97706]",
        glow: "var(--spotlight-glow-dbz)",
        glowStrong: "var(--spotlight-border-dbz)",
        textBrand: "text-[#f59e0b]",
        borderActive: "border-[#f59e0b]/40",
        ambientGlow1: "#f59e0b",
        ambientGlow2: "#d97706"
    },
    dbgt: {
        primary: "from-[#e11d48] to-[#be123c]",
        glow: "var(--spotlight-glow-dbgt)",
        glowStrong: "var(--spotlight-border-dbgt)",
        textBrand: "text-[#e11d48]",
        borderActive: "border-[#e11d48]/40",
        ambientGlow1: "#e11d48",
        ambientGlow2: "#be123c"
    },
    dbs: {
        primary: "from-[#0ea5e9] to-[#2563eb]",
        glow: "var(--spotlight-glow-dbs)",
        glowStrong: "var(--spotlight-border-dbs)",
        textBrand: "text-[#0ea5e9]",
        borderActive: "border-[#0ea5e9]/40",
        ambientGlow1: "#0ea5e9",
        ambientGlow2: "#2563eb"
    },
    dbdaima: {
        primary: "from-[#22d3ee] to-[#059669]",
        glow: "var(--spotlight-glow-daima)",
        glowStrong: "var(--spotlight-border-daima)",
        textBrand: "text-[#22d3ee]",
        borderActive: "border-[#22d3ee]/40",
        ambientGlow1: "#22d3ee",
        ambientGlow2: "#059669"
    }
}

export const MEDIA_ID_TO_ERA: Record<number, EraId> = {
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

    // DB Local Database IDs
    4: "db",
    6: "db",
    311: "db",
    320: "db",
    333: "db",

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

    // DBZ Local Database IDs
    2: "dbz",
    7: "dbz",
    8: "dbz",
    307: "dbz",
    308: "dbz",
    309: "dbz",
    313: "dbz",
    318: "dbz",
    319: "dbz",
    321: "dbz",
    322: "dbz",
    325: "dbz",
    328: "dbz",
    329: "dbz",
    331: "dbz",
    332: "dbz",
    335: "dbz",
    1440: "dbz",
    2000: "dbz",
    2123: "dbz",

    // GT (Dragon Ball GT)
    12697: "dbgt",
    1039149: "dbgt",
    18095: "dbgt",  // La legendaria esfera de cuatro estrellas
    1018095: "dbgt",

    // GT Local Database IDs
    187: "dbgt",
    324: "dbgt",

    // Super (Dragon Ball Super)
    62715: "dbs",
    1503314: "dbs", // Broly
    1610150: "dbs", // Super Hero

    // Super Local Database IDs
    17: "dbs",
    18: "dbs",
    24: "dbs",

    // Daima (Dragon Ball Daima)
    236994: "dbdaima",

    // Daima Local Database IDs
    236: "dbdaima",
}

// Helper to classify media into an era based on title matching
export function getEraFromTitle(title: string): EraId | null {
    const t = title.toLowerCase()

    if (t.includes("daima")) return "dbdaima"

    // If it's explicitly a DBZ movie / series or has standard DBZ title identifiers,
    // group it under DBZ, EXCEPT for the two DBS transitional movies.
    if (
        t.includes(" z") ||
        t.includes("dbz") ||
        t.includes("kai") ||
        t.includes("zet") ||
        t.includes("garlick") ||
        t.includes("más fuerte del mundo") ||
        t.includes("mas fuerte del mundo") ||
        t.includes("súper batalla") ||
        t.includes("super batalla") ||
        t.includes("súper guerrero") ||
        t.includes("super guerrero") ||
        t.includes("mejores rivales") ||
        t.includes("fuerza ilimitada") ||
        t.includes("tres grandes super") ||
        t.includes("estalla el duelo") ||
        t.includes("guerreros de plata") ||
        t.includes("el regreso de broly") ||
        t.includes("combate definitivo") ||
        t.includes("fusión") ||
        t.includes("fusion") ||
        t.includes("ataque del dragón") ||
        t.includes("ataque del dragon") ||
        t.includes("poder invencible") ||
        t.includes("padre de goku") ||
        t.includes("dos guerreros del futuro") ||
        t.includes("la batalla de los dioses") ||
        t.includes("batalla de los dioses") ||
        t.includes("resurrección de f") ||
        t.includes("resurreccion de f")
    ) {

        return "dbz"
    }

    if (
        t.includes("super") ||
        t.includes("broly") ||
        t.includes("la batalla de los dioses") ||
        t.includes("batalla de los dioses") ||
        t.includes("resurrección de f") ||
        t.includes("resurreccion de f")
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

    if (t.includes("gt") || t.includes("100 años después") || t.includes("100 anos despues")) {
        return "dbgt"
    }

    if (
        t.includes("dragon ball") ||
        t.includes("bola de drag") ||
        t.includes("shenlong") ||
        t.includes("princesa durmiente") ||
        t.includes("aventura mística") ||
        t.includes("aventura mistica") ||
        t.includes("camino hacia el poder") ||
        t.includes("camino al poder")
    ) {
        return "db"
    }

    return null
}

export function getEraFromItem(item: SwimlaneItem): EraId | null {
    // 1. Try mapping by ID
    const mediaId = Number(item.id.replace(/^(media|cw)-/, ""))
    if (!isNaN(mediaId) && mediaId in MEDIA_ID_TO_ERA) {
        return MEDIA_ID_TO_ERA[mediaId]
    }

    // 2. Fallback to title matching
    return getEraFromTitle(item.title)
}
