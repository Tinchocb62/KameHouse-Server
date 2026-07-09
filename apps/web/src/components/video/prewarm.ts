// Prewarms the video player's JS payload so pressing play never waits on a chunk
// download (nor flashes the "Cargando Reproductor" Suspense fallback).
//
// The player is code-split behind two lazy boundaries: player.tsx (loaded lazily
// by the root) and player-orchestrator.tsx (loaded lazily by player.tsx).
// Importing the orchestrator transitively pulls player-core + its static deps
// (hls.js, jassub), so warming these two dynamic imports warms the whole payload.
//
// Call once from an eagerly-loaded surface (the root) at browser idle.

let prewarmed = false
let disposed = false

if (import.meta.webpackHot) {
    import.meta.webpackHot.dispose(() => {
        disposed = true
    })
}

export function prewarmVideoPlayer() {
    if (prewarmed || typeof window === "undefined") return
    prewarmed = true

    const run = () => {
        if (disposed) return
        try {
            void import("./player").catch(() => {})
            void import("./player-orchestrator").catch(() => {})
        } catch (e) {}
    }

    if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(run, { timeout: 2500 })
    } else {
        setTimeout(run, 300)
    }
}
