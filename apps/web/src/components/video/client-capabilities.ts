import type { Mediastream_ClientCapabilities } from "@/api/generated/types"

let cached: Mediastream_ClientCapabilities | null = null

function canPlay(video: HTMLVideoElement, type: string): boolean {
    // canPlayType returns "probably" | "maybe" | "" — anything non-empty counts.
    if (video.canPlayType(type) !== "") return true
    try {
        return typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(type)
    } catch {
        return false
    }
}

/**
 * Probes the codecs/containers this browser can decode natively so the server
 * can make the direct-play-vs-transcode decision against the real client
 * instead of assuming a Chromium engine. Result is cached for the session
 * (browser capabilities don't change at runtime).
 */
export function getClientCapabilities(): Mediastream_ClientCapabilities {
    if (cached) return cached
    const video = document.createElement("video")

    // Chromium demuxes Matroska via its WebM/MKV pipeline but reports "" for
    // video/x-matroska in canPlayType, so also accept engine detection.
    const isChromium = typeof (window as any).chrome !== "undefined" ||
        /chrome|chromium|edg\//i.test(navigator.userAgent)
    const matroska = canPlay(video, 'video/x-matroska; codecs="avc1.42E01E, mp4a.40.2"') || isChromium

    cached = {
        // hvc1.1.6.L123.B0 = Main profile (8-bit); hvc1.2.4.L123.B0 = Main 10.
        hevc: canPlay(video, 'video/mp4; codecs="hvc1.1.6.L123.B0"'),
        hevc10Bit: canPlay(video, 'video/mp4; codecs="hvc1.2.4.L123.B0"'),
        av1: canPlay(video, 'video/mp4; codecs="av01.0.08M.08"'),
        vp9: canPlay(video, 'video/webm; codecs="vp9"'),
        ac3: canPlay(video, 'audio/mp4; codecs="ac-3"'),
        eac3: canPlay(video, 'audio/mp4; codecs="ec-3"'),
        dts: canPlay(video, 'audio/mp4; codecs="dtsc"'),
        matroska,
    }
    return cached
}
