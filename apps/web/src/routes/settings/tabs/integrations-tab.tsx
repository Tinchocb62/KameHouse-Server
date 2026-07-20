import React from "react"
import { Section, Card, OsToggle, OsSelect } from "../components"
import { SecretField } from "@/components/settings/secret-field"
import { type Control, Controller, useWatch } from "react-hook-form"
import { type SettingsFormValues } from "../index"

interface IntegrationsTabProps {
    control: Control<SettingsFormValues>
}

function ApiKeyCard({ name, connected, children }: { name: string; connected: boolean; children: React.ReactNode }) {
    return (
        <div className="bg-surface-container rounded-container p-6 shadow-elevation-1 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">{name}</h4>
                {connected ? (
                    <div className="flex items-center gap-1.5 bg-brand-success/15 border border-brand-success/25 px-2.5 py-0.5 rounded-full">
                        <span className="text-caption font-black text-brand-success uppercase tracking-widest font-mono">Conectado</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-success shadow-[0_0_6px_hsl(var(--brand-success))]" />
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 bg-surface-container border border-outline-variant px-2.5 py-0.5 rounded-full">
                        <span className="text-caption font-black text-on-surface-variant uppercase tracking-widest font-mono">Sin configurar</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60" />
                    </div>
                )}
            </div>
            {children}
        </div>
    )
}

export function IntegrationsTab({ control }: IntegrationsTabProps) {
    const tmdbApiKey = useWatch({ control, name: "library.tmdbApiKey" })
    const fanartApiKey = useWatch({ control, name: "library.fanartApiKey" })
    const omdbApiKey = useWatch({ control, name: "library.omdbApiKey" })


    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-slow outline-none">
            {/* Bento grids for integrations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ApiKeyCard name="The Movie Database (TMDB)" connected={!!tmdbApiKey}>
                    <Controller
                        control={control}
                        name="library.tmdbApiKey"
                        render={({ field }) => (
                            <SecretField
                                id="tmdb-api-key"
                                label="Clave de la API (V4 Auth Token)"
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Ingresa tu TMDB Auth Token"
                            />
                        )}
                    />
                </ApiKeyCard>

                <ApiKeyCard name="Fanart.tv" connected={!!fanartApiKey}>
                    <Controller
                        control={control}
                        name="library.fanartApiKey"
                        render={({ field }) => (
                            <SecretField
                                id="fanart-api-key"
                                label="Clave de la API (API Key)"
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Ingresa tu Fanart.tv API Key"
                            />
                        )}
                    />
                </ApiKeyCard>

                <ApiKeyCard name="OMDb Service" connected={!!omdbApiKey}>
                    <Controller
                        control={control}
                        name="library.omdbApiKey"
                        render={({ field }) => (
                            <SecretField
                                id="omdb-api-key"
                                label="Clave de la API (API Key)"
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Ingresa tu OMDb API Key"
                            />
                        )}
                    />
                </ApiKeyCard>


            </div>

            {/* Habilitar Proveedores */}
            <Section label="Proveedores de Metadatos">
                <Card className="divide-y divide-outline-variant/4">
                    <Controller
                        control={control}
                        name="library.primaryMetadataProvider"
                        render={({ field }) => {
                            const isTmdb = field.value === "tmdb"
                            return (
                                <OsSelect
                                    label="Proveedor de Metadatos Principal"
                                    description="Fuente primaria para descarga de metadatos y sinopsis."
                                    options={[
                                        { value: "tmdb", label: "TMDB (Recomendado)" },
                                        { value: "anidb", label: "Jikan + AniDB" },
                                    ]}
                                    value={isTmdb ? "tmdb" : "anidb"}
                                    onChange={field.onChange}
                                />
                            )
                        }}
                    />
                    <Controller
                        control={control}
                        name="library.useFallbackMetadataProvider"
                        render={({ field }) => (
                            <OsToggle
                                label="Proveedor de Metadatos de Respaldo (Jikan + AniDB)"
                                description="Habilita fuentes de metadatos secundarias si falla la consulta del servidor principal."
                                checked={!!field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </Card>
            </Section>
        </div>
    )
}
