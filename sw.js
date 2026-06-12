const CACHE_NAME = 'gdgh-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './js/data-tiles.js',
  './js/data-sprites.js',
  './js/data-font.js',
  './js/data-maps.js',
  './js/data-dialog.js',
  './js/data-items.js',
  './js/legend.js',
  './js/audio.js',
  './js/save.js',
  './js/render.js',
  './js/input.js',
  './js/survival.js',
  './js/actors.js',
  './js/camp.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
