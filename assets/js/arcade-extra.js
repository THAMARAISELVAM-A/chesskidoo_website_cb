/* assets/js/arcade-extra.js
   ChessKidoo Arcade — embedded open-source bonus games (2048, Hextris).
   These load in an iframe; some sites block framing (X-Frame-Options), so we
   always show a fallback "open in new tab" link behind the frame. */

window.CK = window.CK || {};
CK.arcade = CK.arcade || {};

CK.arcade._embedGame = (title, url, accent) => {
  const overlay = document.getElementById('arcade-overlay');
  if (overlay) overlay.classList.add('active');
  const content = document.getElementById('arcade-cabinet-content');
  if (!content) return;
  content.innerHTML = `
    <div style="width:100%; height:100%; position:relative; background:#0a0e17;">
      <!-- Fallback (shows through if the iframe is blocked from embedding) -->
      <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; text-align:center; padding:24px; color:#cbd5e1;">
        <div style="font-size:2.4rem;">🎮</div>
        <div style="font-weight:800; color:#fff; font-size:1.1rem;">${title}</div>
        <div style="font-size:0.86rem; max-width:340px; opacity:.8;">Loading the game… if it doesn't appear, your browser blocked the embed — open it in a new tab instead.</div>
        <a href="${url}" target="_blank" rel="noopener" class="p-btn" style="background:${accent}; color:#06121f; font-weight:800; padding:11px 20px; border-radius:10px; text-decoration:none;">↗ Open ${title} in new tab</a>
      </div>
      <iframe src="${url}" title="${title}" loading="lazy"
        style="position:absolute; inset:0; width:100%; height:100%; border:none; background:transparent;"
        sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
      <button class="p-btn p-btn-ghost" style="position:absolute; top:16px; right:16px; z-index:10; background:rgba(0,0,0,0.55); backdrop-filter:blur(4px);"
        onclick="document.getElementById('arcade-overlay').classList.remove('active'); document.getElementById('arcade-cabinet-content').innerHTML='';">✕ Exit Game</button>
    </div>`;
};

CK.arcade.start2048   = () => CK.arcade._embedGame('2048 Puzzle', 'https://play2048.co/', '#edc22e');
CK.arcade.startHextris = () => CK.arcade._embedGame('Hextris', 'https://hextris.github.io/Hextris/', '#e74c3c');
