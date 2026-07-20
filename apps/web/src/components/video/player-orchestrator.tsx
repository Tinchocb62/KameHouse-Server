import React, { useMemo, useState } from "react"
import { useRequestMediastreamMediaContainer } from "@/api/hooks/mediastream.hooks"
import { usePlayerCore } from "./player-core"
import { PlayerUI } from "./player-ui"
import type { EpisodeSource } from "@/api/types/unified.types"
import type { Mediastream_StreamType, Audio, Subtitle } from "@/api/generated/types"
import type { AudioTrack, SubtitleTrack } from "@/components/ui/track-types"
import type { VideoPlayerProps } from "./player"

export interface Chapter {
    startTime: number
    endTime: number
    name: string
    type?: string
}

export interface OrchestratorProps extends VideoPlayerProps {
    playableUrl?: string
    backendTracks?: {
        audioTracks: AudioTrack[]
        subtitleTracks: SubtitleTrack[]
        chapters: Chapter[]
    }
}

export function VideoPlayerOrchestrator(props: OrchestratorProps) {
    const [streamType, setStreamType] = useState<string>(props.streamType || "direct")
    const [clientId] = useState(() => Math.random().toString(36).substring(2, 11))

    // Sincronización prop→estado durante el render (patrón "adjusting state when a prop
    // changes"): hacerlo en un effect dejaba un render con el streamType viejo, que podía
    // disparar una query de media container espuria con el tipo anterior.
    const [prevStreamTypeProp, setPrevStreamTypeProp] = useState(props.streamType)
    if (props.streamType !== prevStreamTypeProp) {
        setPrevStreamTypeProp(props.streamType)
        setStreamType(props.streamType || "direct")
    }

    const isLocal = !props.isExternalStream && Boolean(props.streamUrl) && streamType !== "online"

    // Let the backend decide the stream type based on codec compatibility.
    // The backend evaluates video/audio codec support and decides whether to transcode
    // or use direct play. We send the requested type and the backend responds with
    // data.streamType indicating what it actually decided.
    const { data } = useRequestMediastreamMediaContainer({
        path: props.streamUrl,
        streamType: streamType as Mediastream_StreamType,
        clientID: clientId,
    }, isLocal)

    const playableUrl = useMemo(() => {
        if (!isLocal) return props.playableUrl || props.streamUrl
        return data?.streamUrl || ""
    }, [isLocal, props.playableUrl, props.streamUrl, data?.streamUrl])

    const backendTracks = useMemo(() => {
        if (!data?.mediaInfo) return undefined
        return {
            audioTracks: data.mediaInfo.audios?.map((a: Audio, i: number) => ({
                index: a.index ?? i,
                language: a.language ?? "und",
                title: a.title || a.language || `Audio ${i + 1}`,
                codec: a.codec,
                channels: a.channels,
                default: a.isDefault
            })) || [],
            subtitleTracks: data.mediaInfo.subtitles?.map((s: Subtitle, i: number) => ({
                index: s.index ?? i,
                language: s.language ?? "und",
                title: s.title || s.language || `Subtitle ${i + 1}`,
                codec: s.codec,
                default: s.isDefault,
                forced: s.isForced,
                url: `/api/v1/mediastream/subtitles?path=${encodeURIComponent(props.streamUrl)}&trackIndex=${s.index ?? i}&clientId=${clientId}`
            })) || [],
            chapters: data.mediaInfo.chapters?.map((c) => ({
                startTime: c.startTime || 0,
                endTime: c.endTime || 0,
                name: c.name || "",
                type: c.type
            })) || []
        }
    }, [data, props.streamUrl, clientId])

    const activeStreamType = (data?.streamType && ["local", "online", "direct", "transcode", "optimized"].includes(data.streamType) ? data.streamType : streamType || "direct") as "local" | "online" | "direct" | "transcode" | "optimized"

    const core = usePlayerCore({
        ...props,
        streamType: activeStreamType,
        playableUrl,
        backendTracks,
        clientId,
        mediaFormat: props.mediaFormat,
    })

    const episodeSources = useMemo<EpisodeSource[]>(() => [
        {
            title: "Original",
            quality: "Original",
            url: props.streamUrl,
            type: "direct",
            path: props.streamUrl,
            priority: 1,
        },
        {
            title: "Transcodificado",
            quality: "Auto",
            url: props.streamUrl,
            type: "transcode",
            path: props.streamUrl,
            priority: 2,
        }
    ], [props.streamUrl])

    const handleSourceSwitch = (source: EpisodeSource) => {
        if (source.type) {
            setStreamType(source.type)
        }
    }

    return (
        <PlayerUI
            title={props.title}
            episodeLabel={props.episodeLabel}
            onClose={props.onClose}
            onNextEpisode={props.onNextEpisode}
            playableUrl={playableUrl}
            streamType={activeStreamType as "local" | "online" | "direct" | "transcode" | "optimized"}
            episodeSources={episodeSources}
            onSourceSwitch={handleSourceSwitch}
            core={core}
            clientId={clientId}
            mediaId={props.mediaId}
            episodeNumber={props.episodeNumber}
            malId={props.malId}
            episodes={props.episodes}
            onSelectEpisode={props.onSelectEpisode}
            mediaFormat={props.mediaFormat}
            nextEpisodeTitle={props.nextEpisodeTitle}
            nextEpisodeNumber={props.nextEpisodeNumber}
            nextEpisodeImage={props.nextEpisodeImage}
        />
    )
}
