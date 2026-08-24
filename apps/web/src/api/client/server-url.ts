import { __DEV_SERVER_PORT } from "@/lib/server/config"
import { __isDesktop__ } from "@/types/constants"

declare global {
    interface Window {
        /** Puerto dinámico del server local, seteado por el runtime desktop (ver main.tsx). */
        __KAMEHOUSE_PORT__?: number | string
    }
}

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
    // Si el runtime de desktop (Tauri / sidecar) definió el puerto local, conectarse directamente a él.
    if (typeof window !== "undefined" && window.__KAMEHOUSE_PORT__) {
        let ret = `http://127.0.0.1:${window.__KAMEHOUSE_PORT__}`
        if (removeProtocol) {
            ret = ret.replace("http://", "").replace("https://", "")
        }
        return ret
    }

    if (typeof window !== "undefined") {
        const o = window.location?.origin ?? ""
        if (o.includes("wails.localhost") || o.startsWith("wails://")) {
            const port = window.__KAMEHOUSE_PORT__ || __DEV_SERVER_PORT
            let ret = `http://127.0.0.1:${port}`
            if (removeProtocol) {
                ret = ret.replace("http://", "").replace("https://", "")
            }
            return ret
        }
    }

    if (__isDesktop__) {
        let ret: string
        if (typeof window !== "undefined" && window.__KAMEHOUSE_PORT__) {
            ret = `http://127.0.0.1:${window.__KAMEHOUSE_PORT__}`
        } else if (import.meta.env.MODE === "development") {
            if (typeof window !== "undefined") {
                const o = window.location?.origin ?? ""
                if (o.startsWith("http://") || o.startsWith("https://")) {
                    ret = ""
                } else {
                    const port = window.__KAMEHOUSE_PORT__ || __DEV_SERVER_PORT
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
                const port = window.__KAMEHOUSE_PORT__ || __DEV_SERVER_PORT
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
    if (import.meta.env.MODE === "development") {
        return ""
    }

    const ret = typeof window !== "undefined"
        ? (devOrProd("", "")) // Use relative implicitly for web
        : ""
    return ret
}
