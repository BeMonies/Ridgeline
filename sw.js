/* Ridgeline service worker.
   Network-first: when online you always get the latest program and app;
   when offline (gym basements, trailheads) the last-loaded copy is served. */
const CACHE = "ridgeline-v3";
const SHELL = ["./", "./index.html", "./app.js", "./manifest.webmanifest",
  "./programs/index.json", "./fonts/Inter-Variable.ttf", "./assets/ridgeline-topo-support.svg",
  "./assets/ridgeline-favicon.svg", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json")) return;            /* update check: always straight to the network, never cached */
  /* Ask the server every time (revalidate) so a new release is never hidden by the browser's own cache. */
  const fresh = () => fetch(req, { cache:"no-cache" }).catch(() => fetch(req));
  e.respondWith(
    fresh().then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then(hit => hit || caches.match("./index.html")))
  );
});
