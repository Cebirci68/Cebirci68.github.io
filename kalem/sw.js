const CACHE_NAME = 'cebirci-cache-v3.62'; // Versiyonu değiştirdim ki tarayıcı yeni dosyayı hemen alsın
const urlsToCache = [
  './',
  './index.html',      
  './manifest.json',
  './simge.ico',
  './pdf.min.js',
  './pdf.worker.min.js',
  './jspdf.umd.min.js'
  // icon-192.png ve icon-512.png yüklediyseniz buraya eklemeyi unutmayın
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache).catch(err => console.log('Hata:', err));
      })
  );
});
// ... geri kalan kodlar aynı ...