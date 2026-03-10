import { useQuery } from "@tanstack/react-query"
import { getServerBaseUrl } from "@/api/client/server-url"

export interface TorrentioStreamResult {
    name: string
    title: string
    infoHash: string
    fileIdx: number
    quality: string
    releaseGroup: string
    filename: string
}

export const torrentioKeys = {
    all: ["torrentio"] as const,
    streams: (kitsuId: number, episode: number) => [...torrentioKeys.all, "streams", kitsuId, episode] as const,
}

/**
 * Hook to fetch torrentio streams for a specific episode.
 */
export function useGetTorrentioStreams(kitsuId: number | undefined, episode: number | undefined) {
    return useQuery({
        queryKey: torrentioKeys.streams(kitsuId!, episode!),
        queryFn: async (): Promise<TorrentioStreamResult[]> => {
            if (!kitsuId || !episode) throw new Error("Missing params")
            const res = await fetch(`${getServerBaseUrl()}/api/v1/torrentio/streams?kitsuId=${kitsuId}&episode=${episode}`)
            if (!res.ok) {
                const text = await res.text()
                throw new Error(`Failed to fetch torrentio streams: ${res.status} ${text}`)
            }
            return (await res.json()) as TorrentioStreamResult[]
        },
        enabled: !!kitsuId && !!episode,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}
