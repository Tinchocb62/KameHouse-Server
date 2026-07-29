import { useServerQuery } from "../client/requests"
import { API_ENDPOINTS } from "../generated/endpoints"
import type { AdminTranscodeStatsResponse, AdminLibraryStatsResponse } from "../generated/types"

export function useGetTranscodeStats() {
    return useServerQuery<AdminTranscodeStatsResponse>({
        endpoint: API_ENDPOINTS.ADMIN.GetTranscodeStats.endpoint,
        method: API_ENDPOINTS.ADMIN.GetTranscodeStats.methods[0],
        queryKey: [API_ENDPOINTS.ADMIN.GetTranscodeStats.key],
        refetchInterval: 2000,
    })
}

export function useGetLibraryStats() {
    return useServerQuery<AdminLibraryStatsResponse>({
        endpoint: API_ENDPOINTS.ADMIN.GetLibraryStats.endpoint,
        method: API_ENDPOINTS.ADMIN.GetLibraryStats.methods[0],
        queryKey: [API_ENDPOINTS.ADMIN.GetLibraryStats.key],
        refetchInterval: 60000,
    })
}
