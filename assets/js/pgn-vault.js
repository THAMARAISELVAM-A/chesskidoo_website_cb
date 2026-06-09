/* assets/js/pgn-vault.js ----------------------------------------------------
   ChessKidoo — Cloud PGN Vault (hybrid local + Supabase)

   A personal library of the student's own games with search, filters,
   win/loss analytics, one-click Lichess / Chess.com import, and a path to
   server-side Stockfish analysis (pgn_analysis_queue + analyze-pgn edge fn).

   Local-first: everything works from localStorage. When the Supabase
   `pgn_games` table exists, reads/writes transparently sync to the cloud —
   mirroring the existing CK.db.saveGame('student_games') pattern.

   Public:
     CK.pgnVault.render(containerId, boardId)
     CK.pgnVault.addFromPgn(pgnText, meta)   // meta: { source, myUsername }
     CK.pgnVault.importLichess(username)
     CK.pgnVault.importChesscom(username)
   --------------------------------------------------------------- */

window.CK = window.CK || {};

CK.pgnVault = (() => {
  const LS_KEY = 'ck_pgn_vault';
  const TABLE = 'pgn_games';
  let _games = null;                 // in-memory cache
  let _cloud = true;                 // assume cloud until a call says otherwise
  const _ui = {};                    // per-container filter state

  const esc = (s) => (CK.esc ? CK.esc(s) : String(s == null ? '' : s));

  function _uid() { return 'pgn-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); }
  function _ownerId() {
    const u = CK.currentUser || CK.student?.userProfile || {};
    return u.userid || u.id || (JSON.parse(localStorage.getItem('ck_auth_user') || '{}').userid) || 'guest';
  }

  // ── storage ────────────────────────────────────────────────────────────
  function _loadLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
  }
  function _saveLocal(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
  }

  async function _all() {
    if (_games) return _games;
    let local = _loadLocal();
    // Try cloud; merge by id (cloud wins).
    if (window.supabaseClient) {
      try {
        const owner = _ownerId();
        const { data, error } = await window.supabaseClient.from(TABLE).select('*').eq('user_id', owner);
        if (!error && Array.isArray(data)) {
          const byId = {};
          local.forEach(g => byId[g.id] = g);
          data.forEach(g => byId[g.id] = g);
          local = Object.values(byId);
          _saveLocal(local);
          _cloud = true;
        } else if (error) { _cloud = false; }
      } catch { _cloud = false; }
    } else { _cloud = false; }
    _games = local;
    return _games;
  }

  async function _persist(game) {
    // local
    const all = _loadLocal();
    const idx = all.findIndex(g => g.id === game.id);
    if (idx >= 0) all[idx] = game; else all.unshift(game);
    _saveLocal(all);
    _games = all;
    // cloud (best-effort)
    if (window.supabaseClient && _cloud) {
      try {
        const row = { ...game };
        delete row._localOnly;
        const { error } = await window.supabaseClient.from(TABLE).upsert(row);
        if (error) _cloud = false;
      } catch { _cloud = false; }
    }
  }

  async function remove(id) {
    const all = _loadLocal().filter(g => g.id !== id);
    _saveLocal(all);
    _games = all;
    if (window.supabaseClient && _cloud) {
      try { await window.supabaseClient.from(TABLE).delete().eq('id', id); } catch {}
    }
  }

  // ── PGN parsing helpers ────────────────────────────────────────────────
  function _headers(pgn) {
    const h = {};
    const re = /\[([A-Za-z0-9_]+)\s+"([^"]*)"\]/g;
    let m; while ((m = re.exec(pgn)) !== null) h[m[1]] = m[2];
    return h;
  }
  function _detectOpening(pgn, h) {
    if (h && h.Opening) return h.Opening;
    const body = pgn.replace(/\[[^\]]*\]/g, '');
    if (/1\.\s*e4\s+e5/.test(body)) return 'Open Game (e4 e5)';
    if (/1\.\s*e4\s+c5/.test(body)) return 'Sicilian Defence';
    if (/1\.\s*e4\s+e6/.test(body)) return 'French Defence';
    if (/1\.\s*e4\s+c6/.test(body)) return 'Caro-Kann Defence';
    if (/1\.\s*e4/.test(body))      return "King's Pawn";
    if (/1\.\s*d4\s+d5/.test(body)) return 'Closed Game (d4 d5)';
    if (/1\.\s*d4\s+Nf6/.test(body))return 'Indian Defence';
    if (/1\.\s*d4/.test(body))      return "Queen's Pawn";
    if (/1\.\s*Nf3/.test(body))     return 'Réti / King\'s Indian Attack';
    if (/1\.\s*c4/.test(body))      return 'English Opening';
    return 'Other';
  }
  function _ply(pgn) {
    const body = pgn.replace(/\{[^}]*\}/g, '').replace(/\[[^\]]*\]/g, '');
    const tokens = body.trim().split(/\s+/).filter(t => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
    return tokens.length;
  }
  function _finalFen(pgn) {
    if (!window.Chess) return null;
    try {
      const c = new Chess();
      const ok = c.load_pgn ? c.load_pgn(pgn, { sloppy: true }) : c.loadPgn(pgn);
      return ok === false ? null : c.fen();
    } catch { return null; }
  }
  function _timeClass(tc) {
    if (!tc) return 'online';
    const base = parseInt(String(tc).split('+')[0], 10);
    if (isNaN(base)) return 'online';
    if (base < 180) return 'bullet';
    if (base < 600) return 'blitz';
    if (base < 1800) return 'rapid';
    return 'classical';
  }

  // Build a normalized vault game from a single PGN string.
  function _normalize(pgn, meta = {}) {
    pgn = (pgn || '').trim();
    const h = _headers(pgn);
    const white = h.White || meta.white || '?';
    const black = h.Black || meta.black || '?';
    const result = h.Result || '*';
    let myColor = meta.myColor || null;
    const me = (meta.myUsername || '').toLowerCase();
    if (!myColor && me) {
      if (white.toLowerCase() === me) myColor = 'white';
      else if (black.toLowerCase() === me) myColor = 'black';
    }
    let outcome = 'unknown';
    if (myColor && result !== '*') {
      if (result === '1/2-1/2') outcome = 'draw';
      else if ((result === '1-0' && myColor === 'white') || (result === '0-1' && myColor === 'black')) outcome = 'win';
      else outcome = 'loss';
    }
    return {
      id: meta.id || _uid(),
      user_id: _ownerId(),
      source: meta.source || 'upload',
      white, black,
      white_elo: parseInt(h.WhiteElo, 10) || null,
      black_elo: parseInt(h.BlackElo, 10) || null,
      my_color: myColor,
      result, outcome,
      opening: _detectOpening(pgn, h),
      eco: h.ECO || null,
      event: h.Event || meta.event || 'Game',
      site: h.Site || null,
      game_date: h.UTCDate || h.Date || null,
      time_control: h.TimeControl || null,
      time_class: _timeClass(h.TimeControl),
      ply: _ply(pgn),
      accuracy: null,
      fen: _finalFen(pgn),
      pgn,
      tags: [],
      analysed: false,
      created_at: new Date().toISOString()
    };
  }

  // ── public: add / import ───────────────────────────────────────────────
  async function addFromPgn(pgnText, meta = {}) {
    pgnText = (pgnText || '').trim();
    if (!pgnText) { CK.showToast && CK.showToast('Paste a PGN first.', 'warning'); return null; }
    // A single textarea may hold multiple games.
    const chunks = pgnText.split(/(?=\[Event\s)/i).map(s => s.trim()).filter(Boolean);
    const list = chunks.length ? chunks : [pgnText];
    let added = 0, last = null;
    for (const c of list) {
      const g = _normalize(c, meta);
      if (!g.pgn) continue;
      await _persist(g); added++; last = g;
      _maybeQueueAnalysis(g);
    }
    CK.showToast && CK.showToast(`Saved ${added} game${added !== 1 ? 's' : ''} to your Vault.`, 'success');
    return last;
  }

  function _maybeQueueAnalysis(g) {
    // If cloud is live, the DB trigger already enqueued it. If not, no-op —
    // the heuristic accuracy still renders. We can also nudge the edge fn:
    if (window.supabaseClient && _cloud) {
      // fire-and-forget; safe if the function isn't deployed yet
      try {
        window.supabaseClient.functions.invoke('analyze-pgn', { body: { gameId: g.id } }).catch(() => {});
      } catch {}
    }
  }

  async function importLichess(username) {
    username = (username || '').trim();
    if (!username) { CK.showToast && CK.showToast('Enter a Lichess username.', 'warning'); return; }
    CK.showToast && CK.showToast(`Importing ${username}'s Lichess games…`, 'info');
    try {
      const r = await fetch(
        `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=20&rated=true&perfType=blitz,rapid,classical&moves=true&opening=true`,
        { headers: { Accept: 'application/x-chess-pgn' } });
      if (!r.ok) throw new Error('not found');
      const text = await r.text();
      await addFromPgn(text, { source: 'lichess', myUsername: username });
      _games = null; // force refresh
      _rerenderAll();
    } catch {
      CK.showToast && CK.showToast('Could not import from Lichess. Check the username.', 'error');
    }
  }

  async function importChesscom(username) {
    username = (username || '').trim();
    if (!username) { CK.showToast && CK.showToast('Enter a Chess.com username.', 'warning'); return; }
    CK.showToast && CK.showToast(`Importing ${username}'s Chess.com games…`, 'info');
    try {
      const ar = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/archives`);
      if (!ar.ok) throw new Error('not found');
      const aj = await ar.json();
      const archives = aj.archives || [];
      if (!archives.length) throw new Error('no games');
      const gr = await fetch(archives[archives.length - 1]);
      const gj = await gr.json();
      const games = (gj.games || []).slice(-20);
      let added = 0;
      for (const g of games) {
        if (!g.pgn) continue;
        await _persist(_normalize(g.pgn, { source: 'chesscom', myUsername: username }));
        added++;
      }
      CK.showToast && CK.showToast(`Imported ${added} Chess.com games to your Vault.`, 'success');
      _games = null;
      _rerenderAll();
    } catch {
      CK.showToast && CK.showToast('Could not import from Chess.com. Check the username.', 'error');
    }
  }

  // ── analytics ──────────────────────────────────────────────────────────
  function _analytics(games) {
    const a = { total: games.length, win: 0, loss: 0, draw: 0, unknown: 0, accSum: 0, accN: 0, openings: {}, blunders: 0 };
    games.forEach(g => {
      a[g.outcome] = (a[g.outcome] || 0) + 1;
      if (g.accuracy != null) { a.accSum += g.accuracy; a.accN++; }
      const o = g.opening || 'Other';
      a.openings[o] = a.openings[o] || { n: 0, win: 0 };
      a.openings[o].n++; if (g.outcome === 'win') a.openings[o].win++;
    });
    const decided = a.win + a.loss + a.draw;
    a.winPct = decided ? Math.round((a.win + a.draw * 0.5) / decided * 100) : 0;
    a.avgAcc = a.accN ? Math.round(a.accSum / a.accN) : null;
    const ranked = Object.entries(a.openings).filter(([, v]) => v.n >= 2).sort((x, y) => (y[1].win / y[1].n) - (x[1].win / x[1].n));
    a.bestOpening = ranked.length ? ranked[0][0] : '—';
    a.worstOpening = ranked.length ? ranked[ranked.length - 1][0] : '—';
    return a;
  }

  // ── filtering ──────────────────────────────────────────────────────────
  function _state(cid) {
    if (!_ui[cid]) _ui[cid] = { q: '', result: 'all', source: 'all', color: 'all', sort: 'newest' };
    return _ui[cid];
  }
  function _apply(games, st) {
    let out = games.slice();
    if (st.q) {
      const q = st.q.toLowerCase();
      out = out.filter(g => [g.white, g.black, g.opening, g.event, g.eco].filter(Boolean).join(' ').toLowerCase().includes(q));
    }
    if (st.result !== 'all') out = out.filter(g => g.outcome === st.result);
    if (st.source !== 'all') out = out.filter(g => g.source === st.source);
    if (st.color !== 'all')  out = out.filter(g => g.my_color === st.color);
    out.sort((x, y) => {
      if (st.sort === 'accuracy') return (y.accuracy || 0) - (x.accuracy || 0);
      const dx = new Date(x.created_at).getTime(), dy = new Date(y.created_at).getTime();
      return st.sort === 'oldest' ? dx - dy : dy - dx;
    });
    return out;
  }

  // ── rendering ──────────────────────────────────────────────────────────
  const _mounts = {};   // containerId -> boardId
  function _rerenderAll() { Object.keys(_mounts).forEach(cid => render(cid, _mounts[cid])); }

  function setFilter(cid, key, val) { _state(cid)[key] = val; render(cid, _mounts[cid]); }
  function searchInput(cid, val) {
    _state(cid).q = val;
    render(cid, _mounts[cid]).then(() => {
      // re-render replaces the input — restore focus + caret so typing is smooth
      const cont = document.getElementById(cid);
      const inp = cont && cont.querySelector('.ckv-search');
      if (inp) { inp.focus(); const n = inp.value.length; try { inp.setSelectionRange(n, n); } catch {} }
    });
  }

  function _outcomeBadge(o) {
    const map = { win: ['Win', '#22c55e'], loss: ['Loss', '#ef4444'], draw: ['Draw', '#94a3b8'], unknown: ['—', '#64748b'] };
    const [t, c] = map[o] || map.unknown;
    return `<span class="ckv-badge" style="background:${c}22;color:${c};border:1px solid ${c}55;">${t}</span>`;
  }
  function _sourceTag(s) {
    const map = { lichess: '🌐 Lichess', chesscom: '♟ Chess.com', upload: '⬆ Upload', manual: '✎ Manual', tournament: '🏆 Tournament', coach: '👨‍🏫 Coach', class: '📚 Class' };
    return map[s] || s;
  }

  async function render(containerId, boardId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    _mounts[containerId] = boardId;
    const st = _state(containerId);
    const games = await _all();
    const filtered = _apply(games, st);
    const a = _analytics(games);

    const chip = (key, val, label) =>
      `<button class="ckv-chip ${st[key] === val ? 'active' : ''}" onclick="CK.pgnVault.setFilter('${containerId}','${key}','${val}')">${label}</button>`;

    const stat = (label, value, accent) =>
      `<div class="ckv-stat"><div class="ckv-stat-v" style="color:${accent || 'var(--p-gold)'}">${value}</div><div class="ckv-stat-l">${label}</div></div>`;

    el.innerHTML = `
      <div class="ckv-wrap">
        <div class="ckv-toolbar">
          <input class="ckv-search" placeholder="🔍 Search players, opening, ECO…" value="${esc(st.q)}"
                 oninput="CK.pgnVault.searchInput('${containerId}', this.value)">
          <div class="ckv-import">
            <input id="ckvLi_${containerId}" class="ckv-mini" placeholder="Lichess user">
            <button class="ckv-btn ckv-btn-teal" onclick="CK.pgnVault.importLichess(document.getElementById('ckvLi_${containerId}').value)">Import</button>
            <input id="ckvCc_${containerId}" class="ckv-mini" placeholder="Chess.com user">
            <button class="ckv-btn ckv-btn-green" onclick="CK.pgnVault.importChesscom(document.getElementById('ckvCc_${containerId}').value)">Import</button>
          </div>
        </div>

        <div class="ckv-analytics">
          ${stat('Games', a.total)}
          ${stat('Win&nbsp;rate', a.winPct + '%', '#22c55e')}
          ${stat('W / L / D', `${a.win} / ${a.loss} / ${a.draw}`, '#e2e8f0')}
          ${stat('Avg&nbsp;accuracy', a.avgAcc != null ? a.avgAcc + '%' : '—', '#5b9cf6')}
          ${stat('Best&nbsp;opening', `<span style="font-size:.8rem">${esc(a.bestOpening)}</span>`, '#e8b84b')}
          ${stat('Needs&nbsp;work', `<span style="font-size:.8rem">${esc(a.worstOpening)}</span>`, '#f59e0b')}
        </div>

        <div class="ckv-filters">
          <div class="ckv-filtergroup">${chip('result','all','All')}${chip('result','win','Wins')}${chip('result','loss','Losses')}${chip('result','draw','Draws')}</div>
          <div class="ckv-filtergroup">${chip('source','all','Any source')}${chip('source','lichess','Lichess')}${chip('source','chesscom','Chess.com')}${chip('source','upload','Uploads')}</div>
          <div class="ckv-filtergroup">${chip('color','all','Both colors')}${chip('color','white','White')}${chip('color','black','Black')}</div>
          <select class="ckv-sort" onchange="CK.pgnVault.setFilter('${containerId}','sort',this.value)">
            <option value="newest" ${st.sort==='newest'?'selected':''}>Newest</option>
            <option value="oldest" ${st.sort==='oldest'?'selected':''}>Oldest</option>
            <option value="accuracy" ${st.sort==='accuracy'?'selected':''}>Accuracy</option>
          </select>
        </div>

        <div class="ckv-grid">
          ${filtered.length ? filtered.map(g => `
            <div class="ckv-card">
              <div class="ckv-card-top">
                ${_outcomeBadge(g.outcome)}
                <span class="ckv-src">${_sourceTag(g.source)}</span>
                ${g.analysed && g.accuracy != null ? `<span class="ckv-acc">🎯 ${g.accuracy}%</span>` : `<span class="ckv-acc ckv-pending">⏳ analysis pending</span>`}
              </div>
              <div class="ckv-players">${esc(g.white)}${g.white_elo?` <em>(${g.white_elo})</em>`:''} <span class="ckv-vs">vs</span> ${esc(g.black)}${g.black_elo?` <em>(${g.black_elo})</em>`:''}</div>
              <div class="ckv-meta">
                <span>${esc(g.opening)}</span>
                <span class="ckv-dot">•</span>
                <span>${esc(g.time_class || 'game')}</span>
                ${g.game_date?`<span class="ckv-dot">•</span><span>${esc(String(g.game_date).split('.')[0])}</span>`:''}
                <span class="ckv-dot">•</span><span>${g.ply} ply</span>
              </div>
              <div class="ckv-card-actions">
                <button class="ckv-load" onclick="CK.pgnVault.load('${g.id}','${boardId}')">▶ Open in Lab</button>
                ${!g.analysed?`<button class="ckv-analyze" onclick="CK.pgnVault.requestAnalysis('${g.id}')">🔬 Analyze</button>`:''}
                <button class="ckv-del" title="Remove" onclick="CK.pgnVault.confirmRemove('${g.id}','${containerId}')">✕</button>
              </div>
            </div>`).join('') : `
            <div class="ckv-empty">
              <div class="ckv-empty-ic">🗄️</div>
              <div class="ckv-empty-t">Your Vault is empty</div>
              <div class="ckv-empty-s">Import your Lichess or Chess.com games above, or paste a PGN in the Lab and click “Save to Vault”.</div>
            </div>`}
        </div>
      </div>`;
  }

  function load(id, boardId) {
    _all().then(games => {
      const g = games.find(x => x.id === id);
      if (!g) return;
      const input = document.getElementById((boardId || '').startsWith('coach') ? 'coachLabPgnInput' : 'labPgnInput');
      if (input) input.value = g.pgn;
      if (CK.lab) CK.lab.analyzePgn(g.pgn, boardId || 'studentLabBoard');
      CK.showToast && CK.showToast(`Opened ${g.white} vs ${g.black} in the Lab.`, 'success');
    });
  }

  async function requestAnalysis(id) {
    if (window.supabaseClient && _cloud) {
      CK.showToast && CK.showToast('Queued for Stockfish analysis…', 'info');
      try {
        await window.supabaseClient.functions.invoke('analyze-pgn', { body: { gameId: id } });
        _games = null; _rerenderAll();
        CK.showToast && CK.showToast('Analysis complete!', 'success');
        return;
      } catch {}
    }
    CK.showToast && CK.showToast('Cloud analysis not available yet — apply the PGN vault migration & deploy analyze-pgn.', 'warning');
  }

  function confirmRemove(id, cid) {
    if (window.confirm && !window.confirm('Remove this game from your Vault?')) return;
    remove(id).then(() => render(cid, _mounts[cid]));
  }

  // Convenience for the Lab "Save to Vault" button.
  function saveCurrentLabPgn(boardId) {
    const input = document.getElementById((boardId || '').startsWith('coach') ? 'coachLabPgnInput' : 'labPgnInput');
    const pgn = input ? input.value.trim() : '';
    if (!pgn) { CK.showToast && CK.showToast('Load or paste a PGN first.', 'warning'); return; }
    const me = (CK.student?.userProfile?.lichess_username) || (CK.student?.userProfile?.chesscom_username) || '';
    addFromPgn(pgn, { source: 'upload', myUsername: me }).then(() => { _games = null; _rerenderAll(); });
  }

  function _injectStyles() {
    if (document.getElementById('ck-pgnvault-styles')) return;
    const css = `
      .ckv-wrap{font-family:inherit}
      .ckv-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
      .ckv-search{flex:1;min-width:200px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#e8eefc;border-radius:10px;padding:9px 14px;font-size:.9rem}
      .ckv-search:focus{outline:none;border-color:var(--p-gold,#e8b84b)}
      .ckv-import{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
      .ckv-mini{width:120px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#e8eefc;border-radius:8px;padding:7px 10px;font-size:.82rem}
      .ckv-btn{border:none;border-radius:8px;padding:8px 12px;font-weight:700;font-size:.8rem;cursor:pointer;color:#06121f}
      .ckv-btn-teal{background:#14b8a6}.ckv-btn-green{background:#7fa650;color:#fff}
      .ckv-analytics{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px}
      @media(max-width:760px){.ckv-analytics{grid-template-columns:repeat(3,1fr)}}
      .ckv-stat{background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 10px;text-align:center}
      .ckv-stat-v{font-size:1.35rem;font-weight:800;line-height:1.1}
      .ckv-stat-l{font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:rgba(255,255,255,.5);margin-top:4px}
      .ckv-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
      .ckv-filtergroup{display:flex;gap:4px;background:rgba(255,255,255,.03);border-radius:9px;padding:3px}
      .ckv-chip{background:transparent;border:none;color:rgba(255,255,255,.55);padding:6px 11px;border-radius:7px;font-size:.78rem;font-weight:600;cursor:pointer;transition:.15s}
      .ckv-chip.active{background:var(--p-gold,#e8b84b);color:#1a1407}
      .ckv-sort{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#e8eefc;border-radius:8px;padding:7px 10px;font-size:.8rem;margin-left:auto}
      .ckv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
      .ckv-card{background:linear-gradient(165deg,rgba(255,255,255,.055),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:13px 14px;transition:.15s}
      .ckv-card:hover{border-color:rgba(232,184,75,.4);transform:translateY(-2px)}
      .ckv-card-top{display:flex;align-items:center;gap:8px;margin-bottom:8px}
      .ckv-badge{font-size:.7rem;font-weight:800;padding:2px 9px;border-radius:20px}
      .ckv-src{font-size:.72rem;color:rgba(255,255,255,.5)}
      .ckv-acc{margin-left:auto;font-size:.74rem;font-weight:700;color:#5b9cf6}
      .ckv-acc.ckv-pending{color:rgba(255,255,255,.35);font-weight:500}
      .ckv-players{font-weight:700;color:#f1f5fb;font-size:.92rem;margin-bottom:5px}
      .ckv-players em{font-style:normal;color:rgba(255,255,255,.45);font-size:.82rem}
      .ckv-vs{color:rgba(255,255,255,.4);font-weight:400;margin:0 3px}
      .ckv-meta{display:flex;gap:5px;flex-wrap:wrap;align-items:center;font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:11px}
      .ckv-dot{color:rgba(255,255,255,.25)}
      .ckv-card-actions{display:flex;gap:6px;align-items:center}
      .ckv-load{flex:1;background:var(--p-gold,#e8b84b);color:#1a1407;border:none;border-radius:8px;padding:8px;font-weight:700;font-size:.8rem;cursor:pointer}
      .ckv-analyze{background:rgba(20,184,166,.15);color:#2dd4bf;border:1px solid rgba(20,184,166,.4);border-radius:8px;padding:8px 10px;font-size:.78rem;font-weight:600;cursor:pointer}
      .ckv-del{background:transparent;color:rgba(248,113,113,.7);border:1px solid rgba(248,113,113,.3);border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:.8rem}
      .ckv-del:hover{background:rgba(248,113,113,.12)}
      .ckv-empty{grid-column:1/-1;text-align:center;padding:36px 20px;color:rgba(255,255,255,.55)}
      .ckv-empty-ic{font-size:2.4rem;margin-bottom:8px}
      .ckv-empty-t{font-weight:700;color:#e8eefc;margin-bottom:4px}
      .ckv-empty-s{font-size:.85rem;max-width:420px;margin:0 auto}
    `;
    const s = document.createElement('style');
    s.id = 'ck-pgnvault-styles'; s.textContent = css;
    document.head.appendChild(s);
  }
  _injectStyles();

  return {
    render, addFromPgn, importLichess, importChesscom,
    load, requestAnalysis, remove, confirmRemove,
    setFilter, searchInput, saveCurrentLabPgn
  };
})();
