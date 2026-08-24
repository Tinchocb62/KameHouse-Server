function parseDevApiPort(): number {
    const raw = import.meta.env.SEA_PUBLIC_DEV_API_PORT
    if (raw == null || raw === "") return 43212
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0 || n > 65535) return 43212
    return n
}

export const __DEV_SERVER_PORT = parseDevApiPort()
