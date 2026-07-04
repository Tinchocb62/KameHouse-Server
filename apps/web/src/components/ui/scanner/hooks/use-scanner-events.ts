import { useAppStore } from "@/lib/store"

export function useScannerEvents() {
    const { 
        isScanning, 
        scanProgress, 
        currentScanningFile, 
        events, 
        activeStageIdx, 
        lastFinish, 
        pruneCount 
    } = useAppStore()

    return { 
        isScanning, 
        scanProgress, 
        scanningFile: currentScanningFile, 
        events, 
        activeStageIdx, 
        lastFinish, 
        pruneCount 
    }
}

