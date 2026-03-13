import { useEffect, useCallback, useRef } from 'react';
import Mousetrap from 'mousetrap';

export interface KeyboardShortcut {
    key: string;
    modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
    action: () => void;
    description?: string;
}

export interface KeyboardShortcutGroup {
    category: string;
    shortcuts: KeyboardShortcut[];
}

export interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
    preventDefault?: boolean;
}

const DEFAULT_SHORTCUTS: KeyboardShortcutGroup[] = [
    {
        category: 'Playback',
        shortcuts: [
            { key: 'k', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'toggle-play' } })), description: 'Play/Pause' },
            { key: 'm', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'toggle-mute' } })), description: 'Mute/Unmute' },
            { key: 'f', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'toggle-fullscreen' } })), description: 'Fullscreen' },
            { key: 'j', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'seek-back' } })), description: 'Seek -10s' },
            { key: 'l', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'seek-forward' } })), description: 'Seek +10s' },
            { key: ',', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'seek-back-5' } })), description: 'Seek -5s' },
            { key: '.', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'seek-forward-5' } })), description: 'Seek +5s' },
            { key: '0-9', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'seek-percent' } })), description: 'Seek to %' },
        ],
    },
    {
        category: 'Navigation',
        shortcuts: [
            { key: '/', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'open-search' } })), description: 'Search' },
            { key: '?', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'show-help' } })), description: 'Show shortcuts' },
            { key: 'escape', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'close-modal' } })), description: 'Close modal' },
            { key: 'g h', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'go-home' } })), description: 'Go home' },
            { key: 'g l', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'go-library' } })), description: 'Go library' },
            { key: 'g s', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'go-settings' } })), description: 'Go settings' },
        ],
    },
    {
        category: 'Volume',
        shortcuts: [
            { key: 'up', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'volume-up' } })), description: 'Volume up' },
            { key: 'down', action: () => document.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'volume-down' } })), description: 'Volume down' },
        ],
    },
];

export function useKeyboardShortcuts(
    shortcuts?: KeyboardShortcutGroup[],
    options: UseKeyboardShortcutsOptions = {}
) {
    const { enabled = true, preventDefault = true } = options;
    const shortcutsRef = useRef<Mousetrap.MousetrapInstance | null>(null);

    const allShortcuts = shortcuts || DEFAULT_SHORTCUTS;

    const registerShortcuts = useCallback(() => {
        if (typeof window === 'undefined' || !enabled) return;

        const Mousetrap = require('mousetrap');
        const instance = new Mousetrap();

        allShortcuts.forEach(group => {
            group.shortcuts.forEach(shortcut => {
                const combo = shortcut.modifiers
                    ? [...shortcut.modifiers, shortcut.key].join('+')
                    : shortcut.key;

                instance.bind(combo, (e: Event) => {
                    if (preventDefault) {
                        e.preventDefault?.();
                    }
                    shortcut.action();
                });
            });
        });

        shortcutsRef.current = instance;

        return () => {
            instance.reset();
        };
    }, [allShortcuts, enabled, preventDefault]);

    useEffect(() => {
        const cleanup = registerShortcuts();
        return () => {
            cleanup?.();
        };
    }, [registerShortcuts]);

    return {
        shortcuts: allShortcuts,
        isEnabled: enabled,
    };
}

export function useKeyboardShortcut(key: string, callback: () => void, enabled = true) {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;

        const handler = (e: KeyboardEvent) => {
            if (e.key === key) {
                e.preventDefault();
                callbackRef.current();
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [key, enabled]);
}

export const keyboardShortcutCategories = DEFAULT_SHORTCUTS;

export function getShortcutDescription(action: string): string | undefined {
    for (const group of DEFAULT_SHORTCUTS) {
        const shortcut = group.shortcuts.find(s => s.action.toString().includes(action));
        if (shortcut) {
            return shortcut.description;
        }
    }
    return undefined;
}
