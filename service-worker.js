

const APP_VERSION = "v4";
const STATIC_CACHE = `shopmate-static-${APP_VERSION}`;
const RUNTIME_CACHE = "shopmate-runtime";

/* Core app shell — MUST be minimal and stable */
const APP_SHELL = [
  "./",         // The directory itself
  "./index.html",
  "./manifest.json"
];
/* ---------- INSTALL ---------- */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

/* ---------- ACTIVATE ---------- */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ---------- FETCH ---------- */
self.addEventListener("fetch", event => {
  const req = event.request;

  /* Ignore non-GET and cross-origin */
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) {
    return;
  }

  /* App shell routing (SPA-safe) */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          return res;
        })
        .catch(() => {
          return caches.match("/index.html");
        })
    );
    return;
  }

  /* Static assets: cache-first */
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(networkRes => {
          return caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
        })
        .catch(() => {
          /* Last-resort fallback */
          return caches.match("/index.html");
        });
    })
  );
});
