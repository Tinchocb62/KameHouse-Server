import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton/skeleton"
import { cn } from "@/components/ui/core/styling"

// Renders a grid of poster cards mimicking PremiumPosterCard
export function PosterGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
    return (
        <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6", className)}>
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                    <Skeleton className="aspect-[2/3] w-full rounded-xl" />
                    <Skeleton className="h-5 w-3/4 rounded-md mt-1" />
                    <Skeleton className="h-4 w-1/2 rounded-md" />
                </div>
            ))}
        </div>
    )
}

// Renders a premium Bento layout skeleton for series/movies detail pages
export function BentoDetailsSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6 p-6", className)}>
            {/* Main Hero Banner / Backdrop Skeleton */}
            <div className="md:col-span-3">
                <Skeleton className="h-[40vh] sm:h-[50vh] w-full rounded-container" />
            </div>

            {/* Left Column: Poster + Metadata */}
            <div className="flex flex-col gap-4">
                <Skeleton className="aspect-[2/3] w-full max-w-[300px] mx-auto md:mx-0 rounded-xl" />
                <Skeleton className="h-6 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-xl" />
            </div>

            {/* Right Column: Title, Details, Interactive Actions */}
            <div className="md:col-span-2 flex flex-col gap-6">
                <div className="space-y-3">
                    <Skeleton className="h-10 w-2/3 rounded-lg" />
                    <Skeleton className="h-6 w-1/3 rounded-md" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-12 w-32 rounded-full" />
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-12 w-12 rounded-full" />
                </div>
                <Skeleton className="h-32 w-full rounded-xl" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-1/4 rounded-md" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Skeleton className="h-10 rounded-lg" />
                        <Skeleton className="h-10 rounded-lg" />
                        <Skeleton className="h-10 rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    )
}

