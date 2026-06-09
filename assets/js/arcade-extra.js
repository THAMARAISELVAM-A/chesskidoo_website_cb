/* assets/js/arcade-extra.js
   ChessKidoo Arcade — native, self-contained bonus games (2048 + Hextris).
   Previously these embedded external sites in an iframe, which broke whenever
   the site blocked framing (blank screen). They are now built in-app so they
   always work, offline included. Both render into #arcade-cabinet-content. */

(function () {
  window.CK = window.CK || {};
  CK.arcade = CK.arcade || {};
  const ARC = CK.arcade;

  /* ── shared overlay + lifecycle ─────────────────────────────────────── */
  let _raf = null, _onKey = null;
  function _cleanup() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    if (_onKey) { window.removeEventListener('keydown', _onKey); _onKey = null; }
  }
  function _extExit() {
    _cleanup();
    const ov = document.getElementById('arcade-overlay'); if (ov) ov.classList.remove('active');
    const c = document.getElementById('arcade-cabinet-content'); if (c) c.innerHTML = '';
  }
  ARC._extExit = _extExit;

  function _open(html) {
    _cleanup();
    const ov = document.getElementById('arcade-overlay'); if (ov) ov.classList.add('active');
    const c = document.getElementById('arcade-cabinet-content'); if (!c) return null;
    c.innerHTML = html;
    return c;
  }

  /* inject styles once */
  (function injectStyles() {
    if (document.getElementById('ax-styles')) return;
    const s = document.createElement('style');
    s.id = 'ax-styles';
    s.textContent = `
    .ax-wrap{width:100%;height:100%;display:flex;flex-direction:column;background:#0a0e17;color:#e8eef7;font-family:'Inter',system-ui,sans-serif;}
    .ax-bar{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);flex-wrap:wrap;}
    .ax-title{font-weight:800;font-size:1.05rem;color:#fff;margin-right:auto;display:flex;align-items:center;gap:8px;}
    .ax-stat{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:9px;padding:5px 12px;text-align:center;min-width:64px;}
    .ax-stat b{display:block;font-size:0.6rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.5);font-weight:700;}
    .ax-stat span{font-size:1.05rem;font-weight:800;color:#f3cd6b;}
    .ax-btn{cursor:pointer;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.06);color:#e8eef7;border-radius:9px;padding:7px 13px;font-weight:700;font-size:0.82rem;transition:all .14s;}
    .ax-btn:hover{background:rgba(255,255,255,0.12);}
    .ax-btn.ax-exit{color:#f49b9b;border-color:rgba(239,68,68,0.35);}
    .ax-btn.ax-exit:hover{background:rgba(239,68,68,0.2);}
    .ax-stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;overflow:auto;}
    .ax-hint{font-size:0.78rem;color:rgba(255,255,255,0.5);text-align:center;}
    .ax-pad{display:flex;gap:10px;}
    .ax-pad button{width:54px;height:48px;border-radius:11px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.07);color:#fff;font-size:1.2rem;cursor:pointer;}
    .ax-pad button:active{background:rgba(232,184,75,0.3);}
    /* 2048 */
    .ax2048-grid{position:relative;width:320px;height:320px;background:#141d2e;border-radius:12px;padding:10px;box-sizing:border-box;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:10px;touch-action:none;}
    .ax2048-cell{background:rgba(255,255,255,0.04);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.5rem;color:#0a0e17;transition:transform .08s;}
    .ax2048-msg{font-size:0.86rem;color:#f3cd6b;font-weight:700;min-height:20px;text-align:center;}
    /* hextris */
    .axhex-canvas{background:#0b1322;border-radius:14px;max-width:100%;height:auto;touch-action:none;}
    `;
    document.head.appendChild(s);
  })();

  function _hud(title, statsHTML, restartFn) {
    return `<div class="ax-bar">
      <div class="ax-title">${title}</div>
      ${statsHTML}
      <button class="ax-btn" onclick="CK.arcade.${restartFn}()">↻ Restart</button>
      <button class="ax-btn ax-exit" onclick="CK.arcade._extExit()">✕ Exit</button>
    </div>`;
  }

  /* ════════════════════════════════════════════════════════════════════
     GAME: 2048
     ════════════════════════════════════════════════════════════════════ */
  const _2048 = {
    colors: { 2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',2048:'#edc22e' },
    board: null, score: 0, best: 0, won: false, over: false
  };

  ARC.start2048 = () => {
    _2048.board = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    _2048.score = 0; _2048.won = false; _2048.over = false;
    try { _2048.best = parseInt(localStorage.getItem('ck_2048_best') || '0') || 0; } catch (e) { _2048.best = 0; }
    _2048spawn(); _2048spawn();

    _open(`<div class="ax-wrap">
      ${_hud('🔢 2048', `<div class="ax-stat"><b>Score</b><span id="ax2048-score">0</span></div><div class="ax-stat"><b>Best</b><span id="ax2048-best">0</span></div>`, 'start2048')}
      <div class="ax-stage">
        <div class="ax2048-msg" id="ax2048-msg">Combine tiles to reach 2048!</div>
        <div class="ax2048-grid" id="ax2048-grid"></div>
        <div class="ax-pad">
          <button onclick="CK.arcade._2048move('left')">◀</button>
          <button onclick="CK.arcade._2048move('up')">▲</button>
          <button onclick="CK.arcade._2048move('down')">▼</button>
          <button onclick="CK.arcade._2048move('right')">▶</button>
        </div>
        <div class="ax-hint">Use arrow keys / WASD, the buttons, or swipe on the board.</div>
      </div>
    </div>`);

    _2048render();

    _onKey = (e) => {
      const k = e.key.toLowerCase();
      const map = { arrowleft:'left', a:'left', arrowright:'right', d:'right', arrowup:'up', w:'up', arrowdown:'down', s:'down' };
      if (map[k]) { e.preventDefault(); ARC._2048move(map[k]); }
      else if (k === 'escape') _extExit();
    };
    window.addEventListener('keydown', _onKey);

    // swipe
    const grid = document.getElementById('ax2048-grid');
    if (grid) {
      let sx = 0, sy = 0;
      grid.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
      grid.addEventListener('touchend', (e) => {
        const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) ARC._2048move(dx > 0 ? 'right' : 'left');
        else ARC._2048move(dy > 0 ? 'down' : 'up');
      }, { passive: true });
    }
  };

  function _2048emptyCells() {
    const out = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!_2048.board[r][c]) out.push([r, c]);
    return out;
  }
  function _2048spawn() {
    const empty = _2048emptyCells();
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    _2048.board[r][c] = Math.random() < 0.9 ? 2 : 4;
  }
  function _2048slide(line) {
    let arr = line.filter(v => v); let gained = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) { arr[i] *= 2; gained += arr[i]; arr.splice(i + 1, 1); }
    }
    while (arr.length < 4) arr.push(0);
    return { line: arr, gained };
  }
  ARC._2048move = (dir) => {
    if (_2048.over) return;
    const b = _2048.board; let moved = false, gained = 0;
    for (let i = 0; i < 4; i++) {
      const line = [];
      for (let j = 0; j < 4; j++) {
        if (dir === 'left') line.push(b[i][j]);
        else if (dir === 'right') line.push(b[i][3 - j]);
        else if (dir === 'up') line.push(b[j][i]);
        else line.push(b[3 - j][i]);
      }
      const res = _2048slide(line); gained += res.gained;
      for (let j = 0; j < 4; j++) {
        const val = res.line[j];
        if (dir === 'left') { if (b[i][j] !== val) moved = true; b[i][j] = val; }
        else if (dir === 'right') { if (b[i][3 - j] !== val) moved = true; b[i][3 - j] = val; }
        else if (dir === 'up') { if (b[j][i] !== val) moved = true; b[j][i] = val; }
        else { if (b[3 - j][i] !== val) moved = true; b[3 - j][i] = val; }
      }
    }
    if (!moved) return;
    _2048.score += gained;
    if (_2048.score > _2048.best) { _2048.best = _2048.score; try { localStorage.setItem('ck_2048_best', String(_2048.best)); } catch (e) {} }
    _2048spawn();
    _2048render();
    _2048checkEnd();
  };
  function _2048checkEnd() {
    if (!_2048.won && _2048.board.some(row => row.includes(2048))) {
      _2048.won = true;
      const m = document.getElementById('ax2048-msg'); if (m) m.textContent = '🎉 You reached 2048! Keep going for a higher score.';
    }
    // any move left?
    if (_2048emptyCells().length) return;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const v = _2048.board[r][c];
      if ((r < 3 && _2048.board[r + 1][c] === v) || (c < 3 && _2048.board[r][c + 1] === v)) return;
    }
    _2048.over = true;
    const m = document.getElementById('ax2048-msg'); if (m) m.textContent = `💥 Game over — final score ${_2048.score}. Hit Restart to play again!`;
  }
  function _2048render() {
    const grid = document.getElementById('ax2048-grid'); if (!grid) return;
    let html = '';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const v = _2048.board[r][c];
      const bg = v ? (_2048.colors[v] || '#3c3a32') : 'rgba(255,255,255,0.04)';
      const fs = v >= 1024 ? '1.05rem' : v >= 128 ? '1.25rem' : '1.5rem';
      const col = v && v <= 4 ? '#0a0e17' : '#fff';
      html += `<div class="ax2048-cell" style="background:${bg};color:${col};font-size:${fs};">${v || ''}</div>`;
    }
    grid.innerHTML = html;
    const sc = document.getElementById('ax2048-score'); if (sc) sc.textContent = _2048.score;
    const bs = document.getElementById('ax2048-best'); if (bs) bs.textContent = _2048.best;
  }

  /* ════════════════════════════════════════════════════════════════════
     GAME: HEXTRIS (native, canvas)
     Rotate the hexagon so falling colored blocks stack on the side you want.
     Match 3+ of the same colour on a side to clear them. A side overflowing
     ends the game.
     ════════════════════════════════════════════════════════════════════ */
  const HX = {
    W: 360, H: 360, cx: 180, cy: 180,
    coreR: 30, blockH: 19, maxLen: 6,
    palette: ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db'],
    stacks: null, rotStep: 0, boardAngle: 0,
    fall: null, fallR: 0, score: 0, best: 0, over: false, last: 0, speed: 70
  };

  ARC.startHextris = () => {
    HX.stacks = [[], [], [], [], [], []];
    HX.rotStep = 0; HX.boardAngle = 0; HX.score = 0; HX.over = false; HX.speed = 72;
    try { HX.best = parseInt(localStorage.getItem('ck_hextris_best') || '0') || 0; } catch (e) { HX.best = 0; }
    HX._newBlock();

    _open(`<div class="ax-wrap">
      ${_hud('⬡ Hextris', `<div class="ax-stat"><b>Score</b><span id="axhex-score">0</span></div><div class="ax-stat"><b>Best</b><span id="axhex-best">0</span></div>`, 'startHextris')}
      <div class="ax-stage">
        <canvas id="axhex-canvas" class="axhex-canvas" width="360" height="360"></canvas>
        <div class="ax-pad">
          <button onclick="CK.arcade._hexRotate(-1)">⟲</button>
          <button onclick="CK.arcade._hexRotate(1)">⟳</button>
        </div>
        <div class="ax-hint">Rotate with ← / → (or the buttons / tap left–right) so each block lands on a matching side. 3+ in a row clears them.</div>
      </div>
    </div>`);

    const cv = document.getElementById('axhex-canvas');
    if (cv) {
      cv.addEventListener('pointerdown', (e) => {
        const rect = cv.getBoundingClientRect();
        ARC._hexRotate((e.clientX - rect.left) < rect.width / 2 ? -1 : 1);
      });
    }
    const bs = document.getElementById('axhex-best'); if (bs) bs.textContent = HX.best;

    _onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { e.preventDefault(); ARC._hexRotate(-1); }
      else if (k === 'arrowright' || k === 'd') { e.preventDefault(); ARC._hexRotate(1); }
      else if (k === 'escape') _extExit();
    };
    window.addEventListener('keydown', _onKey);

    HX.last = performance.now();
    _raf = requestAnimationFrame(_hexLoop);
  };

  HX._newBlock = function () {
    HX.fall = Math.floor(Math.random() * HX.palette.length);
    HX.fallR = 200;
  };
  ARC._hexRotate = (dir) => {
    if (HX.over) return;
    HX.rotStep = ((HX.rotStep + dir) % 6 + 6) % 6;
  };

  function _hexLandingSide() {
    // side index currently aligned with the top lane (-90°)
    return ((-HX.rotStep) % 6 + 6) % 6;
  }
  function _hexResolve(side) {
    let combo = 1, cleared = false;
    do {
      cleared = false;
      const s = HX.stacks[side];
      let n = 1;
      for (let k = s.length - 1; k > 0; k--) { if (s[k] === s[k - 1]) n++; else break; }
      if (s.length >= 3 && n >= 3) {
        s.splice(s.length - n, n);
        HX.score += n * 10 * combo; combo++; cleared = true;
      }
    } while (cleared);
    if (HX.score > HX.best) { HX.best = HX.score; try { localStorage.setItem('ck_hextris_best', String(HX.best)); } catch (e) {} }
  }
  function _hexLoop(now) {
    const dt = Math.min(0.05, (now - HX.last) / 1000); HX.last = now;
    // ease rotation
    const target = HX.rotStep * 60;
    let diff = target - HX.boardAngle;
    while (diff > 180) diff -= 360; while (diff < -180) diff += 360;
    HX.boardAngle += diff * Math.min(1, dt * 13);

    if (!HX.over && HX.fall != null) {
      HX.speed = 70 + Math.min(150, HX.score / 12);
      HX.fallR -= HX.speed * dt;
      const side = _hexLandingSide();
      const landR = HX.coreR + HX.stacks[side].length * HX.blockH + HX.blockH / 2;
      if (HX.fallR <= landR) {
        HX.stacks[side].push(HX.fall);
        _hexResolve(side);
        if (HX.stacks[side].length >= HX.maxLen) { HX.over = true; }
        else HX._newBlock();
      }
    }
    _hexDraw();
    if (!HX.over) _raf = requestAnimationFrame(_hexLoop);
  }
  function _hexDraw() {
    const cv = document.getElementById('axhex-canvas'); if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, HX.W, HX.H);
    const cx = HX.cx, cy = HX.cy, aRad = HX.boardAngle * Math.PI / 180;

    // center hexagon
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(aRad);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (-90 + i * 60) * Math.PI / 180;
      const px = HX.coreR * Math.cos(a), py = HX.coreR * Math.sin(a);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#1b2740'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    // stacked blocks
    for (let i = 0; i < 6; i++) {
      const a = (-90 + i * 60) * Math.PI / 180 + aRad;
      const tileW = 2 * HX.coreR * Math.tan(Math.PI / 6) + 6;
      for (let k = 0; k < HX.stacks[i].length; k++) {
        const r = HX.coreR + (k + 0.5) * HX.blockH;
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        ctx.save();
        ctx.translate(px, py); ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = HX.palette[HX.stacks[i][k]];
        ctx.fillRect(-tileW / 2, -HX.blockH / 2 + 1, tileW, HX.blockH - 2);
        ctx.restore();
      }
    }

    // falling block (top lane)
    if (!HX.over && HX.fall != null) {
      const a = -90 * Math.PI / 180;
      const px = cx + HX.fallR * Math.cos(a), py = cy + HX.fallR * Math.sin(a);
      const tileW = 2 * HX.coreR * Math.tan(Math.PI / 6) + 6;
      ctx.save();
      ctx.translate(px, py); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = HX.palette[HX.fall];
      ctx.fillRect(-tileW / 2, -HX.blockH / 2, tileW, HX.blockH);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(-tileW / 2, -HX.blockH / 2, tileW, HX.blockH);
      ctx.restore();
    }

    const sc = document.getElementById('axhex-score'); if (sc) sc.textContent = HX.score;
    const bs = document.getElementById('axhex-best'); if (bs) bs.textContent = HX.best;

    if (HX.over) {
      ctx.fillStyle = 'rgba(8,14,26,0.82)';
      ctx.fillRect(0, 0, HX.W, HX.H);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = '800 26px Inter, sans-serif';
      ctx.fillText('Game Over', cx, cy - 6);
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillStyle = '#f3cd6b';
      ctx.fillText('Score ' + HX.score + ' · tap Restart', cx, cy + 22);
    }
  }
})();
