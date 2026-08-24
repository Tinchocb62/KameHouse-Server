import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useGetLibraryCollection, fetchLibraryCollection } from '@/api/hooks/anime_collection.hooks';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@/api/generated/endpoints';
import { SeriesCard, getVhsColor } from './-SeriesCard';
import { MediaCard } from '@/components/ui/media-card';
import { getMediumResImage } from '@/lib/helpers/images';
import { useIntelligenceStore } from '@/hooks/use-home-intelligence';
import { getSeriesIdFromMedia, getSeriesYear, DRAGON_BALL_SERIES_ORDER, DRAGON_BALL_SERIES_INFO } from '@/lib/helpers/series';
import { isTmdbId } from '@/lib/helpers/type-guards';
import { Skeleton } from '@/components/ui/skeleton/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useResponsive } from '@/hooks/use-responsive';
import { useSound } from '@/hooks/use-sound';
import { startViewTransition } from '@/lib/helpers/transitions';
import { ViewModeTabs, type SeriesViewMode } from './-components/view-mode-tabs';
import { ArcsPanorama } from './-components/arcs-panorama';
import { useThemeSettings } from '@/lib/theme/theme-hooks';
import { useAppStore } from '@/lib/store';

export const Route = createFileRoute('/series/')({
    // `view` es opcional para que los <Link to="/series"> existentes no estén
    // obligados a pasar search; ausencia === estantería VHS.
    validateSearch: (search: Record<string, unknown>): { view?: SeriesViewMode } => ({
        view: search.view === 'etapas' ? 'etapas' : undefined,
    }),
    loader: async ({ context }) => {
        const qc = context.queryClient
        await qc.prefetchQuery({
            queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key],
            queryFn: fetchLibraryCollection,
        })
        return { dehydrateState: dehydrate(qc) }
    },
    component: SeriesFullscreenPage,
});

function SeriesFullscreenPage() {
    const { dehydrateState } = Route.useLoaderData()
    return (
        <HydrationBoundary state={dehydrateState}>
            <SeriesFullscreenIndex />
        </HydrationBoundary>
    )
}

/** Delay de stagger por card, en ms. Antes vivía hardcodeado en un <style> con nth-child hasta 16 items. */
const ENTRY_STAGGER_MS = 45;
const ENTRY_STAGGER_MAX_ITEMS = 16;

/** Transform compartido por los dos halos de fondo (exterior + interior del shelf). */
function getGlowTransform(selectedIndex: number, total: number, offsetPx: number) {
    const pct = (selectedIndex / Math.max(total - 1, 1)) * 80 + 10;
    return `translate3d(calc(${pct}% - ${offsetPx}px), -50%, 0)`;
}

function SeriesFullscreenIndex() {
    const navigate = useNavigate();
    const { view: viewParam } = Route.useSearch();
    const view: SeriesViewMode = viewParam ?? 'shelf';
    const { playSound } = useSound();
    const ts = useThemeSettings();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const shelfRef = useRef<HTMLElement>(null);
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl);
    // Tablet (768-1023) se trata como "móvil grande": usa el grid de posters en vez
    // del "VHS shelf" horizontal, que queda apretado en ese ancho. Toda la lógica
    // downstream que ramifica por `isMobile` hereda este criterio compacto.
    const { isMobile: isPhone, isTablet } = useResponsive();
    const isMobile = isPhone || isTablet;

    const { data: collection, isLoading } = useGetLibraryCollection();

    useEffect(() => {
        setBackdropUrl(null);
        return () => {
            setBackdropUrl(null);
        };
    }, [setBackdropUrl]);

    const handleNavigate = useCallback((id: string) => {
        navigate({ to: '/series/$seriesId', params: { seriesId: id } });
    }, [navigate]);

    // Cambio de vista con transición fluida; el modo vive en la URL (?view=etapas)
    // para permitir deep-linking.
    const handleViewChange = useCallback((nextView: SeriesViewMode) => {
        playSound('category', 0.1);
        startViewTransition(() => {
            navigate({ to: '/series', search: { view: nextView === 'shelf' ? undefined : nextView }, replace: true });
        });
    }, [navigate, playSound]);

    const seriesList = useMemo(() => {
        if (!collection?.lists) return [];
        const raw = collection.lists
            .flatMap(list => list.entries || [])
            .filter(entry => {
                const media = entry.media;
                const format = media?.format?.toUpperCase();
                const type = media?.type?.toUpperCase();

                // Excluir rigurosamente películas, OVAs, especiales y entradas de TMDB Movie
                if (format === "MOVIE" || format === "OVA" || format === "SPECIAL") return false;
                if (type === "MOVIE") return false;
                if (isTmdbId(entry.mediaId) || isTmdbId(media?.tmdbId)) return false;

                const allTitles = [
                    media?.titleSpanish,
                    media?.titleEnglish,
                    media?.titleRomaji,
                    media?.titleOriginal,
                ].filter(Boolean).join(" ").toLowerCase();

                const totalEps = media?.totalEpisodes || entry.libraryData?.mainFileCount || 0;
                // Si contiene "movie"/"pelicula"/"película"/"film" y tiene 1 solo episodio, es una película
                if (totalEps <= 1 && (
                    allTitles.includes("movie") ||
                    allTitles.includes("pelicula") ||
                    allTitles.includes("película") ||
                    allTitles.includes("film")
                )) {
                    return false;
                }

                return true;
            });

        const unique = new Map<number, NonNullable<typeof raw[0]>>();
        raw.forEach(s => { if (s.mediaId) unique.set(s.mediaId, s); });
        const filtered = Array.from(unique.values());

        const mapped = filtered.map((s) => {
            const media = s.media;
            const title = media?.titleSpanish || media?.titleEnglish || media?.titleRomaji || media?.titleOriginal || "Sin título";
            const seriesId = getSeriesIdFromMedia(media, title);
            const canonicalInfo = seriesId ? DRAGON_BALL_SERIES_INFO[seriesId] : undefined;

            // Metadata puede venir sin totalEpisodes: usar conteo canónico de la serie o archivos locales
            const rawTotalEps = media?.totalEpisodes || s.libraryData?.mainFileCount || 0;
            const totalEps = rawTotalEps > 0 ? rawTotalEps : (canonicalInfo?.episodes || 0);

            const watchedFromLibrary = s.libraryData
                ? Math.max(0, (s.libraryData.mainFileCount || 0) - (s.libraryData.unwatchedCount || 0))
                : 0;
            const watched = s.listData?.progress || watchedFromLibrary;
            const progressPercent = totalEps > 0 ? Math.min(100, Math.round((watched / totalEps) * 100)) : 0;
            const yearVal = getSeriesYear(title, media?.year, media?.startDate, seriesId);

            const rawDesc = media?.description?.replace(/<[^>]*>?/gm, '').trim();
            const desc = (rawDesc && rawDesc !== 'Sin descripción') ? rawDesc : (canonicalInfo?.description || 'Sin descripción');

            const posterImg = media?.posterImage || media?.bannerImage || canonicalInfo?.poster || '';
            const bannerImg = media?.bannerImage || media?.posterImage || canonicalInfo?.banner || '';

            return {
                id: s.mediaId as number,
                title: canonicalInfo?.title || title,
                eps: totalEps,
                year: yearVal,
                yearNum: yearVal === 'N/A' ? 9999 : Number(yearVal),
                progress: progressPercent,
                img: getMediumResImage(bannerImg),
                poster: getMediumResImage(posterImg),
                desc,
                seriesId,
                orderNum: DRAGON_BALL_SERIES_ORDER[seriesId] ?? 999,
            };
        });

        return mapped.sort((a, b) => {
            if (a.orderNum !== b.orderNum) {
                return a.orderNum - b.orderNum;
            }
            return a.yearNum - b.yearNum;
        });
    }, [collection]);

    // Pre-cargar portadas visibles iniciales de forma suave
    useEffect(() => {
        if (!seriesList.length) return;
        const initialBatch = seriesList.slice(0, 4);
        initialBatch.forEach(item => {
            const src = item.poster || item.img;
            if (src) {
                const img = new Image();
                img.src = src;
            }
        });
    }, [seriesList]);

    // Sin selección explícita del usuario, cae al primer item de la lista. Derivarlo en
    // el render (en vez de sincronizarlo con un effect) evita el render extra que se
    // dispara al llegar la data.
    const effectiveSelectedId = selectedId ?? seriesList[0]?.id ?? null;

    const selectedIndex = useMemo(() => {
        return seriesList.findIndex(item => item.id === effectiveSelectedId);
    }, [seriesList, effectiveSelectedId]);
    const selectedItem = seriesList[selectedIndex] ?? null;

    const setActiveSeriesContext = useAppStore(s => s.setActiveSeriesContext);
    useEffect(() => {
        if (selectedItem?.seriesId || selectedItem?.id) {
            setActiveSeriesContext(selectedItem.seriesId || String(selectedItem.id));
        }
        return () => {
            setActiveSeriesContext(null);
        };
    }, [selectedItem?.seriesId, selectedItem?.id, setActiveSeriesContext]);

    // Desplazar suavemente hacia la tarjeta seleccionada si está en los bordes
    useEffect(() => {
        if (!effectiveSelectedId || isMobile || view === 'etapas') return;
        const cardEl = document.getElementById(`series-card-${effectiveSelectedId}`);
        if (cardEl && shelfRef.current) {
            const shelfRect = shelfRef.current.getBoundingClientRect();
            const cardRect = cardEl.getBoundingClientRect();
            if (cardRect.left < shelfRect.left || cardRect.right > shelfRect.right) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [effectiveSelectedId, isMobile, view]);

    return (
        <div className="w-full h-full flex flex-col text-on-surface font-sans overflow-hidden relative md:p-6" style={{ background: "var(--bg-primary)" }}>
            {/* Ambient Background Glow (Ultra-light static glow, no expensive background transition) */}
            {selectedItem && !isMobile && view !== 'etapas' && (
                <div
                    className="absolute top-1/2 left-0 w-[450px] h-[450px] pointer-events-none z-0 transform-gpu"
                    style={{
                        opacity: 0.05,
                        background: `radial-gradient(circle, ${getVhsColor(selectedItem.id)} 0%, transparent 70%)`,
                        transform: getGlowTransform(selectedIndex, seriesList.length, 300),
                        transition: 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 300ms ease',
                        willChange: 'transform',
                        contain: 'strict',
                    }}
                />
            )}

            {/* Main Shelf Container */}
            <div
                className="flex-1 min-h-0 rounded-corner-lg border border-outline-variant/30 shadow-elevation-2 overflow-hidden relative z-10 flex flex-col bg-zinc-950/80"
            >
                {/* Header Bar Desktop (Navegación limpia integrada) */}
                {!isMobile && (
                    <header className="w-full px-5 py-3 flex items-center justify-between border-b border-white/10 bg-zinc-950/95 shrink-0 z-30 select-none">
                        <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">Biblioteca KameHouse</span>
                                <h1 className="text-sm md:text-base font-black tracking-widest text-white uppercase leading-none font-display">
                                    {view === 'etapas' ? 'Rivales & Enfrentamientos' : 'Colección de Series'}
                                </h1>
                            </div>
                        </div>
                        <ViewModeTabs mode={view} onChange={handleViewChange} />
                    </header>
                )}

                {view === 'etapas' ? (
                    isMobile ? (
                        <div className="w-full h-full overflow-y-auto no-scrollbar p-4 pt-20">
                            <div className="mb-6 pl-1">
                                <div className="flex items-center gap-2.5 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-brand-accent" />
                                    <span className="text-label-sm tracking-widest text-on-surface-variant uppercase font-mono">Etapas</span>
                                </div>
                                <h1 className="font-display text-4xl tracking-wider text-on-surface select-none leading-none">ARCOS ÉPICOS</h1>
                                <div className="h-[2px] w-10 bg-gradient-to-r from-brand-accent to-transparent rounded-full mt-3" />
                                <div className="mt-4">
                                    <ViewModeTabs mode={view} onChange={handleViewChange} />
                                </div>
                            </div>
                            <ArcsPanorama collection={collection} isMobile />
                        </div>
                    ) : (
                        <div className="w-full h-full p-0 overflow-hidden">
                            <ArcsPanorama collection={collection} isMobile={false} />
                        </div>
                    )
                ) : (
                <main
                    ref={shelfRef}
                    className={isMobile
                        ? "w-full h-full bg-transparent overflow-y-auto no-scrollbar relative z-10 p-4 pt-20"
                        : "vhs-shelf w-full flex-1 min-h-0 flex bg-transparent overflow-x-auto overflow-y-hidden no-scrollbar relative z-10 p-3 md:p-4 gap-2.5 items-stretch transform-gpu"}
                    role="listbox"
                    aria-orientation="horizontal"
                    aria-label="Colección de series"
                    aria-activedescendant={selectedItem ? `series-card-${selectedItem.id}` : undefined}
                >
                    {isLoading && seriesList.length === 0 ? (
                        <div className={isMobile ? "w-full grid grid-cols-2 sm:grid-cols-3 gap-4" : "w-full h-full flex items-stretch gap-0 relative z-10 p-2"}>
                            {Array.from({ length: isMobile ? 6 : 8 }).map((_, i) => (
                                <div key={i} className={isMobile ? "flex flex-col gap-2" : "h-full flex flex-col gap-2 p-2 shrink-0"} style={isMobile ? {} : { flex: '1 0 150px' }}>
                                    <Skeleton className={isMobile ? "aspect-[2/3] w-full rounded-xl" : "flex-1 h-auto rounded-t-lg rounded-b-none"} />
                                </div>
                            ))}
                        </div>
                    ) : seriesList.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center relative z-10 p-6">
                            <EmptyState
                                title="No hay series en tu colección"
                                message="Agregá series a tu biblioteca para verlas acá."
                            />
                        </div>
                    ) : isMobile ? (
                        <div className="w-full h-max pb-24">
                            {/* Encabezado de página (solo mobile: en desktop la estantería VHS es el header) */}
                            <div className="mb-6 pl-1">
                                <div className="flex items-center gap-2.5 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-brand-accent" />
                                    <span className="text-label-sm tracking-widest text-on-surface-variant uppercase font-mono">Colección</span>
                                </div>
                                <h1 className="font-display text-4xl tracking-wider text-on-surface select-none leading-none">SERIES</h1>
                                <div className="h-[2px] w-10 bg-gradient-to-r from-brand-accent to-transparent rounded-full mt-3" />
                                <p className="text-label-sm text-on-surface-variant font-mono uppercase mt-2">{seriesList.length} {seriesList.length === 1 ? "serie" : "series"} en tu biblioteca</p>
                                <div className="mt-4">
                                    <ViewModeTabs mode={view} onChange={handleViewChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                            {seriesList.map((item) => (
                                <MediaCard
                                    key={item.id}
                                    artwork={item.poster || item.img}
                                    title={item.title}
                                    badge="Serie"
                                    episodeNumber={item.eps}
                                    progress={item.progress}
                                    description={item.desc}
                                    year={item.year}
                                    onClick={() => handleNavigate(item.id.toString())}
                                    aspect="poster"
                                    className="w-full"
                                />
                            ))}
                            </div>
                        </div>
                    ) : (
                        seriesList.map((item, i) => (
                            <SeriesCard
                                key={item.id}
                                item={item}
                                isSelected={item.id === effectiveSelectedId}
                                showUnwatchedCount={ts.themeShowAnimeUnwatchedCount}
                                onNavigate={handleNavigate}
                                onSelect={setSelectedId}
                                entryDelayMs={i < ENTRY_STAGGER_MAX_ITEMS ? i * ENTRY_STAGGER_MS : 0}
                            />
                        ))
                    )}
                </main>
                )}
            </div>
        </div>
    );
}
