/* assets/js/schedule-pro.js
   ChessKidoo — Advanced Schedule & Meeting Management
   Coaches create/edit/delete meetings per batch, students see their upcoming schedule,
   admin sees all academy schedules. */

window.CK = window.CK || {};

CK.schedulePro = (() => {
  const KEY = 'ck_meetings';
  const get  = async () => await CK.db.getMeetings();
  const save = async d  => { /* no-op, handled individually in CK.db */ };
  const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const today = () => new Date().toISOString().split('T')[0];

  // No seed data — meetings are created by real coaches via the Add Session form

  /* ═══════════════════════════════════════════════════════
     COACH — RENDER OWN SCHEDULE
  ═════════════════════════════════════════════════════════ */

  async function renderCoachSchedule(containerId, coachId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const all = await get();
    const meetings = all.filter(m => m.coachId === coachId).sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    const upcoming = meetings.filter(m => m.date >= today());
    const past     = meetings.filter(m => m.date < today());

    if (!meetings.length) {
      el.innerHTML = `<div class="cls-empty">📅 No meetings scheduled yet. Create one above.</div>`; return;
    }

    const _e = CK.esc || (s => s);
    const renderMeeting = (m, isPast) => {
      const typeIcon = { class:'🎓', oneOnOne:'👤', tournament:'🏆', review:'📋' }[m.type] || '📅';
      const dt = new Date(`${m.date}T${m.time}`);
      const dateStr = dt.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
      const timeStr = dt.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
      return `
        <div class="sched-card ${isPast ? 'sched-card-past' : ''}">
          <div class="sched-card-left">
            <div class="sched-date-badge">
              <div class="sched-date-num">${dt.getDate()}</div>
              <div class="sched-date-mon">${dt.toLocaleString('en-US',{month:'short'})}</div>
            </div>
          </div>
          <div class="sched-card-body">
            <div class="sched-title">${typeIcon} ${_e(m.title)}</div>
            <div class="sched-meta">${dateStr} · ${timeStr} · ${_e(String(m.duration))}min · ${_e(m.batch)}</div>
            ${m.notes ? `<div class="sched-notes">${_e(m.notes)}</div>` : ''}
            ${m.link ? `<a href="${m.link}" target="_blank" class="sched-join-btn" onclick="event.stopPropagation()">▶ Join Class</a>` : ''}
          </div>
          <div class="sched-card-actions">
            ${!isPast ? `<button class="p-btn p-btn-ghost p-btn-sm" onclick="CK.schedulePro.editMeeting('${m.id}','${containerId}')">✏️</button>` : ''}
            <button class="p-btn p-btn-ghost p-btn-sm" style="color:var(--p-danger)" onclick="CK.schedulePro.deleteMeeting('${m.id}','${coachId}','${containerId}')">🗑️</button>
          </div>
        </div>`;
    };

    el.innerHTML = `
      <div class="sched-section-title">📅 Upcoming (${upcoming.length})</div>
      ${upcoming.length ? upcoming.map(m => renderMeeting(m, false)).join('') : '<div class="cls-empty">No upcoming meetings.</div>'}
      ${past.length ? `
        <div class="sched-section-title" style="margin-top:20px;opacity:0.6;">⏮ Past (${past.length})</div>
        ${past.slice(0, 5).map(m => renderMeeting(m, true)).join('')}
      ` : ''}`;
  }

  /* ═══════════════════════════════════════════════════════
     COACH — CREATE / EDIT / DELETE MEETINGS
  ═════════════════════════════════════════════════════════ */

  function createMeeting(coachId, coachName, containerId) {
    openMeetingModal(null, coachId, async (data) => {
      const m = { id: uid(), coachId, coachName, ...data, studentIds: [] };
      await CK.db.saveMeeting(m);
      CK.showToast(`Meeting "${m.title}" scheduled!`, 'success');
      renderCoachSchedule(containerId, coachId);
    });
  }

  async function editMeeting(meetingId, containerId = 'coachSchedList') {
    const all = await get();
    const m = all.find(x => x.id === meetingId);
    if (!m) return;
    openMeetingModal(m, m.coachId, async (data) => {
      Object.assign(m, data);
      await CK.db.saveMeeting(m);
      CK.showToast('Meeting updated!', 'success');
      renderCoachSchedule(containerId, m.coachId);
    });
  }

  async function deleteMeeting(meetingId, coachId, containerId = 'coachSchedList') {
    if (!confirm('Delete this meeting?')) return;
    await CK.db.deleteMeeting(meetingId);
    CK.showToast('Meeting deleted.', 'success');
    renderCoachSchedule(containerId, coachId);
  }

  function openMeetingModal(existing, coachId, onSave) {
    const modal = document.createElement('div');
    modal.className = 'cls-modal-overlay';
    modal.innerHTML = `
      <div class="cls-modal">
        <div class="cls-modal-header">
          <h3>${existing ? '✏️ Edit Meeting' : '➕ Schedule New Meeting'}</h3>
          <button class="cls-modal-close" onclick="this.closest('.cls-modal-overlay').remove()">✕</button>
        </div>
        <div class="cls-modal-body">
          <div class="cls-form-row"><label>Title</label><input class="p-input" id="mm_title" value="${existing?.title || ''}" placeholder="e.g. Tactics Workshop"></div>
          <div class="cls-form-row">
            <label>Type</label>
            <select class="p-input" id="mm_type">
              ${['class','oneOnOne','tournament','review'].map(t=>`<option value="${t}" ${existing?.type===t?'selected':''}>${{class:'Group Class',oneOnOne:'1-on-1 Session',tournament:'Tournament Prep',review:'Game Review'}[t]}</option>`).join('')}
            </select>
          </div>
          <div class="cls-form-row"><label>Batch / Students</label><input class="p-input" id="mm_batch" value="${existing?.batch || ''}" placeholder="e.g. Weekend, Group 17:00"></div>
          <div class="cls-form-2col">
            <div class="cls-form-row"><label>Date</label><input class="p-input" type="date" id="mm_date" value="${existing?.date || today()}"></div>
            <div class="cls-form-row"><label>Time</label><input class="p-input" type="time" id="mm_time" value="${existing?.time || '17:00'}"></div>
          </div>
          <div class="cls-form-row"><label>Duration (min)</label><input class="p-input" type="number" id="mm_dur" value="${existing?.duration || 60}" min="15" max="180"></div>
          <div class="cls-form-row"><label>Class Link</label><input class="p-input" id="mm_link" value="${existing?.link || ''}" placeholder="https://meet.google.com/xxx"></div>
          <div class="cls-form-row"><label>Notes for Students</label><textarea class="p-input" id="mm_notes" rows="2" placeholder="Pre-class preparation, topics to review...">${existing?.notes || ''}</textarea></div>
        </div>
        <div class="cls-modal-footer">
          <button class="p-btn p-btn-ghost" onclick="this.closest('.cls-modal-overlay').remove()">Cancel</button>
          <button class="p-btn p-btn-blue" id="mm_save">💾 Save Meeting</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#mm_save').addEventListener('click', () => {
      onSave({
        title:    modal.querySelector('#mm_title').value.trim(),
        type:     modal.querySelector('#mm_type').value,
        batch:    modal.querySelector('#mm_batch').value.trim(),
        date:     modal.querySelector('#mm_date').value,
        time:     modal.querySelector('#mm_time').value,
        duration: parseInt(modal.querySelector('#mm_dur').value),
        link:     modal.querySelector('#mm_link').value.trim(),
        notes:    modal.querySelector('#mm_notes').value.trim()
      });
      modal.remove();
    });
  }

  /* ═══════════════════════════════════════════════════════
     STUDENT — SEE UPCOMING SCHEDULE
  ═════════════════════════════════════════════════════════ */

  async function renderStudentSchedule(containerId, studentProfile) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const coachName = studentProfile?.coach || '';
    const batch     = studentProfile?.batch || '';
    const all = await get();

    // Match by coach name or batch
    const relevant = all.filter(m =>
      m.coachName === coachName ||
      (batch && m.batch && m.batch.toLowerCase().includes(batch.toLowerCase())) ||
      (m.studentIds && m.studentIds.includes(studentProfile?.id))
    ).sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    const upcoming = relevant.filter(m => m.date >= today());

    if (!upcoming.length) {
      el.innerHTML = `<div class="cls-empty">📅 No upcoming classes scheduled. Your coach will add sessions here.</div>`;
      return;
    }

    const _e2 = CK.esc || (s => s);
    el.innerHTML = upcoming.map(m => {
      const dt = new Date(`${m.date}T${m.time}`);
      const isToday = m.date === today();
      const isTomorrow = m.date === new Date(Date.now()+86400000).toISOString().split('T')[0];
      const dayLabel = isToday ? '🔴 TODAY' : isTomorrow ? '🟡 TOMORROW' : dt.toLocaleDateString('en-US',{weekday:'long'});
      const typeIcon = { class:'🎓', oneOnOne:'👤', tournament:'🏆', review:'📋' }[m.type] || '📅';
      return `
        <div class="sched-card ${isToday ? 'sched-card-today' : ''}">
          <div class="sched-card-left">
            <div class="sched-date-badge ${isToday ? 'sched-date-today' : ''}">
              <div class="sched-date-num">${dt.getDate()}</div>
              <div class="sched-date-mon">${dt.toLocaleString('en-US',{month:'short'})}</div>
            </div>
          </div>
          <div class="sched-card-body">
            <div class="sched-when">${dayLabel} · ${dt.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div>
            <div class="sched-title">${typeIcon} ${_e2(m.title)}</div>
            <div class="sched-meta">Coach: ${_e2(m.coachName)} · ${_e2(String(m.duration))}min</div>
            ${m.notes ? `<div class="sched-notes">📝 ${_e2(m.notes)}</div>` : ''}
            ${m.link && isToday ? `<a href="${m.link}" target="_blank" class="sched-join-btn">▶ Join Now</a>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  /* ═══════════════════════════════════════════════════════
     ADMIN — ALL MEETINGS VIEW
  ═════════════════════════════════════════════════════════ */

  async function renderAdminSchedule(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const meetings = (await get()).sort((a,b) => a.date.localeCompare(b.date));
    el.innerHTML = `
      <table class="p-table" style="width:100%">
        <thead><tr><th>Title</th><th>Coach</th><th>Batch</th><th>Date</th><th>Time</th><th>Type</th></tr></thead>
        <tbody>
          ${meetings.map(m => { const _e = CK.esc || (s => s); return `<tr>
            <td style="font-weight:600">${_e(m.title)}</td>
            <td>${_e(m.coachName)}</td>
            <td>${_e(m.batch)}</td>
            <td>${_e(m.date)}</td>
            <td>${_e(m.time)}</td>
            <td><span class="p-badge p-badge-blue">${_e(m.type)}</span></td>
          </tr>`; }).join('')}
        </tbody>
      </table>`;
  }

  /* upcoming count for a student */
  async function upcomingCount(studentProfile) {
    const coachName = studentProfile?.coach || '';
    const batch = studentProfile?.batch || '';
    const all = await get();
    return all.filter(m =>
      m.date >= today() &&
      (m.coachName === coachName || (batch && m.batch?.toLowerCase().includes(batch.toLowerCase())))
    ).length;
  }

  return {
    get, renderCoachSchedule, createMeeting, editMeeting, deleteMeeting,
    renderStudentSchedule, renderAdminSchedule, upcomingCount
  };
})();
