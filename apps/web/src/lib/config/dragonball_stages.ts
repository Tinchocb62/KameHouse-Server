import { DRAGON_BALL_SAGAS, SagaDefinition } from "./dragonball_sagas"

// ─── Resolución de progreso de saga contra la biblioteca del usuario ──────────
// Helpers compartidos por las vistas del panorama (rivales icónicos). Los tipos
// son estructurales mínimos (mismo criterio que MediaForSagaResolution en
// dragonball.config.ts) para no acoplar la config a los tipos generados.

export interface StageCollectionEntry {
    mediaId?: number
    media?: {
        tmdbId?: number | null
        format?: string | null
        posterImage?: string | null
        bannerImage?: string | null
        titleSpanish?: string | null
        titleEnglish?: string | null
        titleRomaji?: string | null
    } | null
    listData?: { progress?: number; status?: string } | null
    libraryData?: { mainFileCount?: number; unwatchedCount?: number } | null
}

/** Saga resuelta con el progreso del usuario dentro de su rango de episodios. */
export interface ResolvedStageSaga {
    kind: "saga"
    saga: SagaDefinition
    tmdbId: number
    /** Id interno de la serie en la biblioteca (null si no está en la colección). */
    mediaId: number | null
    startEp: number
    endEp: number
    totalEps: number
    watchedEps: number
    percent: number
    isComplete: boolean
}

/** Indexa la colección por TMDB id (primera aparición gana). */
export function indexEntriesByTmdb(entries: StageCollectionEntry[]): Map<number, StageCollectionEntry> {
    const byTmdb = new Map<number, StageCollectionEntry>()
    for (const e of entries) {
        const tmdbId = e.media?.tmdbId
        if (tmdbId && !byTmdb.has(tmdbId)) byTmdb.set(tmdbId, e)
    }
    return byTmdb
}

/**
 * Resuelve el progreso del usuario dentro del rango de una saga. Usa
 * `listData.progress` (avance lineal) con fallback a archivos locales vistos, y
 * recorta al rango [startEp, endEp] de la saga. null si la saga no existe.
 */
export function resolveSagaProgress(
    tmdbId: number,
    sagaId: string,
    entry: StageCollectionEntry | undefined,
): ResolvedStageSaga | null {
    const saga = (DRAGON_BALL_SAGAS[tmdbId] || []).find(s => s.id === sagaId)
    if (!saga) return null
    const progress = entry
        ? entry.listData?.progress ??
          Math.max(0, (entry.libraryData?.mainFileCount ?? 0) - (entry.libraryData?.unwatchedCount ?? 0))
        : 0
    const totalEps = saga.endEp - saga.startEp + 1
    const watchedEps = Math.min(totalEps, Math.max(0, progress - saga.startEp + 1))
    const percent = totalEps > 0 ? Math.round((watchedEps / totalEps) * 100) : 0
    const isComplete = watchedEps >= totalEps
    return {
        kind: "saga",
        saga,
        tmdbId,
        mediaId: entry?.mediaId ?? null,
        startEp: saga.startEp,
        endEp: saga.endEp,
        totalEps,
        watchedEps,
        percent,
        isComplete,
    }
}
