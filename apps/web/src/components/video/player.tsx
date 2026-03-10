/**
 * components/video/player.tsx
 *
 * Public facade that wraps the UI VideoPlayerModal with TanStack Query.
 * This component fetches the real streaming endpoint (HLS/Direct) and MKV
 * track metadata from the backend before mounting the actual player.
 */

import React from "react"
import { VideoPlayerModal, type VideoPlayerModalProps } from "@/components/ui/video-player-modal"
import { useRequestMediastreamMediaContainer } from "@/api/hooks/mediastream.hooks"
import { Loader2, AlertTriangle } from "lucide-react"

export type VideoPlayerProps = Omit<VideoPlayerModalProps, "trackInfo">

export function VideoPlayer(props: VideoPlayerProps) {
    // If the stream is "online" (e.g. Debrid/External CDN), skip the internal media container request
    const isLocal = !props.isExternalStream && Boolean(props.streamUrl) && props.streamType !== ("online" as any)

    const { data, isLoading, error } = useRequestMediastreamMediaContainer({
        path: props.streamUrl,
        streamType: props.streamType as any,
    }, isLocal)

    if (isLocal) {
        if (isLoading) {
            return (
                <div className="fixed inset-0 z-[10000] bg-black w-screen h-screen flex flex-col items-center justify-center gap-4 text-white">
                    <Loader2 className="w-14 h-14 text-orange-500 animate-spin drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
                    <p className="font-bold tracking-widest uppercase text-sm opacity-80 animate-pulse">
                        Solicitando Stream
                    </p>
                </div>
            )
        }

        if (error || !data || !data.streamUrl) {
            return (
                <div className="fixed inset-0 z-[10000] bg-black w-screen h-screen flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
                    <AlertTriangle className="w-16 h-16 text-orange-500" />
                    <h3 className="font-black text-2xl tracking-wide">Error de Streaming</h3>
                    <p className="text-gray-400 max-w-md">
                        {error instanceof Error ? error.message : "El servidor no devolvió una URL de reproducción válida."}
                    </p>
                    <button onClick={props.onClose} className="mt-4 px-8 py-3 rounded-md bg-orange-500 hover:bg-orange-600 font-bold transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                        Regresar
                    </button>
                </div>
            )
        }

        return (
            <VideoPlayerModal
                {...props}
                streamUrl={data.streamUrl}
                trackInfo={{
                    audioTracks: data.mediaInfo?.audios?.map((a: any, i: number) => ({
                        index: a.index ?? i,
                        language: a.language ?? "und",
                        title: a.title || a.language || `Audio ${i + 1}`,
                        codec: a.codec,
                        channels: a.channels,
                        default: a.default
                    })) || [],
                    subtitleTracks: data.mediaInfo?.subtitles?.map((s: any, i: number) => ({
                        index: s.index ?? i,
                        language: s.language ?? "und",
                        title: s.title || s.language || `Subtitle ${i + 1}`,
                        codec: s.codec,
                        default: s.default,
                        forced: s.forced,
                        url: `/api/v1/mediastream/subtitles?path=${encodeURIComponent(props.streamUrl)}&trackIndex=${s.index ?? i}`
                    })) || []
                }}
            />
        )
    }

    // Direct / External URL pass-through
    return <VideoPlayerModal {...props} />
}
