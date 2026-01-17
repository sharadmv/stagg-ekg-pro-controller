const CACHE_NAME = 'coffee-assistant-v6';
const ASSETS = [
    './index.html',
    './favicon.svg',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // For navigation requests (loading index.html), use Network First
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request)
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // For other requests, use Cache First, falling back to network
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
