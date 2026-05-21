/* assets/js/game-tracker.js
   ChessKidoo — Student Game Tracker
   Submit games (PGN / Lichess), view history, track accuracy & rating trend. */

window.CK = window.CK || {};

CK.gameTracker = (() => {
  const KEY = 'ck_games';
  const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const get  = ()    => JSON.parse(localStorage.getItem(KEY) || '[]');
  const save = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));

  /* ── Basic accuracy estimator from PGN annotations ── */
  function _estimateAccuracy(pgn) {
    if (!pgn) return null;
    const blunders  = (pgn.match(/\?\?/g) || []).length;
    const mistakes  = (pgn.match(/(?<![?!])\?(?!\?)/g) || []).length;
    const inaccurate= (pgn.match(/!\?|!!/g) || []).length;
    // rough: start at 95, penalise blunders -8, mistakes -4, inaccurate -2
    const raw = Math.max(40, 95 - blunders * 8 - mistakes * 4 - inaccurate * 2);
    return Math.round(raw);
  }

  function _countMoves(pgn) {
    if (!pgn) return 0;
    const moveText = pgn.replace(/\{[^}]*\}/g, '').replace(/\[[^\]]*\]/g, '');
    const moves = moveText.match(/\b[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?\b/g);
    return moves ? Math.floor(moves.length / 2) : 0;
  }

  /* ── Submit a new game ── */
  function submitGame(studentId, data) {
    if (!data.result || !data.color) { CK.showToast('Please fill all required fields', 'warning'); return false; }
    const games = get();
    const newGame = {
      id: uid(),
      studentId,
      title:    data.title || `Game on ${data.date || new Date().toLocaleDateString('en-IN')}`,
      date:     data.date || new Date().toISOString().split('T')[0],
      color:    data.color,     // 'white' | 'black'
      result:   data.result,   // '1-0' | '0-1' | '1/2-1/2'
      opponent: data.opponent || 'Unknown',
      pgn:      data.pgn || '',
      lichessUrl: data.lichessUrl || '',
      accuracy: _estimateAccuracy(data.pgn),
      moves:    _countMoves(data.pgn),
      opening:  data.opening || _detectOpening(data.pgn),
      ratingBefore: data.ratingBefore || null,
      ratingAfter:  data.ratingAfter  || null,
      notes:    data.notes || '',
      submittedAt: new Date().toISOString()
    };
    games.unshift(newGame);
    save(games);

    // Update student's game count via CK.db (falls back to localStorage)
    // Note: bulk callers (importFromLichess) must do their own single batch update instead
    if (CK.db && CK.db.getProfile && !submitGame._bulkMode) {
      CK.db.getProfile(studentId).then(profile => {
        if (profile) return CK.db.saveProfile({ ...profile, game: (profile.game || 0) + 1 });
      }).catch(() => {
        const users = JSON.parse(localStorage.getItem('ck_db_users') || '[]');
        const idx = users.findIndex(u => u.id === studentId);
        if (idx !== -1) { users[idx].game = (users[idx].game || 0) + 1; localStorage.setItem('ck_db_users', JSON.stringify(users)); }
      });
    }

    // Push achievement notification at milestones
    const total = games.filter(g => g.studentId === studentId).length;
    if ([10, 25, 50, 100].includes(total) && CK.notifs) {
      CK.notifs.push('achievement', `🎮 ${total} Games Played!`, `You've now played ${total} games. Keep analyzing your games to improve faster!`, studentId, 'student');
    }

    CK.showToast('Game saved successfully! 📖', 'success');
    return true;
  }

  /* ── Get games for a student ── */
  function getGames(studentId, limit = 50) {
    return get().filter(g => g.studentId === studentId).slice(0, limit);
  }

  /* ── Win/loss/draw stats ── */
  function getStats(studentId) {
    const games = getGames(studentId, 999);
    const wins   = games.filter(g => (g.color === 'white' && g.result === '1-0') || (g.color === 'black' && g.result === '0-1')).length;
    const losses = games.filter(g => (g.color === 'white' && g.result === '0-1') || (g.color === 'black' && g.result === '1-0')).length;
    const draws  = games.filter(g => g.result === '1/2-1/2').length;
    const total  = games.length;
    const avgAccuracy = games.filter(g => g.accuracy).reduce((s, g) => s + g.accuracy, 0) / (games.filter(g => g.accuracy).length || 1);
    const winRate = total > 0 ? Math.round(wins / total * 100) : 0;
    return { total, wins, losses, draws, avgAccuracy: Math.round(avgAccuracy), winRate };
  }

  /* ── Import from Lichess API ── */
  async function importFromLichess(studentId, lichessUsername, maxGames = 5) {
    if (!lichessUsername.trim()) { CK.showToast('Enter a Lichess username', 'warning'); return; }
    try {
      CK.showToast('Fetching from Lichess...', 'info');
      const url = `https://lichess.org/api/games/user/${encodeURIComponent(lichessUsername.trim())}?max=${maxGames}&pgnInJson=true&opening=true`;
      const res = await fetch(url, { headers: { 'Accept': 'application/x-ndjson' } });
      if (res.status === 429) { CK.showToast('Lichess rate limit reached. Please wait a moment and try again.', 'warning'); return; }
      if (!res.ok) throw new Error('Lichess API error');
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      submitGame._bulkMode = true; // suppress per-game profile updates
      let imported = 0;
      const existingUrls = new Set(getGames(studentId, 999).map(e => e.lichessUrl).filter(Boolean));
      for (const line of lines) {
        try {
          const g = JSON.parse(line);
          const lichessUrl = `https://lichess.org/${g.id}`;
          if (existingUrls.has(lichessUrl)) continue;
          const isWhite = g.players?.white?.user?.name?.toLowerCase() === lichessUsername.toLowerCase();
          const wR = g.players?.white?.ratingDiff || 0;
          const bR = g.players?.black?.ratingDiff || 0;
          const ok = submitGame(studentId, {
            title: `${g.opening?.name || 'Game'} vs ${isWhite ? (g.players?.black?.user?.name || 'Opponent') : (g.players?.white?.user?.name || 'Opponent')}`,
            date: new Date(g.createdAt).toISOString().split('T')[0],
            color: isWhite ? 'white' : 'black',
            result: g.winner ? (g.winner === 'white' ? '1-0' : '0-1') : '1/2-1/2',
            opponent: isWhite ? (g.players?.black?.user?.name || 'Opponent') : (g.players?.white?.user?.name || 'Opponent'),
            opening: g.opening?.name || '',
            ratingBefore: isWhite ? g.players?.white?.rating : g.players?.black?.rating,
            ratingAfter: isWhite ? (g.players?.white?.rating || 0) + wR : (g.players?.black?.rating || 0) + bR,
            lichessUrl,
            accuracy: g.players?.[isWhite ? 'white' : 'black']?.analysis?.accuracy || null,
          });
          if (ok !== false) { imported++; existingUrls.add(lichessUrl); }
        } catch (_) { console.warn('[CK] Lichess game parse error:', _); }
      }
      submitGame._bulkMode = false;
      // Single batch profile update avoids N-way race condition
      if (imported > 0 && CK.db?.getProfile) {
        CK.db.getProfile(studentId).then(profile => {
          if (profile) return CK.db.saveProfile({ ...profile, game: (profile.game || 0) + imported });
        }).catch(() => {
          const users = JSON.parse(localStorage.getItem('ck_db_users') || '[]');
          const idx = users.findIndex(u => u.id === studentId);
          if (idx !== -1) { users[idx].game = (users[idx].game || 0) + imported; localStorage.setItem('ck_db_users', JSON.stringify(users)); }
        });
      }
      CK.showToast(`Imported ${imported} game${imported !== 1 ? 's' : ''} from Lichess!`, 'success');
    } catch (err) {
      submitGame._bulkMode = false;
      CK.showToast('Could not reach Lichess. Check username or try again later.', 'error');
    }
  }

  /* ── Detect opening from PGN ── */
  function _detectOpening(pgn) {
    if (!pgn) return '';
    if (/\[Opening "([^"]+)"\]/.test(pgn)) return pgn.match(/\[Opening "([^"]+)"\]/)[1];
    if (/1\. e4 e5/.test(pgn)) return 'Open Game';
    if (/1\. e4 c5/.test(pgn)) return 'Sicilian Defence';
    if (/1\. d4 d5/.test(pgn)) return 'Closed Game';
    if (/1\. e4 e6/.test(pgn)) return 'French Defence';
    if (/1\. d4 Nf6/.test(pgn)) return "Indian Defence";
    if (/1\. e4 c6/.test(pgn)) return 'Caro-Kann Defence';
    return '';
  }

  /* ── Result emoji ── */
  function _resultLabel(game) {
    const won = (game.color === 'white' && game.result === '1-0') || (game.color === 'black' && game.result === '0-1');
    const lost= (game.color === 'white' && game.result === '0-1') || (game.color === 'black' && game.result === '1-0');
    if (won)  return '<span style="color:var(--p-teal);font-weight:700;">✅ Win</span>';
    if (lost) return '<span style="color:var(--p-danger);font-weight:700;">❌ Loss</span>';
    return '<span style="color:var(--p-gold);font-weight:700;">🤝 Draw</span>';
  }

  /* ── Render submit form ── */
  function renderSubmitForm(containerId, studentId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="gt-form">
        <div style="font-size:.9rem;font-weight:700;color:var(--p-gold);margin-bottom:14px;">Submit a Game for Analysis</div>
        <div class="gt-form-grid">
          <div class="p-form-group">
            <label class="p-label">Game Title / Opponent</label>
            <input id="gtTitle" class="p-form-control" placeholder="e.g. Vs Arjun in School Tournament">
          </div>
          <div class="p-form-group">
            <label class="p-label">Date Played</label>
            <input id="gtDate" type="date" class="p-form-control" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="p-form-group">
            <label class="p-label">You played as *</label>
            <select id="gtColor" class="p-form-control">
              <option value="white">⬜ White</option>
              <option value="black">⬛ Black</option>
            </select>
          </div>
          <div class="p-form-group">
            <label class="p-label">Result *</label>
            <select id="gtResult" class="p-form-control">
              <option value="1-0">1-0 (White wins)</option>
              <option value="0-1">0-1 (Black wins)</option>
              <option value="1/2-1/2">½-½ (Draw)</option>
            </select>
          </div>
          <div class="p-form-group">
            <label class="p-label">Rating Before</label>
            <input id="gtRatingBefore" type="number" class="p-form-control" placeholder="e.g. 1050">
          </div>
          <div class="p-form-group">
            <label class="p-label">Rating After</label>
            <input id="gtRatingAfter" type="number" class="p-form-control" placeholder="e.g. 1065">
          </div>
        </div>
        <div class="p-form-group">
          <label class="p-label">PGN (paste game notation)</label>
          <textarea id="gtPgn" class="p-form-control" style="height:100px;font-family:monospace;font-size:.8rem;resize:vertical;" placeholder="1. e4 e5 2. Nf3 Nc6 ...  (optional — auto-calculates accuracy if annotations !! ?? are present)"></textarea>
        </div>
        <div class="p-form-group">
          <label class="p-label">Notes / What you learned</label>
          <textarea id="gtNotes" class="p-form-control" style="height:60px;resize:vertical;" placeholder="Key mistake: missed the fork on move 18. Studied this in coach review."></textarea>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <button class="p-btn p-btn-teal" onclick="CK.gameTracker._doSubmit('${studentId}')">💾 Save Game</button>
          <div style="font-size:.8rem;color:rgba(255,255,255,.4);">— or —</div>
          <input id="gtLichessUser" class="p-form-control" style="width:180px;" placeholder="Lichess username">
          <button class="p-btn p-btn-blue p-btn-sm" onclick="CK.gameTracker._doLichessImport('${studentId}')">⬇ Import Last 5 from Lichess</button>
        </div>
      </div>`;
  }

  function _doSubmit(studentId) {
    const ok = submitGame(studentId, {
      title:  document.getElementById('gtTitle')?.value.trim(),
      date:   document.getElementById('gtDate')?.value,
      color:  document.getElementById('gtColor')?.value,
      result: document.getElementById('gtResult')?.value,
      pgn:    document.getElementById('gtPgn')?.value.trim(),
      notes:  document.getElementById('gtNotes')?.value.trim(),
      ratingBefore: parseInt(document.getElementById('gtRatingBefore')?.value) || null,
      ratingAfter:  parseInt(document.getElementById('gtRatingAfter')?.value)  || null,
    });
    if (ok) {
      // Clear form
      ['gtTitle','gtPgn','gtNotes','gtRatingBefore','gtRatingAfter'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      renderGameList('gtGameList', studentId);
    }
  }

  function _doLichessImport(studentId) {
    const user = document.getElementById('gtLichessUser')?.value.trim();
    importFromLichess(studentId, user).then(() => renderGameList('gtGameList', studentId));
  }

  /* ── Render stats banner ── */
  function renderStatsBanner(containerId, studentId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const s = getStats(studentId);
    const winRate = s.total > 0 ? Math.round(s.wins / s.total * 100) : 0;
    el.innerHTML = `
      <div class="gt-stats-banner">
        <div class="gt-stat"><div class="gt-stat-val">${s.total}</div><div class="gt-stat-lbl">Games</div></div>
        <div class="gt-stat"><div class="gt-stat-val" style="color:var(--p-teal)">${s.wins}</div><div class="gt-stat-lbl">Wins</div></div>
        <div class="gt-stat"><div class="gt-stat-val" style="color:var(--p-danger)">${s.losses}</div><div class="gt-stat-lbl">Losses</div></div>
        <div class="gt-stat"><div class="gt-stat-val" style="color:var(--p-gold)">${s.draws}</div><div class="gt-stat-lbl">Draws</div></div>
        <div class="gt-stat"><div class="gt-stat-val">${winRate}%</div><div class="gt-stat-lbl">Win Rate</div></div>
        ${s.avgAccuracy ? `<div class="gt-stat"><div class="gt-stat-val" style="color:var(--p-blue)">${s.avgAccuracy}%</div><div class="gt-stat-lbl">Avg Accuracy</div></div>` : ''}
      </div>`;
  }

  /* ── Render game list ── */
  function renderGameList(containerId, studentId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const games = getGames(studentId, 30);
    if (!games.length) {
      el.innerHTML = `<div class="gt-empty">♟ No games yet. Submit your first game above to start tracking your progress!</div>`;
      return;
    }
    el.innerHTML = `
      <div class="gt-list-header">
        <span>Recent Games (${games.length})</span>
        <div style="display:flex;gap:6px;">
          <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.gameTracker.filterGames('${containerId}','${studentId}','all')">All</button>
          <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.gameTracker.filterGames('${containerId}','${studentId}','win')">Wins</button>
          <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.gameTracker.filterGames('${containerId}','${studentId}','loss')">Losses</button>
        </div>
      </div>
      <div id="${containerId}_inner">
        ${games.map(g => _gameCard(g)).join('')}
      </div>`;
  }

  function filterGames(containerId, studentId, filter) {
    let games = getGames(studentId, 30);
    if (filter === 'win')  games = games.filter(g => (g.color === 'white' && g.result === '1-0') || (g.color === 'black' && g.result === '0-1'));
    if (filter === 'loss') games = games.filter(g => (g.color === 'white' && g.result === '0-1') || (g.color === 'black' && g.result === '1-0'));
    const inner = document.getElementById(`${containerId}_inner`);
    if (inner) inner.innerHTML = games.map(g => _gameCard(g)).join('') || '<div class="gt-empty">No games in this filter.</div>';
  }

  function _gameCard(g) {
    const _e = CK.esc || (s => s);
    const date = new Date(g.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    return `
      <div class="gt-game-card">
        <div class="gt-game-color-strip" style="background:${g.color === 'white' ? '#f0d9b5' : '#b58863'}"></div>
        <div class="gt-game-info">
          <div class="gt-game-title">${_e(g.title || 'Untitled Game')}</div>
          <div class="gt-game-meta">
            ${g.opening ? `<span class="p-badge p-badge-blue" style="font-size:.68rem;">${_e(g.opening)}</span>` : ''}
            <span style="font-size:.75rem;color:rgba(255,255,255,.4);">${date}</span>
            ${g.moves ? `<span style="font-size:.75rem;color:rgba(255,255,255,.4);">${_e(String(g.moves))} moves</span>` : ''}
          </div>
          ${g.notes ? `<div class="gt-game-notes">💡 ${_e(g.notes)}</div>` : ''}
        </div>
        <div class="gt-game-result">
          ${_resultLabel(g)}
          ${g.accuracy ? `<div style="font-size:.73rem;color:rgba(255,255,255,.4);margin-top:4px;">${g.accuracy}% acc</div>` : ''}
          ${g.ratingAfter ? `<div style="font-size:.73rem;color:rgba(255,255,255,.4);">${g.ratingAfter > (g.ratingBefore||0) ? '+' : ''}${g.ratingAfter - (g.ratingBefore||g.ratingAfter)} ELO</div>` : ''}
        </div>
        ${g.lichessUrl ? `<a href="${g.lichessUrl}" target="_blank" class="gt-game-link" title="View on Lichess">🔗</a>` : ''}
      </div>`;
  }

  return {
    submitGame, getGames, getStats, importFromLichess,
    renderSubmitForm, renderGameList, renderStatsBanner, filterGames,
    _doSubmit, _doLichessImport
  };
})();
