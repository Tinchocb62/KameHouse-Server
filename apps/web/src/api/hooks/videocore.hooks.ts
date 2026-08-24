import { useServerQuery } from "@/api/client/requests"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { GetVideoInsights_Variables } from "@/api/generated/endpoint.types"
import { InsightNode } from "@/components/ui/timeline-heatmap"

/**
 * Hook to fetch video insights (heatmap data) for a specific episode.
 * @param variables - Object containing episodeId
 * @param enabled - Whether the query should be enabled
 */
export function useGetVideoInsights(variables: GetVideoInsights_Variables, enabled: boolean = true) {
    return useServerQuery<InsightNode[], GetVideoInsights_Variables>({
        endpoint: API_ENDPOINTS.VIDEOCORE.GetVideoInsights.endpoint.replace("{episodeId}", String(variables.episodeId)),
        method: API_ENDPOINTS.VIDEOCORE.GetVideoInsights.methods[0],
        queryKey: [API_ENDPOINTS.VIDEOCORE.GetVideoInsights.key, variables.episodeId],
        enabled: enabled && !!variables.episodeId,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    })
}
