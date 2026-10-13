// Offline cache for PDF Text Eraser & Editor (web version)
const CACHE = 'pdf-eraser-v5';
const FILES = ['./', './index.html', './privacy-policy.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './image.html', './scan.html', './cv.html', './tools.css', './lib/pdf-lib.min.js', './ocr/ocr-worker.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network first for pages (so updates arrive), cache first for the big libraries and OCR files.
  const isPage = e.request.mode === 'navigate' || /lock\.json$|admin\.html$/.test(new URL(e.request.url).pathname);
  if (isPage) {
    e.respondWith(fetch(e.request).then(resp => { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return resp; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
    if (resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
    return resp;
  })));
});
