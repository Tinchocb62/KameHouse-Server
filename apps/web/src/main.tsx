import { __isDesktop__ } from "@/types/constants"
import { ClientProviders, queryClient } from "@/app/client-providers"
import "./app/globals.css"
import "@/lib/desktop-bridge"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import React from "react"
import ReactDOM from "react-dom/client"
import { routeTree } from "./routeTree.gen"
import "@fontsource-variable/outfit/wght.css"
import "@fontsource/space-mono/400.css"
import "@fontsource/space-mono/700.css"

const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    context: {
        queryClient,
    },
    scrollRestoration: true,
    defaultPreloadStaleTime: 30000,
})

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}

// React Scan para profiling visual, detección de re-renders y generador de prompts para IA
if (typeof window !== "undefined" && import.meta.env.DEV) {
    import("react-scan").then(({ scan }) => {
        scan({
            enabled: true,
            log: false,
        })
    }).catch(() => {})
}

// Global error telemetry — capture unhandled errors and promise rejections.
// In desktop (Tauri) mode the errors are also emitted to the Rust-side event
// bus so they appear in the app's native log file.
window.addEventListener("unhandledrejection", (event) => {
    const raw = event.reason
    let reason: { message: string; stack?: string }
    if (raw instanceof Error) {
        reason = { message: raw.message, stack: raw.stack }
    } else if (raw && typeof raw === "object") {
        // Non-Error rejections (e.g. a rejected fetch/Response or an API error
        // object) stringify to "[object Object]" and lose all info. Serialize the
        // object so the log is actually actionable.
        let serialized: string
        try {
            serialized = JSON.stringify(raw, Object.getOwnPropertyNames(raw))
        } catch {
            serialized = String(raw)
        }
        reason = { message: serialized }
    } else {
        reason = { message: String(raw) }
    }
    console.error("[global] Unhandled promise rejection:", reason)
    try {
        if (typeof (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== "undefined") {
            import("@tauri-apps/api/event").then(({ emit }) =>
                emit("web-error", { type: "unhandledrejection", ...reason }).catch(() => {})
            ).catch(() => {})
        }
    } catch { /* non-fatal */ }
})

window.addEventListener("error", (event) => {
    const info = { message: event.message, filename: event.filename, line: event.lineno, col: event.colno }
    console.error("[global] Uncaught error:", info)
    try {
        if (typeof (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== "undefined") {
            import("@tauri-apps/api/event").then(({ emit }) =>
                emit("web-error", { type: "error", ...info }).catch(() => {})
            ).catch(() => {})
        }
    } catch { /* non-fatal */ }
})

function init() {
    // Renderizamos la UI de inmediato para que la pantalla de carga se muestre sin ningún retraso
    ReactDOM.createRoot(document.getElementById("root")!).render(
        <ClientProviders>
            <RouterProvider router={router} />
        </ClientProviders>,
    )

    // En segundo plano, si estamos en Tauri, resolvemos el puerto dinámico si está disponible
    const hasTauriRuntime = typeof (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== "undefined"
    if (__isDesktop__ && hasTauriRuntime) {
        import("@tauri-apps/api/core").then(({ invoke }) => {
            invoke<number>("get_local_server_port")
                .then((port) => {
                    if (port) {
                        window.__KAMEHOUSE_PORT__ = port
                        // Refrescamos la consulta de status con el nuevo puerto si corresponde
                        queryClient.invalidateQueries({ queryKey: ["/status"] })
                    }
                })
                .catch((e) => {
                    console.error("[Desktop] Failed to get dynamic server port", e)
                })
        }).catch(() => {})
    }
}

init()
