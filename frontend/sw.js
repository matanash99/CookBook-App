self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
});

self.addEventListener('fetch', (e) => {
    // Force network fetch during development to avoid caching old styles
    e.respondWith(fetch(e.request, { cache: "no-store" }));
});