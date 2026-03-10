import { createFileRoute } from "@tanstack/react-router"
import React, { useMemo } from "react"
import { useGetLibraryCollection } from "@/api/hooks/anime_collection.hooks"
import { useGetLocalFilesInfinite } from "@/api/hooks/localfiles.hooks"
import { MediaCard } from "@/components/ui/media-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs/tabs"
import { Anime_LocalFile, Models_LibraryMedia, Anime_LibraryCollectionEntry } from "@/api/generated/types"
import { VirtualizedMediaGrid } from "@/components/shared/virtualized-media-grid"
import { Search } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { MediaGridSkeleton } from "@/components/shared/media-grid-skeleton"
import { EmptyState } from "@/components/shared/empty-state"

export const Route = createFileRoute("/library/")({
    component: LibraryPage,
})

function getTitle(media: Models_LibraryMedia | null | undefined): string {
    return media?.titleEnglish || media?.titleRomaji || media?.titleOriginal || "Desconocido"
}

function LibraryPage() {
    const { data: libraryData, isLoading: libLoading } = useGetLibraryCollection()
    const { 
        data: localInfiniteData, 
        isLoading: locLoading, 
        isFetchingNextPage, 
        hasNextPage, 
        fetchNextPage 
    } = useGetLocalFilesInfinite()

    const localData = React.useMemo(() => localInfiniteData?.pages.flatMap(p => p.items) || [], [localInfiniteData])

    const lists = libraryData?.lists || []
    const currentlyWatching = lists.find(l => l.status === "CURRENT")?.entries || []
    const planned = lists.find(l => l.status === "PLANNING")?.entries || []
    const completed = lists.find(l => l.status === "COMPLETED")?.entries || []

    const renderGrid = (entries: Anime_LibraryCollectionEntry[], emptyMessage: string) => {
        return <VirtualizedMediaGrid entries={entries} emptyMessage={emptyMessage} />
    }

    const libraryActions = useMemo(() => (
        <div className="relative group w-full md:w-auto mt-2 md:mt-0">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input 
                type="text" 
                placeholder="Buscar..." 
                className="w-full md:w-72 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-muted-foreground font-bold shadow-inner" 
            />
        </div>
    ), [])

    return (
        <div className="flex-1 w-full flex flex-col overflow-y-auto">
            
            {/* ── Sticky Cinematic Header ── */}
            <PageHeader
                title={<>Mi <span className="text-primary">Biblioteca</span></>}
                actions={libraryActions}
            />

            {/* ── Main Canvas ── */}
            <div className="px-6 md:px-10 py-8 w-full max-w-screen-2xl mx-auto flex-1">
                <Tabs defaultValue="current" className="w-full flex flex-col gap-6">
                    
                    {/* Seamless VOD Tabs */}
                    <TabsList className="flex w-max justify-start items-center gap-2 border border-white/10 bg-white/5 rounded-2xl p-1.5 h-auto overflow-x-auto shadow-inner">
                        <TabsTrigger
                            value="current"
                            className="h-10 rounded-xl text-xs md:text-sm font-black uppercase tracking-widest px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg text-muted-foreground hover:text-foreground transition-all border-none"
                        >
                            Viendo ({currentlyWatching.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="planned"
                            className="h-10 rounded-xl text-xs md:text-sm font-black uppercase tracking-widest px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg text-muted-foreground hover:text-foreground transition-all border-none"
                        >
                            Planeado ({planned.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="completed"
                            className="h-10 rounded-xl text-xs md:text-sm font-black uppercase tracking-widest px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg text-muted-foreground hover:text-foreground transition-all border-none"
                        >
                            Completados ({completed.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="local"
                            className="h-10 rounded-xl text-xs md:text-sm font-black uppercase tracking-widest px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg text-muted-foreground hover:text-foreground transition-all border-none"
                        >
                            Archivos Locales
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex flex-col gap-6">
                        <TabsContent value="current" className="focus:outline-none focus-visible:ring-0">
                            {libLoading ? (
                                <MediaGridSkeleton />
                            ) : renderGrid(currentlyWatching, "No estás viendo ninguna serie ahora mismo.")}
                        </TabsContent>

                        <TabsContent value="planned" className="focus:outline-none focus-visible:ring-0">
                            {libLoading ? (
                                <MediaGridSkeleton />
                            ) : renderGrid(planned, "No tienes series planeadas para ver.")}
                        </TabsContent>

                        <TabsContent value="completed" className="focus:outline-none focus-visible:ring-0">
                            {libLoading ? (
                                <MediaGridSkeleton />
                            ) : renderGrid(completed, "Aún no has completado ninguna serie.")}
                        </TabsContent>

                        <TabsContent value="local" className="focus:outline-none focus-visible:ring-0">
                            {locLoading ? (
                                <MediaGridSkeleton aspect="poster" />
                            ) : (!localData || localData.length === 0) ? (
                                <EmptyState
                                    title="Sin archivos locales"
                                    message="Todavía no indexas medios locales. Configura una carpeta en Ajustes y vuelve a escanear."
                                />
                            ) : (
                                <>
                                    <div 
                                        className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 md:gap-6 pt-6 pb-12 w-full"
                                        style={{ contentVisibility: "auto" }}
                                    >
                                        {localData.map((file: Anime_LocalFile, idx: number) => {
                                            const parseData: any = file.parsedInfo || (file as any).Parsed || (file as any).parsedData || {}
                                            return (
                                                <div key={file.path || `local-${idx}`} className="w-full">
                                                    <MediaCard
                                                        title={parseData.title || parseData.Title || (file as any).name || "Archivo genérico"}
                                                        artwork="https://placehold.co/220x330/1A1A1A/FFFFFF?text=Archivo+Local"
                                                        badge={parseData.resolution || parseData.Resolution || "LOCAL"}
                                                        aspect="poster"
                                                        className="w-full"
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                    {hasNextPage && (
                                        <div className="flex justify-center mt-6 mb-10 w-full">
                                            <button 
                                                onClick={() => fetchNextPage()} 
                                                disabled={isFetchingNextPage}
                                                className="px-8 py-3 bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 rounded-full font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-2 group"
                                            >
                                                {isFetchingNextPage ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/>
                                                        Cargando más...
                                                    </>
                                                ) : (
                                                    <>
                                                        Cargar más resultados
                                                        <span className="group-hover:translate-y-0.5 transition-transform">↓</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    )
}

