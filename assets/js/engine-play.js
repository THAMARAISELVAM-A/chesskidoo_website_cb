/* assets/js/engine-play.js
   ChessKidoo — In-Browser Chess Engine
   Negamax alpha-beta with piece-square tables, depth 3 (~900-1100 ELO).
   Fully offline, no CDN, pure Chess.js integration. */

window.CK = window.CK || {};

CK.enginePlay = (() => {
  /* ─── Piece values (centipawns) ─── */
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

  /* ─── Piece-square tables (from perspective of white) ─── */
  const PST = {
    p: [
      [0,0,0,0,0,0,0,0],
      [50,50,50,50,50,50,50,50],
      [10,10,20,30,30,20,10,10],
      [5,5,10,25,25,10,5,5],
      [0,0,0,20,20,0,0,0],
      [5,-5,-10,0,0,-10,-5,5],
      [5,10,10,-20,-20,10,10,5],
      [0,0,0,0,0,0,0,0]
    ],
    n: [
      [-50,-40,-30,-30,-30,-30,-40,-50],
      [-40,-20,0,0,0,0,-20,-40],
      [-30,0,10,15,15,10,0,-30],
      [-30,5,15,20,20,15,5,-30],
      [-30,0,15,20,20,15,0,-30],
      [-30,5,10,15,15,10,5,-30],
      [-40,-20,0,5,5,0,-20,-40],
      [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    b: [
      [-20,-10,-10,-10,-10,-10,-10,-20],
      [-10,0,0,0,0,0,0,-10],
      [-10,0,5,10,10,5,0,-10],
      [-10,5,5,10,10,5,5,-10],
      [-10,0,10,10,10,10,0,-10],
      [-10,10,10,10,10,10,10,-10],
      [-10,5,0,0,0,0,5,-10],
      [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    r: [
      [0,0,0,0,0,0,0,0],
      [5,10,10,10,10,10,10,5],
      [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],
      [0,0,0,5,5,0,0,0]
    ],
    q: [
      [-20,-10,-10,-5,-5,-10,-10,-20],
      [-10,0,0,0,0,0,0,-10],
      [-10,0,5,5,5,5,0,-10],
      [-5,0,5,5,5,5,0,-5],
      [0,0,5,5,5,5,0,-5],
      [-10,5,5,5,5,5,0,-10],
      [-10,0,5,0,0,0,0,-10],
      [-20,-10,-10,-5,-5,-10,-10,-20]
    ],
    k: [
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-20,-30,-30,-40,-40,-30,-30,-20],
      [-10,-20,-20,-20,-20,-20,-20,-10],
      [20,20,0,0,0,0,20,20],
      [20,30,10,0,0,10,30,20]
    ]
  };

  function _pstVal(piece, row, col) {
    const table = PST[piece.type];
    if (!table) return 0;
    return piece.color === 'w' ? table[row][col] : table[7 - row][col];
  }

  /* ─── Evaluate position from White's perspective ─── */
  function evaluate(game) {
    if (game.in_checkmate()) return game.turn() === 'w' ? -50000 : 50000;
    if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) return 0;

    let score = 0;
    const board = game.board();
    board.forEach((row, r) => {
      row.forEach((sq, c) => {
        if (!sq) return;
        const pieceVal = (VAL[sq.type] || 0) + _pstVal(sq, r, c);
        score += sq.color === 'w' ? pieceVal : -pieceVal;
      });
    });
    return score;
  }

  /* ─── Move ordering: captures first, then checks ─── */
  function _orderMoves(moves) {
    return moves.sort((a, b) => {
      const aScore = (a.captured ? VAL[a.captured] || 0 : 0) + (a.san.includes('+') ? 50 : 0);
      const bScore = (b.captured ? VAL[b.captured] || 0 : 0) + (b.san.includes('+') ? 50 : 0);
      return bScore - aScore;
    });
  }

  /* ─── Negamax with alpha-beta pruning ─── */
  function negamax(game, depth, alpha, beta) {
    if (depth === 0 || game.game_over()) {
      const raw = evaluate(game);
      return game.turn() === 'w' ? raw : -raw;
    }
    const moves = _orderMoves(game.moves({ verbose: true }));
    for (const move of moves) {
      game.move(move);
      const score = -negamax(game, depth - 1, -beta, -alpha);
      game.undo();
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  /* ─── Public: get best move ─── */
  function getBestMove(game, depth = 3) {
    if (game.game_over()) return null;
    const moves = _orderMoves(game.moves({ verbose: true }));
    let bestMove = null, bestScore = -Infinity;

    if (depth === 1) {
      for (const move of moves) {
        game.move(move);
        const score = -evaluate(game);
        game.undo();
        if (score > bestScore || bestMove === null) { bestScore = score; bestMove = move; }
      }
    } else {
      for (const move of moves) {
        game.move(move);
        const score = -negamax(game, depth - 1, -Infinity, Infinity);
        game.undo();
        if (score > bestScore) { bestScore = score; bestMove = move; }
      }
    }
    return bestMove;
  }

  /* ─── Difficulty presets ─── */
  const LEVELS = {
    Beginner:     { depth: 1, label: '🤖 Beginner AI',     elo: '~600' },
    Intermediate: { depth: 2, label: '🤖 Intermediate AI',  elo: '~900' },
    Advanced:     { depth: 3, label: '🤖 Advanced AI',      elo: '~1100' },
    Expert:       { depth: 4, label: '🤖 Expert AI',        elo: '~1300' }
  };

  /* ─── Time controls ─── */
  const TIME_CONTROLS = {
    unlimited: { label: 'Unlimited',      seconds: 0,    increment: 0 },
    bullet:    { label: 'Bullet 2+1',     seconds: 120,  increment: 1 },
    blitz:     { label: 'Blitz 5+0',      seconds: 300,  increment: 0 },
    rapid:     { label: 'Rapid 10+0',     seconds: 600,  increment: 0 },
    classical: { label: 'Classical 30+0', seconds: 1800, increment: 0 }
  };

  /* ─── Play vs Computer mode state ─── */
  let _pvGame = null, _pvBoard = null, _pvDifficulty = 'Intermediate', _pvPlayerColor = 'w';
  let _pvStatus = '', _pvThinking = false;
  let _pvClocks = { w: 0, b: 0 }, _pvIncrement = 0, _pvTimeControl = 'unlimited';
  let _pvClockInterval = null, _pvClockActive = null, _pvGameOver = false;

  /* ─── Clock helpers ─── */
  function _pvFormatTime(s) {
    if (s <= 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function _pvRenderClocks() {
    const wEl = document.getElementById('pvClockWhite');
    const bEl = document.getElementById('pvClockBlack');
    if (wEl) {
      wEl.textContent = _pvTimeControl === 'unlimited' ? '∞' : _pvFormatTime(_pvClocks.w);
      wEl.className = 'pv-clock' + (_pvClockActive === 'w' ? ' pv-clock-active' : '') + (_pvClocks.w <= 30 && _pvTimeControl !== 'unlimited' ? ' pv-clock-low' : '');
    }
    if (bEl) {
      bEl.textContent = _pvTimeControl === 'unlimited' ? '∞' : _pvFormatTime(_pvClocks.b);
      bEl.className = 'pv-clock' + (_pvClockActive === 'b' ? ' pv-clock-active' : '') + (_pvClocks.b <= 30 && _pvTimeControl !== 'unlimited' ? ' pv-clock-low' : '');
    }
  }

  function _pvStartClock(color) {
    if (_pvTimeControl === 'unlimited') return;
    _pvStopClock();
    _pvClockActive = color;
    _pvRenderClocks();
    let _lastTick = Date.now();
    _pvClockInterval = setInterval(() => {
      if (_pvGameOver) { _pvStopClock(); return; }
      const now = Date.now();
      const elapsed = Math.floor((now - _lastTick) / 1000);
      _lastTick += elapsed * 1000;
      _pvClocks[color] = Math.max(0, _pvClocks[color] - elapsed);
      _pvRenderClocks();
      if (_pvClocks[color] <= 0) {
        _pvStopClock();
        _pvGameOver = true;
        const won = color !== _pvPlayerColor;
        const msg = won ? '⏱️ Time\'s up! YOU WIN on time!' : '⏱️ Time\'s up! Computer wins on time.';
        _pvUpdateStatus('pvStatus', msg);
        if (typeof CK !== 'undefined' && CK.showToast) CK.showToast(msg, won ? 'success' : 'info');
      }
    }, 1000);
  }

  function _pvStopClock() {
    if (_pvClockInterval) { clearInterval(_pvClockInterval); _pvClockInterval = null; }
    _pvClockActive = null;
  }

  function _pvAddIncrement(color) {
    if (_pvTimeControl !== 'unlimited') _pvClocks[color] += _pvIncrement;
  }

  function setTimeControl(tcKey) {
    const tc = TIME_CONTROLS[tcKey];
    if (!tc) return;
    _pvTimeControl = tcKey;
    _pvClocks = { w: tc.seconds, b: tc.seconds };
    _pvIncrement = tc.increment;
    _pvRenderClocks();
    // Update active TC button styles
    document.querySelectorAll('.pv-tc-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tc === tcKey);
    });
  }

  function initPlayVsComputer(boardId, statusId, difficulty = 'Intermediate', playerColor = 'white', timeControl = 'unlimited') {
    _pvDifficulty = difficulty;
    _pvPlayerColor = playerColor === 'white' ? 'w' : 'b';
    _pvGameOver = false;
    _pvThinking = false;
    _pvStopClock();

    // Init clocks
    const tc = TIME_CONTROLS[timeControl] || TIME_CONTROLS.rapid;
    _pvTimeControl = timeControl;
    _pvClocks = { w: tc.seconds, b: tc.seconds };
    _pvIncrement = tc.increment;

    _pvGame = new Chess();

    if (_pvBoard) { try { _pvBoard.destroy(); } catch(e) {} _pvBoard = null; }
    _pvBoard = Chessboard(boardId, {
      pieceTheme: function (piece) {
        return '/assets/img/pieces/' + piece.toLowerCase() + '.png';
      },
      position: 'start',
      orientation: playerColor,
      draggable: true,
      onDrop: _pvHandleDrop,
      onSnapEnd: () => { if (_pvBoard) _pvBoard.position(_pvGame.fen()); },
      onDragStart: (source, piece) => {
        if (_pvGame.game_over() || _pvThinking || _pvGameOver) return false;
        const playerPiece = _pvPlayerColor === 'w' ? /^w/ : /^b/;
        return playerPiece.test(piece) && _pvGame.turn() === _pvPlayerColor;
      }
    });

    _pvRenderClocks();
    _pvUpdateStatus(statusId, 'Game started! Make your move.');

    // Start player clock if they go first; computer goes first if player is black
    if (_pvPlayerColor === 'b') {
      setTimeout(() => _pvComputerMove(boardId, statusId), 800);
    } else {
      _pvStartClock('w');
    }
  }

  function startMultiplayerSession(gameId, myColor, fen) {
    _pvDifficulty = 'Multiplayer';
    _pvPlayerColor = myColor;
    _pvGameOver = false;
    _pvThinking = false;
    _pvStopClock();
    _pvGame = new Chess();
    _pvGame.load(fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

    if (_pvBoard) { try { _pvBoard.destroy(); } catch(e) {} _pvBoard = null; }
    _pvBoard = Chessboard('pvBoard', {
      pieceTheme: function (piece) {
        return '/assets/img/pieces/' + piece.toLowerCase() + '.png';
      },
      position: _pvGame.fen(),
      orientation: myColor === 'w' ? 'white' : 'black',
      draggable: true,
      onDrop: _pvHandleDrop,
      onSnapEnd: () => { if (_pvBoard) _pvBoard.position(_pvGame.fen()); },
      onDragStart: (source, piece) => {
        if (_pvGame.game_over() || _pvGameOver) return false;
        const playerPiece = _pvPlayerColor === 'w' ? /^w/ : /^b/;
        return playerPiece.test(piece) && _pvGame.turn() === _pvPlayerColor;
      }
    });
    
    _pvUpdateStatus('pvStatus', myColor === 'w' ? 'You are White. Your move!' : 'You are Black. Waiting for White...');
  }

  function onMultiplayerUpdate(fen, pgn) {
    if (!_pvGame || !_pvBoard) return;
    _pvGame.load(fen);
    _pvBoard.position(fen, true);
    if (_pvGame.game_over()) {
       _pvEndGame();
    } else {
       _pvUpdateStatus('pvStatus', _pvGame.turn() === _pvPlayerColor ? 'Your turn!' : 'Waiting for opponent...');
    }
  }

  function _pvHandleDrop(from, to) {
    if (_pvGameOver) return 'snapback';
    const move = _pvGame.move({ from, to, promotion: 'q' });
    if (!move) return 'snapback';

    // Multiplayer Hook
    if (window.CK && CK.multiplayer && CK.multiplayer.activeGameId) {
      if (_pvBoard) _pvBoard.position(_pvGame.fen(), true);
      CK.multiplayer.pushMove(_pvGame.fen(), _pvGame.pgn());
      if (_pvGame.game_over()) _pvEndGame();
      _pvUpdateStatus('pvStatus', 'Waiting for opponent...');
      return;
    }

    // Stop player clock, add increment
    _pvStopClock();
    _pvAddIncrement(_pvPlayerColor);
    _pvRenderClocks();

    if (_pvBoard) _pvBoard.position(_pvGame.fen(), true);
    if (_pvGame.game_over()) { _pvEndGame(); return; }

    const statusId = 'pvStatus';
    _pvUpdateStatus(statusId, '🤖 Computer is thinking…');
    _pvThinking = true;

    // Start computer clock
    const compColor = _pvPlayerColor === 'w' ? 'b' : 'w';
    _pvStartClock(compColor);

    const boardId = _pvBoard?.id || 'pvBoard';
    setTimeout(() => _pvComputerMove(boardId, statusId), 300 + Math.random() * 400);
  }

  // Keep track of previous evaluation for Bot Banter
  let _pvLastEvalCp = 0;

  async function _pvComputerMove(boardId, statusId) {
    if (!_pvGame || _pvGame.game_over() || _pvGameOver) return;
    
    let bestMoveObj = null;
    let banterMsg = '';
    
    if (window.CK && CK.engine) {
       // Convert pure JS depth to Stockfish depth
       const depths = { Beginner: 1, Intermediate: 3, Advanced: 7, Expert: 14 };
       if (CK.engine.setDepth) CK.engine.setDepth(depths[_pvDifficulty] || 3);
       
       const evalRes = await CK.engine.evaluate(_pvGame.fen());
       if (evalRes && evalRes.pv) {
           const bestMoveUci = evalRes.pv.split(' ')[0];
           const from = bestMoveUci.slice(0, 2);
           const to = bestMoveUci.slice(2, 4);
           const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
           const moves = _pvGame.moves({ verbose: true });
           bestMoveObj = moves.find(m => m.from === from && m.to === to && (!promotion || m.promotion === promotion));
           
           // Bot Banter Logic
           if (evalRes.cp !== null) {
               // Eval is from White's perspective
               const currentCp = _pvPlayerColor === 'w' ? evalRes.cp : -evalRes.cp;
               const diff = currentCp - _pvLastEvalCp;
               
               if (diff < -200) banterMsg = '🤖 Ouch... was that a blunder?';
               else if (diff > 200) banterMsg = '🤖 Wow, great move! I did not see that coming.';
               else if (currentCp > 400) banterMsg = '🤖 You are crushing me...';
               else if (currentCp < -400) banterMsg = '🤖 I think I am winning this one easily!';
               else if (currentCp === 0) banterMsg = '🤖 Dead even. A tough battle!';
               
               _pvLastEvalCp = currentCp;
           }
       }
    }

    if (!bestMoveObj) {
        // Fallback to pure JS negamax
        const depth = LEVELS[_pvDifficulty]?.depth || 2;
        bestMoveObj = getBestMove(_pvGame, depth);
    }
    
    if (!bestMoveObj) return;
    
    _pvGame.move(bestMoveObj);
    if (_pvBoard) _pvBoard.position(_pvGame.fen(), true);
    _pvThinking = false;

    // Stop computer clock, add increment, start player clock
    const compColor = _pvPlayerColor === 'w' ? 'b' : 'w';
    _pvStopClock();
    _pvAddIncrement(compColor);
    _pvRenderClocks();

    if (_pvGame.game_over()) { _pvEndGame(statusId); return; }

    _pvStartClock(_pvPlayerColor);
    let statusMsg = _pvGame.in_check() ? '⚠️ Check! Your king is in check — respond carefully.' : 'Your turn to move.';
    if (banterMsg) statusMsg = banterMsg + ' ' + statusMsg;
    _pvUpdateStatus(statusId, statusMsg);
  }

  function _pvEndGame(statusId) {
    _pvGameOver = true;
    _pvStopClock();
    let msg = '';
    let isWin = false;
    
    if (_pvGame.in_checkmate()) {
      isWin = _pvGame.turn() !== _pvPlayerColor;
      msg = isWin ? '🎉 Checkmate — YOU WIN! Brilliant!' : '😔 Checkmate — Computer wins! Keep practicing.';
    } else if (_pvGame.in_stalemate()) {
      msg = '🤝 Stalemate — almost had it!';
    } else if (_pvGame.in_draw()) {
      msg = '🤝 Game drawn — well played!';
    } else {
      msg = '⚔️ Game over!';
    }
    
    _pvUpdateStatus(statusId || 'pvStatus', msg);
    if (typeof CK !== 'undefined' && CK.showToast) CK.showToast(msg, isWin ? 'success' : 'info');
    
    // Award XP if won
    if (isWin && window.CK && CK.rpg && CK.rpg.awardXP) {
        const u = localStorage.getItem('ck_auth_user');
        if (u) {
            try {
               const user = JSON.parse(u);
               CK.rpg.awardXP(user.userid || user.id, 'game_win', { opponent: _pvDifficulty });
            } catch(e) {}
        }
    }
  }

  function _pvUpdateStatus(statusId, msg) {
    const el = document.getElementById(statusId || 'pvStatus');
    if (el) el.textContent = msg;
    _pvStatus = msg;
  }

  function pvNewGame(boardId, statusId, difficulty, playerColor, timeControl) {
    initPlayVsComputer(
      boardId     || 'pvBoard',
      statusId    || 'pvStatus',
      difficulty  || _pvDifficulty,
      playerColor || (_pvPlayerColor === 'w' ? 'white' : 'black'),
      timeControl || _pvTimeControl
    );
  }

  function pvFlip() {
    if (_pvBoard) _pvBoard.flip();
  }

  function pvResign() {
    if (_pvGameOver || !_pvGame) return;
    _pvGameOver = true;
    _pvStopClock();
    _pvUpdateStatus('pvStatus', '🏳️ You resigned. Better luck next time!');
    if (typeof CK !== 'undefined' && CK.showToast) CK.showToast('Game resigned.', 'info');
  }

  function pvGetMoveHistory() {
    return _pvGame ? _pvGame.history({ verbose: true }) : [];
  }

  return {
    evaluate, getBestMove, LEVELS, TIME_CONTROLS,
    initPlayVsComputer, pvNewGame, pvFlip, pvResign, pvGetMoveHistory,
    setTimeControl, startMultiplayerSession, onMultiplayerUpdate
  };
})();
