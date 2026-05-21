/**
 * src/lib/sanitize.js
 * XSS-safe DOM helpers.
 *
 * Rule: NEVER build HTML strings with user data.
 * Use these helpers instead of innerHTML everywhere user data appears.
 */

// ─── Core escape ─────────────────────────────────────────────────────────────

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape a value for safe use inside HTML attributes or text content.
 * @param {unknown} value
 * @returns {string}
 */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────

/**
 * Set the text of `el` safely (no HTML interpretation).
 * @param {Element} el
 * @param {unknown} value
 */
export function setText(el, value) {
  if (el) el.textContent = value ?? '';
}

/**
 * Set multiple text nodes at once.
 * @param {Record<string, unknown>} map  { selector: value }
 * @param {Element} [root]  defaults to document
 */
export function setTexts(map, root = document) {
  for (const [selector, value] of Object.entries(map)) {
    const el = root.querySelector(selector);
    if (el) el.textContent = value ?? '';
  }
}

/**
 * Build a <tr> row from an array of cell values.
 * All values are escaped automatically.
 * @param {unknown[]} cells
 * @param {string[]} [classNames]
 * @returns {HTMLTableRowElement}
 */
export function buildRow(cells, classNames = []) {
  const tr = document.createElement('tr');
  classNames.forEach((c) => c && tr.classList.add(c));
  cells.forEach((cell) => {
    const td = document.createElement('td');
    if (cell instanceof Node) {
      td.appendChild(cell);
    } else {
      td.textContent = cell ?? '';
    }
    tr.appendChild(td);
  });
  return tr;
}

/**
 * Create an element with text content (safe).
 * @param {string} tag
 * @param {string} [text]
 * @param {Record<string, string>} [attrs]
 * @returns {HTMLElement}
 */
export function el(tag, text = '', attrs = {}) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, v);
  }
  return node;
}

/**
 * Safe innerHTML — use ONLY for trusted static template strings,
 * never with user data. Wrap user data with esc() before passing.
 *
 * This function is intentionally verbose so grep can find all innerHTML
 * usage in the codebase: `grep safeHTML src/ -r`
 *
 * @param {Element} container
 * @param {string}  html  — MUST NOT contain raw user data
 */
export function safeHTML(container, html) {
  container.innerHTML = html;
}
