// Coach dashboard logic
// Load coach-specific data and populate dashboard

/* Roster coach ids come in three shapes — dashed UUID, the same UUID with
   dashes stripped, and legacy "c_name" slugs. Compare them leniently so a
   formatting difference alone never hides a student from their own coach.
   Genuinely different identities (a slug vs a UUID) still will not match;
   those need the roster normalising, and are surfaced to the coach instead
   of the student silently vanishing from the attendance sheet. */
window.ckSameCoach = function (a, b) {
  const norm = (v) => String(v == null ? '' : v).trim().toLowerCase().replace(/-/g, '');
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  return na === nb;
};

document.addEventListener('DOMContentLoaded', () => {
  // Navigation to coach dashboard is handled via setPage('coach-dash') in scripts.js
});

window.renderCoachDashboard = function() {
  if (window.role !== 'coach') return;

  let coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();

  if (!coachId && window.allCoaches && window.allCoaches.length > 0) {
    const auth = sessionStorage.getItem("twoknights_auth");
    if (auth) {
      try {
        const data = JSON.parse(auth);
        const userName = (data.user || '').toLowerCase();
        const coach = window.allCoaches.find(c =>
          String(c.email || '').toLowerCase() === userName ||
          String(c.name || '').toLowerCase() === userName
        );
        if (coach && coach.id) {
          coachId = String(coach.id);
          window.currentCoachId = coachId;
          window.userId = coachId;
        }
      } catch (e) {
        console.warn('[Coach] Dashboard fallback coach lookup failed:', e);
      }
    }
  }

  if (!coachId) {
    setTimeout(() => { if (window.renderCoachDashboard) window.renderCoachDashboard(); }, 1000);
    return;
  }

  const coach = (window.allCoaches || []).find(c => String(c.id) === String(coachId));
  if (coach && coach.name) {
    const nameEl = document.getElementById('coach-dash-name');
    if (nameEl) nameEl.textContent = coach.name.split(' ')[0];
  }

  const myStudents = (window.allStudents || []).filter(s => String(s.coach_id) === String(coachId));
  const myBatches = (window.allBatches || []).filter(b => String(b.coach_id) === String(coachId));

  const statStudents = document.getElementById('coach-stat-students');
  const statBatches = document.getElementById('coach-stat-batches');
  const statSessions = document.getElementById('coach-stat-sessions');
  const statHw = document.getElementById('coach-stat-hw');

  if (statStudents) statStudents.textContent = myStudents.length;
  if (statBatches) statBatches.textContent = myBatches.length;

  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  const upcomingSessions = (window.allAttendance || []).filter(a => {
    const attDate = new Date(a.date);
    return attDate >= today && attDate <= nextWeek && myStudents.some(s => String(s.id) === String(a.student_id));
  });
  if (statSessions) statSessions.textContent = upcomingSessions.length;

  const pendingHw = (window.homeworkSubmissionCache || [])
    .filter(s => s.status === 'submitted' && myStudents.some(st => String(st.id) === String(s.student_id)));
  if (statHw) statHw.textContent = pendingHw.length;
};

function getCurrentCoachIdFromStorage() {
  try {
    if (window.currentCoachId) return window.currentCoachId;
    if (window.userId) return window.userId;
    
    const auth = sessionStorage.getItem("twoknights_auth");
    if (auth) {
      const data = JSON.parse(auth);
      if (data.coachId) return data.coachId;
      if (data.coach_id) return data.coach_id;
      const user = data.user || '';
      const coach = (window.allCoaches || []).find(c => 
        String(c.email || '').toLowerCase() === String(user).toLowerCase() ||
        String(c.name || '').toLowerCase() === String(user).toLowerCase()
      );
      if (coach && coach.id) return coach.id;
    }
  } catch (e) {
    console.warn('[Coach] Failed to get coach ID from storage:', e);
  }
  return null;
}

document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver(() => {
    const dash = document.getElementById('page-coach-dash');
    const stud = document.getElementById('page-stud');
    if (dash && dash.classList.contains('active') && window.renderCoachDashboard) {
      window.renderCoachDashboard();
    }
    if (stud && stud.classList.contains('active') && window.renderStudents) {
      window.renderStudents();
    }
  });
  observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
});

  window.renderCoachStudents = function () {
    if (window.role !== 'coach') return;
    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) return;

    const tbody = document.getElementById('coach-students-tbody');
    if (!tbody) return;

    const myStudents = (window.allStudents || [])
      .filter(s => String(s.coach_id) === String(coachId))
      .sort((a, b) => (window.getStudentName ? window.getStudentName(a) : a.name).localeCompare(window.getStudentName ? window.getStudentName(b) : b.name));

    if (myStudents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="coach-loading-cell">No students assigned yet.</td></tr>';
      return;
    }

    tbody.innerHTML = myStudents.map((s, idx) => {
      const name = window.getStudentName ? window.getStudentName(s) : s.name;
      const phone = window.getStudentPhone ? window.getStudentPhone(s) : (s.phone || '—');
      return `
        <tr>
          <td style="color:var(--ivory-dim)">${idx + 1}</td>
          <td style="font-weight:500; color:var(--ivory)">${window.escapeHtml ? window.escapeHtml(name) : name}</td>
          <td style="font-family:monospace; font-size:12px;">${phone}</td>
          <td><button class="btn btn-outline btn-sm" onclick="if(window.openStudentDetail)window.openStudentDetail('${s.id}')">View</button></td>
        </tr>
      `;
    }).join('');
  };

  window.renderCoachBatches = function () {
    if (window.role !== 'coach') return;
    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) return;

    const tbody = document.getElementById('coach-batches-tbody');
    if (!tbody) return;

    const myBatches = (window.allBatches || []).filter(b => String(b.coach_id) === String(coachId));

    if (myBatches.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">No batches assigned yet.</td></tr>';
      return;
    }

    tbody.innerHTML = myBatches.map(b => {
      const days = b.days || b.schedule_days || 'TBD';
      const studentCount = Array.isArray(b.student_ids) ? b.student_ids.length : 0;
      const link = window.getBatchMeetLink ? window.getBatchMeetLink(b) : '';
      const linkCell = link
        ? `<div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
             <a href="${window.escapeHtml ? window.escapeHtml(link) : link}" target="_blank" rel="noopener" class="btn btn-gold btn-sm">🎥 Join</a>
             <button class="btn btn-outline btn-sm" onclick="window.coachShareBatchLink('${b.id}')" title="Share class link with students via WhatsApp">📲 Share</button>
             <button class="btn btn-outline btn-sm" onclick="window.coachSetBatchLink('${b.id}')" title="Change the Google Meet link">✏️</button>
           </div>`
        : `<button class="btn btn-outline btn-sm" onclick="window.coachSetBatchLink('${b.id}')">🔗 Set GMeet Link</button>`;
      return `
        <tr>
          <td style="font-weight:500; color:var(--ivory)">${window.escapeHtml ? window.escapeHtml(b.name) : b.name}</td>
          <td><span class="badge badge-info">${b.level || 'Beginner'}</span></td>
          <td>${studentCount}</td>
          <td style="font-size:12px; color:var(--ivory-dim)">${days}</td>
          <td>${linkCell}</td>
        </tr>
      `;
    }).join('');
  };

  // ── Batch class-link helpers (Google Meet sharing) ────────────────────────
  // The batch `notes` column is the de-facto home of the class meet link
  // (schedule.js already reads it as the parent-side meetLink fallback), so we
  // extract the first URL rather than trusting the whole field.
  window.getBatchMeetLink = function (batch) {
    if (!batch) return '';
    if (batch.meet_link) return String(batch.meet_link);
    const m = String(batch.notes || '').match(/https?:\/\/[^\s"'<>]+/);
    return m ? m[0] : '';
  };

  window.coachSetBatchLink = async function (batchId) {
    const batch = (window.allBatches || []).find(b => String(b.id) === String(batchId));
    if (!batch) return;
    const current = window.getBatchMeetLink(batch);
    const input = prompt(
      'Paste the Google Meet link for "' + (batch.name || 'this batch') + '":\n(e.g. https://meet.google.com/abc-defg-hij)',
      current || 'https://meet.google.com/'
    );
    if (input === null) return; // cancelled
    const link = input.trim();
    if (link && !/^https:\/\/[^\s]+$/i.test(link)) {
      if (window.toast) window.toast('That does not look like a valid https:// link.', 'error');
      return;
    }
    // Preserve any non-URL note text; replace/append only the URL portion.
    const otherNotes = String(batch.notes || '').replace(/https?:\/\/[^\s"'<>]+/g, '').replace(/\s{2,}/g, ' ').trim();
    const newNotes = link ? (otherNotes ? otherNotes + ' ' + link : link) : otherNotes;
    try {
      const res = await window.apiCall(`/api/batches?id=${batchId}`, {
        method: 'PUT',
        body: JSON.stringify({ notes: newNotes }),
      });
      if (res.ok) {
        batch.notes = newNotes; // keep local cache in sync without a full reload
        if (window.toast) window.toast(link ? 'Class link saved. Students will see a Join Class button.' : 'Class link removed.', 'success');
        window.renderCoachBatches();
      } else {
        const err = await res.json().catch(() => ({}));
        if (window.toast) window.toast('Failed to save link: ' + (err.error || 'unknown error'), 'error');
      }
    } catch (e) {
      if (window.toast) window.toast('Network error: ' + e.message, 'error');
    }
  };

  /* Resolve a student's WhatsApp number. Prefers the shared international
     formatter when scripts.js has loaded it, else falls back to digits with a
     91 default for local 10-digit numbers. */
  function waNumber(student) {
    const raw = String(student.parent_phone || student.phone || '').trim();
    if (!raw) return '';
    if (window.getFullInternationalPhoneDigits) {
      try {
        const d = window.getFullInternationalPhoneDigits(raw, student.country_code || 'IN');
        if (d) return String(d).replace(/\D/g, '');
      } catch (e) { /* fall through to the local heuristic */ }
    }
    const digits = raw.replace(/\D/g, '');
    return digits.length === 10 ? '91' + digits : digits;
  }

  function batchShareMessage(batch, link) {
    const days = batch.days || batch.schedule_days || 'as scheduled';
    const time = batch.time_slot || batch.time || '';
    return (
      `\u265F\uFE0F *ChessKidoo Academy \u2014 Online Class*\n\n` +
      `Batch: ${batch.name || ''}\n` +
      `Schedule: ${days}${time ? ' \u2022 ' + time : ''}\n\n` +
      `\u{1F3A5} Join your class here:\n${link}\n\n` +
      `Please join 5 minutes early. See you on the board!`
    );
  }

  /* Previously this opened a bare wa.me/?text= share with NO recipient, so the
     coach had to hand-pick every parent and the batch's own students were never
     actually targeted. Resolve them from batch.student_ids instead and offer a
     direct send per student, keeping the recipient-less share as a fallback. */
  window.coachShareBatchLink = function (batchId) {
    const batch = (window.allBatches || []).find(b => String(b.id) === String(batchId));
    if (!batch) return;
    const link = window.getBatchMeetLink(batch);
    if (!link) {
      if (window.toast) window.toast('Set a class link first.', 'info');
      return;
    }
    const msg = batchShareMessage(batch, link);
    if (navigator.clipboard) navigator.clipboard.writeText(msg).catch(() => {});

    const ids = Array.isArray(batch.student_ids) ? batch.student_ids.map(String) : [];
    const recipients = (window.allStudents || [])
      .filter(s => ids.includes(String(s.id)))
      .map(s => ({
        name: window.getStudentName ? window.getStudentName(s) : (s.full_name || s.name || 'Student'),
        wa: waNumber(s)
      }));
    const reachable = recipients.filter(r => r.wa);

    if (!reachable.length) {
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      if (window.toast) {
        window.toast(recipients.length
          ? 'No phone numbers on this batch\u2019s students \u2014 opened a blank WhatsApp share instead.'
          : 'No students assigned to this batch \u2014 opened a blank WhatsApp share instead.', 'warning');
      }
      return;
    }

    const esc = (v) => (window.escapeHtml ? window.escapeHtml(v) : String(v));
    const rows = reachable.map(r => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-bottom:1px solid var(--border)">
        <span style="color:var(--ivory);font-size:13px">${esc(r.name)}</span>
        <a class="btn btn-gold btn-sm" style="text-decoration:none;white-space:nowrap"
           href="https://wa.me/${esc(r.wa)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Send</a>
      </div>`).join('');
    const missing = recipients.length - reachable.length;

    const ov = document.createElement('div');
    ov.className = 'ck-share-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px';
    ov.innerHTML = `
      <div style="background:var(--bg2,#151d2b);border:1px solid var(--border);border-radius:14px;max-width:440px;width:100%;max-height:80vh;overflow:auto;padding:18px">
        <div style="font-weight:700;color:var(--ivory);margin-bottom:4px">Share class link</div>
        <div style="font-size:12px;color:var(--ivory-dim);margin-bottom:12px">
          ${esc(batch.name || 'Batch')} \u2022 ${reachable.length} student(s)${missing ? ` \u2022 ${missing} without a phone number` : ''}
        </div>
        ${rows}
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn btn-outline btn-sm" style="flex:1" data-ck-copy>Copy message</button>
          <button class="btn btn-outline btn-sm" style="flex:1" data-ck-close>Close</button>
        </div>
      </div>`;
    ov.addEventListener('click', (e) => {
      if (e.target === ov || e.target.hasAttribute('data-ck-close')) { ov.remove(); return; }
      if (e.target.hasAttribute('data-ck-copy')) {
        if (navigator.clipboard) navigator.clipboard.writeText(msg);
        if (window.toast) window.toast('Message copied.', 'success');
      }
    });
    document.body.appendChild(ov);
  };

  window.renderCoachSchedule = function () {
    const container = document.getElementById('coach-schedule-content');
    if (!container) return;

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      container.innerHTML = '<div class="coach-loading-cell">Unable to load schedule. Coach ID not found.</div>';
      return;
    }

    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);

    const myStudents = (window.allStudents || []).filter(s => String(s.coach_id) === String(coachId));
    const myStudentIds = myStudents.map(s => String(s.id));

    const upcoming = (window.allAttendance || [])
      .filter(a => myStudentIds.includes(String(a.student_id)))
      .filter(a => {
        const d = new Date(a.date);
        return d >= today && d <= nextMonth;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (upcoming.length === 0) {
      container.innerHTML = '<div class="coach-loading-cell">No upcoming sessions scheduled.</div>';
      return;
    }

    container.innerHTML = '<div class="coach-table-wrap"><table class="coach-mini-table"><thead><tr><th>Date</th><th>Student</th><th>Session</th></tr></thead><tbody>' + upcoming.map(a => {
      const student = myStudents.find(s => String(s.id) === String(a.student_id));
      const name = student ? (window.getStudentName ? window.getStudentName(student) : student.name) : 'Unknown';
      return '<tr><td style="color:var(--ivory-dim)">' + (a.date ? new Date(a.date).toLocaleDateString() : 'TBD') + '</td><td style="color:var(--ivory)">' + (window.escapeHtml ? window.escapeHtml(name) : name) + '</td><td style="color:var(--ivory-dim)">' + (a.session_type || 'Regular') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  };

  window.renderCoachEvents = function () {
    const container = document.getElementById('coach-events-content');
    if (!container) return;

    if (!window.eventsData || window.eventsData.length === 0) {
      container.innerHTML = '<div class="coach-loading-cell">No events scheduled.</div>';
      return;
    }

    const visibleEvents = window.eventsData.filter(e => {
      return e.status !== 'archived' && e.archived !== true;
    });

    if (visibleEvents.length === 0) {
      container.innerHTML = '<div class="coach-loading-cell">No upcoming events.</div>';
      return;
    }

    container.innerHTML = visibleEvents.map(e => {
      const evDate = new Date(e.date || e.event_date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const isPast = evDate < now;
      const statusClass = isPast ? 'badge badge-info' : 'badge badge-success';
      const statusText = isPast ? 'Completed' : 'Upcoming';
      const dateStr = e.date ? new Date(e.date).toLocaleDateString() : 'TBD';
      const location = e.location || 'TBD';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 0; border-bottom: 1px solid var(--border);">
          <div>
            <div style="font-weight:600; color:var(--ivory);">${window.escapeHtml ? window.escapeHtml(e.title) : e.title}</div>
            <div style="font-size:12px; color:var(--ivory-dim); margin-top:2px;">${dateStr} · ${window.escapeHtml ? window.escapeHtml(location) : location}</div>
          </div>
          <span class="${statusClass}">${statusText}</span>
        </div>
      `;
    }).join('');
  };

  window.renderCoachAttendance = function () {
    const container = document.getElementById('coach-attendance-content');
    if (!container) return;

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      container.innerHTML = '<div class="coach-loading-cell">Unable to load attendance. Coach ID not found.</div>';
      return;
    }

    const myStudents = (window.allStudents || []).filter(s => String(s.coach_id) === String(coachId));
    const myStudentIds = myStudents.map(s => String(s.id));

    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 14);

    const recent = (window.allAttendance || [])
      .filter(a => myStudentIds.includes(String(a.student_id)))
      .filter(a => {
        const d = new Date(a.date);
        return d >= weekAgo && d <= today;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const presentCount = recent.filter(a => (a.status || '').toLowerCase() === 'present').length;
    const absentCount = recent.filter(a => (a.status || '').toLowerCase() === 'absent').length;

    if (recent.length === 0) {
      container.innerHTML = '<div class="coach-loading-cell">No attendance records found.</div>';
      return;
    }

    container.innerHTML = '<div class="coach-attendance-summary" style="margin-bottom:14px;"><div class="coach-attendance-item present"><span class="attendance-count">' + presentCount + '</span><span class="attendance-label">Present</span></div><div class="coach-attendance-item absent"><span class="attendance-count">' + absentCount + '</span><span class="attendance-label">Absent</span></div></div><div class="coach-table-wrap"><table class="coach-mini-table"><thead><tr><th>Date</th><th>Student</th><th>Status</th></tr></thead><tbody>' + recent.map(a => {
      const student = myStudents.find(s => String(s.id) === String(a.student_id));
      const name = student ? (window.getStudentName ? window.getStudentName(student) : student.name) : 'Unknown';
      const sc = (a.status || '').toLowerCase() === 'present' ? 'badge badge-success' : 'badge badge-danger';
      return '<tr><td style="color:var(--ivory-dim)">' + (a.date ? new Date(a.date).toLocaleDateString() : 'TBD') + '</td><td style="color:var(--ivory)">' + (window.escapeHtml ? window.escapeHtml(name) : name) + '</td><td><span class="' + sc + '">' + (a.status || '—') + '</span></td></tr>';
    }).join('') + '</tbody></table></div>';
  };

  window.renderCoachAttendanceMarking = function () {
    const container = document.getElementById('coach-att-marking-body');
    const summary = document.getElementById('coach-attendance-summary');
    if (!container) return;

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      container.innerHTML = '<tr><td colspan="3" class="coach-loading-cell">Coach ID not found.</td></tr>';
      return;
    }

    // Default to today when the picker is empty. The old order read
    // dateEl.value first, so on first load `date` was "" — no existing
    // attendance ever matched, and saving demanded "Please select a date".
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('coach-att-date');
    if (dateEl && !dateEl.value) dateEl.value = today;
    const date = dateEl ? (dateEl.value || today) : today;

    const myStudents = (window.allStudents || [])
      .filter(s => String(s.coach_id) === String(coachId))
      .sort((a, b) => (window.getStudentName ? window.getStudentName(a) : a.name).localeCompare(window.getStudentName ? window.getStudentName(b) : b.name));
    if (myStudents.length === 0) {
      container.innerHTML = '<tr><td colspan="3" class="coach-loading-cell">No students assigned yet.</td></tr>';
      if (summary) summary.innerHTML = '';
      return;
    }

    // Scope the day's records to THIS coach's students — filtering by date
    // alone counted the whole academy in the coach's Present/Absent summary.
    const myIds = new Set(myStudents.map(s => String(s.id)));
    const dayRecords = (window.allAttendance || [])
      .filter(a => a.date === date && myIds.has(String(a.student_id)));

    container.innerHTML = myStudents.map(s => {
      const existing = dayRecords.find(a => String(a.student_id) === String(s.id));
      const parsed = existing ? parseAttendanceNotes(existing.notes || '') : { cw: '', hw: '', general: '' };
      const status = existing ? (existing.status || '') : '';
      const name = window.getStudentName ? window.getStudentName(s) : s.name;
      return '<tr>' +
        '<td style="font-weight:500; color:var(--ivory)">' + (window.escapeHtml ? window.escapeHtml(name) : name) + '</td>' +
        '<td><select class="att-status" data-sid="' + s.id + '" onchange="updateCoachAttStats()"><option value="" ' + (!status ? 'selected' : '') + '>-- Select --</option><option value="present" ' + (status === 'present' ? 'selected' : '') + '>✅ Present</option><option value="absent" ' + (status === 'absent' ? 'selected' : '') + '>❌ Absent</option><option value="late" ' + (status === 'late' ? 'selected' : '') + '>⏰ Late</option><option value="excused" ' + (status === 'excused' ? 'selected' : '') + '>📋 Excused</option></select></td>' +
        '<td><div style="display:flex; flex-direction:column; gap:8px;"><textarea class="att-cw" data-sid="' + s.id + '" placeholder="Classwork notes..." style="font-size:12px; width:100%; min-height:50px; resize:vertical; background:var(--bg3); border:1px solid var(--border); color:var(--ivory); padding:6px; border-radius:4px;">' + (window.escapeHtml ? window.escapeHtml(parsed.cw) : parsed.cw) + '</textarea><textarea class="att-hw" data-sid="' + s.id + '" placeholder="Homework notes..." style="font-size:12px; width:100%; min-height:50px; resize:vertical; background:var(--bg3); border:1px solid var(--border); color:var(--ivory); padding:6px; border-radius:4px;">' + (window.escapeHtml ? window.escapeHtml(parsed.hw) : parsed.hw) + '</textarea><textarea class="att-notes" data-sid="' + s.id + '" placeholder="General note..." style="font-size:12px; width:100%; min-height:40px; resize:vertical; background:var(--bg3); border:1px solid var(--border); color:var(--ivory); padding:6px; border-radius:4px;">' + (window.escapeHtml ? window.escapeHtml(parsed.general) : parsed.general) + '</textarea></div></td>' +
        '</tr>';
    }).join('');

    updateCoachAttStats();
  };

  // Live Present/Absent/Late/Excused tally for the marking table.
  // This was called from renderCoachAttendanceMarking(), the per-row
  // onchange, and after save/reset — but never defined, so every attendance
  // render and every status change threw a ReferenceError and the summary
  // counters never moved while marking.
  window.updateCoachAttStats = function () {
    const summary = document.getElementById('coach-attendance-summary');
    if (!summary) return;
    const selects = document.querySelectorAll('#coach-att-marking-body .att-status');
    const tally = { present: 0, absent: 0, late: 0, excused: 0 };
    selects.forEach((sel) => {
      const v = (sel.value || '').toLowerCase();
      if (v && Object.prototype.hasOwnProperty.call(tally, v)) tally[v] += 1;
    });
    const unmarked = selects.length - (tally.present + tally.absent + tally.late + tally.excused);
    const item = (cls, count, label) =>
      '<div class="coach-attendance-item ' + cls + '">' +
        '<span class="attendance-count">' + count + '</span>' +
        '<span class="attendance-label">' + label + '</span>' +
      '</div>';
    summary.innerHTML =
      '<div class="coach-attendance-summary">' +
        item('present', tally.present, 'Present') +
        item('absent', tally.absent, 'Absent') +
        item('late', tally.late, 'Late') +
        item('excused', tally.excused, 'Excused') +
        item('pending', unmarked < 0 ? 0 : unmarked, 'Unmarked') +
      '</div>';
  };

  window.parseAttendanceNotes = function(raw) {
    let cw = '', hw = '', general = '';
    if (!raw) return { cw, hw, general };
    const lines = String(raw).split('\n');
    let mode = 'general';
    for (const line of lines) {
      if (line.startsWith('CW:')) {
        mode = 'cw';
        const val = line.slice(3);
        cw += (cw ? '\n' : '') + val;
        continue;
      }
      if (line.startsWith('HW:')) {
        mode = 'hw';
        const val = line.slice(3);
        hw += (hw ? '\n' : '') + val;
        continue;
      }
      if (line.startsWith('GENERAL:')) {
        mode = 'general';
        const val = line.slice(8);
        general += (general ? '\n' : '') + val;
        continue;
      }
      if (line.startsWith('---')) {
        mode = 'general';
        continue;
      }
      if (mode === 'cw') cw += (cw ? '\n' : '') + line;
      else if (mode === 'hw') hw += (hw ? '\n' : '') + line;
      else general += (general ? '\n' : '') + line;
    }
    return { cw, hw, general };
  };

  window.formatAttendanceNotesForSave = function(cw, hw, general) {
    const parts = [];
    if (cw && cw.trim()) parts.push('CW:' + cw.trim());
    if (hw && hw.trim()) parts.push('HW:' + hw.trim());
    if (general && general.trim()) parts.push('GENERAL:' + general.trim());
    return parts.join('\n');
  };

  window.saveCoachAttendance = async function () {
    const dateEl = document.getElementById('coach-att-date');
    const date = dateEl ? dateEl.value : '';
    if (!date) {
      toast('Please select a date', 'error');
      return;
    }

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      toast('Coach ID not found', 'error');
      return;
    }

    const rows = document.querySelectorAll('#coach-att-marking-body tr');
    const skipped = [];
    const records = Array.from(rows)
      .map((row) => {
        const select = row.querySelector('.att-status');
        const notesInput = row.querySelector('.att-notes');
        const cwInput = row.querySelector('.att-cw');
        const hwInput = row.querySelector('.att-hw');
        if (!select || !select.value) return null;
        const studentId = select.dataset.sid;
        const student = (window.allStudents || []).find((s) => String(s.id) === String(studentId));
        // coach_id is stored in mixed formats across the roster: dashed UUIDs,
        // the same UUIDs with dashes stripped, and legacy "c_name" slugs.
        // A raw !== comparison silently dropped every student whose format did
        // not match the signed-in coach's id, so marking appeared to do nothing.
        if (!student) return null;
        if (!window.ckSameCoach(student.coach_id, coachId)) { skipped.push(student.full_name || student.name || studentId); return null; }
        const cw = cwInput ? cwInput.value : '';
        const hw = hwInput ? hwInput.value : '';
        const general = notesInput ? notesInput.value : '';
        return {
          student_id: studentId,
          status: select.value,
          date: date,
          notes: window.formatAttendanceNotesForSave ? window.formatAttendanceNotesForSave(cw, hw, general) : general,
        };
      })
      .filter((r) => r !== null);

    if (records.length === 0) {
      toast(
        skipped.length
          ? `No attendance saved — ${skipped.length} student(s) are not linked to your coach ID. Ask an admin to fix the roster.`
          : 'No attendance marked',
        'error'
      );
      if (skipped.length) console.warn('[Attendance] coach_id mismatch for:', skipped);
      return;
    }
    if (skipped.length) {
      toast(`${skipped.length} student(s) skipped — not linked to your coach ID`, 'warning');
      console.warn('[Attendance] coach_id mismatch for:', skipped);
    }

    try {
      const res = await apiCall('/api/attendance', {
        method: 'POST',
        body: JSON.stringify(records),
      });
      if (res.ok) {
        toast('Attendance saved for ' + records.length + ' students', 'success');
        renderCoachAttendanceMarking();
        setTimeout(renderCoachDashboard, 100);
      } else {
        toast('Failed to save attendance', 'error');
      }
    } catch (e) {
      toast('Error saving attendance', 'error');
    }
  };

  window.markAllCoachPresent = function () {
    const rows = document.querySelectorAll('#coach-att-marking-body tr');
    rows.forEach((row) => {
      const select = row.querySelector('.att-status');
      if (select) select.value = 'present';
    });
    updateCoachAttStats();
  };

  window.markAllCoachAbsent = function () {
    const rows = document.querySelectorAll('#coach-att-marking-body tr');
    rows.forEach((row) => {
      const select = row.querySelector('.att-status');
      if (select) select.value = 'absent';
    });
    updateCoachAttStats();
  };

  window.openCoachHomeworkModal = function () {
    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      toast('Coach ID not found', 'error');
      return;
    }
    if (typeof openHomeworkAssignmentModal === 'function') {
      openHomeworkAssignmentModal('all', '');
    }
  };

  window.openCoachEventModal = function () {
    if (typeof openEventModal === 'function') {
      openEventModal();
    }
  };

  window.renderCoachHomework = function (query) {
    const q = query || '';
    if (window.coachHomeworkTab === 'assignments') {
      switchCoachHomeworkTab('assignments');
      renderCoachAssignments(1);
    } else {
      switchCoachHomeworkTab('submissions');
      renderCoachSubmissions(q, 1);
    }
  };

  window.coachHomeworkTab = 'assignments';
  window.coachAssignPage = 1;
  window.coachSubPage = 1;
  window.coachAssignPageSize = 8;
  window.coachSubPageSize = 8;

  window.switchCoachHomeworkTab = function (tab) {
    window.coachHomeworkTab = tab;
    const assignTab = document.getElementById('coach-hw-assign');
    const subTab = document.getElementById('coach-hw-submissions');
    const assignBtn = document.getElementById('btn-coach-hw-assign');
    const subBtn = document.getElementById('btn-coach-hw-sub');
    if (!assignTab || !subTab || !assignBtn || !subBtn) return;

    if (tab === 'assignments') {
      assignTab.style.display = 'block';
      subTab.style.display = 'none';
      assignBtn.classList.add('active');
      subBtn.classList.remove('active');
      renderCoachAssignments(1);
    } else {
      assignTab.style.display = 'none';
      subTab.style.display = 'block';
      assignBtn.classList.remove('active');
      subBtn.classList.add('active');
      const q = document.getElementById('coach-hw-search')?.value || '';
      renderCoachSubmissions(q, 1);
    }
  };

  window.renderCoachAssignments = function (page) {
    const tbody = document.getElementById('coach-assignments-tbody');
    const pagination = document.getElementById('coach-assign-pagination');
    if (!tbody) return;

    page = Number(page) || 1;
    window.coachAssignPage = page;

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">Coach ID not found.</td></tr>';
      if (pagination) pagination.innerHTML = '';
      return;
    }

    const myStudents = (window.allStudents || []).filter(s => String(s.coach_id) === String(coachId));
    const myStudentIds = myStudents.map(s => String(s.id));
    const myBatchIds = (window.allBatches || []).filter(b => String(b.coach_id) === String(coachId)).map(b => String(b.id));

    const assignments = (window.allHomework || [])
      .filter(h => {
        if (h.target_type === 'student') return myStudentIds.includes(String(h.student_id));
        if (h.target_type === 'batch') return myBatchIds.includes(String(h.batch_id));
        return true;
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const totalPages = Math.max(1, Math.ceil(assignments.length / window.coachAssignPageSize));
    const start = (page - 1) * window.coachAssignPageSize;
    const pageItems = assignments.slice(start, start + window.coachAssignPageSize);

    if (assignments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">No assignments found.</td></tr>';
    } else if (pageItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">No assignments on this page.</td></tr>';
    } else {
      tbody.innerHTML = pageItems.map(h => {
        const target = h.target_type === 'student'
          ? (myStudents.find(s => String(s.id) === String(h.student_id)) ? (window.getStudentName ? window.getStudentName(myStudents.find(s => String(s.id) === String(h.student_id))) : myStudents.find(s => String(s.id) === String(h.student_id)).name) : 'Unknown')
          : h.target_type === 'batch'
          ? ((window.allBatches || []).find(b => String(b.id) === String(h.batch_id))?.name || 'Batch')
          : 'All Students';
        const due = h.due_date ? new Date(h.due_date).toLocaleDateString() : 'No due date';
        const status = h.status ? h.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Active';
        const statusClass = h.status === 'completed' ? 'badge badge-success' : h.status === 'archived' ? 'badge badge-grey' : 'badge badge-warning';
        const canArchive = h.status !== 'archived';
        const canDone = h.status !== 'completed';
        const canDelete = h.status !== 'archived';
        return `<tr>
          <td style="font-weight:500; color:var(--ivory); max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${window.escapeHtml ? window.escapeHtml(h.title || '') : (h.title || '')}">${window.escapeHtml ? window.escapeHtml(h.title || '') : (h.title || '')}</td>
          <td style="font-size:12px; color:var(--ivory-dim);">${window.escapeHtml ? window.escapeHtml(target) : target}</td>
          <td style="font-size:12px; color:var(--ivory-dim);">${due}</td>
          <td><span class="${statusClass}">${status}</span></td>
          <td style="display:flex; gap:6px; flex-wrap:wrap;">
            ${canDone ? `<button class="btn btn-outline-grey btn-sm" onclick="window.updateHomeworkStatus('${h.id}', 'completed')">✔ Done</button>` : ''}
            ${canArchive ? `<button class="btn btn-outline-grey btn-sm" onclick="window.updateHomeworkStatus('${h.id}', 'archived')">🗑 Archive</button>` : ''}
            ${canDelete ? `<button class="btn btn-outline-danger btn-sm" onclick="deleteCoachHomeworkAssignment('${h.id}')">Delete</button>` : ''}
          </td>
        </tr>`;
      }).join('');
    }

    if (pagination) {
      let html = `<span style="font-size:12px; color:var(--ivory-dim);">Page ${page} / ${totalPages}</span>`;
      html += `<button class="btn btn-outline-grey btn-sm" ${page <= 1 ? 'disabled' : ''} onclick="renderCoachAssignments(${page - 1})">Prev</button>`;
      html += `<button class="btn btn-outline-grey btn-sm" ${page >= totalPages ? 'disabled' : ''} onclick="renderCoachAssignments(${page + 1})">Next</button>`;
      pagination.innerHTML = html;
    }
  };

  window.renderCoachSubmissions = function (query, page) {
    const tbody = document.getElementById('coach-submissions-tbody');
    const pagination = document.getElementById('coach-sub-pagination');
    const countEl = document.getElementById('coach-sub-count');
    if (!tbody) return;

    page = Number(page) || 1;
    window.coachSubPage = page;
    const q = (query || '').trim().toLowerCase();

    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">Coach ID not found.</td></tr>';
      if (pagination) pagination.innerHTML = '';
      if (countEl) countEl.textContent = '';
      return;
    }

    const myStudents = (window.allStudents || []).filter(s => String(s.coach_id) === String(coachId));
    const myStudentIds = myStudents.map(s => String(s.id));
    let submissions = (window.homeworkSubmissionCache || [])
      .filter(s => myStudentIds.includes(String(s.student_id)))
      .sort((a, b) => new Date(b.submitted_at || b.created_at) - new Date(a.submitted_at || a.created_at));

    if (q) {
      submissions = submissions.filter(s => {
        const student = myStudents.find(x => String(x.id) === String(s.student_id));
        const studentName = student ? (window.getStudentName ? window.getStudentName(student) : student.name) : '';
        const assignment = (window.allHomework || []).find(h => String(h.id) === String(s.assignment_id));
        const title = assignment ? assignment.title : '';
        const textMatch = (s.submission_text || '').toLowerCase().includes(q);
        const urlMatch = (s.submission_url || '').toLowerCase().includes(q);
        const fileMatch = (Array.isArray(s.file_urls) ? s.file_urls.join(' ') : '').toLowerCase().includes(q);
        const studentMatch = studentName.toLowerCase().includes(q);
        const titleMatch = title.toLowerCase().includes(q);
        const statusMatch = (s.status || '').toLowerCase().includes(q);
        return textMatch || urlMatch || fileMatch || studentMatch || titleMatch || statusMatch;
      });
    }

    const statusFilter = document.getElementById('coach-hw-sub-status')?.value || '';
    if (statusFilter) {
      submissions = submissions.filter(s => (s.status || '').toLowerCase() === statusFilter.toLowerCase());
    }

    const totalPages = Math.max(1, Math.ceil(submissions.length / window.coachSubPageSize));
    const start = (page - 1) * window.coachSubPageSize;
    const pageItems = submissions.slice(start, start + window.coachSubPageSize);

    if (submissions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">No matching submissions found.</td></tr>';
    } else if (pageItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="coach-loading-cell">No submissions on this page.</td></tr>';
    } else {
      tbody.innerHTML = pageItems.map(s => {
        const assignment = (window.allHomework || []).find(h => String(h.id) === String(s.assignment_id));
        const student = myStudents.find(x => String(x.id) === String(s.student_id));
        const studentName = student ? (window.getStudentName ? window.getStudentName(student) : student.name) : "Unknown";
        const title = assignment ? assignment.title : "Untitled Assignment";
        const submittedDate = s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "Today";
        const status = s.status || 'submitted';
        const statusClass = status === 'approved' ? 'badge badge-success' : status === 'needs_revision' ? 'badge badge-danger' : status === 'closed' ? 'badge badge-grey' : 'badge badge-warning';
        return `<tr>
          <td style="color:var(--ivory); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${window.escapeHtml ? window.escapeHtml(studentName) : studentName}">${window.escapeHtml ? window.escapeHtml(studentName) : studentName}</td>
          <td style="font-size:12px; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${window.escapeHtml ? window.escapeHtml(title) : title}">${window.escapeHtml ? window.escapeHtml(title) : title}</td>
          <td style="font-size:11px; color:var(--ivory-dim); white-space:nowrap;">${submittedDate}</td>
          <td><span class="${statusClass}">${status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span></td>
          <td style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-outline-grey btn-sm" onclick="window.reviewHomeworkSubmission('${s.id}', 'approved')">✔ Approve</button>
            <button class="btn btn-outline-grey btn-sm" onclick="window.reviewHomeworkSubmission('${s.id}', 'needs_revision')">✎ Revision</button>
            <button class="btn btn-outline-grey btn-sm" onclick="window.reviewHomeworkSubmission('${s.id}', 'closed')">✕ Close</button>
          </td>
        </tr>`;
      }).join('');
    }

    if (countEl) countEl.textContent = submissions.length ? `Showing ${submissions.length} submission(s)` : '';
    if (pagination) {
      let html = `<span style="font-size:12px; color:var(--ivory-dim);">Page ${page} / ${totalPages}</span>`;
      html += `<button class="btn btn-outline-grey btn-sm" ${page <= 1 ? 'disabled' : ''} onclick="renderCoachSubmissions(document.getElementById('coach-hw-search')?.value || '', ${page - 1}); document.getElementById('coach-hw-sub-status')?.value && (document.getElementById('coach-hw-sub-status').value = '${statusFilter}');">Prev</button>`;
      html += `<button class="btn btn-outline-grey btn-sm" ${page >= totalPages ? 'disabled' : ''} onclick="renderCoachSubmissions(document.getElementById('coach-hw-search')?.value || '', ${page + 1}); document.getElementById('coach-hw-sub-status')?.value && (document.getElementById('coach-hw-sub-status').value = '${statusFilter}');">Next</button>`;
      pagination.innerHTML = html;
    }
  };

  window.deleteCoachHomeworkAssignment = async function (id) {
    if (!window.confirm('Delete this assignment? This cannot be undone.')) return;
    const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
    if (!coachId) {
      toast('Coach ID not found', 'error');
      return;
    }
    const assignment = (window.allHomework || []).find(h => String(h.id) === String(id));
    if (!assignment) {
      toast('Assignment not found', 'error');
      return;
    }
    const myBatchIds = (window.allBatches || []).filter(b => String(b.coach_id) === String(coachId)).map(b => String(b.id));
    const myStudentIds = (window.allStudents || []).filter(s => String(s.coach_id) === String(coachId)).map(s => String(s.id));
    const isOwner = assignment.target_type === 'all'
      || (assignment.target_type === 'batch' && myBatchIds.includes(String(assignment.batch_id)))
      || (assignment.target_type === 'student' && myStudentIds.includes(String(assignment.student_id)));
    if (!isOwner) {
      toast('You can only delete your own assignments.', 'error');
      return;
    }
    try {
      const res = await apiCall(`/api/homework?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      toast('Assignment deleted', 'success');
      renderCoachAssignments(window.coachAssignPage);
    } catch (e) {
      toast(`Delete failed: ${e.message}`, 'error');
    }
  };

if (typeof window.setPage === 'function') {
  const origSetPage = window.setPage;
  window.setPage = function(p, btn) {
    origSetPage(p, btn);
    if (p === 'coach-dash' || p === 'coach-students' || p === 'coach-batches' || p === 'coach-schedule' || p === 'coach-events' || p === 'coach-attendance' || p === 'coach-homework' || p === 'coach-chess') {
      setTimeout(renderCoachDashboard, 100);
    }
  };
} else {
  window.setPage = function(p, btn) {
    if (p === 'coach-dash' || p === 'coach-students' || p === 'coach-batches' || p === 'coach-schedule' || p === 'coach-events' || p === 'coach-attendance' || p === 'coach-homework' || p === 'coach-chess') {
      setTimeout(renderCoachDashboard, 100);
    }
  };
}

window.renderCoachChess = function () {
  const container = document.getElementById('coach-chess-summary');
  if (!container) return;

  const coachId = window.currentCoachId || window.userId || getCurrentCoachIdFromStorage();
  if (!coachId) {
    container.innerHTML = '<div class="coach-loading-cell">Coach ID not found.</div>';
    return;
  }

    const myStudents = (window.allStudents || [])
      .filter(s => String(s.coach_id) === String(coachId))
      .sort((a, b) => (window.getStudentName ? window.getStudentName(a) : a.name).localeCompare(window.getStudentName ? window.getStudentName(b) : b.name));
    if (myStudents.length === 0) {
      container.innerHTML = '<div class="coach-loading-cell">No students assigned yet.</div>';
      return;
    }

  const rows = myStudents.map((s) => {
    const name = window.getStudentName ? window.getStudentName(s) : s.name;
    const lichess = s.lichess_username ? `♘ <a href="https://lichess.org/@/${esc(s.lichess_username)}" target="_blank" style="color:var(--gold);text-decoration:none;">${esc(s.lichess_username)}</a>` : '♘ Not linked';
    const chesscom = s.chesscom_username ? `♟️ <a href="https://www.chess.com/member/${esc(s.chesscom_username)}" target="_blank" style="color:#7FA650;text-decoration:none;">${esc(s.chesscom_username)}</a>` : '♟️ Not linked';
    const internal = getStudentRating(s) || '—';
    return `
      <tr>
        <td style="font-weight:500; color:var(--ivory);">${window.escapeHtml ? window.escapeHtml(name) : name}</td>
        <td style="font-size:12px; color:var(--ivory-dim);">${lichess}</td>
        <td style="font-size:12px; color:var(--ivory-dim);">${chesscom}</td>
        <td style="font-size:12px; color:var(--ivory);">${internal}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="coach-table-wrap">
      <table class="coach-mini-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Lichess</th>
            <th>Chess.com</th>
            <th>Academy ELO</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};
