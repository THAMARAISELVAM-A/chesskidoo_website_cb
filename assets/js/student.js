/* assets/js/student.js ----------------------------------------------------
   ChessKidoo Student Portal Logic
   Fully connected to CK.db layer with support for dynamic profiles, dual-curve
   rating spline charts, attendance calendar grids, and interactive mini-puzzles.
   ------------------------------------------------------------------------- */

CK.student = {
  userProfile: null,
  activePuzzleId: null,

  // List of interactive mock tactical puzzles
  puzzlesDb: [
    { id: 'P1', title: 'Back-Rank Mate', type: 'Tactics', diff: 'Easy', coach: 'ARIVUSELVAM', due: 'Today', instruction: 'White to move. Find the back-rank checkmate!', boardSetup: 'black-king-f8-pawns-g7-h7-white-rook-d1', solution: 'd8', desc: 'Rook to d8 delivers checkmate as the Black king is trapped behind its own pawns.' },
    { id: 'P2', title: 'Tactical Fork Opportunity', type: 'Tactics', diff: 'Medium', coach: 'ARIVUSELVAM', due: 'Tomorrow', instruction: 'White to move. Fork the black King and Rook with your Knight!', boardSetup: 'black-king-e8-rook-a8-white-knight-d5', solution: 'c7', desc: 'Knight to c7 forks both the king on e8 and the rook on a8, winning material.' },
    { id: 'P3', title: 'Smothered Mate', type: 'Endgame', diff: 'Hard', coach: 'VISHNU', due: 'May 18', instruction: 'White to move. Deliver the famous smothered mate with your Knight!', boardSetup: 'black-king-h8-rook-g8-pawns-h7-g7-f7-white-knight-f5', solution: 'f7', desc: 'Knight to f7 delivers checkmate because the king is completely boxed in by its own pieces.' },
    { id: 'P4', title: 'Queen Snipes the Rook', type: 'Tactics', diff: 'Easy', coach: 'VISHNU', due: 'Today', instruction: 'White to move. Slide your queen up the h-file and capture the undefended rook!', boardSetup: 'black-king-e8-rook-h8-white-queen-h1', solution: 'h8', desc: 'Queen to h8 captures the undefended rook. The black king on e8 cannot reach in time — a free piece!' },
    { id: 'P5', title: 'Knight Fork — King & Rook', type: 'Tactics', diff: 'Medium', coach: 'ARIVUSELVAM', due: 'May 16', instruction: 'White knight leaps to a square that attacks both the black king AND rook simultaneously. Find the forking square!', boardSetup: 'black-king-g5-rook-d6-white-knight-c3', solution: 'e4', desc: 'Knight to e4 forks the black king on g5 and rook on d6. White wins a full rook next move!' },
    { id: 'P6', title: 'Pin and Win', type: 'Tactics', diff: 'Medium', coach: 'ARIVUSELVAM', due: 'May 17', instruction: 'The black rook is pinned along the bishop diagonal — a pinned piece cannot move. Simply capture it!', boardSetup: 'black-king-e5-rook-c3-white-bishop-a1', solution: 'c3', desc: 'Bishop takes c3! The rook was pinned to the king along the a1–e5 diagonal and could not escape.' },
    { id: 'P7', title: 'Pawn Promotion', type: 'Endgame', diff: 'Easy', coach: 'VISHNU', due: 'May 19', instruction: 'White pawn is one square from queening! Click the promotion square to advance.', boardSetup: 'white-pawn-e7-white-king-e5-black-king-c7', solution: 'e8', desc: 'Pawn to e8, queening! The black king is too far away to stop it — a textbook passed pawn endgame win.' }
  ],

  async init() {
    
    // 1. Fetch current user profile dynamically from DB layer
    const currentUser = CK.currentUser || JSON.parse(localStorage.getItem('ck_user'));
    if (!currentUser || currentUser.role !== 'student') {
      CK.showToast("Session expired. Please log in again.", "error");
      CK.showPage('login-page');
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

  /* ── Auto Refresh ── */
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
    if (targetPanelId === 'schedule' && CK.schedulePro) CK.schedulePro.renderStudentSchedule('studentScheduleList', this.userProfile);
    if (targetPanelId === 'puzzles' && CK.puzzlesPro) CK.puzzlesPro.renderPuzzleList('studentPuzzleProList', this.userProfile?.id, this.userProfile?.full_name);
    if (targetPanelId === 'vault') this.renderReplayVault();
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
      classroom: 'My Classroom'
    };
    const titleEl = document.getElementById('studentPanelTitle');
    if (titleEl) titleEl.innerText = titles[panelId] || 'Dashboard';
  },

  /* ═══════════════════════════════════════════════════════
     LEVEL SYSTEM — Removed based on user request
  ═════════════════════════════════════════════════════════ */

  updateProfile() {
    const p = this.userProfile;
    const firstName = p.full_name ? p.full_name.split(' ')[0] : 'Champion';
    const initial = p.full_name ? p.full_name.charAt(0).toUpperCase() : '♛';

    // Sidebar
    const sbName   = document.getElementById('studentSidebarName');
    const sbSub    = document.getElementById('studentSidebarSub');
    const sbAvatar = document.getElementById('studentSidebarAvatar');
    if (sbName)   sbName.innerText   = p.full_name || 'Chess Student';
    if (sbSub)    sbSub.innerText    = `${p.level || 'Beginner'} · ELO ${p.rating || 800}`;
    if (sbAvatar) sbAvatar.innerText = initial;

    // Welcome banner — real puzzle count + next class name
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
      `${greeting}! ${unsolvedCount > 0 ? `${unsolvedCount} puzzle${unsolvedCount>1?'s':''} waiting` : 'All puzzles done today!'} · ${classHint}. Keep pushing!`;

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

    // Stats counters — real values
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

    // ── Streak badge ──
    if (p.id) {
      const streak = this.getStreak(p.id);
      this._renderStreakBadge(streak.count);
    }

    // ── Presence heartbeat ──
    if (p.id) {
      const presence = JSON.parse(localStorage.getItem('ck_live_presence') || '{}');
      presence[p.id] = { name: p.full_name, role: 'student', lastSeen: Date.now() };
      localStorage.setItem('ck_live_presence', JSON.stringify(presence));
    }

    // ── Real game stats from game-tracker ──
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

    // ── Real leaderboard from DB ──
    this._renderLeaderboard();

    // Daily puzzle title in home quick-card
    const dailyTitleEl = document.getElementById('dailyPuzzleTitle');
    if (dailyTitleEl) {
      const daily = this.puzzlesDb.find(x => x.id === this.getDailyPuzzleId());
      if (daily) {
        const solved = this._solvedPuzzles.has(daily.id);
        dailyTitleEl.textContent = solved
          ? `${daily.title} · ${daily.type} · ✅ Solved Today!`
          : `${daily.title} · ${daily.type} · ${daily.diff}`;
      }
    }

    // 2. Upcoming classes — fetched via DB layer (syncs from Supabase)
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
        content += `<div style="font-size:0.55rem; margin-top:1px;">✅</div>`;
        tooltip = 'Present';
      } else if (status === 'absent') {
        cls += ' absent';
        content += `<div style="font-size:0.55rem; margin-top:1px;">❌</div>`;
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
        <td style="font-weight:700; color:${t.change?.startsWith('+') ? 'var(--p-teal)' : 'var(--p-danger)'}">${_e(t.change ?? '—')} ELO</td>
      </tr>
    `).join('');
  },

  
  async renderResources() {
    const list = document.getElementById('studentResourcesList');
    if (!list) return;

    const myId    = this.userProfile.id    || this.userProfile.userid || '';
    const myLevel = this.userProfile.level || 'Beginner';
    const myBatch = this.userProfile.batch || '';
    const myCoach = this.userProfile.coach || '';

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

    if (!docs.length) {
      list.innerHTML = '<div style="opacity:0.6; padding:20px; text-align:center;">No resources assigned to your level yet. Check back soon!</div>';
      return;
    }

    const _e = CK.esc || (s => s);
    list.innerHTML = docs.map(f => {
      const downloadUrl = f.file_name
        ? (window.supabaseClient
            ? window.supabaseClient.storage.from('documents').getPublicUrl(f.file_name).data?.publicUrl
            : null)
        : null;
      const dlAttr = downloadUrl
        ? `onclick="window.open('${_e(downloadUrl)}','_blank')"`
        : `onclick="CK.showToast('File not available yet.','error')"`;
      return `
        <div class="p-resource-item">
          <div>
            <div class="p-resource-name">📄 ${_e(f.name)}</div>
            <div class="p-resource-note">📝 ${_e(f.level || myLevel)} · ${_e(f.type || 'Material')}${f.notes ? ' · ' + _e(f.notes) : ''}</div>
          </div>
          <button class="p-btn p-btn-blue p-btn-sm" ${dlAttr}>Download</button>
        </div>`;
    }).join('');
  },

  _PUZZLE_SETUPS: {
    P1: { 'f8': '♚', 'g7': '♟', 'h7': '♟', 'd1': '♖' },
    P2: { 'e8': '♚', 'a8': '♜', 'd5': '♘' },
    P3: { 'h8': '♚', 'g8': '♜', 'h7': '♟', 'g7': '♟', 'f7': '♟', 'f5': '♘' },
    P4: { 'e8': '♚', 'h8': '♜', 'h1': '♕' },
    P5: { 'g5': '♚', 'd6': '♜', 'c3': '♘' },
    P6: { 'e5': '♚', 'c3': '♜', 'a1': '♗' },
    P7: { 'e7': '♙', 'e5': '♔', 'c7': '♚' },
  },

  _solvedPuzzles: new Set(),
  _puzzleTimer: null,
  _puzzleSeconds: 0,
  _puzzleMistakes: 0,
  _puzzleXP: 0,

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
    el.textContent = `⏱ ${m}:${s}`;
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
      const medal = ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;
      const isMe = s.id === myId;
      return `<div class="pz-lb-row${isMe ? ' pz-lb-row--me' : ''}">
        <span class="pz-lb-rank">${medal}</span>
        <span class="pz-lb-name">${_e(s.full_name || 'Unknown')}</span>
        <span class="pz-lb-val">⭐ ${s.star || 0}</span>
        <span class="pz-lb-val">🧩 ${s.puzzle || 0}</span>
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

  renderPuzzlesList() {
    const container = document.getElementById('puzzlesListPanel');
    if (!container) return;
    const diffColor = { Easy: 'p-badge-green', Medium: 'p-badge-yellow', Hard: 'p-badge-red' };
    container.innerHTML = this.puzzlesDb.map(p => {
      const solved = this._solvedPuzzles.has(p.id);
      return `
        <div class="p-puzzle-card ${this.activePuzzleId === p.id ? 'active' : ''}" onclick="CK.student.loadPuzzle('${p.id}')">
          <div class="p-puzzle-icon">${solved ? '✅' : '🧩'}</div>
          <div class="p-puzzle-info">
            <div class="p-puzzle-title">${p.title}</div>
            <div class="p-puzzle-sub">${p.type} · <span class="p-badge ${diffColor[p.diff] || 'p-badge-blue'}" style="font-size:0.7rem; padding:1px 6px;">${p.diff}</span></div>
          </div>
          <button class="p-btn ${solved ? 'p-btn-ghost' : 'p-btn-gold'} p-btn-sm">${solved ? 'Redo' : 'Solve'}</button>
        </div>`;
    }).join('');

    // Update stats bar
    const pzSolvedEl = document.getElementById('pzStatSolved');
    if (pzSolvedEl) pzSolvedEl.textContent = `${this._solvedPuzzles.size}/${this.puzzlesDb.length}`;
    const pzStarEl = document.getElementById('pzStatStars');
    if (pzStarEl && this.userProfile) pzStarEl.textContent = `${this.userProfile.star || 0}/5`;
  },

  loadAndGoToPuzzle(id) {
    this.nav('puzzles');
    setTimeout(() => this.loadPuzzle(id), 80);
  },

  loadPuzzle(id) {
    const p = this.puzzlesDb.find(x => x.id === id);
    if (!p) return;

    this.activePuzzleId = id;

    // Show active area, hide placeholder
    const placeholder = document.getElementById('pzPlaceholder');
    const activeArea = document.getElementById('pzActiveArea');
    if (placeholder) placeholder.style.display = 'none';
    if (activeArea) activeArea.style.display = 'flex';

    // Highlight active puzzle in list
    document.querySelectorAll('#puzzlesListPanel .p-puzzle-card').forEach(el => el.classList.remove('active'));
    const matchEl = [...document.querySelectorAll('#puzzlesListPanel .p-puzzle-card')].find(el => el.onclick && el.getAttribute('onclick') && el.getAttribute('onclick').includes(id));
    if (matchEl) matchEl.classList.add('active');

    // Update title
    const titleEl = document.getElementById('puzzleTitle');
    if (titleEl) titleEl.textContent = p.title;

    // Update instructions
    const instrEl = document.getElementById('puzzleInstructions');
    if (instrEl) instrEl.innerHTML = `
      <span class="p-badge ${p.diff === 'Easy' ? 'p-badge-green' : p.diff === 'Hard' ? 'p-badge-red' : 'p-badge-yellow'}" style="font-size:0.72rem; padding:2px 8px;">${p.type} · ${p.diff}</span>
      <p style="margin:8px 0 0; color:rgba(255,255,255,0.7);">${p.instruction}</p>
    `;

    // Hide previous feedback
    const fb = document.getElementById('puzzleFeedback');
    if (fb) { fb.style.display = 'none'; fb.className = 'pz-feedback'; fb.textContent = ''; }

    // Start puzzle timer
    this.startPuzzleTimer();

    // Render board
    const boardEl = document.getElementById('studentPuzzleBoardContainer');
    if (!boardEl) return;

    const setup = this._PUZZLE_SETUPS[id] || {};
    const files = ['a','b','c','d','e','f','g','h'];
    const SQ_DARK  = '#4a7a2e';  // deeper forest green (dark squares)
    const SQ_LIGHT = '#d4d4a8';  // warm off-white (light squares)
    const COORD_DARK  = 'rgba(255,255,255,0.5)';
    const COORD_LIGHT = 'rgba(74,124,64,0.5)';
    const BLACK_PIECES = new Set(['♚','♜','♝','♛','♞','♟']);
    const WHITE_PIECES = new Set(['♔','♖','♗','♕','♘','♙']);
    // isDark: a1 (f=0,r=1) must be dark → (f+r)%2===1
    const sqSize = 'min(52px, calc((min(400px,100vw - 48px)) / 8))';
    let html = `<div style="display:grid;grid-template-columns:repeat(8,${sqSize});grid-template-rows:repeat(8,${sqSize});width:fit-content;margin:0 auto;border:3px solid rgba(85,107,47,0.6);border-radius:8px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.6),0 0 0 1px rgba(85,107,47,0.25);">`;
    for (let r = 8; r >= 1; r--) {
      for (let f = 0; f < 8; f++) {
        const sq = files[f] + r;
        const isDark = (f + r) % 2 === 1;
        const bg = isDark ? SQ_DARK : SQ_LIGHT;
        const coord = isDark ? COORD_DARK : COORD_LIGHT;
        const piece = setup[sq] || '';
        let textShadow = '';
        if (BLACK_PIECES.has(piece)) {
          textShadow = '0 0 3px rgba(255,255,255,0.9),0 0 6px rgba(255,255,255,0.6),0 2px 4px rgba(0,0,0,0.5)';
        } else if (WHITE_PIECES.has(piece)) {
          textShadow = '0 0 3px rgba(0,0,0,0.95),0 0 6px rgba(0,0,0,0.7),0 2px 4px rgba(0,0,0,0.5)';
        }
        const pc = BLACK_PIECES.has(piece) ? '#1a1a2e' : (WHITE_PIECES.has(piece) ? '#fffde7' : '');
        html += `<div style="width:${sqSize};height:${sqSize};background:${bg};display:flex;align-items:center;justify-content:center;font-size:clamp(1.5rem,4.5vw,2.5rem);cursor:pointer;user-select:none;position:relative;transition:filter 0.12s,transform 0.12s;box-sizing:border-box;" onclick="CK.student.onSquareClick('${sq}')" onmouseover="this.style.filter='brightness(1.18)';this.style.outline='3px solid rgba(85,107,47,0.7)';" onmouseout="this.style.filter='';this.style.outline='';" title="${sq}">
          <span style="text-shadow:${textShadow};color:${pc};line-height:1;pointer-events:none;">${piece}</span>
          <span style="position:absolute;bottom:1px;left:2px;font-size:0.5rem;font-weight:800;opacity:0.7;color:${coord};pointer-events:none;">${f === 0 ? r : ''}</span>
          <span style="position:absolute;bottom:1px;right:2px;font-size:0.5rem;font-weight:800;opacity:0.7;color:${coord};pointer-events:none;">${r === 1 ? files[f] : ''}</span>
        </div>`;
      }
    }
    html += `</div>`;
    boardEl.innerHTML = html;
  },

  showPuzzleHint() {
    const p = this.puzzlesDb.find(x => x.id === this.activePuzzleId);
    if (!p) return;
    const fb = document.getElementById('puzzleFeedback');
    if (!fb) return;
    const hints = {
      P1: '💡 Hint: Your rook can slide all the way up the d-file to the back rank!',
      P2: '💡 Hint: Your knight jumps in an L-shape. Look for a square that attacks both the king and rook.',
      P3: '💡 Hint: The black king is trapped in the corner by its own pieces. A knight jump can end the game!',
      P4: '💡 Hint: Your queen and the enemy rook share the h-file. Slide straight up for a free piece!',
      P5: '💡 Hint: Find the one square where your knight attacks BOTH the black king and rook at the same time!',
      P6: '💡 Hint: The black rook on c3 is pinned along the diagonal to the king — it cannot move. Simply capture it!',
      P7: '💡 Hint: Your pawn is on e7, one step from queening. Push it all the way to e8!'
    };
    fb.style.display = 'block';
    fb.className = 'pz-feedback hint';
    fb.textContent = hints[p.id] || '💡 Look for forcing moves — checks, captures, and threats!';
  },

  showPuzzleSolution() {
    const p = this.puzzlesDb.find(x => x.id === this.activePuzzleId);
    if (!p) return;
    const fb = document.getElementById('puzzleFeedback');
    if (!fb) return;
    fb.style.display = 'block';
    fb.className = 'pz-feedback hint';
     fb.innerHTML = `<strong>Solution:</strong> Click square <strong>${p?.solution?.toUpperCase() || p.solution}</strong>. ` + (CK.esc ? CK.esc(p.desc || '') : (p.desc || ''));


  },

  nextPuzzle() {
    const idx = this.puzzlesDb.findIndex(x => x.id === this.activePuzzleId);
    const next = this.puzzlesDb[idx + 1];
    if (next) {
      this.loadPuzzle(next.id);
    } else {
      CK.showToast('🏆 All puzzles completed! Great work!', 'success');
    }
  },

  async onSquareClick(squareId) {
    const p = this.puzzlesDb.find(x => x.id === this.activePuzzleId);
    if (!p) return;

    const fb = document.getElementById('puzzleFeedback');

    if (squareId === p.solution) {
      this.stopPuzzleTimer();
      const xp = this.getXPForPuzzle(p.diff, this._puzzleSeconds, this._puzzleMistakes);
      this._puzzleXP += xp;
      this.showXPPopup(xp);
      CK.showToast(`🎉 Brilliant! +${xp} XP earned!`, 'success');
      this._solvedPuzzles.add(p.id);
      this._srs.record(p.id, true);
      this._trackDailyGoal('puzzles');
      this.renderSRSQueue();

      if (fb) {
        fb.style.display = 'block';
        fb.className = 'pz-feedback success';
        fb.innerHTML = `✅ <strong>${CK.esc ? CK.esc(p.title || '') : (p.title || '')} solved!</strong><br><span style="font-size:0.85rem;opacity:0.85;">${CK.esc ? CK.esc(p.desc || '') : (p.desc || '')}</span>`;
      }

      // Flash the solution square with olive-gold glow
      const sqs = document.querySelectorAll('#studentPuzzleBoardContainer [title="' + squareId + '"]');
      sqs.forEach(el => { el.style.boxShadow = 'inset 0 0 0 4px #e8b84b, 0 0 20px rgba(232,184,75,0.6)'; el.style.background = '#3a6b2a'; el.style.outline = ''; });

      this.userProfile.puzzle = (parseInt(this.userProfile.puzzle) || 0) + 1;
      if ((this.userProfile.star || 0) < 5) {
        this.userProfile.star = (this.userProfile.star || 0) + 1;
      }
      await CK.db.saveProfile(this.userProfile);

      // Persist individual puzzle solve to puzzle_scores table
      await CK.db.savePuzzleScore({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        userId: this.userProfile.id || this.userProfile.userid,
        userName: this.userProfile.full_name || '',
        puzzleId: p.id,
        solved: true,
        time: this._puzzleSeconds,
        mistakes: this._puzzleMistakes,
        xp: this.getXPForPuzzle(p.diff, this._puzzleSeconds, this._puzzleMistakes),
        date: new Date().toISOString()
      });

      this.updateProfile();
      this.renderDashboard();
      this.renderPuzzlesList();
      this.renderAchievementsTab();
    } else {
      this._puzzleMistakes++;
      this._srs.record(p.id, false);
      CK.showToast('❌ Not quite — try again!', 'warning');
      if (fb) {
        fb.style.display = 'block';
        fb.className = 'pz-feedback error';
        fb.textContent = '❌ Incorrect square. Think carefully — look for the move that forces an immediate decisive result.';
      }
      // Flash the wrong square red briefly
      const sqs = document.querySelectorAll('#studentPuzzleBoardContainer [title="' + squareId + '"]');
      sqs.forEach(el => {
        el.style.boxShadow = 'inset 0 0 0 4px #ef4444, 0 0 14px rgba(239,68,68,0.5)';
        el.style.outline = '';
        setTimeout(() => { el.style.boxShadow = ''; }, 700);
      });
    }
  },

  async renderCoachReviews() {
    const container = document.getElementById('studentReviewsContainer');
    if (!container) return;

    const myReviews = await CK.tracker?.getReviews(this.userProfile?.full_name || '') || [];

    if (!myReviews.length) {
      container.innerHTML = '<div class="cls-empty">📭 No coach reviews posted yet. Keep attending classes!</div>';
      return;
    }

    const _e = CK.esc || (s => s);
    container.innerHTML = myReviews.map(r => `
      <div class="p-review-note">
        <div class="p-review-note-header">
          <span class="p-review-note-coach">🎓 ${_e(r.coach)}</span>
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
            <div style="font-size: 3rem; margin-bottom: 16px;">📼</div>
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
        const pieceIcon = index % 3 === 0 ? '♟️' : (index % 3 === 1 ? '♛' : '♞');
        
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
                ▶ Study Session Replay
              </button>
            </div>
          </div>
        `;
      }).join('');

    } catch (e) {
      console.error("[Student Vault] Error rendering replay vault:", e);
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ef4444;">
          ⚠️ Error loading synced class archives. Please try again.
        </div>
      `;
    }
  },

  async renderAchievementsTab() {
    const stars = this.userProfile.star || 0;
    
    // Star display
    let starStr = '';
    for (let i = 0; i < 5; i++) {
      starStr += i < stars ? '⭐' : '☆';
    }
    const starsEl = document.getElementById('achievementStarsDisplay');
    if (starsEl) starsEl.innerText = starStr;
    const progressEl = document.getElementById('achievementLevelProgressText');
    if (progressEl) progressEl.innerText = `You have earned ${stars} out of 5 stars!`;

    // Fetch actual attendance stats for dynamic milestone unlock
    const logs = (await CK.db.getAttendance(this.userProfile.id)) || [];
    const presentCount = logs.filter(l => l.status === 'present').length;
    const totalCount = logs.length;
    const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

    // Achievements grid
    const grid = document.getElementById('achievementsListGrid');
    if (grid) {
      const achievements = [
        { title: "Academy Pioneer", desc: "First-time registered academy member.", icon: "🎖️", unlocked: true },
        { title: "Puzzle Prodigy", desc: `Solve 20+ academy puzzles (Current: ${this.userProfile.puzzle}).`, icon: "🧠", unlocked: this.userProfile.puzzle >= 20 },
        { title: "Century Contender", desc: `Surpass 1000+ rating on the academy (Current: ${this.userProfile.rating}).`, icon: "👑", unlocked: this.userProfile.rating >= 1000 },
        { title: "Flawless Learner", desc: `Surpass 90% attendance record (Current: ${attendancePercentage}%).`, icon: "📚", unlocked: attendancePercentage >= 90 }
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

    // Certificate section — use real jsPDF system
    const certEl = document.getElementById('studentCertSection');
    if (certEl && CK.certs) {
      const attnSummary = (await CK.classSystem?.getStudentAttendanceSummary(this.userProfile.id)) || { pct: attendancePercentage };
      const puzzlesSolved = ((await CK.puzzlesPro?.getLeaderboard()) || []).find(u => u.userId === this.userProfile.id)?.solved || (this.userProfile.puzzle || 0);
      CK.certs.renderStudentCerts(certEl.id, this.userProfile, attnSummary.pct || attendancePercentage, puzzlesSolved);
    } else {
      // Fallback — old static cert logic
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

  /* ── My Rank & XP Panel ── */
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

  /* ── AI Study Plan Panel ── */
  async renderStudyPlan() {
    const p = this.userProfile;
    if (!p || !CK.ai) return;

    try {
      // Run analysis first
      const analysis = await CK.ai.analyzeStudent(p.id);
      if (!analysis) return;

      // Weakness radar chart — ensure canvas exists
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
        const p6 = pred.predictions && pred.predictions[5] ? pred.predictions[5].predictedELO : '—';
        const p12 = pred.predictions && pred.predictions[11] ? pred.predictions[11].predictedELO : '—';
        predEl.innerHTML = `
          <div style="text-align:center;">
            <div style="font-size:0.8rem; color:var(--p-text-muted); margin-bottom:8px;">Current ELO</div>
            <div style="font-size:2rem; font-weight:900; color:var(--p-gold);">${p.rating || 800}</div>
            <div style="margin:16px 0; font-size:1.4rem; color:var(--p-teal);">→</div>
            <div style="font-size:0.8rem; color:var(--p-text-muted); margin-bottom:8px;">Predicted in 6 Months</div>
            <div style="font-size:2rem; font-weight:900; color:var(--p-teal);">${p6}</div>
            <div style="font-size:0.75rem; color:var(--p-text-muted); margin-top:12px;">12-month prediction: <strong>${p12}</strong></div>
            <div style="font-size:0.72rem; color:var(--p-text-muted); margin-top:4px;">Confidence: ${pred.confidence || 'medium'}</div>
          </div>`;
      }
    } catch(e) { console.warn('Study plan render error:', e); }
  },

  regenerateStudyPlan() {
    CK.showToast('Regenerating your AI study plan...', 'info');
    setTimeout(() => this.renderStudyPlan(), 300);
  },

  /* ── Streak System ── */
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
      CK.notifs.push('puzzle_streak', `🔥 ${newCount}-Day Streak!`, `You've practised ${newCount} days in a row. Keep the fire going!`, userId, 'student');
    }
    return newCount;
  },

  _renderStreakBadge(count) {
    document.querySelectorAll('.student-streak-count').forEach(el => {
      el.textContent = count;
    });
    document.querySelectorAll('.student-streak-fire').forEach(el => {
      el.textContent = count >= 3 ? '🔥' : count >= 1 ? '⚡' : '—';
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
    const medals = ['🥇', '🥈', '🥉'];
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
              <div style="font-size:.72rem;color:var(--p-text-muted);">${s.level || 'Beginner'} · ${s.puzzle || 0} puzzles</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700;color:${color};font-size:.9rem;">${parseInt(s.rating) || 800} ELO</div>
            <div style="font-size:.68rem;color:var(--p-text-muted);">★ ${s.star || 0}</div>
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
              <div style="font-size:.72rem;color:var(--p-text-muted);">${p.level || 'Beginner'} · ${p.puzzle || 0} puzzles</div>
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

  /* ── Daily Goal Tracker ── */
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
      { k: 'puzzles', label: 'Daily Puzzles', icon: '🧩', color: 'var(--p-gold)' },
      { k: 'lessons', label: 'Lessons Watched', icon: '📚', color: 'var(--p-blue)' },
      { k: 'games',   label: 'Games Played',   icon: '♟',  color: 'var(--p-teal)' }
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
              <div class="dg-count">${val} / ${targets[g.k]}${done2 ? ' ✓' : ''}</div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  },

  /* ── Spaced Repetition System ── */
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
        ✅ No puzzles due for review today.<br>
        <span style="font-size:.78rem;">Mastered: ${stats.mastered} — Total reviewed: ${stats.total}</span>
      </div>`;
      return;
    }
    el.innerHTML = `
      <div style="margin-bottom:10px;font-size:.82rem;color:var(--p-text-muted)">
        📬 <strong style="color:var(--p-gold)">${due.length}</strong> puzzle${due.length > 1 ? 's' : ''} due for review · ${stats.mastered} mastered
      </div>
      ${due.map(p => `
        <div class="srs-card" onclick="CK.student.loadAndGoToPuzzle('${p.id}')">
          <span class="srs-icon">🔁</span>
          <div class="srs-info"><div class="srs-title">${p.title}</div><div class="srs-meta">${p.type} · ${p.diff}</div></div>
          <button class="p-btn p-btn-gold p-btn-sm">Review</button>
        </div>`).join('')}`;
  },

  /* ══════════════════════════════════════════════════════════
     REAL PROGRESS CALCULATION
     Weighted score from 5 pillars: attendance, puzzles,
     rating gain, games played, homework completion.
  ══════════════════════════════════════════════════════════ */
  async renderRealProgress() {
    const p = this.userProfile;
    if (!p) return;

    // 1. Attendance (30%) — from advanced attendance records
    const attnSummary = (await CK.classSystem?.getStudentAttendanceSummary(p.id)) || { total: 0, present: 0, pct: 0 };
    const logs = (await CK.db.getAttendance(p.id)) || [];
    const presentCount = logs.filter(l => l.status === 'present').length;
    const totalSessions = attnSummary ? attnSummary.total : logs.length;
    const presentSessions = attnSummary ? attnSummary.present : presentCount;
    const attendancePct = totalSessions > 0 ? Math.round(presentSessions / totalSessions * 100) : 100;

    // 2. Puzzles (25%) — real solved count from puzzles-pro
    const lbEntry = ((await CK.puzzlesPro?.getLeaderboard()) || []).find(u => u.userId === p.id);
    const puzzlesSolved = lbEntry?.solved || (p.puzzle || 0);
    const puzzleScore = Math.min(100, Math.round(puzzlesSolved / 60 * 100)); // 60 = total in DB

    // 3. Rating gain (20%) — from start to now
    const startRating = 800;
    const ratingGain = Math.max(0, (p.rating || 800) - startRating);
    const ratingScore = Math.min(100, Math.round(ratingGain / 4)); // 400pt gain = 100%

    // 4. Games played (15%)
    const gamesScore = Math.min(100, Math.round((p.game || 0) * 5)); // 20 games = 100%

    // 5. Homework (10%) — from classroom submissions
    const submissions = JSON.parse(localStorage.getItem('ck_hw_submissions') || '[]').filter(s => s.student_id === p.id || s.studentId === p.id);
    const assignments  = JSON.parse(localStorage.getItem('ck_assignments') || '[]');
    const hwDone  = submissions.filter(s => s.completed).length;
    const hwTotal = assignments.length;
    const hwScore = hwTotal > 0 ? Math.round(hwDone / hwTotal * 100) : 100;

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
      trendEl.textContent = overall >= 80 ? '🚀 Excellent Progress!' : overall >= 60 ? '📈 Good Progress' : overall >= 40 ? '📊 Making Progress' : '⚡ Needs Improvement';
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
    if (!this.userProfile) return; // profile not loaded yet — avoid null crash

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

    // Skill Radar / Heatmap Chart
    const ctxRadar = document.getElementById('skillRadarChart')?.getContext('2d');
    if (ctxRadar) {
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
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    // Cache in localStorage for the welcome banner fallback
    localStorage.setItem('ck_meetings', JSON.stringify(allMeetings));

    let classTime = null;
    let classTitle = `${p.level || 'Intermediate'} Strategy Session`;
    let classCoach = p.coach || '—';

    if (meetings.length) {
      const next = meetings[0];
      const match = (next.time || '').match(/(\d{1,2}):(\d{2})/);
      if (match) {
        classTime = new Date(next.date + 'T' + match[1].padStart(2,'0') + ':' + match[2] + ':00');
      }
      classTitle = next.title || next.type || classTitle;
      classCoach = next.coach || classCoach;
    } else {
      // Fallback: parse from profile schedule
      const scheduleRaw = p.schedule || '17:00';
      const match = scheduleRaw.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        classTime = new Date();
        classTime.setHours(parseInt(match[1]), parseInt(match[2]), 0, 0);
      }
    }

    const displayTime = classTime
      ? classTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : '5:00 PM';

    const nameEl = document.getElementById('nextClassTime');
    const classEl = document.getElementById('nextClassName');
    const subEl   = document.getElementById('nextClassSub');
    if (nameEl) nameEl.innerText = displayTime;
    if (classEl) classEl.innerText = classTitle;
    if (subEl)   subEl.innerText  = `with Coach ${classCoach}`;

    if (window.studentCountdownTimer) clearInterval(window.studentCountdownTimer);

    const tick = () => {
      if (!classTime) { el.innerText = 'Check schedule'; return; }
      const remaining = Math.max(0, Math.round((classTime - new Date()) / 60000));
      if (remaining === 0) {
        el.innerText = '🔴 Starting now!';
        el.style.color = 'var(--p-teal)';
      } else if (remaining < 60) {
        el.innerText = `Starts in ${remaining}m`;
        el.style.color = remaining < 15 ? 'var(--p-danger)' : '';
      } else {
        const h = Math.floor(remaining / 60);
        el.innerText = `Starts in ${h}h ${remaining % 60}m`;
        el.style.color = '';
      }
    };
    tick();
    window.studentCountdownTimer = setInterval(tick, 30000);
  },

  joinClass() {
    this._trackDailyGoal('lessons');
    CK.showToast("Opening secure class session with Coach...", "success");
    const sessionTitleEl = document.getElementById('studentSessionTitle');
    if (sessionTitleEl) sessionTitleEl.innerText = `Connecting to '${this.userProfile ? this.userProfile.level : 'Intermediate'} Strategy' Meeting...`;

    const joinBtn = document.getElementById('studentJoinBtn');
    if (!joinBtn) return;
    joinBtn.innerText = "Connecting...";
    joinBtn.disabled = true;

    setTimeout(async () => {
      CK.showToast("Successfully connected! Opening Google Meet class room.", "success");
      joinBtn.innerText = "Connected";

      const links = (window.CK && CK.batchManager) ? await CK.batchManager.getLinks() : {};
      const meetUrl = links[this.userProfile ? this.userProfile.level : ''] ||
                      links[this.userProfile?.batch || ''] || '';
      if (!meetUrl) {
        CK.showToast('Class link not yet set. Ask your coach or admin for the meeting URL.', 'warning');
        joinBtn.innerText = '▶ Join Class Room';
        joinBtn.disabled = false;
        return;
      }
      window.open(meetUrl, '_blank');

      setTimeout(() => {
        joinBtn.innerText = "▶ Rejoin Class Room";
        joinBtn.disabled = false;
        if (sessionTitleEl) sessionTitleEl.innerText = "Class session is currently active!";
      }, 3000);
    }, 1500);
  },

  renderReportCard() {
    const _e = CK.esc || (s => s);
    const p = this.userProfile || {};
    const rc = p.report_card || {
      opening: 84,
      middlegame: 76,
      tactics: 88,
      endgame: 62,
      time: 71,
      sports: 95,
      remarks: "Excellent concentration and tactical calculation. Shows great promise when navigating complex middlegame positions. Focus on active rook placements in pawn endgames.",
      goals: ["Participate in State Level Rapid U-14", "Master Lucena and Philidor Rook Endgames", "Maintain blunder rate under 3% in tournaments"]
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
        <div class="report-card-wrapper" id="printableReportCard">
          <!-- Crest Header -->
          <div class="rc-crest">
            <div class="rc-crest-icon">♔</div>
            <h1 class="rc-title">ChessKidoo Academy</h1>
            <div class="rc-subtitle">Official Student Performance Report</div>
          </div>

          <!-- Student Profile Block -->
          <div class="rc-student-block">
            <div class="rc-student-info">
               <div class="rc-info-item">
                 <span class="rc-info-label">Student Name</span>
                 <span class="rc-info-val">${_e(p.full_name || '—')}</span>
               </div>
               <div class="rc-info-item">
                 <span class="rc-info-label">Current Level</span>
                 <span class="rc-info-val">${_e(p.level || 'Intermediate')}</span>
               </div>
               <div class="rc-info-item">
                 <span class="rc-info-label">Assigned Coach</span>
                 <span class="rc-info-val">${_e(p.coach || '—')}</span>
               </div>
              <div class="rc-info-item">
                <span class="rc-info-label">Academic Term</span>
                <span class="rc-info-val">Summer Term 2026</span>
              </div>
            </div>
            <div class="rc-rating-badge">
              <div class="rc-rating-val">${p.rating || 1120}</div>
              <div class="rc-rating-label">FIDE / ELO Rating</div>
            </div>
          </div>

          <!-- Subject-Wise Assessment -->
          <div class="rc-section-title">Subject-Wise Assessment</div>
          <table class="rc-table">
            <thead>
              <tr>
                <th>Curriculum Subject</th>
                <th>Proficiency Mini-Bar</th>
                <th>Score</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Opening Theory & Repertoire</td>
                <td><div class="rc-bar-wrap"><div class="rc-bar-fill" style="width:${rc.opening}%"></div></div></td>
                <td>${rc.opening}/100</td>
                <td class="rc-grade">${getGrade(rc.opening)}</td>
              </tr>
              <tr>
                <td>Middlegame Strategy & Planning</td>
                <td><div class="rc-bar-wrap"><div class="rc-bar-fill" style="width:${rc.middlegame}%"></div></div></td>
                <td>${rc.middlegame}/100</td>
                <td class="rc-grade">${getGrade(rc.middlegame)}</td>
              </tr>
              <tr>
                <td>Tactical Awareness & Calculation</td>
                <td><div class="rc-bar-wrap"><div class="rc-bar-fill" style="width:${rc.tactics}%"></div></div></td>
                <td>${rc.tactics}/100</td>
                <td class="rc-grade">${getGrade(rc.tactics)}</td>
              </tr>
              <tr>
                <td>Endgame Technique & Precision</td>
                <td><div class="rc-bar-wrap"><div class="rc-bar-fill" style="width:${rc.endgame}%"></div></div></td>
                <td>${rc.endgame}/100</td>
                <td class="rc-grade">${getGrade(rc.endgame)}</td>
              </tr>
              <tr>
                <td>Time Management & Board Control</td>
                <td><div class="rc-bar-wrap"><div class="rc-bar-fill" style="width:${rc.time}%"></div></div></td>
                <td>${rc.time}/100</td>
                <td class="rc-grade">${getGrade(rc.time)}</td>
              </tr>
              <tr>
                <td>Sportsmanship & Tournament Etiquette</td>
                <td><div class="rc-bar-wrap"><div class="rc-bar-fill" style="width:${rc.sports}%"></div></div></td>
                <td>${rc.sports}/100</td>
                <td class="rc-grade">${getGrade(rc.sports)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Coach's Remarks -->
          <div class="rc-section-title">Coach's Diagnostic Remarks</div>
          <div class="rc-remarks-box">
            <div class="rc-remarks-content">"${_e(rc.remarks || '')}"</div>
          </div>

          <!-- Next Term Goals -->
          <div class="rc-section-title">Goals for Next Term</div>
          <div class="rc-goals-grid">
            ${rc.goals.map(g => `<div class="rc-goal-item"><span class="rc-goal-check">✓</span><span>${_e(g)}</span></div>`).join('')}
          </div>

          <!-- Signatures -->
          <div class="rc-signatures">
            <div class="rc-sig-box">
              <div class="rc-sig-line">${_e(p.coach || '—')}</div>
              <div class="rc-sig-title">Master Coach Signature</div>
            </div>
            <div class="rc-sig-box">
              <div class="rc-sig-line">Dr. V. Hariharan</div>
              <div class="rc-sig-title">Academy Director</div>
            </div>
          </div>
        </div>
      `;
    }
  },

  renderFeesGateway() {
    const p = this.userProfile || {};
    const status = p.status || 'Pending';
    const tuition = parseInt(p.fee) || 4000;
    const gst = Math.round(tuition * 0.18);
    const total = tuition + gst;
    const isPaid = status === 'Paid';

    const fmt = n => '₹' + n.toLocaleString('en-IN');

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
      badge.textContent = isPaid ? '✅ Paid' : '⚡ Pending';
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
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Txn ID</span><span>${_e(p.last_txn_id || 'CK_TXN_—')}</span></div>
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
          if (window.QRCode) {
            try {
              new window.QRCode(qrEl, {
                text: this._upiLinks.upi,
                width: 176,
                height: 176,
                colorDark: '#1a1a2e',
                colorLight: '#ffffff',
                correctLevel: window.QRCode.CorrectLevel.H
              });
            } catch (e) {
              console.error('[ChessKidoo] Student QR generation failed:', e);
              qrEl.innerHTML = '<div style="color:#94a3b8;font-size:0.75rem;padding:12px;text-align:center;">QR unavailable<br>Use app buttons below</div>';
            }
          }
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

  // ── UPI PAYMENT FLOW ──────────────────────────────────────────────

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
      CK.showToast('Please enter a valid UTR / Transaction ID (8–30 alphanumeric characters).', 'warning');
      return;
    }

    const confirmBtn = document.getElementById('studentUpiConfirmBtn');
    let textSpan = null;
    if (confirmBtn) {
      confirmBtn.disabled = true;
      textSpan = confirmBtn.querySelector('.pay-btn-text');
      if (textSpan) textSpan.textContent = 'Verifying…';
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
      } catch (emailErr) {
        console.warn('[ChessKidoo] Email send failed:', emailErr);
      }

      CK.showToast('Payment confirmed! Receipt sent to your email.', 'success');
      this.renderFeesGateway();
      if (window.CK && CK.admin && typeof CK.admin.loadStudents === 'function') {
        CK.admin.loadStudents();
      }
    } catch (e) {
      console.error('[ChessKidoo] UTR submission error:', e);
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

    if (!window.emailjs) { console.warn('[ChessKidoo] EmailJS not loaded'); return; }
    window.emailjs.init({ publicKey: publicKey });

    const fmt    = n => '₹' + n.toLocaleString('en-IN');
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
        subject:  'ChessKidoo Payment Receipt — ' + utr
      });
    }

    // Notification to academy
    await window.emailjs.send(serviceId, templateId, {
      ...base,
      to_email: cfg.ACADEMY_EMAIL || 'Chesskidoo37@gmail.com',
      to_name:  'ChessKidoo Admin',
      subject:  'New Payment — ' + (p ? (p.full_name || 'Student') : 'Student') + ' — ' + utr
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
              <div class="r-contact"><span>📞 +91 88257 31470</span><span>✉️ Chesskidoo37@gmail.com</span></div>
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
                <tr><td class="lbl">Tuition Fee</td><td class="val">₹ ${feeAmount.toLocaleString()}</td></tr>
                <tr><td class="lbl">Payment Mode</td><td class="val">Online</td></tr>
                <tr><td class="lbl">Status</td><td class="val" style="color:#16a34a;">✓ SUCCESS</td></tr>
              </table>

              <div class="total-box">
                <div class="total-lbl">Total Amount Paid</div>
                <div class="total-val">₹ ${feeAmount.toLocaleString()}</div>
              </div>
              <div class="words">${words}</div>
            </div>
            <div class="r-footer">
              <p style="margin:0 0 5px 0;">This is a computer-generated receipt. No signature required.</p>
              <p style="margin:0 0 15px 0;">For queries, contact Chesskidoo37@gmail.com</p>
              <div style="font-family:'Cinzel',serif; font-weight:700; color:#b4831f; font-size:1.1rem; font-style:italic;">♟ Thank you for your patronage! ♟</div>
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
            <h1>♛ ChessKidoo Academy ♛</h1>
            <h2>Certificate of Excellence</h2>
            <p>This is proudly presented to</p>
            <div class="name">${_eCert(this.userProfile.full_name)}</div>
            <p class="desc">for successfully completing the rigorous <strong>${_eCert(this.userProfile.level || 'Chess')} Curriculum</strong>, demonstrating mastery of strategic thinking, endgame principles, and core tournament tactics. ELO Rating: <strong>${this.userProfile.rating || 800}</strong></p>
            <p style="color:#94a3b8; font-size:0.9rem;">Issued on ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
            <div class="signatures">
              <div>
                <div class="sig">${_eCert(this.userProfile.coach || '—')}</div>
                <div style="font-size:0.8rem; margin-top:5px; opacity:0.6;">Assigned Coach</div>
              </div>
              <div>
                <div class="sig">ChessKidoo Academy</div>
                <div style="font-size:0.8rem; margin-top:5px; opacity:0.6;">Academy Director</div>
              </div>
            </div>
          </div>
          <button onclick="window.print()" style="margin-top: 30px; background: #e8b84b; color: #000; border: none; padding: 12px 24px; font-weight: bold; border-radius: 8px; cursor: pointer;">🖨️ Print Certificate</button>
        </body>
      </html>
    `);
  },

  async renderTournamentsTab() {
    if (!CK.tournament) return;
    const container = document.getElementById('student-panel-tournaments');
    if (!container) return;

    // We can inject a basic container and then call T.renderTournamentList
    container.innerHTML = `
      <div class="p-card" style="margin-bottom:20px;">
        <h2>🏆 Academy Tournaments</h2>
        <p style="opacity:0.7;">Join active tournaments, compete with peers, and climb the leaderboard!</p>
      </div>
      <div id="studentTournamentContainer"></div>
    `;
    await CK.tournament.renderTournamentList('studentTournamentContainer');
  },

  async renderLinkedAccounts() {
    const el = document.getElementById('linkedAccountsContent');
    if (!el) return;
    const p = this.userProfile || {};
    const _e = CK.esc || (s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));

    el.innerHTML = `
      <div class="p-card" style="border-color:rgba(91,156,246,0.3);margin-bottom:20px;">
        <div class="p-card-header">
          <div>
            <div class="p-card-title">🔗 Lichess Account</div>
            <div style="font-size:0.83rem;color:var(--p-text-muted);">Import your ratings and recent games from Lichess.org</div>
          </div>
          ${p.lichess_username ? `<span style="background:rgba(91,156,246,0.15);color:var(--p-blue);padding:4px 12px;border-radius:20px;font-size:0.82rem;font-weight:600;">✓ Linked</span>` : ''}
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
              <button class="btn-primary" data-uname="${_e(p.lichess_username)}" onclick="CK.student.linkLichess(this.dataset.uname)">↻ Refresh</button>
              <button class="btn-secondary" data-uname="${_e(p.lichess_username)}" onclick="CK.gameTracker&&CK.gameTracker.importFromLichess(CK.currentUser?.id,this.dataset.uname)">📥 Import Recent Games</button>
            </div>
          ` : `
            <p style="color:var(--p-text-muted);margin-bottom:16px;">Link your Lichess account to automatically sync your rating and import games.</p>
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
              <div style="flex:1;min-width:200px;">
                <label style="font-size:0.82rem;color:var(--p-text-muted);display:block;margin-bottom:6px;">Lichess Username</label>
                <input id="lichessUsernameInput" type="text" placeholder="e.g. Magnus2024" style="width:100%;background:var(--p-bg-card);border:1px solid var(--p-border);color:var(--p-text);border-radius:8px;padding:9px 12px;font-size:0.92rem;box-sizing:border-box;" />
              </div>
              <button class="btn-primary" onclick="CK.student.linkLichess(document.getElementById('lichessUsernameInput').value.trim())">🔗 Link Account</button>
            </div>
          `}
        </div>
      </div>

      <div class="p-card" style="border-color:rgba(232,184,75,0.3);">
        <div class="p-card-header">
          <div>
            <div class="p-card-title">🏅 FIDE Profile</div>
            <div style="font-size:0.83rem;color:var(--p-text-muted);">Link your official FIDE ID to display your international rating</div>
          </div>
          ${p.fide_id ? `<span style="background:rgba(232,184,75,0.15);color:var(--p-gold);padding:4px 12px;border-radius:20px;font-size:0.82rem;font-weight:600;">✓ Linked</span>` : ''}
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
              <button class="btn-secondary" data-fide="${_e(String(p.fide_id))}" onclick="CK.student.linkFide(this.dataset.fide)">↻ Refresh</button>
              <a href="https://ratings.fide.com/profile/${_e(String(p.fide_id))}" target="_blank" rel="noopener" class="btn-secondary" style="text-decoration:none;display:inline-flex;align-items:center;gap:5px;">🏅 View on FIDE ↗</a>
            </div>
          ` : `
            <p style="color:var(--p-text-muted);margin-bottom:16px;">Enter your FIDE ID to display your official international rating. Find it at <strong style="color:var(--p-gold);">ratings.fide.com</strong>.</p>
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
              <div style="flex:1;min-width:200px;">
                <label style="font-size:0.82rem;color:var(--p-text-muted);display:block;margin-bottom:6px;">FIDE ID</label>
                <input id="fideIdInput" type="text" placeholder="e.g. 35027789" style="width:100%;background:var(--p-bg-card);border:1px solid var(--p-border);color:var(--p-text);border-radius:8px;padding:9px 12px;font-size:0.92rem;box-sizing:border-box;" />
              </div>
              <button class="btn-primary" onclick="CK.student.linkFide(document.getElementById('fideIdInput').value.trim())" style="background:var(--p-gold);color:#000;">🏅 Link FIDE</button>
            </div>
          `}
        </div>
      </div>
    `;
  },

  /* ── Auto-sync Lichess data on login (background, no toast spam) ── */
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
      // Silent fail — this is a background sync
    }
  },

  async linkLichess(username) {
    if (!username) { CK.showToast('Please enter your Lichess username.', 'warning'); return; }
    if (!/^[a-zA-Z0-9_-]{1,20}$/.test(username)) {
      CK.showToast('Invalid Lichess username format.', 'error');
      return;
    }
    CK.showToast('Fetching Lichess profile…', 'info');
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
      CK.showToast(`Lichess linked: ${data.username}${rapidRating ? ' · Rapid ' + rapidRating : ''}`, 'success');
      this.renderLinkedAccounts();
      this.updateProfile();
    } catch (err) {
      console.error('[ChessKidoo] Lichess link failed:', err);
      CK.showToast('Could not reach Lichess. Check username or try again.', 'error');
    }
  },

  async linkFide(fideId) {
    if (!fideId) { CK.showToast('Please enter your FIDE ID.', 'warning'); return; }
    const idStr = String(fideId).trim();
    if (!/^\d{1,10}$/.test(idStr)) {
      CK.showToast('FIDE ID must be a number (e.g. 35027789).', 'error');
      return;
    }
    CK.showToast('Fetching FIDE profile…', 'info');
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
        if (!updates.fide_title) CK.showToast('FIDE API unreachable — ID saved. Deploy fide-profile edge function for live data.', 'info');
      }
    }

    const merged = { ...this.userProfile, ...updates };
    await CK.db.saveProfile(merged);
    this.userProfile = merged;
    CK.showToast(`FIDE ${idStr} saved!${updates.fide_rating ? ' Rating: ' + updates.fide_rating : ''}`, 'success');
    this.renderLinkedAccounts();
  }
};
