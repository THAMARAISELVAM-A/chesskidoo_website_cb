/**
 * src/main.js
 * Authenticated app shell entry point.
 * Loaded only from app.html — not by the landing page.
 */
import { initRouter } from '@lib/router.js';

const routes = {
  '/arena':            { guard: 'auth',    load: () => import('@pages/arena/index.js')   },
};

initRouter(routes, { outletId: 'app-outlet', defaultPath: '/arena' });
