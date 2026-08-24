import { useGetLibraryCollection } from "@/api/hooks/anime_collection.hooks"
import { useGetUnlinkedFiles } from "@/api/hooks/unlinked.hooks"
import { useServerQuery } from "@/api/client/requests"
import { EXTRA_ENDPOINTS } from "@/api/client/endpoints.extra"
import { IntelligentEntry } from "@/api/types/intelligence.types"
import { useState, useMemo, useEffect } from "react"

export interface SemanticSearchResult {
    entity: {
        id: string
        name: string
        type: "CHARACTER" | "TRANSFORMATION" | "SAGA" | "MOVIE" | "TECHNIQUE"
        keywords: string[]
        mediaId: number
        tmdbId: number
        mediaType: "SHOW" | "MOVIE"
        era: string
        description: string
        episodes?: string
        badgeLabel: string
    }
    score: number
    matchLabel: string
}

export type GlobalSearchResultItem =
    | {
          mediaId: string | number
          isUnlinked?: false
          isSemantic?: false
          semanticData?: never
          badgeLabel?: string
          path?: string
          media?: {
              titleRomaji?: string
              titleEnglish?: string
              titleOriginal?: string
              titleSpanish?: string
              year?: string | number
              format?: string
              posterImage?: string
              description?: string
              score?: number
          }
          vibes?: string[]
          [key: string]: unknown
      }
    | {
          mediaId: string
          isUnlinked: true
          isSemantic?: false
          semanticData?: never
          badgeLabel?: string
          path: string
          media: {
              titleRomaji: string
              titleEnglish: string
              titleOriginal: string
              year: string | number
              format: string
              posterImage: string
              description?: string
              score?: number
          }
          vibes?: string[]
          [key: string]: unknown
      }
    | {
          mediaId: string
          isSemantic: true
          isUnlinked?: false
          semanticData: SemanticSearchResult["entity"]
          media: {
              titleRomaji: string
              titleEnglish: string
              titleOriginal: string
              year: string | number
              format: string
              posterImage: string
              description: string
          }
          badgeLabel: string
          [key: string]: unknown
      }

export function useGlobalSearch(enabled = true) {
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")

    const { data: collection, isLoading: isLoadingCol } = useGetLibraryCollection({ enabled })
    const { data: unlinkedFiles, isLoading: isLoadingUnlinked } = useGetUnlinkedFiles({ enabled })

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 300)
        return () => clearTimeout(t)
    }, [query])

    const isSearchActive = debouncedQuery.length >= 2

    // Semantic intelligence search query
    const { data: semanticResults, isLoading: isLoadingSemantic } = useServerQuery<SemanticSearchResult[], { q: string }>({
        endpoint: EXTRA_ENDPOINTS.INTELLIGENCE.Search.endpoint,
        method: "GET",
        params: { q: debouncedQuery },
        queryKey: [EXTRA_ENDPOINTS.INTELLIGENCE.Search.key, debouncedQuery],
        staleTime: 60000,
        enabled: isSearchActive,
        muteError: true,
    })

    const isLoading = isLoadingCol || isLoadingUnlinked || (isSearchActive && isLoadingSemantic)

    const allEntries = useMemo(() => {
        if (!collection?.lists) return []
        return collection.lists.flatMap(list => list.entries || [])
    }, [collection])

    const syntheticUnlinked = useMemo(() => {
        if (!unlinkedFiles) return []
        return unlinkedFiles.filter(f => !f.userResolved).map(file => {
            const filename = file.path.split(/[\\/]/).pop() ?? file.path
            return {
                mediaId: `unlinked-${file.id}`,
                isUnlinked: true as const,
                path: file.path,
                media: {
                    titleRomaji: filename,
                    titleEnglish: filename,
                    titleOriginal: filename,
                    year: "LOCAL",
                    format: "ARCHIVO HUÉRFANO",
                    posterImage: "",
                }
            }
        })
    }, [unlinkedFiles])

    const results = useMemo(() => {
        const semanticConverted: GlobalSearchResultItem[] = (semanticResults || []).map(sr => {
            const ent = sr.entity
            return {
                mediaId: `semantic-${ent.id}-${ent.mediaId}`,
                isSemantic: true as const,
                semanticData: ent,
                media: {
                    titleRomaji: ent.name,
                    titleEnglish: ent.name,
                    titleOriginal: ent.name,
                    year: ent.episodes || ent.era.toUpperCase(),
                    format: ent.badgeLabel,
                    posterImage: "",
                    description: ent.description,
                },
                badgeLabel: ent.badgeLabel,
            }
        })

        if (!isSearchActive) {
            const combined: GlobalSearchResultItem[] = [...allEntries, ...syntheticUnlinked]
            return combined.slice(0, 10)
        }

        const q = debouncedQuery.toLowerCase()
        const filteredEntries = allEntries.filter(entry => {
            const e = entry as IntelligentEntry
            const media = e.media
            const vibes = e.vibes?.join(" ") || ""
            const title = media 
                ? `${media.titleRomaji || ""} ${media.titleEnglish || ""} ${media.titleOriginal || ""} ${media.titleSpanish || ""} ${vibes}`.toLowerCase()
                : `desconocido ${e.mediaId} ${vibes}`
            
            return title.includes(q)
        })

        // Combine: Semantic lore entities first, then matching library media entries, then unlinked
        const combined: GlobalSearchResultItem[] = [
            ...semanticConverted,
            ...filteredEntries,
            ...syntheticUnlinked.filter(u => u.media.titleRomaji.toLowerCase().includes(q))
        ]

        return combined.slice(0, 12)
    }, [allEntries, syntheticUnlinked, semanticResults, debouncedQuery, isSearchActive])

    return {
        query,
        setQuery,
        results,
        isLoading,
        isSearchActive,
    }
}


