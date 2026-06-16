// 5xStrong service worker.
// Bump CACHE_VERSION whenever cached assets change to force clients to update.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `5xstrong-${CACHE_VERSION}`;

// Pre-cache only the core shell. (manifest.json is intentionally NOT pre-cached so
// it's always fetched fresh — pinning it caused stale start_url on installed iOS apps.)
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // CDN scripts go straight to network

  const isManifest = url.pathname.endsWith('manifest.json');

  // NETWORK-FIRST for page navigations AND the manifest, so updates are picked up
  // immediately and an installed app never gets stuck on a stale start_url.
  if (request.mode === 'navigate' || isManifest) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  // CACHE-FIRST for other static assets (icons, etc.)
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        return res;
      })
    )
  );
});
