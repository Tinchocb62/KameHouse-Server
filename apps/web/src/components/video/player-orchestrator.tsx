import React, { useMemo, useState, useEffect, useCallback } from "react"
import { useRequestMediastreamMediaContainer } from "@/api/hooks/mediastream.hooks"
import { usePlayerCore } from "./player-core"
import { PlayerUI } from "./player-ui"
import { useMpvPlayer } from "./use-mpv-player"
import { MpvOverlay } from "./mpv-overlay"
import { getClientCapabilities } from "./client-capabilities"
import type { EpisodeSource } from "@/api/types/unified.types"
import type { Mediastream_StreamType, Audio, Subtitle } from "@/api/generated/types"
import type { AudioTrack, SubtitleTrack } from "@/components/ui/track-types"
import type { VideoPlayerProps } from "./player"
import { useGetSettings } from "@/api/hooks/settings.hooks"

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
    // force:true acompaña un cambio manual a transcode (ej. cambio de pista de audio en
    // direct play) para que el backend inicialice el transcoder aunque el toggle global
    // esté apagado. Se resetea en cualquier otra transición de stream.
    const [forceTranscode, setForceTranscode] = useState(false)
    const [clientId] = useState(() => Math.random().toString(36).substring(2, 11))

    // Wrapper que resetea force por defecto: solo las llamadas que pasan {force:true}
    // (cambio manual de audio) lo activan.
    const requestStreamType = useCallback((type: string, opts?: { force?: boolean }) => {
        setForceTranscode(!!opts?.force)
        setStreamType(type)
    }, [])

    const { data: settingsQuery } = useGetSettings()
    const transcodeEnabled = settingsQuery?.mediastream?.transcodeEnabled ?? false

    const [prevStreamTypeProp, setPrevStreamTypeProp] = useState(props.streamType)
    useEffect(() => {
        if (props.streamType !== prevStreamTypeProp) {
            setPrevStreamTypeProp(props.streamType)
            setForceTranscode(false)
            setStreamType(props.streamType || "direct")
        }
    }, [props.streamType, prevStreamTypeProp])

    const isLocal = !props.isExternalStream && Boolean(props.streamUrl) && streamType !== "online"

    // Let the backend decide the stream type based on codec compatibility.
    // The backend evaluates video/audio codec support and decides whether to transcode
    // or use direct play. We send the requested type and the backend responds with
    // data.streamType indicating what it actually decided.
    // Real decoding capabilities of this browser so the backend decides
    // direct-vs-transcode against the actual client (HEVC/AC3/MKV support varies
    // between Chromium, Firefox and hardware).
    const clientCapabilities = useMemo(() => getClientCapabilities(), [])

    const { data } = useRequestMediastreamMediaContainer({
        path: props.streamUrl,
        streamType: streamType as Mediastream_StreamType,
        clientID: clientId,
        force: forceTranscode,
        clientCapabilities,
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
                isImageBased: s.isImageBased ?? false,
                // Image-based tracks (PGS/DVB) have no extractable text URL;
                // they require burn-in during transcode. Only set url for text-based subs.
                url: s.isImageBased ? undefined : `/api/v1/mediastream/subtitles?path=${encodeURIComponent(props.streamUrl)}&trackIndex=${s.index ?? i}&clientId=${clientId}`
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

    const handleDirectPlayFailed = useCallback(() => {
        if (transcodeEnabled) {
            console.info("[orchestrator] Direct play failed — falling back to transcode")
            requestStreamType("transcode")
        } else {
            console.warn("[orchestrator] Direct play failed but transcode is disabled — showing error")
        }
    }, [transcodeEnabled, requestStreamType])

    const core = usePlayerCore({
        ...props,
        streamType: activeStreamType,
        playableUrl,
        backendTracks,
        clientId,
        mediaFormat: props.mediaFormat,
        onRequestStreamTypeChange: requestStreamType,
        onDirectPlayFailed: handleDirectPlayFailed,
    })

    // External mpv playback (desktop app only): hands the local file off to an
    // mpv window while progress keeps syncing through the IPC bridge.
    const mpv = useMpvPlayer({
        path: isLocal ? props.streamUrl : undefined,
        title: props.episodeLabel || props.title,
        mediaId: props.mediaId,
        episodeNumber: props.episodeNumber,
        onExited: () => props.onClose(),
    })

    const handleOpenInMpv = useCallback(async () => {
        const current = core.state.currentTime > 5
            ? core.state.currentTime
            : (core.state.resumeTime || props.initialProgressSeconds || 0)
        core.domElements.videoElement.current?.pause()
        await mpv.play(current)
    }, [mpv, core, props.initialProgressSeconds])

    const canUseMpv = mpv.isDesktop && mpv.isAvailable && isLocal

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
            requestStreamType(source.type)
        }
    }

    return (
        <>
        {mpv.isActive && (
            <MpvOverlay
                title={props.title}
                episodeLabel={props.episodeLabel}
                onStop={() => mpv.stop()}
            />
        )}
        <PlayerUI
            title={props.title}
            episodeLabel={props.episodeLabel}
            onClose={props.onClose}
            onOpenInMpv={canUseMpv && !mpv.isActive ? handleOpenInMpv : undefined}
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
        </>
    )
}
