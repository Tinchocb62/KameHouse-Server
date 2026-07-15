/**
 * Envuelve un cambio de estado de React en document.startViewTransition si el navegador lo soporta.
 * Esto permite realizar animaciones de transición fluidas en la actualización del DOM.
 */
export function startViewTransition(callback: () => void) {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        const transition = document.startViewTransition(callback)
        // Una transición interrumpida (por otra transición o por navegación) rechaza
        // `finished` con InvalidStateError. Es un final normal, no un error: sin este
        // catch, cada interrupción aparece como "Unhandled promise rejection" en consola.
        transition.finished.catch(() => {})
        transition.ready.catch(() => {})
    } else {
        callback();
    }
}
