import { useServerQuery } from "@/api/client/requests"
import type {
    DbApiEpisodeList,
    DbApiMilestone,
    DbApiSeries,
    DbApiVillain,
} from "@/api/types/dragonball.types"

/**
 * Hooks de la enciclopedia de Dragon Ball (`/api/v1/dragonball/*`).
 *
 * Escritos a mano porque el codegen no cubre este módulo (ver
 * `api/types/dragonball.types.ts` para el porqué), siguiendo el mismo patrón que
 * `api/generated/library_explorer.hooks.ts`.
 *
 * El backend sirve un seed estático en memoria: los datos no cambian en runtime,
 * así que todo se cachea de forma indefinida y la sección entera se resuelve con
 * cuatro requests que nunca se repiten dentro de la sesión.
 */

const DRAGONBALL_BASE = "/api/v1/dragonball"

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
        endpoint: `${DRAGONBALL_BASE}/series`,
        method: "GET",
        queryKey: ["dragonball", "series"],
        muteError: true,
        ...IMMUTABLE,
    })
}

/** Guía episódica completa en una sola llamada. */
export function useDragonBallGuide() {
    return useServerQuery<DbApiEpisodeList, { limit: number }>({
        endpoint: `${DRAGONBALL_BASE}/episodes`,
        method: "GET",
        params: { limit: GUIDE_LIMIT },
        queryKey: ["dragonball", "episodes", GUIDE_LIMIT],
        muteError: true,
        ...IMMUTABLE,
    })
}

/** Índice de antagonistas, ubicados por serie y saga. */
export function useDragonBallVillains() {
    return useServerQuery<DbApiVillain[]>({
        endpoint: `${DRAGONBALL_BASE}/villains`,
        method: "GET",
        queryKey: ["dragonball", "villains"],
        muteError: true,
        ...IMMUTABLE,
    })
}

/** Hitos narrativos curados (transformaciones, sacrificios, deseos, muertes). */
export function useDragonBallMilestones() {
    return useServerQuery<DbApiMilestone[]>({
        endpoint: `${DRAGONBALL_BASE}/milestones`,
        method: "GET",
        queryKey: ["dragonball", "milestones"],
        muteError: true,
        ...IMMUTABLE,
    })
}
