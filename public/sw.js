// Remindly service worker: caches the app so it opens and works without internet.
// Tasks themselves are stored in localStorage, so they are always available offline.

const CACHE = "remindly-v3";
const PAGES = ["/dashboard", "/calendar", "/settings"];

// Fetch each page and every script/style it references, so all pages work offline
// even if the user never opened them while online.
async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.all(
    PAGES.map(async (page) => {
      try {
        const response = await fetch(page, { cache: "no-store" });
        if (!response.ok || response.redirected) return;
        const html = await response.clone().text();
        await cache.put(page, response);
        const assets = new Set();
        for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) {
          assets.add(match[1]);
        }
        await Promise.all(
          [...assets].map((url) =>
            cache.match(url).then((hit) => hit || cache.add(url).catch(() => undefined)),
          ),
        );
      } catch {
        // Offline during install: pages get cached as they are visited instead.
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      // Refresh the cached pages in the background after each update.
      .then(() => precache()),
  );
});

function isCacheable(response) {
  // Redirected responses can't be replayed for navigations, so never cache them.
  return response && response.ok && response.type === "basic" && !response.redirected;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // API calls and React Server Component payloads go straight to the network. When an
  // RSC request fails offline, Next.js falls back to a full page load, served below.
  if (url.pathname.startsWith("/api/") || request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  // Build assets have content hashes in their names, so a cached copy never goes stale.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (isCacheable(response)) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Pages and other files: use the network when online (fresh content), the cache when offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (isCacheable(response)) {
          const copy = response.clone();
          const key = request.mode === "navigate" ? url.pathname : request;
          caches.open(CACHE).then((cache) => cache.put(key, copy));
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE);
        if (request.mode === "navigate") {
          return (await cache.match(url.pathname)) || (await cache.match("/dashboard")) || Response.error();
        }
        return (await cache.match(request)) || Response.error();
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => "focus" in client);
      return existing ? existing.focus() : self.clients.openWindow("/tasks");
    }),
  );
});
