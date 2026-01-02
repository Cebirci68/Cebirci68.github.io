const CACHE_NAME = 'cebirci-cache-v3.61';
const urlsToCache = [
  './',
  './kalem.html',
  './manifest.json',
  './simge.ico',
  './pdf.min.js',
  './pdf.worker.min.js',
  './jspdf.umd.min.js'
  // Eğer icon-192.png ve icon-512.png dosyalarını oluşturursanız buraya ekleyin
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        // Hata oluşsa bile devam et (eksik dosya varsa durmasın)
        return cache.addAll(urlsToCache).catch(err => console.log('Bazı dosyalar önbelleğe alınamadı', err));
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});