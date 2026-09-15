const CACHE_VERSION = "pigeontrack-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/login.html",
  "/manifest.json",
  "/css/styles.css",
  "/js/app.js",
  "/js/api.js",
  "/js/utils.js",
  "/js/login.js",
  "/js/views/dashboard.js",
  "/js/views/pigeons.js",
  "/js/views/events.js",
  "/js/views/pedigree.js",
  "/js/views/reports.js",
  "/js/views/settings.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // API calls: always go to the network - offline data entry isn't supported,
  // but we don't want stale pigeon/event data served from a cache either.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request).catch(() => new Response(JSON.stringify({ error: "Esti offline" }), { status: 503, headers: { "Content-Type": "application/json" } })));
    return;
  }

  // App shell / static assets: cache-first, falling back to network, so the
  // installed PWA still opens (with the last-loaded UI) without a connection.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
