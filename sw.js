// =============================================================================
// SERVICE WORKER — Cache-first with version-based cache busting
// Bump CACHE_VERSION when you update content to force a refresh.
// =============================================================================

const CACHE_VERSION = 'v2';
const CACHE_NAME = `quiz-cache-${CACHE_VERSION}`;

const PRECACHE_URLS = [
    './',
    './index.html',
    './quiz.html',
    './global.css',
    './quizzes/index.json',
    'https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap'
];

// Install: precache the app shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Activate: delete old caches from previous versions
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k.startsWith('quiz-cache-') && k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: network-first, falling back to cache
self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // If online and successful, update the cache and return the fresh resource
                if (response && response.status === 200) {
                    const clone = response.clone();
                    const url = new URL(event.request.url);
                    const isSameOrigin = url.origin === location.origin;
                    const isFontAsset = url.hostname === 'fonts.googleapis.com'
                        || url.hostname === 'fonts.gstatic.com';

                    if (isSameOrigin || isFontAsset) {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                }
                return response;
            })
            .catch(() => {
                // If network fails (offline), load from cache
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    return new Response('Offline — no cached version available.', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                });
            })
    );
});
