const CACHE_NAME = 'monitor-temp-v8';
const ASSETS_TO_CACHE = [
    './',
    './inici.html',
    './style.css',
    './script.js',
    './icon.svg',
    './manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            ).then(() => self.clients.claim());
        })
    );
});

self.addEventListener('fetch', event => {
    // Si la petició és l'API en segon pla (temperatura, processos), 
    // l'agafem exclusivament d'internet i MAI de l'emmagatzematge caché
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(err => {
                // Si el servidor falla (offline/port tancat), retornem un error controlat
                return new Response(JSON.stringify({ error: 'Server unreachable', demo: true }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // Per tota la resta (CSS, JS, HTML), mirem primer el caché
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

