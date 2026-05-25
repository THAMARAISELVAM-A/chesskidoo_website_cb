/* ChessKidoo Service Worker — offline-first static assets, network-first API */
const CACHE = 'ck-v14';

const PRECACHE = [
  '/',
  '/assets/css/style.css',
  '/assets/css/portals.css',
  '/assets/css/arena.css',
  '/assets/css/dashboard.css',
  '/assets/css/mobile-landing.css',
  '/assets/css/mobile-portals.css',
  '/assets/css/mobile-arena.css',
  '/assets/js/config.js',
  '/assets/js/db.js',
  '/assets/js/auth.js',
  '/assets/js/router.js',
  '/assets/js/main.js',
  '/assets/js/admin.js',
  '/assets/js/student.js',
  '/assets/js/coach.js',
  '/assets/js/parents.js',
  '/assets/js/arena.js',
  '/assets/js/arcade.js',
  '/assets/js/notifications.js',
  '/assets/js/gamification.js',
  '/assets/js/tournament-engine.js',
  '/assets/js/ai-analysis.js',
  '/assets/js/anti-cheat.js',
  '/assets/js/engine.js',
  '/assets/js/engine-play.js',
  '/assets/js/classroom.js',
  '/assets/js/classes-system.js',
  '/assets/js/schedule-pro.js',
  '/assets/js/puzzles-pro.js',
  '/assets/js/reports-system.js',
  '/assets/js/game-tracker.js',
  '/assets/js/opening-trainer.js',
  '/assets/js/pgn-library.js',
  '/assets/js/chessboard.js',
  '/assets/js/certs.js',
  '/assets/js/webrtc-stream.js',
  '/assets/js/multiplayer.js',
  '/manifest.json',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-HTTP(S) schemes (chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Never intercept Supabase, Razorpay, CDN, or non-GET requests
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co'))   return;
  if (url.hostname.includes('razorpay.com'))  return;
  if (url.hostname.includes('lichess.org'))   return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('jsdelivr.net'))  return;
  if (url.hostname.includes('cdnjs'))         return;

  // HTML navigation — network first, fall back to cached index
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets — cache first, update in background (stale-while-revalidate)
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(request).then(hit => {
        const fresh = fetch(request).then(res => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            cache.put(request, res.clone());
          }
          return res;
        }).catch(() => hit);
        return hit || fresh;
      })
    )
  );
});
