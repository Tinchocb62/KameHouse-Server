import { useMutation } from "@tanstack/react-query"
import { API_ENDPOINTS } from "../generated/endpoints"
import { useServerMutation } from "./core/hooks"

export function useBackupDatabase() {
    return useServerMutation<
        { path: string; sizeBytes: number; createdAt: string },
        void
    >({
        endpoint: API_ENDPOINTS.SYSTEM.BackupDatabase.endpoint,
        method: "POST",
        mutationKey: [API_ENDPOINTS.SYSTEM.BackupDatabase.key],
    })
}
