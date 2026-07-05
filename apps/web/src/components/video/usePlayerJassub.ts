'use no memo'
import { useEffect } from "react"
import JASSUB from "jassub"
import { SubtitleTrack } from "@/components/ui/track-types"

interface UsePlayerJassubProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    canvasRef: React.RefObject<HTMLCanvasElement | null>
    jassubRef: React.MutableRefObject<JASSUB | null>
    activeSubtitleIndex: number | null
    subtitleTracks: SubtitleTrack[]
    subtitleSizePref: number
    setIsJassubLoading: (loading: boolean) => void
    setIsJassubActive: (active: boolean) => void
}

function setRefValue<T>(ref: React.MutableRefObject<T>, value: T) {
    ref.current = value
}

function setCanvasDimensions(canvas: HTMLCanvasElement, width: number, height: number) {
    canvas.width = width
    canvas.height = height
    canvas.style.width = "100%"
    canvas.style.height = "100%"
}

export function usePlayerJassub({
    videoRef,
    canvasRef,
    jassubRef,
    activeSubtitleIndex,
    subtitleTracks,
    subtitleSizePref,
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
                const res = await fetch(trackUrl)
                const assContent = await res.text()

                if (isCancelled) return

                if (currentJassubRef.current) {
                    currentJassubRef.current.destroy()
                    setRefValue(currentJassubRef, null)
                    setIsJassubActive(false)
                }

                const jassub = new JASSUB({
                    video,
                    subContent: assContent,
                    workerUrl: "/jassub/jassub-worker.js",
                    wasmUrl: "/jassub/jassub-worker.wasm",
                    modernWasmUrl: "/jassub/jassub-worker-modern.wasm",
                    canvas: canvasRef.current ?? undefined,
                    useOffscreen: true,
                    prescaleFactor: subtitleSizePref / 100,
                    width: video.videoWidth || 1920,
                    height: video.videoHeight || 1080,
                })

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
    }, [activeSubtitleIndex, trackUrl, trackCodec, subtitleSizePref, videoRef, canvasRef, jassubRef, setIsJassubLoading, setIsJassubActive])

    // Canvas size updating
    useEffect(() => {
        const video = videoRef.current
        if (!video || !jassubRef.current) return

        const updateCanvasSize = () => {
            if (canvasRef.current && video.videoWidth > 0) {
                setCanvasDimensions(canvasRef.current, video.videoWidth, video.videoHeight)
            }
        }

        video.addEventListener("resize", updateCanvasSize)
        updateCanvasSize()

        return () => video.removeEventListener("resize", updateCanvasSize)
    }, [videoRef, canvasRef, jassubRef])
}
