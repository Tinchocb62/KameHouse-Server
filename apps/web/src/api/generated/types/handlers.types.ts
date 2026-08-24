import type { Nullish, INTERNAL_FeatureFlags, INTERNAL_FeatureKey, GovernorStats } from './common.types'
import type { User } from './platform.types'
import type { Models_Settings, Models_Theme, Models_MediastreamSettings, Models_Notification } from './models.types'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Handlers
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - Filepath: internal/handlers/admin.go
 * - Filename: admin.go
 * - Package: handlers
 */
export type AdminLibraryStatsResponse = {
    totalLocalFiles: number
    totalMedia: number
}

/**
 * - Filepath: internal/handlers/admin.go
 * - Filename: admin.go
 * - Package: handlers
 */
export type AdminTranscodeStatsResponse = {
    transcoderInitialized: boolean
    governor?: GovernorStats
    preTranscodeQueue: number
    system: SystemStats
    gpu?: GPUStats
}

/**
 * - Filepath: internal/handlers/music.go
 * - Filename: music.go
 * - Package: handlers
 */
export type BackgroundMusicScanResponse = {
    dir: string
    tracks?: Array<BackgroundMusicTrack>
}

/**
 * - Filepath: internal/handlers/music.go
 * - Filename: music.go
 * - Package: handlers
 */
export type BackgroundMusicTrack = {
    name: string
    file: string
}

/**
 * - Filepath: internal/handlers/cast.go
 * - Filename: cast.go
 * - Package: handlers
 */
export type CastDevice = {
    id: string
    name: string
}

/**
 * - Filepath: internal/handlers/cast.go
 * - Filename: cast.go
 * - Package: handlers
 */
export type CastDevicesResponse = {
    devices?: Array<CastDevice>
}

/**
 * - Filepath: internal/handlers/cast.go
 * - Filename: cast.go
 * - Package: handlers
 */
export type CastPlayResponse = {
    sentTo?: Array<string>
}

/**
 * - Filepath: internal/handlers/directory_selector.go
 * - Filename: directory_selector.go
 * - Package: handlers
 */
export type DirectoryInfo = {
    Path: string
    Name: string
}

/**
 * - Filepath: internal/handlers/directory_selector.go
 * - Filename: directory_selector.go
 * - Package: handlers
 */
export type DirectorySelectorResponse = {
    fullPath: string
    exists: boolean
    basePath: string
    suggestions?: Array<DirectoryInfo>
    Directories?: Array<DirectoryInfo>
}

/**
 * - Filepath: internal/handlers/admin.go
 * - Filename: admin.go
 * - Package: handlers
 */
export type GPUStats = {
    utilization: number
    encoder: number
    memoryUsed: number
    memoryTotal: number
}

/**
 * - Filepath: internal/handlers/status.go
 * - Filename: status.go
 * - Package: handlers
 */
export type MemoryStatsResponse = {
    alloc: number
    totalAlloc: number
    sys: number
    heapAlloc: number
    heapSys: number
    heapIdle: number
    heapInuse: number
    heapObjects: number
    numGC: number
    gcCPUFraction: number
    numGoroutine: number
}

/**
 * - Filepath: internal/handlers/notifications.go
 * - Filename: notifications.go
 * - Package: handlers
 * @description
 *  NotificationList is the payload returned by the notifications endpoint.
 */
export type NotificationList = {
    notifications?: Array<Models_Notification>
    unreadCount: number
}

/**
 * - Filepath: internal/handlers/status.go
 * - Filename: status.go
 * - Package: handlers
 * @description
 *  Status is a struct containing the user data, settings, and OS.
 *  It is used by the client in various places to access necessary information.
 */
export type Status = {
    os: string
    clientDevice: string
    clientPlatform: string
    clientUserAgent: string
    dataDir: string
    user?: User
    settings?: Models_Settings
    version: string
    versionName: string
    themeSettings?: Models_Theme
    isOffline: boolean
    mediastreamSettings?: Models_MediastreamSettings
    /**
     * If true, a new screen will be displayed
     */
    updating: boolean
    /**
     * The server is running as a desktop sidecar
     */
    isDesktopSidecar: boolean
    featureFlags?: INTERNAL_FeatureFlags
    disabledFeatures?: Array<INTERNAL_FeatureKey>
    serverReady: boolean
    serverHasPassword: boolean
    showChangelogTour: string
    serverIPs?: Array<string>
    serverPort: number
    /**
     * OS process id of the server; used by the desktop sidecar to reap orphans
     */
    pid: number
}

/**
 * - Filepath: internal/handlers/admin.go
 * - Filename: admin.go
 * - Package: handlers
 */
export type SystemStats = {
    cpuPercent: number
    memoryUsed: number
    memoryTotal: number
}

