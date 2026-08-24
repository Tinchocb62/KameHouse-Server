import { useServerMutation, useServerQuery } from "@/api/client/requests"
import {
    EnqueuePreTranscode_Variables,
    PreloadMediastreamMediaContainer_Variables,
    RequestMediastreamMediaContainer_Variables,
    SaveMediastreamSettings_Variables,
} from "@/api/generated/endpoint.types"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { EXTRA_ENDPOINTS } from "@/api/client/endpoints.extra"
import { Mediastream_MediaContainer, Models_MediastreamSettings, PreTranscodeJob } from "@/api/generated/types"
import { logger } from "@/lib/helpers/debug"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export function useGetMediastreamSettings(enabled?: boolean) {
    return useServerQuery<Models_MediastreamSettings>({
        endpoint: API_ENDPOINTS.MEDIASTREAM.GetMediastreamSettings.endpoint,
        method: API_ENDPOINTS.MEDIASTREAM.GetMediastreamSettings.methods[0],
        queryKey: [API_ENDPOINTS.MEDIASTREAM.GetMediastreamSettings.key],
        enabled: enabled,
    })
}

export function useSaveMediastreamSettings() {
    const qc = useQueryClient()
    return useServerMutation<Models_MediastreamSettings, SaveMediastreamSettings_Variables>({
        endpoint: API_ENDPOINTS.MEDIASTREAM.SaveMediastreamSettings.endpoint,
        method: API_ENDPOINTS.MEDIASTREAM.SaveMediastreamSettings.methods[0],
        mutationKey: [API_ENDPOINTS.MEDIASTREAM.SaveMediastreamSettings.key],
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: [API_ENDPOINTS.MEDIASTREAM.GetMediastreamSettings.key] })
            await qc.invalidateQueries({ queryKey: [API_ENDPOINTS.SETTINGS.GetSettings.key] })
            await qc.invalidateQueries({ queryKey: [API_ENDPOINTS.STATUS.GetStatus.key] })
            toast.success("Settings saved")
        },
    })
}

export function useRequestMediastreamMediaContainer(variables: Partial<RequestMediastreamMediaContainer_Variables>, enabled: boolean) {
    return useServerQuery<Mediastream_MediaContainer, RequestMediastreamMediaContainer_Variables>({
        endpoint: API_ENDPOINTS.MEDIASTREAM.RequestMediastreamMediaContainer.endpoint,
        method: API_ENDPOINTS.MEDIASTREAM.RequestMediastreamMediaContainer.methods[0],
        queryKey: [API_ENDPOINTS.MEDIASTREAM.RequestMediastreamMediaContainer.key, variables?.path, variables?.streamType],
        data: variables as RequestMediastreamMediaContainer_Variables,
        enabled: !!variables.path && !!variables.streamType && enabled,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: Infinity,
        // gcTime: 0 is load-bearing for CORRECTNESS, not just memory. This POST is a
        // server-side session bind: RequestPlayback sets clientMediaContainers[clientID]
        // and currentMediaContainer, and every stream request (segments, ranges,
        // subtitles) resolves the file from that binding. If cached data were reused on
        // episode change WITHOUT re-issuing the POST, the server would still point at the
        // previous file and stream the wrong episode. Evicting on unmount forces a fresh
        // bind every time. Do NOT raise this to "fix" refetching — warm via the
        // side-effect-free preload endpoint instead.
        gcTime: 0,
    })
}

export function usePreloadMediastreamMediaContainer() {
    return useServerMutation<boolean, PreloadMediastreamMediaContainer_Variables>({
        endpoint: API_ENDPOINTS.MEDIASTREAM.PreloadMediastreamMediaContainer.endpoint,
        method: API_ENDPOINTS.MEDIASTREAM.PreloadMediastreamMediaContainer.methods[0],
        mutationKey: [API_ENDPOINTS.MEDIASTREAM.PreloadMediastreamMediaContainer.key],
        onSuccess: async () => {
            logger("MEDIASTREAM").success("Preloaded mediastream media container")
        },
    })
}

/**
 * Pre-transcode queue (Settings → Streaming). Polls while any job is unfinished so
 * progress advances without a websocket channel; idles once everything settles.
 */
export function useGetPreTranscodeJobs(enabled?: boolean) {
    return useServerQuery<PreTranscodeJob[]>({
        endpoint: API_ENDPOINTS.PRETRANSCODE.GetPreTranscodeJobs.endpoint,
        method: API_ENDPOINTS.PRETRANSCODE.GetPreTranscodeJobs.methods[0],
        queryKey: [API_ENDPOINTS.PRETRANSCODE.GetPreTranscodeJobs.key],
        enabled: enabled ?? true,
        muteError: true,
        refetchInterval: (query) => {
            const jobs = query.state.data
            if (!jobs?.length) return false
            return jobs.some(j => j.status === "queued" || j.status === "running") ? 2000 : false
        },
    })
}

export function useEnqueuePreTranscode() {
    const qc = useQueryClient()
    return useServerMutation<PreTranscodeJob, EnqueuePreTranscode_Variables>({
        endpoint: API_ENDPOINTS.PRETRANSCODE.EnqueuePreTranscode.endpoint,
        method: API_ENDPOINTS.PRETRANSCODE.EnqueuePreTranscode.methods[0],
        mutationKey: [API_ENDPOINTS.PRETRANSCODE.EnqueuePreTranscode.key],
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: [API_ENDPOINTS.PRETRANSCODE.GetPreTranscodeJobs.key] })
        },
    })
}

export function useCancelPreTranscode() {
    const qc = useQueryClient()
    return useServerMutation<boolean, { hash: string }>({
        endpoint: API_ENDPOINTS.PRETRANSCODE.CancelPreTranscode.endpoint,
        method: API_ENDPOINTS.PRETRANSCODE.CancelPreTranscode.methods[0],
        mutationKey: [API_ENDPOINTS.PRETRANSCODE.CancelPreTranscode.key],
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: [API_ENDPOINTS.PRETRANSCODE.GetPreTranscodeJobs.key] })
        },
    })
}

export function useMediastreamShutdownTranscodeStream() {
    return useServerMutation<boolean, { clientId: string }>({
        endpoint: API_ENDPOINTS.MEDIASTREAM.MediastreamShutdownTranscodeStream.endpoint,
        method: API_ENDPOINTS.MEDIASTREAM.MediastreamShutdownTranscodeStream.methods[0],
        mutationKey: [API_ENDPOINTS.MEDIASTREAM.MediastreamShutdownTranscodeStream.key],
        onSuccess: async () => {

        },
    })
}

export interface FFmpegStatus {
    ffmpegAvailable: boolean
    ffprobeAvailable: boolean
    ffmpegPath: string
    ffprobePath: string
    ffmpegVersion: string
    ffprobeVersion: string
    isDownloading: boolean
    downloadProgress: number
    downloadStatus: string
    lastError?: string
}

export function useGetFFmpegStatus() {
    return useServerQuery<FFmpegStatus>({
        endpoint: EXTRA_ENDPOINTS.MEDIASTREAM.FFmpegStatus.endpoint,
        method: "GET",
        queryKey: [EXTRA_ENDPOINTS.MEDIASTREAM.FFmpegStatus.key],
        refetchInterval: (query) => {
            const data = query.state.data
            return data?.isDownloading ? 1000 : false
        },
    })
}

export function useInstallFFmpeg() {
    const qc = useQueryClient()
    return useServerMutation<{ started: boolean }, void>({
        endpoint: EXTRA_ENDPOINTS.MEDIASTREAM.InstallFFmpeg.endpoint,
        method: "POST",
        mutationKey: [EXTRA_ENDPOINTS.MEDIASTREAM.InstallFFmpeg.key],
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: [EXTRA_ENDPOINTS.MEDIASTREAM.FFmpegStatus.key] })
            toast.info("Iniciando descarga e instalación de FFmpeg...")
        },
    })
}

