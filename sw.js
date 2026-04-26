const CACHE_NAME = 'monitor-temp-v1';
const ASSETS_TO_CACHE = [
    './',
    './Inici.html',
    './style.css',
    './script.js',
    './icon.svg',
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', event => {
    // Si la petició és l'API en segon pla (temperatura, processos), 
    // l'agafem exclusivament d'internet i MAI de l'emmagatzematge caché
    if (event.request.url.includes('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Per tota la resta (CSS, JS, HTML), mirem primer el caché
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
