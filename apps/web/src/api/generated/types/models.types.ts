import type { Nullish } from './common.types'
import type { UnifiedMediaRelation } from './platform.types'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Models
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/database/models/models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_EpisodeSkipTime = {
    mediaId: number
    episodeNumber: number
    opStart: number
    opEnd: number
    edOffset: number
    edEnd: number
    source: string
    confidence: number
    id: number
    createdAt?: string
    updatedAt?: string
}

/**
 * - Filepath: internal/database/models/models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_GhostAssociatedMedia = {
    path: string
    targetMediaId: number
    ghostMatchCount: number
    algorithmScore: number
    userResolved: boolean
    originalTitle: string
    confidence: number
    id: number
    createdAt?: string
    updatedAt?: string
}

/**
 * - Filepath: internal/database/models/models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_HomeItem = {
    id: string
    type: string
}

/**
 * - Filepath: internal/database/models/library.go
 * - Filename: library.go
 * - Package: models
 * @description
 *  LibraryEpisode represents a single episode of a LibraryMedia.
 */
export type Models_LibraryEpisode = {
    libraryMediaId: number
    episodeNumber: number
    absoluteNumber: number
    seasonNumber: number
    /**
     * "REGULAR", "SPECIAL"
     */
    type: string
    title: string
    description: string
    /**
     * Thumbnail path/URL
     */
    image: string
    airDate?: string
    runtimeMinutes: number
    sagaName: string
    sagaId: string
    tags?: Record<string, any>
    dominantVibe: string
    suggestedSwimlane: string
    /**
     * JSON array of strings
     */
    audioTracks?: Record<string, any>
    /**
     * JSON array of strings
     */
    subtitleTracks?: Record<string, any>
    id: number
    createdAt?: string
    updatedAt?: string
}

/**
 * - Filepath: internal/database/models/library.go
 * - Filename: library.go
 * - Package: models
 * @description
 *  LibraryMedia represents a local TV show, Anime, or Movie.
 *  It is decoupled from third-party platforms and uses its own primary key.
 */
export type Models_LibraryMedia = {
    /**
     * e.g., "ANIME", "SHOW", "MOVIE"
     */
    type: string
    /**
     * e.g., "TV", "TV_SHORT", "MOVIE", "OVA", "SPECIAL"
     */
    format: string
    status: string
    /**
     * "COMPLETE", "MISSING", "LOCAL"
     */
    metadataStatus: string
    titleOriginal: string
    titleRomaji: string
    titleEnglish: string
    titleSpanish: string
    /**
     * JSON array of strings
     */
    synonyms?: Record<string, any>
    description: string
    /**
     * Path or URL
     */
    posterImage: string
    /**
     * Path or URL
     */
    bannerImage: string
    tmdbId: number
    anidbId: number
    myanimelistId: number
    seasonNumber: number
    startDate?: string
    endDate?: string
    year: number
    score: number
    rating: number
    isNsfw: boolean
    /**
     * JSON array of strings
     */
    genres?: Record<string, any>
    /**
     * JSON array of strings or objects
     */
    tags?: Record<string, any>
    dominantVibe: string
    suggestedSwimlane: string
    totalEpisodes: number
    runtime: number
    /**
     * JSON array of strings
     */
    audioTracks?: Record<string, any>
    /**
     * JSON array of strings
     */
    subtitleTracks?: Record<string, any>
    logoImage: string
    thumbImage: string
    clearArtImage: string
    idMal?: number
    relations?: Array<UnifiedMediaRelation>
    characters?: Models_LibraryMediaCharacterConnection
    watched?: boolean
    id: number
    createdAt?: string
    updatedAt?: string
}

/**
 * - Filepath: internal/database/models/library.go
 * - Filename: library.go
 * - Package: models
 */
export type Models_LibraryMediaCharacter = {
    name?: Models_LibraryMediaCharacterName
    image?: Models_LibraryMediaCharacterImage
}

/**
 * - Filepath: internal/database/models/library.go
 * - Filename: library.go
 * - Package: models
 */
export type Models_LibraryMediaCharacterConnection = {
    edges?: Array<Models_LibraryMediaCharacterEdge>
}

/**
 * - Filepath: internal/database/models/library.go
 * - Filename: library.go
 * - Package: models
 */
export type Models_LibraryMediaCharacterEdge = {
    role: string
    node?: Models_LibraryMediaCharacter
}

/**
 * - Filepath: internal/database/models/library.go
 * - Filename: library.go
 * - Package: models
 */
export type Models_LibraryMediaCharacterImage = {
    large: string
}

/**
 * - Filepath: internal/database/models/library.go
 * - Filename: library.go
 * - Package: models
 */
export type Models_LibraryMediaCharacterName = {
    full: string
}

/**
 * - Filepath: ..\internal\database\models\models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_LibraryPaths = Array<string>

/**
 * - Filepath: internal/database/models/library.go
 * - Filename: library.go
 * - Package: models
 * @description
 *  LibrarySeason represents a season (or saga) of a LibraryMedia.
 */
export type Models_LibrarySeason = {
    libraryMediaId: number
    seasonNumber: number
    title: string
    description: string
    /**
     * Thumbnail path/URL
     */
    image: string
    id: number
    createdAt?: string
    updatedAt?: string
}

/**
 * - Filepath: internal/database/models/models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_LibrarySettings = {
    seriesPaths: Models_LibraryPaths
    moviePaths: Models_LibraryPaths
    openWebURLOnStart: boolean
    refreshLibraryOnStart: boolean
    autoPlayNextEpisode: boolean
    autoDetectSkipTimes: boolean
    enableWatchContinuity: boolean
    scannerMatchingThreshold: number
    scannerMatchingAlgorithm: string
    useFallbackMetadataProvider: boolean
    primaryMetadataProvider: string
    tmdbApiKey: string
    tmdbLanguage: string
    scannerStrictStructure: boolean
    scannerConfig: string
    scannerProvider: string
    disableLocalScanning: boolean
    scannerUseLegacyMatching: boolean
    fanartApiKey: string
    omdbApiKey: string
    lastScanAt?: string
    autoScan: boolean
}

/**
 * - Filepath: internal/database/models/models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_MediaMetadataParent = {
    mediaId: number
    parentId: number
    specialOffset: number
    id: number
    createdAt?: string
    updatedAt?: string
}

/**
 * - Filepath: internal/database/models/models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_MediaPlayerSettings = Record<string, never>

/**
 * - Filepath: internal/database/models/models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_MediastreamSettings = {
    transcodeEnabled: boolean
    ffmpegPath: string
    ffprobePath: string
    preTranscodeLibraryDir: string
    transcodeHwAccel: string
    transcodePreset: string
    transcodeHwAccelCustomSettings: string
    preTranscodeEnabled: boolean
    transcodeThreads: number
    directPlayOnly: boolean
    disableAutoSwitchToDirectPlay: boolean
    id: number
    createdAt?: string
    updatedAt?: string
}

/**
 * - Filepath: internal/database/models/models.go
 * - Filename: models.go
 * - Package: models
 * @description
 *  Notification is a persisted in-app notification (scan completed, transcode
 *  fallback, system events). Created by the notifier module and surfaced in the
 *  web client's notification center.
 */
export type Models_Notification = {
    /**
     * "scanner" | "mediastream" | "system"
     */
    type: string
    title: string
    message: string
    read: boolean
    id: number
    createdAt?: string
    updatedAt?: string
}

/**
 * - Filepath: internal/database/models/models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_NotificationSettings = {
    disableNotifications: boolean
    disableAutoScannerNotifications: boolean
}

/**
 * - Filepath: internal/database/models/models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_PlatformSettings = {
    hideAudienceScore: boolean
}

/**
 * - Filepath: internal/database/models/models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_Settings = {
    library: Models_LibrarySettings
    mediaPlayer: Models_MediaPlayerSettings
    notifications: Models_NotificationSettings
    Platform: Models_PlatformSettings
    mediastream?: Models_MediastreamSettings
    theme?: Models_Theme
    updated: boolean
    id: number
    createdAt?: string
    updatedAt?: string
}

/**
 * - Filepath: ..\internal\database\models\models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_StringSlice = Array<string>

/**
 * - Filepath: internal/database/models/models.go
 * - Filename: models.go
 * - Package: models
 */
export type Models_Theme = {
    enableColorSettings: boolean
    backgroundColor: string
    accentColor: string
    sidebarBackgroundColor: string
    themeEra: string
    /**
     * "classic" | "advanced" | "era" | "" (legacy, derivado en el cliente)
     */
    themeMode: string
    themeEnableLiquidGlass: boolean
    homeItems?: Array<string>
    themeAnimeEntryScreenLayout: string
    themeSmallerEpisodeCarouselSize: boolean
    themeExpandSidebarOnHover: boolean
    themeDisableSidebarTransparency: boolean
    themeEnableBlurringEffects: boolean
    themeEnableSidebarGradient: boolean
    themeDisableCarouselAutoScroll: boolean
    themeUseLegacyEpisodeCard: boolean
    themeEnableCinematicGrain: boolean
    themeLibraryScreenBannerType: string
    themeLibraryScreenCustomBannerImage: string
    themeLibraryScreenCustomBannerPosition: string
    themeLibraryScreenCustomBannerOpacity: number
    themeLibraryScreenCustomBackgroundImage: string
    themeLibraryScreenCustomBackgroundOpacity: number
    themeLibraryScreenCustomBackgroundBlur: string
    themeDisableLibraryScreenGenreSelector: boolean
    themeMediaPageBannerType: string
    themeMediaPageBannerSize: string
    themeMediaPageBannerInfoBoxSize: string
    themeEnableMediaPageBlurredBackground: boolean
    themeShowEpisodeCardAnimeInfo: boolean
    themeShowAnimeUnwatchedCount: boolean
    themeHideEpisodeCardDescription: boolean
    themeHideDownloadedEpisodeCardFilename: boolean
    themeAnimeLibraryCollectionDefaultSorting: string
    themeCustomCSS: string
    themeMobileCustomCSS: string
    themeUnpinnedMenuItems: Models_StringSlice
    id: number
    createdAt?: string
    updatedAt?: string
}

