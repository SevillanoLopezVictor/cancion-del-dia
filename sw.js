/* Caché para que funcione sin conexión, sin quedarse congelada en una
   versión vieja: los archivos de la app se piden a la red primero y la
   caché es solo el paracaídas. Las imágenes sí van de caché primero. */
const CACHE = 'cancion-del-dia-v3';
const BASICOS = [
  './', './index.html', './app.css', './app.js', './instalar.js',
  './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // El catálogo lo gestiona la app (ya guarda copia en localStorage).
  if (url.hostname.includes('gist.githubusercontent.com')) return;

  // Imágenes: caché primero, que no cambian nunca.
  if (req.destination === 'image') {
    e.respondWith(
      caches.match(req).then(guardada => guardada || fetch(req).then(r => {
        if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return r;
      }).catch(() => guardada))
    );
    return;
  }

  // Todo lo demás de la app: red primero, caché si no hay conexión.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(r => {
        if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return r;
      }).catch(() => caches.match(req).then(g => g || caches.match('./index.html')))
    );
  }
});
