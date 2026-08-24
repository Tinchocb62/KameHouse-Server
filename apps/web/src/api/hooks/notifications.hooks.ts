import { useQueryClient } from "@tanstack/react-query"
import { useServerQuery, useServerMutation } from "@/api/client/requests"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import type { Models_Notification } from "@/api/generated/types"

export interface NotificationList {
    notifications?: Models_Notification[]
    unreadCount: number
}

export function useGetNotifications() {
    return useServerQuery<NotificationList>({
        endpoint: API_ENDPOINTS.NOTIFICATIONS.GetNotifications.endpoint,
        method: API_ENDPOINTS.NOTIFICATIONS.GetNotifications.methods[0],
        queryKey: [API_ENDPOINTS.NOTIFICATIONS.GetNotifications.key],
        enabled: true,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    })
}

export function useMarkNotificationsRead() {
    const queryClient = useQueryClient()
    return useServerMutation<boolean, { id?: number }>({
        endpoint: API_ENDPOINTS.NOTIFICATIONS.MarkNotificationsRead.endpoint,
        method: API_ENDPOINTS.NOTIFICATIONS.MarkNotificationsRead.methods[0],
        mutationKey: [API_ENDPOINTS.NOTIFICATIONS.MarkNotificationsRead.key],
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.NOTIFICATIONS.GetNotifications.key] })
        },
    })
}

export function useClearNotifications() {
    const queryClient = useQueryClient()
    return useServerMutation<boolean>({
        endpoint: API_ENDPOINTS.NOTIFICATIONS.ClearNotifications.endpoint,
        method: API_ENDPOINTS.NOTIFICATIONS.ClearNotifications.methods[0],
        mutationKey: [API_ENDPOINTS.NOTIFICATIONS.ClearNotifications.key],
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.NOTIFICATIONS.GetNotifications.key] })
        },
    })
}
