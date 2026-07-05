import { Platform_UnifiedMedia, Platform_UnifiedCollectionEntry, Nullish } from "@/api/generated/types"

export function media_getTotalEpisodes(media: Nullish<Platform_UnifiedMedia>) {
    if (!media) return -1
    let maxEp = media?.episodes ?? -1
    if (maxEp === -1) {
        if (media.nextAiringEpisode && media.nextAiringEpisode.episode) {
            maxEp = media.nextAiringEpisode.episode - 1
        }
    }
    if (maxEp === -1) {
        return 0
    }
    return maxEp
}

export function media_getCurrentEpisodes(media: Nullish<Platform_UnifiedMedia>) {
    if (!media) return -1
    let maxEp = -1
    if (media.nextAiringEpisode && media.nextAiringEpisode.episode) {
        maxEp = media.nextAiringEpisode.episode - 1
    }
    if (maxEp === -1) {
        maxEp = media.episodes ?? 0
    }
    return maxEp
}

export function media_getListDataFromEntry(entry: Nullish<Platform_UnifiedCollectionEntry>) {
    return {
        progress: entry?.progress,
        score: entry?.score,
        status: entry?.status,
        startedAt: new Date(entry?.startedAt?.year || 0,
            entry?.startedAt?.month ? entry?.startedAt?.month - 1 : 0,
            entry?.startedAt?.day || 0).toUTCString(),
        completedAt: new Date(entry?.completedAt?.year || 0,
            entry?.completedAt?.month ? entry?.completedAt?.month - 1 : 0,
            entry?.completedAt?.day || 0).toUTCString(),
    }
}


export function media_isMovie(media: Nullish<Platform_UnifiedMedia>) {
    if (!media) return false
    return media?.format === "MOVIE"

}

export function media_isSingleEpisode(media: Nullish<Platform_UnifiedMedia>) {
    if (!media) return false
    return media?.format === "MOVIE" || media?.episodes === 1
}


export function media_getUnwatchedCount(media: Nullish<Platform_UnifiedMedia>, progress: Nullish<number>) {
    if (!media) return 0
    const maxEp = media_getCurrentEpisodes(media)
    return maxEp - (progress ?? 0)
}

export function cleanMediaTitle(text?: string, isMovie?: boolean): string {
    if (!text) return ""
    // Remove extensions
    let cleaned = text.replace(/\.(mkv|mp4|avi|m4v|mov)$/i, "")
    // Remove duplicate extensions or trailing dots
    cleaned = cleaned.replace(/\.(mkv|mp4|avi|m4v|mov)/i, "").trim()
    
    // Remove brackets [...] and parentheses (...) to clean raw filenames (e.g. year, quality tags)
    cleaned = cleaned.replace(/\[[^\]]+\]/g, "").replace(/\([^)]+\)/g, "").trim()
    
    // Remove guillemets (arrows) « and » often used in episode titles
    cleaned = cleaned.replace(/[«»]/g, "").trim()
    
    // Strip common series prefixes for movies (e.g. "Dragon Ball: ", "Dragon Ball Z ", "Dragon Ball GT ")
    if (isMovie) {
        cleaned = cleaned.replace(/^(dragon\s*ball\s*(z|gt|super|kai)?\s*[:\-–—]?\s*)/i, "").trim()
    }
    
    // Capitalize nicely if it's all uppercase (e.g. "LA PRINCESA DURMIENTE..." -> "La Princesa Durmiente...")
    if (cleaned === cleaned.toUpperCase() && !/^[\d\s\W]+$/.test(cleaned)) {
        cleaned = cleaned
            .toLowerCase()
            .replace(/\b([a-z])/g, (c) => c.toUpperCase())
            // Capitalize common acronyms/words
            .replace(/\b(Dbz|Db|Gt|Ova|Saga)\b/g, (m) => m.toUpperCase())
            .replace(/\b(En|El|La|Lo|De|Y|Con|O|Para|Del|Al)\b/gi, (m) => m.toLowerCase());
        
        // Always capitalize the very first word
        if (cleaned.length > 0) {
            cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
        }
    }
    
    // Clean up any double spaces introduced by removing tags
    return cleaned.replace(/\s+/g, " ").trim()
}

export function getSeriesName(fullTitle?: string): string {
    if (!fullTitle) return ""
    if (fullTitle.includes(":")) {
        return fullTitle.split(":")[0].trim()
    }
    const match = fullTitle.match(/^(dragon\s*ball\s*(z|gt|super|kai)?)/i)
    if (match) {
        return match[1].trim()
    }
    return fullTitle
}

