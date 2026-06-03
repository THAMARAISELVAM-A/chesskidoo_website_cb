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

  /* ─── Coach commentary phrase banks ───────────────────────────────────
     Each coach gets multiple variants per event so commentary doesn't
     repeat every move. Picked at random via _coachPhrase().            */
  const _COACH_PHRASES = {
    magnus: {
      greeting:    ["Hello! Let's play a careful, accurate match.", "Welcome. Think carefully before each move.", "Position over flash — let's see precise play."],
      brilliant:   ["Brilliant! That's a Grandmaster-level idea.", "Outstanding — only one move worked there.", "Excellent! A truly precise tactical decision."],
      best:        ["A solid, accurate choice.", "That's the top engine pick.", "Precise — keeps your edge intact."],
      excellent:   ["Very good move.", "Nicely played.", "Sound choice."],
      good:        ["A reasonable move.", "OK — keep an eye on the structure.", "Decent. Watch for tactics."],
      inaccuracy:  ["Slight inaccuracy — there was something stronger.", "Hmm, not the cleanest. Stay focused.", "Could be sharper — find the principled move."],
      mistake:     ["That's a mistake — be careful.", "Mistake. Slow down and check threats.", "Not ideal — your opponent gets chances now."],
      blunder:     ["Blunder! Positional weaknesses get punished.", "Big mistake — careful with your pieces.", "Ouch. That drops material."],
      engineCapture: ["I'll take that.", "Material wins games — I'm grabbing this.", "Capture incoming."],
      engineCheck:   ["Check.", "Pressure on the king.", "You'll need to deal with this."],
      engineQuiet:   ["I'll consolidate here.", "Quietly improving.", "Maintaining the pressure."],
      yourCapture:   ["Good — material is the simplest plan.", "Capture noted.", "Take. Now coordinate the rest."],
      yourCheck:     ["Check — make sure it has a follow-up.", "Check! Useful or premature?", "Check — what follows matters."],
      yourCastle:    ["Smart — king safety first.", "Castled. Now activate the rook.", "Good — your king is tucked away."],
      yourPromotion: ["Promotion! A new queen joins the fight.", "Excellent — promote and finish.", "Convert carefully now."],
      win:           ["Checkmate! Well played.", "Mate! You played accurately.", "Convincing finish — good game."],
      loss:          ["That is checkmate. Study the endgames.", "Mate. Review where it slipped.", "Good fight — work on the critical moments."],
      draw:          ["A fair draw. The position simply balances.", "Drawn — neither side broke through.", "Draw. A solid result."],
      hint:          ["Try to find a better move here.", "Look one ply deeper.", "Step back — what's the principled move?"],
    },
    tal: {
      greeting:   ["Prepare for complications!", "Let the storm begin!", "Calm chess is boring chess!"],
      brilliant:  ["Beautiful! A sacrifice worthy of Riga!", "Magnificent! Tactical wizardry!", "Brilliant! That's how chess should be played!"],
      best:       ["Correct — but where's the fire?", "Solid. I'd have sacrificed something.", "Accurate, yet a touch dull."],
      excellent:  ["Sharp!", "Energetic — I like it!", "Good attacking idea!"],
      good:       ["Hmm — playable but tame.", "OK, but the position screams for attack!", "Reasonable… for now."],
      inaccuracy: ["Hesitation! Seize the initiative!", "A timid move — chess punishes hesitation!", "Less safety, more boldness!"],
      mistake:    ["A misstep! Calculate the storm!", "Careful! Tactics await!", "Mistake — and I'll find the tactic!"],
      blunder:    ["Ah! A blunder! Now I attack!", "You gave me a target — magnificent!", "Disaster! Now the fireworks begin!"],
      engineCapture: ["Grabbing this — material for the attack!", "Snap! Mine now.", "Take — and then attack!"],
      engineCheck:   ["Check — and there's more!", "Check! The king is exposed!", "Feel the pressure!"],
      engineQuiet:   ["Building the attack!", "Pieces converge!", "Patience — the sacrifice comes!"],
      yourCapture:   ["A capture! Now press!", "Material taken — keep the fire!", "Take! And then the storm!"],
      yourCheck:     ["Check! Yes — keep the tempo!", "Check — pressure!", "Keep the king nervous!"],
      yourCastle:    ["Castled? In MY game? Surely you jest!", "Safety move — but the attack is coming!", "Tucked away — for now."],
      yourPromotion: ["Promotion! A new queen for the storm!", "Promote — and attack!", "A new queen! Devastating!"],
      win:           ["Yes, mate! What a wild battle!", "Mate! Magnificent!", "Checkmate — what a fight!"],
      loss:          ["Magnificent! You attacked brilliantly!", "Bravo! You out-attacked the attacker!", "Defeated by your fire!"],
      draw:          ["A draw? Where was the sacrifice?!", "Drawn — but the play was electric!", "Honourable draw."],
      hint:          ["Look for the sacrifice!", "What if you give up material?", "Find the combination!"],
    },
    petrosian: {
      greeting:    ["Welcome. Safety is the key.", "Let us build a secure position.", "Prophylaxis before all else."],
      brilliant:   ["Impressive prophylaxis — all escape squares covered.", "A truly defensive masterstroke.", "Iron technique."],
      best:        ["The most prudent choice.", "Safety first — well chosen.", "Solid and unbreakable."],
      excellent:   ["Good prophylaxis.", "Sound move.", "You secured the position."],
      good:        ["Reasonable — but mind the loose pieces.", "OK — keep the fortress strong.", "Decent. Watch the weak squares."],
      inaccuracy:  ["A small leak in the defence.", "Careful — weak squares exposed.", "Imprecise — strengthen the structure."],
      mistake:     ["Careful! You left a piece undefended.", "Mistake — fix the weakness.", "Your perimeter is breached."],
      blunder:     ["A serious lapse! Patch the defence!", "Blunder — your fortress crumbles!", "Now I have a clear target."],
      engineCapture: ["Cautious capture.", "Calculated take.", "I exchange — simplify the position."],
      engineCheck:   ["A small check, nothing dramatic.", "Check — to improve my position.", "Check — testing your defence."],
      engineQuiet:   ["I improve my pieces slowly.", "Defensive consolidation.", "Patience — every move counts."],
      yourCapture:   ["Capture noted — simplify.", "Trade if it favours your structure.", "Fewer pieces, fewer threats."],
      yourCheck:     ["Check — but does it improve your position?", "Check — must serve a purpose.", "Check noted."],
      yourCastle:    ["Excellent — king safety is paramount!", "Castled. Now the fortress is whole.", "Good — your king is secure."],
      yourPromotion: ["Patient play rewarded with a queen.", "Promotion — convert calmly.", "A new queen — now consolidate."],
      win:           ["Checkmate. The fortress holds.", "Mate. Inevitable.", "Defence converted to attack."],
      loss:          ["Congratulations. You found a crack.", "Mate. You broke through cleanly.", "Defence was not enough today."],
      draw:          ["A draw — the natural result.", "Balanced play, balanced result.", "Drawn. Both fortresses held."],
      hint:          ["Look for the defensive resource.", "Find the prophylactic move.", "What does your opponent want? Stop it first."],
    },
    beth: {
      greeting:   ["Let's see what you've got.", "I'm playing to win.", "Bring your A-game."],
      brilliant:  ["Wow, impressive — sharp tactic!", "Brilliant — Beth-approved!", "Outstanding move!"],
      best:       ["Engine pick — clean.", "Solid choice.", "Sharp."],
      excellent:  ["Nice find.", "Good move.", "Crisp."],
      good:       ["Decent — I'd have looked deeper.", "OK move.", "Playable."],
      inaccuracy: ["You can do better.", "Slightly off.", "Hmm — try harder."],
      mistake:    ["That's a mistake. Did you miss the threat?", "Mistake noted.", "Sloppy."],
      blunder:    ["Bad blunder. Did you miss the threat?", "Big one — I'll capitalize.", "Ouch — material gone."],
      engineCapture: ["Snap it up.", "Take it — material wins.", "Capture."],
      engineCheck:   ["Check.", "Pressure!", "Don't ignore this check."],
      engineQuiet:   ["Quietly improving.", "Pressing the bind.", "Tactics brewing."],
      yourCapture:   ["Capture. Now follow through.", "Material won.", "Take — and convert."],
      yourCheck:     ["Check — calculate the consequences.", "Check — useful?", "Make it count."],
      yourCastle:    ["King tucked away.", "Castled — finally.", "Smart safety."],
      yourPromotion: ["Promote and convert.", "New queen!", "Crowning glory."],
      win:           ["Checkmate. Clean.", "Mate. Good try.", "Convincing."],
      loss:          ["Wow, you got me. Excellent.", "Sharp tactical play. Well done.", "Mate. You earned it."],
      draw:          ["A draw — surprising.", "Drawn. Even fight.", "Both sides held."],
      hint:          ["Look for the tactic.", "There's a sharp move here.", "Calculate forcing moves first."],
    },
  };

  // Pick a random variant from the coach's bank, with safe fallback.
  function _coachPhrase(coachId, key, fallback) {
    const coach = _COACH_PHRASES[coachId] || _COACH_PHRASES.magnus;
    const bank = coach[key];
    if (Array.isArray(bank) && bank.length) {
      return bank[Math.floor(Math.random() * bank.length)];
    }
    return fallback || '';
  }

  // Build commentary for a player move (classification + optional context).
  function _buildPlayerCommentary(moveData, classification) {
    const coachId = selectedCoachId || 'magnus';
    const parts = [];
    // Primary: classification verdict
    const verdict = _coachPhrase(coachId, classification);
    if (verdict) parts.push(verdict);
    // Secondary: contextual flavour (only sometimes, to avoid spam)
    const san = moveData && moveData.san || '';
    if (san === 'O-O' || san === 'O-O-O') {
      parts.push(_coachPhrase(coachId, 'yourCastle'));
    } else if (san.includes('=')) {
      parts.push(_coachPhrase(coachId, 'yourPromotion'));
    } else if (moveData && moveData.captured && Math.random() < 0.4) {
      parts.push(_coachPhrase(coachId, 'yourCapture'));
    } else if (san.includes('+') && Math.random() < 0.5) {
      parts.push(_coachPhrase(coachId, 'yourCheck'));
    }
    return parts.filter(Boolean).join(' ');
  }

  // Build commentary for an engine move (no classification — describe action).
  function _buildEngineCommentary(moveData) {
    const coachId = selectedCoachId || 'magnus';
    const san = moveData && moveData.san || '';
    if (moveData && moveData.captured) return _coachPhrase(coachId, 'engineCapture');
    if (san.includes('+')) return _coachPhrase(coachId, 'engineCheck');
    return _coachPhrase(coachId, 'engineQuiet');
  }

  // Public dispatcher used by all event sites.
  A.coachComment = (eventKind, ctx) => {
    ctx = ctx || {};
    let text = '';
    switch (eventKind) {
      case 'playerMove':
        text = _buildPlayerCommentary(ctx.move, ctx.classification);
        break;
      case 'engineMove':
        text = _buildEngineCommentary(ctx.move);
        break;
      case 'greeting':
      case 'win':
      case 'loss':
      case 'draw':
      case 'hint':
        text = _coachPhrase(selectedCoachId || 'magnus', eventKind);
        break;
      default:
        text = ctx.fallback || '';
    }
    if (text) A.speakCoach(text);
  };

  /* ─── Upgraded Audio System (Acoustic Physical Modeling) ─── */
  let audioCtx = null;
  A.initAudio = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  };

  A.playMoveSound = (isCapture = false) => {
    try {
      A.initAudio();
      if (!audioCtx) return;
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

  /* ─── Upgraded Audio Coach (Text-to-Speech) ─────────────────────────
     Always updates the visible commentary box immediately so the user
     sees the latest message even if TTS is off. TTS itself is throttled
     so rapid consecutive moves don't queue an avalanche of speech. */
  let _coachLastSpeakAt = 0;
  let _coachPendingTimer = null;
  const COACH_SPEAK_THROTTLE_MS = 1100;

  A.speakCoach = (text) => {
    if (!text) return;

    // 1. UI box update — always runs, even when TTS disabled.
    const commentaryEl = document.getElementById('arena-coach-commentary-text');
    if (commentaryEl) {
      commentaryEl.textContent = text;
      // Subtle flash animation to draw the eye to the new message.
      commentaryEl.classList.remove('coach-flash');
      // Force reflow to restart the CSS animation.
      void commentaryEl.offsetWidth;
      commentaryEl.classList.add('coach-flash');
    }

    if (!audioCoachEnabled || !window.speechSynthesis) return;

    // 2. Throttle TTS so quick consecutive moves don't pile up.
    const now = Date.now();
    const sinceLast = now - _coachLastSpeakAt;
    if (sinceLast < COACH_SPEAK_THROTTLE_MS) {
      if (_coachPendingTimer) clearTimeout(_coachPendingTimer);
      _coachPendingTimer = setTimeout(() => {
        _coachPendingTimer = null;
        A.speakCoach(text); // re-enter with throttle window now open
      }, COACH_SPEAK_THROTTLE_MS - sinceLast);
      return;
    }
    _coachLastSpeakAt = now;

    try {
      window.speechSynthesis.cancel();
      const coach = COACHES[selectedCoachId] || COACHES.magnus;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = coach.voicePitch || 1.0;
      utterance.rate  = coach.voiceRate  || 1.0;
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
    coachMode = localStorage.getItem('ck_coach_mode') === 'true';
    audioCoachEnabled = localStorage.getItem('ck_audio_coach') === 'true';
    threatMapEnabled = localStorage.getItem('ck_threat_map') === 'true';
    safetyRadarEnabled = localStorage.getItem('ck_safety_radar') === 'true';
    selectedCoachId = localStorage.getItem('ck_selected_coach_id') || 'magnus';
    currentDifficulty = localStorage.getItem('ck_difficulty') || 'Intermediate';
    
    // Sync UI elements
    const cEl = document.getElementById('arena-coach-mode');
    const acEl = document.getElementById('arena-audio-coach');
    const tmEl = document.getElementById('arena-threat-map');
    const srEl = document.getElementById('arena-safety-radar');
    if (cEl) cEl.checked = coachMode;
    if (acEl) acEl.checked = audioCoachEnabled;
    if (tmEl) tmEl.checked = threatMapEnabled;
    if (srEl) srEl.checked = safetyRadarEnabled;

    document.querySelectorAll('.diff-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.level === currentDifficulty);
    });

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
    
    // Speak coach greeting (pulled from the new phrase bank — varies)
    setTimeout(() => {
      A.coachComment('greeting');
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

        // Rank coordinate (8-1) on the left-most column (file === 0)
        if (file === 0) {
          const rankLabel = document.createElement('span');
          rankLabel.className = 'board-coord board-coord-rank';
          rankLabel.textContent = 8 - rank;
          sqEl.appendChild(rankLabel);
        }

        // File coordinate (a-h) on the bottom-most row (rank === 7)
        if (rank === 7) {
          const fileLabel = document.createElement('span');
          fileLabel.className = 'board-coord board-coord-file';
          fileLabel.textContent = String.fromCharCode(97 + file);
          sqEl.appendChild(fileLabel);
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
    // In Friend mode, BOTH colours are controlled by the player on this device.
    // In AI mode, only the player's own colour can move.
    if (A._gameMode !== 'friend' && game.turn() !== playerColor) return;

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

    // Commentary on EVERY classification (not just blunder/brilliant).
    // The dispatcher picks a random phrase from the active coach's bank
    // and adds context flavour for captures / checks / castling / promotion.
    if (evalObj && evalObj.classification) {
      A.coachComment('playerMove', {
        move: moveResult,
        classification: evalObj.classification
      });
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

    // Friend mode — DON'T summon the engine, just hand the turn over
    if (A._gameMode === 'friend') {
      isPlayerTurn = true;
      isThinking = false;
      const turnName = game.turn() === 'w' ? 'White' : 'Black';
      updateStatus(`${turnName} to move`);
      // Switch active clock to the other side
      activeClock = game.turn();
      lastTickTime = Date.now();
      // Also clear any pending engine state
      awaitingAIMove = false;
      return;
    }

    updateStatus('AI is thinking...');

    setTimeout(() => {
      requestAIMove();
    }, 100);
  }

  /* ─── AI Move ───────────────────────────────────────────────────────
     Per-difficulty configuration. Previously every level pulled from
     Lichess endgame tablebases (≤7 pieces, perfect play) and the
     Lichess Masters opening book regardless of level, so Beginner
     played perfect openings + endgames and felt as strong as Expert.
     Now each level only gets the external aids it deserves, plus a
     blunder/randomness layer at the lower levels so the engine
     actually feels weaker. */
  const DIFFICULTY_CONFIG = {
    Beginner:     { depth: 2,  useBook: false, bookUntilMove: 0,  useTablebase: false, tbMaxPieces: 0, blunderRate: 0.35, randomFallbackRate: 0.20 },
    Intermediate: { depth: 6,  useBook: true,  bookUntilMove: 4,  useTablebase: false, tbMaxPieces: 0, blunderRate: 0.12, randomFallbackRate: 0.05 },
    Advanced:     { depth: 12, useBook: true,  bookUntilMove: 8,  useTablebase: true,  tbMaxPieces: 4, blunderRate: 0.00, randomFallbackRate: 0.00 },
    Expert:       { depth: 18, useBook: true,  bookUntilMove: 12, useTablebase: true,  tbMaxPieces: 7, blunderRate: 0.00, randomFallbackRate: 0.00 },
  };

  async function requestAIMove() {
    if (isGameOver) return;

    const fen = game.fen();
    awaitingAIMove = true;

    const cfg = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.Intermediate;

    // 1. Endgame Tablebases — only Advanced/Expert, and only down to the
    //    configured piece count (Advanced ≤4-piece, Expert ≤7-piece).
    const pieceCount = fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;
    if (cfg.useTablebase && pieceCount <= cfg.tbMaxPieces) {
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

    // 2. Opening Book — only used until the difficulty's bookUntilMove.
    //    Beginner skips this entirely so it can't play perfect theory.
    const fullMoves = parseInt(fen.split(' ')[5]) || 0;
    if (cfg.useBook && fullMoves <= cfg.bookUntilMove) {
      updateStatus('🤖 Checking Master Openings…');
      try {
        const res = await fetch(`https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&moves=4`);
        if (res.ok) {
          const data = await res.json();
          if (data.moves && data.moves.length > 0) {
            // Intermediate widens the choice to include sub-optimal lines
            const breadth = currentDifficulty === 'Intermediate' ? 3
                          : currentDifficulty === 'Advanced'     ? 2 : 1;
            const topMoves = data.moves.slice(0, Math.max(1, breadth));
            const choice = topMoves[Math.floor(Math.random() * topMoves.length)];
            makeAIMove(choice.uci);
            return;
          }
        }
      } catch(e) {} // Silent fallback
    }

    updateStatus('🤖 Computer is thinking…');

    // Beginner-only: sometimes just play a random legal move. This is
    // what actually makes Beginner FEEL like a beginner — humans see
    // the engine pass up easy wins and miss obvious tactics.
    if (cfg.randomFallbackRate > 0 && Math.random() < cfg.randomFallbackRate) {
      const legalMoves = game.moves({ verbose: true });
      if (legalMoves.length > 0) {
        const r = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        makeAIMove(r.from + r.to + (r.promotion || ''));
        return;
      }
    }

    CK.engine.setDepth(cfg.depth);
    const result = await CK.engine.evaluateLocal(fen);

    if (result && result.pvs && result.pvs.length > 0) {
      let chosenMoveStr = result.pvs[0].pv.split(' ')[0]; // Balanced default

      // AI Personality Logic
      if (selectedCoachId !== 'magnus' && result.pvs.length > 1) {
        const topCp = result.pvs[0].cp !== null ? result.pvs[0].cp : (result.pvs[0].mate ? result.pvs[0].mate * 1000 : 0);
        let bestCandidate = result.pvs[0];
        let bestScore = -Infinity;

        const difficultyMargins = { Beginner: 150, Intermediate: 70, Advanced: 30, Expert: 10 };
        const maxCpMargin = difficultyMargins[currentDifficulty] || 70;

        for (let i = 0; i < result.pvs.length; i++) {
          const pvObj = result.pvs[i];
          const cp = pvObj.cp !== null ? pvObj.cp : (pvObj.mate ? pvObj.mate * 1000 : 0);
          
          if (Math.abs(topCp - cp) <= maxCpMargin) {
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

      // Beginner/Intermediate "blunder" layer — sometimes pick a clearly
      // worse PV from the engine's MultiPV output so the AI actually drops
      // material the player can punish. Skip on Advanced/Expert.
      if (cfg.blunderRate > 0 && result.pvs.length > 1 && Math.random() < cfg.blunderRate) {
        const worstPv = result.pvs[result.pvs.length - 1];
        if (worstPv && worstPv.pv) {
          chosenMoveStr = worstPv.pv.split(' ')[0];
        }
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

    // Coach reacts to the engine's move (capture / check / quiet).
    A.coachComment('engineMove', { move });
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

    // 3. Centipawn loss — but ONLY trust it if the engine actually evaluated both
    //    positions. If either eval is missing the diff is a meaningless 0, which
    //    used to be classified as "best" → fake 100%-accuracy / all-best reports.
    const analyzed = !!(resultBefore && resultAfter);
    const diff = evalBefore - playerEvalAfter;
    const classification = analyzed
      ? classifyFromDiff(diff, playerSan, resultBefore ? resultBefore.pv : null)
      : 'unanalyzed';

    const obj = {
      san: playerSan,
      classification,
      analyzed,
      eval: absoluteCp,
      diff: analyzed ? diff : null,
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
    // Only ANALYZED moves count toward accuracy — unanalyzed moves (engine
    // unavailable) must not inflate the score to a fake 100%.
    const analyzedCls = classifications.filter(c => c !== 'unanalyzed');
    let totalWeight = 0;
    analyzedCls.forEach(c => { totalWeight += (weights[c] != null ? weights[c] : 0.5); });
    const accuracy = analyzedCls.length > 0 ? Math.round((totalWeight / analyzedCls.length) * 100) : 0;

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

    // Cache game metrics for the certificate
    A._lastCertCtx = {
      result: result,
      grade: grade,
      accuracy: accuracy,
      difficulty: currentDifficulty,
      duration: duration,
      date: new Date(),
      moveHistory: JSON.parse(JSON.stringify(moveHistory))
    };

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
  const _certEscape = (s) => String(s === null || s === undefined ? '' : s)
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

    // Retrieve cached context or fallback to parameters/live-state
    const ctx = A._lastCertCtx || {
      result,
      grade,
      accuracy,
      difficulty: currentDifficulty,
      duration: gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 900,
      date: new Date(),
      moveHistory: JSON.parse(JSON.stringify(moveHistory))
    };

    const now = ctx.date || new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const certId = 'CK-' + now.getFullYear() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const isWin = ctx.result === 'win';
    const titleText = 'Certificate of Completion';
    
    // Choose dynamic Achievement Badge Text
    let badgeText = 'Strategic Thinker';
    if (ctx.result === 'win') {
      if (ctx.grade === 'S' || ctx.grade === 'A') {
        badgeText = 'AI Arena Champion';
      } else {
        badgeText = 'Strategic Thinker';
      }
    } else {
      if (ctx.difficulty === 'Expert' || ctx.difficulty === 'Advanced') {
        badgeText = 'Rising Grandmaster';
      } else {
        badgeText = 'Brilliant Performance';
      }
    }

    // Dynamic level tiers
    let levelTier = 'Intermediate AI – Knight Tier';
    if (ctx.difficulty === 'Beginner') levelTier = 'Beginner AI – Pawn Tier';
    else if (ctx.difficulty === 'Intermediate') levelTier = 'Intermediate AI – Knight Tier';
    else if (ctx.difficulty === 'Advanced') levelTier = 'Advanced AI – Rook Tier';
    else if (ctx.difficulty === 'Expert') levelTier = 'Expert AI – Grandmaster Tier';

    // Dynamic completion time
    const duration = ctx.duration;
    const durationMin = Math.floor(duration / 60);
    const durationSec = duration % 60;
    const timeStr = `${durationMin} Minutes ${durationSec} Seconds`;

    // Dynamic result text
    let resultText = 'Victory Against AI Opponent';
    if (ctx.result === 'win') resultText = 'Victory Against AI Opponent';
    else if (ctx.result === 'draw') resultText = 'Draw Against AI Opponent';
    else resultText = 'Match Played vs AI Opponent';

    const gradeColor = ctx.grade === 'S' ? '#fbbf24'
                     : ctx.grade === 'A' ? '#a78bfa'
                     : ctx.grade === 'B' ? '#38bdf8'
                     : ctx.grade === 'C' ? '#4ade80' : '#f87171';
    const level = _certLevelTheme(ctx.difficulty);

    // Build Move History Table rows
    let movesHtml = '';
    const certMoves = ctx.moveHistory || [];
    for (let i = 0; i < certMoves.length; i += 2) {
      const whiteMove = certMoves[i] ? certMoves[i].san : '';
      const blackMove = certMoves[i + 1] ? certMoves[i + 1].san : '';
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

    // ── Reusable inline SVGs that match the reference mockup ────────────
    // Ornate corner flourish (gold scrollwork) — 4 copies rotated at the corners
    const _certCornerFlourishSVG = `
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g fill="none" stroke="#c5983a" stroke-width="1.2" stroke-linecap="round">
          <path d="M0,40 Q20,30 35,15 Q45,5 60,0"/>
          <path d="M0,55 Q15,55 28,42 Q38,32 45,18"/>
          <path d="M0,72 Q10,75 22,68 Q33,62 38,50"/>
          <path d="M8,90 Q14,80 22,76 Q30,72 33,60"/>
          <circle cx="40" cy="10" r="2.2" fill="#c5983a"/>
          <circle cx="14" cy="60" r="1.8" fill="#c5983a"/>
          <circle cx="55" cy="3"  r="1.2" fill="#c5983a"/>
          <path d="M2,2 Q35,5 60,30" stroke-width="0.6" opacity="0.55"/>
        </g>
      </svg>
    `;
    // Knight-in-circle brand mark (matches the round logo emblem)
    const _certBrandKnight = `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#c5983a" stroke-width="3"/>
        <circle cx="50" cy="50" r="40" fill="#fbf8ee"/>
        <g transform="translate(18,16) scale(1.05)">${_certKnightSVG}</g>
      </svg>
    `;
    // Decorative center-divider flourish (line + gold ornament + line)
    const _certDividerFlourish = `
      <svg viewBox="0 0 300 22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <line x1="0"   y1="11" x2="120" y2="11" stroke="#c5983a" stroke-width="1"/>
        <line x1="180" y1="11" x2="300" y2="11" stroke="#c5983a" stroke-width="1"/>
        <g transform="translate(150,11)" stroke="#c5983a" fill="#c5983a">
          <circle r="3"/>
          <path d="M-22,0 Q-14,-7 -8,0 Q-14,7 -22,0 M22,0 Q14,-7 8,0 Q14,7 22,0" fill="#c5983a" stroke-width="0.7"/>
          <circle cx="-26" cy="0" r="1.4"/><circle cx="26" cy="0" r="1.4"/>
        </g>
      </svg>
    `;
    // Knight Ribbon Rosette (gold medal w/ blue ribbons hanging) — far-left + far-right of footer
    const _certRibbonRosette = `
      <svg viewBox="0 0 90 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Blue ribbon tails -->
        <path d="M30,68 L22,128 L42,118 L45,80 Z" fill="#1e3a8a"/>
        <path d="M60,68 L68,128 L48,118 L45,80 Z" fill="#1e40af"/>
        <!-- Inner ribbon highlight -->
        <path d="M30,68 L26,120 L34,114 L40,80 Z" fill="#3b5fb4" opacity="0.6"/>
        <path d="M60,68 L64,120 L56,114 L50,80 Z" fill="#3b5fb4" opacity="0.6"/>
        <!-- Gold rosette outer (12-pointed) -->
        <g transform="translate(45,42)">
          <g fill="#d4af37" stroke="#8a6a1f" stroke-width="0.6">
            ${Array.from({length:12}).map((_,i)=>{
              const a = (i*30)*Math.PI/180;
              const x1=Math.cos(a)*30, y1=Math.sin(a)*30;
              const a2=((i+0.5)*30)*Math.PI/180;
              const x2=Math.cos(a2)*22, y2=Math.sin(a2)*22;
              return `<polygon points="0,0 ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}"/>`;
            }).join('')}
          </g>
          <circle r="22" fill="#fbf8ee" stroke="#c5983a" stroke-width="1.4"/>
          <g transform="translate(-16,-15) scale(0.5)">${_certKnightSVG}</g>
        </g>
      </svg>
    `;
    // Round "CERTIFIED & AUTHENTIC" seal with circumferential text + knight in laurel
    const _certAuthSeal = `
      <svg viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <path id="cert-seal-arc-top" d="M 20,65 A 45,45 0 0,1 110,65"/>
          <path id="cert-seal-arc-bot" d="M 20,65 A 45,45 0 0,0 110,65"/>
        </defs>
        <circle cx="65" cy="65" r="60" fill="none" stroke="#c5983a" stroke-width="1.2"/>
        <circle cx="65" cy="65" r="55" fill="none" stroke="#c5983a" stroke-width="0.6" stroke-dasharray="2,2"/>
        <circle cx="65" cy="65" r="40" fill="#fbf8ee" stroke="#c5983a" stroke-width="1.2"/>
        <!-- Laurel wreath -->
        <g stroke="#c5983a" stroke-width="1" fill="none" transform="translate(65,65)">
          <path d="M -32,8 Q -36,-10 -22,-26"/>
          <path d="M  32,8 Q  36,-10  22,-26"/>
          <g fill="#c5983a">
            <ellipse cx="-30" cy="0" rx="3.5" ry="1.6" transform="rotate(-65 -30 0)"/>
            <ellipse cx="-28" cy="-9" rx="3.5" ry="1.6" transform="rotate(-55 -28 -9)"/>
            <ellipse cx="-24" cy="-17" rx="3.5" ry="1.6" transform="rotate(-40 -24 -17)"/>
            <ellipse cx="30" cy="0" rx="3.5" ry="1.6" transform="rotate(65 30 0)"/>
            <ellipse cx="28" cy="-9" rx="3.5" ry="1.6" transform="rotate(55 28 -9)"/>
            <ellipse cx="24" cy="-17" rx="3.5" ry="1.6" transform="rotate(40 24 -17)"/>
          </g>
        </g>
        <!-- Knight in centre -->
        <g transform="translate(50,42) scale(0.55)">${_certKnightSVG}</g>
        <!-- Top arc text -->
        <text font-family="Cinzel, serif" font-size="9.5" font-weight="700" fill="#1e293b" letter-spacing="2">
          <textPath href="#cert-seal-arc-top" startOffset="50%" text-anchor="middle">CERTIFIED &#x2022; AUTHENTIC</textPath>
        </text>
        <!-- Bottom arc text -->
        <text font-family="Cinzel, serif" font-size="8" font-weight="700" fill="#c5983a" letter-spacing="3">
          <textPath href="#cert-seal-arc-bot" startOffset="50%" text-anchor="middle">CHESSKIDDO</textPath>
        </text>
      </svg>
    `;

    // Build move history rows for the small moves box (top-right)
    const cleanMovesHtml = (() => {
      const certMoves = (ctx.moveHistory || []);
      if (!certMoves.length) return '<tr><td colspan="3" style="text-align:center;padding:8px;color:#94a3b8;">—</td></tr>';
      let rows = '';
      for (let i = 0; i < certMoves.length && i < 30; i += 2) {
        const w = _certEscape(certMoves[i]?.san || '');
        const b = _certEscape(certMoves[i+1]?.san || '');
        rows += `<tr><td>${Math.floor(i/2)+1}</td><td>${w}</td><td>${b}</td></tr>`;
      }
      return rows;
    })();

    // Clean reference-design certificate (user-supplied layout)
    overlay.innerHTML = `
      <div class="certificate" id="cert-card">
        <!-- Corner brackets -->
        <div class="corner top-left"></div>
        <div class="corner top-right"></div>
        <div class="corner bottom-left"></div>
        <div class="corner bottom-right"></div>

        <!-- Header: full brand logo image (knight + wordmark + tagline) -->
        <div class="header header-logo-only">
          <img src="assets/img/cert-logo.png" alt="ChessKidoo — Building Brilliance" class="cert-logo-img"
               onerror="this.onerror=null;this.src='assets/img/logo.png';this.classList.add('cert-logo-fallback');" />
        </div>

        <!-- Title -->
        <div class="title">
          <h1>CERTIFICATE OF COMPLETION</h1>
          <div class="divider"></div>
          <p>This certificate is proudly awarded to</p>
        </div>

        <!-- Student name + citation (always uppercased for a formal diploma look) -->
        <div class="student-name">${_certEscape((playerName || 'Champion').toUpperCase())}</div>
        <div class="student-text">
          for successfully completing an AI Arena chess match in ChessKiddo at age
          <strong>${_certEscape(playerAge)}</strong> and demonstrating strategic
          thinking, focus, tactical excellence, and determination throughout the game.
        </div>

        <!-- 4-cell details -->
        <div class="details">
          <div class="detail">
            <div class="detail-icon">♖</div>
            <div class="detail-title">LEVEL PLAYED</div>
            <div class="detail-value">${levelTier}</div>
          </div>
          <div class="detail">
            <div class="detail-icon">⏱</div>
            <div class="detail-title">TIME TAKEN</div>
            <div class="detail-value">${timeStr}</div>
          </div>
          <div class="detail">
            <div class="detail-icon">🏆</div>
            <div class="detail-title">MATCH RESULT</div>
            <div class="detail-value">${resultText}</div>
          </div>
          <div class="detail">
            <div class="detail-icon">📅</div>
            <div class="detail-title">DATE COMPLETED</div>
            <div class="detail-value">${dateStr}</div>
          </div>
        </div>

        <!-- Signatures + central seal -->
        <div class="signatures">
          <div class="signature-box">
            <div class="signature">TOM</div>
            <div class="signature-line"></div>
            <div class="signature-role">AI COACH</div>
            <div class="signature-sub">ChessKiddo AI Training System</div>
          </div>

          <div class="seal">
            <div class="seal-knight">♞</div>
            <div class="seal-text">CERTIFIED &amp;<br>AUTHENTIC</div>
          </div>

          <div class="signature-box">
            <div class="signature">Ranjith A S</div>
            <div class="signature-line"></div>
            <div class="signature-role">DIRECTOR</div>
            <div class="signature-sub">ChessKiddo Academy Director</div>
          </div>
        </div>

        <!-- Footer tagline + verify ID -->
        <div class="footer">Building Brilliance Through Chess and AI</div>
        <div class="cert-verify-strip-clean">VERIFY · ${certId}</div>
      </div>

      <div class="cert-action-bar">
        <button class="cert-action-btn btn-secondary" onclick="CK.arena.closeCertificate()">Close</button>
        <button class="cert-action-btn btn-tertiary"  onclick="CK.arena.changeCertName()">✎ Change Details</button>
        <button class="cert-action-btn btn-primary"   onclick="CK.arena.printCertificate()">📥 Download Certificate</button>
      </div>
    `;
    overlay.classList.add('active');
  };

  // Public entry — orchestrates prompt → preview.
  A.showCertificate = async (result, grade, gradeClass, accuracy) => {
    if (!A._lastCertCtx || A._lastCertCtx.result !== result || A._lastCertCtx.grade !== grade) {
      const duration = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 900;
      A._lastCertCtx = {
        result,
        grade,
        accuracy,
        difficulty: currentDifficulty,
        duration,
        date: new Date(),
        moveHistory: JSON.parse(JSON.stringify(moveHistory))
      };
    }
    const details = await A._askPlayerNameAndAge();
    if (!details) {
      const overlay = document.getElementById('cert-overlay');
      if (overlay) { overlay.classList.remove('active'); overlay.innerHTML = ''; }
      return;
    }
    A._renderCertificate(details.name, details.age, A._lastCertCtx.result, A._lastCertCtx.grade, A._lastCertCtx.accuracy);
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

  // Download certificate as PDF. Falls back to image download or print window
  // if HTML-to-Canvas or jsPDF aren't loaded.
  A.printCertificate = async () => {
    const card = document.getElementById('cert-card');
    if (!card) return;

    // Player name is in .student-name (clean layout)
    const nameText = (card.querySelector('.student-name')?.textContent || 'Champion').trim();

    // Lock to design dimensions during capture (defeats responsive --cert-scale).
    const restoreCard = card.getAttribute('style') || '';
    card.style.setProperty('width',  '1500px', 'important');
    card.style.setProperty('max-width', '1500px', 'important');
    card.style.setProperty('min-width', '1500px', 'important');
    card.style.setProperty('height', '980px', 'important');
    card.style.setProperty('transform', 'none', 'important');
    card.style.setProperty('margin', '0', 'important');

    if (typeof window.html2canvas === 'function') {
      try {
        CK.showToast('📸 Preparing your PDF Certificate…', 'info');
        // Give layout a frame to settle at the new width before capturing
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const canvas = await window.html2canvas(card, {
          backgroundColor: '#fffdf8',
          scale: 1.5,
          useCORS: true,
          logging: false,
          allowTaint: true,
          width: 1500,
          height: 980,
          windowWidth: 1700
        });
        
        card.setAttribute('style', restoreCard);
        
        // JPEG (quality 0.92) keeps the file ~300-600KB instead of a 12MB PNG.
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const safeName = nameText.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Champion';

        // Find jsPDF UMD module
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
          CK.showToast('PDF library not ready. Downloading as Image instead…', 'warning');
          const a = document.createElement('a');
          a.href = imgData;
          a.download = `ChessKidoo-Certificate-${safeName}.jpg`;
          document.body.appendChild(a); a.click(); a.remove();
          return;
        }

        // ALWAYS a single standard A4 landscape page — fit the certificate image
        // into the page preserving aspect (the old code used unit:'px' with the
        // raw 2250x1470 canvas as the page size, which produced a giant/paginated
        // multi-page PDF). Centre it with a small margin.
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const PW = 297, PH = 210, M = 6;
        const availW = PW - M * 2, availH = PH - M * 2;
        const imgAspect = canvas.width / canvas.height;
        let w = availW, h = availW / imgAspect;
        if (h > availH) { h = availH; w = availH * imgAspect; }
        const x = (PW - w) / 2, y = (PH - h) / 2;
        pdf.addImage(imgData, 'JPEG', x, y, w, h, undefined, 'FAST');
        pdf.save(`ChessKidoo-Certificate-${safeName}.pdf`);
        CK.showToast('✅ PDF Certificate downloaded!', 'success');
        return;
      } catch (err) {
        console.warn('[Arena] html2canvas capture/PDF generation failed:', err);
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
    localStorage.setItem('ck_difficulty', level);
    document.querySelectorAll('.diff-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.level === level);
    });
  };

  // ─── Game Mode (vs AI / vs Friend pass-and-play) ──────────────────────
  // When mode === 'friend', the engine never moves — both colours are
  // controlled by the local player; the board flips after each move so
  // whoever is on-move sees their pieces at the bottom.
  A._gameMode = localStorage.getItem('ck_game_mode') === 'friend' ? 'friend' : 'ai';
  A.setGameMode = (mode) => {
    if (mode !== 'ai' && mode !== 'friend') return;
    A._gameMode = mode;
    localStorage.setItem('ck_game_mode', mode);

    document.querySelectorAll('.game-mode-btn').forEach(b => {
      const active = b.dataset.mode === mode;
      b.classList.toggle('active', active);
      b.style.background = active ? 'rgba(232,184,75,0.12)' : 'rgba(255,255,255,0.04)';
      b.style.borderColor = active ? 'rgba(232,184,75,0.45)' : 'rgba(255,255,255,0.12)';
    });
    // Hide AI-only options (difficulty, coach, etc.) when in Friend mode
    const aiOpts = document.getElementById('arena-ai-only-options');
    if (aiOpts) aiOpts.style.display = mode === 'friend' ? 'none' : '';
  };
  // Apply on load
  if (typeof window !== 'undefined') {
    setTimeout(() => { try { A.setGameMode(A._gameMode); } catch(e) {} }, 100);
  }

  A.setStyle = (style) => {
    currentStyle = style;
    document.querySelectorAll('.style-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.style === style);
    });
  };

  A.toggleCoach = (enabled) => {
    coachMode = enabled;
    localStorage.setItem('ck_coach_mode', enabled);
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
    A.coachComment('hint');
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
    // Only ANALYZED moves count toward accuracy — unanalyzed moves (engine
    // unavailable) must not inflate the score to a fake 100%.
    const analyzedCls = classifications.filter(c => c !== 'unanalyzed');
    let totalWeight = 0;
    analyzedCls.forEach(c => { totalWeight += (weights[c] != null ? weights[c] : 0.5); });
    const accuracy = analyzedCls.length > 0 ? Math.round((totalWeight / analyzedCls.length) * 100) : 0;

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
      // From the coach's POV: if the PLAYER wins, the coach lost (and vice versa).
      if (result === 'win') {
        A.coachComment('loss');  // coach speaks its "I lost" line
      } else if (result === 'loss') {
        A.coachComment('win');   // coach speaks its "I won" line
      } else {
        A.coachComment('draw');
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
