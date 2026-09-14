const CACHE = 'gestionale-partner-v1';
const SHELL = ['./index.html','./contratti.html','./pagamenti.html','./promozioni.html','./style.css','./config.js','./auth.js','./sheets.js','./manifest.json','./icon-192.png','./icon-512.png'];
const NO_CACHE = ['googleapis.com','accounts.google.com','docs.google.com','cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (NO_CACHE.some(p => e.request.url.includes(p))) { e.respondWith(fetch(e.request)); return; }
  e.respondWith(fetch(e.request).then(res => { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); return res; }).catch(() => caches.match(e.request)));
});
