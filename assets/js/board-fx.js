/* assets/js/board-fx.js -----------------------------------------------------
   ChessKidoo — Board Move Indicators (last-move highlight + arrow + banner)

   Works with chessboard.js (@chrisoakman/chessboardjs). Squares are targeted
   via the [data-square="e4"] attribute, so this is orientation-proof and
   survives board flips. Designed to make the OPPONENT's last move instantly
   obvious to young students.

   Public API:
     CK.boardFx.highlightLastMove(boardElId, from, to, { variant, san })
        variant: 'opponent' (default, orange + banner) | 'self' (blue, subtle)
     CK.boardFx.clear(boardElId)
     CK.boardFx.reapply(boardElId)          // call after a board resize
   --------------------------------------------------------------- */

window.CK = window.CK || {};

CK.boardFx = (() => {
  // Remember the last move per board so we can redraw after a resize.
  const _last = {};
  const esc = (s) => (window.CK && CK.esc ? CK.esc(s) : String(s == null ? '' : s));

  function _root(boardElId) {
    return document.getElementById(boardElId);
  }

  function clear(boardElId) {
    const root = _root(boardElId);
    if (!root) return;
    root.querySelectorAll('.ck-lm-from, .ck-lm-to').forEach(el => {
      el.classList.remove('ck-lm-from', 'ck-lm-to', 'ck-lm-opponent', 'ck-lm-self');
    });
    const ov = root.querySelector('.ck-fx-overlay');
    if (ov) ov.remove();
    const banner = root.querySelector('.ck-lm-banner');
    if (banner) banner.remove();
  }

  // variant: 'opponent' (amber + "Opponent played" banner)
  //          'self'     (blue, no banner)
  //          'review'   (teal + "Last move" banner — for analysis/replay)
  function highlightLastMove(boardElId, from, to, opts) {
    opts = opts || {};
    const root = _root(boardElId);
    if (!root || !from || !to) return;
    const variant = ['self', 'review'].includes(opts.variant) ? opts.variant : 'opponent';
    _last[boardElId] = { from, to, variant, san: opts.san || '' };

    clear(boardElId);

    const fEl = root.querySelector('[data-square="' + from + '"]');
    const tEl = root.querySelector('[data-square="' + to + '"]');
    if (fEl) fEl.classList.add('ck-lm-from', 'ck-lm-' + variant);
    if (tEl) tEl.classList.add('ck-lm-to', 'ck-lm-' + variant);

    _drawArrow(root, fEl, tEl, variant);

    if (variant === 'opponent') _drawBanner(root, 'Opponent played', opts.san || (from + ' → ' + to));
    else if (variant === 'review') _drawBanner(root, 'Last move', opts.san || (from + ' → ' + to), true);
  }

  function reapply(boardElId) {
    const lm = _last[boardElId];
    if (lm) highlightLastMove(boardElId, lm.from, lm.to, { variant: lm.variant, san: lm.san });
  }

  function _drawArrow(root, fEl, tEl, variant) {
    if (!fEl || !tEl) return;
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';

    const rect = root.getBoundingClientRect();
    const fr = fEl.getBoundingClientRect();
    const tr = tEl.getBoundingClientRect();
    if (!rect.width || !fr.width) return;

    const x1 = fr.left - rect.left + fr.width / 2;
    const y1 = fr.top - rect.top + fr.height / 2;
    const x2 = tr.left - rect.left + tr.width / 2;
    const y2 = tr.top - rect.top + tr.height / 2;

    const sq = Math.min(fr.width, fr.height);
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    // Pull the head back so it lands neatly inside the destination square.
    const shorten = sq * 0.34;
    const ex = x2 - (dx / len) * shorten;
    const ey = y2 - (dy / len) * shorten;

    const color = variant === 'self' ? 'rgba(59,130,246,0.80)'
                : variant === 'review' ? 'rgba(20,184,166,0.88)'
                : 'rgba(245,158,11,0.92)';
    const mid = 'ck-fx-ah-' + variant;
    const NS = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'ck-fx-overlay');
    svg.setAttribute('width', rect.width);
    svg.setAttribute('height', rect.height);
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:6;overflow:visible;';
    svg.innerHTML =
      '<defs><marker id="' + mid + '" markerWidth="3.4" markerHeight="3.4" refX="1.9" refY="1.7" orient="auto">' +
      '<path d="M0,0 L3.4,1.7 L0,3.4 L1,1.7 Z" fill="' + color + '"/></marker></defs>' +
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + ex + '" y2="' + ey + '" ' +
      'stroke="' + color + '" stroke-width="' + (sq * 0.155) + '" stroke-linecap="round" ' +
      'marker-end="url(#' + mid + ')" class="ck-fx-arrowline"/>';
    root.appendChild(svg);
  }

  function _drawBanner(root, prefix, label, review) {
    const banner = document.createElement('div');
    banner.className = 'ck-lm-banner' + (review ? ' ck-lm-banner-review' : '');
    banner.innerHTML =
      '<span class="ck-lm-banner-dot"></span>' +
      '<span class="ck-lm-banner-txt">' + esc(prefix) + ' <b>' + esc(label) + '</b></span>';
    root.appendChild(banner);
    // Auto-fade the banner after a moment; the square + arrow stay put.
    setTimeout(() => {
      if (banner && banner.parentNode) {
        banner.classList.add('ck-lm-banner-out');
        setTimeout(() => { if (banner.parentNode) banner.remove(); }, 600);
      }
    }, 2800);
  }

  // ── Inject styles once (keeps this module drop-in, no CSS file edits) ──
  function _injectStyles() {
    if (document.getElementById('ck-boardfx-styles')) return;
    const css = `
      .ck-lm-from, .ck-lm-to { position: relative; }
      .ck-lm-from::after, .ck-lm-to::after {
        content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 2;
        box-shadow: inset 0 0 0 3px rgba(245,158,11,0.0);
      }
      /* Opponent move — warm amber, strongest signal */
      .ck-lm-opponent.ck-lm-from { background-color: rgba(245,158,11,0.45) !important; }
      .ck-lm-opponent.ck-lm-to   { background-color: rgba(245,158,11,0.58) !important; }
      .ck-lm-opponent.ck-lm-to::after {
        box-shadow: inset 0 0 0 3px rgba(217,119,6,0.95);
        animation: ckLmPulse 1.1s ease-out 3;
      }
      /* Your move — calm blue, subtle */
      .ck-lm-self.ck-lm-from { background-color: rgba(59,130,246,0.32) !important; }
      .ck-lm-self.ck-lm-to   { background-color: rgba(59,130,246,0.42) !important; }
      /* Review/replay — teal, neutral */
      .ck-lm-review.ck-lm-from { background-color: rgba(20,184,166,0.34) !important; }
      .ck-lm-review.ck-lm-to   { background-color: rgba(20,184,166,0.48) !important; }
      .ck-lm-review.ck-lm-to::after { box-shadow: inset 0 0 0 3px rgba(13,148,136,0.9); }
      .ck-lm-banner-review { border-color: rgba(20,184,166,0.55); color:#cffafe; }
      .ck-lm-banner-review .ck-lm-banner-dot { background:#14b8a6; }
      .ck-lm-banner-review b { color:#7df0e0; }

      @keyframes ckLmPulse {
        0%   { box-shadow: inset 0 0 0 3px rgba(217,119,6,0.95); }
        50%  { box-shadow: inset 0 0 0 5px rgba(217,119,6,0.55); }
        100% { box-shadow: inset 0 0 0 3px rgba(217,119,6,0.95); }
      }

      .ck-lm-banner {
        position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
        display: flex; align-items: center; gap: 7px;
        background: rgba(20,16,8,0.86); color: #fde9c8;
        border: 1px solid rgba(245,158,11,0.55); border-radius: 999px;
        padding: 5px 13px; font-size: 0.78rem; font-weight: 600; line-height: 1;
        box-shadow: 0 6px 18px rgba(0,0,0,0.35); z-index: 8; pointer-events: none;
        white-space: nowrap; backdrop-filter: blur(4px);
        animation: ckLmBannerIn 0.28s ease-out both;
      }
      .ck-lm-banner b { color: #ffd479; font-weight: 800; }
      .ck-lm-banner-dot {
        width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;
        box-shadow: 0 0 0 0 rgba(245,158,11,0.7); animation: ckLmDot 1.4s ease-out infinite;
      }
      .ck-lm-banner-out { animation: ckLmBannerOut 0.55s ease-in both; }
      @keyframes ckLmBannerIn  { from { opacity: 0; transform: translate(-50%,-8px); } to { opacity: 1; transform: translate(-50%,0); } }
      @keyframes ckLmBannerOut { to   { opacity: 0; transform: translate(-50%,-8px); } }
      @keyframes ckLmDot { 0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.7); } 70% { box-shadow: 0 0 0 7px rgba(245,158,11,0); } 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } }
    `;
    const style = document.createElement('style');
    style.id = 'ck-boardfx-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  _injectStyles();

  return { highlightLastMove, clear, reapply };
})();
