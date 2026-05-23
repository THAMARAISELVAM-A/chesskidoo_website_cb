/* assets/js/chessboard.js ---------------------------------------------------
   High-Fidelity Pure-CSS Chess Replay Engine — ChessKidoo
   --------------------------------------------------------------- */

(() => {
  const CK = window.CK = window.CK || {};

  // Only run if the board element exists on the page!
  window.addEventListener('DOMContentLoaded', () => {
    const boardEl = document.getElementById('board');
    if (!boardEl) return;

    const FILES = ['a','b','c','d','e','f','g','h'];
    const RANKS_LABELS = ['8','7','6','5','4','3','2','1'];
    const GLYPH = {wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟'};

    // Build coordinate elements
    const ranksDiv = document.getElementById('ranks-col');
    if (ranksDiv && ranksDiv.children.length === 0) {
      RANKS_LABELS.forEach(r => {
        const div = document.createElement('div');
        div.className = 'coord';
        div.textContent = r;
        ranksDiv.appendChild(div);
      });
    }
    const filesDiv = document.getElementById('files-row');
    if (filesDiv && filesDiv.children.length === 0) {
      FILES.forEach(f => {
        const div = document.createElement('div');
        div.className = 'coord';
        div.textContent = f;
        filesDiv.appendChild(div);
      });
    }

    // Starting position
    function initBoard() {
      return [
        ['bR','bN','bB','bQ','bK','bB','bN','bR'],
        ['bP','bP','bP','bP','bP','bP','bP','bP'],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        ['wP','wP','wP','wP','wP','wP','wP','wP'],
        ['wR','wN','wB','wQ','wK','wB','wN','wR']
      ];
    }

    // Moves: [fromRow, fromFile, toRow, toFile] (row 0 = rank8)
    const MOVES = [
      [6,4,4,4],[1,4,3,4],[6,5,4,5],[3,4,4,5],[7,5,4,2],[0,3,4,7],
      [7,4,7,5],[1,1,3,1],[4,2,3,1],[0,6,2,5],[7,6,5,5],[4,7,2,7],
      [6,3,5,3],[2,5,1,7],[5,5,4,7],[2,7,3,6],[4,7,3,5],[1,2,2,2],
      [6,6,4,6],[1,7,2,5],[7,7,6,6],[2,2,3,1],[6,7,4,7],[3,6,2,6],
      [4,7,3,7],[2,6,3,6],[7,3,5,5],[2,5,0,6],[3,1,4,5],[3,6,5,5],
      [7,1,5,2],[0,5,4,2],[5,2,3,4],[5,5,6,1],[2,3,4,5],[4,2,6,6],
      [4,4,3,4],[6,1,7,0],[7,5,6,4],[0,1,2,0],[3,5,1,6],[0,4,0,3],
      [5,5,0,5],[0,6,0,5],[4,5,0,4]
    ];

    // SAN notation for display
    const SAN = [
      ['e4','e5'],['f4','exf4'],['Bc4','Qh4+'],['Kf1','b5'],
      ['Bxb5','Nf6'],['Nf3','Qh6'],['d3','Nh5'],['Nh4','Qg5'],
      ['Nf5','c6'],['g4','Nf6'],['Rg1','cxb5'],['h4','Qg6'],
      ['h5','Qg5'],['Qf3','Ng8'],['Bxf4','Qf6'],['Nc3','Bc5'],
      ['Nd5','Qxb2'],['Bd6','Bxg1'],['e5','Qa1+'],['Ke2','Na6'],
      ['Nxg7+','Kd8'],['Qf6+','Nxf6'],['Be7#','']
    ];

    let board = initBoard();
    let moveIdx = 0;
    let isPlaying = true;
    let intervalId = null;
    let currentSpeedIndex = 2;      // 3rd option -> ~1100ms
    const speedDelays = [2800, 1800, 1100, 650, 320];

    const moveListEl = document.getElementById('move-list');

    // render board with optional highlight squares
    function renderBoard(hlFrom = null, hlTo = null) {
      boardEl.innerHTML = '';
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const square = document.createElement('div');
          square.className = `sq ${(r + f) % 2 === 0 ? 'light' : 'dark'}`;
          if (hlFrom && hlFrom[0] === r && hlFrom[1] === f) square.classList.add('hl-from');
          if (hlTo && hlTo[0] === r && hlTo[1] === f) square.classList.add('hl-to');
          const piece = board[r][f];
          if (piece) {
            const pieceSpan = document.createElement('span');
            pieceSpan.className = 'piece';
            pieceSpan.textContent = GLYPH[piece];
            square.appendChild(pieceSpan);
          }
          boardEl.appendChild(square);
        }
      }
    }

    // apply a single move to the board state
    function applyMove(index) {
      if (index >= MOVES.length) return false;
      const [fr, ff, tr, tf] = MOVES[index];
      board[tr][tf] = board[fr][ff];
      board[fr][ff] = null;
      return true;
    }

    // jump to a specific move count (half-move index)
    function goToMove(targetHalfMoveIdx) {
      // reset board to initial position
      board = initBoard();
      for (let i = 0; i < targetHalfMoveIdx && i < MOVES.length; i++) {
        const [fr, ff, tr, tf] = MOVES[i];
        board[tr][tf] = board[fr][ff];
        board[fr][ff] = null;
      }
      moveIdx = targetHalfMoveIdx;
      const lastMove = (moveIdx > 0 && moveIdx <= MOVES.length) ? MOVES[moveIdx - 1] : null;
      renderBoard(lastMove ? [lastMove[0], lastMove[1]] : null, lastMove ? [lastMove[2], lastMove[3]] : null);
      renderMoveList();
    }

    // step forward one move (auto)
    function stepForward() {
      if (moveIdx >= MOVES.length) {
        stopAutoPlay();
        isPlaying = false;
        const pauseBtn = document.getElementById('b-pause');
        if (pauseBtn) pauseBtn.textContent = '▶️ Play';
        return;
      }
      applyMove(moveIdx);
      moveIdx++;
      const lastMove = MOVES[moveIdx - 1];
      renderBoard([lastMove[0], lastMove[1]], [lastMove[2], lastMove[3]]);
      renderMoveList();
    }

    function startAutoPlay() {
      if (intervalId) clearInterval(intervalId);
      if (moveIdx >= MOVES.length) return;
      intervalId = setInterval(() => stepForward(), speedDelays[currentSpeedIndex]);
    }

    function stopAutoPlay() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function togglePlay() {
      if (moveIdx >= MOVES.length) {
        goToMove(0);
      }
      if (isPlaying) {
        stopAutoPlay();
        isPlaying = false;
        document.getElementById('b-pause').textContent = '▶️ Play';
      } else {
        startAutoPlay();
        isPlaying = true;
        document.getElementById('b-pause').textContent = '⏸️ Pause';
      }
    }

    function nextMove() {
      if (moveIdx < MOVES.length) {
        stopAutoPlay(); isPlaying = false; document.getElementById('b-pause').textContent = '▶️ Play';
        applyMove(moveIdx);
        moveIdx++;
        const lastMove = MOVES[moveIdx - 1];
        renderBoard([lastMove[0], lastMove[1]], [lastMove[2], lastMove[3]]);
        renderMoveList();
      }
    }

    function prevMove() {
      if (moveIdx > 0) {
        stopAutoPlay(); isPlaying = false; document.getElementById('b-pause').textContent = '▶️ Play';
        goToMove(moveIdx - 1);
      }
    }

    function firstMove() {
      stopAutoPlay(); isPlaying = false; document.getElementById('b-pause').textContent = '▶️ Play';
      goToMove(0);
    }

    function lastMove() {
      stopAutoPlay(); isPlaying = false; document.getElementById('b-pause').textContent = '▶️ Play';
      goToMove(MOVES.length);
    }

    // render move list with clickable SAN
    function renderMoveList() {
      if (!moveListEl) return;
      moveListEl.innerHTML = '';
      for (let i = 0; i < SAN.length; i++) {
        const pair = SAN[i];
        const row = document.createElement('div');
        row.className = 'move-row';
        const numSpan = document.createElement('div');
        numSpan.className = 'move-n';
        numSpan.textContent = (i + 1) + '.';
        row.appendChild(numSpan);
        // white move
        const whiteSpan = document.createElement('div');
        whiteSpan.className = 'move-san';
        whiteSpan.textContent = pair[0] || '';
        const whiteIdx = i * 2 + 1;
        if (whiteIdx === moveIdx && pair[0]) whiteSpan.classList.add('active');
        if (pair[0]) {
          whiteSpan.onclick = (() => {
            const targetIdx = whiteIdx;
            return () => { stopAutoPlay(); isPlaying = false; document.getElementById('b-pause').textContent = '▶️ Play'; goToMove(targetIdx); };
          })();
        }
        row.appendChild(whiteSpan);
        // black move
        const blackSpan = document.createElement('div');
        blackSpan.className = 'move-san';
        blackSpan.textContent = pair[1] || '';
        const blackIdx = i * 2 + 2;
        if (blackIdx === moveIdx && pair[1]) blackSpan.classList.add('active');
        if (pair[1]) {
          blackSpan.onclick = (() => {
            const targetIdx = blackIdx;
            return () => { stopAutoPlay(); isPlaying = false; document.getElementById('b-pause').textContent = '▶️ Play'; goToMove(targetIdx); };
          })();
        }
        row.appendChild(blackSpan);
        moveListEl.appendChild(row);
      }
      // auto-scroll to active move (confined to panel container only)
      const activeMove = moveListEl.querySelector('.move-san.active');
      if (activeMove) {
        const panel = document.querySelector('.moves-panel');
        if (panel) {
          const containerTop = panel.getBoundingClientRect().top;
          const activeTop = activeMove.getBoundingClientRect().top;
          const relativeTop = activeTop - containerTop + panel.scrollTop;
          panel.scrollTo({
            top: relativeTop - (panel.clientHeight / 2) + (activeMove.clientHeight / 2),
            behavior: 'smooth'
          });
        }
      }
    }

    // speed control
    const speedSlider = document.getElementById('speed');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        currentSpeedIndex = parseInt(e.target.value, 10) - 1;
        if (isPlaying) {
          stopAutoPlay();
          startAutoPlay();
        }
      });
    }

    // connect UI buttons
    document.getElementById('b-start')?.addEventListener('click', firstMove);
    document.getElementById('b-prev')?.addEventListener('click', prevMove);
    document.getElementById('b-pause')?.addEventListener('click', togglePlay);
    document.getElementById('b-next')?.addEventListener('click', nextMove);
    document.getElementById('b-end')?.addEventListener('click', lastMove);

    // initial render and auto-start
    goToMove(5);
    startAutoPlay();
    isPlaying = true;
    const pauseBtn = document.getElementById('b-pause');
    if (pauseBtn) pauseBtn.textContent = '⏸️ Pause';
  });
})();
