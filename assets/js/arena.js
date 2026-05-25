/* assets/js/arena.js -------------------------------------------------------
   AI Challenge Arena — ChessKidoo
   Engine (Stockfish WASM + minimax fallback), board logic, real-time
   analysis, post-game report, and digital certificate.
   --------------------------------------------------------------- */

(() => {
  const CK = window.CK = window.CK || {};
  const A = CK.arena = {};

  /* ─── State & Visual Toggles ─── */
  let game = null;
  let boardEl = null;
  let selectedSq = null;
  let legalMoves = [];
  let currentDifficulty = 'Intermediate';
  let currentStyle = 'Balanced';
  let coachMode = false;
  let audioCoachEnabled = false;
  let threatMapEnabled = false;
  let safetyRadarEnabled = false;
  let selectedCoachId = 'magnus';
  let blunderReplayMode = false;
  let blunderReplayList = [];
  let blunderReplayIdx = 0;
  
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
  const playerColor = 'w';
  let gameStartTime = null;
  let selectedTimeControl = 600; // in seconds, or 'untimed'
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

  /* ─── Coaches Database ─── */
  const COACHES = {
    magnus: {
      id: 'magnus',
      name: 'Magnus Carlsen',
      emoji: '👑',
      style: 'Balanced',
      avatar: '👑',
      desc: 'Balanced and ultra-precise positional play.',
      voicePitch: 0.9,
      voiceRate: 0.95,
      commentaryGreeting: "Hello! Let's play a high-accuracy match. Think carefully before each move.",
      commentaryBlunder: "Hmm, that was a blunder. Positional weaknesses will be punished.",
      commentaryBrilliant: "Excellent move! That shows strong tactical vision.",
      commentaryWin: "Checkmate! Well played, you held up well.",
      commentaryLoss: "That is checkmate. Keep studying the endgames."
    },
    tal: {
      id: 'tal',
      name: 'Mikhail Tal',
      emoji: '🪄',
      style: 'Aggressive',
      avatar: '🪄',
      desc: 'Hyper-aggressive attacker. Prefers sharp sacrifices!',
      voicePitch: 1.1,
      voiceRate: 1.05,
      commentaryGreeting: "Prepare for complications! Let the storm begin!",
      commentaryBlunder: "Ah! A mistake! In chess, you must seize the initiative, not give it away!",
      commentaryBrilliant: "Beautiful! A sacrifice worthy of Riga! Magnificent!",
      commentaryWin: "Yes, mate! What a wild battle that was!",
      commentaryLoss: "Magnificent! You attacked brilliantly. You win!"
    },
    petrosian: {
      id: 'petrosian',
      name: 'Tigran Petrosian',
      emoji: '🛡️',
      style: 'Defensive',
      avatar: '🛡️',
      desc: 'The Iron Tiger. Safety-first prophylaxis.',
      voicePitch: 0.85,
      voiceRate: 0.85,
      commentaryGreeting: "Welcome. Safety is the key. Let us build a secure position.",
      commentaryBlunder: "Careful! You left a piece undefended. Secure your perimeter.",
      commentaryBrilliant: "Impressive prophylaxis. You protected all escape squares.",
      commentaryWin: "Checkmate. The fortress holds, and the counter-attack succeeds.",
      commentaryLoss: "Congratulations. You found a crack in my shield."
    },
    beth: {
      id: 'beth',
      name: 'Beth Harmon',
      emoji: '👩‍🦰',
      style: 'Tactical',
      avatar: '👩‍🦰',
      desc: 'Prodigy who strikes with sharp tactics.',
      voicePitch: 1.0,
      voiceRate: 0.95,
      commentaryGreeting: "Let's see what you've got. I'm playing to win.",
      commentaryBlunder: "That was a bad blunder. Did you miss the threat?",
      commentaryBrilliant: "Wow, impressive! That was a sharp tactical blow.",
      commentaryWin: "Checkmate. A clean finish, good try though.",
      commentaryLoss: "Wow, you got me. Excellent tactical play."
    }
  };

  /* ─── Upgraded Audio System (Acoustic Physical Modeling) ─── */
  let audioCtx = null;
  A.initAudio = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  };

  A.playMoveSound = (isCapture = false) => {
    if (!audioCtx) return;
    try {
      A.initAudio();
      const now = audioCtx.currentTime;
      
      // Base wooden knock impact (sine sweep)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(180, now);
      osc1.frequency.exponentialRampToValueAtTime(70, now + 0.05);
      gain1.gain.setValueAtTime(isCapture ? 0.6 : 0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.05);

      // High click transient frequency component
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1000, now);
      osc2.frequency.exponentialRampToValueAtTime(400, now + 0.015);
      gain2.gain.setValueAtTime(isCapture ? 0.35 : 0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now);
      osc2.stop(now + 0.015);

      // capture play secondary strike wood rattle
      if (isCapture) {
        setTimeout(() => {
          if (!audioCtx) return;
          const now2 = audioCtx.currentTime;
          const osc3 = audioCtx.createOscillator();
          const gain3 = audioCtx.createGain();
          osc3.type = 'sine';
          osc3.frequency.setValueAtTime(130, now2);
          osc3.frequency.exponentialRampToValueAtTime(50, now2 + 0.04);
          gain3.gain.setValueAtTime(0.25, now2);
          gain3.gain.exponentialRampToValueAtTime(0.001, now2 + 0.04);
          osc3.connect(gain3);
          gain3.connect(audioCtx.destination);
          osc3.start(now2);
          osc3.stop(now2 + 0.04);
        }, 35);
      }
    } catch(e) {}
  };

  A.playTickSound = () => {
    if (!audioCtx) return;
    try {
      A.initAudio();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2500, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.008);
      
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1800, now);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + 0.008);
    } catch(e) {}
  };

  A.playChime = (type) => {
    if (!audioCtx) return;
    try {
      A.initAudio();
      const now = audioCtx.currentTime;
      
      if (type === 'win') {
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
          const time = now + (idx * 0.12);
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0.25, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(time);
          osc.stop(time + 0.4);
        });
      } else if (type === 'loss') {
        const notes = [392.00, 311.13, 261.63, 196.00]; // G4, Eb4, C4, G3
        notes.forEach((freq, idx) => {
          const time = now + (idx * 0.15);
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0.25, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(time);
          osc.stop(time + 0.55);
        });
      } else {
        const notes = [261.63, 293.66, 329.63]; // C4, D4, E4
        notes.forEach((freq, idx) => {
          const time = now + (idx * 0.12);
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0.2, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(time);
          osc.stop(time + 0.45);
        });
      }
    } catch(e) {}
  };

  /* ─── Upgraded Audio Coach (Text-to-Speech) ─── */
  A.speakCoach = (text) => {
    if (!audioCoachEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const coach = COACHES[selectedCoachId] || COACHES.magnus;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = coach.voicePitch || 1.0;
      utterance.rate = coach.voiceRate || 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en-'));
      if (englishVoice) utterance.voice = englishVoice;
      
      window.speechSynthesis.speak(utterance);
    } catch(e) {
      console.warn("Speech synthesis failed:", e);
    }
  };

  /* ─── Helpers for Threat Map & Safety Radar ─── */
  function isSquareAttacked(color, sq) {
    if (typeof game.attacked === 'function') return game.attacked(color, sq);
    try {
      const fen = game.fen();
      const tmp = new Chess(fen);
      const parts = fen.split(' ');
      parts[1] = color;
      try { tmp.load(parts.join(' ')); } catch (_) { return false; }
      const moves = tmp.moves({ verbose: true });
      return moves.some(m => m.to === sq);
    } catch (_) { return false; }
  }

  function calculateThreats() {
    const threats = {};
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let r = 1; r <= 8; r++) {
      for (const f of files) {
        const sq = f + r;
        const attackedByWhite = isSquareAttacked('w', sq);
        const attackedByBlack = isSquareAttacked('b', sq);
        threats[sq] = { w: attackedByWhite, b: attackedByBlack };
      }
    }
    return threats;
  }

  function calculateVulnerablePieces() {
    const vulnerable = {};
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const opponentColor = playerColor === 'w' ? 'b' : 'w';

    for (let r = 1; r <= 8; r++) {
      for (const f of files) {
        const sq = f + r;
        const piece = game.get(sq);
        if (piece && piece.color === playerColor) {
          const isAttacked = isSquareAttacked(opponentColor, sq);
          if (isAttacked) {
            const isDefended = isSquareAttacked(playerColor, sq);
            vulnerable[sq] = isDefended ? 'attacked' : 'hanging';
          }
        }
      }
    }
    return vulnerable;
  }

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
    blunderReplayMode = false;

    // Load visual/audio toggles
    audioCoachEnabled = localStorage.getItem('ck_audio_coach') === 'true';
    threatMapEnabled = localStorage.getItem('ck_threat_map') === 'true';
    safetyRadarEnabled = localStorage.getItem('ck_safety_radar') === 'true';
    selectedCoachId = localStorage.getItem('ck_selected_coach_id') || 'magnus';
    
    // Sync UI elements
    const acEl = document.getElementById('arena-audio-coach');
    const tmEl = document.getElementById('arena-threat-map');
    const srEl = document.getElementById('arena-safety-radar');
    if (acEl) acEl.checked = audioCoachEnabled;
    if (tmEl) tmEl.checked = threatMapEnabled;
    if (srEl) srEl.checked = safetyRadarEnabled;

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
    whiteClock = selectedTimeControl === 'untimed' ? 0 : selectedTimeControl;
    blackClock = selectedTimeControl === 'untimed' ? 0 : selectedTimeControl;
    activeClock = 'w';
    aiStartTime = null;
    lastTickTime = Date.now();
    awaitingAIMove = false;
    achievements = JSON.parse(localStorage.getItem('ck_achievements') || '[]');

    A.selectCoach(selectedCoachId); // sync Opponent and setup grid UI

    renderBoard();
    renderAnalysisPanel();
    updateStatus('Your turn — play as White');
    initEngine();
    if (selectedTimeControl !== 'untimed') {
      startClock();
    } else {
      if (clockInterval) clearInterval(clockInterval);
      updateClockDisplay();
    }
    initEvalChart();
    A.updateMinimaxAnalysis = () => {};
    A.updateMinimaxAnalysis();
    
    // Speak coach greeting
    setTimeout(() => {
      A.speakCoach(COACHES[selectedCoachId].commentaryGreeting);
    }, 600);
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
    saveGameToHistory(result);
    A.playChime(result);

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
          if (whiteClock > 0 && whiteClock <= 10) A.playTickSound(); // tick when low on time
          if (whiteClock === 0) { handleTimeout('w'); return; }
        } else if (activeClock === 'b') {
          blackClock = Math.max(0, blackClock - elapsedSec);
          if (blackClock > 0 && blackClock <= 10) A.playTickSound(); // tick when low on time
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
    if (wEl) wEl.textContent = selectedTimeControl === 'untimed' ? '∞' : formatTime(whiteClock);
    if (bEl) bEl.textContent = selectedTimeControl === 'untimed' ? '∞' : formatTime(blackClock);
    const wWrap = document.getElementById('arena-clock-white-wrap');
    const bWrap = document.getElementById('arena-clock-black-wrap');
    if (wWrap) wWrap.classList.toggle('active', selectedTimeControl !== 'untimed' && activeClock === 'w');
    if (bWrap) bWrap.classList.toggle('active', selectedTimeControl !== 'untimed' && activeClock === 'b');
  }

  function formatTime(sec) {
    if (sec === 'untimed') return '∞';
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

    const threats = threatMapEnabled ? calculateThreats() : null;
    const vulnerable = safetyRadarEnabled ? calculateVulnerablePieces() : null;

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const sq = String.fromCharCode(97 + file) + (8 - rank);
        const isLight = (rank + file) % 2 === 1;
        const sqEl = document.createElement('div');
        sqEl.className = `a-sq ${isLight ? 'light' : 'dark'}`;
        sqEl.dataset.square = sq;

        // Apply Threat Map overlays
        if (threats && threats[sq]) {
          const t = threats[sq];
          if (t.w && !t.b) sqEl.classList.add('threat-white');
          else if (!t.w && t.b) sqEl.classList.add('threat-black');
          else if (t.w && t.b) sqEl.classList.add('threat-contested');
        }

        const piece = game.get(sq);
        if (piece) {
          const pieceEl = document.createElement('div');
          pieceEl.className = `a-piece piece-${piece.color}`;

          // Apply Safety Radar highlights on user's pieces
          if (vulnerable && vulnerable[sq] && piece.color === playerColor) {
            const v = vulnerable[sq];
            if (v === 'hanging') pieceEl.classList.add('safety-hanging');
            else if (v === 'attacked') pieceEl.classList.add('safety-attacked');
          }

          pieceEl.innerHTML = `<img src="/assets/img/pieces/${piece.color}${piece.type.toLowerCase()}.png" style="width: 92%; height: 92%; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); pointer-events: none;" alt="${piece.type}">`;
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
  async function executePlayerMove(move) {
    if (isGameOver || isThinking || !isPlayerTurn) return;

    if (blunderReplayMode) {
      const blunder = blunderReplayList[blunderReplayIdx];
      const playedUci = move.from + move.to + (move.promotion || '');
      const isCorrect = playedUci === blunder.bestMove;
      
      if (isCorrect) {
        game.move(move);
        renderBoard();
        A.playChime('win');
        CK.showToast("Correct! That is the best move.", "success");
        updateStatus("Correct! Loading next...");
        isThinking = true;
        setTimeout(() => {
          loadBlunder(blunderReplayIdx + 1);
        }, 1500);
      } else {
        A.playChime('loss');
        CK.showToast("Incorrect move! Try again.", "error");
        updateStatus(`Incorrect! Try again to find a better move than ${blunder.playedMove}`);
      }
      return;
    }

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
      A.playMoveSound(!!move.captured);
      CK.showToast('Correct!', 'success');
      if (gameTimer) clearInterval(gameTimer);
      setTimeout(() => A.startQuickMove(), 2000);
      return;
    }

    const fenBefore = game.fen();
    let moveResult;
    try {
      moveResult = game.move(move);
    } catch (e) {
      return; // Invalid move
    }

    if (moveResult.captured && moveResult.color === 'w') capturedBlack.push(moveResult.captured);
    if (moveResult.captured && moveResult.color === 'b') capturedWhite.push(moveResult.captured);

    moveHistory.push({
      from: moveResult.from,
      to: moveResult.to,
      san: moveResult.san,
      fen: game.fen(),
      color: moveResult.color,
      captured: moveResult.captured || null
    });

    renderBoard();
    A.playMoveSound(!!moveResult.captured);
    isPlayerTurn = false;
    isThinking = true;
    updateStatus('Coach is analyzing...', 'info');

    // Await engine eval for classification
    const evalObj = await getEvalForPosition(fenBefore, moveResult.san);

    // Speak commentary on major classifications
    if (evalObj) {
      if (evalObj.classification === 'blunder') {
        A.speakCoach(COACHES[selectedCoachId].commentaryBlunder);
      } else if (evalObj.classification === 'brilliant') {
        A.speakCoach(COACHES[selectedCoachId].commentaryBrilliant);
      }
    }

    // COACH MODE CHECK
    if (coachMode && evalObj && evalObj.classification === 'blunder') {
      const confirmTakeback = await A.showCoachCard(evalObj);
      if (confirmTakeback) {
        game.undo();
        moveHistory.pop();
        classificationHistory.pop();
        evalHistory.pop();
        if (moveResult.captured && moveResult.color === 'w') capturedBlack.pop();
        if (moveResult.captured && moveResult.color === 'b') capturedWhite.pop();
        renderBoard();
        renderAnalysisPanel();
        isPlayerTurn = true;
        isThinking = false;
        updateStatus('Your turn');
        updateEvalChart(moveHistory.length, evalHistory[evalHistory.length - 1] || 0);
        return; // Halt AI turn
      }
    }

    renderAnalysisPanel();
    activeClock = 'b';
    aiStartTime = Date.now();
    lastTickTime = Date.now();

    if (game.in_checkmate() || game.in_stalemate() || game.insufficient_material()) {
      handleGameOver();
      return;
    }
    if (game.in_threefold_repetition()) {
      CK.showToast('Draw by threefold repetition', 'warning');
      handleGameOver();
      return;
    }

    updateStatus('AI is thinking...');
    
    setTimeout(() => {
      requestAIMove();
    }, 100);
  }

  /* ─── AI Move ─── */
  async function requestAIMove() {
    if (isGameOver) return;

    const fen = game.fen();
    awaitingAIMove = true;

    // 1. Check Endgame Tablebases (if 7 or fewer pieces remain)
    const pieceCount = fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;
    if (pieceCount <= 7) {
      updateStatus('🤖 Consulting Endgame Tablebases…');
      try {
        const res = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.moves && data.moves.length > 0) {
            makeAIMove(data.moves[0].uci);
            return;
          }
        }
      } catch(e) {} // Silent fallback to engine
    }

    // 2. Check Opening Book (first 10 moves)
    const fullMoves = parseInt(fen.split(' ')[5]) || 0;
    if (fullMoves <= 10) {
      updateStatus('🤖 Checking Master Openings…');
      try {
        const res = await fetch(`https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&moves=4`);
        if (res.ok) {
          const data = await res.json();
          if (data.moves && data.moves.length > 0) {
            const topMoves = data.moves.slice(0, 2);
            const choice = topMoves[Math.floor(Math.random() * topMoves.length)];
            makeAIMove(choice.uci);
            return;
          }
        }
      } catch(e) {} // Silent fallback
    }

    updateStatus('🤖 Computer is thinking…');

    const depthLevels = { Beginner: 1, Intermediate: 5, Advanced: 10, Expert: 18 };
    const engineDepth = depthLevels[currentDifficulty] || 5;

    CK.engine.setDepth(engineDepth);
    const result = await CK.engine.evaluateLocal(fen);

    if (result && result.pvs && result.pvs.length > 0) {
      let chosenMoveStr = result.pvs[0].pv.split(' ')[0]; // Balanced default

      // AI Personality Logic
      if (selectedCoachId !== 'magnus' && result.pvs.length > 1) {
        const topCp = result.pvs[0].cp !== null ? result.pvs[0].cp : (result.pvs[0].mate ? result.pvs[0].mate * 1000 : 0);
        let bestCandidate = result.pvs[0];
        let bestScore = -Infinity;

        for (let i = 0; i < result.pvs.length; i++) {
          const pvObj = result.pvs[i];
          const cp = pvObj.cp !== null ? pvObj.cp : (pvObj.mate ? pvObj.mate * 1000 : 0);
          
          if (Math.abs(topCp - cp) <= 120) {
            const firstMove = pvObj.pv.split(' ')[0];
            
            const testGame = new Chess(fen);
            const legalMoves = testGame.moves({ verbose: true });
            const moveData = legalMoves.find(m => (m.from + m.to + (m.promotion || '')) === firstMove);
            
            if (moveData) {
              let styleScore = 0;
              if (selectedCoachId === 'tal') {
                if (moveData.captured) styleScore += 60;
                if (moveData.flags.includes('p')) styleScore += 40;
                testGame.move(moveData);
                if (testGame.in_check()) styleScore += 50;
                testGame.undo();
                
                const isWhite = testGame.turn() === 'w';
                const rankFrom = parseInt(moveData.from[1]);
                const rankTo = parseInt(moveData.to[1]);
                if (isWhite && rankTo > rankFrom) styleScore += 15;
                if (!isWhite && rankTo < rankFrom) styleScore += 15;
              } else if (selectedCoachId === 'petrosian') {
                if (!moveData.captured) styleScore += 30;
                if (moveData.flags.includes('c') || moveData.flags.includes('k') || moveData.flags.includes('q')) styleScore += 70;
                
                const isWhite = testGame.turn() === 'w';
                const rankFrom = parseInt(moveData.from[1]);
                const rankTo = parseInt(moveData.to[1]);
                if (isWhite && rankTo <= rankFrom) styleScore += 25;
                if (!isWhite && rankTo >= rankFrom) styleScore += 25;
              } else if (selectedCoachId === 'beth') {
                if (['d4', 'e4', 'd5', 'e5'].includes(moveData.to)) styleScore += 40;
                if (moveData.piece === 'q') styleScore += 25;
                if (moveData.captured) styleScore += 30;
              }
              
              if (styleScore > bestScore) {
                bestScore = styleScore;
                bestCandidate = pvObj;
              }
            }
          }
        }
        chosenMoveStr = bestCandidate.pv.split(' ')[0];
      }

      makeAIMove(chosenMoveStr);
    } else if (result && result.bestmove) {
      makeAIMove(result.bestmove);
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

  async function makeAIMove(moveStr) {
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

    if (!move) return;

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
    A.playMoveSound(!!move.captured);
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
  }

  /* ─── Move Classification (Using Stockfish via CK.engine) ─── */
  async function getEvalForPosition(fenBefore, playerSan) {
    const testGame = new Chess(fenBefore);
    const isWhite = testGame.turn() === 'w';

    // 1. Evaluate before move (relative to player)
    const resultBefore = await CK.engine.evaluate(fenBefore);
    const evalBefore = resultBefore ? (resultBefore.cp !== null ? resultBefore.cp : (resultBefore.mate ? resultBefore.mate * 10000 : 0)) : 0;

    // 2. Evaluate after move (relative to opponent, so negate it for player's perspective)
    testGame.move(playerSan);
    const fenAfter = testGame.fen();
    const resultAfter = await CK.engine.evaluate(fenAfter, (progress) => {
      if (progress) {
        const cpOpponentProg = progress.cp !== null ? progress.cp : (progress.mate ? progress.mate * 10000 : 0);
        const playerEvalAfterProg = -cpOpponentProg;
        const absoluteCpProg = isWhite ? playerEvalAfterProg : -playerEvalAfterProg;
        const displayEvalProg = absoluteCpProg / 100;
        updateEngineDisplay(displayEvalProg, progress.depth, progress.pv ? [progress.pv] : []);
      }
    });
    const cpOpponent = resultAfter ? (resultAfter.cp !== null ? resultAfter.cp : (resultAfter.mate ? resultAfter.mate * 10000 : 0)) : 0;
    
    const playerEvalAfter = -cpOpponent;
    const absoluteCp = isWhite ? playerEvalAfter : -playerEvalAfter;

    // 3. Centipawn loss
    const diff = evalBefore - playerEvalAfter;
    const classification = classifyFromDiff(diff, playerSan, resultBefore ? resultBefore.pv : null);
    
    const obj = { 
      san: playerSan, 
      classification, 
      eval: absoluteCp,
      diff: diff,
      bestMove: resultBefore && resultBefore.pv ? resultBefore.pv.split(' ')[0] : '-'
    };
    classificationHistory.push(obj);
    evalHistory.push(absoluteCp);
    updateEvalChart(moveHistory.length, absoluteCp);
    renderAnalysisPanel();

    const displayEval = absoluteCp / 100;
    updateEngineDisplay(displayEval, resultAfter ? resultAfter.depth : 0, resultAfter ? [resultAfter.pv] : []);
    
    return obj;
  }

  function classifyFromDiff(cpl, playerSan, bestPv) {
    if (cpl <= 15) {
      if (playerSan.includes('x') && bestPv && !bestPv.includes('x')) return 'brilliant';
      return 'best';
    }
    if (cpl <= 40) return 'excellent';
    if (cpl <= 90) return 'good';
    if (cpl <= 150) return 'inaccuracy';
    if (cpl <= 300) return 'mistake';
    return 'blunder';
  }

  /* ─── Analysis Panel ─── */
  function renderAnalysisPanel() {
    // Move list
    const moveListEl = document.getElementById('arena-move-list');
    if (moveListEl) {
      let html = '';
      const iconMap = { brilliant: '!!', best: '★', excellent: '!', good: '', inaccuracy: '?!', mistake: '?', blunder: '??' };
      for (let i = 0; i < moveHistory.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const whiteMove = moveHistory[i];
        const blackMove = moveHistory[i + 1];
        const wClass = classificationHistory[i]?.classification || '';
        const bClass = classificationHistory[i + 1]?.classification || '';
        
        const wIcon = iconMap[wClass] ? `<span class="amove-icon icon-${wClass}">${iconMap[wClass]}</span>` : '';
        const bIcon = iconMap[bClass] ? `<span class="amove-icon icon-${bClass}">${iconMap[bClass]}</span>` : '';

        const rowBg = moveNum % 2 === 0 ? 'background: rgba(255,255,255,0.02);' : '';

        html += `<div class="amove-row" style="${rowBg}">
          <span class="amove-num">${moveNum}.</span>
          <div class="amove-cell class-${wClass}">
            <span class="amove-san">${whiteMove?.san || ''}</span>
            ${wIcon}
          </div>
          <div class="amove-cell class-${bClass}">
            <span class="amove-san">${blackMove?.san || ''}</span>
            ${bIcon}
          </div>
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
    saveGameToHistory(result);
    A.playChime(result);

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
    if (totalMoves >= 10 && classifications.filter(c => c === 'blunder' || c === 'mistake').length === 0) newAchievements.push(ACHIEVEMENTS.perfect_game);
    if (totalMoves <= 10 && result === 'win') newAchievements.push(ACHIEVEMENTS.speed_win);
    if (totalMoves >= 15 && accuracy >= 90) newAchievements.push(ACHIEVEMENTS.accuracy_master);

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

    if (totalMoves < 5) {
      lines.push({ icon: '⏱️', text: 'The game ended too quickly for deep analysis. Play a longer game to get a comprehensive evaluation of your skills and a proper level assessment.' });
      return { 
        lines, 
        levelMsg: "Play at least 5 moves to unlock an accurate level assessment.", 
        levelIcon: 'ℹ️', 
        levelColor: '#64748b', 
        playerActualLevel: 'N/A' 
      };
    }

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
    const accuracy = classifications.length > 0 ? Math.round((totalWeight / classifications.length) * 100) : 0;

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
          ${(counts.blunder + counts.mistake) > 0 ? `
          <button class="report-btn report-btn-primary" onclick="CK.arena.startBlunderReplay()" style="background:linear-gradient(135deg, var(--arena-purple), #8b5cf6); border:none; color:white; box-shadow:0 0 15px rgba(139,92,246,0.4);">💡 Practice Blunders</button>
          ` : ''}
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
      const hist = classificationHistory[i] || {};
      const classification = hist.classification || 'good';
      const san = moveHistory[i]?.san || '';
      const diff = hist.diff !== undefined ? hist.diff / 100 : 0; // Convert to Pawns
      const bestMoveSan = hist.bestMove || '-';
      
      const getMarker = (c) => {
        if(c === 'brilliant') return '<span style="color:#0ea5e9;font-weight:bold;margin-left:2px;">!!</span>';
        if(c === 'excellent') return '<span style="color:#10b981;font-weight:bold;margin-left:2px;">!</span>';
        if(c === 'inaccuracy') return '<span style="color:#f59e0b;font-weight:bold;margin-left:2px;">?!</span>';
        if(c === 'mistake') return '<span style="color:#ef4444;font-weight:bold;margin-left:2px;">?</span>';
        if(c === 'blunder') return '<span style="color:#b91c1c;font-weight:bold;margin-left:2px;">??</span>';
        return '';
      };
      
      const diffColor = diff <= 0.15 ? '#10b981' : diff <= 0.5 ? '#f59e0b' : '#ef4444';
      
      html += `
        <tr style="border-bottom: 1px solid var(--arena-border);">
          <td style="padding: 6px; color: var(--arena-text-muted);">${Math.floor(i/2)+1}</td>
          <td style="padding: 6px; font-family: monospace; color: ${getClassificationColor(classification)};">${san}${getMarker(classification)}</td>
          <td style="padding: 6px; font-family: monospace; opacity: 0.6;">${bestMoveSan}</td>
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

  A.showCertificate = (result, grade, gradeClass, accuracy) => {
    const overlay = document.getElementById('cert-overlay');
    if (!overlay) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const certId = 'CK-' + now.getFullYear() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const savedName = localStorage.getItem('ck_player_name') || '';
    
    const isWin = result === 'win';
    const titleText = isWin ? 'Certificate of Victory' : (result === 'draw' ? 'Certificate of Merit' : 'Certificate of Participation');
    const ribbonColor = isWin ? '#d4af37' : (result === 'draw' ? '#b0b8c3' : '#e07a5f');
    const gradeColor = grade === 'S' ? '#fbbf24' : (grade === 'A' ? '#a78bfa' : (grade === 'B' ? '#38bdf8' : (grade === 'C' ? '#4ade80' : '#f87171')));

    const planMap = {
      'Beginner': 'Pawn Vanguard (Beginner Class)', 
      'Intermediate': 'Knight Riders (Intermediate Class)', 
      'Advanced': 'Rook Castle (Advanced Class)', 
      'Grandmaster': 'Master Class (Elite)', 
      'Master': 'Master Class (Elite)'
    };
    const suggestedPlan = planMap[currentDifficulty] || 'Pawn Vanguard (Beginner Class)';

    overlay.innerHTML = `
      <div class="cert-perspective-container">
        <div class="cert-card">
          <!-- Holographic specular layer -->
          <div class="cert-holo-overlay"></div>
          
          <!-- Guilloche gold border -->
          <svg class="cert-guilloche-border" viewBox="0 0 800 560" preserveAspectRatio="none">
            <defs>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#bf953f" />
                <stop offset="25%" stop-color="#fcf6ba" />
                <stop offset="50%" stop-color="#b38728" />
                <stop offset="75%" stop-color="#fbf5b7" />
                <stop offset="100%" stop-color="#aa771c" />
              </linearGradient>
            </defs>
            <!-- Repeating geometric borders -->
            <rect x="15" y="15" width="770" height="530" fill="none" stroke="url(#goldGradient)" stroke-width="2" rx="10"/>
            <rect x="22" y="22" width="756" height="516" fill="none" stroke="url(#goldGradient)" stroke-width="0.75" stroke-dasharray="6,4" rx="8"/>
            <rect x="26" y="26" width="748" height="508" fill="none" stroke="url(#goldGradient)" stroke-width="0.5" rx="6"/>
            
            <!-- Corner Accents -->
            <!-- Top-Left -->
            <path d="M 15,45 L 45,15 M 15,55 L 55,15 M 15,65 L 65,15" stroke="url(#goldGradient)" stroke-width="0.5" fill="none"/>
            <!-- Top-Right -->
            <path d="M 785,45 L 755,15 M 785,55 L 745,15 M 785,65 L 735,15" stroke="url(#goldGradient)" stroke-width="0.5" fill="none"/>
            <!-- Bottom-Left -->
            <path d="M 15,515 L 45,545 M 15,505 L 55,545 M 15,495 L 65,545" stroke="url(#goldGradient)" stroke-width="0.5" fill="none"/>
            <!-- Bottom-Right -->
            <path d="M 785,515 L 755,545 M 785,505 L 745,545 M 785,495 L 735,545" stroke="url(#goldGradient)" stroke-width="0.5" fill="none"/>
            
            <!-- Geometric Guilloche Waves -->
            <!-- Top Wave -->
            <path d="M 30,35 Q 80,25 130,35 T 230,35 T 330,35 T 430,35 T 530,35 T 630,35 T 730,35 T 770,35" fill="none" stroke="url(#goldGradient)" stroke-width="0.5" opacity="0.65"/>
            <path d="M 30,38 Q 80,48 130,38 T 230,38 T 330,38 T 430,38 T 530,38 T 630,38 T 730,38 T 770,38" fill="none" stroke="url(#goldGradient)" stroke-width="0.5" opacity="0.65"/>
            <!-- Bottom Wave -->
            <path d="M 30,525 Q 80,515 130,525 T 230,525 T 330,525 T 430,525 T 530,525 T 630,525 T 730,525 T 770,525" fill="none" stroke="url(#goldGradient)" stroke-width="0.5" opacity="0.65"/>
            <path d="M 30,522 Q 80,532 130,522 T 230,522 T 330,522 T 430,522 T 530,522 T 630,522 T 730,522 T 770,522" fill="none" stroke="url(#goldGradient)" stroke-width="0.5" opacity="0.65"/>
          </svg>

          <!-- Academy Header -->
          <div class="cert-academy-title">CHESSKIDOO ACADEMY</div>
          <div class="cert-subtitle-top">Arena of Artificial Intelligence</div>

          <!-- Crest -->
          <svg class="cert-crest" viewBox="0 0 100 100">
            <!-- Laurel Wreath -->
            <path d="M 50,82 C 30,78 22,60 25,42 C 27,32 35,22 45,17" fill="none" stroke="url(#goldGradient)" stroke-width="1.8"/>
            <path d="M 50,82 C 70,78 78,60 75,42 C 73,32 65,22 55,17" fill="none" stroke="url(#goldGradient)" stroke-width="1.8"/>
            <path d="M 25,42 Q 21,39 24,35 Q 28,37 25,42 M 27,51 Q 23,48 26,44 Q 30,46 27,51 M 31,60 Q 27,57 30,53 Q 34,55 31,60 M 37,69 Q 33,66 36,62 Q 40,64 37,69 M 75,42 Q 79,39 76,35 Q 72,37 75,42 M 73,51 Q 77,48 74,44 Q 70,46 73,51 M 69,60 Q 73,57 70,53 Q 66,55 69,60 M 63,69 Q 67,66 64,62 Q 60,64 63,69" fill="url(#goldGradient)"/>
            <!-- Shield -->
            <path d="M 50,22 C 60,22 66,25 66,40 C 66,58 50,73 50,73 C 50,73 34,58 34,40 C 34,25 40,22 50,22 Z" fill="none" stroke="url(#goldGradient)" stroke-width="2"/>
            <!-- Crossed Kings -->
            <path d="M 44,53 L 48,53 L 47,40 L 50,42 L 44,32 L 39,42 L 42,40 Z" fill="url(#goldGradient)"/>
            <path d="M 56,53 L 52,53 L 53,40 L 50,42 L 56,32 L 61,42 L 58,40 Z" fill="url(#goldGradient)"/>
            <circle cx="50" cy="48" r="3" fill="url(#goldGradient)"/>
          </svg>

          <!-- Document Title -->
          <h1 class="cert-main-title">${titleText}</h1>

          <p class="cert-congratulations">This diploma is proudly awarded to</p>

          <!-- Input area for Name -->
          <div class="cert-input-wrap">
            <input type="text" id="cert-player-name" placeholder="Enter Your Name" value="${savedName.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}">
            <div class="cert-input-line"></div>
          </div>

          <!-- Description paragraph -->
          <p class="cert-description">
            For outstanding strategic performance in the Arena, defeating the <strong>${currentDifficulty}</strong> engine personality with a precision rating of <strong>${accuracy}%</strong> over a sequence of <strong>${moveHistory.length} moves</strong>.
          </p>

          <!-- Premium Statistics & Info Grid -->
          <div class="cert-stats-grid">
            <div class="cert-stat-box" style="text-align: right;">
              <span class="cert-stat-label">Tactical Grade</span>
              <span class="cert-stat-large" style="color: ${gradeColor};">${grade}</span>
            </div>
            <div class="cert-stat-divider"></div>
            <div class="cert-stat-box" style="text-align: center;">
              <span class="cert-stat-label">Next Rank Pathway</span>
              <span class="cert-stat-value">${suggestedPlan}</span>
            </div>
            <div class="cert-stat-divider"></div>
            <div class="cert-stat-box" style="text-align: left;">
              <div style="margin-bottom: 8px;">
                <span class="cert-stat-label" style="display:inline-block; margin-bottom:2px;">Awarded Date</span>
                <span class="cert-stat-date-id">${dateStr}</span>
              </div>
              <div>
                <span class="cert-stat-label" style="display:inline-block; margin-bottom:2px;">Verification Hash</span>
                <span class="cert-stat-date-id" style="font-family: monospace; font-size: 0.75rem; letter-spacing: 0;">${certId}</span>
              </div>
            </div>
          </div>

          <!-- Signatures Footer -->
          <div class="cert-footer-row">
            <!-- Left Signature: Engine -->
            <div class="cert-sig-block">
              <div class="cert-sig-blank">
                <span class="cert-ai-signature">Stockfish 10</span>
              </div>
              <div class="cert-sig-underline"></div>
              <span class="cert-sig-title">AI Engine Arbitrator</span>
            </div>

            <!-- Central Seal (Foil & Ribbon) -->
            <div class="cert-seal-wrap">
              <div class="cert-foil-seal" style="border-color: ${ribbonColor}; box-shadow: 0 8px 20px rgba(0,0,0,0.15), inset 0 0 0 2px #fff, inset 0 0 20px ${ribbonColor};">
                <div class="cert-seal-crown">♛</div>
              </div>
              <div class="cert-seal-ribbon-tail-1" style="background: ${ribbonColor};"></div>
              <div class="cert-seal-ribbon-tail-2" style="background: ${ribbonColor};"></div>
            </div>

            <!-- Right Signature: Director -->
            <div class="cert-sig-block">
              <div class="cert-sig-blank" style="position: relative;">
                <!-- Animated SVG Signature -->
                <svg class="cert-sig-svg" viewBox="0 0 150 50">
                  <path class="sig-path" d="M 15,28 C 25,8 35,12 30,32 C 27,42 20,48 30,38 C 40,28 55,18 50,32 C 48,38 52,35 60,28 C 67,20 73,25 70,32 C 68,35 72,33 77,29 C 82,25 87,26 85,32 C 83,35 87,32 93,29 C 99,26 105,27 103,32 C 101,35 110,27 120,22 C 130,17 135,24 130,34 C 125,44 115,48 125,40 C 135,32 150,30 145,38" fill="none" stroke="#2c3e50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="cert-sig-underline"></div>
              <span class="cert-sig-title">Academy Director</span>
            </div>
          </div>
        </div>
      </div>

      <div class="cert-action-bar">
        <button class="cert-action-btn btn-secondary" onclick="CK.arena.closeCertificate()">Close</button>
        <button class="cert-action-btn btn-primary" onclick="CK.arena.printCertificate()">🖨️ Print Certificate</button>
      </div>
    `;

    overlay.classList.add('active');

    // Trigger handwriting signature path animation after slight delay
    setTimeout(() => {
      const cardEl = document.querySelector('.cert-card');
      if (cardEl) {
        cardEl.classList.add('animate-sig');
      }
    }, 400);

    // Dynamic 3D mouse tilt tracking and specular shimmer movement
    const card = document.querySelector('.cert-card');
    if (card) {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;

        const px = x / w;
        const py = y / h;

        const rotateY = ((px - 0.5) * 16).toFixed(2);
        const rotateX = (-(py - 0.5) * 16).toFixed(2);

        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        const holo = card.querySelector('.cert-holo-overlay');
        if (holo) {
          holo.style.backgroundPosition = `${px * 100}% ${py * 100}%`;
          const dist = Math.sqrt(Math.pow(px - 0.5, 2) + Math.pow(py - 0.5, 2));
          holo.style.opacity = (0.1 + dist * 0.75).toFixed(2);
        }
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'rotateX(0deg) rotateY(0deg)';
        const holo = card.querySelector('.cert-holo-overlay');
        if (holo) {
          holo.style.backgroundPosition = '0% 0%';
          holo.style.opacity = '0';
        }
      });
    }

    // Bind input listener to save the name to localStorage
    const input = document.getElementById('cert-player-name');
    if (input) {
      input.addEventListener('input', (e) => {
        localStorage.setItem('ck_player_name', e.target.value);
      });
    }
  };

  A.closeReport = () => {
    const overlay = document.getElementById('arena-report-overlay');
    if (overlay) overlay.classList.remove('active');
  };

  A.playAgain = () => {
    A.closeReport();
    setTimeout(() => A.init(), 200);
  };

  A.printCertificate = () => {
    const certHtml = document.querySelector('#cert-overlay .cert-card');
    if (!certHtml) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { CK.showToast('Please allow popups to print.', 'warning'); return; }
    const doc = printWindow.document;
    doc.open();
    doc.write(`<html><head><title>ChessKidoo Certificate</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Cormorant+Garamond:ital,wght@1,500;1,700&family=Montserrat:wght@400;600;700&display=swap');
      @page { size: landscape; margin: 0; }
      body { font-family: 'Montserrat', sans-serif; margin: 0; padding: 40px; background: #fffcf5; display: flex; justify-content: center; align-items: center; min-height: 100vh; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .cert-card { background: #fffdf5; border-radius: 12px; position: relative; padding: 36px 48px; width: 800px; height: 560px; box-sizing: border-box; text-align: center; border: 2px solid rgba(212, 175, 55, 0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .cert-guilloche-border { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
      .cert-academy-title { font-family: 'Cinzel', serif; font-size: 1.5rem; font-weight: 700; color: #1a1a1a; letter-spacing: 4px; margin-bottom: 2px; }
      .cert-subtitle-top { font-family: 'Montserrat', sans-serif; font-size: 0.75rem; text-transform: uppercase; color: #777; letter-spacing: 3px; margin-bottom: 12px; }
      .cert-crest { width: 70px; height: 70px; margin-bottom: 10px; }
      .cert-main-title { font-family: 'Cinzel', serif; font-size: 2.2rem; font-weight: 900; color: #d4af37; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 2px; }
      .cert-congratulations { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 1.1rem; color: #555; margin: 0 0 10px 0; }
      .cert-input-wrap { margin-bottom: 18px; width: 70%; text-align: center; }
      .cert-input-wrap div { font-family: 'Cormorant Garamond', serif; font-size: 2.4rem; font-weight: 700; font-style: italic; color: #111; border-bottom: 2px solid #d4af37; padding-bottom: 4px; margin: 0 auto; width: 100%; text-align: center; }
      .cert-description { font-family: 'Montserrat', sans-serif; font-size: 0.85rem; line-height: 1.6; color: #444; max-width: 580px; margin: 0 auto 20px; }
      .cert-stats-grid { display: flex; justify-content: center; align-items: center; gap: 20px; margin-bottom: 24px; width: 100%; }
      .cert-stat-box { display: flex; flex-direction: column; flex: 1; }
      .cert-stat-label { font-size: 0.65rem; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 4px; }
      .cert-stat-large { font-family: 'Cinzel', serif; font-size: 2rem; font-weight: 900; line-height: 1; }
      .cert-stat-value { font-family: 'Montserrat', sans-serif; font-size: 0.9rem; font-weight: 700; color: #d4af37; }
      .cert-stat-date-id { font-size: 0.8rem; font-weight: 600; color: #222; }
      .cert-stat-divider { width: 1px; height: 45px; background: #e5e7eb; }
      .cert-footer-row { display: flex; width: 100%; justify-content: space-between; align-items: flex-end; padding: 0 20px; margin-top: 10px; box-sizing: border-box; }
      .cert-sig-block { display: flex; flex-direction: column; align-items: center; width: 150px; }
      .cert-sig-blank { height: 40px; display: flex; align-items: flex-end; justify-content: center; width: 100%; }
      .cert-ai-signature { font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 600; color: #555; }
      .cert-sig-underline { width: 100%; height: 1px; background: #333; margin-top: 4px; margin-bottom: 4px; }
      .cert-sig-title { font-size: 0.65rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .cert-sig-svg { width: 120px; height: 40px; }
      .sig-path { fill: none; stroke: #2c3e50; stroke-width: 2; }
      .cert-seal-wrap { position: relative; width: 60px; height: 60px; margin-bottom: -10px; }
      .cert-foil-seal { width: 50px; height: 50px; background: #d4af37; border-radius: 50%; border: 2px solid #d4af37; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
      .cert-seal-crown { font-size: 20px; color: #fff; }
      .cert-seal-ribbon-tail-1, .cert-seal-ribbon-tail-2 { position: absolute; top: 35px; width: 10px; height: 25px; background: #d4af37; z-index: -1; }
      .cert-seal-ribbon-tail-1 { left: 16px; transform: rotate(15deg); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); }
      .cert-seal-ribbon-tail-2 { right: 16px; transform: rotate(-15deg); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); }
    </style></head><body>
      <div class="cert-card">${certHtml.innerHTML.replace(/<input[^>]*value="([^"]*)"[^>]*>/, '<div>$1</div>')}</div>
    </body></html>`);
    doc.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
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
  saveGameToHistory('loss');
  A.playChime('loss');
  setTimeout(() => showPostGameReport('loss'), 800);
};

A.offerDraw = () => {
  if (isGameOver) return;
  isGameOver = true;
  isThinking = false;
  if (clockInterval) clearInterval(clockInterval);
  updateStatus('Game Drawn by agreement', 'gameover');
  saveGameToHistory('draw');
  A.playChime('draw');
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
    document.querySelectorAll('.diff-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.level === level);
    });
  };

  A.setStyle = (style) => {
    currentStyle = style;
    document.querySelectorAll('.style-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.style === style);
    });
  };

  A.toggleCoach = (enabled) => {
    coachMode = enabled;
  };

  A.toggleAudioCoach = (enabled) => {
    audioCoachEnabled = enabled;
    localStorage.setItem('ck_audio_coach', enabled);
  };

  A.toggleThreatMap = (enabled) => {
    threatMapEnabled = enabled;
    renderBoard();
    localStorage.setItem('ck_threat_map', enabled);
  };

  A.toggleSafetyRadar = (enabled) => {
    safetyRadarEnabled = enabled;
    renderBoard();
    localStorage.setItem('ck_safety_radar', enabled);
  };

  A.selectCoach = (coachId) => {
    if (!COACHES[coachId]) return;
    selectedCoachId = coachId;
    currentStyle = COACHES[coachId].style;
    localStorage.setItem('ck_selected_coach_id', coachId);
    
    // Update active cards in Challenge setup modal
    document.querySelectorAll('.coach-select-card').forEach(card => {
      card.classList.toggle('active', card.dataset.coach === coachId);
    });
    
    // Update Current Opponent info on sidebar
    const nameEl = document.getElementById('arena-current-coach-name');
    const styleEl = document.getElementById('arena-current-coach-style');
    const avatarEl = document.getElementById('arena-current-coach-avatar');
    
    if (nameEl) nameEl.textContent = COACHES[coachId].name;
    if (styleEl) styleEl.textContent = COACHES[coachId].style;
    if (avatarEl) avatarEl.textContent = COACHES[coachId].emoji;
  };

  A.switchTab = (tab) => {
    const movesEl = document.getElementById('arena-move-list');
    const logEl = document.getElementById('arena-match-log');
    const movesTabBtn = document.getElementById('arena-tab-moves');
    const logTabBtn = document.getElementById('arena-tab-history');

    if (tab === 'moves') {
      if (movesEl) movesEl.style.display = 'block';
      if (logEl) logEl.style.display = 'none';
      if (movesTabBtn) movesTabBtn.classList.add('active');
      if (logTabBtn) logTabBtn.classList.remove('active');
    } else {
      if (movesEl) movesEl.style.display = 'none';
      if (logEl) logEl.style.display = 'block';
      if (movesTabBtn) movesTabBtn.classList.remove('active');
      if (logTabBtn) logTabBtn.classList.add('active');
      A.renderMatchHistory();
    }
  };

  A.renderMatchHistory = () => {
    const logEl = document.getElementById('arena-match-log');
    if (!logEl) return;

    const history = JSON.parse(localStorage.getItem('ck_arena_history') || '[]');
    
    if (history.length === 0) {
      logEl.innerHTML = `<div style="color:var(--arena-text-muted); font-size:0.75rem; text-align:center; padding:40px 0;">No matches played yet. Play a game to log your progress!</div>`;
      return;
    }

    const total = history.length;
    const wins = history.filter(h => h.result === 'win').length;
    const draws = history.filter(h => h.result === 'draw').length;
    const winRate = Math.round(((wins + draws * 0.5) / total) * 100);
    const avgAccuracy = Math.round(history.reduce((sum, h) => sum + h.accuracy, 0) / total);

    let html = `
      <div class="match-log-summary">
        <div class="match-log-summary-box">
          <div class="match-log-summary-val">${total}</div>
          <div class="match-log-summary-lbl">Played</div>
        </div>
        <div class="match-log-summary-box" style="border-left:1px solid rgba(255,255,255,0.05); border-right:1px solid rgba(255,255,255,0.05);">
          <div class="match-log-summary-val">${winRate}%</div>
          <div class="match-log-summary-lbl">Win Rate</div>
        </div>
        <div class="match-log-summary-box">
          <div class="match-log-summary-val">${avgAccuracy}%</div>
          <div class="match-log-summary-lbl">Avg Acc</div>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
    `;

    history.forEach((h, idx) => {
      const resLabel = h.result === 'win' ? 'Win' : h.result === 'loss' ? 'Loss' : 'Draw';
      html += `
        <div class="match-log-item">
          <div class="ml-left">
            <span style="font-size:1.3rem;">${h.avatar || '🤖'}</span>
            <div>
              <div class="ml-opponent">${h.opponent}</div>
              <div class="ml-meta">${h.difficulty} · ${h.moves} moves · ${h.date}</div>
            </div>
          </div>
          <div class="ml-right">
            <div class="ml-accuracy">${h.accuracy}%</div>
            <span class="ml-result-badge ${h.result}">${resLabel}</span>
            <button class="ml-pgn-btn" onclick="CK.arena.downloadPGN(${idx})" title="Download PGN">📥</button>
          </div>
        </div>
      `;
    });

    html += '</div>';
    logEl.innerHTML = html;
  };

  A.downloadPGN = (idx) => {
    const history = JSON.parse(localStorage.getItem('ck_arena_history') || '[]');
    const record = history[idx];
    if (!record || !record.pgn) return;

    const blob = new Blob([record.pgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chesskidoo_${record.opponent.toLowerCase().replace(/ /g, '_')}_${record.date.replace(/ /g, '_')}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    CK.showToast("PGN file downloaded successfully!", "success");
  };

  A.startBlunderReplay = () => {
    A.closeReport();
    blunderReplayList = [];
    for (let i = 0; i < moveHistory.length; i++) {
      const hist = classificationHistory[i] || {};
      const move = moveHistory[i];
      if (move.color === playerColor && (hist.classification === 'blunder' || hist.classification === 'mistake')) {
        const fenBefore = i === 0 ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : moveHistory[i - 1].fen;
        blunderReplayList.push({
          index: i,
          fenBefore,
          playedMove: move.san,
          bestMove: hist.bestMove,
          classification: hist.classification
        });
      }
    }
    
    if (blunderReplayList.length === 0) {
      CK.showToast("No blunders to practice in this game!", "info");
      return;
    }
    
    blunderReplayMode = true;
    blunderReplayIdx = 0;
    
    const banner = document.getElementById('blunder-replay-banner');
    if (banner) banner.style.display = 'flex';
    
    loadBlunder(0);
  };

  function loadBlunder(idx) {
    if (idx >= blunderReplayList.length) {
      CK.showToast("All blunders corrected! Fantastic job!", "success");
      A.exitBlunderReplay();
      setTimeout(() => {
        showPostGameReport(moveHistory[moveHistory.length - 1]?.color === playerColor ? 'win' : 'loss');
      }, 1000);
      return;
    }
    
    blunderReplayIdx = idx;
    const blunder = blunderReplayList[idx];
    
    game = new Chess(blunder.fenBefore);
    isPlayerTurn = true;
    isGameOver = false;
    isThinking = false;
    selectedSq = null;
    legalMoves = [];
    
    renderBoard();
    
    const textEl = document.getElementById('blunder-replay-text');
    if (textEl) {
      textEl.textContent = `Blunder ${idx + 1} of ${blunderReplayList.length}: Find a better move than ${blunder.playedMove}!`;
    }
    
    updateStatus(`Practice: Find a better move than ${blunder.playedMove}`);
    A.speakCoach("Find a better move in this position.");
  }

  A.exitBlunderReplay = () => {
    blunderReplayMode = false;
    const banner = document.getElementById('blunder-replay-banner');
    if (banner) banner.style.display = 'none';
    A.init();
  };

  function saveGameToHistory(result) {
    const totalMoves = moveHistory.length;
    const classifications = classificationHistory.map(c => c.classification);
    const weights = { brilliant: 1, best: 1, excellent: 0.9, good: 0.7, inaccuracy: 0.4, mistake: 0.2, blunder: 0 };
    let totalWeight = 0;
    classifications.forEach(c => { totalWeight += weights[c] || 0.5; });
    const accuracy = classifications.length > 0 ? Math.round((totalWeight / classifications.length) * 100) : 50;

    let grade;
    if (accuracy >= 90) grade = 'S';
    else if (accuracy >= 75) grade = 'A';
    else if (accuracy >= 60) grade = 'B';
    else if (accuracy >= 40) grade = 'C';
    else grade = 'D';

    const pgn = generatePGN(result);

    const matchRecord = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      opponent: COACHES[selectedCoachId].name,
      avatar: COACHES[selectedCoachId].emoji,
      difficulty: currentDifficulty,
      result,
      accuracy,
      moves: totalMoves,
      grade,
      pgn
    };

    const history = JSON.parse(localStorage.getItem('ck_arena_history') || '[]');
    history.unshift(matchRecord);
    if (history.length > 50) history.pop();
    localStorage.setItem('ck_arena_history', JSON.stringify(history));

    A.renderMatchHistory();
    
    // Speak post-game result
    setTimeout(() => {
      if (result === 'win') {
        A.speakCoach(COACHES[selectedCoachId].commentaryLoss);
      } else if (result === 'loss') {
        A.speakCoach(COACHES[selectedCoachId].commentaryWin);
      } else {
        A.speakCoach("The game is a draw. Good fight.");
      }
    }, 800);
  }

  function generatePGN(result) {
    const pgnHeaders = [
      `[Event "ChessKidoo AI Arena Match"]`,
      `[Site "ChessKidoo Academy"]`,
      `[Date "${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}"]`,
      `[Round "1"]`,
      `[White "Player"]`,
      `[Black "${COACHES[selectedCoachId].name}"]`,
      `[Result "${result === 'win' ? '1-0' : result === 'loss' ? '0-1' : '1/2-1/2'}"]`,
      `[Difficulty "${currentDifficulty}"]`,
      `[Style "${COACHES[selectedCoachId].style}"]`
    ];

    let moveText = '';
    for (let i = 0; i < moveHistory.length; i++) {
      if (i % 2 === 0) {
        moveText += `${Math.floor(i / 2) + 1}. `;
      }
      moveText += `${moveHistory[i].san} `;
    }
    moveText += result === 'win' ? '1-0' : result === 'loss' ? '0-1' : '1/2-1/2';

    return pgnHeaders.join('\n') + '\n\n' + moveText;
  }

  A.openChallengeModal = () => {
    const overlay = document.getElementById('arena-challenge-overlay');
    const modal = document.getElementById('arena-challenge-modal');
    if (overlay) overlay.style.display = 'block';
    if (modal) modal.style.display = 'block';
  };

  A.showCoachCard = (evalObj) => {
    return new Promise(resolve => {
      const overlay = document.getElementById('coach-overlay');
      if (!overlay) return resolve(false);

      const diffPawns = (evalObj.diff/100).toFixed(1);
      overlay.innerHTML = `
        <div class="coach-card">
          <div class="coach-card-icon">⚠️</div>
          <div class="coach-card-title">COACH WARNING</div>
          <div class="coach-card-body">
            <p>That move was a <span style="color:var(--arena-red); font-weight:bold;">blunder</span>!</p>
            <p style="font-size: 0.9em; opacity: 0.8; margin-top: 4px;">Evaluation dropped by ${diffPawns} pawns.</p>
            <div class="coach-card-recommendation">
              <span>Stockfish recommends:</span>
              <strong style="color:var(--arena-gold); font-size:1.1em; margin-left: 6px;">${evalObj.bestMove}</strong>
            </div>
            <p style="margin-top: 16px;">Do you want to take it back?</p>
          </div>
          <div class="coach-card-actions">
            <button id="coach-btn-takeback" class="coach-btn coach-btn-primary">Take Back Move</button>
            <button id="coach-btn-keep" class="coach-btn coach-btn-secondary">Keep Move</button>
          </div>
        </div>
      `;
      overlay.classList.add('active');

      document.getElementById('coach-btn-takeback').onclick = () => {
        overlay.classList.remove('active');
        resolve(true);
      };
      document.getElementById('coach-btn-keep').onclick = () => {
        overlay.classList.remove('active');
        resolve(false);
      };
    });
  };

  A.closeChallengeModal = () => {
    const overlay = document.getElementById('arena-challenge-overlay');
    const modal = document.getElementById('arena-challenge-modal');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
  };

  A.setTimeControl = (timeVal) => {
    selectedTimeControl = timeVal;
    document.querySelectorAll('.timer-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.time === String(timeVal));
    });
  };

  A.setTimerAndRestart = (timeVal) => {
    A.setTimeControl(timeVal);
    A.newGame();
    CK.showToast('Match restarted with new time control.', 'success');
  };

  A.setCustomTimer = () => {
    const input = document.getElementById('custom-timer-input');
    if (!input || !input.value) return;
    const mins = parseInt(input.value, 10);
    if (isNaN(mins) || mins <= 0) return;
    A.setTimerAndRestart(mins * 60);
    input.value = '';
  };

  A.startCustomGame = () => {
    A.closeChallengeModal();
    A.newGame();
  };

/* ─── Hint System ─── */
A.showHint = async () => {
  if (isGameOver || isThinking || !isPlayerTurn) return;
  
  CK.showToast('🤖 Finding the best move...', 'info');
  
  const fen = game.fen();
  const depth = DIFFICULTY_DEPTH[currentDifficulty] || 2;
  if (CK.engine.setDepth) CK.engine.setDepth(depth);
  
  const result = await CK.engine.evaluate(fen);
  
  if (result && result.pvs && result.pvs.length > 0) {
    const moveStr = result.pvs[0].pv.split(' ')[0];
    if (moveStr) {
      const from = moveStr.substring(0, 2);
      const to = moveStr.substring(2, 4);
      const promo = moveStr.length > 4 ? moveStr[4] : 'q';
      
      // Get the SAN name using chess.js
      const tempGame = new Chess(fen);
      let san = '';
      try {
        const move = tempGame.move({ from, to, promotion: promo });
        if (move) san = move.san;
      } catch (e) {
        san = from + '-' + to;
      }

      const fromEl = document.querySelector(`.a-sq[data-square="${from}"]`);
      const toEl = document.querySelector(`.a-sq[data-square="${to}"]`);
      
      if (fromEl) {
        fromEl.style.animation = 'hintPulse 1.5s ease-in-out 3';
      }
      if (toEl) {
        toEl.style.animation = 'hintPulse 1.5s ease-in-out 3';
      }
      
      CK.showToast(`Hint: Play ${san}`, 'info');
    }
  } else {
    CK.showToast('No hint found.', 'warning');
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
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
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
  whiteClock = 0;
  blackClock = 0;
  activeClock = 'w';
  achievements = JSON.parse(localStorage.getItem('ck_achievements') || '[]');
  engineReady = true;
  
  renderBoard();
  renderAnalysisPanel();
  updateStatus(`Puzzle: ${currentPuzzle.name} — Find the best move!`);
  
  const wEl = document.getElementById('arena-clock-white');
  const bEl = document.getElementById('arena-clock-black');
  if (wEl) wEl.textContent = '∞';
  if (bEl) bEl.textContent = '∞';
  const wWrap = document.getElementById('arena-clock-white-wrap');
  const bWrap = document.getElementById('arena-clock-black-wrap');
  if (wWrap) wWrap.classList.remove('active');
  if (bWrap) bWrap.classList.remove('active');

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
    // Deprecated: analysis is now continuously updated by async getEvalForPosition
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
