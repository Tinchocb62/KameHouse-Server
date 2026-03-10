import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useGlobalSearch } from "@/hooks/use-global-search"
import { useAnimeEntryManualMatch } from "@/api/hooks/anime_entries.hooks"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface ManualMatchModalProps {
    isOpen: boolean
    onClose: () => void
    directoryPath?: string
    currentMediaId?: number
}

export function ManualMatchModal({ isOpen, onClose, directoryPath, currentMediaId }: ManualMatchModalProps) {
    const { query, setQuery, results, isLoading, isSearchActive } = useGlobalSearch()
    const { mutateAsync: manualMatch, isPending } = useAnimeEntryManualMatch()
    const [selectedId, setSelectedId] = useState<number | null>(null)

    const handleMatch = async (mediaId: number) => {
        if (!directoryPath) return
        setSelectedId(mediaId)
        try {
            await manualMatch({
                paths: [directoryPath],
                mediaId,
            })
            onClose()
        } catch (error) {
            console.error("Failed to match", error)
        } finally {
            setSelectedId(null)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-[#0B0B0F] text-white border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Fix Match</DialogTitle>
                    <DialogDescription className="text-white/60">
                        Search for the correct series or movie to link it to your local files.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    <input
                        type="text"
                        placeholder="Search AniList..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />

                    <div className="max-h-96 flex flex-col gap-2 overflow-y-auto px-1 py-1">
                        {isLoading ? (
                            <div className="flex h-32 items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                            </div>
                        ) : isSearchActive && results.length === 0 ? (
                            <div className="flex h-32 items-center justify-center text-white/50">
                                No results found.
                            </div>
                        ) : (
                            results?.map((result) => (
                                <div
                                    key={result.id}
                                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3 transition hover:bg-white/10"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="h-16 w-12 flex-shrink-0 cursor-pointer rounded bg-cover bg-center shadow-lg"
                                            style={{ backgroundImage: `url(${result.coverImage?.large})` }}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">
                                                {result.title?.userPreferred}
                                            </span>
                                            <span className="text-xs text-white/60">
                                                {result.startDate?.year || "Unknown Year"} • {result.format || "TV"}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleMatch(result.id)}
                                        disabled={isPending || !directoryPath}
                                        className="rounded-full bg-orange-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[0_5px_15px_rgba(249,115,22,0.3)] transition hover:bg-orange-600 disabled:opacity-50"
                                    >
                                        {isPending && selectedId === result.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            "Match"
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
