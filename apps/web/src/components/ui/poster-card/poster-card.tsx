import { cn } from "@/components/ui/core/styling";
import * as React from "react";
import { Icons } from "@/components/ui/icons";
import { getMediumResImage } from "@/lib/helpers/images";
import { DeferredImage } from "@/components/shared/deferred-image";

import { Badge } from "@/components/ui/badge";
import { useGetSettings } from "@/api/hooks/settings.hooks";

export type PosterAspect = "poster" | "landscape" | "square" | "ultrawide";
export type PosterSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface PosterCardProps {
  artwork: string;
  title: string;
  subtitle?: string;
  badge?: string;
  mediaTypeBadge?: string;
  availabilityType?: "FULL_LOCAL" | "HYBRID" | "ONLY_ONLINE";
  description?: string;
  aspect?: PosterAspect;
  progress?: number;
  year?: string | number;
  rating?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  seasonNumber?: number;
  onClick?: () => void;
  onHover?: () => void;
  onPopupOpenChange?: (isOpen: boolean) => void;
  className?: string;
  layoutId?: string;
  variant?: "default" | "continue-watching" | "featured" | "compact";
  showQuickActions?: boolean;
  isSelected?: boolean;
}

const aspectClasses: Record<PosterAspect, string> = {
  poster: "aspect-[2/3]",
  landscape: "aspect-[16/9]",
  square: "aspect-square",
  ultrawide: "aspect-[21/9]",
};

const sizeClasses: Record<PosterSize, string> = {
  xs: "w-[100px]",
  sm: "w-[140px]",
  md: "w-[180px]",
  lg: "w-[220px]",
  xl: "w-[280px]",
};

const variantStyles = {
  default: "",
  "continue-watching": "relative",
  featured: "relative",
  compact: "",
};

export const PosterCard = React.memo(function PosterCard({
  artwork,
  title,
  subtitle,
  badge,
  mediaTypeBadge,
  availabilityType,
  description,
  aspect = "poster",
  progress,
  year,
  rating,
  episodeNumber,
  episodeTitle,
  onClick,
  onHover,
  onPopupOpenChange,
  className,
  layoutId,
  variant = "default",
  showQuickActions = true,
  isSelected = false,
}: PosterCardProps) {
  const isPoster = aspect === "poster";
  const { data: serverSettings } = useGetSettings();
  const hideAudienceScore = !!serverSettings?.Platform?.hideAudienceScore;
  const [isHovered, setIsHovered] = React.useState(false);
  const [showPopup, setShowPopup] = React.useState(false);
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = React.useCallback(() => {
    setIsHovered(true);
    onHover?.();
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setShowPopup(true);
      onPopupOpenChange?.(true);
    }, 300);
  }, [onHover, onPopupOpenChange]);

  const handleMouseLeave = React.useCallback(() => {
    setIsHovered(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowPopup(false);
    onPopupOpenChange?.(false);
  }, [onPopupOpenChange]);

  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const cleanDesc = React.useMemo(
    () => description?.replace(/<[^>]*>/g, "") ?? "",
    [description]
  );

  const vibes = React.useMemo(() => {
    if (!subtitle) return [];
    const keywords = ["EPIC", "CHILL", "EMOTIONAL", "HYPE", "INTENSE", "ÉPICO", "ESENCIAL", "LOCAL", "RELLENO", "ESPECIAL"];
    return subtitle
      .split("·")
      .map((s) => s.trim())
      .filter((s) => keywords.includes(s.toUpperCase()));
  }, [subtitle]);

  const sizeClass = sizeClasses.md;
  const aspectClass = aspectClasses[aspect];
  const variantClass = variantStyles[variant];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={cn(
        "relative shrink-0 select-none group",
        aspectClass,
        sizeClass,
        variantClass,
        className
      )}
      style={{ viewTransitionName: layoutId ? `poster-${layoutId}` : undefined }}
    >
      <div
        className={cn(
          "absolute inset-0 overflow-hidden flex flex-col origin-top",
          "transition-all duration-slow ease-smooth",
          showPopup
            ? cn(
                "z-[100]",
                isPoster
                  ? "-top-[10%] -left-[10%] w-[120%] h-[130%]"
                  : "-top-[12%] -left-[8%] w-[116%] h-[130%]"
              )
            : "z-10 w-full h-full group cursor-pointer"
        )}
        style={{
          willChange: showPopup ? "transform, opacity" : "auto",
        }}
      >
        {showPopup && (
          <div
            className={cn(
              "absolute inset-0 bg-surface-container shadow-elevation-2 border border-outline-variant overflow-hidden",
              isPoster ? "rounded-xl" : "rounded-container"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-brand-accent/10 via-transparent to-transparent pointer-events-none rounded-[inherit] opacity-50" />
          </div>
        )}

        {!showPopup && (
          <div
            className={cn(
              "absolute inset-0 bg-surface-container shadow-elevation-2 border border-outline-variant",
              isPoster ? "rounded-lg" : "rounded-xl",
              "bg-[var(--bg-secondary)]/40 hover:border-brand-accent/30 hover:shadow-[var(--shadow-brand-primary)]"
            )}
          />
        )}

        <div className={cn("relative w-full overflow-hidden shrink-0", showPopup ? "aspect-[16/9]" : "h-full")}>
          <DeferredImage
            src={getMediumResImage(artwork)}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-slow ease-smooth group-hover:scale-[1.05]"
          />

          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/20 to-transparent transition-opacity duration-slow",
            showPopup ? "opacity-100" : "opacity-75 group-hover:opacity-90"
          )} />

          {!showPopup && (
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[inherit]">
              <div
                className={cn(
                  "w-1/3 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 absolute inset-y-0 transition-transform duration-slow ease-out -translate-x-[150%]",
                  isHovered && "translate-x-[150%]"
                )}
              />
            </div>
          )}

          {episodeNumber !== undefined && (
            <div className="absolute top-0 left-0 z-20">
              <Badge variant="primary" size="sm" className="rounded-br-xl border-r-0 border-b-0 px-3 py-1.5">
                <span className="flex items-center gap-1">
                  <span className="font-black text-label-sm tracking-display uppercase">EP</span>
                  <span className="font-black text-label-sm tracking-display uppercase">{episodeNumber}</span>
                </span>
              </Badge>
            </div>
          )}

          {mediaTypeBadge && (
            <div className="absolute top-0 right-0 z-20">
              <Badge variant="muted" size="sm" className="rounded-bl-xl border-l-0 border-b-0 px-2.5 py-1">
                <span className="font-black text-label-sm tracking-ultra uppercase">{mediaTypeBadge}</span>
              </Badge>
            </div>
          )}

          {badge && !showPopup && (
            <div className="absolute top-0 left-0 z-20 m-2">
              <Badge variant="primary" size="sm" className="px-2 py-1">
                {badge}
              </Badge>
            </div>
          )}

          {availabilityType && !showPopup && (
            <div className="absolute top-0 right-0 z-20 m-2">
              <Badge
                variant={
                  availabilityType === "FULL_LOCAL" ? "success" :
                  availabilityType === "HYBRID" ? "secondary" : "magic"
                }
                size="sm"
                className="px-2 py-1"
              >
                {availabilityType === "FULL_LOCAL" && "✓ Local"}
                {availabilityType === "HYBRID" && "☁ Híbrido"}
                {availabilityType === "ONLY_ONLINE" && "🌐 Online"}
              </Badge>
            </div>
          )}

          {showPopup && showQuickActions && (
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
              <button className="h-9 w-9 flex items-center justify-center rounded-full shadow-lg hover:scale-110 hover:shadow-[var(--shadow-brand-primary)] bg-brand-accent text-on-primary">
                <Icons.media.play size={14} />
              </button>
              <button className="h-9 w-9 flex items-center justify-center rounded-full bg-transparent border border-[var(--glass-border)] text-brand-accent">
                <Icons.ui.plus size={14} />
              </button>
              <button className="h-9 w-9 flex items-center justify-center rounded-full bg-transparent border border-[var(--glass-border)] text-brand-accent">
                <Icons.ui.info size={14} />
              </button>
            </div>
          )}

          {!showPopup && (
            <div className="absolute inset-0 z-10 flex flex-col justify-end p-3 md:p-4 transition-transform duration-slow ease-out group-hover:translate-y-[-2px]">
              <div className="space-y-1.5">
                <h3 className="text-h6 font-display text-on-surface line-clamp-1">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-caption text-on-surface-variant/70 uppercase tracking-wider line-clamp-1 group-hover:text-on-surface-variant transition-colors duration-fast">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          )}

          {progress !== undefined && (
            <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-[var(--glass-border-side)]">
              <div
                className="h-full bg-brand-accent shadow-[var(--shadow-brand-primary)] transition-all duration-base"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>

        {showPopup && (
          <div className="p-3 md:p-4 space-y-2 overflow-hidden bg-[var(--bg-tertiary)]/90 transition-all duration-slow ease-out">
            <div className="space-y-2">
              <h3 className="text-h5 font-display text-on-surface line-clamp-1">
                {title}
              </h3>

              <div className="flex flex-wrap items-center gap-1.5 text-caption font-bold uppercase tracking-wider text-on-surface-variant/70">
                {rating && !hideAudienceScore && (
                  <span className="text-brand-success font-extrabold flex items-center gap-1">
                    <Icons.ui.star size={10} fill="currentColor" />
                    {(rating * 10).toFixed(0)}%
                  </span>
                )}
                {year && <span className="text-on-surface-variant font-medium">{year}</span>}
                {badge && (
                  <Badge variant="muted" size="sm" className="px-1.5 py-0.5">
                    {badge}
                  </Badge>
                )}
                {episodeTitle && (
                  <span className="text-on-surface-variant/70 text-label-sm">
                    {episodeTitle}
                  </span>
                )}
              </div>

              {vibes.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {vibes.slice(0, 3).map((vibe, idx) => (
                    <Badge
                      key={idx}
                      variant="primary"
                      size="sm"
                      dot
                      className="text-label-sm tracking-widest px-2 py-0.5"
                    >
                      <Icons.status.sparkles size={8} className="animate-pulse" />
                      {vibe}
                    </Badge>
                  ))}
                </div>
              )}

              {description && (
                <p className="line-clamp-3 text-body-xs leading-relaxed text-on-surface-variant/70 pt-1">
                  {cleanDesc}
                </p>
              )}

              {showQuickActions && showPopup && (
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--glass-border-top)]">
                  <button className="flex-1 flex items-center justify-center gap-2 bg-brand-accent text-on-primary rounded-pill px-4 py-2">
                    <Icons.media.play size={14} />
                    Reproducir
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 bg-transparent border border-[var(--glass-border)] text-brand-accent rounded-pill px-4 py-2">
                    <Icons.ui.info size={14} />
                    Detalles
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {isSelected && (
        <div className="absolute inset-0 border-2 border-brand-accent rounded-[inherit] pointer-events-none opacity-50" />
      )}
    </div>
  );
});

PosterCard.displayName = "PosterCard";

export interface PosterGridProps {
  items: PosterCardProps[];
  columns?: { base?: number; sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number;
  onItemClick?: (item: PosterCardProps) => void;
  className?: string;
}

export function PosterGrid({ items, columns, gap = 4, onItemClick }: PosterGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns && `
          grid-cols-${columns.base ?? 2}
          sm:grid-cols-${columns.sm ?? 3}
          md:grid-cols-${columns.md ?? 4}
          lg:grid-cols-${columns.lg ?? 5}
          xl:grid-cols-${columns.xl ?? 6}
        `
      )}
      style={{ gap: `${gap}px` }}
    >
      {items.map((item, index) => (
        <PosterCard
          key={item.layoutId ?? item.title ?? index}
          {...item}
          onClick={() => onItemClick?.(item)}
        />
      ))}
    </div>
  );
}

export function PosterCarousel({ items, onItemClick, className }: PosterGridProps) {
  return (
    <div className={cn("scroll-snap-carousel", className)}>
      {items.map((item, index) => (
        <PosterCard
          key={item.layoutId ?? item.title ?? index}
          {...item}
          onClick={() => onItemClick?.(item)}
        />
      ))}
    </div>
  );
}