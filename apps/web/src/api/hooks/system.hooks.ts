import { useServerMutation } from "@/api/client/requests"
import { API_ENDPOINTS } from "@/api/generated/endpoints"

export interface DatabaseBackupResult {
    path: string
    sizeBytes: number
    createdAt: string
}

export function useBackupDatabase() {
    return useServerMutation<DatabaseBackupResult, void>({
        endpoint: API_ENDPOINTS.SYSTEM.BackupDatabase.endpoint,
        method: API_ENDPOINTS.SYSTEM.BackupDatabase.methods[0],
        mutationKey: [API_ENDPOINTS.SYSTEM.BackupDatabase.key],
    })
}
