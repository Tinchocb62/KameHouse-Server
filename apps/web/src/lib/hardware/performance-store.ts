import { create } from "zustand"
import { persist } from "zustand/middleware"
import { detectHardwareSpecs, type HardwareSpecs, type HardwareTier } from "./hardware-profiler"

export type PerformanceProfile = "auto" | "ultra" | "balanced" | "eco"

interface PerformanceState {
    performanceProfile: PerformanceProfile
    autoGovernorEnabled: boolean
    autoThrottleActive: boolean
    hardwareSpecs: HardwareSpecs | null
    isDetecting: boolean

    detectHardware: (forceRefresh?: boolean) => Promise<HardwareSpecs>
    setPerformanceProfile: (profile: PerformanceProfile) => void
    setAutoGovernorEnabled: (enabled: boolean) => void
    setAutoThrottleActive: (active: boolean) => void
    getEffectiveTier: () => HardwareTier
    isHeavyEffectsAllowed: () => boolean
}

export const selectEffectiveTier = (state: PerformanceState): HardwareTier => {
    if (state.autoThrottleActive) return "low_power"
    if (state.performanceProfile === "ultra") return "high"
    if (state.performanceProfile === "balanced") return "balanced"
    if (state.performanceProfile === "eco") return "low_power"
    return state.hardwareSpecs?.detectedTier || "balanced"
}

export const selectIsHeavyEffectsAllowed = (state: PerformanceState): boolean => {
    const tier = selectEffectiveTier(state)
    return tier === "high" || tier === "balanced"
}

export const usePerformanceStore = create<PerformanceState>()(
    persist(
        (set, get) => ({
            performanceProfile: "auto",
            autoGovernorEnabled: true,
            autoThrottleActive: false,
            hardwareSpecs: null,
            isDetecting: false,

            detectHardware: async (forceRefresh = false) => {
                const currentSpecs = get().hardwareSpecs
                if (currentSpecs && !forceRefresh) {
                    return currentSpecs
                }
                set({ isDetecting: true })
                try {
                    const specs = await detectHardwareSpecs(forceRefresh)
                    set({ hardwareSpecs: specs, isDetecting: false })
                    return specs
                } catch (err) {
                    set({ isDetecting: false })
                    throw err
                }
            },

            setPerformanceProfile: (performanceProfile) => {
                set({ performanceProfile })
            },

            setAutoGovernorEnabled: (autoGovernorEnabled) => {
                set({ autoGovernorEnabled })
                if (!autoGovernorEnabled) {
                    set({ autoThrottleActive: false })
                }
            },

            setAutoThrottleActive: (autoThrottleActive) => {
                set({ autoThrottleActive })
            },

            getEffectiveTier: (): HardwareTier => {
                return selectEffectiveTier(get())
            },

            isHeavyEffectsAllowed: (): boolean => {
                return selectIsHeavyEffectsAllowed(get())
            },
        }),
        {
            name: "kamehouse-performance-settings",
            partialize: (state) => ({
                performanceProfile: state.performanceProfile,
                autoGovernorEnabled: state.autoGovernorEnabled,
                hardwareSpecs: state.hardwareSpecs,
            }),
        }
    )
)

// Auto-run detection and display calibration on initial client boot only when not yet cached
if (typeof window !== "undefined") {
    const runIdleDetection = () => {
        const store = usePerformanceStore.getState()
        if (!store.hardwareSpecs) {
            store.detectHardware(false).catch(() => {})
        }
    }

    if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(runIdleDetection, { timeout: 3000 })
    } else {
        setTimeout(runIdleDetection, 1500)
    }
}
