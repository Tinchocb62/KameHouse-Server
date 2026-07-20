import { memo, useMemo, useCallback } from 'react';
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
    const ts = useThemeSettings();
    const unwatchedCount = ts.themeShowAnimeUnwatchedCount && item.eps > 0
        ? Math.max(0, item.eps - Math.round(item.eps * (item.progress / 100)))
        : null;

    const posterSrc = useMemo(() =>
        getHighResImage(item.poster || item.img),
        [item.poster, item.img]);

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
        } else {
            onNavigate(item.id.toString());
        }
    }, [isSelected, item.id, onSelect, onNavigate]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            e.preventDefault();
            handleActivate();
        }
    }, [handleActivate]);

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
                className="flex-1 min-h-0 relative overflow-hidden bg-[#0a0d16] rounded-t-lg transition-all duration-slower"
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
                        "absolute inset-0 w-full h-full object-cover",
                        isSelected
                            ? 'opacity-100 scale-100 blur-none brightness-50 will-change-transform'
                             : 'opacity-0 scale-105 blur-md pointer-events-none'
                    )}
                    style={{
                        // Crossfade con stagger: al seleccionar el poster espera a que el
                        // personaje empiece a hundirse (150ms) y se revela con un zoom sutil
                        // (expo-out); al deseleccionar se apaga rápido para cederle el foco.
                        transition: isSelected
                            ? 'opacity 650ms cubic-bezier(0.16, 1, 0.3, 1) 150ms, transform 800ms cubic-bezier(0.16, 1, 0.3, 1) 150ms, filter 650ms cubic-bezier(0.16, 1, 0.3, 1) 150ms'
                            : 'opacity 350ms cubic-bezier(0.4, 0, 1, 1), transform 350ms cubic-bezier(0.4, 0, 1, 1), filter 350ms cubic-bezier(0.4, 0, 1, 1)'
                    }}
                />

                {/* Expanded content - clean info panel */}
                <div
                    className={cn(
                        "absolute inset-0 z-[5] flex flex-col justify-end p-5 transition-opacity duration-slower ease-out",
                        isSelected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    )}
                >
                    {/* Scrim de legibilidad sobre el poster (misma receta que media-spotlight) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                    <div className={cn(
                        "relative transition-all duration-slower ease-bounce-spring delay-150",
                        isSelected ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"
                    )}>
                        {/* Badge */}
                        <div className={cn(
                            "flex items-center gap-2 mb-2 transition-all duration-slower ease-out",
                            isSelected ? "opacity-100 translate-y-0 delay-150" : "opacity-0 translate-y-3 delay-0"
                        )}>
                            <span className="badge badge-secondary">
                                Serie
                            </span>
                            {item.eps > 0 && (
                                <span className="text-badge text-on-surface-variant">
                                    {item.eps} eps
                                </span>
                            )}
                            {!!unwatchedCount && (
                                <span className="badge badge-success">
                                    {unwatchedCount} sin ver
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h3 className={cn(
                            "text-lg md:text-xl font-black text-on-surface mb-2 leading-tight tracking-tight line-clamp-2 transition-all duration-slower ease-out",
                            isSelected ? "opacity-100 translate-y-0 delay-200" : "opacity-0 translate-y-3 delay-0"
                        )}>
                            {item.title}
                        </h3>

                        {/* Description - only when selected; se oculta en ventanas bajas para que el panel no desborde el alto de la card */}
                        {isSelected && (
                            <p className="text-on-surface-variant/70 text-xs leading-relaxed mb-3 font-medium line-clamp-2 delay-300 transition-all duration-slower [@media(max-height:640px)]:hidden">
                                {item.desc}
                            </p>
                        )}

                        {/* Progress bar */}
                        <div className={cn(
                            "flex flex-col w-full transition-all duration-slower ease-out",
                            isSelected ? "opacity-100 translate-y-0 delay-500" : "opacity-0 translate-y-3 delay-0"
                        )}>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-badge text-on-surface-variant">
                                    Progreso
                                </span>
                                <span className="text-badge text-brand-secondary">{item.progress}%</span>
                            </div>
                            <div className="h-1 w-full bg-surface-variant rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-brand-secondary to-[var(--brand-secondary-light)] rounded-full transition-all duration-slower ease-out origin-left"
                                    style={{ width: isSelected ? `${item.progress}%` : '0%' }}
                                />
                            </div>
                        </div>

                        {/* Play button */}
                        <div className={cn(
                            "mt-3 transition-all duration-slower ease-out",
                            isSelected ? "opacity-100 translate-y-0 delay-700" : "opacity-0 translate-y-3 delay-0"
                        )}>
                            <button
                                type="button"
                                onClick={handlePlayClick}
                                className="w-full bg-brand-secondary hover:brightness-110 active:scale-[0.98] text-on-secondary rounded-lg text-button-sm py-2 transition-all duration-base flex justify-center items-center gap-2 shadow-[0_6px_16px_hsl(var(--brand-accent)/0.3)] hover:shadow-[0_10px_24px_hsl(var(--brand-accent)/0.45)] relative overflow-hidden group/btn"
                            >
                                <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-slower ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
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
                            // z-[3]: debajo del panel de texto (z-5) para que al seleccionar el
                            // personaje salga POR DETRÁS del contenido, no flotando sobre él.
                            "pointer-events-none absolute z-[3] select-none object-contain origin-bottom bottom-0 right-1/2 translate-x-1/2 h-[72%]",
                            isSelected
                                ? "translate-y-6 scale-90 opacity-0"
                                : "translate-y-0 opacity-90 scale-100 saturate-[0.95] group-hover/card:opacity-100 group-hover/card:scale-[1.06] group-hover/card:translate-y-[-6px] group-hover/card:saturate-[1.05] will-change-transform"
                        )}
                        style={{
                            maskImage: 'linear-gradient(to top, transparent 0%, black 8%)',
                            WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 8%)',
                            // Al seleccionar: se hunde y encoge rápido (ease-in) mientras el poster
                            // se revela detrás. Al deseleccionar: re-entra con un rebote sutil
                            // (back-out) y la opacidad entra apenas después, así aparece "en
                            // movimiento" sin demorar el hover.
                            transition: isSelected
                                ? 'opacity 260ms cubic-bezier(0.4, 0, 1, 1), transform 340ms cubic-bezier(0.4, 0, 1, 1)'
                                : 'opacity 450ms cubic-bezier(0.2, 1, 0.2, 1) 120ms, transform 650ms cubic-bezier(0.34, 1.4, 0.64, 1)'
                        }}
                    />
                )}
            </div>
        </article>
    );
});