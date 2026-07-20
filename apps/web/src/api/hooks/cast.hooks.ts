import { buildSeaQuery, useServerMutation, useServerQuery } from "@/api/client/requests"

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
        endpoint: "/api/v1/cast/devices",
        method: "GET",
        queryKey: ["cast-devices"],
        refetchInterval: 15000,
        enabled,
        muteError: true,
    })
}

// Consulta puntual (sin polling) de las TVs conectadas.
export const fetchCastDevices = async () => {
    return buildSeaQuery<CastDevicesResponse>({
        endpoint: "/api/v1/cast/devices",
        method: "GET",
    })
}

// Envía un comando de reproducción a la(s) TV(s) conectadas.
export function useCastPlay() {
    return useServerMutation<CastPlayResponse, CastPlayVariables>({
        endpoint: "/api/v1/cast/play",
        method: "POST",
    })
}
