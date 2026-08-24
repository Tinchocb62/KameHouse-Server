import type { Nullish } from './common.types'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Platform
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type FuzzyDate = {
    year?: number
    month?: number
    day?: number
}

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type MediaCoverImage = {
    extraLarge?: string
    large?: string
    medium?: string
    color?: string
}

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type MediaFormat = "TV" |
    "MOVIE" |
    "SPECIAL" |
    "OVA" |
    "ONA" |
    "MUSIC"

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 * @description
 *  MediaKind distinguishes the content category independently of MediaType.
 *  Anime = Japanese animation (AniList-sourced or manually flagged)
 *  General = western series, movies, documentaries, etc.
 */
export type MediaKind = "ANIME" | "GENERAL"

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type MediaListStatus = "CURRENT" |
    "PLANNING" |
    "COMPLETED" |
    "DROPPED" |
    "PAUSED" |
    "REPEATING"

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type MediaRelationType = "PREQUEL" |
    "SEQUEL" |
    "SPIN_OFF" |
    "SIDE_STORY" |
    "ALTERNATIVE" |
    "PARENT" |
    "SUMMARY" |
    "OTHER"

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type MediaSeason = string

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type MediaStatus = "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS"

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type MediaTitle = {
    romaji?: string
    english?: string
    spanish?: string
    native?: string
}

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type MediaType = string

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type NextAiringEpisode = {
    airingAt: number
    timeUntilAiring: number
    episode: number
}

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type PlatformUser = {
    id: number
    name: string
    avatar?: string
    bannerImage?: string
}

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type UnifiedCharacter = {
    name: string
    role: string
    imageUrl: string
}

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type UnifiedCollectionEntry = {
    id: number
    media?: UnifiedMedia
    status: MediaListStatus
    score?: number
    progress?: number
    repeat?: number
    startedAt?: FuzzyDate
    completedAt?: FuzzyDate
}

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type UnifiedMedia = {
    id: number
    type: MediaType
    format: MediaFormat
    status: MediaStatus
    title?: MediaTitle
    episodes?: number
    coverImage?: MediaCoverImage
    bannerImage?: string
    overview?: string
    startDate?: FuzzyDate
    endDate?: FuzzyDate
    season?: MediaSeason
    seasonYear?: number
    isAdult: boolean
    genres?: Array<string>
    nextAiringEpisode?: NextAiringEpisode
    relations?: Array<UnifiedMediaRelation>
    /**
     * "ANIME" or "GENERAL"
     */
    kind: MediaKind
    description?: string
    score?: number
    imdbId?: string
    collectionId?: number
    collectionName?: string
    runtime?: number
    studios?: Array<string>
    demographics?: Array<string>
    openings?: Array<string>
    endings?: Array<string>
    characters?: Array<UnifiedCharacter>
}

/**
 * - Filepath: internal/platforms/platform/models.go
 * - Filename: models.go
 * - Package: platform
 */
export type UnifiedMediaRelation = {
    id: number
    relationType: MediaRelationType
    media?: UnifiedMedia
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Pretranscode
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/mediastream/pretranscode/pretranscode.go
 * - Filename: pretranscode.go
 * - Package: pretranscode
 */
export type JobStatus = "queued" | "running" | "completed" | "failed"

/**
 * - Filepath: internal/mediastream/pretranscode/pretranscode.go
 * - Filename: pretranscode.go
 * - Package: pretranscode
 * @description
 *  PreTranscodeJob is one file's pre-transcode, tracked from queue to completion.
 */
export type PreTranscodeJob = {
    hash: string
    filePath: string
    status: JobStatus
    /**
     * 0-100
     */
    progress: number
    error?: string
    queuedAt?: string
    endedAt?: string
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Tmdb
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/api/tmdb/types.go
 * - Filename: types.go
 * - Package: tmdb
 * @description
 *  SearchResult represents a single search result from TMDb.
 */
export type SearchResult = {
    id: number
    /**
     * For TV shows
     */
    name: string
    /**
     * For movies
     */
    title: string
    /**
     * For TV shows
     */
    original_name: string
    /**
     * For movies
     */
    original_title: string
    original_language: string
    overview: string
    /**
     * For TV shows
     */
    first_air_date: string
    /**
     * For movies
     */
    release_date: string
    genre_ids?: Array<number>
    origin_country?: Array<string>
    poster_path: string
    backdrop_path: string
    number_of_episodes: number
    vote_average: number
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// User
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/user/user.go
 * - Filename: user.go
 * - Package: user
 */
export type User = {
    viewer?: PlatformUser
    token: string
    isSimulated: boolean
}

