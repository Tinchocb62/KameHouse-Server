import { __isDesktop__ } from "@/types/constants"
import { ClientProviders, queryClient } from "@/app/client-providers"
import "./app/globals.css"
import "@/lib/desktop-bridge"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import React from "react"
import ReactDOM from "react-dom/client"
import { routeTree } from "./routeTree.gen"
import "@fontsource-variable/inter"
import "@fontsource-variable/plus-jakarta-sans"
import "@fontsource/bebas-neue/latin-400.css"
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

// react-scan is available for profiling, but opt-in only via VITE_REACT_SCAN=true
// to avoid mandatory internet access on every dev start.
// To enable: VITE_REACT_SCAN=true npm run dev
if (import.meta.env.DEV && import.meta.env.VITE_REACT_SCAN === "true") {
    const script = document.createElement("script")
    script.src = "https://unpkg.com/react-scan/dist/auto.global.js"
    script.crossOrigin = "anonymous"
    document.head.appendChild(script)
}

// Global error telemetry — capture unhandled errors and promise rejections.
// In desktop (Tauri) mode the errors are also emitted to the Rust-side event
// bus so they appear in the app's native log file.
window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason instanceof Error
        ? { message: event.reason.message, stack: event.reason.stack }
        : { message: String(event.reason) }
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

async function init() {
    if (__isDesktop__) {
        try {
            const { invoke } = await import("@tauri-apps/api/core")
            const port = await invoke<number>("get_local_server_port")
            if (port) {
                ;(window as any).__KAMEHOUSE_PORT__ = port
            }
        } catch (e) {
            console.error("[Desktop] Failed to get dynamic server port", e)
        }
    }

    ReactDOM.createRoot(document.getElementById("root")!).render(
        <ClientProviders>
            <RouterProvider router={router} />
        </ClientProviders>,
    )
}

init()
