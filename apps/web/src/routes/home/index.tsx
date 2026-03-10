import { useGetLibraryCollection } from "@/api/hooks/anime_collection.hooks"
import { useGetContinuityWatchHistory } from "@/api/hooks/continuity.hooks"
import type {
    Anime_Episode,
    Anime_LibraryCollectionEntry,
    Continuity_WatchHistory,
    Models_LibraryMedia,
} from "@/api/generated/types"
import { LoadingOverlayWithLogo } from "@/components/shared/loading-overlay-with-logo"
import { HeroBanner, type HeroBannerItem } from "@/components/ui/hero-banner"
import { Swimlane, type SwimlaneItem } from "@/components/ui/swimlane"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { AlertTriangle, FolderOpen, Sparkles, Zap, Globe2, Clapperboard } from "lucide-react"
import * as React from "react"
import {
    useHomeIntelligence,
    useIntelligenceStore,
    type IntelligentEntry,
} from "@/hooks/useHomeIntelligence"
import { DynamicBackdrop } from "@/components/shared/dynamic-backdrop"
import { SmartSwimlane } from "@/components/ui/smart-swimlane"
import { SourcePicker } from "@/components/shared/source-picker"
import type { UnifiedResolutionResponse, MediaSource } from "@/api/types/unified.types"

export const Route = createFileRoute("/home/")({
    component: HomePage,
})

// ─── Pure helpers (no React) ──────────────────────────────────────────────────

function getTitle(media: Models_LibraryMedia): string {
    return media.titleEnglish || media.titleRomaji || media.titleOriginal || "Sin título"
}

function getProgress(mediaId: number, watchHistory?: Continuity_WatchHistory): number | undefined {
    const item = watchHistory?.[mediaId]
    if (!item?.duration) return undefined
    return (item.currentTime / item.duration) * 100
}

function getBackdrop(media: Models_LibraryMedia): string {
    return media.bannerImage || media.posterImage
}

// Dragon Ball franchise AniList IDs — used to build the dedicated arc swimlane
const DRAGON_BALL_IDS = new Set([529, 813, 568, 30694, 6033, 107, 235])

// ─── Map functions ────────────────────────────────────────────────────────────

function mapEpisodeToSwimlaneItem(
    episode: Anime_Episode,
    media: Models_LibraryMedia,
    availabilityType: "FULL_LOCAL" | "HYBRID" | "ONLY_ONLINE" | undefined,
    watchHistory: Continuity_WatchHistory | undefined,
    onNavigate: (mediaId: number) => void,
): SwimlaneItem {
    return {
        id: `continue-${media.id}-${episode.episodeNumber}`,
        title: getTitle(media),
        image: episode.episodeMetadata?.image || getBackdrop(media),
        subtitle: episode.displayTitle || `Episodio ${episode.episodeNumber}`,
        badge: media.format,
        availabilityType,
        description:
            episode.episodeMetadata?.summary ||
            episode.episodeMetadata?.overview ||
            media.description,
        progress: getProgress(media.id, watchHistory),
        aspect: "wide",
        onClick: () => onNavigate(media.id),
        backdropUrl: episode.episodeMetadata?.image || getBackdrop(media),
    }
}

function mapEntryToHeroItem(
    entry: IntelligentEntry,
    watchHistory: Continuity_WatchHistory | undefined,
    onNavigate: (mediaId: number) => void,
): HeroBannerItem | null {
    if (!entry.media) return null
    const media = entry.media
    const intel = entry.intelligence
    return {
        id: `hero-entry-${media.id}`,
        title: getTitle(media),
        synopsis: media.description,
        backdropUrl: getBackdrop(media),
        posterUrl: media.posterImage,
        year: media.year || undefined,
        format: media.format,
        episodeCount: media.totalEpisodes || undefined,
        progress: getProgress(media.id, watchHistory),
        arcName: intel?.arcName || undefined,
        contentTag: intel?.tag,
        rating: intel?.rating,
        mediaId: media.id,
        onPlay: () => onNavigate(media.id),
        onMoreInfo: () => onNavigate(media.id),
    }
}

function mapEpisodeToHeroItem(
    episode: Anime_Episode,
    media: Models_LibraryMedia,
    watchHistory: Continuity_WatchHistory | undefined,
    onNavigate: (mediaId: number) => void,
): HeroBannerItem {
    return {
        id: `hero-continue-${media.id}-${episode.episodeNumber}`,
        title: getTitle(media),
        synopsis:
            episode.episodeMetadata?.summary ||
            episode.episodeMetadata?.overview ||
            media.description,
        backdropUrl: episode.episodeMetadata?.image || getBackdrop(media),
        posterUrl: media.posterImage,
        year: media.year || undefined,
        format: media.format,
        episodeCount: media.totalEpisodes || undefined,
        progress: getProgress(media.id, watchHistory),
        mediaId: media.id,
        onPlay: () => onNavigate(media.id),
        onMoreInfo: () => onNavigate(media.id),
    }
}

// ─── Quick Play hook ──────────────────────────────────────────────────────────

/**
 * Fetches resolution sources from /api/v1/resolve/:mediaId and opens the
 * SourcePicker sheet. Falls back to series navigation if the endpoint 404s.
 */
function useQuickPlay(onFallback: (mediaId: number) => void) {
    const [resolution, setResolution] = React.useState<UnifiedResolutionResponse | null>(null)
    const [isResolving, setIsResolving] = React.useState(false)

    const open = React.useCallback(
        async (mediaId: number) => {
            setIsResolving(true)
            try {
                const res = await fetch(`/api/v1/resolve/${mediaId}?episode=1`)
                if (!res.ok) throw new Error("No sources")
                const json = (await res.json()) as { data: UnifiedResolutionResponse }
                setResolution(json.data)
            } catch {
                // No resolution endpoint yet — fall back to series detail page
                onFallback(mediaId)
            } finally {
                setIsResolving(false)
            }
        },
        [onFallback],
    )

    const close = React.useCallback(() => setResolution(null), [])

    return { resolution, isResolving, open, close }
}

// ─── ErrorBanner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
            <div className="max-w-md text-center">
                <AlertTriangle className="mx-auto mb-5 h-12 w-12 text-muted-foreground" />
                <h2 className="mb-3 text-2xl font-semibold uppercase tracking-[0.18em] text-foreground">
                    No se pudo cargar la biblioteca
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">{message}</p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-6 rounded-full border border-border bg-secondary/50 px-6 py-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-secondary"
                >
                    Reintentar
                </button>
            </div>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
            <div className="max-w-md text-center">
                <FolderOpen className="mx-auto mb-5 h-12 w-12 text-muted-foreground" />
                <h2 className="mb-3 text-2xl font-semibold uppercase tracking-[0.18em] text-foreground">
                    Biblioteca vacía
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                    Aún no hay contenido listo para mostrar. Escanea tus rutas desde configuración
                    y vuelve a cargar la biblioteca.
                </p>
            </div>
        </div>
    )
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({
    icon: Icon,
    label,
}: {
    icon: React.ElementType
    label: string
}) {
    return (
        <div className="px-6 md:px-10 lg:px-14">
            <div className="inline-flex items-center gap-3 rounded-full border border-border bg-secondary/50 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground backdrop-blur-xl">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </div>
        </div>
    )
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

function HomePage() {
    const navigate = useNavigate()
    const { data, isLoading: isCollectionLoading, error } = useGetLibraryCollection()
    const { data: watchHistory, isLoading: isContinuityLoading } = useGetContinuityWatchHistory()
    const { data: intelligenceData, isLoading: isIntelligenceLoading } = useHomeIntelligence()
    const { setBackdropUrl } = useIntelligenceStore()

    // Define handleNavigate first so useQuickPlay can reference it as a fallback
    const handleNavigate = React.useCallback(
        (mediaId: number) => {
            navigate({ to: "/series/$seriesId", params: { seriesId: String(mediaId) } })
        },
        [navigate],
    )

    const { resolution, open: openSourcePicker, close: closeSourcePicker } = useQuickPlay(handleNavigate)

    const collection = data
    const lists = collection?.lists ?? []
    const continueWatchingEpisodes = collection?.continueWatchingList ?? []

    // Build a fast lookup map: mediaId → entry
    const entriesByMediaId = React.useMemo(() => {
        const map = new Map<number, Anime_LibraryCollectionEntry>()
        for (const list of lists) {
            for (const entry of list.entries ?? []) {
                if (entry.media) map.set(entry.mediaId, entry)
            }
        }
        return map
    }, [lists])

    const allEntries = React.useMemo(() => Array.from(entriesByMediaId.values()), [entriesByMediaId])

    const resolveEpisodeMedia = React.useCallback(
        (episode: Anime_Episode): Models_LibraryMedia | undefined =>
            episode.baseAnime ||
            (episode.localFile?.mediaId
                ? entriesByMediaId.get(episode.localFile.mediaId)?.media
                : undefined),
        [entriesByMediaId],
    )

    // ── Continue Watching swimlane items ──────────────────────────────────
    const continueWatchingItems = React.useMemo(
        () =>
            continueWatchingEpisodes
                .map((ep) => {
                    const media = resolveEpisodeMedia(ep)
                    const entry = entriesByMediaId.get(
                        ep.baseAnime?.id || ep.localFile?.mediaId || 0,
                    )
                    return media
                        ? mapEpisodeToSwimlaneItem(
                              ep,
                              media,
                              entry?.availabilityType,
                              watchHistory,
                              handleNavigate,
                          )
                        : null
                })
                .filter((item): item is SwimlaneItem => item !== null),
        [continueWatchingEpisodes, entriesByMediaId, handleNavigate, resolveEpisodeMedia, watchHistory],
    )

    // ── Dragon Ball Universe swimlane ─────────────────────────────────────
    // Pulls entries from all intelligence swimlanes that belong to the DB franchise.
    const dragonBallItems = React.useMemo((): SwimlaneItem[] => {
        const seen = new Set<number>()
        const items: SwimlaneItem[] = []

        const sources = [
            ...(intelligenceData?.swimlanes ?? []).flatMap((l) => l.entries),
            ...allEntries,
        ]

        for (const entry of sources) {
            if (!entry.media) continue
            const mediaId = entry.mediaId
            if (seen.has(mediaId) || !DRAGON_BALL_IDS.has(mediaId)) continue
            seen.add(mediaId)

            const media = entry.media
            const intel = (entry as IntelligentEntry).intelligence
            const backdropUrl = media.bannerImage || media.posterImage

            const parts: string[] = []
            if (media.year) parts.push(String(media.year))
            if (intel?.arcName) parts.push(intel.arcName)

            items.push({
                id: `db-${mediaId}`,
                title: getTitle(media),
                image: media.posterImage || backdropUrl,
                subtitle: parts.join(" · "),
                badge: intel?.tag === "EPIC" ? "Épico 🔥" : media.format,
                availabilityType: entry.availabilityType as SwimlaneItem["availabilityType"],
                backdropUrl: backdropUrl || undefined,
                aspect: "poster",
                onClick: () => handleNavigate(mediaId),
            })
        }

        return items
    }, [intelligenceData, allEntries, handleNavigate])

    // ── Movies swimlane ───────────────────────────────────────────────────
    const movieItems = React.useMemo((): SwimlaneItem[] => {
        const MOVIE_FORMATS = new Set(["MOVIE", "MOVIE_SHORT"])
        return allEntries
            .filter((e) => e.media && MOVIE_FORMATS.has(e.media.format ?? ""))
            .map((entry): SwimlaneItem | null => {
                if (!entry.media) return null
                const m = entry.media
                const backdropUrl = m.bannerImage || m.posterImage
                return {
                    id: `movie-${entry.mediaId}`,
                    title: getTitle(m),
                    image: backdropUrl || m.posterImage,
                    subtitle: m.year ? String(m.year) : undefined,
                    badge: m.score && m.score >= 80 ? `${(m.score / 10).toFixed(1)} ★` : undefined,
                    availabilityType: entry.availabilityType as SwimlaneItem["availabilityType"],
                    backdropUrl: backdropUrl || undefined,
                    aspect: "wide",
                    onClick: () => handleNavigate(entry.mediaId),
                }
            })
            .filter((x): x is SwimlaneItem => x !== null)
    }, [allEntries, handleNavigate])

    // ── Hero banner items ─────────────────────────────────────────────────
    // Priority: EPIC-tagged curated entries > Continue Watching > fallback list
    const heroItems = React.useMemo((): HeroBannerItem[] => {
        const items: HeroBannerItem[] = []
        const seen = new Set<number>()

        // 1. EPIC entries from intelligence swimlanes (highest quality heroes)
        if (intelligenceData) {
            for (const lane of intelligenceData.swimlanes) {
                for (const entry of lane.entries) {
                    const intel = (entry as IntelligentEntry).intelligence
                    if (!entry.media || seen.has(entry.mediaId)) continue
                    if (intel?.tag !== "EPIC") continue
                    seen.add(entry.mediaId)
                    const item = mapEntryToHeroItem(entry as IntelligentEntry, watchHistory, handleNavigate)
                    if (item) items.push(item)
                    if (items.length >= 3) break
                }
                if (items.length >= 3) break
            }
        }

        // 2. Continue Watching episodes
        for (const ep of continueWatchingEpisodes) {
            const media = resolveEpisodeMedia(ep)
            if (!media || seen.has(media.id)) continue
            seen.add(media.id)
            items.push(mapEpisodeToHeroItem(ep, media, watchHistory, handleNavigate))
            if (items.length >= 5) break
        }

        // 3. Fallback: first curated swimlane
        if (intelligenceData && items.length < 3) {
            const firstLane = intelligenceData.swimlanes[0]
            for (const entry of firstLane?.entries ?? []) {
                if (!entry.media || seen.has(entry.mediaId)) continue
                seen.add(entry.mediaId)
                const item = mapEntryToHeroItem(entry as IntelligentEntry, watchHistory, handleNavigate)
                if (item) items.push(item)
                if (items.length >= 5) break
            }
        }

        return items
    }, [
        continueWatchingEpisodes,
        handleNavigate,
        resolveEpisodeMedia,
        intelligenceData,
        watchHistory,
    ])

    const isLoading = isCollectionLoading || isContinuityLoading || isIntelligenceLoading

    if (isLoading) return <LoadingOverlayWithLogo />

    if (error) {
        return (
            <ErrorBanner
                message={
                    error instanceof Error
                        ? error.message
                        : "Se produjo un error al conectar con el servidor."
                }
            />
        )
    }

    if (allEntries.length === 0 && (!intelligenceData || intelligenceData.swimlanes.length === 0)) {
        return <EmptyState />
    }

    return (
        <div className="min-h-screen bg-background flex flex-col gap-8 w-full max-w-screen-2xl mx-auto">
            {/* Global dynamic backdrop — reacts to card hovers */}
            <DynamicBackdrop />

            {/* ── Hero banner (full-viewport) ────────────────────────────── */}
            <HeroBanner
                className="-mt-[53px]"
                items={heroItems.map((item) => ({
                    ...item,
                    // Override onPlay to try SourcePicker first
                    onPlay: () => {
                        if (item.mediaId) openSourcePicker(item.mediaId)
                        else item.onPlay()
                    },
                }))}
            />

            {/* ── SourcePicker sheet — resolves on hero Quick Play ─────── */}
            <SourcePicker
                response={resolution}
                onSelect={(source: MediaSource) => {
                    closeSourcePicker()
                    // TODO: pipe source.urlPath to the media player
                    window.open(source.urlPath, "_blank")
                }}
                onClose={closeSourcePicker}
            />

            {/* ── Swimlane section ──────────────────────────────────────── */}
            <div className="relative z-10 -mt-20 flex flex-col gap-8 pb-24">
                <SectionLabel icon={Sparkles} label="Descubrimiento cinematográfico" />

                {/* Continue Watching */}
                {continueWatchingItems.length > 0 && (
                    <Swimlane
                        title="Continuar viendo"
                        items={continueWatchingItems}
                        defaultAspect="wide"
                        onHover={setBackdropUrl}
                    />
                )}

                {/* Intelligence-curated lanes from the backend */}
                {intelligenceData?.swimlanes.map((lane) => (
                    <SmartSwimlane
                        key={lane.id}
                        lane={lane}
                        onNavigate={(id) => handleNavigate(Number(id))}
                    />
                ))}

                {/* Dragon Ball Universe — dedicated arc lane */}
                {dragonBallItems.length > 0 && (
                    <>
                        <SectionLabel icon={Zap} label="Universo Dragon Ball" />
                        <Swimlane
                            title="Universo Dragon Ball"
                            items={dragonBallItems}
                            defaultAspect="poster"
                            onHover={setBackdropUrl}
                        />
                    </>
                )}

                {/* Movies — standalone films only */}
                {movieItems.length > 0 && (
                    <>
                        <SectionLabel icon={Clapperboard} label="Películas" />
                        <Swimlane
                            title="Películas"
                            items={movieItems}
                            defaultAspect="wide"
                            onHover={setBackdropUrl}
                        />
                    </>
                )}

                {/* All local entries (online discovery) */}
                {allEntries.length > 0 && (
                    <>
                        <SectionLabel icon={Globe2} label="Tu colección" />
                        <Swimlane
                            title="Tu colección completa"
                            items={allEntries
                                .slice(0, 30)
                                .map((entry): SwimlaneItem | null => {
                                    if (!entry.media) return null
                                    const m = entry.media
                                    return {
                                        id: `all-${entry.mediaId}`,
                                        title: getTitle(m),
                                        image: m.posterImage || getBackdrop(m),
                                        subtitle: m.year ? String(m.year) : m.format,
                                        badge: m.format,
                                        availabilityType:
                                            entry.availabilityType as SwimlaneItem["availabilityType"],
                                        backdropUrl: getBackdrop(m) || undefined,
                                        aspect: "poster",
                                        onClick: () => handleNavigate(entry.mediaId),
                                    }
                                })
                                .filter((x): x is SwimlaneItem => x !== null)}
                            defaultAspect="poster"
                            onHover={setBackdropUrl}
                        />
                    </>
                )}
            </div>
        </div>
    )
}
