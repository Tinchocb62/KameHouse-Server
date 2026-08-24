/**
 * Endpoints complementarios no generados automáticamente por OpenAPI/Go codegen.
 * Centraliza rutas para evitar el uso de strings literales dispersos.
 */
export const EXTRA_ENDPOINTS = {
    CAST: {
        GetDevices: {
            endpoint: "/api/v1/cast/devices",
            key: "cast_devices",
        },
        Play: {
            endpoint: "/api/v1/cast/play",
            key: "cast_play",
        },
    },
    DRAGONBALL: {
        Series: {
            endpoint: "/api/v1/dragonball/series",
            key: "dragonball_series",
        },
        Episodes: {
            endpoint: "/api/v1/dragonball/episodes",
            key: "dragonball_episodes",
        },
        Villains: {
            endpoint: "/api/v1/dragonball/villains",
            key: "dragonball_villains",
        },
        Milestones: {
            endpoint: "/api/v1/dragonball/milestones",
            key: "dragonball_milestones",
        },
        Lore: {
            endpoint: "/api/v1/lore/dragonball",
            key: "dragonball_lore",
        },
    },
    MEDIASTREAM: {
        SkipTimes: {
            endpoint: "/api/v1/mediastream/skip-times",
            key: "mediastream_skip_times",
        },
        ResolveMal: {
            endpoint: "/api/v1/mediastream/skip-times/resolve-mal",
            key: "mediastream_resolve_mal",
        },
        ScanAllSkipTimes: {
            endpoint: "/api/v1/mediastream/skip-times/scan-all",
            key: "mediastream_skip_times_scan_all",
        },
        FFmpegStatus: {
            endpoint: "/api/v1/mediastream/ffmpeg/status",
            key: "mediastream_ffmpeg_status",
        },
        InstallFFmpeg: {
            endpoint: "/api/v1/mediastream/ffmpeg/install",
            key: "mediastream_ffmpeg_install",
        },
    },
    MUSIC: {
        Scan: {
            endpoint: "/api/v1/music/scan",
            key: "music_scan",
        },
        Stream: {
            endpoint: "/api/v1/music/stream",
            key: "music_stream",
        },
    },
    INTELLIGENCE: {
        Search: {
            endpoint: "/api/v1/intelligence/search",
            key: "intelligence_search",
        },
    },
} as const
