/**
 * src/lib/toast.js
 * Single toast notification system.
 * Import and call showToast() from anywhere — no global CK namespace needed.
 */
import { esc } from './sanitize.js';

/** @type {HTMLElement | null} */
let _toast = null;
/** @type {number | null} */
let _timer = null;

const ICONS = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

/**
 * @param {string} msg
 * @param {'success'|'error'|'info'|'warning'} [type]
 * @param {number} [duration]  ms before auto-hide (default 4000)
 */
export function showToast(msg, type = 'info', duration = 4000) {
  if (!_toast) {
    _toast = document.createElement('div');
    _toast.id = 'ck-toast';
    _toast.className = 'p-toast';
    document.body.appendChild(_toast);
  }

  if (_timer) clearTimeout(_timer);

  _toast.innerHTML = `<span>${ICONS[type] ?? '♟'}</span> <span>${esc(String(msg))}</span>`;
  _toast.className = `p-toast show ${type}`;

  _timer = setTimeout(() => {
    _toast.classList.remove('show');
    _timer = null;
  }, duration);
}

/** Dismiss the current toast immediately. */
export function hideToast() {
  if (_timer) { clearTimeout(_timer); _timer = null; }
  if (_toast)  _toast.classList.remove('show');
}
