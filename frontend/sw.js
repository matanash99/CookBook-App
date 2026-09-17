self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
    self.skipWaiting(); // Force the new service worker to activate immediately
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim()); // Take control of the page immediately
});

self.addEventListener('fetch', (e) => {
    // Let the browser handle caching normally based on backend headers
    e.respondWith(fetch(e.request));
});