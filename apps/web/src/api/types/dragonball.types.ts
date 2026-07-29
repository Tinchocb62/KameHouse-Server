/**
 * Tipos de la API de la enciclopedia de Dragon Ball (`/api/v1/dragonball/*`).
 *
 * Se escriben a mano a propósito: el codegen sólo escanea `internal/handlers`
 * (ver `apps/server/codegen/main.go`), así que este módulo — que vive en
 * `internal/api/dragonball` con arquitectura en capas — nunca llega a
 * `api/generated/`. Además sus tipos Go (`Episode`, `Series`, `Stats`) chocarían
 * con los ya generados al aplanarse en un único namespace.
 *
 * Espejan `internal/api/dragonball/domain/models.go` y `.../dto/dto.go`. El
 * prefijo `DbApi` evita colisiones con `Anime_Episode` y compañía.
 */

/** Clasificación de un hito narrativo (`domain.MilestoneType`). */
export type DbApiMilestoneType = "transformation" | "sacrifice" | "wish" | "death" | "event"

/** Una de las cinco series principales de la franquicia. */
export interface DbApiSeries {
    id: string
    title: string
    tmdb_id: number
    year: string
    episode_count: number
    canon: boolean
    studio: string
    description: string
    saga_ids: string[]
    /** Añadido por `dto.SeriesSummary`. */
    saga_count: number
}

/**
 * Entrada de la guía episódica. Puede cubrir un rango de capítulos cuando la
 * fuente agrupa varios en un mismo bloque narrativo; si describe uno solo,
 * `number_start` y `number_end` coinciden.
 */
export interface DbApiEpisode {
    series_id: string
    saga_id: string
    number_start: number
    number_end: number
    title: string
    villains?: string[]
    /** Beat narrativo del bloque, en prosa. */
    milestone: string
    filler: boolean
}

/** Antagonista del índice, ubicado por la saga donde aparece. */
export interface DbApiVillain {
    name: string
    series_id: string
    saga_id: string
    saga_name: string
    first_seen: number
    aliases?: string[]
}

/** Hito narrativo curado y clasificado. */
export interface DbApiMilestone {
    type: DbApiMilestoneType
    series_id: string
    episode: number
    title: string
    description: string
}

export interface DbApiPagination {
    page: number
    limit: number
    total: number
    total_pages: number
}

export interface DbApiEpisodeList {
    items: DbApiEpisode[]
    pagination: DbApiPagination
}
