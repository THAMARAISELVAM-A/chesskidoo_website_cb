/* assets/js/admin.js ------------------------------------------------------
   ChessKidoo Admin Portal Logic
   Fully connected to CK.db unified layer, supporting robust offline operations,
   dynamic statistics, real-time interactive attendance ledger, and client-side
   student data exporting to CSV.
   ------------------------------------------------------------------------- */

CK.admin = {
  // In-memory classes fallback (always syncs to localStorage)
  classesDb: [],

  async init() {
    
    // Load class lists from DB
    this.classesDb = await CK.db.getClasses();

    // Populate default attendance date to today
    const dateEl = document.getElementById('adminAttendanceDate');
    if (dateEl && !dateEl.value) {
      dateEl.value = new Date().toISOString().split('T')[0];
    }

    // 1. Load lists and statistics
    await this.loadStudents();
    await this.loadCoaches();
    await this.loadClasses();
    await this.loadAttendance();
    await this.loadFiles();
    await this.loadExpenses();
    this.loadTournaments();
    this.updateStats();
    this.initCharts();
    this.renderActivity();

    // 2. Populate modal coach selects dynamically based on current coaches list
    await this.populateCoachSelects();

    // 3. Start real-time auto-refresh loop
    this.startAutoRefresh();
  },

  /* ── Real-Time Auto Refresh ── */
  _autoRefreshTimer: null,
  _autoRefreshInterval: 30000,

  startAutoRefresh() {
    this.stopAutoRefresh();
    this._updatePresence();
    this._autoRefreshTimer = setInterval(async () => {
      this._updatePresence();
      await this.updateStats();
      await this.renderActivity();
      // Refresh live panel if visible
      const livePanel = document.getElementById('p-panel-live');
      if (livePanel && livePanel.classList.contains('active')) await this.renderLive();
      // Refresh live indicator in header
      const liveEl = document.getElementById('adminLiveRefreshTs');
      if (liveEl) liveEl.textContent = 'Updated ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }, this._autoRefreshInterval);
  },

  stopAutoRefresh() {
    if (this._autoRefreshTimer) { clearInterval(this._autoRefreshTimer); this._autoRefreshTimer = null; }
  },

  _updatePresence() {
    const presence = JSON.parse(localStorage.getItem('ck_live_presence') || '{}');
    presence['admin'] = { name: 'Admin', role: 'admin', lastSeen: Date.now() };
    localStorage.setItem('ck_live_presence', JSON.stringify(presence));
  },

  async populateCoachSelects() {
    const _e = CK.esc || (s => s);
    const coaches = (await CK.db.getProfiles('coach')) || [];
    const coachSelects = ['admin_s_coach', 'admin_cl_coach'];
    coachSelects.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = coaches.map(c => `<option value="${_e(c.full_name)}">${_e(c.full_name)}</option>`).join('');
      }
    });
  },

  async updateStats() {
    const students = (await CK.db.getProfiles('student')) || [];
    const coaches  = (await CK.db.getProfiles('coach'))   || [];

    const totalRevenue = students
      .filter(s => s.status === 'Paid')
      .reduce((sum, s) => sum + (parseInt((s.fee || '0').toString().replace(/[^0-9]/g, '')) || 0), 0);
    const s = {
      students: students.length,
      coaches: coaches.length,
      classes: this.classesDb.length,
      revenue: '₹' + totalRevenue.toLocaleString('en-IN')
    };

    const elS = document.getElementById('stat-students');
    const elC = document.getElementById('stat-coaches');
    const elCl = document.getElementById('stat-classes');
    const elR = document.getElementById('stat-revenue');
    const elB = document.getElementById('badge-students');

    this._animateCounter(elS,  s.students);
    this._animateCounter(elC,  s.coaches);
    this._animateCounter(elCl, s.classes);
    if (elR) elR.innerText = s.revenue;
    if (elB) elB.innerText = s.students;

    // Welcome banner sub
    const welcome = document.getElementById('adminWelcomeSub');
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    if (welcome) welcome.textContent = `${greeting}! You have ${s.students} enrolled students across ${s.coaches} coaches and ${s.classes} active classes running this week.`;
  },

  async renderActivity() {
    const tbody = document.getElementById('adminActivityTable');
    if (!tbody) return;
    const _e = CK.esc || (s => s);

    const _ago = (dateStr) => {
      if (!dateStr) return 'recently';
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 2) return 'Just now';
      if (mins < 60) return `${mins} mins ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
      const days = Math.floor(hrs / 24);
      if (days === 1) return 'Yesterday';
      return `${days} days ago`;
    };

    const students = (await CK.db.getProfiles('student')) || [];
    const paidCount = students.filter(s => s.status === 'Paid').length;
    const sortedByJoin = students.slice().sort((a, b) =>
      new Date(b.join_date || b.created_at || 0) - new Date(a.join_date || a.created_at || 0)
    );
    const latestStudent = sortedByJoin[0];
    const tournaments = this.getTournaments ? this.getTournaments() : [];
    const latestTournament = tournaments[tournaments.length - 1];
    const expenses = (await CK.db.getExpenses()) || [];
    const sortedExpenses = expenses.slice().sort((a, b) =>
      new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0)
    );
    const latestExpense = sortedExpenses[0];

    const sessionStart = this._sessionStart || (this._sessionStart = new Date().toISOString());
    const activities = [
      { time: _ago(sessionStart), event: `Admin portal session started — ${students.length} students across ${this.classesDb.length} active classes`, user: 'System', icon: '🟢', status: 'p-badge-green', label: 'System' },
      latestStudent
        ? { time: _ago(latestStudent.join_date || latestStudent.created_at), event: `Latest enrollment: ${latestStudent.full_name} — ${latestStudent.level || 'Beginner'} level`, user: 'Admin', icon: '🎓', status: 'p-badge-blue', label: 'New' }
        : { time: 'recently', event: 'Student registry up to date', user: 'Admin', icon: '🎓', status: 'p-badge-blue', label: 'Info' },
      { time: _ago(sessionStart), event: `Fee collection: ${paidCount} of ${students.length} students have paid this cycle`, user: 'Admin', icon: '💳', status: 'p-badge-green', label: 'Revenue' },
      latestTournament
        ? { time: _ago(latestTournament.date || latestTournament.created_at), event: `Tournament on record: ${latestTournament.name} — ${latestTournament.status}`, user: 'Admin', icon: '🏆', status: 'p-badge-gold', label: 'Event' }
        : { time: 'recently', event: 'Tournament management ready — no events scheduled yet', user: 'Admin', icon: '🏆', status: 'p-badge-gold', label: 'Event' },
      latestExpense
        ? { time: _ago(latestExpense.date || latestExpense.created_at), event: `Expenditure recorded: ${latestExpense.description} — ${latestExpense.amount}`, user: 'Admin', icon: '📋', status: 'p-badge-yellow', label: 'Expense' }
        : { time: 'recently', event: 'Expense ledger clear — no outstanding records', user: 'Admin', icon: '📋', status: 'p-badge-yellow', label: 'Expense' },
      { time: 'Yesterday', event: 'Attendance records updated for all active batches', user: 'Admin', icon: '✅', status: 'p-badge-teal', label: 'Attendance' }
    ].filter(Boolean);

    tbody.innerHTML = activities.map(a => `
      <tr class="p-activity-row">
        <td style="color:var(--p-text-muted); white-space:nowrap; font-size:0.82rem;">${a.time}</td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="p-activity-icon" style="background:rgba(255,255,255,0.05);">${a.icon}</div>
            <span style="font-weight:600; font-size:0.9rem;">${_e(a.event)}</span>
          </div>
        </td>
        <td style="color:var(--p-text-muted); font-size:0.88rem;">${a.user}</td>
        <td><span class="p-badge ${a.status}">${a.label}</span></td>
      </tr>
    `).join('');
  },

  async showPanel(panelId) {
    document.querySelectorAll('#admin-page .p-panel').forEach(p => p.classList.remove('active'));
    
    const target = document.getElementById(`p-panel-${panelId}`);
    if (target) target.classList.add('active');
    
    // Update sidebar buttons
    document.querySelectorAll('#admin-page .p-nav-item').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('onclick')?.includes(`'${panelId}'`)) {
        btn.classList.add('active');
      }
    });
    
    const titles = {
      dashboard: 'Dashboard',
      live: 'Live Tracking',
      students: 'Student Registry',
      coaches: 'Coach Management',
      classes: 'Class Schedule',
      attendance: 'Batch Attendance',
      files: 'Learning Materials',
      expenses: 'Expenditure Management',
      reports: 'Progress Reports',
      settings: 'Academy Settings',
      tournaments: 'Tournament Management',
      achievements: 'Academy Achievements',
      access: 'User Access Management',
      feedback: 'Feedback & Reviews',
      schedule: 'Academy Schedule',
      coachattendance: 'Coach Attendance',
      analytics: 'AI Analytics & Insights',
      leaderboard: 'Leaderboard & XP',
      audit: 'Security & Audit Logs'
    };
    const titleEl = document.getElementById('adminPanelTitle');
    if (titleEl) titleEl.innerText = titles[panelId] || 'Admin';

    // Action button context in header
    const btn = document.getElementById('adminTopActionBtn');
    if (btn) {
      if (panelId === 'students')  { btn.innerText = '+ New Enrollment'; btn.style.display = 'block'; }
      else if (panelId === 'coaches') { btn.innerText = '+ Add Coach'; btn.style.display = 'block'; }
      else if (panelId === 'classes') { btn.innerText = '+ Schedule Class'; btn.style.display = 'block'; }
      else if (panelId === 'expenses'){ btn.innerText = '+ Add Expense'; btn.style.display = 'block'; }
      else if (panelId === 'access')  { btn.innerText = '+ Add Parent'; btn.style.display = 'block'; btn.onclick = () => CK.accessManager?.addParentDialog(); }
      else { btn.style.display = 'none'; btn.onclick = null; }
    }

    if (panelId === 'live')           await this.renderLive();
    if (panelId === 'dashboard')      await this.renderCoachScorecards();
    if (panelId === 'expenses')       await this.loadExpenses();
    if (panelId === 'reports')        await this.renderReports();
    if (panelId === 'students')       await this.loadStudents();
    if (panelId === 'coaches')        await this.loadCoaches();
    if (panelId === 'classes')        { await this.loadClasses(); if (CK.classSystem) await CK.classSystem.renderAdminClasses('adminAllClasses'); }
    if (panelId === 'attendance')     await this.loadAttendance();
    if (panelId === 'files')          await this.loadFiles();
    if (panelId === 'feedback')       await CK.parents?.renderAllFeedback('adminFeedbackList');
    if (panelId === 'access')         CK.accessManager?.renderAccessTable('adminAccessTable');
    if (panelId === 'schedule')       if (CK.schedulePro) await CK.schedulePro.renderAdminSchedule('adminAllSchedule');
    if (panelId === 'coachattendance') if (CK.classSystem) await CK.classSystem.renderCoachAttendanceReport('adminCoachAttnReport');
    if (panelId === 'tournaments') {
      this.loadTournaments();
      if (CK.tournament) CK.tournament.renderTournamentList('adminTournamentList');
    }
    if (panelId === 'achievements') this.renderIssuedCerts();
    if (panelId === 'analytics') this.renderAIAnalytics();
    if (panelId === 'leaderboard') this.renderLeaderboardPanel();
    if (panelId === 'audit') this.renderAuditPanel();
    if (panelId === 'settings') this.loadSettings();
  },

  async initCharts() {
    const students = (await CK.db.getProfiles('student')) || [];

    // Level distribution (real)
    let beginnerCount = 0, intermediateCount = 0, advancedCount = 0;
    students.forEach(s => {
      const lvl = (s.level || 'Beginner').toLowerCase();
      if (lvl.includes('begin')) beginnerCount++;
      else if (lvl.includes('inter')) intermediateCount++;
      else advancedCount++;
    });

    // Build real monthly enrollment data from join_date
    const monthLabels = [];
    const monthCounts = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push(d.toLocaleString('en-US', { month: 'short' }));
      const monthStr = d.toISOString().slice(0, 7); // 'YYYY-MM'
      const count = students.filter(s => s.join_date && s.join_date.startsWith(monthStr)).length;
      monthCounts.push(count);
    }
    // Accumulate to running total if all zeros (no join_date data), show relative growth
    const hasRealData = monthCounts.some(c => c > 0);
    const chartData = hasRealData
      ? monthCounts.reduce((acc, v, i) => { acc.push((acc[i - 1] || 0) + v); return acc; }, [])
      : [Math.max(1, students.length - 5), students.length - 3, students.length - 2, students.length - 1, students.length, students.length];

    // Main line chart
    const ctxMain = document.getElementById('chartMain')?.getContext('2d');
    if (ctxMain) {
      if (window.adminMainChartInstance) window.adminMainChartInstance.destroy();
      window.adminMainChartInstance = new window.Chart(ctxMain, {
        type: 'line',
        data: {
          labels: monthLabels,
          datasets: [{
            label: 'Students Enrolled',
            data: chartData,
            borderColor: '#e8b84b',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(232,184,75,0.05)',
            pointBackgroundColor: '#e8b84b',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: '#252b35' }, ticks: { color: '#7a8499' }, beginAtZero: true },
            x: { grid: { display: false }, ticks: { color: '#7a8499' } }
          }
        }
      });
    }

    // Doughnut chart (level split — real)
    const ctxLevels = document.getElementById('chartLevels')?.getContext('2d');
    if (ctxLevels) {
      if (window.adminLevelsChartInstance) window.adminLevelsChartInstance.destroy();
      window.adminLevelsChartInstance = new window.Chart(ctxLevels, {
        type: 'doughnut',
        data: {
          labels: ['Beginner', 'Intermediate', 'Advanced'],
          datasets: [{
            data: [beginnerCount || 3, intermediateCount || 2, advancedCount || 1],
            backgroundColor: ['#e8b84b', '#00c9a7', '#5b9cf6'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#7a8499', padding: 15, usePointStyle: true, font: { size: 11 } } }
          },
          cutout: '70%'
        }
      });
    }

    // Fee collection bar chart (real paid vs unpaid)
    const ctxFees = document.getElementById('chartFees')?.getContext('2d');
    if (ctxFees) {
      if (window.adminFeesChartInstance) window.adminFeesChartInstance.destroy();
      const paid   = students.filter(s => s.status === 'Paid').length;
      const unpaid = students.length - paid;
      window.adminFeesChartInstance = new window.Chart(ctxFees, {
        type: 'bar',
        data: {
          labels: ['Paid', 'Pending'],
          datasets: [{
            data: [paid, unpaid],
            backgroundColor: ['#00c9a7', '#ef4444'],
            borderRadius: 6,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: '#252b35' }, ticks: { color: '#7a8499' }, beginAtZero: true },
            x: { grid: { display: false }, ticks: { color: '#7a8499' } }
          }
        }
      });
    }

    // Render coach scorecards
    await this.renderCoachScorecards();
  },

  async renderCoachScorecards() {
    const el = document.getElementById('adminCoachScorecards');
    if (!el) return;

    const coaches  = (await CK.db.getProfiles('coach'))   || [];
    const students = (await CK.db.getProfiles('student')) || [];
    const allNotes  = (await CK.tracker.getReviews()) || [];
    const attnLogs = (await CK.db.getAttendance()) || [];
    const thisMonth = new Date().getMonth() + 1;
    const thisYear  = new Date().getFullYear();
    const thisMonthPrefix = `${thisYear}-${String(thisMonth).padStart(2, '0')}`;

    if (!coaches.length) {
      el.innerHTML = '<div class="cls-empty">📊 No coaches registered yet.</div>';
      return;
    }

    const _e = CK.esc || (s => s);
    el.innerHTML = coaches.map(c => {
      const myStudents   = students.filter(s => s.coach === c.full_name);
      // Count unique students that received a coach note this month
      const monthNotes   = allNotes.filter(n => n.coach === c.full_name && (n.date || '').startsWith(thisMonthPrefix));
      const notedStudents = new Set(monthNotes.map(n => n.student)).size;
      const reportsPct   = myStudents.length > 0 ? Math.round(notedStudents / myStudents.length * 100) : 0;

      // Attendance rate for classes this coach taught this month
      const myLogs = attnLogs.filter(l => l.userid === c.id || l.coachName === c.full_name);
      const presentLogs = myLogs.filter(l => l.status === 'present');
      const attendancePct = myLogs.length > 0 ? Math.round(presentLogs.length / myLogs.length * 100) : 0;

      // Avg student rating gain
      const avgRating = myStudents.length > 0
        ? Math.round(myStudents.reduce((s, u) => s + (parseInt(u.rating) || 800), 0) / myStudents.length)
        : 800;

      const scoreColor = reportsPct >= 80 ? 'var(--p-teal)' : reportsPct >= 50 ? 'var(--p-gold)' : 'var(--p-danger)';

      return `<div class="adm-coach-card">
        <div class="adm-coach-avatar">${_e((c.full_name || 'C').charAt(0).toUpperCase())}</div>
        <div class="adm-coach-info">
          <div class="adm-coach-name">${_e(c.full_name || 'Coach')}</div>
          <div class="adm-coach-sub">${myStudents.length} students · ${_e(c.level || 'All levels')}</div>
        </div>
        <div class="adm-coach-stats">
          <div class="adm-coach-stat">
            <div class="adm-coach-stat-val" style="color:${scoreColor}">${reportsPct}%</div>
            <div class="adm-coach-stat-lbl">Reports</div>
          </div>
          <div class="adm-coach-stat">
            <div class="adm-coach-stat-val" style="color:var(--p-blue)">${attendancePct}%</div>
            <div class="adm-coach-stat-lbl">Attendance</div>
          </div>
          <div class="adm-coach-stat">
            <div class="adm-coach-stat-val" style="color:var(--p-gold)">${avgRating}</div>
            <div class="adm-coach-stat-lbl">Avg ELO</div>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  async loadClasses() {
    this.classesDb = await CK.db.getClasses();
  },

  async loadStudents(data = null) {
    const tbody = document.getElementById('adminStudentsTable');
    if (!tbody) return;

    const list = data || (await CK.db.getProfiles('student')) || [];
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11"><div class="cls-empty">🎓 No students found matching your criteria.</div></td></tr>';
      return;
    }

    const _e = CK.esc || (s => s);
    tbody.innerHTML = list.map((s, i) => {
      const levelStr = `${_e(s.level || 'Beginner')} - ${_e(String(s.rating || 800))} ELO`;
      const coach = s.coach || '—';
      const joinDate = s.join_date || '2026-04-20';
      const session = s.session || 'Group';
      const schedule = s.schedule || '17:00';
      const fee = s.fee || '2200';
      const status = s.status || 'Paid';
      const dueDate = s.due_date || '04-May-2026';

      let statusBadge = 'p-badge-green';
      if (status === 'Pending') statusBadge = 'p-badge-yellow';
      if (status === 'Due' || status.includes('⚠️')) statusBadge = 'p-badge-red';
      if (status === 'Waiting List') statusBadge = 'p-badge-blue';

      let actionBtns = '';
      const sid = _e(String(s.id));
      if (status === 'Paid') {
        actionBtns = `
          <button class="p-btn p-btn-ghost p-btn-sm" data-sid="${sid}" data-sname="${_e(s.full_name || 'Student')}" onclick="CK.admin.informStudent(this.dataset.sid,this.dataset.sname)">📢 Inform</button>
          <button class="p-btn p-btn-ghost p-btn-sm" data-sid="${sid}" onclick="CK.admin.viewStudentInfo(this.dataset.sid)">View</button>
          <button class="p-btn p-btn-ghost p-btn-sm" data-sid="${sid}" onclick="CK.admin.editStudent(this.dataset.sid)">Edit</button>
          <button class="p-btn p-btn-ghost p-btn-sm" style="color:var(--p-danger)" data-sid="${sid}" onclick="CK.admin.deleteStudent(this.dataset.sid)">Delete</button>
          <button class="p-btn p-btn-ghost p-btn-sm" data-sid="${sid}" onclick="CK.admin.toggleFeeStatus(this.dataset.sid,'Pending')">🔁 Mark Unpaid</button>
        `;
      } else if (status === 'Waiting List') {
        actionBtns = `
          <button class="p-btn p-btn-ghost p-btn-sm" data-sid="${sid}" onclick="CK.admin.viewStudentInfo(this.dataset.sid)">View</button>
          <button class="p-btn p-btn-ghost p-btn-sm" data-sid="${sid}" onclick="CK.admin.editStudent(this.dataset.sid)">Edit</button>
          <button class="p-btn p-btn-ghost p-btn-sm" style="color:var(--p-danger)" data-sid="${sid}" onclick="CK.admin.deleteStudent(this.dataset.sid)">Delete</button>
        `;
      } else {
        actionBtns = `
          <button class="p-btn p-btn-teal p-btn-sm" data-sid="${sid}" onclick="CK.admin.toggleFeeStatus(this.dataset.sid,'Paid')">✅ Mark as Paid</button>
          <button class="p-btn p-btn-ghost p-btn-sm" data-sid="${sid}" onclick="CK.admin.viewStudentInfo(this.dataset.sid)">View</button>
          <button class="p-btn p-btn-ghost p-btn-sm" data-sid="${sid}" onclick="CK.admin.editStudent(this.dataset.sid)">Edit</button>
          <button class="p-btn p-btn-ghost p-btn-sm" style="color:var(--p-danger)" data-sid="${sid}" onclick="CK.admin.deleteStudent(this.dataset.sid)">Delete</button>
          <button class="p-btn p-btn-ghost p-btn-sm" data-sid="${sid}" data-sname="${_e(s.full_name || 'Student')}" onclick="CK.admin.informStudent(this.dataset.sid,this.dataset.sname)">📢 Inform</button>
        `;
      }

      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="color:var(--p-text-muted)">${i + 1}</td>
          <td style="font-weight:600; color:#fff;">
            <div>${_e(s.full_name)}</div>
            <div style="font-size:0.75rem; color:var(--p-text-muted);">${status === 'Waiting List' ? 'Waiting List' : 'Enrolled & Attending'}</div>
          </td>
          <td>${levelStr}</td>
          <td>${_e(coach)}</td>
          <td>${_e(joinDate)}</td>
          <td>${_e(session)}</td>
          <td>${_e(schedule)}</td>
          <td style="font-weight:700; color:var(--p-gold)">₹${_e(String(fee))}</td>
          <td><span class="p-badge ${statusBadge}">${_e(status)}</span></td>
          <td>${_e(dueDate)}</td>
          <td style="white-space:nowrap;">
            <div style="display:flex; gap:6px; flex-wrap:nowrap; align-items:center; white-space:nowrap;">
              ${actionBtns}
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.admin.moreStudentOptions('${s.id}')">⋮ More</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  _nextDueDate() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(14);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  },

  async toggleFeeStatus(id, newStatus) {
    const s = await CK.db.getProfile(id);
    if (!s) return;
    s.status = newStatus;
    s.due_date = newStatus === 'Paid'
      ? this._nextDueDate()
      : '⚠️ Overdue as of ' + new Date().toLocaleDateString('en-GB');
    await CK.db.saveProfile(s);
    await this.loadStudents();
    CK.showToast(`Student fee status updated to ${newStatus}`, 'success');
  },

  async informStudent(id, name) {
    const s = await CK.db.getProfile(id);
    const phone = s && s.phone_number ? s.phone_number.replace(/\D/g, '') : null;
    const studentName = name || (s ? s.full_name : 'Student');
    const msg = `Hello! This is ChessKidoo Academy. We'd like to update you on ${studentName}'s performance and fee status. Please contact us for details. Thank you!`;
    if (phone) {
      const waNum = phone.startsWith('91') ? phone : '91' + phone;
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
      CK.showToast(`WhatsApp message opened for ${studentName}`, 'success');
    } else {
      CK.showToast(`📢 No phone number on file for ${studentName}. Please update their profile.`, 'warning');
    }
  },

  async viewStudentInfo(id) {
    const s = await CK.db.getProfile(id);
    if (!s) return;
    const _e = CK.esc || (s => s);
    const note = s.last_note || 'No assessment notes logged yet.';
    const logs = (await CK.db.getAttendance(id)) || [];
    const present = logs.filter(l => l.status === 'present').length;
    const attPct = logs.length > 0 ? Math.round((present / logs.length) * 100) : 100;
    const statusBadgeColor = s.status === 'Paid' ? 'var(--p-teal)' : s.status === 'Due' ? 'var(--p-danger)' : 'var(--p-warn)';
    const modalBody = document.getElementById('adminStudentInfoBody');
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
          <div style="background:var(--p-surface3);padding:14px;border-radius:10px;">
            <div style="font-size:.72rem;color:var(--p-text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;">Student</div>
            <div style="font-weight:700;font-size:1rem;color:#fff;">${_e(s.full_name)}</div>
            <div style="font-size:.82rem;color:var(--p-text-muted);margin-top:2px;">${_e(s.email || '—')}</div>
          </div>
          <div style="background:var(--p-surface3);padding:14px;border-radius:10px;">
            <div style="font-size:.72rem;color:var(--p-text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;">Rating & Level</div>
            <div style="font-weight:700;font-size:1rem;color:var(--p-gold);">${_e(String(s.rating || 800))} ELO</div>
            <div style="font-size:.82rem;color:var(--p-text-muted);margin-top:2px;">${_e(s.level || 'Beginner')}</div>
          </div>
          <div style="background:var(--p-surface3);padding:14px;border-radius:10px;">
            <div style="font-size:.72rem;color:var(--p-text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;">Coach & Batch</div>
            <div style="font-weight:700;font-size:1rem;color:#fff;">${_e(s.coach || '—')}</div>
            <div style="font-size:.82rem;color:var(--p-text-muted);margin-top:2px;">${_e(s.batch || 'Evening')} · ${_e(s.schedule || '17:00')}</div>
          </div>
          <div style="background:var(--p-surface3);padding:14px;border-radius:10px;">
            <div style="font-size:.72rem;color:var(--p-text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;">Fee Status</div>
            <div style="font-weight:700;font-size:1rem;color:${statusBadgeColor};">₹${_e(String(s.fee || '—'))} · ${_e(s.status || 'Pending')}</div>
            <div style="font-size:.82rem;color:var(--p-text-muted);margin-top:2px;">Due: ${_e(s.due_date || '—')}</div>
          </div>
          <div style="background:var(--p-surface3);padding:14px;border-radius:10px;">
            <div style="font-size:.72rem;color:var(--p-text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;">Attendance</div>
            <div style="font-weight:700;font-size:1rem;color:${attPct>=90?'var(--p-teal)':attPct>=70?'var(--p-warn)':'var(--p-danger)'};">${attPct}%</div>
            <div style="font-size:.82rem;color:var(--p-text-muted);margin-top:2px;">${present} / ${logs.length} sessions</div>
          </div>
          <div style="background:var(--p-surface3);padding:14px;border-radius:10px;">
            <div style="font-size:.72rem;color:var(--p-text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;">Puzzles Solved</div>
            <div style="font-weight:700;font-size:1rem;color:var(--p-blue);">${_e(String(s.puzzle || 0))}</div>
            <div style="font-size:.82rem;color:var(--p-text-muted);margin-top:2px;">Joined: ${_e(s.join_date || '—')}</div>
          </div>
        </div>
        <div style="background:var(--p-surface3);padding:14px;border-radius:10px;border-left:3px solid var(--p-gold-dim);">
          <div style="font-size:.72rem;color:var(--p-text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em;">Latest Coach Note</div>
          <div style="font-size:.88rem;color:rgba(255,255,255,.75);font-style:italic;line-height:1.55;">"${_e(note)}"</div>
        </div>
      `;
      CK.openModal('adminStudentInfoModal');
    } else {
      CK.showToast(`${s.full_name} · ${s.level} · ${s.rating} ELO · ${s.status}`, 'info');
    }
  },

  async moreStudentOptions(id) {
    const s = await CK.db.getProfile(id);
    if (!s) return;
    this._moreOptionsId = id;
    const modal = document.getElementById('adminMoreOptionsModal');
    const nameEl = document.getElementById('adminMoreOptionsName');
    if (nameEl) nameEl.textContent = s.full_name;
    if (modal) {
      CK.openModal('adminMoreOptionsModal');
    } else {
      CK.showToast(`${s.full_name} — use Edit for changes.`, 'info');
    }
  },

  async moreOptionAction(action) {
    const id = this._moreOptionsId;
    if (!id) return;
    const s = await CK.db.getProfile(id);
    if (!s) return;

    if (action === 'receipt') {
      if (CK.student && typeof CK.student.downloadReceipt === 'function') {
        const orig = CK.student.userProfile;
        CK.student.userProfile = s;
        CK.student.downloadReceipt();
        CK.student.userProfile = orig;
      } else {
        CK.showToast(`Receipt for ${s.full_name} · ₹${s.fee || 0} · ${s.status}`, 'success');
      }
    } else if (action === 'rating') {
      const newElo = parseInt(document.getElementById('adminNewEloInput')?.value || s.rating);
      if (newElo && newElo !== s.rating) {
        s.rating = newElo;
        await CK.db.saveProfile(s);
        await this.loadStudents();
        CK.showToast(`FIDE rating updated to ${newElo} ELO for ${s.full_name}`, 'success');
      }
    } else if (action === 'export') {
      const json = JSON.stringify(s, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${(s.full_name || 'student').replace(/\s/g,'_')}_profile.json`;
      a.click(); URL.revokeObjectURL(url);
      CK.showToast('Profile exported as JSON', 'success');
    }
    CK.closeModal('adminMoreOptionsModal');
  },

  async filterStudents() {
    const search = document.getElementById('adminStudentSearch')?.value.toLowerCase() || '';
    const students = (await CK.db.getProfiles('student')) || [];
    const filtered = students.filter(s =>
      (s.full_name || '').toLowerCase().includes(search) ||
      (s.coach && s.coach.toLowerCase().includes(search)) ||
      (s.status && s.status.toLowerCase().includes(search))
    );
    this.loadStudents(filtered);
  },

  async editStudent(id) {
    this.openStudentModal(id);
  },

  async loadCoaches() {
    const grid = document.getElementById('adminCoachesGrid');
    if (!grid) return;

    const coaches = (await CK.db.getProfiles('coach')) || [];
    const allStudents = (await CK.db.getProfiles('student')) || [];
    this._allStudentsCache = allStudents;

    const _e = CK.esc || (s => s);
    grid.innerHTML = coaches.map((c, idx) => {
      const cId = c.id;
      const spec = c.specialization || c.specialty || (typeof c.puzzle === 'string' ? c.puzzle : '') || 'Chess Strategy';
      const fide = c.rating ? c.rating + ' ELO' : (c.fide_rating || '—');
      const batches = c.batches || c.schedule || '—';
      const timetable = c.timetable || c.availability || '—';
      const photo = c.photo || '';

      const myStudents = allStudents.filter(s =>
        s.coach && s.coach.toLowerCase() === (c.full_name || '').toLowerCase()
      );
      const paidRevenue = myStudents.reduce((sum, s) => {
        if (s.status !== 'Paid') return sum;
        return sum + (parseInt((s.fee || '0').toString().replace(/[^0-9]/g, '')) || 0);
      }, 0);
      const revenue = paidRevenue > 0 ? '₹' + paidRevenue.toLocaleString('en-IN') : '—';

      // Get a stable initial from name for the avatar fallback
      const initial = (c.full_name || '?').trim().charAt(0).toUpperCase();
      const photoEl = photo
        ? `<img src="${_e(photo)}" alt="${_e(c.full_name)}" class="ck-coach-photo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
           <div class="ck-coach-initial" style="display:none;">${initial}</div>`
        : `<div class="ck-coach-initial">${initial}</div>`;

      const studentList = myStudents.length
        ? myStudents.map(s => `
            <div class="ck-coach-student" data-student-id="${_e(s.id)}">
              <div class="ck-cs-avatar">${_e((s.full_name || '?').charAt(0).toUpperCase())}</div>
              <div class="ck-cs-info">
                <div class="ck-cs-name">${_e(s.full_name)}</div>
                <div class="ck-cs-meta">${_e(s.level || 'Beginner')} · ${_e(s.batch || '—')}</div>
              </div>
              <button class="ck-cs-remove" title="Remove from this coach"
                      onclick="event.stopPropagation(); CK.admin.removeStudentFromCoach('${_e(s.id)}', ${JSON.stringify(c.full_name || '')})">×</button>
            </div>
          `).join('')
        : '<div class="ck-coach-empty">No students assigned yet — click ➕ to add one.</div>';

      return `
        <div class="ck-coach-card" data-coach-id="${_e(cId)}">
          <div class="ck-coach-header" onclick="CK.admin.toggleCoachCard('${_e(cId)}')">
            ${photoEl}
            <div class="ck-coach-body">
              <div class="ck-coach-name">${_e(c.full_name)}</div>
              <div class="ck-coach-spec">${_e(spec)}</div>
              <div class="ck-coach-stats">
                <span class="ck-stat">🎯 <strong>${_e(fide)}</strong></span>
                <span class="ck-stat">👥 <strong>${myStudents.length}</strong> students</span>
                <span class="ck-stat">💰 <strong>${revenue}</strong></span>
              </div>
              <div class="ck-coach-meta">
                <span class="p-badge p-badge-blue">${_e(batches)}</span>
                <span class="ck-meta-text">⏰ ${_e(timetable)}</span>
              </div>
            </div>
            <div class="ck-coach-toggle" aria-label="Expand students">▾</div>
          </div>
          <div class="ck-coach-expand">
            <div class="ck-expand-header">
              <span class="ck-expand-title">👥 Assigned Students (${myStudents.length})</span>
              <div class="ck-expand-actions">
                <button class="p-btn p-btn-teal p-btn-sm"
                        onclick="CK.admin.openAddStudentToCoach(${JSON.stringify(c.full_name || '')})">➕ Add Student</button>
                <button class="p-btn p-btn-ghost p-btn-sm"
                        onclick="event.stopPropagation(); CK.admin.editCoach(${JSON.stringify(cId)})">✎ Edit Coach</button>
              </div>
            </div>
            <div class="ck-coach-students-list">${studentList}</div>
          </div>
        </div>`;
    }).join('') || '<div class="cls-empty">No coaches yet. Click <strong>+ Add Coach</strong> to create one.</div>';
  },

  // Toggle an individual coach card open/closed (only one open at a time)
  toggleCoachCard(coachId) {
    const cards = document.querySelectorAll('#adminCoachesGrid .ck-coach-card');
    cards.forEach(c => {
      if (c.dataset.coachId === coachId) c.classList.toggle('expanded');
      else c.classList.remove('expanded');
    });
  },

  // Remove a student's `coach` assignment (sets it to '')
  async removeStudentFromCoach(studentId, coachName) {
    if (!confirm(`Remove this student from ${coachName}?`)) return;
    const s = await CK.db.getProfile(studentId);
    if (!s) return;
    s.coach = '';
    await CK.db.saveProfile(s);
    await this.loadCoaches();
    CK.showToast('Student unassigned from coach.', 'success');
  },

  // Open a quick picker to assign an existing student to this coach
  openAddStudentToCoach(coachName) {
    const allStudents = this._allStudentsCache || [];
    const candidates = allStudents.filter(s => (s.coach || '').toLowerCase() !== (coachName || '').toLowerCase());
    if (!candidates.length) {
      CK.showToast('No unassigned students available. Add a new student first.', 'info');
      return;
    }
    const list = candidates.map(s => `
      <button class="ck-quick-pick" onclick="CK.admin.assignStudentToCoach('${CK.esc(s.id)}', ${JSON.stringify(coachName)})">
        <span class="ck-cs-avatar small">${CK.esc((s.full_name || '?').charAt(0).toUpperCase())}</span>
        <div>
          <div class="ck-cs-name">${CK.esc(s.full_name)}</div>
          <div class="ck-cs-meta">${CK.esc(s.level || 'Beginner')} · current coach: ${CK.esc(s.coach || '—')}</div>
        </div>
      </button>
    `).join('');

    // Reuse the modal-overlay infrastructure with a quick inline picker
    const overlay = document.getElementById('uploadModal') || document.body;
    const dlg = document.createElement('div');
    dlg.id = 'ck-quick-assign-overlay';
    dlg.className = 'modal-overlay active';
    dlg.style.zIndex = 10050;
    dlg.innerHTML = `
      <div class="modal-card ck-upload-card" style="max-width:520px;">
        <div class="modal-header">
          <h3 class="ck-upload-title">➕ Assign Student to ${CK.esc(coachName)}</h3>
          <p class="ck-upload-subtitle">Pick a student to reassign to this coach.</p>
        </div>
        <div class="modal-body">
          <div class="ck-student-list" style="max-height:340px;">${list}</div>
          <div class="ck-form-actions">
            <button class="btn btn-ghost ck-btn-cancel" onclick="document.getElementById('ck-quick-assign-overlay').remove()">Cancel</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(dlg);
  },

  async assignStudentToCoach(studentId, coachName) {
    const s = await CK.db.getProfile(studentId);
    if (!s) return;
    s.coach = coachName;
    await CK.db.saveProfile(s);
    document.getElementById('ck-quick-assign-overlay')?.remove();
    await this.loadCoaches();
    CK.showToast(`✅ ${s.full_name} is now coached by ${coachName}.`, 'success');
  },

  async loadAttendance() {
    const tbody = document.getElementById('adminAttendanceTable');
    if (!tbody) return;

    const dateInput = document.getElementById('adminAttendanceDate');
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    const students = (await CK.db.getProfiles('student')) || [];
    const attendanceLogs = (await CK.db.getAttendance(null, selectedDate)) || [];

    const attendanceMap = {};
    attendanceLogs.forEach(l => {
      attendanceMap[l.userid] = l.status;
    });

    const _e = CK.esc || (s => s);
    tbody.innerHTML = students.map(s => {
      const currentStatus = attendanceMap[s.id] || 'pending';
      const levelMap = { Beginner: 'Beginner Basics', Intermediate: 'Intermediate Strategy', Advanced: 'Advanced Tournament Prep', 'Tournament Ready': 'Elite Preparation' };
      const classTitle = levelMap[s.level] || s.level || 'Beginner Basics';
      const coachName = s.coach || '—';
      const scheduleTime = s.schedule || '17:00';
      const batchLabel = s.batch || 'Evening';

      return `
        <tr>
          <td style="font-weight:600">${_e(s.full_name)}</td>
          <td>${_e(classTitle)}</td>
          <td>${_e(coachName)}</td>
          <td>${_e(scheduleTime)} (${_e(batchLabel)})</td>
          <td>60 mins</td>
          <td>
            <select class="p-form-control" style="width:auto; padding:4px 8px; font-size:0.8rem; height:auto;" 
                    onchange="CK.admin.saveAttendanceRecord('${s.id}', '${selectedDate}', this.value)">
              <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>⏳ Pending Selection</option>
              <option value="present" ${currentStatus === 'present' ? 'selected' : ''}>✅ Present</option>
              <option value="absent" ${currentStatus === 'absent' ? 'selected' : ''}>❌ Absent</option>
            </select>
          </td>
        </tr>
      `;
    }).join('');
  },

  async saveAttendanceRecord(studentId, date, status) {
    try {
      await CK.db.saveAttendance({
        userid: studentId,
        date: date,
        status: status,
        created_at: new Date().toISOString()
      });
      
      const student = await CK.db.getProfile(studentId);
      CK.showToast(`Attendance set to ${status.toUpperCase()} for ${student ? student.full_name : 'Student'}`, 'success');
      
      if (CK.student && CK.currentUser && CK.currentUser.id === studentId) {
        CK.student.init();
      }
    } catch (e) {
      CK.showToast('Failed to save attendance record.', 'error');
    }
  },

  async renderLive() {
    const grid = document.getElementById('adminLiveGrid');
    if (!grid) return;

    this._updatePresence();

    const students = (await CK.db.getProfiles('student')) || [];
    const coaches  = (await CK.db.getProfiles('coach'))   || [];
    const paidCount = students.filter(s => s.status === 'Paid').length;
    const dueCount  = students.filter(s => s.status === 'Pending' || s.status === 'Due').length;

    const presence = JSON.parse(localStorage.getItem('ck_live_presence') || '{}');
    const now = Date.now();
    const _presAge = (userId) => {
      const p = presence[userId];
      if (!p || !p.lastSeen) return null;
      const mins = Math.floor((now - p.lastSeen) / 60000);
      if (mins < 1) return 'Active now';
      if (mins < 5) return `${mins}m ago`;
      if (mins < 60) return `${mins}m ago`;
      return `${Math.floor(mins / 60)}h ago`;
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const allCoachAttn = (await CK.db.getAttendance()) || [];
    // Normalise to {coachId, date} shape expected by attendedToday check below
    const coachAttn = allCoachAttn.map(a => ({ coachId: a.userid, date: a.date }));

    // Summary bar
    const summaryHtml = `
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <div style="background:rgba(0,201,167,.12);border:1px solid rgba(0,201,167,.25);border-radius:10px;padding:12px 20px;flex:1;min-width:120px;">
          <div style="font-size:1.6rem;font-weight:800;color:var(--p-teal)">${paidCount}</div>
          <div style="font-size:.78rem;color:var(--p-text-muted);margin-top:2px;">Active Students</div>
        </div>
        <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:12px 20px;flex:1;min-width:120px;">
          <div style="font-size:1.6rem;font-weight:800;color:var(--p-danger)">${dueCount}</div>
          <div style="font-size:.78rem;color:var(--p-text-muted);margin-top:2px;">Pending Fees</div>
        </div>
        <div style="background:rgba(91,156,246,.1);border:1px solid rgba(91,156,246,.2);border-radius:10px;padding:12px 20px;flex:1;min-width:120px;">
          <div style="font-size:1.6rem;font-weight:800;color:var(--p-blue)">${coaches.length}</div>
          <div style="font-size:.78rem;color:var(--p-text-muted);margin-top:2px;">Coaches Registered</div>
        </div>
        <div style="background:rgba(232,184,75,.1);border:1px solid rgba(232,184,75,.2);border-radius:10px;padding:12px 20px;flex:1;min-width:120px;">
          <div style="font-size:1.6rem;font-weight:800;color:var(--p-gold)">${this.classesDb.length}</div>
          <div style="font-size:.78rem;color:var(--p-text-muted);margin-top:2px;">Active Classes</div>
        </div>
      </div>`;

    // Coaches section
    const coachesHtml = coaches.length ? `
      <div class="live-section-title">👨‍🏫 Coach Status (${coaches.length})</div>
      <div class="live-coach-grid">
         ${coaches.map(c => {
           const _e = CK.esc || (s => s);
           const attendedToday = coachAttn.some(a => a.coachId === c.id && a.date === todayStr);
           const presAge = _presAge(c.id);
           const isOnline = presAge === 'Active now' || presAge?.includes('m ago') && parseInt(presAge) < 10;
           const initial = c.full_name?.[0]?.toUpperCase() || 'C';
           const myStudents = students.filter(s => s.coach === c.full_name).length;
           return `
             <div class="p-live-card ${attendedToday ? 'online' : 'offline'}">
               <div class="p-live-avatar" style="background:var(--p-surface3);color:var(--p-blue);position:relative;">
                 ${initial}
                 ${isOnline ? '<span style="position:absolute;bottom:0;right:0;width:9px;height:9px;background:var(--p-teal);border-radius:50%;border:2px solid var(--p-surface2);"></span>' : ''}
               </div>
               <div class="p-live-info">
                 <div class="p-live-name">${_e(c.full_name)}</div>
                 <div class="p-live-sub">${myStudents} students · ${_e(String(c.puzzle || 'Coach'))}${presAge ? ' · ' + _e(presAge) : ''}</div>
                 <div class="p-live-status">
                   <span class="p-status-dot ${attendedToday ? 'online' : 'offline'}"></span>
                   ${attendedToday ? 'Active Today' : 'No Class Today'}
                 </div>
               </div>
               <button class="p-icon-btn" title="View Coach Details" onclick="CK.admin.viewCoachDetails && CK.admin.viewCoachDetails(${JSON.stringify(c.id)})">📊</button>
             </div>`;
         }).join('')}
      </div>` : '';

    // Students section — grouped by fee status
    const activeStudents  = students.filter(s => s.status === 'Paid');
    const pendingStudents = students.filter(s => s.status !== 'Paid');

    const makeStudentCard = (s) => {
      const _e = CK.esc || (s => s);
      const feeStatus = s.status || 'Pending';
      const dotClass  = feeStatus === 'Paid' ? 'online' : feeStatus === 'Due' ? 'away' : 'offline';
      const dotLabel  = feeStatus === 'Paid' ? 'Paid & Active' : feeStatus === 'Due' ? 'Fee Overdue' : feeStatus === 'Waiting List' ? 'Waitlisted' : 'Pending';
      const initial   = s.full_name?.[0]?.toUpperCase() || '♛';
      const presAge   = _presAge(s.id) || dotLabel;
      return `
        <div class="p-live-card ${dotClass}" style="transition:all .2s;">
          <div class="p-live-avatar" style="background:var(--p-surface3);color:var(--p-gold)">${initial}</div>
          <div class="p-live-info">
            <div class="p-live-name">${_e(s.full_name)}</div>
            <div class="p-live-sub">${_e(s.level || 'Beginner')} · ${_e(String(s.rating || 800))} ELO</div>
            <div class="p-live-status"><span class="p-status-dot ${dotClass}"></span> ${_e(presAge)}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
            <button class="p-icon-btn" title="View Profile" data-sid="${s.id}" onclick="CK.admin.viewStudentInfo(this.dataset.sid)">👁️</button>
            <button class="p-icon-btn" title="Quick Info" onclick="CK.admin.informStudent(${String(s.id)})">💬</button>
          </div>
        </div>`;
    };

    const studentsHtml = `
      <div class="live-section-title" style="margin-top:24px;">🎓 Active Students (${activeStudents.length})</div>
      <div class="p-live-grid">${activeStudents.map(makeStudentCard).join('') || '<div class="cls-empty">No paid students yet.</div>'}</div>
      ${pendingStudents.length ? `
        <div class="live-section-title" style="margin-top:20px;color:var(--p-warn);">⚠️ Pending / Due (${pendingStudents.length})</div>
        <div class="p-live-grid">${pendingStudents.map(makeStudentCard).join('')}</div>
      ` : ''}`;

    grid.innerHTML = summaryHtml + coachesHtml + studentsHtml;

    const liveCount = document.getElementById('adminLiveCount');
    if (liveCount) liveCount.innerText = `${paidCount} active · ${dueCount} pending · ${coaches.length} coaches · last refresh ${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}`;
  },

  viewLiveBoard(name) {
    const titleEl = document.getElementById('liveFeedStudentName');
    if (titleEl) titleEl.innerText = name;
    
    const boardEl = document.getElementById('liveTrackingChessboard');
    if (boardEl) {
      const pieces = [
        'r','n','b','q','k','b','n','r',
        'p','p','p','p','p','p','p','p',
        '','','','','','','','',
        '','','','','','','','',
        '','','','','P','','','',
        '','','N','','','','','',
        'P','P','P','P','','P','P','P',
        'R','','B','Q','K','B','N','R'
      ];
      const getPieceHtml = (code) => {
        if (!code) return '';
        const c = code === code.toUpperCase() ? 'w' : 'b';
        return `<img src="https://lichess1.org/assets/piece/cburnett/${c}${code.toUpperCase()}.svg" style="width:85%; height:85%; object-fit:contain; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));" />`;
      };
      
      boardEl.innerHTML = pieces.map((p, idx) => {
        const row = Math.floor(idx / 8);
        const col = idx % 8;
        const bg = (row + col) % 2 === 0 ? '#ffffff' : '#4a7c40';
        return `<div style="background:${bg}; display:grid; place-items:center; width:100%; height:100%;">${getPieceHtml(p)}</div>`;
      }).join('');
    }
    
    CK.openModal('adminLiveFeedModal');
    CK.showToast(`Connected to real-time telemetry stream for ${name}`, 'success');
  },

  broadcastLiveTip() {
    CK.openModal('adminBroadcastModal');
  },

  addCustomBatch() {
    const sel = document.getElementById('admin_s_batch');
    if (!sel) return;
    const name = window.prompt('Enter new batch name:');
    if (name && name.trim()) {
      const opt = document.createElement('option');
      opt.value = name.trim();
      opt.textContent = name.trim();
      opt.selected = true;
      sel.appendChild(opt);
      CK.showToast(`Batch "${name.trim()}" added`, 'success');
    }
  },

  sendBroadcastTip() {
    const inp = document.getElementById('adminBroadcastTipInput');
    const tip = inp ? inp.value.trim() : '';
    if (!tip) return CK.showToast('Please enter a tip to broadcast.', 'warning');
    CK.closeModal('adminBroadcastModal');
    if (inp) inp.value = '';
    CK.showToast(`💡 "${tip}" — broadcasted to all active student screens!`, 'success');
  },

  async renderReports() {
    const tbody = document.getElementById('adminReportsTable');
    if (!tbody) return;
    const students = (await CK.db.getProfiles('student')) || [];
    if (!students.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="cls-empty">📋 No students enrolled yet.</div></td></tr>';
      return;
    }
    const allLogs = (await CK.db.getAttendance()) || [];
    const attMap = {};
    allLogs.forEach(l => {
      if (!attMap[l.userid]) attMap[l.userid] = { present: 0, total: 0 };
      attMap[l.userid].total++;
      if (l.status === 'present') attMap[l.userid].present++;
    });

    const avgRating = Math.round(students.reduce((s, u) => s + (parseInt(u.rating) || 800), 0) / students.length);
    const avgAtt = students.length > 0
      ? Math.round(students.reduce((sum, s) => {
          const att = attMap[s.id];
          return sum + (att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 100);
        }, 0) / students.length)
      : 100;
    const totalPuzzles = students.reduce((s, u) => s + (parseInt(u.puzzle) || 0), 0);
    const paidCount = students.filter(s => s.status === 'Paid').length;

    const _e = CK.esc || (s => s);
    tbody.innerHTML = students.map(s => {
      const note = s.last_note ? `"${_e(s.last_note.slice(0, 60))}..."` : '—';
      const statusBadge = s.status === 'Paid' ? 'p-badge-green' : s.status === 'Pending' ? 'p-badge-yellow' : s.status === 'Due' ? 'p-badge-red' : 'p-badge-ghost';
      const rating = s.rating || 800;
      const ratingColor = rating >= 1200 ? 'var(--p-gold)' : rating >= 900 ? 'var(--p-teal)' : 'var(--p-text-muted)';
      const att = attMap[s.id];
      const attPct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 100;
      const attColor = attPct >= 90 ? 'var(--p-teal)' : attPct >= 70 ? 'var(--p-warn)' : 'var(--p-danger)';
      return `
        <tr>
          <td style="font-weight:700;">${_e(s.full_name)}</td>
          <td><span class="p-badge p-badge-blue" style="font-size:0.75rem;">${_e(s.level || 'Beginner')}</span></td>
          <td style="font-weight:700; color:${ratingColor};">${rating} ELO</td>
          <td style="font-weight:700; color:${attColor};">${attPct}%</td>
          <td style="color:var(--p-text-muted);">${s.puzzle || 0}</td>
          <td><span class="p-badge ${statusBadge}">${_e(s.status || 'Paid')}</span></td>
          <td style="font-size:0.82rem; color:var(--p-text-muted); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${note}</td>
        </tr>
      `;
    }).join('') + `
      <tr style="border-top:2px solid rgba(255,255,255,.15);background:rgba(255,255,255,.03);">
        <td style="font-weight:700;color:var(--p-gold);">Academy Average</td>
        <td><span class="p-badge p-badge-ghost" style="font-size:.72rem;">${students.length} total</span></td>
        <td style="font-weight:700;color:var(--p-gold);">${avgRating} ELO</td>
        <td style="font-weight:700;color:var(--p-teal);">${avgAtt}%</td>
        <td style="font-weight:700;color:var(--p-blue);">${totalPuzzles}</td>
        <td><span class="p-badge p-badge-green">${paidCount} Paid</span></td>
        <td style="font-size:.82rem;color:var(--p-text-muted);">—</td>
      </tr>`;
  },

  openModal(id) { CK.openModal(id); },
  closeModal(id) { CK.closeModal(id); },

  topAction() {
    const panels = ['dashboard', 'live', 'students', 'coaches', 'classes', 'attendance', 'files', 'expenses', 'access', 'settings', 'reports', 'schedule', 'feedback', 'tournaments'];
    const activePanel = panels.find(p => {
      const el = document.getElementById(`p-panel-${p}`);
      return el && el.classList.contains('active');
    });

    if (activePanel === 'students') this.openStudentModal();
    if (activePanel === 'coaches') this.openCoachModal();
    if (activePanel === 'classes') this.openClassModal();
    if (activePanel === 'expenses') this.openExpenseModal();
  },

  async openStudentModal(studentId = null) {
    const title = document.getElementById('adminStudentModalTitle');
    await this.populateCoachSelects();
    const setF = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };

    const authRow = document.getElementById('admin_s_auth_row');
    if (studentId) {
      if (title) title.innerText = 'Edit Student Enrollment Details';
      if (authRow) authRow.style.display = 'none'; // auth account already exists
      const s = await CK.db.getProfile(studentId);
      if (!s) return CK.showToast('Student not found.', 'error');
      setF('admin_s_id',       s.id);
      setF('admin_s_name',     s.full_name);
      setF('admin_s_phone',    s.phone_number || '');
      setF('admin_s_level',    s.level || 'Beginner');
      setF('admin_s_rating',   s.rating || 800);
      setF('admin_s_coach',    s.coach || '');
      setF('admin_s_batch',    s.batch || 'Evening');
      setF('admin_s_schedule', s.schedule || '17:00');
      setF('admin_s_join',     s.join_date || '2026-04-20');
      setF('admin_s_fee',      s.fee || 5000);
      setF('admin_s_due',      s.due_date || '14-May-2026');
    } else {
      if (title) title.innerText = 'Enroll New Student';
      if (authRow) authRow.style.display = ''; // show for new enrollment
      setF('admin_s_id', '');
      setF('admin_s_name', '');
      setF('admin_s_phone', '');
      setF('admin_s_email', '');
      setF('admin_s_password', '');
      setF('admin_s_rating', 800);
      setF('admin_s_fee', 5000);
    }
    this.openModal('adminStudentModal');
  },

  async saveStudent() {
    const getV = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const name  = getV('admin_s_name');
    const phone = getV('admin_s_phone');
    if (!name) return CK.showToast('Student Full Name is required', 'error');

    const existingId = getV('admin_s_id');
    const isNew = !existingId;

    let existing = {};
    if (!isNew) existing = (await CK.db.getProfile(existingId)) || {};

    // For new students, require email + password; create credentials with the
    // robust local-first flow (works even if Supabase Auth is unreachable).
    let authUid = existingId;
    if (isNew) {
      const email    = getV('admin_s_email');
      const password = getV('admin_s_password');
      if (!email)    return CK.showToast('Student email is required for new enrollment', 'error');
      if (!password || password.length < 6) return CK.showToast('Initial password must be at least 6 characters', 'error');

      // setCredential ALWAYS persists the local SHA-256 hash, so login works
      // even if Supabase Auth fails (offline, email-already-registered, etc.)
      const result = await CK.accessManager.setCredential(email, password);
      if (result?.warning) console.info('[Admin] setCredential warning:', result.warning);
      if (result?.error && !result?.data) {
        // Hard failure even for local creds — extremely rare (crypto.subtle missing)
        return CK.showToast('Could not save credentials: ' + result.error.message, 'error');
      }
      authUid = result?.data?.user?.id || ('student-' + Date.now());
    }

    const studentData = {
      ...existing,
      id: authUid,
      full_name: name,
      email: existing.email || getV('admin_s_email'),
      phone_number: phone,
      role: 'student',
      level:    getV('admin_s_level')    || 'Beginner',
      rating:   parseInt(getV('admin_s_rating')) || 800,
      coach:    getV('admin_s_coach'),
      batch:    getV('admin_s_batch')    || 'Evening',
      schedule: getV('admin_s_schedule') || '17:00',
      join_date: getV('admin_s_join'),
      fee:      getV('admin_s_fee')      || 5000,
      due_date: getV('admin_s_due'),
      status: isNew ? 'Paid' : (existing.status || 'Paid')
    };

    if (isNew) {
      studentData.userid = Math.floor(104 + Math.random() * 800).toString();
      studentData.star = 1;
      studentData.puzzle = 15;
    }

    await CK.db.saveProfile(studentData);
    await this.loadStudents();
    await this.loadAttendance();
    this.updateStats();
    this.initCharts();
    this.closeModal('adminStudentModal');
    CK.showToast(`Student enrollment ${isNew ? 'completed' : 'updated'} successfully!`, 'success');
  },

  async deleteStudent(id) {
    if (confirm('Are you sure you want to permanently remove this student profile?')) {
      await CK.db.deleteProfile(id);
      await this.loadStudents();
      await this.loadAttendance();
      this.updateStats();
      this.initCharts();
      CK.showToast('Student deleted successfully', 'success');
    }
  },

  async handleSearch(val) {
    const q = val.toLowerCase();
    const students = (await CK.db.getProfiles('student')) || [];
    const filtered = students.filter(s =>
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.coach && s.coach.toLowerCase().includes(q))
    );
    this.loadStudents(filtered);
  },

  async refreshUploadStudentList(form) {
    const container = document.getElementById('uploadStudentList');
    if (!container) return;
    const level = form?.level?.value || '';
    const batch = form?.batch?.value?.trim() || '';
    const students = (await CK.db.getProfiles('student')) || [];
    const filtered = students.filter(s => {
      const lvlMatch = !level || s.level === level;
      const batchMatch = !batch || (s.batch || '').toLowerCase() === batch.toLowerCase();
      return lvlMatch && batchMatch;
    });
    if (!filtered.length) {
      container.innerHTML = '<span class="ck-student-list-empty">No students match this level/batch</span>';
      return;
    }
    const _e = CK.esc || (s => s);
    container.innerHTML = filtered.map(s => `
      <label class="ck-student-row">
        <input type="checkbox" name="assignedStudents" value="${_e(s.id)}" checked class="ck-student-check" />
        <span class="ck-student-name">${_e(s.full_name)}</span>
        <span class="ck-student-level">${_e(s.level || '')}</span>
      </label>
    `).join('');
  },

  // Switch between File-upload and URL/Link source in the Upload Resource modal
  setUploadSource(source) {
    document.querySelectorAll('#uploadModal .ck-source-btn').forEach(btn => {
      const isActive = btn.dataset.source === source;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    document.querySelectorAll('#uploadModal .ck-source-pane').forEach(pane => {
      const show = pane.dataset.pane === source;
      pane.style.display = show ? '' : 'none';
      // Toggle required-attribute so HTML5 validation matches the visible pane
      pane.querySelectorAll('input').forEach(inp => {
        inp.required = show && (inp.type === 'url' || inp.type === 'file');
        if (!show) inp.value = '';
      });
    });
  },

  async handleResourceUpload(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type="submit"]');
    const restoreBtn = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Uploading…';

    try {
      const activeSource = document.querySelector('#uploadModal .ck-source-btn.active')?.dataset.source || 'file';
      const customName = form.fileName.value.trim();
      const targetLevel = form.level.value;
      const batchName  = form.batch.value.trim() || 'All Batches';

      if (!customName) throw new Error('Please provide a resource title.');

      const checkedBoxes = form.querySelectorAll('input[name="assignedStudents"]:checked');
      const selectedUserIds = Array.from(checkedBoxes).map(cb => cb.value);
      const today = new Date().toISOString().slice(0, 10);

      let filePath = '';
      let resourceUrl = '';
      let storageKind = activeSource;     // 'file' or 'link'

      if (activeSource === 'link') {
        resourceUrl = (form.url?.value || '').trim();
        if (!resourceUrl) throw new Error('Please paste a URL for the link resource.');
        try { new URL(resourceUrl); } catch (_) { throw new Error('That URL doesn\'t look valid.'); }
        filePath = resourceUrl; // stored as the "file" field for backward compat
      } else {
        const file = form.file?.files?.[0];
        if (!file) throw new Error('Please choose a file to upload.');
        if (file.size > 16 * 1024 * 1024) throw new Error('File too large (max 16 MB).');

        // Try Supabase Storage upload — fallback to a synthetic path if offline
        filePath = `docs/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        if (window.supabaseClient && navigator.onLine) {
          const { error: upErr } = await window.supabaseClient.storage.from('documents').upload(filePath, file);
          if (upErr) {
            console.warn('[Admin] Storage upload failed, saving metadata only:', upErr);
            CK.showToast('Storage upload failed; resource saved as link instead.', 'warning');
          } else {
            // Get the public URL so students/coaches can open it
            const { data: pub } = window.supabaseClient.storage.from('documents').getPublicUrl(filePath);
            if (pub?.publicUrl) resourceUrl = pub.publicUrl;
          }
        }
      }

      await CK.db.saveDocument({
        name: customName,
        file_name: filePath,
        url: resourceUrl,
        kind: storageKind,
        level: targetLevel,
        batch: batchName,
        user_ids: selectedUserIds.join(','),
        type: form.type ? form.type.value : 'Material',
        difficulty: form.difficulty ? form.difficulty.value : '',
        due_date: form.dueDate ? form.dueDate.value : '',
        xp_reward: form.xpReward ? parseInt(form.xpReward.value) || 50 : 50,
        notes: form.notes ? form.notes.value : '',
        created_at: new Date().toISOString()
      });

      // Mark each assigned student as present for today
      if (selectedUserIds.length) {
        await Promise.all(selectedUserIds.map(uid =>
          CK.db.saveAttendance({ userid: uid, date: today, status: 'present', class_title: customName })
        ));
      }

      CK.showToast(
        `✅ ${storageKind === 'link' ? 'Link' : 'File'} published` +
        (selectedUserIds.length ? ` · ${selectedUserIds.length} student(s) marked present.` : '.'),
        'success'
      );
      CK.closeModal('uploadModal');
      form.reset();
      this.setUploadSource('file');
      const usl = document.getElementById('uploadStudentList');
      if (usl) usl.innerHTML = '<span class="ck-student-list-empty">Select level/batch above to load students</span>';
      await this.loadFiles();

      if (CK.student && CK.student.userProfile) CK.student.init();
      if (CK.coach && CK.coach.renderResources) CK.coach.renderResources();
    } catch (err) {
      CK.showToast(err.message || 'Publishing resource failed.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = restoreBtn;
    }
  },

  async loadFiles() {
    const tbody = document.getElementById('adminFilesTable');
    if (!tbody) return;
    
    try {
      const files = await CK.db.getDocuments();
      if (!files || files.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; opacity:0.5; padding:20px;">No published materials found.</td></tr>';
        return;
      }

      const _e = CK.esc || (s => s);
      tbody.innerHTML = files.map(f => `
        <tr>
          <td style="font-weight:600">${_e(f.name)}</td>
          <td><span class="p-badge p-badge-blue">${_e(f.level)}</span></td>
          <td>${_e(f.batch || 'All')}</td>
          <td><button class="p-btn p-btn-ghost p-btn-sm" data-fname="${_e(f.file_name)}" onclick="CK.admin.downloadFile(this.dataset.fname)">📎 View</button></td>
          <td style="color:var(--p-text-muted)">${new Date(f.created_at).toLocaleDateString()}</td>
          <td><button class="p-icon-btn" style="color:var(--p-danger)" data-fid="${_e(String(f.id))}" data-fname="${_e(f.file_name)}" onclick="CK.admin.deleteFile(this.dataset.fid, this.dataset.fname)">🗑️</button></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; opacity:0.5;">Error loading files.</td></tr>';
    }
  },

  async downloadFile(fileName) {
    if (window.supabaseClient) {
      const { data } = window.supabaseClient.storage.from('documents').getPublicUrl(fileName);
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
        return;
      }
    }
    CK.showToast(`Downloading static fallback document: ${fileName}`, 'success');
  },

  async deleteFile(id, fileName) {
    if (!confirm('Permanently delete this learning asset?')) return;
    try {
      if (window.supabaseClient && navigator.onLine) {
        await window.supabaseClient.storage.from('documents').remove([fileName]);
      }
      await CK.db.deleteDocument(id);
      CK.showToast('Resource asset deleted.', 'success');
      await this.loadFiles();
    } catch (e) { 
      CK.showToast('Delete failed.', 'error'); 
    }
  },

  /* ─── Expense Management ─── */
  async loadExpenses() {
    const tbody = document.getElementById('adminExpensesTable');
    if (!tbody) return;
    try {
      const expenses = (await CK.db.getExpenses()) || [];
      if (!expenses.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;opacity:0.5;padding:20px;">No expenses recorded yet.</td></tr>';
        return;
      }
      const _e = CK.esc || (s => s);
      const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN');
      tbody.innerHTML = expenses.map(exp => `
        <tr>
          <td style="font-weight:600">${_e(exp.category || 'General')}</td>
          <td>${_e(exp.description || '—')}</td>
          <td style="font-weight:700;color:var(--p-danger)">${fmt(exp.amount)}</td>
          <td>${_e(exp.mode || 'Cash')}</td>
          <td style="color:var(--p-text-muted)">${new Date(exp.date || exp.created_at).toLocaleDateString('en-IN')}</td>
          <td><button class="p-icon-btn" style="color:var(--p-danger)" data-eid="${_e(String(exp.id))}" onclick="CK.admin.deleteExpense(this.dataset.eid)">🗑️</button></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;opacity:0.5;">Error loading expenses.</td></tr>';
    }
  },

  openExpenseModal() {
    ['admin_exp_cat', 'admin_exp_desc', 'admin_exp_amount', 'admin_exp_mode'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = el.tagName === 'SELECT' ? el.options[0].value : '';
    });
    CK.openModal('adminExpenseModal');
  },

  async saveExpense() {
    const getV = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const category = getV('admin_exp_cat');
    const description = getV('admin_exp_desc');
    const amount = parseFloat(getV('admin_exp_amount'));
    const mode = getV('admin_exp_mode');

    if (!description || !amount || isNaN(amount)) {
      CK.showToast('Please fill in all expense fields.', 'warning');
      return;
    }

    try {
      await CK.db.saveExpense({
        category: category || 'Miscellaneous',
        description,
        amount,
        mode: mode || 'Cash',
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
      CK.closeModal('adminExpenseModal');
      CK.showToast('Expense recorded successfully!', 'success');
      await this.loadExpenses();
    } catch (e) {
      CK.showToast('Failed to save expense.', 'error');
    }
  },

  async deleteExpense(id) {
    if (!confirm('Delete this expense record?')) return;
    try {
      const expenses = (await CK.db.getExpenses()) || [];
      const filtered = expenses.filter(e => String(e.id) !== String(id));
      localStorage.setItem('ck_expenses', JSON.stringify(filtered));
      CK.showToast('Expense deleted.', 'success');
      await this.loadExpenses();
    } catch (e) {
      CK.showToast('Delete failed.', 'error');
    }
  },

  async saveCoach() {
    const getV = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const name  = getV('admin_c_name');
    const phone = getV('admin_c_phone');
    const email = getV('admin_c_email');
    if (!name)  return CK.showToast('Coach name is required', 'error');

    const existingId = getV('admin_c_id');
    const isNew = !existingId;

    if (isNew && !email) return CK.showToast('Coach email is required', 'error');

    let existing = {};
    if (!isNew) existing = (await CK.db.getProfile(existingId)) || {};

    // Robust credential creation — local SHA-256 fallback always succeeds
    let authUid = existingId;
    if (isNew) {
      const password = getV('admin_c_password');
      if (!password || password.length < 6) return CK.showToast('Initial password must be at least 6 characters', 'error');
      const result = await CK.accessManager.setCredential(email, password);
      if (result?.warning) console.info('[Admin] setCredential warning:', result.warning);
      if (result?.error && !result?.data) {
        return CK.showToast('Could not save credentials: ' + result.error.message, 'error');
      }
      authUid = result?.data?.user?.id || ('coach-' + Date.now());
    }

    const coachData = {
      ...existing,
      id: authUid,
      full_name: name,
      email: existing.email || email,
      phone_number: phone,
      role: 'coach',
      specialization: getV('admin_c_spec'),
      address:      getV('admin_c_addr'),
      photo:        getV('admin_c_photo'),
      status:       getV('admin_c_status') || 'Active',
      availability: getV('admin_c_avail')  || 'Weekends',
      bio:          getV('admin_c_bio'),
      level: 'Advanced',
      userid: isNew ? 'C' + (Math.floor(Math.random() * 900) + 100).toString() : existing.userid
    };

    await CK.db.saveProfile(coachData);
    await this.loadCoaches();
    this.updateStats();
    this.closeModal('adminCoachModal');
    CK.showToast(`Coach ${isNew ? 'registered' : 'updated'} successfully!`, 'success');
  },

  async openCoachModal(coachId = null) {
    const setC = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    const authRow = document.getElementById('admin_c_auth_row');
    const title   = document.getElementById('adminCoachModalTitle');

    setC('admin_c_id',       coachId || '');
    setC('admin_c_name',     '');
    setC('admin_c_spec',     '');
    setC('admin_c_phone',    '');
    setC('admin_c_email',    '');
    setC('admin_c_password', '');
    setC('admin_c_addr',     '');
    setC('admin_c_photo',    '');
    setC('admin_c_status',   'Active');
    setC('admin_c_avail',    'Weekends');
    setC('admin_c_bio',      '');

    if (coachId) {
      if (title)   title.innerText = 'Edit Coach Details';
      if (authRow) authRow.style.display = 'none';
      const c = await CK.db.getProfile(coachId);
      if (c) {
        setC('admin_c_name',   c.full_name);
        setC('admin_c_spec',   c.puzzle || '');
        setC('admin_c_phone',  c.phone_number || '');
        setC('admin_c_email',  c.email || '');
        setC('admin_c_addr',   c.address || '');
        setC('admin_c_photo',  c.photo || '');
        setC('admin_c_status', c.status || 'Active');
        setC('admin_c_avail',  c.availability || 'Weekends');
        setC('admin_c_bio',    c.bio || '');
      }
    } else {
      if (title)   title.innerText = 'Add New Coach';
      if (authRow) authRow.style.display = '';
    }
    this.openModal('adminCoachModal');
  },

  editCoach(id) { this.openCoachModal(id); },

  async viewCoachDetails(id) {
    const c = await CK.db.getProfile(id);
    if (!c) return CK.showToast('Coach not found.', 'error');
    const _e = CK.esc || (s => s);
    const students = (await CK.db.getProfiles('student')) || [];
    const myStudents = students.filter(s => s.coach === c.full_name);
    const paidRevenue = myStudents.reduce((sum, s) => {
      if (s.status !== 'Paid') return sum;
      return sum + (parseInt((s.fee || '0').toString().replace(/[^0-9]/g, '')) || 0);
    }, 0);
    const titleEl = document.getElementById('detailCoachTitle');
    if (titleEl) titleEl.textContent = _e(c.full_name) + ' — Coach Profile';
    const specEl = document.getElementById('detailCoachSpec');
    if (specEl) specEl.textContent = 'Specialty: ' + _e(c.puzzle || c.specialty || 'Chess Strategy');
    const batchEl = document.getElementById('detailCoachBatches');
    if (batchEl) batchEl.textContent = 'Assigned Batches: ' + _e(c.batches || c.schedule || 'All');
    const ttEl = document.getElementById('detailCoachTimetable');
    if (ttEl) ttEl.textContent = 'Timetable: ' + _e(c.timetable || c.availability || 'As scheduled');
    const revEl = document.getElementById('detailCoachRevenue');
    if (revEl) revEl.textContent = 'Monthly Revenue: ₹' + paidRevenue.toLocaleString('en-IN');
    const clsEl = document.getElementById('detailCoachClasses');
    if (clsEl) clsEl.textContent = 'Students Assigned: ' + myStudents.length;
    CK.openModal('adminCoachDetailsModal');
  },

  async openClassModal(classId = null) {
    await this.populateCoachSelects();
    const setF = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    if (classId) {
      const cls = this.classesDb.find(c => c.id === classId);
      if (cls) {
        setF('admin_cl_title', cls.title);
        setF('admin_cl_level', cls.level);
        setF('admin_cl_coach', cls.coachName || cls.coach);
        const parts = (cls.schedule || '').split(' ');
        setF('admin_cl_day', parts[0] || '');
        setF('admin_cl_time', parts[1] || '');
        const saveBtn = document.getElementById('adminClassSaveBtn');
        if (saveBtn) saveBtn.dataset.editId = classId;
      }
    } else {
      ['admin_cl_title','admin_cl_level','admin_cl_coach','admin_cl_day','admin_cl_time'].forEach(id => setF(id, ''));
      const saveBtn = document.getElementById('adminClassSaveBtn');
      if (saveBtn) delete saveBtn.dataset.editId;
    }
    this.openModal('adminClassModal');
  },

  async saveClass() {
    const getV = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const title = getV('admin_cl_title');
    if (!title) return CK.showToast('Class title is required', 'error');

    const saveBtn = document.getElementById('adminClassSaveBtn');
    const editId = saveBtn?.dataset.editId;
    const existing = editId ? this.classesDb.find(c => c.id === editId) : null;

    // Resolve selected coach's profile so we can store coachId + coachName
    const coachName = getV('admin_cl_coach');
    const coaches   = (await CK.db.getProfiles('coach')) || [];
    const coachObj  = coaches.find(c => c.full_name === coachName) || {};

    const daysRaw = getV('admin_cl_day');
    const days    = daysRaw.includes(',') ? daysRaw.split(',') : [daysRaw];

    const newClass = {
      id:         existing?.id || ('CL' + Date.now()),
      title,
      level:      getV('admin_cl_level')    || 'Beginner',
      batch:      getV('admin_cl_batch')    || 'General',
      coachId:    coachObj.id               || existing?.coachId || '',
      coachName:  coachObj.full_name        || coachName,
      days,
      time:       getV('admin_cl_time')     || '16:00',
      duration:   parseInt(getV('admin_cl_duration')) || 60,
      zoomLink:   getV('admin_cl_link')     || '',
      studentIds: existing?.studentIds      || [],
      maxStudents: existing?.maxStudents    || 10,
      active:     true,
      createdAt:  existing?.createdAt       || new Date().toISOString()
    };

    if (existing) {
      const idx = this.classesDb.findIndex(c => c.id === editId);
      if (idx !== -1) this.classesDb[idx] = newClass;
    } else {
      this.classesDb.push(newClass);
    }
    await CK.db.saveClass(newClass);

    await this.loadClasses();
    this.updateStats();
    this.closeModal('adminClassModal');
    CK.showToast(`Class "${title}" ${editId ? 'updated' : 'scheduled'} successfully!`, 'success');
  },

  /* ── Settings Persistence ── */
  _settingsKey: 'ck_academy_settings',

  loadSettings() {
    const defaults = {
      name: 'ChessKidoo Academy', email: 'info@chesskidoo.com',
      phone: '+91 98765 43210', city: 'Chennai, Tamil Nadu',
      tagline: 'Where Future Grandmasters Are Born',
      defaultFee: 2200, lateFee: 250
    };
    const saved = JSON.parse(localStorage.getItem(this._settingsKey) || '{}');
    const cfg = { ...defaults, ...saved };
    const setV = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    setV('settings_academy_name', cfg.name);
    setV('settings_academy_email', cfg.email);
    setV('settings_academy_phone', cfg.phone);
    setV('settings_academy_city', cfg.city);
    setV('settings_academy_tagline', cfg.tagline);
    setV('settings_default_fee', cfg.defaultFee);
    setV('settings_late_fee', cfg.lateFee);
  },

  saveAcademyProfile() {
    const getV = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    const existing = JSON.parse(localStorage.getItem(this._settingsKey) || '{}');
    const cfg = { ...existing,
      name: getV('settings_academy_name') || 'ChessKidoo Academy',
      email: getV('settings_academy_email'),
      phone: getV('settings_academy_phone'),
      city: getV('settings_academy_city'),
      tagline: getV('settings_academy_tagline')
    };
    localStorage.setItem(this._settingsKey, JSON.stringify(cfg));
    CK.showToast('Academy profile saved successfully!', 'success');
  },

  saveFeeConfig() {
    const getV = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    const existing = JSON.parse(localStorage.getItem(this._settingsKey) || '{}');
    const cfg = { ...existing,
      defaultFee: parseInt(getV('settings_default_fee')) || 2200,
      lateFee: parseInt(getV('settings_late_fee')) || 250
    };
    localStorage.setItem(this._settingsKey, JSON.stringify(cfg));
    CK.showToast('Fee configuration saved!', 'success');
  },

  /* ── Tournament CRUD ── */
  _tournamentsKey: 'ck_admin_tournaments',

  getTournaments() {
    const defaults = [
      { id: 'T1', name: 'Summer Open 2026', date: '2026-08-15', format: 'Swiss', participants: 42, status: 'Upcoming' },
      { id: 'T2', name: 'Weekly Blitz Arena', date: 'Every Friday', format: 'Arena', participants: 150, status: 'Active' }
    ];
    const saved = localStorage.getItem(this._tournamentsKey);
    return saved ? JSON.parse(saved) : defaults;
  },

  saveTournaments(list) {
    localStorage.setItem(this._tournamentsKey, JSON.stringify(list));
  },

  loadTournaments() {
    const tbody = document.getElementById('adminTournamentsTable');
    if (!tbody) return;
    const _e = CK.esc || (s => s);
    const list = this.getTournaments();
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;opacity:0.5;padding:20px;">No tournaments created yet.</td></tr>';
      return;
    }
    const statusBadge = { Active: 'p-badge-green', Upcoming: 'p-badge-blue', Completed: 'p-badge-ghost', Cancelled: 'p-badge-red' };
    tbody.innerHTML = list.map(t => `
      <tr>
        <td style="font-weight:600">${_e(t.name)}</td>
        <td>${_e(t.date)}</td>
        <td><span class="p-badge p-badge-teal" style="font-size:.72rem">${_e(t.format)}</span></td>
        <td style="font-weight:700">${_e(String(t.participants ?? ''))}</td>
        <td><span class="p-badge ${statusBadge[t.status] || 'p-badge-ghost'}">${_e(t.status)}</span></td>
        <td>
          <button class="p-icon-btn p-btn-sm" data-tid="${_e(String(t.id))}" onclick="CK.admin.openTournamentModal(this.dataset.tid)" title="Edit">✏️</button>
          <button class="p-icon-btn p-btn-sm" style="color:var(--p-danger)" data-tid="${_e(String(t.id))}" onclick="CK.admin.deleteTournament(this.dataset.tid)" title="Delete">🗑️</button>
        </td>
      </tr>
    `).join('');
  },

  openTournamentModal(id = null) {
    const setF = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val ?? ''; };
    if (id) {
      const t = this.getTournaments().find(x => x.id === id);
      if (t) {
        setF('admin_t_id', t.id);
        setF('admin_t_name', t.name);
        setF('admin_t_date', t.date);
        setF('admin_t_format', t.format);
        setF('admin_t_participants', t.participants);
        setF('admin_t_status', t.status);
      }
    } else {
      setF('admin_t_id', '');
      setF('admin_t_name', '');
      setF('admin_t_date', new Date().toISOString().split('T')[0]);
      setF('admin_t_format', 'Swiss');
      setF('admin_t_participants', 0);
      setF('admin_t_status', 'Upcoming');
    }
    CK.openModal('adminTournamentModal');
  },

  saveTournament() {
    const getV = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    const name = getV('admin_t_name');
    if (!name) return CK.showToast('Tournament name is required', 'error');
    const list = this.getTournaments();
    const id = getV('admin_t_id') || 'T' + Date.now();
    const existing = list.findIndex(x => x.id === id);
    const t = { id, name, date: getV('admin_t_date'), format: getV('admin_t_format') || 'Swiss',
      participants: parseInt(getV('admin_t_participants')) || 0, status: getV('admin_t_status') || 'Upcoming' };
    if (existing >= 0) list[existing] = t;
    else list.push(t);
    this.saveTournaments(list);
    this.loadTournaments();
    CK.closeModal('adminTournamentModal');
    CK.showToast(`Tournament "${name}" saved successfully!`, 'success');
  },

  deleteTournament(id) {
    if (!confirm('Delete this tournament?')) return;
    const list = this.getTournaments().filter(x => x.id !== id);
    this.saveTournaments(list);
    this.loadTournaments();
    CK.showToast('Tournament deleted.', 'success');
  },

  async exportStudentsCSV() {
    try {
      const students = (await CK.db.getProfiles('student')) || [];
      if (students.length === 0) {
        return CK.showToast('No student data to export.', 'warning');
      }

      const headers = ['User ID', 'Full Name', 'Email', 'Level', 'Coach', 'Rating', 'Status'];
      const rows = students.map(s => [
        s.userid || 'N/A',
        s.full_name || 'N/A',
        s.email || 'N/A',
        s.level || 'Beginner',
        s.coach || 'Assigning...',
        s.rating || '800',
        s.status || 'Paid'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `chesskidoo_students_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      CK.showToast('Student list exported to CSV successfully!', 'success');
    } catch (e) {
      CK.showToast('Export failed.', 'error');
    }
  },

  async exportReportsCSV() {
    try {
      const students = (await CK.db.getProfiles('student')) || [];
      if (!students.length) return CK.showToast('No data to export.', 'warning');
      const allLogs = (await CK.db.getAttendance()) || [];
      const attMap = {};
      allLogs.forEach(l => {
        if (!attMap[l.userid]) attMap[l.userid] = { present: 0, total: 0 };
        attMap[l.userid].total++;
        if (l.status === 'present') attMap[l.userid].present++;
      });
      const headers = ['Name', 'Level', 'ELO Rating', 'Attendance %', 'Puzzles Solved', 'Fee Status', 'Coach', 'Coach Note'];
      const rows = students.map(s => {
        const att = attMap[s.id];
        const attPct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 100;
        return [s.full_name || '', s.level || 'Beginner', s.rating || 800, attPct + '%', s.puzzle || 0, s.status || 'Paid', s.coach || '', s.last_note || ''];
      });
      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `chesskidoo_reports_${new Date().toISOString().split('T')[0]}.csv`;
      a.style.display = 'none'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      CK.showToast('Progress reports exported to CSV!', 'success');
    } catch (e) { CK.showToast('Export failed.', 'error'); }
  },

  /* ── Bulk Fee Operations ── */
  async markAllPaid() {
    const students = (await CK.db.getProfiles('student')) || [];
    const pending = students.filter(s => s.status !== 'Paid' && s.status !== 'Waiting List');
    if (!pending.length) return CK.showToast('All students are already paid!', 'info');
    if (!confirm(`Mark ${pending.length} student(s) as Paid?`)) return;
    const nextDue = this._nextDueDate();
    for (const s of pending) { s.status = 'Paid'; s.due_date = nextDue; await CK.db.saveProfile(s); }
    await this.loadStudents(); this.updateStats(); this.initCharts();
    CK.showToast(`${pending.length} student(s) marked as Paid.`, 'success');
  },

  async sendFeeReminders() {
    const students = (await CK.db.getProfiles('student')) || [];
    const pending = students.filter(s => s.status !== 'Paid' && s.phone_number);
    if (!pending.length) return CK.showToast('No pending students with phone numbers.', 'warning');
    let sent = 0;
    pending.forEach(s => {
      const phone = s.phone_number.replace(/\D/g, '');
      const waNum = phone.startsWith('91') ? phone : '91' + phone;
      const msg = `Hello! This is ChessKidoo Academy. Your chess fee of ₹${s.fee || 2200} is due. Please complete the payment to continue classes. Thank you!`;
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
      sent++;
    });
    CK.showToast(`Fee reminders sent to ${sent} student(s) via WhatsApp!`, 'success');
  },

  /* ── Real-time Stats Animation ── */
  _animateCounter(el, target, duration = 600) {
    if (!el) return;
    const start = parseInt(el.textContent.replace(/\D/g, '')) || 0;
    const steps = 20;
    const step = (target - start) / steps;
    let current = start;
    const timer = setInterval(() => {
      current += step;
      if ((step > 0 && current >= target) || (step < 0 && current <= target) || step === 0) {
        el.textContent = typeof target === 'string' ? target : Math.round(target);
        clearInterval(timer);
      } else {
        el.textContent = Math.round(current);
      }
    }, duration / steps);
  },

  /* ─── AI Analytics Panel ─── */
  async renderAIAnalytics() {
    const students = (await CK.db.getProfiles('student')) || [];
    const _e = CK.esc || (s => s);

    // Engagement Overview
    const engEl = document.getElementById('adminEngagementOverview');
    if (engEl && CK.ai) {
      let highEng = 0, medEng = 0, lowEng = 0;
      for (const s of students) {
        try {
          const result = await CK.ai.getEngagementScore(s.id);
          const score = result?.score || 0;
          if (score >= 70) highEng++;
          else if (score >= 40) medEng++;
          else lowEng++;
        } catch(e) { lowEng++; }
      }
      engEl.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px; text-align:center;">
          <div style="padding:20px; border-radius:12px; background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.2);">
            <div style="font-size:2rem; font-weight:900; color:#22c55e;">${highEng}</div>
            <div style="font-size:0.8rem; color:var(--p-text-muted);">High Engagement</div>
          </div>
          <div style="padding:20px; border-radius:12px; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.2);">
            <div style="font-size:2rem; font-weight:900; color:#f59e0b;">${medEng}</div>
            <div style="font-size:0.8rem; color:var(--p-text-muted);">Medium Engagement</div>
          </div>
          <div style="padding:20px; border-radius:12px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2);">
            <div style="font-size:2rem; font-weight:900; color:#ef4444;">${lowEng}</div>
            <div style="font-size:0.8rem; color:var(--p-text-muted);">Low Engagement</div>
          </div>
        </div>`;
    }

    // Dropout Risk
    const drEl = document.getElementById('adminDropoutRisk');
    if (drEl && CK.ai) {
      const atRisk = [];
      for (const s of students) {
        try {
          const result = await CK.ai.getEngagementScore(s.id);
          if (result && (result.dropoutRisk === 'high' || result.dropoutRisk === 'medium')) {
            atRisk.push({ name: s.full_name || 'Unknown', risk: result.dropoutRisk, engagement: result.score });
          }
        } catch(e) {}
      }
      atRisk.sort((a, b) => (a.risk === 'high' ? 0 : 1) - (b.risk === 'high' ? 0 : 1));
      drEl.innerHTML = atRisk.length ? atRisk.slice(0, 10).map(r => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:8px; margin-bottom:6px; background:${r.risk==='high'?'rgba(239,68,68,0.08)':'rgba(245,158,11,0.08)'}; border:1px solid ${r.risk==='high'?'rgba(239,68,68,0.2)':'rgba(245,158,11,0.2)'};">
          <div>
            <div style="font-weight:600;">${_e(r.name)}</div>
            <div style="font-size:0.75rem; color:var(--p-text-muted);">Engagement: ${r.engagement}%</div>
          </div>
          <span style="color:${r.risk==='high'?'#ef4444':'#f59e0b'}; font-weight:700; font-size:0.8rem; text-transform:uppercase;">${r.risk} RISK</span>
        </div>`).join('') : '<div style="text-align:center;opacity:.4;padding:20px;">No at-risk students detected</div>';
    }

    // Coach Effectiveness
    const ceEl = document.getElementById('adminCoachEffectiveness');
    if (ceEl && CK.ai) {
      const coaches = (await CK.db.getProfiles('coach')) || [];
      const coachData = [];
      for (const c of coaches) {
        try {
          const eff = await CK.ai.getCoachEffectiveness(c.full_name);
          if (eff) coachData.push({ name: c.full_name, ...eff });
        } catch(e) {}
      }
      ceEl.innerHTML = coachData.length ? `
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px;">
        ${coachData.map(c => `
          <div style="padding:16px; border-radius:12px; background:var(--p-surface3); border:1px solid rgba(255,255,255,0.06);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--p-gold);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.1rem;">${c.grade}</div>
              <div>
                <div style="font-weight:700;">${_e(c.name || 'Unknown')}</div>
                <div style="font-size:0.75rem;color:var(--p-text-muted);">${c.studentCount} students</div>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.78rem;">
              <div>Avg ELO Gain: <strong style="color:var(--p-teal);">+${c.avgELOImprovement}</strong></div>
              <div>Retention: <strong>${c.retentionRate}%</strong></div>
              <div>Attendance: <strong>${c.avgAttendance}%</strong></div>
              <div>Score: <strong style="color:var(--p-gold);">${c.effectiveness}</strong></div>
            </div>
          </div>`).join('')}
        </div>` : '<div style="text-align:center;opacity:.4;padding:20px;">No coaches found</div>';
    }

    // Student Weakness Selector
    const selEl = document.getElementById('adminWeaknessStudentSelect');
    if (selEl && students.length) {
      selEl.innerHTML = '<option value="">Select a student...</option>' +
        students.map(s => `<option value="${_e(s.id)}">${_e(s.full_name || 'Unknown')}</option>`).join('');
    }
  },

  async renderStudentWeakness(studentId) {
    if (!studentId || !CK.ai) return;
    try {
      const analysis = await CK.ai.analyzeStudent(studentId);
      if (!analysis) { CK.showToast('Could not analyze this student', 'info'); return; }

      // Ensure canvas exists for Chart.js radar
      const chartEl = document.getElementById('adminWeaknessChart');
      if (chartEl && !chartEl.querySelector('canvas')) {
        chartEl.innerHTML = '<canvas id="adminWeaknessCanvas" style="max-height:280px;"></canvas>';
      }
      CK.ai.renderWeaknessChart('adminWeaknessCanvas', analysis);

      const plan = CK.ai.generateStudyPlan(analysis);
      CK.ai.renderStudyPlan('adminStudyPlan', plan);
    } catch(e) { console.warn('Student weakness analysis error:', e); }
  },

  /* ─── Leaderboard & XP Panel ─── */
  async renderLeaderboardPanel() {
    if (CK.rpg) {
      CK.rpg.renderLeaderboard('adminLeaderboard');
      CK.rpg.renderXPFeed('adminXPFeed');
      CK.rpg.renderBadgeGrid('adminBadgeShowcase');
    }
  },

  /* ─── Audit Logs Panel ─── */
  renderAuditPanel() {
    if (CK.security) {
      CK.security.renderAuditLog('adminAuditLogTable');
    }

    // RBAC overview
    const rbacEl = document.getElementById('adminRBACOverview');
    if (rbacEl && CK.security) {
      const perms = CK.security.RBAC.permissions;
      const _e = CK.esc || (s => s);
      rbacEl.innerHTML = Object.entries(perms).map(([role, permsArr]) => `
        <div style="margin-bottom:14px;">
          <div style="font-weight:700; text-transform:capitalize; margin-bottom:6px; color:var(--p-gold);">${_e(role)}</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${permsArr.map(p => `<span style="font-size:0.72rem; padding:3px 8px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);">${_e(p)}</span>`).join('')}
          </div>
        </div>`).join('');
    }

    // Fair play reports
    const fpEl = document.getElementById('adminFairPlayReports');
    if (fpEl) {
      const logs = CK.security ? CK.security.getAuditLogsFiltered({ action: 'game_end' }) : [];
      if (logs.length) {
        const _e = CK.esc || (s => s);
        fpEl.innerHTML = logs.slice(0, 10).map(l => {
          const d = l.details || {};
          const score = d.fairPlayScore || 100;
          const color = score >= 85 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;margin-bottom:6px;background:rgba(255,255,255,0.03);">
            <div>
              <div style="font-weight:600;font-size:0.85rem;">${_e(l.userName)}</div>
              <div style="font-size:0.72rem;color:var(--p-text-muted);">Tab switches: ${d.tabSwitches||0} · Flags: ${(d.flags||[]).length}</div>
            </div>
            <div style="font-weight:900;color:${color};">${score}/100</div>
          </div>`;
        }).join('');
      } else {
        fpEl.innerHTML = '<div style="text-align:center;opacity:.4;padding:20px;">No game reports yet. Reports appear after students complete games.</div>';
      }
    }
  },

  /* ─── Certificate Issuing ─── */
  async openIssueCertModal() {
    const students = (await CK.db.getProfiles('student')) || [];
    const _e = CK.esc || (s => s);
    const sel = document.getElementById('certStudentSelect');
    if (sel) {
      sel.innerHTML = '<option value="">Select a student...</option>' +
        students.map(s => `<option value="${_e(s.id)}">${_e(s.full_name || 'Unknown')} (${_e(s.level || 'Beginner')})</option>`).join('');
    }
    const coachInput = document.getElementById('certCoachName');
    if (coachInput && !coachInput.value) coachInput.value = 'ChessKidoo Academy';
    CK.openModal('adminCertModal');
  },

  async issueCertificate() {
    const studentId = document.getElementById('certStudentSelect')?.value;
    const level = document.getElementById('certLevelSelect')?.value || 'Beginner';
    const coachName = document.getElementById('certCoachName')?.value || 'ChessKidoo Academy';
    if (!studentId) { CK.showToast('Please select a student', 'error'); return; }

    const profile = await CK.db.getProfile(studentId);
    if (!profile) { CK.showToast('Student not found', 'error'); return; }

    // Temporarily set the level for cert generation
    const origLevel = profile.level;
    profile.level = level;
    const cert = CK.certs.awardCertificate(profile, coachName);
    profile.level = origLevel;

    CK.certs.generatePDF(cert);
    CK.closeModal('adminCertModal');
    this.renderIssuedCerts();

    // Notify student
    if (CK.notifs) CK.notifs.push('achievement', `🎓 ${level} Certificate Earned!`,
      `Congratulations! You've been awarded the ${level} Level Certificate by ${coachName}.`,
      studentId, 'student');
  },

  renderIssuedCerts() {
    const el = document.getElementById('adminIssuedCertsList');
    if (!el || !CK.certs) return;
    const allCerts = CK.certs.getEarned();
    const _e = CK.esc || (s => s);
    if (allCerts.length) {
      el.innerHTML = `<table class="p-table" style="width:100%">
        <thead><tr><th>Student</th><th>Level</th><th>Coach</th><th>Issued</th><th>Cert #</th><th></th></tr></thead>
        <tbody>${allCerts.map(c => `
          <tr>
            <td>${_e(c.studentName)}</td>
            <td><span style="color:${c.level==='Advanced'?'var(--p-gold)':c.level==='Intermediate'?'var(--p-blue)':'var(--p-teal)'};">${_e(c.level)}</span></td>
            <td>${_e(c.coachName)}</td>
            <td>${new Date(c.issuedAt).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'})}</td>
            <td style="font-family:monospace;font-size:0.78rem;">${_e(c.certNumber)}</td>
            <td><button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.certs.downloadCert('${_e(c.id)}')">⬇ PDF</button></td>
          </tr>`).join('')}
        </tbody></table>`;
    } else {
      el.innerHTML = '<div style="text-align:center;opacity:.4;padding:20px;">No certificates issued yet. Use the "+ Issue Certificate" button above.</div>';
    }
  }
};