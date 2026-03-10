import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useGlobalSearch } from "@/hooks/use-global-search"
import { Link } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const { query, setQuery, results, isLoading, isSearchActive } = useGlobalSearch()

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder="Search series, movies, or discover..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                {isLoading ? (
                    <div className="flex h-32 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup heading={isSearchActive ? "Search Results" : "Trending Now"}>
                            {results?.map((result) => (
                                <CommandItem key={result.id} value={result.title?.userPreferred || ""} onSelect={() => setOpen(false)}>
                                    <Link to={`/series/${result.id}`} className="flex w-full items-center gap-3">
                                        <div
                                            className="h-10 w-8 flex-shrink-0 cursor-pointer rounded-sm bg-cover bg-center shadow-lg transition-transform hover:scale-110"
                                            style={{ backgroundImage: `url(${result.coverImage?.large})` }}
                                        />
                                        <div className="flex flex-col overflow-hidden text-left hover:text-orange-500">
                                            <span className="truncate break-normal text-sm font-bold antialiased pb-0.5" title={result.title?.userPreferred || ""}>
                                                {result.title?.userPreferred}
                                            </span>
                                            <span className="truncate text-xs text-gray-400">
                                                {result.startDate?.year || "Unknown Year"} • {result.format || "TV"}
                                            </span>
                                        </div>
                                    </Link>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}
            </CommandList>
        </CommandDialog>
    )
}
