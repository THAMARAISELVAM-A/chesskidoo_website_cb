/* ChessKidoo Service Worker
   ──────────────────────────────────────────────────────────────────────
   STRATEGY
   - HTML navigations + same-origin JS/CSS  → NETWORK-FIRST
       Always fetch the freshest code when online so a deploy is picked up
       immediately; fall back to cache only when offline. (The previous
       cache-first SW froze returning users on stale JS after every deploy.)
   - Images / fonts / other static GETs      → CACHE-FIRST (stale-while-OK)
       These rarely change and benefit from instant loads.
   - Cross-origin (CDNs, Supabase, fonts)     → bypass (let the network handle)
   Bump CACHE_VERSION on any release to purge everything old.
   ────────────────────────────────────────────────────────────────────── */
const CACHE_VERSION = 'ck-v4';
const CORE = [
  '/', '/index.html',
  '/assets/css/style.css', '/assets/css/portals.css',
  '/assets/js/config.js', '/assets/js/db.js', '/assets/js/main.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then((c) => c.addAll(CORE).catch(() => {}))   // don't fail install if one asset 404s
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Allow the page to tell a waiting SW to take over immediately.
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

function isCode(url) {
  return url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
}
function isStaticAsset(url) {
  return /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm)$/i.test(url.pathname);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Only handle our own origin; let CDNs / Supabase / Google Fonts go direct.
  if (url.origin !== location.origin) return;

  const navigation = req.mode === 'navigate';

  // NETWORK-FIRST for HTML + JS + CSS — guarantees fresh code post-deploy.
  // Use cache:'no-cache' so the browser HTTP cache is always revalidated against
  // the server (dev servers like python http.server send no Cache-Control, which
  // otherwise lets the browser serve stale JS/CSS even after a deploy).
  if (navigation || isCode(url)) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // CACHE-FIRST for static assets (images/fonts) — fast, rarely change.
  if (isStaticAsset(url)) {
    e.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
      )
    );
    return;
  }

  // Everything else same-origin: network-first, cache fallback.
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
