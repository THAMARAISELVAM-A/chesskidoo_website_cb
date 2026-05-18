/* assets/js/coach.js ------------------------------------------------------
   ChessKidoo Coach Portal Logic
   Fully connected to CK.db unified layer, supporting dynamic teacher profile,
   live session controls, real-time assigned students loading, and game note taking.
   ------------------------------------------------------------------------- */

CK.coach = {
  coachProfile: null,
  classesDb: [],

  async init() {
    console.log("Coach Portal Initializing...");

    // 1. Fetch current coach profile dynamically
    const currentUser = CK.currentUser || JSON.parse(localStorage.getItem('ck_user'));
    if (!currentUser) {
      CK.showToast("Session expired. Please log in again.", "error");
      CK.showPage('login-page');
      return;
    }

    this.coachProfile = await CK.db.getProfile(currentUser.id) || currentUser;

    // Load today's classes from ck_meetings, fallback to mock
    const _todayStr = new Date().toISOString().split('T')[0];
    const _meetings = await CK.db.getMeetings();
    const _coachName = this.coachProfile?.full_name;
    const _todayMeetings = _meetings.filter(m =>
      (m.coach === _coachName || !m.coach) &&
      (m.date === new Date().toISOString().split('T')[0])
    );
    if (_todayMeetings.length > 0) {
      this.classesDb = _todayMeetings.map((m, i) => ({
        id: m.id || `C${i + 1}`,
        class: m.title || m.type || 'Chess Class',
        level: m.level || 'Intermediate',
        time: m.time || '4:00 PM',
        students: m.students || 0,
        status: 'Upcoming',
        batch: m.batch
      }));
    } else {
      this.classesDb = [
        { id: 'C1', class: 'Intermediate Strategy', level: 'Intermediate', time: '4:00 PM', students: 8, status: 'Upcoming' },
        { id: 'C2', class: 'Advanced Endgames', level: 'Advanced', time: '6:30 PM', students: 5, status: 'Scheduled' }
      ];
    }

    // coach_notes are managed by CK.tracker (via db.js) — no local init needed

    // 2. Load UI elements
    await this.updateProfile();
    await this.renderDashboard();
    this.nav('home');

    // 3. Start real-time auto-refresh
    this.startAutoRefresh();
  },

  /* ── Real-Time Auto Refresh ── */
  _coachRefreshTimer: null,
  _sessionTimerInterval: null,
  _sessionSeconds: 0,

  startAutoRefresh() {
    if (this._coachRefreshTimer) clearInterval(this._coachRefreshTimer);
    // Heartbeat presence
    this._updateCoachPresence();
    this._coachRefreshTimer = setInterval(async () => {
      this._updateCoachPresence();
      // Refresh student grid if on home or students panel
      const homePanel = document.getElementById('coach-panel-home');
      const studPanel = document.getElementById('coach-panel-students');
      if ((homePanel && homePanel.classList.contains('active')) ||
          (studPanel && studPanel.classList.contains('active'))) {
        await this._refreshStudentGrid();
      }
      await this.updateProfile();
    }, 30000);
  },

  stopAutoRefresh() {
    if (this._coachRefreshTimer) { clearInterval(this._coachRefreshTimer); this._coachRefreshTimer = null; }
    this.stopSessionTimer();
  },

  _updateCoachPresence() {
    const cp = this.coachProfile;
    if (!cp) return;
    const presence = JSON.parse(localStorage.getItem('ck_live_presence') || '{}');
    presence[cp.id] = { name: cp.full_name, role: 'coach', lastSeen: Date.now() };
    localStorage.setItem('ck_live_presence', JSON.stringify(presence));
  },

  async _refreshStudentGrid() {
    const grid = document.getElementById('coachStudentsGrid');
    if (!grid) return;
    const students = (await CK.db.getProfiles('student')) || [];
    const coachName = (this.coachProfile?.full_name || '').toLowerCase();
    const myStudents = students.filter(s => s.coach && s.coach.toLowerCase() === coachName);
    if (!myStudents.length) {
      grid.innerHTML = '<div class="cls-empty" style="grid-column:1/-1;">No students assigned yet. Ask admin to assign students to your profile.</div>';
      return;
    }
    const _e = CK.esc || (s => s);
    const presence = JSON.parse(localStorage.getItem('ck_live_presence') || '{}');
    const now = Date.now();
    const colors = ['var(--p-teal)', 'var(--p-gold)', 'var(--p-blue)', 'var(--p-rose)'];
    grid.innerHTML = myStudents.map((s, i) => {
      const initial = s.full_name ? s.full_name.charAt(0).toUpperCase() : '♟';
      const p = presence[s.id];
      const isRecent = p && (now - p.lastSeen) < 300000; // 5 min
      const statusLabel = isRecent ? 'Online' : (s.status || 'Offline');
      const statusDot = isRecent ? 'online' : 'offline';
      const color = colors[i % colors.length];
      return `
        <div class="p-live-card ${statusDot}">
          <div class="p-live-avatar" style="background:rgba(255,255,255,0.06);color:${color};font-size:1.1rem;font-weight:700;border:2px solid ${color}20;position:relative;">
            ${initial}
            ${isRecent ? `<span style="position:absolute;bottom:0;right:0;width:9px;height:9px;background:var(--p-teal);border-radius:50%;border:2px solid var(--p-surface2);"></span>` : ''}
          </div>
          <div class="p-live-info">
            <div class="p-live-name">${_e(s.full_name)}</div>
            <div class="p-live-sub">${_e(s.level || 'Beginner')} · ${_e(String(s.rating || 800))} ELO · ${_e(String(s.puzzle || 0))} puzzles</div>
            <div class="p-live-status"><span class="p-status-dot ${statusDot}"></span> ${statusLabel}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button class="p-icon-btn" onclick="CK.coach.viewStudentMetrics('${s.id}')" title="View Progress">📊</button>
            <button class="p-icon-btn" onclick="CK.coach.quickNoteFor('${s.id}','${s.full_name?.replace(/'/g,"\\'")||''}')" title="Quick Note">📝</button>
          </div>
        </div>`;
    }).join('');
  },

  /* ── Session Timer ── */
  startSessionTimer() {
    this.stopSessionTimer();
    this._sessionSeconds = 0;
    this._sessionTimerInterval = setInterval(() => {
      this._sessionSeconds++;
      const el = document.getElementById('coachSessionTimer');
      if (el) {
        const h = Math.floor(this._sessionSeconds / 3600);
        const m = Math.floor((this._sessionSeconds % 3600) / 60);
        const s = this._sessionSeconds % 60;
        el.textContent = h > 0
          ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
          : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      }
    }, 1000);
  },

  stopSessionTimer() {
    if (this._sessionTimerInterval) { clearInterval(this._sessionTimerInterval); this._sessionTimerInterval = null; }
    this._sessionSeconds = 0;
    const el = document.getElementById('coachSessionTimer');
    if (el) el.textContent = '00:00';
  },

  /* ── Quick Note Shortcut ── */
  async quickNoteFor(_studentId, studentName) {
    const noteEl = document.getElementById('coach_note_student');
    const textEl = document.getElementById('coach_note_text');
    if (noteEl) noteEl.value = studentName;
    if (textEl) textEl.value = '';
    CK.openModal('coachNoteModal');
  },

  nav(panelId) {
    document.querySelectorAll('#coach-page .p-panel').forEach(p => p.classList.remove('active'));
    
    const target = document.getElementById(`coach-panel-${panelId}`);
    if (target) target.classList.add('active');
    
    document.querySelectorAll('#coach-page .p-nav-item').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('onclick')?.includes(`'${panelId}'`)) {
        btn.classList.add('active');
      }
    });
    
    const titles = {
      home: 'Coach Dashboard',
      session: 'Live Session',
      students: 'My Students',
      attendance: 'Mark Attendance',
      schedule: 'My Schedule',
      notes: 'Game Notes',
      puzzles: 'Assign Puzzles',
      resources: 'Homework & Notes',
      lab: 'PGN Teaching Studio',
      classroom: 'Classroom Manager',
      classes: 'My Classes',
      reports: 'Student Reports'
    };
    const titleEl = document.getElementById('coachPanelTitle');
    if (titleEl) titleEl.innerText = titles[panelId] || 'Dashboard';

    const topBtn = document.getElementById('coachTopBtn');
    if (topBtn) topBtn.style.display = (panelId === 'notes') ? 'block' : 'none';
    if (panelId === 'resources')  this.renderResources();
    if (panelId === 'schedule')   this.renderSchedulePro();
    if (panelId === 'notes')      this.initReportEditor();
    if (panelId === 'attendance') { this.loadAttendance(); this.loadAttendanceAdvanced(); }
    if (panelId === 'classes')    this.renderClassesPanel();
    if (panelId === 'reports')    this.renderReportsPanel();
    if (panelId === 'classroom' && window.CK && CK.classroom) CK.classroom.coachTab('assign');
  },

  /* ── Class Management Panel ── */
  async renderClassesPanel() {
    const cp = this.coachProfile || {};
    if (CK.classSystem) await CK.classSystem.renderCoachClasses('coachClassesList', cp.id);
  },

  createClass() {
    this.openCreateClassModal();
  },

  async openCreateClassModal() {
    const cp = this.coachProfile || {};
    if (CK.classSystem) {
      CK.classSystem.openClassModal(null, async (data) => {
        await CK.classSystem.createClass(data, cp.id, cp.full_name);
        await this.renderClassesPanel();
      });
    }
  },

  /* ── Schedule Pro Panel ── */
  async renderSchedulePro() {
    const cp = this.coachProfile || {};
    if (CK.schedulePro) await CK.schedulePro.renderCoachSchedule('coachSchedList', cp.id);
  },

  async createMeeting() {
    const cp = this.coachProfile || {};
    if (CK.schedulePro) await CK.schedulePro.createMeeting(cp.id, cp.full_name, 'coachSchedList');
  },

  /* ── Monthly Reports Panel ── */
  async renderReportsPanel() {
    const cp = this.coachProfile || {};
    if (CK.reportSystem) await CK.reportSystem.renderCoachReports('coachReportsList', cp.id, cp.full_name);
  },

  /* ── Attendance Panel (advanced) ── */
  async loadAttendanceAdvanced() {
    const cp = this.coachProfile || {};
    if (CK.classSystem) await CK.classSystem.renderAttendanceMarker('coachAttendanceMarker', cp.id);
  },

  async renderSchedule() {
    const links = window.CK && CK.batchManager ? await CK.batchManager.getLinks() : {};
    const tbody = document.querySelector('#coach-panel-schedule tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr><td>Monday</td><td>4:00 PM - 5:00 PM</td><td>Intermediate Strategy</td><td><span class="p-badge p-badge-blue">Intermediate</span></td><td><div style="font-family:monospace; margin-bottom:4px; color:var(--p-teal);">${links['Intermediate'] || 'https://meet.google.com/int-strategy-abc'}</div><button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.coach.editBatchLink('Intermediate')">✏️ Edit Room Link</button></td></tr>
        <tr><td>Tuesday</td><td>5:00 PM - 6:00 PM</td><td>Advanced Endgames</td><td><span class="p-badge p-badge-gold">Advanced</span></td><td><div style="font-family:monospace; margin-bottom:4px; color:var(--p-gold);">${links['Advanced'] || 'https://meet.google.com/adv-endgames-xyz'}</div><button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.coach.editBatchLink('Advanced')">✏️ Edit Room Link</button></td></tr>
        <tr><td>Friday</td><td>6:30 PM - 8:00 PM</td><td>Beginner Fundamentals</td><td><span class="p-badge p-badge-green">Beginner</span></td><td><div style="font-family:monospace; margin-bottom:4px; color:var(--p-online);">${links['Beginner'] || 'https://meet.google.com/beg-inner-room'}</div><button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.coach.editBatchLink('Beginner')">✏️ Edit Room Link</button></td></tr>
      `;
    }
  },

  async editBatchLink(batchLevel) {
    const links = window.CK && CK.batchManager ? await CK.batchManager.getLinks() : {};
    const newLink = prompt(`Enter Google Meet Class Room URL for ${batchLevel} Batch:`, links[batchLevel] || '');
    if (newLink && window.CK && CK.batchManager) {
      CK.batchManager.saveLink(batchLevel, newLink);
    }
  },

  async updateProfile() {
    const cp = this.coachProfile || {};
    const firstName = cp.full_name ? cp.full_name.split(' ')[0] : 'Coach';
    const initial = cp.full_name ? cp.full_name.split(' ').map(n => n[0]).join('') : 'CH';

    // Sidebar values
    const elName = document.getElementById('coachSidebarName');
    const elSub = document.getElementById('coachSidebarSub');
    const elAvatar = document.getElementById('coachSidebarAvatar');
    if (elName) elName.innerText = cp.full_name || 'Sarah Chess';
    if (elSub) elSub.innerText = `${cp.puzzle || 'Tactics Specialist'} · FIDE 2100`;
    if (elAvatar) elAvatar.innerText = initial;

    // Dynamic welcome banner greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const welcomeEl = document.getElementById('coachWelcomeSub');
    if (welcomeEl) welcomeEl.textContent = `${greeting}, ${firstName}! You have ${this.classesDb.length} classes scheduled today. Your students are ready to learn.`;

    // Stats counters
    const students = (await CK.db.getProfiles('student')) || [];
    const myStudents = students.filter(s => s.coach && s.coach.toLowerCase() === (cp.full_name || '').toLowerCase());

    const stStud = document.getElementById('coachStatStudents');
    const stAtt = document.getElementById('coachStatAttend');
    const stClass = document.getElementById('coachStatClasses');
    const stAvgElo = document.getElementById('coachStatAvgElo');
    if (stStud) stStud.innerText = myStudents.length || 0;
    if (stAvgElo && myStudents.length) {
      const avg = Math.round(myStudents.reduce((s, u) => s + (parseInt(u.rating) || 800), 0) / myStudents.length);
      stAvgElo.innerText = avg;
    }
    if (stAtt) {
      const attAdv = (await CK.db.getAttendance()) || [];
      const myStudentIds = new Set(myStudents.map(s => s.id));
      const myRecords = attAdv.filter(r => myStudentIds.has(r.userid) || myStudentIds.has(r.studentId) || myStudentIds.has(r.student_id));
      const attPct = myRecords.length > 0
        ? Math.round(myRecords.filter(r => r.status === 'present').length / myRecords.length * 100)
        : 96;
      stAtt.innerText = attPct + '%';
    }
    if (stClass) stClass.innerText = this.classesDb.length || 0;
  },

  async markAllPresentToday() {
    const cp = this.coachProfile || {};
    const students = (await CK.db.getProfiles('student')) || [];
    const myStudents = students.filter(s => s.coach && s.coach.toLowerCase() === (cp.full_name || '').toLowerCase());
    const todayStr = new Date().toISOString().split('T')[0];
    for (const s of myStudents) {
      await CK.db.saveAttendance({ userid: s.id, date: todayStr, status: 'present', coachId: cp.id, coachName: cp.full_name });
    }
    await this.loadAttendance();
    CK.showToast(`All ${myStudents.length} students marked Present for today!`, 'success');
  },

  async renderResources() {
    const container = document.getElementById('coachResourcesContainer');
    if (!container) return;

    const resources = await CK.db.getResources();

    if (resources.length === 0) {
      container.innerHTML = '<div class="cls-empty">📚 No resources uploaded yet. Use the Admin panel to upload learning materials.</div>';
      return;
    }

    // Group by Batch
    const grouped = resources.reduce((acc, res) => {
      const b = res.batch || 'Unassigned';
      if (!acc[b]) acc[b] = [];
      acc[b].push(res);
      return acc;
    }, {});

    let html = '';
    
    for (const [batchStr, files] of Object.entries(grouped)) {
      html += `
        <div style="margin-bottom: 24px;">
          <h4 style="font-family: var(--font-display); font-size: 1.2rem; color: var(--p-gold); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
            Batch ${batchStr}
          </h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
      `;
      
      files.forEach(f => {
        const typeBadge = f.type === 'Homework' ? 'p-badge-rose' : 'p-badge-blue';
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:var(--p-surface3); border-radius:8px;">
              <div>
                <div style="font-weight:600; color:var(--p-text); display:flex; align-items:center; gap:8px;">
                  📄 ${f.name} <span class="p-badge ${typeBadge}" style="font-size:0.7rem; padding: 2px 6px;">${f.type || 'Material'}</span>
                </div>
                <div style="font-size:0.85rem; color:var(--p-text-muted); margin-top:4px;">📝 Note: ${(CK.esc||((s)=>s))(f.notes)}</div>
              </div>
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.showToast('Downloading...', 'success')">Download</button>
            </div>
        `;
      });
      
      html += `</div></div>`;
    }

    container.innerHTML = html;
  },

  async renderDashboard() {
    // 1. Load today's class schedule
    const tbody = document.getElementById('coachTodayClasses');
    if (tbody) {
      const levelBadge = { Beginner: 'p-badge-green', Intermediate: 'p-badge-blue', Advanced: 'p-badge-gold' };
      tbody.innerHTML = this.classesDb.map(c => `
        <tr>
          <td style="font-weight:700; color:var(--p-text);">${c.class}</td>
          <td><span class="p-badge ${levelBadge[c.level] || 'p-badge-blue'}">${c.level}</span></td>
          <td style="color:var(--p-gold); font-weight:600;">${c.time}</td>
          <td><span style="font-size:0.85rem; color:var(--p-text-muted);">👥 ${c.students} students</span></td>
          <td><span class="p-badge p-badge-green">${c.status}</span></td>
          <td><button class="p-btn p-btn-teal p-btn-sm" onclick="CK.coach.startSession('${c.id}')">▶ Start</button></td>
        </tr>
      `).join('');
    }

    // 2. Load assigned students grid with real-time presence
    const grid = document.getElementById('coachStudentsGrid');
    if (grid) {
      const students = (await CK.db.getProfiles('student')) || [];
      const myStudents = students.filter(s => s.coach === (this.coachProfile ? this.coachProfile.full_name : ''));

      if (myStudents.length === 0) {
        grid.innerHTML = '<div class="cls-empty">No students currently assigned to you.</div>';
      } else {
        // Use the shared refresh method
        await this._refreshStudentGrid();
      }

      // Student summary stats
      const summaryEl = document.getElementById('coachStudentsSummary');
      if (summaryEl && myStudents.length) {
        const avgRating = Math.round(myStudents.reduce((s, u) => s + (parseInt(u.rating) || 800), 0) / myStudents.length);
        const totalPuzzles = myStudents.reduce((s, u) => s + (parseInt(u.puzzle) || 0), 0);
        const paidCount = myStudents.filter(s => s.status === 'Paid').length;
        summaryEl.innerHTML = `
          <span style="color:var(--p-teal);font-weight:700;">${myStudents.length}</span> students assigned ·
          Avg ELO <span style="color:var(--p-gold);font-weight:700;">${avgRating}</span> ·
          <span style="color:var(--p-blue);font-weight:700;">${totalPuzzles}</span> puzzles solved ·
          <span style="color:var(--p-teal);font-weight:700;">${paidCount}/${myStudents.length}</span> fees paid`;
      }
    }
  },

  async loadAttendance() {
    const tbody = document.getElementById('coachAttendanceTable');
    if (!tbody) return;

    const dateInput = document.getElementById('coachAttendanceDate');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    const coachName = (this.coachProfile?.full_name || '').toLowerCase();
    const students = (await CK.db.getProfiles('student')) || [];
    const myStudents = students.filter(s => s.coach && s.coach.toLowerCase() === coachName);
    const attendanceLogs = (await CK.db.getAttendance(null, selectedDate)) || [];

    const attendanceMap = {};
    attendanceLogs.forEach(l => { attendanceMap[l.userid] = l.status; });

    if (myStudents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="cls-empty">📅 No students assigned to you yet.</div></td></tr>';
      return;
    }

    // Stats summary for attendance panel
    const presentCount = Object.values(attendanceMap).filter(v => v === 'present').length;
    const summaryEl = document.getElementById('coachAttendanceSummary');
    if (summaryEl) {
      summaryEl.innerHTML = `${selectedDate} · <span style="color:var(--p-teal);font-weight:700;">${presentCount} present</span> of <span style="font-weight:700;">${myStudents.length}</span> students`;
    }

    const _e = CK.esc || (s => s);
    tbody.innerHTML = myStudents.map(s => {
      const currentStatus = attendanceMap[s.id] || 'pending';
      const levelBatch = s.level === 'Beginner' ? 'Beginner Fundamentals' : s.level === 'Advanced' ? 'Advanced Endgames' : 'Intermediate Strategy';
      const badgeCls = currentStatus === 'present' ? 'p-badge-green' : currentStatus === 'absent' ? 'p-badge-red' : 'p-badge-ghost';
      return `
        <tr id="coach_att_row_${_e(s.id)}">
          <td style="font-weight:700;">${_e(s.full_name)}</td>
          <td><span class="p-badge p-badge-blue" style="font-size:0.75rem;">${_e(s.level || 'Beginner')}</span></td>
          <td style="font-size:0.85rem; color:var(--p-text-muted);">${levelBatch}</td>
          <td style="font-size:0.85rem; color:var(--p-text-muted);">${selectedDate}</td>
          <td><span class="p-badge ${badgeCls}" id="coach_att_badge_${s.id}">${currentStatus === 'present' ? '✅ Present' : currentStatus === 'absent' ? '❌ Absent' : '⏳ Pending'}</span></td>
          <td style="display:flex;gap:6px;align-items:center;">
            <button class="p-btn p-btn-teal p-btn-sm" onclick="CK.coach.markAttendance('${s.id}','${selectedDate}','present')"
                    style="${currentStatus === 'present' ? 'opacity:1;' : 'opacity:0.4;'}">✅</button>
            <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.coach.markAttendance('${s.id}','${selectedDate}','absent')"
                    style="${currentStatus === 'absent' ? 'opacity:1;' : 'opacity:0.4;'}">❌</button>
            <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.coach.markAttendance('${s.id}','${selectedDate}','pending')"
                    style="${currentStatus === 'pending' ? 'opacity:1;' : 'opacity:0.3;'}">⏳</button>
          </td>
        </tr>`;
    }).join('');
  },

  async markAttendance(studentId, date, status) {
    await CK.db.saveAttendance({ userid: studentId, date, status, coachId: this.coachProfile?.id, coachName: this.coachProfile?.full_name });
    // Update badge in-place without full reload
    const badge = document.getElementById(`coach_att_badge_${studentId}`);
    if (badge) {
      badge.className = `p-badge ${status === 'present' ? 'p-badge-green' : status === 'absent' ? 'p-badge-red' : 'p-badge-ghost'}`;
      badge.textContent = status === 'present' ? '✅ Present' : status === 'absent' ? '❌ Absent' : '⏳ Pending';
    }
    // Update button opacities
    const row = document.getElementById(`coach_att_row_${studentId}`);
    if (row) {
      row.querySelectorAll('button').forEach((btn, i) => {
        const btnStatus = ['present','absent','pending'][i];
        btn.style.opacity = btnStatus === status ? '1' : '0.35';
      });
    }
    CK.showToast(`${status === 'present' ? 'Marked Present' : status === 'absent' ? 'Marked Absent' : 'Reset'} — auto-saved!`, 'success');
  },

  async viewStudentMetrics(studentId) {
    const students = (await CK.db.getProfiles('student')) || [];
    const s = students.find(u => u.id === studentId);
    if (!s) return;

    const rc = s.report_card || {};
    const stats = [
      { label: 'Opening', val: rc.opening ?? 84 },
      { label: 'Middlegame', val: rc.middlegame ?? 76 },
      { label: 'Tactics', val: rc.tactics ?? 88 },
      { label: 'Endgame', val: rc.endgame ?? 62 },
      { label: 'Time Mgmt', val: rc.time ?? 71 },
      { label: 'Sportsmanship', val: rc.sports ?? 95 }
    ];
    const bars = stats.map(st => {
      const color = st.val >= 85 ? 'var(--p-teal)' : st.val >= 70 ? 'var(--p-gold)' : 'var(--p-rose)';
      return `<div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:3px;">
          <span style="color:var(--p-text-muted)">${st.label}</span>
          <span style="color:${color};font-weight:700">${st.val}%</span>
        </div>
        <div style="height:7px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${st.val}%;background:${color};border-radius:4px;transition:width .6s ease;"></div>
        </div>
      </div>`;
    }).join('');

    const modal = document.getElementById('coachMetricsModal');
    if (modal) {
      const nameEl = modal.querySelector('#metricsStudentName');
      const barsEl = modal.querySelector('#metricsBars');
      const ratingEl = modal.querySelector('#metricsRating');
      if (nameEl) nameEl.textContent = s.full_name;
      if (ratingEl) ratingEl.textContent = `ELO ${s.rating || 800} · ${s.level || 'Beginner'} · ${s.puzzle || 0} puzzles solved`;
      if (barsEl) barsEl.innerHTML = bars;
      CK.openModal('coachMetricsModal');
    } else {
      CK.showToast(`${s.full_name}: Rating ${s.rating || 800} · Puzzles ${s.puzzle || 0} · Level ${s.level || 'Beginner'}`, 'info');
    }
  },

  getGrade(mark) {
    const n = parseInt(mark) || 0;
    if (n >= 90) return 'A+';
    if (n >= 80) return 'A';
    if (n >= 70) return 'B';
    if (n >= 60) return 'C';
    return 'D';
  },

  startSession(classId) {
    const c = this.classesDb.find(x => x.id === classId);
    if (!c) return;

    this.nav('session');
    const nameEl = document.getElementById('coachSessionName');
    const subEl = document.getElementById('coachSessionSub');
    const cmdEl = document.getElementById('coachCommandCenter');
    if (nameEl) nameEl.innerText = c.class;
    if (subEl) subEl.innerText = `${c.level} · ${c.students} Students Connected`;
    if (cmdEl) cmdEl.style.display = 'grid';
    if (CK.renderVaultBoard) CK.renderVaultBoard();
    this.startSessionTimer();
    CK.showToast("Live session started — timer running!", "success");
  },

  toggleSession() {
    const btn = document.getElementById('coachStartBtn');
    if (!btn) return;
    const cmdEl = document.getElementById('coachCommandCenter');
    if (btn.innerText.includes('Start') || btn.innerText.includes('Resume')) {
      btn.innerText = '⏸ Pause Command Center';
      btn.classList.remove('p-btn-teal');
      btn.classList.add('p-btn-ghost');
      if (cmdEl) cmdEl.style.display = 'grid';
      if (CK.renderVaultBoard) CK.renderVaultBoard();
      this.startSessionTimer();
      CK.showToast("Triple-Pane Command Center started!", "success");
    } else {
      btn.innerText = '▶ Resume Command Center';
      btn.classList.remove('p-btn-ghost');
      btn.classList.add('p-btn-teal');
      this.stopSessionTimer();
      CK.showToast("Command Center paused", "info");
    }
  },

  endSession() {
    const cmdEl = document.getElementById('coachCommandCenter');
    if (cmdEl) cmdEl.style.display = 'none';
    const btn = document.getElementById('coachStartBtn');
    if (btn) {
      btn.innerText = '▶ Start Live Command Center';
      btn.classList.remove('p-btn-ghost');
      btn.classList.add('p-btn-teal');
    }
    this.stopSessionTimer();
    CK.showToast("Live session ended successfully", "info");
  },

  async topAction() {
    const select = document.getElementById('coach_note_student');
    if (select) {
      const students = (await CK.db.getProfiles('student')) || [];
      const coachName = (this.coachProfile?.full_name || '').toLowerCase();
      const myStudents = students.filter(s => s.coach && s.coach.toLowerCase() === coachName);
      const _e = CK.esc || (s => s);
      select.innerHTML = myStudents.map(s => `<option value="${_e(s.full_name)}">${_e(s.full_name)}</option>`).join('');
    }
    CK.openModal('coachNoteModal');
  },

  async saveNote() {
    const nameEl = document.getElementById('coach_note_student');
    const textEl = document.getElementById('coach_note_text');
    const name   = nameEl ? nameEl.value : '';
    const text   = textEl ? textEl.value : '';
    if (!text) return CK.showToast('Note content is required', 'error');

    await CK.tracker.addReview({
      student: name,
      text: text,
      coach: this.coachProfile?.full_name || ''
    });

    CK.showToast('Game assessment note saved successfully! ELO accuracy updated.', 'success');
    CK.closeModal('coachNoteModal');
    if (textEl) textEl.value = '';
  },

  async initReportEditor() {
    const select = document.getElementById('coachReportStudentSelect');
    if (!select) return;
    const students = (await CK.db.getProfiles('student')) || [];
    const coachName = (this.coachProfile?.full_name || '').toLowerCase();
    const myStudents = students.filter(s => s.coach && s.coach.toLowerCase() === coachName);
    const _e = CK.esc || (s => s);
    select.innerHTML = myStudents.map(s => `<option value="${_e(s.full_name)}">${_e(s.full_name)}</option>`).join('');
    if (myStudents.length > 0) {
      this.loadStudentReport(myStudents[0].full_name);
    }
  },

  async loadStudentReport(studentName) {
    const students = (await CK.db.getProfiles('student')) || [];
    const s = students.find(u => u.full_name === studentName);
    if (!s) return;
    const rc = s.report_card || {
      opening: 84,
      middlegame: 76,
      tactics: 88,
      endgame: 62,
      time: 71,
      sports: 95,
      remarks: "Excellent concentration and tactical calculation. Shows great promise when navigating complex middlegame positions.",
      goals: ["Participate in State Level Rapid U-14", "Master Lucena and Philidor Rook Endgames", "Maintain blunder rate under 3% in tournaments"]
    };
    const setRep = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    setRep('rep_opening',    rc.opening);
    setRep('rep_middlegame', rc.middlegame);
    setRep('rep_tactics',    rc.tactics);
    setRep('rep_endgame',    rc.endgame);
    setRep('rep_time',       rc.time);
    setRep('rep_sports',     rc.sports);
    setRep('rep_remarks',    rc.remarks);
    setRep('rep_goals',      Array.isArray(rc.goals) ? rc.goals.join(', ') : rc.goals);
  },

  async saveStudentReport() {
    const selectEl = document.getElementById('coachReportStudentSelect');
    const studentName = selectEl ? selectEl.value : '';
    const students = (await CK.db.getProfiles('student')) || [];
    const s = students.find(u => u.full_name === studentName);
    if (!s) return CK.showToast("Student profile not found", "error");

    const getV = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    const goalsVal = getV('rep_goals');
    s.report_card = {
      opening:    Number(getV('rep_opening'))    || 0,
      middlegame: Number(getV('rep_middlegame'))  || 0,
      tactics:    Number(getV('rep_tactics'))     || 0,
      endgame:    Number(getV('rep_endgame'))     || 0,
      time:       Number(getV('rep_time'))        || 0,
      sports:     Number(getV('rep_sports'))      || 0,
      remarks:    getV('rep_remarks'),
      goals: goalsVal ? goalsVal.split(',').map(x => x.trim()) : []
    };

    await CK.db.saveProfile(s);
    CK.showToast(`Weekly Report Card saved for ${studentName}!`, "success");
  },

  openPuzzleCreator() {
    const modal = document.getElementById('coachPuzzleCreatorModal');
    if (modal) modal.style.display = 'flex';
  },

  closePuzzleCreator() {
    const modal = document.getElementById('coachPuzzleCreatorModal');
    if (modal) modal.style.display = 'none';
  },

  async savePuzzle() {
    const getV = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const title = getV('cpzTitle');
    const fen   = getV('cpzFen');
    const sol   = getV('cpzSolution');
    const diff  = getV('cpzDiff');
    const cat   = getV('cpzCategory');
    const expl  = getV('cpzExplanation');

    if (!title || !sol) {
      CK.showToast('Please fill in at least the Title and Solution fields.', 'warning');
      return;
    }

    const puzzle = {
      id: 'CPZ' + Date.now(),
      name: title,
      fen: fen || null,
      solution: sol,
      difficulty: diff,
      category: cat,
      explanation: expl,
      type: 'Puzzle',
      notes: `By ${this.coachProfile ? this.coachProfile.full_name : 'Coach'} — ${cat || 'Tactics'}`,
      batch: 0, // available to all batches
      created_at: new Date().toISOString()
    };

    // Save via DB layer so it syncs to Supabase and student portal can see it
    await CK.db.saveResource(puzzle);

    // Reset form
    ['cpzTitle','cpzFen','cpzSolution','cpzExplanation'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    this.closePuzzleCreator();
    CK.showToast(`Puzzle "${title}" created and saved to library!`, 'success');
  }
};