import { useMemo } from "react"
import { getHighResImage } from "@/lib/helpers/images"
import { getDragonBallSpanishTitle } from "@/lib/config/dragonball.config"
import { getNextInTimeline } from "@/lib/config/franchise_timeline"
import type { Anime_Entry, Anime_Episode, Anime_LocalFile, Continuity_WatchHistoryItemResponse, Anime_LibraryCollection } from "@/api/generated/types"
import type { SagaDTO, PremiumEpisode } from "@/api/types/series.types"

// ─── Module-level helpers ─────────────────────────────────────────────────────
// Moved here from index.tsx — shared by use-series-data and use-series-playback
// without circular dependency issues.

/**
 * Un episodio sin sagaId no coincide con ninguna pestaña y desaparece de la
 * interfaz, así que cuando el número cae fuera de todos los rangos (episodios
 * extra, specials mal numerados, rangos desactualizados) lo adjuntamos a la
 * saga más cercana en vez de dejarlo huérfano.
 */
export function resolveSagaId(epNum: number, sagas: SagaDTO[] | undefined): string | undefined {
    if (!sagas || !sagas.length) return undefined

    const exactMatch = sagas.find(s => epNum >= s.startEp && epNum <= s.endEp)
    if (exactMatch) return exactMatch.id

    let fallbackSaga: SagaDTO | undefined
    for (const saga of sagas) {
        if (saga.startEp <= epNum) {
            if (!fallbackSaga || saga.endEp > fallbackSaga.endEp) {
                fallbackSaga = saga
            }
        }
    }
    // Por debajo del inicio de la primera saga: cae en la primera.
    return (fallbackSaga ?? sagas[0]).id
}

export function resolveLocalFileForEpisode(
    episode: Anime_Episode,
    localFiles: Anime_LocalFile[] | undefined | null
): Anime_LocalFile | undefined {
    if (episode.localFile) return episode.localFile
    return (localFiles || []).find(f => {
        const fEp = f.metadata?.episode || f.parsedInfo?.episode
        const fSeason = f.parsedInfo?.season
        if (fEp == null) return false
        if (Number(fEp) === episode.absoluteEpisodeNumber) {
            return true
        }
        if (typeof episode.seasonNumber === "number" && fSeason != null) {
            return Number(fEp) === episode.episodeNumber && Number(fSeason) === episode.seasonNumber
        }
        return Number(fEp) === episode.episodeNumber
    })
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseSeriesDataInput {
    entry: Anime_Entry | undefined | null
    sagas: SagaDTO[] | undefined
    activeSagaId: string | undefined
    activeSubSagaId: string | undefined
    continuityData: Continuity_WatchHistoryItemResponse | undefined | null
    libraryCollection: Anime_LibraryCollection | undefined | null
}

export function useSeriesData({
    entry,
    sagas,
    activeSagaId,
    activeSubSagaId,
    continuityData,
    libraryCollection,
}: UseSeriesDataInput) {
    // ── Episodes derived from API or local files ──────────────────────────────
    const computedEpisodes = useMemo<Anime_Episode[]>(() => {
        if (!entry) return []

        if (entry.episodes && entry.episodes.length > 0) {
            return entry.episodes
                .filter(ep => ep && typeof ep.episodeNumber === "number")
                .map(ep => {
                    const epNum = ep.absoluteEpisodeNumber || ep.episodeNumber
                    const sagaId = resolveSagaId(epNum, sagas)
                    return sagaId ? { ...ep, sagaId } : ep
                })
                .sort(
                    (a, b) =>
                        (a.absoluteEpisodeNumber || a.episodeNumber) -
                        (b.absoluteEpisodeNumber || b.episodeNumber)
                )
        }

        if (entry.localFiles && entry.localFiles.length > 0) {
            const epMap = new Map<number, Anime_Episode>()

            entry.localFiles.forEach(lf => {
                const parsedEp = lf.parsedInfo?.episode || lf.metadata?.episode
                const epNum = Number(parsedEp)
                if (!epNum || isNaN(epNum)) return

                if (!epMap.has(epNum)) {
                    const sagaId = resolveSagaId(epNum, sagas)
                    epMap.set(epNum, {
                        episodeNumber: epNum,
                        absoluteEpisodeNumber: epNum,
                        episodeTitle: lf.name,
                        displayTitle: lf.name,
                        watched: false,
                        sagaId,
                        type: "main",
                        progressNumber: epNum,
                        isDownloaded: true,
                        isInvalid: false,
                        episodeMetadata: {
                            episodeNumber: epNum,
                            image: entry.media?.posterImage || entry.media?.bannerImage || "",
                        },
                    } as unknown as Anime_Episode)
                }
            })

            return Array.from(epMap.values()).sort((a, b) => a.episodeNumber - b.episodeNumber)
        }

        return []
    }, [entry, sagas])

    // ── Active sub-saga object ────────────────────────────────────────────────
    const activeSubSaga = useMemo(() => {
        if (!activeSagaId || !activeSubSagaId || !sagas) return null
        const currentSaga = sagas.find(s => s.id === activeSagaId)
        return currentSaga?.subSagas?.find(ss => ss.id === activeSubSagaId) || null
    }, [sagas, activeSagaId, activeSubSagaId])

    // ── Next series in franchise timeline ─────────────────────────────────────
    // Resolved against the user's library: only offers continuation when the
    // series actually exists (tmdbId → internal mediaId mapping).
    const nextSeriesTarget = useMemo(() => {
        const next = getNextInTimeline(entry?.media?.tmdbId)
        if (!next) return null
        const entries = libraryCollection?.lists?.flatMap(l => l.entries || []) || []
        const match = entries.find(e => e.media?.tmdbId === next.tmdbId && e.mediaId)
        if (!match?.mediaId) return null
        return { seriesId: String(match.mediaId), label: next.label }
    }, [entry?.media?.tmdbId, libraryCollection])

    // ── Hero backdrop ─────────────────────────────────────────────────────────
    const heroBackdrop = useMemo(
        () => getHighResImage(entry?.media?.bannerImage || entry?.media?.posterImage || ""),
        [entry?.media?.bannerImage, entry?.media?.posterImage]
    )

    // ── Resume info for "Continuar viendo" ────────────────────────────────────
    const resumeInfo = useMemo(() => {
        if (!continuityData?.item?.currentTime) return null
        const epNum = continuityData.item.episodeNumber
        const resumeEp = computedEpisodes.find(
            ep => (ep.absoluteEpisodeNumber || ep.episodeNumber) === epNum
        )
        const number = resumeEp
            ? resumeEp.absoluteEpisodeNumber || resumeEp.episodeNumber
            : epNum
        const localizedTitle = getDragonBallSpanishTitle(entry?.media?.tmdbId, number)
        const title =
            localizedTitle ||
            resumeEp?.titleSpanish ||
            resumeEp?.episodeMetadata?.title ||
            resumeEp?.episodeTitle ||
            resumeEp?.displayTitle ||
            `Episodio ${number}`
        return { number, title }
    }, [continuityData, computedEpisodes, entry?.media?.tmdbId])

    // ── Saga-scoped episode lists ─────────────────────────────────────────────
    const sagaEpisodes = useMemo(() => {
        if (!computedEpisodes || !activeSagaId) return []
        return computedEpisodes.filter(ep => ep.sagaId === activeSagaId)
    }, [computedEpisodes, activeSagaId])

    const sagaProgress = useMemo(() => {
        if (sagaEpisodes.length === 0) return { watched: 0, total: 0, percent: 0 }
        const watched = sagaEpisodes.filter(ep => ep.watched).length
        const total = sagaEpisodes.length
        return { watched, total, percent: Math.round((watched / total) * 100) }
    }, [sagaEpisodes])

    const fillerStats = useMemo(() => {
        if (sagaEpisodes.length === 0) return { filler: 0, total: 0, percent: 0 }
        let fillerCount = 0
        sagaEpisodes.forEach(ep => {
            if (ep.episodeMetadata?.isFiller) fillerCount++
        })
        const total = sagaEpisodes.length
        return { filler: fillerCount, total, percent: Math.round((fillerCount / total) * 100) }
    }, [sagaEpisodes, entry?.localFiles])

    // ── Memoized PremiumEpisode view-models ───────────────────────────────────
    // This is the core performance fix: the array was built inline in JSX as a
    // .filter().map() on every render. PremiumEpisodeList does a React Compiler
    // bail-out (incompatible-library: virtualizer), so it never auto-memoizes.
    // Moving the construction here means the list only re-renders when the
    // content actually changes — NOT on hover-preload, scroll, mobileSagasOpen,
    // playTarget changes, etc.
    const episodeViewModels = useMemo<PremiumEpisode[]>(() => {
        if (!computedEpisodes) return []

        const filtered = !sagas?.length
            ? computedEpisodes
            : computedEpisodes.filter(ep => ep.sagaId === activeSagaId)

        const tmdbId = entry?.media?.tmdbId
        const localFiles = entry?.localFiles

        return filtered.map(ep => {
            const epNum = ep.absoluteEpisodeNumber || ep.episodeNumber
            const lf =
                ep.localFile ||
                localFiles?.find(f => {
                    const fEp = f.metadata?.episode || f.parsedInfo?.episode
                    const fSeason = f.parsedInfo?.season

                    if (ep.absoluteEpisodeNumber && Number(fEp) === ep.absoluteEpisodeNumber) {
                        return true
                    }
                    if (fSeason != null && ep.seasonNumber != null) {
                        return (
                            Number(fEp) === ep.episodeNumber &&
                            Number(fSeason) === ep.seasonNumber
                        )
                    }
                    return Number(fEp) === ep.episodeNumber
                })

            const localizedTitle = getDragonBallSpanishTitle(tmdbId, epNum)
            const resolvedTitle =
                localizedTitle ||
                ep.titleSpanish ||
                ep.episodeMetadata?.title ||
                ep.episodeTitle ||
                ep.displayTitle ||
                `Episodio ${epNum}`

            return {
                id: epNum.toString(),
                title: resolvedTitle,
                number: epNum,
                description: ep.episodeMetadata?.summary || ep.episodeMetadata?.overview || "",
                thumbnailUrl: ep.episodeMetadata?.image || heroBackdrop || "",
                episodeType: (ep.episodeMetadata?.isFiller ? "Filler" : (lf?.metadata?.episodeType || "Canon")) as PremiumEpisode["episodeType"],
                isWatched: ep.watched,
                resolution: lf?.technicalInfo?.videoStream?.height
                    ? `${lf.technicalInfo.videoStream.height}p`
                    : undefined,
                videoCodec: lf?.technicalInfo?.videoStream?.codec,
                audioCodec: lf?.technicalInfo?.audioStreams?.[0]?.codec,
                localFilePath: lf?.path,
                sagaId: ep.sagaId,
                sagaName: sagas?.find(s => s.id === ep.sagaId)?.name,
            } as PremiumEpisode
        })
    }, [computedEpisodes, sagas, activeSagaId, entry?.localFiles, entry?.media?.tmdbId, heroBackdrop])

    return {
        computedEpisodes,
        activeSubSaga,
        nextSeriesTarget,
        heroBackdrop,
        resumeInfo,
        sagaEpisodes,
        sagaProgress,
        fillerStats,
        episodeViewModels,
    }
}
