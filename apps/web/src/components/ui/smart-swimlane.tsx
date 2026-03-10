import * as React from "react"
import { Swimlane, type SwimlaneItem } from "@/components/ui/swimlane"
import type { CuratedSwimlane, ContentTag } from "@/hooks/useHomeIntelligence"
import { useIntelligenceStore } from "@/hooks/useHomeIntelligence"
import { cn } from "@/components/ui/core/styling"


// ─── Intelligence badge helpers ───────────────────────────────────────────────

/** Returns the visible label + Tailwind colour classes for a ContentTag. */
function tagBadge(tag: ContentTag): { label: string; className: string } | null {
    switch (tag) {
        case "EPIC":
            return {
                label: "ÉPICO",
                className:
                    "bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
            }
        case "FILLER":
            return {
                label: "RELLENO",
                className: "bg-zinc-700/40 border-zinc-500/30 text-zinc-400",
            }
        case "SPECIAL":
            return {
                label: "ESPECIAL",
                className: "bg-blue-500/20 border-blue-400/40 text-blue-300",
            }
        default:
            return null
    }
}

/** Derived badge from lane type when the entry has no explicit intelligence tag. */
function laneBadge(laneType: string): string {
    switch (laneType) {
        case "epic_moments":
            return "Épico 🔥"
        case "essential_cinema":
            return "Esencial 🏆"
        case "local_library":
            return "Local"
        default:
            return ""
    }
}

// ─── IntelligenceBadge component ──────────────────────────────────────────────

function IntelligenceBadge({
    tag,
    arcName,
}: {
    tag?: ContentTag
    arcName?: string
}) {
    const badge = tag && tag !== "CANON" ? tagBadge(tag) : null

    if (!badge && !arcName) return null

    return (
        <div className="absolute bottom-10 left-2 right-2 z-30 flex flex-wrap gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {badge && (
                <span
                    className={cn(
                        "rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest border backdrop-blur-sm",
                        badge.className,
                    )}
                >
                    {badge.label}
                </span>
            )}
            {arcName && (
                <span className="rounded border border-white/10 bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-zinc-300 backdrop-blur-sm">
                    {arcName}
                </span>
            )}
        </div>
    )
}

// ─── SmartSwimlane ────────────────────────────────────────────────────────────

export interface SmartSwimlaneProps {
    lane: CuratedSwimlane
    onNavigate: (mediaId: string) => void
    /** Show posters instead of wide backdrops for "local_library" type lanes */
    aspect?: "poster" | "wide"
}

export const SmartSwimlane = React.memo(function SmartSwimlane({ lane, onNavigate, aspect }: SmartSwimlaneProps) {
    const { setBackdropUrl } = useIntelligenceStore()

    const resolvedAspect = aspect ?? (lane.type === "local_library" ? "poster" : "wide")

    const items: SwimlaneItem[] = React.useMemo(() => {
        return lane.entries.map((entry) => {
            const media = entry.media
            const intel = entry.intelligence

            // Backend-derived badge wins; fall back to lane-level label
            const badge =
                intel?.tag && intel.tag !== "CANON"
                    ? (tagBadge(intel.tag)?.label ?? laneBadge(lane.type))
                    : laneBadge(lane.type)

            // Subtitle: year + format + arc name (if available)
            const parts: string[] = []
            if (media?.year) parts.push(String(media.year))
            if (media?.format) parts.push(media.format)
            if (intel?.arcName) parts.push(intel.arcName)

            const backdropUrl = media?.bannerImage || media?.posterImage

            return {
                id: String(entry.mediaId),
                title: media?.titleEnglish || media?.titleRomaji || "—",
                subtitle: parts.join(" · "),
                badge,
                image: resolvedAspect === "poster" ? (media?.posterImage ?? "") : (backdropUrl ?? ""),
                availabilityType: entry.availabilityType as SwimlaneItem["availabilityType"],
                backdropUrl: backdropUrl ?? undefined,
                intelligenceTag: intel?.tag,
                year: media?.year,
                rating: intel?.rating,
                onClick: () => onNavigate(String(entry.mediaId)),
                // Slot intelligence badge as an overlay via renderOverlay
                // (MediaCard bubbles the group-hover, so we can't easily inject
                // arbitrary children — instead we pass it as the badge label for now)
            }
        })
    }, [lane, onNavigate, resolvedAspect])

    if (items.length === 0) return null

    return (
        <Swimlane
            title={lane.title}
            items={items}
            defaultAspect={resolvedAspect}
            onHover={setBackdropUrl}
            className="mb-8"
        />
    )
})
SmartSwimlane.displayName = "SmartSwimlane"
