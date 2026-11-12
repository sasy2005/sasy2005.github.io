// Service worker: app files network-first (cache only when offline or slow), course data
// stale-while-revalidate, CDN assets cache-first. Online, users always get the published code.
const CACHE = 'libretto-v5';
const DATA = 'libretto-data';
const CDN = 'libretto-cdn';

const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest', 'libretto.ico',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'src/app.js', 'src/calc.js', 'src/store.js', 'src/userdoc.js', 'src/firebase-config.js', 'src/sync.js', 'src/sync-regole.js', 'src/simulatore.js', 'src/piano.js', 'src/ics.js', 'src/studio.js',
  'src/ui/dom.js', 'src/ui/kpi.js', 'src/ui/corsi.js', 'src/ui/calendario.js', 'src/ui/backup.js', 'src/ui/account.js', 'src/ui/simulatore.js', 'src/ui/piano.js', 'src/ui/home.js', 'src/ui/studio.js', 'src/ui/pratiche.js',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))); // bypass the HTTP cache
    const d = await caches.open(DATA);
    try { await d.add('data/corsi.json'); } catch { /* offline install: data comes later */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    const keep = new Set([CACHE, DATA, CDN]);
    for (const k of await caches.keys()) if (!keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function staleWhileRevalidate(req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req, { ignoreSearch: true });
  const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || new Response('[]', { status: 503, headers: { 'Content-Type': 'application/json' } });
}

/** Fresh from the network (revalidated), cached copy if offline or after 3 s. */
async function networkFirst(req) {
  const c = await caches.open(CACHE);
  const net = fetch(req, { cache: 'no-cache' }).then((r) => { if (r.ok) c.put(req, r.clone()); return r; });
  const lento = new Promise((res) => setTimeout(res, 3000));
  try {
    const r = await Promise.race([net, lento.then(() => null)]);
    if (r) return r;
  } catch { /* offline */ }
  const hit = await c.match(req, { ignoreSearch: true });
  return hit || net;
}

async function cacheFirst(req, cacheName) {
  const c = await caches.open(cacheName);
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
    if (url.pathname.includes('/__/') || url.pathname.includes('/tests/')) return; // auth helper, tests: network
    if (url.pathname.endsWith('/data/corsi.json')) { ev.respondWith(staleWhileRevalidate(req, DATA)); return; }
    if (req.mode === 'navigate') {
      ev.respondWith(fetch(req, { cache: 'no-cache' }).catch(async () => (await caches.match('index.html', { cacheName: CACHE }))));
      return;
    }
    ev.respondWith(networkFirst(req));
    return;
  }

  // Fonts and the Firebase SDK (pinned version, immutable).
  if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname) ||
      (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))) {
    ev.respondWith(cacheFirst(req, CDN));
  }
});
