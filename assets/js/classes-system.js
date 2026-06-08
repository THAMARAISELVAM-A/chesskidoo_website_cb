/* assets/js/classes-system.js
   ChessKidoo — Class Management System
   Coach creates/edits/deletes classes, marks own attendance by clicking class link,
   marks student attendance per session, admin sees all class data. */

window.CK = window.CK || {};

CK.classSystem = (() => {
  const _e = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ─── Storage helpers ─── */
  const getClasses     = async () => await CK.db.getClasses();
  const getCoachAttn   = async () => await CK.db.getCoachAttendance();
  const getStudentAttn = async () => await CK.db.getAttendance(); // use main attendance table
  const uid            = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const today          = () => new Date().toISOString().split('T')[0];

  // No seed data — classes are created by real coaches via the Add Class form

  /* ═══════════════════════════════════════════════════════════
     COACH — CLASS MANAGEMENT
  ══════════════════════════════════════════════════════════════ */

  async function getCoachClasses(coachId) {
    const all = await getClasses();
    return all.filter(c => c.coachId === coachId);
  }

  async function renderCoachClasses(containerId, coachId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const classes = await getCoachClasses(coachId);
    if (!classes.length) {
      el.innerHTML = `<div class="cls-empty">📭 No classes yet. Create your first class above.</div>`;
      return;
    }
    const allAttn = await getCoachAttn();
    const attnToday = allAttn.filter(a => a.date === today());
    el.innerHTML = classes.map(c => {
      const attended = attnToday.find(a => a.classId === c.id);
      const days = (c.days || []).join(', ');
      const studCount = (c.studentIds || []).length;
      return `
        <div class="cls-class-card ${attended ? 'cls-class-attended' : ''}">
          <div class="cls-class-header">
            <div>
              <div class="cls-class-title">${c.title}</div>
              <div class="cls-class-meta">${days} · ${c.time} · ${c.duration}min · <span class="p-badge p-badge-${c.level==='Beginner'?'green':c.level==='Intermediate'?'blue':'gold'}">${c.level}</span></div>
            </div>
            <div class="cls-class-actions">
              <button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.classSystem.editClass('${c.id}')">✏️ Edit</button>
              <button class="p-btn p-btn-ghost p-btn-sm" style="color:var(--p-danger)" onclick="CK.classSystem.deleteClass('${c.id}')">🗑️</button>
            </div>
          </div>
          <div class="cls-class-body">
            <div class="cls-class-link">
              <span>🔗</span>
              <a href="${c.zoomLink}" target="_blank" class="cls-zoom-link" onclick="CK.classSystem.markCoachAttendance('${c.id}','${coachId}'); return true;">${c.zoomLink}</a>
            </div>
            <div class="cls-class-footer">
              <span>👥 ${studCount} / ${c.maxStudents} students</span>
              ${attended
                ? `<span class="p-badge p-badge-green">✅ Attended today ${new Date(attended.joinedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>`
                : `<button class="p-btn p-btn-teal p-btn-sm" onclick="CK.classSystem.markCoachAttendance('${c.id}','${coachId}')">▶ Mark My Attendance</button>`}
            </div>
          </div>
        </div>`;
    }).join('');
  }

  async function createClass(data, coachId, coachName) {
    const cls = {
      id: uid(),
      coachId, coachName,
      title: data.title || 'New Class',
      level: data.level || 'Beginner',
      batch: data.batch || 'Group',
      days: data.days || [],
      time: data.time || '17:00',
      duration: parseInt(data.duration) || 60,
      zoomLink: data.zoomLink || '',
      maxStudents: parseInt(data.maxStudents) || 10,
      studentIds: [],
      active: true,
      createdAt: today()
    };
    await CK.db.saveClass(cls);
    CK.showToast(`Class "${cls.title}" created!`, 'success');
    return cls;
  }

  async function editClass(classId) {
    const all = await getClasses();
    const cls = all.find(c => c.id === classId);
    if (!cls) return;
    openClassModal(cls, async (updated) => {
      Object.assign(cls, updated);
      await CK.db.saveClass(cls);
      CK.showToast('Class updated!', 'success');
      if (window.CK && CK.coach) CK.coach.renderClassesPanel();
    });
  }

  async function deleteClass(classId) {
    if (!await CK.confirm('Delete this class? This will also remove its attendance records.')) return;
    await CK.db.deleteClass(classId);
    CK.showToast('Class deleted.', 'success');
    if (window.CK && CK.coach) CK.coach.renderClassesPanel();
  }

  function openClassModal(existing, onSave) {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const sel = (d) => (existing && existing.days && existing.days.includes(d)) ? 'checked' : '';
    const modal = document.createElement('div');
    modal.className = 'cls-modal-overlay';
    modal.innerHTML = `
      <div class="cls-modal">
        <div class="cls-modal-header">
          <h3>${existing ? '✏️ Edit Class' : '➕ Create New Class'}</h3>
          <button class="cls-modal-close" onclick="this.closest('.cls-modal-overlay').remove()">✕</button>
        </div>
        <div class="cls-modal-body">
          <div class="cls-form-row">
            <label>Class Title</label>
            <input class="p-input" id="cmod_title" value="${existing?.title || ''}" placeholder="e.g. Beginner Fundamentals">
          </div>
          <div class="cls-form-row">
            <label>Level</label>
            <select class="p-input" id="cmod_level">
              ${['Beginner','Intermediate','Advanced'].map(l=>`<option ${existing?.level===l?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="cls-form-row">
            <label>Batch Name</label>
            <input class="p-input" id="cmod_batch" value="${existing?.batch || ''}" placeholder="e.g. Evening, Weekend">
          </div>
          <div class="cls-form-row">
            <label>Days</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
              ${days.map(d=>`<label class="cls-day-check"><input type="checkbox" value="${d}" ${sel(d)}> ${d}</label>`).join('')}
            </div>
          </div>
          <div class="cls-form-2col">
            <div class="cls-form-row">
              <label>Start Time</label>
              <input class="p-input" type="time" id="cmod_time" value="${existing?.time || '17:00'}">
            </div>
            <div class="cls-form-row">
              <label>Duration (min)</label>
              <input class="p-input" type="number" id="cmod_duration" value="${existing?.duration || 60}" min="15" max="180">
            </div>
          </div>
          <div class="cls-form-row">
            <label>Max Students</label>
            <input class="p-input" type="number" id="cmod_max" value="${existing?.maxStudents || 10}" min="1" max="30">
          </div>
          <div class="cls-form-row">
            <label>Class Link (Zoom / Google Meet)</label>
            <input class="p-input" id="cmod_zoom" value="${existing?.zoomLink || ''}" placeholder="https://meet.google.com/xxx-yyy-zzz">
          </div>
        </div>
        <div class="cls-modal-footer">
          <button class="p-btn p-btn-ghost" onclick="this.closest('.cls-modal-overlay').remove()">Cancel</button>
          <button class="p-btn p-btn-blue" id="cmod_save">💾 Save Class</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#cmod_save').addEventListener('click', () => {
      const days = [...modal.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value);
      onSave({
        title: modal.querySelector('#cmod_title').value.trim(),
        level: modal.querySelector('#cmod_level').value,
        batch: modal.querySelector('#cmod_batch').value.trim(),
        days,
        time: modal.querySelector('#cmod_time').value,
        duration: modal.querySelector('#cmod_duration').value,
        maxStudents: modal.querySelector('#cmod_max').value,
        zoomLink: modal.querySelector('#cmod_zoom').value.trim()
      });
      modal.remove();
    });
  }

  /* ─── Coach marks own attendance when joining a class ─── */
  async function markCoachAttendance(classId, coachId) {
    const records = await getCoachAttn();
    const existing = records.find(r => r.classId === classId && r.date === today());
    if (existing) {
      CK.showToast('Attendance already marked for today!', 'info'); return;
    }
    const record = { id: uid(), coachId, classId, date: today(), joinedAt: new Date().toISOString() };
    await CK.db.saveCoachAttendance(record);
    CK.showToast('✅ Your attendance has been marked for today!', 'success');
    if (window.CK && CK.coach) CK.coach.renderClassesPanel();
  }

  /* ═══════════════════════════════════════════════════════════
     COACH — MARK STUDENT ATTENDANCE
  ══════════════════════════════════════════════════════════════ */

  async function renderAttendanceMarker(containerId, coachId, dateStr) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const date = dateStr || today();
    const classes = await getCoachClasses(coachId);
    if (!classes.length) {
      el.innerHTML = `<div class="cls-empty">No classes to take attendance for.</div>`; return;
    }
    const allStudents = (await CK.db.getProfiles('student')) || [];
    const allSAttn = await getStudentAttn();
    const attnRecords = allSAttn.filter(a => a.date === date && a.coachId === coachId);

    // Attendance integrity: coaches may only mark TODAY (prevents back/forward
    // dating false or late attendance). Past/other dates are read-only for
    // coaches; only admins can edit any date.
    const isAdmin = !!(window.CK && CK.currentUser && CK.currentUser.role === 'admin');
    const todayStr = today();
    const locked = !isAdmin && date !== todayStr;
    const _e2 = CK.esc || (v => v);

    el.innerHTML = `
      <div class="cls-attn-date-row">
        <label>Date:</label>
        <input class="p-input" type="date" id="attnDatePicker" value="${date}" ${isAdmin ? '' : `max="${todayStr}"`} data-container="${_e2(containerId)}" data-coach="${_e2(coachId)}" onchange="CK.classSystem.renderAttendanceMarker(this.dataset.container,this.dataset.coach,this.value)">
        ${locked ? `<span class="p-badge p-badge-yellow" style="margin-left:8px;">🔒 Past date — admin only</span>` : (isAdmin && date !== todayStr ? `<span class="p-badge p-badge-blue" style="margin-left:8px;">Admin edit mode</span>` : '')}
      </div>
      ${classes.map(cls => {
        const classStudents = allStudents.filter(s => (cls.studentIds||[]).includes(s.id));
        return `
          <div class="cls-attn-section">
            <div class="cls-attn-class-title">📋 ${cls.title} <span class="p-badge p-badge-blue">${cls.days?.join(', ')} ${cls.time}</span></div>
            <div class="cls-attn-grid">
              ${classStudents.length ? classStudents.map(s => {
                const _e = CK.esc || (v => v);
                const rec = attnRecords.find(a => a.studentId === s.id && a.classId === cls.id);
                const status = rec?.status || '';
                const _da = `data-sid="${_e(s.id)}" data-sname="${_e(s.full_name)}" data-cid="${_e(cls.id)}" data-ctitle="${_e(cls.title)}" data-coach="${_e(coachId)}" data-date="${_e(date)}" data-container="${_e(containerId)}"`;
                return `
                  <div class="cls-attn-row">
                    <div class="cls-attn-name">${_e(s.full_name)}</div>
                    <div class="cls-attn-btns">
                      <button class="cls-attn-btn ${status==='present'?'active-present':''}" ${_da} data-status="present" ${locked?'disabled title="Past attendance is admin-only"':''} onclick="CK.classSystem.markAttnFromBtn(this)">✅ Present</button>
                      <button class="cls-attn-btn ${status==='absent'?'active-absent':''}" ${_da} data-status="absent" ${locked?'disabled title="Past attendance is admin-only"':''} onclick="CK.classSystem.markAttnFromBtn(this)">❌ Absent</button>
                      <button class="cls-attn-btn ${status==='late'?'active-late':''}" ${_da} data-status="late" ${locked?'disabled title="Past attendance is admin-only"':''} onclick="CK.classSystem.markAttnFromBtn(this)">⏰ Late</button>
                    </div>
                  </div>`;
              }).join('') : `<div class="cls-empty" style="padding:12px;">No students assigned to this class yet.</div>`}
            </div>
          </div>`;
      }).join('')}`;
  }

  function markAttnFromBtn(btn) {
    const d = btn.dataset;
    markStudentAttn(d.sid, d.sname, d.cid, d.ctitle, d.coach, d.date, d.status, d.container);
  }

  async function markStudentAttn(studentId, studentName, classId, className, coachId, date, status, containerId) {
    // Server-of-record guard: a coach may only mark TODAY. Editing any other
    // date requires admin — blocks back/post-dated (false/late) attendance.
    const isAdmin = !!(window.CK && CK.currentUser && CK.currentUser.role === 'admin');
    if (!isAdmin && date !== today()) {
      CK.showToast('Coaches can only mark today\'s attendance. Ask an admin to edit other dates.', 'warning');
      return;
    }
    const entry = { id: uid(), userid: studentId, studentId, studentName, classId, className, coachId, date, status, markedAt: new Date().toISOString() };
    await CK.db.saveAttendance(entry);

    CK.showToast(`${studentName}: ${status}`, status === 'present' ? 'success' : status === 'late' ? 'warning' : 'error');
    renderAttendanceMarker(containerId, coachId, date);
  }

  /* ═══════════════════════════════════════════════════════════
     COACH — ASSIGN STUDENTS TO CLASSES
  ══════════════════════════════════════════════════════════════ */

  async function openAssignStudentsModal(classId) {
    const all = await getClasses();
    const cls = all.find(c => c.id === classId);
    if (!cls) return;
    const allStudents = (await CK.db.getProfiles('student')) || [];
    const modal = document.createElement('div');
    modal.className = 'cls-modal-overlay';
    modal.innerHTML = `
      <div class="cls-modal">
        <div class="cls-modal-header"><h3>👥 Assign Students — ${cls.title}</h3><button class="cls-modal-close" onclick="this.closest('.cls-modal-overlay').remove()">✕</button></div>
        <div class="cls-modal-body" style="max-height:400px;overflow-y:auto;">
          ${allStudents.map(s => { const _e = CK.esc || (v => v); return `
            <label class="cls-assign-student-row">
              <input type="checkbox" value="${_e(s.id)}" ${(cls.studentIds||[]).includes(s.id)?'checked':''}>
              <span>${_e(s.full_name)}</span>
              <span class="p-badge p-badge-${s.level==='Beginner'?'green':s.level==='Intermediate'?'blue':'gold'}">${_e(s.level||'Beginner')}</span>
            </label>`;}).join('')}
        </div>
        <div class="cls-modal-footer">
          <button class="p-btn p-btn-ghost" onclick="this.closest('.cls-modal-overlay').remove()">Cancel</button>
          <button class="p-btn p-btn-blue" id="assignSaveBtn">💾 Save Assignments</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#assignSaveBtn').addEventListener('click', async () => {
      cls.studentIds = [...modal.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value);
      await CK.db.saveClass(cls);
      CK.showToast('Students assigned!', 'success');
      modal.remove();
      if (window.CK && CK.coach) CK.coach.renderClassesPanel();
    });
  }

  /* ═══════════════════════════════════════════════════════════
     ADMIN — ALL CLASSES VIEW
  ══════════════════════════════════════════════════════════════ */

  async function renderAdminClasses(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const classes = await getClasses();
    const coachAttn = await getCoachAttn();
    el.innerHTML = `
      <table class="p-table" style="width:100%">
        <thead><tr><th>Class</th><th>Coach</th><th>Level</th><th>Days/Time</th><th>Students</th><th>Coach Attendance (This Month)</th></tr></thead>
        <tbody>
          ${classes.map(c => {
            const _e = CK.esc || (v => v);
            const thisMonth = new Date().toISOString().slice(0,7);
            const attended = coachAttn.filter(a => a.classId === c.id && a.date.startsWith(thisMonth)).length;
            return `<tr>
              <td style="font-weight:600">${_e(c.title)}</td>
              <td>${_e(c.coachName)}</td>
              <td><span class="p-badge p-badge-${c.level==='Beginner'?'green':c.level==='Intermediate'?'blue':'gold'}">${_e(c.level)}</span></td>
              <td>${_e((c.days||[]).join(', '))} ${_e(c.time)}</td>
              <td>${(c.studentIds||[]).length} / ${_e(String(c.maxStudents))}</td>
              <td><span class="p-badge p-badge-${attended>=4?'green':'yellow'}">${attended} sessions</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  /* ─── Coach Attendance Report (admin) ─── */
  async function renderCoachAttendanceReport(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const coachAttn = await getCoachAttn();
    const classes   = await getClasses();
    const coaches   = (await CK.db.getProfiles('coach')) || [];
    const thisMonth = new Date().toISOString().slice(0,7);

    let html = `
      <div class="cls-report-header" style="display:flex; justify-content:space-between; align-items:center;">
        <span>👨‍🏫 Coach Attendance Report — ${new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span>
      </div>
      <div style="margin: 20px 0; height: 260px; position: relative; width: 100%; background: var(--p-surface3); border-radius: 8px; padding: 16px;">
        <canvas id="coachAttnChart"></canvas>
      </div>
      <table class="p-table" style="width:100%;margin-top:12px;">
        <thead><tr><th>Coach</th><th>Sessions Taken</th><th>Unique Days</th><th>Last Session</th><th>Status</th></tr></thead>
        <tbody>
    `;

    const chartLabels = [];
    const chartData = [];

    coaches.forEach(coach => {
      const _e = CK.esc || (v => v);
      const records = coachAttn.filter(a => a.date.startsWith(thisMonth) && classes.find(c => c.id === a.classId && c.coachId === coach.id));
      const uniqueDays = [...new Set(records.map(r => r.date))].length;
      const last = records.sort((a,b) => b.date.localeCompare(a.date))[0];
      
      chartLabels.push(coach.full_name || '—');
      chartData.push(records.length);

      html += `<tr>
        <td style="font-weight:600">${_e(coach.full_name)}</td>
        <td>${records.length}</td>
        <td>${uniqueDays}</td>
        <td>${last ? last.date : '—'}</td>
        <td><span class="p-badge p-badge-${records.length >= 8 ? 'green' : records.length >= 4 ? 'yellow' : 'red'}">${records.length >= 8 ? 'Active' : records.length >= 4 ? 'Moderate' : 'Low'}</span></td>
      </tr>`;
    });

    html += `</tbody></table>`;
    el.innerHTML = html;

    // Render chart
    setTimeout(() => {
      const ctx = document.getElementById('coachAttnChart');
      if (ctx && window.Chart) {
        if (window.coachAttnChartInstance) window.coachAttnChartInstance.destroy();
        window.coachAttnChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: chartLabels,
            datasets: [{
              label: 'Sessions Taken This Month',
              data: chartData,
              backgroundColor: 'rgba(20, 184, 166, 0.65)',
              borderColor: '#14b8a6',
              borderWidth: 1,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { stepSize: 1, color: 'rgba(255,255,255,0.5)' } },
              x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)' } }
            }
          }
        });
      }
    }, 100);
  }

  /* ═══════════════════════════════════════════════════════════
     STUDENT — GET MY CLASSES
  ══════════════════════════════════════════════════════════════ */

  async function getStudentClasses(studentId) {
    const all = await getClasses();
    return all.filter(c => (c.studentIds || []).includes(studentId));
  }

  async function getStudentAttendanceSummary(studentId) {
    const allAttn = await getStudentAttn();
    const records = allAttn.filter(r => r.studentId === studentId || r.userid === studentId);
    const present = records.filter(r => r.status === 'present').length;
    const total   = records.length;
    return { present, absent: records.filter(r => r.status === 'absent').length, late: records.filter(r => r.status === 'late').length, total, pct: total ? Math.round(present / total * 100) : 100 };
  }

  return {
    getClasses, getCoachClasses, getStudentClasses,
    renderCoachClasses, createClass, editClass, deleteClass,
    markCoachAttendance, renderAttendanceMarker, markStudentAttn, markAttnFromBtn,
    openAssignStudentsModal, openClassModal,
    renderAdminClasses, renderCoachAttendanceReport,
    getStudentAttendanceSummary, getStudentAttn
  };
})();
