import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useGetLibraryCollection, fetchLibraryCollection } from '@/api/hooks/anime_collection.hooks';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@/api/generated/endpoints';
import { SeriesCard, getVhsColor } from './-SeriesCard';
import { getLargeResImage } from '@/lib/helpers/images';
import { useIntelligenceStore } from '@/hooks/use-home-intelligence';
import { getSeriesIdFromMedia, getSeriesYear } from '@/lib/helpers/series';
import { Skeleton } from '@/components/ui/skeleton/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

export const Route = createFileRoute('/series/')({
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
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const setBackdropUrl = useIntelligenceStore(s => s.setBackdropUrl);

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
            const totalEps = media?.totalEpisodes || 1;
            const progress = s.listData?.progress || 0;
            const progressPercent = Math.min(100, Math.round((progress / (totalEps > 0 ? totalEps : 1)) * 100));
            const yearVal = getSeriesYear(title, media?.year, media?.startDate);

            return {
                id: s.mediaId as number,
                title,
                eps: media?.totalEpisodes || 0,
                year: yearVal,
                yearNum: yearVal === 'N/A' ? 9999 : Number(yearVal),
                progress: progressPercent,
                img: getLargeResImage(media?.bannerImage || media?.posterImage || ''),
                poster: getLargeResImage(media?.posterImage || media?.bannerImage || ''),
                desc: media?.description?.replace(/<[^>]*>?/gm, '') || 'Sin descripción',
                seriesId: getSeriesIdFromMedia(media),
            };
        });

        return mapped.sort((a, b) => a.yearNum - b.yearNum);
    }, [collection]);

    // Selecciona el primer item apenas llega la data, solo si todavía no hay selección.
    // (Antes esto se resolvía comparando `seriesList` con una copia en estado guardada
    // en el propio render, un patrón frágil que dispara un render extra cada vez.)
    useEffect(() => {
        if (selectedId === null && seriesList.length > 0) {
            setSelectedId(seriesList[0].id);
        }
    }, [seriesList, selectedId]);

    const selectedIndex = useMemo(() => {
        return seriesList.findIndex(item => item.id === selectedId);
    }, [seriesList, selectedId]);
    const selectedItem = seriesList[selectedIndex] ?? null;

    return (
        <div className="w-full h-full flex flex-col bg-transparent text-on-surface font-sans overflow-hidden relative p-4 md:p-6">
            {/* Ambient Background Glow */}
            {selectedItem && (
                <div
                    className="absolute top-1/2 left-0 w-[700px] h-[700px] pointer-events-none blur-[100px] z-0"
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
                className="flex-1 min-h-0 backdrop-blur-[var(--blur-overlay-xl)] rounded-[var(--radius-corner-lg)] border border-outline-variant/50 shadow-elevation-3 overflow-hidden relative z-10 flex flex-col"
                style={{ background: "color-mix(in srgb, var(--md-sys-color-surface) 50%, transparent)" }}
            >
                <main
                    className="vhs-shelf w-full h-full flex bg-transparent overflow-x-auto overflow-y-hidden no-scrollbar relative z-10 scroll-smooth"
                    role="listbox"
                    aria-orientation="horizontal"
                    aria-label="Colección de series"
                    aria-activedescendant={selectedItem ? `series-card-${selectedItem.id}` : undefined}
                    style={{ scrollSnapType: 'x proximity', scrollPadding: '0 16px' }}
                >
                    {/* Backlight Glow inside shelf */}
                    {selectedItem && (
                        <div
                            className="absolute top-1/2 left-0 w-[500px] h-[500px] pointer-events-none blur-[80px] z-0"
                            style={{
                                opacity: 0.12,
                                background: `radial-gradient(circle, ${getVhsColor(selectedItem.id)} 0%, transparent 60%)`,
                                transform: getGlowTransform(selectedIndex, seriesList.length, 250),
                                transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), background 700ms ease-out',
                            }}
                        />
                    )}

                    {isLoading && seriesList.length === 0 ? (
                        <div className="w-full h-full flex items-stretch gap-0 relative z-10 p-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-full flex flex-col gap-2 p-2 shrink-0" style={{ flex: '1 0 150px' }}>
                                    <Skeleton className="flex-1 h-auto rounded-t-lg rounded-b-none" />
                                    <Skeleton className="h-[110px] rounded-t-none" />
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
                    ) : (
                        seriesList.map((item, i) => (
                            <SeriesCard
                                key={item.id}
                                item={item}
                                isSelected={item.id === selectedId}
                                onNavigate={handleNavigate}
                                onSelect={setSelectedId}
                                entryDelayMs={i < ENTRY_STAGGER_MAX_ITEMS ? i * ENTRY_STAGGER_MS : 0}
                            />
                        ))
                    )}
                </main>
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