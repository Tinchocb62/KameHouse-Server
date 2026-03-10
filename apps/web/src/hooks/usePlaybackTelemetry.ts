import { useRef, useEffect, useCallback } from "react";

export function usePlaybackTelemetry(mediaId: string) {
    const stateRef = useRef({ currentTime: 0, lastSync: 0 });

    const sync = useCallback((isPaused: boolean, isUnmount: boolean = false) => {
        if (!mediaId) return;
        const now = Date.now();
        const { currentTime, lastSync } = stateRef.current;
        
        if (!isPaused && !isUnmount && now - lastSync < 5000) return;
        stateRef.current.lastSync = now;

        const payload = JSON.stringify({ mediaId, currentTime, isPaused });
        const endpoint = "/api/v1/playback/sync";

        if (isUnmount || isPaused) {
            const blob = new Blob([payload], { type: "application/json" });
            if (!navigator.sendBeacon(endpoint, blob)) {
                fetch(endpoint, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
            }
        } else {
            fetch(endpoint, { method: "POST", body: payload, headers: { "Content-Type": "application/json" } }).catch(() => {});
        }
    }, [mediaId]);

    const reportProgress = useCallback((currentTime: number, isPaused: boolean) => {
        stateRef.current.currentTime = currentTime;
        sync(isPaused);
    }, [sync]);

    useEffect(() => {
        const handleUnload = () => sync(true, true);
        window.addEventListener("beforeunload", handleUnload);
        return () => {
            window.removeEventListener("beforeunload", handleUnload);
            handleUnload();
        };
    }, [sync]);

    return { reportProgress };
}
