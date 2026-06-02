/* assets/js/coach.js ------------------------------------------------------
   ChessKidoo Coach Portal Logic
   Fully connected to CK.db unified layer, supporting dynamic teacher profile,
   live session controls, real-time assigned students loading, and game note taking.
   ------------------------------------------------------------------------- */

CK.coach = {
  coachProfile: null,
  classesDb: [],

  async init() {

    // 1. Fetch current coach profile dynamically (trust cached ck_user; no scary toast)
    let currentUser = CK.currentUser;
    if (!currentUser) {
      try { currentUser = JSON.parse(localStorage.getItem('ck_user') || 'null'); } catch (_) {}
      if (currentUser) CK.currentUser = currentUser;
    }
    if (!currentUser) {
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
            <div style="margin-top:6px; font-size:0.8rem; color:var(--p-text-muted);">
              Batch: <input type="text" value="${_e(s.batch || '')}" placeholder="Assign Batch" style="background:var(--p-surface1); border:1px solid rgba(255,255,255,0.1); color:var(--p-text); padding:2px 6px; border-radius:4px; font-size:0.8rem; width:100px;" onchange="CK.coach.updateStudentBatch('${_e(String(s.id))}', this.value)">
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button class="p-icon-btn" data-sid="${_e(String(s.id))}" onclick="CK.coach.viewStudentMetrics(this.dataset.sid)" title="View Progress">📊</button>
            <button class="p-icon-btn" data-sid="${_e(String(s.id))}" data-sname="${_e(s.full_name || '')}" onclick="CK.coach.quickNoteFor(this.dataset.sid,this.dataset.sname)" title="Quick Note">📝</button>
          </div>
        </div>`;
    }).join('');
  },

  async updateStudentBatch(studentId, batchStr) {
    const students = await CK.db.getProfiles('student');
    const s = students.find(x => x.id === studentId);
    if (s) {
      s.batch = batchStr.trim();
      await CK.db.saveProfile(s);
      CK.showToast(`Batch updated to "${s.batch}" for ${s.full_name}`, 'success');
      this._refreshStudentGrid();
    }
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
      effectiveness: 'My Effectiveness',
      reports: 'Student Reports'
    };
    const titleEl = document.getElementById('coachPanelTitle');
    if (titleEl) titleEl.innerText = titles[panelId] || 'Dashboard';

    const topBtn = document.getElementById('coachTopBtn');
    if (topBtn) topBtn.style.display = 'none'; // We use inline form now
    if (panelId === 'resources')  this.renderResources();
    if (panelId === 'schedule')   this.renderSchedulePro();
    if (panelId === 'notes')      { this.initReportEditor(); this.loadCoachNotes(); this.initInlineNoteForm(); }
    if (panelId === 'attendance') { this.loadAttendance(); this.loadAttendanceAdvanced(); }
    if (panelId === 'classes')    this.renderClassesPanel();
    if (panelId === 'reports')    this.renderReportsPanel();
    if (panelId === 'effectiveness') this.renderEffectivenessPanel();
    if (panelId === 'classroom' && window.CK && CK.classroom) CK.classroom.coachTab('assign');
    if (panelId === 'lab' && window.CK && CK.lab) setTimeout(() => CK.lab.initBoard('coachLabBoard'), 100);
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
      const _e = CK.esc || (s => s);
      tbody.innerHTML = `
        <tr><td>Monday</td><td>4:00 PM - 5:00 PM</td><td>Intermediate Strategy</td><td><span class="p-badge p-badge-blue">Intermediate</span></td><td><div style="font-family:monospace; margin-bottom:4px; color:var(--p-teal);">${_e(links['Intermediate'] || 'https://meet.google.com/int-strategy-abc')}</div><button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.coach.editBatchLink('Intermediate')">✏️ Edit Room Link</button></td></tr>
        <tr><td>Tuesday</td><td>5:00 PM - 6:00 PM</td><td>Advanced Endgames</td><td><span class="p-badge p-badge-gold">Advanced</span></td><td><div style="font-family:monospace; margin-bottom:4px; color:var(--p-gold);">${_e(links['Advanced'] || 'https://meet.google.com/adv-endgames-xyz')}</div><button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.coach.editBatchLink('Advanced')">✏️ Edit Room Link</button></td></tr>
        <tr><td>Friday</td><td>6:30 PM - 8:00 PM</td><td>Beginner Fundamentals</td><td><span class="p-badge p-badge-green">Beginner</span></td><td><div style="font-family:monospace; margin-bottom:4px; color:var(--p-online);">${_e(links['Beginner'] || 'https://meet.google.com/beg-inner-room')}</div><button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.coach.editBatchLink('Beginner')">✏️ Edit Room Link</button></td></tr>
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
    if (elName) elName.innerText = cp.full_name || '—';
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

    const resources = await CK.db.getDocuments();

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
      
      const _e = CK.esc || (s => s);
      files.forEach(f => {
        const typeBadge = f.type === 'Homework' ? 'p-badge-rose' : 'p-badge-blue';
        // Resolve the openable URL: explicit url > Supabase storage public url > stored file_name-as-link
        const storageUrl = f.file_name && window.supabaseClient && !/^https?:/i.test(f.file_name || '')
          ? (window.supabaseClient.storage.from('documents').getPublicUrl(f.file_name).data?.publicUrl || '')
          : '';
        const fileUrl = f.url || storageUrl || (/^https?:/i.test(f.file_name || '') ? f.file_name : '');
        const refLink = f.link || '';
        const fileBtn = fileUrl
          ? `<button class="p-btn p-btn-ghost p-btn-sm" onclick="window.open('${_e(fileUrl)}','_blank')">📄 Open</button>`
          : `<button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.showToast('File not available yet.','error')">📄 Open</button>`;
        const linkBtn = refLink
          ? `<button class="p-btn p-btn-blue p-btn-sm" onclick="window.open('${_e(refLink)}','_blank')">🔗 Link</button>`
          : '';
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:15px; background:var(--p-surface3); border-radius:8px;">
              <div style="min-width:0;">
                <div style="font-weight:600; color:var(--p-text); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  📄 ${_e(f.name)} <span class="p-badge ${typeBadge}" style="font-size:0.7rem; padding: 2px 6px;">${_e(f.type || 'Material')}</span>
                  ${f.difficulty ? `<span class="p-badge p-badge-gold" style="font-size:0.7rem;padding:2px 6px;">${_e(f.difficulty)}</span>` : ''}
                </div>
                ${f.notes ? `<div style="font-size:0.85rem; color:var(--p-text-muted); margin-top:4px;">📝 ${_e(f.notes)}</div>` : ''}
                ${refLink ? `<div style="font-size:0.78rem; color:var(--p-blue); margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:320px;">🔗 ${_e(refLink)}</div>` : ''}
              </div>
              <div style="display:flex; gap:6px; flex-shrink:0;">${linkBtn}${fileBtn}</div>
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
          <td><span class="p-badge ${badgeCls}" id="${_e('coach_att_badge_' + s.id)}">${currentStatus === 'present' ? '✅ Present' : currentStatus === 'absent' ? '❌ Absent' : '⏳ Pending'}</span></td>
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

  async startSession(classId) {
    const c = this.classesDb.find(x => x.id === classId);
    if (!c) return;

    // Persist live status so students can detect the active session
    try {
      const meetings = await CK.db.getMeetings();
      const match = meetings.find(m => m.id === classId || m.title === c.class || m.title === c.title);
      if (match) {
        match.status = 'live';
        match.liveStartedAt = new Date().toISOString();
        await CK.db.saveMeeting(match);
      }
    } catch(e) {}

    // Auto-record coach attendance
    try {
      const coachId = window.CK?.currentUser?.id || window.CK?.currentUser?.userid || 'coach';
      if (window.CK?.db?.recordCoachAttendance) {
        await CK.db.recordCoachAttendance(coachId, classId);
      }
    } catch (err) {
      console.warn("[Coach Attendance] Failed to record coach attendance:", err);
    }

    this.nav('session');
    const nameEl = document.getElementById('coachSessionName');
    const subEl = document.getElementById('coachSessionSub');
    const cmdEl = document.getElementById('coachCommandCenter');
    if (nameEl) nameEl.innerText = c.class || c.title;
    if (subEl) subEl.innerText = `${c.level} · ${c.students || 0} Students Connected`;
    if (cmdEl) cmdEl.style.display = 'grid';
    if (CK.renderVaultBoard) CK.renderVaultBoard();
    this.startSessionTimer();
    this._liveClassId = classId;

    // Update WebRTC stream controls visibility
    if (window.CK && CK.webrtc && CK.webrtc.toggleStreamButtons) {
      CK.webrtc.toggleStreamButtons(CK.webrtc.isBroadcasting());
    }

    CK.showToast("Live session started — timer running!", "success");
  },

  _updatePresenceCount() {
    const el = document.querySelector('#coachCommandCenter [data-presence]');
    try {
      const presence = JSON.parse(localStorage.getItem('ck_live_presence') || '{}');
      const active = Object.values(presence).filter(u => u.role === 'student' && Date.now() - (u.lastSeen || 0) < 300000).length;
      if (el) el.textContent = active + ' Active';
    } catch (_) { console.warn('[CK] presence data parse error', _); }
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
      this._updatePresenceCount();
      clearInterval(this._presenceInterval);
      this._presenceInterval = setInterval(() => this._updatePresenceCount(), 30000);

      // Update WebRTC stream controls visibility
      if (window.CK && CK.webrtc && CK.webrtc.toggleStreamButtons) {
        CK.webrtc.toggleStreamButtons(CK.webrtc.isBroadcasting());
      }

      CK.showToast("Triple-Pane Command Center started!", "success");
    } else {
      btn.innerText = '▶ Resume Command Center';
      btn.classList.remove('p-btn-ghost');
      btn.classList.add('p-btn-teal');
      this.stopSessionTimer();
      clearInterval(this._presenceInterval);

      // Update WebRTC stream controls visibility (hide CC buttons on pause)
      if (window.CK && CK.webrtc && CK.webrtc.toggleStreamButtons) {
        CK.webrtc.toggleStreamButtons(false);
      }

      CK.showToast("Command Center paused", "info");
    }
  },

  async endSession() {
    // Stop WebRTC broadcast
    if (window.CK && CK.webrtc && CK.webrtc.stopBroadcast) {
      CK.webrtc.stopBroadcast();
    }

    // Clear live status in DB
    if (this._liveClassId) {
      try {
        const meetings = await CK.db.getMeetings();
        const match = meetings.find(m => m.id === this._liveClassId);
        if (match) {
          match.status = 'ended';
          match.liveStartedAt = null;
          await CK.db.saveMeeting(match);
        }
      } catch(e) {}

      // Run attendance sweep for students who did not join
      try {
        const coachName = window.CK?.currentUser?.full_name || 'Coach';
        const classId = this._liveClassId;
        let className = 'Chess Class';
        const c = this.classesDb.find(x => x.id === classId);
        if (c) {
          className = c.class || c.title || className;
        }
        if (window.CK?.db?.runAttendanceSweep) {
          await CK.db.runAttendanceSweep(coachName, classId, className);
        }
      } catch (err) {
        console.warn("[Attendance Sweep] Failed to run attendance sweep:", err);
      }

      this._liveClassId = null;
    }
    const cmdEl = document.getElementById('coachCommandCenter');
    if (cmdEl) cmdEl.style.display = 'none';
    const btn = document.getElementById('coachStartBtn');
    if (btn) {
      btn.innerText = '▶ Start Live Command Center';
      btn.classList.remove('p-btn-ghost');
      btn.classList.add('p-btn-teal');
    }
    this.stopSessionTimer();
    clearInterval(this._presenceInterval);
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

    const deltaEl = document.getElementById('coach_note_rating_delta');
    const ratingDelta = Math.max(-500, Math.min(500, parseInt(deltaEl?.value || '0') || 0));

    await CK.tracker.addReview({
      student: name,
      text: text,
      coach: this.coachProfile?.full_name || '',
      ratingDelta
    });

    const deltaMsg = ratingDelta !== 0 ? ` (Rating ${ratingDelta > 0 ? '+' : ''}${ratingDelta} ELO)` : '';
    CK.showToast(`Game note saved${deltaMsg}!`, 'success');
    CK.closeModal('coachNoteModal');
    if (textEl) textEl.value = '';
    if (deltaEl) deltaEl.value = '0';
  },

  async initInlineNoteForm() {
    const select = document.getElementById('coach_inline_note_student');
    if (!select) return;
    const students = (await CK.db.getProfiles('student')) || [];
    const coachName = (this.coachProfile?.full_name || '').toLowerCase();
    const myStudents = students.filter(s => s.coach && s.coach.toLowerCase() === coachName);
    const _e = CK.esc || (s => s);
    select.innerHTML = myStudents.map(s => `<option value="${_e(s.full_name)}">${_e(s.full_name)}</option>`).join('');
  },

  async saveInlineNote() {
    const nameEl = document.getElementById('coach_inline_note_student');
    const textEl = document.getElementById('coach_inline_note_text');
    const deltaEl = document.getElementById('coach_inline_note_rating_delta');
    
    const name = nameEl ? nameEl.value : '';
    const text = textEl ? textEl.value : '';
    if (!text) return CK.showToast('Note content is required', 'error');

    const ratingDelta = Math.max(-500, Math.min(500, parseInt(deltaEl?.value || '0') || 0));

    await CK.tracker.addReview({
      student: name,
      text: text,
      coach: this.coachProfile?.full_name || '',
      ratingDelta
    });

    const deltaMsg = ratingDelta !== 0 ? ` (Rating ${ratingDelta > 0 ? '+' : ''}${ratingDelta} ELO)` : '';
    CK.showToast(`Personalized Note sent to ${name}'s inbox!${deltaMsg}`, 'success');
    
    if (textEl) textEl.value = '';
    if (deltaEl) deltaEl.value = '0';
    this.loadCoachNotes();
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

  async loadCoachNotes() {
    const el = document.getElementById('coachNotesContainer');
    if (!el) return;
    const _e = CK.esc || (s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'));
    const coachName = this.coachProfile?.full_name || CK.currentUser?.full_name || '';
    const all = (await CK.tracker?.getReviews()) || [];
    const mine = coachName
      ? all.filter(f => (f.coach || '').toLowerCase() === coachName.toLowerCase())
      : all;
    if (!mine.length) {
      el.innerHTML = '<div style="text-align:center;opacity:.45;padding:30px;">No notes yet — add an assessment above.</div>';
      return;
    }
    const fmt = ts => {
      if (!ts) return '—';
      const d = new Date(ts);
      return isNaN(d.getTime()) ? ts : d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
    };
    el.innerHTML = mine.slice(0, 20).map(f => `
      <div class="p-review-note" style="position:relative;">
        <div class="p-review-note-header">
          <span class="p-review-note-coach">🧑‍🎓 ${_e(f.student || f.studentName || '—')}</span>
          <span class="p-review-note-date">${_e(fmt(f.created_at || f.date))}</span>
        </div>
        <p class="p-review-note-text">"${_e(f.note || f.text || f.body || '')}"</p>
        <button style="position:absolute;top:10px;right:10px;background:none;border:none;color:var(--p-text-muted);cursor:pointer;font-size:0.8rem;" data-fbid="${_e(f.id)}" onclick="CK.coach._deleteFeedback(this.dataset.fbid)">✕</button>
      </div>
    `).join('');
  },

  async _deleteFeedback(id) {
    if (!id) return;
    if (CK.tracker && typeof CK.tracker.deleteReview === 'function') {
      await CK.tracker.deleteReview(id);
    }
    this.loadCoachNotes();
    CK.showToast('Note deleted.', 'success');
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

  openPuzzleCreatorFromLab() {
    if (!window.CK || !CK.lab || !CK.lab.board) {
      CK.showToast("Please open a position on the board first", "error");
      return;
    }
    const currentFen = CK.lab.board.fen();
    this.openPuzzleCreator();
    setTimeout(() => {
      const fenEl = document.getElementById('cpzFen');
      if (fenEl) fenEl.value = currentFen;
    }, 100);
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
  },

  /* ── Effectiveness Panel ── */
  async renderEffectivenessPanel() {
    const coachName = CK.currentUser?.full_name || 'Coach';
    const _e = CK.esc || (s => s);
    const allStudents = (await CK.db.getProfiles('student')) || [];

    // Effectiveness scorecard
    const cardEl = document.getElementById('coachEffectivenessCard');
    if (cardEl && !CK.ai) {
      const myStudents = allStudents.filter(s => (s.coach || '').toLowerCase() === coachName.toLowerCase());
      const avgRating = myStudents.length ? Math.round(myStudents.reduce((s, u) => s + (parseInt(u.rating) || 800), 0) / myStudents.length) : 0;
      const paidPct = myStudents.length ? Math.round(myStudents.filter(s => s.status === 'Paid').length / myStudents.length * 100) : 0;
      cardEl.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:16px; text-align:center;">
          <div style="padding:16px;border-radius:10px;background:rgba(255,255,255,0.03);"><div style="font-size:2rem;font-weight:900;color:var(--p-teal);">${myStudents.length}</div><div style="font-size:0.75rem;color:var(--p-text-muted);">Students</div></div>
          <div style="padding:16px;border-radius:10px;background:rgba(255,255,255,0.03);"><div style="font-size:2rem;font-weight:900;color:var(--p-gold);">${avgRating}</div><div style="font-size:0.75rem;color:var(--p-text-muted);">Avg ELO</div></div>
          <div style="padding:16px;border-radius:10px;background:rgba(255,255,255,0.03);"><div style="font-size:2rem;font-weight:900;">${paidPct}%</div><div style="font-size:0.75rem;color:var(--p-text-muted);">Retention</div></div>
        </div>`;
    }
    if (cardEl && CK.ai) {
      const eff = await CK.ai.getCoachEffectiveness(coachName);
      if (!eff) { cardEl.innerHTML = '<div style="text-align:center;opacity:.4;padding:30px;">No students assigned yet</div>'; return; }
      const gradeColors = { 'A+': '#22c55e', A: '#22c55e', B: '#3b82f6', C: '#f59e0b', D: '#ef4444', F: '#ef4444' };
      const gc = gradeColors[eff.grade] || '#3b82f6';
      cardEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:30px; flex-wrap:wrap;">
          <div style="width:100px;height:100px;border-radius:50%;background:${gc}22;border:3px solid ${gc};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <div style="font-size:2.5rem;font-weight:900;color:${gc};">${eff.grade}</div>
          </div>
          <div style="flex:1; display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:16px;">
            <div style="text-align:center;padding:12px;border-radius:10px;background:rgba(255,255,255,0.03);">
              <div style="font-size:1.5rem;font-weight:900;color:var(--p-gold);">${eff.effectiveness}</div>
              <div style="font-size:0.75rem;color:var(--p-text-muted);">Overall Score</div>
            </div>
            <div style="text-align:center;padding:12px;border-radius:10px;background:rgba(255,255,255,0.03);">
              <div style="font-size:1.5rem;font-weight:900;color:var(--p-teal);">+${eff.avgELOImprovement}</div>
              <div style="font-size:0.75rem;color:var(--p-text-muted);">Avg ELO Gain</div>
            </div>
            <div style="text-align:center;padding:12px;border-radius:10px;background:rgba(255,255,255,0.03);">
              <div style="font-size:1.5rem;font-weight:900;">${eff.retentionRate}%</div>
              <div style="font-size:0.75rem;color:var(--p-text-muted);">Retention Rate</div>
            </div>
            <div style="text-align:center;padding:12px;border-radius:10px;background:rgba(255,255,255,0.03);">
              <div style="font-size:1.5rem;font-weight:900;">${eff.studentCount}</div>
              <div style="font-size:0.75rem;color:var(--p-text-muted);">Students</div>
            </div>
          </div>
        </div>`;
    }

    // Student progress under this coach
    const progEl = document.getElementById('coachStudentProgress');
    if (progEl) {
      const myStudents = allStudents.filter(s => (s.coach || '').toLowerCase() === coachName.toLowerCase());
      if (myStudents.length) {
        progEl.innerHTML = myStudents.slice(0, 15).map(s => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;margin-bottom:6px;background:rgba(255,255,255,0.03);">
            <div style="font-weight:600;font-size:0.85rem;">${_e(s.full_name || 'Unknown')}</div>
            <div style="display:flex;gap:12px;font-size:0.78rem;">
              <span style="color:var(--p-gold);">ELO: ${s.rating || 800}</span>
              <span style="color:var(--p-teal);">XP: ${s.xp || 0}</span>
            </div>
          </div>`).join('');
      } else {
        progEl.innerHTML = '<div style="text-align:center;opacity:.4;padding:20px;">No students assigned yet</div>';
      }
    }

    // Weakness overview
    const weakEl = document.getElementById('coachWeaknessOverview');
    if (weakEl && !CK.ai) {
      weakEl.innerHTML = '<div style="text-align:center;opacity:.4;padding:20px;">AI analysis engine loading...</div>';
    }
    if (weakEl && CK.ai) {
      const myStudents = allStudents.filter(s => (s.coach || '').toLowerCase() === coachName.toLowerCase());
      if (myStudents.length) {
        const weaknessCounts = {};
        for (const s of myStudents) {
          try {
            const analysis = await CK.ai.analyzeStudent(s.id);
            if (analysis && analysis.weaknesses) {
              analysis.weaknesses.forEach(w => {
                // weaknesses is an array of category key strings like 'opening', 'tactics'
                const catName = CK.ai.CATEGORIES?.[w]?.name || w;
                weaknessCounts[catName] = (weaknessCounts[catName] || 0) + 1;
              });
            }
          } catch(e) {}
        }
        const sorted = Object.entries(weaknessCounts).sort((a, b) => b[1] - a[1]);
        weakEl.innerHTML = sorted.length ? sorted.map(([cat, count]) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;margin-bottom:6px;background:rgba(255,255,255,0.03);">
            <div style="font-weight:600;font-size:0.85rem;">${_e(cat)}</div>
            <span style="color:var(--p-gold);font-weight:700;">${count} students need work</span>
          </div>`).join('') : '<div style="text-align:center;opacity:.4;padding:20px;">No weakness data available</div>';
      } else {
        weakEl.innerHTML = '<div style="text-align:center;opacity:.4;padding:20px;">No students assigned yet</div>';
      }
    }
  }
};