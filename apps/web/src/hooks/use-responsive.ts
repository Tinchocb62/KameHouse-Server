import { useSyncExternalStore } from "react"

export interface ResponsiveBreakpoints {
    isMobile: boolean
    isTablet: boolean
    isDesktop: boolean
    isWide: boolean
}

const SERVER_SNAPSHOT: ResponsiveBreakpoints = Object.freeze({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isWide: true,
})

function getBreakpoints(): ResponsiveBreakpoints {
    if (typeof window === "undefined") return SERVER_SNAPSHOT
    const w = window.innerWidth
    return {
        isMobile: w <= 767,
        isTablet: w >= 768 && w <= 1023,
        isDesktop: w >= 1024,
        isWide: w >= 1280,
    }
}

function areBreakpointsEqual(a: ResponsiveBreakpoints, b: ResponsiveBreakpoints): boolean {
    return a.isMobile === b.isMobile && a.isTablet === b.isTablet && a.isDesktop === b.isDesktop && a.isWide === b.isWide
}

let currentBreakpoints: ResponsiveBreakpoints = getBreakpoints()
const listeners = new Set<() => void>()

if (typeof window !== "undefined") {
    const update = () => {
        const next = getBreakpoints()
        if (!areBreakpointsEqual(currentBreakpoints, next)) {
            currentBreakpoints = next
            listeners.forEach(cb => cb())
        }
    }
    window.addEventListener("resize", update, { passive: true })
}

export function useResponsive(): ResponsiveBreakpoints {
    return useSyncExternalStore(
        (cb) => {
            listeners.add(cb)
            return () => listeners.delete(cb)
        },
        () => currentBreakpoints,
        () => SERVER_SNAPSHOT
    )
}
