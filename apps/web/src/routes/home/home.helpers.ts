import type { Models_LibraryMedia } from "@/api/generated/types"

/**
 * Returns the best title for a media object.
 */
export function getTitle(media: Models_LibraryMedia): string {
    return media.titleSpanish || media.titleEnglish || media.titleRomaji || "Sin título"
}

/**
 * Returns the backdrop/banner URL for a media object.
 */
export function getBackdrop(media: Models_LibraryMedia): string {
    return media.bannerImage || media.posterImage
}
