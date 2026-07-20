import { Icons } from "@/components/ui/icons"

import * as React from "react"
import { motion } from "framer-motion"

import { toast } from "sonner"
import * as Popover from "@radix-ui/react-popover"

import { cn } from "@/components/ui/core/styling"
import { useGetLibraryCollection } from "@/api/hooks/anime_collection.hooks"
import { fetchAnimeEntryLocalFiles } from "@/api/hooks/anime_entries.hooks"
import { fetchCastDevices, useCastPlay } from "@/api/hooks/cast.hooks"
import { useSound } from "@/hooks/use-sound"
import { useAppStore, PlaylistItem } from "@/lib/store"

// ─── Component ────────────────────────────────────────────────────────────────

export function RandomPlayButton() {
    const { playSound } = useSound()
    const [showPicker, setShowPicker] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)
    const tvMode = useAppStore(state => state.tvMode)
    const sidebarOpen = useAppStore(state => state.sidebarOpen)
    const setTvMode = useAppStore(state => state.setTvMode)
    const { mutate: castPlay } = useCastPlay()

    const { data: collection } = useGetLibraryCollection()

    // All library entries flattened
    const allEntries = React.useMemo(() => {
        if (!collection?.lists) return []
        return collection.lists.flatMap(list => list.entries ?? [])
    }, [collection])

    const playRandomSound = React.useCallback(() => {
        playSound("random", 0.5)
    }, [playSound])

    const pick = async (type: "movie" | "episode") => {
        setShowPicker(false)
        playRandomSound()
        setIsLoading(true)

        try {
            const isMovie = type === "movie"

            // ── 1. Filter candidates from collection ───────────────────────
            const MOVIE_FORMATS = ["MOVIE", "OVA", "SPECIAL"]
            const candidates = allEntries.filter(e => {
                if (!e?.media || (e.libraryData?.mainFileCount ?? 0) === 0) return false
                const fmt = e.media.format || ""
                return isMovie ? MOVIE_FORMATS.includes(fmt) : fmt === "TV"
            })

            if (candidates.length === 0) {
                toast.error(isMovie ? "No hay películas en tu biblioteca" : "No hay series en tu biblioteca")
                return
            }

            // ── 2. Pick a random candidate ─────────────────────────────────
            const randomEntry = candidates[Math.floor(Math.random() * candidates.length)]

            // ── 3. Fetch full entry to get local file paths ────────────────
            const localFiles = await fetchAnimeEntryLocalFiles(randomEntry.mediaId)

            if (!localFiles || localFiles.length === 0) {
                toast.error("No se encontraron archivos locales para reproducir")
                return
            }

            // ── 4. Choose files and populate queue ─────────────────────────
            const sortedLocalFiles = localFiles.sort((a, b) => {
                const epA = a.metadata?.episode || Number(a.parsedInfo?.episode) || 1
                const epB = b.metadata?.episode || Number(b.parsedInfo?.episode) || 1
                return Number(epA) - Number(epB)
            })

            const seriesTitle =
                randomEntry.media?.titleSpanish ||
                randomEntry.media?.titleRomaji ||
                randomEntry.media?.titleEnglish ||
                "Sin título"
                
            let newQueue: PlaylistItem[] = []
            let activeItem: PlaylistItem | null = null

            if (isMovie) {
                const selectedFile = sortedLocalFiles[0]
                if (!selectedFile?.path) {
                    toast.error("Archivo no disponible")
                    return
                }
                const epNum = selectedFile.metadata?.episode || Number(selectedFile.parsedInfo?.episode) || 1
                activeItem = {
                    id: String(selectedFile.path),
                    title: seriesTitle,
                    playableUrl: selectedFile.path,
                    episodeNumber: Number(epNum),
                    mediaId: randomEntry.mediaId,
                    malId: randomEntry.media?.idMal ?? null,
                    mediaFormat: randomEntry.media?.format,
                    subtitle: "Película"
                }
                newQueue = [activeItem]
            } else {
                if (sortedLocalFiles.length === 0 || !sortedLocalFiles[0]?.path) {
                    toast.error("Archivo no disponible")
                    return
                }
                
                // Pick a random episode as starting point
                const startIdx = Math.floor(Math.random() * sortedLocalFiles.length)
                
                // Add from startIdx to the end
                for (let i = startIdx; i < sortedLocalFiles.length; i++) {
                    const file = sortedLocalFiles[i]
                    if (!file.path) continue
                    const epNum = file.metadata?.episode || Number(file.parsedInfo?.episode) || 1
                    const item: PlaylistItem = {
                        id: String(file.path),
                        title: seriesTitle,
                        playableUrl: file.path,
                        episodeNumber: Number(epNum),
                        mediaId: randomEntry.mediaId,
                        malId: randomEntry.media?.idMal ?? null,
                        mediaFormat: randomEntry.media?.format,
                        subtitle: `Episodio ${epNum}`
                    }
                    newQueue.push(item)
                    if (i === startIdx) {
                        activeItem = item
                    }
                }
            }
            
            if (!activeItem) return

            // Si hay una KameHouseTV (Tizen) conectada al servidor, el Modo TV
            // se reproduce en la tele vía cast y la UI del PC queda como está.
            const devices = (await fetchCastDevices().catch(() => undefined))?.devices ?? []
            if (devices.length > 0) {
                const epNum = activeItem.episodeNumber ?? 1
                castPlay({
                    mediaId: randomEntry.mediaId,
                    episodeNumber: epNum,
                    title: seriesTitle,
                    episodeLabel: isMovie ? "Película" : `Episodio ${epNum}`,
                }, {
                    onSuccess: () => {
                        toast.success(`📺 Modo TV ${isMovie ? "Películas" : "Series"} enviado a la TV`, {
                            description: `${seriesTitle}${!isMovie ? ` — Ep. ${epNum}` : ""}`,
                            duration: 3000,
                        })
                    },
                })
                return
            }

            useAppStore.setState({
                playlistQueue: newQueue,
                currentQueueIndex: 0,
                activeQueuePlayItem: activeItem,
                globalQueueOpen: false
            })

            setTvMode(true)

            toast.success(`📺 Modo TV ${isMovie ? "Películas" : "Series"} iniciado`, {
                description: `${seriesTitle}${!isMovie ? ` — Ep. ${activeItem.episodeNumber}` : ""}`,
                duration: 3000,
            })
        } catch (err) {
            console.error("[RandomPlay] error:", err)
            toast.error("Ocurrió un error al seleccionar el contenido")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* ─── Trigger Button + Picker Popover ─────────────────────── */}
            <div className="w-full flex justify-center gsap-sidebar-item">
                <Popover.Root
                    open={showPicker}
                    onOpenChange={(open) => {
                        setShowPicker(open)
                        playRandomSound()
                    }}
                >
                    <Popover.Trigger asChild>
                        <button
                            id="random-play-btn"
                            disabled={isLoading}
                            title="Modo TV"
                            className={cn(
                                "flex items-center h-14 rounded-xl group px-4 relative transition-all duration-base w-full",
                                "active:scale-95 font-bold outline-none",
                                sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-14 w-full md:px-0",
                                tvMode || showPicker || isLoading
                                    ? "text-on-surface bg-white/[0.08]"
                                    : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] text-on-surface-variant hover:text-on-surface"
                            )}
                        >
                            <div className={cn(
                                "absolute left-0 w-1 h-6 bg-on-surface rounded-r-full transition-all duration-slow hidden md:block",
                                (tvMode || showPicker || isLoading) ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                            )} />
                            
                            <span className={cn(
                                "shrink-0 z-10 group-hover:scale-110 transition-transform duration-base",
                                (tvMode || showPicker || isLoading) && "text-on-surface"
                            )}>
                                {isLoading ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Icons.ui.spinner className="w-5 h-5" />
                                    </motion.div>
                                ) : (
                                    <Icons.navigation.tv className={cn(
                                        "w-5 h-5 transition-transform duration-base",
                                        "group-hover:scale-110"
                                    )} />
                                )}
                            </span>
                            
                            <span className={cn(
                                "uppercase tracking-ultra text-label-sm font-black z-10 text-left transition-colors whitespace-nowrap",
                                (sidebarOpen) ? "block" : "hidden md:hidden",
                                (tvMode || showPicker || isLoading) ? "text-on-surface" : "group-hover:text-on-surface"
                            )}>
                                Modo TV {tvMode ? "(Activado)" : ""}
                            </span>
                        </button>
                    </Popover.Trigger>

                    <Popover.Portal>
                        <Popover.Content
                            side="right"
                            align="end"
                            sideOffset={16}
                            className={cn(
                                "z-[999] w-56 border border-outline-variant rounded-xl p-1.5 outline-none",
                                "backdrop-blur-[var(--blur-overlay-xl)] backdrop-saturate-[var(--glass-saturate)]",
                                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                                "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                                "data-[side=right]:slide-in-from-left-4 data-[side=bottom]:slide-in-from-top-4",
                                "duration-base ease-out"
                            )}
                            style={{ background: "color-mix(in srgb, var(--md-sys-color-surface-container) 80%, transparent)" }}
                        >
                            {/* Header */}
                            <div className="px-3 pt-2.5 pb-2">
                                <div className="flex items-center gap-2">
                                    <Icons.navigation.tv className="w-3 h-3 text-on-surface-variant opacity-75" />
                                    <p className="text-caption font-black uppercase tracking-cinema-lg text-on-surface-variant">
                                        Modo TV
                                    </p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-outline-variant mx-2 mb-1" />

                            {/* Movie option */}
                            <PickerOption
                                id="tv-mode-movie"
                                onClick={() => pick("movie")}
                                icon={<Icons.media.clapperboard className="w-4 h-4 text-on-surface-variant" />}
                                iconBg="bg-surface-container-high border-outline-variant"
                                label="Películas"
                                accentColor="group-hover:text-on-surface"
                            />

                            {/* Episode option */}
                            <PickerOption
                                id="tv-mode-episode"
                                onClick={() => pick("episode")}
                                icon={<Icons.navigation.tv className="w-4 h-4 text-on-surface-variant" />}
                                iconBg="bg-surface-container-high border-outline-variant"
                                label="Series"
                                accentColor="group-hover:text-on-surface"
                            />
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            </div>

        </>
    )
}

// ─── Picker Option Sub-component ──────────────────────────────────────────────

interface PickerOptionProps {
    id: string
    onClick: () => void
    icon: React.ReactNode
    iconBg: string
    label: string
    accentColor: string
}

function PickerOption({ id, onClick, icon, iconBg, label, accentColor }: PickerOptionProps) {
    return (
        <button
            id={id}
            role="menuitem"
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-transparent hover:bg-surface-container-high border border-transparent hover:border-outline-variant transition-all duration-base text-left group active:scale-95"
        >
            {/* Icon badge */}
            <div className={cn(
                "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-transform duration-base",
                iconBg,
                "group-hover:scale-110"
            )}>
                {icon}
            </div>

            {/* Text */}
            <div>
                <p className={cn(
                    "text-sm font-bold text-on-surface transition-colors duration-base",
                    accentColor
                )}>
                    {label}
                </p>
            </div>

            {/* Arrow hint */}
            <span
                className="ml-auto text-on-surface-variant/50 group-hover:text-on-surface-variant text-xs transition-all duration-base group-hover:translate-x-1"
            >
                ›
            </span>
        </button>
    )
}
