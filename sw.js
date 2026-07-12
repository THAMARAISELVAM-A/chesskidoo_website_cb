/* ChessKidoo service worker — offline app shell + installable PWA.
   Strategy: network-first for same-origin GET (so the app is always fresh
   when online), with a cached fallback so it still opens offline. Cross-origin
   requests (Supabase, CDNs, lichess, chess.com, Razorpay) are never touched. */

const CACHE = 'chesskidoo-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => {}))   // tolerate a missing entry
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // never cache writes

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // let cross-origin pass through untouched

  // Navigations: network-first, fall back to cached app shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { _put(req, res.clone()); return res; })
        .catch(() => caches.match(req).then((c) => c || caches.match('/index.html') || caches.match('/')))
    );
    return;
  }

  // Other same-origin GETs (CSS/JS/images): network-first, cache as fallback.
  event.respondWith(
    fetch(req)
      .then((res) => { if (res && res.status === 200 && res.type === 'basic') _put(req, res.clone()); return res; })
      .catch(() => caches.match(req))
  );
});

function _put(req, res) {
  caches.open(CACHE).then((c) => c.put(req, res)).catch(() => {});
}
