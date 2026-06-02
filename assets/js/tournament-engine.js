/* assets/js/tournament-engine.js -------------------------------------------
   ChessKidoo Tournament Engine
   Swiss, Round Robin, Knockout, Arena formats
   Auto-pairing, live standings, tie-break calculations
   --------------------------------------------------------------- */

window.CK = window.CK || {};

CK.tournament = (() => {
  const T = {};
  const uid = () => 't-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ─── Tournament Formats ─── */
  const FORMATS = {
    swiss:      { name: 'Swiss System',  icon: '🇨🇭', desc: 'Players with similar scores are paired each round' },
    roundrobin: { name: 'Round Robin',   icon: '🔄', desc: 'Every player plays every other player once' },
    knockout:   { name: 'Knockout',      icon: '⚔️', desc: 'Single elimination bracket' },
    arena:      { name: 'Arena',         icon: '🏟️', desc: 'Time-limited, play as many games as possible' }
  };

  /* ─── Create Tournament ─── */
  T.create = async (config) => {
    const tournament = {
      id: uid(),
      name: config.name || 'ChessKidoo Tournament',
      format: config.format || 'swiss',
      rounds: config.rounds || 5,
      timeControl: config.timeControl || '10+0',
      status: 'registration',   // registration, active, completed
      players: [],
      pairings: [],             // Array of round arrays
      standings: [],
      currentRound: 0,
      createdAt: new Date().toISOString(),
      createdBy: config.createdBy || 'admin',
      tiebreaks: config.tiebreaks || ['buchholz', 'sonneborn', 'directEncounter'],
      maxPlayers: config.maxPlayers || 64,
      description: config.description || ''
    };
    await CK.db.saveTournament(tournament);
    return tournament;
  };

  /* ─── Register Player ─── */
  T.registerPlayer = async (tournamentId, player) => {
    const all = await CK.db.getTournaments();
    const t = all.find(x => x.id === tournamentId);
    if (!t) return { error: 'Tournament not found' };
    if (t.status !== 'registration') return { error: 'Registration is closed' };
    if (t.players.length >= t.maxPlayers) return { error: 'Tournament is full' };
    if (t.players.find(p => p.id === player.id)) return { error: 'Already registered' };

    t.players.push({
      id: player.id,
      name: player.full_name || player.name,
      rating: parseInt(player.rating) || 800,
      score: 0,
      buchholz: 0,
      sonneborn: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      opponents: [],
      colors: []   // 'w' or 'b' per round
    });
    await CK.db.saveTournament(t);
    return { success: true, playerCount: t.players.length };
  };

  /* ─── Remove Player ─── */
  T.removePlayer = async (tournamentId, playerId) => {
    const all = await CK.db.getTournaments();
    const t = all.find(x => x.id === tournamentId);
    if (!t || t.status !== 'registration') return false;
    t.players = t.players.filter(p => p.id !== playerId);
    await CK.db.saveTournament(t);
    return true;
  };

  /* ─── Start Tournament ─── */
  T.start = async (tournamentId) => {
    const all = await CK.db.getTournaments();
    const t = all.find(x => x.id === tournamentId);
    if (!t) return { error: 'Tournament not found' };
    if (t.players.length < 2) return { error: 'Need at least 2 players' };
    t.status = 'active';
    t.currentRound = 1;

    // Shuffle players by rating for initial seeding
    t.players.sort((a, b) => b.rating - a.rating);

    // Generate first round pairings
    const pairings = _generatePairings(t);
    t.pairings.push(pairings);
    await CK.db.saveTournament(t);
    return { success: true, round: 1, pairings };
  };

  /* ─── Swiss Pairing Algorithm ─── */
  function _generatePairings(t) {
    if (t.format === 'swiss') return _swissPairing(t);
    if (t.format === 'roundrobin') return _roundRobinPairing(t);
    if (t.format === 'knockout') return _knockoutPairing(t);
    return _arenaPairing(t);
  }

  function _swissPairing(t) {
    const round = t.currentRound;
    const players = [...t.players].filter(p => !p.withdrawn);

    // Sort by score descending, then rating descending
    players.sort((a, b) => b.score - a.score || b.rating - a.rating);

    const paired = new Set();
    const pairings = [];

    // Group players by score
    const scoreGroups = {};
    players.forEach(p => {
      const key = p.score.toFixed(1);
      if (!scoreGroups[key]) scoreGroups[key] = [];
      scoreGroups[key].push(p);
    });

    const allPlayers = [];
    Object.keys(scoreGroups).sort((a, b) => parseFloat(b) - parseFloat(a)).forEach(key => {
      allPlayers.push(...scoreGroups[key]);
    });

    for (let i = 0; i < allPlayers.length; i++) {
      if (paired.has(allPlayers[i].id)) continue;
      const p1 = allPlayers[i];

      // Find best opponent: same score group, hasn't played before
      let bestOpponent = null;
      for (let j = i + 1; j < allPlayers.length; j++) {
        const p2 = allPlayers[j];
        if (paired.has(p2.id)) continue;
        if (p1.opponents.includes(p2.id)) continue; // Already played
        bestOpponent = p2;
        break;
      }

      // Fallback: allow rematches if necessary
      if (!bestOpponent) {
        for (let j = i + 1; j < allPlayers.length; j++) {
          if (!paired.has(allPlayers[j].id)) { bestOpponent = allPlayers[j]; break; }
        }
      }

      if (bestOpponent) {
        // Determine colors (alternate, balance)
        const p1Whites = p1.colors.filter(c => c === 'w').length;
        const p2Whites = bestOpponent.colors.filter(c => c === 'w').length;
        let white, black;
        if (p1Whites <= p2Whites) { white = p1; black = bestOpponent; }
        else { white = bestOpponent; black = p1; }

        pairings.push({
          id: `r${round}-${pairings.length + 1}`,
          round,
          board: pairings.length + 1,
          white: { id: white.id, name: white.name, rating: white.rating },
          black: { id: black.id, name: black.name, rating: black.rating },
          result: null  // '1-0', '0-1', '1/2-1/2'
        });

        paired.add(p1.id);
        paired.add(bestOpponent.id);
      }
    }

    // BYE for odd player
    const unpaired = allPlayers.filter(p => !paired.has(p.id));
    if (unpaired.length === 1) {
      pairings.push({
        id: `r${round}-bye`,
        round,
        board: pairings.length + 1,
        white: { id: unpaired[0].id, name: unpaired[0].name, rating: unpaired[0].rating },
        black: { id: 'BYE', name: 'BYE', rating: 0 },
        result: '1-0'  // Auto-win for BYE
      });
      // Award BYE point
      const byePlayer = t.players.find(p => p.id === unpaired[0].id);
      if (byePlayer) { byePlayer.score += 1; byePlayer.wins += 1; }
    }

    return pairings;
  }

  function _roundRobinPairing(t) {
    const round = t.currentRound;
    const players = [...t.players];
    const n = players.length;
    if (n % 2 !== 0) players.push({ id: 'BYE', name: 'BYE', rating: 0 });

    const totalRounds = players.length - 1;
    if (round > totalRounds) return [];

    // Circle algorithm
    const fixed = players[0];
    const rotating = players.slice(1);
    // Rotate for current round
    for (let r = 1; r < round; r++) {
      rotating.push(rotating.shift());
    }
    const current = [fixed, ...rotating];

    const pairings = [];
    const half = current.length / 2;
    for (let i = 0; i < half; i++) {
      const p1 = current[i];
      const p2 = current[current.length - 1 - i];
      if (p1.id === 'BYE' || p2.id === 'BYE') {
        const real = p1.id === 'BYE' ? p2 : p1;
        pairings.push({
          id: `r${round}-bye`,
          round, board: i + 1,
          white: { id: real.id, name: real.name, rating: real.rating },
          black: { id: 'BYE', name: 'BYE', rating: 0 },
          result: '1-0'
        });
      } else {
        const white = round % 2 === 0 ? p1 : p2;
        const black = round % 2 === 0 ? p2 : p1;
        pairings.push({
          id: `r${round}-${i + 1}`,
          round, board: i + 1,
          white: { id: white.id, name: white.name, rating: white.rating },
          black: { id: black.id, name: black.name, rating: black.rating },
          result: null
        });
      }
    }
    return pairings;
  }

  function _knockoutPairing(t) {
    const round = t.currentRound;
    const eligible = [...t.players].filter(p => !p.eliminated);

    if (round === 1) {
      eligible.sort((a, b) => b.rating - a.rating);
    }

    const pairings = [];
    for (let i = 0; i < eligible.length - 1; i += 2) {
      pairings.push({
        id: `r${round}-${Math.floor(i / 2) + 1}`,
        round, board: Math.floor(i / 2) + 1,
        white: { id: eligible[i].id, name: eligible[i].name, rating: eligible[i].rating },
        black: { id: eligible[i + 1].id, name: eligible[i + 1].name, rating: eligible[i + 1].rating },
        result: null
      });
    }
    // Odd player gets BYE
    if (eligible.length % 2 === 1) {
      const byeP = eligible[eligible.length - 1];
      pairings.push({
        id: `r${round}-bye`, round, board: pairings.length + 1,
        white: { id: byeP.id, name: byeP.name, rating: byeP.rating },
        black: { id: 'BYE', name: 'BYE', rating: 0 },
        result: '1-0'
      });
    }
    return pairings;
  }

  function _arenaPairing(t) {
    // Arena: pair available players randomly
    const available = [...t.players].filter(p => !p.withdrawn);
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    return _swissPairing(t); // Use Swiss-style for arena too
  }

  /* ─── Report Result ─── */
  T.reportResult = async (tournamentId, pairingId, result) => {
    const all = await CK.db.getTournaments();
    const t = all.find(x => x.id === tournamentId);
    if (!t) return { error: 'Tournament not found' };

    // Find the pairing
    let pairing = null;
    for (const roundPairings of t.pairings) {
      const found = roundPairings.find(p => p.id === pairingId);
      if (found) { pairing = found; break; }
    }
    if (!pairing) return { error: 'Pairing not found' };
    if (pairing.result) return { error: 'Result already reported' };

    pairing.result = result; // '1-0', '0-1', '1/2-1/2'

    // Update player scores
    const whitePlayer = t.players.find(p => p.id === pairing.white.id);
    const blackPlayer = t.players.find(p => p.id === pairing.black.id);

    if (whitePlayer && blackPlayer) {
      whitePlayer.opponents.push(blackPlayer.id);
      blackPlayer.opponents.push(whitePlayer.id);
      whitePlayer.colors.push('w');
      blackPlayer.colors.push('b');

      if (result === '1-0') {
        whitePlayer.score += 1; whitePlayer.wins += 1;
        blackPlayer.losses += 1;
        if (t.format === 'knockout') blackPlayer.eliminated = true;
      } else if (result === '0-1') {
        blackPlayer.score += 1; blackPlayer.wins += 1;
        whitePlayer.losses += 1;
        if (t.format === 'knockout') whitePlayer.eliminated = true;
      } else {
        whitePlayer.score += 0.5; whitePlayer.draws += 1;
        blackPlayer.score += 0.5; blackPlayer.draws += 1;
      }
    }

    // Award XP
    if (CK.rpg) {
      if (whitePlayer) CK.rpg.awardXP(whitePlayer.id, 'game_played');
      if (blackPlayer) CK.rpg.awardXP(blackPlayer.id, 'game_played');
      if (result === '1-0' && whitePlayer) CK.rpg.awardXP(whitePlayer.id, 'game_won');
      if (result === '0-1' && blackPlayer) CK.rpg.awardXP(blackPlayer.id, 'game_won');
    }

    await CK.db.saveTournament(t);
    return { success: true };
  };

  /* ─── Next Round ─── */
  T.nextRound = async (tournamentId) => {
    const all = await CK.db.getTournaments();
    const t = all.find(x => x.id === tournamentId);
    if (!t || t.status !== 'active') return { error: 'Tournament not active' };

    // Check all results reported for current round
    const currentPairings = t.pairings[t.currentRound - 1] || [];
    const unreported = currentPairings.filter(p => !p.result);
    if (unreported.length > 0) return { error: `${unreported.length} games still in progress` };

    // Calculate tie-breaks
    _calculateTiebreaks(t);

    const maxRounds = t.format === 'roundrobin'
      ? (t.players.length % 2 === 0 ? t.players.length - 1 : t.players.length)
      : t.rounds;

    if (t.currentRound >= maxRounds) {
      t.status = 'completed';
      _calculateTiebreaks(t);
      t.standings = _getStandings(t);

      // Award tournament XP
      if (CK.rpg) {
        t.players.forEach(p => CK.rpg.awardXP(p.id, 'tournament_played'));
        const top = t.standings.slice(0, 3);
        if (top[0]) CK.rpg.awardXP(top[0].id, 'tournament_winner');
        top.forEach(p => CK.rpg.awardXP(p.id, 'tournament_top3'));
      }

      await CK.db.saveTournament(t);
      return { success: true, completed: true, standings: t.standings };
    }

    t.currentRound++;
    const pairings = _generatePairings(t);
    t.pairings.push(pairings);
    await CK.db.saveTournament(t);
    return { success: true, round: t.currentRound, pairings };
  };

  /* ─── Tie-break Calculations ─── */
  function _calculateTiebreaks(t) {
    // Buchholz: sum of opponents' scores
    t.players.forEach(p => {
      p.buchholz = p.opponents.reduce((sum, oppId) => {
        const opp = t.players.find(x => x.id === oppId);
        return sum + (opp ? opp.score : 0);
      }, 0);
    });

    // Sonneborn-Berger: sum of (beaten opponents' scores) + 0.5*(drawn opponents' scores)
    t.players.forEach(p => {
      p.sonneborn = 0;
      t.pairings.flat().forEach(pairing => {
        if (pairing.white.id === p.id || pairing.black.id === p.id) {
          const isWhite = pairing.white.id === p.id;
          const oppId = isWhite ? pairing.black.id : pairing.white.id;
          const opp = t.players.find(x => x.id === oppId);
          if (!opp) return;
          if ((isWhite && pairing.result === '1-0') || (!isWhite && pairing.result === '0-1')) {
            p.sonneborn += opp.score;
          } else if (pairing.result === '1/2-1/2') {
            p.sonneborn += opp.score * 0.5;
          }
        }
      });
    });
  }

  /* ─── Standings ─── */
  function _getStandings(t) {
    return [...t.players].sort((a, b) =>
      b.score - a.score ||
      b.buchholz - a.buchholz ||
      b.sonneborn - a.sonneborn ||
      b.rating - a.rating
    ).map((p, i) => ({ ...p, rank: i + 1 }));
  }

  T.getStandings = async (tournamentId) => {
    const all = await CK.db.getTournaments();
    const t = all.find(x => x.id === tournamentId);
    if (!t) return [];
    _calculateTiebreaks(t);
    return _getStandings(t);
  };

  /* ─── Get Tournament ─── */
  T.get = async (id) => {
    const all = await CK.db.getTournaments();
    return all.find(t => t.id === id) || null;
  };
  T.getAll = async () => await CK.db.getTournaments();
  T.getActive = async () => {
    const all = await CK.db.getTournaments();
    return all.filter(t => t.status === 'active');
  };
  T.getCompleted = async () => {
    const all = await CK.db.getTournaments();
    return all.filter(t => t.status === 'completed');
  };
  T.FORMATS = FORMATS;

  /* ─── Delete Tournament ─── */
  T.delete = async (id) => {
    await CK.db.deleteTournament(id);
    return true;
  };

  /* ─── Render: Tournament Card ─── */
  T.renderTournamentList = async (containerId, options = {}) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const all = await CK.db.getTournaments();
    const tournaments = options.status ? all.filter(t => t.status === options.status) : all;
    const _e = CK.esc || (s => s);

    if (!tournaments.length) {
      el.innerHTML = '<div style="text-align:center;padding:40px;opacity:0.5;">No tournaments found.</div>';
      return;
    }

    el.innerHTML = tournaments.map(t => {
      // Tournaments can arrive in two shapes: the engine's native model
      // (players[], maxPlayers, timeControl, currentRound) OR the admin/
      // localStorage model (participants, format string, no players array).
      // Normalise everything defensively so a missing field never throws.
      const fmtKey  = (t.format || 'swiss').toString().toLowerCase();
      const fmt     = FORMATS[fmtKey] || FORMATS[t.format] || FORMATS.swiss || { icon: '🏆', name: t.format || 'Swiss' };
      const status  = (t.status || 'registration').toString().toLowerCase();
      const statusColors = { registration: '#3b82f6', upcoming: '#3b82f6', active: '#22c55e', completed: '#9ca3af', cancelled: '#ef4444' };
      const playerCount = Array.isArray(t.players) ? t.players.length
                        : Array.isArray(t.participants) ? t.participants.length
                        : (parseInt(t.participants) || 0);
      const maxPlayers  = t.maxPlayers || t.max || '∞';
      const rounds      = t.rounds || '—';
      const tc          = t.timeControl || t.time_control || t.format || '';
      const tid         = _e(String(t.id == null ? '' : t.id));
      return `
        <div class="p-card" style="margin-bottom:12px; cursor:pointer;" onclick="CK.tournament.showDetail('${tid}')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:1.1rem; font-weight:700;">${fmt.icon || '🏆'} ${_e(t.name || 'Tournament')}</div>
              <div style="font-size:0.8rem; opacity:0.6;">${_e(fmt.name || 'Swiss')} · ${_e(String(rounds))} rounds${tc ? ' · ' + _e(String(tc)) : ''}</div>
            </div>
            <div style="text-align:right;">
              <span class="p-badge" style="background:${statusColors[status] || '#9ca3af'}">${_e(status.toUpperCase())}</span>
              <div style="font-size:0.8rem; opacity:0.6; margin-top:4px;">${playerCount}/${_e(String(maxPlayers))} players</div>
            </div>
          </div>
          ${status === 'active' && t.currentRound ? `<div style="font-size:0.8rem; margin-top:8px; color:var(--p-gold);">Round ${_e(String(t.currentRound))}/${_e(String(rounds))}</div>` : ''}
        </div>`;
    }).join('');
  };

  /* ─── Render: Standings Table ─── */
  T.renderStandings = async (containerId, tournamentId) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const standings = await T.getStandings(tournamentId);
    const _e = CK.esc || (s => s);
    const medals = ['🥇', '🥈', '🥉'];

    el.innerHTML = `<table class="p-table" style="width:100%">
      <thead><tr><th>#</th><th>Player</th><th>Rating</th><th>Score</th><th>W</th><th>D</th><th>L</th><th>Buchholz</th><th>SB</th></tr></thead>
      <tbody>${standings.map((p, i) => `
        <tr ${i < 3 ? 'style="background:rgba(251,191,36,0.05)"' : ''}>
          <td style="font-weight:800;">${medals[i] || (i + 1)}</td>
          <td style="font-weight:600;">${_e(p.name)}</td>
          <td>${p.rating}</td>
          <td style="font-weight:800; color:var(--p-gold);">${p.score}</td>
          <td style="color:#22c55e;">${p.wins}</td>
          <td>${p.draws}</td>
          <td style="color:#ef4444;">${p.losses}</td>
          <td>${p.buchholz.toFixed(1)}</td>
          <td>${p.sonneborn.toFixed(1)}</td>
        </tr>`).join('')}
      </tbody></table>`;
  };

  /* ─── Render: Pairings for a round ─── */
  T.renderPairings = async (containerId, tournamentId, round = null) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const t = await T.get(tournamentId);
    if (!t) return;
    const r = round || t.currentRound;
    const pairings = t.pairings[r - 1] || [];
    const _e = CK.esc || (s => s);
    const isAdmin = window.location.pathname.includes('admin') || localStorage.getItem('ck_auth_role') === 'admin';

    el.innerHTML = `<h4 style="margin-bottom:12px;">Round ${r} Pairings</h4>` +
      pairings.map(p => {
        let resultBadge = '';
        if (p.result) {
          resultBadge = `<span class="p-badge ${p.result === '1/2-1/2' ? '' : p.result === '1-0' ? 'p-badge-green' : 'p-badge-red'}">${p.result}</span>`;
        } else if (isAdmin) {
          resultBadge = `<div style="display:flex;gap:4px;">
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.tournament._uiReportResult('${t.id}','${p.id}','1-0')">1-0</button>
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.tournament._uiReportResult('${t.id}','${p.id}','1/2-1/2')">½-½</button>
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.tournament._uiReportResult('${t.id}','${p.id}','0-1')">0-1</button>
            </div>`;
        } else {
          resultBadge = `<span class="p-badge" style="background:#555">In Progress</span>`;
        }
        
        return `
          <div class="p-card" style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:0.7rem; opacity:0.4;">Board ${p.board}</span>
              <div><strong>${_e(p.white.name)}</strong> (${p.white.rating}) <span style="opacity:0.3">vs</span> <strong>${_e(p.black.name)}</strong> (${p.black.rating})</div>
            </div>
            ${resultBadge}
          </div>`;
      }).join('');
  };

  /* ─── Show Detail Modal ─── */
  T.showDetail = async (tournamentId) => {
    const t = await T.get(tournamentId);
    if (!t) return;
    const _e = CK.esc || (s => s);
    const fmt = FORMATS[t.format] || FORMATS.swiss;
    const isAdmin = window.location.pathname.includes('admin') || localStorage.getItem('ck_auth_role') === 'admin';
    const isStudent = localStorage.getItem('ck_auth_role') === 'student';
    
    // Determine if student is registered
    let studentAction = '';
    if (isStudent && t.status === 'registration') {
       const user = JSON.parse(localStorage.getItem('ck_auth_user') || '{}');
       const isReg = t.players.find(p => p.id === user.id);
       if (isReg) {
         studentAction = `<button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.tournament._uiStudentLeave('${t.id}')">Leave Tournament</button>`;
       } else {
         studentAction = `<button class="p-btn p-btn-gold p-btn-sm" onclick="CK.tournament._uiStudentJoin('${t.id}')">Join Tournament</button>`;
       }
    }

    // Build modal
    const modal = document.createElement('div');
    modal.className = 'p-modal-overlay open';
    modal.id = 'tournamentDetailModal';
    modal.innerHTML = `
      <div class="p-modal" style="max-width:800px; max-height:90vh; overflow-y:auto;">
        <div class="p-modal-header">
          <h3 class="p-modal-title">${fmt.icon} ${_e(t.name)}</h3>
          <button class="p-modal-close" onclick="document.getElementById('tournamentDetailModal').remove()">✕</button>
        </div>
        <div class="p-modal-body">
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px;">
            <div class="p-card" style="text-align:center;"><div style="font-size:1.5rem; font-weight:800;">${t.players.length}</div><div style="font-size:0.75rem; opacity:0.6;">Players</div></div>
            <div class="p-card" style="text-align:center;"><div style="font-size:1.5rem; font-weight:800;">${t.currentRound}/${t.rounds}</div><div style="font-size:0.75rem; opacity:0.6;">Round</div></div>
            <div class="p-card" style="text-align:center;"><div style="font-size:1.5rem; font-weight:800;">${_e(t.timeControl)}</div><div style="font-size:0.75rem; opacity:0.6;">Time Control</div></div>
          </div>
          <div style="margin-bottom: 16px; text-align: center;">${studentAction}</div>
          
          <div id="tourneyDetailStandings" style="margin-bottom:20px;">Loading standings...</div>
          <div id="tourneyDetailPairings">Loading pairings...</div>
          ${(t.status === 'active' && isAdmin) ? `
            <div style="margin-top:16px; text-align:center;">
              <button class="p-btn p-btn-gold" onclick="CK.tournament._uiNextRound('${t.id}')">▶ Next Round</button>
            </div>` : ''}
          ${(t.status === 'registration' && isAdmin) ? `
            <div style="margin-top:16px; text-align:center;">
              <button class="p-btn p-btn-gold" onclick="CK.tournament._uiStart('${t.id}')">🏁 Start Tournament</button>
            </div>` : ''}
        </div>
      </div>`;
    document.body.appendChild(modal);
    await T.renderStandings('tourneyDetailStandings', tournamentId);
    await T.renderPairings('tourneyDetailPairings', tournamentId);
  };

  T._uiReportResult = async (tourId, pairingId, res) => {
    const result = await T.reportResult(tourId, pairingId, res);
    if (result.error) { CK.showToast(result.error, 'error'); return; }
    await T.renderPairings('tourneyDetailPairings', tourId);
    await T.renderStandings('tourneyDetailStandings', tourId);
  };

  T._uiStart = async (id) => {
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = 'Starting...';
    const result = await T.start(id);
    if (result.error) { CK.showToast(result.error, 'error'); btn.disabled = false; btn.innerText = '🏁 Start Tournament'; return; }
    CK.showToast('Tournament started! Round 1 pairings generated.', 'success');
    document.getElementById('tournamentDetailModal')?.remove();
    await T.showDetail(id);
    if (document.getElementById('adminTournamentList')) T.renderTournamentList('adminTournamentList');
  };

  T._uiNextRound = async (id) => {
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = 'Calculating...';
    const result = await T.nextRound(id);
    if (result.error) { CK.showToast(result.error, 'error'); btn.disabled = false; btn.innerText = '▶ Next Round'; return; }
    if (result.completed) {
      CK.showToast('Tournament completed! Final standings are ready.', 'success');
    } else {
      CK.showToast(`Round ${result.round} pairings generated!`, 'success');
    }
    document.getElementById('tournamentDetailModal')?.remove();
    await T.showDetail(id);
  };
  
  T._uiStudentJoin = async (id) => {
    const user = JSON.parse(localStorage.getItem('ck_auth_user') || '{}');
    const res = await T.registerPlayer(id, user);
    if (res.error) { CK.showToast(res.error, 'error'); return; }
    CK.showToast('🏆 Successfully joined tournament!', 'success');

    // Award XP for joining a tournament (CK.db.awardXP handles toast too)
    if (CK.db && CK.db.awardXP && user.id) {
      try { await CK.db.awardXP(user.id, 25, 'Joined a tournament'); } catch(e){}
    }

    document.getElementById('tournamentDetailModal')?.remove();
    await T.showDetail(id);
    if (CK.student && CK.student.renderTournamentsTab) CK.student.renderTournamentsTab();
  };

  T._uiStudentLeave = async (id) => {
    const user = JSON.parse(localStorage.getItem('ck_auth_user') || '{}');
    await T.removePlayer(id, user.id);
    CK.showToast('Left tournament.', 'success');
    document.getElementById('tournamentDetailModal')?.remove();
    await T.showDetail(id);
    if (CK.student && CK.student.renderTournamentsTab) CK.student.renderTournamentsTab();
  };

  /* ─── Create Tournament UI ─── */
  T.showCreateForm = async (containerId) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const students = await CK.db.getProfiles('student');
    const _e = CK.esc || (s => s);

    el.innerHTML = `
      <div class="p-card">
        <h3 style="margin-bottom:16px;">🏆 Create New Tournament</h3>
        <div class="p-form-group"><label class="p-form-label">Tournament Name</label><input class="p-form-control" id="tnName" placeholder="e.g. Monthly Rapid Championship" value="ChessKidoo Monthly Rapid"></div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
          <div class="p-form-group"><label class="p-form-label">Format</label>
            <select class="p-form-control" id="tnFormat">
              <option value="swiss">Swiss System</option>
              <option value="roundrobin">Round Robin</option>
              <option value="knockout">Knockout</option>
              <option value="arena">Arena</option>
            </select>
          </div>
          <div class="p-form-group"><label class="p-form-label">Rounds</label><input class="p-form-control" id="tnRounds" type="number" value="5" min="1" max="15"></div>
          <div class="p-form-group"><label class="p-form-label">Time Control</label><input class="p-form-control" id="tnTime" value="10+0"></div>
        </div>
        <div class="p-form-group"><label class="p-form-label">Description</label><textarea class="p-form-control" id="tnDesc" rows="2" placeholder="Optional description"></textarea></div>
        <div class="p-form-group"><label class="p-form-label">Register Students</label>
          <div id="tnPlayerList" style="max-height:200px;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px;">
            ${students.filter(s => s.status !== 'Waiting List').map(s => `
              <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;">
                <input type="checkbox" class="tn-player-cb" value="${_e(s.id)}" data-name="${_e(s.full_name)}" data-rating="${s.rating || 800}" checked>
                <span>${_e(s.full_name)}</span> <span style="opacity:0.4;font-size:0.8rem;">(${s.rating || 800})</span>
              </label>`).join('')}
          </div>
        </div>
        <button class="p-btn p-btn-gold" onclick="CK.tournament._uiCreate()">🏁 Create & Open Registration</button>
      </div>`;
  };

  T._uiCreate = async () => {
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = 'Creating...';
    const name = document.getElementById('tnName')?.value || 'Tournament';
    const format = document.getElementById('tnFormat')?.value || 'swiss';
    const rounds = parseInt(document.getElementById('tnRounds')?.value) || 5;
    const timeControl = document.getElementById('tnTime')?.value || '10+0';
    const desc = document.getElementById('tnDesc')?.value || '';

    const t = await T.create({ name, format, rounds, timeControl, description: desc });

    // Register checked players
    const cbs = document.querySelectorAll('.tn-player-cb:checked');
    for (const cb of cbs) {
      await T.registerPlayer(t.id, { id: cb.value, full_name: cb.dataset.name, rating: parseInt(cb.dataset.rating) || 800 });
    }

    CK.showToast(`Tournament "${name}" created with ${cbs.length} players!`, 'success');

    // Refresh any visible tournament lists
    if (document.getElementById('adminTournamentList')) await T.renderTournamentList('adminTournamentList');
    btn.disabled = false;
    btn.innerText = '🏁 Create & Open Registration';
  };

  return T;
})();
