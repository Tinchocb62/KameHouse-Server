import { createFileRoute } from "@tanstack/react-router"
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"
import { motion } from "framer-motion"
import * as React from "react"
import { useGetLibraryCollection } from "@/api/hooks/anime_collection.hooks"
import { useGetSettings } from "@/api/hooks/settings.hooks"
import { getHighResImage, getMediumResImage } from "@/lib/helpers/images"
import { cn } from "@/components/ui/core/styling"
import { Icons } from "@/components/ui/icons"
import { PosterCard } from "@/components/ui/poster-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useThemeSettings } from "@/lib/theme/theme-hooks"

export const Route = createFileRoute("/profile/")({
    loader: ({ context }) => {
        const qc = context.queryClient
        qc.prefetchQuery({
            queryKey: ["library-collection"],
            queryFn: () => fetch("/api/v1/library/anime-collection").then(r => r.json()),
        })
        return { dehydrateState: dehydrate(qc) }
    },
    component: ProfilePage,
})

function ProfilePage() {
    return (
        <HydrationBoundary state={Route.useLoaderData().dehydrateState}>
            <ProfileClient />
        </HydrationBoundary>
    )
}

function ProfileClient() {
    const { data: collection } = useGetLibraryCollection()
    const { data: settings } = useGetSettings()
    const ts = useThemeSettings()

    const stats = React.useMemo(() => {
        if (!collection?.lists) return { series: 0, movies: 0, episodes: 0, hours: 0 }
        const entries = collection.lists.flatMap(l => l.entries ?? [])
        const uniqueSeries = new Set<number>()
        const uniqueMovies = new Set<number>()
        const totalEpisodes = 0
        let watchedEpisodes = 0

        entries.forEach(e => {
            if (!e.media) return
            if (e.media.format === "MOVIE" || e.media.format === "SPECIAL" || e.media.format === "OVA") {
                uniqueMovies.add(e.media.id)
            } else {
                uniqueSeries.add(e.media.id)
            }
            const progress = e.listData?.progress || 0
            watchedEpisodes += progress
        })

        return {
            series: uniqueSeries.size,
            movies: uniqueMovies.size,
            episodes: watchedEpisodes,
            hours: Math.round(watchedEpisodes * 24 / 60),
        }
    }, [collection])

    const continueWatching = React.useMemo(() => {
        if (!collection?.lists) return []
        const sortBy = ts.themeContinueWatchingDefaultSorting
        return collection.lists
            .flatMap(l => l.entries ?? [])
            .filter(e => e.media && (e.listData?.progress || 0) > 0 && (e.listData?.progress || 0) < (e.media.totalEpisodes || 1) * 0.95)
            .sort((a, b) => {
                if (sortBy === "LAST_WATCHED_ASC") {
                    return ((a.listData as any)?.updatedAt || 0) - ((b.listData as any)?.updatedAt || 0)
                }
                if (sortBy === "TITLE_ASC") {
                    const at = a.media?.titleEnglish || a.media?.titleRomaji || ""
                    const bt = b.media?.titleEnglish || b.media?.titleRomaji || ""
                    return at.localeCompare(bt)
                }
                // LAST_WATCHED_DESC (default)
                return ((b.listData as any)?.updatedAt || 0) - ((a.listData as any)?.updatedAt || 0)
            })
            .slice(0, 6)
            .map(e => ({
                artwork: e.media?.bannerImage || e.media?.posterImage || "",
                title: e.media?.titleEnglish || e.media?.titleRomaji || e.media?.titleOriginal || "Sin título",
                subtitle: e.media?.format === "MOVIE" ? "Película" : `Episodio ${e.listData?.progress || 1}`,
                aspect: "landscape" as const,
                progress: Math.round(((e.listData?.progress || 0) / (e.media?.totalEpisodes || 1)) * 100),
                year: e.media?.startDate?.split("-")[0],
                rating: (e.media as any)?.averageScore ? (e.media as any).averageScore / 100 : undefined,
                episodeNumber: e.listData?.progress,
                layoutId: `continue-${e.mediaId}`,
            }))
    }, [collection])

    const favorites = React.useMemo(() => {
        if (!collection?.lists) return []
        return collection.lists
            .flatMap(l => l.entries ?? [])
            .filter(e => e.media && e.listData?.status === "COMPLETED")
            .sort((a, b) => ((b.media as any)?.averageScore || 0) - ((a.media as any)?.averageScore || 0))
            .slice(0, 8)
            .map(e => ({
                artwork: e.media?.bannerImage || e.media?.posterImage || "",
                title: e.media?.titleEnglish || e.media?.titleRomaji || e.media?.titleOriginal || "Sin título",
                subtitle: e.media?.format === "MOVIE" ? "Película" : `${e.media?.totalEpisodes || 0} eps`,
                aspect: "poster" as const,
                year: e.media?.startDate?.split("-")[0],
                rating: (e.media as any)?.averageScore ? (e.media as any).averageScore / 100 : undefined,
                layoutId: `fav-${e.mediaId}`,
            }))
    }, [collection])

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen bg-surface text-on-surface overflow-x-hidden"
        >
            <div className="relative z-10">
                <ProfileHeader stats={stats} settings={settings} />

                <main className="container-fluid py-8 md:py-12 lg:py-16">
                    {continueWatching.length > 0 && (
                        <ProfileSection
                            title="Continuar Viendo"
                            subtitle={`${continueWatching.length} en progreso`}
                            action={{ label: "Ver todo", onClick: () => {} }}
                        >
                            <div className="scroll-snap-carousel">
                                {continueWatching.map((item, i) => (
                                    <PosterCard
                                        key={item.layoutId}
                                        {...item}
                                        variant="continue-watching"
                                    />
                                ))}
                            </div>
                        </ProfileSection>
                    )}

                    <ProfileSection
                        title="Tus Favoritos"
                        subtitle={`${favorites.length} completados`}
                        action={{ label: "Ver todos", onClick: () => {} }}
                    >
                        <div className="scroll-snap-carousel">
                            {favorites.map((item, i) => (
                                <PosterCard key={item.layoutId} {...item} />
                            ))}
                        </div>
                    </ProfileSection>

                    <ProfileStatsGrid stats={stats} />
                </main>
            </div>
        </motion.div>
    )
}

function ProfileHeader({ stats, settings }: { stats: any; settings: any }) {
    const avatarUrl = settings?.theme?.themeAvatarUrl || "/kamehouse-logo.png"
    const username = settings?.theme?.themeCustomUsername || "Usuario"
    const joinedDate = settings?.createdAt ? new Date(settings.createdAt).toLocaleDateString("es-ES", { year: "numeric", month: "long" }) : "Recién llegado"

    return (
        <header className="relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-[100px] -left-[100px] w-[300px] h-[300px] rounded-full bg-brand-primary/10 blur-[100px]" />
                <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] rounded-full bg-brand-secondary/10 blur-[100px]" />
            </div>

            <div className="relative z-10 container-fluid py-12 md:py-16 lg:py-24">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 text-center md:text-left">
                        <div className="relative shrink-0">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-outline-variant bg-surface-container-low shadow-elevation-3">
                                <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-brand-primary border-4 border-outline-variant flex items-center justify-center shadow-elevation-3">
                                <Icons.ui.star size={20} className="text-on-surface" />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h1 className="text-h2 font-display text-on-surface tracking-tight">{username}</h1>
                            <p className="text-body-md text-on-surface-variant/70 mt-2">Miembro desde {joinedDate}</p>

                            <div className="flex flex-wrap items-center gap-4 mt-6">
                                <button className="inline-flex items-center justify-center gap-2 px-5 h-10 bg-primary text-on-surface font-semibold text-sm rounded-button transition-all duration-fast active:scale-[0.97]">
                                <Icons.media.play size={16} strokeWidth={2.5} />
                                Reproducir Aleatorio
                            </button>
                                <button className="inline-flex items-center justify-center gap-2 px-5 h-10 border border-outline-variant text-on-surface-variant font-semibold text-sm rounded-button transition-all duration-fast hover:border-primary hover:bg-primary/10 active:scale-[0.97]">
                                <Icons.ui.heart size={16} strokeWidth={2.5} />
                                Lista de Deseos
                            </button>
                                <button className="inline-flex items-center justify-center gap-2 px-5 h-10 text-on-surface-variant font-semibold text-sm rounded-button transition-all duration-fast hover:bg-surface-container active:scale-[0.97]">
                                <Icons.ui.settings size={16} strokeWidth={2.5} />
                                Configuración
                            </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}

interface ProfileSectionProps {
    title: string
    subtitle?: string
    action?: { label: string; onClick: () => void }
    children: React.ReactNode
}

function ProfileSection({ title, subtitle, action, children }: ProfileSectionProps) {
    return (
        <section className="mb-16 md:mb-20 lg:mb-24" aria-labelledby={title.toLowerCase().replace(/\s+/g, '-')}>
            <div className="flex items-end justify-between gap-4 mb-8">
                <div>
                    <h2 id={title.toLowerCase().replace(/\s+/g, '-')} className="text-h3 font-display text-on-surface uppercase tracking-wide">
                        {title}
                    </h2>
                    {subtitle && <p className="text-body-sm text-on-surface-variant/70 mt-1">{subtitle}</p>}
                </div>
                {action && (
                    <button onClick={action.onClick} className="inline-flex items-center justify-center gap-2 px-4 h-9 text-on-surface-variant font-semibold text-xs rounded-button transition-all duration-fast hover:bg-surface-container active:scale-[0.97]">
                        {action.label}
                        <Icons.arrow.right size={14} strokeWidth={2.5} className="ml-1" />
                    </button>
                )}
            </div>
            {children}
        </section>
    )
}

function ProfileStatsGrid({ stats }: { stats: any }) {
    const statItems = [
        { label: "Series", value: stats.series, icon: Icons.navigation.tv, color: "var(--brand-primary)" },
        { label: "Películas", value: stats.movies, icon: Icons.navigation.film, color: "var(--brand-secondary)" },
        { label: "Episodios Vistos", value: stats.episodes.toLocaleString(), icon: Icons.status.activity, color: "var(--brand-success)" },
        { label: "Horas Vistas", value: `${stats.hours}h`, icon: Icons.time.clock, color: "var(--brand-magic)" },
    ]

    return (
        <section aria-labelledby="stats-title" className="mb-8">
            <h2 id="stats-title" className="sr-only">Estadísticas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statItems.map((item, i) => (
                    <div className="bg-surface-container shadow-elevation-3 rounded-container p-6 backdrop-blur-overlay-md border border-outline-variant text-center group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-on-surface/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <item.icon size={28} className="mx-auto mb-3 text-on-surface-variant group-hover:text-on-surface transition-colors" style={{ color: item.color }} />
                        <div className="text-h3 font-display text-on-surface font-extrabold tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {item.value}
                        </div>
                        <div className="text-label-md text-on-surface-variant/70 mt-1 uppercase tracking-wider">
                            {item.label}
                        </div>
                                        </div>
                ))}
            </div>
        </section>
    )
}

