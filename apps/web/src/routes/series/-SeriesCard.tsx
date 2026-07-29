import { memo, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/components/ui/core/styling';
import { getSpineConfig } from '@/lib/helpers/goku-panorama';
import { getHighResImage, getMediumResImage } from '@/lib/helpers/images';
import { useDominantColors } from '@/hooks/use-dominant-colors';
import { useThemeSettings } from '@/lib/theme/theme-hooks';
import { API_ENDPOINTS } from '@/api/generated/endpoints';
import { fetchAnimeEntry } from '@/api/hooks/anime_entries.hooks';

export interface SeriesItem {
    id: number;
    title: string;
    eps: number;
    year: string | number;
    progress: number;
    img: string;
    poster: string;
    desc: string;
    seriesId?: string;
}

export const getVhsColor = (id: number) => {
    const colors = ['#d96c14', '#b51f1f', '#2980b9', '#1a5c2e', '#1a4a8a', '#8e44ad', '#0e6655'];
    return colors[id % colors.length];
};

/**
 * Carrete de VHS (reel) — extraído porque estaba duplicado 1:1 dos veces
 * dentro del spine expandido.
 */


export const SeriesCard = memo(function SeriesCard({
    item,
    isSelected,
    onNavigate,
    onSelect,
    entryDelayMs = 0,
}: {
    item: SeriesItem;
    isSelected: boolean;
    onNavigate: (id: string) => void;
    onSelect: (id: number) => void;
    /** Delay del stagger de entrada, en ms. Reemplaza el hack de nth-child limitado a 16 cards. */
    entryDelayMs?: number;
}) {
    const queryClient = useQueryClient();
    const spineCfg = getSpineConfig(item.seriesId || "", item.id);
    const ts = useThemeSettings();
    const unwatchedCount = ts.themeShowAnimeUnwatchedCount && item.eps > 0
        ? Math.max(0, item.eps - Math.round(item.eps * (item.progress / 100)))
        : null;

    const posterSrc = useMemo(() =>
        getMediumResImage(item.poster || item.img),
        [item.poster, item.img]);

    const characterSrc = spineCfg?.rawImg;

    const dominantColors = useDominantColors(characterSrc, 3);

    const bgGradient = useMemo(() => {
        if (!characterSrc || !dominantColors || dominantColors.length < 3) return spineCfg?.bg || 'linear-gradient(to bottom, #1e293b, #0f172a)';
        const [c1, c2, c3] = dominantColors;
        return `linear-gradient(165deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)`;
    }, [dominantColors, spineCfg?.bg]);

    const handlePrefetch = useCallback(() => {
        const sId = item.id.toString();
        queryClient.prefetchQuery({
            queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key, sId],
            queryFn: () => fetchAnimeEntry(sId),
            staleTime: 60000,
        });
    }, [queryClient, item.id]);

    const handleActivate = useCallback(() => {
        handlePrefetch();
        if (!isSelected) {
            onSelect(item.id);
        } else {
            onNavigate(item.id.toString());
        }
    }, [isSelected, item.id, onSelect, onNavigate, handlePrefetch]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            e.preventDefault();
            handleActivate();
        }
    }, [handleActivate]);

    const handlePlayClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        handlePrefetch();
        onNavigate(item.id.toString());
    }, [onNavigate, item.id, handlePrefetch]);

    return (
        <article
            id={`series-card-${item.id}`}
            role="option"
            tabIndex={0}
            aria-selected={isSelected}
            aria-label={`${item.title}, Año ${item.year}, ${item.eps} episodios, ${item.progress}% visto`}
            onClick={handleActivate}
            onKeyDown={handleKeyDown}
            onMouseEnter={handlePrefetch}
            onFocus={handlePrefetch}
            className={cn(
                "h-full flex flex-col cursor-pointer overflow-hidden relative group/card border-r border-zinc-950/40 select-none shrink-0 transform-gpu",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            )}
            style={{
                flex: isSelected ? '3 0 380px' : '1 0 150px',
                transition: 'flex-grow 600ms cubic-bezier(0.16, 1, 0.3, 1), flex-basis 600ms cubic-bezier(0.16, 1, 0.3, 1)',
                animationDelay: `${entryDelayMs}ms`,
                contain: 'layout paint',
                scrollSnapAlign: 'center',
                willChange: 'flex-grow, flex-basis',
            } as React.CSSProperties}
        >
            {/* ─── VHS TAPE BODY ─── */}
            <div
                className="flex-1 min-h-0 relative overflow-hidden rounded-t-xl transition-colors duration-500 border-t border-x border-white/10 shadow-lg"
                style={{
                    background: !isSelected ? bgGradient : '#090b11'
                }}
            >
                {/* Upper Action/Manga Pose Layer (Top half wallpaper effect when unselected) */}
                {!isSelected && (
                    <div className="absolute top-0 inset-x-0 h-[55%] overflow-hidden pointer-events-none z-[1] opacity-35 mix-blend-overlay transition-opacity duration-300 group-hover/card:opacity-55 transform-gpu">
                        <img
                            src={posterSrc}
                            alt=""
                            className="w-full h-full object-cover object-top scale-110 grayscale brightness-125 contrast-150 transform-gpu"
                            style={{
                                maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
                            }}
                        />
                    </div>
                )}

                {/* Vertical Spine Title (When unselected) */}
                {!isSelected && (
                    <div className="absolute top-6 inset-x-0 z-[4] flex justify-center pointer-events-none transition-opacity duration-300 opacity-85 group-hover/card:opacity-100">
                        <span className="[writing-mode:vertical-lr] text-[11px] font-black tracking-[0.28em] uppercase text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] font-display select-none">
                            {spineCfg?.subtitle || item.title}
                        </span>
                    </div>
                )}

                {/* Background poster (visible only when selected/expanded) */}
                <img
                    src={posterSrc}
                    alt={item.title}
                    loading={isSelected ? "eager" : "lazy"}
                    decoding="async"
                    className={cn(
                        "absolute inset-0 w-full h-full object-cover transform-gpu",
                        isSelected
                            ? 'opacity-100 scale-100 brightness-[0.45] will-change-transform'
                             : 'opacity-0 scale-105 pointer-events-none'
                    )}
                    style={{
                        transition: isSelected
                            ? 'opacity 500ms cubic-bezier(0.16, 1, 0.3, 1) 100ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) 100ms'
                            : 'opacity 300ms cubic-bezier(0.4, 0, 1, 1), transform 300ms cubic-bezier(0.4, 0, 1, 1)'
                    }}
                />

                {/* Expanded content - glassmorphic info panel */}
                <div
                    className={cn(
                        "absolute inset-0 z-[5] flex flex-col justify-end p-4 md:p-5 transition-opacity duration-300 ease-out",
                        isSelected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    )}
                >
                    {/* Soft gradient scrim */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

                    {/* Glass card container */}
                    <div className={cn(
                        "relative p-4 md:p-5 rounded-2xl bg-zinc-950/80 backdrop-blur-xl border border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.8)] transition-[opacity,transform] duration-500 ease-out delay-100 space-y-2.5 transform-gpu",
                        isSelected ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"
                    )}>
                        {/* Badges */}
                        <div className={cn(
                            "flex flex-wrap items-center gap-1.5 transition-[opacity,transform] duration-400 ease-out",
                            isSelected ? "opacity-100 translate-y-0 delay-150" : "opacity-0 translate-y-2 delay-0"
                        )}>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-sm">
                                Serie
                            </span>
                            {item.eps > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white/80 bg-black/40 backdrop-blur-md border border-white/10">
                                    {item.eps} eps
                                </span>
                            )}
                            {!!unwatchedCount && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-emerald-400 bg-emerald-950/60 backdrop-blur-md border border-emerald-500/30">
                                    {unwatchedCount} sin ver
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h3 className={cn(
                            "text-xl md:text-2xl font-black text-white leading-tight tracking-tight line-clamp-2 transition-[opacity,transform] duration-400 ease-out drop-shadow-md",
                            isSelected ? "opacity-100 translate-y-0 delay-200" : "opacity-0 translate-y-2 delay-0"
                        )}>
                            {item.title}
                        </h3>

                        {/* Description */}
                        {isSelected && (
                            <p className="text-white/75 text-xs leading-relaxed font-medium line-clamp-2 delay-250 transition-opacity duration-300 [@media(max-height:640px)]:hidden">
                                {item.desc}
                            </p>
                        )}

                        {/* Progress bar */}
                        <div className={cn(
                            "flex flex-col w-full transition-[opacity,transform] duration-400 ease-out pt-1",
                            isSelected ? "opacity-100 translate-y-0 delay-300" : "opacity-0 translate-y-2 delay-0"
                        )}>
                            <div className="flex justify-between items-end mb-1 text-[11px] font-semibold">
                                <span className="text-white/70 uppercase tracking-wider">
                                    Progreso
                                </span>
                                <span className="text-amber-400 font-extrabold">{item.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 rounded-full transition-[width] duration-700 ease-out origin-left shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                                    style={{ width: isSelected ? `${item.progress}%` : '0%' }}
                                />
                            </div>
                        </div>

                        {/* Play CTA button */}
                        <div className={cn(
                            "pt-2 transition-[opacity,transform] duration-400 ease-out",
                            isSelected ? "opacity-100 translate-y-0 delay-350" : "opacity-0 translate-y-2 delay-0"
                        )}>
                            <button
                                type="button"
                                onClick={handlePlayClick}
                                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:via-orange-400 hover:to-red-500 active:scale-[0.98] text-white font-extrabold uppercase tracking-wider rounded-xl text-xs py-2.5 transition-all duration-200 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_28px_rgba(245,158,11,0.65)] relative overflow-hidden group/btn"
                            >
                                <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />
                                <Icons.media.play className="w-4 h-4 fill-current drop-shadow-sm" />
                                Reproducir
                            </button>
                        </div>
                    </div>
                </div>

                {/* Character cutout - standing pose at bottom of column */}
                {characterSrc && (
                    <img
                        src={characterSrc}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className={cn(
                            "pointer-events-none absolute z-[3] select-none object-contain origin-bottom bottom-0 right-1/2 translate-x-1/2 h-[66%] transform-gpu will-change-transform",
                            isSelected
                                ? "translate-y-6 scale-90 opacity-0 pointer-events-none"
                                : "translate-y-0 opacity-95 scale-100 saturate-[1.05] group-hover/card:opacity-100 group-hover/card:scale-[1.08] group-hover/card:translate-y-[-6px] group-hover/card:saturate-[1.15] group-hover/card:drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]"
                        )}
                        style={{
                            maskImage: 'linear-gradient(to top, transparent 0%, black 8%)',
                            WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 8%)',
                            transition: isSelected
                                ? 'opacity 200ms ease-in, transform 300ms ease-in'
                                : 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1) 50ms, transform 500ms cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    />
                )}
            </div>
        </article>
    );
});