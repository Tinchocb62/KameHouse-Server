import type { Nullish } from './common.types'
import type { LocalFile, LocalFileMetadata } from './dto.types'
import type { UnifiedCollectionEntry } from './platform.types'
import type { MediaInfo } from './video.types'
import type { Anime_Episode } from './anime.types'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Intelligence
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/intelligence/types.go
 * - Filename: types.go
 * - Package: intelligence
 * @description
 *  MediaCandidate representa un archivo de video candidato para selección.
 */
export type MediaCandidate = {
    filePath: string
    /**
     * 2160, 1080, 720, 480
     */
    resolution: number
    /**
     * "h264", "hevc", "av1"
     */
    codec: string
    /**
     * bytes/s
     */
    bitrate: number
    /**
     * ["spa", "eng"]
     */
    audioLangs?: Array<string>
    /**
     * "aac", "flac", "dts"
     */
    audioCodec: string
    fileSize: number
    isHDR: boolean
    /**
     * "mkv", "mp4", "webm"
     */
    container: string
}

/**
 * - Filepath: internal/intelligence/types.go
 * - Filename: types.go
 * - Package: intelligence
 * @description
 *  SelectionResult resultado de la selección inteligente.
 */
export type SelectionResult = {
    winner?: MediaCandidate
    allCandidates?: Array<MediaCandidate>
    totalScore: number
    reason: string
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// LibraryExplorer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/library_explorer/filetree.go
 * - Filename: filetree.go
 * - Package: library_explorer
 */
export type LibraryExplorer_FileTreeJSON = {
    root?: LibraryExplorer_FileTreeNodeJSON
    localFiles?: Record<string, LocalFile>
}

/**
 * - Filepath: internal/library_explorer/filetree.go
 * - Filename: filetree.go
 * - Package: library_explorer
 */
export type LibraryExplorer_FileTreeNodeJSON = {
    name: string
    path: string
    normalizedPath: string
    kind: LibraryExplorer_NodeKind
    children?: Array<LibraryExplorer_FileTreeNodeJSON>
    size?: number
    localFile?: LocalFile
    mediaIds?: Array<number>
    localFileCount?: number
    matchedLocalFileCount?: number
}

/**
 * - Filepath: internal/library_explorer/filetree.go
 * - Filename: filetree.go
 * - Package: library_explorer
 */
export type LibraryExplorer_NodeKind = "directory" | "file"

/**
 * - Filepath: internal/library_explorer/superupdate.go
 * - Filename: superupdate.go
 * - Package: library_explorer
 */
export type LibraryExplorer_SuperUpdateFileOptions = {
    path: string
    newName?: string
    metadata?: LocalFileMetadata
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Local
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/local/manager.go
 * - Filename: manager.go
 * - Package: local
 */
export type Local_TrackedMediaItem = {
    mediaId: number
    type: string
    animeEntry?: UnifiedCollectionEntry
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Mediastream
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/mediastream/playback.go
 * - Filename: playback.go
 * - Package: mediastream
 */
export type Mediastream_ClientCapabilities = {
    /**
     * HEVC/H.265 8-bit
     */
    hevc: boolean
    /**
     * HEVC Main 10
     */
    hevc10Bit: boolean
    av1: boolean
    vp9: boolean
    ac3: boolean
    eac3: boolean
    dts: boolean
    /**
     * can demux .mkv in <video> (Chromium yes, Firefox/Safari no)
     */
    matroska: boolean
}

/**
 * - Filepath: internal/mediastream/playback.go
 * - Filename: playback.go
 * - Package: mediastream
 */
export type Mediastream_MediaContainer = {
    filePath: string
    hash: string
    /**
     * Tells the frontend how to play the media.
     */
    streamType: Mediastream_StreamType
    /**
     * The relative endpoint to stream the media.
     */
    streamUrl: string
    mediaInfo?: MediaInfo
}

/**
 * - Filepath: internal/mediastream/playback.go
 * - Filename: playback.go
 * - Package: mediastream
 */
export type Mediastream_StreamType = "transcode" | "optimized" | "direct"


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Metadata
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/api/metadata/types.go
 * - Filename: types.go
 * - Package: metadata
 */
export type Metadata_AnimeMappings = {
    animeplanetId?: string
    kitsuId?: number
    type?: string
    anisearchId?: number
    anidbId?: number
    notifymoeId?: string
    livechartId?: number
    thetvdbId?: number
    imdbId?: string
    themoviedbId?: string
    anilistId?: number
    myanimelistId?: number
}

/**
 * - Filepath: internal/api/metadata/types.go
 * - Filename: types.go
 * - Package: metadata
 */
export type Metadata_AnimeMetadata = {
    titles?: Record<string, string>
    description: string
    episodes?: Record<string, Metadata_EpisodeMetadata>
    episodeCount: number
    specialCount: number
    mappings?: Metadata_AnimeMappings
    status?: string
    rating?: string
    score?: number
    duration?: string
    genres?: Array<string>
    studios?: Array<string>
    demographics?: Array<string>
    openings?: Array<string>
    endings?: Array<string>
    characters?: Array<Metadata_CharacterMetadata>
}

/**
 * - Filepath: internal/api/metadata/types.go
 * - Filename: types.go
 * - Package: metadata
 */
export type Metadata_CharacterMetadata = {
    name: string
    role: string
    imageUrl: string
}

/**
 * - Filepath: internal/api/metadata/types.go
 * - Filename: types.go
 * - Package: metadata
 */
export type Metadata_EpisodeMetadata = {
    anidbId: number
    tvdbId: number
    title: string
    image: string
    airDate: string
    length: number
    summary: string
    overview: string
    episodeNumber: number
    episode: string
    seasonNumber: number
    absoluteEpisodeNumber: number
    anidbEid: number
    /**
     * Indicates if the episode has a real image
     */
    hasImage: boolean
    /**
     * Indicates if this is a filler episode
     */
    isFiller?: boolean
    sagaId?: string
    sagaName?: string
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Mkvparser
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/mkvparser/metadata.go
 * - Filename: metadata.go
 * - Package: mkvparser
 * @description
 *  AttachmentInfo holds extracted information about an attachment.
 */
export type MKVParser_AttachmentInfo = {
    uid: number
    filename: string
    mimetype: string
    size: number
    description?: string
    type?: MKVParser_AttachmentType
}

/**
 * - Filepath: internal/mkvparser/metadata.go
 * - Filename: metadata.go
 * - Package: mkvparser
 */
export type MKVParser_AttachmentType = "font" | "subtitle" | "other"

/**
 * - Filepath: internal/mkvparser/structs.go
 * - Filename: structs.go
 * - Package: mkvparser
 * @description
 *  AudioTrack contains audio-specific track data
 */
export type MKVParser_AudioTrack = {
    SamplingFrequency: number
    Channels: number
    BitDepth: number
}

/**
 * - Filepath: internal/mkvparser/metadata.go
 * - Filename: metadata.go
 * - Package: mkvparser
 * @description
 *  ChapterInfo holds extracted information about a chapter.
 */
export type MKVParser_ChapterInfo = {
    uid: number
    /**
     * Start time in seconds
     */
    start: number
    /**
     * End time in seconds
     */
    end?: number
    text?: string
    /**
     * Legacy 3-letter language codes
     */
    languages?: Array<string>
    /**
     * IETF language tags
     */
    languagesIETF?: Array<string>
}

/**
 * - Filepath: internal/mkvparser/metadata.go
 * - Filename: metadata.go
 * - Package: mkvparser
 * @description
 *  Metadata holds all extracted metadata.
 */
export type MKVParser_Metadata = {
    title?: string
    /**
     * Duration in seconds
     */
    duration: number
    /**
     * Original timecode scale from Info
     */
    timecodeScale: number
    muxingApp?: string
    writingApp?: string
    tracks?: Array<MKVParser_TrackInfo>
    videoTracks?: Array<MKVParser_TrackInfo>
    audioTracks?: Array<MKVParser_TrackInfo>
    subtitleTracks?: Array<MKVParser_TrackInfo>
    chapters?: Array<MKVParser_ChapterInfo>
    attachments?: Array<MKVParser_AttachmentInfo>
    tags?: Record<string, Array<string>>
    /**
     * RFC 6381 codec string
     */
    mimeCodec?: string
}

/**
 * - Filepath: internal/mkvparser/mkvparser.go
 * - Filename: mkvparser.go
 * - Package: mkvparser
 * @description
 *  SubtitleEvent holds information for a single subtitle entry.
 */
export type MKVParser_SubtitleEvent = {
    trackNumber: number
    /**
     * Content
     */
    text: string
    /**
     * Start time in seconds
     */
    startTime: number
    /**
     * Duration in seconds
     */
    duration: number
    /**
     * e.g., "S_TEXT/ASS", "S_TEXT/UTF8"
     */
    codecID: string
    extraData?: Record<string, string>
}

/**
 * - Filepath: internal/mkvparser/metadata.go
 * - Filename: metadata.go
 * - Package: mkvparser
 * @description
 *  TrackInfo holds extracted information about a media track.
 */
export type MKVParser_TrackInfo = {
    number: number
    uid: number
    /**
     * "video", "audio", "subtitle", etc.
     */
    type: MKVParser_TrackType
    codecID: string
    name?: string
    /**
     * Best effort language code
     */
    language?: string
    /**
     * IETF language code
     */
    languageIETF?: string
    default: boolean
    forced: boolean
    enabled: boolean
    /**
     * Raw CodecPrivate data, often used for subtitle headers (e.g., ASS/SSA styles)
     */
    codecPrivate?: string
    video?: MKVParser_VideoTrack
    audio?: MKVParser_AudioTrack
}

/**
 * - Filepath: internal/mkvparser/metadata.go
 * - Filename: metadata.go
 * - Package: mkvparser
 * @description
 *  TrackType represents the type of a Matroska track.
 */
export type MKVParser_TrackType = "video" |
    "audio" |
    "subtitle" |
    "logo" |
    "buttons" |
    "complex" |
    "unknown"

/**
 * - Filepath: internal/mkvparser/structs.go
 * - Filename: structs.go
 * - Package: mkvparser
 * @description
 *  VideoTrack contains video-specific track data
 */
export type MKVParser_VideoTrack = {
    PixelWidth: number
    PixelHeight: number
}

