import { useAnilistListAnime, useAnilistListRecentAiringAnime } from "@/api/hooks/anilist.hooks"
import { useState } from "react"
import { useDebounce } from "react-use"

export function useGlobalSearch() {
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")

    useDebounce(
        () => {
            setDebouncedQuery(query)
        },
        500,
        [query],
    )

    const isSearchActive = debouncedQuery.length > 2

    const {
        data: searchResults,
        isLoading: isSearchLoading,
    } = useAnilistListAnime(
        {
            search: debouncedQuery,
            perPage: 10,
        },
        isSearchActive,
    )

    const {
        data: recentAnime,
        isLoading: isRecentLoading,
    } = useAnilistListRecentAiringAnime(
        {
            perPage: 10,
        },
        !isSearchActive,
    )

    return {
        query,
        setQuery,
        results: isSearchActive ? searchResults?.Page?.media || [] : recentAnime?.Page?.airingSchedules?.map(s => s.media).filter(Boolean) || [],
        isLoading: isSearchActive ? isSearchLoading : isRecentLoading,
        isSearchActive,
    }
}
