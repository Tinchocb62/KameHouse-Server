// Openings nostálgicos por era, para el mini-player del header de saga.
// Los archivos viven en la subcarpeta `openings/` dentro de bgMusicDir
// (el endpoint /api/v1/music/stream no acepta separadores en `file`,
// así que la subcarpeta se pasa como parte de `dir`).
// Las claves son los ids reales de dragonball_sagas.ts.

export const ERA_OPENINGS_SUBDIR = "openings"

export interface EraOpening {
    /** Nombre de archivo (sin carpeta) dentro de <bgMusicDir>/openings/ */
    file: string
    /** Título mostrado en el pill */
    title: string
}

const OPENINGS = {
    db: { file: "makafushigi-adventure.mp3", title: "Makafushigi Adventure" },
    dbzEarly: { file: "cha-la-head-cha-la.mp3", title: "Cha-La Head-Cha-La" },
    dbzLate: { file: "we-gotta-power.mp3", title: "We Gotta Power" },
    gt: { file: "dan-dan-kokoro.mp3", title: "Dan Dan Kokoro Hikareteku" },
    superEarly: { file: "chouzetsu-dynamic.mp3", title: "Chōzetsu☆Dynamic!" },
    superLate: { file: "limit-break-x-survivor.mp3", title: "Limit Break x Survivor" },
    daima: { file: "jaka-jaan.mp3", title: "Jaka Jaan" },
} satisfies Record<string, EraOpening>

export const ERA_OPENINGS: Record<string, EraOpening> = {
    // Dragon Ball
    "pilaf": OPENINGS.db,
    "torneo-21": OPENINGS.db,
    "red-ribbon": OPENINGS.db,
    "uranai-baba": OPENINGS.db,
    "torneo-22": OPENINGS.db,
    "piccolo-daimaku": OPENINGS.db,
    "piccolo-jr": OPENINGS.db,
    // Dragon Ball Z — Saiyan a Freezer
    "saiyajin": OPENINGS.dbzEarly,
    "namek-freezer": OPENINGS.dbzEarly,
    "garlic-jr": OPENINGS.dbzEarly,
    // Dragon Ball Z — Androides a Buu
    "androides": OPENINGS.dbzLate,
    "cell": OPENINGS.dbzLate,
    "torneo-otro-mundo": OPENINGS.dbzLate,
    "majin-buu": OPENINGS.dbzLate,
    // Dragon Ball GT
    "black-star": OPENINGS.gt,
    "baby": OPENINGS.gt,
    "super-17": OPENINGS.gt,
    "shadow-dragons": OPENINGS.gt,
    // Dragon Ball Super
    "batalla-dioses": OPENINGS.superEarly,
    "resurreccion-f": OPENINGS.superEarly,
    "universo-6": OPENINGS.superEarly,
    "copy-vegeta": OPENINGS.superEarly,
    "trunks-futuro": OPENINGS.superEarly,
    "exhibicion-zen": OPENINGS.superLate,
    "reclutamiento-u7": OPENINGS.superLate,
    "torneo-poder": OPENINGS.superLate,
    // Dragon Ball Daima
    "daima": OPENINGS.daima,
}

export function getEraOpening(sagaId: string): EraOpening | null {
    return ERA_OPENINGS[sagaId] || null
}
