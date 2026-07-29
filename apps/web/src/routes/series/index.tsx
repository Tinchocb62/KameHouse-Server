import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useGetLibraryCollection, fetchLibraryCollection } from '@/api/hooks/anime_collection.hooks';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@/api/generated/endpoints';
import { SeriesCard, getVhsColor } from './-SeriesCard';
import { getMediumResImage } from '@/lib/helpers/images';
import { useIntelligenceStore } from '@/hooks/use-home-intelligence';
import { getSeriesIdFromMedia, getSeriesYear } from '@/lib/helpers/series';
import { Skeleton } from '@/components/ui/skeleton/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useResponsive } from '@/hooks/use-responsive';
import { MediaCard } from '@/components/ui/media-card';
import { useSound } from '@/hooks/use-sound';
import { startViewTransition } from '@/lib/helpers/transitions';
import { ViewModeTabs, type SeriesViewMode } from './-components/view-mode-tabs';
import { ArcsPanorama } from './-components/arcs-panorama';

export const Route = createFileRoute('/series/')({
    // `view` es opcional para que los <Link to="/series"> existentes no estén
    // obligados a pasar search; ausencia === estantería VHS.
    validateSearch: (search: Record<string, unknown>): { view?: SeriesViewMode } => ({
        view: search.view === 'etapas' ? 'etapas' : undefined,
    }),
    loader: ({ context }) => {
        const qc = context.queryClient
        qc.prefetchQuery({
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
    const [selectedId, setSelectedId] = useState<number | null>(null);
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
            .filter(entry => entry.media?.format !== "MOVIE");

        const unique = new Map<number, NonNullable<typeof raw[0]>>();
        raw.forEach(s => { if (s.mediaId) unique.set(s.mediaId, s); });
        const filtered = Array.from(unique.values());

        const mapped = filtered.map((s) => {
            const media = s.media;
            const title = media?.titleEnglish || media?.titleRomaji || media?.titleOriginal || "Sin título";
            // Metadata puede venir sin totalEpisodes (p.ej. series en emisión): usar los archivos locales como fallback.
            const totalEps = media?.totalEpisodes || s.libraryData?.mainFileCount || 0;
            const watchedFromLibrary = s.libraryData
                ? Math.max(0, (s.libraryData.mainFileCount || 0) - (s.libraryData.unwatchedCount || 0))
                : 0;
            const watched = s.listData?.progress || watchedFromLibrary;
            const progressPercent = totalEps > 0 ? Math.min(100, Math.round((watched / totalEps) * 100)) : 0;
            const yearVal = getSeriesYear(title, media?.year, media?.startDate);

            return {
                id: s.mediaId as number,
                title,
                eps: totalEps,
                year: yearVal,
                yearNum: yearVal === 'N/A' ? 9999 : Number(yearVal),
                progress: progressPercent,
                img: getMediumResImage(media?.bannerImage || media?.posterImage || ''),
                poster: getMediumResImage(media?.posterImage || media?.bannerImage || ''),
                desc: media?.description?.replace(/<[^>]*>?/gm, '') || 'Sin descripción',
                seriesId: getSeriesIdFromMedia(media),
            };
        });

        return mapped.sort((a, b) => a.yearNum - b.yearNum);
    }, [collection]);

    // Pre-cargar portadas en memoria para visualización 0ms instantánea
    useEffect(() => {
        if (!seriesList.length) return;
        seriesList.forEach(item => {
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

    return (
        <div className="w-full h-full flex flex-col text-on-surface font-sans overflow-hidden relative md:p-6" style={{ background: "var(--bg-primary)" }}>
            {/* Ambient Background Glow */}
            {selectedItem && !isMobile && view !== 'etapas' && (
                <div
                    className="absolute top-1/2 left-0 w-[700px] h-[700px] pointer-events-none blur-[48px] z-0 transform-gpu will-change-transform"
                    style={{
                        opacity: 0.06,
                        background: `radial-gradient(circle, ${getVhsColor(selectedItem.id)} 0%, transparent 70%)`,
                        transform: getGlowTransform(selectedIndex, seriesList.length, 350),
                        transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), background 700ms ease-out',
                    }}
                />
            )}

            {/* CRT scanlines */}
            <div className="absolute inset-0 pointer-events-none z-[49] opacity-[0.015] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%]" />

            {/* Main Shelf Container */}
            <div
                className="flex-1 min-h-0 backdrop-blur-[var(--blur-overlay-xl)] rounded-corner-lg border border-outline-variant/50 shadow-elevation-3 overflow-hidden relative z-10 flex flex-col"
                style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 50%, transparent)" }}
            >
                {/* Header Bar Desktop (Navegación limpia integrada) */}
                {!isMobile && (
                    <header className="w-full px-5 py-3 flex items-center justify-between border-b border-white/10 bg-zinc-950/70 backdrop-blur-xl shrink-0 z-30 select-none">
                        <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-pulse" />
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
                    className={isMobile
                        ? "w-full h-full bg-transparent overflow-y-auto no-scrollbar relative z-10 p-4 pt-20"
                        : "vhs-shelf w-full flex-1 min-h-0 flex bg-transparent overflow-x-auto overflow-y-hidden no-scrollbar relative z-10 scroll-smooth"}
                    role="listbox"
                    aria-orientation="horizontal"
                    aria-label="Colección de series"
                    aria-activedescendant={selectedItem ? `series-card-${selectedItem.id}` : undefined}
                    style={{ scrollSnapType: 'x proximity', scrollPadding: '0 16px' }}
                >
                    {/* Backlight Glow inside shelf */}
                    {selectedItem && !isMobile && (
                        <div
                            className="absolute top-1/2 left-0 w-[500px] h-[500px] pointer-events-none blur-[48px] z-0 transform-gpu will-change-transform"
                            style={{
                                opacity: 0.12,
                                background: `radial-gradient(circle, ${getVhsColor(selectedItem.id)} 0%, transparent 60%)`,
                                transform: getGlowTransform(selectedIndex, seriesList.length, 250),
                                transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), background 700ms ease-out',
                            }}
                        />
                    )}

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
                                onNavigate={handleNavigate}
                                onSelect={setSelectedId}
                                entryDelayMs={i < ENTRY_STAGGER_MAX_ITEMS ? i * ENTRY_STAGGER_MS : 0}
                            />
                        ))
                    )}
                </main>
                )}
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                @keyframes vhs-card-enter {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .vhs-shelf > article {
                    animation: vhs-card-enter 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
                }
            `}</style>
        </div>
    );
}
