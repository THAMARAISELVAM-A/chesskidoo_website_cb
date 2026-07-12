/* assets/js/parents.js
   ChessKidoo — Parents Portal
   Parents log in with their own email/password, see their child's progress,
   attendance, upcoming schedule, reports, and submit feedback. */

window.CK = window.CK || {};

CK.parents = (() => {
  const FEEDBACK_KEY = 'ck_feedback';
  const getFeedback  = () => JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
  const saveFeedback = d  => localStorage.setItem(FEEDBACK_KEY, JSON.stringify(d));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const today = () => new Date().toISOString().split('T')[0];

  let _parentProfile = null;
  let _childProfile  = null;

  /* ─── Resolve child from parent profile ─── */
  async function _resolveChild(parentProfile) {
    if (!parentProfile) return null;
    const students = await CK.db.getProfiles('student');
    // Method 1: childEmail stored on parent
    if (parentProfile.childEmail || parentProfile.child_email) {
      return students.find(s => s.email === (parentProfile.childEmail || parentProfile.child_email)) || null;
    }
    // Method 2: parentEmail stored on student
    if (parentProfile.email) {
      return students.find(s => s.parentEmail === parentProfile.email || s.parent_email === parentProfile.email) || null;
    }
    // Method 3: childId stored on parent
    if (parentProfile.childId || parentProfile.child_id) {
      return students.find(s => s.id === (parentProfile.childId || parentProfile.child_id)) || null;
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════
     INIT
  ═════════════════════════════════════════════════════════ */

  let _parentRefreshTimer = null;

  function startAutoRefresh() {
    stopAutoRefresh();
    _parentRefreshTimer = setInterval(async () => {
      if (!_childProfile) return;
      const activePanel = document.querySelector('#parent-page .par-panel.active');
      if (!activePanel) return;
      const panelId = activePanel.id.replace('par-panel-', '');
      if (panelId === 'dashboard') { await renderChildProfile(); }
      if (panelId === 'progress') { await renderProgress(); }
      if (panelId === 'attendance') { await renderAttendance(); }
    }, 45000);
  }

  function stopAutoRefresh() {
    if (_parentRefreshTimer) { clearInterval(_parentRefreshTimer); _parentRefreshTimer = null; }
  }

  // Realtime: refresh the active parent panel the moment the child's data
  // changes (rating, attendance, puzzles, homework) — no 45s wait.
  let _parentRtSubbed = false;
  function _subscribeRealtime() {
    if (_parentRtSubbed) return;
    if (!window.supabaseClient || !window.supabaseClient.channel) { setTimeout(_subscribeRealtime, 1500); return; }
    _parentRtSubbed = true;
    const refresh = () => {
      const activePanel = document.querySelector('#parent-page .par-panel.active');
      if (!activePanel || !_childProfile) return;
      const panelId = activePanel.id.replace('par-panel-', '');
      if (panelId === 'dashboard') renderChildProfile();
      else if (panelId === 'progress') renderProgress();
      else if (panelId === 'attendance') renderAttendance();
      else if (panelId === 'reports') renderReports();
    };
    try {
      window.supabaseClient.channel('ck_parent_rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'puzzle_scores' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hw_submissions' }, refresh)
        .subscribe();
    } catch (e) {}
  }

  async function init() {
    const currentUser = CK.currentUser || JSON.parse(localStorage.getItem('ck_user') || 'null');
    if (!currentUser || currentUser.role !== 'parent') {
      window.location.href = '/lms/index.html';
      return;
    }
    _parentProfile = currentUser;
    _childProfile  = await _resolveChild(currentUser);

    updateParentHeader();
    if (_childProfile) {
      renderChildProfile();
      await renderAttendance();
      await renderProgress();
      renderSchedule();
      renderReports();
      renderFees();
      renderFeedbackList();
      startAutoRefresh();
      _subscribeRealtime();
    } else {
      const content = document.getElementById('parentMainContent');
      if (content) content.innerHTML = `
        <div class="par-no-child">
          <div style="font-size:3rem">👶</div>
          <h3>Child Account Not Linked</h3>
          <p>Please contact the academy to link your child's account to this parent profile.</p>
          <p style="color:var(--p-text-muted)">Academy: <a href="mailto:chesskidoo37@gmail.com">chesskidoo37@gmail.com</a></p>
        </div>`;
    }
  }

  function updateParentHeader() {
    const el = document.getElementById('parentWelcomeName');
    if (el) el.textContent = _parentProfile?.full_name?.split(' ')[0] || 'Parent';
    const sub = document.getElementById('parentWelcomeSub');
    if (sub && _childProfile) sub.textContent = `Tracking progress for ${_childProfile.full_name}`;
  }

  async function nav(panelId) {
    document.querySelectorAll('#parent-page .par-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`par-panel-${panelId}`);
    if (target) target.classList.add('active');
    document.querySelectorAll('#parent-page .par-nav-btn').forEach(b => {
      b.classList.remove('active');
      if (b.dataset.panel === panelId) b.classList.add('active');
    });
    if (panelId === 'attendance') await renderAttendance();
    if (panelId === 'progress')   await renderProgress();
    if (panelId === 'schedule')   renderSchedule();
    if (panelId === 'reports')    renderReports();
    if (panelId === 'fees')       renderFees();
    if (panelId === 'feedback')   renderFeedbackList();
    if (panelId === 'aiweekly')  await renderAIWeekly();
  }

  /* ── AI Weekly Report ── */
  async function renderAIWeekly() {
    if (!_childProfile) return;
    if (!CK.ai) {
      const el = document.getElementById('parAIWeeklyReport');
      if (el) el.innerHTML = '<div class="cls-empty">AI analysis engine is loading. Please try again in a moment.</div>';
      return;
    }
    try {
      const report = await CK.ai.generateWeeklyReport(_childProfile.id);
      CK.ai.renderWeeklyReport('parAIWeeklyReport', report);

      // Engagement score
      const engEl = document.getElementById('parEngagementScore');
      if (engEl) {
        const result = await CK.ai.getEngagementScore(_childProfile.id);
        const score = result?.score || 0;
        const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
      engEl.innerHTML = `
        <div style="text-align:center;">
          <div style="font-size:3rem; font-weight:900; color:${color};">${score}%</div>
          <div style="font-size:0.85rem; color:var(--p-text-muted); margin-top:8px;">Overall Engagement Score</div>
          <div style="margin-top:16px; display:grid; grid-template-columns:repeat(3,1fr); gap:12px; font-size:0.78rem;">
            <div style="padding:10px; border-radius:8px; background:rgba(255,255,255,0.03);">
              <div style="font-weight:700;">${_childProfile.puzzle || 0}</div>
              <div style="color:var(--p-text-muted);">Puzzles</div>
            </div>
            <div style="padding:10px; border-radius:8px; background:rgba(255,255,255,0.03);">
              <div style="font-weight:700;">${_childProfile.game || 0}</div>
              <div style="color:var(--p-text-muted);">Games</div>
            </div>
            <div style="padding:10px; border-radius:8px; background:rgba(255,255,255,0.03);">
              <div style="font-weight:700;">${_childProfile.streak || 0}</div>
              <div style="color:var(--p-text-muted);">Streak</div>
            </div>
          </div>
        </div>`;
      }
    } catch(e) {
      CK.showToast('Weekly report unavailable right now.', 'warning');
    }
  }

  /* ═══════════════════════════════════════════════════════
     CHILD PROFILE CARD
  ═════════════════════════════════════════════════════════ */

  async function renderChildProfile() {
    const el = document.getElementById('parChildCard');
    if (!el || !_childProfile) return;
    const c = _childProfile;
    const initial = c.full_name?.[0]?.toUpperCase() || '♟';
    const puzzlesSolved = ((await CK.puzzlesPro?.getLeaderboard()) || []).find(u => u.userId === c.id)?.solved || 0;
    const attnSummary = (await CK.classSystem?.getStudentAttendanceSummary(c.id)) || { pct: 100, present: 0, total: 0 };
    const _e = CK.esc || (s => s);
    el.innerHTML = `
      <div class="par-child-avatar">${initial}</div>
      <div class="par-child-info">
        <div class="par-child-name">${_e(c.full_name)}</div>
        <div class="par-child-meta">${_e(c.level || 'Beginner')} · Coach: ${_e(c.coach || '—')} · ${_e(c.batch || 'Group')}</div>
        <div class="par-child-stats">
          <div class="par-stat"><span class="par-stat-val">${_e(String(c.rating || 800))}</span><span class="par-stat-lbl">ELO Rating</span></div>
          <div class="par-stat"><span class="par-stat-val">${attnSummary.pct}%</span><span class="par-stat-lbl">Attendance</span></div>
          <div class="par-stat"><span class="par-stat-val">${_e(String(puzzlesSolved))}</span><span class="par-stat-lbl">Puzzles Solved</span></div>
          <div class="par-stat"><span class="par-stat-val">${_e(String(c.game || 0))}</span><span class="par-stat-lbl">Games Played</span></div>
        </div>
      </div>`;
  }

  /* ═══════════════════════════════════════════════════════
     ATTENDANCE VIEW
  ═════════════════════════════════════════════════════════ */

  async function renderAttendance() {
    const el = document.getElementById('parAttendanceContent');
    if (!el || !_childProfile) return;
    const allRecords = (await CK.db.getAttendance(_childProfile.id)) || [];
    const records = allRecords;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const map = {};
    records.forEach(r => {
      const d = new Date(r.date);
      if (d.getFullYear() === year && d.getMonth() === month) map[d.getDate()] = r.status;
    });
    const presentCount = Object.values(map).filter(s => s === 'present').length;
    const absentCount  = Object.values(map).filter(s => s === 'absent').length;
    const pct = records.length ? Math.round(records.filter(r=>r.status==='present').length / records.length * 100) : 100;
    const days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    let cal = `<div class="par-cal-month">${monthName}</div><div class="par-cal-grid">`;
    cal += days.map(d => `<div class="par-cal-head">${d}</div>`).join('');
    for (let i=0; i<firstDay; i++) cal += '<div></div>';
    for (let d=1; d<=totalDays; d++) {
      const s = map[d];
      cal += `<div class="par-cal-cell ${s==='present'?'par-cal-present':s==='absent'?'par-cal-absent':''}">${d}${s==='present'?'<div class="par-cal-dot par-dot-green"></div>':s==='absent'?'<div class="par-cal-dot par-dot-red"></div>':''}</div>`;
    }
    cal += '</div>';
    el.innerHTML = `
      <div class="par-attn-summary">
        <div class="par-attn-stat par-attn-ok"><div class="par-attn-num">${pct}%</div><div>Attendance Rate</div></div>
        <div class="par-attn-stat par-attn-ok"><div class="par-attn-num">${presentCount}</div><div>Days Present</div></div>
        <div class="par-attn-stat par-attn-warn"><div class="par-attn-num">${absentCount}</div><div>Days Absent</div></div>
        <div class="par-attn-stat"><div class="par-attn-num">${records.length}</div><div>Total Recorded</div></div>
      </div>
      ${cal}
      ${pct < 75 ? `<div class="par-attn-alert">⚠️ Attendance is below 75%. Please ensure regular attendance for optimal progress.</div>` : ''}`;
  }

  /* ═══════════════════════════════════════════════════════
     PROGRESS VIEW
  ═════════════════════════════════════════════════════════ */

  async function renderProgress() {
    const el = document.getElementById('parProgressContent');
    if (!el || !_childProfile) return;
    const c = _childProfile;
    const childId = c.id || c.userid;
    const [ratingsRaw, leaderboard, safeSummary] = await Promise.all([
      CK.db.getRatings ? CK.db.getRatings(childId) : Promise.resolve(null),
      CK.puzzlesPro?.getLeaderboard() || Promise.resolve([]),
      CK.classSystem ? CK.classSystem.getStudentAttendanceSummary(childId).then(r => r || { pct: 100 }).catch(() => ({ pct: 100 })) : Promise.resolve({ pct: 100 })
    ]);
    const ratings = ratingsRaw || JSON.parse(localStorage.getItem('ck_db_ratings') || '[]').filter(r => r.user_id === childId);
    const puzzlesSolved = (leaderboard || []).find(u => u.userId === childId)?.solved || 0;
    const hw = JSON.parse(localStorage.getItem('ck_hw_submissions') || '[]').filter(s => s.studentId === c.id);
    const hwDone = hw.filter(s => s.completed).length;
    const hwTotal = (JSON.parse(localStorage.getItem('ck_assignments') || '[]')).length;
    const progress = Math.round(
      safeSummary.pct * 0.30 +
      Math.min(100, puzzlesSolved * 2.5) * 0.25 +
      Math.min(100, ((parseInt(c.rating) || 800) - 800) / 4) * 0.25 +
      Math.min(100, (c.game || 0) * 5) * 0.10 +
      (hwTotal > 0 ? (hwDone / hwTotal * 100) : 100) * 0.10
    );
    const ratingHistory = ratings.map(r => ({ date: r.date?.slice(0,7) || '—', rating: r.online }));
    el.innerHTML = `
      <div class="par-progress-header">
        <div class="par-progress-score">
          <div class="par-score-ring" style="--score: ${progress}">
            <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="10"/><circle cx="50" cy="50" r="42" fill="none" stroke="var(--p-gold)" stroke-width="10" stroke-dasharray="${progress * 2.639} 263.9" stroke-dashoffset="0" transform="rotate(-90 50 50)"/></svg>
            <div class="par-score-val">${progress}%</div>
          </div>
          <div class="par-score-label">Overall Progress</div>
        </div>
        <div class="par-progress-breakdown">
          ${[
            { label: 'Attendance', val: Math.round(safeSummary.pct), color: 'var(--p-teal)' },
            { label: 'Puzzles', val: Math.min(100, puzzlesSolved * 2.5), color: 'var(--p-blue)' },
            { label: 'Rating Gain', val: Math.min(100, ((parseInt(c.rating) || 800) - 800) / 4), color: 'var(--p-gold)' },
            { label: 'Games Played', val: Math.min(100, (c.game||0)*5), color: 'var(--p-online)' },
            { label: 'Homework', val: hwTotal > 0 ? Math.round(hwDone/hwTotal*100) : 100, color: '#a78bfa' }
          ].map(item => `
            <div class="par-breakdown-row">
              <span class="par-breakdown-label">${item.label}</span>
              <div class="par-breakdown-bar"><div style="width:${Math.round(item.val)}%;background:${item.color}"></div></div>
              <span class="par-breakdown-pct">${Math.round(item.val)}%</span>
            </div>`).join('')}
        </div>
      </div>
      ${ratingHistory.length ? `
        <div class="par-rating-history">
          <div class="par-section-title">📈 Rating History</div>
          <div class="par-rating-table">
            ${ratingHistory.map(r => `<div class="par-rating-row"><span>${r.date}</span><span style="color:var(--p-gold);font-weight:700">${r.rating} ELO</span></div>`).join('')}
          </div>
        </div>` : ''}`;
  }

  /* ═══════════════════════════════════════════════════════
     SCHEDULE VIEW
  ═════════════════════════════════════════════════════════ */

  function renderSchedule() {
    const el = document.getElementById('parScheduleContent');
    if (!el) return;
    if (CK.schedulePro && _childProfile) {
      CK.schedulePro.renderStudentSchedule('parScheduleContent', _childProfile);
    } else {
      el.innerHTML = '<div class="cls-empty">📅 No upcoming sessions found.</div>';
    }
  }

  /* ═══════════════════════════════════════════════════════
     MONTHLY REPORTS VIEW
  ═════════════════════════════════════════════════════════ */

  function renderReports() {
    const el = document.getElementById('parReportsContent');
    if (!el || !_childProfile) return;
    const reports = JSON.parse(localStorage.getItem('ck_monthly_reports') || '[]')
      .filter(r => r.studentId === _childProfile.id)
      .sort((a,b) => b.year - a.year || b.month - a.month);
    if (!reports.length) {
      el.innerHTML = '<div class="cls-empty">📋 No reports available yet. Reports will appear here when your coach submits them.</div>'; return;
    }
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const _e = CK.esc || (s => s);
    el.innerHTML = reports.map(r => `
      <div class="par-report-card">
        <div class="par-report-header">
          <span class="par-report-month">${_e(monthNames[r.month - 1])} ${_e(String(r.year))}</span>
          <span class="p-badge p-badge-${r.rating >= 4 ? 'green' : r.rating >= 3 ? 'yellow' : 'red'}">
            ${'⭐'.repeat(r.rating || 3)} (${r.rating || 3}/5)
          </span>
        </div>
        <div class="par-report-body">
          <div class="par-report-stats">
            <span>📅 Attendance: <b>${_e(String(r.attendance))}%</b></span>
            <span>🧩 Puzzles: <b>${_e(String(r.puzzles))}</b></span>
          </div>
          ${r.notes ? `<div class="par-report-notes"><b>Coach Notes:</b> ${_e(r.notes)}</div>` : ''}
          ${r.recommendation ? `<div class="par-report-rec">💡 <b>Recommendation:</b> ${_e(r.recommendation)}</div>` : ''}
        </div>
      </div>`).join('');
  }

  /* ═══════════════════════════════════════════════════════
     FEEDBACK FORM
  ═════════════════════════════════════════════════════════ */

  async function renderFeedbackList() {
    const el = document.getElementById('parFeedbackContent');
    if (!el) return;
    const all = await CK.db.getFeedback();
    const mine = all.filter(f => f.parent_email === _parentProfile?.email || f.parent_name === _parentProfile?.full_name);
    el.innerHTML = `
      <div class="par-feedback-form">
        <div class="par-section-title">✍️ Submit Feedback</div>
        <div class="cls-form-row">
          <label>Your Message</label>
          <textarea class="p-input" id="pFeedbackText" rows="4" placeholder="Share your thoughts..."></textarea>
        </div>
        <button class="p-btn p-btn-blue" onclick="CK.parents.submitFeedback()">📤 Submit Feedback</button>
      </div>
      <div style="margin-top:24px;">
        <div class="par-section-title">📬 My Previous Feedback</div>
        ${mine.length ? mine.map(f => {
            const _e = CK.esc || (s => s);
            return `
            <div class="par-fb-card">
              <div class="par-fb-header">
                <span class="par-fb-date">${new Date(f.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              <div class="par-fb-msg">${_e(f.text || f.message)}</div>
              ${f.reply ? `<div class="par-fb-reply">💬 Academy reply: ${_e(f.reply)}</div>` : ''}
            </div>`;
          }).join('') : '<div class="cls-empty">No previous feedback.</div>'}
      </div>`;
  }

  async function submitFeedback() {
    const text = document.getElementById('pFeedbackText')?.value.trim();
    if (!text) { CK.showToast('Please enter your feedback', 'warning'); return; }
    const feedback = {
      id: 'fb-' + Date.now(),
      parent_name: _parentProfile?.full_name || 'Parent',
      fromName: _parentProfile?.full_name || 'Parent',
      fromRole: 'parent',
      parent_email: _parentProfile?.email || '',
      student_email: _childProfile?.email || '',
      childName: _childProfile?.full_name || '',
      text: text,
      message: text,
      status: 'new',
      created_at: new Date().toISOString()
    };
    await CK.db.saveFeedback(feedback);
    CK.showToast('Feedback submitted successfully!', 'success');
    document.getElementById('pFeedbackText').value = '';
    await renderFeedbackList();
  }

  /* ─── Admin/Coach: view all feedback ─── */
  async function renderAllFeedback(containerId, filterRole = null) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const allData = await CK.db.getFeedback();
    let all = allData.sort((a,b) => (b.created_at || '').localeCompare(a.created_at || ''));
    if (filterRole) all = all.filter(f => f.fromRole === filterRole);
    if (!all.length) {
      el.innerHTML = '<div class="cls-empty">No feedback received yet.</div>'; return;
    }
    const _e = CK.esc || (s => s);
    el.innerHTML = all.map(f => `
      <div class="par-fb-card" style="margin-bottom:12px;">
        <div class="par-fb-header">
          <span style="font-weight:700">${_e(f.parent_name || f.fromName || 'Parent')}</span>
          <span class="par-fb-date">${new Date(f.created_at).toLocaleDateString('en-IN')}</span>
        </div>
        ${f.student_email || f.childName ? `<div style="font-size:0.8rem;color:var(--p-text-muted)">Child: ${_e(f.student_email || f.childName)}</div>` : ''}
        <div class="par-fb-msg">${_e(f.text || f.message)}</div>
        ${f.reply
          ? `<div class="par-fb-reply">💬 Replied: ${_e(f.reply)}</div>`
          : `<div style="display:flex;gap:8px;margin-top:8px;">
               <input class="p-input" id="reply_${_e(f.id)}" placeholder="Type a reply..." style="flex:1;font-size:0.85rem;">
               <button class="p-btn p-btn-blue p-btn-sm" onclick="CK.parents.replyFeedback('${_e(f.id)}')">Reply</button>
             </div>`}
      </div>`).join('');
  }

  async function replyFeedback(id) {
    const replyEl = document.getElementById(`reply_${id}`);
    const reply = replyEl?.value.trim();
    if (!reply) return;
    const all = await CK.db.getFeedback();
    const f = all.find(x => x.id === id);
    if (f) { 
      f.reply = reply; 
      f.replied = true; 
      await CK.db.saveFeedback(f); 
    }
    CK.showToast('Reply sent!', 'success');
    const isAdmin = !!document.getElementById('adminFeedbackList');
    if (isAdmin) await renderAllFeedback('adminFeedbackList');
    else await renderFeedbackList();
  }

  /* ═══════════════════════════════════════════════════════
     FEE PAYMENT (parent pays the child's fees via UPI)
  ═════════════════════════════════════════════════════════ */

  let _parFeeLinks = {};
  let _parFeeTotal = 0;

  function renderFees() {
    const el = document.getElementById('parFeesContent');
    if (!el) return;
    if (!_childProfile) {
      el.innerHTML = '<div class="cls-empty">👶 No linked child account. Please contact the academy to link your child before making a payment.</div>';
      return;
    }
    const cfg     = window.APP_CONFIG || {};
    const c       = _childProfile;
    const _e      = CK.esc || (s => s);
    const tuition = parseInt(c.fee) || 4000;
    const gst     = Math.round(tuition * 0.18);
    const total   = tuition + gst;
    const upiId   = cfg.ACADEMY_UPI_ID   || 'saminathanranjith73@okaxis';
    const upiName = cfg.ACADEMY_UPI_NAME || 'Ranjith A S';
    const status  = c.status || 'Pending';
    const isPaid  = status === 'Paid';
    const enc     = s => encodeURIComponent(s);
    const note    = enc('ChessKidoo Fee - ' + (c.full_name || 'Student'));
    const params  = `pa=${enc(upiId)}&pn=${enc(upiName)}&am=${total}&cu=INR&tn=${note}`;

    _parFeeTotal = total;
    _parFeeLinks = {
      upi:     `upi://pay?${params}`,
      gpay:    `tez://upi/pay?${params}`,
      phonepe: `phonepe://pay?${params}`,
      paytm:   `paytmmp://pay?${params}`
    };

    const fmt = n => '₹' + n.toLocaleString('en-IN');

    el.innerHTML = `
      <div class="pay-gateway-wrap">
        <!-- Left: Order Summary -->
        <div class="pay-order-card">
          <div class="pay-order-header">
            <div class="pay-academy-logo">♟</div>
            <div>
              <div class="pay-academy-name">ChessKidoo Academy</div>
              <div class="pay-academy-sub">India's Premier Chess Training Platform</div>
            </div>
          </div>
          <div class="pay-divider"></div>
          <div class="pay-order-title">Fee Invoice (Child Account)</div>
          <div class="pay-order-student">${_e(c.full_name || 'Chess Student')}</div>
          
          <div class="pay-line-items">
            <div class="pay-line">
              <span>Batch</span>
              <span>${_e(c.batch || 'Evening')}</span>
            </div>
            <div class="pay-line">
              <span>Level</span>
              <span>${_e(c.level || 'Intermediate')}</span>
            </div>
            <div class="pay-line">
              <span>Billing Period</span>
              <span>May – Jul 2026</span>
            </div>
            <div class="pay-line">
              <span>Tuition Fee</span>
              <span>${fmt(tuition)}</span>
            </div>
            <div class="pay-line">
              <span>GST (18%)</span>
              <span>${fmt(gst)}</span>
            </div>
            <div class="pay-divider" style="margin:10px 0;"></div>
            <div class="pay-line pay-total-line">
              <span>Total Due</span>
              <span class="pay-total-amount">${fmt(total)}</span>
            </div>
            <div class="pay-status-row">
              <span>Payment Status</span>
              <span class="pay-status-badge ${isPaid ? 'paid' : 'pending'}">${isPaid ? '✅ Paid' : '⚡ Pending'}</span>
            </div>
          </div>
          <div class="pay-security-note">
            🔒 256-bit SSL Encrypted · PCI-DSS Compliant · RBI Regulated
          </div>
        </div>

        <!-- Right Column -->
        ${isPaid ? `
          <!-- Success Card -->
          <div class="pay-success-card">
            <div class="pay-success-icon" style="font-size:3rem; margin-bottom:12px; text-align:center;">✅</div>
            <h2 class="pay-success-title" style="font-size:1.4rem; font-weight:800; color:#fff; text-align:center; margin-bottom:8px;">Payment Successful!</h2>
            <p class="pay-success-sub" style="color:var(--p-text-muted); font-size:0.85rem; text-align:center; margin-bottom:20px;">Your child's fee has been successfully received and verified.</p>
            <div class="pay-receipt-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:16px; border-radius:12px; font-size:0.83rem;">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Txn ID</span><span>${_e(c.last_txn_id || 'CK_TXN_—')}</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Amount</span><span>${fmt(total)}</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Date</span><span>${_e(c.paid_date || new Date().toLocaleDateString('en-GB'))}</span></div>
              <div style="display:flex;justify-content:space-between;"><span>Method</span><span>${_e(c.pay_method || 'UPI (Parent)')}</span></div>
            </div>
            <button class="p-btn p-btn-gold" style="width:100%; margin-top:16px;" onclick="CK.parents.downloadReceipt()">📥 Download Official Receipt</button>
          </div>
        ` : `
          <!-- Checkout Form Card -->
          <div class="pay-form-card">
            <div class="pay-form-header">
              <div class="pay-form-title">Complete Payment</div>
              <div class="pay-form-sub">Secure &amp; instant · Zero platform fees</div>
            </div>
            
            <div class="pay-amount-card">
              <div class="pay-amount-left">
                <div class="pay-amount-label">Total Amount</div>
                <div class="pay-amount-val">${fmt(total)}</div>
                <div class="pay-amount-note">Incl. 18% GST &amp; materials</div>
              </div>
              <div class="pay-amount-right">
                <div class="pay-amount-lock-ring">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="3" stroke="#22c55e" stroke-width="1.8" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                </div>
                <div class="pay-amount-secure-text">Secured</div>
              </div>
            </div>

            <!-- Payee Info -->
            <div class="pay-upi-payee-card">
              <div class="pay-upi-payee-avatar">R</div>
              <div class="pay-upi-payee-info">
                <div class="pay-upi-payee-name">Ranjith A S</div>
                <div class="pay-upi-payee-id"><span>${_e(upiId)}</span></div>
                <div class="pay-upi-payee-phone">📱 Academy Verified UPI</div>
              </div>
              <div class="pay-upi-payee-verified">
                <span class="pay-upi-tick">✓</span>
                <span>Verified</span>
              </div>
            </div>

            <!-- Step 1: Pay -->
            <div class="pay-section-header" style="font-size:0.8rem; font-weight:700; color:var(--p-gold); margin-top:8px; text-transform:uppercase; letter-spacing:0.05em;">Step 1: Scan QR or Open UPI App</div>
            
            <!-- QR Code Frame -->
            <div class="upi-qr-frame" style="background:#fff; padding:12px; border-radius:16px; width:176px; height:176px; margin:10px auto; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(0,0,0,0.15);">
              <div id="parUpiQrCode" style="width:100%; height:100%;"></div>
            </div>

            <!-- Copy UPI Row -->
            <div style="display:flex; align-items:center; justify-content:center; gap:8px; background:rgba(255,255,255,0.04); border-radius:8px; padding:6px 12px; font-size:0.8rem;">
              <span style="font-family:monospace; color:#cbd5e1; word-break:break-all; font-weight:600;">${_e(upiId)}</span>
              <button class="p-btn p-btn-ghost p-btn-sm" style="padding:3px 8px; font-size:0.72rem;" onclick="CK.parents.copyAcademyUpi()">📋 Copy</button>
            </div>

            <!-- UPI App Buttons -->
            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; margin-top:4px;">
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.parents.payChildFeesApp('gpay')" style="font-size:0.75rem; font-weight:600;">Google Pay</button>
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.parents.payChildFeesApp('phonepe')" style="font-size:0.75rem; font-weight:600;">PhonePe</button>
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.parents.payChildFeesApp('paytm')" style="font-size:0.75rem; font-weight:600;">Paytm</button>
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.parents.payChildFeesApp('upi')" style="font-size:0.75rem; font-weight:600;">Other UPI App</button>
            </div>

            <!-- Step 2: Confirm -->
            <div class="pay-section-header" style="font-size:0.8rem; font-weight:700; color:var(--p-gold); margin-top:12px; text-transform:uppercase; letter-spacing:0.05em;">Step 2: Enter Transaction / UTR ID</div>
            
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); padding:14px; border-radius:14px;">
              <input type="text" id="parFeeUtr" class="p-input" placeholder="e.g. 12-digit Ref No. / UTR" maxlength="30" autocomplete="off" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')" style="text-align:center; font-weight:700; letter-spacing:0.1em; font-family:monospace; background:rgba(0,0,0,0.2);">
              <button id="parFeeConfirmBtn" class="pay-submit-btn" onclick="CK.parents.confirmChildPayment()" style="margin-top:12px; width:100%;">
                <span class="pay-btn-icon">✅</span>
                <span class="pay-btn-text">Confirm Payment</span>
                <span class="pay-btn-arrow">→</span>
              </button>
            </div>

            <!-- Trust strip -->
            <div class="pay-trust-strip" style="margin-top:12px;">
              <div class="pay-trust-chip">🔒 SSL Secured</div>
              <div class="pay-trust-chip">⚡ Instant Verify</div>
              <div class="pay-trust-chip">🛡️ RBI Regulated</div>
            </div>
          </div>
        `}
      </div>
    `;

    if (!isPaid) {
      setTimeout(() => {
        const qrEl = document.getElementById('parUpiQrCode');
        if (qrEl) {
          qrEl.innerHTML = '';
          const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(_parFeeLinks.upi);
          qrEl.innerHTML = `<img src="${qrUrl}" alt="Scan to Pay" style="width:100%; height:100%; object-fit:contain; border-radius:8px;" onerror="this.outerHTML='<div style=\\\'color:#94a3b8;font-size:0.75rem;padding:12px;text-align:center;\\\'>QR unavailable<br>Use app buttons below</div>'"/>`;
        }
      }, 50);
    }
  }

  function payChildFeesApp(app) {
    const url = (_parFeeLinks && (_parFeeLinks[app] || _parFeeLinks.upi)) || '';
    if (!url) { CK.showToast('Payment link unavailable. Please use the Copy button.', 'warning'); return; }
    window.location.href = url;
    setTimeout(() => CK.showToast('If the app did not open, copy the UPI ID and pay manually.', 'info'), 1800);
  }

  function copyAcademyUpi() {
    const upiId = (window.APP_CONFIG || {}).ACADEMY_UPI_ID || 'saminathanranjith73@okaxis';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiId)
        .then(() => CK.showToast('UPI ID copied!', 'success'))
        .catch(() => CK.showToast('UPI ID: ' + upiId, 'info'));
    } else {
      CK.showToast('UPI ID: ' + upiId, 'info');
    }
  }

  async function confirmChildPayment() {
    const utrEl = document.getElementById('parFeeUtr');
    const utr   = utrEl ? utrEl.value.trim() : '';
    if (!utr || utr.length < 8 || utr.length > 30 || !/^[A-Z0-9]+$/i.test(utr)) {
      CK.showToast('Please enter a valid UTR / Transaction ID (8–30 letters or numbers).', 'warning');
      return;
    }
    if (!_childProfile) { CK.showToast('No linked child account.', 'error'); return; }

    const btn = document.getElementById('parFeeConfirmBtn');
    let textSpan = null;
    if (btn) {
      btn.disabled = true;
      textSpan = btn.querySelector('.pay-btn-text');
      if (textSpan) textSpan.textContent = 'Confirming…';
    }

    try {
      const c = _childProfile;
      c.status      = 'Paid';
      c.last_txn_id = utr;
      c.pay_method  = 'UPI (Parent)';
      c.paid_date   = new Date().toLocaleDateString('en-GB');
      const due = new Date(); due.setMonth(due.getMonth() + 1); due.setDate(14);
      c.due_date = due.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
      await CK.db.saveProfile(c);

      CK.showToast('Payment confirmed! The academy will verify your UTR shortly.', 'success');
      renderFees();
      if (window.CK && CK.admin && typeof CK.admin.loadStudents === 'function') {
        CK.admin.loadStudents();
      }
    } catch (e) {
      CK.showToast('Payment confirmation failed. Please contact admin.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        if (textSpan) textSpan.textContent = 'Confirm Payment';
      }
    }
  }

  function downloadReceipt() {
    const p = _childProfile || {};
    const _eR = CK.esc || (s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
    const name = _eR((p.full_name || 'STUDENT').toUpperCase());
    const level = _eR(p.level || 'Beginner');
    const rating = Number(p.rating || 800);
    const coach = _eR((p.coach || 'COACH').toUpperCase());
    const feeAmount = p.fee || 4000;
    const gstAmount = Math.round(feeAmount * 0.18);
    const total = feeAmount + gstAmount;
    const dateStr = p.paid_date || new Date().toLocaleDateString('en-GB');

    const words = total === 4720 ? 'Four Thousand Seven Hundred and Twenty Rupees Only' :
                  total === 1888 ? 'One Thousand Eight Hundred and Eighty Eight Rupees Only' :
                  total === 2596 ? 'Two Thousand Five Hundred and Ninety Six Rupees Only' :
                  total === 5310 ? 'Five Thousand Three Hundred and Ten Rupees Only' :
                  `${total} Rupees Only`;

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
              <div class="r-slogan">Nurturing Young Minds Through Chess</div>
              <div class="r-contact">
                <span>🌐 www.chesskidoo.com</span>
                <span>📧 support@chesskidoo.com</span>
              </div>
            </div>
            <div class="r-subhead">RECEIPT</div>
            <div class="r-meta">
              <span><strong>Receipt No:</strong> RECP-${p.last_txn_id || '—'}</span>
              <span><strong>Date:</strong> ${dateStr}</span>
            </div>
            <div class="r-body">
              <div class="watermark">PAID</div>
              <div class="sec-title">Received From</div>
              <table class="r-table">
                <tr><td class="lbl">Student Name</td><td class="val">${name}</td></tr>
                <tr><td class="lbl">Level / Curriculum</td><td class="val">${level}</td></tr>
                <tr><td class="lbl">Rating (ELO)</td><td class="val">${rating}</td></tr>
                <tr><td class="lbl">Assigned Coach</td><td class="val">${coach}</td></tr>
              </table>
              <div class="sec-title">Payment Information</div>
              <table class="r-table">
                <tr><td class="lbl">Payment Method</td><td class="val">${p.pay_method || 'UPI (Parent)'}</td></tr>
                <tr><td class="lbl">UTR / Ref Number</td><td class="val">${p.last_txn_id || '—'}</td></tr>
                <tr><td class="lbl">Billing Period</td><td class="val">${p.due_date || 'May - Jul 2026'}</td></tr>
              </table>
              <div class="total-box">
                <span class="total-lbl">Total Amount Paid</span>
                <span class="total-val">₹${total.toLocaleString('en-IN')}</span>
              </div>
              <div class="words">Amount in words: ${words}</div>
            </div>
            <div class="r-footer">
              Thank you for trusting ChessKidoo Academy. This is a system-generated official receipt.
              <br><button onclick="window.print()" style="margin-top: 15px; background: #b4831f; color: #000; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer;">Print Receipt</button>
            </div>
          </div>
        </body>
      </html>
    `);
    receiptWin.document.close();
  }

  return {
    init, nav, renderChildProfile, renderAttendance, renderProgress,
    renderSchedule, renderReports, renderFeedbackList, submitFeedback,
    renderAllFeedback, replyFeedback, renderFees, payChildFeesApp,
    copyAcademyUpi, confirmChildPayment, downloadReceipt,
    generateAIReport: renderAIWeekly, startAutoRefresh, stopAutoRefresh
  };
})();

