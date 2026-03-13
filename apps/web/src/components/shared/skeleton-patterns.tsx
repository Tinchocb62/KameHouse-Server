import * as React from "react"
import { cn } from "@/components/ui/core/styling"

const SHIMMER_ANIMATION = "animate-shimmer"

const shimmerStyles = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .animate-shimmer {
    animation: shimmer 1.5s infinite linear;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255,255,255,0.08) 50%, 
      transparent 100%
    );
    background-size: 200% 100%;
  }
`

interface SkeletonBaseProps {
    className?: string
}

const SkeletonBase = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & SkeletonBaseProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative overflow-hidden rounded-md bg-white/5",
                    SHIMMER_ANIMATION,
                    className
                )}
                {...props}
            />
        )
    }
)
SkeletonBase.displayName = "SkeletonBase"

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("animate-pulse rounded-md bg-white/10", className)} {...props} />
}

export function ShimmerSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <>
            <style>{shimmerStyles}</style>
            <div
                className={cn(
                    "relative overflow-hidden rounded-md bg-white/5",
                    SHIMMER_ANIMATION,
                    className
                )}
                {...props}
            />
        </>
    )
}

interface MediaCardSkeletonProps {
    aspect?: "poster" | "wide"
    showMetadata?: boolean
    className?: string
}

export function MediaCardSkeleton({
    aspect = "poster",
    showMetadata = true,
    className,
}: MediaCardSkeletonProps) {
    const aspectClass = aspect === "poster" ? "aspect-[2/3]" : "aspect-[16/9]"

    return (
        <div
            className={cn(
                "group/card relative shrink-0 overflow-hidden rounded-md",
                "border border-white/5",
                "transition-all duration-300 ease-out",
                aspect === "poster"
                    ? "aspect-[2/3] w-[140px] md:w-[170px] lg:w-[200px]"
                    : "aspect-[16/9] w-[240px] md:w-[300px] lg:w-[340px]",
                className
            )}
        >
            <ShimmerSkeleton className="absolute inset-0 h-full w-full" />

            <div className={cn(
                "absolute inset-x-0 bottom-0 z-10",
                aspect === "poster" ? "h-[45%]" : "h-[55%]",
                "bg-gradient-to-t from-black/90 via-black/50 to-transparent",
            )} />

            {showMetadata && (
                <div className="absolute inset-x-0 bottom-0 z-20 px-2.5 pb-2.5 pt-6">
                    <ShimmerSkeleton className="h-3 w-3/4 rounded mb-2" />
                    <ShimmerSkeleton className="h-2 w-1/2 rounded" />
                </div>
            )}
        </div>
    )
}

interface EpisodeRowSkeletonProps {
    showThumbnail?: boolean
    className?: string
}

export function EpisodeRowSkeleton({
    showThumbnail = true,
    className,
}: EpisodeRowSkeletonProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-lg p-2",
                "hover:bg-white/5 transition-colors",
                className
            )}
        >
            {showThumbnail && (
                <ShimmerSkeleton className="h-16 w-28 flex-shrink-0 rounded-md" />
            )}
            <div className="flex-1 space-y-2 min-w-0">
                <ShimmerSkeleton className="h-4 w-24 rounded" />
                <ShimmerSkeleton className="h-3 w-16 rounded" />
            </div>
            <ShimmerSkeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        </div>
    )
}

interface DetailPageSkeletonProps {
    className?: string
}

export function DetailPageSkeleton({ className }: DetailPageSkeletonProps) {
    return (
        <div className={cn("space-y-8", className)}>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                <ShimmerSkeleton className="h-full w-full" />
            </div>

            <div className="space-y-4">
                <ShimmerSkeleton className="h-8 w-2/3 rounded" />
                <div className="flex gap-3">
                    <ShimmerSkeleton className="h-6 w-16 rounded" />
                    <ShimmerSkeleton className="h-6 w-20 rounded" />
                </div>
                <ShimmerSkeleton className="h-4 w-full rounded" />
                <ShimmerSkeleton className="h-4 w-3/4 rounded" />
            </div>

            <div className="space-y-3">
                <ShimmerSkeleton className="h-6 w-32 rounded" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <MediaCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    )
}

interface ListSkeletonProps {
    rows?: number
    className?: string
}

export function ListSkeleton({ rows = 8, className }: ListSkeletonProps) {
    return (
        <div className={cn("space-y-2", className)}>
            {Array.from({ length: rows }).map((_, i) => (
                <EpisodeRowSkeleton key={i} />
            ))}
        </div>
    )
}

interface GridSkeletonProps {
    count?: number
    aspect?: "poster" | "wide"
    className?: string
}

export function GridSkeleton({ count = 12, aspect = "poster", className }: GridSkeletonProps) {
    return (
        <div
            className={cn(
                "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6",
                "content-visibility-auto",
                className
            )}
        >
            {Array.from({ length: count }).map((_, idx) => (
                <MediaCardSkeleton key={idx} aspect={aspect} />
            ))}
        </div>
    )
}

interface PageSkeletonProps {
    type?: "grid" | "list" | "detail"
    count?: number
    className?: string
}

export function PageSkeleton({ type = "grid", count, className }: PageSkeletonProps) {
    switch (type) {
        case "detail":
            return <DetailPageSkeleton className={className} />
        case "list":
            return <ListSkeleton rows={count} className={className} />
        case "grid":
        default:
            return <GridSkeleton count={count} className={className} />
    }
}

export const skeletonPatterns = {
    mediaCard: MediaCardSkeleton,
    episodeRow: EpisodeRowSkeleton,
    detailPage: DetailPageSkeleton,
    list: ListSkeleton,
    grid: GridSkeleton,
    page: PageSkeleton,
    shimmer: ShimmerSkeleton,
    base: SkeletonBase,
}
