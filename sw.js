// StudyFlow Service Worker v2 - enables PWA install and asset caching
const CACHE_NAME = 'studyflow-v2';

// Install - skip precache (cache on demand instead to avoid path issues)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first, cache on success, serve from cache if offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls and external resources
  if (url.pathname.includes('/api/') || url.origin !== self.location.origin) return;

  // Skip chrome-extension and other schemes
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match(new URL('dashboard.html', self.location.origin).href);
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
