// Service worker di Allenamento: file dell'app dalla rete (copia salvata se offline o lenta),
// SDK Firebase, font, libreria Excel e miniature dei video dalla cache.
const CACHE = 'allenamento-v1';
const CDN = 'allenamento-cdn';

const SHELL = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'js/app.js', 'js/store.js', 'js/scheda.js', 'js/timer.js', 'js/esercizi.js', 'js/figure.js', 'js/grafici.js', 'js/sync.js',
  '../src/firebase-config.js',
];

const FIREBASE = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js']
  .map((f) => 'https://www.gstatic.com/firebasejs/10.14.1/' + f);

self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })));
    try { await (await caches.open(CDN)).addAll(FIREBASE); } catch { /* arriva al primo uso */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    const keep = new Set([CACHE, CDN]);
    for (const k of await caches.keys()) if (k.startsWith('allenamento') && !keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function networkFirst(req) {
  const c = await caches.open(CACHE);
  const net = fetch(req, { cache: 'no-cache' }).then((r) => { if (r.ok) c.put(req, r.clone()); return r; });
  const lento = new Promise((res) => setTimeout(res, 3000));
  try {
    const r = await Promise.race([net, lento.then(() => null)]);
    if (r) return r;
  } catch { /* offline */ }
  return (await c.match(req, { ignoreSearch: true })) || net;
}

async function cacheFirst(req) {
  const c = await caches.open(CDN);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok || r.type === 'opaque') c.put(req, r.clone());
  return r;
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.includes('/__/') || url.pathname.includes('/dev/')) return;
    if (req.mode === 'navigate') {
      ev.respondWith(networkFirst(new Request('index.html')).catch(() => caches.match('index.html', { cacheName: CACHE })));
      return;
    }
    ev.respondWith(networkFirst(req));
    return;
  }
  if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname) ||
      (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) ||
      (url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/xlsx@'))) {
    ev.respondWith(cacheFirst(req));
  }
});
