import { memo, useMemo, useCallback, useState } from 'react';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/components/ui/core/styling';
import { getSpineConfig } from '@/lib/helpers/goku-panorama';
import { getHighResImage } from '@/lib/helpers/images';
import { useDominantColors } from '@/hooks/use-dominant-colors';
import { useThemeSettings } from '@/lib/theme/theme-hooks';

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

const getDragonBallStars = (seriesId: string) => {
    switch (seriesId) {
        case 'dragon_ball': return 1;
        case 'dragon_ball_z': return 2;
        case 'dragon_ball_gt': return 3;
        case 'dragon_ball_super': return 4;
        case 'dragon_ball_daima': return 5;
        default: return 7;
    }
};

const DragonBallIcon = memo(function DragonBallIcon({ stars, color }: { stars: number; color: string }) {
    const starPositions: Record<number, [number, number][]> = {
        1: [[5, 5]],
        2: [[3.5, 5], [6.5, 5]],
        3: [[5, 3.5], [3.5, 6.5], [6.5, 6.5]],
        4: [[3.5, 3.5], [6.5, 3.5], [3.5, 6.5], [6.5, 6.5]],
        5: [[5, 5], [3.5, 3.5], [6.5, 3.5], [3.5, 6.5], [6.5, 6.5]],
        6: [[3.5, 3.5], [6.5, 3.5], [3.5, 5], [6.5, 5], [3.5, 6.5], [6.5, 6.5]],
        7: [[5, 5], [3.5, 3.5], [6.5, 3.5], [3.5, 5], [6.5, 5], [3.5, 6.5], [6.5, 6.5]],
    };

    const pts = starPositions[stars] || [[5, 5]];

    return (
        <svg viewBox="0 0 10 10" className="w-3 h-3 shrink-0 opacity-80" style={{ filter: 'drop-shadow(0 0.5px 1px rgba(0,0,0,0.15))' }}>
            <circle cx="5" cy="5" r="4.2" fill="#efe9db" stroke={color} strokeWidth="0.8" />
            {pts.map(([cx, cy], idx) => (
                <polygon
                    key={idx}
                    points={`${cx},${cy - 0.7} ${cx + 0.2},${cy - 0.2} ${cx + 0.7},${cy - 0.2} ${cx + 0.3},${cy + 0.1} ${cx + 0.5},${cy + 0.6} ${cx},${cy + 0.3} ${cx - 0.5},${cy + 0.6} ${cx - 0.3},${cy + 0.1} ${cx - 0.7},${cy - 0.2} ${cx - 0.2},${cy - 0.2}`}
                    fill={color}
                />
            ))}
        </svg>
    );
});

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
    const spineCfg = getSpineConfig(item.seriesId || "", item.id);
    const [isHovered, setIsHovered] = useState(false);
    const ts = useThemeSettings();
    const unwatchedCount = ts.themeShowAnimeUnwatchedCount && item.eps > 0
        ? Math.max(0, item.eps - Math.round(item.eps * (item.progress / 100)))
        : null;

    const posterSrc = useMemo(() =>
        getHighResImage(item.poster || item.img),
        [item.poster, item.img]);

    const eraGradientFrom = spineCfg?.colors?.[0] || getVhsColor(item.id);
    const characterSrc = spineCfg?.rawImg;

    const dominantColors = useDominantColors(characterSrc, 3);

    const bgGradient = useMemo(() => {
        if (!characterSrc || !dominantColors || dominantColors.length < 3) return spineCfg?.bg || 'linear-gradient(to bottom, #1e293b, #0f172a)';
        const [c1, c2, c3] = dominantColors;
        return `linear-gradient(165deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)`;
    }, [dominantColors, spineCfg?.bg]);

    const handleActivate = useCallback(() => {
        if (!isSelected) {
            onSelect(item.id);
        }
    }, [isSelected, item.id, onSelect]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            e.preventDefault();
            handleActivate();
        }
    }, [handleActivate]);

    const handleMouseEnter = useCallback(() => {
        if (typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches) {
            setIsHovered(true);
        }
    }, []);

    const handleMouseLeave = useCallback(() => setIsHovered(false), []);

    const handlePlayClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onNavigate(item.id.toString());
    }, [onNavigate, item.id]);

    return (
        <article
            id={`series-card-${item.id}`}
            role="option"
            tabIndex={0}
            aria-selected={isSelected}
            aria-label={`${item.title}, Año ${item.year}, ${item.eps} episodios, ${item.progress}% visto`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleActivate}
            onKeyDown={handleKeyDown}
            className={cn(
                "h-full flex flex-col cursor-pointer overflow-visible relative group/card border-r border-zinc-950/40 select-none shrink-0",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            )}
            style={{
                flex: isSelected ? '3 0 380px' : '1 0 150px',
                transition: 'flex 750ms cubic-bezier(0.2, 1, 0.2, 1)',
                animationDelay: `${entryDelayMs}ms`,
                contain: 'layout',
                scrollSnapAlign: 'center',
            } as React.CSSProperties}
        >
            {/* ─── VHS TAPE BODY ─── */}
            <div
                className="flex-1 min-h-0 relative overflow-hidden bg-[#0a0d16] rounded-t-lg transition-all duration-700"
                style={{
                    background: !isSelected ? bgGradient : '#0a0d16'
                }}
            >
                {/* Background poster (visible only when selected/expanded, no blur) */}
                <img
                    src={posterSrc}
                    alt={item.title}
                    loading={isSelected ? "eager" : "lazy"}
                    decoding="async"
                    className={cn(
                        "absolute inset-0 w-full h-full object-cover transition-all duration-1000",
                        isSelected
                            ? 'opacity-100 scale-100 blur-none brightness-50 will-change-transform'
                             : 'opacity-0 scale-110 blur-md pointer-events-none'
                    )}
                    style={{
                        transition: 'opacity 850ms cubic-bezier(0.16, 1, 0.3, 1), transform 1000ms cubic-bezier(0.16, 1, 0.3, 1), filter 850ms cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                />

                {/* Expanded content - clean info panel */}
                <div
                    className={cn(
                        "absolute inset-0 z-[5] flex flex-col justify-end p-5 transition-opacity duration-[600ms] ease-out",
                        isSelected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    )}
                >
                    <div className={cn(
                        "transition-all duration-[600ms] ease-bounce-spring delay-150",
                        isSelected ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"
                    )}>
                        {/* Badge */}
                        <div className={cn(
                            "flex items-center gap-2 mb-2 transition-all duration-[600ms] ease-out",
                            isSelected ? "opacity-100 translate-y-0 delay-150" : "opacity-0 translate-y-3 delay-0"
                        )}>
                            <span className="badge badge-secondary">
                                Serie
                            </span>
                            <span className="text-badge text-on-surface-variant/60">
                                {item.eps} eps
                            </span>
                            {!!unwatchedCount && (
                                <span className="badge badge-success">
                                    {unwatchedCount} sin ver
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h3 className={cn(
                            "text-lg md:text-xl font-black text-white mb-2 leading-tight tracking-tight line-clamp-2 transition-all duration-[600ms] ease-out",
                            isSelected ? "opacity-100 translate-y-0 delay-[220ms]" : "opacity-0 translate-y-3 delay-0"
                        )}>
                            {item.title}
                        </h3>

                        {/* Description - only when selected */}
                        {isSelected && (
                            <p className="text-on-surface-variant/70 text-xs leading-relaxed mb-3 font-medium line-clamp-2 delay-[300ms] transition-all duration-[600ms]">
                                {item.desc}
                            </p>
                        )}

                        {/* Progress bar */}
                        <div className={cn(
                            "flex flex-col w-full transition-all duration-[600ms] ease-out",
                            isSelected ? "opacity-100 translate-y-0 delay-[380ms]" : "opacity-0 translate-y-3 delay-0"
                        )}>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-badge text-on-surface-variant/60">
                                    Progreso
                                </span>
                                <span className="text-badge text-brand-secondary">{item.progress}%</span>
                            </div>
                            <div className="h-1 w-full bg-surface-variant rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-brand-secondary to-[#ff9d5c] rounded-full transition-all duration-1000 ease-out origin-left"
                                    style={{ width: isSelected ? `${item.progress}%` : '0%' }}
                                />
                            </div>
                        </div>

                        {/* Play button */}
                        <div className={cn(
                            "mt-3 transition-all duration-[600ms] ease-out",
                            isSelected ? "opacity-100 translate-y-0 delay-[460ms]" : "opacity-0 translate-y-3 delay-0"
                        )}>
                            <button
                                type="button"
                                onClick={handlePlayClick}
                                className="w-full bg-brand-secondary hover:brightness-110 active:scale-[0.98] text-zinc-950 rounded-lg text-button-sm py-2 transition-all duration-300 flex justify-center items-center gap-2 shadow-[0_6px_16px_hsl(var(--brand-accent)/0.3)] hover:shadow-[0_10px_24px_hsl(var(--brand-accent)/0.45)] relative overflow-hidden group/btn"
                            >
                                <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                                <Icons.media.play className="w-3.5 h-3.5 fill-current" />
                                Reproducir
                            </button>
                        </div>
                    </div>
                </div>

                {/* Character cutout - hidden when selected, visible with their specific background when retracted */}
                {characterSrc && (
                    <img
                        src={characterSrc}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className={cn(
                            "pointer-events-none absolute z-[6] select-none object-contain origin-bottom",
                            isSelected
                                ? "bottom-0 right-1/2 translate-x-1/2 translate-y-12 scale-110 opacity-0 blur-sm pointer-events-none"
                                : "bottom-0 right-1/2 translate-x-1/2 translate-y-0 h-[72%] opacity-90 scale-100 saturate-[0.95] group-hover/card:opacity-100 group-hover/card:scale-[1.06] group-hover/card:translate-y-[-6px] group-hover/card:saturate-[1.05] will-change-transform"
                        )}
                        style={{
                            maskImage: 'linear-gradient(to top, transparent 0%, black 8%)',
                            WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 8%)',
                            transition: 'opacity 750ms cubic-bezier(0.16, 1, 0.3, 1), transform 800ms cubic-bezier(0.16, 1, 0.3, 1), filter 750ms cubic-bezier(0.16, 1, 0.3, 1), saturate 750ms cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    />
                )}
            </div>

            {/* ─── VHS SPINE (Bottom portion) ─── */}
            <div
                className="relative shrink-0 bg-[#0d0d0d] flex items-center justify-center px-3 z-20 h-[110px] w-full min-w-0 select-none overflow-hidden transition-all duration-700 ease-out border-t-2"
                style={{
                    boxShadow: !isHovered && !isSelected
                        ? 'var(--shadow-glass), inset 0 2px 4px var(--glass-border-top), inset 0 -2px 4px rgba(0,0,0,0.8)'
                        : undefined
                } as React.CSSProperties}
            >
                {/* Plastic texture (estática, sin will-change) */}
                <div className="absolute inset-0 bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:3px_3px] opacity-30 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent pointer-events-none skew-x-12" />

                {/* Expanded state: VHS Reels + Label */}
                <div
                    className={cn(
                        "absolute inset-0 px-3 flex items-center justify-center py-2 z-10 transition-all duration-[550ms] ease-out",
                        isSelected ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
                    )}
                >
                   

                    {/* Center paper label (mimics the cassette face sticker) */}
                    <div 
                        className={cn(
                            "flex-1 h-[94px] relative flex flex-col rounded-md transition-all duration-700 overflow-hidden",
                            "border-2 border-zinc-400 bg-gradient-to-br from-[#efe9db] via-[#ebdcb9] to-[#d6c7a3]",
                            "shadow-[inset_1px_1px_1px_#fff,inset_-1px_-1px_1px_#9c907a,2px_4px_12px_rgba(0,0,0,0.5)] mx-auto w-[calc(100%-6px)]"
                        )}
                        style={{
                            boxShadow: isSelected 
                                ? `0 0 15px ${eraGradientFrom}90, inset 1px 1px 1px #fff, inset -1px -1px 1px #9c907a, 2px 4px 12px rgba(0,0,0,0.5)`
                                : undefined,
                        }}
                    >
                        <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:4px_4px] mix-blend-multiply pointer-events-none" />
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-10" />

                        {/* Title area */}
                        <div className="relative flex-1 text-[#1c1917] p-2.5 flex flex-col justify-center items-start overflow-hidden w-full">
                            <div className="flex items-center gap-1.5 w-full mb-1">
                                <span
                                    className="font-mono text-[9px] font-bold tracking-[0.2em] shrink-0 uppercase"
                                    style={{ color: isSelected ? eraGradientFrom : '#71717a' }}
                                >
                                    {item.year}
                                </span>
                                <DragonBallIcon stars={getDragonBallStars(item.seriesId || '')} color={isSelected ? eraGradientFrom : '#71717a'} />
                                <div className="h-[1px] flex-1 bg-black/10" />
                                {isSelected && (
                                    <span className="text-[10px] animate-pulse shrink-0" style={{ color: eraGradientFrom }}>★</span>
                                )}
                            </div>
                            <span
                                className="font-sans font-black leading-[1.1] text-left break-words w-full uppercase line-clamp-2"
                                style={{
                                    fontFamily: '"Bebas Neue", "Arial Black", sans-serif',
                                    fontSize: '17px',
                                    letterSpacing: '0.02em',
                                    color: '#1c1917'
                                }}
                            >
                                {item.title}
                            </span>
                        </div>

                        {/* Small decorative colored lines at bottom of label */}
                        <div className="h-1 w-full flex">
                            <div className="flex-1 bg-zinc-300" />
                            {item.progress > 0 && (
                                <div className="h-full bg-brand-secondary transition-all duration-705" style={{ width: `${item.progress}%` }} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Collapsed state: VHS Label */}
                <div
                    className={cn(
                        "absolute inset-0 px-3 flex items-center justify-center py-2 z-10 transition-all duration-[450ms] ease-out",
                        !isSelected ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
                    )}
                >
                    {/* VHS Label */}
                    <div 
                        className={cn(
                            "h-[94px] relative flex flex-col rounded-md transition-all duration-600 shrink-0 w-[calc(100%-6px)] mx-auto overflow-hidden",
                            "border-2 border-zinc-400 bg-gradient-to-br from-[#efe9db] via-[#ebdcb9] to-[#d6c7a3]",
                            "shadow-[inset_1px_1px_1px_#fff,inset_-1px_-1px_1px_#9c907a,2px_4px_10px_rgba(0,0,0,0.45)]"
                        )}
                        style={{
                            boxShadow: isSelected 
                                ? `0 0 15px ${eraGradientFrom}90, inset 1px 1px 1px #fff, inset -1px -1px 1px #9c907a, 2px 4px 10px rgba(0,0,0,0.45)`
                                : undefined,
                            borderColor: isSelected ? eraGradientFrom : '#71717a'
                        }}
                    >
                        <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:4px_4px] mix-blend-multiply pointer-events-none" />
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-white/15 to-transparent pointer-events-none z-10" />

                        {/* Title area */}
                        <div className="relative flex-1 text-[#1c1917] p-2.5 flex flex-col justify-center items-start overflow-hidden w-full">
                            <div className="flex items-center gap-1.5 w-full mb-1">
                                <span
                                    className="font-mono text-[9px] font-bold tracking-[0.2em] shrink-0 uppercase"
                                    style={{ color: isSelected ? eraGradientFrom : '#71717a' }}
                                >
                                    {item.year}
                                </span>
                                <DragonBallIcon stars={getDragonBallStars(item.seriesId || '')} color={isSelected ? eraGradientFrom : '#71717a'} />
                                <div className="h-[1px] flex-1 bg-black/10" />
                            </div>
                            <span
                                className="font-sans text-zinc-950 font-black leading-[1.1] text-left break-words w-full uppercase line-clamp-3"
                                style={{
                                    fontFamily: '"Bebas Neue", "Arial Black", sans-serif',
                                    fontSize: '14px',
                                    letterSpacing: '0.02em',
                                    color: '#1c1917'
                                }}
                            >
                                {item.title}
                            </span>
                        </div>

                        {/* Progress indicator at bottom of label */}
                        {item.progress > 0 && (
                            <div className="h-[3px] bg-zinc-200 w-full">
                                <div
                                    className="h-full bg-brand-secondary transition-all duration-700"
                                    style={{ width: `${item.progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
});