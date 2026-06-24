/// <reference lib="webworker" />

const CACHE_NAME = "trac-pwa-v1";
const STATIC_CACHE = "trac-static-v1";
const DYNAMIC_CACHE = "trac-dynamic-v1";

// App shell resources to cache on install
const APP_SHELL = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/favicon-32x32.png",
  "/icons/apple-touch-icon.png",
];

// API routes that should always go to network first
const NETWORK_FIRST_ROUTES = ["/api/ai/"];

// Install event — cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Caching app shell");
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn("[SW] Some app shell resources failed to cache:", err);
      });
    })
  );
  // Activate immediately without waiting
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// Fetch event — serve from cache or network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith("http")) return;

  // API routes: Network first, fall back to cache
  if (NETWORK_FIRST_ROUTES.some((route) => url.pathname.startsWith(route))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // API health check: Network only
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ ok: false }), { headers: { "Content-Type": "application/json" } })));
    return;
  }

  // Static assets (images, fonts, etc.): Cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages: Stale-while-revalidate for fast loads + updates
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Everything else: Network first with cache fallback
  event.respondWith(networkFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(async () => {
      if (cached) return cached;
      // If no cache and this is a navigation request, show offline page
      if (request.mode === "navigate") {
        const offlinePage = await caches.match("/offline.html");
        if (offlinePage) return offlinePage;
      }
      return new Response("", { status: 503, statusText: "Offline" });
    });

  return cached || fetchPromise;
}

// Check if a path is a static asset
function isStaticAsset(pathname) {
  return /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|css|js)$/i.test(pathname);
}
