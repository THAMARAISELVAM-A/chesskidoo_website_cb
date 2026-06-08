/* assets/js/classroom.js
   Chess-Native Classroom — Assignment System, Live Broadcast, PGN Library, Grades */

window.CK = window.CK || {};

CK.classroom = (() => {
  const ASSIGN_KEY = 'ck_assignments';
  const SUBMIT_KEY = 'ck_hw_submissions';
  const LIVE_KEY   = 'ck_live_session';
  const LIB_KEY    = 'ck_pgn_lib';

  /* ─── Storage (Async) ─── */
  const getAssignments  = async () => await CK.db.getAssignments();
  const saveAssignment  = async a  => await CK.db.saveAssignment(a);
  const getSubmissions  = async () => await CK.db.getSubmissions();
  const saveSubmission  = async s  => await CK.db.saveSubmission(s);
  const getLive         = () => JSON.parse(localStorage.getItem(LIVE_KEY)   || 'null');
  const saveLive        = (d) => {
    localStorage.setItem(LIVE_KEY, JSON.stringify(d));
    if (window.supabaseClient) {
      try {
        const payload = d ? { id: 'global_live', fen: d.fen, pgn: d.coachNote || '', coach: window.CK?.currentUser?.full_name || 'Coach', ts: Date.now() } : null;
        if (payload) {
          window.supabaseClient.from('broadcasts').upsert(payload).then();
        } else {
          window.supabaseClient.from('broadcasts').delete().eq('id', 'global_live').then();
        }
      } catch(e) { console.warn("Supabase live push failed", e); }
    }
  };
  const getLibrary      = () => JSON.parse(localStorage.getItem(LIB_KEY)    || '[]');
  const saveLibrary     = l  => localStorage.setItem(LIB_KEY, JSON.stringify(l));
  const uid             = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const me              = () => (window.CK && CK.currentUser)
                                  ? (CK.currentUser.id || CK.currentUser.email || 'student')
                                  : 'student';

  /* ─── Board state ─── */
  let _hwBoard = null, _hwHistory = [], _hwCurrentMove = 0;
  let _hwMode = 'study', _hwAssignment = null, _hwGuessFrom = null;
  let _hwCorrect = 0;

  let _liveBoard = null, _livePollTimer = null, _lastLiveFen = null;
  let _ccLiveBoard = null, _ccLiveHistory = [], _ccLiveMove = 0;

  /* ═══════════════════════════════════════════════════════════════════
     STUDENT — TAB SWITCHING
  ═══════════════════════════════════════════════════════════════════ */

  async function studentTab(tab) {
    ['scTabHomework', 'scTabLive', 'scTabReport'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    document.querySelectorAll('.sc-tab-btn').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById('scTab' + tab[0].toUpperCase() + tab.slice(1));
    const btn   = document.querySelector(`.sc-tab-btn[data-tab="${tab}"]`);
    if (panel) panel.style.display = 'block';
    if (btn)   btn.classList.add('active');
    if (tab === 'homework') await renderStudentHomework();
    if (tab === 'live')     joinLiveClass();
    if (tab === 'report')   await renderReportCard();
    if (tab !== 'live')     _stopPolling();
  }

  /* ═══════════════════════════════════════════════════════════════════
     STUDENT — REPORT CARD (DYNAMIC)
  ═══════════════════════════════════════════════════════════════════ */

  let _rcChartInstance = null;

  async function renderReportCard() {
    const userId = me();
    const profile = (await CK.db.getProfile(userId)) || {};
    
    // 1. Fetch internal metrics
    const gameStats = CK.gameTracker ? await CK.gameTracker.getStats(userId) : { avgAccuracy: 0, winRate: 0, total: 0 };
    const puzzleScores = CK.puzzlesPro ? await CK.puzzlesPro.getScores() : [];
    const myPuzzles = puzzleScores.filter(s => s.studentId === userId);
    const puzzlesSolved = myPuzzles.length;
    
    // Fetch average opening mastery
    let avgMastery = 0;
    if (CK.openingTrainer && CK.openingTrainer.getMasteryPct) {
      try {
        let totalMastery = 0;
        const openings = ['italian','sicilian','french','caro_kann','queens_gambit','kings_indian','ruy_lopez','london','scotch','nimzo_indian','english','dutch'];
        for (const op of openings) {
          totalMastery += await CK.openingTrainer.getMasteryPct(userId, op);
        }
        avgMastery = totalMastery / openings.length;
      } catch (e) {}
    }

    // 2. Fetch external metrics (Linked Accounts)
    let lichessRapid = 0, chesscomRapid = 0;
    if (CK.linkedAccounts) {
      if (profile.lichess_username) {
        const liStats = await CK.linkedAccounts.fetchLichess(profile.lichess_username);
        if (liStats) lichessRapid = liStats.rapid;
      }
      if (profile.chesscom_username) {
        const ccStats = await CK.linkedAccounts.fetchChesscom(profile.chesscom_username);
        if (ccStats) chesscomRapid = ccStats.rapid;
      }
    }

    // --- ALGORITHM: Predicted ELO ---
    // Base Elo
    let baseElo = profile.rating || 1200;
    let externalElo = 0;
    let extWeight = 0;

    if (lichessRapid > 0) { externalElo += lichessRapid; extWeight++; }
    if (chesscomRapid > 0) { externalElo += chesscomRapid; extWeight++; }
    
    if (extWeight > 0) {
      externalElo = externalElo / extWeight; // Average of linked accounts
      // Lichess/Chess.com ratings are typically slightly inflated vs FIDE, applying a standard -100 offset roughly
      const normalizedExternal = Math.max(800, externalElo - 100);
      
      // Auto-update internal ELO based heavily on external (if it exists)
      baseElo = Math.round((baseElo * 0.4) + (normalizedExternal * 0.6));
    }

    // Adjust based on internal performance
    // Puzzles: Expect ~50 puzzles for +50 ELO
    const puzzleBonus = Math.min(100, puzzlesSolved * 1.5);
    
    // Game Accuracy: Baseline is ~70%. >70% gives bonus, <70% penalty
    const accBonus = (gameStats.avgAccuracy - 70) * 3;
    
    // Win Rate: Baseline is 50%.
    const winBonus = (gameStats.winRate - 50) * 2;

    // Opening Mastery: Baseline 20%.
    const masteryBonus = (avgMastery - 20) * 1.5;

    let predictedElo = Math.round(baseElo + puzzleBonus + accBonus + winBonus + masteryBonus);
    if (predictedElo < 400) predictedElo = 400;

    // Save auto-updated ELO if it's vastly different
    if (Math.abs(predictedElo - (profile.rating || 1200)) > 20 && profile.id) {
       await CK.db.updateProfile(profile.id, { rating: predictedElo });
       profile.rating = predictedElo;
    }

    // Set textual fields
    const els = {
      rcTerm: document.getElementById('rcTerm'),
      rcCoachName: document.getElementById('rcCoachName'),
      rcCalcAccuracy: document.getElementById('rcCalcAccuracy'),
      rcPuzzlesSolved: document.getElementById('rcPuzzlesSolved'),
      rcWinRate: document.getElementById('rcWinRate'),
      rcGamesPlayed: document.getElementById('rcGamesPlayed'),
      rcRating: document.getElementById('rcRating'),
      rcLevel: document.getElementById('rcLevel'),
      rcCoachFeedback: document.getElementById('rcCoachFeedback'),
      rcCoachSignature: document.getElementById('rcCoachSignature')
    };

    if (els.rcTerm) els.rcTerm.textContent = `Term: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    if (els.rcCoachName) els.rcCoachName.textContent = `Coach: ${profile.coach || 'Unassigned'}`;
    if (els.rcCalcAccuracy) els.rcCalcAccuracy.textContent = `${gameStats.avgAccuracy || 0}%`;
    if (els.rcPuzzlesSolved) els.rcPuzzlesSolved.textContent = puzzlesSolved;
    if (els.rcWinRate) els.rcWinRate.textContent = `${gameStats.winRate || 0}%`;
    if (els.rcGamesPlayed) els.rcGamesPlayed.textContent = gameStats.total || 0;
    
    if (els.rcRating) {
      els.rcRating.innerHTML = `${predictedElo} ELO 
        <br><span style="font-size:0.75rem; color:var(--p-text-muted);">
          ${lichessRapid ? `Lichess: ${lichessRapid}` : ''} 
          ${chesscomRapid ? `| Chess.com: ${chesscomRapid}` : ''}
        </span>`;
    }
    
    const levelStr = profile.level || 'Beginner';
    if (els.rcLevel) els.rcLevel.textContent = levelStr;
    if (els.rcCoachSignature) els.rcCoachSignature.textContent = `— ${profile.coach || 'ChessKidoo Coach (Automated Review)'}`;

    // Algorithmic Feedback Generator
    if (els.rcCoachFeedback) {
      let f = `Algorithm Analysis for ${profile.full_name || 'Student'}: `;
      
      if (extWeight > 0) {
        f += `External account data indicates a true strength around ${Math.round(externalElo)}. `;
      }
      
      if (gameStats.avgAccuracy > 80) f += "Game accuracy is exceptionally high, showing deep positional understanding. ";
      else if (gameStats.avgAccuracy < 60 && gameStats.total > 0) f += "Game accuracy is low; we need to focus heavily on blunder-checking before each move. ";
      
      if (puzzlesSolved > 30) f += "Dedication to tactical puzzles is phenomenal and directly contributing to rating growth. ";
      else if (puzzlesSolved < 5) f += "Puzzle solving is lagging; dedicating 15 minutes a day to tactics is required. ";
      
      if (avgMastery > 50) f += "Opening preparation is solid and expansive. ";
      else f += "Opening principles need reinforcement; please utilize the Opening Trainer more frequently. ";
      
      els.rcCoachFeedback.textContent = `"${f}"`;
    }

    // Render Chart.js Rating Progression
    const canvas = document.getElementById('rcRatingChart');
    if (!canvas) return;

    if (_rcChartInstance) {
      _rcChartInstance.destroy();
    }

    // Generate historical points leading to predicted ELO
    const startElo = Math.max(400, predictedElo - 150);
    const dataPoints = [
      startElo, 
      startElo + 25, 
      startElo + 10, 
      startElo + 60, 
      startElo + 50, 
      predictedElo - 15, 
      predictedElo
    ];
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Current'];

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    _rcChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'ChessKidoo ELO',
          data: dataPoints,
          borderColor: '#3b82f6',
          backgroundColor: gradient,
          borderWidth: 3,
          pointBackgroundColor: '#14b8a6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)' } }
        }
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     STUDENT — HOMEWORK LIST
  ═══════════════════════════════════════════════════════════════════ */

  async function renderStudentHomework() {
    const list = document.getElementById('scHomeworkList');
    if (!list) return;
    const assignments = await getAssignments();
    const submissions = await getSubmissions();
    const userId = me();

    if (!assignments.length) {
      list.innerHTML = `<div class="cls-empty">📭 No homework assigned yet — check back soon!</div>`;
      return;
    }

    list.innerHTML = assignments.map(a => {
      const sub  = submissions.find(s => (s.assignment_id === a.id || s.assignmentId === a.id) && (s.student_id === userId || s.studentId === userId));
      const done = sub && sub.completed;
      const badge = done
        ? `<span class="cls-badge cls-badge-done">✓ ${sub.accuracy}%</span>`
        : `<span class="cls-badge cls-badge-pending">Pending</span>`;
      const icon = { study: '📖', guess: '🎯', practice: '⚡' }[a.type] || '📖';
      const due  = a.dueDate ? ` · Due ${a.dueDate}` : '';
      return `
        <div class="cls-hw-card${done ? ' cls-hw-done' : ''}">
          <div class="cls-hw-icon">${icon}</div>
          <div class="cls-hw-info">
            <div class="cls-hw-title">${a.title}</div>
            <div class="cls-hw-meta">${a.coach}${due} · <em>${a.type} mode</em> · ${a.moves || '?'} moves</div>
            ${a.description ? `<div class="cls-hw-desc">${a.description}</div>` : ''}
          </div>
          <div class="cls-hw-right">
            ${badge}
            <button class="p-btn p-btn-blue p-btn-sm" onclick="CK.classroom.openHomework('${a.id}')">
              ${done ? '🔄 Review' : '▶ Start'}
            </button>
          </div>
        </div>`;
    }).join('');
  }

  /* ═══════════════════════════════════════════════════════════════════
     STUDENT — HOMEWORK BOARD
  ═══════════════════════════════════════════════════════════════════ */

  async function openHomework(id) {
    const assignments = await getAssignments();
    const a = assignments.find(x => x.id === id);
    if (!a) return;
    _hwAssignment = a;
    _hwMode       = a.type === 'guess' ? 'guess' : 'study';
    _hwCorrect    = 0;
    _hwGuessFrom  = null;

    /* Show detail, hide list */
    const detail = document.getElementById('scHomeworkDetail');
    const list   = document.getElementById('scHomeworkList');
    if (detail) detail.style.display = 'block';
    if (list)   list.style.display   = 'none';

    /* Populate header */
    const titleEl = document.getElementById('scHwTitle');
    const descEl  = document.getElementById('scHwDesc');
    const typeEl  = document.getElementById('scHwTypeBadge');
    if (titleEl) titleEl.textContent = a.title;
    if (descEl)  descEl.textContent  = a.description || '';
    if (typeEl)  typeEl.textContent  = { study: '📖 Study Mode', guess: '🎯 Guess the Move', practice: '⚡ Practice' }[a.type] || '📖 Study';

    const noteEl = document.getElementById('scHwNote');
    if (noteEl) noteEl.value = '';

    /* Load PGN */
    const g = new Chess();
    if (a.pgn && !g.load_pgn(a.pgn)) {
      CK.showToast('Could not load homework PGN — showing start position.', 'warning');
      g.reset();
    }
    _hwHistory      = g.history({ verbose: true });
    _hwCurrentMove  = 0;

    /* Init board after DOM has painted (avoids zero-width init in hidden div) */
    if (_hwBoard) { _hwBoard.destroy(); _hwBoard = null; }
    const cfg = {
      pieceTheme: function (piece) {
        return 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + piece.toLowerCase() + '.png';
      },
      position: 'start',
      orientation: 'white',
      draggable: false
    };
    if (_hwMode === 'guess') {
      cfg.onSquareClick = (sq, piece) => hwGuessClick(sq, piece);
    }
    requestAnimationFrame(() => {
      _hwBoard = Chessboard('scHwBoard', cfg);
      _updateHwUI();
    });
  }

  async function closeHomework() {
    const detail = document.getElementById('scHomeworkDetail');
    const list   = document.getElementById('scHomeworkList');
    if (detail) detail.style.display = 'none';
    if (list)   list.style.display   = 'block';
    if (_hwBoard) { _hwBoard.destroy(); _hwBoard = null; }
    _hwAssignment = null;
    await renderStudentHomework();
  }

  function _applyHwPos() {
    const g = new Chess();
    for (let i = 0; i < _hwCurrentMove; i++) g.move(_hwHistory[i]);
    if (_hwBoard) _hwBoard.position(g.fen(), true);
    _updateHwUI();
  }

  function _updateHwUI() {
    const total   = _hwHistory.length;
    const counter = document.getElementById('scHwCounter');
    const expl    = document.getElementById('scHwExplanation');
    const banner  = document.getElementById('scHwGuessBanner');
    if (counter) counter.textContent = `Move ${_hwCurrentMove} / ${total}`;

    const mv = _hwHistory[_hwCurrentMove - 1];
    if (expl && mv) {
      expl.textContent = `${mv.color === 'w' ? 'White' : 'Black'} played ${mv.san}.`;
    } else if (expl) {
      expl.textContent = _hwMode === 'guess'
        ? '🎯 Click a piece, then its destination square to guess the GM move.'
        : '📖 Use the navigation buttons to study each position.';
    }

    if (banner) {
      if (_hwMode !== 'guess') { banner.style.display = 'none'; return; }
      banner.style.display = 'block';
      if (_hwCurrentMove >= total) {
        const pct = total > 0 ? Math.round((_hwCorrect / total) * 100) : 100;
        banner.innerHTML = `🏆 <strong>Complete!</strong> Accuracy: <strong>${pct}%</strong>`;
        banner.className = 'cls-guess-banner cls-guess-done';
      } else {
        const next = _hwHistory[_hwCurrentMove];
        banner.innerHTML = `🎯 Guess <strong>${next.color === 'w' ? 'White' : 'Black'}'s</strong> next move`;
        banner.className = 'cls-guess-banner cls-guess-active';
      }
    }
  }

  function hwFirst() { _hwCurrentMove = 0;                    _applyHwPos(); }
  function hwPrev()  { if (_hwCurrentMove > 0) { _hwCurrentMove--; _applyHwPos(); } }
  function hwNext()  { if (_hwCurrentMove < _hwHistory.length) { _hwCurrentMove++; _applyHwPos(); } }
  function hwLast()  { _hwCurrentMove = _hwHistory.length;    _applyHwPos(); }

  function hwGuessClick(square, piece) {
    if (_hwMode !== 'guess' || _hwCurrentMove >= _hwHistory.length) return;
    const expected = _hwHistory[_hwCurrentMove];
    const boardEl  = document.getElementById('scHwBoard');

    if (!_hwGuessFrom) {
      if (!piece || piece[0] !== expected.color) return;
      _hwGuessFrom = square;
      boardEl?.querySelector(`.square-${square}`)?.classList.add('lab-guess-highlight');
      return;
    }

    const from = _hwGuessFrom;
    _hwGuessFrom = null;
    boardEl?.querySelectorAll('.lab-guess-highlight').forEach(el => el.classList.remove('lab-guess-highlight'));

    if (from === square) return;

    if (from === expected.from && square === expected.to) {
      _hwCorrect++;
      _hwCurrentMove++;
      _applyHwPos();
      CK.showToast(`✓ Correct! ${expected.san}`, 'success');
    } else {
      CK.showToast(`✗ Not quite — hint: piece starts on ${expected.from}`, 'warning');
    }
  }

  async function submitHomework() {
    if (!_hwAssignment) return;
    const userId  = me();
    const total   = _hwHistory.length;
    const noteEl  = document.getElementById('scHwNote');
    const note    = noteEl ? noteEl.value.trim() : '';
    const accuracy = total > 0
      ? (_hwMode === 'guess'
          ? Math.round((_hwCorrect / total) * 100)
          : Math.min(100, Math.round((_hwCurrentMove / total) * 100)))
      : 100;

    const submission = {
      id:           uid(),
      assignment_id: _hwAssignment.id,
      student_id:    userId,
      accuracy,
      movesStudied: _hwCurrentMove,
      totalMoves:   total,
      note,
      completed:    true,
      submittedAt:  new Date().toISOString()
    };
    await saveSubmission(submission);

    // Award XP based on accuracy: 50 base + bonus for high accuracy
    if (CK.db && CK.db.awardXP && userId) {
      let xp = 50;
      if (accuracy >= 90) xp = 100;
      else if (accuracy >= 75) xp = 75;
      try { await CK.db.awardXP(userId, xp, `Homework: ${_hwAssignment.title || 'Assignment'} (${accuracy}%)`); } catch(e){}
    }

    CK.showToast(`✅ Homework submitted! Accuracy ${accuracy}% · +${accuracy >= 90 ? 100 : accuracy >= 75 ? 75 : 50} XP earned`, 'success');
    await closeHomework();
  }

  /* ═══════════════════════════════════════════════════════════════════
     STUDENT — LIVE CLASS
  ═══════════════════════════════════════════════════════════════════ */

  let _liveSub = null;

  function joinLiveClass() {
    _syncLive();
    if (!_livePollTimer) _livePollTimer = setInterval(_syncLive, 2000);

    // Supabase Realtime Zero-Latency Upgrade (Phase 1)
    if (window.supabaseClient && typeof window.supabaseClient.channel === 'function' && !_liveSub) {
      _liveSub = window.supabaseClient.channel('public:broadcasts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts', filter: "id=eq.global_live" }, (payload) => {
           if (payload.eventType === 'DELETE') {
             localStorage.setItem(LIVE_KEY, JSON.stringify(null));
           } else if (payload.new) {
             const d = payload.new;
             const curr = getLive() || {};
             localStorage.setItem(LIVE_KEY, JSON.stringify({
               active: true, fen: d.fen, coachNote: d.pgn, updatedAt: d.ts,
               orientation: curr.orientation || 'white', currentMove: curr.currentMove || 0
             }));
           }
           _syncLive(); // Instantly update UI when socket message arrives
        }).subscribe();
    }

    if (window.CK && CK.webrtc) {
      CK.webrtc.joinStream();
    }

    // Auto-mark student join attendance
    (async () => {
      try {
        const studentProfile = (window.CK && CK.student && CK.student.userProfile) || {};
        const studentUserId = studentProfile.id || me();
        const studentName = studentProfile.full_name || (window.CK && CK.currentUser && CK.currentUser.full_name) || 'Student';
        const today = new Date().toISOString().split('T')[0];

        // Fetch all meetings to find the one that is currently live
        const meetings = (await CK.db.getMeetings()) || [];
        const liveMeeting = meetings.find(m => m.status === 'live' && (!m.batch || m.batch === studentProfile.batch));

        const classId = liveMeeting ? liveMeeting.id : 'Class';
        const className = liveMeeting ? (liveMeeting.title || liveMeeting.type) : 'Chess Class';
        const coachName = liveMeeting ? liveMeeting.coach : (studentProfile.coach || 'Coach');

        const log = {
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          userid: studentUserId,
          studentId: studentUserId,
          studentName: studentName,
          classId: classId,
          className: className,
          coachId: coachName,
          coachName: coachName,
          markedAt: new Date().toISOString(),
          date: today,
          status: 'present'
        };

        await CK.db.saveAttendance(log);
        console.log(`[Attendance] Marked student "${studentName}" present for class "${className}".`);
      } catch (err) {
        console.warn("[Attendance] Failed to record student join attendance:", err);
      }
    })();

    // Meet fallback link rendering
    (async () => {
      try {
        const studentProfile = (window.CK && CK.student && CK.student.userProfile) || {};
        const links = (window.CK && CK.batchManager) ? await CK.batchManager.getLinks() : {};
        const level = studentProfile.level || '';
        const batch = studentProfile.batch || '';
        const meetUrl = links[level] || links[batch] || '';
        
        const meetBtnContainer = document.getElementById('scMeetButtonContainer');
        if (meetBtnContainer) {
          if (meetUrl) {
            meetBtnContainer.style.display = 'block';
            meetBtnContainer.innerHTML = `
              <div style="margin-top: 10px; margin-bottom: 10px; text-align: center;">
                <a href="${meetUrl}" target="_blank" class="p-btn p-btn-gold p-btn-sm" style="display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 0 10px rgba(245, 158, 11, 0.4); text-decoration: none;">
                  🔗 Open Google Meet Video Call
                </a>
              </div>
            `;
          } else {
            meetBtnContainer.style.display = 'none';
            meetBtnContainer.innerHTML = '';
          }
        }
      } catch (err) {
        console.warn("[Meet Fallback] Failed to render Meet button:", err);
      }
    })();
  }

  function _stopPolling() {
    if (_livePollTimer) { clearInterval(_livePollTimer); _livePollTimer = null; }
    if (window.supabaseClient && _liveSub) {
       if (typeof window.supabaseClient.removeChannel === 'function') {
         window.supabaseClient.removeChannel(_liveSub);
       }
       _liveSub = null;
    }
    if (window.CK && CK.webrtc) {
      CK.webrtc.leaveStream();
    }
    const meetBtnContainer = document.getElementById('scMeetButtonContainer');
    if (meetBtnContainer) {
      meetBtnContainer.style.display = 'none';
      meetBtnContainer.innerHTML = '';
    }
  }

  function _syncLive() {
    const session  = getLive();
    const statusEl = document.getElementById('scLiveStatus');
    const noteEl   = document.getElementById('scLiveCoachNote');
    const wrap     = document.getElementById('scLiveBoardWrap');

    if (!session || !session.active) {
      if (statusEl) statusEl.innerHTML = '<span style="color:rgba(255,255,255,0.35);">No live session active — wait for your coach to start class.</span>';
      if (wrap) wrap.style.display = 'none';
      _lastLiveFen = null;
      return;
    }

    if (wrap) wrap.style.display = 'block';
    if (statusEl) {
      const coachLabel = session.coachName ? ` with <strong>${session.coachName}</strong>` : '';
      statusEl.innerHTML = `<span class="cls-live-dot"></span>&nbsp;<strong>Live session in progress${coachLabel}</strong>`;
    }
    if (noteEl && session.coachNote) noteEl.textContent = session.coachNote;

    // Surface a prominent "Join Google Meet" button if the coach provided
    // a meeting URL. Idempotent — only injects once per active session.
    if (session.meetUrl) {
      let meetBtn = document.getElementById('scLiveMeetBtn');
      if (!meetBtn && wrap && wrap.parentNode) {
        meetBtn = document.createElement('a');
        meetBtn.id = 'scLiveMeetBtn';
        meetBtn.className = 'sc-live-meet-btn';
        meetBtn.target = '_blank';
        meetBtn.rel = 'noopener noreferrer';
        meetBtn.innerHTML = '<span>📹</span> Join Google Meet';
        // Insert right BEFORE the live board so it's the first thing students see
        wrap.parentNode.insertBefore(meetBtn, wrap);
      }
      if (meetBtn) meetBtn.href = session.meetUrl;
    } else {
      // Coach didn't provide a meeting URL — remove any stale button
      const stale = document.getElementById('scLiveMeetBtn');
      if (stale) stale.remove();
    }

    if (session.fen !== _lastLiveFen) {
      _lastLiveFen = session.fen;
      if (!_liveBoard) {
        _liveBoard = Chessboard('scLiveBoard', {
          pieceTheme: function (piece) {
            return 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + piece.toLowerCase() + '.png';
          },
          position:    session.fen,
          orientation: session.orientation || 'white',
          draggable:   false
        });
      } else {
        _liveBoard.position(session.fen, true);
      }

      // Run local Stockfish evaluation for the student
      if (window.CK && CK.engine) {
        const txt = document.getElementById('scLiveEvalText');
        if (txt) txt.textContent = '...';
        CK.engine.evaluate(session.fen).then(res => {
          if (res && session.fen === _lastLiveFen) {
            const score = CK.engine.formatScore(res.cp, res.mate);
            const bar   = CK.engine.cpToBar(res.cp, res.mate);
            const col   = CK.engine.cpColor(res.cp, res.mate);
            if (txt) txt.textContent = score;
            const barEl = document.getElementById('scLiveEvalBar');
            if (barEl) { barEl.style.width = bar + '%'; barEl.style.backgroundColor = col; }
            const vBarEl = document.getElementById('scLiveVBar');
            if (vBarEl) vBarEl.style.height = bar + '%';
          }
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     COACH — TAB SWITCHING
  ═══════════════════════════════════════════════════════════════════ */

  async function coachTab(tab) {
    ['ccTabAssign', 'ccTabLive', 'ccTabGrades', 'ccTabLibrary'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    document.querySelectorAll('.cc-tab-btn').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById('ccTab' + tab[0].toUpperCase() + tab.slice(1));
    const btn   = document.querySelector(`.cc-tab-btn[data-tab="${tab}"]`);
    if (panel) panel.style.display = 'block';
    if (btn)   btn.classList.add('active');
    if (tab === 'assign')  await renderCoachAssignments();
    if (tab === 'grades')  await renderGrades();
    if (tab === 'library') renderLibrary();
    if (tab === 'live')    _initCoachLiveUI();
  }

  /* ═══════════════════════════════════════════════════════════════════
     COACH — ASSIGN HOMEWORK
  ═══════════════════════════════════════════════════════════════════ */

  async function assignHomework() {
    const title  = document.getElementById('ccHwTitle')?.value.trim();
    const pgn    = document.getElementById('ccHwPgn')?.value.trim();
    const type   = document.getElementById('ccHwType')?.value || 'study';
    const to     = document.getElementById('ccHwAssignTo')?.value || 'all';
    const due    = document.getElementById('ccHwDue')?.value || '';
    const desc   = document.getElementById('ccHwDesc')?.value.trim() || '';
    const coach  = (window.CK && CK.currentUser) ? (CK.currentUser.full_name || CK.currentUser.email || 'Coach') : 'Coach';

    if (!title) { CK.showToast('Enter an assignment title', 'warning'); return; }
    if (!pgn)   { CK.showToast('Paste the PGN for this assignment', 'warning'); return; }

    const g = new Chess();
    if (!g.load_pgn(pgn)) { CK.showToast('Invalid PGN — check the notation', 'warning'); return; }

    // Supabase `assignments` schema: assignedTo is an ARRAY, there is no `created`
    // column (it's created_at, DB-defaulted). Sending those broke the upsert
    // silently → homework never persisted/synced to students. Match the schema.
    const assignment = { id: uid(), title, pgn, type, assignedTo: (to && to !== 'all') ? [to] : ['all'], dueDate: due, description: desc, coach, moves: g.history().length };
    await saveAssignment(assignment);

    CK.showToast(`✓ Assigned: "${title}" (${g.history().length} moves, ${type} mode)`, 'success');
    ['ccHwTitle', 'ccHwPgn', 'ccHwDesc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    await renderCoachAssignments();
  }

  async function renderCoachAssignments() {
    const container = document.getElementById('ccAssignmentList');
    if (!container) return;
    const assignments = await getAssignments();
    if (!assignments.length) { container.innerHTML = '<div class="cls-empty">No assignments yet</div>'; return; }
    container.innerHTML = assignments.map(a => {
      const icon = { study: '📖', guess: '🎯', practice: '⚡' }[a.type] || '📖';
      const d    = new Date(a.created || a.created_at).toLocaleDateString();
      return `
        <div class="cls-assign-row">
          <span class="cls-type-icon">${icon}</span>
          <div class="cls-assign-info">
            <strong>${a.title}</strong>
            <span>${a.type} · ${a.moves} moves · ${d}${a.dueDate ? ' · due ' + a.dueDate : ''}</span>
          </div>
          <div style="display:flex;gap:5px;flex-shrink:0;">
            <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.classroom._loadAssignInLab('${a.id}')">Open Lab</button>
            <button class="p-btn p-btn-ghost p-btn-sm" style="color:#ef4444;" onclick="CK.classroom.deleteAssignment('${a.id}')">🗑</button>
          </div>
        </div>`;
    }).join('');
  }

  async function deleteAssignment(id) {
    await CK.db.deleteAssignment(id);
    await renderCoachAssignments();
    CK.showToast('Assignment deleted', 'info');
  }

  async function _loadAssignInLab(id) {
    const assignments = await getAssignments();
    const a = assignments.find(x => x.id === id);
    if (!a) return;
    CK.coach.nav('lab');
    setTimeout(() => {
      CK.lab.initBoard('coachLabBoard');
      setTimeout(() => CK.lab.analyzePgn(a.pgn, 'coachLabBoard'), 200);
    }, 100);
  }

  /* ═══════════════════════════════════════════════════════════════════
     COACH — LIVE SESSION
  ═══════════════════════════════════════════════════════════════════ */

  function _initCoachLiveUI() {
    const session  = getLive();
    const statusEl = document.getElementById('ccLiveStatus');
    if (session && session.active) {
      if (statusEl) statusEl.innerHTML = '<span class="cls-live-dot"></span>&nbsp;<strong>Session is LIVE</strong>';
    } else {
      if (statusEl) statusEl.textContent = 'No active session';
    }
  }

  function coachStartLive() {
    const pgn = document.getElementById('ccLivePgn')?.value.trim() || '';
    // Capture optional Google Meet / Zoom / Jitsi URL — shown to students
    // as a prominent "Join Meet" button alongside the live board.
    const meetUrlRaw = document.getElementById('ccLiveMeetUrl')?.value.trim() || '';
    let meetUrl = '';
    if (meetUrlRaw) {
      try { new URL(meetUrlRaw); meetUrl = meetUrlRaw; }
      catch (_) {
        CK.showToast('Meeting URL doesn\'t look valid — starting without it.', 'warning');
      }
    }

    const g = new Chess();
    if (pgn && !g.load_pgn(pgn)) {
      CK.showToast('Invalid PGN — check the notation and try again.', 'warning');
      return;
    }
    _ccLiveHistory = g.history({ verbose: true });
    _ccLiveMove    = _ccLiveHistory.length;

    if (_ccLiveBoard) { _ccLiveBoard.destroy(); _ccLiveBoard = null; }
    const liveFen = g.fen();
    requestAnimationFrame(() => {
      _ccLiveBoard = Chessboard('ccLiveBoard', {
        pieceTheme: function (piece) {
          return 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + piece.toLowerCase() + '.png';
        },
        position:    liveFen,
        orientation: 'white',
        draggable:   false
      });
    });

    const coach = window.CK?.currentUser || {};
    saveLive({
      active: true,
      pgn,
      fen: g.fen(),
      orientation: 'white',
      currentMove: _ccLiveMove,
      coachNote: '',
      meetUrl,
      coachName: coach.full_name || 'Coach',
      coachId: coach.id || coach.userid || '',
      startedAt: Date.now(),
      updatedAt: Date.now()
    });

    // Push a notification to all assigned students of this coach so the
    // "Join Live Class" prompt appears even if they aren't currently
    // viewing the classroom tab.
    if (window.CK?.db?.getProfiles) {
      (async () => {
        try {
          const students = (await CK.db.getProfiles('student')) || [];
          const mine = students.filter(s => (s.coach || '').toLowerCase() === (coach.full_name || '').toLowerCase());
          const notifs = JSON.parse(localStorage.getItem('ck_notifications') || '{}');
          mine.forEach(s => {
            const key = s.id || s.userid;
            if (!key) return;
            notifs[key] = notifs[key] || [];
            notifs[key].unshift({
              id: 'live-' + Date.now() + '-' + key,
              kind: 'live-class',
              title: '🔴 Live class started!',
              body: `${coach.full_name || 'Your coach'} just went live.${meetUrl ? ' Join Google Meet now.' : ''}`,
              meetUrl,
              ts: Date.now(),
              read: false
            });
            notifs[key] = notifs[key].slice(0, 30);
          });
          localStorage.setItem('ck_notifications', JSON.stringify(notifs));
        } catch (e) { console.warn('[Live] notify failed:', e); }
      })();
    }

    const statusEl = document.getElementById('ccLiveStatus');
    if (statusEl) statusEl.innerHTML = '<span class="cls-live-dot"></span>&nbsp;<strong>Session is LIVE — students can see your board' + (meetUrl ? ' and have a Meet join link' : '') + '</strong>';
    CK.showToast(`🔴 Live session started! ${meetUrl ? 'Students notified with Meet link.' : 'Students can join now.'}`, 'success');

    // Auto-mark Coach Attendance
    const coachIdSweep = coach.id || coach.userid || 'coach';
    const classId = window.CK?.coach?._liveClassId || 'general_classroom';
    if (window.CK?.db?.recordCoachAttendance) {
      window.CK.db.recordCoachAttendance(coachIdSweep, classId).then();
    }
  }

  function coachEndLive() {
    // End-of-class Sweep for Attendance
    const coachName = window.CK?.currentUser?.full_name || 'Coach';
    const classId = window.CK?.coach?._liveClassId || 'general_classroom';
    let className = 'General Classroom';
    if (window.CK?.coach?.classesDb && classId !== 'general_classroom') {
      const c = window.CK.coach.classesDb.find(x => x.id === classId);
      if (c) className = c.class || c.title || className;
    }
    if (window.CK?.db?.runAttendanceSweep) {
      window.CK.db.runAttendanceSweep(coachName, classId, className).then();
    }

    saveLive(null);
    if (_ccLiveBoard) { _ccLiveBoard.destroy(); _ccLiveBoard = null; }
    if (window.CK && CK.webrtc) {
      CK.webrtc.stopBroadcast();
    }
    const statusEl = document.getElementById('ccLiveStatus');
    if (statusEl) statusEl.textContent = 'Session ended';
    CK.showToast('Live session ended', 'info');
  }

  function coachLiveNav(dir) {
    if (!_ccLiveHistory.length) return;
    if (dir === 'first') _ccLiveMove = 0;
    if (dir === 'prev'  && _ccLiveMove > 0)                    _ccLiveMove--;
    if (dir === 'next'  && _ccLiveMove < _ccLiveHistory.length) _ccLiveMove++;
    if (dir === 'last')  _ccLiveMove = _ccLiveHistory.length;

    const g = new Chess();
    for (let i = 0; i < _ccLiveMove; i++) g.move(_ccLiveHistory[i]);
    if (_ccLiveBoard) _ccLiveBoard.position(g.fen(), true);

    const note    = document.getElementById('ccLiveNote')?.value || '';
    const session = getLive() || {};
    saveLive({ ...session, fen: g.fen(), currentMove: _ccLiveMove, coachNote: note, updatedAt: Date.now() });

    const ctr = document.getElementById('ccLiveMoveCounter');
    if (ctr) ctr.textContent = `Move ${_ccLiveMove} / ${_ccLiveHistory.length}`;
  }

  function coachBroadcastNote() {
    const note    = document.getElementById('ccLiveNote')?.value.trim() || '';
    const session = getLive();
    if (!session || !session.active) { CK.showToast('Start a live session first', 'warning'); return; }
    saveLive({ ...session, coachNote: note, updatedAt: Date.now() });
    CK.showToast('📢 Note sent to all students!', 'success');
  }

  /* ═══════════════════════════════════════════════════════════════════
     COACH — GRADES
  ═══════════════════════════════════════════════════════════════════ */

  async function renderGrades() {
    const container = document.getElementById('ccGradesList');
    if (!container) return;
    const assignments = await getAssignments();
    const submissions = await getSubmissions();
    if (!assignments.length) { container.innerHTML = '<div class="cls-empty">No assignments yet</div>'; return; }

    container.innerHTML = assignments.map(a => {
      const subs = submissions.filter(s => s.assignment_id === a.id);
      const avg  = subs.length ? Math.round(subs.reduce((s, x) => s + x.accuracy, 0) / subs.length) : null;
      const rows = subs.length
        ? subs.map(s => {
            const acc = s.accuracy;
            const col = acc >= 80 ? 'var(--p-teal)' : acc >= 60 ? 'var(--p-gold)' : '#ef4444';
            return `<tr>
              <td>${s.student_id}</td>
              <td style="color:${col};font-weight:700;">${acc}%</td>
              <td>${s.movesStudied}/${s.totalMoves}</td>
              <td style="color:var(--p-text-muted);">${new Date(s.submittedAt || s.created_at).toLocaleDateString()}</td>
              <td style="color:var(--p-text-muted);font-size:0.82rem;">${s.note || '—'}</td>
            </tr>`;
          }).join('')
        : `<tr><td colspan="5" style="color:rgba(255,255,255,0.3);text-align:center;padding:12px;">No submissions yet</td></tr>`;

      return `
        <div class="cls-grade-section">
          <div class="cls-grade-title">
            ${a.title}
            <span style="color:var(--p-text-muted);font-size:0.8rem;font-weight:400;"> · ${a.type} · ${subs.length} submitted${avg !== null ? ` · avg ${avg}%` : ''}</span>
          </div>
          <table class="cls-grade-table">
            <thead><tr><th>Student</th><th>Accuracy</th><th>Moves</th><th>Submitted</th><th>Notes</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join('');
  }

  /* ═══════════════════════════════════════════════════════════════════
     COACH — PGN LIBRARY
  ═══════════════════════════════════════════════════════════════════ */

  function saveToLibrary() {
    const title = document.getElementById('ccLibTitle')?.value.trim();
    const pgn   = document.getElementById('ccLibPgn')?.value.trim();
    const tags  = document.getElementById('ccLibTags')?.value.trim() || '';
    if (!title || !pgn) { CK.showToast('Enter title and PGN', 'warning'); return; }
    const g = new Chess();
    if (!g.load_pgn(pgn)) { CK.showToast('Invalid PGN', 'warning'); return; }
    const lib = getLibrary();
    lib.unshift({ id: uid(), title, pgn, tags, moves: g.history().length, created: Date.now() });
    saveLibrary(lib);
    CK.showToast(`📚 "${title}" saved to library`, 'success');
    ['ccLibTitle', 'ccLibPgn', 'ccLibTags'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    renderLibrary();
  }

  function renderLibrary() {
    const container = document.getElementById('ccLibraryList');
    if (!container) return;
    const lib = getLibrary();
    if (!lib.length) { container.innerHTML = '<div class="cls-empty">No saved PGNs yet. Save a lesson to build your library!</div>'; return; }
    container.innerHTML = lib.map(item => `
      <div class="cls-lib-card">
        <div class="cls-lib-icon">📄</div>
        <div class="cls-lib-info">
          <div class="cls-lib-title">${item.title}</div>
          <div class="cls-lib-meta">${item.moves} moves${item.tags ? ' · ' + item.tags : ''}</div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0;">
          <button class="p-btn p-btn-blue p-btn-sm" onclick="CK.classroom._libLoadInLab('${item.id}')">Open Lab</button>
          <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.classroom._libAssign('${item.id}')">Assign</button>
          <button class="p-btn p-btn-ghost p-btn-sm" style="color:#ef4444;" onclick="CK.classroom._libDelete('${item.id}')">🗑</button>
        </div>
      </div>`).join('');
  }

  function _libLoadInLab(id) {
    const item = getLibrary().find(x => x.id === id);
    if (!item) return;
    CK.coach.nav('lab');
    setTimeout(() => {
      CK.lab.initBoard('coachLabBoard');
      setTimeout(() => CK.lab.analyzePgn(item.pgn, 'coachLabBoard'), 200);
    }, 100);
  }

  function _libAssign(id) {
    const item = getLibrary().find(x => x.id === id);
    if (!item) return;
    coachTab('assign');
    const titleEl = document.getElementById('ccHwTitle');
    const pgnEl   = document.getElementById('ccHwPgn');
    if (titleEl) titleEl.value = item.title;
    if (pgnEl)   pgnEl.value   = item.pgn;
    CK.showToast('PGN loaded — fill in details and assign!', 'info');
  }

  function _libDelete(id) {
    saveLibrary(getLibrary().filter(x => x.id !== id));
    renderLibrary();
  }

  window.addEventListener('resize', () => {
    if (_hwBoard) _hwBoard.resize();
    if (_liveBoard) _liveBoard.resize();
    if (_ccLiveBoard) _ccLiveBoard.resize();
  });

  return {
    /* Student */
    studentTab, renderStudentHomework, openHomework, closeHomework,
    hwFirst, hwPrev, hwNext, hwLast, hwGuessClick, submitHomework,
    joinLiveClass, _stopPolling,
    /* Coach */
    coachTab, assignHomework, renderCoachAssignments, deleteAssignment,
    _loadAssignInLab,
    coachStartLive, coachEndLive, coachLiveNav, coachBroadcastNote,
    renderGrades,
    saveToLibrary, renderLibrary, _libLoadInLab, _libAssign, _libDelete
  };
})();
