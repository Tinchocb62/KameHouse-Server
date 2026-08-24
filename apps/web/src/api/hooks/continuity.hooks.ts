import { useServerMutation, useServerQuery } from "@/api/client/requests"
import { UpdateContinuityWatchHistoryItem_Variables } from "@/api/generated/endpoint.types"
import { Continuity_WatchHistory, Continuity_WatchHistoryItemResponse } from "@/api/generated/types"
import { API_ENDPOINTS } from "@/api/generated/endpoints"

export function useUpdateContinuityWatchHistoryItem() {
    return useServerMutation<boolean, UpdateContinuityWatchHistoryItem_Variables>({
        endpoint: API_ENDPOINTS.CONTINUITY.UpdateContinuityWatchHistoryItem.endpoint,
        method: API_ENDPOINTS.CONTINUITY.UpdateContinuityWatchHistoryItem.methods[0],
        mutationKey: [API_ENDPOINTS.CONTINUITY.UpdateContinuityWatchHistoryItem.key],
    })
}

export function useGetContinuityWatchHistoryItem(id: number) {
    return useServerQuery<Continuity_WatchHistoryItemResponse>({
        endpoint: API_ENDPOINTS.CONTINUITY.GetContinuityWatchHistoryItem.endpoint.replace("{id}", String(id)),
        method: API_ENDPOINTS.CONTINUITY.GetContinuityWatchHistoryItem.methods[0],
        queryKey: [API_ENDPOINTS.CONTINUITY.GetContinuityWatchHistoryItem.key, id],
        enabled: id > 0,
        staleTime: 5000,
    })
}

export function useGetContinuityWatchHistory() {
    return useServerQuery<Continuity_WatchHistory>({
        endpoint: API_ENDPOINTS.CONTINUITY.GetContinuityWatchHistory.endpoint,
        method: API_ENDPOINTS.CONTINUITY.GetContinuityWatchHistory.methods[0],
        queryKey: [API_ENDPOINTS.CONTINUITY.GetContinuityWatchHistory.key],
        enabled: true,
        staleTime: 5000,
    })
}

// Stubs for future use
export function getEpisodePercentageComplete() { return 0 }
export function getEpisodeMinutesRemaining() { return 0 }
export function useHandleContinuityWithMediaPlayer() { return { handleUpdateWatchHistory: () => { } } }
export function useHandleCurrentMediaContinuity() { return { watchHistory: null, waitForWatchHistory: false, shouldWaitForWatchHistory: false, getEpisodeContinuitySeekTo: () => 0 } }

