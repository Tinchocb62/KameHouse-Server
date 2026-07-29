import React, { useState, useCallback } from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useCastPlay } from "@/api/hooks/cast.hooks"
import { usePreloadMediastreamMediaContainer } from "@/api/hooks/mediastream.hooks"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import type { Anime_Entry, Anime_Episode, Anime_LocalFile, Mediastream_StreamType, Continuity_WatchHistoryItemResponse } from "@/api/generated/types"
import { startViewTransition } from "@/lib/helpers/transitions"
import { getDragonBallSpanishTitle } from "@/lib/config/dragonball.config"
import { resolveLocalFileForEpisode } from "./use-series-data"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayTarget {
    path: string
    streamType: Mediastream_StreamType
    episodeLabel: string
    episodeNumber: number
    malId?: number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavigateFn = (opts: any) => void

interface UseSeriesPlaybackInput {
    entry: Anime_Entry | undefined | null
    computedEpisodes: Anime_Episode[]
    seriesId: string
    navigate: NavigateFn
    nextSeriesTarget: { seriesId: string; label: string } | null
    continuityData: Continuity_WatchHistoryItemResponse | undefined | null
    refetchContinuity: () => void
    autoplayEp: string | undefined
    setSearchParams: (updates: Partial<Record<string, string>>) => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSeriesPlayback({
    entry,
    computedEpisodes,
    seriesId,
    navigate,
    nextSeriesTarget,
    continuityData,
    refetchContinuity,
    autoplayEp,
    setSearchParams,
}: UseSeriesPlaybackInput) {
    const queryClient = useQueryClient()

    const [playTarget, setPlayTarget] = useState<PlayTarget | null>(null)

    // ── Preload ───────────────────────────────────────────────────────────────
    const { mutate: preloadStream } = usePreloadMediastreamMediaContainer()
    // Paths already warmed this session (server preload is idempotent, but this
    // avoids spamming the mutation on every hover/re-render).
    const preloadedPathsRef = React.useRef<Set<string>>(new Set())
    const preloadPath = useCallback(
        (path: string | undefined | null) => {
            if (!path || preloadedPathsRef.current.has(path)) return
            preloadedPathsRef.current.add(path)
            preloadStream({ path, streamType: "direct", audioStreamIndex: 0, preferredAudioLang: "" })
        },
        [preloadStream]
    )

    // ── Play handlers ─────────────────────────────────────────────────────────
    const handlePlayEpisode = useCallback(
        (localFile: Anime_LocalFile, episode: Anime_Episode) => {
            if (!localFile.path) {
                toast.error("Archivo local no disponible.")
                return
            }
            const targetType = "direct"
            const epNum = episode.absoluteEpisodeNumber || episode.episodeNumber
            const localizedTitle = getDragonBallSpanishTitle(entry?.media?.tmdbId, epNum)
            const resolvedTitle =
                localizedTitle ||
                episode.titleSpanish ||
                episode.episodeMetadata?.title ||
                episode.episodeTitle ||
                episode.displayTitle ||
                `Episodio ${epNum}`

            startViewTransition(() => {
                setPlayTarget({
                    path: localFile.path,
                    streamType: targetType as Mediastream_StreamType,
                    episodeLabel: resolvedTitle,
                    episodeNumber: epNum,
                    malId: entry?.media?.idMal ?? null,
                })
            })
        },
        [entry?.media?.idMal, entry?.media?.tmdbId]
    )

    const handlePlayLocalFile = useCallback(
        (localFile: Anime_LocalFile) => {
            if (!localFile.path) {
                toast.error("Archivo no disponible.")
                return
            }
            const epNum = localFile.parsedInfo?.episode || localFile.metadata?.episode || 1
            const seasonNum = localFile.parsedInfo?.season

            const matchedEp = computedEpisodes.find(ep => {
                if (ep.absoluteEpisodeNumber === Number(epNum)) {
                    return true
                }
                if (typeof ep.seasonNumber === "number" && seasonNum != null) {
                    return ep.episodeNumber === Number(epNum) && ep.seasonNumber === Number(seasonNum)
                }
                return ep.episodeNumber === Number(epNum)
            })
            const resolvedEpNum = matchedEp
                ? matchedEp.absoluteEpisodeNumber || matchedEp.episodeNumber
                : Number(epNum)

            startViewTransition(() => {
                setPlayTarget({
                    path: localFile.path,
                    streamType: "direct" as Mediastream_StreamType,
                    episodeLabel: localFile.name,
                    episodeNumber: resolvedEpNum,
                    malId: entry?.media?.idMal ?? null,
                })
            })
        },
        [computedEpisodes, entry?.media?.idMal]
    )

    const handlePlayDefault = useCallback(() => {
        if (entry?.media?.format === "MOVIE" || !computedEpisodes || computedEpisodes.length === 0) {
            if (entry?.localFiles && entry.localFiles.length > 0) {
                let targetFile = entry.localFiles[0]
                if (continuityData?.item?.episodeNumber) {
                    const matchedFile = entry.localFiles.find(f => {
                        const ep = f.metadata?.episode || f.parsedInfo?.episode
                        return ep != null && Number(ep) === continuityData.item?.episodeNumber
                    })
                    if (matchedFile) targetFile = matchedFile
                }
                handlePlayLocalFile(targetFile)
            } else {
                toast.info("No hay archivos locales disponibles para reproducir.")
            }
            return
        }

        let targetEp = computedEpisodes.find(ep => !ep.watched) || computedEpisodes[0]
        if (continuityData?.item) {
            const resumeEp = computedEpisodes.find(
                ep =>
                    (ep.absoluteEpisodeNumber || ep.episodeNumber) ===
                    continuityData.item?.episodeNumber
            )
            if (resumeEp) {
                targetEp = resumeEp
            }
        }

        const lf = resolveLocalFileForEpisode(targetEp, entry?.localFiles)

        if (lf) {
            handlePlayEpisode(lf, targetEp)
        } else if (entry?.localFiles && entry.localFiles.length > 0) {
            handlePlayLocalFile(entry.localFiles[0])
        } else {
            toast.info("No hay archivos locales disponibles para reproducir.")
        }
    }, [entry, computedEpisodes, continuityData, handlePlayLocalFile, handlePlayEpisode])

    const handlePlayByNumber = useCallback(
        (episodeNumber: number) => {
            let targetEp = computedEpisodes.find(
                ep => (ep.absoluteEpisodeNumber || ep.episodeNumber) === episodeNumber
            )
            
            // Fallback: si no encuentra el episodio exacto, busca el siguiente disponible
            if (!targetEp && computedEpisodes.length > 0) {
                const nextAvailable = computedEpisodes
                    .filter(ep => (ep.absoluteEpisodeNumber || ep.episodeNumber) >= episodeNumber)
                    .sort((a, b) => (a.absoluteEpisodeNumber || a.episodeNumber) - (b.absoluteEpisodeNumber || b.episodeNumber))[0]
                    
                if (nextAvailable) {
                    targetEp = nextAvailable
                    toast.info(`Episodio ${episodeNumber} no encontrado. Saltando al episodio ${targetEp.absoluteEpisodeNumber || targetEp.episodeNumber}.`)
                }
            }

            if (!targetEp) {
                // Fallback 2: buscar directamente en localFiles si no hay metadatos
                const fallbackFile = entry?.localFiles
                    ?.filter(f => {
                        const ep = f.metadata?.episode || f.parsedInfo?.episode
                        return ep != null && Number(ep) >= episodeNumber
                    })
                    .sort((a, b) => {
                        const epA = Number(a.metadata?.episode || a.parsedInfo?.episode || 0)
                        const epB = Number(b.metadata?.episode || b.parsedInfo?.episode || 0)
                        return epA - epB
                    })[0]
                
                if (fallbackFile) {
                    handlePlayLocalFile(fallbackFile)
                    return
                }

                toast.error("Episodio no encontrado en la base de datos.")
                return
            }
            
            const lf = resolveLocalFileForEpisode(targetEp, entry?.localFiles)
            if (lf) {
                handlePlayEpisode(lf, targetEp)
            } else {
                toast.error("Archivo local no disponible para este episodio.")
            }
        },
        [computedEpisodes, entry?.localFiles, handlePlayEpisode, handlePlayLocalFile]
    )

    const { mutate: castPlay } = useCastPlay()

    const handleCastByNumber = useCallback(
        (episodeNumber: number) => {
            // Usamos el id de la ruta (mismo con el que se consultó anime-entry):
            // es el espacio de ids que la TV también usa contra ese endpoint.
            const mediaId = Number(seriesId)
            if (!mediaId) return
            castPlay(
                {
                    mediaId,
                    episodeNumber,
                    title:
                        entry?.media?.titleSpanish ||
                        entry?.media?.titleEnglish ||
                        entry?.media?.titleRomaji ||
                        "",
                    episodeLabel: `Episodio ${episodeNumber}`,
                },
                {
                    onSuccess: () => {
                        toast.success(`Episodio ${episodeNumber} enviado a la TV`)
                    },
                }
            )
        },
        [seriesId, entry?.media, castPlay]
    )

    // ── Marathon / next-episode logic ─────────────────────────────────────────

    // Salta a la primera entrega disponible de la siguiente serie de la línea
    // temporal (p.ej. terminar Dragon Ball → arrancar Dragon Ball Z ep 1).
    const continueToNextSeries = useCallback(() => {
        if (!nextSeriesTarget) return false
        toast.success(`Continuando con ${nextSeriesTarget.label}`)
        startViewTransition(() => {
            setPlayTarget(null)
            navigate({
                to: "/series/$seriesId",
                params: { seriesId: nextSeriesTarget.seriesId },
                search: { tab: "episodes", saga: "", subSaga: "", autoplay: "1" },
            })
        })
        return true
    }, [nextSeriesTarget, navigate])

    // Path that the primary "Reproducir" button would open — mirrors the
    // selection in handlePlayDefault so we can warm it ahead of the click.
    const defaultTargetPath = React.useMemo<string | null>(() => {
        if (!entry) return null
        if (
            entry.media?.format === "MOVIE" ||
            !computedEpisodes ||
            computedEpisodes.length === 0
        ) {
            if (!entry.localFiles || entry.localFiles.length === 0) return null
            let targetFile = entry.localFiles[0]
            if (continuityData?.item?.episodeNumber) {
                const matchedFile = entry.localFiles.find(f => {
                    const ep = f.metadata?.episode || f.parsedInfo?.episode
                    return ep != null && Number(ep) === continuityData.item?.episodeNumber
                })
                if (matchedFile) targetFile = matchedFile
            }
            return targetFile.path || null
        }
        let targetEp = computedEpisodes.find(ep => !ep.watched) || computedEpisodes[0]
        if (continuityData?.item) {
            const resumeEp = computedEpisodes.find(
                ep =>
                    (ep.absoluteEpisodeNumber || ep.episodeNumber) ===
                    continuityData.item?.episodeNumber
            )
            if (resumeEp) targetEp = resumeEp
        }
        const lf = resolveLocalFileForEpisode(targetEp, entry.localFiles)
        return lf?.path || entry.localFiles?.[0]?.path || null
    }, [entry, computedEpisodes, continuityData])

    // Warm the default target on page load so the first play is instant.
    React.useEffect(() => {
        if (defaultTargetPath) preloadPath(defaultTargetPath)
    }, [defaultTargetPath, preloadPath])

    // ── Next available episode (marathon mode) ────────────────────────────────
    // Siguiente episodio REALMENTE reproducible: el primero tras el actual que
    // tenga archivo local, saltando huecos no descargados. Es la única fuente de
    // verdad para hasNextEpisode, el preload y el panel "a continuación", de modo
    // que el modo maratón nunca avance hacia un episodio inexistente y se corte.
    const nextAvailable = ((): { ep: Anime_Episode; lf: Anime_LocalFile } | null => {
        if (!computedEpisodes || !playTarget) return null
        const currentEpIdx = computedEpisodes.findIndex(
            ep =>
                (ep?.absoluteEpisodeNumber || ep?.episodeNumber) === playTarget.episodeNumber
        )
        if (currentEpIdx === -1) return null
        for (let i = currentEpIdx + 1; i < computedEpisodes.length; i++) {
            const ep = computedEpisodes[i]
            const lf = resolveLocalFileForEpisode(ep, entry?.localFiles)
            if (lf) return { ep, lf }
        }
        return null
    })()

    // Hay siguiente si queda un episodio local por delante o si el timeline
    // encadena con otra serie (handleNextEpisode cubre ambos caminos). El
    // auto-skip de outro, el salto a 3s del final y el panel "a continuación"
    // están todos condicionados por esto.
    const hasNextEpisode = !!nextAvailable || !!nextSeriesTarget
    const nextEp = nextAvailable?.ep ?? null
    const nextLocalFile = nextAvailable?.lf ?? null

    // handleNextEpisode is now a stable useCallback (was a plain function before,
    // recreated on every render — stabilizing it prevents unnecessary re-renders
    // in child components that receive it as a prop).
    const handleNextEpisode = useCallback(() => {
        // Avanza al siguiente episodio reproducible (ya resuelto saltando huecos
        // no descargados). Sin él, encadena con la siguiente serie del timeline.
        if (nextAvailable) {
            handlePlayEpisode(nextAvailable.lf, nextAvailable.ep)
            return
        }
        if (continueToNextSeries()) return
        toast.info("Has llegado al final de la lista de episodios.")
        startViewTransition(() => {
            setPlayTarget(null)
        })
    }, [nextAvailable, handlePlayEpisode, continueToNextSeries])

    // ── Autoplay between series ───────────────────────────────────────────────
    // Autoplay al llegar desde la continuación entre series: reproduce el
    // episodio indicado en la URL (?autoplay=N) una sola vez y limpia el flag.
    const autoplayFiredRef = React.useRef(false)
    React.useEffect(() => {
        if (!autoplayEp || autoplayFiredRef.current) return
        if (!computedEpisodes || computedEpisodes.length === 0) return
        autoplayFiredRef.current = true
        handlePlayByNumber(Number(autoplayEp))
        setSearchParams({ autoplay: "" })
    }, [autoplayEp, computedEpisodes, handlePlayByNumber, setSearchParams])

    // ── Player close callback ─────────────────────────────────────────────────
    const handlePlayerClose = useCallback(() => {
        startViewTransition(() => {
            setPlayTarget(null)
        })
        refetchContinuity()
        queryClient.invalidateQueries({
            queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key, String(seriesId)],
        })
    }, [refetchContinuity, queryClient, seriesId])

    return {
        playTarget,
        setPlayTarget,
        preloadPath,
        defaultTargetPath,
        nextAvailable,
        nextEp,
        nextLocalFile,
        hasNextEpisode,
        handlePlayEpisode,
        handlePlayLocalFile,
        handlePlayDefault,
        handlePlayByNumber,
        handleCastByNumber,
        continueToNextSeries,
        handleNextEpisode,
        handlePlayerClose,
    }
}
