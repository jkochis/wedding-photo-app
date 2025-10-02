// Wedding Photo App Service Worker
const CACHE_NAME = 'wedding-photos-v4';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/main.css',
    '/manifest.json',
    // All modular JavaScript files
    '/js/main.js',
    '/js/api-client.js',
    '/js/config.js',
    '/js/face-detection.js',
    '/js/filter-manager.js',
    '/js/logger.js',
    '/js/modal-manager.js',
    '/js/photo-manager.js',
    '/js/skeleton-loader.js',
    '/js/state.js',
    '/js/theme-manager.js',
    '/js/upload-manager.js',
    '/js/utils.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.log('Service Worker: Error caching files', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    // Skip caching for API calls, uploads, and external storage (Google Cloud Storage)
    if (event.request.url.includes('/api/') ||
        event.request.url.includes('/uploads/') ||
        event.request.url.includes('storage.googleapis.com') ||
        !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
            .catch(() => {
                // Return offline page or cached fallback
                console.log('Service Worker: Network request failed, serving from cache');
            })
    );
});