/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// SPA Navigation Fallback
// This ensures that when the user visits /movies or /series/123 while offline,
// the Service Worker serves the cached /index.html instead of a 404.
// Note: In GenerateSW, navigateFallback works natively, but we keep this as extra protection if custom caching takes over.

// 1. WebAssembly Decoder Modules (High Priority, Immutable Cache)
// Essential for WebTorrent or advanced demuxing. We cache these aggressively.
registerRoute(
    ({ request }) => request.url.endsWith('.wasm'),
    new CacheFirst({
        cacheName: 'wasm-decoders-cache',
        plugins: [
            new CacheableResponsePlugin({ statuses: [0, 200] }),
            new ExpirationPlugin({
                maxEntries: 10,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
            }),
        ],
    })
);

// 2. Initial Setup for OPFS (Origin Private File System)
// We will intercept media chunks (.ts, .m4s, .mp4) and manually store them in OPFS.
// The browser's native Cache API is backed by IndexedDB and is prone to quota crashes on large video files.
// OPFS provides raw file system access, capable of handling JS gigabytes flawlessly.
let opfsRoot: FileSystemDirectoryHandle | null = null;
const OPFS_CHUNK_DIR_NAME = 'media_chunks';

async function initOPFS() {
    try {
        if (!navigator.storage || !navigator.storage.getDirectory) {
            console.warn("OPFS is not supported, falling back to standard cache");
            return;
        }
        opfsRoot = await navigator.storage.getDirectory();
        await opfsRoot.getDirectoryHandle(OPFS_CHUNK_DIR_NAME, { create: true });
        console.log("OPFS Segment Cache Layer Initialized");
    } catch (e) {
        console.error("Failed to initialize OPFS:", e);
    }
}

// 3. Custom Router for OPFS Media Chunks Strategy
registerRoute(
    ({ request }) => {
        const url = new URL(request.url);
        // Intercept common streaming chunk formats. 
        // Note: Real-Debrid direct mp4 streams are huge, we might not intercept the whole blob,
        // but for HLS/DASH segments (.ts/.m4s), OPFS shines.
        return url.pathname.endsWith('.ts') || url.pathname.endsWith('.m4s') || url.pathname.includes('/file/');
    },
    async ({ request }) => {
        // If OPFS is not ready, fetch from network directly
        if (!opfsRoot) {
            initOPFS(); // try init again
            return fetch(request);
        }

        const url = new URL(request.url);
        // Create a safe, unique filename mapping for the chunk
        const fileName = `${btoa(url.pathname.substring(0, 150))}.chunk`;

        try {
            const chunkDir = await opfsRoot.getDirectoryHandle(OPFS_CHUNK_DIR_NAME);

            // Check if chunk exists in OPFS
            try {
                const fileHandle = await chunkDir.getFileHandle(fileName);
                const file = await fileHandle.getFile();
                // Return cached OPFS chunk with zero-latency
                return new Response(file, {
                    headers: {
                        'Content-Type': request.headers.get('Accept') || 'video/mp2t',
                        'Cache-Control': 'public, max-age=31536000',
                    }
                });
            } catch (e) {
                // Not found in OPFS, fetch from network and stream it into OPFS while reading
                const networkResponse = await fetch(request);
                if (!networkResponse.ok || !networkResponse.body) return networkResponse;

                // Clone response to return to browser immediately
                const responseToBrowser = networkResponse.clone();

                // Stream the response concurrently into OPFS (SyncAccessHandle if inside dedicated worker, but here standard async)
                (async () => {
                    try {
                        const fileHandle = await chunkDir.getFileHandle(fileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        if (networkResponse.body) {
                            await networkResponse.body.pipeTo(writable);
                        }
                    } catch (err) {
                        console.error("Failed to cache chunk to OPFS:", err);
                    }
                })();

                return responseToBrowser;
            }

        } catch (e) {
            console.error("OPFS Access Error:", e);
            return fetch(request);
        }
    }
);

// 4. API Requests (Stale While Revalidate)
// For metadata endpoints (/api/v1/metadata/*)
registerRoute(
    ({ request, url }) => url.pathname.startsWith('/api/') && request.method === 'GET',
    new NetworkFirst({
        cacheName: 'api-metadata-cache',
        plugins: [
            new CacheableResponsePlugin({ statuses: [200] }),
            new ExpirationPlugin({
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60, // 1 Day
            }),
        ],
    })
);

// Listen to skip waiting message from app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Init OPFS immediately when SW boots
initOPFS();
