// 5xStrong service worker — minimal offline support.
// Bump CACHE_VERSION whenever you change cached assets to force an update.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `5xstrong-${CACHE_VERSION}`;

// Local app-shell files to pre-cache. Relative paths so it works on GitHub Pages subpaths.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

// Install: pre-cache the app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for navigations (so users get fresh code when online),
// falling back to cache when offline. Cache-first for other same-origin GETs.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Only handle same-origin requests; let the CDN scripts go straight to network.
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return res;
    }).catch(() => cached))
  );
});
