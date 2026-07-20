import {
    Platform_MediaStatus,
    Platform_MediaFormat,
    Anime_Episode,
    Anime_LibraryCollectionEntry,
    Continuity_WatchHistory,
    Platform_BaseAnime as Platform_UnifiedMedia,
} from "@/api/generated/types"
import { media_getUnwatchedCount } from "./media"
import { asUnifiedMedia } from "./type-guards"

function sortBy<T>(array: T[], iteratee: (item: T) => string | number | Date | null | undefined): T[] {
    return [...array].sort((a, b) => {
        const valueA = iteratee(a)
        const valueB = iteratee(b)
        if (valueA === valueB) return 0
        if (valueA === undefined || valueA === null) return 1
        if (valueB === undefined || valueB === null) return -1
        if (valueA < valueB) return -1
        if (valueA > valueB) return 1
        return 0
    })
}

type BaseCollectionSorting =
    "START_DATE"
    | "START_DATE_DESC"
    | "END_DATE"
    | "END_DATE_DESC"
    | "SCORE"
    | "SCORE_DESC"
    | "RELEASE_DATE"
    | "RELEASE_DATE_DESC"
    | "PROGRESS"
    | "PROGRESS_DESC"
    | "TITLE"
    | "TITLE_DESC"


type CollectionSorting<T extends CollectionType> = BaseCollectionSorting | (T extends "anime" ?
    "PROGRESS_DESC"
    | "PROGRESS"
    | "AIRDATE"
    | "AIRDATE_DESC"
    | "UNWATCHED_EPISODES"
    | "UNWATCHED_EPISODES_DESC"
    | "LAST_WATCHED"
    | "LAST_WATCHED_DESC"
    : never)


type ContinueWatchingSorting =
    "AIRDATE"
    | "AIRDATE_DESC"
    | "EPISODE_NUMBER"
    | "EPISODE_NUMBER_DESC"
    | "UNWATCHED_EPISODES"
    | "UNWATCHED_EPISODES_DESC"
    | "SCORE"
    | "SCORE_DESC"
    | "START_DATE"
    | "START_DATE_DESC"
    | "LAST_WATCHED"
    | "LAST_WATCHED_DESC"

export const CONTINUE_WATCHING_SORTING_OPTIONS = [
    { label: "Aired recently", value: "AIRDATE_DESC" },
    { label: "Aired oldest", value: "AIRDATE" },
    { label: "Highest episode number", value: "EPISODE_NUMBER_DESC" },
    { label: "Lowest episode number", value: "EPISODE_NUMBER" },
    { label: "Most unwatched episodes", value: "UNWATCHED_EPISODES_DESC" },
    { label: "Least unwatched episodes", value: "UNWATCHED_EPISODES" },
    { label: "Highest score", value: "SCORE_DESC" },
    { label: "Lowest score", value: "SCORE" },
    { label: "Started recently", value: "START_DATE_DESC" },
    { label: "Oldest start date", value: "START_DATE" },
    { label: "Most recent watch", value: "LAST_WATCHED_DESC" },
    { label: "Least recent watch", value: "LAST_WATCHED" },
]


export const COLLECTION_SORTING_OPTIONS = [
    { label: "Highest score", value: "SCORE_DESC" },
    { label: "Lowest score", value: "SCORE" },
    { label: "Title", value: "TITLE" },
    { label: "Title (Z-A)", value: "TITLE_DESC" },
    { label: "Highest progress", value: "PROGRESS_DESC" },
    { label: "Lowest progress", value: "PROGRESS" },
    { label: "Started recently", value: "START_DATE_DESC" },
    { label: "Oldest start date", value: "START_DATE" },
    { label: "Completed recently", value: "END_DATE_DESC" },
    { label: "Oldest completion date", value: "END_DATE" },
    { label: "Released recently", value: "RELEASE_DATE_DESC" },
    { label: "Oldest release", value: "RELEASE_DATE" },
]

export const ANIME_COLLECTION_SORTING_OPTIONS = [
    { label: "Aired recently and not up-to-date", value: "AIRDATE_DESC" },
    { label: "Aired oldest and not up-to-date", value: "AIRDATE" },
    { label: "Most unwatched episodes", value: "UNWATCHED_EPISODES_DESC" },
    { label: "Least unwatched episodes", value: "UNWATCHED_EPISODES" },
    { label: "Most recent watch", value: "LAST_WATCHED_DESC" },
    { label: "Least recent watch", value: "LAST_WATCHED" },
    ...COLLECTION_SORTING_OPTIONS,
]


export type CollectionType = "anime"

export type CollectionParams<T extends CollectionType> = {
    sorting: CollectionSorting<T>
    genre: string[] | null
    status: Platform_MediaStatus | null
    format: Platform_MediaFormat | null
    season: string | null
    year: string | null
    isAdult: boolean
} & (T extends "anime" ? {
    continueWatchingOnly: boolean
} : never)


export const DEFAULT_COLLECTION_PARAMS: CollectionParams<"anime"> = {
    sorting: "SCORE_DESC",
    genre: null,
    status: null,
    format: null,
    season: null,
    year: null,
    isAdult: false,
    continueWatchingOnly: false,
}

export const DEFAULT_ANIME_COLLECTION_PARAMS: CollectionParams<"anime"> = {
    sorting: "SCORE_DESC",
    genre: null,
    status: null,
    format: null,
    season: null,
    year: null,
    isAdult: false,
    continueWatchingOnly: false,
}



function getParamValue<T>(value: T | ""): Extract<T, string> | number | undefined {
    if (value === "") return undefined
    if (Array.isArray(value) && value.filter(Boolean).length === 0) return undefined
    if (typeof value === "string" && !isNaN(parseInt(value))) return Number(value)
    if (value === null) return undefined
    return value as Extract<T, string> | number | undefined
}


export function filterEntriesByTitle<T extends { media?: Platform_UnifiedMedia }[] | null | undefined>(arr: T, input: string): T {
    // @ts-expect-error - allow filtering on potential null/undefined arr
    if (!arr) return []
    if (arr.length > 0 && input.length > 0) {
        const _input = input.toLowerCase().trim().replace(/\s+/g, " ")
        // @ts-expect-error - filter type check on generic array
        return arr.filter(entry => {
            const media = entry.media
            return (
                media?.title?.english?.toLowerCase().includes(_input)
                || media?.title?.romaji?.toLowerCase().includes(_input)
                || media?.title?.native?.toLowerCase().includes(_input)
            )
        })
    }
    return arr
}

export function filterListEntries<T extends { media?: Platform_UnifiedMedia | null | undefined, score?: number, startedAt?: {year?: number, month?: number, day?: number}, completedAt?: {year?: number, month?: number, day?: number}, progress?: number }[], V extends CollectionType>(
    type: V,
    entries: T | null | undefined,
    params: CollectionParams<V>,
    showAdultContent: boolean | undefined,
) {
    if (!entries) return []
    let arr = [...entries]

    // Filter by isAdult
    if (!!arr && params.isAdult) arr = arr.filter(n => asUnifiedMedia(n.media)?.isAdult)

    // Filter by showAdultContent
    if (!showAdultContent) arr = arr.filter(n => !asUnifiedMedia(n.media)?.isAdult)

    // Filter by format
    if (!!arr && !!params.format) arr = arr.filter(n => asUnifiedMedia(n.media)?.format === params.format)

    // Filter by season
    if (!!arr && !!params.season) arr = arr.filter(n => asUnifiedMedia(n.media)?.season === params.season)

    // Filter by status
    if (!!arr && !!params.status) arr = arr.filter(n => asUnifiedMedia(n.media)?.status === params.status)

    // Filter by year
    if (!!arr && !!params.year) arr = arr.filter(n => {
        const media = asUnifiedMedia(n.media)
        if (media?.seasonYear) {
            return media.seasonYear === Number(params.year) || media.startDate?.year === Number(params.year)
        }
        return media?.startDate?.year === Number(params.year)
    })

    // Filter by genre
    if (!!arr && !!params.genre?.length) {
        arr = arr.filter(n => {
            const media = asUnifiedMedia(n.media)
            return params.genre?.every(genre => media?.genres?.includes(genre))
        })
    }

    // Initial sort by name
    arr = sortBy(arr, n => {
        const title = asUnifiedMedia(n?.media)?.title
        return title?.english || title?.romaji || ""
    }).reverse()

    // Sort by title
    if (getParamValue(params.sorting) === "TITLE")
        arr.sort((a, b) => {
            const titleA = asUnifiedMedia(a?.media)?.title
            const strA = titleA?.english || titleA?.romaji || ""
            const titleB = asUnifiedMedia(b?.media)?.title
            const strB = titleB?.english || titleB?.romaji || ""
            return strA.localeCompare(strB)
        })
    if (getParamValue(params.sorting) === "TITLE_DESC")
        arr.sort((a, b) => {
            const titleA = asUnifiedMedia(a?.media)?.title
            const strA = titleA?.english || titleA?.romaji || ""
            const titleB = asUnifiedMedia(b?.media)?.title
            const strB = titleB?.english || titleB?.romaji || ""
            return strB.localeCompare(strA)
        }).reverse()

    // Sort by release date
    if (getParamValue(params.sorting) === "RELEASE_DATE" || getParamValue(params.sorting) === "RELEASE_DATE_DESC") {
        arr = arr?.filter(n => {
            const media = asUnifiedMedia(n?.media)
            return media?.startDate && !!media.startDate.year && !!media.startDate.month
        })
    }
    if (getParamValue(params.sorting) === "RELEASE_DATE")
        arr = sortBy(arr, n => {
            const media = asUnifiedMedia(n?.media)
            const startDate = media!.startDate!
            return new Date(startDate.year!, startDate.month! - 1)
        })
    if (getParamValue(params.sorting) === "RELEASE_DATE_DESC")
        arr = sortBy(arr, n => {
            const media = asUnifiedMedia(n?.media)
            const startDate = media!.startDate!
            return new Date(startDate.year!, startDate.month! - 1)
        }).reverse()

    // Sort by score
    if (getParamValue(params.sorting) === "SCORE")
        arr = sortBy(arr, n => n?.score || 999999)
    if (getParamValue(params.sorting) === "SCORE_DESC")
        arr = sortBy(arr, n => n?.score || 0).reverse()

    // Sort by start date
    if (getParamValue(params.sorting) === "START_DATE")
        arr = sortBy(arr, n => new Date(n?.startedAt?.year || 9999, (n?.startedAt?.month || 1) - 1, n?.startedAt?.day || 1))
    if (getParamValue(params.sorting) === "START_DATE_DESC")
        arr = sortBy(arr, n => new Date(n?.startedAt?.year || 1000, (n?.startedAt?.month || 1) - 1, n?.startedAt?.day || 1)).reverse()

    // Sort by end date
    if (getParamValue(params.sorting) === "END_DATE" || getParamValue(params.sorting) === "END_DATE_DESC") {
        arr = arr?.filter(n => n.completedAt && !!n.completedAt.year && !!n.completedAt.month && !!n.completedAt.day)
    }
    if (getParamValue(params.sorting) === "END_DATE")
        arr = sortBy(arr, n => {
            const comp = n.completedAt!
            return new Date(comp.year!, comp.month! - 1, comp.day)
        })
    if (getParamValue(params.sorting) === "END_DATE_DESC")
        arr = sortBy(arr, n => {
            const comp = n.completedAt!
            return new Date(comp.year!, comp.month! - 1, comp.day)
        }).reverse()

    // Sort by progress
    if (getParamValue(params.sorting) === "PROGRESS")
        arr = sortBy(arr, n => n?.progress || 0)
    if (getParamValue(params.sorting) === "PROGRESS_DESC")
        arr = sortBy(arr, n => n?.progress || 0).reverse()

    return arr
}

export function filterCollectionEntries<T extends Anime_LibraryCollectionEntry[], V extends CollectionType>(
    type: V,
    entries: T | null | undefined,
    params: CollectionParams<V>,
    showAdultContent: boolean | undefined,
) {
    if (!entries) return []
    let arr = [...entries]

    // Filter by isAdult
    if (!!arr && params.isAdult) arr = arr.filter(n => asUnifiedMedia(n.media)?.isAdult)

    // Filter by showAdultContent
    if (!showAdultContent) arr = arr.filter(n => !asUnifiedMedia(n.media)?.isAdult)

    // Filter by format
    if (!!arr && !!params.format) arr = arr.filter(n => asUnifiedMedia(n.media)?.format === params.format)

    // Filter by season
    if (!!arr && !!params.season) arr = arr.filter(n => asUnifiedMedia(n.media)?.season === params.season)

    // Filter by status
    if (!!arr && !!params.status) arr = arr.filter(n => asUnifiedMedia(n.media)?.status === params.status)

    // Filter by year
    if (!!arr && !!params.year) arr = arr.filter(n => {
        const media = asUnifiedMedia(n.media)
        return media?.seasonYear === Number(params.year) || media?.startDate?.year === Number(params.year)
    })

    // Filter by genre
    if (!!arr && !!params.genre?.length) {
        arr = arr.filter(n => {
            const media = asUnifiedMedia(n.media)
            return params.genre?.every(genre => media?.genres?.includes(genre))
        })
    }

    // Initial sort by name
    arr = sortBy(arr, n => {
        const title = asUnifiedMedia(n?.media)?.title
        return title?.english || title?.romaji || ""
    }).reverse()

    // Sort by title
    if (getParamValue(params.sorting) === "TITLE")
        arr.sort((a, b) => {
            const titleA = asUnifiedMedia(a?.media)?.title
            const strA = titleA?.english || titleA?.romaji || ""
            const titleB = asUnifiedMedia(b?.media)?.title
            const strB = titleB?.english || titleB?.romaji || ""
            return strA.localeCompare(strB)
        })
    if (getParamValue(params.sorting) === "TITLE_DESC")
        arr.sort((a, b) => {
            const titleA = asUnifiedMedia(a?.media)?.title
            const strA = titleA?.english || titleA?.romaji || ""
            const titleB = asUnifiedMedia(b?.media)?.title
            const strB = titleB?.english || titleB?.romaji || ""
            return strB.localeCompare(strA)
        }).reverse()

    // Sort by release date
    if (getParamValue(params.sorting) === "RELEASE_DATE" || getParamValue(params.sorting) === "RELEASE_DATE_DESC") {
        arr = arr?.filter(n => {
            const media = asUnifiedMedia(n.media)
            if (typeof media?.startDate === 'string') {
                return !!media.startDate && new Date(media.startDate).toString() !== 'Invalid Date'
            }
            const dateObj = media?.startDate as { year?: number; month?: number } | undefined
            return dateObj && !!dateObj.year && !!dateObj.month
        })
    }
    if (getParamValue(params.sorting) === "RELEASE_DATE")
        arr = sortBy(arr, n => {
            const media = asUnifiedMedia(n.media)
            if (typeof media?.startDate === 'string') return new Date(media.startDate)
            const dateObj = media?.startDate as { year?: number; month?: number } | undefined
            return new Date(dateObj?.year || 1970, (dateObj?.month || 1) - 1)
        })
    if (getParamValue(params.sorting) === "RELEASE_DATE_DESC")
        arr = sortBy(arr, n => {
            const media = asUnifiedMedia(n.media)
            if (typeof media?.startDate === 'string') return new Date(media.startDate)
            const dateObj = media?.startDate as { year?: number; month?: number } | undefined
            return new Date(dateObj?.year || 1970, (dateObj?.month || 1) - 1)
        }).reverse()

    // Sort by score
    if (getParamValue(params.sorting) === "SCORE")
        arr = sortBy(arr, n => {
            return n?.listData?.score || 999999
        })
    if (getParamValue(params.sorting) === "SCORE_DESC")
        arr = sortBy(arr, n => n?.listData?.score || 0).reverse()

    // Sort by start date
    if (getParamValue(params.sorting) === "START_DATE")
        arr = sortBy(arr, n => new Date(n?.listData?.startedAt ?? new Date(9999, 1, 1).toISOString()))
    if (getParamValue(params.sorting) === "START_DATE_DESC")
        arr = sortBy(arr, n => new Date(n?.listData?.startedAt ?? new Date(1000, 1, 1).toISOString())).reverse()

    // Sort by end date
    if (getParamValue(params.sorting) === "END_DATE" || getParamValue(params.sorting) === "END_DATE_DESC") {
        arr = arr?.filter(n => !!n.listData?.completedAt)
    }
    if (getParamValue(params.sorting) === "END_DATE")
        arr = sortBy(arr, n => new Date(n.listData!.completedAt!))
    if (getParamValue(params.sorting) === "END_DATE_DESC")
        arr = sortBy(arr, n => new Date(n.listData!.completedAt!)).reverse()

    // Sort by progress
    if (getParamValue(params.sorting) === "PROGRESS")
        arr = sortBy(arr, n => n?.listData?.progress || 0)
    if (getParamValue(params.sorting) === "PROGRESS_DESC")
        arr = sortBy(arr, n => n?.listData?.progress || 0).reverse()

    return arr
}

/** */
export function filterAnimeCollectionEntries<T extends Anime_LibraryCollectionEntry[]>(
    entries: T | null | undefined,
    params: CollectionParams<"anime">,
    showAdultContent: boolean | undefined,
    continueWatchingList: Anime_Episode[] | null | undefined,
    watchHistory: Continuity_WatchHistory | null | undefined,
) {
    let arr = filterCollectionEntries("anime", entries, params, showAdultContent)

    if (params.continueWatchingOnly) {
        arr = arr.filter(n => continueWatchingList?.findIndex(e => e.baseAnime?.id === n.media?.id) !== -1)
    }

    // Sort by airdate
    if (getParamValue(params.sorting) === "AIRDATE") {
        arr = sortBy(arr,
            n => continueWatchingList?.find(c => c.baseAnime?.id === n.media?.id)?.episodeMetadata?.airDate || new Date(9999, 1, 1).toISOString())
    }
    if (getParamValue(params.sorting) === "AIRDATE_DESC") {
        arr = sortBy(arr,
            n => continueWatchingList?.find(c => c.baseAnime?.id === n.media?.id)?.episodeMetadata?.airDate || new Date(1000, 1, 1).toISOString())
            .reverse()
    }

    // Sort by unwatched episodes
    if (getParamValue(params.sorting) === "UNWATCHED_EPISODES") {
        arr = sortBy(arr,
            n => !!n.libraryData?.mainFileCount ? n.libraryData?.unwatchedCount : (media_getUnwatchedCount(asUnifiedMedia(n.media),
                n.listData?.progress) || 99999))
    }
    if (getParamValue(params.sorting) === "UNWATCHED_EPISODES_DESC") {
        arr = sortBy(arr,
            n => !!n.libraryData?.mainFileCount ? n.libraryData?.unwatchedCount : (media_getUnwatchedCount(asUnifiedMedia(n.media),
                n.listData?.progress) || 99999))
            .reverse()
    }

    // Sort by last watched
    if (getParamValue(params.sorting) === "LAST_WATCHED") {
        arr = sortBy(arr, n => watchHistory?.[n.media?.id ?? 0]?.timeUpdated || new Date(9999, 1, 1).toISOString())
    }
    if (getParamValue(params.sorting) === "LAST_WATCHED_DESC") {
        arr = sortBy(arr, n => watchHistory?.[n.media?.id ?? 0]?.timeUpdated || new Date(1000, 1, 1).toISOString()).reverse()
    }

    return arr
}



export function sortContinueWatchingEntries(
    entries: Anime_Episode[] | null | undefined,
    sorting: ContinueWatchingSorting,
    libraryEntries: Anime_LibraryCollectionEntry[] | null | undefined,
    watchHistory: Continuity_WatchHistory | null | undefined,
) {
    if (!entries) return []
    let arr = [...entries]

    // Initial sort by name
    arr = sortBy(arr, n => n?.displayTitle)

    // Sort by episode number
    if (sorting === "EPISODE_NUMBER")
        arr = sortBy(arr, n => n?.episodeNumber)
    if (sorting === "EPISODE_NUMBER_DESC")
        arr = sortBy(arr, n => n?.episodeNumber).reverse()

    // Sort by airdate
    if (sorting === "AIRDATE")
        arr = sortBy(arr, n => n?.episodeMetadata?.airDate)
    if (sorting === "AIRDATE_DESC")
        arr = sortBy(arr, n => n?.episodeMetadata?.airDate).reverse()

    // Sort by unwatched episodes
    if (sorting === "UNWATCHED_EPISODES")
        arr = sortBy(arr,
            n => libraryEntries?.find(e => e.media?.id === n.baseAnime?.id)?.libraryData?.unwatchedCount ?? (media_getUnwatchedCount(asUnifiedMedia(n.baseAnime),
                libraryEntries?.find(e => e.media?.id === n.baseAnime?.id)?.listData?.progress) || 99999))
    if (sorting === "UNWATCHED_EPISODES_DESC")
        arr = sortBy(arr,
            n => libraryEntries?.find(e => e.media?.id === n.baseAnime?.id)?.libraryData?.unwatchedCount ?? media_getUnwatchedCount(asUnifiedMedia(n.baseAnime),
                libraryEntries?.find(e => e.media?.id === n.baseAnime?.id)?.listData?.progress))
            .reverse()

    // Sort by score
    if (sorting === "SCORE")
        arr = sortBy(arr, n => libraryEntries?.find(e => e.media?.id === n.baseAnime?.id)?.listData?.score || 999999)
    if (sorting === "SCORE_DESC")
        arr = sortBy(arr, n => libraryEntries?.find(e => e.media?.id === n.baseAnime?.id)?.listData?.score || 0).reverse()

    // Sort by start date
    if (sorting === "START_DATE")
        arr = sortBy(arr, n => libraryEntries?.find(e => e.media?.id === n.baseAnime?.id)?.listData?.startedAt || new Date(9999, 1, 1).toISOString())
    if (sorting === "START_DATE_DESC")
        arr = sortBy(arr, n => libraryEntries?.find(e => e.media?.id === n.baseAnime?.id)?.listData?.startedAt || new Date(1000, 1, 1).toISOString())
            .reverse()


    // Sort by last watched
    if (sorting === "LAST_WATCHED")
        arr = sortBy(arr, n => watchHistory?.[n.baseAnime?.id ?? 0]?.timeUpdated || new Date(9999, 1, 1).toISOString())
    if (sorting === "LAST_WATCHED_DESC")
        arr = sortBy(arr, n => watchHistory?.[n.baseAnime?.id ?? 0]?.timeUpdated || new Date(1000, 1, 1).toISOString())
            .reverse()

    return arr
}
