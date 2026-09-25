/* Only public app shells and same-origin static assets are cached.
 * Personal finance data stays in localStorage; auth and API requests are excluded.
 * Bump the cache version when changing the app's offline shell contract. */
const CACHE = "phinance-offline-v2.1";
const ROUTES = ["/", "/expenses", "/salary", "/accounts", "/planner", "/emi", "/investments", "/settings"];
const ASSETS = ["/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];
async function cacheAssets(html, cache) {
  const paths = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]).filter(path => path.startsWith("/_next/static/"));
  await Promise.all([...new Set(paths)].map(async path => {
    const response = await fetch(path, { credentials: "omit" });
    if (!response.ok) throw new Error("Asset download failed");
    await cache.put(path, response);
  }));
}
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    for (const route of ROUTES) {
      const response = await fetch(route, { cache: "reload", credentials: "omit", headers: { Accept: "text/html" } });
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error("Offline shell download failed");
      await cacheAssets(await response.clone().text(), cache);
      await cache.put(route, response);
    }
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("phinance-offline-") && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener("message", event => { if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting(); });
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate" && ROUTES.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (!response.ok) throw new Error("Navigation failed");
        // Cache the HTML only after its matching assets are available.
        await cacheAssets(await response.clone().text(), cache);
        await cache.put(url.pathname, response.clone());
        return response;
      } catch {
        return await cache.match(url.pathname) || new Response("Phinance needs one online visit to finish offline setup.", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
  } else if (url.pathname.startsWith("/_next/static/") || ASSETS.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
