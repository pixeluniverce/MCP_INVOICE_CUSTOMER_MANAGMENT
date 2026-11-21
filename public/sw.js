// Minimal service worker: makes the app installable and shows an offline page.
// It never caches business data (invoices, payments, API responses).
const CACHE = "mcp-shell-v1";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/offline.html", "/icons/icon-192.png"]))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => { if (e.request.mode === "navigate") e.respondWith(fetch(e.request).catch(() => caches.match("/offline.html"))); });
