export const enum WSEvents {
    PLATFORM_DATA_LOADED = "server-ready",
    SCAN_PROGRESS = "scan-progress",
    SCAN_PROGRESS_DETAILED = "scan-progress-detailed",
    SCAN_STATUS = "scan-status",
    REFRESHED_ANIME_COLLECTION = "refreshed-anime-collection",

    LIBRARY_WATCHER_FILE_ADDED = "library-watcher-file-added",
    LIBRARY_WATCHER_FILE_REMOVED = "library-watcher-file-removed",
    AUTO_DOWNLOADER_ITEM_ADDED = "auto-downloader-item-added",
    AUTO_SCAN_STARTED = "auto-scan-started",
    AUTO_SCAN_COMPLETED = "auto-scan-completed",
    PLAYBACK_MANAGER_PROGRESS_TRACKING_STARTED = "playback-manager-progress-tracking-started",
    PLAYBACK_MANAGER_PROGRESS_TRACKING_STOPPED = "playback-manager-progress-tracking-stopped",
    PLAYBACK_MANAGER_PROGRESS_VIDEO_COMPLETED = "playback-manager-progress-video-completed",
    PLAYBACK_MANAGER_PROGRESS_PLAYBACK_STATE = "playback-manager-progress-playback-state",
    PLAYBACK_MANAGER_REALTIME_PULSE = "playback-manager-realtime-pulse",
    PLAYBACK_MANAGER_PROGRESS_UPDATED = "playback-manager-progress-updated",
    PLAYBACK_MANAGER_PLAYLIST_STATE = "playback-manager-playlist-state",
    PLAYBACK_MANAGER_MANUAL_TRACKING_PLAYBACK_STATE = "playback-manager-manual-tracking-playback-state",
    EXTERNAL_PLAYER_OPEN_URL = "external-player-open-url",
    PLAYBACK_MANAGER_MANUAL_TRACKING_STOPPED = "playback-manager-manual-tracking-stopped",
    ERROR_TOAST = "error-toast",
    SUCCESS_TOAST = "success-toast",
    INFO_TOAST = "info-toast",
    WARNING_TOAST = "warning-toast",
    NOTIFICATION_RECEIVED = "notification-received",

    OFFLINE_SNAPSHOT_CREATED = "offline-snapshot-created",
    MEDIASTREAM_SHUTDOWN_STREAM = "mediastream-shutdown-stream",
    EXTENSIONS_RELOADED = "extensions-reloaded",
    EXTENSION_UPDATES_FOUND = "extension-updates-found",
    PLUGIN_UNLOADED = "plugin-unloaded",
    PLUGIN_LOADED = "plugin-loaded",
    SYNC_LOCAL_QUEUE_STATE = "sync-local-queue-state",
    SYNC_LOCAL_FINISHED = "sync-local-finished",
    SYNC_PLATFORM_FINISHED = "sync-platform-finished",
    MEDIA_STREAM_STATE = "media_stream_state",
    BUFFERING_STATUS = "buffering_status",
    NETWORK_SPEED = "network_speed",
    PLAYBACK_HEARTBEAT_PROGRESS = "playback-heartbeat-progress",
    CHECK_FOR_UPDATES = "check-for-updates",
    CHECK_FOR_ANNOUNCEMENTS = "check-for-announcements",
    INVALIDATE_QUERIES = "invalidate-queries",
    CONSOLE_LOG = "console-log",
    CONSOLE_WARN = "console-warn",
    NATIVE_PLAYER = "native-player",
    VIDEOCORE = "videocore",
    SHOW_INDEFINITE_LOADER = "show-indefinite-loader",
    PLAYLIST = "playlist",
    LIBRARY_SCAN = "library.scan",
    SKIP_SCAN_STATUS = "SKIP_SCAN_STATUS",
}

export const enum WebviewEvents {
    ANIME_ENTRY_PAGE_VIEWED = "anime-entry-page-viewed",
}

export interface ScanProgressDetailedPayload {
    stage: string
    fileCount?: number
    skipped?: number
    matched?: number
    unmatched?: number
    totalFiles?: number
    message: string
}

export interface ScannerMessage {
    status: "START" | "PROCESSING" | "FINISH" | "PRUNED"
    current?: number
    total?: number
    file?: string
    // PRUNED event fields
    removed?: number
    // FINISH event fields
    total_processed?: number
    duration_seconds?: number
}

export interface SkipScanStatusPayload {
    mediaId: number
    status: "idle" | "initializing" | "fingerprinting" | "matching" | "done" | "error"
    percent?: number
    message?: string
}

export interface NotificationPayload {
    id: number
    type: string
    title: string
    message: string
    read: boolean
    createdAt?: string
}

export type WebSocketMessage =
    | { type: WSEvents.NOTIFICATION_RECEIVED; payload: NotificationPayload }
    | { type: WSEvents.SCAN_PROGRESS; payload: number }
    | { type: WSEvents.SCAN_PROGRESS_DETAILED; payload: ScanProgressDetailedPayload }
    | { type: WSEvents.SCAN_STATUS; payload: string }
    | { type: WSEvents.PLATFORM_DATA_LOADED; payload: null }
    | { type: WSEvents.LIBRARY_WATCHER_FILE_ADDED; payload: string }
    | { type: WSEvents.LIBRARY_WATCHER_FILE_REMOVED; payload: string }
    | { type: WSEvents.AUTO_SCAN_STARTED; payload: null }
    | { type: WSEvents.AUTO_SCAN_COMPLETED; payload: null }
    | { type: WSEvents.LIBRARY_SCAN; payload: ScannerMessage }
    | { type: WSEvents.NATIVE_PLAYER; payload: unknown }
    | { type: WSEvents.SUCCESS_TOAST; payload: string }
    | { type: WSEvents.ERROR_TOAST; payload: string }
    | { type: WSEvents.INFO_TOAST; payload: string }
    | { type: WSEvents.WARNING_TOAST; payload: string }
    | { type: WSEvents.REFRESHED_ANIME_COLLECTION; payload: null }
    | { type: WSEvents.SKIP_SCAN_STATUS; payload: SkipScanStatusPayload }

