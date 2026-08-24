import { buildSeaQuery, useServerMutation, useServerQuery } from "@/api/client/requests"
import { EXTRA_ENDPOINTS } from "@/api/client/endpoints.extra"

export interface CastDevice {
    id: string
    name: string
}

export interface CastDevicesResponse {
    devices: CastDevice[]
}

export interface CastPlayVariables {
    deviceId?: string
    mediaId: number
    episodeNumber: number
    episodeId?: string
    title?: string
    episodeLabel?: string
}

export interface CastPlayResponse {
    sentTo: string[]
}

// Lista las TVs (KameHouseTV) conectadas al servidor, disponibles para cast.
export function useCastDevices(enabled: boolean = true) {
    return useServerQuery<CastDevicesResponse>({
        endpoint: EXTRA_ENDPOINTS.CAST.GetDevices.endpoint,
        method: "GET",
        queryKey: [EXTRA_ENDPOINTS.CAST.GetDevices.key],
        refetchInterval: 15000,
        enabled,
        muteError: true,
    })
}

// Consulta puntual (sin polling) de las TVs conectadas.
export const fetchCastDevices = async () => {
    return buildSeaQuery<CastDevicesResponse>({
        endpoint: EXTRA_ENDPOINTS.CAST.GetDevices.endpoint,
        method: "GET",
    })
}

// Envía un comando de reproducción a la(s) TV(s) conectadas.
export function useCastPlay() {
    return useServerMutation<CastPlayResponse, CastPlayVariables>({
        endpoint: EXTRA_ENDPOINTS.CAST.Play.endpoint,
        method: "POST",
    })
}
