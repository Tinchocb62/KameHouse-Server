import { __DEV_SERVER_PORT } from "@/lib/server/config"
import { __isDesktop__ } from "@/types/constants"

function devOrProd(dev: string, prod: string): string {
    return import.meta.env.MODE === "development" ? dev : prod
}

/**
 * WebSocket URL for `/api/v1/ws`, derived from the same rules as HTTP base URL.
 */
export function getApiWebSocketUrl(): string {
    const base = getServerBaseUrl()
    if (base.startsWith("http://")) return base.replace("http://", "ws://") + "/api/v1/ws"
    if (base.startsWith("https://")) return base.replace("https://", "wss://") + "/api/v1/ws"
    if (typeof window !== "undefined") {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
        return `${protocol}//${window.location.host}/api/v1/ws`
    }
    return `ws://127.0.0.1:${__DEV_SERVER_PORT}/api/v1/ws`
}

export function getServerBaseUrl(removeProtocol: boolean = false): string {
    if (typeof window !== "undefined") {
        const o = window.location?.origin ?? ""
        if (o.includes("wails.localhost") || o.startsWith("wails://")) {
            const port = (window as any).__KAMEHOUSE_PORT__ || __DEV_SERVER_PORT
            let ret = `http://127.0.0.1:${port}`
            if (removeProtocol) {
                ret = ret.replace("http://", "").replace("https://", "")
            }
            return ret
        }
    }

    if (__isDesktop__) {
        let ret: string
        if (import.meta.env.MODE === "development") {
            // Igual que en web: con la UI servida por Rsbuild (`npm run dev`), usar base vacía
            // para que HTTP/WS vayan al mismo origen y el proxy en `/api` apunte al backend real
            // (`KAMEHOUSE_DEV_API_PORT`, etc.). Evita desalinear desktop dev con un `__DEV_SERVER_PORT` fijo.
            if (typeof window !== "undefined") {
                const o = window.location?.origin ?? ""
                if (o.startsWith("http://") || o.startsWith("https://")) {
                    ret = ""
                } else {
                    const port = (window as any).__KAMEHOUSE_PORT__ || __DEV_SERVER_PORT
                    ret = `http://127.0.0.1:${port}`
                }
            } else {
                ret = `http://127.0.0.1:${__DEV_SERVER_PORT}`
            }
        } else if (typeof window !== "undefined") {
            const o = window.location?.origin ?? ""
            if (o.startsWith("http://") || o.startsWith("https://")) {
                ret = o
            } else {
                const port = (window as any).__KAMEHOUSE_PORT__ || __DEV_SERVER_PORT
                ret = `http://127.0.0.1:${port}`
            }
        } else {
            ret = `http://127.0.0.1:${__DEV_SERVER_PORT}`
        }
        if (removeProtocol) {
            ret = ret.replace("http://", "").replace("https://", "")
        }
        return ret
    }

    // For standard web environments (dev proxy or production self-hosted),
    // relative paths are preferred because the server and client share an origin.
    // If removeProtocol is explicitly requested, we shouldn't return an empty string if we need a host,
    // but typically removeProtocol implies an absolute host.
    // However, returning "" implies absolute path `/api/v1/...` which the browser resolves correctly.
    if (import.meta.env.MODE === "development") {
        return ""
    }

    const ret = typeof window !== "undefined"
        ? (devOrProd("", "")) // Use relative implicitly for web
        : ""
    return ret
}
