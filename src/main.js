/**
 * src/main.js
 * Authenticated app shell entry point.
 * Loaded only from app.html — not by the landing page.
 */
import { initRouter } from '@lib/router.js';

const routes = {
  '/admin': { guard: 'admin', load: () => import('@pages/admin/index.js') },
  '/admin/:panel': { guard: 'admin', load: () => import('@pages/admin/index.js') },
  '/student': { guard: 'student', load: () => import('@pages/student/index.js') },
  '/student/:panel': { guard: 'student', load: () => import('@pages/student/index.js') },
  '/coach': { guard: 'coach', load: () => import('@pages/coach/index.js') },
  '/coach/:panel': { guard: 'coach', load: () => import('@pages/coach/index.js') },
  '/arena': { guard: 'auth', load: () => import('@pages/arena/index.js') },
};

initRouter(routes, { outletId: 'app-outlet', defaultPath: '/login' });
