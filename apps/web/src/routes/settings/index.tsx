import { createFileRoute } from "@tanstack/react-router"
import React, { useCallback, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs/tabs"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useGetSettings, useSaveSettings } from "@/api/hooks/settings.hooks"
import { DirectorySelector } from "@/components/ui/directory-selector"
import {
    useListExtensionData,
    useInstallExternalExtension,
    useUninstallExternalExtension,
    type ExtensionData,
} from "@/api/hooks/extensions.hooks"
import { PageHeader } from "@/components/ui/page-header/page-header"

export const Route = createFileRoute("/settings/")({
    component: SettingsPage,
})

function SettingsPage() {
    const { data: settings, isLoading } = useGetSettings()
    const { mutate: saveSettings } = useSaveSettings()
    const [dirSelectorOpen, setDirSelectorOpen] = useState(false)

    // Manejador genérico para guardar booleanos
    const handleToggle = (domain: string, key: string, value: boolean) => {
        if (!settings) return

        saveSettings({
            ...settings,
            [domain]: {
                ...(settings as any)[domain],
                [key]: value
            }
        } as any)
    }

    return (
        <div className="flex-1 w-full flex flex-col bg-background text-white overflow-y-auto pb-6">
            <PageHeader title={<>CONFIGURACIÓN <span className="text-orange-500">GENERAL</span></>} />

            <div className="flex-1 w-full p-6 md:p-10">
                {isLoading ? (
                    <div className="flex items-center justify-center p-20 text-orange-500 text-lg font-semibold animate-pulse">
                        Cargando opciones...
                    </div>
                ) : (
                    <Tabs defaultValue="library" className="w-full flex gap-8">
                    {/* Sidebar de pestañas (Vertical) */}
                    <TabsList className="flex flex-col h-auto w-64 bg-transparent space-y-2 items-start justify-start p-0">
                        <TabsTrigger
                            value="library"
                            className="w-full justify-start px-4 py-3 text-lg justify-start font-medium text-gray-400 data-[state=active]:bg-[#1C1C28] data-[state=active]:text-orange-400 data-[state=active]:border-l-4 data-[state=active]:border-orange-500 rounded-none transition-all"
                        >
                            Biblioteca Local
                        </TabsTrigger>
                        <TabsTrigger
                            value="playback"
                            className="w-full justify-start px-4 py-3 text-lg font-medium text-gray-400 data-[state=active]:bg-[#1C1C28] data-[state=active]:text-orange-400 data-[state=active]:border-l-4 data-[state=active]:border-orange-500 rounded-none transition-all"
                        >
                            Reproductor y Calidad
                        </TabsTrigger>
                        <TabsTrigger
                            value="addons"
                            className="w-full justify-start px-4 py-3 text-lg font-medium text-gray-400 data-[state=active]:bg-[#1C1C28] data-[state=active]:text-orange-400 data-[state=active]:border-l-4 data-[state=active]:border-orange-500 rounded-none transition-all"
                        >
                            Add-ons y Extensiones
                        </TabsTrigger>
                        <TabsTrigger
                            value="interface"
                            className="w-full justify-start px-4 py-3 text-lg font-medium text-gray-400 data-[state=active]:bg-[#1C1C28] data-[state=active]:text-orange-400 data-[state=active]:border-l-4 data-[state=active]:border-orange-500 rounded-none transition-all"
                        >
                            Interfaz de Usuario
                        </TabsTrigger>
                    </TabsList>

                    {/* Contenido principal de configuración */}
                    <div className="flex-1 bg-[#151520] rounded-xl border border-white/5 p-8 shadow-2xl">
                        <TabsContent value="library" className="mt-0">
                            <h2 className="text-2xl font-bold mb-4">Directorios de Biblioteca</h2>
                            <p className="text-gray-400 mb-6 font-medium">Gestiona las rutas locales desde donde KameHouse leerá tu contenido.</p>

                            <div className="space-y-4">
                                {(settings?.library?.libraryPaths || []).map((dir, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-[#1C1C28] rounded-md border border-white/5">
                                        <span className="font-mono text-sm">{dir}</span>
                                        <Button
                                            intent="alert-basic"
                                            className="hover:bg-red-500/10 hover:text-red-400"
                                            onClick={() => {
                                                if (!settings) return
                                                const newPaths = (settings.library?.libraryPaths || []).filter(p => p !== dir)
                                                saveSettings({
                                                    ...settings,
                                                    library: { ...settings.library, libraryPaths: newPaths }
                                                } as any)
                                            }}
                                        >
                                            Eliminar
                                        </Button>
                                    </div>
                                ))}
                                {(!settings?.library?.libraryPaths || settings.library.libraryPaths.length === 0) && (
                                    <div className="p-4 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md">
                                        No hay carpetas configuradas.
                                    </div>
                                )}
                                <Button
                                    intent="primary"
                                    className="mt-4 font-bold text-white px-6"
                                    onClick={() => setDirSelectorOpen(true)}
                                >
                                    + Añadir Carpeta
                                </Button>
                            </div>

                            <DirectorySelector
                                open={dirSelectorOpen}
                                onOpenChange={setDirSelectorOpen}
                                onSelect={(path) => {
                                    if (!settings) return
                                    const currentPaths = settings.library?.libraryPaths || []
                                    if (!currentPaths.includes(path)) {
                                        saveSettings({
                                            ...settings,
                                            library: { ...settings.library, libraryPaths: [...currentPaths, path] }
                                        } as any)
                                    }
                                }}
                            />
                        </TabsContent>

                        <TabsContent value="playback" className="mt-0 space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Reproductor y Calidad</h2>
                                <p className="text-gray-400 mb-6 font-medium">Ajustes prioritarios para la resolución y subtítulos.</p>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-[#1C1C28] rounded-md border border-white/5">
                                        <div>
                                            <p className="font-bold text-lg">Reproductor Externo por defecto</p>
                                            <p className="text-sm text-gray-500">Abre archivos MKV en tu VLC o reproductor del sistema.</p>
                                        </div>
                                        <Switch
                                            value={settings?.mediaPlayer?.defaultPlayer === "vlc"}
                                            onValueChange={(v) => handleToggle('mediaPlayer', 'defaultPlayer', v as any ? "vlc" : "" as any)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-[#1C1C28] rounded-md border border-white/5">
                                        <div>
                                            <p className="font-bold text-lg text-orange-400">Caché Predictivo (Smart Offline)</p>
                                            <p className="text-sm text-gray-500">Descarga el próximo episodio en segundo plano al alcanzar el 80% (Zero-buffering).</p>
                                        </div>
                                        <Switch
                                            value={(settings?.mediaPlayer as any)?.predictiveCache ?? false}
                                            onValueChange={(v) => handleToggle('mediaPlayer', 'predictiveCache', v)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="addons" className="mt-0 space-y-8">
                            {/* Torrent toggles */}
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Streaming por Torrent</h2>
                                <p className="text-gray-400 mb-6 font-medium">Configura el motor de torrents integrado.</p>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-[#1C1C28] rounded-md border border-white/5">
                                        <div>
                                            <p className="font-bold text-lg">Activar TorrentStream</p>
                                            <p className="text-sm text-gray-500">Scrapea torrents y magnets públicamente.</p>
                                        </div>
                                        <Switch
                                            value={settings?.torrentstream?.enabled ?? false}
                                            onValueChange={(v) => handleToggle('torrentstream', 'enabled', v)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-[#1C1C28] rounded-md border border-white/5">
                                        <div>
                                            <p className="font-bold text-lg">Pre-cargar próximo episodio</p>
                                            <p className="text-sm text-gray-500">Mejora la velocidad de carga al encadenar episodios.</p>
                                        </div>
                                        <Switch
                                            value={settings?.torrentstream?.preloadNextStream ?? false}
                                            onValueChange={(v) => handleToggle('torrentstream', 'preloadNextStream', v)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Addon Manager */}
                            <AddonManager />
                        </TabsContent>

                        <TabsContent value="interface" className="mt-0 space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Personalización Visual</h2>
                                <p className="text-gray-400 mb-6 font-medium">Ajusta el tema y opciones misceláneas de la app.</p>

                                <div className="flex items-center justify-between p-4 bg-[#1C1C28] rounded-md border border-white/5">
                                    <div>
                                        <p className="font-bold text-lg">Modo Oscuro Absoluto</p>
                                        <p className="text-sm text-gray-500">Habilitado por defecto en "KameHouse 2.0".</p>
                                    </div>
                                    <Switch value={true} disabled />
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
                )}
            </div>
        </div>
    )
}

// ─── Addon Manager Component ─────────────────────────────────────────────

function AddonManager() {
    const [addonUrl, setAddonUrl] = useState("")
    const [validationError, setValidationError] = useState<string | null>(null)

    const { data: extensions, isLoading: extensionsLoading } = useListExtensionData()
    const { mutate: installAddon, isPending: isInstalling } = useInstallExternalExtension()
    const { mutate: uninstallAddon, isPending: isUninstalling } = useUninstallExternalExtension()

    const handleInstall = useCallback(() => {
        const trimmed = addonUrl.trim()

        // Validate URL
        if (!trimmed) {
            setValidationError("Ingresa una URL válida.")
            return
        }

        try {
            new URL(trimmed)
        } catch {
            setValidationError("La URL no es válida. Ejemplo: https://addon.example.com/manifest.json")
            return
        }

        if (!trimmed.endsWith("manifest.json")) {
            setValidationError("La URL debe terminar en manifest.json")
            return
        }

        setValidationError(null)
        installAddon({ manifestURI: trimmed } as any, {
            onSuccess: () => {
                setAddonUrl("")
            },
            onError: () => {
                setValidationError("Error al instalar el addon. Verifica la URL e intenta de nuevo.")
            },
        })
    }, [addonUrl, installAddon])

    const handleUninstall = useCallback((ext: ExtensionData) => {
        if (!confirm(`¿Desinstalar "${ext.name || ext.id}"?`)) return
        uninstallAddon({ id: ext.id } as any)
    }, [uninstallAddon])

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">
                Add-ons <span className="text-orange-500">HTTP</span>
            </h2>
            <p className="text-gray-400 mb-6 font-medium">
                Instala add-ons externos (estilo Stremio) desde una URL de manifiesto.
            </p>

            {/* Install form */}
            <div className="flex gap-3 items-start mb-6">
                <div className="flex-1">
                    <input
                        id="addon-url-input"
                        type="url"
                        value={addonUrl}
                        onChange={(e) => {
                            setAddonUrl(e.target.value)
                            if (validationError) setValidationError(null)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleInstall()
                        }}
                        placeholder="https://addon.example.com/manifest.json"
                        className="w-full px-4 py-3 bg-[#1C1C28] border border-white/10 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 transition-all text-sm font-mono"
                    />
                    {validationError && (
                        <p className="mt-2 text-sm text-red-400 font-medium">{validationError}</p>
                    )}
                </div>
                <Button
                    id="install-addon-btn"
                    intent="primary"
                    className="font-bold text-white px-6 py-3 whitespace-nowrap min-h-[48px]"
                    onClick={handleInstall}
                    disabled={isInstalling}
                >
                    {isInstalling ? (
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Instalando...
                        </span>
                    ) : (
                        "Instalar Addon"
                    )}
                </Button>
            </div>

            {/* Installed addons list */}
            <div className="space-y-3">
                {extensionsLoading ? (
                    <div className="p-6 text-center text-gray-500 animate-pulse">
                        Cargando extensiones instaladas...
                    </div>
                ) : !extensions || extensions.length === 0 ? (
                    <div className="p-6 bg-[#1C1C28] rounded-md border border-white/5 text-center text-gray-500">
                        No hay add-ons instalados.
                    </div>
                ) : (
                    extensions.map((ext) => (
                        <div
                            key={ext.id}
                            className="flex items-center justify-between p-4 bg-[#1C1C28] rounded-md border border-white/5 group hover:border-orange-500/20 transition-all"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                {/* Icon */}
                                {ext.icon ? (
                                    <img
                                        src={ext.icon}
                                        alt={ext.name}
                                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#0B0B0F]"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                        <span className="text-orange-400 font-black text-lg">
                                            {(ext.name || ext.id || "?").charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="font-bold text-lg truncate">
                                        {ext.name || ext.id}
                                        {ext.version && (
                                            <span className="ml-2 text-xs text-gray-500 font-mono">v{ext.version}</span>
                                        )}
                                    </p>
                                    {ext.description && (
                                        <p className="text-sm text-gray-400 truncate">{ext.description}</p>
                                    )}
                                    <div className="flex gap-3 mt-1">
                                        {ext.type && (
                                            <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded font-medium">
                                                {ext.type}
                                            </span>
                                        )}
                                        {ext.author && (
                                            <span className="text-xs text-gray-500">por {ext.author}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button
                                id={`uninstall-addon-${ext.id}`}
                                intent="alert-basic"
                                className="hover:bg-red-500/10 hover:text-red-400 flex-shrink-0 ml-4 min-h-[48px]"
                                onClick={() => handleUninstall(ext)}
                                disabled={isUninstalling}
                            >
                                Desinstalar
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
