import { useServerQuery } from "@/api/client/requests"
import { EXTRA_ENDPOINTS } from "@/api/client/endpoints.extra"
import type {
    DbApiEpisodeList,
    DbApiMilestone,
    DbApiSeries,
    DbApiVillain,
} from "@/api/types/dragonball.types"

/**
 * Hooks de la enciclopedia de Dragon Ball (`/api/v1/dragonball/*`).
 *
 * El backend sirve un seed estático en memoria: los datos no cambian en runtime,
 * así que todo se cachea de forma indefinida y la sección entera se resuelve con
 * cuatro requests que nunca se repiten dentro de la sesión.
 */

/** Cachea para siempre: el catálogo es un seed inmutable del servidor. */
const IMMUTABLE = {
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
} as const

/**
 * Tope de la guía completa. Coincide con `maxLimit` en
 * `internal/api/dragonball/service/service.go`, que está dimensionado para que
 * los 660 bloques entren en una sola página.
 */
const GUIDE_LIMIT = 1000

/** Las cinco series con su `tmdb_id`, necesario para cruzar con la biblioteca. */
export function useDragonBallSeries() {
    return useServerQuery<DbApiSeries[]>({
        endpoint: EXTRA_ENDPOINTS.DRAGONBALL.Series.endpoint,
        method: "GET",
        queryKey: [EXTRA_ENDPOINTS.DRAGONBALL.Series.key],
        muteError: true,
        ...IMMUTABLE,
    })
}

/** Guía episódica completa en una sola llamada. */
export function useDragonBallGuide() {
    return useServerQuery<DbApiEpisodeList, { limit: number }>({
        endpoint: EXTRA_ENDPOINTS.DRAGONBALL.Episodes.endpoint,
        method: "GET",
        params: { limit: GUIDE_LIMIT },
        queryKey: [EXTRA_ENDPOINTS.DRAGONBALL.Episodes.key, GUIDE_LIMIT],
        muteError: true,
        ...IMMUTABLE,
    })
}

/** Índice de antagonistas, ubicados por serie y saga. */
export function useDragonBallVillains() {
    return useServerQuery<DbApiVillain[]>({
        endpoint: EXTRA_ENDPOINTS.DRAGONBALL.Villains.endpoint,
        method: "GET",
        queryKey: [EXTRA_ENDPOINTS.DRAGONBALL.Villains.key],
        muteError: true,
        ...IMMUTABLE,
    })
}

/** Hitos narrativos curados (transformaciones, sacrificios, deseos, muertes). */
export function useDragonBallMilestones() {
    return useServerQuery<DbApiMilestone[]>({
        endpoint: EXTRA_ENDPOINTS.DRAGONBALL.Milestones.endpoint,
        method: "GET",
        queryKey: [EXTRA_ENDPOINTS.DRAGONBALL.Milestones.key],
        muteError: true,
        ...IMMUTABLE,
    })
}

/** Obtiene la metadata del lore curado de películas / series. */
export function useDragonBallLore() {
    return useServerQuery<Record<string, unknown>>({
        endpoint: EXTRA_ENDPOINTS.DRAGONBALL.Lore.endpoint,
        method: "GET",
        queryKey: [EXTRA_ENDPOINTS.DRAGONBALL.Lore.key],
        muteError: true,
        ...IMMUTABLE,
    })
}
