import type { Nullish } from './common.types'
import type { MKVParser_Metadata } from './mediastream.types'
import type { LocalFile, LocalFileType, LocalFileMetadata, ScanSummaryItem, ScanSummaryGroup, ScanSummaryFile, ScanSummary } from './dto.types'
import type { Anime_Episode } from './anime.types'
import type { MediaStatus, MediaFormat, UnifiedMedia, UnifiedCollectionEntry } from './platform.types'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Videocore
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/videocore/types.go
 * - Filename: types.go
 * - Package: videocore
 */
export type VideoCore_ClientEventType = "video-loaded" |
    "video-loaded-metadata" |
    "video-can-play" |
    "video-paused" |
    "video-resumed" |
    "video-status" |
    "video-completed" |
    "video-fullscreen" |
    "video-pip" |
    "video-subtitle-track" |
    "video-media-caption-track" |
    "video-subtitle-track-content" |
    "video-anime-4k" |
    "video-audio-track" |
    "video-ended" |
    "video-seeked" |
    "video-error" |
    "video-terminated" |
    "video-playback-state" |
    "subtitle-file-uploaded" |
    "video-text-tracks" |
    "translate-text" |
    "translate-subtitle-file-track"

/**
 * - Filepath: internal/videocore/insight.go
 * - Filename: insight.go
 * - Package: videocore
 */
export type VideoCore_InsightNode = {
    timestamp: number
    intensity: number
}

/**
 * - Filepath: internal/videocore/types.go
 * - Filename: types.go
 * - Package: videocore
 */
export type VideoCore_PlaybackState = {
    clientID: string
    playerType: VideoCore_PlayerType
    playbackInfo?: VideoCore_VideoPlaybackInfo
}

/**
 * - Filepath: internal/videocore/types.go
 * - Filename: types.go
 * - Package: videocore
 * @description
 *  PlaybackType is the playback method.
 */
export type VideoCore_PlaybackType = "localfile" | "torrent" | "debrid" | "onlinestream"

/**
 * - Filepath: internal/videocore/types.go
 * - Filename: types.go
 * - Package: videocore
 */
export type VideoCore_PlayerType = "native" | "web"

/**
 * - Filepath: internal/videocore/types.go
 * - Filename: types.go
 * - Package: videocore
 */
export type VideoCore_ServerEvent = "pause" |
    "resume" |
    "seek" |
    "seek-to" |
    "set-fullscreen" |
    "set-pip" |
    "set-subtitle-track" |
    "add-subtitle-track" |
    "add-external-subtitle-track" |
    "set-media-caption-track" |
    "add-media-caption-track" |
    "set-audio-track" |
    "terminate" |
    "start-onlinestream-watch-party" |
    "get-status" |
    "show-message" |
    "get-text-tracks" |
    "request-play-episode" |
    "translated-text" |
    "in-sight-data" |
    "get-fullscreen" |
    "get-pip" |
    "get-anime-4k" |
    "get-subtitle-track" |
    "get-subtitle-track-content" |
    "get-audio-track" |
    "get-media-caption-track" |
    "get-playback-state"

/**
 * - Filepath: internal/videocore/types.go
 * - Filename: types.go
 * - Package: videocore
 * @description
 *  VideoPlaybackInfo contains detailed information about the currently played media.
 *  It is filled by the client, passed to the player and sent to the server during playback.
 */
export type VideoCore_VideoPlaybackInfo = {
    id: string
    playbackType: VideoCore_PlaybackType
    streamUrl: string
    /**
     * e.g. /anime/episode 01.mkv
     */
    streamPath?: string
    /**
     * NativePlayer only
     */
    mkvMetadata?: MKVParser_Metadata
    localFile?: LocalFile
    media: any
    episode?: Anime_Episode
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Videofile
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/mediastream/videofile/info.go
 * - Filename: info.go
 * - Package: videofile
 */
export type Audio = {
    index: number
    title?: string
    language?: string
    codec: string
    mimeCodec?: string
    isDefault: boolean
    isForced: boolean
    channels: number
}

/**
 * - Filepath: internal/mediastream/videofile/info.go
 * - Filename: info.go
 * - Package: videofile
 */
export type Chapter = {
    startTime: number
    endTime: number
    name: string
    type: string
}

/**
 * - Filepath: internal/mediastream/videofile/info.go
 * - Filename: info.go
 * - Package: videofile
 */
export type MediaInfo = {
    sha: string
    path: string
    extension: string
    mimeCodec?: string
    size: number
    duration: number
    container?: string
    video?: Video
    videos?: Array<Video>
    audios?: Array<Audio>
    subtitles?: Array<Subtitle>
    fonts?: Array<string>
    chapters?: Array<Chapter>
}

/**
 * - Filepath: internal/mediastream/videofile/video_quality.go
 * - Filename: video_quality.go
 * - Package: videofile
 */
export type Quality = "240p" |
    "360p" |
    "480p" |
    "720p" |
    "1080p" |
    "1440p" |
    "4k" |
    "8k" |
    "original"

/**
 * - Filepath: internal/mediastream/videofile/info.go
 * - Filename: info.go
 * - Package: videofile
 */
export type Subtitle = {
    index: number
    title?: string
    language?: string
    codec: string
    extension?: string
    isDefault: boolean
    isForced: boolean
    isExternal: boolean
    link?: string
    isImageBased: boolean
}

/**
 * - Filepath: internal/mediastream/videofile/info.go
 * - Filename: info.go
 * - Package: videofile
 */
export type Video = {
    codec: string
    mimeCodec?: string
    language?: string
    quality: Quality
    width: number
    height: number
    bitrate: number
    pixFmt: string
}

// Compatibility aliases
export type Anime_LocalFile = LocalFile
export type Anime_LocalFileType = LocalFileType
export type Anime_LocalFileMetadata = LocalFileMetadata
export type Summary_ScanSummaryItem = ScanSummaryItem
export type Summary_ScanSummaryGroup = ScanSummaryGroup
export type Summary_ScanSummaryFile = ScanSummaryFile
export type Summary_ScanSummary = ScanSummary
export type Platform_MediaStatus = MediaStatus
export type Platform_MediaFormat = MediaFormat
export type Platform_UnifiedMedia = UnifiedMedia
export type Platform_BaseAnime = UnifiedMedia
export type Platform_UnifiedCollectionEntry = UnifiedCollectionEntry

