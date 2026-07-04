import { create } from "zustand"
import { type ScannerMessage } from "@/lib/server/ws-events"

export interface ScanEvent extends ScannerMessage {
    id: string
    timestamp: number
}

export interface ScannerState {
    isScanning: boolean
    scanProgress: number
    currentScanningFile: string
    events: ScanEvent[]
    activeStageIdx: number
    lastFinish: ScanEvent | null
    pruneCount: number
    setScanning: (isScanning: boolean) => void
    setScanProgress: (progress: number) => void
    setScanningFile: (file: string) => void
    setEvents: (events: ScanEvent[] | ((prev: ScanEvent[]) => ScanEvent[])) => void
    setScannerState: (state: Partial<ScannerState>) => void
}

export const useScannerStore = create<ScannerState>((set) => ({
    isScanning: false,
    scanProgress: 0,
    currentScanningFile: "",
    events: [],
    activeStageIdx: -1,
    lastFinish: null,
    pruneCount: 0,
    setScanning: (isScanning) => set({ isScanning }),
    setScanProgress: (scanProgress) => set({ scanProgress }),
    setScanningFile: (currentScanningFile) => set({ currentScanningFile }),
    setEvents: (events) => set((state) => ({ 
        events: typeof events === "function" ? events(state.events) : events 
    })),
    setScannerState: (state) => set((s) => ({ ...s, ...state })),
}))
