import type { Anime_LibraryCollectionEntry } from "@/api/generated/types"
import type { SwimlaneItem } from "@/components/ui/swimlane"
import type { IntelligentEntry } from "@/api/types/intelligence.types"
import { getTitle, getBackdrop } from "./home.helpers"

/**
 * Helper to strip HTML tags from a string.
 */
function stripHtml(text: string): string
function stripHtml(text: string | undefined): string | undefined
function stripHtml(text: string | undefined): string | undefined {
    if (!text) return text
    return text.replace(/<[^>]*>/g, '')
}

/**
 * Maps a library entry to SwimlaneItem.
 */
export function mapLibraryEntryToMediaCard(
    entry: Anime_LibraryCollectionEntry | IntelligentEntry,
    onNavigate: (mediaId: number) => void,
): SwimlaneItem {
    const media = entry.media!
    const rawMediaId = entry.mediaId || media.tmdbId || media.id
    const targetId = rawMediaId
    const isMovieLike = media.format === "MOVIE" || media.format === "SPECIAL" || media.format === "OVA" || media.type === "MOVIE" || (rawMediaId && rawMediaId >= 1_000_000)
    const effectiveFormat = media.format || (isMovieLike ? "MOVIE" : undefined)

    return {
        id: `media-${targetId}`,
        tmdbId: media.tmdbId ?? undefined,
        mediaId: entry.mediaId ?? media.id ?? undefined,
        image: media.posterImage || getBackdrop(media) || "",
        title: getTitle(media),
        subtitle: `${media.year || ""} · ${effectiveFormat || ""}`,
        badge: effectiveFormat,
        description: stripHtml(media.description),
        aspect: "poster",
        year: media.year || undefined,
        rating: media.score ? (media.score > 10 ? media.score / 10 : media.score) : undefined,
        onClick: () => onNavigate(targetId),
        backdropUrl: media.bannerImage || undefined,
    }
}

