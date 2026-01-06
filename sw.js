// sw.js - Service Worker for Shopping App
// Goal: update smoothly when new versions are deployed (avoid stuck cache)

const CACHE_VERSION = "v5";
 // תעלי מספר בכל שינוי גדול
const CACHE_NAME = `shopping-app-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js"
];

// Install: cache core assets, then activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
});

// Activate: delete old caches and take control of clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("shopping-app-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Fetch strategy:
// - For navigation (HTML): network first, fallback to cache
// - For others: cache first, fallback to network
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests (GitHub Pages)
  if (url.origin !== self.location.origin) return;

  // HTML navigations: always try fresh first
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }

  // Other assets: cache first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
    })
  );
});

// Optional: allow manual "force update" from the app (future use)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});




