import "@total-typescript/ts-reset"

declare global {
    interface AudioTrack {
        id: string;
        kind: string;
        label: string;
        language: string;
        enabled: boolean;
    }

    interface AudioTrackList extends EventTarget {
        readonly length: number;
        onchange: ((this: AudioTrackList, ev: Event) => void) | null;
        onaddtrack: ((this: AudioTrackList, ev: TrackEvent) => void) | null;
        onremovetrack: ((this: AudioTrackList, ev: TrackEvent) => void) | null;

        [index: number]: AudioTrack;

        getTrackById(id: string): AudioTrack | null;
    }

    interface HTMLMediaElement {
        readonly audioTracks: AudioTrackList | undefined;
    }

    interface Window {
        electron?: {
            window: {
                minimize: () => void;
                maximize: () => void;
                close: () => void;
                isMaximized: () => Promise<boolean>;
                isMinimizable: () => Promise<boolean>;
                isMaximizable: () => Promise<boolean>;
                isClosable: () => Promise<boolean>;
                isFullscreen: () => Promise<boolean>;
                setFullscreen: (fullscreen: boolean) => void;
                toggleMaximize: () => void;
                hide: () => void;
                show: () => void;
                isVisible: () => Promise<boolean>;
                setTitleBarStyle: (style: string) => void;
                getCurrentWindow: () => Promise<string>;
                isMainWindow: () => Promise<boolean>;
            };
            localServer: {
                getPort: () => Promise<number>;
            };
            media?: {
                setMetadata: (metadata: Record<string, unknown>) => Promise<boolean>;
                clearSession: () => Promise<boolean>;
                stopAllMedia: () => Promise<boolean>;
            };
            on: (channel: string, callback: (...args: unknown[]) => void) => (() => void) | undefined;
            emit: (channel: string, data?: unknown) => void;
            send: (channel: string, ...args: unknown[]) => void;
            platform: NodeJS.Platform;
            shell: {
                open: (url: string) => Promise<void>;
            };
            clipboard: {
                writeText: (text: string) => Promise<boolean>;
            };
            checkForUpdates: () => Promise<unknown>;
            installUpdate: () => Promise<unknown>;
            killServer: () => Promise<unknown>;
            settings: {
                get: () => Promise<DesktopSettings>;
                set: (settings: Partial<DesktopSettings>) => Promise<DesktopSettings>;
            };
            mpv: {
                isAvailable: () => Promise<boolean>;
                play: (request: {
                    path: string;
                    title?: string;
                    startTime?: number;
                    mediaId?: number;
                    episodeNumber?: number;
                }) => Promise<void>;
                stop: () => Promise<void>;
            };
        };

        __isElectronDesktop__?: boolean;
        __isTauriDesktop__?: boolean;
        __TAURI__?: unknown;
    }
}