import type { Nullish } from './common.types'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Dto
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/database/models/dto/localfile.go
 * - Filename: localfile.go
 * - Package: dto
 */
export type AudioStreamInfo = {
    /**
     * e.g. aac, flac
     */
    codec?: string
    /**
     * e.g. jpn, eng
     */
    language?: string
    /**
     * e.g. Japanese 5.1
     */
    title?: string
}

/**
 * - Filepath: internal/database/models/dto/media_metadata.go
 * - Filename: media_metadata.go
 * - Package: dto
 * @description
 *  CharacterDTO represents a key character within a specific saga.
 */
export type CharacterDTO = {
    name: string
    /**
     * e.g., "Antagonist", "Defensor"
     */
    roleTag: CharacterRole
    avatarUrl: string
}

/**
 * - Filepath: internal/database/models/dto/media_metadata.go
 * - Filename: media_metadata.go
 * - Package: dto
 * @description
 *  CharacterRole defines the role of a character within a saga.
 */
export type CharacterRole = "Protagonist" | "Antagonist" | "Supporting" | "Background"

/**
 * - Filepath: internal/database/models/dto/media_metadata.go
 * - Filename: media_metadata.go
 * - Package: dto
 * @description
 *  EpisodeType defines the classification of an episode.
 */
export type EpisodeType = "Canon" | "Filler" | "Hyped"

/**
 * - Filepath: internal/database/models/dto/localfile.go
 * - Filename: localfile.go
 * - Package: dto
 */
export type ExternalAudioFile = {
    /**
     * Absolute path to the audio file
     */
    path: string
    /**
     * Base filename
     */
    filename: string
    /**
     * File extension: dts, ac3, truehd, etc.
     */
    format: string
    /**
     * ISO 639-1 code
     */
    language?: string
}

/**
 * - Filepath: internal/database/models/dto/localfile.go
 * - Filename: localfile.go
 * - Package: dto
 */
export type ExternalSubtitle = {
    /**
     * Absolute path to the subtitle file
     */
    path: string
    /**
     * Base filename
     */
    filename: string
    /**
     * File extension: srt, ass, vtt, sup, etc.
     */
    format: string
    /**
     * ISO 639-1 code (e.g. "es", "en", "ja")
     */
    language?: string
    /**
     * True if "forced" flag present in filename
     */
    isForced?: boolean
    /**
     * True if "sdh" or "hi" flag present (Hearing Impaired)
     */
    isSDH?: boolean
    /**
     * True if "cc" flag present (Closed Captions)
     */
    isCC?: boolean
}

/**
 * - Filepath: internal/database/models/dto/localfile.go
 * - Filename: localfile.go
 * - Package: dto
 */
export type FileTechnicalInfo = {
    duration?: number
    size?: number
    bitrate?: number
    format?: string
    videoStream?: VideoStreamInfo
    audioStreams?: Array<AudioStreamInfo>
    /**
     * Reusing Audio structure since they share basic properties
     */
    subtitleStreams?: Array<AudioStreamInfo>
    /**
     * External .srt/.ass files (Jellyfin-style)
     */
    externalSubtitles?: Array<ExternalSubtitle>
    /**
     * External .dts/.ac3 files
     */
    externalAudioFiles?: Array<ExternalAudioFile>
}

/**
 * - Filepath: internal/database/models/dto/localfile.go
 * - Filename: localfile.go
 * - Package: dto
 */
export type LocalFile = {
    path: string
    name: string
    fileHash?: string
    fileSize?: number
    fileModTime?: number
    parsedInfo?: LocalFileParsedData
    parsedFolderInfo?: Array<LocalFileParsedData>
    embeddedMetadata?: LocalFileEmbeddedMetadata
    metadata?: LocalFileMetadata
    technicalInfo?: FileTechnicalInfo
    locked: boolean
    /**
     * Unused for now
     */
    ignored: boolean
    libraryMediaId: number
    mediaId: number
}

/**
 * - Filepath: internal/database/models/dto/localfile.go
 * - Filename: localfile.go
 * - Package: dto
 */
export type LocalFileEmbeddedMetadata = {
    title?: string
    season?: number
    episode?: number
    source?: string
}

/**
 * - Filepath: internal/database/models/dto/localfile.go
 * - Filename: localfile.go
 * - Package: dto
 */
export type LocalFileMetadata = {
    /**
     * Multi-episode support for files like "01-03"
     */
    episodes?: Array<number>
    aniDBEpisode: string
    type: LocalFileType
    /**
     * Canon, Filler, Hyped
     */
    episodeType?: EpisodeType
    episode: number
}

/**
 * - Filepath: internal/database/models/dto/localfile.go
 * - Filename: localfile.go
 * - Package: dto
 */
export type LocalFileParsedData = {
    original: string
    title?: string
    releaseGroup?: string
    season?: string
    seasonRange?: Array<string>
    part?: string
    partRange?: Array<string>
    episode?: string
    episodeRange?: Array<string>
    episodeTitle?: string
    year?: string
}

/**
 * - Filepath: internal/database/models/dto/localfile.go
 * - Filename: localfile.go
 * - Package: dto
 */
export type LocalFileType = "main" | "special" | "nc"

/**
 * - Filepath: internal/database/models/dto/media_metadata.go
 * - Filename: media_metadata.go
 * - Package: dto
 * @description
 *  SagaDTO represents a story arc or saga within a series.
 */
export type SagaDTO = {
    id: string
    name: string
    /**
     * e.g., "1-39"
     */
    episodeRange: string
    startEp: number
    endEp: number
    description: string
    /**
     * True if the entire saga is filler (e.g., Garlic Jr.)
     */
    isFiller: boolean
    canonStatus: string
    antagonists?: Array<string>
    keyEvents?: Array<string>
    newCharacters?: Array<string>
    keyCharacters?: Array<CharacterDTO>
    subSagas?: Array<SubSagaDTO>
}

/**
 * - Filepath: internal/database/models/dto/scan_summary_dto.go
 * - Filename: scan_summary_dto.go
 * - Package: dto
 */
export type ScanSummary = {
    id: string
    groups?: Array<ScanSummaryGroup>
    unmatchedFiles?: Array<ScanSummaryFile>
}

/**
 * - Filepath: internal/database/models/dto/scan_summary_dto.go
 * - Filename: scan_summary_dto.go
 * - Package: dto
 */
export type ScanSummaryFile = {
    id: string
    localFile?: LocalFile
    logs?: Array<ScanSummaryLog>
}

/**
 * - Filepath: internal/database/models/dto/scan_summary_dto.go
 * - Filename: scan_summary_dto.go
 * - Package: dto
 */
export type ScanSummaryGroup = {
    id: string
    files?: Array<ScanSummaryFile>
    mediaId: number
    mediaTitle: string
    mediaImage: string
    /**
     * Whether the media is in the user's collection
     */
    mediaIsInCollection: boolean
}

/**
 * - Filepath: internal/database/models/dto/scan_summary_dto.go
 * - Filename: scan_summary_dto.go
 * - Package: dto
 */
export type ScanSummaryItem = {
    createdAt?: string
    scanSummary?: ScanSummary
}

/**
 * - Filepath: internal/database/models/dto/scan_summary_dto.go
 * - Filename: scan_summary_dto.go
 * - Package: dto
 */
export type ScanSummaryLog = {
    id: string
    filePath: string
    level: string
    message: string
}

/**
 * - Filepath: internal/database/models/dto/media_metadata.go
 * - Filename: media_metadata.go
 * - Package: dto
 * @description
 *  SubSagaDTO represents a sub-saga or story beat within a saga.
 */
export type SubSagaDTO = {
    id: string
    name: string
    /**
     * e.g., "1-6"
     */
    episodeRange: string
    startEp: number
    endEp: number
}

/**
 * - Filepath: internal/database/models/dto/localfile.go
 * - Filename: localfile.go
 * - Package: dto
 */
export type VideoStreamInfo = {
    /**
     * e.g. h264, hevc
     */
    codec?: string
    /**
     * e.g. High 10, Main
     */
    profile?: string
    /**
     * 1920
     */
    width?: number
    /**
     * 1080
     */
    height?: number
    /**
     * 24000/1001
     */
    frameRate?: string
    /**
     * e.g. bt2020nc
     */
    colorSpace?: string
    /**
     * e.g. smpte2084
     */
    colorTransfer?: string
    /**
     * e.g. bt2020
     */
    colorPrimaries?: string
}

