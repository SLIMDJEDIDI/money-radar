/* Money Hub PWA worker — intentionally does NOT cache private pages or API data. */
const VERSION = 'money-hub-shell-v2';
const PUBLIC_ASSETS = ['/manifest.webmanifest', '/icon?size=192', '/icon?size=512'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PUBLIC_ASSETS)).catch(() => undefined));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Never cache application HTML, dashboard data, server actions, or any non-GET/private request.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || request.mode === 'navigate') {
    return;
  }
  // Public PWA artwork only: cache-first, then update in background.
  if (url.pathname === '/manifest.webmanifest' || url.pathname === '/icon' || url.pathname === '/apple-icon') {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(VERSION).then((cache) => cache.put(request, copy));
      return response;
    })));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
