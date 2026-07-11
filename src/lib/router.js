/**
 * src/lib/router.js
 * History-API router with lazy page loading and auth guards.
 *
 * Usage:
 *   import { initRouter, navigate } from '@lib/router.js';
 *   initRouter(routes, { defaultPath: '/' });
 */
import { requireAuth, requireRole } from './auth.js';
import { showToast } from './toast.js';

/** @type {Map<string, RouteDefinition>} */
const _routes = new Map();

/** @type {HTMLElement | null} */
let _outlet = null;

/**
 * @typedef {Object} RouteDefinition
 * @property {() => Promise<{mount: (el: HTMLElement, params: object) => void}>} load
 * @property {'public'|'auth'|'admin'|'student'|'coach'} [guard]
 */

/**
 * @param {Record<string, RouteDefinition>} routes
 * @param {{ outletId?: string, defaultPath?: string }} [opts]
 */
export function initRouter(routes, { outletId = 'app-outlet', defaultPath = '/' } = {}) {
  _outlet = document.getElementById(outletId);
  if (!_outlet) throw new Error(`[router] No element with id="${outletId}" found.`);

  for (const [path, def] of Object.entries(routes)) {
    _routes.set(path, def);
  }

  window.addEventListener('popstate', () => _resolve(location.pathname));

  // Intercept all <a href="/..."> clicks to avoid full-page reloads
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('#'))
      return;
    e.preventDefault();
    navigate(href);
  });

  _resolve(location.pathname || defaultPath);
}

/** Navigate to `path` and render the matching page. */
export function navigate(path) {
  if (path !== location.pathname) {
    history.pushState(null, '', path);
  }
  _resolve(path);
}

/** Replace current history entry (no back-navigation to current page). */
export function replace(path) {
  history.replaceState(null, '', path);
  _resolve(path);
}

async function _resolve(rawPath) {
  const { path, params } = _matchRoute(rawPath);
  const def = _routes.get(path);

  if (!def) {
    _render404();
    return;
  }

  // Auth guard
  if (def.guard && def.guard !== 'public') {
    const role = def.guard === 'auth' ? null : def.guard;
    const profile = role ? await requireRole(role) : await requireAuth();

    if (!profile) return; // requireAuth/requireRole handles redirect
  }

  try {
    showLoader();
    const mod = await def.load();
    hideLoader();
    _outlet.innerHTML = '';
    await mod.mount(_outlet, params);
  } catch (err) {
    hideLoader();
    console.error('[router] Failed to load page:', path, err);
    showToast('Failed to load page. Please try again.', 'error');
  }
}

function _matchRoute(rawPath) {
  // Exact match first
  if (_routes.has(rawPath)) return { path: rawPath, params: {} };

  // Pattern match (/admin/students/:id)
  for (const [pattern] of _routes) {
    const params = _extractParams(pattern, rawPath);
    if (params) return { path: pattern, params };
  }

  return { path: rawPath, params: {} };
}

function _extractParams(pattern, path) {
  const patParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patParts.length; i++) {
    if (patParts[i].startsWith(':')) {
      params[patParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

function _render404() {
  if (_outlet) {
    _outlet.innerHTML =
      '<div class="cls-empty" style="padding:40px 0;"><h2>404 — Page not found</h2><a href="/" style="color:var(--p-teal)">← Go home</a></div>';
  }
}

// ─── Loader overlay ───────────────────────────────────────────────────────────

function showLoader() {
  let el = document.getElementById('ck-page-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ck-page-loader';
    el.className = 'ck-page-loader';
    el.innerHTML = '<span class="ck-spinner"></span>';
    document.body.appendChild(el);
  }
  el.classList.add('visible');
}

function hideLoader() {
  document.getElementById('ck-page-loader')?.classList.remove('visible');
}
