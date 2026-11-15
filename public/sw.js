// Service Worker Centsible (FR 16). Halaman: network-first, salinan terakhir dipakai saat offline.
// Aset build (/_next/static, nama berisi hash): cache-first. /api dan non-GET tidak pernah di-cache.
// Data transaksi offline TIDAK lewat sini: antreannya di localStorage dan dikirim ke /api/sync.
const VERSION = "v2";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Dipanggil saat keluar: halaman yang di-cache berisi data pribadi.
self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") {
    event.waitUntil(caches.delete(PAGES).then(() => caches.open(PAGES)).then((c) => c.add(OFFLINE_URL)));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            if (res.ok) {
              // clone() harus sinkron: setelah dikembalikan, body dibaca halaman dan tidak bisa di-clone lagi.
              const copy = res.clone();
              event.waitUntil(caches.open(ASSETS).then((c) => c.put(request, copy)));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Jangan simpan redirect (mis. ke /login) atau error sebagai salinan halaman.
          if (res.ok && !res.redirected && res.type === "basic") {
            const copy = res.clone();
            event.waitUntil(caches.open(PAGES).then((c) => c.put(request, copy)));
          }
          return res;
        })
        .catch(async () => (await caches.match(request, { ignoreSearch: true })) ?? (await caches.match("/")) ?? caches.match(OFFLINE_URL)),
    );
  }
});
