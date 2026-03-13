import { useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAppStore } from "@/lib/store";
import { WSEvents, type ScannerMessage } from "@/lib/server/ws-events";
import { toast } from "sonner";
import { getServerBaseUrl } from "@/api/client/server-url";

export function useScannerEvents() {
    const { setScanning, setScanProgress, setScanningFile } = useAppStore();

    const wsUrl = (() => {
        const base = getServerBaseUrl();
        if (base.startsWith("http://")) return base.replace("http://", "ws://") + "/api/v1/ws";
        if (base.startsWith("https://")) return base.replace("https://", "wss://") + "/api/v1/ws";
        return "ws://127.0.0.1:43211/api/v1/ws";
    })();

    useWebSocket(wsUrl, (eventData) => {
        if (!eventData || typeof eventData !== "object" || eventData.type !== WSEvents.LIBRARY_SCAN) return;
        
        const data = eventData.payload as ScannerMessage;

        switch (data.status) {
            case "START":
                setScanning(true);
                setScanProgress(0);
                setScanningFile("");
                toast.info("Starting library scan...", {
                    id: "library-scan-toast",
                    duration: Infinity,
                });
                break;

            case "PROCESSING": {
                const total = data.total || 0;
                const current = data.current || 0;
                const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;
                
                setScanProgress(progress);
                if (data.file) {
                    setScanningFile(data.file);
                }
                break;
            }

            case "FINISH":
                setScanning(false);
                setScanProgress(100);
                toast.success("Scan complete", {
                    id: "library-scan-toast",
                    duration: 3000,
                });
                
                // Wait 3 seconds, then reset progress to 0
                setTimeout(() => {
                    setScanProgress(0);
                    setScanningFile("");
                }, 3000);
                break;
        }
    });
}
