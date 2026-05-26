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

  const DIFFICULTY_DEPTH = { Beginner: 3, Intermediate: 8, Advanced: 14, Expert: 20 };
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

    const depthLevels = { Beginner: 3, Intermediate: 8, Advanced: 14, Expert: 20 };
    const engineDepth = depthLevels[currentDifficulty] || 8;

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
      // Fallback: Use built-in Pure JS Negamax Engine instead of random moves!
      if (window.CK && CK.enginePlay) {
        const jsDepths = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };
        const jsDepth = jsDepths[currentDifficulty] || 2;
        const bestMoveObj = CK.enginePlay.getBestMove(game, jsDepth);
        if (bestMoveObj) {
          makeAIMove(bestMoveObj.from + bestMoveObj.to + (bestMoveObj.promotion || ''));
          return;
        }
      }
      // Ultimate fallback: completely random move
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

  /* ──────────────────────────────────────────────────────────────────
     Certificate flow — REDESIGN (2026-05-26)
     ──────────────────────────────────────────────────────────────────
     Two-phase: (1) ask for player name in a clean prompt, (2) render
     the finalized certificate with the name baked in, the difficulty
     level shown prominently, and a knight as the verification mark.
     ────────────────────────────────────────────────────────────────── */
  const _certEscape = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Inline knight SVG (used as both the central crest and the
  // verification seal — single source of truth, scaled via viewBox).
  const _certKnightSVG = `
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="ckKnightGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stop-color="#fcf3a3"/>
          <stop offset="40%" stop-color="#d4af37"/>
          <stop offset="100%" stop-color="#8a6a1f"/>
        </linearGradient>
      </defs>
      <!-- stylised knight silhouette -->
      <path fill="url(#ckKnightGold)" stroke="#7a5a1b" stroke-width="1.2" stroke-linejoin="round"
        d="M22 54 L42 54 L44 50 L44 46 C 48 44 50 40 50 34 C 50 26 46 18 38 14
L37 10 L33 12 L31 9 L26 14 C 20 18 16 22 16 28 C 16 30 17 32 19 33
           L17 36 L22 38 L20 42 L24 42 L22 46 Z"/>
      <!-- eye -->
      <circle cx="36" cy="22" r="1.6" fill="#1a1a1a"/>
      <!-- mane stroke -->
      <path d="M30 14 C 28 18 26 22 24 26" stroke="#7a5a1b" stroke-width="1" fill="none"/>
    </svg>
  `;

  // Display name for the difficulty level + colour theme
  const _certLevelTheme = (lvl) => {
    const map = {
      Beginner:     { label: 'Beginner',     color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  border: '#22c55e' },
      Intermediate: { label: 'Intermediate', color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', border: '#3b82f6' },
      Advanced:     { label: 'Advanced',     color: '#a855f7', bg: 'rgba(168,85,247,0.10)', border: '#a855f7' },
      Expert:       { label: 'Expert',       color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: '#ef4444' },
    };
    return map[lvl] || map.Intermediate;
  };

  // Phase 1 — ask the player for their name and age. Resolves with { name, age } or null.
  A._askPlayerNameAndAge = () => new Promise((resolve) => {
    const overlay = document.getElementById('cert-overlay');
    if (!overlay) return resolve(null);
    const savedName = localStorage.getItem('ck_player_name') || '';
    const savedAge = localStorage.getItem('ck_player_age') || '';
    overlay.innerHTML = `
      <div class="cert-prompt-card" role="dialog" aria-label="Enter your details">
        <div class="cert-prompt-knight">${_certKnightSVG}</div>
        <h2 class="cert-prompt-title">Almost There!</h2>
        <p class="cert-prompt-sub">Enter your details to generate your Chess Completion Certificate.</p>
        
        <input type="text" id="cert-prompt-input-name" class="cert-prompt-input"
               placeholder="Your Name (e.g. Aarav Sharma)" maxlength="40"
               value="${_certEscape(savedName)}" autocomplete="off" />
               
        <input type="number" id="cert-prompt-input-age" class="cert-prompt-input"
               placeholder="Age (e.g. 10)" min="3" max="120"
               value="${_certEscape(savedAge)}" autocomplete="off" />

        <div class="cert-prompt-hint">Your name and age will be displayed elegantly on the official diploma.</div>
        <div class="cert-prompt-actions">
          <button class="cert-prompt-btn cert-prompt-btn-cancel" id="cert-prompt-cancel">Cancel</button>
          <button class="cert-prompt-btn cert-prompt-btn-ok" id="cert-prompt-ok">Continue →</button>
        </div>
      </div>
    `;
    overlay.classList.add('active');

    const nameInput = document.getElementById('cert-prompt-input-name');
    const ageInput = document.getElementById('cert-prompt-input-age');
    setTimeout(() => { try { nameInput && nameInput.focus(); } catch(e){} }, 60);

    const finish = (name, age) => {
      try {
        localStorage.setItem('ck_player_name', name);
        localStorage.setItem('ck_player_age', age);
      } catch(e){}
      resolve({ name, age });
    };

    document.getElementById('cert-prompt-cancel').onclick = () => {
      overlay.classList.remove('active');
      overlay.innerHTML = '';
      resolve(null);
    };

    document.getElementById('cert-prompt-ok').onclick = () => {
      const nameVal = (nameInput && nameInput.value || '').trim();
      const ageVal = (ageInput && ageInput.value || '').trim();
      
      let hasError = false;
      if (!nameVal) {
        nameInput.classList.add('cert-prompt-input-error');
        setTimeout(() => nameInput.classList.remove('cert-prompt-input-error'), 600);
        hasError = true;
      }
      if (!ageVal || isNaN(ageVal) || parseInt(ageVal) < 3) {
        ageInput.classList.add('cert-prompt-input-error');
        setTimeout(() => ageInput.classList.remove('cert-prompt-input-error'), 600);
        hasError = true;
      }

      if (hasError) {
        if (!nameVal) nameInput.focus();
        else ageInput.focus();
        return;
      }

      finish(nameVal, ageVal);
    };

    const handleKey = (e) => {
      if (e.key === 'Enter') document.getElementById('cert-prompt-ok').click();
      if (e.key === 'Escape') document.getElementById('cert-prompt-cancel').click();
    };

    if (nameInput) nameInput.addEventListener('keydown', handleKey);
    if (ageInput) ageInput.addEventListener('keydown', handleKey);
  });

  // Phase 2 — render the finalized certificate using the supplied name and age.
  A._renderCertificate = (playerName, playerAge, result, grade, accuracy) => {
    const overlay = document.getElementById('cert-overlay');
    if (!overlay) return;

    const now = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const certId = 'CK-' + now.getFullYear() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const isWin = result === 'win';
    const titleText = 'Certificate of Completion';
    
    // Choose dynamic Achievement Badge Text
    let badgeText = 'Strategic Thinker';
    if (result === 'win') {
      if (grade === 'S' || grade === 'A') {
        badgeText = 'AI Arena Champion';
      } else {
        badgeText = 'Strategic Thinker';
      }
    } else {
      if (currentDifficulty === 'Expert' || currentDifficulty === 'Advanced') {
        badgeText = 'Rising Grandmaster';
      } else {
        badgeText = 'Brilliant Performance';
      }
    }

    // Dynamic level tiers
    let levelTier = 'Intermediate AI – Knight Tier';
    if (currentDifficulty === 'Beginner') levelTier = 'Beginner AI – Pawn Tier';
    else if (currentDifficulty === 'Intermediate') levelTier = 'Intermediate AI – Knight Tier';
    else if (currentDifficulty === 'Advanced') levelTier = 'Advanced AI – Rook Tier';
    else if (currentDifficulty === 'Expert') levelTier = 'Expert AI – Grandmaster Tier';

    // Dynamic completion time
    const duration = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 900; // default 15min
    const durationMin = Math.floor(duration / 60);
    const durationSec = duration % 60;
    const timeStr = `${durationMin} Minutes ${durationSec} Seconds`;

    // Dynamic result text
    let resultText = 'Victory Against AI Opponent';
    if (result === 'win') resultText = 'Victory Against AI Opponent';
    else if (result === 'draw') resultText = 'Draw Against AI Opponent';
    else resultText = 'Match Played vs AI Opponent';

    const gradeColor = grade === 'S' ? '#fbbf24'
                     : grade === 'A' ? '#a78bfa'
                     : grade === 'B' ? '#38bdf8'
                     : grade === 'C' ? '#4ade80' : '#f87171';
    const level = _certLevelTheme(currentDifficulty);

    // Build Move History Table rows
    let movesHtml = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
      const whiteMove = moveHistory[i] ? moveHistory[i].san : '';
      const blackMove = moveHistory[i + 1] ? moveHistory[i + 1].san : '';
      const moveNum = Math.floor(i / 2) + 1;
      movesHtml += `
        <tr>
          <td>${moveNum}</td>
          <td>${whiteMove}</td>
          <td>${blackMove}</td>
        </tr>
      `;
    }

    // Badge SVG (trophy icon) inside the rosette
    const badgeIconSVG = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:28px; height:28px; color:#fff; filter:drop-shadow(0px 1px 2px rgba(0,0,0,0.25));">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/>
        <path d="M12 2a6 6 0 0 0-6 6v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V8a6 6 0 0 0-6-6z"/>
      </svg>
    `;

    overlay.innerHTML = `
      <div class="cert-card-v2" id="cert-card">
        <!-- Decorative double-line frame -->
        <div class="cert-frame-outer"></div>
        <div class="cert-frame-inner"></div>
        <div class="cert-inner-border"></div>
        <!-- Subtle watermark knight in the centre -->
        <div class="cert-watermark">${_certKnightSVG}</div>

        <!-- Knight emblem above title -->
        <div class="cert-crest-wrap">
          <div class="cert-crest">${_certKnightSVG}</div>
        </div>

        <!-- Title block -->
        <div class="cert-title-block">
          <span class="cert-title-completion">Certificate of Completion</span>
          <div class="cert-eyebrow">— This certificate is proudly awarded to —</div>
        </div>

        <!-- Move History Table (top-right absolute) -->
        <div class="cert-moves-table-wrap">
          <div class="cert-moves-table-title">Complete Match Move History</div>
          <div class="cert-moves-table-scroll">
            <table class="cert-moves-table">
              <thead>
                <tr>
                  <th>Move</th>
                  <th>White</th>
                  <th>Black</th>
                </tr>
              </thead>
              <tbody>
                ${movesHtml || '<tr><td colspan="3">No moves recorded</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Awardee block -->
        <div class="cert-awardee">
          <div class="cert-awardee-name">${_certEscape(playerName)}</div>
          <div class="cert-awardee-age">Age: ${_certEscape(playerAge)} Years Old</div>
          <div class="cert-awardee-line"></div>
          <p class="cert-citation">
            for successfully completing an AI Arena chess match in ChessKiddo and demonstrating strategic thinking, focus, and determination.
          </p>
        </div>

        <!-- Stats row -->
        <div class="cert-stats-v2">
          <div class="cert-stat">
            <div class="cert-stat-icon">🏆</div>
            <div class="cert-stat-cap">Level Played</div>
            <div class="cert-stat-num">${levelTier}</div>
          </div>
          <div class="cert-stat">
            <div class="cert-stat-icon">🎯</div>
            <div class="cert-stat-cap">Time Taken</div>
            <div class="cert-stat-num">${timeStr}</div>
          </div>
          <div class="cert-stat">
            <div class="cert-stat-icon">⚡</div>
            <div class="cert-stat-cap">Match Result</div>
            <div class="cert-stat-num">${resultText}</div>
          </div>
          <div class="cert-stat">
            <div class="cert-stat-icon">📅</div>
            <div class="cert-stat-cap">Date Completed</div>
            <div class="cert-stat-num cert-stat-date">${dateStr}</div>
          </div>
        </div>

        <!-- Footer with verification seal + signatures -->
        <footer class="cert-footer-v2">
          <!-- Left Signature: AI Coach -->
          <div class="cert-sig">
            <div class="cert-sig-img cert-sig-coach">Tom AI</div>
            <div class="cert-sig-line"></div>
            <div class="cert-sig-role">AI Coach</div>
            <div class="cert-sig-org">ChessKiddo AI Training System</div>
          </div>
          
          <!-- Center: Achievement Rosette Badge -->
          <div class="cert-badge-rosette">
            <div class="cert-badge-glow"></div>
            <div class="cert-badge-ribbon-l"></div>
            <div class="cert-badge-ribbon-r"></div>
            <div class="cert-badge-circle">
              ${badgeIconSVG}
            </div>
            <div class="cert-badge-text-label">${badgeText}</div>
          </div>
          
          <!-- Right Signature: Director -->
          <div class="cert-sig">
            <div class="cert-sig-img cert-sig-director">Ranjth A S</div>
            <div class="cert-sig-line"></div>
            <div class="cert-sig-role">Director</div>
            <div class="cert-sig-org">ChessKidoo Academy Director</div>
          </div>
        </footer>
        
        <div class="cert-tagline">
          <span class="cert-tagline-star">★</span> Building Brilliance Through Chess and AI <span class="cert-tagline-star">★</span>
        </div>
      </div>

      <div class="cert-action-bar">
        <button class="cert-action-btn btn-secondary" onclick="CK.arena.closeCertificate()">Close</button>
        <button class="cert-action-btn btn-tertiary"  onclick="CK.arena.changeCertName()">✎ Change Details</button>
        <button class="cert-action-btn btn-primary"   onclick="CK.arena.printCertificate()">📥 Download Certificate</button>
      </div>
    `;
    overlay.classList.add('active');
    A._lastCertCtx = { result, grade, accuracy };
  };

  // Public entry — orchestrates prompt → preview.
  A.showCertificate = async (result, grade, gradeClass, accuracy) => {
    const details = await A._askPlayerNameAndAge();
    if (!details) {
      const overlay = document.getElementById('cert-overlay');
      if (overlay) { overlay.classList.remove('active'); overlay.innerHTML = ''; }
      return;
    }
    A._renderCertificate(details.name, details.age, result, grade, accuracy);
  };

  // "Change Name" button on the rendered cert — re-runs the prompt.
  A.changeCertName = async () => {
    const ctx = A._lastCertCtx;
    if (!ctx) return;
    const details = await A._askPlayerNameAndAge();
    if (!details) {
      // If the user cancels, restore the previous certificate instead of closing
      const last = localStorage.getItem('ck_player_name') || '';
      const lastAge = localStorage.getItem('ck_player_age') || '';
      if (last && lastAge) A._renderCertificate(last, lastAge, ctx.result, ctx.grade, ctx.accuracy);
      return;
    }
    A._renderCertificate(details.name, details.age, ctx.result, ctx.grade, ctx.accuracy);
  };

  A.closeReport = () => {
    const overlay = document.getElementById('arena-report-overlay');
    if (overlay) overlay.classList.remove('active');
  };

  A.playAgain = () => {
    A.closeReport();
    setTimeout(() => A.init(), 200);
  };

  // Download certificate as PNG (mobile-safe). Falls back to a print window
  // if html2canvas isn't loaded yet.
  A.printCertificate = async () => {
    const card = document.getElementById('cert-card');
    if (!card) return;

    const nameText = card.querySelector('.cert-awardee-name')?.textContent || 'Champion';

    // Mobile/capture override styling (lock design dimensions to render canvas perfectly)
    const restoreCard = card.getAttribute('style') || '';
    
    card.style.setProperty('width', '880px', 'important');
    card.style.setProperty('max-width', '880px', 'important');
    card.style.setProperty('min-width', '880px', 'important');
    card.style.setProperty('transform', 'none', 'important');

    if (typeof window.html2canvas === 'function') {
      try {
        CK.showToast('📸 Rendering certificate…', 'info');
        // Give layout a frame to settle at the new width before capturing
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const canvas = await window.html2canvas(card, {
          backgroundColor: '#fffdf6',
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          width: 880,
          height: card.offsetHeight,
          windowWidth: 1200
        });
        const safeName = nameText.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Champion';
        canvas.toBlob((blob) => {
          card.setAttribute('style', restoreCard);
          if (!blob) {
            CK.showToast('Could not generate image, opening print view…', 'warning');
            A._printCertificateFallback();
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ChessKidoo-Certificate-${safeName}.png`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 300);
          CK.showToast('✅ Certificate downloaded!', 'success');
        }, 'image/png');
        return;
      } catch (err) {
        console.warn('[Arena] html2canvas capture failed, falling back to print:', err);
      }
    }
    card.setAttribute('style', restoreCard);
    A._printCertificateFallback();
  };

  // Fallback when html2canvas is unavailable / capture fails. Opens a print
  // window (may be blocked by popup blockers on some browsers).
  A._printCertificateFallback = () => {
    const certHtml = document.getElementById('cert-card');
    if (!certHtml) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { CK.showToast('Please allow popups to print the certificate.', 'warning'); return; }
    const doc = printWindow.document;
    doc.open();
    doc.write(`<html><head><title>ChessKidoo Certificate</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500;1,700&family=Montserrat:wght@400;500;600;700&family=Poppins:wght@600;800&family=Great+Vibes&family=Alex+Brush&display=swap');
      @page { size: landscape; margin: 0; }
      body {
        font-family: 'Montserrat', sans-serif;
        margin: 0;
        padding: 40px;
        background: #fffcf5;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .cert-card-v2 {
        background: linear-gradient(145deg, #fffdf6 0%, #fef9e7 40%, #fdf3d0 100%);
        border-radius: 8px;
        position: relative;
        width: 880px;
        min-height: 560px;
        box-sizing: border-box;
        text-align: center;
        border: 3px solid #c5983a;
        padding: 40px 52px 32px;
        font-family: 'Montserrat', sans-serif;
        color: #1a1a1a;
        box-shadow: none;
      }
      .cert-card-v2::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: 
          linear-gradient(rgba(197, 152, 58, 0.016) 1px, transparent 1px), 
          linear-gradient(90deg, rgba(197, 152, 58, 0.016) 1px, transparent 1px);
        background-size: 44px 44px;
        pointer-events: none;
        z-index: 0;
      }
      .cert-frame-outer::before,
      .cert-frame-outer::after,
      .cert-frame-inner::before,
      .cert-frame-inner::after {
        content: '';
        position: absolute;
        width: 90px;
        height: 90px;
        border: 3px solid #c5983a;
        pointer-events: none;
      }
      .cert-frame-outer::before { top: 8px; left: 8px; border-right: none; border-bottom: none; border-radius: 6px 0 0 0; }
      .cert-frame-outer::after  { top: 8px; right: 8px; border-left: none; border-bottom: none; border-radius: 0 6px 0 0; }
      .cert-frame-inner::before { bottom: 8px; left: 8px; border-right: none; border-top: none; border-radius: 0 0 0 6px; }
      .cert-frame-inner::after  { bottom: 8px; right: 8px; border-left: none; border-top: none; border-radius: 0 0 6px 0; }
      .cert-inner-border {
        position: absolute;
        inset: 14px;
        border: 1.5px solid rgba(197,152,58,0.35);
        border-radius: 4px;
        pointer-events: none;
      }
      .cert-watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0.04;
        pointer-events: none;
      }
      .cert-watermark svg { width: 300px; height: 300px; }
      .cert-crest-wrap {
        display: flex;
        justify-content: flex-start;
        margin-bottom: 8px;
        position: relative;
        z-index: 2;
        width: 100%;
      }
      .cert-crest {
        width: 72px;
        height: 72px;
        filter: drop-shadow(0 4px 10px rgba(197,152,58,0.25));
      }
      .cert-crest svg { width: 100%; height: 100%; }
      .cert-title-completion {
        font-family: 'Cinzel', serif;
        font-size: 2.15rem;
        font-weight: 900;
        background: linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-shadow: 1px 1px 1px rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.15);
        margin: 4px 0 12px;
        letter-spacing: 2px;
        text-transform: uppercase;
        line-height: 1.1;
        display: block;
        text-align: left;
      }
      .cert-title-block { margin: 8px 0 4px; }
      .cert-eyebrow { font-family: 'Cinzel', serif; font-size: 0.75rem; font-weight: 600; color: #94a3b8; letter-spacing: 3px; text-transform: uppercase; text-align: left; }
      .cert-moves-table-wrap {
        position: absolute;
        top: 20px;
        right: 24px;
        background: #fff;
        border: 1.5px solid #c5983a;
        border-radius: 6px;
        overflow: hidden;
        max-height: 280px;
        width: 200px;
      }
      .cert-moves-table-title {
        background: linear-gradient(135deg, #1a365d, #1e3a5f);
        color: #fff;
        font-size: 0.6rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        padding: 6px 10px;
        text-align: center;
      }
      .cert-moves-table-scroll { max-height: 250px; overflow-y: auto; }
      .cert-moves-table { width: 100%; border-collapse: collapse; font-size: 0.65rem; }
      .cert-moves-table th { background: #f8f4e8; color: #64748b; font-weight: 700; padding: 4px 6px; text-transform: uppercase; font-size: 0.58rem; border-bottom: 1px solid #e8dfc0; }
      .cert-moves-table td { padding: 3px 6px; text-align: center; border-bottom: 1px solid #f0ead6; color: #334155; font-weight: 500; font-family: monospace; }
      .cert-moves-table tr:nth-child(even) td { background: #fefcf5; }
      .cert-awardee { margin: 12px 0 8px; text-align: left; }
      .cert-awardee-name { font-family: 'Cormorant Garamond', serif; font-size: 2.8rem; font-weight: 700; font-style: italic; color: #1a1a1a; margin-bottom: 2px; }
      .cert-awardee-age { font-size: 0.85rem; color: #64748b; font-weight: 600; margin-bottom: 6px; }
      .cert-awardee-line { width: 140px; height: 2px; background: #c5983a; margin: 0 0 12px; }
      .cert-citation { font-family: 'Cormorant Garamond', serif; font-size: 1rem; font-style: italic; line-height: 1.6; color: #444; max-width: 520px; margin: 0; }
      .cert-stats-v2 { display: flex; justify-content: center; margin: 20px 0; max-width: 600px; border: 1.5px solid #d4c48a; border-radius: 8px; overflow: hidden; background: #fff; }
      .cert-stat { flex: 1; padding: 10px; text-align: center; border-right: 1px solid #e8dfc0; }
      .cert-stat:last-child { border-right: none; }
      .cert-stat-icon { font-size: 1.2rem; margin-bottom: 2px; }
      .cert-stat-cap { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; }
      .cert-stat-num { font-size: 0.95rem; font-weight: 700; color: #1a365d; }
      .cert-footer-v2 { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 24px; padding: 0 16px; width: 600px; }
      .cert-sig { display: flex; flex-direction: column; align-items: center; min-width: 140px; flex: 1; }
      .cert-sig-img {
        font-size: 2.2rem;
        font-weight: 400;
        color: #1e3a8a;
        margin-bottom: -12px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        width: 100%;
      }
      .cert-sig-coach { font-family: 'Alex Brush', cursive; transform: rotate(-3deg); opacity: 0.9; }
      .cert-sig-director { font-family: 'Great Vibes', cursive; transform: rotate(-1.5deg); opacity: 0.95; }
      .cert-sig-line { width: 100%; height: 1.5px; background: #c5983a; margin: 4px 0; }
      .cert-sig-role { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: #c5983a; }
      .cert-sig-org { font-size: 0.58rem; color: #94a3b8; }
      
      /* Rosette */
      .cert-badge-rosette { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 90px; height: 110px; margin-bottom: -15px; flex-shrink: 0; }
      .cert-badge-glow { position: absolute; width: 76px; height: 76px; background: radial-gradient(circle, rgba(246, 196, 90, 0.2) 0%, transparent 70%); z-index: 1; }
      .cert-badge-ribbon-l, .cert-badge-ribbon-r { position: absolute; bottom: 8px; width: 14px; height: 38px; background: #bf953f; z-index: 1; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%); }
      .cert-badge-ribbon-l { left: 28px; transform: rotate(12deg); }
      .cert-badge-ribbon-r { right: 28px; transform: rotate(-12deg); }
      .cert-badge-circle { position: relative; width: 58px; height: 58px; background: radial-gradient(circle at 35% 35%, #fff1c7 0%, #e8c366 30%, #c5983a 70%, #996e1b 100%); border-radius: 50%; z-index: 2; box-shadow: 0 4px 15px rgba(153,110,27,0.3), inset 0 1px 2px rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; border: 1.5px solid rgba(255,255,255,0.4); }
      .cert-badge-text-label { font-size: 0.52rem; font-weight: 800; text-transform: uppercase; color: #c5983a; letter-spacing: 0.5px; margin-top: 6px; z-index: 2; text-align: center; max-width: 110px; line-height: 1.25; }
      
      .cert-tagline { margin-top: 16px; font-size: 0.72rem; color: #94a3b8; font-style: italic; display: flex; align-items: center; justify-content: center; gap: 8px; width: 600px; }
      .cert-tagline-star { color: #c5983a; }
    </style></head><body>
      ${certHtml.outerHTML}
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
