/* assets/js/arcade.js --------------------------------------------------------
   ChessKidoo Standalone Interactive Arcade
   Highly polished client-side chess games & brain boosters.
   --------------------------------------------------------------- */

window.CK = window.CK || {};

CK.arcade = (() => {
  const ARC = {};

  // Synthesize sound effects on-the-fly using Web Audio API
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSFX(type) {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'coin') {
        // Star collected sound - 8bit style
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'win') {
        // Major chord arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + idx * 0.08);
          g.gain.setValueAtTime(0.12, now + idx * 0.08);
          g.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.4);
          o.start(now + idx * 0.08);
          o.stop(now + idx * 0.08 + 0.45);
        });
      } else if (type === 'buzz') {
        // Wrong move sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'select') {
        // soft selection tick
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      console.warn("AudioContext block/error: ", e);
    }
  }

  // General state variables
  let currentGameType = '';
  let score = 0;
  let level = 1;
  let state = {};

  // Trigger overlays
  function showOverlay() {
    const el = document.getElementById('arcade-overlay');
    if (el) el.classList.add('active');
  }

  function hideOverlay() {
    const el = document.getElementById('arcade-overlay');
    if (el) el.classList.remove('active');
    // Clear interval timers
    if (state.timerInterval) clearInterval(state.timerInterval);
    currentGameType = '';
  }

  // Exported helpers
  ARC.exitGame = () => {
    hideOverlay();
  };

  /* ==========================================
     GAME 1: CHESS PUZZLE RUSH
     ========================================== */
  const PUZZLES = [
    {
      title: "Rook Mate-in-1",
      desc: "Find the back-rank mate with your White Rook!",
      fen: "6k1/5ppp/8/8/8/8/8/1R4K1 w - - 0 1",
      pieces: {
        'b1': { type: 'R', color: 'white', unicode: '♖' },
        'g8': { type: 'k', color: 'black', unicode: '♚' },
        'f7': { type: 'p', color: 'black', unicode: '♟' },
        'g7': { type: 'p', color: 'black', unicode: '♟' },
        'h7': { type: 'p', color: 'black', unicode: '♟' },
        'g1': { type: 'K', color: 'white', unicode: '♔' }
      },
      solution: { from: 'b1', to: 'b8' },
      hint: "Slide the rook all the way to the 8th rank to trap the king!"
    },
    {
      title: "Knight Fork!",
      desc: "Find the Knight fork on King and Queen!",
      fen: "4k3/8/5q2/8/3N4/8/8/4K3 w - - 0 1",
      pieces: {
        'd4': { type: 'N', color: 'white', unicode: '♘' },
        'e8': { type: 'k', color: 'black', unicode: '♚' },
        'f6': { type: 'q', color: 'black', unicode: '♛' },
        'e1': { type: 'K', color: 'white', unicode: '♔' }
      },
      solution: { from: 'd4', to: 'e6' },
      hint: "Your knight can jump to a square that attacks both the black king and queen!"
    },
    {
      title: "Scholar's Mate",
      desc: "Deliver the final checkmate with your Queen!",
      fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
      pieces: {
        'f3': { type: 'Q', color: 'white', unicode: '♕' },
        'c4': { type: 'B', color: 'white', unicode: '♗' },
        'e8': { type: 'k', color: 'black', unicode: '♚' },
        'f7': { type: 'p', color: 'black', unicode: '♟' },
        'e5': { type: 'p', color: 'black', unicode: '♟' },
        'c6': { type: 'n', color: 'black', unicode: '♞' }
      },
      solution: { from: 'f3', to: 'f7' },
      hint: "Attack the weakest pawn next to the black king, supported by your Bishop!"
    },
    {
      title: "Back-Rank Guard",
      desc: "White's king is trapped! Find the defensive rook move.",
      fen: "3r2k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1",
      pieces: {
        'e1': { type: 'R', color: 'white', unicode: '♖' },
        'd8': { type: 'r', color: 'black', unicode: '♜' },
        'g8': { type: 'k', color: 'black', unicode: '♚' },
        'f7': { type: 'p', color: 'black', unicode: '♟' },
        'g7': { type: 'p', color: 'black', unicode: '♟' },
        'h7': { type: 'p', color: 'black', unicode: '♟' },
        'g1': { type: 'K', color: 'white', unicode: '♔' }
      },
      solution: { from: 'e1', to: 'e8' },
      hint: "Capture the black rook directly on e8 to solve the back rank crisis!"
    }
  ];

  ARC.startPuzzleGame = () => {
    currentGameType = 'puzzle';
    score = 0;
    level = 1;
    state = {
      puzzleIndex: 0,
      selectedSquare: null,
      solved: false
    };
    showOverlay();
    renderPuzzle();
  };

  function renderPuzzle() {
    const puzzle = PUZZLES[state.puzzleIndex];
    if (!puzzle) {
      // Completed all puzzles
      playSFX('win');
      renderPuzzleComplete();
      return;
    }

    const content = document.getElementById('arcade-cabinet-content');
    if (!content) return;

    // Generate board grid html
    let boardHTML = '';
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    ranks.forEach(rank => {
      files.forEach(file => {
        const sq = file + rank;
        const isDark = (files.indexOf(file) + ranks.indexOf(rank)) % 2 !== 0;
        const piece = puzzle.pieces[sq];
        let pieceHTML = '';
        if (piece) {
          const colorPrefix = piece.color === 'white' ? 'w' : 'b';
          const typeCode = piece.type.toLowerCase();
          const imgSrc = `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${colorPrefix}${typeCode}.png`;
          pieceHTML = `<div class="arcade-piece ${piece.color}" style="width:100%;height:100%;"><img src="${imgSrc}" style="width:85%;height:85%;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.5));pointer-events:none;"></div>`;
        }
        boardHTML += `
          <div class="arcade-sq ${isDark ? 'dark' : 'light'}" data-sq="${sq}">
            ${pieceHTML}
          </div>
        `;
      });
    });

    content.innerHTML = `
      <div class="arcade-header">
        <div class="arcade-title-area">
          <span class="arcade-game-icon">🧩</span>
          <div class="arcade-title">Puzzle <span>Rush</span></div>
        </div>
        <button class="arcade-exit-btn" onclick="CK.arcade.exitGame()">✕ Exit Arcade</button>
      </div>
      <div class="arcade-main">
        <div class="arcade-play-area">
          <div class="arcade-board-wrap">
            <div class="arcade-board" id="puzzle-board">
              ${boardHTML}
            </div>
          </div>
        </div>
        <div class="arcade-dashboard">
          <div class="arcade-hud-card">
            <div class="arcade-game-title">${puzzle.title}</div>
            <div class="arcade-game-desc">${puzzle.desc}</div>
            
            <div class="arcade-stats-row">
              <div class="arcade-stat-box">
                <div class="arcade-stat-label">Puzzles Solved</div>
                <div class="arcade-stat-val">${state.puzzleIndex} / ${PUZZLES.length}</div>
              </div>
              <div class="arcade-stat-box">
                <div class="arcade-stat-label">Score</div>
                <div class="arcade-stat-val">${score}</div>
              </div>
            </div>

            <div class="arcade-progress-container">
              <div class="arcade-progress-header">
                <span>Progress</span>
                <span>${Math.round((state.puzzleIndex / PUZZLES.length) * 100)}%</span>
              </div>
              <div class="arcade-progress-bar">
                <div class="arcade-progress-fill" style="width: ${(state.puzzleIndex / PUZZLES.length) * 100}%"></div>
              </div>
            </div>

            <div style="background: rgba(255, 255, 255, 0.02); padding: 16px; border-radius: 12px; font-size: 0.88rem; line-height:1.5; border: 1px dashed rgba(255,255,255,0.06);">
              <span style="color:#fbbf24; font-weight:700;">💡 Hint:</span> ${puzzle.hint}
            </div>
          </div>
          
          <div class="arcade-btn-group">
            <button class="arcade-action-btn" onclick="CK.arcade.resetCurrentPuzzle()">Reset Puzzle</button>
            <button class="arcade-action-btn primary" onclick="CK.arcade.nextPuzzleSkip()">Skip &rarr;</button>
          </div>
        </div>
      </div>
    `;

    // Add board click listeners
    const squares = document.querySelectorAll('#puzzle-board .arcade-sq');
    squares.forEach(sq => {
      sq.addEventListener('click', () => handlePuzzleClick(sq.getAttribute('data-sq')));
    });
  }

  function handlePuzzleClick(sq) {
    if (state.solved) return;
    const puzzle = PUZZLES[state.puzzleIndex];
    const squares = document.querySelectorAll('#puzzle-board .arcade-sq');

    if (state.selectedSquare === null) {
      // First click: select piece to move
      const piece = puzzle.pieces[sq];
      if (piece && piece.color === 'white') {
        playSFX('select');
        state.selectedSquare = sq;
        squares.forEach(s => s.classList.remove('selected'));
        const el = document.querySelector(`[data-sq="${sq}"]`);
        if (el) el.classList.add('selected');
      }
    } else {
      // Second click: destination square
      const from = state.selectedSquare;
      const to = sq;

      if (puzzle.solution.from === from && puzzle.solution.to === to) {
        // CORRECT MOVE!
        playSFX('coin');
        state.solved = true;
        score += 25;

        // Visual flash success
        const targetSq = document.querySelector(`[data-sq="${to}"]`);
        if (targetSq) targetSq.classList.add('success-glow');

        // Move the piece visually on screen
        const fromSqEl = document.querySelector(`[data-sq="${from}"]`);
        const toSqEl = document.querySelector(`[data-sq="${to}"]`);
        if (fromSqEl && toSqEl) {
          const pieceEl = fromSqEl.querySelector('.arcade-piece');
          if (pieceEl) {
            toSqEl.innerHTML = '';
            toSqEl.appendChild(pieceEl);
            fromSqEl.innerHTML = '';
          }
        }

        setTimeout(() => {
          state.puzzleIndex++;
          state.selectedSquare = null;
          state.solved = false;
          renderPuzzle();
        }, 1000);
      } else {
        // WRONG MOVE!
        playSFX('buzz');
        // Flash wrong feedback
        const el = document.querySelector(`[data-sq="${to}"]`);
        if (el) {
          el.style.backgroundColor = 'rgba(239, 83, 80, 0.4)';
          setTimeout(() => {
            el.style.backgroundColor = '';
          }, 300);
        }
        // Deselect
        state.selectedSquare = null;
        squares.forEach(s => s.classList.remove('selected'));
      }
    }
  }

  ARC.resetCurrentPuzzle = () => {
    state.selectedSquare = null;
    state.solved = false;
    renderPuzzle();
  };

  ARC.nextPuzzleSkip = () => {
    state.puzzleIndex++;
    state.selectedSquare = null;
    state.solved = false;
    renderPuzzle();
  };

  function renderPuzzleComplete() {
    gameComplete('puzzle', score, 'All Puzzles Solved!', `Incredible tactics! You solved all ${PUZZLES.length} puzzles and scored ${score} points. Your pattern recognition is elite.`, 'CK.arcade.startPuzzleGame()');
  }

  /* ==========================================
     GAME 2: GUESS THE GRANDMASTER (TRIVIA)
     ========================================== */
  const GM_LIST = [
    {
      name: "Viswanathan Anand",
      photo: "https://images.chesscomfiles.com/uploads/v1/master_player/31980a3c-b0aa-11e6-99cb-005056bc0140.4fc74a96.250x250.jpeg",
      clues: [
        "First <span>Grandmaster</span> from India, born in Tamil Nadu.",
        "Famous for his blazing fast moves, earning him the nickname <span>'The Lightning Kid'</span>.",
        "Won the <span>FIDE World Chess Championship</span> five times!",
        "Awarded the prestigious Rajiv Gandhi Khel Ratna, Padma Vibhushan and first Padma Shri in sports."
      ],
      options: ["Viswanathan Anand", "Magnus Carlsen", "Praggnanandhaa", "Gukesh D"],
      correct: 0
    },
    {
      name: "Magnus Carlsen",
      photo: "https://images.chesscomfiles.com/uploads/v1/master_player/b90ae464-9dfc-11e7-9c98-005056bc0140.c7b1bc01.250x250.jpeg",
      clues: [
        "Born in <span>Norway</span> and became a GM at just 13 years old.",
        "Highest-rated chess player in history, reaching an astronomical <span>2882 FIDE Elo</span>.",
        "Known for his incredible endgames and refusal to accept quick draws.",
        "Held the world champion title in classical, rapid, and blitz chess formats simultaneously."
      ],
      options: ["Hikaru Nakamura", "Magnus Carlsen", "Bobby Fischer", "Garry Kasparov"],
      correct: 1
    },
    {
      name: "Praggnanandhaa",
      photo: "https://images.chesscomfiles.com/uploads/v1/master_player/8fdf870d-3ff6-4fa2-bf6d-23961168f869.86603bb9.250x250.jpeg",
      clues: [
        "Prominent Indian teenager GM from Chennai, Tamil Nadu.",
        "Became an <span>International Master</span> at age 10, the youngest in history.",
        "Defeated world champion Magnus Carlsen in multiple online matches.",
        "Reached the final of the 2023 FIDE World Cup to secure a spot in Candidates."
      ],
      options: ["Gukesh D", "Praggnanandhaa", "Vidit Gujrathi", "Nihal Sarin"],
      correct: 1
    },
    {
      name: "Garry Kasparov",
      photo: "https://images.chesscomfiles.com/uploads/v1/master_player/2ef419b4-b0aa-11e6-9e90-005056bc0140.f74fb166.250x250.jpeg",
      clues: [
        "Became the youngest undisputed World Champion in 1985 at age 22.",
        "Represented the Soviet Union and Russia, holding the <span>World No. 1</span> ranking for 225 out of 228 months.",
        "Famously played matches against IBM's supercomputer <span>Deep Blue</span>.",
        "Known for his aggressive, sharp tactical attacking style of play."
      ],
      options: ["Bobby Fischer", "Anatoly Karpov", "Garry Kasparov", "Mikhail Tal"],
      correct: 2
    }
  ];

  ARC.startGuessGMGame = () => {
    currentGameType = 'gm';
    score = 0;
    level = 1;
    state = {
      gmIndex: 0,
      answered: false
    };
    showOverlay();
    renderGM();
  };

  function renderGM() {
    const gm = GM_LIST[state.gmIndex];
    if (!gm) {
      playSFX('win');
      renderGMComplete();
      return;
    }

    const content = document.getElementById('arcade-cabinet-content');
    if (!content) return;

    let cluesHTML = '';
    gm.clues.forEach((clue, idx) => {
      cluesHTML += `
        <div class="gm-clue-item">🔍 <span>Clue ${idx + 1}:</span> ${clue}</div>
      `;
    });

    let optionsHTML = '';
    gm.options.forEach((opt, idx) => {
      optionsHTML += `
        <button class="gm-option-btn" onclick="CK.arcade.submitGMAnswer(${idx}, this)">
          ${opt}
          <span class="indicator"></span>
        </button>
      `;
    });

    content.innerHTML = `
      <div class="arcade-header">
        <div class="arcade-title-area">
          <span class="arcade-game-icon">🤔</span>
          <div class="arcade-title">Guess the <span>Grandmaster</span></div>
        </div>
        <button class="arcade-exit-btn" onclick="CK.arcade.exitGame()">✕ Exit Arcade</button>
      </div>
      <div class="arcade-main">
        <div class="gm-card-wrapper">
          <div style="position:relative; width: 140px; height: 140px; margin: 0 auto; border-radius: 50%; overflow:hidden; border: 3px solid #fbbf24; background: #1e293b; display:flex; align-items:center; justify-content:center;">
            <img id="gm-photo" src="${gm.photo}" style="width:100%; height:100%; object-fit:cover; filter: blur(12px); transition: filter 0.6s;">
            <div id="gm-question-mark" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:4rem; color:rgba(255,255,255,0.2); font-weight:800;">?</div>
          </div>
          
          <div class="gm-clues">
            ${cluesHTML}
          </div>
        </div>
        <div class="arcade-dashboard">
          <div class="arcade-hud-card" style="padding: 16px 24px;">
            <div class="arcade-game-title">Select Champion</div>
            <p class="arcade-game-desc" style="margin-bottom:12px;">Who is this legendary chess master?</p>
            
            <div class="gm-options">
              ${optionsHTML}
            </div>

            <div class="arcade-stats-row" style="margin-top: 20px; margin-bottom: 0;">
              <div class="arcade-stat-box" style="padding: 8px 12px;">
                <div class="arcade-stat-label">Progress</div>
                <div class="arcade-stat-val" style="font-size:1.25rem;">${state.gmIndex + 1} / ${GM_LIST.length}</div>
              </div>
              <div class="arcade-stat-box" style="padding: 8px 12px;">
                <div class="arcade-stat-label">Score</div>
                <div class="arcade-stat-val" style="font-size:1.25rem;">${score}</div>
              </div>
            </div>
          </div>
          
          <div class="arcade-btn-group">
            <button class="arcade-action-btn primary" id="gm-next-btn" disabled onclick="CK.arcade.nextGM()">Next GM &rarr;</button>
          </div>
        </div>
      </div>
    `;
  }

  ARC.submitGMAnswer = (idx, btn) => {
    if (state.answered) return;
    state.answered = true;

    const gm = GM_LIST[state.gmIndex];
    const optionBtns = document.querySelectorAll('.gm-option-btn');

    // Reveal Photo
    const photo = document.getElementById('gm-photo');
    const qMark = document.getElementById('gm-question-mark');
    if (photo) photo.style.filter = 'blur(0)';
    if (qMark) qMark.style.display = 'none';

    if (idx === gm.correct) {
      playSFX('coin');
      btn.classList.add('correct');
      score += 20;
    } else {
      playSFX('buzz');
      btn.classList.add('wrong');
      // Highlight the correct one
      optionBtns[gm.correct].classList.add('correct');
    }

    // Enable Next button
    const nextBtn = document.getElementById('gm-next-btn');
    if (nextBtn) nextBtn.disabled = false;
  };

  ARC.nextGM = () => {
    state.gmIndex++;
    state.answered = false;
    renderGM();
  };

  function renderGMComplete() {
    gameComplete('gm', score, 'Trivia Complete!', `You are a true Chess Historian! Finished the Grandmaster Challenge with ${score} points.`, 'CK.arcade.startGuessGMGame()');
  }

  /* ==========================================
     GAME 3: CHESS MATCH-3 (MEMORY MATCHING)
     ========================================== */
  const MEMORY_PIECES = [
    { code: 'K', img: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png' },
    { code: 'Q', img: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png' },
    { code: 'R', img: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png' },
    { code: 'B', img: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png' },
    { code: 'N', img: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png' },
    { code: 'P', img: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png' }
  ];

  ARC.startMemoryMatchGame = () => {
    currentGameType = 'memory';
    score = 0;
    level = 1;

    // Create 12 cards (6 pairs)
    let cards = [];
    MEMORY_PIECES.forEach(p => {
      cards.push({ id: Math.random(), piece: p, flipped: false, matched: false });
      cards.push({ id: Math.random(), piece: p, flipped: false, matched: false });
    });

    // Shuffle cards
    cards.sort(() => Math.random() - 0.5);

    state = {
      cards: cards,
      selectedCards: [],
      matchedPairs: 0,
      moves: 0,
      timeLeft: 60,
      timerInterval: null
    };

    showOverlay();
    renderMemoryMatch();
    startMemoryTimer();
  };

  function startMemoryTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.timeLeft--;
      const timeVal = document.getElementById('memory-time-val');
      if (timeVal) timeVal.innerText = `${state.timeLeft}s`;

      if (state.timeLeft <= 0) {
        clearInterval(state.timerInterval);
        playSFX('buzz');
        renderMemoryComplete(false);
      }
    }, 1000);
  }

  function renderMemoryMatch() {
    const content = document.getElementById('arcade-cabinet-content');
    if (!content) return;

    let cardsHTML = '';
    state.cards.forEach((card, idx) => {
      cardsHTML += `
        <div class="memory-card-element ${card.flipped ? 'flipped' : ''} ${card.matched ? 'matched' : ''}" data-idx="${idx}" onclick="CK.arcade.flipCard(${idx})">
          <div class="memory-card-inner">
            <div class="memory-card-front">❓</div>
            <div class="memory-card-back" style="display:flex;align-items:center;justify-content:center;background:#1e293b;border-radius:10px;"><img src="${card.piece.img}" style="width:80%;height:80%;pointer-events:none;"></div>
          </div>
        </div>
      `;
    });

    content.innerHTML = `
      <div class="arcade-header">
        <div class="arcade-title-area">
          <span class="arcade-game-icon">🎯</span>
          <div class="arcade-title">Memory <span>Match-3</span></div>
        </div>
        <button class="arcade-exit-btn" onclick="CK.arcade.exitGame()">✕ Exit Arcade</button>
      </div>
      <div class="arcade-main">
        <div class="arcade-play-area">
          <div class="memory-grid">
            ${cardsHTML}
          </div>
        </div>
        <div class="arcade-dashboard">
          <div class="arcade-hud-card">
            <div class="arcade-game-title">Find Matching Pieces!</div>
            <p class="arcade-game-desc">Flip pairs of cards to match the identical chess pieces before the time runs out.</p>
            
            <div class="arcade-stats-row">
              <div class="arcade-stat-box">
                <div class="arcade-stat-label">Matches</div>
                <div class="arcade-stat-val">${state.matchedPairs} / 6</div>
              </div>
              <div class="arcade-stat-box">
                <div class="arcade-stat-label">Time Left</div>
                <div class="arcade-stat-val" id="memory-time-val">${state.timeLeft}s</div>
              </div>
            </div>

            <div class="arcade-stats-row" style="margin-bottom:0;">
              <div class="arcade-stat-box" style="grid-column: span 2;">
                <div class="arcade-stat-label">Moves Taken</div>
                <div class="arcade-stat-val">${state.moves}</div>
              </div>
            </div>
          </div>
          
          <div class="arcade-btn-group">
            <button class="arcade-action-btn primary" onclick="window.CK.arcade.startMemoryMatchGame()">Restart Game</button>
          </div>
        </div>
      </div>
    `;
  }

  ARC.flipCard = (idx) => {
    const card = state.cards[idx];
    if (card.flipped || card.matched || state.selectedCards.length >= 2) return;

    playSFX('select');
    card.flipped = true;
    state.selectedCards.push({ idx, card });

    renderMemoryMatch();

    if (state.selectedCards.length === 2) {
      state.moves++;
      const first = state.selectedCards[0];
      const second = state.selectedCards[1];

      if (first.card.piece.code === second.card.piece.code) {
        // MATCH!
        playSFX('coin');
        first.card.matched = true;
        second.card.matched = true;
        state.matchedPairs++;
        state.selectedCards = [];

        renderMemoryMatch();

        if (state.matchedPairs === 6) {
          clearInterval(state.timerInterval);
          playSFX('win');
          score = Math.max(50, state.timeLeft * 2 + 10);
          setTimeout(() => renderMemoryComplete(true), 1000);
        }
      } else {
        // MISMATCH!
        setTimeout(() => {
          playSFX('buzz');
          first.card.flipped = false;
          second.card.flipped = false;
          state.selectedCards = [];
          renderMemoryMatch();
        }, 1000);
      }
    }
  };

  function renderMemoryComplete(win) {
    if (win) {
      gameComplete('memory', score, 'Memory Champion!', `Perfect recall! You matched all 6 pairs in ${state.moves} moves and scored ${score} points.`, 'CK.arcade.startMemoryMatchGame()');
    } else {
      const content = document.getElementById('arcade-cabinet-content');
      if (content) content.innerHTML = `<div style="text-align:center;padding:40px 20px;"><div style="font-size:4rem;">⏱️</div><h2 style="color:#fff;font-family:Poppins,sans-serif;font-size:2rem;font-weight:800;margin:16px 0;">Time's Up!</h2><p style="color:rgba(255,255,255,.55);font-size:1rem;">You scored ${score} pts. Try again!</p><div style="display:flex;justify-content:center;gap:12px;margin-top:24px;"><button class="arcade-action-btn primary" onclick="CK.arcade.startMemoryMatchGame()">Try Again</button><button class="arcade-action-btn" onclick="CK.arcade.exitGame()">Exit</button></div></div>`;
    }
  }

  /* ==========================================
     GAME 4: KNIGHT'S STAR CATCHER (TOUR MAZE)
     ========================================== */
  ARC.startKnightStarCatcher = () => {
    currentGameType = 'knight';
    score = 0;
    level = 1;

    // Place Knight at a starting cell
    const knightPos = 'd4';

    // Spawn 5 random targets
    const targets = [];
    const possibleSquares = [
      'a1','b1','c1','d1','e1','f1','g1','h1',
      'a2','b2','c2','d2','e2','f2','g2','h2',
      'a3','b3','c3','d3','e3','f3','g3','h3',
      'a4','b4','c4','d4','e4','f4','g4','h4',
      'a5','b5','c5','d5','e5','f5','g5','h5',
      'a6','b6','c6','d6','e6','f6','g6','h6',
      'a7','b7','c7','d7','e7','f7','g7','h7',
      'a8','b8','c8','d8','e8','f8','g8','h8'
    ];

    // Remove starting knight square
    possibleSquares.splice(possibleSquares.indexOf(knightPos), 1);

    // Pick 5 random squares
    while (targets.length < 5) {
      const idx = Math.floor(Math.random() * possibleSquares.length);
      const sq = possibleSquares.splice(idx, 1)[0];
      targets.push(sq);
    }

    state = {
      knightPos: knightPos,
      targets: targets,
      moves: 0,
      collected: 0,
      totalTargets: 5
    };

    showOverlay();
    renderKnightStarCatcher();
  };

  function getValidKnightMoves(square) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const fileIdx = files.indexOf(square[0]);
    const rankIdx = ranks.indexOf(square[1]);

    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    const validMoves = [];
    offsets.forEach(offset => {
      const newFileIdx = fileIdx + offset[0];
      const newRankIdx = rankIdx + offset[1];

      if (newFileIdx >= 0 && newFileIdx < 8 && newRankIdx >= 0 && newRankIdx < 8) {
        validMoves.push(files[newFileIdx] + ranks[newRankIdx]);
      }
    });

    return validMoves;
  }

  function renderKnightStarCatcher() {
    const content = document.getElementById('arcade-cabinet-content');
    if (!content) return;

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const validMoves = getValidKnightMoves(state.knightPos);

    let boardHTML = '';
    ranks.forEach(rank => {
      files.forEach(file => {
        const sq = file + rank;
        const isDark = (files.indexOf(file) + ranks.indexOf(rank)) % 2 !== 0;

        // Is Knight here?
        const isKnight = state.knightPos === sq;
        const isTarget = state.targets.includes(sq);
        const isValidDest = validMoves.includes(sq);

        let entityHTML = '';
        if (isKnight) {
          entityHTML = '<div class="arcade-piece white" style="width:100%;height:100%;"><img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png" style="width:85%;height:85%;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.5));"></div>';
        } else if (isTarget) {
          entityHTML = '<div class="arcade-star">⭐</div>';
        }

        boardHTML += `
          <div class="arcade-sq ${isDark ? 'dark' : 'light'} ${isValidDest ? 'valid-dest' : ''}" data-sq="${sq}">
            ${entityHTML}
          </div>
        `;
      });
    });

    content.innerHTML = `
      <div class="arcade-header">
        <div class="arcade-title-area">
          <span class="arcade-game-icon">⚡</span>
          <div class="arcade-title">Knight's <span>Star Catcher</span></div>
        </div>
        <button class="arcade-exit-btn" onclick="CK.arcade.exitGame()">✕ Exit Arcade</button>
      </div>
      <div class="arcade-main">
        <div class="arcade-play-area">
          <div class="arcade-board-wrap">
            <div class="arcade-board" id="knight-board">
              ${boardHTML}
            </div>
          </div>
        </div>
        <div class="arcade-dashboard">
          <div class="arcade-hud-card">
            <div class="arcade-game-title">Collect the Glowing Stars!</div>
            <p class="arcade-game-desc">Hop your Knight using standard L-moves to capture all 5 golden stars scattered across the map.</p>
            
            <div class="arcade-stats-row">
              <div class="arcade-stat-box">
                <div class="arcade-stat-label">Captured</div>
                <div class="arcade-stat-val">${state.collected} / ${state.totalTargets}</div>
              </div>
              <div class="arcade-stat-box">
                <div class="arcade-stat-label">Moves</div>
                <div class="arcade-stat-val">${state.moves}</div>
              </div>
            </div>

            <div class="arcade-progress-container" style="margin-bottom:0;">
              <div class="arcade-progress-header">
                <span>Maze Captured Progress</span>
                <span>${Math.round((state.collected / state.totalTargets) * 100)}%</span>
              </div>
              <div class="arcade-progress-bar">
                <div class="arcade-progress-fill" style="width: ${(state.collected / state.totalTargets) * 100}%"></div>
              </div>
            </div>
          </div>
          
          <div class="arcade-btn-group">
            <button class="arcade-action-btn primary" onclick="window.CK.arcade.startKnightStarCatcher()">Restart Maze</button>
          </div>
        </div>
      </div>
    `;

    // Click handlers for valid destinations
    const squares = document.querySelectorAll('#knight-board .arcade-sq');
    squares.forEach(sq => {
      const squareCode = sq.getAttribute('data-sq');
      if (validMoves.includes(squareCode)) {
        sq.addEventListener('click', () => handleKnightJump(squareCode));
      }
    });
  }

  function handleKnightJump(toSq) {
    state.moves++;
    state.knightPos = toSq;

    // Check if target collected
    const targetIdx = state.targets.indexOf(toSq);
    if (targetIdx !== -1) {
      playSFX('coin');
      state.targets.splice(targetIdx, 1);
      state.collected++;
      score += 30;
    } else {
      playSFX('select');
    }

    renderKnightStarCatcher();

    // Completed all targets?
    if (state.collected === state.totalTargets) {
      playSFX('win');
      setTimeout(() => renderKnightComplete(), 800);
    }
  }

  function renderKnightComplete() {
    gameComplete('timing', score, 'All Stars Collected!', `Excellent Knight maneuvers! You collected all 5 stars in ${state.moves} moves and scored ${score} points.`, 'CK.arcade.startKnightStarCatcher()');
  }

  
  /* ==========================================
     GAME 5: PAWN STORM SURVIVAL DODGE
     ========================================== */
  ARC.startPawnStormGame = () => {
    currentGameType = 'pawnstorm';
    score = 0;
    level = 1;

    // Start White King in the middle of bottom rank
    state = {
      kingPos: 'e1',
      pawns: [], // array of { file, rank }
      moves: 0,
      survivalTicks: 0,
      gameOver: false,
      timerInterval: null
    };

    showOverlay();
    renderPawnStorm();
    startPawnStormLoop();
  };

  function startPawnStormLoop() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      if (state.gameOver) return;

      // 1. Slide existing pawns down
      const nextPawns = [];
      state.pawns.forEach(p => {
        const nextRank = p.rank - 1;
        if (nextRank >= 1) {
          nextPawns.push({ file: p.file, rank: nextRank });
        }
      });
      state.pawns = nextPawns;

      // 2. Spawn a new pawn raindrop at rank 8
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const randomFile = files[Math.floor(Math.random() * files.length)];
      state.pawns.push({ file: randomFile, rank: 8 });

      state.survivalTicks++;
      score += 5; // gain survival points!

      // 3. Evaluate collision
      checkPawnStormCollision();

      if (!state.gameOver) {
        renderPawnStorm();
      }
    }, 750); // Speed of raindrops descend
  }

  function checkPawnStormCollision() {
    // Check if any pawn has collided with the King
    const kingFile = state.kingPos[0];
    const kingRank = parseInt(state.kingPos[1]);

    const hit = state.pawns.some(p => p.file === kingFile && p.rank === kingRank);
    if (hit) {
      state.gameOver = true;
      clearInterval(state.timerInterval);
      playSFX('buzz');
      renderPawnStormComplete();
    }
  }

  function getValidKingMoves(square) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fileIdx = files.indexOf(square[0]);
    const rank = parseInt(square[1]);

    const validMoves = [];
    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (df === 0 && dr === 0) continue;
        const nf = fileIdx + df;
        const nr = rank + dr;
        if (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) {
          validMoves.push(files[nf] + nr);
        }
      }
    }
    return validMoves;
  }

  function renderPawnStorm() {
    const content = document.getElementById('arcade-cabinet-content');
    if (!content) return;

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const validMoves = getValidKingMoves(state.kingPos);

    let boardHTML = '';
    ranks.forEach(rank => {
      files.forEach(file => {
        const sq = file + rank;
        const isDark = (files.indexOf(file) + ranks.indexOf(rank)) % 2 !== 0;

        const isKing = state.kingPos === sq;
        const hasPawn = state.pawns.some(p => p.file === file && p.rank === parseInt(rank));
        const isValidDest = validMoves.includes(sq);

        let entityHTML = '';
        if (isKing) {
          entityHTML = '<div class="arcade-piece white" style="font-size:3rem;">♔</div>';
        } else if (hasPawn) {
          entityHTML = '<div class="arcade-piece black" style="font-size:2.8rem; color:#ef5350;">♟</div>';
        }

        boardHTML += `
          <div class="arcade-sq ${isDark ? 'dark' : 'light'} ${isValidDest ? 'valid-dest' : ''}" data-sq="${sq}">
            ${entityHTML}
          </div>
        `;
      });
    });

    content.innerHTML = `
      <div class="arcade-header">
        <div class="arcade-title-area">
          <span class="arcade-game-icon">🌧️</span>
          <div class="arcade-title">Pawn Storm <span>Dodge</span></div>
        </div>
        <button class="arcade-exit-btn" onclick="CK.arcade.exitGame()">✕ Exit Arcade</button>
      </div>
      <div class="arcade-main">
        <div class="arcade-play-area">
          <div class="arcade-board-wrap">
            <div class="arcade-board" id="pawnstorm-board">
              ${boardHTML}
            </div>
          </div>
        </div>
        <div class="arcade-dashboard">
          <div class="arcade-hud-card">
            <div class="arcade-game-title">Dodge the Raindrops!</div>
            <p class="arcade-game-desc">Move your King (♔) to any adjacent highlighted square. Dodge the incoming black pawn raindrops (♟) as they pour down!</p>
            
            <div class="arcade-stats-row">
              <div class="arcade-stat-box">
                <div class="arcade-stat-label">Seconds Dodged</div>
                <div class="arcade-stat-val">${Math.floor(state.survivalTicks * 0.75)}s</div>
              </div>
              <div class="arcade-stat-box">
                <div class="arcade-stat-label">Score</div>
                <div class="arcade-stat-val">${score}</div>
              </div>
            </div>

            <div style="background: rgba(239, 83, 80, 0.08); padding: 12px; border-radius: 12px; border: 1px solid rgba(239, 83, 80, 0.15); font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
              <span style="font-size:1.2rem;">⚠️</span>
              <span style="color:#f87171; font-weight:600;">Survival Alert:</span> Pawns spawn randomly at the top and slide down every 0.75s!
            </div>
          </div>
          
          <div class="arcade-btn-group">
            <button class="arcade-action-btn primary" onclick="window.CK.arcade.startPawnStormGame()">Restart</button>
          </div>
        </div>
      </div>
    `;

    // Add click listeners to valid dests to move King
    const squares = document.querySelectorAll('#pawnstorm-board .arcade-sq');
    squares.forEach(sq => {
      const squareCode = sq.getAttribute('data-sq');
      if (validMoves.includes(squareCode)) {
        sq.addEventListener('click', () => {
          playSFX('select');
          state.moves++;
          state.kingPos = squareCode;
          checkPawnStormCollision();
          if (!state.gameOver) {
            renderPawnStorm();
          }
        });
      }
    });
  }

  function renderPawnStormComplete() {
    gameComplete('opening', score, 'King Caught!', `The pawn storm overwhelmed your King! You survived ${Math.floor((state.survivalTicks || 0) * 0.75)}s and scored ${score} points. Dodge faster next time!`, 'CK.arcade.startPawnStormGame()');
  }

  /* ==========================================
     GAME 6: QUEEN'S CAPTURE QUEST
     ========================================== */
  ARC.startQueenQuestGame = () => {
    currentGameType = 'queenquest';
    score = 0;
    level = 1;

    // Start White Queen at d4
    const queenPos = 'd4';

    // Spawn 5 random targets
    const targets = [];
    const possibleSquares = [
      'a1','b1','c1','d1','e1','f1','g1','h1',
      'a2','b2','c2','d2','e2','f2','g2','h2',
      'a3','b3','c3','d3','e3','f3','g3','h3',
      'a4','b4','c4','d4','e4','f4','g4','h4',
      'a5','b5','c5','d5','e5','f5','g5','h5',
      'a6','b6','c6','d6','e6','f6','g6','h6',
      'a7','b7','c7','d7','e7','f7','g7','h7',
      'a8','b8','c8','d8','e8','f8','g8','h8'
    ];

    possibleSquares.splice(possibleSquares.indexOf(queenPos), 1);

    // Pick 5 random squares
    while (targets.length < 5) {
      const idx = Math.floor(Math.random() * possibleSquares.length);
      const sq = possibleSquares.splice(idx, 1)[0];
      targets.push(sq);
    }

    state = {
      queenPos: queenPos,
      targets: targets,
      moves: 0,
      collected: 0,
      totalTargets: 5
    };

    showOverlay();
    renderQueenQuest();
  };

  function getValidQueenMoves(square) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const fileIdx = files.indexOf(square[0]);
    const rankIdx = ranks.indexOf(square[1]);

    const validMoves = [];

    // Directions for Queen: Horiz, Vert, Diagonals
    const directions = [
      [1, 0], [-1, 0], [0, 1], [0, -1], // straight
      [1, 1], [-1, -1], [1, -1], [-1, 1] // diagonals
    ];

    directions.forEach(dir => {
      let step = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const nf = fileIdx + dir[0] * step;
        const nr = rankIdx + dir[1] * step;

        if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
          validMoves.push(files[nf] + ranks[nr]);
          step++;
        } else {
          break;
        }
      }
    });

    return validMoves;
  }

  function renderQueenQuest() {
    const content = document.getElementById('arcade-cabinet-content');
    if (!content) return;

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const validMoves = getValidQueenMoves(state.queenPos);

    let boardHTML = '';
    ranks.forEach(rank => {
      files.forEach(file => {
        const sq = file + rank;
        const isDark = (files.indexOf(file) + ranks.indexOf(rank)) % 2 !== 0;

        const isQueen = state.queenPos === sq;
        const isTarget = state.targets.includes(sq);
        const isValidDest = validMoves.includes(sq);

        let entityHTML = '';
        if (isQueen) {
          entityHTML = '<div class="arcade-piece white" style="font-size:3rem;">♕</div>';
        } else if (isTarget) {
          entityHTML = '<div class="arcade-piece black" style="font-size:2.4rem; color:#10b981;">♜</div>';
        }

        boardHTML += `
          <div class="arcade-sq ${isDark ? 'dark' : 'light'} ${isValidDest ? 'valid-dest' : ''}" data-sq="${sq}">
            ${entityHTML}
          </div>
        `;
      });
    });

    content.innerHTML = `
      <div class="arcade-header">
        <div class="arcade-title-area">
          <span class="arcade-game-icon">👑</span>
          <div class="arcade-title">Queen's <span>Capture Quest</span></div>
        </div>
        <button class="arcade-exit-btn" onclick="CK.arcade.exitGame()">✕ Exit Arcade</button>
      </div>
      <div class="arcade-main">
        <div class="arcade-play-area">
          <div class="arcade-board-wrap">
            <div class="arcade-board" id="queenquest-board">
              ${boardHTML}
            </div>
          </div>
        </div>
        <div class="arcade-dashboard">
          <div class="arcade-hud-card">
            <div class="arcade-game-title">Unleash the Queen!</div>
            <p class="arcade-game-desc">Move your Queen (♕) diagonally, horizontally, or vertically to capture all 5 black target pieces (♜) scattered around.</p>
            
            <div class="arcade-stats-row">
              <div class="arcade-stat-box">
                <div class="arcade-stat-label">Captured</div>
                <div class="arcade-stat-val">${state.collected} / ${state.totalTargets}</div>
              </div>
              <div class="arcade-stat-box">
                <div class="arcade-stat-label">Moves</div>
                <div class="arcade-stat-val">${state.moves}</div>
              </div>
            </div>

            <div class="arcade-progress-container" style="margin-bottom:0;">
              <div class="arcade-progress-header">
                <span>Targets Cleared</span>
                <span>${Math.round((state.collected / state.totalTargets) * 100)}%</span>
              </div>
              <div class="arcade-progress-bar">
                <div class="arcade-progress-fill" style="width: ${(state.collected / state.totalTargets) * 100}%"></div>
              </div>
            </div>
          </div>
          
          <div class="arcade-btn-group">
            <button class="arcade-action-btn primary" onclick="window.CK.arcade.startQueenQuestGame()">Restart Quest</button>
          </div>
        </div>
      </div>
    `;

    // Click handlers for valid destinations
    const squares = document.querySelectorAll('#queenquest-board .arcade-sq');
    squares.forEach(sq => {
      const squareCode = sq.getAttribute('data-sq');
      if (validMoves.includes(squareCode)) {
        sq.addEventListener('click', () => {
          state.moves++;
          state.queenPos = squareCode;

          // Check if target collected
          const targetIdx = state.targets.indexOf(squareCode);
          if (targetIdx !== -1) {
            playSFX('coin');
            state.targets.splice(targetIdx, 1);
            state.collected++;
            score += 40;
          } else {
            playSFX('select');
          }

          renderQueenQuest();

          // Completed all targets?
          if (state.collected === state.totalTargets) {
            playSFX('win');
            setTimeout(() => renderQueenQuestComplete(), 800);
          }
        });
      }
    });
  }

  function renderQueenQuestComplete() {
    gameComplete('queenquest', score, 'Quest Cleared!', `Incredible Queen maneuverability! You swept the board clean of all targets in only ${state.moves} moves and scored ${score} points.`, 'CK.arcade.startQueenQuestGame()');
  }

  /* ==========================================
     HIGH SCORE SYSTEM (localStorage)
     ========================================== */
  const HS_KEY = 'ck_game_scores';

  function getScores() {
    try { return JSON.parse(localStorage.getItem(HS_KEY)) || {}; } catch { return {}; }
  }

  function saveScore(gameId, newScore) {
    const scores = getScores();
    if (!scores[gameId] || newScore > scores[gameId]) {
      scores[gameId] = newScore;
      localStorage.setItem(HS_KEY, JSON.stringify(scores));
      return true; // new high score
    }
    return false;
  }

  ARC.getBestScore = (gameId) => {
    const scores = getScores();
    return scores[gameId] || 0;
  };

  ARC.renderScoreBadges = () => {
    const games = [
      { id: 'puzzle',     strip: 'score-badge-puzzle',     card: 'score-display-puzzle' },
      { id: 'gm',         strip: 'score-badge-gm',         card: 'score-display-gm' },
      { id: 'memory',     strip: 'score-badge-memory',     card: 'score-display-memory' },
      { id: 'timing',     strip: 'score-badge-timing',     card: 'score-display-timing' },
      { id: 'opening',    strip: 'score-badge-opening',    card: 'score-display-opening' },
      { id: 'queenquest', strip: 'score-badge-queenquest', card: 'score-display-queenquest' },
      { id: 'quiz',       strip: 'score-badge-quiz',       card: 'score-display-quiz' },
    ];
    const scores = getScores();
    games.forEach(({ id, strip, card }) => {
      const val = scores[id];
      const stripEl = document.getElementById(strip);
      if (stripEl) stripEl.textContent = val ? `Best: ${val}` : '—';
      const cardEl = document.getElementById(card);
      if (cardEl) cardEl.textContent = val ? val : '—';
    });
  };

  function gameComplete(gameId, finalScore, title, desc, restartFn) {
    const isNewHigh = saveScore(gameId, finalScore);
    const best = ARC.getBestScore(gameId);
    playSFX('win');
    const content = document.getElementById('arcade-cabinet-content');
    if (!content) return;
    content.innerHTML = `
      <div style="text-align:center; padding:40px 20px; max-width:600px; margin:0 auto;">
        <div style="font-size:4.5rem; margin-bottom:8px;">${isNewHigh ? '🏆' : '🎉'}</div>
        <h2 style="font-family:'Poppins',sans-serif; font-size:2.2rem; font-weight:800; color:#fff; margin:0 0 10px;">${title}</h2>
        <p style="color:var(--arena-text-muted); font-size:1rem; max-width:480px; margin:0 auto 24px; line-height:1.6;">${desc}</p>
        <div style="display:flex; gap:16px; justify-content:center; margin-bottom:28px; flex-wrap:wrap;">
          <div style="background:rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.3); border-radius:12px; padding:16px 28px; min-width:120px;">
            <div style="font-size:0.75rem; color:rgba(255,255,255,0.45); margin-bottom:4px;">YOUR SCORE</div>
            <div style="font-size:2rem; font-weight:800; color:#fbbf24;">${finalScore}</div>
          </div>
          <div style="background:rgba(45,212,191,0.12); border:1px solid rgba(45,212,191,0.3); border-radius:12px; padding:16px 28px; min-width:120px;">
            <div style="font-size:0.75rem; color:rgba(255,255,255,0.45); margin-bottom:4px;">${isNewHigh ? '⭐ NEW BEST!' : 'BEST SCORE'}</div>
            <div style="font-size:2rem; font-weight:800; color:#2dd4bf;">${best}</div>
          </div>
        </div>
        ${isNewHigh ? '<div style="color:#fbbf24; font-weight:700; font-size:0.95rem; margin-bottom:20px; letter-spacing:.05em;">🌟 NEW PERSONAL BEST — Outstanding!</div>' : ''}
        <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          <button class="arcade-action-btn primary" style="min-width:180px;" onclick="${restartFn}">Play Again</button>
          <button class="arcade-action-btn" style="min-width:160px;" onclick="CK.arcade.exitGame()">Exit Arcade</button>
        </div>
      </div>
    `;
  }

  /* ==========================================
     GAME 7: CHESS QUIZ BLITZ
     ========================================== */
  const QUIZ_QUESTIONS = [
    { q: "How many squares does a Knight threaten from the center of the board?", opts: ["4", "6", "8", "12"], correct: 2, exp: "From a central square, a knight can reach up to 8 different squares." },
    { q: "Which piece is worth approximately 3 pawns?", opts: ["Rook", "Bishop", "Queen", "King"], correct: 1, exp: "Bishops and Knights are each worth approximately 3 pawns." },
    { q: "What is 'en passant'?", opts: ["A queen sacrifice", "A special pawn capture", "Kingside castling", "Stalemate condition"], correct: 1, exp: "En passant is a special pawn capture that can occur when a pawn moves two squares forward and passes an opposing pawn." },
    { q: "In which direction can pawns capture?", opts: ["Straight forward", "Diagonally forward", "Diagonally backward", "Sideways"], correct: 1, exp: "Pawns always capture diagonally forward — one square to the left or right diagonally." },
    { q: "What does 'castling kingside' mean?", opts: ["King moves 3 squares left", "King moves 2 squares right, Rook jumps over", "King and Queen swap", "King moves to h1"], correct: 1, exp: "Kingside castling: the king moves 2 squares toward the h-file rook, and the rook jumps to the other side of the king." },
    { q: "What is 'stalemate'?", opts: ["King in check with no moves", "No legal moves but king not in check", "Queen trapped", "Both kings face each other"], correct: 1, exp: "Stalemate occurs when the player to move has no legal moves but their king is NOT in check. It results in a draw." },
    { q: "Which piece can jump over other pieces?", opts: ["Bishop", "Queen", "Knight", "Rook"], correct: 2, exp: "Only the Knight can jump over other pieces — its L-shaped move goes over any piece in the way." },
    { q: "How many total pawns are on the board at the start of a game?", opts: ["8", "12", "16", "20"], correct: 2, exp: "Each player starts with 8 pawns, making 16 total pawns at the start of every game." },
    { q: "What is 'discovered check'?", opts: ["Finding a check move", "Moving a piece to reveal check from another", "Queen check from far away", "A check by two pieces at once"], correct: 1, exp: "A discovered check happens when you move one piece, uncovering an attack on the enemy king by another piece behind it." },
    { q: "A player wins the game when their opponent is in…", opts: ["Stalemate", "Perpetual check", "Checkmate", "Zugzwang"], correct: 2, exp: "Checkmate: the king is in check and has no legal way to escape. The player whose king is mated loses." },
    { q: "What is the value of the Rook?", opts: ["3 points", "4 points", "5 points", "9 points"], correct: 2, exp: "The Rook is typically valued at 5 pawns — more valuable than a bishop or knight but less than a queen." },
    { q: "What happens when a pawn reaches the 8th rank?", opts: ["It disappears", "It becomes a King", "It promotes to any piece except King", "It returns to start"], correct: 2, exp: "Pawn promotion: when a pawn reaches the opponent's back rank, it must be promoted to a queen, rook, bishop, or knight." },
    { q: "Which player moves first in chess?", opts: ["Black", "White", "Whoever is older", "Decided by coin toss"], correct: 1, exp: "White always moves first in chess. This gives White a slight statistical advantage in tournament games." },
    { q: "What is a 'fork' in chess?", opts: ["A trap for the queen", "One piece attacks two pieces simultaneously", "A pawn chain", "Exchanging pieces"], correct: 1, exp: "A fork is a powerful tactic where one piece attacks two or more enemy pieces at the same time, winning material." },
    { q: "What is 'Zugzwang'?", opts: ["An opening trap", "Forced to move but any move worsens your position", "Winning with pawns only", "Piece coordination"], correct: 1, exp: "Zugzwang: a German chess term for a position where ANY move you make will worsen your situation. Common in endgames." },
  ];

  ARC.startChessQuiz = () => {
    currentGameType = 'quiz';
    score = 0;
    level = 1;
    const shuffled = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
    state = {
      questions: shuffled,
      qIndex: 0,
      answered: false,
      correct: 0,
      timeLeft: 20,
      timerInterval: null
    };
    showOverlay();
    renderQuiz();
  };

  function startQuizTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.timeLeft--;
      const bar = document.getElementById('quiz-timer-bar');
      const label = document.getElementById('quiz-timer-label');
      if (bar) bar.style.width = (state.timeLeft / 20 * 100) + '%';
      if (label) label.textContent = state.timeLeft + 's';
      if (state.timeLeft <= 0) {
        clearInterval(state.timerInterval);
        if (!state.answered) {
          state.answered = true;
          highlightQuizAnswer(-1);
        }
      }
    }, 1000);
  }

  function renderQuiz() {
    const q = state.questions[state.qIndex];
    if (!q) { gameComplete('quiz', score, 'Quiz Complete!', `You answered ${state.correct} / ${state.questions.length} correctly and scored ${score} points. Chess knowledge is power!`, 'CK.arcade.startChessQuiz()'); return; }

    state.answered = false;
    state.timeLeft = 20;
    const content = document.getElementById('arcade-cabinet-content');
    if (!content) return;

    const _e = CK.esc || (s => s);
    const optHTML = q.opts.map((opt, i) => `
      <button class="quiz-opt-btn" id="quiz-opt-${i}" onclick="CK.arcade.submitQuizAnswer(${i})">${_e(opt)}</button>
    `).join('');

    content.innerHTML = `
      <div class="arcade-header">
        <div class="arcade-title-area">
          <span class="arcade-game-icon">🧠</span>
          <div class="arcade-title">Chess Quiz <span>Blitz</span></div>
        </div>
        <button class="arcade-exit-btn" onclick="CK.arcade.exitGame()">✕ Exit</button>
      </div>
      <div class="arcade-main" style="align-items:center; justify-content:center;">
        <div class="quiz-wrapper">
          <div class="quiz-meta">
            <span>Question ${state.qIndex + 1} / ${state.questions.length}</span>
            <span style="display:flex; align-items:center; gap:8px;">
              <span id="quiz-timer-label" style="font-weight:700; color:#fbbf24;">${state.timeLeft}s</span>
              <span>Score: <strong>${score}</strong></span>
            </span>
          </div>
          <div class="quiz-timer-track"><div class="quiz-timer-bar" id="quiz-timer-bar"></div></div>
          <div class="quiz-question">${_e(q.q)}</div>
          <div class="quiz-options">${optHTML}</div>
          <div class="quiz-explanation" id="quiz-explanation" style="display:none;"></div>
        </div>
      </div>
    `;
    if (state.timerInterval) clearInterval(state.timerInterval);
    startQuizTimer();
  }

  ARC.submitQuizAnswer = (idx) => {
    if (state.answered) return;
    state.answered = true;
    clearInterval(state.timerInterval);
    highlightQuizAnswer(idx);
  };

  function highlightQuizAnswer(chosen) {
    const q = state.questions[state.qIndex];
    const isCorrect = chosen === q.correct;
    if (isCorrect) {
      playSFX('coin');
      state.correct++;
      score += 10 + Math.max(0, state.timeLeft);
    } else {
      playSFX('buzz');
    }

    for (let i = 0; i < q.opts.length; i++) {
      const btn = document.getElementById(`quiz-opt-${i}`);
      if (!btn) continue;
      if (i === q.correct) btn.classList.add('correct');
      else if (i === chosen) btn.classList.add('wrong');
      btn.disabled = true;
    }

    const expEl = document.getElementById('quiz-explanation');
    if (expEl) {
      expEl.style.display = 'block';
      expEl.innerHTML = `${isCorrect ? '✅' : '❌'} <strong>${isCorrect ? 'Correct!' : 'Wrong.'}</strong> ${CK.esc ? CK.esc(String(q.exp || '')) : String(q.exp || '')}`;
      expEl.style.borderLeftColor = isCorrect ? '#22c55e' : '#ef4444';
    }

    setTimeout(() => {
      state.qIndex++;
      renderQuiz();
    }, 2200);
  }

  return ARC;
})();
