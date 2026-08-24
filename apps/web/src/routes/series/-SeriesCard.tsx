import { memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/components/ui/core/styling';
import { getSpineConfig } from '@/lib/helpers/goku-panorama';
import { getMediumResImage } from '@/lib/helpers/images';
import { DRAGON_BALL_SERIES_INFO } from '@/lib/helpers/series';
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

export const SeriesCard = memo(function SeriesCard({
    item,
    isSelected,
    showUnwatchedCount = true,
    onNavigate,
    onSelect,
    entryDelayMs = 0,
}: {
    item: SeriesItem;
    isSelected: boolean;
    showUnwatchedCount?: boolean;
    onNavigate: (id: string) => void;
    onSelect: (id: number) => void;
    entryDelayMs?: number;
}) {
    const queryClient = useQueryClient();
    const spineCfg = getSpineConfig(item.seriesId || "", item.id, item.title);
    const unwatchedCount = showUnwatchedCount && item.eps > 0
        ? Math.max(0, item.eps - Math.round(item.eps * (item.progress / 100)))
        : null;

    const canonicalInfo = item.seriesId ? DRAGON_BALL_SERIES_INFO[item.seriesId] : undefined;
    const fallbackPoster = canonicalInfo?.poster || canonicalInfo?.banner || '/sagas/original/busqueda-esferas.webp';

    const rawPoster = item.poster || item.img || fallbackPoster;
    const posterSrc = useMemo(() =>
        getMediumResImage(rawPoster) || fallbackPoster,
        [rawPoster, fallbackPoster]);

    const bgGradient = spineCfg?.bg || 'linear-gradient(to bottom, #1e293b, #0f172a)';

    const handlePrefetch = useCallback(() => {
        const sId = item.id.toString();
        queryClient.prefetchQuery({
            queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key, sId],
            queryFn: () => fetchAnimeEntry(sId),
            staleTime: 60000,
        });
    }, [queryClient, item.id]);

    const handleActivate = useCallback(() => {
        if (!isSelected) {
            onSelect(item.id);
        } else {
            handlePrefetch();
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

    const watchedCount = Math.round((item.progress / 100) * (item.eps || 0));

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
                "h-full flex flex-col cursor-pointer overflow-hidden relative group/card select-none shrink-0 transform-gpu",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70",
                !isSelected && "hover:z-20"
            )}
            style={{
                flex: isSelected ? '3.5 0 540px' : '1 0 130px',
                maxWidth: isSelected ? '640px' : '160px',
                minWidth: isSelected ? '460px' : '110px',
                transition: 'flex 320ms cubic-bezier(0.2, 0.8, 0.2, 1), max-width 320ms cubic-bezier(0.2, 0.8, 0.2, 1), min-width 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                animationDelay: `${entryDelayMs}ms`,
                scrollSnapAlign: 'center',
                contain: 'layout style',
                willChange: 'flex, max-width',
            } as React.CSSProperties}
        >
            {/* ─── CARD CONTAINER ─── */}
            <div
                className={cn(
                    "flex-1 min-h-0 relative overflow-hidden transform-gpu transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                    isSelected
                        ? "rounded-2xl border border-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
                        : "rounded-t-xl border-t border-x border-white/15 shadow-sm hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.65)] hover:border-amber-400/40"
                )}
                style={{
                    background: !isSelected ? bgGradient : 'transparent'
                }}
            >
                <AnimatePresence mode="popLayout" initial={false}>
                    {/* ═══════════════════════════════════════════════════════════════════════════
                        COLLAPSED STATE: GOKU EVOLUTION MANGA SPINE PANORAMA - 120 FPS
                       ═══════════════════════════════════════════════════════════════════════════ */}
                    {!isSelected ? (
                        <motion.div
                            key="spine"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.94, filter: 'blur(3px)' }}
                            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                            className="absolute inset-0 flex flex-col justify-between overflow-hidden"
                        >
                            {/* Background clean gradient fallback with celestial radial lighting */}
                            <div className="absolute inset-0 w-full h-full" style={{ background: bgGradient }} />
                            <div
                                className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
                                style={{
                                    background: 'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.45) 0%, transparent 60%), radial-gradient(circle at 50% 85%, rgba(3, 105, 161, 0.5) 0%, transparent 70%)'
                                }}
                            />

                            {/* Dynamic Layered Character Composition (Top & Bottom Images) */}
                            {spineCfg?.expandedTopImg && spineCfg?.expandedBottomImg ? (
                                <div className="absolute inset-0 w-full h-full pointer-events-none z-[1] overflow-hidden">
                                    {/* Imagen Superior: Goku Puño / Acción */}
                                    <div className="absolute inset-x-0 top-7 h-[36%] flex items-start justify-center p-1">
                                        <img
                                            src={spineCfg.expandedTopImg}
                                            alt=""
                                            loading="eager"
                                            decoding="async"
                                            className="max-h-full w-auto object-contain object-top select-none drop-shadow-[0_4px_14px_rgba(0,0,0,0.6)] transition-transform duration-500 ease-out group-hover/card:scale-105"
                                        />
                                    </div>

                                    {/* Imagen Inferior: Goku Niño Base */}
                                    <div className="absolute inset-x-0 bottom-10 h-[38%] flex items-end justify-center p-1">
                                        <img
                                            src={spineCfg.expandedBottomImg}
                                            alt=""
                                            loading="eager"
                                            decoding="async"
                                            className="max-h-full w-auto object-contain object-bottom select-none drop-shadow-[0_4px_14px_rgba(0,0,0,0.6)] transition-transform duration-500 ease-out group-hover/card:scale-105"
                                        />
                                    </div>
                                </div>
                            ) : spineCfg?.sliceImg ? (
                                /* Full-Height Seamless Spine Panorama Illustration */
                                <div className="absolute inset-0 w-full h-full pointer-events-none z-[1] overflow-hidden">
                                    <img
                                        src={spineCfg.sliceImg}
                                        alt=""
                                        loading="eager"
                                        decoding="async"
                                        className="w-full h-full object-cover object-center select-none transition-transform duration-500 ease-out group-hover/card:scale-105"
                                    />
                                </div>
                            ) : (
                                /* Fallback composition for Daima / custom series */
                                <div className="absolute inset-0 w-full h-full pointer-events-none z-[1] overflow-hidden">
                                    {spineCfg?.baseImg && (
                                        <div className="absolute inset-x-0 bottom-4 top-1/4 flex items-end justify-center">
                                            <img
                                                src={spineCfg.baseImg}
                                                alt=""
                                                loading="eager"
                                                decoding="async"
                                                className="max-h-[85%] w-auto object-contain object-bottom select-none transition-transform duration-500 ease-out group-hover/card:scale-105"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 3D Physical Spine Bevel & Lighting Overlay */}
                            <div
                                className="absolute inset-0 pointer-events-none z-[4] transition-opacity duration-300 group-hover/card:opacity-80"
                                style={{
                                    boxShadow: 'inset 2px 0 4px rgba(255,255,255,0.22), inset -3px 0 6px rgba(0,0,0,0.6)'
                                }}
                            />

                            {/* Top Gradient Scrim */}
                            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none z-[2]" />

                            {/* ── TOP SECTION: VOLUME & KANJI BADGE ── */}
                            <div className="relative z-[5] pt-2 px-1.5 flex items-center justify-between pointer-events-none">
                                <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-mono font-black tracking-wider uppercase bg-black/85 border border-white/20 text-amber-400 shadow-sm transition-transform duration-300 group-hover/card:scale-105">
                                    ★ VOL. {spineCfg?.vol || '01'}
                                </span>
                                {spineCfg?.kanji && (
                                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-black/85 border border-amber-400/60 text-amber-300 shadow-sm transition-transform duration-300 group-hover/card:scale-105">
                                        {spineCfg.kanji}
                                    </span>
                                )}
                            </div>

                            {/* Center Dark Band behind vertical title */}
                            <div className="absolute inset-x-0 top-1/3 bottom-1/3 bg-gradient-to-b from-transparent via-black/50 to-transparent pointer-events-none z-[2]" />

                            {/* ── CENTER SPINE TITLE (VERTICAL) ── */}
                            <div className="relative z-[5] flex-1 flex items-center justify-center pointer-events-none my-1">
                                <div className="px-1.5 py-2 rounded-lg bg-black/60 border border-white/15 shadow-md transition-all duration-300 group-hover/card:border-amber-400/40 group-hover/card:bg-black/75">
                                    <span className="[writing-mode:vertical-lr] text-[11px] md:text-[12px] font-black tracking-[0.3em] uppercase text-white group-hover/card:text-amber-100 font-display select-none transition-colors duration-300">
                                        {spineCfg?.subtitle !== "SERIE" ? spineCfg.subtitle : item.title}
                                    </span>
                                </div>
                            </div>

                            {/* Bottom Gradient Scrim */}
                            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-[2]" />

                            {/* ── BOTTOM INFO: EPISODES, YEAR & PROGRESS BAR ── */}
                            <div className="relative z-[5] p-2 flex flex-col items-center gap-1 pointer-events-none">
                                <div className="flex items-center gap-1">
                                    {item.eps > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-mono font-bold text-white/90 bg-black/85 border border-white/15 shadow-sm">
                                            {item.eps} EPS
                                        </span>
                                    )}
                                    {(item.year && item.year !== 'N/A' || spineCfg?.eraYears) && (
                                        <span className="px-1.5 py-0.5 rounded-full text-[7.5px] font-mono font-bold text-amber-300/90 bg-black/85 border border-amber-400/20 shadow-sm">
                                            {item.year || spineCfg?.eraYears}
                                        </span>
                                    )}
                                </div>
                                {item.progress > 0 && (
                                    <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden p-[1px] border border-white/15 mt-0.5">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-[width] duration-500 ease-out"
                                            style={{ width: `${item.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        /* ═══════════════════════════════════════════════════════════════════════════
                            EXPANDED STATE: 2-COLUMN SHOWCASE WITH HIGH-RES CARÁTULA & FONDO DIFUMINADO
                           ═══════════════════════════════════════════════════════════════════════════ */
                        <motion.div
                            key="showcase"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
                            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                            className="absolute inset-0 flex flex-col justify-between overflow-hidden transform-gpu"
                        >
                            {/* ── AMBIENT BACKDROP (FONDO CELESTE DINÁMICO & CAPAS ILUSTRADAS) ── */}
                            <motion.div
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="absolute inset-0 pointer-events-none overflow-hidden z-0"
                                style={{
                                    background: spineCfg?.bg || 'linear-gradient(to bottom, #1e293b, #0f172a)'
                                }}
                            >
                                {/* Destellos ambientales de cielo celeste y ki */}
                                <div
                                    className="absolute inset-0 w-full h-full opacity-60"
                                    style={{
                                        background: 'radial-gradient(ellipse at 80% 20%, rgba(56, 189, 248, 0.45) 0%, transparent 60%), radial-gradient(ellipse at 20% 85%, rgba(3, 105, 161, 0.5) 0%, transparent 70%)'
                                    }}
                                />

                                {/* Poster como capa de profundidad atmosférica difuminada */}
                                <img
                                    src={posterSrc}
                                    alt=""
                                    aria-hidden="true"
                                    className="w-full h-full object-cover object-center opacity-30 scale-110 blur-lg transform-gpu mix-blend-overlay"
                                    onError={(e) => {
                                        if (fallbackPoster && e.currentTarget.src !== fallbackPoster) {
                                            e.currentTarget.src = fallbackPoster;
                                        }
                                    }}
                                />

                                {/* ── CAPA SUPERIOR: ILUSTRACIÓN GOKU ACCIÓN / VOLANDO ── */}
                                {spineCfg?.expandedTopImg && (
                                    <div className="absolute -top-6 -right-6 w-60 sm:w-72 md:w-80 h-60 sm:h-72 md:h-80 pointer-events-none opacity-45 overflow-hidden transform-gpu select-none">
                                        <img
                                            src={spineCfg.expandedTopImg}
                                            alt=""
                                            aria-hidden="true"
                                            className="w-full h-full object-contain object-top-right filter drop-shadow-[0_4px_24px_rgba(56,189,248,0.45)]"
                                        />
                                    </div>
                                )}

                                {/* ── CAPA INFERIOR: ILUSTRACIÓN GOKU NIÑO BASE ── */}
                                {spineCfg?.expandedBottomImg && (
                                    <div className="absolute -bottom-4 right-12 sm:right-20 md:right-28 w-44 sm:w-52 md:w-60 h-44 sm:h-52 md:h-60 pointer-events-none opacity-50 overflow-hidden transform-gpu select-none">
                                        <img
                                            src={spineCfg.expandedBottomImg}
                                            alt=""
                                            aria-hidden="true"
                                            className="w-full h-full object-contain object-bottom filter drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                                        />
                                    </div>
                                )}

                                {/* Overlay glassmórfico de contraste moderado */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-black/50 backdrop-blur-[1.5px]" />
                            </motion.div>

                            {/* 2-Column Main Showcase Container */}
                            <div className="relative z-10 flex flex-row items-stretch gap-4 md:gap-6 p-4 md:p-6 w-full h-full">
                                
                                {/* ── LEFT COLUMN: CARÁTULA OFICIAL (FULL POSTER SHOWCASE) ── */}
                                <motion.div
                                    initial={{ opacity: 0, x: -16, scale: 0.94 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    transition={{ duration: 0.35, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                                    className="w-[140px] sm:w-[170px] md:w-[200px] shrink-0 h-full flex flex-col justify-center"
                                >
                                    <div
                                        className="w-full aspect-[2/3] relative rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg bg-zinc-900 group/poster cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-amber-400/80 hover:shadow-[0_8px_24px_rgba(245,158,11,0.2)] transform-gpu"
                                        onClick={handlePlayClick}
                                        title="Hacé clic para ver los episodios"
                                    >
                                        <img
                                            src={posterSrc}
                                            alt={item.title}
                                            loading="eager"
                                            decoding="async"
                                            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/poster:scale-105"
                                            onError={(e) => {
                                                if (fallbackPoster && e.currentTarget.src !== fallbackPoster) {
                                                    e.currentTarget.src = fallbackPoster;
                                                }
                                            }}
                                        />

                                        {/* Glossy Sheen Corner Reflection */}
                                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/20 via-transparent to-transparent" />

                                        {/* Top Unwatched / Status Badge */}
                                        {!!unwatchedCount && (
                                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-950/90 border border-emerald-400/50 text-emerald-300 shadow-md">
                                                {unwatchedCount} sin ver
                                            </div>
                                        )}

                                        {/* Format Badge (Bottom-left of poster) */}
                                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/90 border border-white/20 text-white shadow-sm">
                                            FHD
                                        </div>
                                    </div>
                                </motion.div>

                                {/* ── RIGHT COLUMN: SERIES DETAILS & ACTIONS ── */}
                                <motion.div
                                    initial={{ opacity: 0, x: 14 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.35, delay: 0.08, ease: [0.2, 0.8, 0.2, 1] }}
                                    className="flex-1 min-w-[240px] flex flex-col justify-center h-full py-1 space-y-4"
                                >
                                    {/* Header Details */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
                                        className="space-y-2.5 flex flex-col items-center text-center"
                                    >
                                        {/* Eyebrow: Kanji + Volume + Era */}
                                        <div className="flex items-center justify-center gap-2 select-none">
                                            {spineCfg?.kanji && (
                                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-sm shrink-0">
                                                    {spineCfg.kanji}
                                                </span>
                                            )}
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black tracking-wider uppercase bg-amber-500/15 border border-amber-400/40 text-amber-300 shadow-sm shrink-0">
                                                ★ VOL. {spineCfg?.vol || '01'}
                                            </span>
                                            {(item.year && item.year !== 'N/A' || spineCfg?.eraYears) && (
                                                <span className="text-[11px] font-mono font-semibold tracking-wider text-white/50">
                                                    {spineCfg?.eraYears || item.year}
                                                </span>
                                            )}
                                        </div>

                                        {/* Series Title */}
                                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-none tracking-tight font-display drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] line-clamp-2 text-center">
                                            {item.title}
                                        </h2>

                                        {/* Meta badges: Episodes & Type */}
                                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
                                            {item.eps > 0 && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-white/90 bg-white/10 border border-white/15 shadow-sm">
                                                    {item.eps} eps
                                                </span>
                                            )}
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/5 border border-white/10 text-white/70 shadow-sm">
                                                Serie TV
                                            </span>
                                        </div>

                                        {/* Synopsis / Description */}
                                        <p className="text-white/80 text-xs sm:text-[13px] leading-relaxed font-normal line-clamp-3 md:line-clamp-4 pt-1 text-center">
                                            {item.desc}
                                        </p>
                                    </motion.div>

                                    {/* Bottom Tracker & Action Buttons */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
                                        className="space-y-3 pt-1"
                                    >
                                        {/* Progress Tracker */}
                                        <div className="flex flex-col w-full space-y-1.5">
                                            <div className="flex justify-between items-center text-[11px] font-medium">
                                                <span className="text-white/80 uppercase tracking-wider font-mono text-[10px]">
                                                    {item.progress > 0 ? `Visto: ${watchedCount} de ${item.eps} eps` : 'Sin comenzar'}
                                                </span>
                                                <span className="text-amber-400 font-extrabold font-mono">{item.progress}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden p-[1px] border border-white/20 shadow-inner">
                                                <div
                                                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 rounded-full transition-[width] duration-500 ease-out origin-left"
                                                    style={{ width: `${item.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Action Buttons Row */}
                                        <div className="flex items-center gap-2.5 pt-1">
                                            {/* Primary: Ver Serie / Episodios */}
                                            <button
                                                type="button"
                                                onClick={handlePlayClick}
                                                className="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:via-orange-400 hover:to-red-500 active:scale-[0.98] text-white font-black uppercase tracking-wider rounded-xl text-xs py-3 px-4 transition-all duration-200 flex justify-center items-center gap-2 shadow-md hover:shadow-lg relative overflow-hidden group/btn"
                                            >
                                                <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />
                                                <Icons.media.play className="w-4 h-4 fill-current shrink-0" />
                                                <span>Ver Serie</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </article>
    );
});