export const enum WSEvents {
    ANILIST_DATA_LOADED = "server-ready",
    SCAN_PROGRESS = "scan-progress",
    SCAN_PROGRESS_DETAILED = "scan-progress-detailed",
    SCAN_STATUS = "scan-status",
    REFRESHED_ANILIST_ANIME_COLLECTION = "refreshed-anilist-anime-collection",
    REFRESHED_ANILIST_MANGA_COLLECTION = "refreshed-anilist-manga-collection",
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
    REFRESHED_MANGA_DOWNLOAD_DATA = "refreshed-manga-download-data",
    CHAPTER_DOWNLOAD_QUEUE_UPDATED = "chapter-download-queue-updated",
    OFFLINE_SNAPSHOT_CREATED = "offline-snapshot-created",
    MEDIASTREAM_SHUTDOWN_STREAM = "mediastream-shutdown-stream",
    EXTENSIONS_RELOADED = "extensions-reloaded",
    EXTENSION_UPDATES_FOUND = "extension-updates-found",
    PLUGIN_UNLOADED = "plugin-unloaded",
    PLUGIN_LOADED = "plugin-loaded",
    ACTIVE_TORRENT_COUNT_UPDATED = "active-torrent-count-updated",
    SYNC_LOCAL_QUEUE_STATE = "sync-local-queue-state",
    SYNC_LOCAL_FINISHED = "sync-local-finished",
    SYNC_ANILIST_FINISHED = "sync-anilist-finished",
    TORRENTSTREAM_STATE = "torrentstream-state",
    DEBRID_DOWNLOAD_PROGRESS = "debrid-download-progress",
    DEBRID_STREAM_STATE = "debrid-stream-state",
    CHECK_FOR_UPDATES = "check-for-updates",
    CHECK_FOR_ANNOUNCEMENTS = "check-for-announcements",
    INVALIDATE_QUERIES = "invalidate-queries",
    CONSOLE_LOG = "console-log",
    CONSOLE_WARN = "console-warn",
    NATIVE_PLAYER = "native-player",
    VIDEOCORE = "videocore",
    NAKAMA_HOST_STARTED = "nakama-host-started",
    NAKAMA_HOST_STOPPED = "nakama-host-stopped",
    NAKAMA_PEER_CONNECTED = "nakama-peer-connected",
    NAKAMA_PEER_DISCONNECTED = "nakama-peer-disconnected",
    NAKAMA_HOST_CONNECTED = "nakama-host-connected",
    NAKAMA_HOST_DISCONNECTED = "nakama-host-disconnected",
    NAKAMA_ERROR = "nakama-error",
    NAKAMA_ANIME_LIBRARY_RECEIVED = "nakama-anime-library-received",
    NAKAMA_CUSTOM_MESSAGE = "nakama-custom-message",
    NAKAMA_STATUS_REQUESTED = "nakama-status-requested",
    NAKAMA_STATUS = "nakama-status",
    NAKAMA_ROOM_CREATED = "nakama-room-created",
    NAKAMA_ROOM_CLOSED = "nakama-room-closed",
    NAKAMA_ROOM_RECONNECTED = "nakama-room-reconnected",
    NAKAMA_WATCH_PARTY_STATE = "nakama-watch-party-state",
    NAKAMA_WATCH_PARTY_ENABLE_RELAY_MODE = "nakama-watch-party-enable-relay-mode",
    NAKAMA_WATCH_PARTY_RELAY_MODE_TOGGLE_SHARE_LIBRARY_WITH_ORIGIN = "nakama-watch-party-relay-mode-toggle-share-library-with-origin",
    NAKAMA_WATCH_PARTY_CHAT_MESSAGE = "nakama-watch-party-chat-message",
    SHOW_INDEFINITE_LOADER = "show-indefinite-loader",
    HIDE_INDEFINITE_LOADER = "hide-indefinite-loader",
    NAKAMA_ONLINE_STREAM_EVENT = "nakama-online-stream-event",
    NAKAMA_ONLINE_STREAM_CLIENT_EVENT = "nakama-online-stream-client-event",
    PLAYLIST = "playlist",
    LIBRARY_SCAN = "library.scan",
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
    status: "START" | "PROCESSING" | "FINISH"
    current?: number
    total?: number
    file?: string
}

export type WebSocketMessage =
    | { type: WSEvents.SCAN_PROGRESS; payload: number }
    | { type: WSEvents.SCAN_PROGRESS_DETAILED; payload: ScanProgressDetailedPayload }
    | { type: WSEvents.SCAN_STATUS; payload: string }
    | { type: WSEvents.ANILIST_DATA_LOADED; payload: null }
    | { type: WSEvents.LIBRARY_WATCHER_FILE_ADDED; payload: string }
    | { type: WSEvents.LIBRARY_WATCHER_FILE_REMOVED; payload: string }
    | { type: WSEvents.AUTO_SCAN_STARTED; payload: null }
    | { type: WSEvents.AUTO_SCAN_COMPLETED; payload: null }
    | { type: WSEvents.LIBRARY_SCAN; payload: ScannerMessage }
    | { type: Omit<string, WSEvents>; payload: unknown } // Catch-all for unmapped events

