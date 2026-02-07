// Service Worker for ShineMonitor ESS PWA
const CACHE_NAME = 'shinemonitor-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/app.css',
    '/js/utils.js',
    '/js/api.js',
    '/js/dashboard.js',
    '/js/devices.js',
    '/js/charts.js',
    '/js/settings.js',
    '/js/app.js',
    '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_ASSETS);
            })
            .catch((err) => {
                console.log('Cache installation failed:', err);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // API calls - network first with cache fallback
    if (url.hostname.includes('shinemonitor.com') || url.hostname.includes('cdnjs.cloudflare.com')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Don't cache error responses
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }
                    // Clone response and cache it
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((response) => {
                        return response || new Response(
                            JSON.stringify({
                                err: 1,
                                desc: 'Network error - offline mode',
                                dat: null
                            }),
                            {
                                status: 503,
                                statusText: 'Service Unavailable',
                                headers: new Headers({
                                    'Content-Type': 'application/json'
                                })
                            }
                        );
                    });
                })
        );
        return;
    }

    // Static assets - cache first with network fallback
    event.respondWith(
        caches.match(request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(request).then((response) => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    // Clone and cache
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                    return response;
                });
            })
            .catch(() => {
                // Return offline page or error response
                return new Response(
                    `<!DOCTYPE html>
                    <html><head><title>Offline</title></head>
                    <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f1923; color: #fff;">
                        <div style="text-align: center;">
                            <h1>Offline</h1>
                            <p>You are currently offline. Some features may not be available.</p>
                        </div>
                    </body></html>`,
                    {
                        headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    }
                );
            })
    );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => caches.delete(cacheName))
            );
        });
    }
});

// Background sync for future use
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(
            // Implement data sync logic here
            Promise.resolve()
        );
    }
});
