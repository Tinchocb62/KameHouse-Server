declare module "jassub" {
    // Mirrors the real jassub@2.5.x constructor options. When `canvas` is omitted
    // JASSUB creates and manages its own canvas (inserted after the video), which is
    // the reuse-safe path — a canvas passed here is transferred to an OffscreenCanvas
    // and can never be reused for a second instance.
    interface JassubOptions {
        video: HTMLVideoElement
        canvas?: HTMLCanvasElement
        subContent?: string
        subUrl?: string
        workerUrl: string
        wasmUrl: string
        modernWasmUrl?: string
        prescaleFactor?: number
        /** Font URLs/bytes to load into libass (e.g. embedded container fonts). */
        fonts?: Array<string | Uint8Array>
        /** Named fonts available to libass, keyed by family name. */
        availableFonts?: Record<string, string | Uint8Array>
        /** Fallback font family; defaults to the bundled "liberation sans". */
        defaultFont?: string
        /** Time offset in seconds */
        timeOffset?: number
    }

    class JASSUB {
        constructor(options: JassubOptions)
        destroy(): void
        setCurrentTime(time: number): void
        setVolume(volume: number): void
        setIsPaused(isPaused: boolean): void
        resize(): void
    }

    export default JASSUB
}
