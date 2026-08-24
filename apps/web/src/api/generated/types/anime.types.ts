import type { Nullish } from './common.types'
import type { Models_LibraryMedia, Models_LibrarySeason, Models_LibraryEpisode } from './models.types'
import type { Anime_LocalFile, Anime_LocalFileType, Anime_LocalFileMetadata } from './video.types'
import type { Metadata_AnimeMetadata } from './mediastream.types'
import type { UnifiedMedia } from './platform.types'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Anime
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/library/anime/intelligence.go
 * - Filename: intelligence.go
 * - Package: anime
 * @description
 *  ArcName is the narrative saga an episode belongs to.
 */
export type Anime_ArcName = string

/**
 * - Filepath: internal/library/anime/intelligence.go
 * - Filename: intelligence.go
 * - Package: anime
 * @description
 *  ContentTag classifies an episode's narrative role.
 */
export type Anime_ContentTag = "FILLER" | "EPIC" | "CANON" | "SPECIAL"

/**
 * - Filepath: internal/library/anime/entry.go
 * - Filename: entry.go
 * - Package: anime
 */
export type Anime_Entry = {
    mediaId: number
    media?: Models_LibraryMedia
    listData?: Anime_EntryListData
    libraryData?: Anime_EntryLibraryData
    downloadInfo?: Anime_EntryDownloadInfo
    episodes?: Array<Anime_Episode>
    nextEpisode?: Anime_Episode
    localFiles?: Array<Anime_LocalFile>
    anidbId: number
    malId: number
    currentEpisodeCount: number
    seasons?: Array<Models_LibrarySeason>
    vibes?: Array<string>
}

/**
 * - Filepath: internal/library/anime/entry_download_info.go
 * - Filename: entry_download_info.go
 * - Package: anime
 */
export type Anime_EntryDownloadEpisode = {
    episodeNumber: number
    aniDBEpisode: string
    episode?: Anime_Episode
}

/**
 * - Filepath: internal/library/anime/entry_download_info.go
 * - Filename: entry_download_info.go
 * - Package: anime
 */
export type Anime_EntryDownloadInfo = {
    episodesToDownload?: Array<Anime_EntryDownloadEpisode>
    canBatch: boolean
    batchAll: boolean
    hasInaccurateSchedule: boolean
    rewatch: boolean
    absoluteOffset: number
}

/**
 * - Filepath: internal/library/anime/entry_library_data.go
 * - Filename: entry_library_data.go
 * - Package: anime
 */
export type Anime_EntryLibraryData = {
    allFilesLocked: boolean
    sharedPath: string
    unwatchedCount: number
    mainFileCount: number
}

/**
 * - Filepath: internal/library/anime/entry.go
 * - Filename: entry.go
 * - Package: anime
 */
export type Anime_EntryListData = {
    progress?: number
    score?: number
    status?: string
    repeat?: number
    startedAt?: string
    completedAt?: string
}

/**
 * - Filepath: internal/library/anime/episode.go
 * - Filename: episode.go
 * - Package: anime
 */
export type Anime_Episode = {
    type: Anime_LocalFileType
    /**
     * e.g, Show: "Episode 1", Movie: "Violet Evergarden The Movie"
     */
    displayTitle: string
    /**
     * e.g, "Shibuya Incident - Gate, Open"
     */
    episodeTitle: string
    episodeNumber: number
    seasonNumber?: number
    /**
     * AniDB episode number
     */
    aniDBEpisode?: string
    absoluteEpisodeNumber: number
    /**
     * Usually the same as EpisodeNumber, unless there is a discrepancy between platform and metadata provider
     */
    progressNumber: number
    localFile?: Anime_LocalFile
    /**
     * Multiple versions of the same episode
     */
    additionalFiles?: Array<Anime_LocalFile>
    /**
     * Is in the local files
     */
    isDownloaded: boolean
    /**
     * (image, airDate, length, summary, overview)
     */
    episodeMetadata?: Anime_EpisodeMetadata
    /**
     * (episode, aniDBEpisode, type...)
     */
    fileMetadata?: Anime_LocalFileMetadata
    /**
     * No AniDB data
     */
    isInvalid: boolean
    /**
     * Alerts the user that there is a discrepancy between platform and metadata provider
     */
    metadataIssue?: string
    sagaName?: string
    sagaId?: string
    baseAnime?: Models_LibraryMedia
    intelligence?: Anime_EpisodeIntelligence
    watched: boolean
    titleSpanish?: string
}

/**
 * - Filepath: internal/library/anime/episode_collection.go
 * - Filename: episode_collection.go
 * - Package: anime
 */
export type Anime_EpisodeCollection = {
    hasMappingError: boolean
    episodes?: Array<Anime_Episode>
    metadata?: Metadata_AnimeMetadata
}

/**
 * - Filepath: internal/library/anime/intelligence.go
 * - Filename: intelligence.go
 * - Package: anime
 * @description
 *  EpisodeIntelligence carries computed intelligence about a single episode.
 */
export type Anime_EpisodeIntelligence = {
    /**
     * 0–10 (derived from LibraryMedia.Score ÷ 10)
     */
    rating: number
    isFiller: boolean
    /**
     * Empty string when unknown
     */
    arcName: Anime_ArcName
    tag: Anime_ContentTag
    /**
     * Emotional or thematic tags (e.g., "EPIC", "CHILL", "TEARS")
     */
    vibes?: Array<string>
}

/**
 * - Filepath: internal/library/anime/episode.go
 * - Filename: episode.go
 * - Package: anime
 */
export type Anime_EpisodeMetadata = {
    anidbId?: number
    image?: string
    airDate?: string
    length?: number
    summary?: string
    overview?: string
    isFiller?: boolean
    /**
     * Indicates if the episode has a real image
     */
    hasImage?: boolean
    title?: string
}

/**
 * - Filepath: internal/library/anime/collection.go
 * - Filename: collection.go
 * - Package: anime
 */
export type Anime_LibraryCollection = {
    continueWatchingList?: Array<Anime_Episode>
    lists?: Array<Anime_LibraryCollectionList>
    unmatchedLocalFiles?: Array<Anime_LocalFile>
    unmatchedGroups?: Array<Anime_UnmatchedGroup>
    ignoredLocalFiles?: Array<Anime_LocalFile>
    unknownGroups?: Array<Anime_UnknownGroup>
    stats?: Anime_LibraryCollectionStats
    /**
     * Hydrated by the route handler
     */
    stream?: Anime_StreamCollection
}

/**
 * - Filepath: internal/library/anime/collection.go
 * - Filename: collection.go
 * - Package: anime
 */
export type Anime_LibraryCollectionEntry = {
    media?: Models_LibraryMedia
    mediaId: number
    /**
     * For episode-specific swimlanes
     */
    episode?: Models_LibraryEpisode
    /**
     * FULL_LOCAL, HYBRID, ONLY_ONLINE
     */
    availabilityType: string
    /**
     * Library data
     */
    libraryData?: Anime_EntryLibraryData
    /**
     * Local list data
     */
    listData?: Anime_EntryListData
    /**
     * Emotional or thematic tags
     */
    vibes?: Array<string>
    /**
     * AI-derived intelligence tags
     */
    tags?: Array<string>
    /**
     * Primary AI-derived vibe
     */
    dominantVibe: string
}

/**
 * - Filepath: internal/library/anime/collection.go
 * - Filename: collection.go
 * - Package: anime
 */
export type Anime_LibraryCollectionList = {
    type: string
    status: string
    entries?: Array<Anime_LibraryCollectionEntry>
}

/**
 * - Filepath: internal/library/anime/collection.go
 * - Filename: collection.go
 * - Package: anime
 */
export type Anime_LibraryCollectionStats = {
    totalEntries: number
    totalFiles: number
    totalShows: number
    totalMovies: number
    totalSpecials: number
    totalSize: string
}

/**
 * - Filepath: internal/library/anime/missing_episodes.go
 * - Filename: missing_episodes.go
 * - Package: anime
 */
export type Anime_MissingEpisodes = {
    episodes?: Array<Anime_Episode>
    silencedEpisodes?: Array<Anime_Episode>
}

/**
 * - Filepath: internal/library/anime/schedule.go
 * - Filename: schedule.go
 * - Package: anime
 */
export type Anime_ScheduleItem = {
    mediaId: number
    title: string
    time: string
    dateTime?: string
    image: string
    episodeNumber: number
    isMovie: boolean
    isSeasonFinale: boolean
}

/**
 * - Filepath: internal/library/anime/collection.go
 * - Filename: collection.go
 * - Package: anime
 */
export type Anime_StreamCollection = {
    continueWatchingList?: Array<Anime_Episode>
    anime?: Array<Models_LibraryMedia>
    listData?: Record<number, Anime_EntryListData>
}

/**
 * - Filepath: internal/library/anime/collection.go
 * - Filename: collection.go
 * - Package: anime
 */
export type Anime_UnknownGroup = {
    mediaId: number
    localFiles?: Array<Anime_LocalFile>
}

/**
 * - Filepath: internal/library/anime/collection.go
 * - Filename: collection.go
 * - Package: anime
 */
export type Anime_UnmatchedGroup = {
    dir: string
    localFiles?: Array<Anime_LocalFile>
    suggestions?: Array<Models_LibraryMedia>
}

/**
 * - Filepath: internal/library/anime/upcoming_episodes.go
 * - Filename: upcoming_episodes.go
 * - Package: anime
 */
export type Anime_UpcomingEpisode = {
    mediaId: number
    episodeNumber: number
    airingAt: number
    timeUntilAiring: number
    baseAnime?: UnifiedMedia
    episodeMetadata?: Anime_EpisodeMetadata
}

/**
 * - Filepath: internal/library/anime/upcoming_episodes.go
 * - Filename: upcoming_episodes.go
 * - Package: anime
 */
export type Anime_UpcomingEpisodes = {
    episodes?: Array<Anime_UpcomingEpisode>
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Continuity
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/continuity/manager.go
 * - Filename: manager.go
 * - Package: continuity
 */
export type Continuity_Kind = "onlinestream" | "mediastream" | "external_player"

/**
 * - Filepath: internal/continuity/history.go
 * - Filename: history.go
 * - Package: continuity
 */
export type Continuity_UpdateWatchHistoryItemOptions = {
    currentTime: number
    duration: number
    mediaId: number
    episodeNumber: number
    filepath?: string
    predictive: boolean
    kind: Continuity_Kind
}

/**
 * - Filepath: ..\internal\continuity\history.go
 * - Filename: history.go
 * - Package: continuity
 */
export type Continuity_WatchHistory = Record<number, Continuity_WatchHistoryItem>

/**
 * - Filepath: internal/continuity/history.go
 * - Filename: history.go
 * - Package: continuity
 */
export type Continuity_WatchHistoryItem = {
    kind: Continuity_Kind
    filepath: string
    mediaId: number
    episodeNumber: number
    currentTime: number
    duration: number
    timeAdded?: string
    timeUpdated?: string
}

/**
 * - Filepath: internal/continuity/history.go
 * - Filename: history.go
 * - Package: continuity
 */
export type Continuity_WatchHistoryItemResponse = {
    item?: Continuity_WatchHistoryItem
    found: boolean
}

