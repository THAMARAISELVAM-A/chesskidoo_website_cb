/* assets/js/opening-trainer.js
   ChessKidoo — Opening Preparation Trainer
   12 key openings, move-by-move drill, mastery tracking, ECO codes. */

window.CK = window.CK || {};

CK.openingTrainer = (() => {
  const MASTERY_KEY = 'ck_opening_mastery';

  /* ── Opening Database ── */
  const OPENINGS = [
    {
      id: 'italian',
      eco: 'C50', name: "Italian Game", emoji: '🇮🇹',
      side: 'white',
      moves: ['e2e4','e7e5','g1f3','b8c6','f1c4'],
      description: 'Control the center, develop pieces naturally. The bishop on c4 eyes the f7 pawn.',
      tips: ['Develop knights before bishops','Castle early','Avoid moving the same piece twice'],
      theme: 'Open game, rapid development',
      level: 'Beginner',
      color: '#3b82f6'
    },
    {
      id: 'sicilian',
      eco: 'B20', name: "Sicilian Defence", emoji: '🛡️',
      side: 'black',
      moves: ['e2e4','c7c5'],
      description: 'The most popular defence. Black fights for the center with a pawn from the flank.',
      tips: ['Create imbalances early','Black often gets queenside play','Leads to sharp positions'],
      theme: 'Dynamic counterplay',
      level: 'Intermediate',
      color: '#8b5cf6'
    },
    {
      id: 'french',
      eco: 'C00', name: "French Defence", emoji: '🥐',
      side: 'black',
      moves: ['e2e4','e7e6','d2d4','d7d5'],
      description: 'Solid structure. Black builds a pawn chain and attacks White\'s center from the side.',
      tips: ['The c8 bishop can be problematic — activate it','Push c5 to challenge d4','Counterattack with d4 push'],
      theme: 'Solid, strategic',
      level: 'Beginner',
      color: '#0ea5e9'
    },
    {
      id: 'caro_kann',
      eco: 'B10', name: "Caro-Kann Defence", emoji: '⚔️',
      side: 'black',
      moves: ['e2e4','c7c6','d2d4','d7d5'],
      description: 'Solid and reliable. Black develops the c-pawn before pushing d5.',
      tips: ['Maintain solid pawn structure','The c6 pawn supports d5','Excellent for positional players'],
      theme: 'Solid and resilient',
      level: 'Intermediate',
      color: '#14b8a6'
    },
    {
      id: 'queens_gambit',
      eco: 'D06', name: "Queen's Gambit", emoji: '♛',
      side: 'white',
      moves: ['d2d4','d7d5','c2c4'],
      description: 'White offers a pawn to control the center. One of the oldest and most respected openings.',
      tips: ['Don\'t rush to take back the pawn','Control e4 and e5','Develop naturally: Nc3, Bf4, e3'],
      theme: 'Classical, positional',
      level: 'Beginner',
      color: '#d97706'
    },
    {
      id: 'kings_indian',
      eco: 'E60', name: "King's Indian Defence", emoji: '⚡',
      side: 'black',
      moves: ['d2d4','g8f6','c2c4','g7g6','b1c3','f8g7','e2e4','d7d6','g1f3','e8g8'],
      description: 'Black allows White to build a big center, then strikes back with e5 or c5.',
      tips: ['Castle kingside quickly','Launch f5 break when ready','Seek counterplay on kingside'],
      theme: 'Dynamic counterattack',
      level: 'Advanced',
      color: '#ef4444'
    },
    {
      id: 'ruy_lopez',
      eco: 'C60', name: "Ruy López", emoji: '🏰',
      side: 'white',
      moves: ['e2e4','e7e5','g1f3','b8c6','f1b5'],
      description: 'The Spanish game. White pins the c6 knight to pressure the e5 pawn.',
      tips: ['The bishop on b5 exerts indirect pressure','Castle kingside and push d4','Long strategic battles ahead'],
      theme: 'Strategic, long-term pressure',
      level: 'Advanced',
      color: '#f59e0b'
    },
    {
      id: 'london',
      eco: 'D02', name: "London System", emoji: '🇬🇧',
      side: 'white',
      moves: ['d2d4','d7d5','g1f3','g8f6','c1f4','e7e6','e2e3'],
      description: 'A solid, reliable setup for White. Easy to learn and hard to beat.',
      tips: ['Build a solid triangle: d4+e3+Bf4','Develop Nbd2, Bd3 naturally','Avoid early c4 if unsure'],
      theme: 'Solid, systematic',
      level: 'Beginner',
      color: '#6366f1'
    },
    {
      id: 'scotch',
      eco: 'C44', name: "Scotch Game", emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      side: 'white',
      moves: ['e2e4','e7e5','g1f3','b8c6','d2d4','e5d4','f3d4'],
      description: 'White immediately challenges the center with d4. Leads to open, tactical games.',
      tips: ['Recapture with Nxd4, not cxd4','Open center favors the better-developed side','Watch out for …Qh4+ tricks'],
      theme: 'Open, tactical',
      level: 'Intermediate',
      color: '#0ea5e9'
    },
    {
      id: 'nimzo_indian',
      eco: 'E20', name: "Nimzo-Indian Defence", emoji: '🧩',
      side: 'black',
      moves: ['d2d4','g8f6','c2c4','e7e6','b1c3','f8b4'],
      description: 'Black pins the c3 knight and fights for dark squares. A deep strategic opening.',
      tips: ['Pin the knight with …Bb4','Trade the bishop for a knight only when it damages White\'s structure','Excellent for positional players'],
      theme: 'Strategic, dark squares',
      level: 'Advanced',
      color: '#a855f7'
    },
    {
      id: 'english',
      eco: 'A10', name: "English Opening", emoji: '🎭',
      side: 'white',
      moves: ['c2c4'],
      description: 'A flexible flank opening. White controls d5 and can transpose to many systems.',
      tips: ['Maintain flexibility early','Don\'t rush d4 — wait for the right moment','Control d5 with c4+Nc3'],
      theme: 'Flexible, hypermodern',
      level: 'Intermediate',
      color: '#14b8a6'
    },
    {
      id: 'dutch',
      eco: 'A80', name: "Dutch Defence", emoji: '🌷',
      side: 'black',
      moves: ['d2d4','f7f5'],
      description: 'Black immediately stakes out kingside space. Aggressive and uncompromising.',
      tips: ['Follow up with …e6 and …Nf6','The Stonewall (f5+d5+e6) is a solid setup','Beware of e4 breaks'],
      theme: 'Aggressive, unbalanced',
      level: 'Intermediate',
      color: '#f97316'
    }
  ];

  /* ── Mastery Storage ── */
  const getMastery  = () => JSON.parse(localStorage.getItem(MASTERY_KEY) || '{}');
  const saveMastery = (d) => localStorage.setItem(MASTERY_KEY, JSON.stringify(d));

  function recordAttempt(userId, openingId, correct) {
    const m = getMastery();
    const k = `${userId}_${openingId}`;
    if (!m[k]) m[k] = { attempts: 0, correct: 0 };
    m[k].attempts++;
    if (correct) m[k].correct++;
    m[k].lastDate = new Date().toISOString().split('T')[0];
    saveMastery(m);
  }

  function getMasteryPct(userId, openingId) {
    const m = getMastery()[`${userId}_${openingId}`];
    if (!m || !m.attempts) return 0;
    return Math.round(m.correct / m.attempts * 100);
  }

  function getMasteryLevel(pct) {
    if (pct >= 90) return { label: 'Master',     color: 'var(--p-gold)',  stars: '★★★' };
    if (pct >= 70) return { label: 'Proficient', color: 'var(--p-teal)',  stars: '★★☆' };
    if (pct >= 40) return { label: 'Learning',   color: 'var(--p-blue)',  stars: '★☆☆' };
    return                 { label: 'Beginner',   color: 'rgba(255,255,255,.3)', stars: '☆☆☆' };
  }

  /* ── Render opening grid ── */
  function renderOpeningList(containerId, userId, filter = 'all') {
    const el = document.getElementById(containerId);
    if (!el) return;
    const filtered = filter === 'all' ? OPENINGS : OPENINGS.filter(o => o.side === filter);
    el.innerHTML = `
      <div class="ot-filter-bar">
        <button class="ot-filter-btn${filter==='all'?' active':''}" onclick="CK.openingTrainer.renderOpeningList('${containerId}','${userId}','all')">All</button>
        <button class="ot-filter-btn${filter==='white'?' active':''}" onclick="CK.openingTrainer.renderOpeningList('${containerId}','${userId}','white')">⬜ White</button>
        <button class="ot-filter-btn${filter==='black'?' active':''}" onclick="CK.openingTrainer.renderOpeningList('${containerId}','${userId}','black')">⬛ Black</button>
      </div>
      <div class="ot-grid">
        ${filtered.map(o => {
          const pct = getMasteryPct(userId, o.id);
          const lvl = getMasteryLevel(pct);
          return `
            <div class="ot-card" onclick="CK.openingTrainer.startDrill('${o.id}','${userId}')" style="border-top:3px solid ${o.color}">
              <div class="ot-card-header">
                <span class="ot-emoji">${o.emoji}</span>
                <div>
                  <div class="ot-card-name">${o.name}</div>
                  <div class="ot-card-eco">${o.eco} · ${o.level} · ${o.side === 'white' ? '⬜ White' : '⬛ Black'}</div>
                </div>
              </div>
              <div class="ot-card-desc">${o.description}</div>
              <div class="ot-card-footer">
                <div class="ot-mastery-bar-track"><div class="ot-mastery-bar" style="width:${pct}%;background:${o.color}"></div></div>
                <span style="font-size:.72rem;color:${lvl.color};font-weight:700;">${lvl.stars} ${lvl.label}</span>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  /* ── Start drill ── */
  let _drillState = null;

  function startDrill(openingId, userId) {
    const opening = OPENINGS.find(o => o.id === openingId);
    if (!opening) return;

    _drillState = {
      opening, userId,
      step: 0,
      correctMoves: 0,
      totalPrompts: 0
    };

    _renderDrillModal(opening, userId);
  }

  function _renderDrillModal(opening, userId) {
    // Remove existing
    document.getElementById('otDrillModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'otDrillModal';
    modal.className = 'ot-modal-overlay';
    modal.innerHTML = `
      <div class="ot-modal">
        <div class="ot-modal-header">
          <div>
            <div style="font-size:1.1rem;font-weight:800;color:#fff;">${opening.emoji} ${opening.name}</div>
            <div style="font-size:.78rem;color:var(--p-text-muted);">${opening.eco} · ${opening.theme}</div>
          </div>
          <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.openingTrainer.closeDrill()">✕ Close</button>
        </div>
        <div class="ot-modal-body">
          <div class="ot-drill-left">
            <div id="otDrillBoard" style="width:340px;"></div>
            <div id="otDrillStatus" class="ot-drill-status">Play the correct move for ${opening.side === 'white' ? '⬜ White' : '⬛ Black'}</div>
          </div>
          <div class="ot-drill-right">
            <div class="ot-info-box">
              <div class="ot-info-title">📖 About this Opening</div>
              <div class="ot-info-desc">${opening.description}</div>
            </div>
            <div class="ot-tips">
              <div class="ot-info-title">💡 Key Tips</div>
              ${opening.tips.map(t => `<div class="ot-tip">• ${t}</div>`).join('')}
            </div>
            <div id="otMoveProgress" class="ot-move-progress">
              <div class="ot-info-title">Moves to learn</div>
              ${opening.moves.map((m, i) => `<span id="otMove_${i}" class="ot-move-pill">${_moveLabel(m)}</span>`).join('')}
            </div>
            <div id="otDrillResult" style="display:none;"></div>
            <div style="display:flex;gap:8px;margin-top:12px;">
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.openingTrainer._showSolution()">💡 Show Move</button>
              <button class="p-btn p-btn-teal p-btn-sm" id="otNextBtn" style="display:none;" onclick="CK.openingTrainer._advanceDrill()">Next →</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    // Init board
    requestAnimationFrame(() => {
      if (typeof Chessboard === 'undefined') {
        document.getElementById('otDrillStatus').textContent = 'Board library not loaded.';
        return;
      }
      if (!window.Chess) {
        document.getElementById('otDrillStatus').textContent = 'Chess library not loaded. Please refresh.';
        return;
      }
      const game = new window.Chess();
      _drillState.game = game;

      const board = Chessboard('otDrillBoard', {
        pieceTheme: function (piece) {
          return 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + piece.toLowerCase() + '.png';
        },
        draggable: true,
        position: 'start',
        orientation: opening.side,
        onDragStart: (source, piece) => {
          if (game.game_over()) return false;
          return (opening.side === 'white' && game.turn() === 'w') || (opening.side === 'black' && game.turn() === 'b');
        },
        onDrop: (source, target) => _drillHandleDrop(source, target, board),
        onSnapEnd: () => board.position(game.fen())
      });
      _drillState.board = board;

      // If opening is black, play white's first move automatically
      if (opening.side === 'black' && opening.moves.length > 0) {
        _playAutoMove(board, game, 0);
      }
    });
  }

  function _moveLabel(uci) {
    const files = ['a','b','c','d','e','f','g','h'];
    const fr = uci.slice(0,2), to = uci.slice(2,4);
    return fr + to;
  }

  function _playAutoMove(board, game, stepIdx) {
    const opening = _drillState.opening;
    const uci = opening.moves[stepIdx];
    const move = game.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: 'q' });
    if (move) {
      board.position(game.fen());
      _highlightMovePill(stepIdx, true);
      _drillState.step = stepIdx + 1;
    }
  }

  function _drillHandleDrop(source, target, board) {
    const { opening, game } = _drillState;
    const expected = opening.moves[_drillState.step];
    if (!expected) return 'snapback';

    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (!move) return 'snapback';

    const played = source + target;
    if (played === expected) {
      _drillState.correctMoves++;
      _drillState.totalPrompts++;
      _highlightMovePill(_drillState.step, true);
      _drillState.step++;
      _setStatus('✅ Correct!', 'var(--p-teal)');

      // Play opponent's response if there's one
      if (_drillState.step < opening.moves.length) {
        const opponentIsAuto = (opening.side === 'white' && _drillState.step % 2 === 1) ||
                               (opening.side === 'black' && _drillState.step % 2 === 0);
        if (opponentIsAuto) {
          setTimeout(() => _playAutoMove(board, game, _drillState.step), 600);
        }
      } else {
        // Drill complete!
        _onDrillComplete();
      }
    } else {
      game.undo();
      _drillState.totalPrompts++;
      _setStatus('❌ Not quite — try again!', 'var(--p-danger)');
      return 'snapback';
    }
  }

  function _highlightMovePill(idx, correct) {
    const pill = document.getElementById(`otMove_${idx}`);
    if (pill) {
      pill.classList.add(correct ? 'ot-move-correct' : 'ot-move-wrong');
    }
  }

  function _setStatus(msg, color) {
    const el = document.getElementById('otDrillStatus');
    if (el) { el.textContent = msg; el.style.color = color || 'rgba(255,255,255,.7)'; }
  }

  function _showSolution() {
    const { opening, step } = _drillState;
    const expected = opening.moves[step];
    if (expected) _setStatus(`Hint: play ${expected}`, 'var(--p-gold)');
  }

  function _onDrillComplete() {
    const { opening, userId, correctMoves, totalPrompts } = _drillState;
    const accuracy = totalPrompts > 0 ? Math.round(correctMoves / totalPrompts * 100) : 100;
    recordAttempt(userId, opening.id, accuracy >= 70);

    const pct = getMasteryPct(userId, opening.id);
    const lvl = getMasteryLevel(pct);

    const resultEl = document.getElementById('otDrillResult');
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div class="ot-result-card">
          <div style="font-size:1.5rem;margin-bottom:4px;">${accuracy >= 80 ? '🏆' : accuracy >= 50 ? '⭐' : '📖'}</div>
          <div style="font-weight:700;color:#fff;margin-bottom:4px;">Drill Complete!</div>
          <div style="font-size:.85rem;color:rgba(255,255,255,.6);">Accuracy: <b style="color:var(--p-teal)">${accuracy}%</b></div>
          <div style="font-size:.78rem;color:${lvl.color};margin-top:4px;">${opening.name} Mastery: ${lvl.stars} ${lvl.label} (${pct}%)</div>
          <button class="p-btn p-btn-teal p-btn-sm" style="margin-top:10px;" onclick="CK.openingTrainer.startDrill('${opening.id}','${userId}')">🔁 Retry</button>
        </div>`;
    }

    _setStatus('Opening learned! 🎉', 'var(--p-gold)');

    if (CK.notifs && accuracy >= 80) {
      CK.notifs.push('achievement', `${opening.emoji} ${opening.name} Mastered!`, `You completed the ${opening.name} drill with ${accuracy}% accuracy!`, userId, 'student');
    }
  }

  function _advanceDrill() {
    const { userId } = _drillState;
    closeDrill();
    // Re-render whichever grid is visible
    const gridEl = document.getElementById('otGrid');
    if (gridEl) renderOpeningList('otGrid', userId);
    const overviewEl = document.getElementById('otMasteryOverview');
    if (overviewEl) renderMasteryOverview('otMasteryOverview', userId);
  }

  function closeDrill() {
    document.getElementById('otDrillModal')?.remove();
    _drillState = null;
  }

  /* ── Mastery overview ── */
  function renderMasteryOverview(containerId, userId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const m = getMastery();
    const total = OPENINGS.length;
    const mastered = OPENINGS.filter(o => getMasteryPct(userId, o.id) >= 90).length;
    const learning = OPENINGS.filter(o => {
      const p = getMasteryPct(userId, o.id);
      return p >= 40 && p < 90;
    }).length;
    el.innerHTML = `
      <div class="ot-overview">
        <div class="ot-ov-stat"><div class="ot-ov-val" style="color:var(--p-gold)">${mastered}</div><div class="ot-ov-lbl">Mastered</div></div>
        <div class="ot-ov-stat"><div class="ot-ov-val" style="color:var(--p-blue)">${learning}</div><div class="ot-ov-lbl">Learning</div></div>
        <div class="ot-ov-stat"><div class="ot-ov-val">${total - mastered - learning}</div><div class="ot-ov-lbl">Not Started</div></div>
        <div class="ot-ov-stat"><div class="ot-ov-val">${total}</div><div class="ot-ov-lbl">Total</div></div>
      </div>`;
  }

  return {
    OPENINGS, getMasteryPct, getMasteryLevel,
    renderOpeningList, renderMasteryOverview,
    startDrill, closeDrill, _showSolution, _advanceDrill
  };
})();
