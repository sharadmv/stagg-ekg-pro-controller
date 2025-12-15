const CACHE_NAME = 'stagg-ekg-v7';
const ASSETS = [
    './index.html',
    './icon-v2.svg',
    './manifest.json',
    './style.css',
    './app.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
