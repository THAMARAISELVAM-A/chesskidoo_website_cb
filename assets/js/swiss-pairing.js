/* assets/js/swiss-pairing.js ----------------------------------------------
   ChessKidoo — Swiss-system tournament engine (pairing + standings + tiebreaks)
   Inspired by Gambit Pairing. Lets the academy RUN in-house tournaments:
   generate Swiss round pairings, record results, and rank players with proper
   FIDE-style tiebreaks (Buchholz, Sonneborn-Berger, direct encounter, wins).

   The pairing/standings logic is pure (no DOM) so it is unit-testable under
   Node. UI rendering lives in CK.swissUI (swiss-pairing-ui is folded in below,
   gated on `document`). Exposed as window.CK.swiss and module.exports.
   ----------------------------------------------------------------------- */
(function (root) {
  'use strict';

  const RESULT = { WHITE: '1-0', BLACK: '0-1', DRAW: '1/2', BYE: 'bye', PENDING: null };

  /* ---- Event model ----
     event = {
       id, name, createdAt,
       players: [{ id, name, rating }],
       rounds: [ { number, pairings: [ { board, white, black|null, result } ] } ]
     }
     black === null  → that pairing is a bye for `white`. */

  function newEvent(name, players) {
    return {
      id: 'sw-' + Date.now().toString(36),
      name: name || 'Untitled Tournament',
      createdAt: new Date().toISOString(),
      players: (players || []).map(p => ({
        id: String(p.id), name: p.name || ('Player ' + p.id), rating: Number(p.rating) || 1000
      })),
      rounds: []
    };
  }

  function _byId(event) {
    const m = {};
    event.players.forEach(p => { m[p.id] = p; });
    return m;
  }

  /* Per-player aggregates derived purely from recorded results. */
  function _aggregate(event) {
    const agg = {};
    event.players.forEach(p => {
      agg[p.id] = { id: p.id, name: p.name, rating: p.rating, score: 0, wins: 0, draws: 0, losses: 0, byes: 0, opponents: [], colors: [], floats: [] };
    });
    event.rounds.forEach(rnd => {
      rnd.pairings.forEach(pr => {
        const w = agg[pr.white];
        if (pr.black === null) { // bye
          if (w && pr.result === RESULT.BYE) { w.score += 1; w.byes += 1; }
          return;
        }
        const b = agg[pr.black];
        if (!w || !b) return;
        w.opponents.push(pr.black); b.opponents.push(pr.white);
        w.colors.push('w'); b.colors.push('b');
        if (pr.result === RESULT.WHITE) { w.score += 1; w.wins++; b.losses++; }
        else if (pr.result === RESULT.BLACK) { b.score += 1; b.wins++; w.losses++; }
        else if (pr.result === RESULT.DRAW) { w.score += 0.5; b.score += 0.5; w.draws++; b.draws++; }
      });
    });
    return agg;
  }

  function _haveMet(agg, aId, bId) {
    return agg[aId] && agg[aId].opponents.indexOf(bId) !== -1;
  }

  function _colorBalance(player) { // +ve = more whites than blacks
    return player.colors.reduce((s, c) => s + (c === 'w' ? 1 : -1), 0);
  }

  /* Assign colors trying to equalise color history; the player who is "more
     due" White gets White. Falls back to higher rating = White. */
  function _assignColors(pa, pb) {
    const ba = _colorBalance(pa), bb = _colorBalance(pb);
    if (ba !== bb) return ba < bb ? [pa.id, pb.id] : [pb.id, pa.id];
    // last-color alternation
    const la = pa.colors[pa.colors.length - 1], lb = pb.colors[pb.colors.length - 1];
    if (la === 'b' && lb !== 'b') return [pa.id, pb.id];
    if (lb === 'b' && la !== 'b') return [pb.id, pa.id];
    return pa.rating >= pb.rating ? [pa.id, pb.id] : [pb.id, pa.id];
  }

  /* Generate the next Swiss round. Greedy score-group pairing with rematch
     avoidance + bye to the lowest-standing player who hasn't had one. */
  function pairNextRound(event) {
    if (!event.players.length) throw new Error('No players in event');
    const last = event.rounds[event.rounds.length - 1];
    if (last && last.pairings.some(p => p.result === RESULT.PENDING)) {
      throw new Error('Finish all results in the current round before pairing the next');
    }
    const agg = _aggregate(event);
    // Standings order: score desc, rating desc
    let pool = event.players.map(p => agg[p.id])
      .sort((a, b) => (b.score - a.score) || (b.rating - a.rating));

    const pairings = [];
    let board = 1;

    // Odd → bye for the lowest-ranked player without a prior bye
    if (pool.length % 2 === 1) {
      let byeIdx = -1;
      for (let i = pool.length - 1; i >= 0; i--) { if (pool[i].byes === 0) { byeIdx = i; break; } }
      if (byeIdx === -1) byeIdx = pool.length - 1; // everyone had a bye → lowest again
      const byePlayer = pool.splice(byeIdx, 1)[0];
      pairings.push({ board: 0, white: byePlayer.id, black: null, result: RESULT.BYE });
    }

    const used = new Set();
    for (let i = 0; i < pool.length; i++) {
      if (used.has(pool[i].id)) continue;
      const a = pool[i];
      used.add(a.id);
      // find nearest opponent below not yet met & not used
      let partner = null;
      for (let j = i + 1; j < pool.length; j++) {
        if (used.has(pool[j].id)) continue;
        if (!_haveMet(agg, a.id, pool[j].id)) { partner = pool[j]; break; }
      }
      // fallback: allow rematch with nearest available (last resort)
      if (!partner) {
        for (let j = i + 1; j < pool.length; j++) { if (!used.has(pool[j].id)) { partner = pool[j]; break; } }
      }
      if (!partner) { used.delete(a.id); continue; } // no partner (shouldn't happen for even pool)
      used.add(partner.id);
      const [white, black] = _assignColors(a, partner);
      pairings.push({ board: board++, white, black, result: RESULT.PENDING });
    }

    const round = { number: event.rounds.length + 1, pairings };
    event.rounds.push(round);
    return round;
  }

  function recordResult(event, roundNumber, board, result) {
    const round = event.rounds.find(r => r.number === roundNumber);
    if (!round) throw new Error('Round not found: ' + roundNumber);
    const pr = round.pairings.find(p => p.board === board);
    if (!pr) throw new Error('Board not found: ' + board);
    if (pr.black === null) return event; // bye is fixed
    if ([RESULT.WHITE, RESULT.BLACK, RESULT.DRAW].indexOf(result) === -1) throw new Error('Invalid result: ' + result);
    pr.result = result;
    return event;
  }

  function roundComplete(event, roundNumber) {
    const round = event.rounds.find(r => r.number === roundNumber);
    return !!round && round.pairings.every(p => p.result !== RESULT.PENDING);
  }

  /* Standings with tiebreaks:
     1) Score  2) Buchholz (Σ opponents' scores)  3) Sonneborn-Berger
     4) Direct encounter  5) Wins  6) Rating. */
  function computeStandings(event) {
    const agg = _aggregate(event);
    const scoreOf = id => (agg[id] ? agg[id].score : 0);

    const rows = event.players.map(p => {
      const a = agg[p.id];
      const buchholz = a.opponents.reduce((s, oid) => s + scoreOf(oid), 0);
      // Sonneborn-Berger: full opp-score for wins, half for draws (over played games)
      let sb = 0;
      event.rounds.forEach(rnd => rnd.pairings.forEach(pr => {
        if (pr.black === null) return;
        const me = pr.white === p.id ? 'w' : (pr.black === p.id ? 'b' : null);
        if (!me) return;
        const oppId = me === 'w' ? pr.black : pr.white;
        const won = (me === 'w' && pr.result === RESULT.WHITE) || (me === 'b' && pr.result === RESULT.BLACK);
        const drew = pr.result === RESULT.DRAW;
        if (won) sb += scoreOf(oppId);
        else if (drew) sb += scoreOf(oppId) / 2;
      }));
      return {
        id: p.id, name: p.name, rating: p.rating,
        score: a.score, wins: a.wins, draws: a.draws, losses: a.losses, byes: a.byes,
        buchholz: +buchholz.toFixed(2), sb: +sb.toFixed(2), played: a.opponents.length
      };
    });

    function direct(x, y) { // +1 if x beat y head-to-head
      let r = 0;
      event.rounds.forEach(rnd => rnd.pairings.forEach(pr => {
        if (pr.black === null) return;
        const involves = (pr.white === x.id && pr.black === y.id) || (pr.white === y.id && pr.black === x.id);
        if (!involves) return;
        if (pr.result === RESULT.WHITE) r += (pr.white === x.id ? 1 : -1);
        else if (pr.result === RESULT.BLACK) r += (pr.black === x.id ? 1 : -1);
      }));
      return r;
    }

    rows.sort((a, b) =>
      (b.score - a.score) ||
      (b.buchholz - a.buchholz) ||
      (b.sb - a.sb) ||
      (-direct(a, b)) ||
      (b.wins - a.wins) ||
      (b.rating - a.rating)
    );
    rows.forEach((r, i) => { r.rank = i + 1; });
    return rows;
  }

  /* Suggested number of rounds for a Swiss event of N players (ceil(log2 N), min 3). */
  function suggestedRounds(n) { return Math.max(3, Math.ceil(Math.log2(Math.max(2, n)))); }

  const api = {
    RESULT, newEvent, pairNextRound, recordResult, roundComplete,
    computeStandings, suggestedRounds,
    _aggregate // exposed for tests
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CK = root.CK || {};
  root.CK.swiss = api;
})(typeof window !== 'undefined' ? window : globalThis);


/* ─── Swiss Tournament Manager UI (browser only) ───────────────────────────
   Renders the pairing + standings manager into a container and persists the
   event under ck_swiss_<tournamentId> (localStorage; mirrored to a tournament
   row's `swiss` field via CK.db when available). All functions are defined but
   never auto-run, so this stays safe to require() under Node. */
(function (root) {
  'use strict';
  const CK = root.CK = root.CK || {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const key = (tid) => 'ck_swiss_' + tid;

  function _load(tid) { try { return JSON.parse(localStorage.getItem(key(tid)) || 'null'); } catch (e) { return null; } }
  function _save(tid, ev) {
    // Swiss pairing/result state lives in localStorage — the Supabase tournaments
    // table has no `swiss` column, so we don't mirror it there (would fail the
    // upsert on every result entry). Participant roster IS a valid column, so we
    // best-effort sync just that for cross-device visibility of the roster size.
    try { localStorage.setItem(key(tid), JSON.stringify(ev)); } catch (e) {}
    if (CK.db && CK.db.getTournaments && CK.db.saveTournament) {
      CK.db.getTournaments().then(list => {
        const t = (list || []).find(x => String(x.id) === String(tid));
        if (t && JSON.stringify(t.participants || []) !== JSON.stringify(ev.players)) {
          t.participants = ev.players;
          CK.db.saveTournament(t);
        }
      }).catch(() => {});
    }
  }
  function _toast(m, t) { if (CK.showToast) CK.showToast(m, t); else if (root.toast) root.toast(m, t); }

  const ui = {
    _tid: null, _ev: null, _container: null,

    /* Launch the manager in a modal overlay (used by the admin in-house list). */
    openModal(tournamentId, name) {
      document.getElementById('swissManagerModal')?.remove();
      const m = document.createElement('div');
      m.id = 'swissManagerModal';
      m.className = 'cls-modal-overlay open';
      m.innerHTML = `
        <div class="cls-modal" style="max-width:1040px;width:97%;max-height:92vh;">
          <div class="cls-modal-header"><h3>🏆 ${esc(name || 'Tournament')} — Swiss Manager</h3>
            <button class="cls-modal-close" onclick="document.getElementById('swissManagerModal').remove()">✕</button></div>
          <div class="cls-modal-body" id="swissManagerHost" style="padding:16px;"></div>
        </div>`;
      document.body.appendChild(m);
      this.open(tournamentId, 'swissManagerHost', name);
    },

    async open(tournamentId, containerId, tournamentName) {
      this._tid = String(tournamentId);
      this._container = document.getElementById(containerId);
      if (!this._container) return;
      this._ev = _load(this._tid);
      if (this._ev) { this.render(); return; }
      // No event yet → enrollment screen
      let students = [];
      try { students = (await CK.db.getProfiles('student')) || []; } catch (e) {}
      this._renderEnroll(tournamentName || 'Tournament', students);
    },

    _renderEnroll(name, students) {
      const rows = students.map(s =>
        `<label class="sw-enroll-row"><input type="checkbox" class="sw-enroll-cb" value="${esc(s.id)}" data-name="${esc(s.full_name || s.name || 'Student')}" data-rating="${esc(s.rating || 1000)}" checked> ${esc(s.full_name || s.name)} <span style="opacity:.5">(${esc(s.rating || 1000)})</span></label>`
      ).join('') || '<div style="opacity:.5;padding:10px;">No students found. Add students first.</div>';
      this._container.innerHTML = `
        <div class="sw-wrap">
          <h3 style="margin:0 0 4px;color:var(--p-text);">🏁 Set up: ${esc(name)}</h3>
          <p style="font-size:.85rem;color:var(--p-text-muted);margin:0 0 12px;">Select players, then start the Swiss event. Rounds & pairings are generated automatically.</p>
          <div class="sw-enroll-list">${rows}</div>
          <div style="display:flex;gap:8px;margin-top:14px;align-items:center;">
            <button class="p-btn p-btn-gold p-btn-sm" onclick="CK.swissUI._start()">▶ Start Tournament</button>
            <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.swissUI._toggleAll()">Toggle all</button>
            <span id="swEnrollCount" style="font-size:.8rem;color:var(--p-text-muted);"></span>
          </div>
        </div>`;
      this._updateCount();
      this._container.querySelectorAll('.sw-enroll-cb').forEach(cb => cb.addEventListener('change', () => this._updateCount()));
    },

    _updateCount() {
      const n = this._container.querySelectorAll('.sw-enroll-cb:checked').length;
      const el = document.getElementById('swEnrollCount');
      if (el) el.textContent = n + ' players · ' + CK.swiss.suggestedRounds(n) + ' suggested rounds';
    },
    _toggleAll() {
      const cbs = [...this._container.querySelectorAll('.sw-enroll-cb')];
      const anyOff = cbs.some(c => !c.checked);
      cbs.forEach(c => { c.checked = anyOff; });
      this._updateCount();
    },

    _start() {
      const picked = [...this._container.querySelectorAll('.sw-enroll-cb:checked')]
        .map(cb => ({ id: cb.value, name: cb.dataset.name, rating: +cb.dataset.rating }));
      if (picked.length < 2) { _toast('Select at least 2 players', 'warning'); return; }
      this._ev = CK.swiss.newEvent(this._tid, picked);
      _save(this._tid, this._ev);
      this.render();
      _toast('Tournament started with ' + picked.length + ' players', 'success');
    },

    _pairNext() {
      try {
        CK.swiss.pairNextRound(this._ev);
        _save(this._tid, this._ev);
        this.render();
      } catch (e) { _toast(e.message, 'warning'); }
    },

    _setResult(round, board, result) {
      try {
        CK.swiss.recordResult(this._ev, round, board, result || CK.swiss.RESULT.PENDING);
        _save(this._tid, this._ev);
        this._renderStandings(); // live standings refresh
      } catch (e) { _toast(e.message, 'error'); }
    },

    _reset() {
      if (!confirm('Reset this tournament? All rounds & results will be cleared.')) return;
      localStorage.removeItem(key(this._tid));
      this._ev = null;
      this.open(this._tid, this._container.id, this._ev && this._ev.name);
    },

    render() {
      const ev = this._ev;
      const lastRound = ev.rounds[ev.rounds.length - 1];
      const canPair = !lastRound || ev.rounds.every(r => CK.swiss.roundComplete(ev, r.number));
      const sug = CK.swiss.suggestedRounds(ev.players.length);
      const roundsHtml = ev.rounds.map(r => this._roundTable(r)).join('');
      this._container.innerHTML = `
        <div class="sw-wrap">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
            <div>
              <strong style="color:var(--p-text);font-size:1.05rem;">♟ Swiss Manager</strong>
              <span style="font-size:.8rem;color:var(--p-text-muted);margin-left:8px;">${ev.players.length} players · Round ${ev.rounds.length}/${sug}</span>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="p-btn p-btn-gold p-btn-sm" ${canPair ? '' : 'disabled title="Finish current round first"'} onclick="CK.swissUI._pairNext()">➕ Pair Round ${ev.rounds.length + 1}</button>
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.swissUI._reset()">↺ Reset</button>
            </div>
          </div>
          <div class="sw-grid">
            <div class="sw-rounds">${roundsHtml || '<div style="opacity:.5;padding:14px;">No rounds yet — click “Pair Round 1”.</div>'}</div>
            <div class="sw-standings" id="swStandings"></div>
          </div>
        </div>`;
      this._renderStandings();
    },

    _roundTable(r) {
      const opts = (sel) => {
        const R = CK.swiss.RESULT;
        const o = [['', '—'], [R.WHITE, '1–0'], [R.DRAW, '½–½'], [R.BLACK, '0–1']];
        return o.map(([v, l]) => `<option value="${v}" ${sel === v || (sel == null && v === '') ? 'selected' : ''}>${l}</option>`).join('');
      };
      const byId = {}; this._ev.players.forEach(p => byId[p.id] = p.name);
      const rows = r.pairings.map(p => {
        if (p.black === null) {
          return `<tr><td>${p.board || '–'}</td><td colspan="2">${esc(byId[p.white] || p.white)} <span class="p-badge p-badge-green">BYE +1</span></td><td>—</td></tr>`;
        }
        return `<tr>
          <td>${p.board}</td>
          <td style="text-align:right;">${esc(byId[p.white] || p.white)} <span style="opacity:.4;">(W)</span></td>
          <td><span style="opacity:.4;">(B)</span> ${esc(byId[p.black] || p.black)}</td>
          <td><select class="p-form-control sw-result" style="height:28px;padding:2px 4px;font-size:.8rem;" onchange="CK.swissUI._setResult(${r.number},${p.board},this.value)">${opts(p.result)}</select></td>
        </tr>`;
      }).join('');
      return `<div class="sw-round-card">
        <div class="sw-round-title">Round ${r.number}</div>
        <table class="p-table sw-pair-table"><thead><tr><th>#</th><th>White</th><th>Black</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>
      </div>`;
    },

    _renderStandings() {
      const el = document.getElementById('swStandings');
      if (!el) return;
      const st = CK.swiss.computeStandings(this._ev);
      const rows = st.map(r => `<tr>
        <td>${r.rank}</td>
        <td style="text-align:left;">${esc(r.name)}</td>
        <td><strong>${r.score}</strong></td>
        <td>${r.buchholz}</td>
        <td>${r.sb}</td>
        <td style="opacity:.7;">${r.wins}/${r.draws}/${r.losses}</td>
      </tr>`).join('');
      el.innerHTML = `<div class="sw-round-card">
        <div class="sw-round-title">🏆 Standings</div>
        <table class="p-table sw-stand-table"><thead><tr><th>#</th><th style="text-align:left;">Player</th><th>Pts</th><th title="Buchholz">BH</th><th title="Sonneborn-Berger">SB</th><th>W/D/L</th></tr></thead><tbody>${rows}</tbody></table>
      </div>`;
    }
  };

  CK.swissUI = ui;
})(typeof window !== 'undefined' ? window : globalThis);
