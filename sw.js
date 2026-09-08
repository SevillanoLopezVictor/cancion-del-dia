/* Cachea la app y las portadas para que funcione sin conexión. */
const CACHE = 'cancion-del-dia-v1';
const BASICOS = [
  './', './index.html', './app.css', './app.js',
  './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // El catálogo siempre de la red (la app ya guarda copia en localStorage).
  if (url.hostname.includes('gist.githubusercontent.com')) return;

  // Portadas e imágenes: primero caché, y si no, red y se guarda.
  const esImagen = e.request.destination === 'image';
  e.respondWith(
    caches.match(e.request).then(guardada => {
      if (guardada) return guardada;
      return fetch(e.request).then(r => {
        if (r.ok && (esImagen || url.origin === location.origin)) {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return r;
      }).catch(() => guardada);
    })
  );
});
