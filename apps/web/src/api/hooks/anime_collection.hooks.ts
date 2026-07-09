import { useServerQuery, buildSeaQuery } from "@/api/client/requests"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { Anime_LibraryCollection, Anime_LibraryCollectionEntry } from "@/api/generated/types"

export interface ExtendedMediaEntry extends Anime_LibraryCollectionEntry {
    customReleaseGroup?: string
    customVersion?: string
    isCustomOverride?: boolean
}

export interface ExtendedLibraryCollection extends Omit<Anime_LibraryCollection, "lists"> {
    lists?: Array<{
        type: string
        status: string
        entries?: Array<ExtendedMediaEntry>
    }>
}

export const fetchLibraryCollection = async () => {
    return buildSeaQuery<Anime_LibraryCollection>({
        endpoint: API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.endpoint,
        method: API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.methods[0],
    })
}

export function useGetLibraryCollection({ enabled }: { enabled?: boolean } = { enabled: true }) {
    return useServerQuery<Anime_LibraryCollection, void, Anime_LibraryCollection>({
        endpoint: API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.endpoint,
        method: API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.methods[0],
        queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key],
        enabled: enabled,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
    })
}



