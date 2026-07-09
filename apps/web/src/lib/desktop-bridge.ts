import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';
import { check } from '@tauri-apps/plugin-updater';

const appWindow = getCurrentWindow();
let pendingUpdate: any = null;

export interface ElectronAPI {
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
  startup: {
    ready: () => void;
  };
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  emit: (channel: string, data?: unknown) => void;
  send: (channel: string, ...args: unknown[]) => void;
  platform: NodeJS.Platform;
  shell: {
    open: (url: string) => Promise<void>;
  };
  clipboard: {
    writeText: (text: string) => Promise<boolean>;
  };
  checkForUpdates: () => Promise<{ updateAvailable: boolean; updateInfo: unknown; updateDownloaded: boolean }>;
  installUpdate: () => Promise<boolean>;
  killServer: () => Promise<boolean>;
  settings: {
    get: () => Promise<DesktopSettings>;
    set: (settings: Partial<DesktopSettings>) => Promise<DesktopSettings>;
  };
  mpv: {
    isAvailable: () => Promise<boolean>;
    play: (request: MpvPlayRequest) => Promise<void>;
    stop: () => Promise<void>;
  };
}

export interface MpvPlayRequest {
  /** Absolute file path (or URL) that mpv will open. */
  path: string;
  title?: string;
  startTime?: number;
  mediaId?: number;
  episodeNumber?: number;
}

export interface DesktopSettings {
  minimizeToTray: boolean;
  openInBackground: boolean;
  openAtLaunch: boolean;
  updateChannel: string;
  windowBounds: WindowBounds | null;
  windowMaximized: boolean;
  disableHardwareAcceleration: boolean;
  enableAggressiveGpuFlags: boolean;
  mpvPath?: string | null;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const isTauri = () => {
  try {
    return typeof window !== 'undefined' && !!window.__TAURI__;
  } catch {
    return false;
  }
};

const isElectron = () => {
  try {
    return typeof window !== 'undefined' && !!window.electron && !window.__TAURI__;
  } catch {
    return false;
  }
};

function createElectronBridge(): ElectronAPI {
  const unsubscribeMap = new Map<string, () => Promise<void>>();

  return {
    window: {
      minimize: () => {
        if (isTauri()) {
          appWindow.minimize().catch(console.error);
        }
      },
      maximize: () => {
        if (isTauri()) {
          appWindow.maximize().catch(console.error);
        }
      },
      close: () => {
        if (isTauri()) {
          appWindow.close().catch(console.error);
        }
      },
      isMaximized: async () => {
        if (isTauri()) {
          return await appWindow.isMaximized();
        }
        return false;
      },
      isMinimizable: async () => {
        if (isTauri()) {
          return await appWindow.isMinimizable();
        }
        return false;
      },
      isMaximizable: async () => {
        if (isTauri()) {
          return await appWindow.isMaximizable();
        }
        return false;
      },
      isClosable: async () => {
        if (isTauri()) {
          return await appWindow.isClosable();
        }
        return false;
      },
      isFullscreen: async () => {
        if (isTauri()) {
          return await appWindow.isFullscreen();
        }
        return false;
      },
      setFullscreen: (fullscreen: boolean) => {
        if (isTauri()) {
          appWindow.setFullscreen(fullscreen).catch(console.error);
        }
      },
      toggleMaximize: async () => {
        if (isTauri()) {
          const maximized = await appWindow.isMaximized();
          if (maximized) {
            await appWindow.unmaximize();
          } else {
            await appWindow.maximize();
          }
        }
      },
      hide: () => {
        if (isTauri()) {
          appWindow.hide().catch(console.error);
        }
      },
      show: () => {
        if (isTauri()) {
          appWindow.show().catch(console.error);
          appWindow.setFocus().catch(console.error);
        }
      },
      isVisible: async () => {
        if (isTauri()) {
          return await appWindow.isVisible();
        }
        return false;
      },
      setTitleBarStyle: (_style: string) => {
        // Not applicable in Tauri
      },
      getCurrentWindow: async () => {
        if (isTauri()) {
          const label = appWindow.label;
          return label === 'main' ? 'main' : label;
        }
        return 'unknown';
      },
      isMainWindow: async () => {
        if (isTauri()) {
          return appWindow.label === 'main';
        }
        return false;
      },
    },
    startup: {
      ready: () => {
        if (isTauri()) {
          invoke('startup_renderer_ready').catch(console.error);
        }
      },
    },
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      if (isTauri()) {
        let unsubscribePromise: Promise<() => void> | null = null;
        listen(channel, (event) => {
          callback(event.payload);
        }).then((unsub) => {
          unsubscribePromise = Promise.resolve(unsub);
        });
        unsubscribeMap.set(channel, () => unsubscribePromise?.then((fn) => fn()) || Promise.resolve());
        return () => {
          const unsub = unsubscribeMap.get(channel);
          if (unsub) unsub();
          unsubscribeMap.delete(channel);
        };
      }
      return () => {};
    },
    emit: (_channel: string, _data?: unknown) => {
      // In Tauri, we use listen/emit from the frontend directly
      // This is for compatibility with electron.emit() calls
    },
    send: (channel: string, ...args: unknown[]) => {
      if (isTauri()) {
        switch (channel) {
          case 'restart-server':
            invoke('restart_server').catch(console.error);
            break;
          case 'kill-server':
            invoke('kill_server').catch(console.error);
            break;
          case 'macos-activation-policy-accessory':
            // Not applicable in Tauri
            break;
          case 'macos-activation-policy-regular':
            // Not applicable in Tauri
            break;
          case 'quit-app':
            invoke('kill_server').then(() => {
              // App will exit via sidecar shutdown
            }).catch(console.error);
            break;
          case 'restart-app':
            // Not directly supported, would need custom handling
            break;
        }
      }
    },
    platform: process.platform,
    localServer: {
      getPort: async () => {
        if (isTauri()) {
          try {
            return await invoke<number>('get_local_server_port');
          } catch {
            return 0;
          }
        }
        return 0;
      },
    },
    shell: {
      open: async (url: string) => {
        if (isTauri()) {
          try {
            await invoke('shell_open', { url });
          } catch (e) {
            console.error('[Bridge] Shell open failed:', e);
          }
        }
      },
    },
    clipboard: {
      writeText: async (text: string) => {
        if (isTauri()) {
          try {
            await writeText(text);
            return true;
          } catch (e) {
            console.error('[Bridge] Clipboard write failed:', e);
            return false;
          }
        }
        return false;
      },
    },
    checkForUpdates: async () => {
      if (isTauri()) {
        try {
          const update = await check();
          pendingUpdate = update;
          return {
            updateAvailable: !!update,
            updateInfo: update ? { version: update.version } : null,
            updateDownloaded: false, // Tauri doesn't separate download state
          };
        } catch (e) {
          console.error('[Bridge] Check updates failed:', e);
          return { updateAvailable: false, updateInfo: null, updateDownloaded: false };
        }
      }
      return { updateAvailable: false, updateInfo: null, updateDownloaded: false };
    },
    installUpdate: async () => {
      if (isTauri()) {
        try {
          if (pendingUpdate) {
            await pendingUpdate.downloadAndInstall();
            return true;
          }
          return false;
        } catch (e) {
          console.error('[Bridge] Install update failed:', e);
          return false;
        }
      }
      return false;
    },
    killServer: async () => {
      if (isTauri()) {
        try {
          await invoke('kill_server');
          return true;
        } catch (e) {
          console.error('[Bridge] Kill server failed:', e);
          return false;
        }
      }
      return false;
    },
    settings: {
      get: async () => {
        if (isTauri()) {
          try {
            return await invoke('get_desktop_settings');
          } catch (e) {
            console.error('[Bridge] Get settings failed:', e);
            return {
              minimizeToTray: true,
              openInBackground: false,
              openAtLaunch: false,
              updateChannel: 'github',
              windowBounds: null,
              windowMaximized: true,
              disableHardwareAcceleration: false,
              enableAggressiveGpuFlags: false,
            };
          }
        }
        return {
          minimizeToTray: true,
          openInBackground: false,
          openAtLaunch: false,
          updateChannel: 'github',
          windowBounds: null,
          windowMaximized: true,
          disableHardwareAcceleration: false,
          enableAggressiveGpuFlags: false,
        };
      },
      set: async (settings: Partial<DesktopSettings>) => {
        if (isTauri()) {
          try {
            const updates: Record<string, unknown> = {};
            if (settings.minimizeToTray !== undefined) updates.minimizeToTray = settings.minimizeToTray;
            if (settings.openInBackground !== undefined) updates.openInBackground = settings.openInBackground;
            if (settings.openAtLaunch !== undefined) updates.openAtLaunch = settings.openAtLaunch;
            if (settings.updateChannel !== undefined) updates.updateChannel = settings.updateChannel;
            if (settings.windowBounds !== undefined) updates.windowBounds = settings.windowBounds;
            if (settings.windowMaximized !== undefined) updates.windowMaximized = settings.windowMaximized;
            if (settings.disableHardwareAcceleration !== undefined) updates.disableHardwareAcceleration = settings.disableHardwareAcceleration;
            if (settings.enableAggressiveGpuFlags !== undefined) updates.enableAggressiveGpuFlags = settings.enableAggressiveGpuFlags;
            return await invoke('set_desktop_settings', { updates });
          } catch (e) {
            console.error('[Bridge] Set settings failed:', e);
            throw e;
          }
        }
        throw new Error('Not running in Tauri');
      },
    },
    mpv: {
      isAvailable: async () => {
        if (isTauri()) {
          try {
            return await invoke<boolean>('mpv_is_available');
          } catch (e) {
            console.error('[Bridge] mpv availability check failed:', e);
            return false;
          }
        }
        return false;
      },
      play: async (request: MpvPlayRequest) => {
        if (!isTauri()) throw new Error('mpv solo está disponible en la app de escritorio');
        await invoke('mpv_play', { request });
      },
      stop: async () => {
        if (isTauri()) {
          try {
            await invoke('mpv_stop');
          } catch (e) {
            console.error('[Bridge] mpv stop failed:', e);
          }
        }
      },
    },
  };
}

if (typeof window !== 'undefined') {
  if (isTauri()) {
    window.__isTauriDesktop__ = true;
    window.__isElectronDesktop__ = false;
    window.electron = createElectronBridge();
    console.log('[Desktop Bridge] Tauri bridge initialized');
  } else if (isElectron()) {
    window.__isElectronDesktop__ = true;
    window.__isTauriDesktop__ = false;
    console.log('[Desktop Bridge] Running in Electron (no bridge needed)');
  } else {
    window.__isElectronDesktop__ = false;
    window.__isTauriDesktop__ = false;
    window.electron = createElectronBridge();
    console.log('[Desktop Bridge] Running in browser (mock bridge)');
  }
}

export { isTauri, isElectron };