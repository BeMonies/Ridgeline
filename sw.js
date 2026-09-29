/* Ridgeline service worker.
   Network-first: when online you always get the latest program and app;
   when offline (gym basements, trailheads) the last-loaded copy is served. */
const CACHE = "ridgeline-v2";
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
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then(hit => hit || caches.match("./index.html")))
  );
});
