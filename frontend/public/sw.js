// ============================================================
// E-Learning PWA Service Worker
// Optimized for Rural Areas & Low Bandwidth Connectivity
// ============================================================

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `elearn-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `elearn-dynamic-${CACHE_VERSION}`;
const OFFLINE_CACHE = `elearn-offline-${CACHE_VERSION}`;
const CONTENT_CACHE = `elearn-content-${CACHE_VERSION}`;

// Core app shell assets to pre-cache
const APP_SHELL_URLS = [
    '/',
    '/student',
    '/offline',
    '/manifest.json',
];

// API endpoints to cache with network-first strategy
const API_CACHE_PATTERNS = [
    /\/api\/academic\/subjects/,
    /\/api\/academic\/lessons/,
    /\/api\/academic\/notices/,
    /\/api\/academic\/timetable/,
    /\/api\/academic\/assessments/,
    /\/api\/users\/me/,
];

// ─── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Pre-caching app shell');
            // Use individual adds to not fail on missing resources
            return Promise.allSettled(
                APP_SHELL_URLS.map(url => cache.add(url).catch(err => {
                    console.warn(`[SW] Could not pre-cache ${url}:`, err);
                }))
            );
        }).then(() => self.skipWaiting())
    );
});

// ─── ACTIVATE ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter(name =>
                        name.startsWith('elearn-') &&
                        !name.includes(CACHE_VERSION)
                    )
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ─── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests for caching
    if (request.method !== 'GET') {
        // Handle offline POST requests with background sync
        if (!navigator.onLine) {
            event.respondWith(
                new Response(JSON.stringify({ error: 'offline', queued: true }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503
                })
            );
        }
        return;
    }

    // Skip chrome extensions and non-http(s)
    if (!url.protocol.startsWith('http')) return;

    // ── Strategy 1: API requests → Network-first with cache fallback
    if (isApiRequest(request)) {
        event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE, 5000));
        return;
    }

    // ── Strategy 2: Explicitly downloaded offline content → Cache-first
    if (url.pathname.includes('/api/') && isOfflineContent(url)) {
        event.respondWith(cacheFirst(request, OFFLINE_CACHE));
        return;
    }

    // ── Strategy 3: Next.js static assets → Cache-first
    if (
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.startsWith('/static/') ||
        url.pathname.match(/\.(woff|woff2|ttf|otf|eot)$/)
    ) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // ── Strategy 4: Images → Cache-first with stale-while-revalidate
    if (request.destination === 'image') {
        event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
        return;
    }

    // ── Strategy 5: Page navigation → Network-first with offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            networkFirstWithCache(request, DYNAMIC_CACHE, 8000)
                .catch(() => {
                    return caches.match('/offline') ||
                        new Response(getOfflinePage(), {
                            headers: { 'Content-Type': 'text/html' }
                        });
                })
        );
        return;
    }

    // Default: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// ─── STRATEGIES ──────────────────────────────────────────────

async function networkFirstWithCache(request, cacheName, timeoutMs = 5000) {
    try {
        const networkResponse = await Promise.race([
            fetch(request.clone()),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), timeoutMs)
            )
        ]);

        if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(
            JSON.stringify({
                code: 'network_unavailable',
                message: 'Network unavailable and no cached response found.',
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        return new Response('Resource not available offline', { status: 503 });
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const networkFetch = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
    }).catch(() => null);

    const networkResponse = await networkFetch;
    if (cached) return cached;
    if (networkResponse) return networkResponse;

    return new Response(
        JSON.stringify({
            code: 'offline_unavailable',
            message: 'Resource unavailable offline.',
        }),
        {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}

// ─── HELPERS ─────────────────────────────────────────────────

function isApiRequest(request) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/api/') &&
        API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isOfflineContent(url) {
    return url.searchParams.has('offline') ||
        url.pathname.includes('/download/');
}

// ─── BACKGROUND SYNC ─────────────────────────────────────────
self.addEventListener('sync', (event) => {
    if (event.tag === 'offline-submissions') {
        event.waitUntil(syncOfflineSubmissions());
    }
});

async function syncOfflineSubmissions() {
    const cache = await caches.open(OFFLINE_CACHE);
    const keys = await cache.keys();

    for (const request of keys) {
        if (request.url.includes('/pending-submission/')) {
            const response = await cache.match(request);
            const data = await response?.json?.();
            if (data) {
                try {
                    await fetch('/api/academic/submissions/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    await cache.delete(request);
                    console.log('[SW] Synced offline submission:', request.url);
                } catch (e) {
                    console.warn('[SW] Failed to sync submission, will retry:', e);
                }
            }
        }
    }
}

// ─── MESSAGE HANDLER (from app) ──────────────────────────────
self.addEventListener('message', (event) => {
    if (event.data?.type === 'CACHE_LESSON') {
        const { lessonId, urls } = event.data;
        event.waitUntil(cacheLessonContent(lessonId, urls));
    }

    if (event.data?.type === 'REMOVE_CACHED_LESSON') {
        const { lessonId } = event.data;
        event.waitUntil(removeCachedLesson(lessonId));
    }

    if (event.data?.type === 'CACHE_URLS') {
        const { urls, cacheName } = event.data;
        event.waitUntil(bulkCacheUrls(urls, cacheName || CONTENT_CACHE));
    }

    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data?.type === 'GET_CACHED_CONTENT') {
        getCachedContentList().then(list => {
            event.source?.postMessage({ type: 'CACHED_CONTENT_LIST', list });
        });
    }
});

async function cacheLessonContent(lessonId, urls = []) {
    const cache = await caches.open(CONTENT_CACHE);
    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
                console.log('[SW] Cached lesson content:', url);
            }
        } catch (e) {
            console.warn('[SW] Failed to cache:', url, e);
        }
    }
}

async function removeCachedLesson(lessonId) {
    const cache = await caches.open(CONTENT_CACHE);
    const keys = await cache.keys();
    for (const key of keys) {
        if (key.url.includes(`lesson/${lessonId}/`) ||
            key.url.includes(`lessonId=${lessonId}`)) {
            await cache.delete(key);
        }
    }
}

async function bulkCacheUrls(urls, cacheName) {
    const cache = await caches.open(cacheName);
    const results = [];
    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response.clone());
                results.push({ url, success: true });
            }
        } catch (e) {
            results.push({ url, success: false, error: e.message });
        }
    }
    return results;
}

async function getCachedContentList() {
    const cache = await caches.open(CONTENT_CACHE);
    const keys = await cache.keys();
    return keys.map(k => k.url);
}

// ─── FALLBACK PAGE ───────────────────────────────────────────
function getOfflinePage() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline – E-Learning Portal</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 48px 40px;
      text-align: center;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 25px 50px rgba(0,0,0,0.15);
    }
    .icon { font-size: 72px; margin-bottom: 24px; }
    h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin-bottom: 12px; }
    p { color: #64748b; font-size: 16px; line-height: 1.6; margin-bottom: 8px; }
    .tip {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 16px;
      margin: 24px 0;
      text-align: left;
      color: #16a34a;
      font-size: 14px;
    }
    .btn {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 100px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      margin-top: 8px;
    }
    .btn:hover { background: #4338ca; }
    .btn-outline {
      background: transparent;
      color: #4f46e5;
      border: 2px solid #4f46e5;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>No Internet Connection</h1>
    <p>Don't worry! You can still access your downloaded lessons and study materials.</p>
    <div class="tip">
      💡 <strong>Tip:</strong> Download lesson content while connected to Wi-Fi so you can study anywhere — even without internet!
    </div>
    <button class="btn" onclick="location.href='/student'">
      Open Downloaded Content
    </button>
    <button class="btn btn-outline" onclick="location.reload()">
      Try Again
    </button>
  </div>
</body>
</html>`;
}
