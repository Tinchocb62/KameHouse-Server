import { useEffect, useRef } from "react"
import { useAppStore } from "@/lib/store"
import { useLocation } from "@tanstack/react-router"

interface CachedNode {
    el: HTMLElement
    rect: DOMRect
}

export function useTvDpad() {
    const tvMode = useAppStore((state) => state.tvMode)
    const isVideoActive = useAppStore((state) => state.isVideoActive)
    const location = useLocation()
    
    // Caches
    const nodesCache = useRef<CachedNode[]>([])
    const needsRefresh = useRef(true)

    useEffect(() => {
        if (tvMode) {
            document.documentElement.setAttribute("data-tv", "true")
        } else {
            document.documentElement.removeAttribute("data-tv")
        }
    }, [tvMode])

    useEffect(() => {
        // Invalidate cache on route change
        needsRefresh.current = true
    }, [location.pathname])

    useEffect(() => {
        if (!tvMode || isVideoActive) return

        const SELECTOR =
            'a[href], button:not([disabled]), [role="button"], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

        function refreshCache() {
            const rawNodes = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR))
            const newCache: CachedNode[] = []
            
            for (const el of rawNodes) {
                if (el.offsetParent === null) continue
                const rect = el.getBoundingClientRect()
                if (rect.width > 0 && rect.height > 0) {
                    newCache.push({ el, rect })
                }
            }
            
            nodesCache.current = newCache
            needsRefresh.current = false
        }

        // Use MutationObserver to detect DOM changes and invalidate cache
        const observer = new MutationObserver(() => {
            needsRefresh.current = true
        })
        observer.observe(document.body, { childList: true, subtree: true })

        // Scroll and Resize also invalidate the rect positions
        let rafId: number | null = null
        const handleLayoutChange = () => {
            if (rafId !== null) return
            rafId = requestAnimationFrame(() => {
                needsRefresh.current = true
                rafId = null
            })
        }

        window.addEventListener("scroll", handleLayoutChange, { passive: true, capture: true })
        window.addEventListener("resize", handleLayoutChange, { passive: true })

        function center(rect: DOMRect) {
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        }

        function score(
            from: { x: number; y: number },
            to: { x: number; y: number },
            dir: "up" | "down" | "left" | "right"
        ): number {
            const dx = to.x - from.x
            const dy = to.y - from.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist === 0) return Infinity

            let inDir = false
            let perp = 1
            switch (dir) {
                case "right": inDir = dx > 0; perp = 1 + (Math.abs(dy) / (Math.abs(dx) + 1)) * 0.5; break
                case "left":  inDir = dx < 0; perp = 1 + (Math.abs(dy) / (Math.abs(dx) + 1)) * 0.5; break
                case "down":  inDir = dy > 0; perp = 1 + (Math.abs(dx) / (Math.abs(dy) + 1)) * 0.5; break
                case "up":    inDir = dy < 0; perp = 1 + (Math.abs(dx) / (Math.abs(dy) + 1)) * 0.5; break
            }
            return inDir ? dist * perp : dist * 3
        }

        function findBest(currentEl: HTMLElement, dir: "up" | "down" | "left" | "right"): HTMLElement | null {
            if (needsRefresh.current || nodesCache.current.length === 0) {
                refreshCache()
            }
            
            const currentCache = nodesCache.current.find(n => n.el === currentEl)
            const cc = currentCache ? center(currentCache.rect) : center(currentEl.getBoundingClientRect())

            let bestEl: HTMLElement | null = null
            let bestScore = Infinity

            for (const { el, rect } of nodesCache.current) {
                if (el === currentEl) continue
                const s = score(cc, center(rect), dir)
                if (s < bestScore) { bestScore = s; bestEl = el }
            }
            return bestEl
        }

        function handleKeyDown(e: KeyboardEvent) {
            const dirMap: Record<string, "up" | "down" | "left" | "right"> = {
                ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
            }
            const dir = dirMap[e.key]
            if (!dir) return

            e.preventDefault()
            const active = document.activeElement as HTMLElement
            
            if (needsRefresh.current || nodesCache.current.length === 0) {
                refreshCache()
            }

            const nodes = nodesCache.current.map(n => n.el)

            if (!active || !nodes.includes(active)) {
                nodes[0]?.focus()
                return
            }

            findBest(active, dir)?.focus()
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => {
            document.removeEventListener("keydown", handleKeyDown)
            window.removeEventListener("scroll", handleLayoutChange, { capture: true })
            window.removeEventListener("resize", handleLayoutChange)
            observer.disconnect()
            if (rafId !== null) cancelAnimationFrame(rafId)
        }
    }, [tvMode, isVideoActive])
}
