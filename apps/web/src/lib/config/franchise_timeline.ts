import { DRAGON_BALL_SERIES } from "./dragonball_sagas"

/**
 * Una entrega dentro de la línea temporal de una franquicia. Se ancla por
 * `tmdbId` porque es el identificador estable de la serie a través del
 * catálogo (el `seriesId` de la ruta es el id interno del media y varía por
 * instalación). La resolución tmdbId → id interno se hace en tiempo de
 * ejecución contra la colección de la biblioteca del usuario.
 */
export type TimelineEntry = {
    tmdbId: number
    /** Clave corta legible, útil para theming (`era-*`) y debugging. */
    key: string
    /** Etiqueta mostrada al usuario al encadenar series. */
    label: string
    /** false para material no canónico (GT, spin-offs). */
    canon: boolean
}

/**
 * Dragon Ball en **orden de emisión**. Super Dragon Ball Heroes se omite
 * a propósito (no forma parte del catálogo objetivo). Al terminar la última
 * entrega, la cadena simplemente no ofrece continuación.
 */
export const DRAGON_BALL_TIMELINE: TimelineEntry[] = [
    { tmdbId: DRAGON_BALL_SERIES.ORIGINAL, key: "original", label: "Dragon Ball",       canon: true },
    { tmdbId: DRAGON_BALL_SERIES.Z,        key: "z",        label: "Dragon Ball Z",     canon: true },
    { tmdbId: DRAGON_BALL_SERIES.GT,       key: "gt",       label: "Dragon Ball GT",    canon: false },
    { tmdbId: DRAGON_BALL_SERIES.SUPER,    key: "super",    label: "Dragon Ball Super", canon: true },
    { tmdbId: DRAGON_BALL_SERIES.DAIMA,    key: "daima",    label: "Dragon Ball Daima", canon: true },
]

/** Todas las líneas temporales conocidas. Añadir aquí futuras franquicias. */
const TIMELINES: TimelineEntry[][] = [DRAGON_BALL_TIMELINE]

/** Encuentra la línea temporal (y el índice) a la que pertenece un tmdbId. */
function locateInTimeline(tmdbId: number | undefined | null): { timeline: TimelineEntry[]; index: number } | null {
    if (!tmdbId) return null
    for (const timeline of TIMELINES) {
        const index = timeline.findIndex(e => e.tmdbId === tmdbId)
        if (index !== -1) return { timeline, index }
    }
    return null
}

/**
 * Siguiente entrega en la línea temporal, o null si es la última (o si el
 * tmdbId no pertenece a ninguna franquicia encadenada).
 */
export function getNextInTimeline(tmdbId: number | undefined | null): TimelineEntry | null {
    const loc = locateInTimeline(tmdbId)
    if (!loc) return null
    return loc.timeline[loc.index + 1] ?? null
}
