import { useDirectorySelector } from "@/api/hooks/directory_selector.hooks"

import { Button, IconButton } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Popover } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select } from "@/components/ui/select"
import { TextInput, TextInputProps } from "@/components/ui/text-input"
import { useBoolean } from "@/hooks/use-disclosure"
import { upath } from "@/lib/helpers/upath"
import React from "react"
import { Icons } from "@/components/ui/icons"
import { useDebounce } from "use-debounce"

export type DirectorySelectorProps = {
    defaultValue?: string
    onSelect: (path: string) => void
    shouldExist?: boolean
    value: string
    libraryPathSelectionProps?: {
        showLibrarySelector?: boolean
        selectedLibrary?: string
        libraryOptions?: { label: string; value: string }[]
        handleLibraryPathSelect: (path: string) => void
    }
} & Omit<TextInputProps, "onSelect" | "value">

export const DirectorySelector = React.memo(React.forwardRef<HTMLInputElement, DirectorySelectorProps>(function (props: DirectorySelectorProps, ref: React.ForwardedRef<HTMLInputElement>) {

    const {
        defaultValue,
        onSelect,
        value,
        shouldExist,
        libraryPathSelectionProps: libraryProps,
        label,
        ...rest
    } = props

    const sanitizePath = React.useCallback((path: string) => {
        if (!path) return ""
        return upath.normalizeSafe(path.replace(/[<>"]/g, ""))
    }, [])

    const [input, setInputRaw] = React.useState(defaultValue ? sanitizePath(defaultValue) : "")
    const [debouncedInput] = useDebounce(input, 300)
    const selectorState = useBoolean(false)

    const setInput = React.useCallback((newInput: string) => {
        setInputRaw(sanitizePath(newInput))
    }, [sanitizePath])

    const { data, isLoading } = useDirectorySelector(debouncedInput)

    React.useEffect(() => {
        if (value !== input) {
            setInput(value)
        }
    }, [value])

    React.useEffect(() => {
        if (input === ".") {
            setInputRaw("")
        }
    }, [input])

    const onSelectRef = React.useRef(onSelect)
    React.useEffect(() => {
        onSelectRef.current = onSelect
    })

    const updateEffectFirst = React.useRef(true)
    React.useEffect(() => {
        if (updateEffectFirst.current) {
            updateEffectFirst.current = false
            return
        }
        const trimmedValue = debouncedInput.trim()
        onSelectRef.current(trimmedValue)
    }, [debouncedInput])

    const checkDirectoryExists = React.useCallback(() => {
        // Prevent auto-clearing user input so typos can be corrected and the error indicator is visible
    }, [])

    const [librarySelectionOpen, setLibrarySelectionOpen] = React.useState(false)

    return (
        <>
            <div className="space-y-1">
                <div className="relative">
                    <TextInput
                        leftIcon={<Icons.status.folder />}
                        {...rest}
                        label={<div className="flex items-center gap-1">
                            {label}
                            {libraryProps?.showLibrarySelector && (
                                <Popover
                                    open={librarySelectionOpen}
                                    onOpenChange={setLibrarySelectionOpen}
                                    className="w-[min(400px,calc(100vw-2rem))] p-2 sm:ml-[30px]"
                                    sideOffset={-4}
                                    trigger={<Button size="sm" intent="gray-link" leftIcon={<Icons.ui.chevronsUpDown />} className="!text-[--muted]">
                                        Change library
                                    </Button>}
                                >
                                    <Select
                                        value={libraryProps.selectedLibrary}
                                        options={libraryProps.libraryOptions}
                                        onValueChange={v => {
                                            libraryProps.handleLibraryPathSelect(v)
                                            setLibrarySelectionOpen(false)
                                        }}
                                    />
                                </Popover>
                            )}
                        </div>}
                        value={input}
                        rightIcon={<div className="flex">
                            {isLoading ? null : (data?.exists ?
                                <Icons.ui.check className="text-status-success" /> : shouldExist ?
                                    input.length > 0 ? <Icons.ui.close className="text-status-error" /> : null : <Icons.status.folderPlus />)}
                        </div>}
                        onChange={e => {
                            setInput(e.target.value ?? "")
                        }}
                        ref={ref}
                        onBlur={checkDirectoryExists}
                    />

                    <div className="absolute z-[1] top-0 right-0 flex items-center">
                        <Icons.status.folderOpen
                            className="text-2xl cursor-pointer"
                            onClick={selectorState.on}
                        />
                    </div>
                </div>
            </div>
            <Modal
                open={selectorState.active}
                onOpenChange={v => {
                    selectorState.toggle()
                    if (!v) {
                        checkDirectoryExists()
                    }
                }}
                title="Select a directory"
                contentClass="mt-4 space-y-2 max-w-4xl"
            >
                <div className="flex gap-2 items-center">
                    <IconButton
                        onClick={() => data?.basePath && setInput(data?.basePath)}
                        intent="gray-basic"
                        size="sm"
                        icon={<Icons.navigation.chevronLeft />}
                        disabled={(!data?.basePath?.length || data?.basePath?.length === 1)}
                    />
                    <TextInput
                        leftIcon={<Icons.status.folder />}
                        value={input}
                        rightIcon={isLoading ? null : (data?.exists ?
                            <Icons.ui.check className="text-status-success" /> : shouldExist ?
                                <Icons.ui.close className="text-status-error" /> : <Icons.status.folderPlus />)}
                        onChange={e => {
                            setInput(e.target.value ?? "")
                        }}
                        onClick={() => {
                            if (shouldExist) selectorState.on()
                        }}
                        ref={ref}
                    />
                </div>

                {(!data?.exists && data?.suggestions && data.suggestions.length > 0) &&
                    <div
                        className="w-full flex flex-none flex-nowrap overflow-x-auto gap-2 items-center rounded-[--radius-md]"
                    >
                        <div className="flex-none">Suggestions:</div>
                        {data.suggestions.map(folder => (
                            <div
                                key={folder.Path}
                                className="py-1 flex items-center gap-2 text-sm px-3 rounded-[--radius-md] border flex-none cursor-pointer bg-gray-900 hover:bg-gray-800"
                                onClick={() => setInput(folder.Path)}
                            >
                                <Icons.status.folder className="w-4 h-4 text-white/60" />
                                <span className="break-normal">{folder.Name}</span>
                            </div>
                        ))}
                    </div>}


                {(data && !!data?.Directories?.length) &&
                    <ScrollArea
                        className="h-60 rounded-[--radius-md] border !mt-0"
                    >
                        {data.Directories.map(folder => (
                            <div
                                key={folder.Path}
                                className="flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-gray-800"
                                onClick={() => setInput(folder.Path)}
                            >
                                <Icons.status.folder className="w-4 h-4 text-white/60" />
                                <span className="break-normal">{folder.Name}</span>
                            </div>
                        ))}
                    </ScrollArea>}
            </Modal>
        </>
    )

}))
