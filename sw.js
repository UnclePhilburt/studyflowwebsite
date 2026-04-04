// StudyFlow Service Worker - enables PWA install and asset caching
const CACHE_NAME = 'studyflow-v1';

// Assets to cache on install (app shell)
const PRECACHE = [
  '/dashboard.html',
  '/notes.html',
  '/chat.html',
  '/browse.html',
  '/flashcards.html',
  '/calendar.html',
  '/leaderboard.html',
  '/study-groups.html',
  '/account.html',
  '/office.html',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/icon128.png',
  '/icon192.png',
  '/icon512.png',
  '/assets/assistant/assistant.css',
  '/assets/assistant/assistant.js',
  '/assets/shortcuts.css',
  '/assets/shortcuts.js',
  '/assets/toast.css',
  '/assets/toast.js',
  '/assets/transitions.js',
  '/assets/reading-guide.js',
  '/assets/offline.js',
];

// Install - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE).catch((err) => {
        console.log('Precache partial failure (non-critical):', err);
      });
    })
  );
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

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls and external resources - always go to network
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed - try cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // If it's a page navigation, return cached dashboard as fallback
          if (event.request.mode === 'navigate') {
            return caches.match('/dashboard.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
