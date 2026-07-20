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
    const targetId = entry.mediaId || media.tmdbId || media.id
    return {
        id: `media-${targetId}`,
        image: media.posterImage || getBackdrop(media) || "",
        title: getTitle(media),
        subtitle: `${media.year || ""} · ${media.format || ""}`,
        badge: media.format,
        description: stripHtml(media.description),
        aspect: "poster",
        year: media.year || undefined,
        rating: media.score ? (media.score > 10 ? media.score / 10 : media.score) : undefined,
        onClick: () => onNavigate(targetId),
        // Only set backdropUrl if there's a real landscape banner (bannerImage).
        // If we fall back to posterImage, it's portrait and should NOT be used as a landscape hero image.
        backdropUrl: media.bannerImage || undefined,
    }
}

