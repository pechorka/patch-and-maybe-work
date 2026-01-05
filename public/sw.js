const CACHE_NAME = 'patchwork-v1';
const TIMEOUT_MS = 300;

// Pre-cache essential files on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icon-192.svg',
        '/icon-512.svg'
      ]);
    })
  );
  self.skipWaiting();
});

// Clean up old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Network-first with 300ms timeout, always update cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    networkFirstWithTimeout(event.request)
  );
});

async function networkFirstWithTimeout(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Race network against timeout
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
      )
    ]);

    // Update cache with fresh response
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed or timed out, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If no cache and network failed, return offline fallback for navigation
    if (request.mode === 'navigate') {
      const fallback = await cache.match('/');
      if (fallback) {
        return fallback;
      }
    }

    throw error;
  }
}
