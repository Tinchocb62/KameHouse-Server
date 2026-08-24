'use no memo'
import { useEffect } from "react"
import JASSUB from "jassub"
import { SubtitleTrack } from "@/components/ui/track-types"
import { convertToAss } from "./subtitle-convert"

interface UsePlayerJassubProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    canvasRef: React.RefObject<HTMLCanvasElement | null>
    jassubRef: React.MutableRefObject<JASSUB | null>
    activeSubtitleIndex: number | null
    subtitleTracks: SubtitleTrack[]
    subtitleSizePref: number
    fontUrls?: string[]
    setIsJassubLoading: (loading: boolean) => void
    setIsJassubActive: (active: boolean) => void
}

function setRefValue<T>(ref: React.MutableRefObject<T>, value: T) {
    ref.current = value
}

export function usePlayerJassub({
    videoRef,
    canvasRef: _canvasRef,
    jassubRef,
    activeSubtitleIndex,
    subtitleTracks,
    subtitleSizePref,
    fontUrls,
    setIsJassubLoading,
    setIsJassubActive,
}: UsePlayerJassubProps) {
    const activeTrack = activeSubtitleIndex !== null && subtitleTracks 
        ? subtitleTracks.find(t => t.index === activeSubtitleIndex) ?? null 
        : null
    const trackUrl = activeTrack?.url
    const trackCodec = activeTrack?.codec

    useEffect(() => {
        const video = videoRef.current
        const currentJassubRef = jassubRef
        if (!video || activeSubtitleIndex === null || !trackUrl) {
            if (currentJassubRef.current) {
                currentJassubRef.current.destroy()
                setRefValue(currentJassubRef, null)
                Promise.resolve().then(() => {
                    setIsJassubLoading(false)
                    setIsJassubActive(false)
                })
            }
            return
        }

        const isTv = typeof navigator !== "undefined" && (
            /SmartTV/i.test(navigator.userAgent) ||
            /Tizen/i.test(navigator.userAgent) ||
            /WebOS/i.test(navigator.userAgent) ||
            /Web0S/i.test(navigator.userAgent)
        )
        // Supported codec families:
        //   ass/ssa   → native ASS (full styling support)
        //   subrip    → SRT text (libass handles .srt content via subContent)
        //   vtt       → WebVTT text (libass handles simple VTT via subContent)
        // Image-based codecs (PGS/DVB) are excluded — they have isImageBased=true
        // and no URL, so they never reach this hook.
        const codec = trackCodec?.toLowerCase() ?? ""
        const isSupported = codec === "ass" || codec === "ssa" || codec === "subrip" || codec === "vtt"

        if (!isSupported || isTv) {
            if (currentJassubRef.current) {
                currentJassubRef.current.destroy()
                setRefValue(currentJassubRef, null)
                Promise.resolve().then(() => {
                    setIsJassubLoading(false)
                    setIsJassubActive(false)
                })
            }
            return
        }

        Promise.resolve().then(() => {
            setIsJassubLoading(true)
        })

        let isCancelled = false

        const initJassub = async () => {
            try {
                const fetchSubtitle = async (): Promise<string> => {
                    for (let i = 0; i < 20; i++) {
                        if (isCancelled) throw new Error("cancelled")
                        const res = await fetch(trackUrl)
                        if (res.ok) return await res.text()
                        await new Promise(r => setTimeout(r, Math.min(2000 * (i + 1), 6000)))
                    }
                    throw new Error("subtitle never became available")
                }
                const rawContent = await fetchSubtitle()
                // libass only parses ASS/SSA; convert SubRip/WebVTT to ASS so it renders.
                const assContent = convertToAss(rawContent, trackCodec)

                if (isCancelled) return

                if (currentJassubRef.current) {
                    currentJassubRef.current.destroy()
                    setRefValue(currentJassubRef, null)
                    setIsJassubActive(false)
                }

                // Let JASSUB create and manage its OWN canvas (inserted after the video
                // and torn down on destroy). We must NOT hand it our persistent <canvas>:
                // JASSUB calls transferControlToOffscreen() on it, which can only ever run
                // once per element — reusing the same node on the next track/size change
                // throws "Cannot transfer control from a canvas for more than one time"
                // and cascades into worker "reading 'apply' of undefined" errors.
                // defaultFont already falls back to the bundled "liberation sans".
                const jassub = new JASSUB({
                    video,
                    subContent: assContent,
                    workerUrl: "/jassub/jassub-worker.js",
                    wasmUrl: "/jassub/jassub-worker.wasm",
                    modernWasmUrl: "/jassub/jassub-worker-modern.wasm",
                    prescaleFactor: subtitleSizePref / 100,
                    fonts: fontUrls ?? [],
                })

                if (isCancelled) {
                    jassub.destroy()
                    return
                }

                setRefValue(currentJassubRef, jassub)
                setIsJassubActive(true)
                setIsJassubLoading(false)
            } catch (err) {
                console.error("jassub: Failed to initialize:", err)
                if (!isCancelled) {
                    setIsJassubLoading(false)
                    setIsJassubActive(false)
                }
            }
        }

        initJassub()

        return () => {
            isCancelled = true
            if (currentJassubRef.current) {
                currentJassubRef.current.destroy()
                setRefValue(currentJassubRef, null)
                setIsJassubLoading(false)
                setIsJassubActive(false)
            }
        }
    }, [activeSubtitleIndex, trackUrl, trackCodec, subtitleSizePref, fontUrls, videoRef, jassubRef, setIsJassubLoading, setIsJassubActive])
    // Note: JASSUB owns canvas sizing via its internal ResizeObserver. Because the
    // canvas control is transferred to the offscreen worker (useOffscreen + app-supplied
    // canvas), writing canvas.width/height on the main thread throws InvalidStateError
    // and fights the library — so we deliberately do not resize the canvas manually here.
}
