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

// Dragon Ball franchise AniList IDs
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
        year: media.year || undefined,
        rating: media.score ? media.score / 10 : undefined,
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
                    Aún no hay contenido listo para mostrar. Escanea tus rutas desde configuración.
                </p>
            </div>
        </div>
    )
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <div className="px-6 md:px-10 lg:px-14">
            <div className="inline-flex items-center gap-3 rounded-full border border-border bg-secondary/50 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground backdrop-blur-xl">
                <Icon className="h-3.5 w-3.5 text-orange-500" />
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

    // ── Sections mapping ──────────────────────────────────────────────────

    const continueWatchingItems = React.useMemo(
        () =>
            continueWatchingEpisodes
                .map((ep) => {
                    const media = resolveEpisodeMedia(ep)
                    const entry = entriesByMediaId.get(ep.baseAnime?.id || ep.localFile?.mediaId || 0)
                    return media
                        ? mapEpisodeToSwimlaneItem(ep, media, entry?.availabilityType, watchHistory, handleNavigate)
                        : null
                })
                .filter((item): item is SwimlaneItem => item !== null),
        [continueWatchingEpisodes, entriesByMediaId, handleNavigate, resolveEpisodeMedia, watchHistory],
    )

    const recentItems = React.useMemo((): SwimlaneItem[] => {
        return [...allEntries]
            .sort((a, b) => {
                const aDate = a.media?.createdAt ? new Date(a.media.createdAt).getTime() : 0
                const bDate = b.media?.createdAt ? new Date(b.media.createdAt).getTime() : 0
                return bDate - aDate
            })
            .slice(0, 20)
            .map((entry): SwimlaneItem | null => {
                if (!entry.media) return null
                const m = entry.media
                return {
                    id: `recent-${entry.mediaId}`,
                    title: getTitle(m),
                    image: m.posterImage || getBackdrop(m),
                    subtitle: m.year ? String(m.year) : m.format,
                    badge: m.format,
                    availabilityType: entry.availabilityType as SwimlaneItem["availabilityType"],
                    backdropUrl: getBackdrop(m) || undefined,
                    aspect: "poster",
                    year: m.year,
                    rating: m.score ? m.score / 10 : undefined,
                    onClick: () => handleNavigate(entry.mediaId),
                }
            })
            .filter((x): x is SwimlaneItem => x !== null)
    }, [allEntries, handleNavigate])

    const heroItems = React.useMemo((): HeroBannerItem[] => {
        const items: HeroBannerItem[] = []
        const seen = new Set<number>()

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

        for (const ep of continueWatchingEpisodes) {
            const media = resolveEpisodeMedia(ep)
            if (!media || seen.has(media.id)) continue
            seen.add(media.id)
            items.push(mapEpisodeToHeroItem(ep, media, watchHistory, handleNavigate))
            if (items.length >= 5) break
        }

        return items
    }, [continueWatchingEpisodes, handleNavigate, resolveEpisodeMedia, intelligenceData, watchHistory])

    const isLoading = isCollectionLoading || isContinuityLoading || isIntelligenceLoading

    if (isLoading) return <LoadingOverlayWithLogo />

    if (error) return <ErrorBanner message={error instanceof Error ? error.message : "Error de conexión."} />

    if (allEntries.length === 0 && (!intelligenceData || intelligenceData.swimlanes.length === 0)) {
        return <EmptyState />
    }

    return (
        <div className="min-h-screen bg-background flex flex-col gap-8 w-full max-w-screen-2xl mx-auto overflow-x-hidden">
            <DynamicBackdrop />

            <HeroBanner
                className="-mt-[53px]"
                items={heroItems.map((item) => ({
                    ...item,
                    onPlay: () => {
                        if (item.mediaId) openSourcePicker(item.mediaId)
                        else item.onPlay()
                    },
                }))}
            />

            <SourcePicker
                response={resolution}
                onSelect={(source: MediaSource) => {
                    closeSourcePicker()
                    window.open(source.urlPath, "_blank")
                }}
                onClose={closeSourcePicker}
            />

            <div className="relative z-10 -mt-20 flex flex-col gap-10 pb-24">
                {/* 1. Continue Watching (Focus) */}
                {continueWatchingItems.length > 0 && (
                    <div className="space-y-4">
                        <SectionLabel icon={Zap} label="Continuar viendo" />
                        <Swimlane
                            title="Continuar viendo"
                            items={continueWatchingItems}
                            defaultAspect="wide"
                            onHover={setBackdropUrl}
                        />
                    </div>
                )}

                {/* 2. Recently Added */}
                {recentItems.length > 0 && (
                    <div className="space-y-4">
                        <SectionLabel icon={Sparkles} label="Novedades en tu biblioteca" />
                        <Swimlane
                            title="Añadidos recientemente"
                            items={recentItems}
                            defaultAspect="poster"
                            onHover={setBackdropUrl}
                        />
                    </div>
                )}

                {/* 3. Curated Sagas / Intelligence */}
                {intelligenceData?.swimlanes.map((lane) => (
                    <div key={lane.id} className="space-y-4">
                        <SectionLabel 
                            icon={lane.type === "epic_moments" ? Zap : Clapperboard} 
                            label={lane.title} 
                        />
                        <SmartSwimlane
                            lane={lane}
                            onNavigate={(id) => handleNavigate(Number(id))}
                        />
                    </div>
                ))}

                {/* 4. Full Collection Fallback */}
                {allEntries.length > 0 && (
                    <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                        <SectionLabel icon={Globe2} label="Explorar colección completa" />
                        <Swimlane
                            title="Tu colección"
                            items={allEntries.slice(0, 40).map((entry) => ({
                                id: `coll-${entry.mediaId}`,
                                title: getTitle(entry.media!),
                                image: entry.media!.posterImage || getBackdrop(entry.media!),
                                subtitle: entry.media!.year ? String(entry.media!.year) : entry.media!.format,
                                badge: entry.media!.format,
                                year: entry.media!.year,
                                rating: entry.media!.score ? entry.media!.score / 10 : undefined,
                                onClick: () => handleNavigate(entry.mediaId),
                                backdropUrl: getBackdrop(entry.media!),
                                aspect: "poster"
                            }))}
                            defaultAspect="poster"
                            onHover={setBackdropUrl}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
