const CACHE_NAME = "monitor-temp-v21";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./icon.svg",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll falla sencer si un fitxer no es pot baixar; usem put individual per ser més tolerant
      return Promise.all(
        ASSETS_TO_CACHE.map((url) =>
          fetch(url, { cache: "no-store" })
            .then((resp) => cache.put(url, resp))
            .catch((err) => console.warn("No s'ha pogut cachar:", url, err))
        )
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      ).then(() => self.clients.claim());
    })
  );
});

self.addEventListener("fetch", (event) => {
  // LES PETICIONS A L'API NO S'INTERCEPTEN MAI.
  // Si el service worker fes d'intermediari i el fetch intern fallés (servidor
  // aturat, problema de xarxa o CORS entre orígens), retornaria un 503 que
  // bloquejaria tota l'app. Deixem que el navegador faci la petició directa:
  // si el servidor no respon, el script.js ja gestiona l'error amb el mode demo.
  if (event.request.url.includes("/api/")) {
    return;
  }

  // Per tota la resta (CSS, JS, HTML), estratègia stale-while-revalidate:
  // servim el caché ràpidament i l'actualitzem en segon pla per a la propera visita
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Només cachem respostes vàlides del mateix origen
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === "basic"
            ) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);
        // Retornem el caché si existeix, si no la xarxa
        return cachedResponse || fetchPromise;
      });
    })
  );
});
