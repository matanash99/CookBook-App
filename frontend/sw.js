self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
});

self.addEventListener('fetch', (e) => {
    // This simply passes all network requests through normally.
    // It's the minimum requirement to be an installable PWA!
    e.respondWith(fetch(e.request));
});