/* assets/js/arena.js -------------------------------------------------------
   AI Challenge Arena — ChessKidoo
   Engine (Stockfish WASM + minimax fallback), board logic, real-time
   analysis, post-game report, and digital certificate.
   --------------------------------------------------------------- */

(() => {
  const CK = window.CK = window.CK || {};
  const A = CK.arena = {};

  /* ─── State ─── */
  let game = null;
  let boardEl = null;
  let selectedSq = null;
  let legalMoves = [];
  let currentDifficulty = 'Intermediate';
  let isPlayerTurn = true;
  let isGameOver = false;
  let isThinking = false;
  let moveHistory = [];
  let evalHistory = [];
  let classificationHistory = [];
  let capturedWhite = [];
  let capturedBlack = [];
  let stockfish = null;
  let engineReady = false;
  let useWasm = false;
  const playerColor = 'w';
  let gameStartTime = null;
  let whiteClock = 600;
  let blackClock = 600;
  let clockInterval = null;
  let activeClock = 'w';
  let aiStartTime = null;
  let lastTickTime = null;
  let evalChart = null;
  let achievements = [];
  let puzzleMode = false;
  let awaitingAIMove = false;
  let quickMoveState = null;
  let memoryGameState = null;
  let gameTimer = null;

  const DIFFICULTY_DEPTH = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };
  const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const PIECE_SVG = {
    w: {
      k: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%"><g fill="#ffffff" stroke="#111418" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path d="M11.5 37c5.5 3.5 16.5 3.5 22 0v-4c-5.5-3.5-16.5-3.5-22 0z"/><path d="M11.5 27c5.5-3 16.5-3 22 0m-21-3.5c0-1.5 1.5-2.5 3-2.5s4.5 1.5 7 1.5 5.5-1.5 7-1.5 3 1 3 2.5"/></g></svg>`,
      q: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%"><g fill="#ffffff" stroke="#111418" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15L9 11v13.5L2 14l7 12z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><circle cx="2" cy="14" r="1.5"/><circle cx="9" cy="11" r="1.5"/><circle cx="16.5" cy="11" r="1.5"/><circle cx="22.5" cy="9.5" r="1.5"/><circle cx="28.5" cy="11" r="1.5"/><circle cx="36" cy="11" r="1.5"/><circle cx="43" cy="14" r="1.5"/></g></svg>`,
      r: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%"><g fill="#ffffff" stroke="#111418" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"/><path d="M34 14l-3 3H14l-3-3M31 17v12.5H14V17"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14h23"/></g></svg>`,
      b: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%"><g fill="#ffffff" stroke="#111418" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" fill="none"/></g></svg>`,
      n: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%"><g fill="#ffffff" stroke="#111418" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" /><path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" /><path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" fill="#111418" stroke="#111418" stroke-width="1"/><path d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" fill="#111418" stroke="#111418" stroke-width="1"/></g></svg>`,
      p: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%"><g fill="#ffffff" stroke="#111418" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 19.78 16 24c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-4.22-1.33-7.5-3.28-8.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/></g></svg>`
    },
    b: {
      k: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%"><g fill="#1e222b" stroke="#0a0c0f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path d="M11.5 37c5.5 3.5 16.5 3.5 22 0v-4c-5.5-3.5-16.5-3.5-22 0z"/><path d="M11.5 27c5.5-3 16.5-3 22 0m-21-3.5c0-1.5 1.5-2.5 3-2.5s4.5 1.5 7 1.5 5.5-1.5 7-1.5 3 1 3 2.5"/><path d="M11.5 33.5h22" stroke="#e2e8f0" stroke-width="1.2"/><path d="M11.5 30h22" stroke="#e2e8f0" stroke-width="1.2"/></g></svg>`,
      q: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%"><g fill="#1e222b" stroke="#0a0c0f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15L9 11v13.5L2 14l7 12z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><circle cx="2" cy="14" r="1.5" fill="#e2e8f0"/><circle cx="9" cy="11" r="1.5" fill="#e2e8f0"/><circle cx="16.5" cy="11" r="1.5" fill="#e2e8f0"/><circle cx="22.5" cy="9.5" r="1.5" fill="#e2e8f0"/><circle cx="28.5" cy="11" r="1.5" fill="#e2e8f0"/><circle cx="36" cy="11" r="1.5" fill="#e2e8f0"/><circle cx="43" cy="14" r="1.5" fill="#e2e8f0"/><path d="M11 31h23" stroke="#e2e8f0" stroke-width="1.2"/></g></svg>`,
      r: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%"><g fill="#1e222b" stroke="#0a0c0f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"/><path d="M34 14l-3 3H14l-3-3M31 17v12.5H14V17"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14h23"/><path d="M13 34h19" stroke="#e2e8f0" stroke-width="1.2"/></g></svg>`,
      b: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%"><g fill="#1e222b" stroke="#0a0c0f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#e2e8f0" stroke-width="1.2"/></g></svg>`,
      n: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%"><g fill="#1e222b" stroke="#0a0c0f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" /><path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" /><path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" fill="#e2e8f0" stroke="#e2e8f0" stroke-width="1"/><path d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" fill="#e2e8f0" stroke="#e2e8f0" stroke-width="1"/><path d="M 20 13 L 23 16" stroke="#e2e8f0" stroke-width="1.2"/></g></svg>`,
      p: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%"><g fill="#1e222b" stroke="#0a0c0f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 19.78 16 24c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-4.22-1.33-7.5-3.28-8.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/><path d="M17.5 37h10M19 32.5h7" stroke="#e2e8f0" stroke-width="1.2" fill="none"/></g></svg>`
    }
  };

  const OPENING_BOOK = {
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1': 'e2e4',
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1': 'e7e5',
    'rnbqkbnr/pppppppp/8/8/5P2/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1': 'e2e4',
  };

  const ACHIEVEMENTS = {
    'first_win': { name: 'First Victory', icon: '🏆', desc: 'Win your first game' },
    'blunder_finder': { name: 'Blunder Finder', icon: '🔍', desc: 'Spot 3 blunders in one game' },
    'perfect_game': { name: 'Perfect Game', icon: '✨', desc: 'Zero blunders or mistakes' },
    'speed_win': { name: 'Speed Demon', icon: '⚡', desc: 'Win in under 10 moves' },
    'accuracy_master': { name: 'Accuracy Master', icon: '🎯', desc: '90%+ accuracy' }
  };

  /* ─── Init ─── */
  A.init = () => {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    if (typeof gameTimer !== 'undefined' && gameTimer) { clearInterval(gameTimer); gameTimer = null; }

    puzzleMode = false;
    quickMoveState = null;
    memoryGameState = null;

    game = new Chess();
    boardEl = document.getElementById('arena-board');

    if (!boardEl) {
      console.error('Arena: Board element not found!');
      return;
    }

    moveHistory = [];
    evalHistory = [];
    classificationHistory = [];
    capturedWhite = [];
    capturedBlack = [];
    selectedSq = null;
    isPlayerTurn = true;
    isGameOver = false;
    isThinking = false;
    gameStartTime = Date.now();
    whiteClock = 600;
    blackClock = 600;
    activeClock = 'w';
    aiStartTime = null;
    lastTickTime = Date.now();
    awaitingAIMove = false;
    achievements = JSON.parse(localStorage.getItem('ck_achievements') || '[]');

    renderBoard();
    renderAnalysisPanel();
    updateStatus('Your turn — play as White');
    initEngine();
    startClock();
    initEvalChart();
    A.updateMinimaxAnalysis();
  };

  function handleTimeout(loserColor) {
    isGameOver = true;
    isThinking = false;
    if (clockInterval) clearInterval(clockInterval);

    let result, resultText;
    if (loserColor === 'w') {
      result = 'loss'; resultText = 'AI Wins on Time ⏱️';
    } else {
      result = 'win'; resultText = 'You Win on Time! ⏱️';
    }

    updateStatus(resultText, 'gameover');
    checkAchievements(result);

    setTimeout(() => {
      showPostGameReport(result);
    }, 1200);
  }

  function startClock() {
    if (clockInterval) clearInterval(clockInterval);
    lastTickTime = Date.now();
    clockInterval = setInterval(() => {
      if (isGameOver) { clearInterval(clockInterval); return; }
      const now = Date.now();
      const elapsedSec = Math.floor((now - lastTickTime) / 1000);
      if (elapsedSec >= 1) {
        if (activeClock === 'w') {
          whiteClock = Math.max(0, whiteClock - elapsedSec);
          if (whiteClock === 0) { handleTimeout('w'); return; }
        } else if (activeClock === 'b') {
          blackClock = Math.max(0, blackClock - elapsedSec);
          if (blackClock === 0) { handleTimeout('b'); return; }
        }
        lastTickTime += elapsedSec * 1000;
        updateClockDisplay();
      }
    }, 250);
  }

  function updateClockDisplay() {
    const wEl = document.getElementById('arena-clock-white');
    const bEl = document.getElementById('arena-clock-black');
    if (wEl) wEl.textContent = formatTime(whiteClock);
    if (bEl) bEl.textContent = formatTime(blackClock);
    const wWrap = document.getElementById('arena-clock-white-wrap');
    const bWrap = document.getElementById('arena-clock-black-wrap');
    if (wWrap) wWrap.classList.toggle('active', activeClock === 'w');
    if (bWrap) bWrap.classList.toggle('active', activeClock === 'b');
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  /* ─── Engine Init ─── */
  function initEngine() {
    const statusEl = document.getElementById('arena-engine-status');

    function _tryLoad() {
      if (window.Stockfish) {
        try {
          stockfish = new window.Stockfish();
          stockfish.onmessage = handleEngineMessage;
          stockfish.postMessage('uci');
          return true;
        } catch(e) { /* fall through to minimax */ }
      }
      return false;
    }

    if (_tryLoad()) return;

    // Stockfish may still be loading asynchronously — poll up to 3 s then fall back
    let _polls = 0;
    const _timer = setInterval(() => {
      _polls++;
      if (_tryLoad()) { clearInterval(_timer); return; }
      if (_polls >= 6) {
        clearInterval(_timer);
        engineReady = true;
        useWasm = false;
        if (statusEl) statusEl.textContent = 'Engine ready (built-in)';
      }
    }, 500);
  }

  function handleEngineMessage(e) {
    const line = e.data;
    if (line === 'uciok') {
      if (!stockfish) return;
      stockfish.postMessage('ucinewgame');
      stockfish.postMessage('isready');
      return;
    }
    if (line === 'readyok') {
      engineReady = true;
      useWasm = true;
      const statusEl = document.getElementById('arena-engine-status');
      if (statusEl) statusEl.textContent = 'Engine ready (Stockfish WASM)';
      return;
    }
    if (line && line.startsWith('info depth')) {
      parseEngineInfo(line);
      return;
    }
    if (line && line.startsWith('bestmove')) {
      if (!awaitingAIMove) return;
      awaitingAIMove = false;
      const parts = line.split(' ');
      const bestMove = parts[1];
      if (bestMove && bestMove !== '(none)') {
        makeAIMove(bestMove);
      }
      return;
    }
  }

  function initEvalChart() {
    const chartEl = document.getElementById('arena-eval-chart');
    if (!chartEl || !window.Chart) return;
    
    chartEl.innerHTML = '';
    const canvas = document.createElement('canvas');
    chartEl.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    evalChart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Evaluation',
          data: [],
          borderColor: 'rgba(232, 184, 75, 1)',
          backgroundColor: 'rgba(232, 184, 75, 0.1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: -3, max: 3, ticks: { color: '#8892a4', font: { size: 10 } }, grid: { display: false } },
          x: { display: false }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function updateEvalChart(moveNum, eval_) {
    if (evalChart && eval_ !== null) {
      evalChart.data.labels.push(moveNum);
      evalChart.data.datasets[0].data.push(eval_);
      evalChart.update();
    }
  }

  function parseEngineInfo(line) {
    const parts = line.split(' ');
    let eval_ = null;
    let depth = null;
    let bestLine = [];

    const evalIdx = parts.indexOf('score');
    if (evalIdx !== -1) {
      if (parts[evalIdx + 1] === 'cp') {
        eval_ = parseInt(parts[evalIdx + 2]) / 100;
      } else if (parts[evalIdx + 1] === 'mate') {
        const mateIn = parseInt(parts[evalIdx + 2]);
        eval_ = mateIn > 0 ? 999 : -999;
      }
    }

    const depthIdx = parts.indexOf('depth');
    if (depthIdx !== -1) depth = parseInt(parts[depthIdx + 1]);

    const pvIdx = parts.indexOf('pv');
    if (pvIdx !== -1) {
      bestLine = parts.slice(pvIdx + 1, pvIdx + 4);
    }

    updateEngineDisplay(eval_, depth, bestLine);
  }

  function updateEngineDisplay(eval_, depth, bestLine) {
    const evalEl = document.getElementById('arena-eval-value');
    const depthEl = document.getElementById('arena-engine-depth');
    const lineEl = document.getElementById('arena-best-line');

    if (evalEl && eval_ !== null) {
      const sign = eval_ > 0 ? '+' : '';
      evalEl.textContent = sign + eval_.toFixed(1);
      evalEl.className = 'engine-eval-value' + (eval_ < 0 ? ' negative' : '');
    }
    if (depthEl && depth !== null && depth !== undefined) depthEl.textContent = `Depth: ${depth}`;
    if (lineEl && bestLine.length) lineEl.textContent = `Best: ${bestLine.join(' ')}`;

    // Update evaluation bar heights
    const barWhite = document.getElementById('eval-bar-white');
    const barBlack = document.getElementById('eval-bar-black');
    if (barWhite && barBlack && eval_ !== null) {
      let whitePercent = 50 + (eval_ * 5); // +1.0 cp = 55%, -1.0 cp = 45%
      whitePercent = Math.max(5, Math.min(95, whitePercent));
      const blackPercent = 100 - whitePercent;
      barWhite.style.height = `${whitePercent}%`;
      barBlack.style.height = `${blackPercent}%`;
    }
  }

  /* ─── Board Rendering ─── */
  function renderBoard() {
    if (!boardEl) {
      console.error('Arena: Board element not found!');
      return;
    }
    boardEl.innerHTML = '';

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const sq = String.fromCharCode(97 + file) + (8 - rank);
        const isLight = (rank + file) % 2 === 1;
        const sqEl = document.createElement('div');
        sqEl.className = `a-sq ${isLight ? 'light' : 'dark'}`;
        sqEl.dataset.square = sq;

        const piece = game.get(sq);
        if (piece) {
          const pieceEl = document.createElement('div');
          pieceEl.className = `a-piece piece-${piece.color}`;
          pieceEl.innerHTML = `<img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${piece.color}${piece.type.toLowerCase()}.png" style="width: 92%; height: 92%; filter: drop-shadow(0 4px 5px rgba(0,0,0,0.4)); pointer-events: none;" alt="${piece.type}">`;
          sqEl.appendChild(pieceEl);
        }

        sqEl.addEventListener('click', () => handleSquareClick(sq));
        boardEl.appendChild(sqEl);
      }
    }

    highlightLastMove();
    highlightCheck();
  }

  function highlightLastMove() {
    document.querySelectorAll('.a-sq').forEach(el => {
      el.classList.remove('hl-lastmove', 'hl-selected', 'hl-legal', 'hl-legal-capture');
    });
    if (moveHistory.length > 0) {
      const last = moveHistory[moveHistory.length - 1];
      const fromEl = document.querySelector(`.a-sq[data-square="${last.from}"]`);
      const toEl = document.querySelector(`.a-sq[data-square="${last.to}"]`);
      if (fromEl) fromEl.classList.add('hl-lastmove');
      if (toEl) toEl.classList.add('hl-lastmove');
    }
  }

  function highlightCheck() {
    document.querySelectorAll('.a-sq').forEach(el => el.classList.remove('hl-check'));
    if (game.in_check()) {
      const kingSq = findKing(game.turn());
      if (kingSq) {
        const el = document.querySelector(`.a-sq[data-square="${kingSq}"]`);
        if (el) el.classList.add('hl-check');
      }
    }
  }

  function findKing(color) {
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === color) {
          return String.fromCharCode(97 + c) + (8 - r);
        }
      }
    }
    return null;
  }

  function showLegalMoves(sq) {
    document.querySelectorAll('.a-sq').forEach(el => {
      el.classList.remove('hl-legal', 'hl-legal-capture');
    });
    const moves = game.moves({ square: sq, verbose: true });
    legalMoves = moves;
    moves.forEach(m => {
      const el = document.querySelector(`.a-sq[data-square="${m.to}"]`);
      if (el) {
        if (game.get(m.to)) {
          el.classList.add('hl-legal-capture');
        } else {
          el.classList.add('hl-legal');
        }
      }
    });
  }

  /* ─── Click Handler ─── */
  function handleSquareClick(sq) {
    if (isGameOver || isThinking) return;
    if (game.turn() !== playerColor) return;

    const piece = game.get(sq);

    if (selectedSq) {
      const move = legalMoves.find(m => m.to === sq);
      if (move) {
        executePlayerMove(move);
        selectedSq = null;
        return;
      }
    }

    if (piece && piece.color === game.turn()) {
      selectedSq = sq;
      const el = document.querySelector(`.a-sq[data-square="${sq}"]`);
      document.querySelectorAll('.a-sq').forEach(e => e.classList.remove('hl-selected'));
      if (el) el.classList.add('hl-selected');
      showLegalMoves(sq);
    } else {
      selectedSq = null;
      document.querySelectorAll('.a-sq').forEach(e => {
        e.classList.remove('hl-selected', 'hl-legal', 'hl-legal-capture');
      });
    }
  }

/* ─── Execute Player Move ─── */
function executePlayerMove(move) {
  if (puzzleMode) {
    if (!A.checkPuzzleSolution(move.san)) return;
  }
  
  if (quickMoveState && !quickMoveState.solved) {
    if (move.san !== quickMoveState.goal) {
      CK.showToast('Wrong move! Try again.', 'error');
      return;
    }
    quickMoveState.solved = true;
    game.move(move);
    renderBoard();
    CK.showToast('Correct!', 'success');
    if (gameTimer) clearInterval(gameTimer);
    setTimeout(() => A.startQuickMove(), 2000);
    return;
  }
  
  const fenBefore = game.fen();
  const moveResult = game.move(move);
  if (!moveResult) return;

    // Track captured pieces
    if (moveResult.captured) {
      if (moveResult.color === 'w') {
        capturedBlack.push(moveResult.captured);
      } else {
        capturedWhite.push(moveResult.captured);
      }
    }

    moveHistory.push({
      from: moveResult.from,
      to: moveResult.to,
      san: moveResult.san,
      fen: game.fen(),
      color: moveResult.color,
      captured: moveResult.captured || null
    });

    // Get engine eval for classification
    getEvalForPosition(fenBefore, moveResult.san);

    renderBoard();
    renderAnalysisPanel();
    activeClock = 'b';
    aiStartTime = Date.now();
    lastTickTime = Date.now();

    if (game.in_checkmate() || game.in_stalemate() || game.insufficient_material()) {
      handleGameOver();
      return;
    }
    if (game.in_threefold_repetition()) {
      CK.showToast('Draw by threefold repetition — position repeated 3 times', 'warning');
      handleGameOver();
      return;
    }

    isPlayerTurn = false;
    updateStatus('AI is thinking...');
    isThinking = true;

    setTimeout(() => {
      requestAIMove();
    }, 500 + Math.random() * 1000);
  }

  /* ─── AI Move ─── */
  function requestAIMove() {
    if (isGameOver) return;

    const fen = game.fen();
    if (OPENING_BOOK[fen] && Math.random() < 0.3) {
      const bookMove = OPENING_BOOK[fen];
      makeAIMove(bookMove);
      return;
    }

    if (useWasm && engineReady && stockfish) {
      awaitingAIMove = true;
      stockfish.postMessage(`position fen ${fen}`);
      stockfish.postMessage(`go depth ${DIFFICULTY_DEPTH[currentDifficulty] || 2}`);
    } else {
      const depth = DIFFICULTY_DEPTH[currentDifficulty] || 2;
      const bestMove = getBestMoveMinimax(depth);
      if (bestMove) {
        makeAIMove(bestMove.from + bestMove.to + (bestMove.promotion || ''));
      } else {
        const moves = game.moves({ verbose: true });
        if (moves.length > 0) {
          const random = moves[Math.floor(Math.random() * moves.length)];
          makeAIMove(random.from + random.to + (random.promotion || ''));
        } else {
          console.error('Arena: No moves available!');
        }
      }
    }
  }

  function makeAIMove(moveStr) {
    if (isGameOver) return;
    isThinking = false;

    let move;
    try {
      move = game.move({
        from: moveStr.substring(0, 2),
        to: moveStr.substring(2, 4),
        promotion: moveStr.length > 4 ? moveStr[4] : 'q'
      });
    } catch (e) {
      const moves = game.moves({ verbose: true });
      if (moves.length > 0) {
        move = game.move(moves[Math.floor(Math.random() * moves.length)]);
      }
    }

    if (!move) {
      handleGameOver();
      return;
    }

    if (move.captured) {
      if (move.color === 'w') {
        capturedBlack.push(move.captured);
      } else {
        capturedWhite.push(move.captured);
      }
    }

    moveHistory.push({
      from: move.from,
      to: move.to,
      san: move.san,
      fen: game.fen(),
      color: move.color,
      captured: move.captured || null
    });

    evalHistory.push(evalHistory.length > 0 ? evalHistory[evalHistory.length - 1] : 0);

    renderBoard();
    renderAnalysisPanel();
    
    // Deduct exact thinking time from AI clock if we have a valid aiStartTime
    if (aiStartTime) {
      const thinkingMs = Date.now() - aiStartTime;
      const thinkingSec = Math.round(thinkingMs / 1000);
      if (thinkingSec > 0) {
        blackClock = Math.max(0, blackClock - thinkingSec);
      }
      aiStartTime = null;
    }
    
    activeClock = 'w';
    lastTickTime = Date.now();

    if (game.in_checkmate() || game.in_stalemate() || game.insufficient_material()) {
      handleGameOver();
      return;
    }
    if (game.in_threefold_repetition()) {
      CK.showToast('Draw by threefold repetition — position repeated 3 times', 'warning');
      handleGameOver();
      return;
    }

    isPlayerTurn = true;
    updateStatus('Your turn');
    A.updateMinimaxAnalysis();
  }

  /* ─── Minimax Fallback ─── */
  function getBestMoveMinimax(maxDepth) {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) {
      return null;
    }


    let bestMove = null;
    let bestEval = game.turn() === 'w' ? -Infinity : Infinity;
    const isMaximizing = game.turn() === 'w';

    for (const move of moves) {
      game.move(move);
      const eval_ = minimax(maxDepth - 1, -Infinity, Infinity, !isMaximizing);
      game.undo();

      if (isMaximizing) {
        if (eval_ > bestEval) {
          bestEval = eval_;
          bestMove = move;
        }
      } else {
        if (eval_ < bestEval) {
          bestEval = eval_;
          bestMove = move;
        }
      }
    }

    return bestMove || moves[0];
  }

  function minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0) return evaluateBoard();
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) {
      if (game.in_check()) return isMaximizing ? -9999 + depth : 9999 - depth;
      return 0;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        game.move(move);
        const eval_ = minimax(depth - 1, alpha, beta, false);
        game.undo();
        maxEval = Math.max(maxEval, eval_);
        alpha = Math.max(alpha, eval_);
        if (beta <= alpha) break; // Beta cut-off (Pruning)
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        game.move(move);
        const eval_ = minimax(depth - 1, alpha, beta, true);
        game.undo();
        minEval = Math.min(minEval, eval_);
        beta = Math.min(beta, eval_);
        if (beta <= alpha) break; // Alpha cut-off (Pruning)
      }
      return minEval;
    }
  }

  function evaluateBoard() {
    const board = game.board();
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) continue;
        const val = PIECE_VALUES[p.type] * 10;
        score += p.color === 'w' ? val : -val;
      }
    }
    if (game.in_check()) {
      score += game.turn() === 'w' ? -50 : 50;
    }
    return score;
  }

  /* ─── Move Classification (always uses minimax to avoid racing Stockfish AI requests) ─── */
  function getEvalForPosition(fenBefore, playerSan) {
    const depth = DIFFICULTY_DEPTH[currentDifficulty] || 2;
    const savedGame = game;
    game = new Chess(fenBefore);
    const moves = game.moves({ verbose: true });
    let bestEval = game.turn() === 'w' ? -Infinity : Infinity;
    let bestMove = null;
    const isMax = game.turn() === 'w';

    for (const m of moves) {
      game.move(m);
      const ev = minimax(depth - 1, -Infinity, Infinity, !isMax);
      game.undo();
      if (isMax && ev > bestEval) { bestEval = ev; bestMove = m; }
      if (!isMax && ev < bestEval) { bestEval = ev; bestMove = m; }
    }

    const playerMove = moves.find(m => m.san === playerSan);
    let playerEval = 0;
    if (playerMove) {
      game.move(playerMove);
      playerEval = minimax(depth - 1, -Infinity, Infinity, !isMax);
      game.undo();
    }
    game = savedGame;

    const diff = isMax ? (bestEval - playerEval) : (playerEval - bestEval);
    const classification = classifyFromDiff(diff, playerMove, bestMove);
    classificationHistory.push({ san: playerSan, classification, eval: playerEval });
    evalHistory.push(playerEval);
    updateEvalChart(moveHistory.length, playerEval);
    renderAnalysisPanel();

    const displayEval = playerEval / 10;
    updateEngineDisplay(displayEval, depth, bestMove ? [bestMove.san] : []);
  }

  function classifyFromDiff(diff, playerMove, bestMove) {
    if (diff <= 0.05) {
      if (playerMove && playerMove.captured && bestMove && !bestMove.captured) return 'brilliant';
      return 'best';
    }
    if (diff <= 0.2) return 'excellent';
    if (diff <= 0.5) return 'good';
    if (diff <= 1.0) return 'inaccuracy';
    if (diff <= 2.0) return 'mistake';
    return 'blunder';
  }

  /* ─── Analysis Panel ─── */
  function renderAnalysisPanel() {
    // Move list
    const moveListEl = document.getElementById('arena-move-list');
    if (moveListEl) {
      let html = '';
      for (let i = 0; i < moveHistory.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const whiteMove = moveHistory[i];
        const blackMove = moveHistory[i + 1];
        const wClass = classificationHistory[i]?.classification || '';
        const bClass = classificationHistory[i + 1]?.classification || '';
        html += `<div class="amove-row">
          <span class="amove-num">${moveNum}.</span>
          <span class="amove-san class-${wClass}">${whiteMove?.san || ''}</span>
          <span class="amove-san class-${bClass}">${blackMove?.san || ''}</span>
        </div>`;
      }
      moveListEl.innerHTML = html;
      moveListEl.scrollTop = moveListEl.scrollHeight;
    }

    // Captured pieces
    const capWhiteEl = document.getElementById('arena-captured-white');
    const capBlackEl = document.getElementById('arena-captured-black');
    if (capWhiteEl) {
      capWhiteEl.innerHTML = capturedWhite.map(p => `<div class="captured-piece">${PIECE_SVG['w'][p]}</div>`).join('');
    }
    if (capBlackEl) {
      capBlackEl.innerHTML = capturedBlack.map(p => `<div class="captured-piece">${PIECE_SVG['b'][p]}</div>`).join('');
    }
  }

  /* ─── Status ─── */
  function updateStatus(msg, type = '') {
    const el = document.getElementById('arena-status');
    if (el) {
      el.textContent = msg;
      el.className = 'arena-status' + (type ? ` ${type}` : '');
    }
  }

  /* ─── Game Over ─── */
  function handleGameOver() {
    isGameOver = true;
    isThinking = false;
    if (clockInterval) clearInterval(clockInterval);

    let result, resultText;
    if (game.in_checkmate()) {
      if (game.turn() === 'b') {
        result = 'win'; resultText = 'You Win! — Checkmate';
      } else {
        result = 'loss'; resultText = 'AI Wins — Checkmate';
      }
    } else if (game.in_stalemate()) {
      result = 'draw'; resultText = 'Draw — Stalemate';
    } else if (game.in_threefold_repetition()) {
      result = 'draw'; resultText = 'Draw — Repetition';
    } else if (game.insufficient_material()) {
      result = 'draw'; resultText = 'Draw — Insufficient Material';
    } else {
      result = 'draw'; resultText = 'Game Drawn';
    }

    updateStatus(resultText, 'gameover');
    checkAchievements(result);

    setTimeout(() => {
      showPostGameReport(result);
    }, 1200);
  }

  function checkAchievements(result) {
    const classifications = classificationHistory.map(c => c.classification);
    const totalMoves = moveHistory.length;

    const weights = { brilliant: 1, best: 1, excellent: 0.9, good: 0.7, inaccuracy: 0.4, mistake: 0.2, blunder: 0 };
    let totalWeight = 0;
    classifications.forEach(c => { totalWeight += weights[c] || 0.5; });
    const accuracy = classifications.length > 0 ? Math.round((totalWeight / classifications.length) * 100) : 50;

    const newAchievements = [];
    if (result === 'win') newAchievements.push(ACHIEVEMENTS.first_win);
    if (classifications.filter(c => c === 'blunder').length >= 3) newAchievements.push(ACHIEVEMENTS.blunder_finder);
    if (classifications.filter(c => c === 'blunder' || c === 'mistake').length === 0) newAchievements.push(ACHIEVEMENTS.perfect_game);
    if (totalMoves <= 10 && result === 'win') newAchievements.push(ACHIEVEMENTS.speed_win);
    if (accuracy >= 90) newAchievements.push(ACHIEVEMENTS.accuracy_master);

    newAchievements.forEach(a => {
      if (!achievements.find(existing => existing.name === a.name)) {
        achievements.push(a);
      }
    });

    if (newAchievements.length > 0) {
      localStorage.setItem('ck_achievements', JSON.stringify(achievements));
      setTimeout(() => CK.showToast(`Achievements unlocked: ${newAchievements.map(a => a.icon + ' ' + a.name).join(', ')}`, 'success'), 500);
    }
  }

  /* ─── Match Commentary Engine ─── */
  function generateMatchCommentary(result, accuracy, totalMoves, durationMin, counts) {
    const lines = [];
    const levelOrder = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    const selectedIdx = levelOrder.indexOf(currentDifficulty);

    // Determine actual played level from accuracy
    let playerActualLevel, actualIdx;
    if (accuracy >= 88) { playerActualLevel = 'Expert';       actualIdx = 3; }
    else if (accuracy >= 72) { playerActualLevel = 'Advanced';     actualIdx = 2; }
    else if (accuracy >= 55) { playerActualLevel = 'Intermediate'; actualIdx = 1; }
    else               { playerActualLevel = 'Beginner';     actualIdx = 0; }

    // Opening commentary
    const earlyErrors = classificationHistory.slice(0, Math.min(8, totalMoves))
      .filter(c => c.classification === 'blunder' || c.classification === 'mistake').length;
    if (totalMoves < 8) {
      lines.push({ icon: '⚡', text: 'A blitz-style finish! The game was decided in just a handful of moves — find ways to prolong the battle and create more complex positions.' });
    } else if (earlyErrors === 0 && totalMoves >= 8) {
      lines.push({ icon: '📖', text: 'Excellent opening! You developed your pieces efficiently, secured king safety, and contested the center — textbook fundamentals.' });
    } else if (earlyErrors >= 2) {
      lines.push({ icon: '⚠️', text: `The opening phase contained ${earlyErrors} errors. Early mistakes force you into a defensive posture for the rest of the game. Review basic opening principles: control the center, develop knights before bishops, castle early.` });
    } else {
      lines.push({ icon: '📖', text: 'A reasonable opening — some inaccuracies, but no critical errors. Solid enough to enter the middlegame with fair chances.' });
    }

    // Brilliant moves
    const brilliantList = classificationHistory.map((c, i) => ({...c, moveNum: i+1})).filter(c => c.classification === 'brilliant');
    if (brilliantList.length > 0) {
      const bm = brilliantList[0];
      lines.push({ icon: '✨', text: `Brilliant! Move ${bm.moveNum} — ${bm.san} — was a Grandmaster-level find. Sacrificing material or finding a quiet move in a sharp position demonstrates deep tactical vision. ${brilliantList.length > 1 ? `You found ${brilliantList.length} brilliant moves in total — truly exceptional play.` : ''}` });
    }

    // Blunders & mistakes
    const blunderList = classificationHistory.map((c, i) => ({...c, moveNum: i+1})).filter(c => c.classification === 'blunder');
    const mistakeList = classificationHistory.map((c, i) => ({...c, moveNum: i+1})).filter(c => c.classification === 'mistake');
    if (blunderList.length > 0) {
      const worst = blunderList[0];
      lines.push({ icon: '💔', text: `Critical moment at move ${worst.moveNum} (${worst.san}): a blunder that significantly shifted the evaluation. ${blunderList.length > 1 ? `You made ${blunderList.length} blunders total — the single biggest area for improvement is piece safety and tactical awareness.` : 'Before each move, ask yourself: "Can any of my pieces be captured?"'}` });
    } else if (mistakeList.length > 0) {
      lines.push({ icon: '⚠️', text: `${mistakeList.length} mistake${mistakeList.length > 1 ? 's' : ''} noted (move${mistakeList.length > 1 ? 's' : ''} ${mistakeList.slice(0,3).map(m => m.moveNum).join(', ')}). These are significant inaccuracies that handed the opponent an advantage, but not game-ending on their own.` });
    } else {
      lines.push({ icon: '🎯', text: 'Remarkably clean play — zero blunders and zero mistakes! You kept your composure throughout and made only minor inaccuracies. This is the hallmark of a well-disciplined player.' });
    }

    // Middlegame / tactical play
    if (totalMoves >= 20) {
      const midSlice = classificationHistory.slice(8, Math.min(totalMoves - 8, classificationHistory.length));
      const midBest = midSlice.filter(c => ['brilliant','best','excellent'].includes(c.classification)).length;
      const midPct = midSlice.length > 0 ? Math.round(midBest / midSlice.length * 100) : 0;
      if (midPct >= 70) {
        lines.push({ icon: '⚔️', text: `Strong middlegame! You executed ${midPct}% best/excellent moves in the critical phase — your tactical pattern recognition is working well.` });
      } else if (midPct >= 40) {
        lines.push({ icon: '⚔️', text: 'Mixed middlegame — some sharp moments with both good and poor decisions. The middlegame is the most complex phase; study piece coordination, pawn structure weaknesses, and king safety.' });
      } else {
        lines.push({ icon: '⚔️', text: 'The middlegame was challenging. Focus on calculating forcing variations (checks, captures, threats) before committing to a move. Tactical puzzles are the fastest way to improve here.' });
      }
    }

    // Endgame
    if (totalMoves >= 30) {
      const endSlice = classificationHistory.slice(-10);
      const endGood = endSlice.filter(c => ['brilliant','best','excellent','good'].includes(c.classification)).length;
      if (endGood >= 7) {
        lines.push({ icon: '🏁', text: 'Excellent endgame conversion! You maintained precision when it mattered most — a clear sign of technical maturity.' });
      } else {
        lines.push({ icon: '🏁', text: 'The endgame showed some imprecision. Endgame study pays huge dividends: master King & Pawn endings, basic Rook endgames, and the opposition concept.' });
      }
    }

    // Result commentary
    if (result === 'win') {
      lines.push({ icon: '🏆', text: `Victory on ${currentDifficulty} difficulty in ${durationMin}m! ${accuracy >= 80 ? 'A dominant performance — you outplayed the engine at every stage.' : 'A hard-fought win. The engine put up resistance but your determination carried through.'}` });
    } else if (result === 'loss') {
      lines.push({ icon: '💪', text: `A tough loss, but every defeat is a lesson. ${counts.blunder > 0 ? `Eliminating the ${counts.blunder} blunder${counts.blunder > 1 ? 's' : ''} would completely change the game's trajectory.` : 'Study the key moments where the evaluation turned against you — small improvements compound over time.'}` });
    } else {
      lines.push({ icon: '🤝', text: 'A solid draw! Holding the engine to a draw on this difficulty level demonstrates real defensive skill and resilience.' });
    }

    // Level assessment
    let levelMsg, levelIcon, levelColor;
    if (actualIdx > selectedIdx) {
      levelIcon = '🚀';
      levelColor = '#10b981';
      levelMsg = `Your ${accuracy}% accuracy exceeds the ${currentDifficulty} standard — you are playing at <strong>${playerActualLevel} level</strong>. Consider challenging yourself with <strong>${levelOrder[Math.min(selectedIdx + 1, 3)]}</strong> difficulty for better calibrated opposition!`;
    } else if (actualIdx < selectedIdx) {
      levelIcon = '📉';
      levelColor = '#f59e0b';
      levelMsg = `Your ${accuracy}% accuracy is below the <strong>${currentDifficulty}</strong> standard (${playerActualLevel}-level play detected). Drop to <strong>${levelOrder[Math.max(selectedIdx - 1, 0)]}</strong> to build stronger foundations before tackling this difficulty.`;
    } else {
      levelIcon = '✅';
      levelColor = '#00d4aa';
      levelMsg = `Your ${accuracy}% accuracy is perfectly calibrated for <strong>${currentDifficulty}</strong> — you are right where you should be! Consistent play at this level will see your rating rise steadily.`;
    }

    return { lines, levelMsg, levelIcon, levelColor, playerActualLevel };
  }

  /* ─── Post-Game Report ─── */
  function showPostGameReport(result) {
    const overlay = document.getElementById('arena-report-overlay');
    if (!overlay) return;

    const totalMoves = moveHistory.length;
    const duration = Math.floor((Date.now() - gameStartTime) / 1000);
    const durationMin = Math.floor(duration / 60);
    const durationSec = duration % 60;

    // Calculate accuracy
    const classifications = classificationHistory.map(c => c.classification);
    const weights = { brilliant: 1, best: 1, excellent: 0.9, good: 0.7, inaccuracy: 0.4, mistake: 0.2, blunder: 0 };
    let totalWeight = 0;
    classifications.forEach(c => { totalWeight += weights[c] || 0.5; });
    const accuracy = classifications.length > 0 ? Math.round((totalWeight / classifications.length) * 100) : 50;

    // Count classifications
    const counts = { brilliant: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    classifications.forEach(c => { if (counts[c] !== undefined) counts[c]++; });

    // Performance grade
    let grade, gradeClass;
    if (accuracy >= 90) { grade = 'S'; gradeClass = 'grade-s'; }
    else if (accuracy >= 75) { grade = 'A'; gradeClass = 'grade-a'; }
    else if (accuracy >= 60) { grade = 'B'; gradeClass = 'grade-b'; }
    else if (accuracy >= 40) { grade = 'C'; gradeClass = 'grade-c'; }
    else { grade = 'D'; gradeClass = 'grade-d'; }

    // Key moments
    const keyMoments = classificationHistory
      .map((c, i) => ({ ...c, moveNum: i + 1 }))
      .filter(c => c.classification === 'blunder' || c.classification === 'mistake' || c.classification === 'brilliant');

    // Generate commentary
    const { lines: commentLines, levelMsg, levelIcon, levelColor, playerActualLevel } =
      generateMatchCommentary(result, accuracy, totalMoves, durationMin, counts);

    // Build report HTML
    const resultClass = result === 'win' ? 'win' : result === 'loss' ? 'loss' : 'draw';
    const resultLabel = result === 'win' ? '🏆 Victory' : result === 'loss' ? '💔 Defeat' : '🤝 Draw';

    overlay.innerHTML = `
      <div class="arena-report-modal">
        <div class="arena-report-header">
          <div class="arena-report-result ${resultClass}">${resultLabel}</div>
          <div class="arena-report-sub">${currentDifficulty} difficulty · ${totalMoves} moves · ${durationMin}m ${durationSec}s</div>
        </div>
        <div class="arena-report-body">
          <div class="report-stats-grid">
            <div class="report-stat-card">
              <div class="report-stat-val">${accuracy}%</div>
              <div class="report-stat-label">Accuracy</div>
            </div>
            <div class="report-stat-card">
              <div class="report-stat-val">${counts.blunder + counts.mistake}</div>
              <div class="report-stat-label">Errors</div>
            </div>
            <div class="report-stat-card">
              <div class="report-stat-val">${counts.brilliant + counts.best}</div>
              <div class="report-stat-label">Best Moves</div>
            </div>
            <div class="report-stat-card">
              <div class="report-stat-val grade-val ${gradeClass}">${grade}</div>
              <div class="report-stat-label">Grade</div>
            </div>
          </div>

          <!-- Level Assessment Banner -->
          <div class="level-assessment-banner" style="background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,34,43,0.95));border:1px solid ${levelColor}44;border-left:4px solid ${levelColor};border-radius:10px;padding:16px 20px;margin:16px 0;display:flex;align-items:flex-start;gap:14px;">
            <span style="font-size:1.6rem;line-height:1;flex-shrink:0;">${levelIcon}</span>
            <div>
              <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${levelColor};margin-bottom:5px;">Level Assessment · Playing as ${playerActualLevel}</div>
              <div style="font-size:0.88rem;color:#e2e8f0;line-height:1.55;">${levelMsg}</div>
            </div>
          </div>

          <div class="move-breakdown">
            <div class="move-breakdown-title">Move Classification</div>
            <div class="breakdown-bars">
              ${renderBreakdownBar('Brilliant', counts.brilliant, 'brilliant', 'bar-brilliant')}
              ${renderBreakdownBar('Best', counts.best, 'best', 'bar-best')}
              ${renderBreakdownBar('Excellent', counts.excellent, 'excellent', 'bar-excellent')}
              ${renderBreakdownBar('Good', counts.good, 'good', 'bar-good')}
              ${renderBreakdownBar('Inaccuracy', counts.inaccuracy, 'inaccuracy', 'bar-inaccuracy')}
              ${renderBreakdownBar('Mistake', counts.mistake, 'mistake', 'bar-mistake')}
              ${renderBreakdownBar('Blunder', counts.blunder, 'blunder', 'bar-blunder')}
            </div>
          </div>

          <div class="eval-graph-container">
            <div class="eval-graph-title">Evaluation Over Time</div>
            <div id="arena-eval-chart" style="height:160px;background:var(--arena-surface2);border-radius:8px;padding:16px;color:var(--arena-text-muted);display:flex;align-items:center;justify-content:center;">Chart loading...</div>
          </div>

          <!-- Stockfish Commentary -->
          <div style="margin:20px 0 0;">
            <div class="move-breakdown-title" style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:1rem;">🎙</span> Match Commentary
              <span style="font-size:0.7rem;font-weight:600;padding:2px 8px;border-radius:20px;background:rgba(91,156,246,0.12);color:#5b9cf6;letter-spacing:0.05em;text-transform:uppercase;margin-left:4px;">Engine Analysis</span>
            </div>
            <div class="commentary-feed">
              ${commentLines.map((line, idx) => `
                <div class="commentary-line" style="animation-delay:${idx * 0.08}s">
                  <span class="commentary-icon">${line.icon}</span>
                  <p class="commentary-text">${line.text}</p>
                </div>
              `).join('')}
            </div>
          </div>

          ${achievements.length > 0 ? `
          <div class="key-moments" style="margin-top:20px;">
            <div class="key-moments-title">🏆 Achievements Unlocked</div>
            ${achievements.map(a => `
              <div class="key-moment-item">
                <span class="km-move">${a.icon}</span>
                <span class="km-type brilliant">${a.name}</span>
                <span class="km-desc">${a.desc}</span>
              </div>
            `).join('')}
          </div>` : ''}

          ${keyMoments.length > 0 ? `
          <div class="key-moments" style="margin-top:20px;">
            <div class="key-moments-title">Key Moments</div>
            ${keyMoments.slice(0, 6).map(km => `
              <div class="key-moment-item">
                <span class="km-move">${km.moveNum}. ${km.san}</span>
                <span class="km-type ${km.classification}">${km.classification}</span>
                <span class="km-desc">${
                  km.classification === 'brilliant' ? 'Exceptional find — Grandmaster-level!' :
                  km.classification === 'blunder'   ? 'Critical error — major evaluation swing' :
                                                      'Significant inaccuracy'
                }</span>
              </div>
            `).join('')}
          </div>` : ''}

          ${renderMoveComparison()}
        </div>
        <div class="arena-report-actions">
          <button class="report-btn report-btn-secondary" onclick="CK.arena.closeReport()">Close</button>
          <button class="report-btn report-btn-secondary" onclick="CK.arena.playAgain()">Play Again</button>
          <button class="report-btn report-btn-primary" onclick="CK.arena.showCertificate('${result}', '${grade}', '${gradeClass}', ${accuracy})">🏆 View Certificate</button>
        </div>
      </div>
    `;

    overlay.classList.add('active');

    // Render eval chart (simplified for now)
    setTimeout(() => {
      renderPostGameChart();
    }, 100);
  }

  function renderPostGameChart() {
    const chartEl = document.getElementById('arena-eval-chart');
    if (!chartEl || !window.Chart) return;

    chartEl.innerHTML = '';
    const canvas = document.createElement('canvas');
    chartEl.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(232, 184, 75, 0.3)');
    gradient.addColorStop(1, 'rgba(232, 184, 75, 0)');

    new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: evalHistory.map((_, i) => (i + 1).toString()),
        datasets: [{
          label: 'Evaluation',
          data: evalHistory,
          borderColor: 'rgba(232, 184, 75, 1)',
          backgroundColor: gradient,
          tension: 0.3,
          fill: true,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { 
            min: -3, 
            max: 3, 
            ticks: { color: '#8892a4', font: { size: 10 } }, 
            grid: { display: false } 
          },
          x: { display: false }
        },
        plugins: { 
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            borderColor: '#f6c45a',
            borderWidth: 1
          }
        }
      }
    });
  }

  function renderBreakdownBar(label, count, type, barClass) {
    const total = Math.max(moveHistory.length, 1);
    const pct = (count / total) * 100;
    return `
      <div class="breakdown-row">
        <span class="breakdown-label">${label}</span>
        <div class="breakdown-bar-wrap">
          <div class="bar-seg ${barClass}" style="width: ${pct}%"></div>
        </div>
        <span class="breakdown-count">${count}</span>
      </div>
    `;
  }

  /* ─── Move Comparison ─── */
  function renderMoveComparison() {
    if (moveHistory.length === 0) return '';
    
    let html = `
      <div class="move-breakdown" style="margin-top: 24px;">
        <div class="move-breakdown-title">Move Comparison</div>
        <div style="max-height: 200px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
            <thead>
              <tr style="color: var(--arena-text-muted);">
                <th style="text-align: left; padding: 6px;">#</th>
                <th style="text-align: left; padding: 6px;">You</th>
                <th style="text-align: left; padding: 6px;">Best</th>
                <th style="text-align: left; padding: 6px;">Diff</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    for (let i = 0; i < moveHistory.length; i++) {
      const classification = classificationHistory[i]?.classification || 'good';
      const san = moveHistory[i]?.san || '';
      const diff = getMoveDiff(i);
      const diffColor = diff < 0.1 ? '#10b981' : diff < 0.5 ? '#f59e0b' : '#ef4444';
      
      html += `
        <tr style="border-bottom: 1px solid var(--arena-border);">
          <td style="padding: 6px; color: var(--arena-text-muted);">${Math.floor(i/2)+1}</td>
          <td style="padding: 6px; font-family: monospace; color: ${getClassificationColor(classification)};">${san}</td>
          <td style="padding: 6px; font-family: monospace; opacity: 0.6;">${getBestMoveForTurn(i) || '-'}</td>
          <td style="padding: 6px; font-weight: 600; color: ${diffColor};">${diff.toFixed(2)}</td>
        </tr>
      `;
    }
    
    html += '</tbody></table></div></div>';
    return html;
  }

  function getClassificationColor(c) {
    const colors = { brilliant: '#00d4aa', best: '#10B981', excellent: '#34d399', good: '#63b3ed', inaccuracy: '#F59E0B', mistake: '#f97316', blunder: '#EF5350' };
    return colors[c] || '#f1f5f9';
  }

  function getMoveDiff(moveIndex) {
    if (!classificationHistory[moveIndex]) return 0;
    const c = classificationHistory[moveIndex].classification;
    const diffs = { brilliant: 0, best: 0, excellent: 0.1, good: 0.3, inaccuracy: 0.5, mistake: 1.0, blunder: 2.0 };
    return diffs[c] || 0.5;
  }

  function getBestMoveForTurn(moveIndex) {
    // Use depth 1 only — this is a post-game display table, not actual AI play.
    // Running full-depth minimax for every move in history freezes the UI thread.
    const fenBefore = moveIndex === 0
      ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      : (moveHistory[moveIndex - 1]?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const savedGame = game;
    game = new Chess(fenBefore);
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) { game = savedGame; return null; }
    let bestMove = null;
    let bestEval = game.turn() === 'w' ? -Infinity : Infinity;
    const isMax = game.turn() === 'w';
    for (const m of moves) {
      game.move(m);
      const ev = evaluateBoard();
      game.undo();
      if (isMax && ev > bestEval) { bestEval = ev; bestMove = m; }
      if (!isMax && ev < bestEval) { bestEval = ev; bestMove = m; }
    }
    game = savedGame;
    return bestMove ? bestMove.san : null;
  }



  A.closeReport = () => {
    const overlay = document.getElementById('arena-report-overlay');
    if (overlay) overlay.classList.remove('active');
  };

  A.playAgain = () => {
    A.closeReport();
    setTimeout(() => A.init(), 200);
  };

/* ─── Certificate ─── */
A.showCertificate = (result, grade, gradeClass, accuracy) => {
  const overlay = document.getElementById('cert-overlay');
  if (!overlay) return;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const certId = 'CK-' + now.getFullYear() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const savedName = localStorage.getItem('ck_player_name') || '';
  
  overlay.innerHTML = `
    <div class="cert-modal">
      <div class="cert-border-outer">
        <div class="cert-border-inner">
          <div class="cert-logo" style="font-size: 64px; margin-bottom: 20px; color: #c89a38; text-shadow: 0 0 20px rgba(200, 154, 56, 0.5);">♛</div>
          <div class="cert-academy-name" style="font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 900; color: #1a1a1a; margin-bottom: 8px;">
            Chess<span style="color: #c89a38;">Kidoo</span>
          </div>
          <div class="cert-title" style="font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 900; color: #c89a38; text-transform: uppercase; letter-spacing: 4px; margin: 24px 0 16px; border-bottom: 2px solid #e8b84b; display: inline-block; padding-bottom: 12px;">
            Certificate of Achievement
          </div>
          <div class="cert-subtitle" style="font-size: 14px; color: #888; margin-bottom: 24px; font-style: italic; letter-spacing: 1px;">
            AI Challenge Arena
          </div>
          
          <div class="cert-input-section" style="margin: 24px 0; padding: 20px; background: rgba(232, 184, 75, 0.08); border-radius: 16px; border: 1px dashed rgba(200, 154, 56, 0.4);">
            <input type="text" id="cert-player-name" placeholder="Enter your name" value="${savedName.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}" style="width: 70%; max-width: 300px; padding: 14px 20px; border-radius: 10px; border: 2px solid #e8b84b; font-size: 16px; margin-bottom: 12px; background: #fff; font-family: inherit;">
            <div class="cert-presented" style="font-size: 13px; color: #666; margin-bottom: 10px; letter-spacing: 0.5px;">This certificate is proudly presented to</div>
            <div class="cert-player-name" id="cert-display-name" style="font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 900; color: #1a1a1a; min-height: 40px; display: flex; align-items: center; justify-content: center; letter-spacing: -0.5px;">${savedName.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') || '---'}</div>
          </div>
          
          <div class="cert-details-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 440px; margin: 24px auto; text-align: left;">
            <div class="cert-detail-item" style="display: flex; justify-content: space-between; font-size: 14px; padding: 10px 0; border-bottom: 1px dotted #ddd;">
              <span class="cert-detail-label" style="color: #888; font-weight: 500;">Difficulty</span>
              <span class="cert-detail-value" style="color: #1a1a1a; font-weight: 700;">${currentDifficulty}</span>
            </div>
            <div class="cert-detail-item" style="display: flex; justify-content: space-between; font-size: 14px; padding: 10px 0; border-bottom: 1px dotted #ddd;">
              <span class="cert-detail-label" style="color: #888; font-weight: 500;">Result</span>
              <span class="cert-detail-value" style="color: #1a1a1a; font-weight: 700;">${result === 'win' ? 'Victory' : result === 'loss' ? 'Defeat' : 'Draw'}</span>
            </div>
            <div class="cert-detail-item" style="display: flex; justify-content: space-between; font-size: 14px; padding: 10px 0; border-bottom: 1px dotted #ddd;">
              <span class="cert-detail-label" style="color: #888; font-weight: 500;">Accuracy</span>
              <span class="cert-detail-value" style="color: #1a1a1a; font-weight: 700;">${accuracy}%</span>
            </div>
            <div class="cert-detail-item" style="display: flex; justify-content: space-between; font-size: 14px; padding: 10px 0; border-bottom: 1px dotted #ddd;">
              <span class="cert-detail-label" style="color: #888; font-weight: 500;">Moves</span>
              <span class="cert-detail-value" style="color: #1a1a1a; font-weight: 700;">${moveHistory.length}</span>
            </div>
          </div>
          
          <div class="cert-grade ${gradeClass}" style="font-family: 'Playfair Display', serif; font-size: 56px; font-weight: 900; margin: 20px 0; line-height: 1;">${grade}</div>
          
          <div class="cert-signature-area" style="display: flex; justify-content: center; align-items: center; gap: 50px; margin-top: 30px; padding-top: 20px; border-top: 1px dashed rgba(200, 154, 56, 0.4);">
            <div class="cert-signature" style="text-align: center;">
              <div style="width: 140px; height: 1px; background: #333; margin: 0 auto 10px;"></div>
              <div style="font-size: 12px; color: #666; font-style: italic; letter-spacing: 0.5px;">ChessKidoo AI</div>
            </div>
          </div>
          
          <div class="cert-id" style="font-family: monospace; font-size: 12px; color: #aaa; margin-top: 20px; letter-spacing: 0.5px;">Certificate ID: ${certId}</div>
          <div class="cert-date" style="font-size: 12px; color: #888; margin-top: 6px;">${dateStr}</div>
          
          <div class="cert-actions" style="display: flex; gap: 16px; justify-content: center; margin-top: 28px;">
            <button class="cert-btn cert-btn-print" id="cert-download-btn" ${savedName.length >= 2 ? '' : 'disabled'} style="padding: 14px 32px; background: #c89a38; color: #fff; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; ${savedName.length >= 2 ? '' : 'opacity: 0.5; cursor: not-allowed;'}">🖨️ Download Certificate</button>
            <button class="cert-btn cert-btn-close" onclick="CK.arena.closeCertificate()" style="padding: 14px 32px; background: #f1f5f9; color: #333; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; border: 1px solid #ddd;">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  overlay.classList.add('active');
  
  const nameInput = document.getElementById('cert-player-name');
  const displayName = document.getElementById('cert-display-name');
  const downloadBtn = document.getElementById('cert-download-btn');
  
  nameInput.addEventListener('input', function() {
    const name = this.value.trim();
    displayName.textContent = name || '---';
    downloadBtn.disabled = name.length < 2;
    if (name.length >= 2) {
      downloadBtn.style.opacity = '1';
      downloadBtn.style.cursor = 'pointer';
    } else {
      downloadBtn.style.opacity = '0.5';
      downloadBtn.style.cursor = 'not-allowed';
    }
  });
  
  downloadBtn.onclick = () => {
    const name = nameInput.value.trim();
    if (name.length < 2) return;
    localStorage.setItem('ck_player_name', name);
    downloadCertificateAsImage();
  };
  
  function downloadCertificateAsImage() {
    const name = nameInput.value.trim();
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) { CK.showToast('Please allow popups to download the certificate.', 'warning'); return; }
    const doc = printWindow.document;
    doc.open();
    doc.write(`
      <html>
      <head>
        <title>ChessKidoo Certificate</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');
          body { 
            font-family: 'DM Sans', sans-serif; 
            margin: 0; 
            padding: 30px; 
            background: #fffdf5;
            color: #1a1a1a;
          }
          .cert-container { 
            max-width: 780px; 
            margin: 0 auto; 
            background: #fffdf5;
            border: 3px solid #c89a38;
            padding: 20px;
            position: relative;
          }
          .cert-inner { 
            border: 1px solid #e8b84b; 
            padding: 50px; 
            text-align: center; 
            background: radial-gradient(circle at center top, #fffdf5 0%, #fef9e7 100%);
            position: relative;
            min-height: 600px;
          }
          .cert-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 180px;
            color: rgba(200, 154, 56, 0.05);
            z-index: 0;
            font-family: serif;
          }
          .cert-logo { 
            font-size: 64px; 
            margin-bottom: 20px; 
            color: #c89a38; 
            text-shadow: 0 0 20px rgba(200, 154, 56, 0.5);
            position: relative;
            z-index: 1;
          }
          .cert-academy-name { 
            font-family: 'Playfair Display', serif; 
            font-size: 28px; 
            font-weight: 900; 
            color: #1a1a1a; 
            margin-bottom: 8px;
            position: relative;
            z-index: 1;
          }
          .cert-title { 
            font-family: 'Playfair Display', serif; 
            font-size: 28px; 
            font-weight: 900; 
            color: #c89a38; 
            text-transform: uppercase; 
            letter-spacing: 4px; 
            margin: 24px 0 16px; 
            border-bottom: 2px solid #e8b84b; 
            display: inline-block; 
            padding-bottom: 12px;
            position: relative;
            z-index: 1;
          }
          .cert-subtitle { 
            font-size: 14px; 
            color: #888; 
            margin-bottom: 24px; 
            font-style: italic; 
            letter-spacing: 1px;
            position: relative;
            z-index: 1;
          }
          .cert-presented { 
            font-size: 13px; 
            color: #666; 
            margin-bottom: 10px; 
            letter-spacing: 0.5px;
            position: relative;
            z-index: 1;
          }
          .cert-player-name { 
            font-family: 'Playfair Display', serif; 
            font-size: 32px; 
            font-weight: 900; 
            color: #1a1a1a; 
            margin: 12px 0 24px; 
            border-bottom: 1px solid #ddd; 
            display: inline-block; 
            padding: 0 40px;
            position: relative;
            z-index: 1;
          }
          .cert-details-grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 16px; 
            max-width: 440px; 
            margin: 24px auto; 
            text-align: left;
            position: relative;
            z-index: 1;
          }
          .cert-detail-item { 
            display: flex; 
            justify-content: space-between; 
            font-size: 14px; 
            padding: 10px 0; 
            border-bottom: 1px dotted #ddd; 
          }
          .cert-detail-label { color: #888; font-weight: 500; }
          .cert-detail-value { color: #1a1a1a; font-weight: 700; }
          .cert-grade { 
            font-family: 'Playfair Display', serif; 
            font-size: 56px; 
            font-weight: 900; 
            margin: 20px 0; 
            line-height: 1;
            position: relative;
            z-index: 1;
          }
          .cert-grade.grade-s { color: #c89a38; }
          .cert-grade.grade-a { color: #10B981; }
          .cert-grade.grade-b { color: #5b96f6; }
          .cert-grade.grade-c { color: #F59E0B; }
          .cert-grade.grade-d { color: #EF5350; }
          .cert-signature-area { 
            display: flex; 
            justify-content: center; 
            gap: 50px; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px dashed rgba(200, 154, 56, 0.4);
            position: relative;
            z-index: 1;
          }
          .cert-signature { text-align: center; }
          .cert-signature-line { width: 140px; height: 1px; background: #333; margin: 0 auto 10px; }
          .cert-signature-label { font-size: 12px; color: #666; font-style: italic; letter-spacing: 0.5px; }
          .cert-id { font-family: monospace; font-size: 12px; color: #aaa; margin-top: 20px; letter-spacing: 0.5px; position: relative; z-index: 1; }
          .cert-date { font-size: 12px; color: #888; margin-top: 6px; position: relative; z-index: 1; }
        </style>
      </head>
      <body>
        <div class="cert-container">
          <div class="cert-inner">
            <div class="cert-watermark">♛</div>
            <div class="cert-logo">♛</div>
            <div class="cert-academy-name">Chess<span style="color: #c89a38;">Kidoo</span></div>
            <div class="cert-title">Certificate of Achievement</div>
            <div class="cert-subtitle">AI Challenge Arena</div>
            <div class="cert-presented">This certificate is proudly presented to</div>
            <div class="cert-player-name">${name}</div>
            <div class="cert-details-grid">
              <div class="cert-detail-item"><span class="cert-detail-label">Difficulty</span><span class="cert-detail-value">${currentDifficulty}</span></div>
              <div class="cert-detail-item"><span class="cert-detail-label">Result</span><span class="cert-detail-value">${result === 'win' ? 'Victory' : result === 'loss' ? 'Defeat' : 'Draw'}</span></div>
              <div class="cert-detail-item"><span class="cert-detail-label">Accuracy</span><span class="cert-detail-value">${accuracy}%</span></div>
              <div class="cert-detail-item"><span class="cert-detail-label">Moves</span><span class="cert-detail-value">${moveHistory.length}</span></div>
            </div>
            <div class="cert-grade grade-${grade.toLowerCase()}">${grade}</div>
            <div class="cert-signature-area">
              <div class="cert-signature">
                <div class="cert-signature-line"></div>
                <div class="cert-signature-label">ChessKidoo AI</div>
              </div>
            </div>
            <div class="cert-id">Certificate ID: ${certId}</div>
            <div class="cert-date">${dateStr}</div>
          </div>
        </div>
      </body>
      </html>
    `);
    doc.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
};

  A.closeCertificate = () => {
    const overlay = document.getElementById('cert-overlay');
    if (overlay) overlay.classList.remove('active');
  };

/* ─── Game Controls ─── */
A.resignGame = () => {
  if (isGameOver) return;
  isGameOver = true;
  isThinking = false;
  if (clockInterval) clearInterval(clockInterval);
  updateStatus('You resigned — AI Wins', 'gameover');
  setTimeout(() => showPostGameReport('loss'), 800);
};

A.offerDraw = () => {
  if (isGameOver) return;
  isGameOver = true;
  isThinking = false;
  if (clockInterval) clearInterval(clockInterval);
  updateStatus('Game Drawn by agreement', 'gameover');
  setTimeout(() => showPostGameReport('draw'), 800);
};

A.newGame = () => {
  if (clockInterval) clearInterval(clockInterval);
  A.closeReport();
  A.closeCertificate();
  A.init();
};

A.setDifficulty = (level) => {
  currentDifficulty = level;
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === level);
  });
};

/* ─── Hint System ─── */
A.showHint = () => {
  if (isGameOver || isThinking || !isPlayerTurn) return;
  
  const depth = DIFFICULTY_DEPTH[currentDifficulty] || 2;
  const bestMove = getBestMoveMinimax(depth);
  
  if (bestMove) {
    const fromEl = document.querySelector(`.a-sq[data-square="${bestMove.from}"]`);
    const toEl = document.querySelector(`.a-sq[data-square="${bestMove.to}"]`);
    
    if (fromEl) {
      fromEl.style.animation = 'hintPulse 1.5s ease-in-out 3';
    }
    if (toEl) {
      toEl.style.animation = 'hintPulse 1.5s ease-in-out 3';
    }
    
    CK.showToast(`Hint: Play ${bestMove.san}`, 'info');
  }
};

/* ─── Puzzle Database ─── */
const PUZZLES = [
  { id: 1, name: 'Scholar\'s Mate', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', solution: 'f7#', difficulty: 'Beginner', type: 'mate' },
  { id: 2, name: 'Back Rank Mate', fen: '6k1/5ppp/8/8/8/8/8/R3K3 w Q - - 0 1', solution: 'Rh8#', difficulty: 'Intermediate', type: 'mate' },
  { id: 3, name: 'Fork Practice', fen: '8/8/8/4N3/8/8/4P3/4K2k w - - 0 1', solution: 'Nf5+', difficulty: 'Beginner', type: 'tactics' },
  { id: 4, name: 'Pin Challenge', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4', solution: 'Bc4', difficulty: 'Intermediate', type: 'tactics' },
  { id: 5, name: 'Deflection', fen: '3qk3/8/3b4/8/8/8/3K4/3Q4 w - - 0 1', solution: 'Qd1+', difficulty: 'Advanced', type: 'tactics' },
];

let currentPuzzle = null;

/* ─── Puzzle Mode ─── */
A.startPuzzle = (puzzleId = null) => {
  puzzleMode = true;
  if (puzzleId) {
    currentPuzzle = PUZZLES.find(p => p.id === puzzleId);
  } else {
    currentPuzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
  }
  
  game = new Chess(currentPuzzle.fen);
  moveHistory = [];
  evalHistory = [];
  classificationHistory = [];
  capturedWhite = [];
  capturedBlack = [];
  selectedSq = null;
  isPlayerTurn = true;
  isGameOver = false;
  isThinking = false;
  gameStartTime = Date.now();
  whiteClock = 600;
  blackClock = 600;
  activeClock = 'w';
  achievements = JSON.parse(localStorage.getItem('ck_achievements') || '[]');
  engineReady = true;
  useWasm = false;
  
  renderBoard();
  renderAnalysisPanel();
  updateStatus(`Puzzle: ${currentPuzzle.name} — Find the best move!`);
  initEvalChart();
};

A.checkPuzzleSolution = (moveStr) => {
  if (!currentPuzzle) return false;
  
  const correctMove = currentPuzzle.solution;
  const isCorrect = moveStr === correctMove || moveStr.includes(correctMove.substring(0, 2) + correctMove.substring(2, 4));
  
  if (isCorrect) {
    updateStatus('Correct! Well done!', 'gameover');
    CK.showToast('Puzzle solved! Excellent!', 'success');
    setTimeout(() => A.startPuzzle(), 1500);
    return true;
  } else {
    updateStatus('Incorrect — Try again!', 'check');
    CK.showToast('That is not the correct move. Think again!', 'error');
    return false;
  }
};

/* ─── Mini-Games ─── */
A.startMiniGame = (gameType) => {
  if (gameType === 'piece-assembly') {
    startPieceAssembly();
  } else if (gameType === 'find-move') {
    startFindMove();
  }
};

function startPieceAssembly() {
  updateStatus('Mini-Game: Arrange the pieces! Drag and drop to form a checkmate.');
  CK.showToast('Drag pieces to form checkmate!', 'info');
}

function startFindMove() {
  const positions = [
    { pos: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 2', goal: 'e5' },
    { pos: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', goal: 'e6' },
    { pos: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 2', goal: 'Qh5' },
  ];
  const pos = positions[Math.floor(Math.random() * positions.length)];
  game = new Chess(pos.pos);
  renderBoard();
  updateStatus(`Mini-Game: Find the best move for White! Goal: ${pos.goal}`);
}

/* ─── More Games ─── */

A.startMemoryGame = () => {
  if (!game) game = new Chess();
  const moves = game.moves({ verbose: true }).slice(0, 6);
  memoryGameState = {
    sequence: moves,
    index: 0,
    playerSequence: []
  };
  updateStatus('Memory Game: Watch the sequence...');
  CK.showToast('Watch the moves and repeat them!', 'info');
  playMemorySequence();
};

function playMemorySequence() {
  if (!memoryGameState) return;
  let i = 0;
  const interval = setInterval(() => {
    if (i >= memoryGameState.sequence.length) {
      clearInterval(interval);
      updateStatus('Your turn - repeat the sequence!');
      return;
    }
    highlightSquare(memoryGameState.sequence[i].from);
    setTimeout(() => highlightSquare(memoryGameState.sequence[i].to), 300);
    i++;
  }, 700);
}

function highlightSquare(sq) {
  const el = document.querySelector(`.a-sq[data-square="${sq}"]`);
  if (el) {
    el.style.transition = 'all 0.3s';
    el.style.transform = 'scale(1.2)';
    el.style.background = 'rgba(232, 184, 75, 0.5)';
    setTimeout(() => {
      el.style.transform = 'scale(1)';
      el.style.background = '';
    }, 250);
  }
}

A.startQuickMove = () => {
  if (gameTimer) clearInterval(gameTimer);
  const positions = [
    { pos: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 2', goal: 'e5' },
    { pos: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', goal: 'e6' },
  ];
  const pos = positions[Math.floor(Math.random() * positions.length)];
  game = new Chess(pos.pos);
  quickMoveState = { goal: pos.goal, timeLeft: 30, solved: false };
  renderBoard();
  updateStatus(`Quick Move: Find ${pos.goal}! Time: 30s`);
  startQuickMoveTimer();
};

function startQuickMoveTimer() {
  if (gameTimer) clearInterval(gameTimer);
  gameTimer = setInterval(() => {
    if (!quickMoveState) return;
    quickMoveState.timeLeft--;
    updateStatus(`Time: ${quickMoveState.timeLeft}s - Find ${quickMoveState.goal}!`);
    if (quickMoveState.timeLeft <= 0) {
      clearInterval(gameTimer);
      updateStatus('Time\'s up!', 'check');
      setTimeout(() => A.startQuickMove(), 1500);
    }
  }, 1000);
}

  /* ─── Toast Notifications ─── */
A.showToast = (msg, type = 'info') => {
  let toast = document.getElementById('arena-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'arena-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      color: white;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: opacity 0.3s;
    `;
    document.body.appendChild(toast);
  }
  
  const colors = { info: '#3b82f6', success: '#10b981', error: '#ef4444', warning: '#f59e0b' };
  toast.style.background = colors[type] || colors.info;
  toast.textContent = msg;
  toast.style.opacity = '1';
  
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 3000);
};
  A.updateMinimaxAnalysis = () => {
    if (useWasm) return;
    const depth = DIFFICULTY_DEPTH[currentDifficulty] || 2;
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return;

    let bestMove = null;
    let bestEval = game.turn() === 'w' ? -Infinity : Infinity;
    const isMax = game.turn() === 'w';

    for (const m of moves) {
      game.move(m);
      const ev = minimax(depth - 1, -Infinity, Infinity, !isMax);
      game.undo();
      if (isMax && ev > bestEval) { bestEval = ev; bestMove = m; }
      if (!isMax && ev < bestEval) { bestEval = ev; bestMove = m; }
    }

    if (bestMove) {
      const displayEval = bestEval / 10;
      updateEngineDisplay(displayEval, depth, [bestMove.san]);
    }
  };

  A.goHome = () => {
    if (stockfish) {
      try { stockfish.terminate(); } catch(e) {}
      stockfish = null;
    }
    if (clockInterval) clearInterval(clockInterval);
    if (gameTimer) clearInterval(gameTimer);
    CK.showPage('landing-page');
  };

})();
