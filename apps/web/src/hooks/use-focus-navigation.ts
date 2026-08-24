import { useEffect, useCallback, useRef } from "react"

interface SpatialNode {
    element: HTMLElement
    rect: DOMRect
    centerX: number
    centerY: number
}

interface UseFocusNavigationOptions {
    /** Container ref that holds the focusable elements */
    containerRef: React.RefObject<HTMLElement>
    /** Whether D-pad navigation is enabled */
    enabled?: boolean
    /** Selector for focusable elements within the container */
    focusableSelector?: string
    /** Called when Escape key is pressed */
    onEscape?: () => void
    /** Called when Enter/OK key is pressed on a focused element */
    onEnter?: (element: HTMLElement) => void
    /** Navigation mode: 'four-way' for TV, 'two-way' for horizontal carousels */
    direction?: "four-way" | "two-way"
}

/**
 * Calcula un puntaje de idoneidad para navegar desde un nodo actual a un candidato
 * en la dirección dada. Un puntaje más bajo significa mejor candidato.
 *
 * Utiliza distancia euclidiana ponderada con penalización por dirección opuesta.
 */
function calculateScore(
    current: SpatialNode,
    candidate: SpatialNode,
    direction: "left" | "right" | "up" | "down"
): number {
    const dx = candidate.centerX - current.centerX
    const dy = candidate.centerY - current.centerY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance === 0) return Infinity

    // Determinar si el candidato está en la dirección correcta
    let isInDirection = false
    let perpendicularPenalty = 1.0

    switch (direction) {
        case "right":
            isInDirection = dx > 0
            // Penalizar candidatos que están muy arriba o abajo
            perpendicularPenalty = 1.0 + Math.abs(dy) / (Math.abs(dx) + 1) * 0.5
            break
        case "left":
            isInDirection = dx < 0
            perpendicularPenalty = 1.0 + Math.abs(dy) / (Math.abs(dx) + 1) * 0.5
            break
        case "down":
            isInDirection = dy > 0
            perpendicularPenalty = 1.0 + Math.abs(dx) / (Math.abs(dy) + 1) * 0.5
            break
        case "up":
            isInDirection = dy < 0
            perpendicularPenalty = 1.0 + Math.abs(dx) / (Math.abs(dy) + 1) * 0.5
            break
    }

    // Si no está en la dirección correcta, penalizar fuertemente
    if (!isInDirection) {
        return distance * 3.0
    }

    return distance * perpendicularPenalty
}

/**
 * Obtiene el SpatialNode de un elemento HTML.
 */
function getSpatialNode(element: HTMLElement): SpatialNode {
    const rect = element.getBoundingClientRect()
    return {
        element,
        rect,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
    }
}

/**
 * Hook para navegación espacial D-pad/remote control en TV browsers.
 * Utiliza cálculo de distancias euclidianas para encontrar el elemento
 * más cercano en la dirección de navegación.
 *
 * Ejemplo de uso:
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null)
 * useFocusNavigation({
 *     containerRef,
 *     enabled: controlsVisible,
 *     onEscape: handleClose,
 *     direction: "four-way",
 * })
 * ```
 */
export function useFocusNavigation({
    containerRef,
    enabled = true,
    focusableSelector = 'button, [role="button"], input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
    onEscape,
    onEnter,
    direction = "four-way",
}: UseFocusNavigationOptions) {
    const focusedElementRef = useRef<HTMLElement | null>(null)

    const getFocusableSpatialNodes = useCallback((): SpatialNode[] => {
        if (!containerRef.current) return []
        const elements = Array.from(
            containerRef.current.querySelectorAll<HTMLElement>(focusableSelector)
        )
        const nodes: SpatialNode[] = []
        for (const el of elements) {
            if (el.offsetParent === null && el.offsetWidth === 0) continue
            const rect = el.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
                nodes.push({
                    element: el,
                    rect,
                    centerX: rect.left + rect.width / 2,
                    centerY: rect.top + rect.height / 2,
                })
            }
        }
        return nodes
    }, [containerRef, focusableSelector])

    const findBestCandidate = useCallback(
        (
            current: SpatialNode,
            nodes: SpatialNode[],
            arrowDirection: "left" | "right" | "up" | "down"
        ): HTMLElement | null => {
            let bestCandidate: HTMLElement | null = null
            let bestScore = Infinity

            for (const candidateNode of nodes) {
                if (candidateNode.element === current.element) continue

                const score = calculateScore(current, candidateNode, arrowDirection)
                if (score < bestScore) {
                    bestScore = score
                    bestCandidate = candidateNode.element
                }
            }

            return bestCandidate
        },
        []
    )

    const focusElement = useCallback(
        (element: HTMLElement | null) => {
            if (element) {
                element.focus()
                focusedElementRef.current = element
            }
        },
        []
    )

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!enabled) return

            const nodes = getFocusableSpatialNodes()
            if (nodes.length === 0) return

            const currentElement = focusedElementRef.current || document.activeElement as HTMLElement
            const currentNode = nodes.find(n => n.element === currentElement) || nodes[0]

            // Si no hay elemento focalizado, enfocar el primero
            if (!currentElement || !nodes.some(n => n.element === currentElement)) {
                if (nodes.length > 0) {
                    focusElement(nodes[0].element)
                }
                return
            }

            switch (e.key) {
                case "ArrowRight": {
                    e.preventDefault()
                    if (direction === "two-way") {
                        const idx = nodes.findIndex(n => n.element === currentElement)
                        if (idx >= 0 && idx < nodes.length - 1) {
                            focusElement(nodes[idx + 1].element)
                        }
                    } else {
                        const best = findBestCandidate(currentNode, nodes, "right")
                        if (best) focusElement(best)
                    }
                    break
                }

                case "ArrowLeft": {
                    e.preventDefault()
                    if (direction === "two-way") {
                        const idx = nodes.findIndex(n => n.element === currentElement)
                        if (idx > 0) {
                            focusElement(nodes[idx - 1].element)
                        }
                    } else {
                        const best = findBestCandidate(currentNode, nodes, "left")
                        if (best) focusElement(best)
                    }
                    break
                }

                case "ArrowDown": {
                    e.preventDefault()
                    if (direction === "two-way") return
                    const best = findBestCandidate(currentNode, nodes, "down")
                    if (best) focusElement(best)
                    break
                }

                case "ArrowUp": {
                    e.preventDefault()
                    if (direction === "two-way") return
                    const best = findBestCandidate(currentNode, nodes, "up")
                    if (best) focusElement(best)
                    break
                }

                case "Enter":
                case "OK": {
                    e.preventDefault()
                    onEnter?.(currentElement)
                    currentElement.click()
                    break
                }

                case "Escape":
                case "Return": {
                    e.preventDefault()
                    onEscape?.()
                    break
                }

                default:
                    break
            }
        },
        [enabled, getFocusableSpatialNodes, findBestCandidate, focusElement, onEnter, onEscape, direction]
    )

    useEffect(() => {
        if (!enabled) return

        const container = containerRef.current
        if (!container) return

        container.addEventListener("keydown", handleKeyDown)
        return () => {
            container.removeEventListener("keydown", handleKeyDown)
        }
    }, [enabled, containerRef, handleKeyDown])

    return {
        /** Programmatically focus an element */
        focusElement,
        /** Get the currently focused element */
        getFocusedElement: () => focusedElementRef.current,
        /** Reset focus (clear tracked element) */
        resetFocus: () => {
            focusedElementRef.current = null
        },
    }
}
