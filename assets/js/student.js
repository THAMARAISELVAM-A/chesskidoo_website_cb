/* assets/js/student.js ----------------------------------------------------
   ChessKidoo Student Portal Logic
   Fully connected to CK.db layer with support for dynamic profiles, dual-curve
   rating spline charts, attendance calendar grids, and interactive mini-puzzles.
   ------------------------------------------------------------------------- */

const CK = window.CK = window.CK || {};

function parseTimeMinutes(t) {
  const s = String(t || '').trim();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m?)?$/i);
  if (!m) return null;
  let h = +m[1];
  const mn = +(m[2] || 0);
  const ap = (m[3] || '').toLowerCase().replace('.', '');
  if (ap) {
    if (ap.startsWith('p') && h < 12) h += 12;
    if (ap.startsWith('a') && h === 12) h = 0;
  }
  return h * 60 + mn;
}

function parseDateFromTime(date, t) {
  if (!date) return null;
  const mins = parseTimeMinutes(t);
  if (mins == null) return null;
  const dt = new Date(date + 'T00:00:00');
  dt.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return dt;
}

function compareDateTime(a, b) {
  const da = parseDateFromTime(a.date, a.time);
  const db = parseDateFromTime(b.date, b.time);
  if (da && db) return da.getTime() - db.getTime();
  return String((a.date || '') + (a.time || '')).localeCompare(String((b.date || '') + (b.time || '')));
}

CK.student = {
  userProfile: null,
  activePuzzleId: null,
  _pzBoardInstance: null,
  _pzGame: null,

  // List of interactive mock tactical puzzles
  puzzlesDb: [
    { id: 'P1', title: 'Back-Rank Mate', type: 'Tactics', diff: 'Easy', coach: 'ARIVUSELVAM', due: 'Today', instruction: 'White to move. Find the back-rank checkmate!', fen: '7k/5ppp/8/8/8/8/R7/7K w - - 0 1', solution: 'a8', desc: 'The black king is trapped behind its own pawns on the back rank. Find the forcing move that delivers checkmate immediately.' },
    { id: 'P2', title: 'Tactical Fork Opportunity', type: 'Tactics', diff: 'Medium', coach: 'ARIVUSELVAM', due: 'Tomorrow', instruction: 'White to move. Fork the black King and Rook with your Knight!', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', solution: 'c7', desc: 'Knight to c7 forks both the king on e8 and the rook on a8, winning material.' },
    { id: 'P3', title: 'Smothered Mate', type: 'Endgame', diff: 'Hard', coach: 'VISHNU', due: 'May 18', instruction: 'White to move. Deliver the famous smothered mate with your Knight!', fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', solution: 'f7', desc: 'Knight to f7 delivers checkmate because the king is completely boxed in by its own pieces.' },
    { id: 'P4', title: 'Queen Snipes the Rook', type: 'Tactics', diff: 'Easy', coach: 'VISHNU', due: 'Today', instruction: 'White to move. Slide your queen up the h-file and capture the undefended rook!', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', solution: 'h8', desc: 'Queen captures the undefended rook on h8. The black king on e8 cannot reach in time — a free piece!' },
    { id: 'P5', title: 'Knight Fork King & Rook', type: 'Tactics', diff: 'Medium', coach: 'ARIVUSELVAM', due: 'May 16', instruction: 'White knight leaps to a square that attacks both the black king AND rook simultaneously. Find the forking square!', fen: 'rnbqkbnr/pppppppp/8/8/8/8/2N5/RNBQKBNR w KQkq - 0 1', solution: 'e4', desc: 'Knight to e4 forks the black king on g5 and rook on d6. White wins a full rook next move!' },
    { id: 'P6', title: 'Pin and Win', type: 'Tactics', diff: 'Medium', coach: 'ARIVUSELVAM', due: 'May 17', instruction: 'The black rook is pinned along the bishop diagonal — a pinned piece cannot move. Simply capture it!', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', solution: 'c3', desc: 'Bishop takes c3! The rook was pinned to the king along the a1-e5 diagonal and could not escape.' },
    { id: 'P7', title: 'Pawn Promotion', type: 'Endgame', diff: 'Easy', coach: 'VISHNU', due: 'May 19', instruction: 'White pawn is one square from queening! Click the promotion square to advance.', fen: '8/4k3/8/3KP3/8/8/8/8 w - - 0 1', solution: 'e8', desc: 'Pawn to e8, queening! The black king is too far away to stop it — a textbook passed pawn endgame win.' }
  ],

  async init() {

    // 1. Fetch current user profile dynamically from DB layer.
    //    Trust the cached ck_user  credential-login users have no Supabase Auth
    //    session, so we must rely on the cached profile and NOT show an alarming
    //    "session expired" message (which fired spuriously on refresh/race).
    let currentUser = CK.currentUser;
    if (!currentUser) {
      try { currentUser = JSON.parse(localStorage.getItem('ck_user') || 'null'); } catch (_) {}
      if (currentUser) CK.currentUser = currentUser;
    }
    if (!currentUser || currentUser.role !== 'student') {
      // Quietly send to login  no scary toast.
      window.location.href = '/lms';
      return;
    }

    this.userProfile = await CK.db.getProfile(currentUser.id) || currentUser;
    this._solvedPuzzles = new Set(); // reset per-session so a new login starts fresh

    // Ensure numeric values and proper defaults
    this.userProfile.rating = parseInt(this.userProfile.rating) || 800;
    this.userProfile.star = parseInt(this.userProfile.star) || 0;
    this.userProfile.puzzle = parseInt(this.userProfile.puzzle) || 0;
    this.userProfile.game = parseInt(this.userProfile.game) || 0;

    // Restore SRS data from Supabase profile if available
    if (this.userProfile.srs_data) {
      try {
        const cloudSRS = JSON.parse(this.userProfile.srs_data);
        localStorage.setItem('ck_srs_v2', JSON.stringify(cloudSRS));
      } catch(e) {}
    }

    // 2. Load UI elements
    this.updateProfile();
    this.updateStreak(this.userProfile.id);
    this.renderDashboard();
    this.renderDailyGoals();
    this.renderSRSQueue();
    this.renderAttendanceCalendar();
    this.renderTournamentHistory();
    this.renderPuzzlesList();
    this.renderCoachReviews();
    this.renderAchievementsTab();
    // Gamification: render RPG rank card on dashboard
    if (CK.rpg) CK.rpg.renderRankCard('studentRankCard', this.userProfile?.id);
    this.renderFeesGateway();
    this.renderReportCard();
    this.initCharts();
    // Level hub and gating removed based on user request

    // Auto-sync Lichess data if linked (runs in background)
    this._autoSyncLichess();
    this.startCountdown();
    this.startAutoRefresh();
  },

  /*  Auto Refresh  */
  _studentRefreshTimer: null,

  startAutoRefresh() {
    if (this._studentRefreshTimer) clearInterval(this._studentRefreshTimer);
    this._studentRefreshTimer = setInterval(async () => {
      await this._renderLeaderboard();
      this.renderDailyGoals();
      this.renderSRSQueue();
      // Refresh dashboard if active
      const homePanel = document.getElementById('student-panel-home');
      if (homePanel && homePanel.classList.contains('active')) {
        await this.renderDashboard();
      }
      // Refresh presence in localStorage so admin can see student is active
      const presence = JSON.parse(localStorage.getItem('ck_live_presence') || '{}');
      const userId = this.userProfile?.id;
      if (userId) {
        presence[userId] = { name: this.userProfile.full_name, role: 'student', lastSeen: Date.now() };
        localStorage.setItem('ck_live_presence', JSON.stringify(presence));
      }
    }, 45000);
  },

  stopAutoRefresh() {
    if (this._studentRefreshTimer) { clearInterval(this._studentRefreshTimer); this._studentRefreshTimer = null; }
    if (window.studentCountdownTimer) { clearInterval(window.studentCountdownTimer); window.studentCountdownTimer = null; }
  },

  nav(panelId) {
    let targetPanelId = panelId;
    let highlightPanelId = panelId;
    let isSessionRedirect = false;

    if (panelId === 'session') {
      targetPanelId = 'classroom';
      highlightPanelId = 'session';
      isSessionRedirect = true;
    }

    document.querySelectorAll('#student-page .p-panel').forEach(p => p.classList.remove('active'));

    const target = document.getElementById(`student-panel-${targetPanelId}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('#student-page .p-nav-item').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('onclick')?.includes(`'${highlightPanelId}'`)) {
        btn.classList.add('active');
      }
    });

    // Re-render dynamic panels when navigated to
    if (targetPanelId === 'achievements') this.renderAchievementsTab();
    if (targetPanelId === 'myrank') this.renderMyRank();
    if (targetPanelId === 'studyplan') this.renderStudyPlan();
    if (targetPanelId === 'progress') { this.renderRealProgress(); this.initCharts(); }
    if (targetPanelId === 'report') this.renderReportCard();
    if (targetPanelId === 'fees') this.renderFeesGateway();
    if (targetPanelId === 'reviews') this.renderCoachReviews();
    if (targetPanelId === 'resources') this.renderResources();
    if (targetPanelId === 'tournaments') this.renderTournamentsTab();
    if (targetPanelId === 'linked') this.renderLinkedAccounts();
    if (targetPanelId === 'schedule') {
      if (CK.scheduleMatrix && this.userProfile) {
        CK.scheduleMatrix.coachesForStudent(this.userProfile.id).then(coachIds => {
          if (coachIds && coachIds.length) {
            CK.scheduleMatrix.render('studentScheduleList', { coachIds, title: 'My Class Schedule', subtitle: 'Your coach’s weekly timetable' });
          } else if (CK.schedulePro) {
            CK.schedulePro.renderStudentSchedule('studentScheduleList', this.userProfile);
          } else {
            const el = document.getElementById('studentScheduleList');
            if (el) el.innerHTML = '<div style="text-align:center;opacity:.5;padding:24px;">You’re not assigned to a class yet. Your coach will add you soon!</div>';
          }
        });
      } else if (CK.schedulePro) {
        CK.schedulePro.renderStudentSchedule('studentScheduleList', this.userProfile);
      }
    }
    if (targetPanelId === 'puzzles') {
      // Hydrate previously-solved puzzles from the DB so solved badges + the
      // "Completed X/Y" stat survive a page reload (was resetting every session).
      this._hydrateSolvedPuzzles().then(() => {
        this.renderPuzzlesList();
        if (CK.puzzlesPro) CK.puzzlesPro.renderPuzzleList('studentPuzzleProList', this.userProfile?.id, this.userProfile?.full_name);
      });
    }
    if (targetPanelId === 'vault') this.renderReplayVault();
    if (targetPanelId === 'openings' && CK.openingTrainer) { CK.openingTrainer.renderOpeningList('otGrid', this.userProfile?.id, 'all'); CK.openingTrainer.renderMasteryOverview('otMasteryOverview', this.userProfile?.id); }
    if (targetPanelId === 'games' && CK.gameTracker) { CK.gameTracker.renderStatsBanner('gtStatsBanner', this.userProfile?.id); CK.gameTracker.renderSubmitForm('gtSubmitForm', this.userProfile?.id); CK.gameTracker.renderGameList('gtGameList', this.userProfile?.id); }
    if (targetPanelId === 'path') this.renderSkillTree();
    if (targetPanelId === 'lab' && CK.lab) setTimeout(() => CK.lab.initBoard('studentLabBoard'), 100);
    if (targetPanelId === 'classroom' && window.CK && CK.classroom) {
      if (isSessionRedirect) {
        CK.classroom.studentTab('live');
      } else {
        CK.classroom.studentTab('homework');
      }
    } else if (targetPanelId !== 'classroom' && window.CK && CK.classroom) {
      CK.classroom.joinLiveClass && CK.classroom._stopPolling && CK.classroom._stopPolling();
    }

    const titles = {
      home: 'My Dashboard',
      progress: 'My Progress',
      schedule: 'My Schedule',
      session: 'Join Class',
      puzzles: 'My Puzzles',
      openings: 'Opening Trainer',
      games: 'Game Tracker',
      reviews: 'Coach Reviews',
      achievements: 'Achievements',
      path: 'Adaptive Mastery Skill Tree',
      vault: 'The Replay Vault',
      fees: 'Fee Payment Gateway',
      report: 'Official Student Report Card',
      linked: 'Linked Accounts',
      resources: 'Learning Resources',
      lab: 'PGN Stockfish Lab',
      tournaments: 'Tournaments',
      myrank: 'My Rank & XP',
      studyplan: 'AI Study Plan',
      classroom: 'My Classroom',
      homework: 'My Homework'
    };
    if (targetPanelId === 'homework' && window.CK && CK.classroom && CK.classroom.renderStudentHomeworkSection) {
      CK.classroom.renderStudentHomeworkSection('studentHomeworkSection');
    }
    const titleEl = document.getElementById('studentPanelTitle');
    if (titleEl) titleEl.innerText = titles[panelId] || 'Dashboard';
  },

  /*
     LEVEL SYSTEM  Removed based on user request
   */

  updateProfile() {
    const p = this.userProfile;
    const firstName = p.full_name ? p.full_name.split(' ')[0] : 'Champion';
    const initial = p.full_name ? p.full_name.charAt(0).toUpperCase() : '';

    // Sidebar
    const sbName   = document.getElementById('studentSidebarName');
    const sbSub    = document.getElementById('studentSidebarSub');
    const sbAvatar = document.getElementById('studentSidebarAvatar');
    if (sbName)   sbName.innerText   = p.full_name || 'Chess Student';
    if (sbSub)    sbSub.innerText    = `${p.level || 'Beginner'}  ELO ${p.rating || 800}`;
    if (sbAvatar) sbAvatar.innerText = initial;

    // Welcome banner  real puzzle count + next class name
    const welcomeName = document.getElementById('studentWelcomeName');
    const welcomeSub  = document.getElementById('studentWelcomeSub');
    if (welcomeName) welcomeName.textContent = firstName;
    const hour     = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const unsolvedCount = this.puzzlesDb.length - this._solvedPuzzles.size;
    const todayStr = new Date().toISOString().split('T')[0];
    // Use cached meetings (already fetched by renderDashboard) or localStorage fallback
    const _cachedMeetings = JSON.parse(localStorage.getItem('ck_meetings') || '[]');
    const nextMeeting = _cachedMeetings
      .filter(m => m.date >= todayStr).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time))[0];
    const classHint = nextMeeting
      ? `"${nextMeeting.title || nextMeeting.type || 'class'}" at ${nextMeeting.time}`
      : 'a class coming up soon';
    if (welcomeSub) welcomeSub.textContent =
      `${greeting}! ${unsolvedCount > 0 ? `${unsolvedCount} puzzle${unsolvedCount>1?'s':''} waiting` : 'All puzzles done today!'}  ${classHint}. Keep pushing!`;

    // FIDE level card
    const rating = parseInt(p.rating) || 800;
    const curRat = document.getElementById('studentCurrentRating');
    const curLvl = document.getElementById('studentCurrentLevel');
    const ratNum = document.getElementById('studentRatingNum');
    const ratLbl = document.getElementById('studentRatingLabel');
    if (curRat) curRat.innerText = `${rating} ELO`;
    if (curLvl) curLvl.innerText = p.level || 'Beginner';
    if (ratNum) ratNum.innerText = rating;
    if (ratLbl) ratLbl.innerText = `Level: ${p.level || 'Beginner'}`;

    // ELO progress bar toward next milestone
    const MILESTONES = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400];
    const nextMs = MILESTONES.find(m => m > rating) || 2400;
    const prevMs = MILESTONES.slice().reverse().find(m => m <= rating) || 800;
    const eloPct  = prevMs === nextMs ? 100 : Math.round((rating - prevMs) / (nextMs - prevMs) * 100);
    const eloBar  = document.getElementById('studentEloBar');
    const eloNext = document.getElementById('studentEloNext');
    if (eloBar)  eloBar.style.width = eloPct + '%';
    if (eloNext) eloNext.textContent = `Next Milestone: ${nextMs} ELO`;

    // Stats counters  real values
    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    setEl('studentStatLessons',  p.game   || 0);
    setEl('studentStatPuzzles',  p.puzzle || 0);
    setEl('studentStatStars',    p.star   || 0);
    setEl('studentStatRating',   rating);
    setEl('studentStatStreak',   this.getStreak(p.id)?.count || 0);

    // Game tracker stats if available
    if (p.id && typeof CK !== 'undefined' && CK.gameTracker) {
      const stats = CK.gameTracker.getStats(p.id);
      setEl('studentStatGamesPlayed', stats.total  || p.game || 0);
      setEl('studentStatWinRate',     (stats.winRate || 0) + '%');
    }

    this.updateAttendanceStats();
  },

  async updateAttendanceStats() {
    const logs = (await CK.db.getAttendance(this.userProfile.id)) || [];
    const presentCount = logs.filter(l => l.status === 'present').length;
    const totalCount = logs.length;
    const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

    const elAtt = document.getElementById('studentStatAttend');
    const elSum = document.getElementById('attendanceSummaryText');
    if (elAtt) elAtt.innerText = percentage + '%';
    if (elSum) elSum.innerText = `Present: ${presentCount} of ${totalCount} recorded sessions (${percentage}%)`;
  },

  async renderDashboard() {
    const p = this.userProfile || {};

    //  Streak badge
    if (p.id) {
      const streak = this.getStreak(p.id);
      this._renderStreakBadge(streak.count);
    }

    //  Presence heartbeat
    if (p.id) {
      const presence = JSON.parse(localStorage.getItem('ck_live_presence') || '{}');
      presence[p.id] = { name: p.full_name, role: 'student', lastSeen: Date.now() };
      localStorage.setItem('ck_live_presence', JSON.stringify(presence));
    }

    //  Real game stats from game-tracker
    if (p.id && typeof CK !== 'undefined' && CK.gameTracker) {
      const stats = CK.gameTracker.getStats(p.id);
      const elGames = document.getElementById('studentStatGames');
      const elWins  = document.getElementById('studentStatWins');
      const elWR    = document.getElementById('studentStatWinRate');
      if (elGames) elGames.textContent = stats.total || p.game || 0;
      if (elWins)  elWins.textContent  = stats.wins  || 0;
      if (elWR)    elWR.textContent    = (stats.winRate || 0) + '%';
    }

    // 1. Pending Puzzles table in dashboard home
    const pTable = document.getElementById('studentPendingPuzzles');
    if (pTable) {
      const _e = CK.esc || (s => s);
      const unsolved = this.puzzlesDb.filter(px => !this._solvedPuzzles.has(px.id)).slice(0, 2);
      const rows = unsolved.length ? unsolved : this.puzzlesDb.slice(0, 2);
      pTable.innerHTML = rows.map(px => `
        <tr>
          <td style="font-weight:600">${_e(px.title)}</td>
          <td>${_e(px.type)}</td>
          <td><span class="p-badge ${px.diff==='Easy'?'p-badge-green':px.diff==='Medium'?'p-badge-yellow':'p-badge-red'}">${_e(px.diff)}</span></td>
          <td>${_e(px.coach)}</td>
          <td style="color:var(--p-danger)">${_e(px.due)}</td>
          <td><button class="p-btn p-btn-blue p-btn-sm" onclick="CK.student.loadAndGoToPuzzle(${JSON.stringify(px.id)})">Solve</button></td>
        </tr>
      `).join('');
    }

    // Update puzzle notification count badge in sidebar
    const badge = document.getElementById('studentPuzzleBadge');
    if (badge) badge.innerText = this.puzzlesDb.length - this._solvedPuzzles.size;

    //  Real leaderboard from DB
    this._renderLeaderboard();

    // Daily puzzle title in home quick-card
    const dailyTitleEl = document.getElementById('dailyPuzzleTitle');
    if (dailyTitleEl) {
      const daily = this.puzzlesDb.find(x => x.id === this.getDailyPuzzleId());
      if (daily) {
        const solved = this._solvedPuzzles.has(daily.id);
        dailyTitleEl.textContent = solved
          ? `${daily.title}  ${daily.type}   Solved Today!`
          : `${daily.title}  ${daily.type}  ${daily.diff}`;
      }
    }

    // 2. Upcoming classes  fetched via DB layer (syncs from Supabase)
    const sTable = document.getElementById('studentUpcomingTable');
    const allMeetings = (window.CK && CK.db) ? (await CK.db.getMeetings()) || [] : [];

    // Live Class Banner Sync
    const liveMeeting = allMeetings.find(m => m.status === 'live' && (!m.batch || m.batch === p.batch));
    const liveBanner = document.getElementById('studentLiveClassBanner');
    if (liveBanner) {
      if (liveMeeting) {
        const liveSub = document.getElementById('studentLiveClassSub');
        if (liveSub) {
          const coachName = liveMeeting.coach || p.coach || 'Your Coach';
          const className = liveMeeting.title || liveMeeting.type || 'Chess Session';
          liveSub.innerHTML = `Your coach <strong>${coachName}</strong> is currently live-streaming the class: <strong>${className}</strong>. Join now to participate!`;
        }
        liveBanner.style.display = 'flex';
      } else {
        liveBanner.style.display = 'none';
      }
    }

    if (sTable) {
      const todayStr = new Date().toISOString().split('T')[0];
      const meetings = allMeetings
        .filter(m => m.date >= todayStr && (!m.batch || m.batch === p.batch))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 4);

      if (meetings.length) {
        const _e = CK.esc || (s => s);
        sTable.innerHTML = meetings.map(m => {
          const isToday = m.date === todayStr;
          const displayDate = isToday ? 'Today' : new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return `<tr>
            <td>${displayDate}</td>
            <td style="font-weight:600">${_e(m.title || m.type || 'Class')}</td>
            <td>${_e(m.coach || p.coach || 'Coach')}</td>
            <td>${_e(m.time || '')}</td>
            <td>${m.duration ? m.duration + 'm' : '60m'}</td>
            <td><span class="p-badge ${isToday ? 'p-badge-green' : 'p-badge-blue'}">${isToday ? 'Upcoming' : 'Scheduled'}</span></td>
          </tr>`;
        }).join('');
      } else {
        sTable.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; opacity:0.55;">No upcoming classes scheduled yet. Your coach will add sessions soon!</td></tr>`;
      }
    }
  },

  async renderAttendanceCalendar() {
    const calendar = document.getElementById('studentAttendanceCalendar');
    if (!calendar) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    let html = `<div style="grid-column:1/-1; font-family:var(--font-display); font-size:0.92rem; font-weight:700; color:var(--p-gold); margin-bottom:4px;">${monthName}</div>`;
    html += daysOfWeek.map(d => `<div class="p-cal-cell header">${d}</div>`).join('');

    // Fetch attendance from DB
    const logs = (await CK.db.getAttendance(this.userProfile.id)) || [];
    const attendanceMap = {};
    logs.forEach(l => {
      const d = new Date(l.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        attendanceMap[d.getDate()] = l.status;
      }
    });

    for (let i = 0; i < firstDayIndex; i++) {
      html += `<div></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
      const status = attendanceMap[day];
      let cls = 'p-cal-cell';
      let content = `<div>${day}</div>`;
      let tooltip = '';
      if (status === 'present') {
        cls += ' present';
        content += `<div style="font-size:0.55rem; margin-top:1px;"></div>`;
        tooltip = 'Present';
      } else if (status === 'absent') {
        cls += ' absent';
        content += `<div style="font-size:0.55rem; margin-top:1px;"></div>`;
        tooltip = 'Absent';
      }
      html += `<div class="${cls}" title="${tooltip}">${content}</div>`;
    }

    calendar.innerHTML = html;
  },

  async renderTournamentHistory() {
    const tbody = document.getElementById('studentTournamentTable');
    if (!tbody) return;

    const tournaments = await CK.db.getTourRatings(this.userProfile.userid || this.userProfile.id);
    if (!tournaments || tournaments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; opacity:0.5;">No tournament history recorded yet.</td></tr>';
      return;
    }

    const _e = CK.esc || (s => s);
    tbody.innerHTML = tournaments.map(t => `
      <tr>
        <td style="font-weight:600">${_e(t.name)}</td>
        <td>${_e(t.result)}</td>
        <td style="font-weight:700; color:${t.change?.startsWith('+') ? 'var(--p-teal)' : 'var(--p-danger)'}">${_e(t.change ?? '')} ELO</td>
      </tr>
    `).join('');
  },


  _subDocsRealtime() {
    if (this._docsRtSubbed) return;
    if (!window.supabaseClient || !window.supabaseClient.channel) return;
    this._docsRtSubbed = true;
    try {
      window.supabaseClient.channel('ck_student_docs_rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'document' }, () => {
          const panel = document.getElementById('student-panel-resources');
          if (panel && panel.classList.contains('active')) {
            if (this._activeResourceTab === 'assignments') this.renderAssignedResources();
            CK.showToast && CK.showToast('📚 New learning resource from your coach!', 'info');
          }
        })
        .subscribe();
    } catch (e) {}
  },

  async renderResources() {
    if (!this._activeResourceTab) this._activeResourceTab = 'elibrary';
    this._subDocsRealtime();
    const list = document.getElementById('studentResourcesList');
    if (list && !document.getElementById('studentELibrarySection')) {
      // Build the tabbed scaffold once (E-Library / Video Academy / Coach Assignments).
      // These containers were missing from the HTML, so the library never rendered.
      const cats = ['All', 'Beginner', 'Opening', 'Tactics', 'Middlegame', 'Strategy', 'Endgame', 'Psychology'];
      list.innerHTML = `
        <div class="resource-tabs">
          <button class="resource-tab-btn p-btn p-btn-sm" onclick="CK.student.switchResourceTab('elibrary')">📚 E-Library</button>
          <button class="resource-tab-btn p-btn p-btn-sm" onclick="CK.student.switchResourceTab('videos')">🎬 Video Academy</button>
          <button class="resource-tab-btn p-btn p-btn-sm" onclick="CK.student.switchResourceTab('assignments')">📋 Coach Assignments</button>
        </div>
        <div id="studentELibrarySection">
          <div class="elib-cat-bar">
            ${cats.map(c => `<button class="elib-cat-btn p-btn p-btn-sm p-btn-ghost" onclick="CK.student.filterELibrary('${c}')">${c}</button>`).join('')}
          </div>
          <div id="studentELibraryGrid"></div>
        </div>
        <div id="studentVideoAcademySection" style="display:none;">
          <div id="studentVideoGrid"></div>
          <div id="videoAcademyResumeList"></div>
        </div>
        <div id="studentAssignSection" style="display:none;"></div>`;
    }
    this.switchResourceTab(this._activeResourceTab);
  },

  async renderAssignedResources() {
    const list = document.getElementById('studentAssignSection') || document.getElementById('studentResourcesList');
    if (!list) return;

    // Guard: profile may not be loaded yet (e.g. panel rendered before init
    // finished, or after a session reset). Fall back to the cached user.
    const prof = this.userProfile || CK.currentUser || JSON.parse(localStorage.getItem('ck_user') || 'null');
    if (!prof) {
      list.innerHTML = '<div style="opacity:0.6; padding:20px; text-align:center;">Loading your resources</div>';
      return;
    }
    const myId    = prof.id    || prof.userid || '';
    const myLevel = prof.level || 'Beginner';
    const myBatch = prof.batch || '';
    const myCoach = prof.coach || '';

    const allDocs = await CK.db.getDocuments();
    const docs = (allDocs || []).filter(f => {
      // Show if directly assigned to this student
      if (f.user_ids) {
        const ids = f.user_ids.split(',').map(s => s.trim());
        if (ids.includes(myId)) return true;
      }
      // Fallback: show if level + (batch or coach) match and no specific assignment
      const levelMatch = !f.level || f.level === myLevel;
      const batchMatch = !f.batch || f.batch === 'All Batches' || f.batch === myBatch;
      const coachMatch = !f.coach || f.coach === myCoach;
      return levelMatch && batchMatch && coachMatch;
    });

    const defaultBooks = [
      { id: 'def-book-1', name: "Bobby Fischer Teaches Chess", type: "Book", difficulty: "Beginner", link: "https://archive.org/details/bobbyfischerteacheschess", notes: "Interactive way to learn basic mating patterns." },
      { id: 'def-book-2', name: "Chess Tactics for Kids", type: "Book", difficulty: "Beginner", link: "https://archive.org/details/chesstacticsfork0000chan", notes: "50 tricky tactics to master." },
      { id: 'def-book-3', name: "Logical Chess: Move By Move", type: "Book", difficulty: "Intermediate", link: "https://archive.org/details/logicalchessmove00cher_0", notes: "Every single move explained by Irving Chernev." },
      { id: 'def-book-4', name: "Silman's Complete Endgame Course", type: "Book", difficulty: "Intermediate", link: "https://archive.org/details/silmanscompletee0000silm", notes: "Essential endgame knowledge organized by rating." },
      { id: 'def-book-5', name: "My System by Aron Nimzowitsch", type: "Book", difficulty: "Advanced", link: "https://archive.org/details/mysystem0000unse", notes: "The classic treatise on positional chess." },
      { id: 'def-book-6', name: "Zurich International Chess Tournament 1953", type: "Book", difficulty: "Advanced", link: "https://archive.org/details/zurichinternatio0000bron", notes: "Masterpiece of chess literature by David Bronstein." }
    ].filter(b => b.difficulty === myLevel || myLevel === 'Tournament Ready');

    docs.push(...defaultBooks);

    if (!docs.length) {
      list.innerHTML = '<div style="opacity:0.6; padding:20px; text-align:center;">No resources assigned to your level yet. Check back soon!</div>';
      return;
    }

    // Track which docs the current student has already marked complete
    const completedMap = JSON.parse(localStorage.getItem('ck_resource_completions') || '{}');
    const completed = completedMap[myId] || {};

    const _e = CK.esc || (s => s);
    list.innerHTML = docs.map(f => {
      let openUrl = '';
      let icon = '';
      let btnLabel = 'Download';
      const refLink = f.link && /^https?:\/\//i.test(f.link) ? f.link : '';

      if (f.kind === 'link' || (f.url && /^https?:\/\//i.test(f.url))) {
        openUrl = f.url || f.file_name;
        icon = '';
        btnLabel = 'Open Link';
      } else if (f.file_name && /^https?:\/\//i.test(f.file_name || '')) {
        openUrl = f.file_name;
        icon = '';
        btnLabel = 'Open Link';
      } else if (f.file_name && window.supabaseClient) {
        const pub = window.supabaseClient.storage.from('documents').getPublicUrl(f.file_name);
        openUrl = pub?.data?.publicUrl || '';
      }
      // If no file/url but a reference link exists, use it as the primary action
      if (!openUrl && refLink) { openUrl = refLink; icon = ''; btnLabel = 'Open Link'; }

      const safeUrl = openUrl ? _e(openUrl) : '';
      const action = safeUrl
        ? `onclick="window.open('${safeUrl}','_blank','noopener,noreferrer')"`
        : `onclick="CK.showToast('Resource not available yet.','warning')"`;

      // Choose icon by type
      const type = (f.type || 'Material').toLowerCase();
      if (type.includes('video')) icon = '';
      else if (type.includes('pgn'))   icon = '';
      else if (type.includes('homework')) icon = '';
      else if (type.includes('puzzle')) icon = '';
      else if (type.includes('reading')) icon = '';
      else if (type.includes('note'))  icon = '';
      else if (type.includes('link'))  icon = '';

      // Optional badges: difficulty, due date, XP reward
      const badges = [];
      if (f.difficulty) {
        const dIcon = { Easy:'', Medium:'', Hard:'', Expert:'' }[f.difficulty] || '';
        badges.push(`<span class="ck-res-badge ck-res-badge-${f.difficulty.toLowerCase()}">${dIcon} ${_e(f.difficulty)}</span>`);
      }
      if (f.due_date) {
        const dueDate = new Date(f.due_date);
        const today = new Date(); today.setHours(0,0,0,0);
        const overdue = dueDate < today;
        badges.push(`<span class="ck-res-badge ${overdue ? 'ck-res-badge-overdue' : 'ck-res-badge-due'}"> ${overdue ? 'Overdue' : 'Due'} ${_e(f.due_date)}</span>`);
      }
      const xp = parseInt(f.xp_reward) || 0;
      if (xp > 0) badges.push(`<span class="ck-res-badge ck-res-badge-xp"> +${xp} XP</span>`);

      const isDone = !!completed[f.id || f.name];
      const completeBtn = isDone
        ? `<button class="p-btn p-btn-ghost p-btn-sm" disabled> Completed</button>`
        : `<button class="p-btn p-btn-teal p-btn-sm" onclick="CK.student.markResourceComplete('${_e(f.id || f.name)}', ${xp})"> Mark Complete</button>`;

      return `
        <div class="p-resource-item ${isDone ? 'ck-res-done' : ''}">
          <div style="flex:1;min-width:0;">
            <div class="p-resource-name">${icon} ${_e(f.name)}</div>
            <div class="p-resource-note"> ${_e(f.level || myLevel)}  ${_e(f.type || 'Material')}${f.notes ? '  ' + _e(f.notes) : ''}</div>
            ${badges.length ? `<div class="ck-res-badges">${badges.join('')}</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="p-btn p-btn-blue p-btn-sm" ${action}>${btnLabel}</button>
            ${refLink && openUrl !== refLink ? `<button class="p-btn p-btn-ghost p-btn-sm" onclick="window.open('${_e(refLink)}','_blank','noopener,noreferrer')"> Reference</button>` : ''}
            ${completeBtn}
          </div>
        </div>`;
    }).join('');
  },

  /* Mark a resource as completed and award the configured XP */
  async markResourceComplete(resourceKey, xpReward) {
    const myId = this.userProfile.id || this.userProfile.userid || '';
    const completedMap = JSON.parse(localStorage.getItem('ck_resource_completions') || '{}');
    completedMap[myId] = completedMap[myId] || {};
    if (completedMap[myId][resourceKey]) {
      CK.showToast('Already marked complete.', 'info');
      return;
    }
    completedMap[myId][resourceKey] = new Date().toISOString();
    localStorage.setItem('ck_resource_completions', JSON.stringify(completedMap));
    if (CK.db && CK.db.awardXP && xpReward > 0) {
      await CK.db.awardXP(myId, xpReward, 'Completed assignment');
    } else {
      CK.showToast(' Marked complete!', 'success');
    }
    this.renderResources();
  },

  _solvedPuzzles: new Set(),
  _puzzleTimer: null,
  _puzzleSeconds: 0,
  _puzzleMistakes: 0,
  _puzzleXP: 0,
  _pzBoardInstance: null,
  _pzGame: null,

  startPuzzleTimer() {
    this.stopPuzzleTimer();
    this._puzzleSeconds = 0;
    this._puzzleMistakes = 0;
    this._updateTimerDisplay();
    this._puzzleTimer = setInterval(() => {
      this._puzzleSeconds++;
      this._updateTimerDisplay();
    }, 1000);
  },

  stopPuzzleTimer() {
    if (this._puzzleTimer) { clearInterval(this._puzzleTimer); this._puzzleTimer = null; }
  },

  _updateTimerDisplay() {
    const el = document.getElementById('pzTimer');
    if (!el) return;
    const m = Math.floor(this._puzzleSeconds / 60).toString().padStart(2, '0');
    const s = (this._puzzleSeconds % 60).toString().padStart(2, '0');
    el.textContent = ` ${m}:${s}`;
  },

  getXPForPuzzle(diff, seconds, mistakes) {
    const base = { Easy: 10, Medium: 25, Hard: 50 }[diff] || 10;
    const speedBonus = seconds < 30 ? 1.5 : seconds < 60 ? 1.2 : 1;
    const mistakePenalty = Math.max(0.5, 1 - mistakes * 0.15);
    return Math.round(base * speedBonus * mistakePenalty);
  },

  getDailyPuzzleId() {
    const dayIndex = Math.floor(Date.now() / 86400000);
    return this.puzzlesDb[dayIndex % this.puzzlesDb.length].id;
  },

  showXPPopup(xp) {
    const area = document.getElementById('pzActiveArea');
    if (!area) return;
    const el = document.createElement('div');
    el.className = 'pz-xp-popup';
    el.textContent = `+${xp} XP`;
    area.style.position = 'relative';
    area.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  },

  async renderPuzzleLeaderboard() {
    const container = document.getElementById('pzLeaderboardBody');
    if (!container) return;
    const _e = CK.esc || (s => s);
    const students = (await CK.db.getProfiles('student')) || [];
    const myId = this.userProfile ? this.userProfile.id : null;
    const sorted = [...students].sort((a, b) => (b.puzzle || 0) - (a.puzzle || 0)).slice(0, 8);
    if (!sorted.length) {
      container.innerHTML = '<p style="opacity:.5;text-align:center;padding:20px;">No student data yet.</p>';
      return;
    }
    container.innerHTML = sorted.map((s, i) => {
      const medal = ['', '', ''][i] || `#${i + 1}`;
      const isMe = s.id === myId;
      return `<div class="pz-lb-row${isMe ? ' pz-lb-row--me' : ''}">
        <span class="pz-lb-rank">${medal}</span>
        <span class="pz-lb-name">${_e(s.full_name || 'Unknown')}</span>
        <span class="pz-lb-val"> ${s.star || 0}</span>
        <span class="pz-lb-val"> ${s.puzzle || 0}</span>
      </div>`;
    }).join('');
  },

  openLeaderboard() {
    const modal = document.getElementById('pzLeaderboardModal');
    if (modal) { modal.style.display = 'flex'; this.renderPuzzleLeaderboard(); }
  },

  closeLeaderboard() {
    const modal = document.getElementById('pzLeaderboardModal');
    if (modal) modal.style.display = 'none';
  },

  /* Use the real 60-puzzle chess.com-style set from puzzles-pro.js (CC0 Lichess
     themed tactics with FULL multi-move solutions), not the 7 fake puzzles. */
  _pzList() {
    const pro = (window.CK && CK.puzzlesPro && CK.puzzlesPro.PUZZLES) || [];
    if (!pro.length) return this.puzzlesDb;
    return pro.map(p => ({
      id: p.id, title: p.title, type: (p.theme || 'tactics').replace(/_/g, ' '),
      diff: p.rating < 900 ? 'Easy' : p.rating < 1100 ? 'Medium' : 'Hard',
      rating: p.rating, fen: p.fen, moves: p.moves || [], hint: p.hint || ''
    }));
  },

  /* Load this student's solved puzzles from puzzle_scores into the in-memory
     set, so solved state + stats persist across reloads. */
  async _hydrateSolvedPuzzles() {
    try {
      const sid = this.userProfile?.id || this.userProfile?.userid;
      const name = this.userProfile?.full_name;
      if (!sid && !name) return;
      const scores = (await CK.db.getPuzzleScores()) || [];
      scores.forEach(s => {
        if (s.solved && (s.userId === sid || s.userId === this.userProfile?.userid || (name && s.userName === name))) {
          this._solvedPuzzles.add(s.puzzleId);
        }
      });
    } catch (e) { /* offline → keep session set */ }
  },

  renderPuzzlesList() {
    const container = document.getElementById('puzzlesListPanel');
    if (!container) return;
    const list = this._pzList();
    const diffColor = { Easy: 'p-badge-green', Medium: 'p-badge-yellow', Hard: 'p-badge-red' };
    container.innerHTML = list.map(p => {
      const solved = this._solvedPuzzles.has(p.id);
      return `
        <div class="p-puzzle-card ${this.activePuzzleId === p.id ? 'active' : ''}" onclick="CK.student.loadPuzzle('${p.id}')">
          <div class="p-puzzle-icon">${solved ? '✓' : '🧩'}</div>
          <div class="p-puzzle-info">
            <div class="p-puzzle-title">${p.title}</div>
            <div class="p-puzzle-sub">${p.type} · ⭐${p.rating} · <span class="p-badge ${diffColor[p.diff] || 'p-badge-blue'}" style="font-size:0.7rem; padding:1px 6px;">${p.diff}</span></div>
          </div>
          <button class="p-btn ${solved ? 'p-btn-ghost' : 'p-btn-gold'} p-btn-sm">${solved ? 'Redo' : 'Solve'}</button>
        </div>`;
    }).join('');

    const pzSolvedEl = document.getElementById('pzStatSolved');
    if (pzSolvedEl) pzSolvedEl.textContent = `${this._solvedPuzzles.size}/${list.length}`;
    const pzStarEl = document.getElementById('pzStatStars');
    if (pzStarEl && this.userProfile) pzStarEl.textContent = `${this.userProfile.star || 0}/5`;
  },

  loadAndGoToPuzzle(id) {
    this.nav('puzzles');
    setTimeout(() => this.loadPuzzle(id), 80);
  },

  /* Highlight the last move's from/to squares so the student can SEE where the
     opponent (or they themselves) just moved. Pure DOM — no chessboard.js hook. */
  _pzHighlight(from, to) {
    const wrap = document.getElementById('studentPuzzleBoardContainer');
    if (!wrap) return;
    wrap.querySelectorAll('.pz-hl-from, .pz-hl-to').forEach(el => el.classList.remove('pz-hl-from', 'pz-hl-to'));
    if (!from || !to) return;
    const f = wrap.querySelector('[data-square="' + from + '"]'); if (f) f.classList.add('pz-hl-from');
    const t = wrap.querySelector('[data-square="' + to + '"]'); if (t) t.classList.add('pz-hl-to');
  },

  loadPuzzle(id) {
    const p = this._pzList().find(x => x.id === id);
    if (!p) return;
    if (!p.fen || !Array.isArray(p.moves) || !p.moves.length) {
      CK.showToast('This puzzle is missing data — pick another.', 'warning'); return;
    }
    this.activePuzzleId = id;
    this._activePuzzle = p;
    this._pzMoveIdx = 0;
    this._puzzleSeconds = 0;
    this._puzzleMistakes = 0;
    this._pzAwaiting = false;

    const placeholder = document.getElementById('pzPlaceholder');
    const activeArea = document.getElementById('pzActiveArea');
    if (placeholder) placeholder.style.display = 'none';
    if (activeArea) activeArea.style.display = 'flex';

    document.querySelectorAll('#puzzlesListPanel .p-puzzle-card').forEach(el => el.classList.remove('active'));
    const matchEl = [...document.querySelectorAll('#puzzlesListPanel .p-puzzle-card')].find(el => el.getAttribute('onclick') && el.getAttribute('onclick').includes(id));
    if (matchEl) matchEl.classList.add('active');

    const titleEl = document.getElementById('puzzleTitle');
    if (titleEl) titleEl.textContent = p.title;

    const instrEl = document.getElementById('puzzleInstructions');
    if (instrEl) instrEl.innerHTML = `
      <span class="p-badge ${p.diff === 'Easy' ? 'p-badge-green' : p.diff === 'Hard' ? 'p-badge-red' : 'p-badge-yellow'}" style="font-size:0.72rem; padding:2px 8px;">${p.type} · ${p.diff} · ⭐${p.rating}</span>
      <p style="margin:8px 0 0; color:rgba(255,255,255,0.78);">Drag a piece to make the best move. The opponent will reply automatically.</p>
    `;

    // Hide previous feedback
    const fb = document.getElementById('puzzleFeedback');
    if (fb) { fb.style.display = 'none'; fb.className = 'pz-feedback'; fb.textContent = ''; }

    // Start puzzle timer
    this.startPuzzleTimer();

    // Build position: play the setup move (moves[0]) so the student solves from
    // index 1 — exactly how Lichess/Chess.com puzzle trainers work.
    const boardEl = document.getElementById('studentPuzzleBoardContainer');
    if (!boardEl) return;
    this._pzGame = new Chess(p.fen);
    const setup = p.moves[0];
    if (setup) {
      this._pzGame.move({ from: setup.slice(0, 2), to: setup.slice(2, 4), promotion: setup[4] || 'q' });
      this._pzMoveIdx = 1;
    }
    const orientation = this._pzGame.turn() === 'w' ? 'white' : 'black';
    const instrEl2 = document.getElementById('puzzleInstructions');
    if (instrEl2) instrEl2.insertAdjacentHTML('beforeend',
      `<div class="pz-tomove"><span class="pz-tomove-dot ${orientation}"></span>${orientation === 'white' ? 'White' : 'Black'} to move — your turn</div>`);

    const target = 'studentPuzzleBoard';
    if (this._pzBoardInstance) { try { this._pzBoardInstance.destroy(); } catch (_) {} this._pzBoardInstance = null; }
    boardEl.innerHTML = '<div id="' + target + '" style="width:100%;max-width:440px;margin:0 auto;"></div>';
    const self = this;
    const mk = () => {
      const el = document.getElementById(target);
      if (!el || el.getBoundingClientRect().width < 20) { requestAnimationFrame(mk); return; }
      self._pzBoardInstance = Chessboard(target, {
        pieceTheme: (pc) => 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/' + pc.toLowerCase() + '.png',
        position: self._pzGame.fen(),
        orientation,
        draggable: true,
        onDrop: (src, tgt) => self._pzOnDrop(src, tgt),
        onSnapEnd: () => { if (self._pzBoardInstance) self._pzBoardInstance.position(self._pzGame.fen()); }
      });
      // Indicate the opponent's setup move so the student sees what just happened.
      if (setup) setTimeout(() => self._pzHighlight(setup.slice(0, 2), setup.slice(2, 4)), 60);
      self._pzAttachClick();   // enable tap-to-move (in addition to drag)
    };
    requestAnimationFrame(() => requestAnimationFrame(mk));
  },

  /* Click / tap to move: tap a piece (legal moves light up), tap a destination.
     Reuses the same validation as drag (_pzOnDrop). Great on mobile. */
  _pzAttachClick() {
    const wrap = document.getElementById('studentPuzzleBoardContainer');
    if (!wrap || wrap._pzClickBound) return;
    wrap._pzClickBound = true;
    wrap.addEventListener('click', (e) => {
      const cell = e.target.closest('[data-square]');
      if (cell) this._pzClickSquare(cell.getAttribute('data-square'));
    });
  },
  _pzClickSquare(sq) {
    const g = this._pzGame;
    if (!g || this._pzAwaiting) return;
    const turn = g.turn();
    if (this._pzSel) {
      if (sq === this._pzSel) { this._pzClearSelect(); return; }
      const legal = g.moves({ square: this._pzSel, verbose: true }).some(m => m.to === sq);
      if (legal) { const from = this._pzSel; this._pzClearSelect(); this._pzOnDrop(from, sq); return; }
      const pc = g.get(sq);
      if (pc && pc.color === turn) { this._pzSelect(sq); return; }
      this._pzClearSelect();
      return;
    }
    const pc = g.get(sq);
    if (pc && pc.color === turn) this._pzSelect(sq);
  },
  _pzSelect(sq) {
    this._pzClearSelect();
    this._pzSel = sq;
    const wrap = document.getElementById('studentPuzzleBoardContainer');
    if (!wrap) return;
    const cell = wrap.querySelector('[data-square="' + sq + '"]');
    if (cell) cell.classList.add('pz-selected');
    this._pzGame.moves({ square: sq, verbose: true }).forEach(m => {
      const d = wrap.querySelector('[data-square="' + m.to + '"]');
      if (d) d.classList.add(m.captured ? 'pz-legal-cap' : 'pz-legal');
    });
  },
  _pzClearSelect() {
    this._pzSel = null;
    const wrap = document.getElementById('studentPuzzleBoardContainer');
    if (wrap) wrap.querySelectorAll('.pz-selected, .pz-legal, .pz-legal-cap')
      .forEach(el => el.classList.remove('pz-selected', 'pz-legal', 'pz-legal-cap'));
  },

  /* Professional multi-move solve: validate the player's move against the
     solution line; correct → auto-play the opponent's reply (highlighted) and
     continue; wrong → snap back, count a mistake. */
  _pzOnDrop(source, target) {
    if (this._pzAwaiting) return 'snapback';
    const p = this._activePuzzle, g = this._pzGame;
    if (!p || !g) return 'snapback';
    const move = g.move({ from: source, to: target, promotion: 'q' });
    if (!move) return 'snapback';
    const expected = p.moves[this._pzMoveIdx] || '';
    if (move.from === expected.slice(0, 2) && move.to === expected.slice(2, 4)) {
      this._pzMoveIdx++;
      this._pzHighlight(move.from, move.to);
      setTimeout(() => { if (this._pzBoardInstance) this._pzBoardInstance.position(g.fen(), true); }, 10);
      if (this._pzMoveIdx >= p.moves.length) { this._pzSolved(p); return; }
      // opponent replies
      this._pzAwaiting = true;
      this._pzFeedback('success', '✓ Correct! Keep going…');
      setTimeout(() => {
        const opp = p.moves[this._pzMoveIdx];
        if (opp) {
          const om = g.move({ from: opp.slice(0, 2), to: opp.slice(2, 4), promotion: opp[4] || 'q' });
          this._pzMoveIdx++;
          if (this._pzBoardInstance) this._pzBoardInstance.position(g.fen(), true);
          if (om) setTimeout(() => this._pzHighlight(om.from, om.to), 130);
        }
        this._pzAwaiting = false;
      }, 480);
    } else {
      this._puzzleMistakes++;
      if (this._srs) this._srs.record(p.id, false);
      g.undo();
      setTimeout(() => { if (this._pzBoardInstance) this._pzBoardInstance.position(g.fen(), false); }, 10);
      this._pzFeedback('error', '✗ Not the best move — look for a more forcing one and try again.');
      return 'snapback';
    }
  },

  _pzFeedback(kind, msg) {
    const fb = document.getElementById('puzzleFeedback');
    if (!fb) return;
    fb.style.display = 'block';
    fb.className = 'pz-feedback ' + (kind === 'success' ? 'success' : kind === 'error' ? 'error' : 'hint');
    fb.innerHTML = msg;
  },

  /* A burst of confetti over the puzzle board — makes solving feel rewarding. */
  _pzCelebrate(perfect) {
    try {
      const host = document.getElementById('studentPuzzleBoardContainer') || document.body;
      const rect = host.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + Math.max(40, rect.height / 2);
      const colors = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#14b8a6', '#fde047'];
      const layer = document.createElement('div');
      layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;';
      document.body.appendChild(layer);
      const n = perfect ? 64 : 38;
      for (let i = 0; i < n; i++) {
        const d = document.createElement('div');
        const size = 6 + Math.random() * 9;
        d.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${colors[i % colors.length]};border-radius:${Math.random() < 0.5 ? '50%' : '2px'};`;
        layer.appendChild(d);
        const ang = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 230;
        const tx = Math.cos(ang) * dist, ty = Math.sin(ang) * dist + 140;
        if (d.animate) d.animate([
          { transform: 'translate(0,0) rotate(0)', opacity: 1 },
          { transform: `translate(${tx}px,${ty}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 }
        ], { duration: 900 + Math.random() * 800, easing: 'cubic-bezier(.2,.7,.3,1)' });
      }
      setTimeout(() => layer.remove(), 1900);
    } catch (e) {}
  },

  _pzSolved(p) {
    if (this.stopPuzzleTimer) this.stopPuzzleTimer();
    const xp = this.getXPForPuzzle ? this.getXPForPuzzle(p.diff, this._puzzleSeconds, this._puzzleMistakes) : 30;
    this._puzzleXP = (this._puzzleXP || 0) + xp;
    if (this.showXPPopup) this.showXPPopup(xp);
    const perfect = (this._puzzleMistakes || 0) === 0;
    this._pzStreak = perfect ? (this._pzStreak || 0) + 1 : 0;
    this._pzCelebrate(perfect);
    const praise = perfect
      ? (this._pzStreak >= 5 ? '🏆 Unstoppable!' : this._pzStreak >= 3 ? '🔥 On fire!' : '🌟 Perfect!')
      : '🎉 Solved!';
    CK.showToast(`${praise} +${xp} XP${this._pzStreak >= 2 ? ' · 🔥 ' + this._pzStreak + ' in a row' : ''}`, 'success');
    this._solvedPuzzles.add(p.id);
    if (this._srs) this._srs.record(p.id, true);
    if (this._trackDailyGoal) this._trackDailyGoal('puzzles');
    if (this.renderSRSQueue) this.renderSRSQueue();
    this._pzFeedback('success', `${perfect ? '⭐ <strong>Perfect solve!</strong>' : '🎉 <strong>Solved!</strong>'} “${CK.esc ? CK.esc(p.title) : p.title}” · +${xp} XP · ${this._puzzleMistakes} mistake${this._puzzleMistakes === 1 ? '' : 's'}${this._pzStreak >= 2 ? ` · 🔥 <strong>${this._pzStreak} perfect in a row!</strong>` : ''}`);
    if (this.userProfile) {
      this.userProfile.puzzle = (parseInt(this.userProfile.puzzle) || 0) + 1;
      if ((this.userProfile.star || 0) < 5) this.userProfile.star = (parseInt(this.userProfile.star) || 0) + 1;
      const sid = this.userProfile.id || this.userProfile.userid;
      CK.db.saveProfile(this.userProfile).then(() => {
        CK.db.savePuzzleScore({ id: Date.now().toString(36) + Math.random().toString(36).slice(2), userId: sid, userName: this.userProfile.full_name || '', puzzleId: p.id, solved: true, time: this._puzzleSeconds, mistakes: this._puzzleMistakes, xp, date: new Date().toISOString() })
          .then(() => { if (this.updateProfile) this.updateProfile(); this.renderPuzzlesList(); });
      });
    }
    setTimeout(() => { if (this.activePuzzleId === p.id) this.nextPuzzle(); }, 2600);
  },

  showPuzzleHint() {
    const p = this._activePuzzle;
    if (!p) return;
    // Theme hint + a square nudge: highlight the from-square of the next correct move.
    const next = (p.moves && p.moves[this._pzMoveIdx]) || '';
    if (next) this._pzHighlight(next.slice(0, 2), null);
    this._pzFeedback('hint', '💡 ' + (p.hint || 'Look for forcing moves — checks, captures, and threats.') + (next ? ' <em>(the glowing square is your piece to move)</em>' : ''));
  },

  showPuzzleSolution() {
    const p = this._activePuzzle;
    if (!p) return;
    const next = (p.moves && p.moves[this._pzMoveIdx]) || '';
    if (!next) { this._pzFeedback('hint', 'No further moves — the puzzle is complete.'); return; }
    this._pzHighlight(next.slice(0, 2), next.slice(2, 4));
    this._pzFeedback('hint', `<strong>Solution:</strong> play <strong>${next.slice(0, 2)} → ${next.slice(2, 4)}</strong>. ${p.hint || ''}`);
  },

  nextPuzzle() {
    const list = this._pzList();
    // Prefer the next UNSOLVED puzzle; fall back to the next in order.
    const idx = list.findIndex(x => x.id === this.activePuzzleId);
    let next = list.slice(idx + 1).find(x => !this._solvedPuzzles.has(x.id))
            || list.find(x => !this._solvedPuzzles.has(x.id))
            || list[idx + 1];
    if (next && next.id !== this.activePuzzleId) {
      this.loadPuzzle(next.id);
    } else {
      CK.showToast('🏆 You have solved every puzzle — outstanding!', 'success');
    }
  },

  async renderCoachReviews() {
    const container = document.getElementById('studentReviewsContainer');
    if (!container) return;

    const myReviews = await CK.tracker?.getReviews(this.userProfile?.full_name || '') || [];

    if (!myReviews.length) {
      container.innerHTML = '<div class="cls-empty"> No coach reviews posted yet. Keep attending classes!</div>';
      return;
    }

    const _e = CK.esc || (s => s);
    container.innerHTML = myReviews.map(r => `
      <div class="p-review-note">
        <div class="p-review-note-header">
          <span class="p-review-note-coach"> ${_e(r.coach)}</span>
          <span class="p-review-note-date">${_e(r.date)}</span>
        </div>
        <p class="p-review-note-text">"${_e(r.text)}"</p>
      </div>
    `).join('');
  },

  async renderReplayVault() {
    const container = document.querySelector('#student-panel-vault .p-card-body');
    if (!container) return;

    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--p-text-muted);">
        <div class="p-spinner" style="margin: 0 auto 12px; width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--p-blue); border-radius: 50%; animation: spin 1s linear infinite;"></div>
        Loading synced class archives...
      </div>
    `;

    try {
      const allDocs = await CK.db.getDocuments();
      const recordings = allDocs.filter(d => d.type === 'recording');

      if (recordings.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--p-surface3); border: 1px dashed rgba(255,255,255,0.1); border-radius: 14px;">
            <div style="font-size: 3rem; margin-bottom: 16px;"></div>
            <h3 style="color: #fff; font-size: 1.15rem; margin-bottom: 8px;">No Synced Class Replays Yet</h3>
            <p style="color: var(--p-text-muted); font-size: 0.9rem; max-width: 400px; margin: 0 auto;">
              When your coach streams and completes a live session, the automated recording will appear here.
            </p>
          </div>
        `;
        return;
      }

      const _esc = CK.esc || (s => s);
      container.innerHTML = recordings.map((rec, index) => {
        const title = rec.name || 'Chess Class Replay';
        const coach = rec.coach || 'Academy Coach';
        const dateStr = rec.created_at ? new Date(rec.created_at).toLocaleDateString() : 'Recent';
        const notes = rec.notes || 'Automated lesson recording archive.';
        const link = rec.link || '';

        const badgeClass = index % 2 === 0 ? 'p-badge-blue' : 'p-badge-gold';
        const btnClass = index % 2 === 0 ? 'p-btn-blue' : 'p-btn-gold';
        const pieceIcon = index % 3 === 0 ? '' : (index % 3 === 1 ? '' : '');

        return `
          <div class="p-card-vault-item"
            style="background: var(--p-surface3); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, border-color 0.2s;">
            <div
              style="position: relative; height: 160px; background: #0c1420; display:flex; align-items:center; justify-content:center; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <div style="font-size: 4rem;">${pieceIcon}</div>
              <div
                style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.8); color:#fff; font-size:0.75rem; padding:2px 8px; border-radius:4px;">
                ${dateStr}</div>
            </div>
            <div
              style="padding: 20px; flex: 1; display:flex; flex-direction:column; justify-content:space-between; gap: 12px;">
              <div>
                <div class="p-badge ${badgeClass}" style="margin-bottom:8px;">${_esc(rec.level || 'All Levels')}</div>
                <h3 style="font-size:1.15rem; font-family:var(--font-display); color:#fff; margin-bottom:8px;">
                  ${_esc(title)}</h3>
                <p style="font-size:0.85rem; color:var(--p-text-muted); margin-bottom:12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${_esc(notes)}
                </p>
                <div style="font-size: 0.8rem; color: var(--p-text-muted);">Coach: <strong style="color: #fff;">${_esc(coach)}</strong></div>
              </div>
              <button class="p-btn ${btnClass}" style="width:100%; margin-top: auto;"
                onclick="CK.openVaultSession('${_esc(title.replace(/'/g, "\\'"))}', '${_esc(coach.replace(/'/g, "\\'"))}', '${_esc(link.replace(/'/g, "\\'"))}')">
                 Study Session Replay
              </button>
            </div>
          </div>
        `;
      }).join('');

    } catch (e) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ef4444;">
           Error loading synced class archives. Please try again.
        </div>
      `;
    }
  },

  async renderAchievementsTab() {
    // Guard: profile may not be loaded yet (rapid nav before init completes).
    const prof = this.userProfile || CK.currentUser || JSON.parse(localStorage.getItem('ck_user') || 'null');
    if (!prof) return;
    const stars = prof.star || 0;

    // Star display
    let starStr = '';
    for (let i = 0; i < 5; i++) {
      starStr += i < stars ? '★' : '☆';
    }
    const starsEl = document.getElementById('achievementStarsDisplay');
    if (starsEl) starsEl.innerText = starStr;
    const progressEl = document.getElementById('achievementLevelProgressText');
    if (progressEl) progressEl.innerText = `You have earned ${stars} out of 5 stars!`;

    // Fetch actual attendance stats for dynamic milestone unlock
    const logs = (await CK.db.getAttendance(prof.id)) || [];
    const presentCount = logs.filter(l => l.status === 'present').length;
    const totalCount = logs.length;
    const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

    // Achievements grid
    const grid = document.getElementById('achievementsListGrid');
    if (grid) {
      const achievements = [
        { title: "Academy Pioneer", desc: "First-time registered academy member.", icon: "", unlocked: true },
        { title: "Puzzle Prodigy", desc: `Solve 20+ academy puzzles (Current: ${this.userProfile.puzzle}).`, icon: "", unlocked: this.userProfile.puzzle >= 20 },
        { title: "Century Contender", desc: `Surpass 1000+ rating on the academy (Current: ${this.userProfile.rating}).`, icon: "", unlocked: this.userProfile.rating >= 1000 },
        { title: "Flawless Learner", desc: `Surpass 90% attendance record (Current: ${attendancePercentage}%).`, icon: "", unlocked: attendancePercentage >= 90 }
      ];

      grid.innerHTML = achievements.map(a => `
        <div class="p-achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
          <div class="p-achievement-icon" style="${!a.unlocked ? 'filter:grayscale(1)' : ''}">${a.icon}</div>
          <div>
            <div class="p-achievement-title">${a.title}</div>
            <div class="p-achievement-desc">${a.desc}</div>
          </div>
          ${a.unlocked ? '<span class="p-badge p-badge-gold" style="margin-left:auto; flex-shrink:0;">Unlocked</span>' : ''}
        </div>
      `).join('');
    }

    // Certificate section  use real jsPDF system
    const certEl = document.getElementById('studentCertSection');
    if (certEl && CK.certs) {
      const attnSummary = (await CK.classSystem?.getStudentAttendanceSummary(this.userProfile.id)) || { pct: attendancePercentage };
      const puzzlesSolved = ((await CK.puzzlesPro?.getLeaderboard()) || []).find(u => u.userId === this.userProfile.id)?.solved || (this.userProfile.puzzle || 0);
      CK.certs.renderStudentCerts(certEl.id, this.userProfile, attnSummary.pct || attendancePercentage, puzzlesSolved);
    } else {
      // Fallback  old static cert logic
      const hasCert = this.userProfile.certificate && this.userProfile.certificate !== "";
      const certStatusEl = document.getElementById('certificateDownloadStatus');
      if (certStatusEl) certStatusEl.innerText = hasCert
        ? `Congratulations! Your ${this.userProfile.level || 'Beginner'} certificate is ready.`
        : `Complete requirements to unlock your certificate. Current stars: ${stars}/5.`;
      const downloadBtn = document.getElementById('downloadCertBtn');
      if (downloadBtn) {
        downloadBtn.disabled = !hasCert;
        downloadBtn.className = hasCert ? 'p-btn p-btn-gold' : 'p-btn p-btn-ghost';
        downloadBtn.style.opacity = hasCert ? '1' : '0.3';
        if (hasCert) downloadBtn.onclick = () => CK.certs?.claimCert();
      }
    }
  },

  /*  My Rank & XP Panel  */
  renderMyRank() {
    const p = this.userProfile;
    if (!p) return;
    if (CK.rpg) {
      CK.rpg.renderRankCard('studentRankCardFull', p.id);
      CK.rpg.renderXPFeed('studentXPFeed', p.id);
      CK.rpg.renderLeaderboard('studentLeaderboard');
      CK.rpg.renderBadgeGrid('studentBadgeGrid', p.id);
    }
  },

  /*  AI Study Plan Panel  */
  async renderStudyPlan() {
    const p = this.userProfile;
    if (!p || !CK.ai) return;

    try {
      // Run analysis first
      const analysis = await CK.ai.analyzeStudent(p.id);
      if (!analysis) return;

      // Weakness radar chart  ensure canvas exists
      const chartEl = document.getElementById('studentWeaknessChart');
      if (chartEl && !chartEl.querySelector('canvas')) {
        chartEl.innerHTML = '<canvas id="studentWeaknessCanvas" style="max-height:280px;"></canvas>';
      }
      CK.ai.renderWeaknessChart('studentWeaknessCanvas', analysis);

      // Study plan
      const plan = CK.ai.generateStudyPlan(analysis);
      CK.ai.renderStudyPlan('studentStudyPlan', plan);

      // ELO prediction
      const predEl = document.getElementById('studentELOPrediction');
      if (predEl) {
        const pred = await CK.ai.predictELO(p.id, 12);
        const p6 = pred.predictions && pred.predictions[5] ? pred.predictions[5].predictedELO : '';
        const p12 = pred.predictions && pred.predictions[11] ? pred.predictions[11].predictedELO : '';
        predEl.innerHTML = `
          <div style="text-align:center;">
            <div style="font-size:0.8rem; color:var(--p-text-muted); margin-bottom:8px;">Current ELO</div>
            <div style="font-size:2rem; font-weight:900; color:var(--p-gold);">${p.rating || 800}</div>
            <div style="margin:16px 0; font-size:1.4rem; color:var(--p-teal);"></div>
            <div style="font-size:0.8rem; color:var(--p-text-muted); margin-bottom:8px;">Predicted in 6 Months</div>
            <div style="font-size:2rem; font-weight:900; color:var(--p-teal);">${p6}</div>
            <div style="font-size:0.75rem; color:var(--p-text-muted); margin-top:12px;">12-month prediction: <strong>${p12}</strong></div>
            <div style="font-size:0.72rem; color:var(--p-text-muted); margin-top:4px;">Confidence: ${pred.confidence || 'medium'}</div>
          </div>`;
      }
    } catch(e) { }
  },

  regenerateStudyPlan() {
    CK.showToast('Regenerating your AI study plan...', 'info');
    setTimeout(() => this.renderStudyPlan(), 300);
  },

  /*  Streak System  */
  getStreak(userId) {
    const key = `ck_streak_${userId || 'anon'}`;
    // Prefer data stored on the user profile (set by updateStreak)
    const p = this.userProfile;
    if (p && p.streak_count !== undefined) {
      return { count: p.streak_count || 0, lastDate: p.streak_last_date || '' };
    }
    return JSON.parse(localStorage.getItem(key) || '{"count":0,"lastDate":""}');
  },

  updateStreak(userId) {
    const key = `ck_streak_${userId || 'anon'}`;
    const today = new Date().toDateString();
    const data = this.getStreak(userId);
    if (data.lastDate === today) return data.count;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newCount = data.lastDate === yesterday ? data.count + 1 : 1;
    const updated = { count: newCount, lastDate: today };
    localStorage.setItem(key, JSON.stringify(updated));
    // Persist to Supabase via user profile
    if (this.userProfile && this.userProfile.id && typeof CK !== 'undefined' && CK.db) {
      const profilePatch = Object.assign({}, this.userProfile, { streak_count: newCount, streak_last_date: today });
      CK.db.saveProfile(profilePatch).catch(() => {});
      this.userProfile.streak_count = newCount;
      this.userProfile.streak_last_date = today;
    }
    this._renderStreakBadge(newCount);
    if (newCount > 0 && newCount % 7 === 0 && typeof CK !== 'undefined' && CK.notifs) {
      CK.notifs.push('puzzle_streak', ` ${newCount}-Day Streak!`, `You've practised ${newCount} days in a row. Keep the fire going!`, userId, 'student');
    }
    return newCount;
  },

  _renderStreakBadge(count) {
    document.querySelectorAll('.student-streak-count').forEach(el => {
      el.textContent = count;
    });
    document.querySelectorAll('.student-streak-fire').forEach(el => {
      el.textContent = count >= 3 ? '' : count >= 1 ? '' : '';
    });
  },

  async _renderLeaderboard() {
    const lbBody = document.getElementById('studentLeaderboardBody');
    if (!lbBody) return;
    const p = this.userProfile || {};
    const allStudents = (await CK.db.getProfiles('student')) || [];
    const sorted = allStudents
      .filter(s => s.rating)
      .sort((a, b) => (parseInt(b.rating) || 0) - (parseInt(a.rating) || 0));
    const userRank = sorted.findIndex(s => s.id === p.id) + 1;
    const rankColors = ['var(--p-gold)', '#94a3b8', '#cd7f32'];
    const medals = ['', '', ''];
    const top5 = sorted.slice(0, 5);
    let html = top5.map((s, i) => {
      const isMe = s.id === p.id;
      const medal = medals[i] || `#${i + 1}`;
      const color = rankColors[i] || 'var(--p-text-muted)';
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 10px;border-radius:8px;margin-bottom:4px;background:${isMe ? 'rgba(0,201,167,.1)' : 'rgba(255,255,255,.03)'};border:1px solid ${isMe ? 'rgba(0,201,167,.3)' : 'transparent'}">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-weight:700;color:${color};min-width:28px;text-align:center;font-size:${i < 3 ? '1.1rem' : '.85rem'}">${medal}</span>
            <div>
              <div style="font-weight:${isMe ? '700' : '500'};color:${isMe ? 'var(--p-teal)' : 'var(--p-text)'};font-size:.88rem;">${s.full_name || 'Anonymous'}${isMe ? ' (You)' : ''}</div>
              <div style="font-size:.72rem;color:var(--p-text-muted);">${s.level || 'Beginner'}  ${s.puzzle || 0} puzzles</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700;color:${color};font-size:.9rem;">${parseInt(s.rating) || 800} ELO</div>
            <div style="font-size:.68rem;color:var(--p-text-muted);"> ${s.star || 0}</div>
          </div>
        </div>`;
    }).join('');
    if (userRank > 5) {
      html += `
        <div style="border-top:1px dashed rgba(255,255,255,.1);margin-top:8px;padding-top:8px;display:flex;align-items:center;justify-content:space-between;padding:10px;border-radius:8px;background:rgba(0,201,167,.08);border:1px solid rgba(0,201,167,.2)">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-weight:700;color:var(--p-teal);min-width:28px;text-align:center;">#${userRank}</span>
            <div>
              <div style="font-weight:700;color:var(--p-teal);font-size:.88rem;">${p.full_name || 'You'} (You)</div>
              <div style="font-size:.72rem;color:var(--p-text-muted);">${p.level || 'Beginner'}  ${p.puzzle || 0} puzzles</div>
            </div>
          </div>
          <span style="font-weight:700;color:var(--p-teal)">${parseInt(p.rating) || 800} ELO</span>
        </div>`;
    }
    lbBody.innerHTML = html || '<div class="cls-empty">No rankings yet. Be the first!</div>';

    // Update "my rank" badge if present
    const rankBadge = document.getElementById('studentMyRank');
    if (rankBadge && userRank > 0) rankBadge.textContent = `#${userRank}`;
  },

  /*  Daily Goal Tracker  */
  _trackDailyGoal(type) {
    const key = 'ck_daily_' + new Date().toDateString();
    const goals = JSON.parse(localStorage.getItem(key) || '{"puzzles":0,"lessons":0,"games":0}');
    goals[type] = (goals[type] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(goals));
    if (type === 'puzzles' && this.userProfile) this.updateStreak(this.userProfile.id);
    this.renderDailyGoals();
  },

  renderDailyGoals() {
    const el = document.getElementById('studentDailyGoals');
    if (!el) return;
    const key = 'ck_daily_' + new Date().toDateString();
    const done = JSON.parse(localStorage.getItem(key) || '{"puzzles":0,"lessons":0,"games":0}');
    const targets = { puzzles: 5, lessons: 2, games: 1 };
    const items = [
      { k: 'puzzles', label: 'Daily Puzzles', icon: '', color: 'var(--p-gold)' },
      { k: 'lessons', label: 'Lessons Watched', icon: '', color: 'var(--p-blue)' },
      { k: 'games',   label: 'Games Played',   icon: '',  color: 'var(--p-teal)' }
    ];
    el.innerHTML = `
      <div class="dg-grid">
        ${items.map(g => {
          const val = done[g.k] || 0;
          const pct = Math.min(100, Math.round((val / targets[g.k]) * 100));
          const done2 = val >= targets[g.k];
          return `<div class="dg-item${done2 ? ' dg-done' : ''}">
            <span class="dg-icon">${g.icon}</span>
            <div class="dg-body">
              <div class="dg-label">${g.label}</div>
              <div class="dg-bar-wrap"><div class="dg-bar" style="width:${pct}%;background:${g.color}"></div></div>
              <div class="dg-count">${val} / ${targets[g.k]}${done2 ? ' ' : ''}</div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  },

  /*  Spaced Repetition System  */
  _srs: {
    _key: 'ck_srs_v2',
    _getLog() {
      return JSON.parse(localStorage.getItem(this._key) || '{}');
    },
    _saveLog(log) {
      localStorage.setItem(this._key, JSON.stringify(log));
      // Also persist to Supabase via user profile srs_data field
      const st = window.CK && CK.student;
      if (st && st.userProfile && st.userProfile.id && CK.db) {
        const patch = Object.assign({}, st.userProfile, { srs_data: JSON.stringify(log) });
        CK.db.saveProfile(patch).catch(() => {});
        st.userProfile.srs_data = JSON.stringify(log);
      }
    },
    record(puzzleId, success) {
      const log = this._getLog();
      const e = log[puzzleId] || { attempts: 0, successes: 0, interval: 1, nextReview: Date.now() };
      e.attempts++;
      if (success) {
        e.successes++;
        e.interval = Math.min(21, e.interval <= 1 ? 3 : e.interval * 2);
      } else {
        e.interval = 1;
      }
      e.nextReview = Date.now() + e.interval * 86400000;
      e.lastAttempt = Date.now();
      log[puzzleId] = e;
      this._saveLog(log);
    },
    getDue(puzzlesDb) {
      const log = this._getLog();
      const now = Date.now();
      return puzzlesDb.filter(p => log[p.id] && log[p.id].nextReview <= now);
    },
    getStats(puzzlesDb) {
      const log = this._getLog();
      const now = Date.now();
      const entries = Object.values(log);
      return {
        due: puzzlesDb.filter(p => log[p.id] && log[p.id].nextReview <= now).length,
        mastered: entries.filter(e => e.interval >= 8).length,
        total: entries.length
      };
    }
  },

  renderSRSQueue() {
    const el = document.getElementById('srsQueuePanel');
    if (!el) return;
    const due = this._srs.getDue(this.puzzlesDb);
    const stats = this._srs.getStats(this.puzzlesDb);
    const badge = document.getElementById('srsReviewBadge');
    if (badge) badge.textContent = due.length || '';

    if (!due.length) {
      el.innerHTML = `<div class="cls-empty">
         No puzzles due for review today.<br>
        <span style="font-size:.78rem;">Mastered: ${stats.mastered}  Total reviewed: ${stats.total}</span>
      </div>`;
      return;
    }
    el.innerHTML = `
      <div style="margin-bottom:10px;font-size:.82rem;color:var(--p-text-muted)">
         <strong style="color:var(--p-gold)">${due.length}</strong> puzzle${due.length > 1 ? 's' : ''} due for review  ${stats.mastered} mastered
      </div>
      ${due.map(p => `
        <div class="srs-card" onclick="CK.student.loadAndGoToPuzzle('${p.id}')">
          <span class="srs-icon"></span>
          <div class="srs-info"><div class="srs-title">${p.title}</div><div class="srs-meta">${p.type}  ${p.diff}</div></div>
          <button class="p-btn p-btn-gold p-btn-sm">Review</button>
        </div>`).join('')}`;
  },

  /*
     REAL PROGRESS CALCULATION
     Weighted score from 5 pillars: attendance, puzzles,
     rating gain, games played, homework completion.
   */
  async renderRealProgress() {
    const p = this.userProfile;
    if (!p) return;

    // 1. Attendance (30%)  from advanced attendance records
    const attnSummary = (await CK.classSystem?.getStudentAttendanceSummary(p.id)) || { total: 0, present: 0, pct: 0 };
    const logs = (await CK.db.getAttendance(p.id)) || [];
    const presentCount = logs.filter(l => l.status === 'present').length;
    const totalSessions = attnSummary ? attnSummary.total : logs.length;
    const presentSessions = attnSummary ? attnSummary.present : presentCount;
    const attendancePct = totalSessions > 0 ? Math.round(presentSessions / totalSessions * 100) : 0;

    // 2. Puzzles (25%)  real solved count from puzzles-pro
    const lbEntry = ((await CK.puzzlesPro?.getLeaderboard()) || []).find(u => u.userId === p.id);
    const puzzlesSolved = lbEntry?.solved || (p.puzzle || 0);
    const puzzleScore = Math.min(100, Math.round(puzzlesSolved / 60 * 100)); // 60 = total in DB

    // 3. Rating gain (20%)  from start to now
    const startRating = 800;
    const ratingGain = Math.max(0, (p.rating || 800) - startRating);
    const ratingScore = Math.min(100, Math.round(ratingGain / 4)); // 400pt gain = 100%

    // 4. Games played (15%)
    const gamesScore = Math.min(100, Math.round((p.game || 0) * 5)); // 20 games = 100%

    // 5. Homework (10%)  from classroom submissions
    const submissions = JSON.parse(localStorage.getItem('ck_hw_submissions') || '[]').filter(s => s.student_id === p.id || s.studentId === p.id);
    const assignments  = JSON.parse(localStorage.getItem('ck_assignments') || '[]');
    const hwDone  = submissions.filter(s => s.completed).length;
    const hwTotal = assignments.length;
    const hwScore = hwTotal > 0 ? Math.round(hwDone / hwTotal * 100) : 0;

    // Weighted overall score
    const overall = Math.round(
      attendancePct  * 0.30 +
      puzzleScore    * 0.25 +
      ratingScore    * 0.20 +
      gamesScore     * 0.15 +
      hwScore        * 0.10
    );

    // Update progress panel UI
    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const setW  = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = pct + '%'; };

    setEl('progOverallScore',   overall + '%');
    setEl('progAttendancePct',  attendancePct + '%');
    setEl('progPuzzlePct',      puzzleScore + '%');
    setEl('progRatingPct',      ratingScore + '%');
    setEl('progGamesPct',       gamesScore + '%');
    setEl('progHwPct',          hwScore + '%');
    setEl('progAttendanceVal',  `${presentSessions} / ${totalSessions} sessions`);
    setEl('progPuzzleVal',      `${puzzlesSolved} / 60 solved`);
    setEl('progRatingVal',      `+${ratingGain} ELO (${p.rating || 800} now)`);
    setEl('progGamesVal',       `${p.game || 0} games`);
    setEl('progHwVal',          hwTotal > 0 ? `${hwDone} / ${hwTotal} submitted` : 'No homework yet');

    setW('progBarAttendance', attendancePct);
    setW('progBarPuzzle',     puzzleScore);
    setW('progBarRating',     ratingScore);
    setW('progBarGames',      gamesScore);
    setW('progBarHw',         hwScore);

    // Score ring (SVG-based)
    const ring = document.getElementById('progScoreRing');
    if (ring) {
      const circ = 2 * Math.PI * 42;
      const dash = circ * overall / 100;
      ring.style.strokeDasharray = `${dash} ${circ}`;
    }

    // Trend label
    const trendEl = document.getElementById('progTrend');
    if (trendEl) {
      trendEl.textContent = overall >= 80 ? ' Excellent Progress!' : overall >= 60 ? ' Good Progress' : overall >= 40 ? ' Making Progress' : ' Needs Improvement';
      trendEl.style.color = overall >= 80 ? 'var(--p-teal)' : overall >= 60 ? 'var(--p-blue)' : overall >= 40 ? 'var(--p-gold)' : 'var(--p-danger)';
    }

    // Render puzzle leaderboard using puzzles-pro
    if (CK.puzzlesPro) {
      await CK.puzzlesPro.renderLeaderboard('progLeaderboard');
    }

    // Render certificates section
    if (CK.certs) {
      CK.certs.renderStudentCerts('progCertsSection', p, attendancePct, puzzlesSolved);
    }

    // Render monthly reports
    if (CK.reportSystem) {
      await CK.reportSystem.renderStudentReports('progReportsList', p.id);
    }

    return overall;
  },

  async initCharts() {
    const ctx = document.getElementById('ratingChart')?.getContext('2d');
    if (!ctx) return;
    if (!this.userProfile) return; // profile not loaded yet  avoid null crash

    // Fetch historical ratings from DB
    const history = await CK.db.getRatings(this.userProfile.id || this.userProfile.userid);

    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let labels = [now];
    let onlineData = [this.userProfile.rating || 800];
    let intData = [parseInt(this.userProfile.fide_rating) || 0];

    if (history && history.length > 0) {
      labels = history.map(h => new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      onlineData = history.map(h => h.online || this.userProfile.rating || 800);
      intData = history.map(h => h.international || 0);
      // Append current rating as last data point if not already today's
      labels.push(now);
      onlineData.push(this.userProfile.rating || 800);
      intData.push(parseInt(this.userProfile.fide_rating) || 0);
    }

    // Destroy existing chart if present to prevent rendering bugs
    if (window.studentRatingChartInstance) {
      window.studentRatingChartInstance.destroy();
    }

    window.studentRatingChartInstance = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Online Chess Rating',
            data: onlineData,
            borderColor: '#5b9cf6',
            backgroundColor: 'rgba(91,156,246,0.06)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#5b9cf6',
            pointRadius: 4
          },
          {
            label: 'International / FIDE Rating',
            data: intData,
            borderColor: '#e8b84b',
            backgroundColor: 'rgba(232,184,75,0.03)',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            fill: false,
            pointBackgroundColor: '#e8b84b',
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#7a8499', boxWidth: 15, font: { size: 11 } }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#7a8499' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#7a8499' }
          }
        }
      }
    });

    // Skill Radar / Heatmap Chart (Dynamic via AI Engine)
    const ctxRadar = document.getElementById('skillRadarChart')?.getContext('2d');
    if (ctxRadar) {
      if (window.CK && CK.ai && this.userProfile) {
        try {
          const analysis = await CK.ai.analyzeStudent(this.userProfile.id || this.userProfile.userid);
          if (analysis) {
            CK.ai.renderWeaknessChart('skillRadarChart', analysis);
            return;
          }
        } catch (e) {
          CK.ai.renderWeaknessChart('skillRadarChart', null);
        }
      }

      // Fallback if AI system is not loaded or fails
      const rc = (this.userProfile && this.userProfile.report_card) || {};
      if (window._skillRadarInst) window._skillRadarInst.destroy();
      window._skillRadarInst = new window.Chart(ctxRadar, {
        type: 'radar',
        data: {
          labels: ['Opening', 'Middlegame', 'Tactics', 'Endgame', 'Time Mgmt', 'Sportsmanship'],
          datasets: [{
            label: 'Skill Level',
            data: [
              rc.opening    || 75,
              rc.middlegame || 70,
              rc.tactics    || 80,
              rc.endgame    || 65,
              rc.time       || 72,
              rc.sports     || 88
            ],
            backgroundColor: 'rgba(232,184,75,0.13)',
            borderColor: '#e8b84b',
            pointBackgroundColor: '#e8b84b',
            pointBorderColor: '#0f172a',
            pointRadius: 5,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              min: 0, max: 100, beginAtZero: true,
              grid:        { color: 'rgba(255,255,255,0.07)' },
              angleLines:  { color: 'rgba(255,255,255,0.07)' },
              ticks:       { color: 'rgba(255,255,255,0.25)', stepSize: 25, backdropColor: 'transparent', font: { size: 9 } },
              pointLabels: { color: '#e2e8f0', font: { size: 11, weight: '600' } }
            }
          }
        }
      });
    }
  },

  async startCountdown() {
    const el = document.getElementById('studentCountdown');
    if (!el) return;

    const p = this.userProfile || {};

    // Fetch upcoming meetings via DB layer (Supabase-synced)
    const todayStr = new Date().toISOString().split('T')[0];
    const allMeetings = (await CK.db.getMeetings()) || [];
    const meetings = allMeetings
      .filter(m => m.date >= todayStr && m.time && (!m.batch || m.batch === p.batch))
      .sort(compareDateTime);

    // Cache in localStorage for the welcome banner fallback
    localStorage.setItem('ck_meetings', JSON.stringify(allMeetings));

    let classTime = null;
    let classTitle = `${p.level || 'Intermediate'} Strategy Session`;
    let classCoach = p.coach || '';
    let classDuration = null;
    let classStudents = null;
    let classDate = null;

    // DYNAMIC next class from THIS student's actual schedule (the classes they're
    // enrolled in). Computes the soonest upcoming day+time across their classes,
    // so it updates automatically when a coach edits the timetable.
    let schedNext = null;
    try {
      const _dayIdx = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
      const allClasses = (await CK.db.getClasses()) || [];
      const myClasses = allClasses.filter(c => (c.studentIds || []).includes(p.id));
      const now = new Date();
      myClasses.forEach(c => {
        const mins = parseTimeMinutes(c.time); if (mins == null) return;
        (c.days || []).forEach(d => {
          const di = _dayIdx[String(d).slice(0, 3).toLowerCase()]; if (di == null) return;
          const dt = new Date(now); dt.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
          let delta = (di - now.getDay() + 7) % 7;
          if (delta === 0 && dt < now) delta = 7;
          dt.setDate(now.getDate() + delta);
          if (!schedNext || dt < schedNext.dt) schedNext = { dt, c };
        });
      });
    } catch (e) {}

    if (schedNext) {
      classTime = schedNext.dt;
      classTitle = schedNext.c.title || (schedNext.c.batch ? ('Batch ' + schedNext.c.batch) : classTitle);
      classCoach = schedNext.c.coachName || classCoach;
      classDuration = schedNext.c.duration || null;
      classDate = schedNext.dt.toISOString().split('T')[0];
      classStudents = (schedNext.c.studentIds || []).length;
    } else if (meetings.length) {
      const next = meetings[0];
      classTime = parseDateFromTime(next.date, next.time);
      classTitle = next.title || next.type || classTitle;
      classCoach = next.coachName || next.coach || classCoach;
      classDuration = next.duration || null;
      classDate = next.date || null;
      if (typeof next.students === 'number') classStudents = next.students;
      else if (Array.isArray(next.studentIds)) classStudents = next.studentIds.length;
    }
    // No fabricated fallback — if there's no real recurring class or meeting,
    // we show "No class scheduled" rather than inventing a today-5pm session.
    const hasRealClass = !!(schedNext || (meetings && meetings.length));
    if (!hasRealClass) classTime = null;

    const displayTime = classTime
      ? classTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : '—';

    const nameEl = document.getElementById('nextClassTime');
    const classEl = document.getElementById('nextClassName');
    const subEl   = document.getElementById('nextClassSub');
    if (nameEl) nameEl.innerText = hasRealClass ? displayTime : 'No class scheduled';
    if (classEl) classEl.innerText = hasRealClass ? classTitle : '—';
    if (subEl)   subEl.innerText  = hasRealClass
      ? (classCoach && classCoach !== '' ? `with Coach ${classCoach}` : 'Check your schedule')
      : 'Your coach will add sessions soon';

    // Duration chip  from the meeting's real duration
    const durEl = document.getElementById('studentSessionDuration');
    if (durEl) durEl.innerText = hasRealClass ? ` ${classDuration || 60} mins` : '—';

    // Student count chip  real count; fall back to headcount of this batch/coach
    const studEl = document.getElementById('studentSessionStudents');
    if (studEl) {
      if (classStudents == null) {
        try {
          const all = (await CK.db.getProfiles('student')) || [];
          classStudents = all.filter(s =>
            (p.batch && s.batch === p.batch) || (p.coach && s.coach === classCoach)
          ).length;
        } catch (_) { classStudents = 0; }
      }
      studEl.innerText = hasRealClass ? ` ${classStudents} student${classStudents === 1 ? '' : 's'}` : '—';
    }

    // LIVE badge — based on whether a real class exists (recurring OR meeting),
    // not just one-off meetings (fixed the "NO CLASS + countdown" contradiction).
    const badgeEl = document.getElementById('studentLiveBadge');
    if (badgeEl) {
      const isToday = classDate === todayStr || (classTime && classTime.toDateString() === new Date().toDateString());
      badgeEl.innerText = hasRealClass ? (isToday ? ' LIVE TODAY' : ' UPCOMING') : ' NO CLASS';
    }

    if (window.studentCountdownTimer) clearInterval(window.studentCountdownTimer);

    const tick = () => {
      if (!classTime) { el.innerText = hasRealClass ? 'Check schedule' : 'No class scheduled'; el.style.color = ''; return; }
      const remaining = Math.max(0, Math.round((classTime - new Date()) / 60000));
      if (remaining === 0) {
        el.innerText = ' Starting now!';
        el.style.color = 'var(--p-teal)';
      } else if (remaining < 60) {
        el.innerText = `Starts in ${remaining}m`;
        el.style.color = remaining < 15 ? 'var(--p-danger)' : '';
      } else {
        const h = Math.floor(remaining / 60);
        const displayStart = classTime
          ? classTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          : '';
        el.innerText = displayStart ? `Starts at ${displayStart}` : `Starts in ${h}h ${remaining % 60}m`;
        el.style.color = remaining < 15 ? 'var(--p-danger)' : '';
      }
    };
    tick();
    window.studentCountdownTimer = setInterval(tick, 30000);
  },

  async joinClass() {
    this._trackDailyGoal('lessons');
    const sessionTitleEl = document.getElementById('studentSessionTitle');
    const joinBtn = document.getElementById('studentJoinBtn');
    if (joinBtn) {
      joinBtn.innerText = 'Connecting...';
      joinBtn.disabled = true;
    }

    const profile = this.userProfile || CK.currentUser || {};
    let meetInfo = null;
    try {
      meetInfo = CK.classroom && CK.classroom.resolveStudentMeetUrl
        ? await CK.classroom.resolveStudentMeetUrl(profile)
        : null;
    } catch (err) {
      console.warn('[Join Class] Failed to resolve coach-provided link:', err);
    }

    if (!meetInfo || !meetInfo.url) {
      CK.showToast('Class link not yet set. Ask your coach to paste the Google Meet URL for this class.', 'warning');
      if (sessionTitleEl) sessionTitleEl.innerText = 'Waiting for coach-provided class link';
      if (joinBtn) {
        joinBtn.innerText = ' Join Class Room';
        joinBtn.disabled = false;
      }
      return;
    }

    if (sessionTitleEl) sessionTitleEl.innerText = `Joining ${meetInfo.label || 'class'}...`;
    CK.showToast(`Opening class link added by your coach...`, 'success');

    if (CK.classroom && CK.classroom.openMeetUrl) {
      CK.classroom.openMeetUrl(meetInfo.url);
    } else {
      window.open(meetInfo.url, '_blank', 'noopener,noreferrer');
    }

    if (CK.classroom && CK.classroom.recordStudentJoinAttendance) {
      try {
        await CK.classroom.recordStudentJoinAttendance(meetInfo, profile);
      } catch (err) {
        console.warn('[Join Class] Attendance save failed:', err);
      }
    }

    setTimeout(() => {
      if (joinBtn) {
        joinBtn.innerText = ' Rejoin Class Room';
        joinBtn.disabled = false;
      }
      if (sessionTitleEl) sessionTitleEl.innerText = `${meetInfo.label || 'Class'} link is ready`;
    }, 3000);
  },

  async renderReportCard() {
    const _e = CK.esc || (s => s);
    const p = this.userProfile || {};

    // Fetch dynamic AI analysis
    let analysis = null;
    let plan = null;
    if (window.CK && CK.ai && p.id) {
      try {
        analysis = await CK.ai.analyzeStudent(p.id);
        if (analysis) plan = CK.ai.generateStudyPlan(analysis);
      } catch (e) {
        plan = null;
      }
    }
    const aiScores = analysis?.scores || {};

    let remarks = "Excellent concentration and tactical calculation. Shows great promise when navigating complex middlegame positions. Focus on active rook placements in pawn endgames.";
    let goals = ["Participate in State Level Rapid U-14", "Master Lucena and Philidor Rook Endgames", "Maintain blunder rate under 3% in tournaments"];

    if (analysis && plan) {
       remarks = `Based on recent game analysis, ${_e(p.full_name || 'the student')} has a strong foundation in ${analysis.strengths.join(', ') || 'basic principles'}. Current priority should be improving ${analysis.weaknesses.join(' and ') || 'overall consistency'}. Consistent practice will yield great results.`;
       goals = plan.focus.map(f => `Target ${f.targetScore} score in ${f.name}`);
    }

    // --- Internal Metrics ---
    const userId = p.id;
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

    // --- External Metrics ---
    let lichessRapid = 0, chesscomRapid = 0;
    if (CK.linkedAccounts) {
      if (p.lichess_username) {
        const liStats = await CK.linkedAccounts.fetchLichess(p.lichess_username);
        if (liStats) lichessRapid = liStats.rapid;
      }
      if (p.chesscom_username) {
        const ccStats = await CK.linkedAccounts.fetchChesscom(p.chesscom_username);
        if (ccStats) chesscomRapid = ccStats.rapid;
      }
    }

    // --- ALGORITHM: Predicted ELO ---
    let baseElo = p.rating || 1200;
    let externalElo = 0;
    let extWeight = 0;

    if (lichessRapid > 0) { externalElo += lichessRapid; extWeight++; }
    if (chesscomRapid > 0) { externalElo += chesscomRapid; extWeight++; }

    if (extWeight > 0) {
      externalElo = externalElo / extWeight;
      const normalizedExternal = Math.max(800, externalElo - 100);
      baseElo = Math.round((baseElo * 0.4) + (normalizedExternal * 0.6));
    }

    const puzzleBonus = Math.min(100, puzzlesSolved * 1.5);
    const accBonus = (gameStats.avgAccuracy - 70) * 3;
    const winBonus = (gameStats.winRate - 50) * 2;
    const masteryBonus = (avgMastery - 20) * 1.5;

    let predictedElo = Math.round(baseElo + puzzleBonus + accBonus + winBonus + masteryBonus);
    if (predictedElo < 400) predictedElo = 400;

    // Save auto-updated ELO
    if (Math.abs(predictedElo - (p.rating || 1200)) > 20 && p.id) {
      const profile = await CK.db.getProfile(p.id);
      if (profile) {
        profile.rating = predictedElo;
        await CK.db.saveProfile(profile);
      }
      p.rating = predictedElo;
    }

    const rc = p.report_card || {
      opening: Math.round(Math.max(40, Math.min(99, 50 + masteryBonus))),
      middlegame: aiScores.pawn_struct || 76,
      tactics: aiScores.tactics || 88,
      endgame: aiScores.endgame || 62,
      'time': aiScores.time_mgmt || 71,
      sports: aiScores.king_safety || 95,
      remarks: remarks,
      goals: goals
    };

    const getGrade = (mark) => {
      if (mark >= 90) return 'A+';
      if (mark >= 80) return 'A';
      if (mark >= 70) return 'B';
      if (mark >= 60) return 'C';
      return 'D';
    };

    const elBody = document.querySelector('#student-panel-report .p-card-body');
    if (elBody) {
      elBody.innerHTML = `
        <div class="report-card-modern" id="printableReportCard" style="background: var(--p-surface); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); max-width: 900px; margin: 0 auto; overflow: hidden; position: relative;">
          <!-- Decorative Background Gradients -->
          <div style="position:absolute; top:-100px; left:-100px; width:300px; height:300px; background:radial-gradient(circle, rgba(0,201,167,0.15) 0%, transparent 70%); border-radius:50%; pointer-events:none;"></div>
          <div style="position:absolute; bottom:-100px; right:-100px; width:300px; height:300px; background:radial-gradient(circle, rgba(232,184,75,0.1) 0%, transparent 70%); border-radius:50%; pointer-events:none;"></div>

          <!-- Header Section -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 20px;">
            <div style="display:flex; align-items:center; gap: 20px;">
              <div style="width: 70px; height: 70px; border-radius: 16px; background: linear-gradient(135deg, var(--p-gold), #d97706); display:flex; align-items:center; justify-content:center; font-size: 2.5rem; box-shadow: 0 8px 16px rgba(232,184,75,0.3);">♔</div>
              <div>
                <h1 style="margin:0; font-size:2rem; font-family:var(--font-display); color:#fff; letter-spacing:-0.5px;">Performance Analytics</h1>
                <div style="color:var(--p-text-muted); font-size: 0.95rem;">ChessKidoo Official Academic Report</div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.8rem; color:var(--p-text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Term</div>
              <div style="font-weight:700; color:var(--p-teal); font-size:1.1rem; background: rgba(0,201,167,0.1); padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(0,201,167,0.3);">${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
            </div>
          </div>

          <!-- Student Meta Profile -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px;">
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px; display:flex; align-items:center; gap: 16px;">
              <div style="width:50px; height:50px; border-radius:50%; background:var(--p-surface2); display:flex; align-items:center; justify-content:center; font-size:1.5rem;">👤</div>
              <div>
                <div style="font-size:0.75rem; color:var(--p-text-muted); text-transform:uppercase; letter-spacing:1px;">Athlete</div>
                <div style="font-size:1.1rem; font-weight:700; color:#fff;">${_e(p.full_name || '')}</div>
              </div>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px; display:flex; align-items:center; gap: 16px;">
              <div style="width:50px; height:50px; border-radius:50%; background:var(--p-surface2); display:flex; align-items:center; justify-content:center; font-size:1.5rem;">🏆</div>
              <div>
                <div style="font-size:0.75rem; color:var(--p-text-muted); text-transform:uppercase; letter-spacing:1px;">Division</div>
                <div style="font-size:1.1rem; font-weight:700; color:var(--p-blue);">${_e(p.level || 'Intermediate')}</div>
              </div>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px; display:flex; align-items:center; gap: 16px;">
              <div style="width:50px; height:50px; border-radius:50%; background:var(--p-surface2); display:flex; align-items:center; justify-content:center; font-size:1.5rem;">⚡</div>
              <div>
                <div style="font-size:0.75rem; color:var(--p-text-muted); text-transform:uppercase; letter-spacing:1px;">Peak Rating</div>
                <div style="font-size:1.4rem; font-weight:900; color:var(--p-gold); font-family:monospace;">${p.rating || 1120}</div>
              </div>
            </div>
          </div>

          <!-- Subject Analytics Grids -->
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 1.2rem; color: #fff; margin-bottom: 20px; font-weight: 600; display:flex; align-items:center; gap:8px;">
              <span style="color:var(--p-gold);">🎯</span> Core Competencies
            </h3>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
              ${[
                {name: 'Opening Repertoire', score: rc.opening, icon: '♟'},
                {name: 'Middlegame Strategy', score: rc.middlegame, icon: '♞'},
                {name: 'Tactical Vision', score: rc.tactics, icon: '⚡'},
                {name: 'Endgame Technique', score: rc.endgame, icon: '♚'},
                {name: 'Time Management', score: rc.time, icon: '⏱️'},
                {name: 'Sportsmanship & Ethics', score: rc.sports, icon: '🤝'}
              ].map(s => `
                <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.04); padding: 16px; border-radius: 12px; display:flex; align-items:center; gap: 16px; transition: transform 0.2s;">
                  <div style="position:relative; width: 60px; height: 60px;">
                    <svg viewBox="0 0 36 36" style="width:60px; height:60px; transform: rotate(-90deg);">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${s.score >= 80 ? 'var(--p-teal)' : s.score >= 60 ? 'var(--p-gold)' : 'var(--p-danger)'}" stroke-width="3" stroke-dasharray="${s.score}, 100" />
                    </svg>
                    <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">${s.icon}</div>
                  </div>
                  <div style="flex:1;">
                    <div style="font-size:0.9rem; font-weight:600; color:#e2e8f0; margin-bottom:4px;">${s.name}</div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                      <div style="font-size:0.75rem; color:var(--p-text-muted);">Grade: <strong style="color:#fff;">${getGrade(s.score)}</strong></div>
                      <div style="font-size:1.1rem; font-weight:800; color:${s.score >= 80 ? 'var(--p-teal)' : s.score >= 60 ? 'var(--p-gold)' : 'var(--p-danger)'}; font-family:monospace;">${s.score}%</div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Coach Feedback -->
          <div style="background: linear-gradient(180deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.8) 100%); border: 1px solid rgba(255,255,255,0.05); padding: 30px; border-radius: 16px; margin-top: 30px;">
            <div style="display:flex; gap: 30px; flex-wrap: wrap;">
              <div style="flex:2; min-width:300px;">
                <h3 style="font-size: 1.1rem; color: #fff; margin-bottom: 12px; display:flex; align-items:center; gap:8px;"><span style="color:var(--p-blue);">💬</span> Coach's Assessment</h3>
                <p style="color: var(--p-text); font-size: 0.95rem; line-height: 1.7; font-style: italic; opacity: 0.9; margin: 0;">"${rc.remarks}"</p>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                  <div style="font-size: 0.8rem; color: var(--p-text-muted); margin-bottom: 10px; text-transform:uppercase; letter-spacing:1px;">Action Plan / Objectives</div>
                  <ul style="margin:0; padding-left: 20px; color: var(--p-text); font-size: 0.9rem; line-height: 1.6;">
                    ${rc.goals.map(g => `<li style="margin-bottom:6px;">${g}</li>`).join('')}
                  </ul>
                </div>
              </div>
              <div style="flex:1; min-width: 250px; display:flex; flex-direction:column; justify-content:center; align-items:center; background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px;">
                 <div style="font-size: 0.8rem; color: var(--p-text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">Authorized Signature</div>
                 <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 2rem; color: #fff; transform: rotate(-2deg); margin-bottom:10px; opacity: 0.8;">${_e(p.coach || 'CK Admin')}</div>
                 <div style="font-size: 0.75rem; color: var(--p-text-muted);">Lead Instructor, ChessKidoo</div>
                 <div style="margin-top: 15px; width: 60px; height: 60px; border: 2px dashed rgba(255,255,255,0.1); border-radius: 50%; display:flex; align-items:center; justify-content:center; opacity:0.3;">
                   <span style="font-size:0.6rem; letter-spacing:1px;">SEAL</span>
                 </div>
              </div>
            </div>
          </div>

        </div>
      `;
    }
  },

  async exportReportCardToPDF() {
    const el = document.getElementById('printableReportCard');
    if (!el) return;

    if (!window.html2canvas || !window.jspdf) {
      CK.showToast('PDF export libraries are still loading. Please wait a moment...', 'warning');
      return;
    }

    CK.showToast('Generating PDF report card...', 'info');
    try {
      const canvas = await window.html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`ChessKidoo_ReportCard_${this.userProfile?.full_name || 'Student'}.pdf`);
      CK.showToast('PDF exported successfully!', 'success');
    } catch (err) {
      CK.showToast('Failed to export PDF.', 'error');
    }
  },

  /* Open the report card on its own in a clean, print-ready window so it can
     be read full-screen, printed, or saved as PDF by the browser. */
  viewReportCard() {
    const el = document.getElementById('printableReportCard');
    if (!el) { CK.showToast('Open the Report Card tab first.', 'warning'); return; }
    const name = (this.userProfile && this.userProfile.full_name) || 'Student';
    const win = window.open('', '_blank', 'width=960,height=900');
    if (!win) { CK.showToast('Allow pop-ups to view the report card.', 'warning'); return; }
    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
      <title>ChessKidoo Report Card — ${(CK.esc ? CK.esc(name) : name)}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        :root{--p-surface:#0f1623;--p-surface2:#1a2333;--p-text:#e8eefc;--p-text-muted:#8aa0c0;
              --p-gold:#e8b84b;--p-teal:#14b8a6;--p-blue:#5b9cf6;--p-danger:#ef4444;--font-display:'Poppins',sans-serif;}
        *{box-sizing:border-box;}
        body{margin:0;background:#070b12;color:var(--p-text);font-family:'Inter',system-ui,sans-serif;padding:28px;}
        @media print{body{background:#fff;padding:0;}.no-print{display:none;}}
        .tb{max-width:920px;margin:0 auto 16px;display:flex;gap:10px;justify-content:flex-end;}
        .tb button{background:var(--p-gold);color:#1a1407;border:none;border-radius:9px;padding:9px 16px;font-weight:700;cursor:pointer;}
        .tb button.alt{background:var(--p-blue);color:#fff;}
      </style></head><body>
      <div class="tb no-print"><button class="alt" onclick="window.print()">🖨 Print / Save as PDF</button><button onclick="window.close()">Close</button></div>
      ${el.outerHTML}
      </body></html>`);
    win.document.close();
  },

  printReportCard() {
    // Print just the report card cleanly via the dedicated view window.
    this.viewReportCard();
    CK.showToast('Use “Print / Save as PDF” in the report window.', 'info');
  },

  renderFeesGateway() {
    const p = this.userProfile || {};
    const status = p.status || 'Pending';
    const tuition = parseInt(p.fee) || 4000;
    const gst = Math.round(tuition * 0.18);
    const total = tuition + gst;
    const isPaid = status === 'Paid';

    const fmt = n => '' + n.toLocaleString('en-IN');

    // Populate order summary
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('payStudentName', 'Student: ' + (p.full_name || 'Chess Student'));
    set('payBatch', p.batch || 'Advanced FIDE Masterclass');
    set('payLevel', p.level || 'Intermediate');
    set('payTuition', fmt(tuition));
    set('payGst', fmt(gst));
    set('payTotal', fmt(total));
    set('payAmountDisplay', fmt(total));

    // Seed UPI strip with actual UPI ID from config
    const cfg = window.APP_CONFIG || {};
    const upiId = cfg.ACADEMY_UPI_ID || 'saminathanranjith73@okaxis';
    const upiName = cfg.ACADEMY_UPI_NAME || 'Ranjith A S';

    const upiIdEl = document.getElementById('payUpiIdPreview');
    if (upiIdEl) upiIdEl.textContent = upiId;

    const badge = document.getElementById('payStatusBadge');
    if (badge) {
      badge.textContent = isPaid ? ' Paid' : ' Pending';
      badge.className = 'pay-status-badge ' + (isPaid ? 'paid' : 'pending');
    }

    const formCard = document.getElementById('payFormCard');
    const successCard = document.getElementById('paySuccessCard');

    if (isPaid) {
      if (formCard) formCard.style.display = 'none';
      if (successCard) {
        successCard.style.display = 'block';
        const box = document.getElementById('payReceiptBox');
        if (box && !box.dataset.filled) {
          box.dataset.filled = '1';
          const _e = CK.esc || (s => s);
          box.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Txn ID</span><span>${_e(p.last_txn_id || 'CK_TXN_')}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Amount</span><span>${fmt(total)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Date</span><span>${_e(p.paid_date || new Date().toLocaleDateString('en-GB'))}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>Method</span><span>${_e(p.pay_method || 'Razorpay')}</span></div>
          `;
        }
      }
    } else {
      if (formCard) formCard.style.display = 'block';
      if (successCard) successCard.style.display = 'none';

      // Setup UPI details dynamically
      const note = encodeURIComponent('ChessKidoo Fee - ' + (p.full_name || 'Student'));
      const enc = s => encodeURIComponent(s);

      this._upiPaymentTotal = total;
      this._upiLinks = {
        upi:     `upi://pay?pa=${enc(upiId)}&pn=${enc(upiName)}&am=${total}&cu=INR&tn=${note}`,
        gpay:    `tez://upi/pay?pa=${enc(upiId)}&pn=${enc(upiName)}&am=${total}&cu=INR&tn=${note}`,
        phonepe: `phonepe://pay?pa=${enc(upiId)}&pn=${enc(upiName)}&am=${total}&cu=INR&tn=${note}`,
        paytm:   `paytmmp://pay?pa=${enc(upiId)}&pn=${enc(upiName)}&am=${total}&cu=INR&tn=${note}`
      };

      const upiIdTextEl = document.getElementById('studentUpiIdText');
      if (upiIdTextEl) upiIdTextEl.textContent = upiId;

      // Render the inline QR Code
      setTimeout(() => {
        const qrEl = document.getElementById('studentUpiQrCode');
        if (qrEl) {
          qrEl.innerHTML = '';
          const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(this._upiLinks.upi);
          qrEl.innerHTML = `<img src="${qrUrl}" alt="Scan to Pay" style="width:100%; height:100%; object-fit:contain; border-radius:8px;" onerror="this.outerHTML='<div style=\\\'color:#94a3b8;font-size:0.75rem;padding:12px;text-align:center;\\\'>QR unavailable<br>Use app buttons below</div>'"/>`;
        }
      }, 50);

      // Reset UTR UI elements
      const utrEl = document.getElementById('studentUpiUtrInput');
      if (utrEl) utrEl.value = '';
      const confirmBtn = document.getElementById('studentUpiConfirmBtn');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        const textSpan = confirmBtn.querySelector('.pay-btn-text');
        if (textSpan) textSpan.textContent = 'Confirm Payment & Get Receipt';
      }
    }
  },

  selectPayMethod(el, method) {
    this._selectedPayMethod = 'upi'; // Force UPI
  },

  async processPayment() {
    this.renderFeesGateway();
  },

  async onPaymentSuccess(response) {
    // Deprecated for inline checkout
  },

  //  UPI PAYMENT FLOW

  openUpiApp(app) {
    const links = this._upiLinks || {};
    const url   = links[app] || links.upi;
    if (url) {
      window.location.href = url;
      setTimeout(() => CK.showToast('If the app did not open, scan the QR code instead.', 'info'), 1800);
    }
  },

  copyUpiId() {
    const cfg   = window.APP_CONFIG || {};
    const upiId = cfg.ACADEMY_UPI_ID || 'saminathanranjith73@okaxis';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiId)
        .then(() => CK.showToast('UPI ID copied!', 'success'))
        .catch(() => CK.showToast('UPI ID: ' + upiId, 'info'));
    } else {
      CK.showToast('UPI ID: ' + upiId, 'info');
    }
  },

  async submitUtrPayment() {
    const utrEl = document.getElementById('studentUpiUtrInput');
    const utr   = utrEl ? utrEl.value.trim() : '';

    if (!utr || utr.length < 8 || utr.length > 30 || !/^[A-Z0-9]+$/i.test(utr)) {
      CK.showToast('Please enter a valid UTR / Transaction ID (830 alphanumeric characters).', 'warning');
      return;
    }

    const confirmBtn = document.getElementById('studentUpiConfirmBtn');
    let textSpan = null;
    if (confirmBtn) {
      confirmBtn.disabled = true;
      textSpan = confirmBtn.querySelector('.pay-btn-text');
      if (textSpan) textSpan.textContent = 'Verifying';
    }

    try {
      const p     = this.userProfile;
      const total = this._upiPaymentTotal || 0;

      if (p) {
        p.status     = 'Paid';
        p.last_txn_id = utr;
        p.paid_date  = new Date().toLocaleDateString('en-GB');
        p.pay_method = 'UPI / Google Pay';
        const _ud = new Date(); _ud.setMonth(_ud.getMonth() + 1); _ud.setDate(14);
        p.due_date   = _ud.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
        await CK.db.saveProfile(p);
      }

      // Send emails
      try {
        await this.sendPaymentEmails(p, utr, total);
      } catch (emailErr) { }

      CK.showToast('Payment confirmed! Receipt sent to your email.', 'success');
      this.renderFeesGateway();
      if (window.CK && CK.admin && typeof CK.admin.loadStudents === 'function') {
        CK.admin.loadStudents();
      }
    } catch (e) {
      CK.showToast('Payment recorded. Please contact admin if receipt is not received.', 'warning');
      this.renderFeesGateway();
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        if (textSpan) textSpan.textContent = 'Confirm Payment & Get Receipt';
      }
    }
  },

  async sendPaymentEmails(p, utr, total) {
    const cfg        = window.APP_CONFIG || {};
    const serviceId  = cfg.EMAILJS_SERVICE  || 'service_7mn07q9';
    const templateId = cfg.EMAILJS_TEMPLATE || 'template_3lumv9c';
    const publicKey  = cfg.EMAILJS_KEY      || '1EuHvvzi2H9RnaBF6';

    if (!window.emailjs) { return; }
    window.emailjs.init({ publicKey: publicKey });

    const fmt    = n => '' + n.toLocaleString('en-IN');
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const base = {
      student_name: p.full_name  || 'Chess Student',
      utr_number:   utr,
      amount:       fmt(total),
      pay_method:   'UPI / Google Pay',
      batch:        p.batch     || 'Chess Training',
      paid_date:    dateStr,
      academy_name: 'ChessKidoo Academy',
      academy_email: cfg.ACADEMY_EMAIL || 'Chesskidoo37@gmail.com'
    };

    // Receipt to student
    if (p && p.email) {
      await window.emailjs.send(serviceId, templateId, {
        ...base,
        to_email: p.email,
        to_name:  p.full_name || 'Student',
        subject:  'ChessKidoo Payment Receipt  ' + utr
      });
    }

    // Notification to academy
    await window.emailjs.send(serviceId, templateId, {
      ...base,
      to_email: cfg.ACADEMY_EMAIL || 'Chesskidoo37@gmail.com',
      to_name:  'ChessKidoo Admin',
      subject:  'New Payment  ' + (p ? (p.full_name || 'Student') : 'Student') + '  ' + utr
    });
  },

  downloadReceipt() {
    const p = this.userProfile || {};
    const _eR = CK.esc || (s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
    const name = _eR((p.full_name || 'STUDENT').toUpperCase());
    const level = _eR(p.level || 'Beginner');
    const rating = Number(p.rating || 800);
    const coach = _eR((p.coach || 'COACH').toUpperCase());
    const feeAmount = p.fee || 1600;
    const dateStr = new Date().toLocaleDateString('en-GB');

    const words = feeAmount === 1600 ? 'One Thousand Six Hundred Rupees Only' :
                  feeAmount === 2200 ? 'Two Thousand Two Hundred Rupees Only' :
                  feeAmount === 4500 ? 'Four Thousand Five Hundred Rupees Only' :
                  `${feeAmount} Rupees Only`;

    const receiptWin = window.open('', '_blank', 'width=800,height=950');
    if (!receiptWin) { CK.showToast('Please allow popups to download the receipt.', 'warning'); return; }
    receiptWin.document.write(`
      <html>
        <head>
          <title>ChessKidoo Official Payment Receipt</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Montserrat', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background: #fff;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .receipt-container {
              max-width: 720px;
              margin: 0 auto;
              background: #fff;
              border: 1px solid #e2e8f0;
              box-sizing: border-box;
              position: relative;
              overflow: hidden;
            }
            .r-header {
              background: #b4831f !important;
              color: #000;
              padding: 35px 20px 25px 20px;
              text-align: center;
            }
            .r-title-brand {
              font-family: 'Cinzel', serif;
              font-size: 2.4rem;
              font-weight: 700;
              letter-spacing: 5px;
              margin: 0 0 8px 0;
            }
            .r-slogan {
              font-style: italic;
              font-family: serif;
              font-size: 1.1rem;
              margin: 0 0 15px 0;
            }
            .r-contact {
              font-size: 0.9rem;
              font-weight: 600;
              display: flex;
              justify-content: center;
              gap: 25px;
            }
            .r-subhead {
              background: #f8fafc;
              text-align: center;
              padding: 16px;
              font-family: 'Cinzel', serif;
              font-size: 1.4rem;
              font-weight: 700;
              letter-spacing: 8px;
              border-bottom: 1px solid #cbd5e1;
            }
            .r-meta {
              display: flex;
              justify-content: space-between;
              padding: 16px 30px;
              font-size: 0.95rem;
              border-bottom: 1px solid #cbd5e1;
            }
            .r-body {
              padding: 30px;
              position: relative;
            }
            .watermark {
              position: absolute;
              top: 15%;
              right: 10%;
              font-size: 8rem;
              font-weight: 900;
              color: rgba(0, 201, 167, 0.08);
              border: 8px solid rgba(0, 201, 167, 0.08);
              border-radius: 16px;
              padding: 10px 40px;
              transform: rotate(-15deg);
              pointer-events: none;
              letter-spacing: 15px;
            }
            .sec-title {
              font-size: 1rem;
              font-weight: 700;
              color: #b4831f;
              letter-spacing: 2px;
              margin-bottom: 15px;
              text-transform: uppercase;
            }
            .r-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 35px;
            }
            .r-table td {
              padding: 10px 0;
              font-size: 0.95rem;
              border-bottom: 1px dashed #cbd5e1;
            }
            .r-table td.lbl {
              color: #64748b;
            }
            .r-table td.val {
              text-align: right;
              font-weight: 700;
              color: #0f172a;
            }
            .total-box {
              border-top: 2px solid #b4831f;
              border-bottom: 2px solid #b4831f;
              padding: 20px 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 10px 0 30px 0;
            }
            .total-lbl {
              font-size: 1.2rem;
              font-weight: 700;
            }
            .total-val {
              font-size: 2rem;
              font-weight: 700;
              color: #0f172a;
            }
            .words {
              font-style: italic;
              color: #475569;
              font-size: 0.95rem;
              margin-top: -15px;
              padding-left: 30px;
              margin-bottom: 40px;
            }
            .r-footer {
              text-align: center;
              padding: 30px;
              font-size: 0.85rem;
              color: #64748b;
              border-top: 1px solid #cbd5e1;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="r-header">
              <div class="r-title-brand">CHESSKIDOO ACADEMY</div>
              <div class="r-slogan">Building Champions, One Move at a Time</div>
              <div class="r-contact"><span> +91 88257 31470</span><span> Chesskidoo37@gmail.com</span></div>
            </div>
            <div class="r-subhead">OFFICIAL RECEIPT</div>
            <div class="r-meta">
              <div>Receipt No: <strong>CK-${_eR((p.last_txn_id || Date.now().toString(36)).slice(-8).toUpperCase())}</strong></div>
              <div>Date: <strong>${dateStr}</strong></div>
            </div>
            <div class="r-body">
              <div class="watermark">PAID</div>

              <div class="sec-title">STUDENT DETAILS</div>
              <table class="r-table">
                <tr><td class="lbl">Name</td><td class="val">${name}</td></tr>
                <tr><td class="lbl">Level</td><td class="val">${level}</td></tr>
                <tr><td class="lbl">ELO Rating</td><td class="val">${rating}</td></tr>
                <tr><td class="lbl">Coach</td><td class="val">${coach}</td></tr>
              </table>

              <div class="sec-title">PAYMENT DETAILS</div>
              <table class="r-table">
                <tr><td class="lbl">Tuition Fee</td><td class="val"> ${feeAmount.toLocaleString()}</td></tr>
                <tr><td class="lbl">Payment Mode</td><td class="val">Online</td></tr>
                <tr><td class="lbl">Status</td><td class="val" style="color:#16a34a;"> SUCCESS</td></tr>
              </table>

              <div class="total-box">
                <div class="total-lbl">Total Amount Paid</div>
                <div class="total-val"> ${feeAmount.toLocaleString()}</div>
              </div>
              <div class="words">${words}</div>
            </div>
            <div class="r-footer">
              <p style="margin:0 0 5px 0;">This is a computer-generated receipt. No signature required.</p>
              <p style="margin:0 0 15px 0;">For queries, contact Chesskidoo37@gmail.com</p>
              <div style="font-family:'Cinzel',serif; font-weight:700; color:#b4831f; font-size:1.1rem; font-style:italic;"> Thank you for your patronage! </div>
            </div>
          </div>
          <script>
            setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `);
    receiptWin.document.close();
  },

  downloadCertificate() {
    CK.showToast("Opening Level Completion Certificate...", "success");
    // Try fetching from Supabase storage if a certificate path is on the profile
    if (window.supabaseClient && this.userProfile.certificate) {
      const { data } = window.supabaseClient.storage.from('documents').getPublicUrl(this.userProfile.certificate);
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
        return;
      }
    }

    // Fallback to static mock certificate window
    const certWindow = window.open("", "_blank");
    if (!certWindow) { CK.showToast('Please allow popups to view the certificate.', 'warning'); return; }
    const _eCert = CK.esc || (s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
    certWindow.document.write(`
      <html>
        <head>
          <title>ChessKidoo Graduation Certificate</title>
          <style>
            body { background: #111; color: #fff; font-family: 'DM Sans', sans-serif; text-align: center; padding: 40px; }
            .cert-border { border: 10px double var(--p-gold, #e8b84b); max-width: 800px; margin: 0 auto; padding: 60px; background: #1e2530; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h1 { font-family: 'Playfair Display', serif; font-size: 3rem; color: #e8b84b; margin-top: 0; }
            h2 { font-size: 1.5rem; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 2px; }
            .name { font-size: 2.5rem; font-weight: bold; border-bottom: 2px solid #5b9cf6; width: fit-content; margin: 20px auto 40px; padding-bottom: 10px; }
            .desc { font-size: 1.2rem; line-height: 1.6; max-width: 600px; margin: 0 auto 40px; color: #cbd5e1; }
            .signatures { display: flex; justify-content: space-between; max-width: 500px; margin: 60px auto 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
            .sig { font-family: cursive; font-size: 1.5rem; color: #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="cert-border">
            <h1> ChessKidoo Academy </h1>
            <h2>Certificate of Excellence</h2>
            <p>This is proudly presented to</p>
            <div class="name">${_eCert(this.userProfile.full_name)}</div>
            <p class="desc">for successfully completing the rigorous <strong>${_eCert(this.userProfile.level || 'Chess')} Curriculum</strong>, demonstrating mastery of strategic thinking, endgame principles, and core tournament tactics. ELO Rating: <strong>${this.userProfile.rating || 800}</strong></p>
            <p style="color:#94a3b8; font-size:0.9rem;">Issued on ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
            <div class="signatures">
              <div>
                <div class="sig">${_eCert(this.userProfile.coach || '')}</div>
                <div style="font-size:0.8rem; margin-top:5px; opacity:0.6;">Assigned Coach</div>
              </div>
              <div>
                <div class="sig">ChessKidoo Academy</div>
                <div style="font-size:0.8rem; margin-top:5px; opacity:0.6;">Academy Director</div>
              </div>
            </div>
          </div>
          <button onclick="window.print()" style="margin-top: 30px; background: #e8b84b; color: #000; border: none; padding: 12px 24px; font-weight: bold; border-radius: 8px; cursor: pointer;"> Print Certificate</button>
        </body>
      </html>
    `);
  },

  async renderTournamentsTab() {
    if (!CK.tournament) return;
    const container = document.getElementById('student-panel-tournaments');
    if (!container) return;

    container.innerHTML = `
      <div class="ck-rd-hero">
        <div class="ck-rd-hero-row">
          <div class="ck-rd-hero-ic">🏆</div>
          <div>
            <div class="ck-rd-hero-title">Tournaments</div>
            <div class="ck-rd-hero-sub">FIDE, State &amp; District events near you — plus online arenas, auto-synced from Lichess &amp; Chess.com.</div>
          </div>
          <div class="ck-rd-hero-spacer"></div>
          <span class="ck-rd-hero-chip"><span class="ck-rd-pulse"></span> Auto-syncing</span>
        </div>
      </div>
      <div class="p-card" style="margin-bottom:20px;">
        <div class="p-card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div class="p-card-title"> ChessKidoo Tournament Radar</div>
            <p style="opacity:0.7; font-size:12px; margin:4px 0 0 0;">Auto-syncing FIDE, State, and District Chess events with Lichess & Chess.com integration.</p>
          </div>
        </div>
        <div class="p-card-body" id="studentTournamentRadarContainer" style="padding:16px;">
          <div style="opacity:0.5; padding:20px; text-align:center;"> Activating location telemetry, please wait...</div>
        </div>
      </div>
    `;
    await CK.tournament.loadTournaments();
    try { window.tournamentInterestsData = await CK.db.getTournamentInterests(); } catch(e) { window.tournamentInterestsData = []; }
    CK.tournament.renderTournamentFinderUI(document.getElementById('studentTournamentRadarContainer'), true);
  },

  _laCard(cfg) {
    const _e = CK.esc || (s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
    const pills = (cfg.stats || []).filter(s => s.val != null && s.val !== '')
      .map(s => `<div class="la-stat"><span class="la-stat-label">${_e(s.label)}</span><span class="la-stat-val">${_e(String(s.val))}</span></div>`).join('');
    return `
      <div class="la-card" style="--la:${cfg.color}">
        <div class="la-accent"></div>
        <div class="la-head">
          <div class="la-logo">${cfg.logo}</div>
          <div class="la-titles">
            <div class="la-title">${_e(cfg.title)}</div>
            <div class="la-sub">${_e(cfg.subtitle)}</div>
          </div>
          <span class="la-badge${cfg.linked ? '' : ' la-badge-off'}">${cfg.linked ? '✓ Linked' : 'Not linked'}</span>
        </div>
        <div class="la-body">
          ${cfg.linked
            ? `<div class="la-hero">
                 <div class="la-hero-rating">${cfg.heroRating != null && cfg.heroRating !== '' ? _e(String(cfg.heroRating)) : '—'}</div>
                 <div class="la-hero-label">${_e(cfg.heroLabel || 'Rating')}</div>
                 <div class="la-synced"><span class="la-dot"></span>Live · synced now</div>
               </div>
               <div class="la-stats">${pills}</div>
               <div class="la-actions">${cfg.actions || ''}</div>`
            : `<p class="la-note">${cfg.note || ''}</p>
               <div class="la-form">
                 <input id="${cfg.inputId}" type="text" class="la-input" placeholder="${_e(cfg.placeholder || '')}" />
                 <button class="la-link-btn" onclick="${cfg.linkOnclick}">${_e(cfg.linkLabel || 'Link')}</button>
               </div>`}
        </div>
      </div>`;
  },

  async renderLinkedAccounts() {
    const el = document.getElementById('linkedAccountsContent');
    if (!el) return;
    const p = this.userProfile || {};
    const _e = CK.esc || (s => String(s));
    const u = (s) => String(s == null ? '' : s).replace(/'/g, "\\'");

    el.innerHTML = `<div class="la-grid">
      ${this._laCard({
        color: '#5b9cf6', logo: '♞', title: 'Lichess Account', subtitle: 'Sync ratings & import recent games from Lichess.org',
        linked: !!p.lichess_username, heroRating: p.rating, heroLabel: 'Rapid Rating',
        stats: [{label:'Username',val:p.lichess_username},{label:'Rapid',val:p.rating},{label:'Blitz',val:p.lichess_blitz},{label:'Games',val:p.lichess_games},{label:'Title',val:p.lichess_title}],
        actions: `<button class="la-act" onclick="CK.student.linkLichess('${u(p.lichess_username)}')">↻ Refresh</button><button class="la-act la-act-ghost" onclick="CK.gameTracker&&CK.gameTracker.importFromLichess(CK.currentUser?.id,'${u(p.lichess_username)}')">⬇ Import Games</button><button class="la-act la-act-danger" onclick="CK.student.unlinkLichess()">⏏ Unlink</button>`,
        note: 'Link your Lichess account to automatically sync your rating and import games.',
        inputId: 'lichessUsernameInput', placeholder: 'e.g. Magnus2024', linkLabel: 'Link Lichess',
        linkOnclick: "CK.student.linkLichess(document.getElementById('lichessUsernameInput').value.trim())"
      })}
      ${this._laCard({
        color: '#7fa650', logo: '♟', title: 'Chess.com Account', subtitle: 'Sync your ratings from Chess.com',
        linked: !!p.chesscom_username, heroRating: p.chesscom_rapid, heroLabel: 'Rapid Rating',
        stats: [{label:'Username',val:p.chesscom_username},{label:'Rapid',val:p.chesscom_rapid},{label:'Blitz',val:p.chesscom_blitz}],
        actions: `<button class="la-act" onclick="CK.student.linkChesscom('${u(p.chesscom_username)}')">↻ Refresh</button><button class="la-act la-act-danger" onclick="CK.student.unlinkChesscom()">⏏ Unlink</button>`,
        note: 'Link your Chess.com account to sync your ratings.',
        inputId: 'chesscomUsernameInput', placeholder: 'e.g. Hikaru', linkLabel: 'Link Chess.com',
        linkOnclick: "CK.student.linkChesscom(document.getElementById('chesscomUsernameInput').value.trim())"
      })}
      ${this._laCard({
        color: '#e8b84b', logo: '♚', title: 'FIDE Profile', subtitle: 'Show your official international rating',
        linked: !!p.fide_id, heroRating: p.fide_rating, heroLabel: 'Standard Rating',
        stats: [{label:'FIDE ID',val:p.fide_id},{label:'Standard',val:p.fide_rating},{label:'Rapid',val:p.fide_rapid},{label:'Blitz',val:p.fide_blitz},{label:'Title',val:p.fide_title},{label:'Federation',val:p.fide_federation}],
        actions: `<button class="la-act" onclick="CK.student.linkFide('${u(String(p.fide_id))}')">↻ Refresh</button><a class="la-act la-act-ghost" href="https://ratings.fide.com/profile/${_e(String(p.fide_id))}" target="_blank" rel="noopener" style="text-decoration:none;">↗ View on FIDE</a><button class="la-act la-act-danger" onclick="CK.student.unlinkFide()">⏏ Unlink</button>`,
        note: 'Enter your FIDE ID to display your official international rating. Find it at ratings.fide.com.',
        inputId: 'fideIdInput', placeholder: 'e.g. 35027789', linkLabel: 'Link FIDE',
        linkOnclick: "CK.student.linkFide(document.getElementById('fideIdInput').value.trim())"
      })}
    </div>`;
    return;
    /* legacy markup retained below (unreachable) */
    el.innerHTML = `
      <div class="p-card" style="border-color:rgba(91,156,246,0.3);margin-bottom:20px;">
        <div class="p-card-header">
          <div>
            <div class="p-card-title"> Lichess Account</div>
            <div style="font-size:0.83rem;color:var(--p-text-muted);">Import your ratings and recent games from Lichess.org</div>
          </div>
          ${p.lichess_username ? `<span style="background:rgba(91,156,246,0.15);color:var(--p-blue);padding:4px 12px;border-radius:20px;font-size:0.82rem;font-weight:600;"> Linked</span>` : ''}
        </div>
        <div class="p-card-body" style="padding:20px 25px;">
          ${p.lichess_username ? `
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px;flex-wrap:wrap;">
              <div style="background:rgba(91,156,246,0.08);border-radius:10px;padding:12px 18px;">
                <div style="font-size:0.78rem;color:var(--p-text-muted);margin-bottom:4px;">Username</div>
                <div style="font-weight:700;color:var(--p-blue);">${_e(p.lichess_username)}</div>
              </div>
              ${p.rating ? `<div style="background:rgba(91,156,246,0.08);border-radius:10px;padding:12px 18px;">
                <div style="font-size:0.78rem;color:var(--p-text-muted);margin-bottom:4px;">Rapid Rating</div>
                <div style="font-weight:700;color:var(--p-blue);">${_e(String(p.rating))}</div>
              </div>` : ''}
              ${p.lichess_blitz ? `<div style="background:rgba(91,156,246,0.08);border-radius:10px;padding:12px 18px;">
                <div style="font-size:0.78rem;color:var(--p-text-muted);margin-bottom:4px;">Blitz Rating</div>
                <div style="font-weight:700;color:var(--p-blue);">${_e(String(p.lichess_blitz))}</div>
              </div>` : ''}
              ${p.lichess_games ? `<div style="background:rgba(91,156,246,0.08);border-radius:10px;padding:12px 18px;">
                <div style="font-size:0.78rem;color:var(--p-text-muted);margin-bottom:4px;">Total Games</div>
                <div style="font-weight:700;color:var(--p-blue);">${_e(String(p.lichess_games))}</div>
              </div>` : ''}
              ${p.lichess_title ? `<div style="background:rgba(232,184,75,0.12);border-radius:10px;padding:12px 18px;">
                <div style="font-size:0.78rem;color:var(--p-text-muted);margin-bottom:4px;">Title</div>
                <div style="font-weight:700;color:var(--p-gold);">${_e(p.lichess_title)}</div>
              </div>` : ''}
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn-primary" data-uname="${_e(p.lichess_username)}" onclick="CK.student.linkLichess(this.dataset.uname)"> Refresh</button>
              <button class="btn-secondary" data-uname="${_e(p.lichess_username)}" onclick="CK.gameTracker&&CK.gameTracker.importFromLichess(CK.currentUser?.id,this.dataset.uname)"> Import Recent Games</button>
            </div>
          ` : `
            <p style="color:var(--p-text-muted);margin-bottom:16px;">Link your Lichess account to automatically sync your rating and import games.</p>
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
              <div style="flex:1;min-width:200px;">
                <label style="font-size:0.82rem;color:var(--p-text-muted);display:block;margin-bottom:6px;">Lichess Username</label>
                <input id="lichessUsernameInput" type="text" placeholder="e.g. Magnus2024" style="width:100%;background:var(--p-bg-card);border:1px solid var(--p-border);color:var(--p-text);border-radius:8px;padding:9px 12px;font-size:0.92rem;box-sizing:border-box;" />
              </div>
              <button class="btn-primary" onclick="CK.student.linkLichess(document.getElementById('lichessUsernameInput').value.trim())"> Link Lichess</button>
            </div>
          `}
        </div>
      </div>

      <div class="p-card" style="border-color:rgba(118,150,86,0.3);margin-bottom:20px;">
        <div class="p-card-header">
          <div>
            <div class="p-card-title" style="color:#769656;"> Chess.com Account</div>
            <div style="font-size:0.83rem;color:var(--p-text-muted);">Import your ratings from Chess.com</div>
          </div>
          ${p.chesscom_username ? `<span style="background:rgba(118,150,86,0.15);color:#769656;padding:4px 12px;border-radius:20px;font-size:0.82rem;font-weight:600;"> Linked</span>` : ''}
        </div>
        <div class="p-card-body" style="padding:20px 25px;">
          ${p.chesscom_username ? `
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px;flex-wrap:wrap;">
              <div style="background:rgba(118,150,86,0.08);border-radius:10px;padding:12px 18px;">
                <div style="font-size:0.78rem;color:var(--p-text-muted);margin-bottom:4px;">Username</div>
                <div style="font-weight:700;color:#769656;">${_e(p.chesscom_username)}</div>
              </div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn-primary" style="background:#769656;border:none;" data-uname="${_e(p.chesscom_username)}" onclick="CK.student.linkChesscom(this.dataset.uname)"> Refresh</button>
            </div>
          ` : `
            <p style="color:var(--p-text-muted);margin-bottom:16px;">Link your Chess.com account to sync your ratings.</p>
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
              <div style="flex:1;min-width:200px;">
                <label style="font-size:0.82rem;color:var(--p-text-muted);display:block;margin-bottom:6px;">Chess.com Username</label>
                <input id="chesscomUsernameInput" type="text" placeholder="e.g. Hikaru" style="width:100%;background:var(--p-bg-card);border:1px solid var(--p-border);color:var(--p-text);border-radius:8px;padding:9px 12px;font-size:0.92rem;box-sizing:border-box;" />
              </div>
              <button class="btn-primary" style="background:#769656;border:none;" onclick="CK.student.linkChesscom(document.getElementById('chesscomUsernameInput').value.trim())"> Link Chess.com</button>
            </div>
          `}
        </div>
      </div>

      <div class="p-card" style="border-color:rgba(232,184,75,0.3);">
        <div class="p-card-header">
          <div>
            <div class="p-card-title"> FIDE Profile</div>
            <div style="font-size:0.83rem;color:var(--p-text-muted);">Link your official FIDE ID to display your international rating</div>
          </div>
          ${p.fide_id ? `<span style="background:rgba(232,184,75,0.15);color:var(--p-gold);padding:4px 12px;border-radius:20px;font-size:0.82rem;font-weight:600;"> Linked</span>` : ''}
        </div>
        <div class="p-card-body" style="padding:20px 25px;">
          ${p.fide_id ? `
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px;flex-wrap:wrap;">
              <div style="background:rgba(232,184,75,0.08);border-radius:10px;padding:12px 18px;">
                <div style="font-size:0.78rem;color:var(--p-text-muted);margin-bottom:4px;">FIDE ID</div>
                <div style="font-weight:700;color:var(--p-gold);">${_e(String(p.fide_id))}</div>
              </div>
              ${p.fide_rating ? `<div style="background:rgba(232,184,75,0.08);border-radius:10px;padding:12px 18px;">
                <div style="font-size:0.78rem;color:var(--p-text-muted);margin-bottom:4px;">Standard</div>
                <div style="font-weight:700;color:var(--p-gold);">${_e(String(p.fide_rating))}</div>
              </div>` : ''}
              ${p.fide_rapid ? `<div style="background:rgba(232,184,75,0.08);border-radius:10px;padding:12px 18px;">
                <div style="font-size:0.78rem;color:var(--p-text-muted);margin-bottom:4px;">Rapid</div>
                <div style="font-weight:700;color:var(--p-gold);">${_e(String(p.fide_rapid))}</div>
              </div>` : ''}
              ${p.fide_blitz ? `<div style="background:rgba(232,184,75,0.08);border-radius:10px;padding:12px 18px;">
                <div style="font-size:0.78rem;color:var(--p-text-muted);margin-bottom:4px;">Blitz</div>
                <div style="font-weight:700;color:var(--p-gold);">${_e(String(p.fide_blitz))}</div>
              </div>` : ''}
              ${p.fide_title ? `<div style="background:rgba(232,184,75,0.08);border-radius:10px;padding:12px 18px;">
                <div style="font-size:0.78rem;color:var(--p-text-muted);margin-bottom:4px;">Title</div>
                <div style="font-weight:700;color:var(--p-gold);">${_e(p.fide_title)}</div>
              </div>` : ''}
              ${p.fide_federation ? `<div style="background:rgba(232,184,75,0.08);border-radius:10px;padding:12px 18px;">
                <div style="font-size:0.78rem;color:var(--p-text-muted);margin-bottom:4px;">Federation</div>
                <div style="font-weight:700;color:var(--p-gold);">${_e(p.fide_federation)}</div>
              </div>` : ''}
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn-secondary" data-fide="${_e(String(p.fide_id))}" onclick="CK.student.linkFide(this.dataset.fide)"> Refresh</button>
              <a href="https://ratings.fide.com/profile/${_e(String(p.fide_id))}" target="_blank" rel="noopener" class="btn-secondary" style="text-decoration:none;display:inline-flex;align-items:center;gap:5px;"> View on FIDE </a>
            </div>
          ` : `
            <p style="color:var(--p-text-muted);margin-bottom:16px;">Enter your FIDE ID to display your official international rating. Find it at <strong style="color:var(--p-gold);">ratings.fide.com</strong>.</p>
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
              <div style="flex:1;min-width:200px;">
                <label style="font-size:0.82rem;color:var(--p-text-muted);display:block;margin-bottom:6px;">FIDE ID</label>
                <input id="fideIdInput" type="text" placeholder="e.g. 35027789" style="width:100%;background:var(--p-bg-card);border:1px solid var(--p-border);color:var(--p-text);border-radius:8px;padding:9px 12px;font-size:0.92rem;box-sizing:border-box;" />
              </div>
              <button class="btn-primary" onclick="CK.student.linkFide(document.getElementById('fideIdInput').value.trim())" style="background:var(--p-gold);color:#000;"> Link FIDE</button>
            </div>
          `}
        </div>
      </div>
    `;
  },

  /*  Unlink an external account — clears the stored username/id only,
      so the user can immediately link a different account. Imported
      games and cached stats are kept.  */
  async _unlinkPlatform(fields, label) {
    if (!this.userProfile) { CK.showToast('You must be logged in.', 'warning'); return; }
    const ok = (typeof window !== 'undefined' && window.confirm)
      ? window.confirm(`Unlink your ${label} account?\n\nYou can link a different ${label} username afterwards. Your imported games stay saved.`)
      : true;
    if (!ok) return;
    try {
      const updates = {};
      fields.forEach(f => { updates[f] = null; });
      const merged = { ...this.userProfile, ...updates };
      await CK.db.saveProfile(merged);
      this.userProfile = merged;
      if (CK.currentUser) CK.currentUser = { ...CK.currentUser, ...updates };
      CK.showToast(`${label} account unlinked. You can link a new one now.`, 'success');
      this.renderLinkedAccounts();
      this.updateProfile();
    } catch (err) {
      CK.showToast(`Could not unlink ${label}. Please try again.`, 'error');
    }
  },

  unlinkLichess()  { return this._unlinkPlatform(['lichess_username'], 'Lichess'); },
  unlinkChesscom() { return this._unlinkPlatform(['chesscom_username'], 'Chess.com'); },
  unlinkFide()     { return this._unlinkPlatform(['fide_id'], 'FIDE'); },

  /*  Auto-sync Lichess data on login (background, no toast spam)  */
  async _autoSyncLichess() {
    const p = this.userProfile;
    if (!p?.lichess_username || !navigator.onLine) return;

    // Only sync once per session (or once per hour)
    const syncKey = `ck_lichess_sync_${p.id}`;
    const lastSync = parseInt(localStorage.getItem(syncKey) || '0');
    if (Date.now() - lastSync < 3600000) return; // Skip if synced within 1 hour

    try {
      const res = await fetch(`https://lichess.org/api/user/${encodeURIComponent(p.lichess_username)}`);
      if (!res.ok) return;
      const data = await res.json();
      const perfs = data.perfs || {};

      const updates = {};
      const rapidRating  = perfs.rapid?.rating || perfs.classical?.rating || null;
      const blitzRating  = perfs.blitz?.rating || null;
      const bulletRating = perfs.bullet?.rating || null;
      const totalGames   = data.count?.all || 0;

      if (rapidRating && rapidRating !== p.rating) updates.rating = rapidRating;
      if (blitzRating)  updates.lichess_blitz  = blitzRating;
      if (bulletRating) updates.lichess_bullet = bulletRating;
      if (totalGames > (p.lichess_games || 0)) updates.lichess_games = totalGames;
      if (data.title && !p.lichess_title)       updates.lichess_title = data.title;

      if (Object.keys(updates).length) {
        const merged = { ...this.userProfile, ...updates };
        await CK.db.saveProfile(merged);
        this.userProfile = merged;
        this.updateProfile(); // Refresh dashboard stats
      }

      // Also import recent games silently
      if (CK.gameTracker && totalGames > (p.lichess_games || 0)) {
        try { await CK.gameTracker.importFromLichess(p.id, p.lichess_username, true); } catch(e) {}
      }

      localStorage.setItem(syncKey, String(Date.now()));
    } catch(e) {
      // Silent fail  this is a background sync
    }
  },

  async linkLichess(username) {
    if (!username) { CK.showToast('Please enter your Lichess username.', 'warning'); return; }
    if (!/^[a-zA-Z0-9_-]{1,20}$/.test(username)) {
      CK.showToast('Invalid Lichess username format.', 'error');
      return;
    }
    CK.showToast('Fetching Lichess profile', 'info');
    try {
      const res = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username)}`);
      if (!res.ok) {
        if (res.status === 404) { CK.showToast('Lichess user not found. Check the username.', 'error'); return; }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const perfs = data.perfs || {};
      const rapidRating  = perfs.rapid?.rating  || perfs.classical?.rating || null;
      const blitzRating  = perfs.blitz?.rating  || null;
      const bulletRating = perfs.bullet?.rating || null;
      const totalGames   = data.count?.all || 0;
      const title        = data.title   || null;
      const fideFromLichess = data.profile?.fideRating || null;

      const updates = { lichess_username: data.username || username, lichess_games: totalGames };
      if (rapidRating)     updates.rating         = rapidRating;
      if (blitzRating)     updates.lichess_blitz   = blitzRating;
      if (bulletRating)    updates.lichess_bullet  = bulletRating;
      if (title)           updates.lichess_title   = title;
      if (fideFromLichess && !this.userProfile?.fide_rating) updates.fide_rating = fideFromLichess;

      const merged = { ...this.userProfile, ...updates };
      await CK.db.saveProfile(merged);
      this.userProfile = merged;
      CK.showToast(`Lichess linked: ${data.username}${rapidRating ? '  Rapid ' + rapidRating : ''}`, 'success');
      this.renderLinkedAccounts();
      this.updateProfile();
    } catch (err) {
      CK.showToast('Could not reach Lichess. Check username or try again.', 'error');
    }
  },

  /* Chess.com linking — fetches LIVE rapid/blitz/bullet ratings from the public
     Chess.com API. (This function was referenced by the UI but never defined, so
     the "Link Chess.com" button did nothing.) */
  async linkChesscom(username) {
    if (!username) { CK.showToast('Please enter your Chess.com username.', 'warning'); return; }
    if (!/^[a-zA-Z0-9_-]{1,30}$/.test(username)) { CK.showToast('Invalid Chess.com username format.', 'error'); return; }
    CK.showToast('Fetching Chess.com profile…', 'info');
    try {
      const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/stats`);
      if (!res.ok) {
        if (res.status === 404) { CK.showToast('Chess.com user not found. Check the username.', 'error'); return; }
        throw new Error('HTTP ' + res.status);
      }
      const data = await res.json();
      const rapid  = data.chess_rapid?.last?.rating  || null;
      const blitz  = data.chess_blitz?.last?.rating  || null;
      const bullet = data.chess_bullet?.last?.rating || null;
      const updates = { chesscom_username: username };
      if (rapid)  updates.chesscom_rapid  = String(rapid);
      if (blitz)  updates.chesscom_blitz  = String(blitz);
      if (bullet) updates.chesscom_bullet = String(bullet);
      const merged = { ...this.userProfile, ...updates };
      await CK.db.saveProfile(merged);
      this.userProfile = merged;
      CK.showToast(`Chess.com linked: ${username}${rapid ? ' · Rapid ' + rapid : ''}`, 'success');
      this.renderLinkedAccounts();
      if (this.updateProfile) this.updateProfile();
    } catch (err) {
      CK.showToast('Could not reach Chess.com. Check username or try again.', 'error');
    }
  },

  async linkFide(fideId) {
    if (!fideId) { CK.showToast('Please enter your FIDE ID.', 'warning'); return; }
    const idStr = String(fideId).trim();
    if (!/^\d{1,10}$/.test(idStr)) {
      CK.showToast('FIDE ID must be a number (e.g. 35027789).', 'error');
      return;
    }
    CK.showToast('Fetching FIDE profile', 'info');
    const updates = { fide_id: idStr };

    // Try server-side edge function first (no CORS issues)
    try {
      const session = await window.supabaseClient?.auth.getSession();
      const token = session?.data?.session?.access_token;
      const baseUrl = window.APP_CONFIG?.SUPABASE_URL;
      if (token && baseUrl) {
        const res = await fetch(
          `${baseUrl}/functions/v1/fide-profile?id=${encodeURIComponent(idStr)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const d = await res.json();
          if (d.standard)   updates.fide_rating  = String(d.standard);
          if (d.rapid)      updates.fide_rapid   = String(d.rapid);
          if (d.blitz)      updates.fide_blitz   = String(d.blitz);
          if (d.title)      updates.fide_title       = d.title;
          if (d.federation) updates.fide_federation  = d.federation;
          if (d.name && !this.userProfile?.full_name) updates.full_name = d.name;
        }
      }
    } catch (_) { /* fall through to direct fetch */ }

    // Direct browser fetch fallback (may be blocked by CORS)
    if (!updates.fide_rating) {
      try {
        const res = await fetch(`https://app.fide.com/api/v1/client/profile/${encodeURIComponent(idStr)}`, {
          headers: { Accept: 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.rating || data.standard_rating) updates.fide_rating = String(data.rating || data.standard_rating);
          if (data.title)                           updates.fide_title  = data.title;
          if (data.federation || data.country)      updates.fide_federation = data.federation || data.country;
          if (data.name && !this.userProfile?.full_name) updates.full_name = data.name;
        }
      } catch (_) {
        if (!updates.fide_title) CK.showToast('FIDE API unreachable  ID saved. Deploy fide-profile edge function for live data.', 'info');
      }
    }


    const merged = { ...this.userProfile, ...updates };
    await CK.db.saveProfile(merged);
    this.userProfile = merged;
    CK.showToast(`FIDE ${idStr} saved!${updates.fide_rating ? ' Rating: ' + updates.fide_rating : ''}`, 'success');
    this.renderLinkedAccounts();
  },

  /*  Dynamic Mastery Skill Tree  */
  async renderSkillTree() {
    const container = document.getElementById('student-panel-path');
    if (!container) return;
    const body = container.querySelector('.p-card-body') || container;
    const p = this.userProfile;
    if (!p) return;

    body.innerHTML = '<div style="text-align:center;padding:40px;"><div class="p-spinner" style="margin:0 auto 12px;width:30px;height:30px;border:3px solid rgba(255,255,255,0.1);border-top-color:var(--p-gold);border-radius:50%;animation:spin 1s linear infinite;"></div>Building your skill tree...</div>';

    const _e = CK.esc || (s => s);
    let analysis = null;
    if (CK.ai) {
      try { analysis = await CK.ai.analyzeStudent(p.id); } catch(e) {}
    }

    const rc = p.report_card || {};
    const scores = analysis ? analysis.scores : {
      opening: rc.opening || 0,
      tactics: rc.tactics || 0,
      endgame: rc.endgame || 0,
      time_mgmt: rc.time || 0,
      king_safety: 0,
      pawn_struct: 0,
      calculation: 0
    };

    const nodes = [
      { id: 'basics',      name: 'Chess Basics',        icon: '', score: Math.min(100, (parseInt(p.rating) || 800) >= 800 ? 100 : 60), deps: [] },
      { id: 'opening',     name: 'Opening Theory',      icon: '', score: scores.opening || 0, deps: ['basics'] },
      { id: 'tactics',     name: 'Tactical Vision',     icon: '', score: scores.tactics || 0, deps: ['basics'] },
      { id: 'endgame',     name: 'Endgame Technique',   icon: '',  score: scores.endgame || 0, deps: ['basics'] },
      { id: 'time_mgmt',   name: 'Time Management',     icon: '', score: scores.time_mgmt || 0, deps: ['tactics'] },
      { id: 'king_safety', name: 'King Safety',         icon: '', score: scores.king_safety || 0, deps: ['opening'] },
      { id: 'pawn_struct', name: 'Pawn Structure',      icon: '',  score: scores.pawn_struct || 0, deps: ['opening', 'endgame'] },
      { id: 'calculation', name: 'Deep Calculation',    icon: '', score: scores.calculation || 0, deps: ['tactics', 'time_mgmt'] },
      { id: 'strategy',    name: 'Positional Strategy', icon: '', score: Math.round(((scores.pawn_struct || 0) + (scores.king_safety || 0)) / 2), deps: ['pawn_struct', 'king_safety'] },
      { id: 'mastery',     name: 'Chess Mastery',       icon: '', score: analysis ? analysis.overall : Math.round(Object.values(scores).reduce((a,b) => a+b, 0) / Object.keys(scores).length), deps: ['strategy', 'calculation'] }
    ];

    const getStatus = (node) => {
      if (node.score >= 75) return { label: 'Mastered', cls: 'mastered', color: '#22c55e' };
      if (node.score >= 40) return { label: 'In Progress', cls: 'progress', color: '#f59e0b' };
      const allDepsMet = node.deps.every(d => (nodes.find(n => n.id === d)?.score || 0) >= 40);
      if (allDepsMet || node.deps.length === 0) return { label: 'Available', cls: 'available', color: '#3b82f6' };
      return { label: 'Locked', cls: 'locked', color: '#64748b' };
    };

    const overallPct = analysis ? analysis.overall : Math.round(nodes.reduce((s, n) => s + n.score, 0) / nodes.length);
    const masteredCount = nodes.filter(n => n.score >= 75).length;

    body.innerHTML = `
      <div style="margin-bottom:24px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <div style="text-align:center;">
          <div style="font-size:2.5rem;font-weight:900;color:var(--p-gold);">${overallPct}%</div>
          <div style="font-size:0.8rem;color:var(--p-text-muted);">Overall Mastery</div>
        </div>
        <div style="flex:1;min-width:200px;">
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px;">
            <span>${masteredCount}/${nodes.length} skills mastered</span>
            <span style="color:var(--p-gold);">${overallPct}%</span>
          </div>
          <div style="height:10px;background:rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;">
            <div style="height:100%;width:${overallPct}%;background:linear-gradient(90deg,var(--p-gold),var(--p-teal));border-radius:6px;transition:width 0.8s;"></div>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;">
        ${nodes.map(node => {
          const st = getStatus(node);
          return `
            <div style="padding:18px 14px;border-radius:14px;background:${st.color}11;border:1px solid ${st.color}33;text-align:center;transition:transform 0.2s;${st.cls === 'locked' ? 'opacity:0.45;filter:grayscale(0.6);' : ''}" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">
              <div style="font-size:2rem;margin-bottom:6px;">${node.icon}</div>
              <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px;">${_e(node.name)}</div>
              <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;margin-bottom:6px;overflow:hidden;">
                <div style="height:100%;width:${node.score}%;background:${st.color};border-radius:3px;"></div>
              </div>
              <div style="font-size:0.75rem;color:${st.color};font-weight:600;">${st.label}  ${node.score}%</div>
            </div>`;
        }).join('')}
      </div>`;
  }
,

  booksDb: [
    {
      id: 'book-opening-1',
      title: 'Fundamental Chess Openings',
      category: 'Opening',
      author: 'Paul van der Sterren',
      pages: [
        "Welcome to Fundamental Chess Openings. Openings are the foundation of chess strategy. We will cover the main principles: control the center, develop pieces, and castle early.",
        "The Ruy Lopez (1.e4 e5 2.Nf3 Nc6 3.Bb5) is one of the oldest and most respected openings. It challenges Black's knight on c6 and controls key central squares.",
        "The Sicilian Defense (1.e4 c5) is the most popular response to 1.e4. It leads to sharp, asymmetrical play where Black fights for control of the d4 square.",
        "The Queen's Gambit (1.d4 d5 2.c4) is a fight for the center where White offers a wing pawn to gain space and control. Declining it with 2...e6 or 2...c6 is standard.",
        "To master chess openings, do not just memorize moves. Understand the plans and typical pawn structures that arise from each opening."
      ],
      xpReward: 30
    },
    {
      id: 'book-tactics-1',
      title: 'Chess Tactics for Beginners',
      category: 'Tactics',
      author: 'ChessKidoo Academy',
      pages: [
        "Tactics are short-term sequences of moves that result in immediate concrete gain. Forks, pins, and skewers are the basic weapons.",
        "A fork occurs when one piece attacks two or more enemy pieces at the same time. Knights and Queens are particularly dangerous forking weapons.",
        "A pin is when an attacked piece cannot move without exposing a more valuable piece behind it. Absolute pins (pinned to King) are completely paralyzed.",
        "A skewer is the reverse of a pin. A valuable piece is attacked and must move, exposing a less valuable piece behind it to capture.",
        "Always look for forcing moves: checks, captures, and threats. These are the building blocks of tactical calculations."
      ],
      xpReward: 30
    },
    {
      id: 'book-endgame-1',
      title: 'Essential Endgame Patterns',
      category: 'Endgame',
      author: 'Karsten Mller',
      pages: [
        "In the endgame, the King becomes an active, powerful piece. Do not hide your King; bring it to the center to assist your pawns.",
        "King and Pawn endgames are defined by opposition. Having the opposition means forcing the enemy King to step aside.",
        "Rook endgames are the most common and complex. The Philidor Position is a key defensive drawing technique that every player must know.",
        "The Lucena Position is the 'bridge building' technique used by the attacker to win a rook and pawn endgame by shielding their King.",
        "Passed pawns must be pushed! A passed pawn is a pawn that has no opposing pawns in front of it or on adjacent files."
      ],
      xpReward: 30
    },
    {
      id: 'book-strategy-1',
      title: 'Positional Masterclass',
      category: 'Strategy',
      author: 'Aron Nimzowitsch',
      pages: [
        "Strategy is the long-term plan in chess. It deals with pawn structures, piece placement, space, and color complex control.",
        "Outposts are squares on the 4th, 5th, or 6th rank that cannot be attacked by enemy pawns. Knights love outposts, especially on d5 or e5.",
        "Open files should be occupied by Rooks. The ultimate goal is to penetrate to the 7th or 8th rank to attack the enemy's base.",
        "Weak pawns (isolated, backward, doubled) are targets. Keep pressure on them to tie down enemy pieces to passive defense.",
        "Prophylaxis means anticipating your opponent's plans and stopping them before they can even execute them."
      ],
      xpReward: 35
    },
    {
      id: 'book-middlegame-1',
      title: 'The Art of Middlegame Planning',
      category: 'Middlegame',
      author: 'Alexander Kotov',
      pages: [
        "The middlegame starts when pieces are developed. A good plan is based on the weaknesses and strengths of the position.",
        "King safety is paramount. If the opponent's King is stuck in the center, open up lines immediately by sacrificing a pawn if necessary.",
        "Minor piece trade-offs: Bishops are stronger in open positions with pawns on both sides. Knights excel in closed, blocked positions.",
        "Pawn storms: Pushing your pawns towards the opponent's castled King to open files for your heavy pieces.",
        "Dynamic play vs Static advantages. A static advantage (better pawn structure) lasts long, whereas dynamic play requires speed."
      ],
      xpReward: 35
    },
    {
      id: 'book-psychology-1',
      title: 'Mindset of a Chess Champion',
      category: 'Psychology',
      author: 'ChessKidoo Mindset',
      pages: [
        "Chess is as much about psychology as logic. Confidence, resilience, and emotional control are critical to tournament success.",
        "Never underestimate your opponent, but never fear them either. Treat every move with maximum focus and objectiveness.",
        "Handling losses: Every chess master was once a beginner who lost thousands of games. Analyze your losses to learn and grow.",
        "Time management: Avoid falling into time trouble early. Allocate time based on the complexity of the position.",
        "Focus and endurance. Chess tournaments require hours of mental stamina. Exercise, stay hydrated, and take breaks between rounds."
      ],
      xpReward: 40
    },
    {
      id: 'book-rules-1',
      title: 'Learn Chess: The Complete Rules',
      category: 'Beginner',
      author: 'ChessKidoo Academy',
      pages: [
        "Chess is played on an 8x8 board between White and Black. White always moves first. The goal is to checkmate the enemy King.",
        "Piece moves: the Rook moves in straight lines, the Bishop diagonally, the Queen both, the Knight in an 'L' shape, and the King one square in any direction.",
        "Pawns move forward one square (two on their first move) and capture diagonally. Reaching the last rank promotes the pawn — usually to a Queen.",
        "Special moves: castling (King + Rook safety move), en passant (a special pawn capture), and promotion. Learn all three early.",
        "Check, checkmate, and stalemate: check is a threat to the King, checkmate ends the game, and stalemate (no legal move, not in check) is a draw."
      ],
      xpReward: 25
    },
    {
      id: 'book-attack-1',
      title: 'The Art of Attack in Chess',
      category: 'Middlegame',
      author: 'Vladimir Vukovic',
      pages: [
        "Attacking the King is the most exciting part of chess. Successful attacks usually require a lead in development or more active pieces.",
        "The classic bishop sacrifice on h7 (the 'Greek Gift') is a recurring attacking pattern against a castled King — Bxh7+ Kxh7 Ng5+.",
        "Open the lines to the enemy King. Pawn levers and sacrifices that rip open files and diagonals fuel a winning attack.",
        "Bring ALL your pieces to the attack. An attack with two pieces rarely succeeds; coordinate Rooks, Queen, Bishops and Knights together.",
        "Calculate forcing lines to the end. In sharp attacking positions, a single tempo decides between brilliancy and blunder."
      ],
      xpReward: 40
    },
    {
      id: 'book-greats-1',
      title: 'Lessons from the World Champions',
      category: 'Strategy',
      author: 'ChessKidoo Academy',
      pages: [
        "Capablanca taught simplicity: trade into favourable endgames and exploit tiny advantages with flawless technique.",
        "Alekhine showed the power of dynamic, attacking chess fuelled by deep combinational vision.",
        "Botvinnik pioneered scientific preparation — studying openings deeply and analysing your own games honestly.",
        "Fischer combined razor-sharp opening prep with universal understanding; Kasparov added relentless dynamism and energy.",
        "Carlsen's strength is pressing tiny edges for hours — proving that endgame mastery and patience win at the highest level."
      ],
      xpReward: 45
    }
  ],

  videosDb: [
    {
      id: 'vid-sicilian',
      title: 'How to Play the Sicilian Defense',
      youtubeId: 'v8b_ZcLy41Q',
      category: 'Opening',
      channel: 'GothamChess',
      duration: '18:24',
      description: 'Master the basic concepts and key tactical ideas in the sharp Sicilian Defense.'
    },
    {
      id: 'vid-endgames',
      title: "Praggnanandhaa's Incredible Endgames",
      youtubeId: 'tV91uG7WlyQ',
      category: 'Endgame',
      channel: 'ChessBase India',
      duration: '15:10',
      description: "Learn precise pawn endgame technique and King activity from Indian GM Praggnanandhaa."
    },
    {
      id: 'vid-middlegame',
      title: 'Middle Game Strategy: Pawn Chains',
      youtubeId: 'y10z8d1b1s0',
      category: 'Middlegame',
      channel: 'Hanging Pawns',
      duration: '22:45',
      description: 'Understanding how pawn chains define plans, weaknesses, and attack directions.'
    },
    {
      id: 'vid-fundamentals',
      title: 'Endgame Fundamentals with GM Yasser Seirawan',
      youtubeId: 's4Rj6Uq-XvY',
      category: 'Endgame',
      channel: 'Saint Louis Chess Club',
      duration: '45:30',
      description: 'GM Yasser Seirawan covers the key rules, Lucena position, Philidor position, and more.'
    },
    {
      id: 'vid-rules',
      title: 'How to Play Chess: Rules for Beginners',
      youtubeId: 'OCSbzArwB10',
      category: 'Beginner',
      channel: 'Chess.com',
      duration: '10:01',
      description: 'A clear beginner guide to the board, piece moves, special rules, check and checkmate.'
    },
    {
      id: 'vid-openings',
      title: 'The Best Chess Opening Traps',
      youtubeId: 'D2NUyiTzv9c',
      category: 'Opening',
      channel: 'GothamChess',
      duration: '14:52',
      description: 'Common opening traps every improving player should know — both to use and to avoid.'
    },
    {
      id: 'vid-tactics',
      title: 'Chess Tactics: Forks, Pins & Skewers',
      youtubeId: 'GeOQXgaQjFA',
      category: 'Tactics',
      channel: 'Saint Louis Chess Club',
      duration: '20:18',
      description: 'A structured lesson on the core tactical motifs that decide most games.'
    },
    {
      id: 'vid-principles',
      title: '3 Opening Principles Every Player Must Know',
      youtubeId: 'rh1S0kPdsRk',
      category: 'Opening',
      channel: 'Chess.com',
      duration: '12:33',
      description: 'Control the centre, develop your pieces, and keep your King safe — explained simply.'
    },
    {
      id: 'vid-checkmates',
      title: 'Checkmate Patterns You Must Know',
      youtubeId: 'B4o1Mc0NjPg',
      category: 'Tactics',
      channel: 'GothamChess',
      duration: '16:40',
      description: 'Back-rank, smothered mate, Anastasia, Arabian and more — the patterns that win games.'
    }
  ],

  _activeResourceTab: 'elibrary',
  _elibraryCategory: 'All',
  _activeBook: null,
  _pdfZoom: 16,

  switchResourceTab(tabId) {
    this._activeResourceTab = tabId;
    const btns = document.querySelectorAll('.resource-tab-btn');
    btns.forEach(btn => {
      const btnAttr = btn.getAttribute('onclick') || '';
      if (btnAttr.includes(tabId)) {
        btn.classList.add('active');
        btn.classList.remove('p-btn-ghost');
        btn.classList.add('p-btn-teal');
      } else {
        btn.classList.remove('active');
        btn.classList.remove('p-btn-teal');
        btn.classList.add('p-btn-ghost');
      }
    });

    const elib = document.getElementById('studentELibrarySection');
    const videos = document.getElementById('studentVideoAcademySection');
    const assigns = document.getElementById('studentAssignSection');

    if (elib) elib.style.display = tabId === 'elibrary' ? 'block' : 'none';
    if (videos) videos.style.display = tabId === 'videos' ? 'block' : 'none';
    if (assigns) assigns.style.display = tabId === 'assignments' ? 'block' : 'none';

    if (tabId === 'elibrary') {
      this.renderELibrary();
    } else if (tabId === 'videos') {
      this.renderVideoAcademy();
    } else if (tabId === 'assignments') {
      this.renderAssignedResources();
    }
  },

  filterELibrary(category) {
    this._elibraryCategory = category;
    const btns = document.querySelectorAll('.elib-cat-btn');
    btns.forEach(btn => {
      const btnAttr = btn.getAttribute('onclick') || '';
      if (btnAttr.includes(`'${category}'`)) {
        btn.classList.add('active');
        btn.classList.remove('p-btn-ghost');
        btn.classList.add('p-btn-blue');
      } else {
        btn.classList.remove('active');
        btn.classList.remove('p-btn-blue');
        btn.classList.add('p-btn-ghost');
      }
    });
    this.renderELibrary();
  },

  async renderELibrary() {
    const grid = document.getElementById('studentELibraryGrid');
    if (!grid) return;

    const studentId = this.userProfile?.id || CK.currentUser?.id;
    if (!studentId) return;

    const progressList = await CK.db.getELibraryProgress(studentId) || [];
    const progressMap = {};
    progressList.forEach(p => {
      progressMap[p.book_id] = p;
    });

    const COVERS = {
      Opening:    { grad: 'linear-gradient(140deg,#3b5998,#1e3358)', icon: '♟️' },
      Tactics:    { grad: 'linear-gradient(140deg,#d35400,#8e2f00)', icon: '⚡' },
      Endgame:    { grad: 'linear-gradient(140deg,#16a085,#0b5345)', icon: '👑' },
      Strategy:   { grad: 'linear-gradient(140deg,#8e44ad,#512e5f)', icon: '🧠' },
      Middlegame: { grad: 'linear-gradient(140deg,#27ae60,#145a32)', icon: '⚔️' },
      Psychology: { grad: 'linear-gradient(140deg,#dca33e,#9c7320)', icon: '🎯' },
      Beginner:   { grad: 'linear-gradient(140deg,#e8527c,#922b4e)', icon: '🌱' }
    };
    const filtered = this.booksDb.filter(b => this._elibraryCategory === 'All' || b.category === this._elibraryCategory);
    grid.classList.add('elib-grid');

    grid.innerHTML = filtered.map(b => {
      const prog = progressMap[b.id] || { last_page: 0, completed_percentage: 0 };
      const percent = Math.min(100, Math.round(prog.completed_percentage || 0));
      const cv = COVERS[b.category] || { grad: 'linear-gradient(140deg,#475569,#1e293b)', icon: '📘' };
      const _e = CK.esc || (s => s);
      return `
        <div class="elib-book">
          <div class="elib-cover" style="background:${cv.grad}">
            <div class="elib-spine"></div>
            <div class="elib-cover-top">
              <span class="elib-cover-cat">${_e(b.category)}</span>
              <span class="elib-cover-xp">+${b.xpReward} XP</span>
            </div>
            <div class="elib-cover-icon">${cv.icon}</div>
            <div class="elib-cover-title">${_e(b.title)}</div>
            <div class="elib-cover-author">${_e(b.author)}</div>
            ${percent >= 100 ? '<div class="elib-done-badge">✓ Completed</div>' : ''}
          </div>
          <div class="elib-foot">
            <div class="elib-prog-row"><span>${b.pages.length} pages</span><span>${percent}%</span></div>
            <div class="elib-bar"><div class="elib-bar-fill" style="width:${percent}%"></div></div>
            <button class="p-btn p-btn-gold p-btn-sm elib-read-btn" onclick="CK.student.openPDFReader('${b.id}')">${percent > 0 && percent < 100 ? '📖 Continue Reading' : (percent >= 100 ? '🔄 Read Again' : '📖 Read Online')}</button>
          </div>
        </div>
      `;
    }).join('');
  },

  async openPDFReader(bookId) {
    const book = this.booksDb.find(b => b.id === bookId);
    if (!book) return;

    this._activeBook = book;
    this._pdfZoom = 16;

    const studentId = this.userProfile?.id || CK.currentUser?.id;
    const progressList = await CK.db.getELibraryProgress(studentId) || [];
    const progress = progressList.find(p => p.book_id === bookId) || {
      last_page: 1,
      completed_percentage: 0,
      reading_time_seconds: 0,
      notes: '',
      bookmarks: '[]'
    };

    this._activeBookPage = progress.last_page || 1;
    this._activeBookTime = progress.reading_time_seconds || 0;
    this._activeBookNotes = progress.notes || '';

    let bookmarks = [];
    try {
      bookmarks = JSON.parse(progress.bookmarks || '[]');
    } catch(e) { bookmarks = []; }
    this._activeBookBookmarks = bookmarks;

    const titleEl = document.getElementById('pdfReaderTitle');
    if (titleEl) titleEl.innerHTML = ` Online Reader: ${book.title}`;

    const contentEl = document.getElementById('pdfContentArea');
    if (contentEl) {
      contentEl.style.fontSize = this._pdfZoom + 'px';
      contentEl.textContent = book.pages[this._activeBookPage - 1] || 'No content';
    }

    const indicatorEl = document.getElementById('pdfPageIndicator');
    if (indicatorEl) indicatorEl.textContent = `Page ${this._activeBookPage} of ${book.pages.length}`;

    const notesEl = document.getElementById('pdfNotesArea');
    if (notesEl) notesEl.value = this._activeBookNotes;

    this.updatePdfBookmarkBtn();
    this.renderPdfBookmarks();
    this.updatePdfProgress();

    if (this._bookTimerInterval) clearInterval(this._bookTimerInterval);
    this._bookTimerInterval = setInterval(() => {
      this._activeBookTime++;
      const rTimeEl = document.getElementById('pdfReadingTime');
      if (rTimeEl) rTimeEl.textContent = this._activeBookTime + 's';
      if (this._activeBookTime % 10 === 0) {
        this.saveBookProgressToDb();
      }
    }, 1000);

    CK.openModal('studentPDFReaderModal');
  },

  async closePDFReader() {
    if (this._bookTimerInterval) {
      clearInterval(this._bookTimerInterval);
      this._bookTimerInterval = null;
    }

    await this.saveBookProgressToDb();

    const studentId = this.userProfile?.id || CK.currentUser?.id;
    const progressList = await CK.db.getELibraryProgress(studentId) || [];
    const prevProgress = progressList.find(p => p.book_id === this._activeBook?.id);

    if (this._activeBook && (this._activeBookPage === this._activeBook.pages.length) && (!prevProgress || prevProgress.completed_percentage < 100)) {
      if (CK.db && CK.db.awardXP) {
        await CK.db.awardXP(studentId, this._activeBook.xpReward || 30, `Read book: ${this._activeBook.title}`);
      }
    }

    this._activeBook = null;
    this.renderELibrary();
    CK.closeModal('studentPDFReaderModal');
  },

  async saveBookProgressToDb() {
    if (!this._activeBook) return;
    const studentId = this.userProfile?.id || CK.currentUser?.id;
    if (!studentId) return;

    const notesEl = document.getElementById('pdfNotesArea');
    const notes = notesEl ? notesEl.value : this._activeBookNotes;
    const completedPct = Math.round((this._activeBookPage / this._activeBook.pages.length) * 100);

    const progressObj = {
      student_id: studentId,
      book_id: this._activeBook.id,
      last_page: this._activeBookPage,
      completed_percentage: completedPct,
      reading_time_seconds: this._activeBookTime,
      notes: notes,
      bookmarks: JSON.stringify(this._activeBookBookmarks)
    };

    await CK.db.saveELibraryProgress(progressObj);
  },

  pdfPrevPage() {
    if (!this._activeBook || this._activeBookPage <= 1) return;
    this._activeBookPage--;
    this.renderPdfPage();
  },

  pdfNextPage() {
    if (!this._activeBook || this._activeBookPage >= this._activeBook.pages.length) return;
    this._activeBookPage++;
    this.renderPdfPage();
  },

  renderPdfPage() {
    const contentEl = document.getElementById('pdfContentArea');
    if (contentEl) {
      contentEl.textContent = this._activeBook.pages[this._activeBookPage - 1];
    }
    const indicatorEl = document.getElementById('pdfPageIndicator');
    if (indicatorEl) {
      indicatorEl.textContent = `Page ${this._activeBookPage} of ${this._activeBook.pages.length}`;
    }
    this.updatePdfBookmarkBtn();
    this.updatePdfProgress();
  },

  pdfZoomIn() {
    this._pdfZoom = Math.min(30, this._pdfZoom + 2);
    const contentEl = document.getElementById('pdfContentArea');
    if (contentEl) contentEl.style.fontSize = this._pdfZoom + 'px';
  },

  pdfZoomOut() {
    this._pdfZoom = Math.max(12, this._pdfZoom - 2);
    const contentEl = document.getElementById('pdfContentArea');
    if (contentEl) contentEl.style.fontSize = this._pdfZoom + 'px';
  },

  togglePdfBookmark() {
    if (!this._activeBook) return;
    const page = this._activeBookPage;
    const idx = this._activeBookBookmarks.indexOf(page);
    if (idx !== -1) {
      this._activeBookBookmarks.splice(idx, 1);
      CK.showToast(`Removed bookmark for Page ${page}`, 'info');
    } else {
      this._activeBookBookmarks.push(page);
      this._activeBookBookmarks.sort((a,b)=>a-b);
      CK.showToast(`Bookmarked Page ${page}!`, 'success');
    }
    this.updatePdfBookmarkBtn();
    this.renderPdfBookmarks();
  },

  updatePdfBookmarkBtn() {
    const btn = document.getElementById('pdfBookmarkBtn');
    if (!btn || !this._activeBook) return;
    const isBookmarked = this._activeBookBookmarks.includes(this._activeBookPage);
    btn.textContent = isBookmarked ? ' Bookmarked' : ' Bookmark';
    btn.className = isBookmarked ? 'p-btn p-btn-teal p-btn-sm' : 'p-btn p-btn-ghost p-btn-sm';
  },

  renderPdfBookmarks() {
    const list = document.getElementById('pdfBookmarksList');
    if (!list) return;
    if (this._activeBookBookmarks.length === 0) {
      list.innerHTML = '<div style="font-size:0.8rem; opacity:0.4; padding:4px;">No bookmarks saved yet</div>';
      return;
    }
    list.innerHTML = this._activeBookBookmarks.map(p => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:4px; border:1px solid rgba(255,255,255,0.04); font-size:0.85rem;">
        <span>Page ${p}</span>
        <button class="p-btn p-btn-blue p-btn-xs" style="padding: 2px 6px; font-size:0.75rem;" onclick="CK.student.jumpToPdfPage(${p})">Go</button>
      </div>
    `).join('');
  },

  jumpToPdfPage(page) {
    if (!this._activeBook) return;
    this._activeBookPage = page;
    this.renderPdfPage();
  },

  savePdfNotes() {
    const notesEl = document.getElementById('pdfNotesArea');
    if (notesEl) this._activeBookNotes = notesEl.value;
  },

  updatePdfProgress() {
    const pct = Math.round((this._activeBookPage / this._activeBook.pages.length) * 100);
    const pctEl = document.getElementById('pdfCompletionPct');
    if (pctEl) pctEl.textContent = pct + '%';
    const rTimeEl = document.getElementById('pdfReadingTime');
    if (rTimeEl) rTimeEl.textContent = this._activeBookTime + 's';
  },

  // --- VIDEO ACADEMY METHODS ---
  async renderVideoAcademy() {
    const grid = document.getElementById('studentVideoGrid');
    if (!grid) return;

    const studentId = this.userProfile?.id || CK.currentUser?.id;
    if (!studentId) return;

    const progressList = await CK.db.getVideoProgress(studentId) || [];
    const progressMap = {};
    progressList.forEach(p => {
      progressMap[p.video_id] = p;
    });

    const savedMap = JSON.parse(localStorage.getItem(`ck_video_saved_${studentId}`) || '{}');

    grid.classList.add('va-grid');
    grid.innerHTML = this.videosDb.map(v => {
      const prog = progressMap[v.id] || { last_position_seconds: 0, completed: false };
      const isSaved = !!savedMap[v.id];
      const resumeText = prog.last_position_seconds > 0 ? `▶ Resume` : '▶ Watch';
      const _e = CK.esc || (s => s);
      return `
        <div class="va-card">
          <div class="va-thumb" onclick="CK.student.playAcademyVideo('${v.id}')">
            <img src="https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${v.youtubeId}/0.jpg'"/>
            <span class="va-play">▶</span>
            <span class="va-dur">${_e(v.duration)}</span>
            ${prog.completed ? '<span class="va-done">✓ Watched</span>' : ''}
          </div>
          <div class="va-body">
            <div class="va-title">${_e(v.title)}</div>
            <div class="va-meta"><span class="va-channel">📺 ${_e(v.channel)}</span><span class="p-badge p-badge-blue">${_e(v.category)}</span></div>
          </div>
          <div class="va-foot">
            <button class="p-btn p-btn-blue p-btn-sm va-watch" onclick="CK.student.playAcademyVideo('${v.id}')">${resumeText}</button>
            <button class="p-btn p-btn-ghost p-btn-sm va-save${isSaved ? ' va-saved' : ''}" onclick="CK.student.toggleSaveVideo('${v.id}')" title="${isSaved ? 'Saved' : 'Save for later'}">${isSaved ? '★' : '☆'}</button>
          </div>
        </div>
      `;
    }).join('');

    this.renderVideoSidebar(progressList, savedMap);
  },

  renderVideoSidebar(progressList, savedMap) {
    const studentId = this.userProfile?.id || CK.currentUser?.id;

    const resumeEl = document.getElementById('videoAcademyResumeList');
    if (resumeEl) {
      const inProgress = this.videosDb.filter(v => {
        const prog = progressList.find(p => p.video_id === v.id);
        return prog && prog.last_position_seconds > 0 && !prog.completed;
      });

      if (inProgress.length === 0) {
        resumeEl.innerHTML = '<div style="font-size:0.8rem; opacity:0.4; padding:8px;">No videos in progress yet</div>';
      } else {
        resumeEl.innerHTML = inProgress.map(v => {
          const prog = progressList.find(p => p.video_id === v.id);
          const pos = Math.round(prog.last_position_seconds);
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:4px; font-size:0.85rem; border:1px solid rgba(255,255,255,0.04);">
              <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">${v.title}</span>
              <button class="p-btn p-btn-teal p-btn-xs" onclick="CK.student.playAcademyVideo('${v.id}')">Resume (${pos}s)</button>
            </div>
          `;
        }).join('');
      }
    }

    const savedEl = document.getElementById('videoAcademySavedList');
    if (savedEl) {
      const saved = this.videosDb.filter(v => savedMap[v.id]);
      if (saved.length === 0) {
        savedEl.innerHTML = '<div style="font-size:0.8rem; opacity:0.4; padding:8px;">No saved videos</div>';
      } else {
        savedEl.innerHTML = saved.map(v => `
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:4px; font-size:0.85rem; border:1px solid rgba(255,255,255,0.04);">
            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">${v.title}</span>
            <button class="p-btn p-btn-blue p-btn-xs" onclick="CK.student.playAcademyVideo('${v.id}')">Watch</button>
          </div>
        `).join('');
      }
    }
  },

  async playAcademyVideo(videoId) {
    const video = this.videosDb.find(v => v.id === videoId);
    if (!video) return;

    this._activeVideoId = videoId;
    const studentId = this.userProfile?.id || CK.currentUser?.id;

    const progressList = await CK.db.getVideoProgress(studentId) || [];
    const progress = progressList.find(p => p.video_id === videoId) || { last_position_seconds: 0 };

    const titleEl = document.getElementById('videoAcademyActiveTitle');
    const descEl = document.getElementById('videoAcademyActiveDesc');
    const playerContainer = document.getElementById('videoAcademyPlayerContainer');

    if (titleEl) titleEl.textContent = video.title;
    if (descEl) descEl.textContent = video.description;

    if (playerContainer) {
      playerContainer.innerHTML = `<div id="ytAcademyPlayer" style="width:100%; height:100%;"></div>`;

      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      const createPlayer = () => {
        this._ytPlayer = new window.YT.Player('ytAcademyPlayer', {
          height: '100%',
          width: '100%',
          videoId: video.youtubeId,
          playerVars: {
            'autoplay': 1,
            'modestbranding': 1,
            'rel': 0,
            'start': Math.round(progress.last_position_seconds)
          },
          events: {
            'onStateChange': (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                this.startTrackingVideoProgress();
              } else {
                this.stopTrackingVideoProgress();
              }
            }
          }
        });
      };

      if (window.YT && window.YT.Player) {
        createPlayer();
      } else {
        window.onYouTubeIframeAPIReady = createPlayer;
      }
    }
  },

  startTrackingVideoProgress() {
    if (this._videoProgressTimer) clearInterval(this._videoProgressTimer);
    this._videoProgressTimer = setInterval(async () => {
      if (this._ytPlayer && typeof this._ytPlayer.getCurrentTime === 'function') {
        const time = this._ytPlayer.getCurrentTime();
        const duration = this._ytPlayer.getDuration();
        const studentId = this.userProfile?.id || CK.currentUser?.id;
        if (!studentId || !this._activeVideoId) return;

        const completed = time > (duration - 15);

        await CK.db.saveVideoProgress({
          student_id: studentId,
          video_id: this._activeVideoId,
          last_position_seconds: time,
          completed: completed
        });
      }
    }, 5000);
  },

  stopTrackingVideoProgress() {
    if (this._videoProgressTimer) {
      clearInterval(this._videoProgressTimer);
      this._videoProgressTimer = null;
    }
  },

  async toggleSaveVideo(videoId) {
    const studentId = this.userProfile?.id || CK.currentUser?.id;
    if (!studentId) return;

    const savedMap = JSON.parse(localStorage.getItem(`ck_video_saved_${studentId}`) || '{}');
    if (savedMap[videoId]) {
      delete savedMap[videoId];
      CK.showToast('Removed from Saved Videos', 'info');
    } else {
      savedMap[videoId] = true;
      CK.showToast('Saved for later!', 'success');
    }
    localStorage.setItem(`ck_video_saved_${studentId}`, JSON.stringify(savedMap));
    this.renderVideoAcademy();
  }};
