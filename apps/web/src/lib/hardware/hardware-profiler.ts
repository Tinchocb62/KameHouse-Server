export type HardwareTier = "high" | "balanced" | "low_power"
export type GpuVendor = "nvidia" | "amd" | "intel" | "apple" | "other"

export interface HardwareSpecs {
    gpuRenderer: string
    gpuVendor: GpuVendor
    isDedicatedGpu: boolean
    cpuCores: number
    deviceMemoryGB: number | null
    screenRefreshRate: number
    devicePixelRatio: number
    screenResolution: string
    detectedTier: HardwareTier
    score: number
    isBatteryPowered?: boolean
}

let cachedSpecs: HardwareSpecs | null = null

/**
 * Measures display refresh rate via requestAnimationFrame delta sampling
 */
async function measureRefreshRate(): Promise<number> {
    return new Promise((resolve) => {
        if (typeof window === "undefined" || !window.requestAnimationFrame) {
            return resolve(60)
        }

        const times: number[] = []
        let count = 0
        const maxFrames = 20

        const frame = (now: number) => {
            times.push(now)
            count++
            if (count < maxFrames) {
                requestAnimationFrame(frame)
            } else {
                const deltas: number[] = []
                for (let i = 1; i < times.length; i++) {
                    deltas.push(times[i] - times[i - 1])
                }
                const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length
                const calculatedFps = Math.round(1000 / avgDelta)

                // Match common refresh rate buckets
                if (calculatedFps >= 220) resolve(240)
                else if (calculatedFps >= 155) resolve(165)
                else if (calculatedFps >= 135) resolve(144)
                else if (calculatedFps >= 110) resolve(120)
                else if (calculatedFps >= 85) resolve(90)
                else if (calculatedFps >= 70) resolve(75)
                else if (calculatedFps >= 50) resolve(60)
                else resolve(calculatedFps)
            }
        }

        requestAnimationFrame(frame)
    })
}

/**
 * Detects GPU renderer string and vendor using WebGL unmasked debug info
 */
function detectGpu(): { renderer: string; vendor: GpuVendor; isDedicated: boolean } {
    try {
        const canvas = document.createElement("canvas")
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null)
        
        if (!gl) {
            return { renderer: "Genérico / Sin Aceleración WebGL", vendor: "other", isDedicated: false }
        }

        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info")
        const renderer = debugInfo
            ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ""
            : gl.getParameter(gl.RENDERER) || "WebGL Renderer"

        const lower = renderer.toLowerCase()
        let vendor: GpuVendor = "other"
        let isDedicated = false

        if (lower.includes("nvidia") || lower.includes("geforce") || lower.includes("rtx") || lower.includes("gtx") || lower.includes("quadro")) {
            vendor = "nvidia"
            isDedicated = true
        } else if (lower.includes("radeon") || lower.includes("amd")) {
            vendor = "amd"
            // Integrated Vega/Radeon Graphics vs dedicated RX
            isDedicated = !lower.includes("vega") || lower.includes("rx") || lower.includes("pro")
        } else if (lower.includes("apple") || lower.includes("m1") || lower.includes("m2") || lower.includes("m3") || lower.includes("m4")) {
            vendor = "apple"
            isDedicated = true
        } else if (lower.includes("intel") || lower.includes("iris") || lower.includes("uhd") || lower.includes("hd graphics") || lower.includes("arc")) {
            vendor = "intel"
            isDedicated = lower.includes("arc")
        }

        let cleanRenderer = renderer
        // Strip ANGLE (vendor, GPU Direct3D11..., D3D11) wrappers for clean UI display
        const angleMatch = renderer.match(/ANGLE \([^,]+,\s*([^,]+)/i)
        if (angleMatch && angleMatch[1]) {
            cleanRenderer = angleMatch[1].replace(/Direct3D\d+.*$/i, "").trim()
        }

        // Clean up WebGL context
        const loseContext = gl.getExtension("WEBGL_lose_context")
        if (loseContext) loseContext.loseContext()

        return {
            renderer: cleanRenderer || renderer || "GPU Integrada / Predeterminada",
            vendor,
            isDedicated
        }
    } catch {
        return { renderer: "Dispositivo de video estándar", vendor: "other", isDedicated: false }
    }
}

/**
 * Executes full hardware profiling analysis and returns hardware specs + assigned tier
 */
export async function detectHardwareSpecs(forceRefresh = false): Promise<HardwareSpecs> {
    if (cachedSpecs && !forceRefresh) {
        return cachedSpecs
    }

    const { renderer, vendor, isDedicated } = detectGpu()
    const cpuCores = typeof navigator !== "undefined" ? (navigator.hardwareConcurrency || 4) : 4
    const deviceMemoryGB = typeof navigator !== "undefined" && "deviceMemory" in navigator
        ? (navigator as unknown as { deviceMemory: number }).deviceMemory
        : null

    const screenRefreshRate = await measureRefreshRate()
    const devicePixelRatio = typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1
    const screenResolution = typeof window !== "undefined" && window.screen
        ? `${window.screen.width}x${window.screen.height}`
        : "1920x1080"

    // Calculate performance score (0 - 150)
    let score = 0

    // CPU score (up to 40)
    score += Math.min(cpuCores * 5, 40)

    // Memory score (up to 30)
    if (deviceMemoryGB) {
        score += Math.min(deviceMemoryGB * 3.75, 30)
    } else {
        score += 25 // Default safe estimation
    }

    // GPU score (up to 60)
    if (isDedicated) {
        score += 55
    } else if (vendor === "apple") {
        score += 55
    } else if (vendor === "intel" && (renderer.toLowerCase().includes("iris") || renderer.toLowerCase().includes("arc"))) {
        score += 40
    } else if (vendor === "amd") {
        score += 40
    } else {
        score += 20 // Basic integrated GPU
    }

    // Refresh rate bonus (up to 20)
    if (screenRefreshRate >= 120) score += 20
    else if (screenRefreshRate >= 75) score += 10

    // Classify tier:
    // If dedicated GPU OR 120Hz+ screen OR score >= 80 -> High Tier (Ultra)
    let detectedTier: HardwareTier = "balanced"
    if (isDedicated || screenRefreshRate >= 120 || score >= 80) {
        detectedTier = "high"
    } else if (score >= 45) {
        detectedTier = "balanced"
    } else {
        detectedTier = "low_power"
    }

    // Check battery if available
    let isBatteryPowered = false
    try {
        if (typeof navigator !== "undefined" && "getBattery" in navigator) {
            const battery = await (navigator as unknown as { getBattery: () => Promise<{ charging: boolean }> }).getBattery()
            if (battery && !battery.charging) {
                isBatteryPowered = true
            }
        }
    } catch {
        // Battery API optional
    }

    cachedSpecs = {
        gpuRenderer: renderer,
        gpuVendor: vendor,
        isDedicatedGpu: isDedicated,
        cpuCores,
        deviceMemoryGB,
        screenRefreshRate,
        devicePixelRatio: Number(devicePixelRatio.toFixed(2)),
        screenResolution,
        detectedTier,
        score,
        isBatteryPowered
    }

    return cachedSpecs
}
