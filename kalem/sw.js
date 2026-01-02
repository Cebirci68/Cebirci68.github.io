


const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './pdf.min.js',
  './pdf.worker.min.js',
  './jspdf.umd.min.js'


// 1. Yükleme (Install) adımı: Dosyaları önbelleğe al
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Önbellek açıldı ve dosyalar ekleniyor.');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Önbelleğe alma işlemi başarısız oldu:', err);
      })
  );
});

// 2. Aktivasyon (Activate) adımı: Eski önbellekleri temizle
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Eğer mevcut önbellek ismi bizim yeni ismimizle aynı değilse, onu sil
          if (cacheName !== CACHE_NAME) {
            console.log('Eski önbellek siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Getirme (Fetch) adımı: İstekleri yönet
self.addEventListener('fetch', function(event) {
  event.respondWith(
    // Önce önbellekte bu dosyayı ara
    caches.match(event.request)
      .then(function(response) {
        // Eğer önbellekte bulunduysa, direkt onu döndür
        if (response) {
          return response;
        }
        // Eğer önbellekte yoksa, internetten çekmeye çalış
        return fetch(event.request);
      })
  );
});