/**
 * Service Worker — Offline Cache for Critical Pages
 *
 * Caches SOAP Notes, Billing Review, and Client Availability data
 * so they work even when offline. Syncs when reconnected.
 *
 * Strategy: Network-first with cache fallback for API calls.
 * Static assets use cache-first strategy.
 */

const CACHE_NAME = 'labno-labs-v1';
const STATIC_CACHE = 'labno-static-v1';

// Pages that should work offline
const CRITICAL_PAGES = [
  '/',
  '/soap',
  '/billing',
  '/availability',
  '/today',
];

// API endpoints to cache responses from
const CACHEABLE_APIS = [
  '/rest/v1/soap_notes',
  '/rest/v1/session_briefs',
  '/rest/v1/client_availability',
  '/rest/v1/moso_clinical_leads',
  '/rest/v1/billing_sessions',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
      ]).catch(() => {}); // Don't fail install if offline
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Supabase API calls — network-first, cache fallback
  if (url.hostname.includes('supabase') && CACHEABLE_APIS.some(api => url.pathname.includes(api))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline — return cached version
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify({ data: [], error: 'Offline — showing cached data' }), {
              headers: { 'Content-Type': 'application/json' },
            });
          });
        })
    );
    return;
  }

  // Static assets — cache-first
  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // HTML pages — network-first for SPA routing
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }
});

// Listen for sync events — when coming back online, re-fetch cached data
self.addEventListener('message', (event) => {
  if (event.data === 'SYNC_CACHE') {
    // Clear old API cache and let network-first strategy refresh it
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        keys.forEach((key) => cache.delete(key));
      });
    });
  }
});
